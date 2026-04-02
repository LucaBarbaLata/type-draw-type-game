package net.czedik.hermann.tdt;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.channels.ByteChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.RematchAction;
import net.czedik.hermann.tdt.actions.SpectatorSnapshotAction;
import net.czedik.hermann.tdt.actions.TeamStrokeAction;
import net.czedik.hermann.tdt.actions.TeamCanvasRequestAction;
import net.czedik.hermann.tdt.actions.TeamCanvasSyncAction;
import net.czedik.hermann.tdt.GameMode;
import net.czedik.hermann.tdt.actions.ChatAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.SettingsAction;
import net.czedik.hermann.tdt.actions.StartAction;
import net.czedik.hermann.tdt.actions.TypeAction;
import net.czedik.hermann.tdt.actions.BanAction;
import net.czedik.hermann.tdt.actions.KickAction;
import net.czedik.hermann.tdt.actions.VoteAction;
import net.czedik.hermann.tdt.playerstate.AlreadyStartedGameState;
import net.czedik.hermann.tdt.playerstate.BannedState;
import net.czedik.hermann.tdt.playerstate.KickedState;
import net.czedik.hermann.tdt.playerstate.DrawState;
import net.czedik.hermann.tdt.playerstate.FrontendStory;
import net.czedik.hermann.tdt.playerstate.FrontendStoryElement;
import net.czedik.hermann.tdt.playerstate.HotPotatoDrawState;
import net.czedik.hermann.tdt.playerstate.TeamStrokeEvent;
import net.czedik.hermann.tdt.playerstate.TeamCanvasRequestEvent;
import net.czedik.hermann.tdt.playerstate.TeamCanvasSyncEvent;
import net.czedik.hermann.tdt.playerstate.JoinState;
import net.czedik.hermann.tdt.playerstate.PlayerState;
import net.czedik.hermann.tdt.playerstate.RematchState;
import net.czedik.hermann.tdt.playerstate.SpectatorCurrentDrawing;
import net.czedik.hermann.tdt.playerstate.SpectatorState;
import net.czedik.hermann.tdt.playerstate.StoriesState;
import net.czedik.hermann.tdt.playerstate.TypeState;
import net.czedik.hermann.tdt.playerstate.WaitForGameStartState;
import net.czedik.hermann.tdt.playerstate.WaitForPlayersState;
import net.czedik.hermann.tdt.playerstate.WaitForRoundFinishState;

// note: this class is not thread-safe, and relies on external synchronization (by the owning GameLoader)
public class Game {
    private static final Logger log = LoggerFactory.getLogger(Game.class);

    public static final String STATE_FILENAME = "state.json";

    private static final int MAX_CHAT_MESSAGES = 50;
    private static final int MAX_CHAT_TEXT_LENGTH = 200;

    public final String gameId;

    private final Path gameDir;

    private final GameState gameState;

    private final List<ChatMessage> chatMessages = new ArrayList<>();

    private final Map<Client, Player> clientToPlayer = new HashMap<>();

    private final Map<Player, Set<Client>> playerToClients = new HashMap<>();

    private final Set<Client> spectatorClients = new HashSet<>();

    // Runtime-only: tracks which player IDs have voted to play again (not persisted)
    private final Set<String> rematchVoterIds = new HashSet<>();

    // Runtime-only: latest canvas snapshot per player ID, used to show spectators live drawing progress
    private final Map<String, String> latestSpectatorSnapshots = new HashMap<>();

    public Game(String gameId, Path gameDir, Player creator) {
        this(gameId, gameDir, new GameState());

        gameState.players.add(Objects.requireNonNull(creator));
    }

    public Game(String gameId, Path gameDir, GameState gameState) {
        this.gameId = Objects.requireNonNull(gameId);
        this.gameDir = Objects.requireNonNull(gameDir);
        this.gameState = Objects.requireNonNull(gameState);
    }

    // returns whether the client should remain associated with this game (player or spectator)
    public boolean access(Client client, AccessAction accessAction) {
        Player player = getPlayerById(accessAction.playerId());
        if (player == null) {
            log.info("Game {}: New player {} accessing via client {}", gameId, accessAction.playerId(), client.getId());
            return handleAccessByNewPlayer(client);
        } else {
            log.info("Game {}: New client {} connected for known player {}", gameId, client.getId(), player.id());
            addClientForPlayer(client, player);
            updateStateForPlayer(player);
            return true;
        }
    }

    private Player getPlayerById(String playerId) {
        return gameState.players.stream().filter(p -> p.id().equals(playerId)).findAny().orElse(null);
    }

    // Returns true if the client should remain associated (spectator or can join), false if not
    private boolean handleAccessByNewPlayer(Client client) {
        switch (gameState.state) {
            case WaitingForPlayers:
                client.send(new JoinState());
                return false;
            case Started:
                log.info("Game {}: Client {} joining as spectator (game in progress)", gameId, client.getId());
                spectatorClients.add(client);
                client.send(buildSpectatorState());
                // Refresh draw state for active players so they see the updated spectator count
                updateStateForAllPlayers();
                return true;
            case Finished:
                log.info("Game {}: Client {} joining as spectator (game finished)", gameId, client.getId());
                spectatorClients.add(client);
                client.send(getFinishedState());
                return true;
            default:
                throw new IllegalStateException("Unknown state " + gameState.state);
        }
    }

    public void settings(Client client, SettingsAction settingsAction) {
        Player player = clientToPlayer.get(client);
        if (player == null || !player.isCreator()) {
            log.warn("Game {}: Non-creator or unknown client {} tried to change settings", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring settings change in state {}", gameId, gameState.state);
            return;
        }
        gameState.maxPlayers = Math.max(0, settingsAction.maxPlayers());
        gameState.roundTimerSeconds = Math.max(0, settingsAction.roundTimerSeconds());
        gameState.chatEnabled = settingsAction.chatEnabled();
        gameState.isPublic = settingsAction.isPublic();
        if (settingsAction.gameMode() != null) {
            gameState.gameMode = settingsAction.gameMode();
        }
        if (settingsAction.hotPotatoIntervalSeconds() > 0) {
            gameState.hotPotatoIntervalSeconds = settingsAction.hotPotatoIntervalSeconds();
        }
        if (settingsAction.hotPotatoTotalSeconds() > 0) {
            gameState.hotPotatoTotalSeconds = settingsAction.hotPotatoTotalSeconds();
        }
        log.info("Game {}: Settings updated — maxPlayers={}, roundTimerSeconds={}, chatEnabled={}, isPublic={}, gameMode={}, hpInterval={}, hpTotal={}", gameId,
                gameState.maxPlayers, gameState.roundTimerSeconds, gameState.chatEnabled, gameState.isPublic, gameState.gameMode,
                gameState.hotPotatoIntervalSeconds, gameState.hotPotatoTotalSeconds);
        updateStateForAllPlayers();
    }

    public void chat(Client client, ChatAction chatAction) {
        if (gameState.state != GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring chat in state {}", gameId, gameState.state);
            return;
        }
        if (!gameState.chatEnabled) {
            log.warn("Game {}: Chat is disabled, ignoring message from client {}", gameId, client.getId());
            return;
        }
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Unknown client {} tried to chat", gameId, client.getId());
            return;
        }
        String text = chatAction.text();
        if (text == null || text.isBlank() || text.length() > MAX_CHAT_TEXT_LENGTH) {
            return;
        }
        ChatMessage message = new ChatMessage(mapPlayerToPlayerInfo(player), text.strip());
        chatMessages.add(message);
        if (chatMessages.size() > MAX_CHAT_MESSAGES) {
            chatMessages.remove(0);
        }
        log.info("Game {}: Chat from {}: {}", gameId, player.name(), text.strip());
        updateStateForAllPlayers();
    }

    public void kick(Client client, KickAction kickAction) {
        if (gameState.state != GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring kick in state {}", gameId, gameState.state);
            return;
        }
        Player requester = clientToPlayer.get(client);
        if (requester == null || !requester.isCreator()) {
            log.warn("Game {}: Non-creator client {} attempted to kick", gameId, client.getId());
            return;
        }
        Player target = gameState.players.stream()
                .filter(p -> !p.isCreator() && p.name().equals(kickAction.playerName()))
                .findFirst().orElse(null);
        if (target == null) {
            log.warn("Game {}: Kick target '{}' not found", gameId, kickAction.playerName());
            return;
        }
        log.info("Game {}: Creator kicking player '{}'", gameId, target.name());
        Set<Client> targetClients = playerToClients.remove(target);
        gameState.players.remove(target);
        if (targetClients != null) {
            KickedState kickedState = new KickedState();
            for (Client targetClient : targetClients) {
                clientToPlayer.remove(targetClient);
                targetClient.send(kickedState);
            }
        }
        updateStateForAllPlayers();
    }

    public void ban(Client client, BanAction banAction) {
        if (gameState.state != GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring ban in state {}", gameId, gameState.state);
            return;
        }
        Player requester = clientToPlayer.get(client);
        if (requester == null || !requester.isCreator()) {
            log.warn("Game {}: Non-creator client {} attempted to ban", gameId, client.getId());
            return;
        }
        Player target = gameState.players.stream()
                .filter(p -> !p.isCreator() && p.name().equals(banAction.playerName()))
                .findFirst().orElse(null);
        if (target == null) {
            log.warn("Game {}: Ban target '{}' not found", gameId, banAction.playerName());
            return;
        }
        log.info("Game {}: Creator banning player '{}'", gameId, target.name());
        gameState.bannedPlayerIds.add(target.id());
        Set<Client> targetClients = playerToClients.remove(target);
        gameState.players.remove(target);
        if (targetClients != null) {
            BannedState bannedState = new BannedState();
            for (Client targetClient : targetClients) {
                clientToPlayer.remove(targetClient);
                targetClient.send(bannedState);
            }
        }
        updateStateForAllPlayers();
    }

    private void addClientForPlayer(Client client, Player player) {
        clientToPlayer.put(client, player);
        playerToClients.computeIfAbsent(player, p -> new HashSet<>()).add(client);
    }

    // returns whether the client has been added as a player to the game
    public boolean join(Client client, JoinAction joinAction) {
        if (gameState.state == GameState.State.WaitingForPlayers) {
            if (gameState.bannedPlayerIds.contains(joinAction.playerId())) {
                log.info("Game {}: Rejected join from banned player {}", gameId, joinAction.playerId());
                client.send(new BannedState());
                return false;
            }
            if (gameState.maxPlayers > 0 && gameState.players.size() >= gameState.maxPlayers) {
                log.info("Game {}: Join rejected — game is full ({}/{})", gameId, gameState.players.size(), gameState.maxPlayers);
                client.send(new AlreadyStartedGameState());
                return false;
            }
            log.info("Game {}: Player {} joining with name '{}' via client {}", gameId, joinAction.playerId(),
                    joinAction.name(), client.getId());
            Player player = getPlayerById(joinAction.playerId());
            if (player != null) {
                log.warn("Game {}: Player {} has already joined", gameId, joinAction.playerId());
            } else {
                player = new Player(joinAction.playerId(), joinAction.name(), joinAction.face(), false);
                gameState.players.add(player);
            }
            addClientForPlayer(client, player);
            updateStateForAllPlayers();
            return true;
        } else {
            log.info("Game {}: Join not possible in state {}", gameId, gameState.state);
            return handleAccessByNewPlayer(client);
        }
    }

    private void updateStateForAllPlayers() {
        for (Player player : gameState.players) {
            updateStateForPlayer(player);
        }
        updateStateForSpectators();
    }

    private void updateStateForSpectators() {
        if (spectatorClients.isEmpty()) return;
        PlayerState spectatorState = gameState.state == GameState.State.Finished
                ? getFinishedState()
                : buildSpectatorState();
        for (Client client : spectatorClients) {
            client.send(spectatorState);
        }
    }

    private SpectatorState buildSpectatorState() {
        FrontendStory[] partialStories = mapPartialStories();
        List<Player> notFinished = getNotFinishedPlayers();
        List<PlayerInfo> waitingFor = mapPlayersToPlayerInfos(notFinished);
        List<SpectatorCurrentDrawing> currentDrawings = buildCurrentDrawings(notFinished);
        return new SpectatorState(
                gameState.round + 1,
                gameState.gameMatrix.length,
                mapPlayersToPlayerInfos(gameState.players),
                waitingFor,
                partialStories,
                currentDrawings
        );
    }

    private List<SpectatorCurrentDrawing> buildCurrentDrawings(List<Player> notFinishedPlayers) {
        // Hot Potato mode doesn't have text prompts per drawing slot; skip live view
        if (gameState.gameMode == GameMode.HOT_POTATO) {
            return java.util.Collections.emptyList();
        }
        if (isTypeRound() || notFinishedPlayers.isEmpty() || gameState.gameMatrix == null) {
            return java.util.Collections.emptyList();
        }
        List<SpectatorCurrentDrawing> result = new ArrayList<>();
        for (Player player : notFinishedPlayers) {
            int storyIndex = getCurrentStoryIndexForPlayer(player);
            StoryElement prevElement = getStoryByIndex(storyIndex).elements[gameState.round - 1];
            if (prevElement == null) continue;
            String snapshot = latestSpectatorSnapshots.get(player.id());
            result.add(new SpectatorCurrentDrawing(mapPlayerToPlayerInfo(player), prevElement.content, snapshot));
        }
        return result;
    }

    private FrontendStory[] mapPartialStories() {
        FrontendStory[] result = new FrontendStory[gameState.stories.length];
        for (int storyIndex = 0; storyIndex < gameState.stories.length; storyIndex++) {
            StoryElement[] elements = gameState.stories[storyIndex].elements;
            int count = 0;
            for (StoryElement e : elements) {
                if (e != null) count++;
            }
            FrontendStoryElement[] fe = new FrontendStoryElement[count];
            int idx = 0;
            for (int roundNo = 0; roundNo < elements.length; roundNo++) {
                if (elements[roundNo] == null) continue;
                StoryElement e = elements[roundNo];
                Player player = getPlayerForStoryInRound(storyIndex, roundNo);
                String content = "image".equals(e.type) ? getDrawingSrc(e.content) : e.content;
                String replayUrl1 = "image".equals(e.type) ? getReplayUrl(storyIndex, roundNo) : null;
                fe[idx++] = new FrontendStoryElement(e.type, content, mapPlayerToPlayerInfo(player), replayUrl1, java.util.Collections.emptyMap());
            }
            result[storyIndex] = new FrontendStory(fe);
        }
        return result;
    }

    private void updateStateForPlayer(Player player) {
        PlayerState playerState = getPlayerState(player);
        for (Client client : playerToClients.getOrDefault(player, Collections.emptySet())) {
            client.send(playerState);
        }
    }

    private PlayerState getPlayerState(Player player) {
        switch (gameState.state) {
            case WaitingForPlayers:
                return getWaitingForPlayersState(player);
            case Started:
                return getStartedState(player);
            case Finished:
                return getFinishedState();
            default:
                throw new IllegalStateException("Unknown state: " + gameState.state);
        }
    }

    private PlayerState getFinishedState() {
        int[] votesByStory = computeVotesByStory();
        FrontendStory[] frontendStories = gameState.gameMode == GameMode.HOT_POTATO
                ? mapHotPotatoStoriesToFrontendStories()
                : mapStoriesToFrontendStories();
        List<PlayerInfo> rematchVoters = gameState.players.stream()
                .filter(p -> rematchVoterIds.contains(p.id()))
                .map(Game::mapPlayerToPlayerInfo)
                .collect(Collectors.toList());
        return new StoriesState(frontendStories, votesByStory, rematchVoters, gameState.players.size());
    }

    private FrontendStory[] mapHotPotatoStoriesToFrontendStories() {
        FrontendStory[] result = new FrontendStory[gameState.stories.length];
        for (int storyIndex = 0; storyIndex < gameState.stories.length; storyIndex++) {
            StoryElement[] elements = gameState.stories[storyIndex].elements;

            // Count non-null frames
            int count = 0;
            for (StoryElement e : elements) {
                if (e != null) count++;
            }

            FrontendStoryElement[] fe = new FrontendStoryElement[count];
            int idx = 0;
            for (int r = 0; r < elements.length; r++) {
                if (elements[r] == null) continue;
                // Find which player drew canvas storyIndex at rotation r
                int playerIndex = ArrayUtils.indexOf(gameState.hotPotatoMatrix[r], storyIndex);
                Player player = gameState.players.get(playerIndex);
                String content = getDrawingSrc(elements[r].content);
                fe[idx++] = new FrontendStoryElement("image", content, mapPlayerToPlayerInfo(player), null, java.util.Collections.emptyMap());
            }
            result[storyIndex] = new FrontendStory(fe);
        }
        return result;
    }

    private int[] computeVotesByStory() {
        int numStories = gameState.stories != null ? gameState.stories.length : 0;
        int[] counts = new int[numStories];
        for (int storyIndex : gameState.votes.values()) {
            if (storyIndex >= 0 && storyIndex < numStories) {
                counts[storyIndex]++;
            }
        }
        return counts;
    }

    private FrontendStory[] mapStoriesToFrontendStories() {
        FrontendStory[] frontendStories = new FrontendStory[gameState.stories.length];
        for (int storyIndex = 0; storyIndex < gameState.stories.length; storyIndex++) {
            StoryElement[] elements = gameState.stories[storyIndex].elements;
            FrontendStory frontendStory = mapStoryElementsToFrontendStoryElements(storyIndex, elements);
            frontendStories[storyIndex] = frontendStory;
        }
        return frontendStories;
    }

    private FrontendStory mapStoryElementsToFrontendStoryElements(int storyIndex, StoryElement[] elements) {
        FrontendStory frontendStory = new FrontendStory(new FrontendStoryElement[elements.length]);
        for (int roundNo = 0; roundNo < elements.length; roundNo++) {
            StoryElement e = elements[roundNo];
            Player player = getPlayerForStoryInRound(storyIndex, roundNo);
            String content = "image".equals(e.type) ? getDrawingSrc(e.content) : e.content;
            String replayUrl = "image".equals(e.type) ? getReplayUrl(storyIndex, roundNo) : null;
            java.util.Map<String, Integer> reactions = java.util.Collections.emptyMap();
            if ("image".equals(e.type) && gameState.drawingReactions != null) {
                java.util.Map<String, String> playerReactions = gameState.drawingReactions.get(storyIndex + "_" + roundNo);
                if (playerReactions != null && !playerReactions.isEmpty()) {
                    java.util.Map<String, Integer> counts = new java.util.HashMap<>();
                    for (String emoji : playerReactions.values()) {
                        counts.merge(emoji, 1, Integer::sum);
                    }
                    reactions = counts;
                }
            }
            frontendStory.elements()[roundNo] = new FrontendStoryElement(e.type, content,
                    mapPlayerToPlayerInfo(player), replayUrl, reactions);
        }
        return frontendStory;
    }

    private PlayerState getStartedState(Player player) {
        if (gameState.state != GameState.State.Started)
            throw new IllegalStateException("Only valid to call this method in started state");

        if (gameState.gameMode == GameMode.HOT_POTATO) {
            return getHotPotatoState(player);
        }

        if (!hasPlayerFinishedCurrentRound(player)) {
            if (isTypeRound()) {
                // In TEAM mode, only the primary (first) player in each pair chooses the topic.
                // The secondary player waits while their partner types.
                if (gameState.gameMode == GameMode.TEAM && isSecondaryTeamPlayer(player)) {
                    return getWaitForRoundFinishedState();
                }
                return getTypeState(player);
            } else { // draw round
                return getDrawState(player);
            }
        } else {
            return getWaitForRoundFinishedState();
        }
    }

    /**
     * Returns true if the player is the secondary (non-primary) member of their team pair.
     * In TEAM mode, only the primary (pair[0]) member types during type rounds.
     */
    private boolean isSecondaryTeamPlayer(Player player) {
        int playerIndex = gameState.players.indexOf(player);
        int[] pair = getTeamPairForPlayer(playerIndex);
        if (pair == null || pair.length < 2) return false;
        return playerIndex != pair[0];
    }

    private PlayerState getHotPotatoState(Player player) {
        int rotation = gameState.hotPotatoCurrentRotation;
        if (rotation >= gameState.hotPotatoTotalRotations) {
            // Shouldn't normally be reached (state transitions to Finished), but guard anyway
            return getFinishedState();
        }

        int playerIndex = gameState.players.indexOf(player);
        if (playerIndex < 0) return getFinishedState();

        if (gameState.hotPotatoSubmitted.contains(player.id())) {
            // Player already submitted for this rotation — show waiting screen
            List<Player> waitingFor = gameState.players.stream()
                    .filter(p -> !gameState.hotPotatoSubmitted.contains(p.id()))
                    .collect(Collectors.toList());
            return new WaitForRoundFinishState(mapPlayersToPlayerInfos(waitingFor), false);
        }

        int storyIndex = gameState.hotPotatoMatrix[rotation][playerIndex];

        // Find the most recent submitted frame for this canvas (becomes initialCanvasUrl)
        String initialCanvasUrl = null;
        for (int r = rotation - 1; r >= 0; r--) {
            StoryElement elem = gameState.stories[storyIndex].elements[r];
            if (elem != null) {
                initialCanvasUrl = getDrawingSrc(elem.content);
                break;
            }
        }

        GameMode mode = gameState.gameMode != null ? gameState.gameMode : GameMode.CLASSIC;
        return new HotPotatoDrawState(
                rotation + 1,
                gameState.hotPotatoTotalRotations,
                gameState.hotPotatoIntervalSeconds,
                initialCanvasUrl,
                mode,
                spectatorClients.size()
        );
    }

    private PlayerState getWaitForRoundFinishedState() {
        List<Player> playersNotFinished = getNotFinishedPlayers();
        return new WaitForRoundFinishState(mapPlayersToPlayerInfos(playersNotFinished), isTypeRound());
    }

    private PlayerState getDrawState(Player player) {
        int storyIndex = getCurrentStoryIndexForPlayer(player);
        String text = getStoryByIndex(storyIndex).elements[gameState.round - 1].content;
        Player previousPlayer = getPreviousPlayerForStory(storyIndex);
        GameMode mode = gameState.gameMode != null ? gameState.gameMode : GameMode.CLASSIC;
        PlayerInfo teamPartner = null;
        if (mode == GameMode.TEAM) {
            int playerIndex = gameState.players.indexOf(player);
            int[] pair = getTeamPairForPlayer(playerIndex);
            if (pair != null) {
                for (int partnerIdx : pair) {
                    if (partnerIdx != playerIndex) {
                        teamPartner = mapPlayerToPlayerInfo(gameState.players.get(partnerIdx));
                        break;
                    }
                }
            }
        }
        return new DrawState(gameState.round + 1, gameState.gameMatrix.length, text,
                mapPlayerToPlayerInfo(previousPlayer), gameState.roundTimerSeconds, mode, teamPartner,
                spectatorClients.size());
    }

    private PlayerState getTypeState(Player player) {
        int roundOneBased = gameState.round + 1;
        int rounds = gameState.gameMatrix.length;
        GameMode mode = gameState.gameMode != null ? gameState.gameMode : GameMode.CLASSIC;
        PlayerInfo teamPartner = null;
        if (mode == GameMode.TEAM) {
            int playerIndex = gameState.players.indexOf(player);
            int[] pair = getTeamPairForPlayer(playerIndex);
            if (pair != null) {
                for (int partnerIdx : pair) {
                    if (partnerIdx != playerIndex) {
                        teamPartner = mapPlayerToPlayerInfo(gameState.players.get(partnerIdx));
                        break;
                    }
                }
            }
        }
        if (gameState.round == 0) {
            return new TypeState(roundOneBased, rounds, null, null, gameState.roundTimerSeconds, mode, teamPartner);
        } else {
            int storyIndex = getCurrentStoryIndexForPlayer(player);
            String imageFilename = getStoryByIndex(storyIndex).elements[gameState.round - 1].content;
            Player previousPlayer = getPreviousPlayerForStory(storyIndex);
            return new TypeState(roundOneBased, rounds, getDrawingSrc(imageFilename),
                    mapPlayerToPlayerInfo(previousPlayer), gameState.roundTimerSeconds, mode, teamPartner);
        }
    }

    private PlayerState getWaitingForPlayersState(Player player) {
        if (gameState.state != GameState.State.WaitingForPlayers)
            throw new IllegalStateException("Only valid to call this method in started state");

        List<PlayerInfo> playerInfos = mapPlayersToPlayerInfos(gameState.players);
        List<ChatMessage> messages = List.copyOf(chatMessages);
        GameMode mode = gameState.gameMode != null ? gameState.gameMode : GameMode.CLASSIC;
        int hpInterval = gameState.hotPotatoIntervalSeconds;
        int hpTotal = gameState.hotPotatoTotalSeconds;
        if (player.isCreator()) {
            return new WaitForPlayersState(playerInfos, gameState.chatEnabled, messages, mode, hpInterval, hpTotal);
        } else {
            return new WaitForGameStartState(playerInfos, gameState.chatEnabled, messages, mode, hpInterval, hpTotal);
        }
    }

    public PublicGameInfo getPublicInfo() {
        if (gameState.state != GameState.State.WaitingForPlayers) return null;
        if (!gameState.isPublic) return null;
        Player creator = gameState.players.stream().filter(Player::isCreator).findFirst().orElse(null);
        if (creator == null) return null;
        // Don't advertise the lobby if the creator has disconnected
        if (playerToClients.getOrDefault(creator, Collections.emptySet()).isEmpty()) return null;
        return new PublicGameInfo(gameId, creator.name(), creator.face(), gameState.players.size(), gameState.maxPlayers);
    }

    private String getDrawingSrc(String imageFilename) {
        return "/api/image/" + gameId + "/" + imageFilename;
    }

    private String getReplayUrl(int storyIndex, int roundNo) {
        if (gameState.replayFiles == null) return null;
        String replayId = gameState.replayFiles.get(storyIndex + "_" + roundNo);
        return replayId != null ? "/api/replay/" + gameId + "/" + replayId : null;
    }

    public void drawingReplay(Client client, net.czedik.hermann.tdt.actions.DrawingReplayAction action) throws IOException {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot store replay. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state == GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring replay in WaitingForPlayers state", gameId);
            return;
        }
        int roundIndex = action.round() - 1;
        if (roundIndex < 0 || gameState.gameMatrix == null || roundIndex >= gameState.gameMatrix.length) {
            log.warn("Game {}: Ignoring replay with invalid round {}", gameId, action.round());
            return;
        }
        if (isTypeRound(roundIndex)) {
            log.warn("Game {}: Ignoring replay for type round {}", gameId, roundIndex);
            return;
        }
        int playerIndex = gameState.players.indexOf(player);
        if (playerIndex < 0) return;
        int storyIndex = gameState.gameMatrix[roundIndex][playerIndex];

        String replayId = UUID.randomUUID().toString();
        Path replayPath = gameDir.resolve(replayId + ".replay.json");
        String json = JSONHelper.objectToJsonString(Map.of("frames", action.frames()));
        Files.writeString(replayPath, json, StandardOpenOption.CREATE_NEW);

        if (gameState.replayFiles == null) gameState.replayFiles = new java.util.HashMap<>();
        gameState.replayFiles.put(storyIndex + "_" + roundIndex, replayId);
        storeState();
    }

    private Player getPreviousPlayerForStory(int storyIndex) {
        return getPlayerForStoryInRound(storyIndex, gameState.round - 1);
    }

    private Player getPlayerForStoryInRound(int storyIndex, int roundNo) {
        int previousPlayerIndexForStory = ArrayUtils.indexOf(gameState.gameMatrix[roundNo], storyIndex);
        return gameState.players.get(previousPlayerIndexForStory);
    }

    private Story getStoryByIndex(int storyIndex) {
        return gameState.stories[storyIndex];
    }

    private List<Player> getNotFinishedPlayers() {
        return gameState.players.stream().filter(p -> !hasPlayerFinishedCurrentRound(p)).collect(Collectors.toList());
    }

    private boolean hasPlayerFinishedCurrentRound(Player player) {
        return getCurrentStoryForPlayer(player).elements[gameState.round] != null;
    }

    private static List<PlayerInfo> mapPlayersToPlayerInfos(Collection<Player> players) {
        return players.stream().map(Game::mapPlayerToPlayerInfo).collect(Collectors.toList());
    }

    private static PlayerInfo mapPlayerToPlayerInfo(Player p) {
        return new PlayerInfo(p.name(), p.face(), p.isCreator());
    }

    public void clientDisconnected(Client client) {
        boolean wasSpectator = spectatorClients.remove(client);

        Player player = clientToPlayer.remove(client);
        if (player == null) {
            log.info("Game {}: Client {} disconnect. Not a player in this game.", gameId, client.getId());
            // If a spectator left during an active draw round, refresh player states so spectator count updates
            if (wasSpectator && gameState.state == GameState.State.Started && isDrawRound()) {
                updateStateForAllPlayers();
            }
            return;
        }

        log.info("Game {}: Client {} of player {} disconnected", gameId, client.getId(), player.id());

        Set<Client> clientsOfPlayer = playerToClients.get(player);
        clientsOfPlayer.remove(client);

        if (gameState.state == GameState.State.WaitingForPlayers) {
            if (!player.isCreator() && clientsOfPlayer.isEmpty()) {
                log.info("Game {}: Player {} has left the game", gameId, player.id());
                gameState.players.remove(player);
                playerToClients.remove(player);
                updateStateForAllPlayers();
            }
        }
    }

    // ---- Rematch ---------------------------------------------------------------

    /**
     * Data needed by GameManager to create the rematch game.
     */
    public record RematchData(
            String creatorId, String creatorName, String creatorFace,
            GameMode gameMode, int roundTimerSeconds, int maxPlayers,
            boolean chatEnabled, boolean isPublic,
            int hotPotatoIntervalSeconds, int hotPotatoTotalSeconds) {
    }

    /**
     * Records a player's vote to play again. Broadcasts updated state to all clients.
     * Returns RematchData when ALL connected players have voted; otherwise returns null.
     */
    public RematchData prepareRematch(Client client) {
        if (gameState.state != GameState.State.Finished) {
            log.warn("Game {}: Ignoring rematch in state {}", gameId, gameState.state);
            return null;
        }
        Player requester = clientToPlayer.get(client);
        if (requester == null) {
            log.warn("Game {}: Unknown client {} tried to rematch", gameId, client.getId());
            return null;
        }

        rematchVoterIds.add(requester.id());
        log.info("Game {}: Player {} voted to rematch ({} voters so far)", gameId, requester.id(), rematchVoterIds.size());

        // Broadcast updated vote state to all players and spectators
        updateStateForAllPlayers();

        // Check if every currently-connected player has voted
        Set<Player> connectedPlayers = new HashSet<>(clientToPlayer.values());
        if (connectedPlayers.isEmpty()) {
            return null;
        }
        boolean allVoted = connectedPlayers.stream().allMatch(p -> rematchVoterIds.contains(p.id()));
        if (!allVoted) {
            return null;
        }

        Player creator = gameState.players.stream().filter(Player::isCreator).findFirst().orElse(requester);
        GameMode mode = gameState.gameMode != null ? gameState.gameMode : GameMode.CLASSIC;
        return new RematchData(
                creator.id(), creator.name(), creator.face(),
                mode, gameState.roundTimerSeconds, gameState.maxPlayers,
                gameState.chatEnabled, gameState.isPublic,
                gameState.hotPotatoIntervalSeconds, gameState.hotPotatoTotalSeconds);
    }

    /**
     * Sends a RematchState to all connected players and spectators so they redirect to the new game.
     */
    public void broadcastRematch(String newGameId) {
        RematchState rematchState = new RematchState(newGameId);
        for (Player player : gameState.players) {
            for (Client client : playerToClients.getOrDefault(player, Collections.emptySet())) {
                client.send(rematchState);
            }
        }
        for (Client client : spectatorClients) {
            client.send(rematchState);
        }
    }

    /**
     * Applies settings from a rematch onto a freshly-created game (called by GameManager before the game is opened).
     */
    public void applyRematchSettings(RematchData data) {
        gameState.gameMode = data.gameMode();
        gameState.roundTimerSeconds = data.roundTimerSeconds();
        gameState.maxPlayers = data.maxPlayers();
        gameState.chatEnabled = data.chatEnabled();
        gameState.isPublic = data.isPublic();
        gameState.hotPotatoIntervalSeconds = data.hotPotatoIntervalSeconds();
        gameState.hotPotatoTotalSeconds = data.hotPotatoTotalSeconds();
    }

    public void start(Client client, StartAction startAction) {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot start game. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.WaitingForPlayers) {
            log.warn("Game {}: Ignoring start in state {}", gameId, gameState.state);
            return;
        }
        if (!player.isCreator()) {
            log.warn("Game {}: Non-creator {} cannot start the game (client: {})", gameId, player.id(), client.getId());
            return;
        }

        if (startAction != null) {
            gameState.roundTimerSeconds = Math.max(0, startAction.roundTimerSeconds());
            gameState.maxPlayers = Math.max(0, startAction.maxPlayers());
        }

        if (gameState.players.size() > 1) {
            startGame();
        } else {
            log.warn("Game {}: Cannot start game with less than 2 players", gameId);
            updateStateForAllPlayers();
        }
    }

    private void startGame() {
        log.info("Game {}: Starting (mode={})", gameId, gameState.gameMode);
        gameState.state = GameState.State.Started;

        if (gameState.gameMode == GameMode.HOT_POTATO) {
            startHotPotatoGame();
            return;
        }

        if (gameState.gameMode == GameMode.TEAM) {
            startTeamGame();
            return;
        }

        gameState.gameMatrix = GameRoundsGenerator.generate(gameState.players.size());

        gameState.stories = new Story[gameState.players.size()];
        Arrays.setAll(gameState.stories, i -> new Story(gameState.players.size()));

        storeState();

        updateStateForAllPlayers();
    }

    private void startHotPotatoGame() {
        int numPlayers = gameState.players.size();
        int interval = Math.max(10, gameState.hotPotatoIntervalSeconds);
        int totalSeconds = Math.max(interval, gameState.hotPotatoTotalSeconds);
        int totalRotations = Math.max(1, totalSeconds / interval);

        gameState.hotPotatoIntervalSeconds = interval;
        gameState.hotPotatoTotalRotations = totalRotations;
        gameState.hotPotatoCurrentRotation = 0;
        gameState.hotPotatoSubmitted = new HashSet<>();

        // hotPotatoMatrix[rotation][playerIndex] = storyIndex
        gameState.hotPotatoMatrix = new int[totalRotations][numPlayers];
        for (int r = 0; r < totalRotations; r++) {
            for (int p = 0; p < numPlayers; p++) {
                gameState.hotPotatoMatrix[r][p] = (p + r) % numPlayers;
            }
        }

        // Each story has totalRotations slots (one per rotation)
        gameState.stories = new Story[numPlayers];
        Arrays.setAll(gameState.stories, i -> new Story(totalRotations));

        log.info("Game {}: Hot Potato started — {} players, {} rotations of {}s each",
                gameId, numPlayers, totalRotations, interval);

        storeState();
        updateStateForAllPlayers();
    }

    /**
     * Called by the external timer (GameManager) at the end of each hot potato drawing interval
     * plus a 5-second submission grace period.
     *
     * @return delay in seconds before the next tick should fire, or 0 if the game is now finished
     */
    public int hotPotatoTick() {
        if (gameState.gameMode != GameMode.HOT_POTATO || gameState.state != GameState.State.Started) {
            log.warn("Game {}: hotPotatoTick called in unexpected state", gameId);
            return 0;
        }

        gameState.hotPotatoCurrentRotation++;
        gameState.hotPotatoSubmitted = new HashSet<>();

        log.info("Game {}: Hot Potato tick — advancing to rotation {}/{}",
                gameId, gameState.hotPotatoCurrentRotation, gameState.hotPotatoTotalRotations);

        if (gameState.hotPotatoCurrentRotation >= gameState.hotPotatoTotalRotations) {
            log.info("Game {}: Hot Potato — all rotations complete, finishing game", gameId);
            gameState.state = GameState.State.Finished;
            storeState();
            updateStateForAllPlayers();
            return 0;
        }

        storeState();
        updateStateForAllPlayers();
        // Next tick fires after interval + 5s grace window
        return gameState.hotPotatoIntervalSeconds + 5;
    }

    /** Returns true when the game is in Hot Potato mode and has just started (used by GameManager to schedule first tick). */
    public boolean isHotPotatoActive() {
        return gameState.gameMode == GameMode.HOT_POTATO && gameState.state == GameState.State.Started;
    }

    public int getHotPotatoTickDelay() {
        return gameState.hotPotatoIntervalSeconds + 5;
    }

    // ---- Team Mode ----------------------------------------------------------

    private void startTeamGame() {
        int numPlayers = gameState.players.size();

        // Build pairs: [0,1], [2,3], ... Solo last player if odd count
        List<int[]> pairList = new ArrayList<>();
        for (int i = 0; i < numPlayers; i += 2) {
            if (i + 1 < numPlayers) {
                pairList.add(new int[]{i, i + 1});
            } else {
                pairList.add(new int[]{i}); // solo
            }
        }
        gameState.teamPairs = pairList.toArray(new int[0][]);

        int numStories = pairList.size();
        int[][] pairsMatrix = GameRoundsGenerator.generate(numStories);

        // Expand pairs matrix to full player matrix:
        // both players in a pair share the same story index in each round
        gameState.gameMatrix = new int[pairsMatrix.length][numPlayers];
        for (int round = 0; round < pairsMatrix.length; round++) {
            for (int pairIdx = 0; pairIdx < pairList.size(); pairIdx++) {
                int storyIdx = pairsMatrix[round][pairIdx];
                for (int memberIdx : pairList.get(pairIdx)) {
                    gameState.gameMatrix[round][memberIdx] = storyIdx;
                }
            }
        }

        gameState.stories = new Story[numStories];
        Arrays.setAll(gameState.stories, i -> new Story(pairsMatrix.length));

        log.info("Game {}: Team mode started — {} players, {} pairs, {} rounds",
                gameId, numPlayers, numStories, pairsMatrix.length);

        storeState();
        updateStateForAllPlayers();
    }

    /**
     * Returns the team pair array that contains the given playerIndex, or null if not found.
     */
    private int[] getTeamPairForPlayer(int playerIndex) {
        if (gameState.teamPairs == null) return null;
        for (int[] pair : gameState.teamPairs) {
            for (int idx : pair) {
                if (idx == playerIndex) return pair;
            }
        }
        return null;
    }

    /**
     * Relays a canvas-request from the sender to their team partner(s).
     * Used when a player reconnects and needs the partner's current canvas state.
     */
    public void teamCanvasRequest(Client senderClient, TeamCanvasRequestAction action) {
        Player sender = clientToPlayer.get(senderClient);
        if (sender == null) return;
        if (gameState.gameMode != GameMode.TEAM || gameState.state != GameState.State.Started) return;
        if (isTypeRound()) return;

        int senderIndex = gameState.players.indexOf(sender);
        int[] pair = getTeamPairForPlayer(senderIndex);
        if (pair == null) return;

        TeamCanvasRequestEvent event = new TeamCanvasRequestEvent(action.round(), sender.name());
        for (int partnerIndex : pair) {
            if (partnerIndex == senderIndex) continue;
            Player partner = gameState.players.get(partnerIndex);
            for (Client partnerClient : playerToClients.getOrDefault(partner, Collections.emptySet())) {
                partnerClient.send(event);
            }
        }
    }

    /**
     * Relays a canvas image from the sender to their team partner(s).
     * Sent in response to a teamCanvasRequest.
     */
    public void teamCanvasSync(Client senderClient, TeamCanvasSyncAction action) {
        Player sender = clientToPlayer.get(senderClient);
        if (sender == null) return;
        if (gameState.gameMode != GameMode.TEAM || gameState.state != GameState.State.Started) return;
        if (isTypeRound()) return;

        int senderIndex = gameState.players.indexOf(sender);
        int[] pair = getTeamPairForPlayer(senderIndex);
        if (pair == null) return;

        TeamCanvasSyncEvent event = new TeamCanvasSyncEvent(action.imageDataUrl(), action.round(), sender.name());
        for (int partnerIndex : pair) {
            if (partnerIndex == senderIndex) continue;
            Player partner = gameState.players.get(partnerIndex);
            for (Client partnerClient : playerToClients.getOrDefault(partner, Collections.emptySet())) {
                partnerClient.send(event);
            }
        }
    }

    /**
     * Relays a stroke segment from the sender to their team partner(s).
     */
    public void teamStroke(Client senderClient, TeamStrokeAction action) {
        Player sender = clientToPlayer.get(senderClient);
        if (sender == null) {
            log.warn("Game {}: teamStroke from unknown client {}", gameId, senderClient.getId());
            return;
        }
        if (gameState.gameMode != GameMode.TEAM || gameState.state != GameState.State.Started) {
            log.warn("Game {}: teamStroke ignored — mode={} state={}", gameId, gameState.gameMode, gameState.state);
            return;
        }
        if (isTypeRound()) {
            return; // no relay during type rounds
        }
        if (action.round() != gameState.round + 1) {
            log.warn("Game {}: teamStroke ignored — wrong round {} (current={})", gameId, action.round(), gameState.round + 1);
            return;
        }

        int senderIndex = gameState.players.indexOf(sender);
        int[] pair = getTeamPairForPlayer(senderIndex);
        if (pair == null) return;

        TeamStrokeEvent event = new TeamStrokeEvent(
                action.type(), action.tool(),
                action.x0(), action.y0(),
                action.x1(), action.y1(),
                action.color(), action.brushPixelSize(),
                action.round(), sender.name()
        );

        for (int partnerIndex : pair) {
            if (partnerIndex == senderIndex) continue;
            Player partner = gameState.players.get(partnerIndex);
            for (Client partnerClient : playerToClients.getOrDefault(partner, Collections.emptySet())) {
                partnerClient.send(event);
            }
        }
    }

    public void type(Client client, TypeAction typeAction) {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot type. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.Started) {
            log.warn("Game {}: Ignoring type in state {}", gameId, gameState.state);
            return;
        }
        if (!isTypeRound()) {
            log.warn("Game {}: Ignoring type in draw round {}", gameId, gameState.round);
            return;
        }
        String text = typeAction.text();
        if (StringUtils.isEmpty(text)) {
            text = "(no response)";
        }
        int maxTextLength = 2000; // same limit as in webapp code
        if (text.length() > maxTextLength) {
            text = text.substring(0, maxTextLength);
        }

        Story story = getCurrentStoryForPlayer(player);
        if (story.elements[gameState.round] != null) {
            log.warn("Game {}: Player {} already submitted for round {}", gameId, player.id(), gameState.round);
            return;
        }
        story.elements[gameState.round] = StoryElement.createTextElement(text);

        checkAndHandleRoundFinished();

        updateStateForAllPlayers();
        updateStateForSpectators();
    }

    private Story getCurrentStoryForPlayer(Player player) {
        return getStoryByIndex(getCurrentStoryIndexForPlayer(player));
    }

    private int getCurrentStoryIndexForPlayer(Player player) {
        return gameState.gameMatrix[gameState.round][gameState.players.indexOf(player)];
    }

    private boolean isCurrentRoundFinished() {
        return Arrays.stream(gameState.stories).allMatch(s -> s.elements[gameState.round] != null);
    }

    private boolean isTypeRound() {
        return isTypeRound(gameState.round);
    }

    private boolean isDrawRound() {
        return !isTypeRound();
    }

    private static boolean isTypeRound(int roundNo) {
        return roundNo % 2 == 0;
    }

    public void draw(Client client, ByteBuffer image) throws IOException {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot draw. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.Started) {
            log.warn("Game {}: Ignoring draw in state {}", gameId, gameState.state);
            return;
        }

        if (gameState.gameMode == GameMode.HOT_POTATO) {
            hotPotatoDraw(player, image);
            return;
        }

        if (!isDrawRound()) {
            log.warn("Game {}: Ignoring draw in type round {}", gameId, gameState.round);
            return;
        }

        Story story = getCurrentStoryForPlayer(player);
        if (story.elements[gameState.round] != null) {
            log.warn("Game {}: Player {} already submitted drawing for round {}", gameId, player.id(), gameState.round);
            return;
        }

        String imageName = UUID.randomUUID().toString() + ".png";
        Path imagePath = gameDir.resolve(imageName);

        try (ByteChannel channel =
                     Files.newByteChannel(imagePath, EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE))) {
            channel.write(image);
        }

        story.elements[gameState.round] = StoryElement.createImageElement(imageName);

        checkAndHandleRoundFinished();

        updateStateForAllPlayers();
        updateStateForSpectators();
    }

    private void hotPotatoDraw(Player player, ByteBuffer image) throws IOException {
        int rotation = gameState.hotPotatoCurrentRotation;
        if (rotation >= gameState.hotPotatoTotalRotations) {
            log.warn("Game {}: Ignoring hot potato draw — game already finished", gameId);
            return;
        }
        if (gameState.hotPotatoSubmitted.contains(player.id())) {
            log.warn("Game {}: Player {} already submitted for rotation {}", gameId, player.id(), rotation);
            return;
        }

        int playerIndex = gameState.players.indexOf(player);
        if (playerIndex < 0) return;
        int storyIndex = gameState.hotPotatoMatrix[rotation][playerIndex];

        String imageName = UUID.randomUUID().toString() + ".png";
        Path imagePath = gameDir.resolve(imageName);
        try (ByteChannel channel =
                     Files.newByteChannel(imagePath, EnumSet.of(StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE))) {
            channel.write(image);
        }

        gameState.stories[storyIndex].elements[rotation] = StoryElement.createImageElement(imageName);
        gameState.hotPotatoSubmitted.add(player.id());

        log.info("Game {}: Player {} submitted hot potato canvas {} for rotation {}",
                gameId, player.id(), storyIndex, rotation);

        updateStateForAllPlayers();
    }

    public void vote(Client client, VoteAction voteAction) {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot vote. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.Finished) {
            log.warn("Game {}: Ignoring vote in state {}", gameId, gameState.state);
            return;
        }
        int storyIndex = voteAction.storyIndex();
        if (storyIndex < 0 || storyIndex >= gameState.stories.length) {
            log.warn("Game {}: Invalid story index {} from player {}", gameId, storyIndex, player.id());
            return;
        }
        gameState.votes.put(player.id(), storyIndex);
        log.info("Game {}: Player {} voted for story {}", gameId, player.id(), storyIndex);

        storeState();
        updateStateForAllPlayers();
    }

    public void rateDrawing(Client client, net.czedik.hermann.tdt.actions.RateDrawingAction action) {
        Player player = clientToPlayer.get(client);
        if (player == null) {
            log.warn("Game {}: Cannot rate drawing. Client {} is not a known player", gameId, client.getId());
            return;
        }
        if (gameState.state != GameState.State.Finished) {
            log.warn("Game {}: Ignoring rateDrawing in state {}", gameId, gameState.state);
            return;
        }
        int storyIndex = action.storyIndex();
        int roundIndex = action.roundIndex();
        if (storyIndex < 0 || storyIndex >= gameState.stories.length) {
            log.warn("Game {}: Invalid storyIndex {} for rateDrawing", gameId, storyIndex);
            return;
        }
        Story story = gameState.stories[storyIndex];
        if (roundIndex < 0 || roundIndex >= story.elements.length) {
            log.warn("Game {}: Invalid roundIndex {} for rateDrawing", gameId, roundIndex);
            return;
        }
        if (!"image".equals(story.elements[roundIndex].type)) {
            log.warn("Game {}: rateDrawing called on non-image element", gameId);
            return;
        }
        String reaction = action.reaction();
        if (reaction == null || reaction.isBlank()) {
            log.warn("Game {}: rateDrawing called with blank reaction", gameId);
            return;
        }
        if (gameState.drawingReactions == null) {
            gameState.drawingReactions = new java.util.HashMap<>();
        }
        String key = storyIndex + "_" + roundIndex;
        java.util.Map<String, String> playerReactions = gameState.drawingReactions.computeIfAbsent(key, k -> new java.util.HashMap<>());
        String existing = playerReactions.get(player.id());
        // Toggle: remove if same reaction already set, otherwise add/replace
        if (reaction.equals(existing)) {
            playerReactions.remove(player.id());
        } else {
            playerReactions.put(player.id(), reaction);
        }
        log.info("Game {}: Player {} reacted {} on drawing {}/{}", gameId, player.id(), reaction, storyIndex, roundIndex);
        storeState();
        updateStateForAllPlayers();
        updateStateForSpectators();
    }

    public void spectatorSnapshot(Client client, SpectatorSnapshotAction action) {
        if (gameState.state != GameState.State.Started || isTypeRound() || gameState.gameMode == GameMode.HOT_POTATO) {
            return;
        }
        Player player = clientToPlayer.get(client);
        if (player == null) return;
        if (action.round() != gameState.round + 1) return; // stale snapshot
        if (spectatorClients.isEmpty()) return;
        latestSpectatorSnapshots.put(player.id(), action.imageDataUrl());
        updateStateForSpectators();
    }

    private void checkAndHandleRoundFinished() {
        if (isCurrentRoundFinished()) {
            latestSpectatorSnapshots.clear();
            gameState.round++;

            if (isGameFinished()) {
                gameState.state = GameState.State.Finished;
            }

            storeState();
        }
    }

    private boolean isGameFinished() {
        return gameState.round >= gameState.gameMatrix.length;
    }

    public void storeState() {
        log.info("Game {}: Storing state", gameId);
        try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(gameDir.resolve(STATE_FILENAME)))) {
            JSONHelper.objectMapper.writeValue(out, gameState);
        } catch (IOException e) {
            log.error("Game {}: Error storing state", gameId, e);
        }
    }
}

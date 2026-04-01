package net.czedik.hermann.tdt;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.regex.Pattern;

import org.apache.commons.lang3.RandomStringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import net.czedik.hermann.tdt.GameLoader.GameRef;
import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.BanAction;
import net.czedik.hermann.tdt.actions.ChatAction;
import net.czedik.hermann.tdt.actions.KickAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.SettingsAction;
import net.czedik.hermann.tdt.actions.StartAction;
import net.czedik.hermann.tdt.actions.DrawingReplayAction;
import net.czedik.hermann.tdt.actions.TeamStrokeAction;
import net.czedik.hermann.tdt.actions.TeamCanvasRequestAction;
import net.czedik.hermann.tdt.actions.TeamCanvasSyncAction;
import net.czedik.hermann.tdt.actions.TypeAction;
import net.czedik.hermann.tdt.actions.RateDrawingAction;
import net.czedik.hermann.tdt.actions.VoteAction;
import net.czedik.hermann.tdt.playerstate.UnknownGameState;

@Service
public class GameManager {
    private static final Logger log = LoggerFactory.getLogger(GameManager.class);

    private static final String CHARACTERS_WITHOUT_AMBIGUOUS = "23456789abcdefghijkmnpqrstuvwxyz";
    private static final int GAME_ID_LENGTH = 5;
    private static final Pattern gameIdPattern = Pattern
            .compile("[" + CHARACTERS_WITHOUT_AMBIGUOUS + "]{" + GAME_ID_LENGTH + "}");

    private final ScheduledExecutorService hotPotatoExecutor = Executors.newSingleThreadScheduledExecutor();

    // guarded by this
    private final Map<String, GameLoader> gameLoaders = new HashMap<>();

    // guarded by this
    private final Map<Client, GameRef> clientToGameRef = new HashMap<>();

    // guarded by this
    private final Map<String, PublicGameInfo> publicGamesRegistry = new HashMap<>();

    private final Path gamesPath;

    public GameManager(@Value("${storage.dir}") String storageDir) {
        Path storageDirPath = Path.of(storageDir).toAbsolutePath().normalize();
        log.info("Using storage path: {}", storageDirPath);
        gamesPath = storageDirPath.resolve("games");
    }

    public String newGame(CreateGameRequest createGameRequest) throws IOException {
        String gameId = generateAndReserveNewGameId();
        Path gameDir = getGameDir(gameId);
        Player player = new Player(createGameRequest.playerId(), createGameRequest.playerName(),
                createGameRequest.playerFace(), true);
        Game newGame = new Game(gameId, gameDir, player);

        GameRef gameRef = getGameRef(gameId);
        try {
            gameRef.setNewGame(newGame);
        } finally {
            closeGameRef(gameRef);
        }

        return newGame.gameId;
    }

    public void handleAccessAction(Client client, AccessAction accessAction) {
        handleAccessOrJoinAction(client, game -> game.access(client, accessAction), accessAction.gameId());
    }

    public void handleJoinAction(Client client, JoinAction joinAction) {
        handleAccessOrJoinAction(client, game -> {
            boolean result = game.join(client, joinAction);
            updatePublicRegistry(game);
            return result;
        }, joinAction.gameId());
    }

    private void handleAccessOrJoinAction(Client client, Function<Game, Boolean> actionHandler, String gameId) {
        try {
            validateGameId(gameId);
        } catch (IllegalArgumentException e) {
            handleGameUnknown(client);
            return;
        }

        GameRef gameRef = getGameRef(gameId);
        boolean added = false;
        try {
            added = gameRef.useGame(game -> {
                if (game == null) {
                    handleGameUnknown(client);
                    return false;
                }
                return actionHandler.apply(game);
            });
        } finally {
            if (added) {
                associateClientWithGameRef(client, gameRef);
            } else {
                closeGameRef(gameRef);
            }
        }
    }

    private void associateClientWithGameRef(Client client, GameRef gameRef) {
        GameRef previousGameRefForClient;
        synchronized (this) {
            previousGameRefForClient = clientToGameRef.put(client, gameRef);
        }
        if (previousGameRefForClient != null) {
            log.warn("Client {} unexpectedly switched between games. New game: {} - Old game: {}",
                    client.getId(), gameRef.getGameId(), previousGameRefForClient.getGameId());
            closeGameRef(previousGameRefForClient);
        }
    }

    private GameRef getGameRef(String gameId) {
        GameRef gameRef;
        synchronized (this) {
            GameLoader gameLoader = gameLoaders.computeIfAbsent(gameId,
                    id -> new GameLoader(gameId, getGameDir(gameId)));
            log.info("Access to game loader of game {} (total number of game loaders: {})", gameId, gameLoaders.size());
            gameRef = gameLoader.getGameRef();
        }
        return gameRef;
    }

    private void closeGameRef(GameRef gameRef) {
        gameRef.close();
        removeGameLoaderIfUnused(gameRef.getGameId());
    }

    private void removeGameLoaderIfUnused(String gameId) {
        synchronized (this) {
            GameLoader gameLoader = gameLoaders.get(gameId);
            if (gameLoader != null) {
                if (gameLoader.isUnused()) {
                    gameLoaders.remove(gameId);
                    log.info("Removed unused game loader for game {} (total number of loaders: {})", gameLoader.gameId,
                            gameLoaders.size());
                }
            }
        }
    }

    private void handleGameUnknown(Client client) {
        client.send(new UnknownGameState());
    }

    // synchronized is important here to avoid a potential double generation of the same id
    private synchronized String generateAndReserveNewGameId() throws IOException {
        String gameId;
        Path gameDir;
        boolean retry = false;
        do {
            gameId = RandomStringUtils.random(GAME_ID_LENGTH, CHARACTERS_WITHOUT_AMBIGUOUS);
            gameDir = getGameDir(gameId);
            retry = Files.exists(gameDir);
            if (retry) {
                log.info("Retrying generation of new gameId, because generated id '{}' already exists.", gameId);
            }
        } while (retry);
        Files.createDirectories(gameDir);
        return gameId;
    }

    public Path getGameDir(String gameId) {
        validateGameId(gameId);
        // split gameId into two parts. this makes sure we do not create too many
        // folders on one level
        return gamesPath.resolve(gameId.substring(0, 2)).resolve(gameId.substring(2, GAME_ID_LENGTH));
    }

    public static void validateGameId(String gameId) {
        if (gameId.length() != GAME_ID_LENGTH)
            throw new IllegalArgumentException("Wrong gameId length");
        if (!gameIdPattern.matcher(gameId).matches()) {
            throw new IllegalArgumentException("Invalid gameId: " + gameId);
        }
    }

    private void updatePublicRegistry(Game game) {
        if (game == null) return;
        PublicGameInfo info = game.getPublicInfo();
        synchronized (this) {
            if (info == null) {
                publicGamesRegistry.remove(game.gameId);
            } else {
                publicGamesRegistry.put(game.gameId, info);
            }
        }
    }

    public List<PublicGameInfo> getPublicGames() {
        synchronized (this) {
            return new ArrayList<>(publicGamesRegistry.values());
        }
    }

    public void clientDisconnected(Client client) {
        GameRef gameRef;
        synchronized (this) {
            gameRef = clientToGameRef.remove(client);
        }
        if (gameRef == null) {
            return;
        }
        try {
            gameRef.useGame(game -> {
                if (game != null) {
                    game.clientDisconnected(client);
                    updatePublicRegistry(game);
                }
            });
        } finally {
            closeGameRef(gameRef);
        }
    }

    private GameRef getGameRefForClient(Client client) {
        return clientToGameRef.get(client);
    }

    public void handleSettingsAction(Client client, SettingsAction settingsAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle settings. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.settings(client, settingsAction);
            updatePublicRegistry(game);
        });
    }

    public void handleStartAction(Client client, StartAction startAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle start. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.start(client, startAction);
            if (game.isHotPotatoActive()) {
                scheduleHotPotatoTick(game.gameId, game.getHotPotatoTickDelay());
            }
            updatePublicRegistry(game);
        });
    }

    private void scheduleHotPotatoTick(String gameId, int delaySeconds) {
        log.info("GameManager: scheduling hot potato tick for game {} in {}s", gameId, delaySeconds);
        hotPotatoExecutor.schedule(() -> handleHotPotatoTick(gameId), delaySeconds, TimeUnit.SECONDS);
    }

    private void handleHotPotatoTick(String gameId) {
        log.info("GameManager: hot potato tick firing for game {}", gameId);
        GameRef gameRef = getGameRef(gameId);
        try {
            int nextDelay = gameRef.useGame(game -> {
                if (game == null) return 0;
                return game.hotPotatoTick();
            });
            if (nextDelay > 0) {
                scheduleHotPotatoTick(gameId, nextDelay);
            }
        } finally {
            closeGameRef(gameRef);
        }
    }

    public void handleVoteAction(Client client, VoteAction voteAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle vote. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.vote(client, voteAction);
        });
    }

    public void handleRateDrawingAction(Client client, RateDrawingAction action) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle rateDrawing. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.rateDrawing(client, action);
        });
    }

    public void handleTypeAction(Client client, TypeAction typeAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle type. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.type(client, typeAction);
        });
    }

    public void handleDrawingReplayAction(Client client, DrawingReplayAction action) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle drawing replay. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            try {
                game.drawingReplay(client, action);
            } catch (IOException e) {
                log.error("Error handling drawing replay for client {}", client.getId(), e);
            }
        });
    }

    public void handleChatAction(Client client, ChatAction chatAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle chat. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.chat(client, chatAction);
        });
    }

    public void handleKickAction(Client client, KickAction kickAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle kick. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.kick(client, kickAction);
        });
    }

    public void handleBanAction(Client client, BanAction banAction) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle ban. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.ban(client, banAction);
            updatePublicRegistry(game);
        });
    }

    public void handleTeamStrokeAction(Client client, TeamStrokeAction action) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle teamStroke. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.teamStroke(client, action);
        });
    }

    public void handleTeamCanvasRequestAction(Client client, TeamCanvasRequestAction action) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle teamCanvasRequest. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.teamCanvasRequest(client, action);
        });
    }

    public void handleTeamCanvasSyncAction(Client client, TeamCanvasSyncAction action) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle teamCanvasSync. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            game.teamCanvasSync(client, action);
        });
    }

    public void handleReceiveDrawing(Client client, ByteBuffer image) {
        GameRef gameRef = getGameRefForClient(client);
        if (gameRef == null) {
            log.warn("Cannot handle receive drawing. Client {} unknown", client.getId());
            return;
        }
        gameRef.useGame(game -> {
            try {
                game.draw(client, image);
            } catch (IOException e) {
                log.error("Error handling draw action for client {}", client.getId(), e);
            }
        });
    }
}

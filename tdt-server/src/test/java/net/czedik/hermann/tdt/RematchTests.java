package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.SettingsAction;
import net.czedik.hermann.tdt.actions.StartAction;

/**
 * "Play again" (issue #53): once every player has voted, all of them must end up in the new lobby together.
 * Drives the whole flow through {@link GameManager}, the way the browsers do it: each client that is told about the
 * rematch drops its socket to the finished game and opens a fresh one to the new game.
 */
class RematchTests {

    private static final byte[] JPEG_BYTES = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0};
    private static final byte[] PNG_BYTES = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};

    @TempDir
    Path storageDir;

    private GameManager gameManager;

    private String finishedGameId;

    /** A client over a mocked websocket session that records every message it was sent. */
    private static class TestClient {
        final String playerId;
        final String name;
        final Client client;
        final List<JsonNode> messages = new ArrayList<>();

        TestClient(String playerId, String name) throws IOException {
            this.playerId = playerId;
            this.name = name;
            WebSocketSession session = mock(WebSocketSession.class);
            when(session.getId()).thenReturn("session-" + playerId + "-" + System.nanoTime());
            doAnswer(invocation -> {
                TextMessage message = invocation.getArgument(0);
                messages.add(JSONHelper.stringToJsonNode(message.getPayload()));
                return null;
            }).when(session).sendMessage(any(TextMessage.class));
            this.client = new Client(session);
        }

        /** The last player state it was sent, skipping the one-off toast events. */
        JsonNode last() {
            for (int i = messages.size() - 1; i >= 0; i--) {
                String state = messages.get(i).get("state").asText();
                if (!state.equals("playerLeft") && !state.equals("playerRejoined")) {
                    return messages.get(i);
                }
            }
            throw new AssertionError(name + " was sent no state");
        }

        List<String> events() {
            return messages.stream().map(m -> m.get("state").asText())
                    .filter(s -> s.equals("playerLeft") || s.equals("playerRejoined")).toList();
        }

        String state() {
            return last().get("state").asText();
        }
    }

    /** What Game.tsx does on connecting: access, and join with the saved name if it is sent to the join screen. */
    private TestClient connect(String gameId, String playerId, String name) throws IOException {
        TestClient c = new TestClient(playerId, name);
        gameManager.handleAccessAction(c.client, new AccessAction(gameId, playerId));
        if (c.state().equals("join")) {
            gameManager.handleJoinAction(c.client, new JoinAction(gameId, playerId, name, "A", null));
        }
        return c;
    }

    /** Three players who have just finished a (quick, PICTURE_PERFECT) game. */
    private List<TestClient> finishedGame() throws IOException {
        TdtProperties properties = new TdtProperties();
        properties.setStorageDir(storageDir.toString());
        gameManager = new GameManager(properties);

        String gameId = gameManager.newGame(new CreateGameRequest("alice", "Alice", "A", null));
        finishedGameId = gameId;
        List<TestClient> players = new ArrayList<>();
        players.add(connect(gameId, "alice", "Alice"));
        players.add(connect(gameId, "bob", "Bob"));
        players.add(connect(gameId, "carol", "Carol"));

        SettingsAction settings = new SettingsAction();
        settings.setGameMode(GameMode.PICTURE_PERFECT);
        gameManager.handleSettingsAction(players.get(0).client, settings);
        gameManager.handleStartAction(players.get(0).client, new StartAction(0, 0));
        for (TestClient p : players) {
            gameManager.handleReceiveDrawing(p.client, ByteBuffer.wrap(JPEG_BYTES));
        }
        for (TestClient p : players) {
            gameManager.handleReceiveDrawing(p.client, ByteBuffer.wrap(PNG_BYTES));
        }
        for (TestClient p : players) {
            assertEquals("stories", p.state());
        }
        return players;
    }

    private static String rematchGameId(TestClient c) {
        for (JsonNode message : c.messages) {
            if (message.get("state").asText().equals("rematch")) {
                return message.get("newGameId").asText();
            }
        }
        throw new AssertionError(c.name + " was never sent the rematch");
    }

    private static List<String> playerNames(JsonNode lobbyState) {
        List<String> names = new ArrayList<>();
        for (JsonNode player : lobbyState.get("players")) {
            names.add(player.get("name").asText());
        }
        return names;
    }

    private void assertEveryoneInTheNewLobby(List<TestClient> newClients) {
        TestClient alice = newClients.get(0);
        assertEquals("waitForPlayers", alice.state());
        assertEquals(List.of("Alice", "Bob", "Carol"), playerNames(alice.last()));
        for (TestClient c : newClients.subList(1, newClients.size())) {
            assertEquals("waitForGameStart", c.state(), c.name);
            assertEquals(List.of("Alice", "Bob", "Carol"), playerNames(c.last()), c.name);
        }
    }

    /** Each client drops its socket to the finished game and connects to the rematch, in the given order. */
    private List<TestClient> followRematch(List<TestClient> oldClients, List<TestClient> order) throws IOException {
        String newGameId = rematchGameId(oldClients.get(0));
        TestClient[] newClients = new TestClient[oldClients.size()];
        for (TestClient old : order) {
            assertEquals(newGameId, rematchGameId(old), old.name);
            gameManager.clientDisconnected(old.client);
            newClients[oldClients.indexOf(old)] = connect(newGameId, old.playerId, old.name);
        }
        return Arrays.asList(newClients);
    }

    private void everybodyVotes(List<TestClient> players) {
        for (TestClient p : players) {
            gameManager.handleRematchAction(p.client);
        }
    }

    @Test
    void everybodyEndsUpInTheNewLobbyWhenTheCreatorArrivesFirst() throws IOException {
        List<TestClient> players = finishedGame();
        everybodyVotes(players);

        assertEveryoneInTheNewLobby(followRematch(players, players));
    }

    @Test
    void everybodyEndsUpInTheNewLobbyWhenTheCreatorArrivesLast() throws IOException {
        List<TestClient> players = finishedGame();
        everybodyVotes(players);

        assertEveryoneInTheNewLobby(followRematch(players, List.of(players.get(1), players.get(2), players.get(0))));
    }

    /**
     * The reported bug: a player who was offline when the others voted (a phone that went to sleep, a trip to the
     * gallery) comes back to the finished game and presses Play Again. That used to create yet another new game with
     * nobody but them in it; they must follow the others into the rematch instead.
     */
    @Test
    void aPlayerWhoVotesAfterTheRematchWasCreatedFollowsTheOthersIntoIt() throws IOException {
        List<TestClient> players = finishedGame();
        TestClient carol = players.get(2);
        gameManager.clientDisconnected(carol.client);

        everybodyVotes(players.subList(0, 2));
        String newGameId = rematchGameId(players.get(0));
        List<TestClient> arrived = new ArrayList<>(followRematch(players, players.subList(0, 2)).subList(0, 2));

        TestClient carolBack = connect(finishedGameId, carol.playerId, carol.name);
        assertEquals("stories", carolBack.state());
        assertEquals(newGameId, carolBack.last().get("rematchGameId").asText());
        gameManager.handleRematchAction(carolBack.client);

        assertEquals(newGameId, rematchGameId(carolBack));
        arrived.addAll(followRematch(List.of(carolBack), List.of(carolBack)));
        assertEveryoneInTheNewLobby(arrived);
    }

    @Test
    void followingTheRematchIsNotAnnouncedAsPlayersLeavingOrComingBack() throws IOException {
        List<TestClient> players = finishedGame();
        everybodyVotes(players);
        int[] eventsBefore = players.stream().mapToInt(p -> p.events().size()).toArray();

        List<TestClient> newClients = followRematch(players, List.of(players.get(1), players.get(2), players.get(0)));

        for (int i = 0; i < players.size(); i++) {
            assertEquals(eventsBefore[i], players.get(i).events().size(), players.get(i).name + " in the old game");
            assertEquals(List.of(), newClients.get(i).events(), newClients.get(i).name + " in the new lobby");
        }
    }
}

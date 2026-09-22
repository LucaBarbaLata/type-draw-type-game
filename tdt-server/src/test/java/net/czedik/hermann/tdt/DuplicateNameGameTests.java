package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.JoinAction;

/**
 * Verifies that no two players in the same lobby can end up with the same name (see issue #39): players are
 * identified by name in kick/ban targeting, chat and the story credits, so lookalike names have to be rejected
 * at join time.
 */
class DuplicateNameGameTests {

    private static final String GAME_ID = "abcde";

    @TempDir
    Path gameDir;

    private static class TestClient {
        final String playerId;
        final Client client;
        JsonNode lastState;

        TestClient(String playerId) throws IOException {
            this.playerId = playerId;
            WebSocketSession session = mock(WebSocketSession.class);
            when(session.getId()).thenReturn("session-" + playerId);
            doAnswer(invocation -> {
                TextMessage message = invocation.getArgument(0);
                lastState = JSONHelper.stringToJsonNode(message.getPayload());
                return null;
            }).when(session).sendMessage(any(TextMessage.class));
            this.client = new Client(session);
        }

        String state() {
            return lastState.get("state").asText();
        }
    }

    /** Lobby created by "Alice", who is already connected. */
    private Game newGame(TestClient creator) {
        Game game = new Game(GAME_ID, gameDir, new Player(creator.playerId, "Alice", "A", true),
                new TdtProperties.Limits(), true);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        return game;
    }

    private static int playerCount(TestClient client) {
        return client.lastState.get("players").size();
    }

    @Test
    void joiningWithTheCreatorsNameIsRejected() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient impostor = new TestClient("impostor");
        assertFalse(game.join(impostor.client, new JoinAction(GAME_ID, impostor.playerId, "Alice", "B")));

        assertEquals("nameTaken", impostor.state());
        assertEquals("Alice", impostor.lastState.get("name").asText());
        assertEquals(1, playerCount(creator));
    }

    @Test
    void joiningWithAnotherPlayersNameIsRejected() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));

        TestClient otherBob = new TestClient("otherBob");
        assertFalse(game.join(otherBob.client, new JoinAction(GAME_ID, otherBob.playerId, "Bob", "C")));

        assertEquals("nameTaken", otherBob.state());
        assertEquals(2, playerCount(creator));
    }

    @Test
    void namesDifferingOnlyInCaseOrSurroundingSpaceAreRejected() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient upper = new TestClient("upper");
        assertFalse(game.join(upper.client, new JoinAction(GAME_ID, upper.playerId, "ALICE", "B")));
        assertEquals("nameTaken", upper.state());

        TestClient padded = new TestClient("padded");
        assertFalse(game.join(padded.client, new JoinAction(GAME_ID, padded.playerId, "  alice  ", "C")));
        assertEquals("nameTaken", padded.state());

        assertEquals(1, playerCount(creator));
    }

    @Test
    void distinctNamesJoinNormally() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));

        TestClient alicia = new TestClient("alicia");
        assertTrue(game.join(alicia.client, new JoinAction(GAME_ID, alicia.playerId, "Alicia", "C")));

        assertEquals(3, playerCount(creator));
    }

    @Test
    void retryingWithAFreeNameSucceedsAfterRejection() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertFalse(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Alice", "B")));
        assertEquals("nameTaken", bob.state());

        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));
        assertEquals("waitForGameStart", bob.state());
        assertEquals(2, playerCount(creator));
    }

    @Test
    void rejoiningWithOnesOwnNameIsNotRejected() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));

        // same player ID on a second device / after a reload
        TestClient bobSecondClient = new TestClient("bob");
        assertTrue(game.join(bobSecondClient.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));

        assertEquals("waitForGameStart", bobSecondClient.state());
        assertEquals(2, playerCount(creator));
    }

    @Test
    void nameOfAPlayerWhoLeftBecomesFreeAgain() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));
        game.clientDisconnected(bob.client);
        assertEquals(1, playerCount(creator));

        TestClient newBob = new TestClient("newBob");
        assertTrue(game.join(newBob.client, new JoinAction(GAME_ID, newBob.playerId, "Bob", "C")));
        assertEquals(2, playerCount(creator));
    }
}

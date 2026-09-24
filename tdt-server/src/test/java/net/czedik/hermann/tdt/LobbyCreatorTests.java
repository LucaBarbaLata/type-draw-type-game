package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.StartAction;

/**
 * A lobby must always have exactly one creator (issue #47). Reloading the page drops a player's last client, which
 * takes them out of the lobby, so the creator reloading used to leave a lobby nobody owned: it could not be started
 * any more, and the clients crashed on rendering the name of a host that was not there — the reported black screen.
 */
class LobbyCreatorTests {

    private static final String GAME_ID = "abcde";

    @TempDir
    Path gameDir;

    /** A client over a mocked websocket session that records every message it was sent. */
    private static class TestClient {
        final String playerId;
        final Client client;
        final List<JsonNode> messages = new ArrayList<>();

        TestClient(String playerId) throws IOException {
            this.playerId = playerId;
            WebSocketSession session = mock(WebSocketSession.class);
            when(session.getId()).thenReturn("session-" + playerId + "-" + System.nanoTime());
            doAnswer(invocation -> {
                TextMessage message = invocation.getArgument(0);
                messages.add(JSONHelper.stringToJsonNode(message.getPayload()));
                return null;
            }).when(session).sendMessage(any(TextMessage.class));
            this.client = new Client(session);
        }

        JsonNode last() {
            return messages.get(messages.size() - 1);
        }

        String state() {
            return last().get("state").asText();
        }
    }

    private Game game;

    /** A lobby created by Alice, who is connected to it. */
    private TestClient newLobby() throws IOException {
        TestClient alice = new TestClient("alice");
        game = new Game(GAME_ID, gameDir, new Player(alice.playerId, "Alice", "A", true, null),
                new TdtProperties.Limits(), true);
        game.access(alice.client, new AccessAction(GAME_ID, alice.playerId));
        return alice;
    }

    /** What a page reload does: the old client goes away, then a fresh one shows up for the same player. */
    private TestClient reload(TestClient player, String name) throws IOException {
        game.clientDisconnected(player.client);
        TestClient reloaded = new TestClient(player.playerId);
        game.access(reloaded.client, new AccessAction(GAME_ID, reloaded.playerId));
        if (reloaded.state().equals("join")) {
            // Being dropped from the lobby sends the player back through the join screen
            game.join(reloaded.client, new JoinAction(GAME_ID, reloaded.playerId, name, "A", null));
        }
        return reloaded;
    }

    /** The name of the lobby's creator, as the clients read it off a lobby state to show who can start the game. */
    private static String creatorIn(JsonNode lobbyState) {
        JsonNode players = lobbyState.get("players");
        assertNotNull(players, "expected a lobby state with a player list");
        String creator = null;
        for (JsonNode player : players) {
            if (player.get("isCreator").asBoolean()) {
                assertNotNull(player.get("name").asText());
                assertTrue(creator == null, "a lobby must not have two creators");
                creator = player.get("name").asText();
            }
        }
        assertNotNull(creator, "a lobby must always have a creator");
        return creator;
    }

    @Test
    void theCreatorReloadingAloneInTheLobbyGetsTheirLobbyBack() throws IOException {
        TestClient alice = reload(newLobby(), "Alice");

        assertEquals("waitForPlayers", alice.state());
        assertEquals("Alice", creatorIn(alice.last()));
    }

    @Test
    void theLobbyCanStillBeStartedAfterTheCreatorReloaded() throws IOException {
        TestClient alice = reload(newLobby(), "Alice");

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", null)));
        game.start(alice.client, new StartAction(0, 0));

        assertEquals("type", alice.state());
        assertEquals("type", bob.state());
    }

    @Test
    void theLobbyKeepsACreatorWhenTheCreatorReloadsWithOthersInIt() throws IOException {
        TestClient alice = newLobby();
        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", null)));

        TestClient reloadedAlice = reload(alice, "Alice");

        // Bob was promoted when Alice's client went away, so Alice comes back as an ordinary player
        assertEquals("Bob", creatorIn(bob.last()));
        assertEquals("waitForPlayers", bob.state());
        assertEquals("Bob", creatorIn(reloadedAlice.last()));
        assertEquals("waitForGameStart", reloadedAlice.state());
    }

    @Test
    void aReloadingPlayerDoesNotTakeTheLobbyFromItsCreator() throws IOException {
        TestClient alice = newLobby();
        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", null)));

        TestClient reloadedBob = reload(bob, "Bob");

        assertEquals("Alice", creatorIn(reloadedBob.last()));
        assertEquals("waitForGameStart", reloadedBob.state());
        assertEquals("Alice", creatorIn(alice.last()));
        assertEquals("waitForPlayers", alice.state());
    }
}

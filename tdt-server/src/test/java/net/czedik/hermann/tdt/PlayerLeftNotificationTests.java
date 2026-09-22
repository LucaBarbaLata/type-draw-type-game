package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import net.czedik.hermann.tdt.actions.BanAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.KickAction;
import net.czedik.hermann.tdt.actions.StartAction;

/**
 * Verifies the {@code playerLeft} event the clients turn into a toast (see issue #45): everyone still in the game
 * is told when somebody drops out of it, and told why, while the player who dropped out is not.
 */
class PlayerLeftNotificationTests {

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

        /** The last message with the given state, so an event does not hide the player state (or vice versa). */
        JsonNode lastMessage(String state) {
            for (int i = messages.size() - 1; i >= 0; i--) {
                if (messages.get(i).get("state").asText().equals(state)) return messages.get(i);
            }
            return null;
        }

        boolean received(String state) {
            return lastMessage(state) != null;
        }

        String state() {
            return messages.get(messages.size() - 1).get("state").asText();
        }
    }

    private Game game;
    private final List<TestClient> players = new ArrayList<>();

    /** Lobby created by "Alice", joined by as many of Bob, Carol, Dave as asked for. Index 0 is the creator. */
    private void newLobby(int numPlayers) throws IOException {
        List<String> names = List.of("Alice", "Bob", "Carol", "Dave");
        TestClient creator = new TestClient("alice");
        game = new Game(GAME_ID, gameDir, new Player(creator.playerId, names.get(0), "A", true, null),
                new TdtProperties.Limits(), true);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        players.add(creator);

        for (String name : names.subList(1, numPlayers)) {
            TestClient player = new TestClient(name.toLowerCase());
            assertTrue(game.join(player.client, new JoinAction(GAME_ID, player.playerId, name, "B", null)));
            players.add(player);
        }
    }

    private static void assertLeftEvent(TestClient client, String name, String reason) {
        JsonNode event = client.lastMessage("playerLeft");
        assertNotNull(event, "expected a playerLeft event");
        assertEquals(name, event.get("player").get("name").asText());
        assertEquals(reason, event.get("reason").asText());
    }

    @Test
    void theOthersAreToldWhenAPlayerLeavesTheLobby() throws IOException {
        newLobby(3);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);
        TestClient carol = players.get(2);

        game.clientDisconnected(bob.client);

        assertLeftEvent(alice, "Bob", "left");
        assertLeftEvent(carol, "Bob", "left");
        // the toast comes first, so the player list a client renders afterwards is already the one without Bob
        assertEquals("waitForPlayers", alice.state());
        assertEquals(2, alice.lastMessage("waitForPlayers").get("players").size());
    }

    @Test
    void aPlayerWithAnotherConnectedClientHasNotLeft() throws IOException {
        newLobby(2);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);

        // Bob opens the game in a second tab, then closes the first one
        TestClient bobSecondTab = new TestClient(bob.playerId);
        assertTrue(game.join(bobSecondTab.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", null)));
        game.clientDisconnected(bob.client);

        assertFalse(alice.received("playerLeft"));
        assertEquals(2, alice.lastMessage("waitForPlayers").get("players").size());
    }

    @Test
    void aDisconnectDuringTheGameIsAnnouncedAsALostConnection() throws IOException {
        newLobby(3);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);
        TestClient carol = players.get(2);
        game.start(alice.client, new StartAction(0, 0));

        game.clientDisconnected(bob.client);

        assertLeftEvent(alice, "Bob", "disconnected");
        assertLeftEvent(carol, "Bob", "disconnected");
        // Bob keeps his slot in the running game and can come back to it
        assertTrue(game.access(bob.client, new AccessAction(GAME_ID, bob.playerId)));
        assertEquals("type", bob.state());
    }

    @Test
    void spectatorsAreToldAboutADisconnectToo() throws IOException {
        newLobby(3);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);
        game.start(alice.client, new StartAction(0, 0));

        TestClient spectator = new TestClient("spectator");
        game.access(spectator.client, new AccessAction(GAME_ID, spectator.playerId));
        assertEquals("spectator", spectator.state());

        game.clientDisconnected(bob.client);

        assertLeftEvent(spectator, "Bob", "disconnected");
    }

    @Test
    void aKickIsAnnouncedToTheOthersButNotToTheKickedPlayer() throws IOException {
        newLobby(3);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);
        TestClient carol = players.get(2);

        game.kick(alice.client, new KickAction("Bob"));

        assertLeftEvent(alice, "Bob", "kicked");
        assertLeftEvent(carol, "Bob", "kicked");
        assertFalse(bob.received("playerLeft"));
        assertEquals("kicked", bob.state());
    }

    @Test
    void aBanIsAnnouncedToTheOthersButNotToTheBannedPlayer() throws IOException {
        newLobby(3);
        TestClient alice = players.get(0);
        TestClient bob = players.get(1);
        TestClient carol = players.get(2);

        game.ban(alice.client, new BanAction("Bob"));

        assertLeftEvent(alice, "Bob", "banned");
        assertLeftEvent(carol, "Bob", "banned");
        assertFalse(bob.received("playerLeft"));
        assertEquals("banned", bob.state());
    }
}

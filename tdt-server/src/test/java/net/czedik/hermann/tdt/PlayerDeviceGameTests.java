package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
 * The device a player reports at join time is decoration — the lobby shows a phone or a computer icon next to
 * the name — so the rules here are all about it never getting in the way: an unknown device is a normal value,
 * and nothing about joining may depend on one being reported.
 */
class PlayerDeviceGameTests {

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
    }

    /** Lobby created by "Alice" on a computer, who is already connected. */
    private Game newGame(TestClient creator) {
        Game game = new Game(GAME_ID, gameDir, new Player(creator.playerId, "Alice", "A", true, DeviceType.DESKTOP),
                new TdtProperties.Limits(), true);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        return game;
    }

    /** The device of the player at {@code index} as the lobby of {@code viewer} last saw it. */
    private static JsonNode deviceOf(TestClient viewer, int index) {
        return viewer.lastState.get("players").get(index).get("device");
    }

    @Test
    void everyPlayerSeesWhatTheOthersArePlayingOn() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", DeviceType.MOBILE)));

        assertEquals("DESKTOP", deviceOf(creator, 0).asText());
        assertEquals("MOBILE", deviceOf(creator, 1).asText());
        // and Bob's own lobby says the same about both of them
        assertEquals("DESKTOP", deviceOf(bob, 0).asText());
        assertEquals("MOBILE", deviceOf(bob, 1).asText());
    }

    @Test
    void aClientThatReportsNoDeviceStillJoins() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", null)));

        assertEquals(2, creator.lastState.get("players").size());
        assertTrue(deviceOf(creator, 1).isNull(), "an unreported device stays unknown rather than being guessed");
    }

    /** An old client sends a join without the field at all; it must not fail to deserialize. */
    @Test
    void aJoinWithoutTheDeviceFieldDeserializes() throws Exception {
        JsonNode content = JSONHelper.stringToJsonNode(
                "{\"gameId\":\"abcde\",\"playerId\":\"bob\",\"name\":\"Bob\",\"face\":\"B\"}");
        JoinAction action = JSONHelper.objectMapper.treeToValue(content, JoinAction.class);

        assertNull(action.device());
    }

    /** A value we do not know is unknown, not a deserialization failure that would break the whole join. */
    @Test
    void anUnrecognizedDeviceBecomesUnknown() throws Exception {
        JsonNode content = JSONHelper.stringToJsonNode(
                "{\"gameId\":\"abcde\",\"playerId\":\"bob\",\"name\":\"Bob\",\"face\":\"B\",\"device\":\"TOASTER\"}");
        JoinAction action = JSONHelper.objectMapper.treeToValue(content, JoinAction.class);

        assertNull(action.device());
    }

    /** Games stored before players reported a device have to keep loading. */
    @Test
    void aStoredPlayerWithoutTheDeviceFieldDeserializes() throws Exception {
        Player player = JSONHelper.objectMapper.readValue(
                "{\"id\":\"bob\",\"name\":\"Bob\",\"face\":\"B\",\"isCreator\":false}", Player.class);

        assertEquals("Bob", player.name());
        assertNull(player.device());
    }

    @Test
    void aPlayerPromotedToCreatorKeepsTheirDevice() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B", DeviceType.MOBILE)));

        game.clientDisconnected(creator.client);

        assertEquals(1, bob.lastState.get("players").size());
        assertTrue(bob.lastState.get("players").get(0).get("isCreator").asBoolean());
        assertEquals("MOBILE", deviceOf(bob, 0).asText());
    }
}

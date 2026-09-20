package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import net.czedik.hermann.tdt.actions.ChatAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.SettingsAction;

/**
 * Verifies that the instance-wide limits from {@link TdtProperties.Limits} and the public-games switch are
 * enforced by {@link Game} on top of the lobby creator's own settings.
 */
class ServerLimitsGameTests {

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

    private Game newGame(TestClient creator, TdtProperties.Limits limits, boolean publicGamesEnabled) {
        Game game = new Game(GAME_ID, gameDir, new Player(creator.playerId, "Alice", "A", true), limits,
                publicGamesEnabled);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        return game;
    }

    private static SettingsAction settings(int maxPlayers, boolean isPublic) {
        SettingsAction settings = new SettingsAction();
        settings.setMaxPlayers(maxPlayers);
        settings.setPublic(isPublic);
        settings.setChatEnabled(true);
        return settings;
    }

    @Test
    void serverMaxPlayersCapsJoinsEvenWhenLobbyIsUnlimited() throws IOException {
        TdtProperties.Limits limits = new TdtProperties.Limits();
        limits.setMaxPlayers(2);
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, limits, true);

        TestClient bob = new TestClient("bob");
        assertTrue(game.join(bob.client, new JoinAction(GAME_ID, bob.playerId, "Bob", "B")));

        TestClient carol = new TestClient("carol");
        assertFalse(game.join(carol.client, new JoinAction(GAME_ID, carol.playerId, "Carol", "C")));
        assertEquals("alreadyStartedGame", carol.state());
    }

    @Test
    void lobbyMaxPlayersAboveServerCapIsClampedInPublicInfo() throws IOException {
        TdtProperties.Limits limits = new TdtProperties.Limits();
        limits.setMaxPlayers(4);
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, limits, true);

        game.settings(creator.client, settings(12, true));

        PublicGameInfo info = game.getPublicInfo();
        assertNotNull(info);
        assertEquals(4, info.maxPlayers());
    }

    @Test
    void withoutServerCapLobbySettingApplies() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, new TdtProperties.Limits(), true);

        game.settings(creator.client, settings(12, true));

        PublicGameInfo info = game.getPublicInfo();
        assertNotNull(info);
        assertEquals(12, info.maxPlayers());
    }

    @Test
    void publicGamesDisabledHidesLobbyFromBrowser() throws IOException {
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, new TdtProperties.Limits(), false);

        game.settings(creator.client, settings(0, true));

        assertNull(game.getPublicInfo());
    }

    @Test
    void chatMessagesLongerThanLimitAreDropped() throws IOException {
        TdtProperties.Limits limits = new TdtProperties.Limits();
        limits.setMaxChatTextLength(5);
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, limits, true);

        game.chat(creator.client, new ChatAction("hello"));
        assertEquals(1, creator.lastState.get("chatMessages").size());

        game.chat(creator.client, new ChatAction("too long"));
        assertEquals(1, creator.lastState.get("chatMessages").size());
    }

    @Test
    void chatKeepsOnlyTheMostRecentMessages() throws IOException {
        TdtProperties.Limits limits = new TdtProperties.Limits();
        limits.setMaxChatMessages(2);
        TestClient creator = new TestClient("creator");
        Game game = newGame(creator, limits, true);

        game.chat(creator.client, new ChatAction("one"));
        game.chat(creator.client, new ChatAction("two"));
        game.chat(creator.client, new ChatAction("three"));

        JsonNode messages = creator.lastState.get("chatMessages");
        assertEquals(2, messages.size());
        assertEquals("two", messages.get(0).get("text").asText());
        assertEquals("three", messages.get(1).get("text").asText());
    }
}

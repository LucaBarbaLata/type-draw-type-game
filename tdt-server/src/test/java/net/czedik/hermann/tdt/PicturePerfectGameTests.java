package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.RateDrawingAction;
import net.czedik.hermann.tdt.actions.SettingsAction;
import net.czedik.hermann.tdt.actions.StartAction;
import net.czedik.hermann.tdt.actions.TypeAction;
import net.czedik.hermann.tdt.playerstate.FrontendStory;

/**
 * Drives a whole PICTURE_PERFECT game through the public API of {@link Game}, observing the player states the
 * game sends to (mocked) websocket sessions.
 */
class PicturePerfectGameTests {

    private static final String GAME_ID = "abcde";

    private static final byte[] JPEG_BYTES = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0};
    private static final byte[] PNG_BYTES = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};

    @TempDir
    Path gameDir;

    private Game game;
    private final List<TestClient> players = new ArrayList<>();

    /** A client over a mocked websocket session that records the last state JSON it was sent. */
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

    @BeforeEach
    void setUpGame() throws IOException {
        TestClient creator = new TestClient("creator");
        game = new Game(GAME_ID, gameDir, new Player(creator.playerId, "Alice", "A", true, null),
                new TdtProperties.Limits(), true);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        players.add(creator);

        for (String name : List.of("Bob", "Carol")) {
            TestClient player = new TestClient(name.toLowerCase());
            game.join(player.client, new JoinAction(GAME_ID, player.playerId, name, "B", null));
            players.add(player);
        }

        SettingsAction settings = new SettingsAction();
        settings.setGameMode(GameMode.PICTURE_PERFECT);
        game.settings(creator.client, settings);
    }

    private void start() {
        game.start(players.get(0).client, new StartAction(0, 0));
    }

    private void uploadAll() throws IOException {
        for (TestClient player : players) {
            game.draw(player.client, ByteBuffer.wrap(JPEG_BYTES));
        }
    }

    private long countFiles(String suffix) throws IOException {
        try (Stream<Path> files = Files.list(gameDir)) {
            return files.filter(p -> p.getFileName().toString().endsWith(suffix)).count();
        }
    }

    @Test
    void startSendsUploadStateWithTwoRounds() {
        start();

        for (TestClient player : players) {
            assertEquals("upload", player.state());
            assertEquals(1, player.lastState.get("round").asInt());
            assertEquals(2, player.lastState.get("rounds").asInt());
            assertEquals("PICTURE_PERFECT", player.lastState.get("gameMode").asText());
        }
    }

    @Test
    void typingIsIgnoredInUploadRound() {
        start();

        game.type(players.get(1).client, new TypeAction("not allowed"));

        for (TestClient player : players) {
            assertEquals("upload", player.state());
        }
    }

    @Test
    void invalidUploadsAreIgnored() throws IOException {
        start();

        game.draw(players.get(0).client, ByteBuffer.wrap("this is not an image".getBytes()));
        game.draw(players.get(0).client, ByteBuffer.allocate(3 * 1024 * 1024));
        game.draw(players.get(0).client, ByteBuffer.wrap(Arrays.copyOf(JPEG_BYTES, 2)));

        assertEquals("upload", players.get(0).state());
        assertEquals(0, countFiles(".jpg") + countFiles(".png"));
    }

    @Test
    void uploadsAdvanceToDrawRoundWithSomebodyElsesPhoto() throws IOException {
        start();

        game.draw(players.get(0).client, ByteBuffer.wrap(JPEG_BYTES));
        assertEquals("waitForRoundFinish", players.get(0).state());
        assertEquals("upload", players.get(0).lastState.get("roundKind").asText());
        assertEquals("upload", players.get(1).state());
        assertEquals(1, players.get(1).lastState.get("finishedPlayers").size());

        // a second upload from the same player is ignored
        game.draw(players.get(0).client, ByteBuffer.wrap(JPEG_BYTES));
        assertEquals(1, countFiles(".jpg"));

        game.draw(players.get(1).client, ByteBuffer.wrap(PNG_BYTES));
        game.draw(players.get(2).client, ByteBuffer.wrap(JPEG_BYTES));

        assertEquals(2, countFiles(".jpg"));
        assertEquals(1, countFiles(".png"));

        Set<String> photoUrls = new HashSet<>();
        for (TestClient player : players) {
            assertEquals("draw", player.state());
            assertEquals(2, player.lastState.get("round").asInt());
            assertEquals(2, player.lastState.get("rounds").asInt());
            assertEquals("", player.lastState.get("text").asText());
            String referenceImageSrc = player.lastState.get("referenceImageSrc").asText();
            assertTrue(referenceImageSrc.startsWith("/api/image/" + GAME_ID + "/"), referenceImageSrc);
            assertTrue(referenceImageSrc.endsWith(".jpg") || referenceImageSrc.endsWith(".png"), referenceImageSrc);
            photoUrls.add(referenceImageSrc);
            // nobody redraws their own photo
            String textWriter = player.lastState.get("textWriter").get("name").asText();
            assertNotEquals(ownName(player), textWriter);
        }
        assertEquals(players.size(), photoUrls.size(), "every photo is redrawn exactly once");
    }

    @Test
    void drawingsFinishTheGameWithPhotoAndDrawingPerStory() throws IOException {
        start();
        uploadAll();

        for (TestClient player : players) {
            game.draw(player.client, ByteBuffer.wrap(PNG_BYTES));
        }

        for (TestClient player : players) {
            assertEquals("stories", player.state());
        }

        FrontendStory[] stories = game.getFinishedStoriesForGallery();
        assertEquals(players.size(), stories.length);
        for (FrontendStory story : stories) {
            assertEquals(2, story.elements().length);
            assertEquals("photo", story.elements()[0].type());
            assertTrue(story.elements()[0].content().startsWith("/api/image/"));
            assertNull(story.elements()[0].replayUrl());
            assertEquals("image", story.elements()[1].type());
            assertTrue(story.elements()[1].content().endsWith(".png"));
            assertNotEquals(story.elements()[0].player().name(), story.elements()[1].player().name());
        }

        // photos cannot be rated, drawings can
        game.rateDrawing(players.get(0).client, new RateDrawingAction(0, 0, "🔥"));
        assertTrue(game.getFinishedStoriesForGallery()[0].elements()[0].reactions().isEmpty());
        game.rateDrawing(players.get(0).client, new RateDrawingAction(0, 1, "🔥"));
        assertEquals(1, game.getFinishedStoriesForGallery()[0].elements()[1].reactions().get("🔥"));
    }

    @Test
    void spectatorsSeeNoLiveDrawingsDuringUploadRoundAndPhotoPromptDuringDrawRound() throws IOException {
        start();

        TestClient spectator = new TestClient("spectator");
        game.access(spectator.client, new AccessAction(GAME_ID, spectator.playerId));
        assertEquals("spectator", spectator.state());
        assertEquals(0, spectator.lastState.get("currentDrawings").size());

        uploadAll();

        assertEquals("spectator", spectator.state());
        JsonNode currentDrawings = spectator.lastState.get("currentDrawings");
        assertEquals(players.size(), currentDrawings.size());
        for (JsonNode drawing : currentDrawings) {
            assertEquals("", drawing.get("prompt").asText());
            assertTrue(drawing.get("promptImageSrc").asText().startsWith("/api/image/"));
        }
        // spectators see the uploaded photos as the first element of the partial stories
        for (JsonNode story : spectator.lastState.get("stories")) {
            assertEquals("photo", story.get("elements").get(0).get("type").asText());
        }
        assertFalse(spectator.lastState.get("stories").isEmpty());
    }

    private static String ownName(TestClient player) {
        return switch (player.playerId) {
            case "creator" -> "Alice";
            case "bob" -> "Bob";
            case "carol" -> "Carol";
            default -> throw new IllegalArgumentException(player.playerId);
        };
    }
}

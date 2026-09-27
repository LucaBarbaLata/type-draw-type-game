package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GameManagerTests {

    @TempDir
    Path storageDir;

    @Test
    void testValidateGameId() {
        GameManager.validateGameId("abcde"); // valid

        assertThrows(NullPointerException.class, () -> GameManager.validateGameId(null));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId(""));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("abcd"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("abcdef"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("ab.de"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("ab-de"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("ab_de"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("abćde"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("ab♥de"));
        assertThrows(IllegalArgumentException.class, () -> GameManager.validateGameId("abcdl"));
    }

    // issue #56: a gameId from a request URL must never resolve outside the games directory
    @Test
    void testGetGameDirStaysInsideGamesDir() {
        GameManager gameManager = newGameManager();
        Path gamesDir = storageDir.toAbsolutePath().normalize().resolve("games");

        Path gameDir = gameManager.getGameDir("abcde");
        assertEquals(gamesDir.resolve("ab").resolve("cde"), gameDir);
        assertTrue(gameDir.startsWith(gamesDir));

        for (String traversal : new String[] { "..", "../..", "..%2f", "ab/..", "a/../", "..\\..", "/etc/", "C:\\x" }) {
            assertThrows(IllegalArgumentException.class, () -> gameManager.getGameDir(traversal), traversal);
        }
    }

    @Test
    void testGetFinishedGameStoriesRejectsTraversal() {
        GameManager gameManager = newGameManager();
        assertNull(gameManager.getFinishedGameStories("../.."));
        assertNull(gameManager.getFinishedGameStories("abcde")); // unknown game
    }

    private GameManager newGameManager() {
        TdtProperties properties = new TdtProperties();
        properties.setStorageDir(storageDir.toString());
        return new GameManager(properties);
    }
}

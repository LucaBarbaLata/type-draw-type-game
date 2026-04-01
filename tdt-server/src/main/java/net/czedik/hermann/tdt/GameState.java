package net.czedik.hermann.tdt;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * This one gets stored/read from disk, so be careful with changes: they need to
 * be backwards compatible.
 */
public class GameState {
    public List<Player> players = new ArrayList<>();

    /**
     * Current round number (zero based)
     */
    public int round = 0;

    public State state = State.WaitingForPlayers;

    public int[][] gameMatrix = null;

    public Story[] stories = null;

    /**
     * Timer per round in seconds. 0 means no timer.
     */
    public int roundTimerSeconds = 0;

    /**
     * Maximum number of players. 0 means unlimited.
     */
    public int maxPlayers = 0;

    /**
     * Votes cast by players: playerId -> storyIndex
     */
    public java.util.Map<String, Integer> votes = new java.util.HashMap<>();

    /**
     * Replay file IDs: "storyIndex_roundIndex" -> replayId (UUID, stored as replayId.replay.json)
     */
    public java.util.Map<String, String> replayFiles = new java.util.HashMap<>();

    /**
     * Drawing reactions: "storyIndex_roundIndex" -> (playerId -> emoji).
     */
    public java.util.Map<String, java.util.Map<String, String>> drawingReactions = new java.util.HashMap<>();

    /**
     * Whether lobby chat is enabled. Default true.
     */
    public boolean chatEnabled = true;

    /**
     * Whether this game is listed in the public browser. Default false.
     */
    public boolean isPublic = false;

    /**
     * Player IDs that have been banned from this lobby.
     */
    public Set<String> bannedPlayerIds = new HashSet<>();

    /**
     * The game mode for this session. Null values from old persisted state are treated as CLASSIC.
     */
    public GameMode gameMode = GameMode.CLASSIC;

    /**
     * Team pairs for TEAM mode: teamPairs[pairIndex] = { playerIndex0, playerIndex1 }.
     * A solo player (odd count) is represented as { playerIndex }.
     */
    public int[][] teamPairs = null;

    // --- Hot Potato settings (relevant only when gameMode == HOT_POTATO) ---

    /** Seconds each player draws before a canvas rotation. */
    public int hotPotatoIntervalSeconds = 30;

    /** Total seconds the hot potato game lasts; determines number of rotations. */
    public int hotPotatoTotalSeconds = 180;

    // --- Hot Potato runtime state (populated at startGame, not stored between restarts) ---

    /** Total number of canvas rotations for this game. */
    public int hotPotatoTotalRotations = 0;

    /** Current rotation index (0-based). */
    public int hotPotatoCurrentRotation = 0;

    /**
     * Rotation assignment matrix: hotPotatoMatrix[rotationIndex][playerIndex] = storyIndex.
     * Player p works on story hotPotatoMatrix[r][p] during rotation r.
     */
    public int[][] hotPotatoMatrix = null;

    /**
     * Player IDs that have submitted a canvas for the current rotation.
     */
    public java.util.Set<String> hotPotatoSubmitted = new java.util.HashSet<>();

    public enum State {
        WaitingForPlayers,
        Started,
        Finished
    }
}

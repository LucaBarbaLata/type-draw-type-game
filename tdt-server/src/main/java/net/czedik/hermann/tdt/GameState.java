package net.czedik.hermann.tdt;

import java.util.ArrayList;
import java.util.List;

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
     * Whether lobby chat is enabled. Default true.
     */
    public boolean chatEnabled = true;

    /**
     * Whether this game is listed in the public browser. Default false.
     */
    public boolean isPublic = false;

    public enum State {
        WaitingForPlayers,
        Started,
        Finished
    }
}

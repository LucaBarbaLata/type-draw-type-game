package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

import java.util.List;

/**
 * Sent to spectators while the game is in progress.
 */
public class SpectatorState implements PlayerState {

    /** Current round number (1-based). */
    public final int round;

    /** Total number of rounds. */
    public final int rounds;

    public final List<PlayerInfo> players;

    /** Players who have not yet submitted in the current round. */
    public final List<PlayerInfo> waitingForPlayers;

    /** Partial stories — only completed elements are included. */
    public final FrontendStory[] stories;

    public SpectatorState(int round, int rounds,
                          List<PlayerInfo> players,
                          List<PlayerInfo> waitingForPlayers,
                          FrontendStory[] stories) {
        this.round = round;
        this.rounds = rounds;
        this.players = players;
        this.waitingForPlayers = waitingForPlayers;
        this.stories = stories;
    }

    @Override
    public String getState() {
        return "spectator";
    }
}

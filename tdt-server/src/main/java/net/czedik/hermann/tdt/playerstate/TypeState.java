package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

import java.util.Objects;

public class TypeState implements PlayerState {

    /**
     * Current round number (1-based)
     */
    public final int round;

    /**
     * Total number of rounds
     */
    public final int rounds;

    /**
     * Filename of the drawing. Will be null in the first round.
     */
    public final String drawingSrc;

    /**
     * Player that made the drawing. (Null in the first round.)
     */
    public final PlayerInfo artist;

    /**
     * Seconds allowed per round. 0 means no timer.
     */
    public final int roundTimerSeconds;

    public TypeState(int round, int rounds, int roundTimerSeconds) {
        if (round < 1)
            throw new IllegalArgumentException("Round must be positive number");
        this.round = round;
        this.rounds = rounds;
        this.drawingSrc = null;
        this.artist = null;
        this.roundTimerSeconds = roundTimerSeconds;
    }

    public TypeState(int round, int rounds, String drawingSrc, PlayerInfo artist, int roundTimerSeconds) {
        if (round < 1)
            throw new IllegalArgumentException("Round must be positive number");
        this.round = round;
        this.rounds = rounds;
        this.drawingSrc = Objects.requireNonNull(drawingSrc);
        this.artist = Objects.requireNonNull(artist);
        this.roundTimerSeconds = roundTimerSeconds;
    }

    @Override
    public String getState() {
        return "type";
    }
}

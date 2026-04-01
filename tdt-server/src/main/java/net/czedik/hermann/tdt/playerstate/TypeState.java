package net.czedik.hermann.tdt.playerstate;

import com.fasterxml.jackson.annotation.JsonInclude;
import net.czedik.hermann.tdt.GameMode;
import net.czedik.hermann.tdt.PlayerInfo;

import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
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

    /**
     * The active game mode.
     */
    public final GameMode gameMode;

    /**
     * Team partner info. Only set in TEAM mode.
     */
    public final PlayerInfo teamPartner;

    public TypeState(int round, int rounds, int roundTimerSeconds, GameMode gameMode) {
        this(round, rounds, null, null, roundTimerSeconds, gameMode, null);
    }

    public TypeState(int round, int rounds, String drawingSrc, PlayerInfo artist, int roundTimerSeconds, GameMode gameMode) {
        this(round, rounds, drawingSrc, artist, roundTimerSeconds, gameMode, null);
    }

    public TypeState(int round, int rounds, String drawingSrc, PlayerInfo artist, int roundTimerSeconds, GameMode gameMode, PlayerInfo teamPartner) {
        if (round < 1)
            throw new IllegalArgumentException("Round must be positive number");
        this.round = round;
        this.rounds = rounds;
        this.drawingSrc = drawingSrc;
        this.artist = artist;
        this.roundTimerSeconds = roundTimerSeconds;
        this.gameMode = gameMode;
        this.teamPartner = teamPartner;
    }

    @Override
    public String getState() {
        return "type";
    }
}

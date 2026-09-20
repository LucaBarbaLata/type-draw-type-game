package net.czedik.hermann.tdt.playerstate;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import net.czedik.hermann.tdt.GameMode;
import net.czedik.hermann.tdt.PlayerInfo;

/**
 * UploadState: the player has to upload a photo (first round of PICTURE_PERFECT mode).
 *
 * @param round             Current round number (1-based)
 * @param rounds            Total number of rounds
 * @param roundTimerSeconds seconds allowed per round, 0 means no timer
 * @param gameMode          the active game mode (always PICTURE_PERFECT)
 * @param finishedPlayers   players who have already uploaded their photo this round
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UploadState(
        int round,
        int rounds,
        int roundTimerSeconds,
        GameMode gameMode,
        List<PlayerInfo> finishedPlayers) implements PlayerState {

    public UploadState {
        if (round < 1)
            throw new IllegalArgumentException("Round must be positive number");
    }

    @Override
    public String getState() {
        return "upload";
    }
}

package net.czedik.hermann.tdt.playerstate;

import com.fasterxml.jackson.annotation.JsonInclude;
import net.czedik.hermann.tdt.GameMode;

/**
 * Sent to each player during a Hot Canvas round. Contains which rotation they
 * are on, how long they have to draw, and the current canvas to continue from.
 *
 * @param rotationNumber   1-based current rotation number
 * @param totalRotations   total number of rotations in this game
 * @param intervalSeconds  seconds this player has to draw before the next rotation
 * @param initialCanvasUrl URL of the canvas to pre-load, or null for the first rotation
 * @param gameMode         the active game mode (always HOT_POTATO)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HotPotatoDrawState(
        int rotationNumber,
        int totalRotations,
        int intervalSeconds,
        String initialCanvasUrl,
        GameMode gameMode
) implements PlayerState {

    @Override
    public String getState() {
        return "hotPotatoDraw";
    }
}

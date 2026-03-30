package net.czedik.hermann.tdt.playerstate;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Relayed to a player's partner during a TEAM mode draw round.
 * Contains the stroke segment to apply to the partner's canvas.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TeamStrokeEvent(
        String type,
        String tool,
        double x0,
        double y0,
        Double x1,
        Double y1,
        String color,
        int brushPixelSize,
        int round,
        String fromPlayer
) implements PlayerState {

    @Override
    public String getState() {
        return "teamStroke";
    }
}

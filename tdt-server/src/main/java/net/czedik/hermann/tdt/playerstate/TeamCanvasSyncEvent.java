package net.czedik.hermann.tdt.playerstate;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Relayed to a player's team partner carrying the sender's current canvas as a PNG data URL.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TeamCanvasSyncEvent(
        String imageDataUrl,
        int round,
        String fromPlayer
) implements PlayerState {

    @Override
    public String getState() {
        return "teamCanvasSync";
    }
}

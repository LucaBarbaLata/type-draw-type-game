package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Represents a player currently in a draw round, with the prompt they are drawing.
 *
 * @param prompt         the text being drawn (empty when drawing a reference photo)
 * @param promptImageSrc URL of the reference photo being redrawn (only set in PICTURE_PERFECT mode)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpectatorCurrentDrawing(PlayerInfo player, String prompt, String promptImageSrc, String snapshotDataUrl) {
}

package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

/**
 * Represents a player currently in a draw round, with the prompt they are drawing.
 */
public record SpectatorCurrentDrawing(PlayerInfo player, String prompt) {
}

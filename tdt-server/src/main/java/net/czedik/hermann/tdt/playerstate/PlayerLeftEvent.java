package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

/**
 * Broadcast to everyone still in the game (players and spectators) when a player drops out of it, so the clients
 * can show a toast. This is a one-off event, not a player state: it carries no screen of its own and the receiving
 * client stays in whatever state it was in.
 */
public record PlayerLeftEvent(
        PlayerInfo player,
        String reason
) implements PlayerState {

    /** The player was removed from the lobby because their last client went away. */
    public static final String REASON_LEFT = "left";

    /** The player's last client went away mid-game — they keep their slot and may come back. */
    public static final String REASON_DISCONNECTED = "disconnected";

    /** The creator kicked the player out of the lobby. */
    public static final String REASON_KICKED = "kicked";

    /** The creator banned the player from the lobby. */
    public static final String REASON_BANNED = "banned";

    @Override
    public String getState() {
        return "playerLeft";
    }
}

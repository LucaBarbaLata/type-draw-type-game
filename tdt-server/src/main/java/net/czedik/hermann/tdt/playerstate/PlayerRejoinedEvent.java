package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;

/**
 * Broadcast to everyone still in the game (players and spectators) when a player who had dropped out mid-game comes
 * back, so the clients can show a toast. The counterpart of {@link PlayerLeftEvent}'s
 * {@link PlayerLeftEvent#REASON_DISCONNECTED}, and like it a one-off event rather than a player state: it carries no
 * screen of its own and the receiving client stays in whatever state it was in.
 *
 * <p>There is only one way back into a game, so unlike a departure this needs no reason: a player who leaves the
 * lobby is removed from it outright and returns as a new player, and a kicked or banned player cannot return at all.
 * Only a mid-game disconnect keeps the slot that makes coming back possible.
 */
public record PlayerRejoinedEvent(
        PlayerInfo player
) implements PlayerState {

    @Override
    public String getState() {
        return "playerRejoined";
    }
}

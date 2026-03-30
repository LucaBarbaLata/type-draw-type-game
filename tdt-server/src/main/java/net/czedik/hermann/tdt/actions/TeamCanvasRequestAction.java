package net.czedik.hermann.tdt.actions;

/**
 * Sent by a player in TEAM mode to request their partner's current canvas image.
 * Typically sent when the player first connects or reconnects during a draw round.
 */
public class TeamCanvasRequestAction {
    /** 1-based round number the requester is currently in. */
    private int round;

    public TeamCanvasRequestAction() {}

    public int round() { return round; }
    public void setRound(int v) { this.round = v; }
}

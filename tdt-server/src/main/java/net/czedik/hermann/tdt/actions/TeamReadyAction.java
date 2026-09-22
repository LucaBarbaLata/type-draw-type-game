package net.czedik.hermann.tdt.actions;

/**
 * Sent by a player in TEAM mode when they approve (or withdraw their approval of) the team's drawing.
 * The drawing is only submitted once every connected member of the team has approved.
 */
public class TeamReadyAction {
    /** 1-based round number the sender is currently in, used to reject stale approvals. */
    private int round;
    /** True when approving, false when withdrawing a previous approval. */
    private boolean ready;

    public TeamReadyAction() {}

    public int round() { return round; }
    public boolean ready() { return ready; }

    public void setRound(int v) { this.round = v; }
    public void setReady(boolean v) { this.ready = v; }
}

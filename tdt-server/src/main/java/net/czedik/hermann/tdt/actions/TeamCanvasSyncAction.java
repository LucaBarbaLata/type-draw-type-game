package net.czedik.hermann.tdt.actions;

/**
 * Sent by a player in TEAM mode to share their current canvas state with their partner.
 * Typically sent in response to a teamCanvasRequest.
 */
public class TeamCanvasSyncAction {
    /** 1-based round number the sender is currently in. */
    private int round;
    /** Full canvas as a PNG data URL (e.g. "data:image/png;base64,..."). */
    private String imageDataUrl;

    public TeamCanvasSyncAction() {}

    public int round() { return round; }
    public String imageDataUrl() { return imageDataUrl; }
    public void setRound(int v) { this.round = v; }
    public void setImageDataUrl(String v) { this.imageDataUrl = v; }
}

package net.czedik.hermann.tdt.actions;

/**
 * Sent by a player during a TEAM mode draw round.
 * The server relays this to the player's partner.
 */
public class TeamStrokeAction {
    /** Stroke type: "pen_seg" | "shape" | "fill" */
    private String type;
    /** Drawing tool: "pen", "eraser", "line", "rect", "circle", "fill" */
    private String tool;
    private double x0;
    private double y0;
    /** Nullable — not present for fill operations */
    private Double x1;
    private Double y1;
    private String color;
    private int brushPixelSize;
    /** 1-based round number, used to reject stale relay messages */
    private int round;

    public TeamStrokeAction() {}

    public String type() { return type; }
    public String tool() { return tool; }
    public double x0() { return x0; }
    public double y0() { return y0; }
    public Double x1() { return x1; }
    public Double y1() { return y1; }
    public String color() { return color; }
    public int brushPixelSize() { return brushPixelSize; }
    public int round() { return round; }

    public void setType(String v) { this.type = v; }
    public void setTool(String v) { this.tool = v; }
    public void setX0(double v) { this.x0 = v; }
    public void setY0(double v) { this.y0 = v; }
    public void setX1(Double v) { this.x1 = v; }
    public void setY1(Double v) { this.y1 = v; }
    public void setColor(String v) { this.color = v; }
    public void setBrushPixelSize(int v) { this.brushPixelSize = v; }
    public void setRound(int v) { this.round = v; }
}

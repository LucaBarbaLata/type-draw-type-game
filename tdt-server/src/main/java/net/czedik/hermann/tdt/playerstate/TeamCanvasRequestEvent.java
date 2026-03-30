package net.czedik.hermann.tdt.playerstate;

/**
 * Relayed to a player's team partner asking them to send their current canvas.
 */
public record TeamCanvasRequestEvent(
        int round,
        String fromPlayer
) implements PlayerState {

    @Override
    public String getState() {
        return "teamCanvasRequest";
    }
}

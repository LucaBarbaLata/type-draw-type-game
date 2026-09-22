package net.czedik.hermann.tdt.playerstate;

/**
 * Sent to exactly one member of a TEAM mode pair once every connected member has approved the drawing.
 * That client answers by uploading its canvas, which becomes the team's drawing for the round.
 */
public record TeamSubmitEvent(
        int round
) implements PlayerState {

    @Override
    public String getState() {
        return "teamSubmit";
    }
}

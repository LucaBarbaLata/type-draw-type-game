package net.czedik.hermann.tdt.playerstate;

public record KickedState() implements PlayerState {
    @Override
    public String getState() {
        return "kicked";
    }
}

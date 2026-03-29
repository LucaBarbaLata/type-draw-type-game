package net.czedik.hermann.tdt.playerstate;

public record BannedState() implements PlayerState {
    @Override
    public String getState() {
        return "banned";
    }
}

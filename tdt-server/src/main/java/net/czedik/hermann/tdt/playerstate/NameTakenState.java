package net.czedik.hermann.tdt.playerstate;

/**
 * Sent when someone tries to join a lobby with a name that another player in that lobby already uses. The rejected
 * name is echoed back so the join screen can point at it.
 */
public record NameTakenState(String name) implements PlayerState {
    @Override
    public String getState() {
        return "nameTaken";
    }
}

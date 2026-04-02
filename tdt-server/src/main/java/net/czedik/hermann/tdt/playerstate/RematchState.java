package net.czedik.hermann.tdt.playerstate;

/**
 * Sent to all players and spectators when a rematch is initiated.
 * The frontend should redirect everyone to the new game.
 */
public record RematchState(String newGameId) implements PlayerState {

    @Override
    public String getState() {
        return "rematch";
    }
}

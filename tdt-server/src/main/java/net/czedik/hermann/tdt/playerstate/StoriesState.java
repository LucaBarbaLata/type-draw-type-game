package net.czedik.hermann.tdt.playerstate;

import net.czedik.hermann.tdt.PlayerInfo;
import java.util.List;

public class StoriesState implements PlayerState {

    public final FrontendStory[] stories;

    /**
     * Vote counts per story index.
     */
    public final int[] votesByStory;

    /**
     * Players who have voted to play again.
     */
    public final List<PlayerInfo> rematchVoters;

    /**
     * Total number of players in the game.
     */
    public final int totalPlayers;

    public StoriesState(FrontendStory[] stories, int[] votesByStory, List<PlayerInfo> rematchVoters, int totalPlayers) {
        this.stories = stories;
        this.votesByStory = votesByStory;
        this.rematchVoters = rematchVoters;
        this.totalPlayers = totalPlayers;
    }

    @Override
    public String getState() {
        return "stories";
    }
}

package net.czedik.hermann.tdt.playerstate;

public class StoriesState implements PlayerState {

    public final FrontendStory[] stories;

    /**
     * Vote counts per story index.
     */
    public final int[] votesByStory;

    public StoriesState(FrontendStory[] stories, int[] votesByStory) {
        this.stories = stories;
        this.votesByStory = votesByStory;
    }

    @Override
    public String getState() {
        return "stories";
    }
}

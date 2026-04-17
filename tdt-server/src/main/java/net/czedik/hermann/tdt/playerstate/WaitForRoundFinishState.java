package net.czedik.hermann.tdt.playerstate;

import java.util.List;
import java.util.Objects;

import net.czedik.hermann.tdt.ChatMessage;
import net.czedik.hermann.tdt.PlayerInfo;

public record WaitForRoundFinishState(List<PlayerInfo> waitingForPlayers, boolean isTypeRound, List<ChatMessage> roundChatMessages, boolean chatEnabled) implements PlayerState {

    public WaitForRoundFinishState {
        Objects.requireNonNull(waitingForPlayers);
        Objects.requireNonNull(roundChatMessages);
    }

    @Override
    public String getState() {
        return "waitForRoundFinish";
    }
}

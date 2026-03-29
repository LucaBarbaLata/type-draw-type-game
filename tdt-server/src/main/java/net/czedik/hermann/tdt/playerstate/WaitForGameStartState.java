package net.czedik.hermann.tdt.playerstate;

import java.util.List;
import java.util.Objects;

import net.czedik.hermann.tdt.ChatMessage;
import net.czedik.hermann.tdt.PlayerInfo;

public record WaitForGameStartState(List<PlayerInfo> players, boolean chatEnabled, List<ChatMessage> chatMessages) implements PlayerState {

    public WaitForGameStartState {
        Objects.requireNonNull(players);
        Objects.requireNonNull(chatMessages);
    }

    @Override
    public String getState() {
        return "waitForGameStart";
    }
}

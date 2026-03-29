package net.czedik.hermann.tdt.playerstate;

import java.util.List;
import java.util.Objects;

import net.czedik.hermann.tdt.ChatMessage;
import net.czedik.hermann.tdt.GameMode;
import net.czedik.hermann.tdt.PlayerInfo;

public record WaitForPlayersState(List<PlayerInfo> players, boolean chatEnabled, List<ChatMessage> chatMessages, GameMode gameMode) implements PlayerState {

    public WaitForPlayersState {
        Objects.requireNonNull(players);
        Objects.requireNonNull(chatMessages);
    }

    @Override
    public String getState() {
        return "waitForPlayers";
    }
}

package net.czedik.hermann.tdt.playerstate;

import java.util.List;
import java.util.Objects;

import net.czedik.hermann.tdt.ChatMessage;
import net.czedik.hermann.tdt.PlayerInfo;

/**
 * @param roundKind what the other players are busy with: "upload", "type" or "draw" (isTypeRound is kept for
 *                  compatibility and is equivalent to "type")
 */
public record WaitForRoundFinishState(List<PlayerInfo> waitingForPlayers, boolean isTypeRound, String roundKind, List<ChatMessage> roundChatMessages, boolean chatEnabled) implements PlayerState {

    public WaitForRoundFinishState {
        Objects.requireNonNull(waitingForPlayers);
        Objects.requireNonNull(roundKind);
        Objects.requireNonNull(roundChatMessages);
    }

    @Override
    public String getState() {
        return "waitForRoundFinish";
    }
}

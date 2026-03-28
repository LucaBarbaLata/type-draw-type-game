package net.czedik.hermann.tdt.playerstate;

import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonInclude;
import net.czedik.hermann.tdt.PlayerInfo;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FrontendStoryElement(String type, String content, PlayerInfo player, String replayUrl) {

    public FrontendStoryElement {
        Objects.requireNonNull(type);
        Objects.requireNonNull(content);
        Objects.requireNonNull(player);
        // replayUrl is nullable
    }
}

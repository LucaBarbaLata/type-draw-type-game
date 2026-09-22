package net.czedik.hermann.tdt.actions;

import net.czedik.hermann.tdt.CreateGameRequest;
import net.czedik.hermann.tdt.DeviceType;

public record JoinAction(String gameId, String playerId, String name, String face, DeviceType device) {

    public JoinAction {
        if (playerId.length() > CreateGameRequest.MAX_PLAYERID_LENGTH)
            throw new IllegalArgumentException("Player ID too long");
        if (name.length() > CreateGameRequest.MAX_NAME_LENGTH)
            throw new IllegalArgumentException("Player Name too long");
        if (face.length() > CreateGameRequest.MAX_FACE_LENGTH)
            throw new IllegalArgumentException("Face length too long");
        // device is optional: an older client omits it and stays unknown
    }
}

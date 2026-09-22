package net.czedik.hermann.tdt;

import java.util.Objects;

/**
 * {@code device} may be null (unknown): games persisted before the field
 * existed have no value for it, and clients are not required to report one.
 */
public record Player(String id, String name, String face, boolean isCreator, DeviceType device) {
    public Player {
        Objects.requireNonNull(id);
        Objects.requireNonNull(name);
        Objects.requireNonNull(face);
    }
}

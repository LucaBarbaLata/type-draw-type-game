package net.czedik.hermann.tdt;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

/**
 * The kind of device a player plays on, reported by their client when they
 * create or join a game. Purely cosmetic: the lobby shows an icon for it.
 * <p>
 * Null means "unknown" and is a normal value, not an error: it is what games
 * persisted before this field existed deserialize to, and what a client that
 * sends nothing (or something unrecognized) gets. Callers must handle it — the
 * frontend simply shows no icon.
 */
public enum DeviceType {
    DESKTOP,
    MOBILE;

    /**
     * Lenient so a stray value from a client can never make the whole
     * join/create request fail to deserialize; anything unrecognized is just
     * unknown.
     */
    @JsonCreator
    public static DeviceType fromJson(String value) {
        if (value == null) return null;
        return switch (value.strip().toUpperCase(Locale.ROOT)) {
            case "DESKTOP" -> DESKTOP;
            case "MOBILE" -> MOBILE;
            default -> null;
        };
    }
}

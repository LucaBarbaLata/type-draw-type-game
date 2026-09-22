package net.czedik.hermann.tdt;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * All instance-level settings of the server, bound from the {@code tdt.*} keys of the configuration.
 * <p>
 * Defaults live in {@code application.yml} inside the jar; an instance host overrides them in an external
 * {@code config.yml} (see {@code config.example.yml} in the repository root). Every field initializer here
 * doubles as the default for tests that construct the class directly.
 */
@Validated
@ConfigurationProperties(prefix = "tdt")
public class TdtProperties {

    /** Directory where games are persisted (a {@code games/} sub-folder is created inside). */
    @NotBlank
    private String storageDir = ".";

    @Valid
    private final Websocket websocket = new Websocket();

    @Valid
    private final Limits limits = new Limits();

    @Valid
    private final PublicGames publicGames = new PublicGames();

    public String getStorageDir() {
        return storageDir;
    }

    public void setStorageDir(String storageDir) {
        this.storageDir = storageDir;
    }

    public Websocket getWebsocket() {
        return websocket;
    }

    public Limits getLimits() {
        return limits;
    }

    public PublicGames getPublicGames() {
        return publicGames;
    }

    public static class Websocket {
        /**
         * Origins allowed to open the game websocket, on top of the page's own origin.
         * <p>
         * Empty (the default) means same-origin only, which needs no configuration: the websocket is accepted
         * from whatever hostname served the page. {@code *} allows any origin.
         */
        private List<String> allowedOrigins = List.of();

        /** Largest text frame accepted (JSON actions, base64 team-mode canvas syncs, replays). */
        @Min(1024)
        private int maxTextMessageBytes = 3 * 1024 * 1024;

        /** Largest binary frame accepted (submitted drawings and uploaded photos). */
        @Min(1024)
        private int maxBinaryMessageBytes = 5 * 1024 * 1024;

        /**
         * Interval between websocket pings sent to every client. Keeps idle connections open through reverse
         * proxies, which otherwise close a websocket after a short period without traffic.
         */
        @Min(1)
        private long keepAliveIntervalSeconds = 15;

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }

        public int getMaxTextMessageBytes() {
            return maxTextMessageBytes;
        }

        public void setMaxTextMessageBytes(int maxTextMessageBytes) {
            this.maxTextMessageBytes = maxTextMessageBytes;
        }

        public int getMaxBinaryMessageBytes() {
            return maxBinaryMessageBytes;
        }

        public void setMaxBinaryMessageBytes(int maxBinaryMessageBytes) {
            this.maxBinaryMessageBytes = maxBinaryMessageBytes;
        }

        public long getKeepAliveIntervalSeconds() {
            return keepAliveIntervalSeconds;
        }

        public void setKeepAliveIntervalSeconds(long keepAliveIntervalSeconds) {
            this.keepAliveIntervalSeconds = keepAliveIntervalSeconds;
        }
    }

    /** Server-wide limits that apply to every game, regardless of what a lobby creator picks. */
    public static class Limits {
        /**
         * Hard cap on players per game. {@code 0} means no server-side cap (the lobby creator's setting alone
         * applies). A lobby setting above this cap is clamped down to it.
         */
        @Min(0)
        private int maxPlayers = 0;

        /** Number of most recent messages kept (and replayed to reconnecting clients) per chat. */
        @Min(1)
        private int maxChatMessages = 50;

        /** Longest chat message accepted, in characters. */
        @Min(1)
        private int maxChatTextLength = 200;

        /** Largest photo accepted in Picture Perfect mode. Must fit into {@code websocket.max-binary-message-bytes}. */
        @Min(1024)
        private int maxUploadBytes = 2 * 1024 * 1024;

        public int getMaxPlayers() {
            return maxPlayers;
        }

        public void setMaxPlayers(int maxPlayers) {
            this.maxPlayers = maxPlayers;
        }

        public int getMaxChatMessages() {
            return maxChatMessages;
        }

        public void setMaxChatMessages(int maxChatMessages) {
            this.maxChatMessages = maxChatMessages;
        }

        public int getMaxChatTextLength() {
            return maxChatTextLength;
        }

        public void setMaxChatTextLength(int maxChatTextLength) {
            this.maxChatTextLength = maxChatTextLength;
        }

        public int getMaxUploadBytes() {
            return maxUploadBytes;
        }

        public void setMaxUploadBytes(int maxUploadBytes) {
            this.maxUploadBytes = maxUploadBytes;
        }
    }

    public static class PublicGames {
        /**
         * Whether lobbies may be listed in the public server browser ({@code /api/games}). When disabled the
         * "public" lobby setting is ignored and the list is always empty.
         */
        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}

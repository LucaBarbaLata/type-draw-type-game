package net.czedik.hermann.tdt;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.WebUtils;

/**
 * Logs a warning when a websocket handshake arrives from an origin that will be rejected. Spring answers such
 * a handshake with a bare 403, which reaches the browser as an unexplained "WebSocket connection failed" — the
 * page loads but nobody can join, and nothing in the server log says why.
 * <p>
 * This interceptor only logs: it always returns {@code true} and leaves the actual decision to Spring, so the
 * matching below can never make the server more permissive than it is configured to be.
 */
public class WebSocketOriginLogger implements HandshakeInterceptor {
    private static final Logger log = LoggerFactory.getLogger(WebSocketOriginLogger.class);

    private final List<String> allowedOrigins;

    public WebSocketOriginLogger(List<String> allowedOrigins) {
        this.allowedOrigins = List.copyOf(allowedOrigins);
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String origin = request.getHeaders().getFirst(HttpHeaders.ORIGIN);
        if (origin == null || allowedOrigins.contains("*")) {
            return true;
        }
        if (allowedOrigins.isEmpty()) {
            // Same-origin policy. WebUtils.isSameOrigin is what Spring itself decides with, so this cannot
            // disagree with the actual outcome.
            if (!WebUtils.isSameOrigin(request)) {
                log.warn("Websocket handshake from origin {} will be rejected: the server sees this request as {}, "
                        + "and only same-origin websockets are allowed. If {} is the address players use, your "
                        + "reverse proxy is not forwarding X-Forwarded-Proto / X-Forwarded-Host (or Host); "
                        + "alternatively list the origin in tdt.websocket.allowed-origins.",
                        origin, request.getURI(), origin);
            }
            // Spring matches the configured list exactly (case-sensitively) and does not fall back to
            // same-origin, so this mirrors its decision rather than guessing a friendlier one.
        } else if (!allowedOrigins.contains(origin)) {
            log.warn("Websocket handshake from origin {} will be rejected: tdt.websocket.allowed-origins is {}. "
                    + "Set it to the exact scheme + host (+ port) players see in their address bar.",
                    origin, allowedOrigins);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler wsHandler, Exception exception) {
        // nothing to do
    }
}

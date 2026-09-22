package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.http.server.ServletServerHttpResponse;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

/**
 * The interceptor exists only to explain a 403'd handshake in the log, so these tests assert on the log
 * output — and that the handshake decision itself is always left to Spring.
 */
class WebSocketOriginLoggerTests {

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @BeforeEach
    void attachAppender() {
        logger = (Logger) LoggerFactory.getLogger(WebSocketOriginLogger.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
    }

    private boolean handshake(List<String> allowedOrigins, String origin) {
        return handshake(allowedOrigins, origin, null, -1);
    }

    /** @param serverName the host the server believes it is reachable at, as a proxy would make it appear */
    private boolean handshake(List<String> allowedOrigins, String origin, String serverName, int port) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (origin != null) {
            request.addHeader("Origin", origin);
        }
        if (serverName != null) {
            request.setScheme(origin != null && origin.startsWith("https") ? "https" : "http");
            request.setServerName(serverName);
            request.setServerPort(port);
        }
        return new WebSocketOriginLogger(allowedOrigins).beforeHandshake(
                new ServletServerHttpRequest(request),
                new ServletServerHttpResponse(new MockHttpServletResponse()),
                null, new HashMap<>());
    }

    private List<String> warnings() {
        return appender.list.stream().filter(event -> event.getLevel() == Level.WARN)
                .map(ILoggingEvent::getFormattedMessage).toList();
    }

    @Test
    void warnsAboutAnOriginThatIsNotAllowed() {
        assertTrue(handshake(List.of("http://localhost:8080"), "https://tdt.example.com"));

        assertEquals(1, warnings().size());
        String warning = warnings().get(0);
        assertTrue(warning.contains("https://tdt.example.com"), warning);
        assertTrue(warning.contains("http://localhost:8080"), warning);
    }

    @Test
    void staysQuietForAnAllowedOrigin() {
        assertTrue(handshake(List.of("https://tdt.example.com"), "https://tdt.example.com"));
        assertEquals(List.of(), warnings());
    }

    @Test
    void staysQuietForAWildcardOrOriginlessRequest() {
        assertTrue(handshake(List.of("*"), "https://anything.example.com"));
        assertTrue(handshake(List.of("http://localhost:8080"), null));
        assertEquals(List.of(), warnings());
    }

    @Test
    void sameOriginModeStaysQuietWhenTheProxyForwardsTheRealHost() {
        // no allowed origins configured: a request the server sees as https://tdt.example.com is same-origin
        assertTrue(handshake(List.of(), "https://tdt.example.com", "tdt.example.com", 443));
        assertEquals(List.of(), warnings());
    }

    @Test
    void sameOriginModeExplainsAMissingForwardedHeader() {
        // the browser says https://tdt.example.com but the server still thinks it is plain localhost:8080,
        // which is exactly what a reverse proxy that drops X-Forwarded-* looks like
        assertTrue(handshake(List.of(), "https://tdt.example.com", "localhost", 8080));

        assertEquals(1, warnings().size());
        String warning = warnings().get(0);
        assertTrue(warning.contains("https://tdt.example.com"), warning);
        assertTrue(warning.contains("X-Forwarded-Proto"), warning);
    }

    @Test
    void flagsAConfiguredOriginThatDiffersOnlyInCase() {
        // Spring compares the configured origins exactly, so a case mismatch really is rejected - the log
        // has to say so rather than quietly treating it as a match
        assertTrue(handshake(List.of("https://TDT.example.com"), "https://tdt.example.com"));
        assertEquals(1, warnings().size());
    }
}

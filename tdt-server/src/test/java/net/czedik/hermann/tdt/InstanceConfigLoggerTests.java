package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

/**
 * The logger exists only to make the instance configuration visible in the log, so these tests assert on the
 * log output. The port line matters because with the host networking docker-compose.yml uses, {@code
 * server.port} is also the port on the host — a wrong value there is the difference between a reachable game
 * and a silent one, and this line is where a host looks for it.
 */
class InstanceConfigLoggerTests {

    private ListAppender<ILoggingEvent> appender;
    private Logger logger;

    @BeforeEach
    void attachAppender() {
        logger = (Logger) LoggerFactory.getLogger(InstanceConfigLogger.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
    }

    /** Runs the logger against an environment holding exactly the given properties and returns its output. */
    private String logFor(Map<String, Object> properties) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", new HashMap<>(properties)));
        new InstanceConfigLogger(environment);
        return appender.list.stream().map(ILoggingEvent::getFormattedMessage).reduce("", (a, b) -> a + "\n" + b);
    }

    @Test
    void reportsTheConfiguredPort() {
        assertTrue(logFor(Map.of("server.port", "8087")).contains("listening on port 8087, on all interfaces"),
                "expected the configured port in the log");
    }

    @Test
    void reportsTheDefaultPortWhenNothingIsConfigured() {
        assertTrue(logFor(Map.of()).contains("listening on port 8080, on all interfaces"),
                "expected the built-in default port in the log");
    }

    @Test
    void reportsTheBindAddressWhenOneIsSet() {
        assertTrue(logFor(Map.of("server.port", "8087", "server.address", "127.0.0.1"))
                .contains("listening on port 8087, on 127.0.0.1"),
                "expected the bind address in the log");
    }

    @Test
    void doesNotClaimPortZero() {
        String output = logFor(Map.of("server.port", "0"));
        assertTrue(output.contains("chosen at startup"), "expected server.port=0 to be explained, not reported as a port");
    }

    @Test
    void warnsWhenNoConfigFileWasLoaded() {
        assertTrue(logFor(Map.of()).contains("no config.yml found"), "expected the missing-config warning");
    }
}

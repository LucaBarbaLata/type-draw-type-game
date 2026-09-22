package net.czedik.hermann.tdt;

import java.nio.file.Files;
import java.nio.file.Path;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Logs at startup whether the external instance {@code config.yml} was found. The file is imported with an
 * {@code optional:} prefix (see {@code application.yml}), so a misplaced or mistyped path would otherwise be
 * skipped silently and look exactly like the server ignoring the file.
 */
@Component
public class InstanceConfigLogger {
    private static final Logger log = LoggerFactory.getLogger(InstanceConfigLogger.class);

    private static final String OPTIONAL_FILE_PREFIX = "optional:file:";

    public InstanceConfigLogger(Environment environment) {
        // placeholders (TDT_CONFIG_FILE) are already resolved here, so this is the path Spring actually looked at
        String importLocation = environment.getProperty("spring.config.import", "");
        if (!importLocation.startsWith(OPTIONAL_FILE_PREFIX)) {
            log.info("Instance config import: {}", importLocation);
            return;
        }
        Path configFile = Path.of(importLocation.substring(OPTIONAL_FILE_PREFIX.length())).toAbsolutePath().normalize();
        if (Files.isRegularFile(configFile)) {
            log.info("Instance config: loaded {}", configFile);
        } else {
            log.info("Instance config: no file at {} - using built-in defaults (set TDT_CONFIG_FILE to look elsewhere)",
                    configFile);
        }
    }
}

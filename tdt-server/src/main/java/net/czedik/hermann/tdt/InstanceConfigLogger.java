package net.czedik.hermann.tdt;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.stereotype.Component;

/**
 * Reports at startup which external config files were applied. Every candidate location is imported with an
 * {@code optional:} prefix (see {@code application.yml}), so a file in the wrong place is skipped without a
 * word and looks exactly like the server ignoring it — these log lines are the only signal.
 */
@Component
public class InstanceConfigLogger {
    private static final Logger log = LoggerFactory.getLogger(InstanceConfigLogger.class);

    /** Property source name Spring gives to a config file loaded through {@code spring.config.import}. */
    private static final String CONFIG_RESOURCE_PREFIX = "Config resource 'file [";

    public InstanceConfigLogger(ConfigurableEnvironment environment) {
        List<String> loaded = loadedConfigFiles(environment);
        if (loaded.isEmpty()) {
            log.warn("Instance config: no config.yml found - using built-in defaults. Searched: {}",
                    String.join(", ", searchedLocations(environment)));
            log.warn("Instance config: if you meant to configure this instance, the file must be readable at one "
                    + "of those paths (inside the container, not on the host) or at $TDT_CONFIG_FILE");
        } else {
            loaded.forEach(file -> log.info("Instance config: loaded {}", file));
        }
        log.info("Instance config: {}", listenDescription(environment));
    }

    /**
     * Where the game will be reachable, logged next to the config files so a wrong port is visible in the same
     * place as a config.yml that was not picked up. With the host networking docker-compose.yml uses, the port
     * the server binds is also the port on the host.
     */
    private static String listenDescription(ConfigurableEnvironment environment) {
        String port = environment.getProperty("server.port", "8080");
        String address = environment.getProperty("server.address");
        String where = (address == null || address.isBlank()) ? "all interfaces" : address;
        if ("0".equals(port)) {
            // Spring picks a free port at startup, so there is no number to report here
            return "listening on a port chosen at startup (server.port=0), on " + where;
        }
        return "listening on port " + port + ", on " + where;
    }

    private static List<String> loadedConfigFiles(ConfigurableEnvironment environment) {
        List<String> files = new ArrayList<>();
        for (PropertySource<?> propertySource : environment.getPropertySources()) {
            String name = propertySource.getName();
            int start = name.indexOf(CONFIG_RESOURCE_PREFIX);
            if (start < 0) {
                continue;
            }
            start += CONFIG_RESOURCE_PREFIX.length();
            int end = name.indexOf(']', start);
            if (end > start) {
                // absolute, so a relative import location like ./config.yml names an unambiguous file
                String file = Path.of(name.substring(start, end)).toAbsolutePath().normalize().toString();
                if (!files.contains(file)) {
                    files.add(file);
                }
            }
        }
        return files;
    }

    /** The import locations as configured, with the {@code optional:file:} prefix stripped for readability. */
    private static List<String> searchedLocations(ConfigurableEnvironment environment) {
        List<String> locations = Binder.get(environment)
                .bind("spring.config.import", Bindable.listOf(String.class))
                .orElseGet(List::of);
        return locations.stream().map(location -> location.replace("optional:file:", "")).distinct().toList();
    }
}

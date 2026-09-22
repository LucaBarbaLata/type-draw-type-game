package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.web.WebAppConfiguration;

/**
 * Verifies that an external instance config file (pointed to by {@code TDT_CONFIG_FILE}, the same mechanism
 * the Docker image uses) overrides the built-in defaults from {@code application.yml} while keys it leaves
 * out keep their defaults.
 */
@SpringBootTest(properties = "TDT_CONFIG_FILE=src/test/resources/instance-config.yml")
@WebAppConfiguration
class InstanceConfigFileTests {

    @Autowired
    private TdtProperties properties;

    @Test
    void configFileOverridesBuiltInDefaults() {
        assertEquals(4, properties.getLimits().getMaxPlayers());
        assertFalse(properties.getPublicGames().isEnabled());
        assertEquals(List.of("https://tdt.example.com", "http://192.168.1.10:8080"),
                properties.getWebsocket().getAllowedOrigins());
    }

    @Test
    void keysMissingFromConfigFileKeepDefaults() {
        assertEquals(50, properties.getLimits().getMaxChatMessages());
        assertEquals(200, properties.getLimits().getMaxChatTextLength());
        assertEquals(15, properties.getWebsocket().getKeepAliveIntervalSeconds());
    }
}

package net.czedik.hermann.tdt;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    @Autowired
    private GameManager gameManager;

    @Autowired
    private TdtProperties properties;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        List<String> allowedOrigins = properties.getWebsocket().getAllowedOrigins();
        log.info("Websocket allowed origins: {}", allowedOrigins);
        registry.addHandler(myHandler(), "/api/websocket")
                .addInterceptors(new WebSocketOriginLogger(allowedOrigins))
                .setAllowedOrigins(allowedOrigins.toArray(String[]::new));
    }

    @Bean
    public WebSocketHandler myHandler() {
        return new WebSocketHandler(gameManager, properties.getWebsocket().getKeepAliveIntervalSeconds());
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(properties.getWebsocket().getMaxTextMessageBytes());
        container.setMaxBinaryMessageBufferSize(properties.getWebsocket().getMaxBinaryMessageBytes());
        return container;
    }

}

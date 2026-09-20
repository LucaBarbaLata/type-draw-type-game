package net.czedik.hermann.tdt;

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

    @Autowired
    private GameManager gameManager;

    @Autowired
    private TdtProperties properties;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(myHandler(), "/api/websocket")
                .setAllowedOrigins(properties.getWebsocket().getAllowedOrigins().toArray(String[]::new));
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

package net.czedik.hermann.tdt.actions;

import com.fasterxml.jackson.annotation.JsonProperty;

import net.czedik.hermann.tdt.GameMode;

public class SettingsAction {
    private int maxPlayers = 0;
    private int roundTimerSeconds = 0;
    private boolean chatEnabled = true;
    private boolean isPublic = false;
    private GameMode gameMode = GameMode.CLASSIC;
    private int hotPotatoIntervalSeconds = 30;
    private int hotPotatoTotalSeconds = 180;

    public SettingsAction() {}

    public int maxPlayers() { return maxPlayers; }
    public int roundTimerSeconds() { return roundTimerSeconds; }
    public boolean chatEnabled() { return chatEnabled; }
    @JsonProperty("isPublic")
    public boolean isPublic() { return isPublic; }
    public GameMode gameMode() { return gameMode; }
    public int hotPotatoIntervalSeconds() { return hotPotatoIntervalSeconds; }
    public int hotPotatoTotalSeconds() { return hotPotatoTotalSeconds; }

    public void setMaxPlayers(int v) { this.maxPlayers = v; }
    public void setRoundTimerSeconds(int v) { this.roundTimerSeconds = v; }
    public void setChatEnabled(boolean v) { this.chatEnabled = v; }
    public void setPublic(boolean v) { this.isPublic = v; }
    public void setGameMode(GameMode v) { this.gameMode = v; }
    public void setHotPotatoIntervalSeconds(int v) { this.hotPotatoIntervalSeconds = v; }
    public void setHotPotatoTotalSeconds(int v) { this.hotPotatoTotalSeconds = v; }
}

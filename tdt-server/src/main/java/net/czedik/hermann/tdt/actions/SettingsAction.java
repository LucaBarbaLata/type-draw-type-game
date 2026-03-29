package net.czedik.hermann.tdt.actions;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SettingsAction {
    private int maxPlayers = 0;
    private int roundTimerSeconds = 0;
    private boolean chatEnabled = true;
    private boolean isPublic = false;

    public SettingsAction() {}

    public int maxPlayers() { return maxPlayers; }
    public int roundTimerSeconds() { return roundTimerSeconds; }
    public boolean chatEnabled() { return chatEnabled; }
    @JsonProperty("isPublic")
    public boolean isPublic() { return isPublic; }

    public void setMaxPlayers(int v) { this.maxPlayers = v; }
    public void setRoundTimerSeconds(int v) { this.roundTimerSeconds = v; }
    public void setChatEnabled(boolean v) { this.chatEnabled = v; }
    public void setPublic(boolean v) { this.isPublic = v; }
}

import { useState, useCallback, useEffect } from "react";
import {
  setMuted,
  playRoundStart,
  playUrgentTick,
  playUrgentStart,
  playTimerExpire,
  playSubmitSuccess,
  playRevealPop,
  playFanfare,
  playExplosionPop,
  playMuteToggle,
} from "./audioEngine";

const MUTE_KEY = "tdt-sfx-muted";

export function useAudio() {
  const [muted, setMutedState] = useState<boolean>(
    () => window.localStorage.getItem(MUTE_KEY) === "true"
  );

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    window.localStorage.setItem(MUTE_KEY, String(newMuted));
    setMutedState(newMuted);
    playMuteToggle(!newMuted);
  }, [muted]);

  return {
    muted,
    toggleMute,
    playRoundStart,
    playUrgentTick,
    playUrgentStart,
    playTimerExpire,
    playSubmitSuccess,
    playRevealPop,
    playFanfare,
    playExplosionPop,
  };
}

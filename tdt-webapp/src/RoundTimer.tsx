import React from "react";
import styled, { css, keyframes } from "styled-components";
import ThemedIcon from "./ThemedIcon";

const timerIn = keyframes`
  from { opacity: 0; transform: translateY(-2vmin) scale(0.85); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const urgentBeat = keyframes`
  0%, 100% { transform: scale(1); box-shadow: var(--cyber-glow-magenta); }
  50%       { transform: scale(1.08); box-shadow: var(--cyber-glow-magenta-strong), inset 0 0 10px rgba(var(--cyber-magenta-rgb), 0.1); }
`;

const warnBeat = keyframes`
  0%, 100% { transform: scale(1); box-shadow: var(--cyber-glow-yellow); }
  50%       { transform: scale(1.04); box-shadow: var(--cyber-glow-yellow-strong); }
`;

type TimerLevel = "normal" | "warn" | "urgent";

const RoundTimer = ({
  seconds,
  onExpire,
  onUrgentStart,
  onTick,
}: {
  seconds: number;
  onExpire: () => void;
  onUrgentStart?: () => void;
  onTick?: () => void;
}) => {
  const [remaining, setRemaining] = React.useState(seconds);
  const onExpireRef = React.useRef(onExpire);
  onExpireRef.current = onExpire;
  const onUrgentStartRef = React.useRef(onUrgentStart);
  onUrgentStartRef.current = onUrgentStart;
  const onTickRef = React.useRef(onTick);
  onTickRef.current = onTick;
  const prevUrgentRef = React.useRef(false);

  React.useEffect(() => {
    setRemaining(seconds);
    prevUrgentRef.current = false;
  }, [seconds]);

  React.useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }
    const urgent = remaining <= 10;
    if (urgent && !prevUrgentRef.current) {
      onUrgentStartRef.current?.();
    }
    prevUrgentRef.current = urgent;
    if (urgent) {
      onTickRef.current?.();
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const level: TimerLevel = remaining <= 10 ? "urgent" : remaining <= 30 ? "warn" : "normal";

  return (
    <TimerContainer level={level}>
      <ThemedIcon name="timer" label={null} className="ThemedIcon-leading" />
      {remaining}s
    </TimerContainer>
  );
};

export default RoundTimer;

const TimerContainer = styled.div<{ level: TimerLevel }>`
  position: fixed;
  top: 2vmin;
  right: 2vmin;
  background: rgba(var(--cyber-bg-deep-rgb), 0.9);
  border: 1.5px solid ${({ level }) =>
    level === "urgent" ? "var(--cyber-magenta)" : level === "warn" ? "var(--cyber-yellow)" : "var(--cyber-cyan)"};
  color: ${({ level }) =>
    level === "urgent" ? "var(--cyber-magenta)" : level === "warn" ? "var(--cyber-yellow)" : "var(--cyber-cyan)"};
  text-shadow: ${({ level }) =>
    level === "urgent"
      ? "var(--cyber-text-glow-magenta)"
      : level === "warn"
      ? "var(--cyber-text-glow-yellow)"
      : "var(--cyber-text-glow)"};
  box-shadow: ${({ level }) =>
    level === "urgent"
      ? "var(--cyber-glow-magenta)"
      : level === "warn"
      ? "var(--cyber-glow-yellow)"
      : "var(--cyber-glow)"};
  padding: 1vmin 2vmin;
  border-radius: 0.6vmin;
  font-size: 3vmin;
  font-weight: bold;
  letter-spacing: 0.08em;
  z-index: 10;
  transition: border-color 0.3s, color 0.3s, text-shadow 0.3s;
  pointer-events: none;
  backdrop-filter: blur(4px);
  animation: ${timerIn} 0.4s ease-out;
  ${({ level }) => level === "urgent" && css`
    animation: ${timerIn} 0.4s ease-out, ${urgentBeat} 0.65s ease-in-out infinite;
  `}
  ${({ level }) => level === "warn" && css`
    animation: ${timerIn} 0.4s ease-out, ${warnBeat} 1.2s ease-in-out infinite;
  `}
`;

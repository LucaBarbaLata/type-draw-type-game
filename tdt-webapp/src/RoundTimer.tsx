import React from "react";
import styled, { css, keyframes } from "styled-components";

const timerIn = keyframes`
  from { opacity: 0; transform: translateY(-2vmin) scale(0.85); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const urgentBeat = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 10px #ff2079, 0 0 25px rgba(255,32,121,0.25); }
  50%       { transform: scale(1.08); box-shadow: 0 0 26px #ff2079, 0 0 55px rgba(255,32,121,0.55), inset 0 0 10px rgba(255,32,121,0.1); }
`;

const warnBeat = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 10px #f7c800, 0 0 25px rgba(247,200,0,0.25); }
  50%       { transform: scale(1.04); box-shadow: 0 0 20px #f7c800, 0 0 40px rgba(247,200,0,0.4); }
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
      ⏱ {remaining}s
    </TimerContainer>
  );
};

export default RoundTimer;

const TimerContainer = styled.div<{ level: TimerLevel }>`
  position: fixed;
  top: 2vmin;
  right: 2vmin;
  background: rgba(8, 8, 24, 0.9);
  border: 1.5px solid ${({ level }) =>
    level === "urgent" ? "#ff2079" : level === "warn" ? "#f7c800" : "#00f5ff"};
  color: ${({ level }) =>
    level === "urgent" ? "#ff2079" : level === "warn" ? "#f7c800" : "#00f5ff"};
  text-shadow: ${({ level }) =>
    level === "urgent"
      ? "0 0 8px #ff2079, 0 0 20px rgba(255,32,121,0.4)"
      : level === "warn"
      ? "0 0 8px #f7c800, 0 0 20px rgba(247,200,0,0.4)"
      : "0 0 8px #00f5ff, 0 0 20px rgba(0,245,255,0.4)"};
  box-shadow: ${({ level }) =>
    level === "urgent"
      ? "0 0 10px #ff2079, 0 0 25px rgba(255,32,121,0.25)"
      : level === "warn"
      ? "0 0 10px #f7c800, 0 0 25px rgba(247,200,0,0.25)"
      : "0 0 10px #00f5ff, 0 0 25px rgba(0,245,255,0.25)"};
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

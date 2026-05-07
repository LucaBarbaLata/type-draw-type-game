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

  const urgent = remaining <= 10;

  return (
    <TimerContainer urgent={urgent}>
      ⏱ {remaining}s
    </TimerContainer>
  );
};

export default RoundTimer;

const TimerContainer = styled.div<{ urgent: boolean }>`
  position: fixed;
  top: 2vmin;
  right: 2vmin;
  background: rgba(8, 8, 24, 0.9);
  border: 1.5px solid ${({ urgent }) => (urgent ? "#ff2079" : "#00f5ff")};
  color: ${({ urgent }) => (urgent ? "#ff2079" : "#00f5ff")};
  text-shadow: ${({ urgent }) =>
    urgent
      ? "0 0 8px #ff2079, 0 0 20px rgba(255,32,121,0.4)"
      : "0 0 8px #00f5ff, 0 0 20px rgba(0,245,255,0.4)"};
  box-shadow: ${({ urgent }) =>
    urgent
      ? "0 0 10px #ff2079, 0 0 25px rgba(255,32,121,0.25)"
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
  ${({ urgent }) => urgent && css`
    animation: ${timerIn} 0.4s ease-out, ${urgentBeat} 0.65s ease-in-out infinite;
  `}
`;

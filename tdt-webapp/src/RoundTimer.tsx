import React from "react";
import styled from "styled-components";

const RoundTimer = ({
  seconds,
  onExpire,
}: {
  seconds: number;
  onExpire: () => void;
}) => {
  const [remaining, setRemaining] = React.useState(seconds);
  const onExpireRef = React.useRef(onExpire);
  onExpireRef.current = onExpire;

  React.useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  React.useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current();
      return;
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
  transition: border-color 0.3s, color 0.3s, box-shadow 0.3s, text-shadow 0.3s;
  pointer-events: none;
  backdrop-filter: blur(4px);
`;

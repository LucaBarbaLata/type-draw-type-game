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
  background: ${({ urgent }) => (urgent ? "#c00" : "#333")};
  color: white;
  padding: 1vmin 2vmin;
  border-radius: 2vmin;
  font-size: 3vmin;
  font-weight: bold;
  z-index: 10;
  transition: background 0.3s;
  pointer-events: none;
`;

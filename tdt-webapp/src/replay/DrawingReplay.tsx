import React from "react";
import styled, { keyframes } from "styled-components";

interface DrawingReplayProps {
  replayUrl: string;
  staticFallback: string;
  frameIntervalMs?: number;
}

const DrawingReplay = ({
  replayUrl,
  staticFallback,
  frameIntervalMs = 120,
}: DrawingReplayProps) => {
  const [frames, setFrames] = React.useState<string[] | null>(null);
  const [currentFrame, setCurrentFrame] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [loopCount, setLoopCount] = React.useState(0);

  React.useEffect(() => {
    fetch(replayUrl)
      .then((r) => r.json())
      .then((data) => setFrames(data.frames))
      .catch(() => setFrames([]));
  }, [replayUrl]);

  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  React.useEffect(() => {
    if (frames === null || frames.length === 0) return;
    let rafId: number;
    let lastTime = 0;

    const tick = (time: number) => {
      rafId = requestAnimationFrame(tick);
      if (pausedRef.current) return;
      if (time - lastTime < frameIntervalMs) return;
      lastTime = time;
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          setLoopCount((c) => c + 1);
          return 0;
        }
        return next;
      });
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [frames, frameIntervalMs]);

  const src = frames !== null && frames.length > 0 ? frames[currentFrame] : staticFallback;

  return (
    <ReplayContainer onClick={() => setPaused((p) => !p)} title={paused ? "Tap to resume" : "Tap to pause"}>
      <ReplayImage src={src} alt="Drawing timelapse" />
      <ReplayOverlay>
        {frames === null ? (
          <StatusLabel>loading…</StatusLabel>
        ) : paused ? (
          <StatusLabel>paused</StatusLabel>
        ) : frames.length > 0 ? (
          <LoopIndicator>
            {loopCount > 0 && <LoopBadge>loop {loopCount + 1}</LoopBadge>}
            <PulsingDot />
          </LoopIndicator>
        ) : null}
      </ReplayOverlay>
    </ReplayContainer>
  );
};

export default DrawingReplay;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.75); }
`;

const ReplayContainer = styled.div`
  position: relative;
  display: inline-block;
  cursor: pointer;
  margin-top: 1vmin;
  max-width: 80vw;
`;

const ReplayImage = styled.img`
  max-height: 100vh;
  max-width: 80vw;
  border: 1.5px solid rgba(0, 245, 255, 0.5);
  border-radius: 1vmin;
  box-shadow: 0 0 16px rgba(0, 245, 255, 0.2), 0 0 40px rgba(0, 245, 255, 0.06);
  display: block;
`;

const ReplayOverlay = styled.div`
  position: absolute;
  bottom: 1.2vmin;
  right: 1.2vmin;
  display: flex;
  align-items: center;
  gap: 0.8vmin;
`;

const StatusLabel = styled.span`
  font-size: 1.6vmin;
  color: rgba(200, 216, 240, 0.7);
  background: rgba(8, 8, 24, 0.7);
  padding: 0.3vmin 0.8vmin;
  border-radius: 0.4vmin;
  letter-spacing: 0.08em;
`;

const LoopIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6vmin;
`;

const LoopBadge = styled.span`
  font-size: 1.4vmin;
  color: rgba(0, 245, 255, 0.6);
  background: rgba(8, 8, 24, 0.7);
  padding: 0.2vmin 0.6vmin;
  border-radius: 0.4vmin;
  letter-spacing: 0.06em;
`;

const PulsingDot = styled.div`
  width: 1.4vmin;
  height: 1.4vmin;
  min-width: 8px;
  min-height: 8px;
  border-radius: 50%;
  background: #00f5ff;
  box-shadow: 0 0 6px #00f5ff;
  animation: ${pulse} 1.2s ease-in-out infinite;
`;

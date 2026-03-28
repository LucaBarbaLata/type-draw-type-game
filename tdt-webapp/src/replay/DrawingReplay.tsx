import React from "react";
import styled, { keyframes } from "styled-components";

interface DrawingReplayProps {
  replayUrl: string;
  staticFallback: string;
  frameIntervalMs?: number;
}

type PlayState = "idle" | "playing" | "paused" | "done";

const DrawingReplay = ({
  replayUrl,
  staticFallback,
  frameIntervalMs = 80,
}: DrawingReplayProps) => {
  const [frames, setFrames] = React.useState<string[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [playState, setPlayState] = React.useState<PlayState>("idle");
  const frameRef = React.useRef(0);

  React.useEffect(() => {
    fetch(replayUrl)
      .then((r) => r.json())
      .then((data) => setFrames(data.frames))
      .catch(() => setFrames([]));
  }, [replayUrl]);

  // Animation loop — only active when playing
  React.useEffect(() => {
    if (playState !== "playing" || !frames || frames.length === 0) return;
    let rafId: number;
    let lastTime = performance.now();

    const tick = (time: number) => {
      if (time - lastTime < frameIntervalMs) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastTime = time;
      frameRef.current++;
      if (frameRef.current >= frames.length) {
        setPlayState("done");
        return;
      }
      setIdx(frameRef.current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playState, frames, frameIntervalMs]);

  const handleClick = () => {
    if (!frames || frames.length === 0) return;
    if (playState === "idle" || playState === "done") {
      frameRef.current = 0;
      setIdx(0);
      setPlayState("playing");
    } else if (playState === "playing") {
      setPlayState("paused");
    } else if (playState === "paused") {
      setPlayState("playing");
    }
  };

  const hasReplay = frames !== null && frames.length > 0;
  const src = playState !== "idle" && hasReplay ? frames![idx] : staticFallback;

  return (
    <ReplayContainer
      onClick={handleClick}
      style={{ cursor: hasReplay ? "pointer" : "default" }}
    >
      <ReplayImage src={src} alt="Drawing" />

      {frames === null && (
        <CornerOverlay><StatusLabel>loading…</StatusLabel></CornerOverlay>
      )}

      {hasReplay && playState === "idle" && (
        <CenteredOverlay><PlayArrow>▶</PlayArrow></CenteredOverlay>
      )}

      {hasReplay && playState === "playing" && (
        <CornerOverlay><PulsingDot /></CornerOverlay>
      )}

      {hasReplay && playState === "paused" && (
        <CornerOverlay><ResumeLabel>▶</ResumeLabel></CornerOverlay>
      )}

      {hasReplay && playState === "done" && (
        <CenteredOverlay><PlayArrow>↩</PlayArrow></CenteredOverlay>
      )}
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

const CenteredOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(8, 8, 24, 0.65);
  border: 1.5px solid rgba(0, 245, 255, 0.45);
  border-radius: 50%;
  width: 7vmin;
  height: 7vmin;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const PlayArrow = styled.span`
  font-size: 2.8vmin;
  min-font-size: 14px;
  color: rgba(0, 245, 255, 0.9);
  line-height: 1;
  padding-left: 0.3vmin;
`;

const CornerOverlay = styled.div`
  position: absolute;
  bottom: 1.2vmin;
  right: 1.2vmin;
  display: flex;
  align-items: center;
`;

const StatusLabel = styled.span`
  font-size: 1.6vmin;
  color: rgba(200, 216, 240, 0.7);
  background: rgba(8, 8, 24, 0.7);
  padding: 0.3vmin 0.8vmin;
  border-radius: 0.4vmin;
  letter-spacing: 0.08em;
`;

const ResumeLabel = styled.span`
  font-size: 1.8vmin;
  color: rgba(0, 245, 255, 0.7);
  background: rgba(8, 8, 24, 0.7);
  padding: 0.2vmin 0.7vmin;
  border-radius: 0.4vmin;
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

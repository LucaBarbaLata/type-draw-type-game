import React from "react";
import ReactDOM from "react-dom";
import { createGlobalStyle } from "styled-components";

const CascadeGlobalStyle = createGlobalStyle`
  @keyframes emoji-cascade-fall {
    0% {
      transform: translateY(-12vh) translateX(0px) rotate(0deg) scale(1);
      opacity: 1;
    }
    85% {
      opacity: 0.75;
    }
    100% {
      transform: translateY(115vh) translateX(var(--emoji-drift)) rotate(var(--emoji-rot)) scale(0.7);
      opacity: 0;
    }
  }
`;

interface Particle {
  id: number;
  left: number;   // vw %
  delay: number;  // ms
  duration: number; // ms
  size: number;   // rem
  drift: string;  // CSS value e.g. "6vw"
  rot: string;    // CSS value e.g. "360deg"
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 94,
    delay: Math.random() * 700,
    duration: 2000 + Math.random() * 1600,
    size: 1.8 + Math.random() * 3,
    drift: `${(Math.random() - 0.5) * 14}vw`,
    rot: `${(Math.random() - 0.5) * 720}deg`,
  }));
}

const PARTICLE_COUNT = 45;

interface CascadeProps {
  emoji: string;
  onDone: () => void;
}

export const EmojiCascade = ({ emoji, onDone }: CascadeProps) => {
  const particles = React.useMemo(() => makeParticles(PARTICLE_COUNT), []);
  const maxDuration = Math.max(...particles.map((p) => p.delay + p.duration));

  React.useEffect(() => {
    const timer = setTimeout(onDone, maxDuration + 300);
    return () => clearTimeout(timer);
  }, [onDone, maxDuration]);

  return ReactDOM.createPortal(
    <>
      <CascadeGlobalStyle />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden",
        }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            style={
              {
                position: "absolute",
                top: 0,
                left: `${p.left}%`,
                fontSize: `${p.size}rem`,
                lineHeight: 1,
                userSelect: "none",
                animationName: "emoji-cascade-fall",
                animationDuration: `${p.duration}ms`,
                animationDelay: `${p.delay}ms`,
                animationTimingFunction: "ease-in",
                animationFillMode: "both",
                "--emoji-drift": p.drift,
                "--emoji-rot": p.rot,
              } as React.CSSProperties
            }
          >
            {emoji}
          </span>
        ))}
      </div>
    </>,
    document.body
  );
};

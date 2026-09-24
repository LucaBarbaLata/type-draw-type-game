import React from "react";
import styled, { keyframes } from "styled-components";

const errPulse = keyframes`
  0%, 100% { opacity: 1;   text-shadow: var(--cyber-text-glow-magenta); }
  50%       { opacity: 0.6; text-shadow: var(--cyber-text-glow-magenta-strong); }
`;

/**
 * Catches anything thrown while rendering. Without it React unmounts the whole tree on a render error and the
 * player is left staring at the bare page background — the black screen of issue #47 — with no hint of what
 * happened and no way out other than guessing that a reload might help.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Crash>
        <h1>ERROR</h1>
        <p>Something went wrong while drawing this screen.</p>
        <Details>{this.state.error.message}</Details>
        <button className="button" onClick={() => window.location.reload()}>
          Reload
        </button>
        <GoHome href="/">Back to the start screen</GoHome>
      </Crash>
    );
  }
}

const Crash = styled.div`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vmin;
  padding: 4vmin;
  text-align: center;

  h1 {
    color: var(--cyber-magenta);
    letter-spacing: 0.15em;
    animation: ${errPulse} 1.4s ease-in-out infinite;
  }
`;

const Details = styled.code`
  max-width: 80vmin;
  word-break: break-word;
  font-size: 1.8vmin;
  color: rgba(var(--cyber-cyan-rgb), 0.7);
`;

const GoHome = styled.a`
  color: var(--cyber-cyan);
  font-size: 2vmin;
`;

export default ErrorBoundary;

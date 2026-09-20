import styled, { keyframes } from "styled-components";

import Dialog from "./Dialog";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  18%       { transform: translateX(-6px); }
  36%       { transform: translateX(6px); }
  54%       { transform: translateX(-4px); }
  72%       { transform: translateX(4px); }
  88%       { transform: translateX(-2px); }
`;

const errPulse = keyframes`
  0%, 100% { opacity: 1;   text-shadow: var(--cyber-text-glow-magenta); }
  50%       { opacity: 0.6; text-shadow: var(--cyber-text-glow-magenta-strong); }
`;

const ConnectionLostErrorDialogContent = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;

  h1 {
    color: var(--cyber-magenta);
    letter-spacing: 0.15em;
    animation: ${shake} 0.55s ease-out 0.25s, ${errPulse} 1.4s ease-in-out 0.8s infinite;
  }
`;

export const ConnectionLostErrorDialog = ({
  show,
  handleReconnect,
}: {
  show: boolean;
  handleReconnect: () => void;
}) => {
  return (
    <Dialog show={show} highPriority={true}>
      <ConnectionLostErrorDialogContent>
        <div></div>
        <h1>ERROR</h1>
        <div>Connection to server lost</div>
        <button className="button" onClick={handleReconnect}>
          Click to re-connect
        </button>
      </ConnectionLostErrorDialogContent>
    </Dialog>
  );
};

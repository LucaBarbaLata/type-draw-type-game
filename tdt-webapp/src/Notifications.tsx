import React from "react";
import ReactDOM from "react-dom";
import styled, { keyframes } from "styled-components";

import { PlayerInfo } from "./model";

export interface NotificationItem {
  id: number;
  player: PlayerInfo;
  action: "drawing" | "typing";
}

const DISMISS_AFTER_MS = 6000;

const NotificationToast = ({
  item,
  onDismiss,
}: {
  item: NotificationItem;
  onDismiss: () => void;
}) => {
  const dismissRef = React.useRef(onDismiss);
  dismissRef.current = onDismiss;

  React.useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), DISMISS_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <Toast onClick={onDismiss} title="Click to dismiss">
      <FaceSpan>{item.player.face}</FaceSpan>
      <ToastText>
        <PlayerName>{item.player.name}</PlayerName>
        {" finished "}
        {item.action}
      </ToastText>
      <Dismiss>✕</Dismiss>
    </Toast>
  );
};

const Notifications = ({
  items,
  onDismiss,
}: {
  items: NotificationItem[];
  onDismiss: (id: number) => void;
}) =>
  ReactDOM.createPortal(
    <Container>
      {items.map((item) => (
        <NotificationToast
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
        />
      ))}
    </Container>,
    document.body
  );

export default Notifications;

const slideIn = keyframes`
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  bottom: 10vmin;
  right: 2vmin;
  display: flex;
  flex-direction: column;
  gap: 1.2vmin;
  z-index: 1000;
  pointer-events: none;
`;

const Toast = styled.div`
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: 1.2vmin;
  padding: 1.2vmin 1.8vmin;
  background: rgba(8, 8, 24, 0.92);
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 1vmin;
  box-shadow: 0 0 14px rgba(0, 245, 255, 0.15), 0 2px 12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  cursor: pointer;
  animation: ${slideIn} 0.25s ease;
  max-width: 40vmin;
  min-width: 24vmin;

  &:hover {
    border-color: rgba(0, 245, 255, 0.7);
  }
`;

const FaceSpan = styled.span`
  font-size: 2.6vmin;
  min-font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
`;

const ToastText = styled.span`
  font-size: 1.5vmin;
  color: #c8d8f0;
  letter-spacing: 0.04em;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
`;

const PlayerName = styled.span`
  color: #00f5ff;
  font-weight: bold;
`;

const Dismiss = styled.span`
  font-size: 1.3vmin;
  color: rgba(0, 245, 255, 0.35);
  flex-shrink: 0;
  line-height: 1;
`;

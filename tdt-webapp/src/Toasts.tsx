import React from "react";
import ReactDOM from "react-dom";
import styled, { css, keyframes } from "styled-components";

import { Toast, ToastTone, dismissToast, useToasts } from "./toastStore";

/**
 * The one toast stack of the app: transient cards in the top-right corner announcing what other players did
 * ("Bob finished drawing", "Bob left the game").
 */

/** How long a toast stays before it starts sliding out, and how long that takes. */
const TOAST_MS = 3000;
const EXIT_MS = 290;

/** Mounted once (by Game) and portalled to the body, so no screen layout can clip or cover the toasts. */
const ToastStack = () => {
  const toasts = useToasts();

  return ReactDOM.createPortal(
    <Stack role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </Stack>,
    document.body
  );
};

export default ToastStack;

const ToastCard = ({ toast }: { toast: Toast }) => {
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setExiting(true), TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => dismissToast(toast.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting, toast.id]);

  return (
    <Card
      $exiting={exiting}
      $tone={toast.tone}
      onClick={() => !exiting && setExiting(true)}
    >
      <CardFace>{toast.face}</CardFace>
      <CardBody>
        <CardTitle>{toast.title}</CardTitle>
        <CardMessage>{toast.message}</CardMessage>
      </CardBody>
      {!exiting && <CardBar />}
    </Card>
  );
};

const toastIn = keyframes`
  from { transform: translateX(calc(100% + 24px)) scaleY(0.88); opacity: 0; }
  to   { transform: translateX(0)                  scaleY(1);    opacity: 1; }
`;

const toastOut = keyframes`
  from { transform: translateX(0)                  scaleY(1);    opacity: 1; }
  to   { transform: translateX(calc(100% + 24px)) scaleY(0.88); opacity: 0; }
`;

const drainBar = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`;

const Stack = styled.div`
  position: fixed;
  top: 28px;
  right: 12px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  > * { pointer-events: auto; }
`;

const Card = styled.div<{ $exiting: boolean; $tone: ToastTone }>`
  --toast-accent: ${({ $tone }) =>
    $tone === "magenta" ? "var(--cyber-magenta)" : "var(--cyber-cyan)"};
  --toast-accent-rgb: ${({ $tone }) =>
    $tone === "magenta" ? "var(--cyber-magenta-rgb)" : "var(--cyber-cyan-rgb)"};
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 18px 14px 12px;
  width: 370px;
  max-width: calc(100vw - 24px);
  font-size: 15px;
  overflow: hidden;
  background: linear-gradient(150deg, rgba(var(--cyber-bg-deep-rgb), 0.98) 0%, rgba(var(--cyber-bg-rgb), 0.98) 100%);
  border: 1px solid rgba(var(--toast-accent-rgb), 0.28);
  border-radius: 18px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.72),
    0 0 0 0.5px rgba(var(--toast-accent-rgb), 0.08),
    inset 0 1px 0 rgba(var(--cyber-text-rgb), 0.05),
    0 0 20px rgba(var(--toast-accent-rgb), 0.05);
  backdrop-filter: blur(24px);
  cursor: pointer;
  user-select: none;
  animation: ${({ $exiting }) =>
    $exiting
      ? css`${toastOut} 0.28s cubic-bezier(0.4, 0, 1, 1) forwards`
      : css`${toastIn} 0.36s cubic-bezier(0.22, 1.4, 0.36, 1) forwards`};

  &:hover {
    border-color: rgba(var(--toast-accent-rgb), 0.45);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.72),
      0 0 0 0.5px rgba(var(--toast-accent-rgb), 0.15),
      inset 0 1px 0 rgba(var(--cyber-text-rgb), 0.05),
      0 0 28px rgba(var(--toast-accent-rgb), 0.1);
  }
`;

const CardFace = styled.div`
  font-family: "TheFreakyFace";
  font-size: 50px;
  border: 1.5px solid var(--cyber-magenta);
  border-radius: 50%;
  background-color: rgba(var(--cyber-magenta-rgb), 0.07);
  width: 40px;
  height: 40px;
  line-height: 35px;
  text-align: center;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(var(--cyber-magenta-rgb), 0.35), inset 0 0 8px rgba(var(--cyber-magenta-rgb), 0.07);
  color: var(--cyber-magenta);
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.div`
  color: var(--cyber-text-bright);
  font-weight: 700;
  font-size: 1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
  line-height: 1.25;
`;

const CardMessage = styled.div`
  color: rgba(var(--toast-accent-rgb), 0.65);
  font-size: 0.85em;
  margin-top: 3px;
  letter-spacing: 0.03em;
  line-height: 1.25;
`;

const CardBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, var(--toast-accent), rgba(var(--toast-accent-rgb), 0.4));
  border-radius: 0 0 18px 18px;
  transform-origin: left center;
  animation: ${drainBar} ${TOAST_MS}ms linear forwards;
  box-shadow: 0 0 8px rgba(var(--toast-accent-rgb), 0.6);
`;

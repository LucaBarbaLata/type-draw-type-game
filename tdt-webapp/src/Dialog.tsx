import React from "react";
import styled, { keyframes } from "styled-components";

const dialogIn = keyframes`
  from { opacity: 0; transform: scale(0.93); }
  to   { opacity: 1; transform: scale(1); }
`;

const Dialog = ({
  show,
  children,
  highPriority = false,
}: {
  show: boolean;
  children: React.ReactNode;
  highPriority?: boolean;
}) => {
  if (!show) return null;

  return (
    <StyledDialog highPriority={highPriority}>
      <DialogContent>{children}</DialogContent>
    </StyledDialog>
  );
};

export default Dialog;

const StyledDialog = styled.div<{ highPriority: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 10, 0.75);
  backdrop-filter: blur(6px);
  z-index: ${(props) => (props.highPriority ? 20 : 10)};
`;

const DialogContent = styled.div`
  width: 90vw;
  height: 90vh;
  border: 1.5px solid #00f5ff;
  border-radius: 1.5vmin;
  background-color: #08081a;
  box-shadow: 0 0 20px #00f5ff, 0 0 60px rgba(0, 245, 255, 0.15), inset 0 0 40px rgba(0, 245, 255, 0.02);
  overflow: hidden;
  animation: ${dialogIn} 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

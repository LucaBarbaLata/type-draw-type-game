import React from "react";
import styled, { keyframes } from "styled-components";

const DRAW_MESSAGES = [
  "UPLOADING MASTERPIECE...",
  "AWAIT GRID SYNCHRONIZATION...",
  "OTHER ARTISTS STILL PAINTING...",
  "BUFFER OVERFLOW IMMINENT...",
  "NEURAL CANVAS PROCESSING...",
  "JACKING INTO THE ART NET...",
  "PIXEL MATRIX RENDERING...",
  "STAND BY FOR DATA UPLINK...",
];

const TYPE_MESSAGES = [
  "SCANNING NEURAL NETWORK...",
  "AWAITING WORD UPLINK...",
  "OTHER PLAYERS STILL TYPING...",
  "DECRYPTING LANGUAGE CORES...",
  "LINGUISTIC MATRIX ACTIVE...",
  "COMPILING STORY FRAGMENTS...",
  "PROCESSING TEXT STREAMS...",
  "STAND BY FOR TRANSMISSION...",
];

const WaitingMessage = ({ context }: { context: "draw" | "type" }) => {
  const messages = context === "draw" ? DRAW_MESSAGES : TYPE_MESSAGES;
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(cycle);
  }, [messages.length]);

  return <MessageText visible={visible}>{messages[index]}</MessageText>;
};

export default WaitingMessage;

const fadeInOut = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const MessageText = styled.span<{ visible: boolean }>`
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.3s;
  animation: ${({ visible }) => (visible ? fadeInOut : "none")} 0.4s ease;
`;

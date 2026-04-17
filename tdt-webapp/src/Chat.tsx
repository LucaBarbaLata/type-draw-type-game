import React from "react";
import styled from "styled-components";

import { PlayerInfo } from "./model";
import Face from "./Face";

export interface ChatMessage {
  sender: PlayerInfo;
  text: string;
}

const Chat = ({
  enabled,
  messages,
  onSend,
}: {
  enabled: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) => {
  const [draft, setDraft] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <ChatBox>
      <ChatTitle>Chat</ChatTitle>
      <ChatMessages>
        {!enabled && (
          <ChatDisabled>Chat disabled by host</ChatDisabled>
        )}
        {enabled && messages.length === 0 && (
          <ChatEmpty>No messages yet…</ChatEmpty>
        )}
        {enabled && messages.map((msg, i) => (
          <ChatMsg key={i}>
            <ChatFace><Face face={msg.sender.face} small={true} /></ChatFace>
            <ChatMsgContent>
              <ChatSender>{msg.sender.isCreator ? <><CrownIcon>👑</CrownIcon> </> : null}{msg.sender.name}</ChatSender>
              <ChatText>{msg.text}</ChatText>
            </ChatMsgContent>
          </ChatMsg>
        ))}
        <div ref={messagesEndRef} />
      </ChatMessages>
      <ChatInputRow>
        <ChatInput
          type="text"
          placeholder={enabled ? "Say something…" : "Chat disabled"}
          value={draft}
          disabled={!enabled}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <ChatSendBtn onClick={handleSend} disabled={!enabled || !draft.trim()}>
          ↵
        </ChatSendBtn>
      </ChatInputRow>
    </ChatBox>
  );
};

export default Chat;

export const ChatBox = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1.5px solid rgba(0, 245, 255, 0.2);
  flex: 0 0 auto;
  height: 28vh;
`;

const ChatTitle = styled.div`
  padding: 1vmin 2vmin 0.5vmin;
  font-size: 1.3vmin;
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  text-transform: uppercase;
  letter-spacing: 0.15em;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5vmin 2vmin;
  display: flex;
  flex-direction: column;
  gap: 0.8vmin;

  &::-webkit-scrollbar {
    width: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 245, 255, 0.3);
    border-radius: 2px;
  }
`;

const ChatMsg = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.8vmin;
`;

const ChatFace = styled.span`
  flex-shrink: 0;
`;

const ChatMsgContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1vmin;
  min-width: 0;
`;

const ChatSender = styled.span`
  font-size: 2.4vmin;
  color: var(--cyber-cyan);
  font-weight: bold;
  letter-spacing: 0.05em;
`;

const CrownIcon = styled.span`
  font-size: 0.7em;
  line-height: 1;
  position: relative;
  top: -0.1em;
`;

const ChatText = styled.span`
  font-size: 2vmin;
  color: var(--cyber-text);
  word-break: break-word;
`;

const ChatEmpty = styled.div`
  font-size: 1.3vmin;
  color: var(--cyber-text-muted);
  font-style: italic;
  padding: 1vmin 0;
`;

const ChatDisabled = styled.div`
  font-size: 1.3vmin;
  color: rgba(255, 32, 121, 0.6);
  font-style: italic;
  padding: 1vmin 0;
`;

const ChatInputRow = styled.div`
  display: flex;
  gap: 1vmin;
  padding: 1vmin 2vmin;
  border-top: 1px solid rgba(0, 245, 255, 0.1);
`;

const ChatInput = styled.input`
  flex: 1;
  font-size: 1.4vmin;
  padding: 0.6vmin 1vmin;
  background: rgba(0, 245, 255, 0.04);
  border: 1px solid rgba(0, 245, 255, 0.25);
  border-radius: 0.5vmin;
  color: var(--cyber-text);
  outline: none;
  text-align: left;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus {
    border-color: rgba(0, 245, 255, 0.6);
  }
`;

const ChatSendBtn = styled.button`
  font-size: 1.6vmin;
  padding: 0.5vmin 1.2vmin;
  background: rgba(0, 245, 255, 0.08);
  border: 1px solid rgba(0, 245, 255, 0.35);
  border-radius: 0.5vmin;
  color: var(--cyber-cyan);
  cursor: pointer;
  transition: background 0.1s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(0, 245, 255, 0.18);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

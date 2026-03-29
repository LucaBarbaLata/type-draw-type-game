import React from "react";
import styled from "styled-components";
import { QRCodeCanvas } from "qrcode.react";

import { PlayerInfo } from "./model";
import Player from "./Player";
import Face from "./Face";
import Logo from "./Logo";

import "./BeforeGameStartScreens.css";

export interface ChatMessage {
  sender: PlayerInfo;
  text: string;
}

export interface GameSettings {
  roundTimerSeconds: number;
  maxPlayers: number;
  chatEnabled: boolean;
  isPublic: boolean;
}

export const WaitForPlayersScreen = ({
  gameId,
  players,
  chatEnabled,
  chatMessages,
  handleStart,
  handleSettingsChange,
  onSendMessage,
}: {
  gameId: string;
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  handleStart: (settings: GameSettings) => void;
  handleSettingsChange: (settings: GameSettings) => void;
  onSendMessage: (text: string) => void;
}) => {
  const [roundTimerSeconds, setRoundTimerSeconds] = React.useState(0);
  const [maxPlayers, setMaxPlayers] = React.useState(0);
  const [localChatEnabled, setLocalChatEnabled] = React.useState(true);
  const [localIsPublic, setLocalIsPublic] = React.useState(false);
  const qrWrapperRef = React.useRef<HTMLDivElement>(null);

  const notifyChange = (timerSecs: number, maxP: number, chat: boolean, pub: boolean) => {
    handleSettingsChange({ roundTimerSeconds: timerSecs, maxPlayers: maxP, chatEnabled: chat, isPublic: pub });
  };

  const buttonDisabled = players.length <= 1;
  const link = window.location.toString();

  const handleDownloadQR = () => {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tdt-${gameId}.png`;
    a.click();
  };

  return (
    <BeforeGameStartScreen
      players={players}
      chatEnabled={chatEnabled}
      chatMessages={chatMessages}
      onSendMessage={onSendMessage}
    >
      <RightContent>
        <Logo />

        <InviteSection>
          <InviteFields>
            <FieldBlock>
              <div className="field-label">Game Code</div>
              <div className="field code-field">{gameId}</div>
            </FieldBlock>
            <FieldBlock>
              <div className="field-label">Link</div>
              <div className="field link-field">{link}</div>
            </FieldBlock>
          </InviteFields>

          <QRBlock ref={qrWrapperRef} onClick={handleDownloadQR} title="Click to download QR code">
            <QRCodeCanvas
              value={link}
              size={130}
              bgColor="#080818"
              fgColor="#00f5ff"
              level="M"
            />
            <QRHint>↓ save</QRHint>
          </QRBlock>
        </InviteSection>

        <BottomRow>
          <SettingsSection>
            <SettingsTitle>Settings</SettingsTitle>
            <SettingRow>
              <label htmlFor="timer-select">Round Timer</label>
              <select
                id="timer-select"
                value={roundTimerSeconds}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRoundTimerSeconds(v);
                  notifyChange(v, maxPlayers, localChatEnabled, localIsPublic);
                }}
              >
                <option value={0}>No limit</option>
                <option value={30}>30 s</option>
                <option value={60}>1 min</option>
                <option value={90}>90 s</option>
                <option value={120}>2 min</option>
                <option value={180}>3 min</option>
              </select>
            </SettingRow>
            <SettingRow>
              <label htmlFor="maxplayers-select">Max Players</label>
              <select
                id="maxplayers-select"
                value={maxPlayers}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxPlayers(v);
                  notifyChange(roundTimerSeconds, v, localChatEnabled, localIsPublic);
                }}
              >
                <option value={0}>No limit</option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow>
              <label htmlFor="chat-toggle">Lobby Chat</label>
              <ChatToggle
                id="chat-toggle"
                type="checkbox"
                checked={localChatEnabled}
                onChange={(e) => {
                  const v = e.target.checked;
                  setLocalChatEnabled(v);
                  notifyChange(roundTimerSeconds, maxPlayers, v, localIsPublic);
                }}
              />
            </SettingRow>
            <SettingRow>
              <label htmlFor="public-toggle">Public Lobby</label>
              <ChatToggle
                id="public-toggle"
                type="checkbox"
                checked={localIsPublic}
                onChange={(e) => {
                  const v = e.target.checked;
                  setLocalIsPublic(v);
                  notifyChange(roundTimerSeconds, maxPlayers, localChatEnabled, v);
                }}
              />
            </SettingRow>
          </SettingsSection>

          <StartBlock>
            <button
              className="button"
              disabled={buttonDisabled}
              title={buttonDisabled ? "Waiting for more players" : "Let's go!"}
              onClick={() => handleStart({ roundTimerSeconds, maxPlayers, chatEnabled: localChatEnabled, isPublic: localIsPublic })}
            >
              Start Game
            </button>
            <StartNote>Once started, no new players can join</StartNote>
          </StartBlock>
        </BottomRow>
      </RightContent>
    </BeforeGameStartScreen>
  );
};

export const WaitForGameStartScreen = ({
  players,
  chatEnabled,
  chatMessages,
  onSendMessage,
}: {
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
}) => {
  const creator = players.find((p) => p.isCreator)!;

  return (
    <BeforeGameStartScreen
      players={players}
      chatEnabled={chatEnabled}
      chatMessages={chatMessages}
      onSendMessage={onSendMessage}
    >
      <RightContent>
        <Logo />
        <WaitText>Waiting for <strong>{creator.name}</strong> to start the game…</WaitText>
      </RightContent>
    </BeforeGameStartScreen>
  );
};

// ── Chat ─────────────────────────────────────────────────────────────────────

const LobbyChat = ({
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
              <ChatSender>{msg.sender.name}</ChatSender>
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

// ── Layout ──────────────────────────────────────────────────────────────────

const BeforeGameStartScreen = ({
  players,
  chatEnabled,
  chatMessages,
  onSendMessage,
  children,
}: {
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="BeforeGameStartScreen">
      <div className="BeforeGameStartScreen-left">
        <div className="Players-title">Players:</div>
        <div className="Players">
          {players.map((player, index) => (
            <Player key={index} face={player.face}>
              {index === 0 ? `👑 ${player.name}` : player.name}
            </Player>
          ))}
        </div>
        <LobbyChat enabled={chatEnabled} messages={chatMessages} onSend={onSendMessage} />
      </div>
      <div className="BeforeGameStartScreen-right">{children}</div>
    </div>
  );
};

const RightContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vmin;
  width: 100%;
  padding: 2vmin 3vmin;
  box-sizing: border-box;
`;

const InviteSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2.5vmin;
  width: 100%;
`;

const InviteFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5vmin;
  flex: 1;
  min-width: 0;

  .code-field {
    font-size: 2.8vmin;
    letter-spacing: 0.3em;
    text-align: center;
  }

  .link-field {
    font-size: 1.4vmin;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: all;
  }
`;

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5vmin;
`;

const QRBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vmin;
  padding: 1vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 1vmin;
  background: #080818;
  box-shadow: 0 0 14px rgba(0, 245, 255, 0.12);
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.15s, border-color 0.15s;

  &:hover {
    border-color: rgba(0, 245, 255, 0.8);
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.25);
  }
`;

const QRHint = styled.div`
  font-size: 1.2vmin;
  color: rgba(0, 245, 255, 0.5);
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const BottomRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3vmin;
  width: 100%;
`;

const StartBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1vmin;
  flex-shrink: 0;
`;

const StartNote = styled.div`
  font-size: 1.3vmin;
  color: #3d5570;
  text-align: center;
  letter-spacing: 0.05em;
`;

const WaitText = styled.div`
  font-size: 2vmin;
  color: #6688aa;
  text-align: center;
  letter-spacing: 0.05em;

  strong {
    color: var(--cyber-cyan);
    text-shadow: var(--cyber-glow);
  }
`;

// ── Settings ─────────────────────────────────────────────────────────────────

const SettingsSection = styled.div`
  flex: 1;
  padding: 1.5vmin 2vmin;
  background: rgba(0, 245, 255, 0.03);
  border: 1.5px solid rgba(0, 245, 255, 0.25);
  border-radius: 1vmin;
  box-shadow: 0 0 10px rgba(0, 245, 255, 0.06);
`;

const SettingsTitle = styled.div`
  font-weight: bold;
  margin-bottom: 1.2vmin;
  font-size: 1.6vmin;
  color: #00f5ff;
  text-shadow: 0 0 8px #00f5ff;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2vmin;
  margin-bottom: 0.8vmin;

  label {
    font-size: 1.5vmin;
    white-space: nowrap;
    color: #6688aa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  select {
    font-size: 1.5vmin;
    padding: 0.4vmin 0.8vmin;
    border-radius: 0.5vmin;
    border: 1.5px solid rgba(0, 245, 255, 0.4);
    background: rgba(0, 245, 255, 0.06);
    color: #00f5ff;
    cursor: pointer;
    outline: none;
    box-shadow: 0 0 5px rgba(0, 245, 255, 0.12);
  }

  select option {
    background: #0c0c20;
    color: #c8d8f0;
  }
`;

const ChatToggle = styled.input`
  width: 2vmin;
  height: 2vmin;
  cursor: pointer;
  accent-color: #00f5ff;
`;

// ── Chat styles ───────────────────────────────────────────────────────────────

const ChatBox = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1.5px solid rgba(0, 245, 255, 0.2);
  margin-right: 5vmin;
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
  font-size: 1.1vmin;
  color: var(--cyber-cyan);
  font-weight: bold;
  letter-spacing: 0.05em;
`;

const ChatText = styled.span`
  font-size: 1.4vmin;
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

export default WaitForPlayersScreen;

import React from "react";
import styled from "styled-components";
import { QRCodeCanvas } from "qrcode.react";

import { GameMode, PlayerInfo } from "./model";
import Player from "./Player";
import Face from "./Face";
import Logo from "./Logo";

import "./BeforeGameStartScreens.css";

const GAME_MODE_OPTIONS: { value: GameMode; label: string; description: string }[] = [
  { value: "CLASSIC",        label: "Classic",          description: "The original game — type, draw, repeat." },
  { value: "ONE_WORD",       label: "One-Word",         description: "Typing phases are limited to a single word — no spaces allowed." },
  { value: "SHAKY_HANDS",    label: "Shaky Hands",      description: "A random wobble is added to every stroke. Good luck drawing a straight line." },
  { value: "BLIND_DRAW",     label: "Blind Draw",       description: "Your brush is invisible while you draw. Strokes only appear when you lift the pen." },
  { value: "TELEPHONE_NOIR", label: "Telephone Noir",   description: "The colour palette is locked to black, white, and grey. All drawings must be monochrome." },
  { value: "OPPOSITE",       label: "Opposite Mode",    description: "Always draw the opposite of what you receive. The chain constantly inverts and un-inverts itself." },
  { value: "FOG_OF_WAR",     label: "Fog of War",       description: "Only a small circle around your cursor is visible while drawing. Explore the canvas to see what you've done." },
  { value: "HOT_POTATO",     label: "Hot Canvas",       description: "All players draw at the same time. Every 30 s the server rotates everyone to a different canvas." },
  { value: "TEAM",           label: "Team Mode",        description: "Two players share one canvas and draw on it simultaneously in real time." },
];

export interface ChatMessage {
  sender: PlayerInfo;
  text: string;
}

export interface GameSettings {
  roundTimerSeconds: number;
  maxPlayers: number;
  chatEnabled: boolean;
  isPublic: boolean;
  gameMode: GameMode;
}

export const WaitForPlayersScreen = ({
  gameId,
  players,
  chatEnabled,
  chatMessages,
  handleStart,
  handleSettingsChange,
  onSendMessage,
  onKickPlayer,
  onBanPlayer,
}: {
  gameId: string;
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  handleStart: (settings: GameSettings) => void;
  handleSettingsChange: (settings: GameSettings) => void;
  onSendMessage: (text: string) => void;
  onKickPlayer: (playerName: string) => void;
  onBanPlayer: (playerName: string) => void;
}) => {
  const [roundTimerSeconds, setRoundTimerSeconds] = React.useState(0);
  const [maxPlayers, setMaxPlayers] = React.useState(0);
  const [localChatEnabled, setLocalChatEnabled] = React.useState(true);
  const [localIsPublic, setLocalIsPublic] = React.useState(false);
  const [localGameMode, setLocalGameMode] = React.useState<GameMode>("CLASSIC");
  const qrWrapperRef = React.useRef<HTMLDivElement>(null);

  const notifyChange = (timerSecs: number, maxP: number, chat: boolean, pub: boolean, mode: GameMode) => {
    handleSettingsChange({ roundTimerSeconds: timerSecs, maxPlayers: maxP, chatEnabled: chat, isPublic: pub, gameMode: mode });
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
      onKickPlayer={onKickPlayer}
      onBanPlayer={onBanPlayer}
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
                  notifyChange(v, maxPlayers, localChatEnabled, localIsPublic, localGameMode);
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
                  notifyChange(roundTimerSeconds, v, localChatEnabled, localIsPublic, localGameMode);
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
                  notifyChange(roundTimerSeconds, maxPlayers, v, localIsPublic, localGameMode);
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
                  notifyChange(roundTimerSeconds, maxPlayers, localChatEnabled, v, localGameMode);
                }}
              />
            </SettingRow>
            <SettingRow>
              <label htmlFor="gamemode-select">Game Mode</label>
              <select
                id="gamemode-select"
                value={localGameMode}
                onChange={(e) => {
                  const v = e.target.value as GameMode;
                  setLocalGameMode(v);
                  notifyChange(roundTimerSeconds, maxPlayers, localChatEnabled, localIsPublic, v);
                }}
              >
                {GAME_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} title={opt.description}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </SettingRow>
            {localGameMode !== "CLASSIC" && (
              <GameModeDescription>
                {GAME_MODE_OPTIONS.find((o) => o.value === localGameMode)?.description}
              </GameModeDescription>
            )}
          </SettingsSection>

          <StartBlock>
            <button
              className="button"
              disabled={buttonDisabled}
              title={buttonDisabled ? "Waiting for more players" : "Let's go!"}
              onClick={() => handleStart({ roundTimerSeconds, maxPlayers, chatEnabled: localChatEnabled, isPublic: localIsPublic, gameMode: localGameMode })}
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
  gameMode,
}: {
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  gameMode: GameMode;
}) => {
  const creator = players.find((p) => p.isCreator)!;
  const modeOption = GAME_MODE_OPTIONS.find((o) => o.value === gameMode) ?? GAME_MODE_OPTIONS[0];

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
        <GameModeBadge>
          <GameModeBadgeLabel>Mode</GameModeBadgeLabel>
          <GameModeBadgeName>{modeOption.label}</GameModeBadgeName>
          <GameModeBadgeDesc>{modeOption.description}</GameModeBadgeDesc>
        </GameModeBadge>
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

// ── Layout ──────────────────────────────────────────────────────────────────

const BeforeGameStartScreen = ({
  players,
  chatEnabled,
  chatMessages,
  onSendMessage,
  onKickPlayer,
  onBanPlayer,
  children,
}: {
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onKickPlayer?: (playerName: string) => void;
  onBanPlayer?: (playerName: string) => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="BeforeGameStartScreen">
      <div className="BeforeGameStartScreen-left">
        <div className="Players-title">Players:</div>
        <div className="Players">
          {players.map((player, index) => (
            <PlayerRow key={index}>
              <Player face={player.face}>
                {player.isCreator ? <><CrownIcon>👑</CrownIcon> {player.name}</> : player.name}
              </Player>
              {!player.isCreator && (onKickPlayer || onBanPlayer) && (
                <PlayerActions>
                  {onKickPlayer && (
                    <KickBtn onClick={() => onKickPlayer(player.name)} title="Kick player">
                      ✕
                    </KickBtn>
                  )}
                  {onBanPlayer && (
                    <BanBtn onClick={() => onBanPlayer(player.name)} title="Ban player">
                      ⊘
                    </BanBtn>
                  )}
                </PlayerActions>
              )}
            </PlayerRow>
          ))}
        </div>
        <LobbyChat enabled={chatEnabled} messages={chatMessages} onSend={onSendMessage} />
      </div>
      <div className="BeforeGameStartScreen-right">{children}</div>
    </div>
  );
};

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 1vmin;
`;

const PlayerActions = styled.div`
  display: flex;
  gap: 0.6vmin;
  flex-shrink: 0;
`;

const KickBtn = styled.button`
  background: none;
  border: 1.5px solid rgba(255, 32, 121, 0.5);
  border-radius: 50%;
  color: var(--cyber-magenta);
  width: 3.5vmin;
  height: 3.5vmin;
  font-size: 1.5vmin;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.1s, border-color 0.1s;

  &:hover {
    background: rgba(255, 32, 121, 0.15);
    border-color: var(--cyber-magenta);
    box-shadow: var(--cyber-glow-magenta);
  }
`;

const BanBtn = styled.button`
  background: none;
  border: 1.5px solid rgba(255, 160, 0, 0.5);
  border-radius: 50%;
  color: #ffa000;
  width: 3.5vmin;
  height: 3.5vmin;
  font-size: 1.5vmin;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.1s, border-color 0.1s;

  &:hover {
    background: rgba(255, 160, 0, 0.15);
    border-color: #ffa000;
    box-shadow: 0 0 8px #ffa000, 0 0 20px rgba(255, 160, 0, 0.2);
  }
`;

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

const GameModeDescription = styled.div`
  font-size: 1.3vmin;
  color: rgba(0, 245, 255, 0.6);
  font-style: italic;
  margin-top: 0.4vmin;
  line-height: 1.4;
`;

const GameModeBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4vmin;
  padding: 1.2vmin 2vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.3);
  border-radius: 100px;
  background: rgba(0, 245, 255, 0.05);
  box-shadow: 0 0 10px rgba(0, 245, 255, 0.08);
`;

const GameModeBadgeLabel = styled.div`
  font-size: 1.1vmin;
  color: var(--cyber-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const GameModeBadgeName = styled.div`
  font-size: 1.8vmin;
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  font-weight: 600;
  letter-spacing: 0.06em;
`;

const GameModeBadgeDesc = styled.div`
  font-size: 1.2vmin;
  color: var(--cyber-text-muted);
  text-align: center;
  max-width: 40vmin;
`;

export default WaitForPlayersScreen;

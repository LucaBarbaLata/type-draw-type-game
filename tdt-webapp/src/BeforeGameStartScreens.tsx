import React from "react";
import styled from "styled-components";
import { QRCodeCanvas } from "qrcode.react";

import { GameMode, PlayerInfo } from "./model";
import Player from "./Player";
import Logo from "./Logo";
import Chat, { type ChatMessage } from "./Chat";
export type { ChatMessage };

import logoImg from "./img/logo.svg";
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

export interface GameSettings {
  roundTimerSeconds: number;
  maxPlayers: number;
  chatEnabled: boolean;
  isPublic: boolean;
  gameMode: GameMode;
  hotPotatoIntervalSeconds: number;
  hotPotatoTotalSeconds: number;
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
  const [hpInterval, setHpInterval] = React.useState(30);
  const [hpTotal, setHpTotal] = React.useState(180);
  const qrWrapperRef = React.useRef<HTMLDivElement>(null);

  const buildSettings = (
    timerSecs: number, maxP: number, chat: boolean, pub: boolean,
    mode: GameMode, hpInt: number, hpTot: number
  ): GameSettings => ({
    roundTimerSeconds: timerSecs, maxPlayers: maxP, chatEnabled: chat,
    isPublic: pub, gameMode: mode,
    hotPotatoIntervalSeconds: hpInt, hotPotatoTotalSeconds: hpTot,
  });

  const notifyChange = (timerSecs: number, maxP: number, chat: boolean, pub: boolean, mode: GameMode, hpInt = hpInterval, hpTot = hpTotal) => {
    handleSettingsChange(buildSettings(timerSecs, maxP, chat, pub, mode, hpInt, hpTot));
  };

  const minPlayers = localGameMode === "TEAM" ? 4 : 2;
  const buttonDisabled = players.length < minPlayers;
  const link = window.location.toString();

  const handleDownloadCard = async () => {
    const qrCanvas = qrWrapperRef.current?.querySelector("canvas");
    if (!qrCanvas) return;

    const creatorName = players.find((p) => p.isCreator)?.name ?? "";
    const modeLabel = GAME_MODE_OPTIONS.find((o) => o.value === localGameMode)?.label ?? localGameMode;

    const W = 440;
    const dpr = 2;

    const headerH = 136;
    const qrSize = 240;
    const qrPadV = 48;
    const codeH = 76;
    const sepH = 1;
    const footerH = 80;
    const taglineH = 44;
    const H = headerH + qrPadV + qrSize + qrPadV + codeH + sepH + footerH + taglineH;

    const c = document.createElement("canvas");
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const R = 18;

    const rrect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    ctx.fillStyle = "#050a1c";
    rrect(0, 0, W, H, R);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,245,255,0.5)";
    ctx.lineWidth = 2;
    rrect(1, 1, W - 2, H - 2, R);
    ctx.stroke();

    ctx.save();
    rrect(0, 0, W, H, R);
    ctx.clip();
    const shapeTypes = ['tri', 'x', 'circle', 'box'];
    for (let i = 0; i < 5120; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const angle = Math.random() * Math.PI * 2;
      const size = 2 + Math.random() * 5;
      const alpha = (0.07 + Math.random() * 0.11).toFixed(2);
      const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(0,245,255,${alpha})`;
      ctx.shadowColor = `rgba(0,245,255,${alpha})`;
      ctx.shadowBlur = 6 + Math.random() * 8;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (shape === 'tri') {
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(-size * 0.866, size * 0.5);
        ctx.closePath();
        ctx.stroke();
      } else if (shape === 'x') {
        ctx.moveTo(-size, -size); ctx.lineTo(size, size);
        ctx.moveTo(size, -size); ctx.lineTo(-size, size);
        ctx.stroke();
      } else if (shape === 'circle') {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(-size, -size, size * 2, size * 2);
      }
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    rrect(0, 0, W, H, R);
    ctx.clip();
    ctx.fillStyle = "rgba(0,245,255,0.08)";
    ctx.fillRect(0, 0, W, headerH);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,245,255,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerH);
    ctx.lineTo(W, headerH);
    ctx.stroke();

    const svgText = await fetch(logoImg as string).then((r) => r.text());
    const fixedSvg = svgText
      .replace('aria-label="DRAW"', 'aria-label="DRAW" fill="white"')
      .replace(/aria-label="Type"/g, 'aria-label="Type" fill="white"');
    const svgBlob = new Blob([fixedSvg], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const logo = new Image();
    logo.src = svgUrl;
    await new Promise<void>((resolve) => { logo.onload = () => resolve(); });
    const logoH = 68;
    const logoW = logoH * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, (W - logoW) / 2, (headerH - logoH) / 2, logoW, logoH);
    URL.revokeObjectURL(svgUrl);

    const qrX = (W - qrSize) / 2;
    const qrY = headerH + qrPadV;
    const qrPad = 10;
    const qrBoxX = qrX - qrPad;
    const qrBoxY = qrY - qrPad;
    const qrBoxW = qrSize + qrPad * 2;
    const qrBoxH = qrSize + qrPad * 2;
    const qrBoxR = 12;

    ctx.fillStyle = "#050a1c";
    rrect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrBoxR);
    ctx.fill();

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.save();
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "rgba(0,245,255,0.9)";
    ctx.lineWidth = 2;
    rrect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrBoxR);
    ctx.stroke();
    ctx.shadowBlur = 36;
    ctx.strokeStyle = "rgba(0,245,255,0.4)";
    rrect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, qrBoxR);
    ctx.stroke();
    ctx.restore();

    const codeY = qrY + qrSize + qrPadV;
    ctx.textAlign = "center";
    ctx.font = "bold 34px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,245,255,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillText(gameId.split("").join("  "), W / 2, codeY + 38);
    ctx.shadowBlur = 0;

    const footerSepY = codeY + codeH;
    ctx.strokeStyle = "rgba(0,245,255,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, footerSepY);
    ctx.lineTo(W - 24, footerSepY);
    ctx.stroke();

    ctx.save();
    rrect(0, 0, W, H, R);
    ctx.clip();
    ctx.fillStyle = "rgba(5,10,28,0.82)";
    ctx.fillRect(0, footerSepY, W, H - footerSepY);
    ctx.restore();

    const footerY = footerSepY + sepH;
    const stats = [
      { label: "HOST", value: creatorName },
      { label: "PLAYERS", value: `${players.length}${maxPlayers > 0 ? `/${maxPlayers}` : ""}` },
      { label: "MODE", value: modeLabel },
    ];
    const colW = W / 3;
    stats.forEach((stat, i) => {
      const x = colW * i + colW / 2;
      ctx.textAlign = "center";
      ctx.font = "11px 'Courier New', monospace";
      ctx.fillStyle = "rgba(0,245,255,0.45)";
      ctx.fillText(stat.label, x, footerY + 16);
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = "#00f5ff";
      ctx.fillText(stat.value, x, footerY + 36);
    });

    ctx.strokeStyle = "rgba(0,245,255,0.2)";
    ctx.lineWidth = 1;
    [W / 3, (W * 2) / 3].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, footerY + 6);
      ctx.lineTo(x, footerY + 46);
      ctx.stroke();
    });

    const taglineY = footerY + footerH;
    ctx.textAlign = "center";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillStyle = "rgba(0,245,255,0.3)";
    ctx.fillText("SCAN TO JOIN  ·  TYPE DRAW TYPE", W / 2, taglineY + 14);

    const url = c.toDataURL("image/png");
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

          <QRBlock
            ref={qrWrapperRef}
            onClick={handleDownloadCard}
            role="button"
            tabIndex={0}
            aria-label="Download share card"
            title="Click to download share card"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleDownloadCard(); } }}
          >
            <QRCodeCanvas
              value={link}
              size={130}
              bgColor="#080818"
              fgColor="#00f5ff"
              level="M"
            />
            <QRHint>↓ share card</QRHint>
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
              <ToggleSwitch
                id="chat-toggle"
                checked={localChatEnabled}
                onChange={(v) => {
                  setLocalChatEnabled(v);
                  notifyChange(roundTimerSeconds, maxPlayers, v, localIsPublic, localGameMode);
                }}
              />
            </SettingRow>
            <SettingRow>
              <label htmlFor="public-toggle">Public Lobby</label>
              <ToggleSwitch
                id="public-toggle"
                checked={localIsPublic}
                onChange={(v) => {
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
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </SettingRow>
            {localGameMode === "HOT_POTATO" && (
              <>
                <SettingRow>
                  <label htmlFor="hp-interval-select">Rotation Every</label>
                  <select
                    id="hp-interval-select"
                    value={hpInterval}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setHpInterval(v);
                      notifyChange(roundTimerSeconds, maxPlayers, localChatEnabled, localIsPublic, localGameMode, v, hpTotal);
                    }}
                  >
                    <option value={15}>15 s</option>
                    <option value={30}>30 s</option>
                    <option value={60}>60 s</option>
                  </select>
                </SettingRow>
                <SettingRow>
                  <label htmlFor="hp-total-select">Total Duration</label>
                  <select
                    id="hp-total-select"
                    value={hpTotal}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setHpTotal(v);
                      notifyChange(roundTimerSeconds, maxPlayers, localChatEnabled, localIsPublic, localGameMode, hpInterval, v);
                    }}
                  >
                    <option value={180}>3 min</option>
                    <option value={300}>5 min</option>
                    <option value={600}>10 min</option>
                  </select>
                </SettingRow>
              </>
            )}
            <GameModeDescription>
              {GAME_MODE_OPTIONS.find((o) => o.value === localGameMode)?.description}
            </GameModeDescription>
          </SettingsSection>

          <StartBlock>
            <button
              className="button"
              disabled={buttonDisabled}
              title={buttonDisabled ? (localGameMode === "TEAM" ? "Team Mode requires at least 4 players" : "Waiting for more players") : "Let's go!"}
              onClick={() => handleStart(buildSettings(roundTimerSeconds, maxPlayers, localChatEnabled, localIsPublic, localGameMode, hpInterval, hpTotal))}
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
  hotPotatoIntervalSeconds,
  hotPotatoTotalSeconds,
}: {
  players: PlayerInfo[];
  chatEnabled: boolean;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  gameMode: GameMode;
  hotPotatoIntervalSeconds?: number;
  hotPotatoTotalSeconds?: number;
}) => {
  const creator = players.find((p) => p.isCreator)!;
  const modeOption = GAME_MODE_OPTIONS.find((o) => o.value === gameMode) ?? GAME_MODE_OPTIONS[0];
  const isHotPotato = gameMode === "HOT_POTATO";

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
          {isHotPotato && hotPotatoIntervalSeconds != null && hotPotatoTotalSeconds != null && (
            <GameModeBadgeDesc>
              {hotPotatoIntervalSeconds}s rotations · {hotPotatoTotalSeconds / 60} min total
            </GameModeBadgeDesc>
          )}
        </GameModeBadge>
      </RightContent>
    </BeforeGameStartScreen>
  );
};

// ── Toggle Switch ────────────────────────────────────────────────────────────

const ToggleSwitch = ({ id, checked, onChange }: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <ToggleOuter>
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <ToggleTrack $on={checked} />
  </ToggleOuter>
);

const ToggleOuter = styled.span`
  position: relative;
  display: inline-block;
  width: 40px;
  min-width: 40px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;

  input {
    opacity: 0;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
    z-index: 1;
  }

  &:focus-within span {
    outline: 2px solid var(--cyber-cyan);
    outline-offset: 2px;
  }
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: 22px;
  background: ${p => p.$on ? 'rgba(0, 245, 255, 0.18)' : 'rgba(0, 245, 255, 0.06)'};
  border: 1.5px solid ${p => p.$on ? 'var(--cyber-cyan)' : 'rgba(0, 245, 255, 0.28)'};
  box-shadow: ${p => p.$on ? 'var(--cyber-glow)' : 'none'};
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    top: 50%;
    left: ${p => p.$on ? 'calc(100% - 18px)' : '3px'};
    transform: translateY(-50%);
    background: ${p => p.$on ? 'var(--cyber-cyan)' : 'rgba(0, 245, 255, 0.4)'};
    border-radius: 50%;
    box-shadow: ${p => p.$on ? '0 0 8px #00f5ff' : 'none'};
    transition: left 0.2s, background 0.2s, box-shadow 0.2s;
  }
`;

// ── Layout ───────────────────────────────────────────────────────────────────

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
  const [pendingAction, setPendingAction] = React.useState<{ name: string; type: "kick" | "ban" } | null>(null);

  return (
    <div className="BeforeGameStartScreen">
      <div className="BeforeGameStartScreen-left">
        <div className="Players-title">Players ({players.length}):</div>
        <div className="Players">
          {players.map((player, index) => (
            <PlayerRow key={index}>
              <Player face={player.face}>
                {player.isCreator ? (
                  <><span aria-hidden="true">👑</span> {player.name}</>
                ) : player.name}
              </Player>
              {!player.isCreator && (onKickPlayer || onBanPlayer) && (
                <PlayerActions>
                  {pendingAction?.name === player.name ? (
                    <>
                      <ConfirmLabel>Sure?</ConfirmLabel>
                      <ConfirmBtn
                        onClick={() => {
                          if (pendingAction.type === "kick") onKickPlayer?.(player.name);
                          else onBanPlayer?.(player.name);
                          setPendingAction(null);
                        }}
                        aria-label="Confirm"
                      >
                        ✓
                      </ConfirmBtn>
                      <CancelBtn
                        onClick={() => setPendingAction(null)}
                        aria-label="Cancel"
                      >
                        ✕
                      </CancelBtn>
                    </>
                  ) : (
                    <>
                      {onKickPlayer && (
                        <KickBtn
                          onClick={() => setPendingAction({ name: player.name, type: "kick" })}
                          aria-label={`Kick ${player.name}`}
                          title={`Kick ${player.name}`}
                        >
                          ✕
                        </KickBtn>
                      )}
                      {onBanPlayer && (
                        <BanBtn
                          onClick={() => setPendingAction({ name: player.name, type: "ban" })}
                          aria-label={`Ban ${player.name}`}
                          title={`Ban ${player.name}`}
                        >
                          ⊘
                        </BanBtn>
                      )}
                    </>
                  )}
                </PlayerActions>
              )}
            </PlayerRow>
          ))}
        </div>
        <LobbyChatWrapper>
          <Chat enabled={chatEnabled} messages={chatMessages} onSend={onSendMessage} />
        </LobbyChatWrapper>
      </div>
      <div className="BeforeGameStartScreen-right">{children}</div>
    </div>
  );
};

// ── Styled components ────────────────────────────────────────────────────────

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 1vmin;
  margin-bottom: 2vmin;
`;

const PlayerActions = styled.div`
  display: flex;
  gap: 0.5vmin;
  align-items: center;
  flex-shrink: 0;
`;

const actionBtnBase = `
  background: none;
  border-radius: 50%;
  width: max(3.5vmin, 32px);
  height: max(3.5vmin, 32px);
  min-width: 32px;
  min-height: 32px;
  font-size: max(1.5vmin, 11px);
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
`;

const KickBtn = styled.button`
  ${actionBtnBase}
  border: 1.5px solid rgba(255, 32, 121, 0.45);
  color: var(--cyber-magenta);

  &:hover {
    background: rgba(255, 32, 121, 0.15);
    border-color: var(--cyber-magenta);
    box-shadow: var(--cyber-glow-magenta);
  }
  &:focus-visible {
    outline: 2px solid var(--cyber-magenta);
    outline-offset: 2px;
  }
`;

const BanBtn = styled.button`
  ${actionBtnBase}
  border: 1.5px solid rgba(255, 160, 0, 0.45);
  color: #ffa000;

  &:hover {
    background: rgba(255, 160, 0, 0.15);
    border-color: #ffa000;
    box-shadow: 0 0 8px #ffa000, 0 0 20px rgba(255, 160, 0, 0.2);
  }
  &:focus-visible {
    outline: 2px solid #ffa000;
    outline-offset: 2px;
  }
`;

const ConfirmLabel = styled.span`
  font-size: max(1.3vmin, 10px);
  color: var(--cyber-text-muted);
  letter-spacing: 0.06em;
  white-space: nowrap;
`;

const ConfirmBtn = styled.button`
  ${actionBtnBase}
  border: 1.5px solid rgba(57, 255, 20, 0.5);
  color: var(--cyber-green);

  &:hover { background: rgba(57, 255, 20, 0.12); }
  &:focus-visible { outline: 2px solid var(--cyber-green); outline-offset: 2px; }
`;

const CancelBtn = styled.button`
  ${actionBtnBase}
  border: 1.5px solid rgba(200, 216, 240, 0.3);
  color: var(--cyber-text-muted);

  &:hover { background: rgba(200, 216, 240, 0.08); }
  &:focus-visible { outline: 2px solid var(--cyber-cyan); outline-offset: 2px; }
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
    font-size: max(2.8vmin, 18px);
    letter-spacing: 0.3em;
    text-align: center;
  }

  .link-field {
    font-size: max(1.4vmin, 11px);
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
  border: 1.5px solid rgba(0, 245, 255, 0.35);
  border-radius: 1vmin;
  background: #080818;
  box-shadow: 0 0 14px rgba(0, 245, 255, 0.1);
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.15s, border-color 0.15s;

  &:hover {
    border-color: rgba(0, 245, 255, 0.75);
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.22);
  }
  &:focus-visible {
    outline: 2px solid var(--cyber-cyan);
    outline-offset: 3px;
  }
`;

const QRHint = styled.div`
  font-size: max(1.2vmin, 10px);
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
  font-size: max(1.3vmin, 10px);
  color: var(--cyber-text-muted);
  text-align: center;
  letter-spacing: 0.05em;
`;

const WaitText = styled.div`
  font-size: max(2vmin, 14px);
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
  background: rgba(0, 245, 255, 0.04);
  border: 1.5px solid rgba(0, 245, 255, 0.22);
  border-top: 2px solid rgba(0, 245, 255, 0.5);
  border-radius: 1vmin;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.06), inset 0 1px 0 rgba(0, 245, 255, 0.08);
`;

const SettingsTitle = styled.div`
  font-weight: bold;
  margin-bottom: 1.2vmin;
  font-size: max(1.6vmin, 12px);
  color: var(--cyber-cyan);
  text-shadow: 0 0 8px #00f5ff;
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2vmin;
  margin-bottom: 0.9vmin;

  label {
    font-size: max(1.5vmin, 11px);
    white-space: nowrap;
    color: var(--cyber-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  select {
    appearance: none;
    -webkit-appearance: none;
    font-size: max(1.5vmin, 11px);
    padding: max(0.4vmin, 4px) max(1.8vmin, 22px) max(0.4vmin, 4px) max(0.8vmin, 8px);
    border-radius: 4px;
    border: 1.5px solid rgba(0, 245, 255, 0.4);
    background-color: rgba(0, 245, 255, 0.06);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300f5ff'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 7px center;
    background-size: 8px 5px;
    color: var(--cyber-cyan);
    cursor: pointer;
    outline: none;
    box-shadow: 0 0 5px rgba(0, 245, 255, 0.1);
    min-height: 28px;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  select:focus-visible {
    outline: 2px solid var(--cyber-cyan);
    outline-offset: 2px;
    border-color: var(--cyber-cyan);
    box-shadow: var(--cyber-glow);
  }

  select option {
    background: #0c0c20;
    color: #c8d8f0;
  }
`;

const LobbyChatWrapper = styled.div`
  margin-right: 5vmin;
`;

const GameModeDescription = styled.div`
  font-size: max(1.3vmin, 10px);
  color: rgba(0, 245, 255, 0.6);
  font-style: italic;
  margin-top: 0.6vmin;
  line-height: 1.5;
`;

const GameModeBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5vmin;
  padding: 1.5vmin 2.5vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.28);
  border-top: 2px solid rgba(0, 245, 255, 0.5);
  border-radius: 2vmin;
  background: rgba(0, 245, 255, 0.04);
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.07), inset 0 1px 0 rgba(0, 245, 255, 0.08);
  max-width: 48vmin;
  width: 100%;
  box-sizing: border-box;
`;

const GameModeBadgeLabel = styled.div`
  font-size: max(1.1vmin, 10px);
  color: var(--cyber-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
`;

const GameModeBadgeName = styled.div`
  font-size: max(1.8vmin, 14px);
  color: var(--cyber-cyan);
  text-shadow: var(--cyber-glow);
  font-weight: 600;
  letter-spacing: 0.06em;
`;

const GameModeBadgeDesc = styled.div`
  font-size: max(1.2vmin, 10px);
  color: var(--cyber-text-muted);
  text-align: center;
  max-width: 40vmin;
  line-height: 1.5;
`;

export default WaitForPlayersScreen;

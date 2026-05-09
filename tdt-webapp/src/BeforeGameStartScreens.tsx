import React from "react";
import styled from "styled-components";
import QRCodeStyling from "qr-code-styling";
import CustomQRCode from "./CustomQRCode";

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

  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const minPlayers = localGameMode === "TEAM" ? 4 : 2;
  const buttonDisabled = players.length < minPlayers;
  const link = window.location.toString();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch { /* fall through to execCommand */ }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch { /* no-op */ }
    document.body.removeChild(ta);
  };

  const handleShare = async () => {
    const messages = [
      "Come play Type Draw Type with me!",
      "Join me for a round of Type Draw Type!",
      "I'm starting a Type Draw Type game — want in?",
      "Let's play Type Draw Type together!",
      "You're invited to my Type Draw Type lobby!",
      "Get in here, we're playing Type Draw Type!",
      "My Type Draw Type game needs more players!",
      "Think you can out-draw me? Type Draw Type — join up!",
    ];
    const text = messages[Math.floor(Math.random() * messages.length)];
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Type Draw Type", text, url: link }); } catch { /* cancelled */ }
    } else {
      await copyToClipboard(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCard = async () => {
    setDownloading(true);
    const creatorName = players.find((p) => p.isCreator)?.name ?? "";
    const modeLabel = GAME_MODE_OPTIONS.find((o) => o.value === localGameMode)?.label ?? localGameMode;

    // Render a fresh high-res QR (dark on off-white) off-screen
    const tempEl = document.createElement("div");
    tempEl.style.cssText = "position:absolute;left:-9999px;top:-9999px;";
    document.body.appendChild(tempEl);
    const cardQr = new QRCodeStyling({
      width: 240, height: 240, type: "canvas",
      data: link,
      qrOptions: { errorCorrectionLevel: "M" },
      dotsOptions: { color: "#00f5ff", type: "square" },
      backgroundOptions: { color: "#060a1a" },
      cornersSquareOptions: { type: "extra-rounded", color: "#00f5ff" },
      cornersDotOptions: { type: "dot", color: "#00f5ff" },
      margin: 2,
    });
    cardQr.append(tempEl);
    const cardQrCanvas = tempEl.querySelector("canvas");

    // ── Landscape ticket: 900 × 400, 2× DPR ────────────────────
    const W = 900;
    const H = 400;
    const dpr = 2;
    const splitX = 552;   // dark panel | light panel

    const c = document.createElement("canvas");
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const rrect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // ── LEFT PANEL (dark navy) ───────────────────────────────────
    ctx.fillStyle = "#060a1a";
    ctx.fillRect(0, 0, splitX, H);

    // Dot-grid texture
    ctx.fillStyle = "rgba(0,245,255,0.07)";
    for (let gx = 11; gx < splitX; gx += 22) {
      for (let gy = 11; gy < H; gy += 22) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Top accent lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,245,255,0.65)";
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(splitX, 14); ctx.stroke();
    ctx.strokeStyle = "rgba(0,245,255,0.2)";
    ctx.beginPath(); ctx.moveTo(28, 19); ctx.lineTo(splitX - 28, 19); ctx.stroke();

    // Bottom accent lines (mirrored)
    ctx.strokeStyle = "rgba(0,245,255,0.65)";
    ctx.beginPath(); ctx.moveTo(0, H - 14); ctx.lineTo(splitX, H - 14); ctx.stroke();
    ctx.strokeStyle = "rgba(0,245,255,0.2)";
    ctx.beginPath(); ctx.moveTo(28, H - 19); ctx.lineTo(splitX - 28, H - 19); ctx.stroke();

    // Logo (centered in left panel)
    const svgText = await fetch(logoImg as string).then((r) => r.text());
    const fixedSvg = svgText
      .replace('aria-label="DRAW"', 'aria-label="DRAW" fill="white"')
      .replace(/aria-label="Type"/g, 'aria-label="Type" fill="white"');
    const svgBlob = new Blob([fixedSvg], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const logo = new Image();
    logo.src = svgUrl;
    await new Promise<void>((resolve) => { logo.onload = () => resolve(); });
    const logoH = 48;
    const logoW = logoH * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, (splitX - logoW) / 2, 32, logoW, logoH);
    URL.revokeObjectURL(svgUrl);

    // "GAME CODE" label
    ctx.textAlign = "center";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillStyle = "rgba(0,245,255,0.4)";
    ctx.fillText("GAME  CODE", splitX / 2, 138);

    // Game code — large, glowing
    ctx.font = "bold 44px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 20;
    ctx.fillText(gameId.split("").join("  "), splitX / 2, 186);
    ctx.shadowBlur = 0;

    // Separator
    ctx.strokeStyle = "rgba(0,245,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, 214); ctx.lineTo(splitX - 28, 214); ctx.stroke();

    // Stats row (HOST / PLAYERS / MODE)
    const stats = [
      { label: "HOST", value: creatorName },
      { label: "PLAYERS", value: `${players.length}${maxPlayers > 0 ? `/${maxPlayers}` : ""}` },
      { label: "MODE", value: modeLabel },
    ];
    const colW = splitX / 3;
    stats.forEach((stat, i) => {
      const x = colW * i + colW / 2;
      ctx.textAlign = "center";
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillStyle = "rgba(0,245,255,0.4)";
      ctx.fillText(stat.label, x, 238);
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.fillStyle = "#00f5ff";
      ctx.fillText(stat.value, x, 256);
    });

    // Stat column dividers
    ctx.strokeStyle = "rgba(0,245,255,0.15)";
    [colW, colW * 2].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 228);
      ctx.lineTo(x, 262);
      ctx.stroke();
    });

    // Separator
    ctx.strokeStyle = "rgba(0,245,255,0.18)";
    ctx.beginPath(); ctx.moveTo(28, 278); ctx.lineTo(splitX - 28, 278); ctx.stroke();

    // URL
    ctx.textAlign = "center";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillStyle = "rgba(100,136,170,0.6)";
    const urlText = link.length > 60 ? link.slice(0, 57) + "…" : link;
    ctx.fillText(urlText, splitX / 2, 302);

    // ── PERFORATED DIVIDER ───────────────────────────────────────
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = "rgba(0,245,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── RIGHT PANEL (dark, same as left) ────────────────────────
    ctx.fillStyle = "#060a1a";
    ctx.fillRect(splitX, 0, W - splitX, H);

    // Dot-grid texture (matches left panel)
    ctx.fillStyle = "rgba(0,245,255,0.07)";
    for (let gx = splitX + 11; gx < W; gx += 22) {
      for (let gy = 11; gy < H; gy += 22) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // QR dark container — centered in right panel, matches left-panel aesthetic
    const rightW = W - splitX;
    const qrContainerSize = 252;
    const qrContainerX = splitX + Math.round((rightW - qrContainerSize) / 2);
    const qrContainerY = Math.round((H - qrContainerSize) / 2) - 10;
    const qrContainerR = 14;

    // Outer cyan glow
    ctx.save();
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 22;
    ctx.strokeStyle = "rgba(0,245,255,0.65)";
    ctx.lineWidth = 1.5;
    rrect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, qrContainerR);
    ctx.stroke();
    ctx.restore();

    // Dark navy fill
    ctx.fillStyle = "#060a1a";
    rrect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, qrContainerR);
    ctx.fill();

    // QR canvas clipped inside container
    if (cardQrCanvas) {
      ctx.save();
      rrect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, qrContainerR);
      ctx.clip();
      const qrPad = 10;
      ctx.drawImage(cardQrCanvas, qrContainerX + qrPad, qrContainerY + qrPad, qrContainerSize - qrPad * 2, qrContainerSize - qrPad * 2);
      ctx.restore();
    }

    // Thin border on top
    ctx.strokeStyle = "rgba(0,245,255,0.4)";
    ctx.lineWidth = 1;
    rrect(qrContainerX, qrContainerY, qrContainerSize, qrContainerSize, qrContainerR);
    ctx.stroke();

    // "SCAN TO JOIN" below container
    ctx.textAlign = "center";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillStyle = "rgba(0,245,255,0.4)";
    ctx.fillText("SCAN  TO  JOIN", splitX + rightW / 2, qrContainerY + qrContainerSize + 22);

    // Cleanup and trigger download
    document.body.removeChild(tempEl);
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `tdt-${gameId}.png`;
    a.click();
    setDownloading(false);
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

          <QRWrapper>
            <QRBlock ref={qrWrapperRef}>
              <CustomQRCode
                value={link}
                size={160}
                bgColor="#080818"
                fgColor="#00f5ff"
              />
            </QRBlock>
            <QRActions>
              <QRActionBtn onClick={handleShare}>
                {copied ? "✓ Copied!" : ((navigator as any).share ? "Share" : "Copy Link")}
              </QRActionBtn>
              <QRActionBtn onClick={handleDownloadCard} disabled={downloading}>
                {downloading ? "Building..." : "↓ Card"}
              </QRActionBtn>
            </QRActions>
          </QRWrapper>
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
            {localGameMode !== "CLASSIC" && localGameMode !== "HOT_POTATO" && (
              <GameModeDescription>
                {GAME_MODE_OPTIONS.find((o) => o.value === localGameMode)?.description}
              </GameModeDescription>
            )}
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
        <div className="Players-title">Players ({players.length}):</div>
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
        <LobbyChatWrapper>
          <Chat enabled={chatEnabled} messages={chatMessages} onSend={onSendMessage} />
        </LobbyChatWrapper>
      </div>
      <div className="BeforeGameStartScreen-right">{children}</div>
    </div>
  );
};

const CrownIcon = styled.span`
  display: inline-block;
  line-height: 1;
`;

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

const QRWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vmin;
  flex-shrink: 0;
`;

const QRBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.4);
  border-radius: 1vmin;
  background: #080818;
  box-shadow: 0 0 14px rgba(0, 245, 255, 0.12);
`;

const QRActions = styled.div`
  display: flex;
  gap: 0.7vmin;
`;

const QRActionBtn = styled.button`
  background: rgba(0, 245, 255, 0.06);
  border: 1.5px solid rgba(0, 245, 255, 0.35);
  border-radius: 0.5vmin;
  color: #00f5ff;
  font-size: 1.1vmin;
  padding: 0.45vmin 1.1vmin;
  cursor: pointer;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:hover:not(:disabled) {
    background: rgba(0, 245, 255, 0.13);
    border-color: rgba(0, 245, 255, 0.75);
    box-shadow: 0 0 8px rgba(0, 245, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
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

const LobbyChatWrapper = styled.div`
  margin-right: 5vmin;
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
  gap: 0.5vmin;
  padding: 1.5vmin 2.5vmin;
  border: 1.5px solid rgba(0, 245, 255, 0.3);
  border-radius: 2vmin;
  background: rgba(0, 245, 255, 0.05);
  box-shadow: 0 0 10px rgba(0, 245, 255, 0.08);
  max-width: 48vmin;
  width: 100%;
  box-sizing: border-box;
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

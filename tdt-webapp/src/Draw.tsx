import React from "react";
import styled, { css, keyframes } from "styled-components";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import { GameMode, PlayerInfo, Brush, StrokeSegment } from "./model";

import { ConfirmDrawingDialog, DrawHelpDialog } from "./DrawDialogs";
import DrawCanvas, { ImageProvider, DrawTool } from "./DrawCanvas";
import DrawTools from "./DrawTools";
import RoundTimer from "./RoundTimer";
import WaitingMessage from "./WaitingMessage";

import "./Draw.css";

function getBrushes(_scale: number): Brush[] {
  const brushes: Array<{ pixelSize: number; displaySize: number }> = [
    { pixelSize: 2,  displaySize: 4  },
    { pixelSize: 8,  displaySize: 10 },
    { pixelSize: 16, displaySize: 18 },
    { pixelSize: 32, displaySize: 28 },
    { pixelSize: 64, displaySize: 40 },
  ];
  return brushes;
}

const REPLAY_MAX_FRAMES = 80;
const REPLAY_THROTTLE_MS = 150;
const REPLAY_THUMB_WIDTH = 540;
const REPLAY_THUMB_HEIGHT = 405;
const REPLAY_JPEG_QUALITY = 0.6;

interface DrawNotif {
  id: number;
  player: PlayerInfo;
}

const Draw = ({
  text,
  textWriter,
  round,
  rounds,
  roundTimerSeconds,
  gameMode,
  handleDone,
  onSubmit,
  onUrgentStart,
  onTick,
  onTimerExpire,
  onSendReplay,
  onStrokeSegment,
  onTeamSync,
  onSpectatorSnapshot,
  cacheKey,
  initialImageUrl: initialImageUrlProp,
  partnerCursor,
  imageProviderRef: imageProviderRefProp,
  spectatorCount,
  finishedPlayers,
}: {
  text: string;
  textWriter: PlayerInfo;
  round: number;
  rounds: number;
  roundTimerSeconds: number;
  gameMode: GameMode;
  handleDone: (image: Blob) => void;
  onSubmit?: () => void;
  onUrgentStart?: () => void;
  onTick?: () => void;
  onTimerExpire?: () => void;
  onSendReplay?: (round: number, frames: string[]) => void;
  onStrokeSegment?: (seg: StrokeSegment) => void;
  onTeamSync?: () => void;
  onSpectatorSnapshot?: (dataUrl: string) => void;
  cacheKey?: string;
  initialImageUrl?: string;
  partnerCursor?: { x: number; y: number; name: string } | null;
  imageProviderRef?: React.MutableRefObject<ImageProvider | undefined>;
  spectatorCount?: number;
  finishedPlayers?: PlayerInfo[];
}) => {
  const isHotPotato = gameMode === "HOT_POTATO";
  const [cachedImageUrl] = React.useState<string | undefined>(() =>
    cacheKey ? (sessionStorage.getItem(cacheKey) ?? undefined) : undefined
  );
  const resolvedInitialImageUrl = initialImageUrlProp ?? cachedImageUrl;
  const [showHelpDialog, setShowHelpDialog] = React.useState(!isHotPotato);
  const [firstTimeHelpDialog, setFirstTimeHelpDialog] = React.useState(true);

  const [color, setColor] = React.useState("#000");
  const [activeTool, setActiveTool] = React.useState<DrawTool>("pen");

  const [brushes, setBrushes] = React.useState(() => getBrushes(1));
  const [selectedBrushIndex, setSelectedBrushIndex] = React.useState(1);
  const selectedBrush: Brush = brushes[selectedBrushIndex];

  const handleScaleChange = React.useCallback((scale: number) => {
    setBrushes(getBrushes(scale));
  }, []);

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = React.useState<string | undefined>();

  const [submitted, setSubmitted] = React.useState(false);
  const internalImageProviderRef = React.useRef<ImageProvider | undefined>();
  const imageProviderRef = imageProviderRefProp ?? internalImageProviderRef;
  const submittedRef = React.useRef(false);

  const replayFramesRef = React.useRef<string[]>([]);
  const lastSnapshotTimeRef = React.useRef<number>(0);
  const lastSpectatorSnapshotTimeRef = React.useRef<number>(0);
  const SPECTATOR_SNAPSHOT_THROTTLE_MS = 500;

  const [notifications, setNotifications] = React.useState<DrawNotif[]>([]);
  const notifIdRef = React.useRef(0);
  const seenFinishedRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    seenFinishedRef.current = new Set();
    setNotifications([]);
  }, [round]);

  React.useEffect(() => {
    if (!finishedPlayers || submitted) return;
    const newOnes = finishedPlayers.filter(p => !seenFinishedRef.current.has(p.name + p.face));
    if (newOnes.length === 0) return;
    newOnes.forEach(p => seenFinishedRef.current.add(p.name + p.face));
    setNotifications(prev => [
      ...prev,
      ...newOnes.map(player => ({ id: ++notifIdRef.current, player })),
    ]);
  }, [finishedPlayers, submitted]);

  const removeNotif = React.useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const captureFrame = React.useCallback(() => {
    const imageProvider = imageProviderRef.current;
    if (!imageProvider) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = REPLAY_THUMB_WIDTH;
    offscreen.height = REPLAY_THUMB_HEIGHT;
    offscreen.getContext("2d")!.drawImage(imageProvider.getCanvas(), 0, 0, REPLAY_THUMB_WIDTH, REPLAY_THUMB_HEIGHT);
    replayFramesRef.current.push(offscreen.toDataURL("image/jpeg", REPLAY_JPEG_QUALITY));
  }, []);

  const handleStrokeEnd = React.useCallback(() => {
    const now = Date.now();
    // Replay frame capture (throttled separately)
    if (now - lastSnapshotTimeRef.current >= REPLAY_THROTTLE_MS && replayFramesRef.current.length < REPLAY_MAX_FRAMES) {
      captureFrame();
      lastSnapshotTimeRef.current = now;
    }
    // Spectator snapshot (separate throttle)
    if (onSpectatorSnapshot && now - lastSpectatorSnapshotTimeRef.current >= SPECTATOR_SNAPSHOT_THROTTLE_MS) {
      const imageProvider = imageProviderRef.current;
      if (imageProvider) {
        const offscreen = document.createElement("canvas");
        offscreen.width = REPLAY_THUMB_WIDTH;
        offscreen.height = REPLAY_THUMB_HEIGHT;
        offscreen.getContext("2d")!.drawImage(imageProvider.getCanvas(), 0, 0, REPLAY_THUMB_WIDTH, REPLAY_THUMB_HEIGHT);
        onSpectatorSnapshot(offscreen.toDataURL("image/jpeg", REPLAY_JPEG_QUALITY));
        lastSpectatorSnapshotTimeRef.current = now;
      }
    }
  }, [captureFrame, onSpectatorSnapshot]);

  const handleStrokeComplete = React.useCallback(() => {
    if (!cacheKey) return;
    const canvas = imageProviderRef.current?.getCanvas();
    if (!canvas) return;
    setTimeout(() => {
      try {
        sessionStorage.setItem(cacheKey, canvas.toDataURL("image/jpeg", 0.9));
      } catch { /* quota exceeded */ }
    }, 0);
  }, [cacheKey]);

  const submitDrawing = React.useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    onSubmit?.();
    setSubmitted(true);
    if (replayFramesRef.current.length > 0) {
      captureFrame();
      onSendReplay?.(round, replayFramesRef.current);
    }
    const imageProvider = imageProviderRef.current!;
    window
      .fetch(imageProvider.getImageDataURL())
      .then((res) => res.blob())
      .then((image) => handleDone(image));
  }, [handleDone, onSubmit, onSendReplay, round, captureFrame, cacheKey]);

  const handleClickDone = () => {
    if (isHotPotato) {
      submitDrawing();
      return;
    }
    setDrawingDataUrl(imageProviderRef.current!.getImageDataURL());
    setShowConfirmDialog(true);
  };

  const handleTimerExpire = React.useCallback(() => {
    onTimerExpire?.();
    setShowConfirmDialog(false);
    submitDrawing();
  }, [submitDrawing, onTimerExpire]);

  if (submitted) {
    return (
      <div className="Draw-waiting">
        <WaitingMessage context="draw" />
      </div>
    );
  }

  return (
    <div className="Draw">
      <ConfirmDrawingDialog
        text={text}
        show={showConfirmDialog}
        drawingDataUrl={drawingDataUrl}
        handleDone={() => { submitDrawing(); setShowConfirmDialog(false); }}
        handleContinue={() => { setShowConfirmDialog(false); setDrawingDataUrl(undefined); }}
      />
      <DrawHelpDialog
        text={text}
        textWriter={textWriter}
        round={round}
        rounds={rounds}
        show={showHelpDialog}
        firstShow={firstTimeHelpDialog}
        handleClose={() => {
          setShowHelpDialog(false);
          setFirstTimeHelpDialog(false);
          toggleToFullscreenAndLandscapeOnMobile();
        }}
      />
      <DrawTools
        color={color}
        brushes={brushes}
        selectedBrush={selectedBrush}
        activeTool={activeTool}
        gameMode={gameMode}
        triggerHelp={() => setShowHelpDialog(true)}
        onSelectBrush={(i) => { setSelectedBrushIndex(i); setActiveTool("pen"); }}
        onChangeColor={(c) => setColor(c)}
        onSetTool={setActiveTool}
        onUndo={() => { imageProviderRef.current?.undo(); onTeamSync?.(); }}
        onRedo={() => { imageProviderRef.current?.redo(); onTeamSync?.(); }}
        onDone={handleClickDone}
      />
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} onUrgentStart={onUrgentStart} onTick={onTick} />
      )}
      {spectatorCount != null && spectatorCount > 0 && (
        <SpectatorBadge>👁 {spectatorCount} watching</SpectatorBadge>
      )}
      <DrawCanvas
        color={color}
        brushPixelSize={selectedBrush.pixelSize}
        tool={activeTool}
        gameMode={gameMode}
        imageProviderRef={imageProviderRef}
        handleScaleChange={handleScaleChange}
        onStrokeEnd={handleStrokeEnd}
        onStrokeComplete={handleStrokeComplete}
        onStrokeSegment={onStrokeSegment}
        initialImageUrl={resolvedInitialImageUrl}
        partnerCursor={partnerCursor}
      />
      <NotifStack>
        {notifications.map(n => (
          <FinishedNotification
            key={n.id}
            player={n.player}
            onDone={() => removeNotif(n.id)}
          />
        ))}
      </NotifStack>
    </div>
  );
};

export default Draw;

const SpectatorBadge = styled.div`
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(8, 8, 24, 0.85);
  border: 1px solid rgba(0, 245, 255, 0.4);
  color: rgba(0, 245, 255, 0.8);
  font-size: 1.6vmin;
  padding: 2px 10px;
  border-radius: 20px;
  z-index: 100;
  pointer-events: none;
  letter-spacing: 0.06em;
  backdrop-filter: blur(4px);
`;

const notifSlideIn = keyframes`
  from { transform: translateX(calc(100% + 20px)); opacity: 0; }
  to   { transform: translateX(0);                 opacity: 1; }
`;

const notifSlideOut = keyframes`
  from { transform: translateX(0);                 opacity: 1; }
  to   { transform: translateX(calc(100% + 20px)); opacity: 0; }
`;

const NotifStack = styled.div`
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

const NotifCard = styled.div<{ $exiting: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 10px;
  background: rgba(14, 14, 32, 0.96);
  border: 1px solid rgba(0, 245, 255, 0.22);
  border-radius: 20px;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.65), 0 0 14px rgba(0, 245, 255, 0.07);
  backdrop-filter: blur(18px);
  cursor: pointer;
  user-select: none;
  width: 300px;
  animation: ${({ $exiting }) =>
    $exiting
      ? css`${notifSlideOut} 0.3s ease-in forwards`
      : css`${notifSlideIn} 0.32s cubic-bezier(0.34, 1.15, 0.64, 1) forwards`};
`;

const NotifAvatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: rgba(0, 245, 255, 0.07);
  border: 1px solid rgba(0, 245, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7em;
  flex-shrink: 0;
`;

const NotifBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotifName = styled.div`
  color: #e8eaff;
  font-weight: 700;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
`;

const NotifSub = styled.div`
  color: rgba(0, 245, 255, 0.7);
  font-size: 0.82em;
  margin-top: 3px;
  letter-spacing: 0.02em;
`;

const FinishedNotification = ({
  player,
  onDone,
}: {
  player: PlayerInfo;
  onDone: () => void;
}) => {
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setExiting(true), 3000);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onDone, 310);
    return () => clearTimeout(t);
  }, [exiting, onDone]);

  return (
    <NotifCard $exiting={exiting} onClick={() => !exiting && setExiting(true)}>
      <NotifAvatar>{player.face}</NotifAvatar>
      <NotifBody>
        <NotifName>{player.name}</NotifName>
        <NotifSub>✏️ finished drawing!</NotifSub>
      </NotifBody>
    </NotifCard>
  );
};


import React from "react";
import styled from "styled-components";

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
const REPLAY_THUMB_WIDTH = 360;
const REPLAY_THUMB_HEIGHT = 270;
const REPLAY_JPEG_QUALITY = 0.35;

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
    try {
      sessionStorage.setItem(cacheKey, canvas.toDataURL("image/jpeg", 0.9));
    } catch { /* quota exceeded */ }
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
    const imageProvider = imageProviderRef.current;
    if (!imageProvider) return;
    imageProvider.clearHistory();
    imageProvider.getCanvas().toBlob((blob) => { if (blob) handleDone(blob); }, "image/png");
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
        gameMode={gameMode}
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


import React from "react";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import { GameMode, PlayerInfo, Brush } from "./model";

import { ConfirmDrawingDialog, DrawHelpDialog } from "./DrawDialogs";
import DrawCanvas, { ImageProvider, DrawTool } from "./DrawCanvas";
import DrawTools from "./DrawTools";
import RoundTimer from "./RoundTimer";
import WaitingMessage from "./WaitingMessage";

import "./Draw.css";

function getBrushes(scale: number): Brush[] {
  const sizes = [2, 8, 16, 32, 64];
  return sizes.map((size) => ({
    pixelSize: size,
    displaySize: Math.ceil(size * scale),
  }));
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
  cacheKey,
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
  cacheKey?: string;
}) => {
  const [cachedImageUrl] = React.useState<string | undefined>(() =>
    cacheKey ? (sessionStorage.getItem(cacheKey) ?? undefined) : undefined
  );
  const [showHelpDialog, setShowHelpDialog] = React.useState(true);
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
  const imageProviderRef = React.useRef<ImageProvider>();
  const submittedRef = React.useRef(false);

  const replayFramesRef = React.useRef<string[]>([]);
  const lastSnapshotTimeRef = React.useRef<number>(0);

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
    if (now - lastSnapshotTimeRef.current < REPLAY_THROTTLE_MS) return;
    if (replayFramesRef.current.length >= REPLAY_MAX_FRAMES) return;
    captureFrame();
    lastSnapshotTimeRef.current = Date.now();
  }, [captureFrame]);

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
        onUndo={() => imageProviderRef.current?.undo()}
        onRedo={() => imageProviderRef.current?.redo()}
        onDone={handleClickDone}
      />
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} onUrgentStart={onUrgentStart} onTick={onTick} />
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
        initialImageUrl={cachedImageUrl}
      />
    </div>
  );
};

export default Draw;

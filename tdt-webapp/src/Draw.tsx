import React from "react";
import styled, { css, keyframes } from "styled-components";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import { GameMode, PlayerInfo, Brush, StrokeSegment } from "./model";

import { ConfirmDrawingDialog, DrawHelpDialog } from "./DrawDialogs";
import Dialog from "./Dialog";
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
  referenceImageSrc,
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
  teamPartner,
  teamSelfReady,
  teamPartnerReady,
  onTeamReady,
  teamSubmitRequested,
  onSpectatorSnapshot,
  cacheKey,
  initialImageUrl: initialImageUrlProp,
  partnerCursor,
  imageProviderRef: imageProviderRefProp,
  spectatorCount,
  finishedPlayers,
}: {
  text: string;
  /** Photo to redraw instead of a text (Picture Perfect mode); stays visible next to the canvas */
  referenceImageSrc?: string;
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
  /** TEAM mode: the partner sharing this canvas — their approval is required to submit */
  teamPartner?: PlayerInfo;
  teamSelfReady?: boolean;
  teamPartnerReady?: boolean;
  onTeamReady?: (ready: boolean) => void;
  /** TEAM mode: set once the whole team approved and the server picked this client to upload */
  teamSubmitRequested?: boolean;
  onSpectatorSnapshot?: (dataUrl: string) => void;
  cacheKey?: string;
  initialImageUrl?: string;
  partnerCursor?: { x: number; y: number; name: string } | null;
  imageProviderRef?: React.MutableRefObject<ImageProvider | undefined>;
  spectatorCount?: number;
  finishedPlayers?: PlayerInfo[];
}) => {
  const isHotPotato = gameMode === "HOT_POTATO";
  // In TEAM mode a drawing is only submitted once both partners have approved it
  const needsTeamApproval = onTeamReady != null && teamPartner != null;
  const awaitingPartnerApproval = needsTeamApproval && !!teamSelfReady;
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
  const [showReferenceLarge, setShowReferenceLarge] = React.useState(false);

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

  // The whole team approved and the server picked us to upload the shared canvas
  React.useEffect(() => {
    if (teamSubmitRequested) submitDrawing();
  }, [teamSubmitRequested, submitDrawing]);

  const handleClickDone = () => {
    if (isHotPotato) {
      submitDrawing();
      return;
    }
    if (awaitingPartnerApproval) return; // already approved, waiting for the partner
    setDrawingDataUrl(imageProviderRef.current!.getImageDataURL());
    setShowConfirmDialog(true);
  };

  const handleConfirmDone = () => {
    setShowConfirmDialog(false);
    if (needsTeamApproval) {
      // Not submitted yet: the partner has to approve too
      setDrawingDataUrl(undefined);
      onTeamReady!(true);
      return;
    }
    submitDrawing();
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
        referenceImageSrc={referenceImageSrc}
        show={showConfirmDialog}
        drawingDataUrl={drawingDataUrl}
        teamPartnerName={needsTeamApproval ? teamPartner!.name : undefined}
        handleDone={handleConfirmDone}
        handleContinue={() => { setShowConfirmDialog(false); setDrawingDataUrl(undefined); }}
      />
      <DrawHelpDialog
        text={text}
        referenceImageSrc={referenceImageSrc}
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
        onUndo={() => { if (awaitingPartnerApproval) return; imageProviderRef.current?.undo(); onTeamSync?.(); }}
        onRedo={() => { if (awaitingPartnerApproval) return; imageProviderRef.current?.redo(); onTeamSync?.(); }}
        onDone={handleClickDone}
        doneWaiting={awaitingPartnerApproval}
        doneHighlighted={needsTeamApproval && !awaitingPartnerApproval && !!teamPartnerReady}
        doneTooltip={
          !needsTeamApproval ? undefined
            : awaitingPartnerApproval ? `Waiting for ${teamPartner!.name}`
            : teamPartnerReady ? `${teamPartner!.name} is ready — submit the drawing`
            : "Done — your partner still has to approve"
        }
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
        locked={awaitingPartnerApproval}
      />
      {needsTeamApproval && (awaitingPartnerApproval || teamPartnerReady) && (
        <TeamApprovalBar>
          {awaitingPartnerApproval ? (
            <>
              <WaitingDots>Waiting for {teamPartner!.name} to approve</WaitingDots>
              <TeamApprovalButton onClick={() => onTeamReady!(false)}>
                Keep drawing
              </TeamApprovalButton>
            </>
          ) : (
            <span>
              ✓ {teamPartner!.name} is ready — press ✓ when you are too
            </span>
          )}
        </TeamApprovalBar>
      )}
      {referenceImageSrc && (
        <ReferencePanel>
          <ReferenceCaption>Photo by {textWriter.name}</ReferenceCaption>
          <ReferenceImage
            src={referenceImageSrc}
            alt={`Photo by ${textWriter.name}`}
            title="Tap to enlarge"
            onClick={() => setShowReferenceLarge(true)}
          />
          <ReferenceHint>tap to enlarge</ReferenceHint>
        </ReferencePanel>
      )}
      {referenceImageSrc && (
        <Dialog show={showReferenceLarge}>
          <ReferenceLarge onClick={() => setShowReferenceLarge(false)}>
            <img src={referenceImageSrc} alt={`Photo by ${textWriter.name}`} />
            <div className="small">Photo by {textWriter.name} — tap to close</div>
          </ReferenceLarge>
        </Dialog>
      )}
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

const ReferencePanel = styled.div`
  flex: 0 1 26vw;
  min-width: 18vmin;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8vmin;
  padding: 0 1.5vmin;
  z-index: 1;
`;

const ReferenceCaption = styled.div`
  color: rgba(var(--cyber-cyan-rgb), 0.8);
  font-size: 1.8vmin;
  letter-spacing: 0.06em;
  text-align: center;
`;

const ReferenceImage = styled.img`
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 0.5vmin;
  border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.5);
  box-shadow: 0 0 16px rgba(var(--cyber-cyan-rgb), 0.2);
  cursor: zoom-in;
`;

const ReferenceHint = styled.div`
  color: var(--cyber-text-muted);
  font-size: 1.5vmin;
  letter-spacing: 0.06em;
`;

const ReferenceLarge = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5vmin;
  cursor: zoom-out;

  img {
    max-width: 85vw;
    max-height: 75vh;
    object-fit: contain;
    border: 1.5px solid rgba(var(--cyber-cyan-rgb), 0.5);
    border-radius: 1vmin;
    box-shadow: var(--cyber-glow);
  }
`;

const SpectatorBadge = styled.div`
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(var(--cyber-bg-deep-rgb), 0.85);
  border: 1px solid rgba(var(--cyber-cyan-rgb), 0.4);
  color: rgba(var(--cyber-cyan-rgb), 0.8);
  font-size: 1.6vmin;
  padding: 2px 10px;
  border-radius: 20px;
  z-index: 100;
  pointer-events: none;
  letter-spacing: 0.06em;
  backdrop-filter: blur(4px);
`;

const teamBarPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
`;

const TeamApprovalBar = styled.div`
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1.5vmin;
  max-width: 90vw;
  background: rgba(var(--cyber-bg-deep-rgb), 0.9);
  border: 1px solid rgba(var(--cyber-magenta-rgb), 0.5);
  border-radius: 20px;
  color: var(--cyber-magenta);
  font-size: 1.8vmin;
  letter-spacing: 0.06em;
  padding: 0.6vmin 1.6vmin;
  z-index: 100;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 16px rgba(var(--cyber-magenta-rgb), 0.2);
`;

const WaitingDots = styled.span`
  animation: ${teamBarPulse} 1.6s ease-in-out infinite;
`;

const TeamApprovalButton = styled.button`
  background: rgba(var(--cyber-magenta-rgb), 0.12);
  border: 1px solid rgba(var(--cyber-magenta-rgb), 0.6);
  border-radius: 14px;
  color: var(--cyber-magenta);
  font-family: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  padding: 0.3vmin 1.2vmin;
  cursor: pointer;

  &:hover {
    background: rgba(var(--cyber-magenta-rgb), 0.25);
  }
`;

const notifIn = keyframes`
  from { transform: translateX(calc(100% + 24px)) scaleY(0.88); opacity: 0; }
  to   { transform: translateX(0)                  scaleY(1);    opacity: 1; }
`;

const notifOut = keyframes`
  from { transform: translateX(0)                  scaleY(1);    opacity: 1; }
  to   { transform: translateX(calc(100% + 24px)) scaleY(0.88); opacity: 0; }
`;

const drainBar = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 18px 14px 12px;
  width: 370px;
  font-size: 15px;
  overflow: hidden;
  background: linear-gradient(150deg, rgba(var(--cyber-bg-deep-rgb), 0.98) 0%, rgba(var(--cyber-bg-rgb), 0.98) 100%);
  border: 1px solid rgba(var(--cyber-cyan-rgb), 0.28);
  border-radius: 18px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.72),
    0 0 0 0.5px rgba(var(--cyber-cyan-rgb), 0.08),
    inset 0 1px 0 rgba(var(--cyber-text-rgb), 0.05),
    0 0 20px rgba(var(--cyber-cyan-rgb), 0.05);
  backdrop-filter: blur(24px);
  cursor: pointer;
  user-select: none;
  animation: ${({ $exiting }) =>
    $exiting
      ? css`${notifOut} 0.28s cubic-bezier(0.4, 0, 1, 1) forwards`
      : css`${notifIn} 0.36s cubic-bezier(0.22, 1.4, 0.36, 1) forwards`};

  &:hover {
    border-color: rgba(var(--cyber-cyan-rgb), 0.45);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.72),
      0 0 0 0.5px rgba(var(--cyber-cyan-rgb), 0.15),
      inset 0 1px 0 rgba(var(--cyber-text-rgb), 0.05),
      0 0 28px rgba(var(--cyber-cyan-rgb), 0.1);
  }
`;

const NotifFace = styled.div`
  font-family: "TheFreakyFace";
  font-size: 50px;
  border: 1.5px solid var(--cyber-magenta);
  border-radius: 50%;
  background-color: rgba(var(--cyber-magenta-rgb), 0.07);
  width: 40px;
  height: 40px;
  line-height: 35px;
  text-align: center;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(var(--cyber-magenta-rgb), 0.35), inset 0 0 8px rgba(var(--cyber-magenta-rgb), 0.07);
  color: var(--cyber-magenta);
`;

const NotifBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const NotifName = styled.div`
  color: var(--cyber-text-bright);
  font-weight: 700;
  font-size: 1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
  line-height: 1.25;
`;

const NotifSub = styled.div`
  color: rgba(var(--cyber-cyan-rgb), 0.65);
  font-size: 0.85em;
  margin-top: 3px;
  letter-spacing: 0.03em;
  line-height: 1.25;
`;

const NotifBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, var(--cyber-cyan), rgba(var(--cyber-cyan-rgb), 0.4));
  border-radius: 0 0 18px 18px;
  transform-origin: left center;
  animation: ${drainBar} 3s linear forwards;
  box-shadow: 0 0 8px rgba(var(--cyber-cyan-rgb), 0.6);
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
    const t = setTimeout(onDone, 290);
    return () => clearTimeout(t);
  }, [exiting, onDone]);

  return (
    <NotifCard $exiting={exiting} onClick={() => !exiting && setExiting(true)}>
      <NotifFace>{player.face}</NotifFace>
      <NotifBody>
        <NotifName>{player.name}</NotifName>
        <NotifSub>finished drawing</NotifSub>
      </NotifBody>
      {!exiting && <NotifBar />}
    </NotifCard>
  );
};


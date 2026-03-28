import React from "react";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import { PlayerInfo, Brush } from "./model";

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

const Draw = ({
  text,
  textWriter,
  round,
  rounds,
  roundTimerSeconds,
  handleDone,
}: {
  text: string;
  textWriter: PlayerInfo;
  round: number;
  rounds: number;
  roundTimerSeconds: number;
  handleDone: (image: Blob) => void;
}) => {
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

  const submitDrawing = React.useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const imageProvider = imageProviderRef.current!;
    window
      .fetch(imageProvider.getImageDataURL())
      .then((res) => res.blob())
      .then((image) => handleDone(image));
  }, [handleDone]);

  const handleClickDone = () => {
    setDrawingDataUrl(imageProviderRef.current!.getImageDataURL());
    setShowConfirmDialog(true);
  };

  const handleTimerExpire = React.useCallback(() => {
    setShowConfirmDialog(false);
    submitDrawing();
  }, [submitDrawing]);

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
        triggerHelp={() => setShowHelpDialog(true)}
        onSelectBrush={(i) => { setSelectedBrushIndex(i); setActiveTool("pen"); }}
        onChangeColor={(c) => setColor(c)}
        onSetTool={setActiveTool}
        onUndo={() => imageProviderRef.current?.undo()}
        onRedo={() => imageProviderRef.current?.redo()}
        onDone={handleClickDone}
      />
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} />
      )}
      <DrawCanvas
        color={color}
        brushPixelSize={selectedBrush.pixelSize}
        tool={activeTool}
        imageProviderRef={imageProviderRef}
        handleScaleChange={handleScaleChange}
      />
    </div>
  );
};

export default Draw;

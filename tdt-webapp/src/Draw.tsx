import React from "react";

import { toggleToFullscreenAndLandscapeOnMobile } from "./helpers";
import { PlayerInfo, Brush } from "./model";

import { ConfirmDrawingDialog, DrawHelpDialog } from "./DrawDialogs";
import DrawCanvas, { ImageProvider } from "./DrawCanvas";
import DrawTools from "./DrawTools";
import RoundTimer from "./RoundTimer";

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
  const [isEraser, setIsEraser] = React.useState(false);

  const [brushes, setBrushes] = React.useState(() => getBrushes(1));

  const [selectedBrushIndex, setSelectedBrushIndex] = React.useState(1);

  const selectedBrush: Brush = brushes[selectedBrushIndex];

  const handleSelectBrush = (brushIndex: number) => {
    setSelectedBrushIndex(brushIndex);
    setIsEraser(false);
  };

  const handleScaleChange = React.useCallback((scale: number) => {
    setBrushes(getBrushes(scale));
  }, []);

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [drawingDataUrl, setDrawingDataUrl] = React.useState<
    string | undefined
  >();

  const [submitted, setSubmitted] = React.useState(false);
  const imageProviderRef = React.useRef<ImageProvider>();
  const submittedRef = React.useRef(false);

  const submitDrawing = React.useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const imageProvider = imageProviderRef.current!;
    const imageDataUrl = imageProvider.getImageDataURL();
    window
      .fetch(imageDataUrl)
      .then((res) => res.blob())
      .then((image) => handleDone(image));
  }, [handleDone]);

  const handleClickDone = () => {
    const imageProvider = imageProviderRef.current!;
    const imageDataUrl = imageProvider.getImageDataURL();
    setDrawingDataUrl(imageDataUrl);
    setShowConfirmDialog(true);
  };

  const handleConfirmDone = () => {
    submitDrawing();
    setShowConfirmDialog(false);
  };

  const handleContinueDrawing = () => {
    setShowConfirmDialog(false);
    setDrawingDataUrl(undefined);
  };

  const handleCloseHelpDialog = () => {
    setShowHelpDialog(false);
    setFirstTimeHelpDialog(false);
    toggleToFullscreenAndLandscapeOnMobile();
  };

  const handleUndo = () => {
    imageProviderRef.current?.undo();
  };

  const handleToggleEraser = () => {
    setIsEraser((prev) => !prev);
  };

  const handleTimerExpire = React.useCallback(() => {
    setShowConfirmDialog(false);
    submitDrawing();
  }, [submitDrawing]);

  if (submitted) {
    return (
      <div className="Draw-waiting">
        Waiting for other players to finish drawing...
      </div>
    );
  }

  return (
    <div className="Draw">
      <ConfirmDrawingDialog
        text={text}
        show={showConfirmDialog}
        drawingDataUrl={drawingDataUrl}
        handleDone={handleConfirmDone}
        handleContinue={handleContinueDrawing}
      />
      <DrawHelpDialog
        text={text}
        textWriter={textWriter}
        round={round}
        rounds={rounds}
        show={showHelpDialog}
        firstShow={firstTimeHelpDialog}
        handleClose={handleCloseHelpDialog}
      />
      <DrawTools
        color={color}
        brushes={brushes}
        selectedBrush={selectedBrush}
        isEraser={isEraser}
        triggerHelp={() => setShowHelpDialog(true)}
        onSelectBrush={handleSelectBrush}
        onChangeColor={(newColor) => {
          setColor(newColor);
          setIsEraser(false);
        }}
        onToggleEraser={handleToggleEraser}
        onUndo={handleUndo}
        onDone={handleClickDone}
      />
      {roundTimerSeconds > 0 && (
        <RoundTimer seconds={roundTimerSeconds} onExpire={handleTimerExpire} />
      )}
      <DrawCanvas
        color={color}
        brushPixelSize={selectedBrush.pixelSize}
        isEraser={isEraser}
        imageProviderRef={imageProviderRef}
        handleScaleChange={handleScaleChange}
      />
    </div>
  );
};

export default Draw;

import React from "react";

import { useWindowSize } from "./helpers";
import { Brush } from "./model";
<<<<<<< HEAD
import { DrawTool, LayerInfo, MAX_LAYERS } from "./DrawCanvas";
=======
import { DrawTool } from "./DrawCanvas";
>>>>>>> parent of 5544e72 (Add multi-layer canvas support and layers UI)

import Dialog from "./Dialog";
import ColorPicker from "./ColorPicker";

import helpImg from "./img/help.svg";
import checkImg from "./img/check.svg";
import colorwheelImg from "./img/colorwheel.svg";

const DrawTools = ({
  color,
  brushes,
  selectedBrush,
  activeTool,
  triggerHelp,
  onSelectBrush,
  onChangeColor,
  onSetTool,
  onUndo,
  onRedo,
  onDone,
}: {
  color: string;
  brushes: Brush[];
  selectedBrush: Brush;
  activeTool: DrawTool;
  triggerHelp: () => void;
  onSelectBrush: (brushIndex: number) => void;
  onChangeColor: (color: string) => void;
  onSetTool: (tool: DrawTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}) => {
  const brushButton = React.useRef<HTMLDivElement>(null);
  const brushPopup = React.useRef<HTMLDivElement>(null);

  const [showBrushPopup, setShowBrushPopup] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const windowSize = useWindowSize();

  React.useEffect(() => {
    if (brushPopup.current !== null && brushButton.current !== null) {
      brushPopup.current.style.left = `${
        brushButton.current.offsetLeft + brushButton.current.offsetWidth
      }px`;
      brushPopup.current.style.top = `calc(${brushButton.current.offsetTop}px - 2vmin)`;
    }
  }, [windowSize]);

  const handleSelectBrush = (index: number) => {
    setShowBrushPopup(false);
    onSelectBrush(index);
  };

  const isActive = (t: DrawTool) => activeTool === t;

  const toolBtn = (t: DrawTool, label: string, title: string, extraClass = "") =>
    <div
      className={`tool-button tool-button-sm${isActive(t) ? " tool-button-active" : ""}${extraClass ? " " + extraClass : ""}`}
      onClick={() => onSetTool(t)}
      title={title}
    >
      {label}
    </div>;

  return (
    <div className="Draw-tools">
      <div className="tool-button tool-button-help" onClick={triggerHelp}>
        <img src={helpImg} alt="Help" title="Help" />
      </div>

      {/* Undo / Redo */}
      <div className="tool-button-row">
        <div className="tool-button tool-button-sm" onClick={onUndo} title="Undo">↩</div>
        <div className="tool-button tool-button-sm" onClick={onRedo} title="Redo">↪</div>
      </div>

      {/* Pen / Eraser / Fill */}
      <div className="tool-button-row">
        {toolBtn("pen", "✎", "Pen", "tool-button-pen")}
        {toolBtn("eraser", "✕", "Eraser", "tool-button-eraser")}
        {toolBtn("fill", "⬡", "Fill", "tool-button-fill")}
      </div>

      {/* Shape tools */}
      <div className="tool-button-row">
        {toolBtn("line", "╱", "Line", "tool-button-shape")}
        {toolBtn("rect", "▭", "Rectangle", "tool-button-shape")}
        {toolBtn("circle", "◯", "Ellipse", "tool-button-shape")}
      </div>

      {/* Brush size */}
      <BrushButton
        size={selectedBrush.displaySize}
        color={activeTool === "eraser" ? "#ffffff" : color}
        onClick={() => setShowBrushPopup(!showBrushPopup)}
        ref={brushButton}
      />
      <div
        className={"tool-popup" + (showBrushPopup ? "" : " hidden")}
        ref={brushPopup}
      >
        {brushes.map((brush, index) => (
          <BrushButton
            key={index}
            size={brush.displaySize}
            color={color}
            onClick={() => handleSelectBrush(index)}
          />
        ))}
      </div>

      {/* Color picker */}
      <div className="tool-color" onClick={() => setShowColorPicker(true)}>
        <div className="tool-color-selectedcolor" style={{ backgroundColor: color }} />
        <img src={colorwheelImg} alt="Pick color" title="Pick color" />
      </div>
      <Dialog show={showColorPicker}>
        <ColorPicker handlePickColor={(c) => { onChangeColor(c); setShowColorPicker(false); }} />
      </Dialog>

      <div className="tool-button tool-button-done" onClick={onDone}>
        <img src={checkImg} alt="Done" title="Done" />
      </div>
    </div>
  );
};

export default DrawTools;

const BrushButton = React.forwardRef(
  (
    { color, size, onClick }: { color: string; size: number; onClick: () => void },
    ref?: React.Ref<HTMLDivElement>
  ) => (
    <div
      className="tool-button tool-button-brush"
      onClick={onClick}
      ref={ref}
      style={{ backgroundColor: color === "#FFF" || color === "#ffffff" ? "#333" : "rgba(0,0,20,0.8)" }}
    >
      <div style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%" }} />
    </div>
  )
);

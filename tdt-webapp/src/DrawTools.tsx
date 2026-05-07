import React from "react";

import { useWindowSize } from "./helpers";
import { GameMode, Brush } from "./model";
import { DrawTool } from "./DrawCanvas";

import Dialog from "./Dialog";
import ColorPicker from "./ColorPicker";

import helpImg from "./img/help.svg";
import checkImg from "./img/check.svg";
import colorwheelImg from "./img/colorwheel.svg";

const NOIR_SWATCHES = ["#000000", "#2a2a2a", "#555555", "#808080", "#aaaaaa", "#cccccc", "#e8e8e8", "#ffffff"];

const DrawTools = ({
  color,
  brushes,
  selectedBrush,
  activeTool,
  gameMode,
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
  gameMode?: GameMode;
  triggerHelp: () => void;
  onSelectBrush: (brushIndex: number) => void;
  onChangeColor: (color: string) => void;
  onSetTool: (tool: DrawTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
}) => {
  const isNoir = gameMode === "TELEPHONE_NOIR";
  const brushButton = React.useRef<HTMLButtonElement>(null);
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
    <button
      type="button"
      className={`tool-button tool-button-sm${isActive(t) ? " tool-button-active" : ""}${extraClass ? " " + extraClass : ""}`}
      onClick={() => onSetTool(t)}
      aria-label={title}
      aria-pressed={isActive(t)}
      data-tooltip={title}
    >
      <span aria-hidden="true">{label}</span>
    </button>;

  return (
    <div className="Draw-tools">
      <button type="button" className="tool-button tool-button-help" onClick={triggerHelp} aria-label="Help">
        <img src={helpImg} alt="" aria-hidden="true" />
      </button>

      {/* Undo / Redo */}
      <div className="tool-button-row">
        <button type="button" className="tool-button tool-button-sm" onClick={onUndo} aria-label="Undo" data-tooltip="Undo"><span aria-hidden="true">↩</span></button>
        <button type="button" className="tool-button tool-button-sm" onClick={onRedo} aria-label="Redo" data-tooltip="Redo"><span aria-hidden="true">↪</span></button>
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
        aria-label={`Brush size ${selectedBrush.displaySize}px`}
        aria-expanded={showBrushPopup}
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
            aria-label={`Brush size ${brush.displaySize}px`}
          />
        ))}
      </div>

      {/* Color picker — replaced by greyscale swatches in Telephone Noir mode */}
      {isNoir ? (
        <div className="tool-noir-swatches">
          {NOIR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className="tool-noir-swatch"
              style={{
                backgroundColor: swatch,
                outline: color === swatch ? "2px solid var(--cyber-cyan)" : "none",
              }}
              onClick={() => onChangeColor(swatch)}
              aria-label={swatch}
              aria-pressed={color === swatch}
            />
          ))}
        </div>
      ) : (
        <>
          <button type="button" className="tool-color" onClick={() => setShowColorPicker(true)} aria-label="Pick color">
            <div className="tool-color-selectedcolor" style={{ backgroundColor: color }} />
            <img src={colorwheelImg} alt="" aria-hidden="true" />
          </button>
          <Dialog show={showColorPicker}>
            <ColorPicker handlePickColor={(c) => { onChangeColor(c); setShowColorPicker(false); }} />
          </Dialog>
        </>
      )}

      <button type="button" className="tool-button tool-button-done" onClick={onDone} aria-label="Done">
        <img src={checkImg} alt="" aria-hidden="true" />
      </button>
    </div>
  );
};

export default DrawTools;

const BrushButton = React.forwardRef(
  (
    { color, size, onClick, "aria-label": ariaLabel, "aria-expanded": ariaExpanded }: {
      color: string; size: number; onClick: () => void;
      "aria-label"?: string; "aria-expanded"?: boolean;
    },
    ref?: React.Ref<HTMLButtonElement>
  ) => (
    <button
      type="button"
      className="tool-button tool-button-brush"
      onClick={onClick}
      ref={ref}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      style={{ backgroundColor: color === "#FFF" || color === "#ffffff" ? "#333" : "rgba(0,0,20,0.8)" }}
    >
      <div style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%" }} />
    </button>
  )
);

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

const keyActivate = (handler: () => void) =>
  (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };

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

  const toolBtn = (t: DrawTool, label: string, title: string, extraClass = "") => (
    <div
      className={`tool-button tool-button-sm${isActive(t) ? " tool-button-active" : ""}${extraClass ? " " + extraClass : ""}`}
      onClick={() => onSetTool(t)}
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-pressed={isActive(t)}
      data-tooltip={title}
      onKeyDown={keyActivate(() => onSetTool(t))}
    >
      {label}
    </div>
  );

  return (
    <div className="Draw-tools">
      <div
        className="tool-button tool-button-help"
        onClick={triggerHelp}
        role="button"
        tabIndex={0}
        aria-label="Help"
        onKeyDown={keyActivate(triggerHelp)}
      >
        <img src={helpImg} alt="" />
      </div>

      {/* Undo / Redo */}
      <div className="tool-button-row">
        <div
          className="tool-button tool-button-sm"
          onClick={onUndo}
          role="button"
          tabIndex={0}
          aria-label="Undo"
          data-tooltip="Undo"
          onKeyDown={keyActivate(onUndo)}
        >
          ↩
        </div>
        <div
          className="tool-button tool-button-sm"
          onClick={onRedo}
          role="button"
          tabIndex={0}
          aria-label="Redo"
          data-tooltip="Redo"
          onKeyDown={keyActivate(onRedo)}
        >
          ↪
        </div>
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
        aria-label="Brush size"
        ref={brushButton}
      />
      <div
        className={"tool-popup" + (showBrushPopup ? "" : " hidden")}
        ref={brushPopup}
        role="listbox"
        aria-label="Select brush size"
      >
        {brushes.map((brush, index) => (
          <BrushButton
            key={index}
            size={brush.displaySize}
            color={color}
            onClick={() => handleSelectBrush(index)}
            aria-label={`Brush size ${brush.displaySize}`}
          />
        ))}
      </div>

      {/* Color picker — replaced by greyscale swatches in Telephone Noir mode */}
      {isNoir ? (
        <div className="tool-noir-swatches" role="group" aria-label="Color swatches">
          {NOIR_SWATCHES.map((swatch) => (
            <div
              key={swatch}
              className="tool-noir-swatch"
              style={{
                backgroundColor: swatch,
                outline: color === swatch ? "2px solid var(--cyber-cyan)" : "none",
              }}
              onClick={() => onChangeColor(swatch)}
              role="button"
              tabIndex={0}
              aria-label={`Color ${swatch}`}
              aria-pressed={color === swatch}
              onKeyDown={keyActivate(() => onChangeColor(swatch))}
              title={swatch}
            />
          ))}
        </div>
      ) : (
        <>
          <div
            className="tool-color"
            onClick={() => setShowColorPicker(true)}
            role="button"
            tabIndex={0}
            aria-label={`Current color: ${color}. Click to change`}
            onKeyDown={keyActivate(() => setShowColorPicker(true))}
          >
            <div className="tool-color-selectedcolor" style={{ backgroundColor: color }} />
            <img src={colorwheelImg} alt="" />
          </div>
          <Dialog show={showColorPicker}>
            <ColorPicker handlePickColor={(c) => { onChangeColor(c); setShowColorPicker(false); }} />
          </Dialog>
        </>
      )}

      <div
        className="tool-button tool-button-done"
        onClick={onDone}
        role="button"
        tabIndex={0}
        aria-label="Done drawing"
        onKeyDown={keyActivate(onDone)}
      >
        <img src={checkImg} alt="" />
      </div>
    </div>
  );
};

export default DrawTools;

const BrushButton = React.forwardRef(
  (
    {
      color,
      size,
      onClick,
      "aria-label": ariaLabel,
    }: {
      color: string;
      size: number;
      onClick: () => void;
      "aria-label"?: string;
    },
    ref?: React.Ref<HTMLDivElement>
  ) => (
    <div
      className="tool-button tool-button-brush"
      onClick={onClick}
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      style={{ backgroundColor: color === "#FFF" || color === "#ffffff" ? "#333" : "rgba(0,0,20,0.8)" }}
    >
      <div style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%" }} />
    </div>
  )
);

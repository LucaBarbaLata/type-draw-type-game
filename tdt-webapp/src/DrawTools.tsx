import React from "react";

import { useWindowSize } from "./helpers";
import { GameMode, Brush } from "./model";
import { DrawTool } from "./DrawCanvas";

import Dialog from "./Dialog";
import ColorPicker from "./ColorPicker";
import ThemedIcon from "./ThemedIcon";

import colorwheelImg from "./img/colorwheel.svg";

const NOIR_SWATCHES = ["#000000", "#2a2a2a", "#555555", "#808080", "#aaaaaa", "#cccccc", "#e8e8e8", "#ffffff"];

/** Tools that fold into the ⋮ menu on a small screen */
const SECONDARY_TOOLS: DrawTool[] = ["fill", "line", "rect", "circle"];

/** Must match the compact-toolbar media query in Draw.css */
const COMPACT_QUERY = "(max-width: 820px), (max-height: 560px)";

interface DrawToolsProps {
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
  /** TEAM mode: this player approved the drawing and waits for their partner */
  doneWaiting?: boolean;
  /** TEAM mode: the partner approved already, so pressing done submits the drawing */
  doneHighlighted?: boolean;
  doneTooltip?: string;
}

/** True while the viewport is too small for the full tool column */
function useCompactTools() {
  const [compact, setCompact] = React.useState(
    () => window.matchMedia(COMPACT_QUERY).matches
  );

  React.useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = () => setCompact(mq.matches);
    onChange(); // the viewport may have changed between render and effect
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}

const DrawTools = (props: DrawToolsProps) =>
  useCompactTools() ? <CompactDrawTools {...props} /> : <WideDrawTools {...props} />;

export default DrawTools;

/* ---------------------------------------------------------------------------
 * Small screens: one slim bar of flat icons, with the tools that are not
 * needed on every stroke folded into a ⋮ menu. A phone cannot spare the seven
 * rows of large round buttons that WideDrawTools lays out.
 * ------------------------------------------------------------------------ */

type OpenMenu = null | "brush" | "shade" | "more";

const CompactDrawTools = ({
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
  doneWaiting,
  doneHighlighted,
  doneTooltip,
}: DrawToolsProps) => {
  const isNoir = gameMode === "TELEPHONE_NOIR";
  const [menu, setMenu] = React.useState<OpenMenu>(null);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (menu === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menu]);

  const toggle = (which: Exclude<OpenMenu, null>) =>
    setMenu((open) => (open === which ? null : which));

  const pickTool = (t: DrawTool) => {
    onSetTool(t);
    setMenu(null);
  };

  // Every DrawTool shares its name with its icon, so the tool doubles as the
  // icon name — adding a tool without an icon is then a type error.
  const item = (t: DrawTool, title: string, extraClass = "") => (
    <button
      type="button"
      className={
        "tool-item" +
        (activeTool === t ? " tool-item-active" : "") +
        (extraClass ? " " + extraClass : "")
      }
      onClick={() => pickTool(t)}
      title={title}
      aria-label={title}
      aria-pressed={activeTool === t}
    >
      <ThemedIcon name={t} label={null} />
    </button>
  );

  const menuItem = (t: DrawTool, label: string) => (
    <button
      type="button"
      className={"tool-row" + (activeTool === t ? " tool-row-active" : "")}
      onClick={() => pickTool(t)}
      role="menuitem"
    >
      <span className="tool-row-icon" aria-hidden="true">
        <ThemedIcon name={t} label={null} />
      </span>
      {label}
    </button>
  );

  // Mark ⋮ as active when the tool in use lives behind it
  const secondaryActive = SECONDARY_TOOLS.includes(activeTool);
  const brushDotColor = activeTool === "eraser" ? "#ffffff" : color;

  return (
    <div className="Draw-tools Draw-tools-compact">
      <div className="tool-bar" ref={barRef}>
        <button
          type="button"
          className="tool-item"
          onClick={onUndo}
          title="Undo"
          aria-label="Undo"
        >
          <ThemedIcon name="undo" label={null} />
        </button>

        <div className="tool-sep" />

        {item("pen", "Pen")}
        {item("eraser", "Eraser", "tool-item-eraser")}

        <div className="tool-sep" />

        <div className="tool-slot">
          <button
            type="button"
            className={"tool-item" + (menu === "brush" ? " tool-item-open" : "")}
            onClick={() => toggle("brush")}
            title="Brush size"
            aria-label="Brush size"
            aria-expanded={menu === "brush"}
          >
            <Dot size={selectedBrush.displaySize} color={brushDotColor} />
          </button>
          {menu === "brush" && (
            <div className="tool-menu tool-menu-row">
              {brushes.map((brush, index) => (
                <button
                  type="button"
                  key={index}
                  className={
                    "tool-item" + (brush === selectedBrush ? " tool-item-active" : "")
                  }
                  onClick={() => {
                    onSelectBrush(index);
                    setMenu(null);
                  }}
                  aria-label={`Brush size ${index + 1}`}
                >
                  <Dot size={brush.displaySize} color={color} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Telephone Noir swaps the colour wheel for a fixed greyscale palette */}
        {isNoir ? (
          <div className="tool-slot">
            <button
              type="button"
              className={"tool-item" + (menu === "shade" ? " tool-item-open" : "")}
              onClick={() => toggle("shade")}
              title="Shade"
              aria-label="Pick shade"
              aria-expanded={menu === "shade"}
            >
              <Swatch color={color} />
            </button>
            {menu === "shade" && (
              <div className="tool-menu tool-menu-grid">
                {NOIR_SWATCHES.map((swatch) => (
                  <button
                    type="button"
                    key={swatch}
                    className={
                      "tool-item" + (color === swatch ? " tool-item-active" : "")
                    }
                    onClick={() => {
                      onChangeColor(swatch);
                      setMenu(null);
                    }}
                    title={swatch}
                    aria-label={`Shade ${swatch}`}
                  >
                    <Swatch color={swatch} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="tool-item"
            onClick={() => setShowColorPicker(true)}
            title="Pick color"
            aria-label="Pick color"
          >
            <Swatch color={color} />
          </button>
        )}

        <div className="tool-sep" />

        <div className="tool-slot">
          <button
            type="button"
            className={
              "tool-item" +
              (secondaryActive ? " tool-item-active" : "") +
              (menu === "more" ? " tool-item-open" : "")
            }
            onClick={() => toggle("more")}
            title="More tools"
            aria-label="More tools"
            aria-haspopup="menu"
            aria-expanded={menu === "more"}
          >
            <ThemedIcon name="more" label={null} />
          </button>
          {menu === "more" && (
            <div className="tool-menu tool-menu-list" role="menu">
              <button
                type="button"
                className="tool-row"
                onClick={() => {
                  onRedo();
                  setMenu(null);
                }}
                role="menuitem"
              >
                <span className="tool-row-icon" aria-hidden="true">
                  <ThemedIcon name="redo" label={null} />
                </span>
                Redo
              </button>
              <div className="tool-sep tool-sep-h" />
              {menuItem("fill", "Fill")}
              {menuItem("line", "Line")}
              {menuItem("rect", "Rectangle")}
              {menuItem("circle", "Ellipse")}
              <div className="tool-sep tool-sep-h" />
              <button
                type="button"
                className="tool-row"
                onClick={() => {
                  triggerHelp();
                  setMenu(null);
                }}
                role="menuitem"
              >
                <span className="tool-row-icon" aria-hidden="true">
                  <ThemedIcon name="help" label={null} />
                </span>
                What am I drawing?
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={
            "tool-item tool-item-done" +
            (doneWaiting ? " tool-item-done-waiting" : "") +
            (doneHighlighted ? " tool-item-done-highlighted" : "")
          }
          onClick={onDone}
          title={doneTooltip ?? "Done"}
          aria-label={doneTooltip ?? "Done"}
        >
          <ThemedIcon name="check" label="Done" />
        </button>
      </div>

      <Dialog show={showColorPicker}>
        <ColorPicker
          handlePickColor={(c) => {
            onChangeColor(c);
            setShowColorPicker(false);
          }}
        />
      </Dialog>
    </div>
  );
};

const Dot = ({ size, color }: { size: number; color: string }) => (
  <span
    className="tool-dot"
    style={{ width: size, height: size, backgroundColor: color }}
  />
);

const Swatch = ({ color }: { color: string }) => (
  <span className="tool-swatch" style={{ backgroundColor: color }} />
);

/* ---------------------------------------------------------------------------
 * Small tablets and up: the original column of large round buttons, with
 * every tool on screen at once.
 * ------------------------------------------------------------------------ */

const WideDrawTools = ({
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
  doneWaiting,
  doneHighlighted,
  doneTooltip,
}: DrawToolsProps) => {
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

  // As in CompactDrawTools, a tool's name is also its icon's name.
  const toolBtn = (t: DrawTool, title: string, extraClass = "") =>
    <div
      className={`tool-button tool-button-sm${isActive(t) ? " tool-button-active" : ""}${extraClass ? " " + extraClass : ""}`}
      onClick={() => onSetTool(t)}
      data-tooltip={title}
      aria-label={title}
    >
      <ThemedIcon name={t} label={null} />
    </div>;

  return (
    <div className="Draw-tools">
      <div className="tool-button tool-button-help" onClick={triggerHelp}>
        <ThemedIcon name="help" label="Help" />
      </div>

      {/* Undo / Redo */}
      <div className="tool-button-row">
        <div className="tool-button tool-button-sm" onClick={onUndo} data-tooltip="Undo" aria-label="Undo">
          <ThemedIcon name="undo" label={null} />
        </div>
        <div className="tool-button tool-button-sm" onClick={onRedo} data-tooltip="Redo" aria-label="Redo">
          <ThemedIcon name="redo" label={null} />
        </div>
      </div>

      {/* Pen / Eraser / Fill */}
      <div className="tool-button-row">
        {toolBtn("pen", "Pen", "tool-button-pen")}
        {toolBtn("eraser", "Eraser", "tool-button-eraser")}
        {toolBtn("fill", "Fill", "tool-button-fill")}
      </div>

      {/* Shape tools */}
      <div className="tool-button-row">
        {toolBtn("line", "Line", "tool-button-shape")}
        {toolBtn("rect", "Rectangle", "tool-button-shape")}
        {toolBtn("circle", "Ellipse", "tool-button-shape")}
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

      {/* Color picker — replaced by greyscale swatches in Telephone Noir mode */}
      {isNoir ? (
        <div className="tool-noir-swatches">
          {NOIR_SWATCHES.map((swatch) => (
            <div
              key={swatch}
              className="tool-noir-swatch"
              style={{
                backgroundColor: swatch,
                outline: color === swatch ? "2px solid var(--cyber-cyan)" : "none",
              }}
              onClick={() => onChangeColor(swatch)}
              title={swatch}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="tool-color" onClick={() => setShowColorPicker(true)}>
            <div className="tool-color-selectedcolor" style={{ backgroundColor: color }} />
            <img src={colorwheelImg} alt="Pick color" title="Pick color" />
          </div>
          <Dialog show={showColorPicker}>
            <ColorPicker handlePickColor={(c) => { onChangeColor(c); setShowColorPicker(false); }} />
          </Dialog>
        </>
      )}

      <div
        className={
          "tool-button tool-button-done" +
          (doneWaiting ? " tool-button-done-waiting" : "") +
          (doneHighlighted ? " tool-button-done-highlighted" : "")
        }
        onClick={onDone}
        data-tooltip={doneTooltip}
      >
        <ThemedIcon name="check" label="Done" />
      </div>
    </div>
  );
};

const BrushButton = React.forwardRef(
  (
    { color, size, onClick }: { color: string; size: number; onClick: () => void },
    ref?: React.Ref<HTMLDivElement>
  ) => (
    <div
      className="tool-button tool-button-brush"
      onClick={onClick}
      ref={ref}
      style={{ backgroundColor: color === "#FFF" || color === "#ffffff" ? "#333" : "rgba(var(--cyber-bg-deep-rgb), 0.8)" }}
    >
      <div style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%" }} />
    </div>
  )
);

import React from "react";
import { useWindowSize, getCanvasSize } from "./helpers";

export type DrawTool = "pen" | "eraser" | "fill" | "line" | "rect" | "circle";

export interface LayerInfo {
  id: number;
  name: string;
  visible: boolean;
}

export const MAX_LAYERS = 5;

export interface ImageProvider {
  getImageDataURL: () => string;
  undo: () => void;
  redo: () => void;
  addLayer: () => void;
  deleteLayer: (index: number) => void;
  toggleLayerVisibility: (index: number) => void;
}

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 1080;
const MAX_UNDO_HISTORY = 50;

function getPositionInCanvas(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number }
) {
  const rect = canvas.getBoundingClientRect();
  const canvasSize = getCanvasSize(canvas);
  const scaleX = canvas.width / canvasSize.width;
  const scaleY = canvas.height / canvasSize.height;
  const x = (event.clientX - rect.left - canvasSize.x) * scaleX;
  const y = (event.clientY - rect.top - canvasSize.y) * scaleY;
  return { x, y };
}

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 0, 0];
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string
) {
  const canvas = ctx.canvas;
  const W = canvas.width, H = canvas.height;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  const x0 = Math.floor(startX), y0 = Math.floor(startY);
  if (x0 < 0 || x0 >= W || y0 < 0 || y0 >= H) return;

  const [fr, fg, fb] = hexToRgb(fillColor);
  const si = (y0 * W + x0) * 4;
  const tr = data[si], tg = data[si + 1], tb = data[si + 2], ta = data[si + 3];

  if (tr === fr && tg === fg && tb === fb && ta === 255) return;

  const matches = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    return data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
  };
  const setPixel = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
  };

  const stack: [number, number][] = [[x0, y0]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (!matches(x, y)) continue;
    setPixel(x, y);
    if (x > 0) stack.push([x - 1, y]);
    if (x < W - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < H - 1) stack.push([x, y + 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  tool: DrawTool,
  x0: number, y0: number,
  x1: number, y1: number,
  color: string,
  lineWidth: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (tool === "line") {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  } else if (tool === "rect") {
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  } else if (tool === "circle") {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const DrawCanvas = ({
  color,
  brushPixelSize,
  tool,
  imageProviderRef,
  handleScaleChange,
  layers,
  activeLayerIndex,
  onLayersChange,
  onActiveLayerIndexChange,
}: {
  color: string;
  brushPixelSize: number;
  tool: DrawTool;
  imageProviderRef: React.MutableRefObject<ImageProvider | undefined>;
  handleScaleChange: (scale: number) => void;
  layers: LayerInfo[];
  activeLayerIndex: number;
  onLayersChange: (layers: LayerInfo[]) => void;
  onActiveLayerIndexChange: (index: number) => void;
}) => {
  const layerCanvasesRef = React.useRef<Map<number, HTMLCanvasElement>>(new Map());
  const historyRef = React.useRef<Map<number, ImageData[]>>(new Map([[0, []]]));
  const redoHistoryRef = React.useRef<Map<number, ImageData[]>>(new Map([[0, []]]));
  const nextLayerIdRef = React.useRef(layers.length);

  const scaleRef = React.useRef(1);
  const posRef = React.useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const preShapeStateRef = React.useRef<ImageData | null>(null);

  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);

  const windowSize = useWindowSize();

  // Live ref — lets imageProviderRef closures always read current values
  const liveRef = React.useRef({
    layers, activeLayerIndex, layerCanvasesRef, historyRef, redoHistoryRef,
    onLayersChange, onActiveLayerIndexChange, nextLayerIdRef,
  });
  liveRef.current = {
    layers, activeLayerIndex, layerCanvasesRef, historyRef, redoHistoryRef,
    onLayersChange, onActiveLayerIndexChange, nextLayerIdRef,
  };

  // Ensure new layers have history entries
  React.useEffect(() => {
    for (const layer of layers) {
      if (!historyRef.current.has(layer.id)) {
        historyRef.current.set(layer.id, []);
        redoHistoryRef.current.set(layer.id, []);
      }
    }
  }, [layers]);

  // Set up imageProviderRef once; all methods read from liveRef so they're always fresh
  React.useEffect(() => {
    imageProviderRef.current = {
      getImageDataURL: () => {
        const { layers, layerCanvasesRef } = liveRef.current;
        const composite = document.createElement("canvas");
        composite.width = CANVAS_WIDTH;
        composite.height = CANVAS_HEIGHT;
        const ctx = composite.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for (const layer of layers) {
          if (!layer.visible) continue;
          const canvas = layerCanvasesRef.current.get(layer.id);
          if (canvas) ctx.drawImage(canvas, 0, 0);
        }
        return composite.toDataURL("image/png");
      },
      undo: () => {
        const { activeLayerIndex, layers, layerCanvasesRef, historyRef, redoHistoryRef } = liveRef.current;
        const layerId = layers[activeLayerIndex]?.id;
        if (layerId === undefined) return;
        const canvas = layerCanvasesRef.current.get(layerId);
        if (!canvas) return;
        const history = historyRef.current.get(layerId) ?? [];
        if (history.length === 0) return;
        const ctx = canvas.getContext("2d")!;
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const redo = redoHistoryRef.current.get(layerId) ?? [];
        redo.push(current);
        const snapshot = history.pop()!;
        ctx.putImageData(snapshot, 0, 0);
      },
      redo: () => {
        const { activeLayerIndex, layers, layerCanvasesRef, historyRef, redoHistoryRef } = liveRef.current;
        const layerId = layers[activeLayerIndex]?.id;
        if (layerId === undefined) return;
        const canvas = layerCanvasesRef.current.get(layerId);
        if (!canvas) return;
        const redo = redoHistoryRef.current.get(layerId) ?? [];
        if (redo.length === 0) return;
        const ctx = canvas.getContext("2d")!;
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const history = historyRef.current.get(layerId) ?? [];
        history.push(current);
        const snapshot = redo.pop()!;
        ctx.putImageData(snapshot, 0, 0);
      },
      addLayer: () => {
        const { layers, onLayersChange, onActiveLayerIndexChange, nextLayerIdRef } = liveRef.current;
        if (layers.length >= MAX_LAYERS) return;
        const newId = nextLayerIdRef.current++;
        const newLayer: LayerInfo = { id: newId, name: `Layer ${layers.length + 1}`, visible: true };
        const newLayers = [...layers, newLayer];
        liveRef.current.historyRef.current.set(newId, []);
        liveRef.current.redoHistoryRef.current.set(newId, []);
        onLayersChange(newLayers);
        onActiveLayerIndexChange(newLayers.length - 1);
      },
      deleteLayer: (index: number) => {
        const { layers, activeLayerIndex, onLayersChange, onActiveLayerIndexChange } = liveRef.current;
        if (layers.length <= 1) return;
        const layerId = layers[index].id;
        const newLayers = layers.filter((_, i) => i !== index);
        const newActiveIdx = Math.min(activeLayerIndex, newLayers.length - 1);
        liveRef.current.historyRef.current.delete(layerId);
        liveRef.current.redoHistoryRef.current.delete(layerId);
        onLayersChange(newLayers);
        onActiveLayerIndexChange(newActiveIdx);
      },
      toggleLayerVisibility: (index: number) => {
        const { layers, onLayersChange } = liveRef.current;
        onLayersChange(layers.map((l, i) => i === index ? { ...l, visible: !l.visible } : l));
      },
    };
  }, [imageProviderRef]);

  // Track display scale for brush size preview
  React.useEffect(() => {
    const firstId = liveRef.current.layers[0]?.id;
    const firstCanvas = firstId !== undefined ? liveRef.current.layerCanvasesRef.current.get(firstId) : undefined;
    if (firstCanvas) {
      const canvasSize = getCanvasSize(firstCanvas);
      const scale = canvasSize.width / firstCanvas.width;
      scaleRef.current = scale;
      handleScaleChange(scale);
    }
  }, [windowSize, handleScaleChange, layers]);

  const getActiveCanvas = (): HTMLCanvasElement | undefined => {
    const { layers, activeLayerIndex, layerCanvasesRef } = liveRef.current;
    return layerCanvasesRef.current.get(layers[activeLayerIndex]?.id);
  };

  const getRefCanvas = (): HTMLCanvasElement | undefined => {
    // Use layer 0's canvas for coordinate calculations (all canvases share the same geometry)
    const firstId = layers[0]?.id;
    return firstId !== undefined ? layerCanvasesRef.current.get(firstId) : undefined;
  };

  const saveSnapshot = () => {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const { layers, activeLayerIndex } = liveRef.current;
    const layerId = layers[activeLayerIndex]?.id;
    if (layerId === undefined) return;
    const ctx = canvas.getContext("2d")!;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const history = liveRef.current.historyRef.current.get(layerId) ?? [];
    if (history.length >= MAX_UNDO_HISTORY) history.shift();
    history.push(snapshot);
    liveRef.current.redoHistoryRef.current.set(layerId, []);
  };

  // --- Pen / Eraser painting ---
  function paint_start(x: number, y: number) {
    saveSnapshot();
    posRef.current = { x, y };
  }
  function paint_move(x: number, y: number) {
    if (posRef.current === null) return;
    const canvas = getActiveCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineWidth = brushPixelSize;
    if (tool === "eraser") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.strokeStyle = color;
    }
    ctx.beginPath();
    ctx.moveTo(posRef.current.x, posRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (tool === "eraser") ctx.restore();
    posRef.current = { x, y };
  }
  function paint_end(x?: number, y?: number) {
    if (posRef.current === null) return;
    paint_move(x ?? posRef.current.x, y ?? posRef.current.y);
    posRef.current = null;
  }

  // --- Shape painting ---
  function shape_start(x: number, y: number) {
    const canvas = getActiveCanvas();
    if (!canvas) return;
    saveSnapshot();
    const ctx = canvas.getContext("2d")!;
    preShapeStateRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    shapeStartRef.current = { x, y };
  }
  function shape_move(x: number, y: number) {
    const canvas = getActiveCanvas();
    if (!canvas || !shapeStartRef.current || !preShapeStateRef.current) return;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, shapeStartRef.current.x, shapeStartRef.current.y, x, y, color, brushPixelSize);
  }
  function shape_end(x?: number, y?: number) {
    const canvas = getActiveCanvas();
    if (!canvas || !shapeStartRef.current || !preShapeStateRef.current) return;
    const ex = x ?? shapeStartRef.current.x;
    const ey = y ?? shapeStartRef.current.y;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, shapeStartRef.current.x, shapeStartRef.current.y, ex, ey, color, brushPixelSize);
    shapeStartRef.current = null;
    preShapeStateRef.current = null;
  }

  const isShapeTool = tool === "line" || tool === "rect" || tool === "circle";
  const isPenTool = tool === "pen" || tool === "eraser";

  const getCoords = (event: { clientX: number; clientY: number }) => {
    const refCanvas = getRefCanvas();
    if (!refCanvas) return { x: 0, y: 0 };
    return getPositionInCanvas(refCanvas, event);
  };

  const handlePointerDown = (x: number, y: number) => {
    if (tool === "fill") {
      const canvas = getActiveCanvas();
      if (!canvas) return;
      saveSnapshot();
      floodFill(canvas.getContext("2d")!, x, y, color);
    } else if (isShapeTool) {
      shape_start(x, y);
    } else {
      paint_start(x, y);
    }
  };
  const handlePointerMove = (x: number, y: number) => {
    if (isShapeTool) shape_move(x, y);
    else if (isPenTool) paint_move(x, y);
  };
  const handlePointerUp = (x?: number, y?: number) => {
    if (isShapeTool) shape_end(x, y);
    else if (isPenTool) paint_end(x, y);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.buttons !== 1) return;
    const { x, y } = getCoords(event);
    handlePointerDown(x, y);
  };
  const handleMouseMove = (event: React.MouseEvent) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
    if (event.buttons !== 1) {
      if (isPenTool) paint_end();
      return;
    }
    const { x, y } = getCoords(event);
    handlePointerMove(x, y);
  };
  const handleMouseUp = (event: React.MouseEvent) => {
    const { x, y } = getCoords(event);
    handlePointerUp(x, y);
  };
  const handleMouseOut = (event: React.MouseEvent) => {
    setCursorPos(null);
    const { x, y } = getCoords(event);
    handlePointerUp(x, y);
  };
  const handleTouchStart = (event: React.TouchEvent) => {
    event.preventDefault();
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    setCursorPos({ x: touch.clientX, y: touch.clientY });
    const { x, y } = getCoords(touch);
    handlePointerDown(x, y);
  };
  const handleTouchMove = (event: React.TouchEvent) => {
    event.preventDefault();
    if (event.touches.length !== 1) {
      setCursorPos(null);
      handlePointerUp();
      return;
    }
    const touch = event.touches[0];
    setCursorPos({ x: touch.clientX, y: touch.clientY });
    const { x, y } = getCoords(touch);
    handlePointerMove(x, y);
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    setCursorPos(null);
    const touch = event.changedTouches[0];
    if (touch) {
      const { x, y } = getCoords(touch);
      handlePointerUp(x, y);
    } else {
      handlePointerUp();
    }
  };

  const showCircleCursor = cursorPos && (tool === "pen" || tool === "eraser");
  const previewSize = Math.max(4, brushPixelSize * scaleRef.current);

  const cursorStyle =
    tool === "fill" ? "cell" :
    isShapeTool ? "crosshair" :
    cursorPos ? "none" : "crosshair";

  return (
    <div className="Draw-canvas">
      {showCircleCursor && (
        <div
          style={{
            position: "fixed",
            left: cursorPos.x,
            top: cursorPos.y,
            width: previewSize,
            height: previewSize,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: `1.5px solid ${tool === "eraser" ? "#555" : color}`,
            backgroundColor: tool === "eraser" ? "rgba(255,255,255,0.6)" : "transparent",
            boxShadow: `0 0 0 1px ${tool === "eraser" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.6)"}`,
            pointerEvents: "none",
            zIndex: 100,
            boxSizing: "border-box",
          }}
        />
      )}
      <div className="canvas-stack">
        {layers.map((layer, index) => (
          <canvas
            key={layer.id}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="layer-canvas"
            ref={(el) => {
              if (el) {
                const isNew = !layerCanvasesRef.current.has(layer.id);
                layerCanvasesRef.current.set(layer.id, el);
                if (isNew && index === 0) {
                  // Base layer starts with white background
                  const ctx = el.getContext("2d")!;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, el.width, el.height);
                }
              } else {
                layerCanvasesRef.current.delete(layer.id);
              }
            }}
            style={{
              pointerEvents: "none",
              opacity: layer.visible ? 1 : 0,
            }}
          />
        ))}
        {/* Transparent overlay captures all pointer events */}
        <div
          className="canvas-overlay"
          style={{ cursor: cursorStyle }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseOut={handleMouseOut}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    </div>
  );
};

export default DrawCanvas;

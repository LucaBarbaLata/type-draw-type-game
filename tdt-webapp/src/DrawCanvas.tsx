import React from "react";
import { useWindowSize, getCanvasSize } from "./helpers";
import { GameMode, StrokeSegment, RemoteStroke } from "./model";

export type DrawTool = "pen" | "eraser" | "fill" | "line" | "rect" | "circle";

export interface ImageProvider {
  getCanvas: () => HTMLCanvasElement;
  getImageDataURL: () => string;
  undo: () => void;
  redo: () => void;
  applyRemoteStroke: (seg: RemoteStroke) => void;
}

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
  // Expand 3-digit shorthand #RGB → #RRGGBB
  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (short) hex = `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
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

function toGrayscale(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return `rgb(${l},${l},${l})`;
}

const MAX_UNDO_HISTORY = 50;

const DrawCanvas = ({
  color,
  brushPixelSize,
  tool,
  gameMode,
  imageProviderRef,
  handleScaleChange,
  onStrokeEnd,
  onStrokeComplete,
  onStrokeSegment,
  initialImageUrl,
  partnerCursor,
}: {
  color: string;
  brushPixelSize: number;
  tool: DrawTool;
  gameMode?: GameMode;
  imageProviderRef: React.MutableRefObject<ImageProvider | undefined>;
  handleScaleChange: (scale: number) => void;
  onStrokeEnd?: () => void;
  onStrokeComplete?: () => void;
  onStrokeSegment?: (seg: StrokeSegment) => void;
  initialImageUrl?: string;
  partnerCursor?: { x: number; y: number; name: string } | null;
}) => {
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);

  const historyRef = React.useRef<ImageData[]>([]);
  const redoHistoryRef = React.useRef<ImageData[]>([]);
  const scaleRef = React.useRef(1);
  const posRef = React.useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const preShapeStateRef = React.useRef<ImageData | null>(null);

  // Blind Draw: accumulate path while pen is down, render only on lift
  const blindPathRef = React.useRef<{ x: number; y: number }[]>([]);
  const isPenDownRef = React.useRef(false);

  // Fog of War: overlay canvas ref
  const fogCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);

  const canvasRefCallback = React.useCallback(
    (canvasElement: HTMLCanvasElement | null) => {
      if (canvasElement !== null) {
        setCanvas(canvasElement);
        imageProviderRef.current = {
          getCanvas: () => canvasElement,
          getImageDataURL: () => canvasElement.toDataURL("image/png"),
          undo: () => {
            const history = historyRef.current;
            if (history.length === 0) return;
            const ctx = getCanvas2DContext(canvasElement);
            const current = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            redoHistoryRef.current.push(current);
            const snapshot = history.pop()!;
            ctx.putImageData(snapshot, 0, 0);
          },
          redo: () => {
            const redo = redoHistoryRef.current;
            if (redo.length === 0) return;
            const ctx = getCanvas2DContext(canvasElement);
            const current = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            historyRef.current.push(current);
            const snapshot = redo.pop()!;
            ctx.putImageData(snapshot, 0, 0);
          },
          applyRemoteStroke: (seg: RemoteStroke) => {
            const ctx = getCanvas2DContext(canvasElement);
            if (seg.type === "pen_seg") {
              ctx.lineCap = "round";
              ctx.lineWidth = seg.brushPixelSize;
              ctx.strokeStyle = seg.color;
              ctx.beginPath();
              ctx.moveTo(seg.x0, seg.y0);
              ctx.lineTo(seg.x1!, seg.y1!);
              ctx.stroke();
            } else if (seg.type === "shape" && seg.tool) {
              drawShape(ctx, seg.tool as DrawTool, seg.x0, seg.y0, seg.x1!, seg.y1!, seg.color, seg.brushPixelSize);
            } else if (seg.type === "fill") {
              floodFill(ctx, seg.x0, seg.y0, seg.color);
            }
          },
        };
      }
    },
    [imageProviderRef]
  );

  const windowSize = useWindowSize();

  React.useEffect(() => {
    if (canvas !== null) {
      const canvasSize = getCanvasSize(canvas);
      const scale = canvasSize.width / canvas.width;
      scaleRef.current = scale;
      handleScaleChange(scale);
    }
  }, [canvas, windowSize, handleScaleChange]);

  React.useEffect(() => {
    if (canvas === null) return;
    const ctx = getCanvas2DContext(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (initialImageUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialImageUrl;
    }
  }, [canvas]); // intentionally omitting initialImageUrl — only restore on mount

  const saveSnapshot = (canvasEl: HTMLCanvasElement) => {
    const ctx = getCanvas2DContext(canvasEl);
    const snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    const history = historyRef.current;
    if (history.length >= MAX_UNDO_HISTORY) history.shift();
    history.push(snapshot);
    redoHistoryRef.current = []; // clear redo on new action
  };

  // --- Pen / Eraser painting ---
  function paint_start(_ctx: CanvasRenderingContext2D, x: number, y: number, canvasEl: HTMLCanvasElement) {
    saveSnapshot(canvasEl);
    posRef.current = { x, y };
    isPenDownRef.current = true;
    if (gameMode === "BLIND_DRAW") {
      blindPathRef.current = [{ x, y }];
    }
  }
  function paint_move(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (posRef.current === null) return;

    // Shaky Hands: add random jitter to stroke coordinates
    let dx = x, dy = y;
    if (gameMode === "SHAKY_HANDS") {
      const jitter = Math.min(12, brushPixelSize * 0.4);
      dx = x + (Math.random() * 2 - 1) * jitter;
      dy = y + (Math.random() * 2 - 1) * jitter;
    }

    // Blind Draw: accumulate path but don't render yet
    if (gameMode === "BLIND_DRAW") {
      blindPathRef.current.push({ x: dx, y: dy });
      posRef.current = { x: dx, y: dy };
      return;
    }

    const strokeColor = tool === "eraser" ? "#ffffff"
      : gameMode === "TELEPHONE_NOIR" ? toGrayscale(color)
      : color;

    const fromX = posRef.current.x;
    const fromY = posRef.current.y;
    ctx.lineCap = "round";
    ctx.lineWidth = brushPixelSize;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(dx, dy);
    ctx.stroke();
    posRef.current = { x: dx, y: dy };
    onStrokeSegment?.({ type: "pen_seg", tool, x0: fromX, y0: fromY, x1: dx, y1: dy, color: strokeColor, brushPixelSize });
  }
  function paint_end(ctx: CanvasRenderingContext2D, x?: number, y?: number) {
    isPenDownRef.current = false;
    if (posRef.current === null) return;

    if (gameMode === "BLIND_DRAW") {
      // Render the entire accumulated path at once
      const path = blindPathRef.current;
      if (path.length < 2) {
        // Single tap — draw a dot
        const strokeColor = tool === "eraser" ? "#ffffff" : color;
        ctx.lineCap = "round";
        ctx.lineWidth = brushPixelSize;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(posRef.current.x, posRef.current.y);
        ctx.lineTo(posRef.current.x, posRef.current.y);
        ctx.stroke();
      } else {
        const strokeColor = tool === "eraser" ? "#ffffff" : color;
        ctx.lineCap = "round";
        ctx.lineWidth = brushPixelSize;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      }
      blindPathRef.current = [];
      posRef.current = null;
      return;
    }

    paint_move(ctx, x ?? posRef.current.x, y ?? posRef.current.y);
    posRef.current = null;
  }

  // --- Shape painting ---
  function shape_start(ctx: CanvasRenderingContext2D, x: number, y: number, canvasEl: HTMLCanvasElement) {
    saveSnapshot(canvasEl);
    const snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    preShapeStateRef.current = snapshot;
    shapeStartRef.current = { x, y };
    isPenDownRef.current = true;
  }
  function shape_move(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (!shapeStartRef.current || !preShapeStateRef.current) return;
    const shapeColor = gameMode === "TELEPHONE_NOIR" ? toGrayscale(color) : color;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, shapeStartRef.current.x, shapeStartRef.current.y, x, y, shapeColor, brushPixelSize);
  }
  function shape_end(ctx: CanvasRenderingContext2D, x?: number, y?: number) {
    isPenDownRef.current = false;
    if (!shapeStartRef.current || !preShapeStateRef.current) return;
    let ex = x ?? shapeStartRef.current.x;
    let ey = y ?? shapeStartRef.current.y;
    if (gameMode === "SHAKY_HANDS") {
      const jitter = Math.min(12, brushPixelSize * 0.4);
      ex += (Math.random() * 2 - 1) * jitter;
      ey += (Math.random() * 2 - 1) * jitter;
    }
    const shapeColor = gameMode === "TELEPHONE_NOIR" ? toGrayscale(color) : color;
    const sx = shapeStartRef.current.x, sy = shapeStartRef.current.y;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, sx, sy, ex, ey, shapeColor, brushPixelSize);
    onStrokeSegment?.({ type: "shape", tool, x0: sx, y0: sy, x1: ex, y1: ey, color: shapeColor, brushPixelSize });
    shapeStartRef.current = null;
    preShapeStateRef.current = null;
  }

  const updateFog = React.useCallback((clientX: number | null, clientY: number | null) => {
    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas) return;
    const ctx2 = fogCanvas.getContext("2d")!;
    ctx2.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    ctx2.fillStyle = "rgba(8,8,24,0.93)";
    ctx2.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    if (clientX !== null && clientY !== null) {
      const rect = fogCanvas.getBoundingClientRect();
      const scaleX = fogCanvas.width / rect.width;
      const scaleY = fogCanvas.height / rect.height;
      const cx = (clientX - rect.left) * scaleX;
      const cy = (clientY - rect.top) * scaleY;
      const radius = 100 / scaleRef.current;
      ctx2.globalCompositeOperation = "destination-out";
      ctx2.beginPath();
      ctx2.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalCompositeOperation = "source-over";
    }
  }, []);

  // Initialize fog canvas with full fog on mount
  React.useEffect(() => {
    if (gameMode !== "FOG_OF_WAR" || !fogCanvasRef.current) return;
    updateFog(null, null);
  }, [gameMode, updateFog]);

  const isShapeTool = tool === "line" || tool === "rect" || tool === "circle";
  const isPenTool = tool === "pen" || tool === "eraser";

  const handlePointerDown = (canvasEl: HTMLCanvasElement, x: number, y: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (tool === "fill") {
      saveSnapshot(canvasEl);
      const fillColor = gameMode === "TELEPHONE_NOIR" ? toGrayscale(color) : color;
      floodFill(ctx, x, y, fillColor);
      onStrokeEnd?.();
      onStrokeComplete?.();
      onStrokeSegment?.({ type: "fill", tool: "fill", x0: x, y0: y, color: fillColor, brushPixelSize });
    } else if (isShapeTool) {
      shape_start(ctx, x, y, canvasEl);
    } else {
      paint_start(ctx, x, y, canvasEl);
    }
  };
  const handlePointerMove = (canvasEl: HTMLCanvasElement, x: number, y: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (isShapeTool) shape_move(ctx, x, y);
    else if (isPenTool) {
      paint_move(ctx, x, y);
      onStrokeEnd?.();
    }
  };
  const handlePointerUp = (canvasEl: HTMLCanvasElement, x?: number, y?: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (isShapeTool) shape_end(ctx, x, y);
    else if (isPenTool) paint_end(ctx, x, y);
    onStrokeEnd?.();
    onStrokeComplete?.();
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons !== 1) return;
    const { x, y } = getPositionInCanvas(event.currentTarget, event);
    handlePointerDown(event.currentTarget, x, y);
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
    if (gameMode === "FOG_OF_WAR") updateFog(event.clientX, event.clientY);
    if (event.buttons !== 1) {
      if (isPenTool) paint_end(getCanvas2DContext(event.currentTarget));
      return;
    }
    const { x, y } = getPositionInCanvas(event.currentTarget, event);
    handlePointerMove(event.currentTarget, x, y);
  };
  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPositionInCanvas(event.currentTarget, event);
    handlePointerUp(event.currentTarget, x, y);
  };
  const handleMouseOut = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setCursorPos(null);
    if (gameMode === "FOG_OF_WAR") updateFog(null, null);
    const { x, y } = getPositionInCanvas(event.currentTarget, event);
    handlePointerUp(event.currentTarget, x, y);
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    setCursorPos({ x: touch.clientX, y: touch.clientY });
    const { x, y } = getPositionInCanvas(event.currentTarget, touch);
    handlePointerDown(event.currentTarget, x, y);
  };
  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.touches.length !== 1) {
      setCursorPos(null);
      if (gameMode === "FOG_OF_WAR") updateFog(null, null);
      handlePointerUp(event.currentTarget);
      return;
    }
    const touch = event.touches[0];
    setCursorPos({ x: touch.clientX, y: touch.clientY });
    if (gameMode === "FOG_OF_WAR") updateFog(touch.clientX, touch.clientY);
    const { x, y } = getPositionInCanvas(event.currentTarget, touch);
    handlePointerMove(event.currentTarget, x, y);
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setCursorPos(null);
    const touch = event.changedTouches[0];
    if (touch) {
      const { x, y } = getPositionInCanvas(event.currentTarget, touch);
      handlePointerUp(event.currentTarget, x, y);
    } else {
      handlePointerUp(event.currentTarget);
    }
  };

  const blindPenDown = gameMode === "BLIND_DRAW" && isPenDownRef.current;
  const showCircleCursor = cursorPos && (tool === "pen" || tool === "eraser") && !blindPenDown;
  const previewSize = Math.max(4, brushPixelSize * scaleRef.current);

  const cursorStyle =
    gameMode === "BLIND_DRAW" ? "none" :
    tool === "fill" ? "cell" :
    isShapeTool ? "crosshair" :
    cursorPos ? "none" : "crosshair";

  // Convert canvas pixel coordinates to fixed client coordinates for cursor overlay
  const partnerClientPos = React.useMemo(() => {
    if (!partnerCursor || !canvas) return null;
    const canvasSize = getCanvasSize(canvas);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.width / canvas.width;
    const scaleY = canvasSize.height / canvas.height;
    return {
      x: partnerCursor.x * scaleX + rect.left + canvasSize.x,
      y: partnerCursor.y * scaleY + rect.top + canvasSize.y,
      name: partnerCursor.name,
    };
  }, [partnerCursor, canvas, windowSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="Draw-canvas" style={{ position: "relative" }}>
      {partnerClientPos && (
        <div
          style={{
            position: "fixed",
            left: partnerClientPos.x,
            top: partnerClientPos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 101,
          }}
        >
          <div style={{
            width: 12, height: 12,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 160, 0, 0.85)",
            border: "1.5px solid rgba(255,255,255,0.7)",
            boxShadow: "0 0 6px rgba(255,160,0,0.7)",
          }} />
          <div style={{
            fontSize: 10,
            color: "#ffa000",
            textShadow: "0 0 4px rgba(255,160,0,0.8)",
            whiteSpace: "nowrap",
            marginTop: 2,
            textAlign: "center",
          }}>
            {partnerClientPos.name}
          </div>
        </div>
      )}
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
      <canvas
        width="1440"
        height="1080"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={canvasRefCallback}
        style={{ cursor: cursorStyle }}
      />
      {gameMode === "FOG_OF_WAR" && (
        <canvas
          width="1440"
          height="1080"
          ref={fogCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

export default DrawCanvas;

function getCanvas2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext("2d")!;
}

import React from "react";
import { useWindowSize, getCanvasSize } from "./helpers";

export type DrawTool = "pen" | "eraser" | "fill" | "line" | "rect" | "circle";

export interface ImageProvider {
  getImageDataURL: () => string;
  undo: () => void;
  redo: () => void;
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

const MAX_UNDO_HISTORY = 50;

const DrawCanvas = ({
  color,
  brushPixelSize,
  tool,
  imageProviderRef,
  handleScaleChange,
}: {
  color: string;
  brushPixelSize: number;
  tool: DrawTool;
  imageProviderRef: React.MutableRefObject<ImageProvider | undefined>;
  handleScaleChange: (scale: number) => void;
}) => {
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);

  const historyRef = React.useRef<ImageData[]>([]);
  const redoHistoryRef = React.useRef<ImageData[]>([]);
  const scaleRef = React.useRef(1);
  const posRef = React.useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const preShapeStateRef = React.useRef<ImageData | null>(null);

  const [cursorPos, setCursorPos] = React.useState<{ x: number; y: number } | null>(null);

  const canvasRefCallback = React.useCallback(
    (canvasElement: HTMLCanvasElement | null) => {
      if (canvasElement !== null) {
        setCanvas(canvasElement);
        imageProviderRef.current = {
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
  }, [canvas]);

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
  }
  function paint_move(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (posRef.current === null) return;
    ctx.lineCap = "round";
    ctx.lineWidth = brushPixelSize;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.beginPath();
    ctx.moveTo(posRef.current.x, posRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    posRef.current = { x, y };
  }
  function paint_end(ctx: CanvasRenderingContext2D, x?: number, y?: number) {
    if (posRef.current === null) return;
    paint_move(ctx, x ?? posRef.current.x, y ?? posRef.current.y);
    posRef.current = null;
  }

  // --- Shape painting ---
  function shape_start(ctx: CanvasRenderingContext2D, x: number, y: number, canvasEl: HTMLCanvasElement) {
    saveSnapshot(canvasEl);
    const snapshot = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    preShapeStateRef.current = snapshot;
    shapeStartRef.current = { x, y };
  }
  function shape_move(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (!shapeStartRef.current || !preShapeStateRef.current) return;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, shapeStartRef.current.x, shapeStartRef.current.y, x, y, color, brushPixelSize);
  }
  function shape_end(ctx: CanvasRenderingContext2D, x?: number, y?: number) {
    if (!shapeStartRef.current || !preShapeStateRef.current) return;
    const ex = x ?? shapeStartRef.current.x;
    const ey = y ?? shapeStartRef.current.y;
    ctx.putImageData(preShapeStateRef.current, 0, 0);
    drawShape(ctx, tool, shapeStartRef.current.x, shapeStartRef.current.y, ex, ey, color, brushPixelSize);
    shapeStartRef.current = null;
    preShapeStateRef.current = null;
  }

  const isShapeTool = tool === "line" || tool === "rect" || tool === "circle";
  const isPenTool = tool === "pen" || tool === "eraser";

  const handlePointerDown = (canvasEl: HTMLCanvasElement, x: number, y: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (tool === "fill") {
      saveSnapshot(canvasEl);
      floodFill(ctx, x, y, color);
    } else if (isShapeTool) {
      shape_start(ctx, x, y, canvasEl);
    } else {
      paint_start(ctx, x, y, canvasEl);
    }
  };
  const handlePointerMove = (canvasEl: HTMLCanvasElement, x: number, y: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (isShapeTool) shape_move(ctx, x, y);
    else if (isPenTool) paint_move(ctx, x, y);
  };
  const handlePointerUp = (canvasEl: HTMLCanvasElement, x?: number, y?: number) => {
    const ctx = getCanvas2DContext(canvasEl);
    if (isShapeTool) shape_end(ctx, x, y);
    else if (isPenTool) paint_end(ctx, x, y);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons !== 1) return;
    const { x, y } = getPositionInCanvas(event.currentTarget, event);
    handlePointerDown(event.currentTarget, x, y);
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
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
      handlePointerUp(event.currentTarget);
      return;
    }
    const touch = event.touches[0];
    setCursorPos({ x: touch.clientX, y: touch.clientY });
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
    </div>
  );
};

export default DrawCanvas;

function getCanvas2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return canvas.getContext("2d")!;
}

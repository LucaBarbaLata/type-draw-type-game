// Client-side preparation of uploaded photos (Picture Perfect mode).
// Photos are downscaled to at most the drawing canvas size and re-encoded as JPEG in the browser, so the
// server only ever receives small files (well below its websocket frame limit) and EXIF/GPS metadata is
// stripped along the way.

/** Same size as the drawing canvas (see DrawCanvas.tsx) */
export const UPLOAD_MAX_WIDTH = 1440;
export const UPLOAD_MAX_HEIGHT = 1080;

/** Raw files larger than this are rejected before decoding */
const MAX_RAW_FILE_BYTES = 25 * 1024 * 1024;
/** Hard limit for what we send — the server rejects uploads above 2 MiB */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/** Above this size the JPEG is re-encoded with lower quality first */
const RETRY_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITY = 0.85;
const JPEG_QUALITY_FALLBACK = 0.7;

export class UploadImageError extends Error {}

type DecodedImage = ImageBitmap | HTMLImageElement;

function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadImageError("The browser could not read this image."));
    };
    img.src = url;
  });
}

async function decode(file: File): Promise<DecodedImage> {
  // createImageBitmap honours the EXIF orientation of phone photos; fall back to an <img> where unsupported
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through
    }
  }
  return decodeWithImageElement(file);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new UploadImageError("Could not encode the image."))),
      "image/jpeg",
      quality
    );
  });
}

/**
 * Decodes the given file, scales it down to fit into the drawing canvas size (keeping its aspect ratio) and
 * re-encodes it as a JPEG blob suitable for sending to the server.
 */
export async function prepareUploadImage(file: File): Promise<Blob> {
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new UploadImageError("That file is too large. Please pick a photo under 25 MB.");
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new UploadImageError("Please pick an image file.");
  }

  const image = await decode(file);
  const scale = Math.min(1, UPLOAD_MAX_WIDTH / image.width, UPLOAD_MAX_HEIGHT / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // JPEG has no alpha channel: transparent areas would turn black without this
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  if ("close" in image) image.close();

  let blob = await canvasToBlob(canvas, JPEG_QUALITY);
  if (blob.size > RETRY_THRESHOLD_BYTES) {
    blob = await canvasToBlob(canvas, JPEG_QUALITY_FALLBACK);
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new UploadImageError("That photo is too detailed to upload. Please pick another one.");
  }
  return blob;
}

/**
 * A placeholder image that is uploaded when the round timer runs out before the player picked a photo — the
 * equivalent of the "(no response)" text in typing rounds — so that the round can still finish.
 */
export function makePlaceholderImage(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = UPLOAD_MAX_WIDTH;
  canvas.height = UPLOAD_MAX_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#080818";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00f5ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 96px sans-serif";
  ctx.fillText("(no photo)", canvas.width / 2, canvas.height / 2);
  return canvasToBlob(canvas, JPEG_QUALITY);
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface ReplayData {
  frames: string[];   // JPEG data URLs, 360×270, quality 0.35
  capturedAt: number; // Unix ms, for future cleanup
}

export type GameMode =
  | "CLASSIC"
  | "ONE_WORD"
  | "SHAKY_HANDS"
  | "BLIND_DRAW"
  | "TELEPHONE_NOIR"
  | "OPPOSITE"
  | "FOG_OF_WAR"
  | "HOT_POTATO"
  | "TEAM";

export interface PlayerInfo {
  name: string;
  face: string;
  isCreator: boolean;
}

export interface StoryElement {
  type: "text" | "image";
  content: string;
  player: PlayerInfo;
  replayUrl?: string;
}

export interface StoryContent {
  elements: StoryElement[];
}

export interface Brush {
  pixelSize: number;
  displaySize: number;
}

/** A stroke segment emitted by DrawCanvas and sent to the server for team relay. */
export interface StrokeSegment {
  type: "pen_seg" | "shape" | "fill";
  tool: string;
  x0: number;
  y0: number;
  x1?: number;
  y1?: number;
  color: string;
  brushPixelSize: number;
}

/** A stroke segment received from the server (relayed from a team partner). */
export interface RemoteStroke extends StrokeSegment {
  round: number;
  fromPlayer: string;
}

export type GameMode =
  | "CLASSIC"
  | "ONE_WORD"
  | "SHAKY_HANDS"
  | "BLIND_DRAW"
  | "TELEPHONE_NOIR"
  | "FOG_OF_WAR"
  | "HOT_POTATO"
  | "TEAM"
  | "PICTURE_PERFECT";

/** What a player is playing on, as reported by their own client when joining. */
export type DeviceType = "DESKTOP" | "MOBILE";

export interface PlayerInfo {
  name: string;
  face: string;
  isCreator: boolean;
  /**
   * Unknown for an older client, or a game stored before devices were reported.
   * The server sends null in that case, so read it as "one of the two or not at all".
   */
  device?: DeviceType | null;
}

/** "photo" is an image uploaded by a player (Picture Perfect mode) rather than a drawing */
export type StoryElementType = "text" | "image" | "photo";

export interface StoryElement {
  type: StoryElementType;
  content: string;
  player: PlayerInfo;
  replayUrl?: string;
  reactions?: Record<string, number>;
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

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

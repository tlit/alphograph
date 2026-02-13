export interface Point {
  x: number;
  y: number;
  char: string;
  angle: number;
  isSpace: boolean;
}

export interface SavedEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface Layer {
  id: string;
  name: string;
  text: string;
  color: string;
  x: number;
  y: number;
  locked: boolean;
  visible: boolean;
  segmentLength: number;
}

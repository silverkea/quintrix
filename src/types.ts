export type PentominoType = 'F' | 'I' | 'L' | 'N' | 'P' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export interface PentominoShape {
  type: PentominoType;
  shape: number[][];
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PentominoType;
  shape: number[][];
  color: string;
  position: Position;
  rotation: number;
}

export interface GameState {
  grid: (string | null)[][];
  currentPiece: Piece | null;
  ghostPiece: Piece | null;
  heldPiece: PentominoType | null;
  canHold: boolean;
  nextPieces: PentominoType[];
  score: number;
  level: number;
  lines: number;
  combo: number;
  gameOver: boolean;
  paused: boolean;
  isPlaying: boolean;
  dropInterval: number;
  lastDrop: number;
  backToBack: boolean;
  pendingLines: number;
}

export interface SoundType {
  move: string;
  rotate: string;
  drop: string;
  hardDrop: string;
  lineClear: string;
  tetra: string;
  hold: string;
  gameOver: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const PENTOMINO_SHAPES: Record<PentominoType, number[][]> = {
  F: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  I: [
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  L: [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  N: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  P: [
    [1, 1],
    [1, 1],
    [1, 0],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ],
  U: [
    [1, 0, 1],
    [1, 1, 1],
  ],
  V: [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  W: [
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 0],
  ],
  X: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  Y: [
    [0, 1],
    [1, 1],
    [0, 1],
    [0, 1],
  ],
  Z: [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
};

export const PENTOMINO_COLORS: Record<PentominoType, string> = {
  F: '#7c3aed',
  I: '#00f5ff',
  L: '#ff9800',
  N: '#4ade80',
  P: '#f97316',
  T: '#ec4899',
  U: '#a855f7',
  V: '#22d3ee',
  W: '#facc15',
  X: '#f43f5e',
  Y: '#8b5cf6',
  Z: '#10b981',
};

export const GRID_WIDTH = 14;
export const GRID_HEIGHT = 24;

export const SCORING = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  PENTA: 1000,
  SOFT_DROP: 1,
  HARD_DROP: 2,
};

export const LEVEL_SPEEDS: Record<number, number> = {
  1: 1000,
  2: 900,
  3: 800,
  4: 700,
  5: 600,
  6: 500,
  7: 400,
  8: 300,
  9: 200,
  10: 100,
  11: 80,
  12: 60,
  13: 40,
  14: 20,
  15: 10,
};

export const PENTOMINO_TYPES: PentominoType[] = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
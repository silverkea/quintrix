export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoShape {
  type: TetrominoType;
  shape: number[][];
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: TetrominoType;
  shape: number[][];
  color: string;
  position: Position;
  rotation: number;
}

export interface GameState {
  grid: (string | null)[][];
  currentPiece: Piece | null;
  ghostPiece: Piece | null;
  heldPiece: TetrominoType | null;
  canHold: boolean;
  nextPieces: TetrominoType[];
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
  tSpin: boolean;
  pendingLines: number;
}

export interface SoundType {
  move: string;
  rotate: string;
  drop: string;
  hardDrop: string;
  lineClear: string;
  tetris: string;
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

export const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00f5ff',
  O: '#ffeb3b',
  T: '#9c27b0',
  S: '#4caf50',
  Z: '#f44336',
  J: '#2196f3',
  L: '#ff9800',
};

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;

export const SCORING = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  T_SPIN: 1200,
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

export const TETROMINO_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
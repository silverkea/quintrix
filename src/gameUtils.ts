import {
  Piece,
  Position,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  TETROMINO_TYPES,
  TetrominoType,
  GRID_WIDTH,
  GRID_HEIGHT,
} from './types';

export function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
}

export function getRandomPiece(): Piece {
  const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
  return createPiece(type);
}

export function createPiece(type: TetrominoType): Piece {
  return {
    type,
    shape: TETROMINO_SHAPES[type].map(row => [...row]),
    color: TETROMINO_COLORS[type],
    position: { x: Math.floor((GRID_WIDTH - TETROMINO_SHAPES[type][0].length) / 2), y: 0 },
    rotation: 0,
  };
}

export function rotatePiece(piece: Piece, clockwise: boolean = true): Piece {
  const n = piece.shape.length;
  const rotated: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (clockwise) {
        rotated[j][n - 1 - i] = piece.shape[i][j];
      } else {
        rotated[n - 1 - j][i] = piece.shape[i][j];
      }
    }
  }

  return { ...piece, shape: rotated, rotation: (piece.rotation + (clockwise ? 1 : 3)) % 4 };
}

export function isValidPosition(
  piece: Piece,
  grid: (string | null)[][],
  position: Position
): boolean {
  const { shape } = piece;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = position.x + x;
        const newY = position.y + y;

        if (
          newX < 0 ||
          newX >= GRID_WIDTH ||
          newY >= GRID_HEIGHT ||
          (newY >= 0 && grid[newY][newX])
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

export function getGhostPiece(piece: Piece, grid: (string | null)[][]): Piece {
  let ghostY = piece.position.y;

  while (
    isValidPosition(piece, grid, { x: piece.position.x, y: ghostY + 1 })
  ) {
    ghostY++;
  }

  return { ...piece, position: { x: piece.position.x, y: ghostY } };
}

export function getOccupiedCells(piece: Piece): Position[] {
  const cells: Position[] = [];

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        cells.push({
          x: piece.position.x + x,
          y: piece.position.y + y,
        });
      }
    }
  }

  return cells;
}

export function lockPiece(piece: Piece, grid: (string | null)[][]): (string | null)[][] {
  const newGrid = grid.map(row => [...row]);

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const gridY = piece.position.y + y;
        const gridX = piece.position.x + x;
        if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
          newGrid[gridY][gridX] = piece.color;
        }
      }
    }
  }

  return newGrid;
}

export function clearLines(grid: (string | null)[][]): { grid: (string | null)[][]; linesCleared: number[] } {
  const linesCleared: number[] = [];

  const newGrid = grid.filter((row, index) => {
    const isFull = row.every(cell => cell !== null);
    if (isFull) {
      linesCleared.push(index);
    }
    return !isFull;
  });

  while (newGrid.length < GRID_HEIGHT) {
    newGrid.unshift(Array(GRID_WIDTH).fill(null));
  }

  return { grid: newGrid, linesCleared };
}

export function checkCollision(piece: Piece, grid: (string | null)[][]): boolean {
  return !isValidPosition(piece, grid, piece.position);
}

export function getNextPiece(queue: TetrominoType[], count: number = 7): TetrominoType[] {
  const shuffled = [...TETROMINO_TYPES].sort(() => Math.random() - 0.5);
  return [...queue.slice(count), ...shuffled];
}

export function calculateScore(
  linesClearedCount: number,
  level: number,
  combo: number,
  backToBack: boolean,
  tSpin: boolean
): { score: number; combo: number; backToBack: boolean; type: string } {
  let score = 0;
  let type = '';

  if (linesClearedCount === 0) {
    return { score: 0, combo: 0, backToBack, type: '' };
  }

  const baseScores: Record<number, number> = {
    1: 100,
    2: 300,
    3: 500,
    4: 800,
  };

  score = (baseScores[linesClearedCount] || 0) * level;

  if (tSpin) {
    score = 1200 * level;
    type = 'T-SPIN';
  } else if (linesClearedCount === 4) {
    if (backToBack) {
      score = Math.floor(score * 1.5);
    }
    backToBack = true;
    type = 'TETRA';
  } else {
    backToBack = false;
    type = linesClearedCount === 1 ? 'SINGLE' : linesClearedCount === 2 ? 'DOUBLE' : 'TRIPLE';
  }

  if (combo > 0) {
    score += 50 * combo * level;
    type += ` ${combo}x COMBO`;
  }

  return { score, combo: combo + 1, backToBack, type };
}

export function getLevelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

export function getDropInterval(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 100);
}

export function wallKick(piece: Piece, grid: (string | null)[][]): Position | null {
  const kicks: Position[] = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
  ];

  for (const kick of kicks) {
    const testPosition = {
      x: piece.position.x + kick.x,
      y: piece.position.y + kick.y,
    };
    if (isValidPosition({ ...piece, position: testPosition }, grid, testPosition)) {
      return testPosition;
    }
  }

  return null;
}

export function isGameOver(piece: Piece, grid: (string | null)[][]): boolean {
  return !isValidPosition(piece, grid, piece.position);
}

export function getBagRandomizer(): TetrominoType[] {
  const bag = [...TETROMINO_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
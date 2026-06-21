import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  Piece,
  TetrominoType,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  GRID_WIDTH,
  GRID_HEIGHT,
  Particle,
  FloatingText,
} from './types';
import {
  createEmptyGrid,
  createPiece,
  rotatePiece,
  isValidPosition,
  getGhostPiece,
  getOccupiedCells,
  lockPiece,
  clearLines,
  calculateScore,
  getLevelForLines,
  getDropInterval,
  wallKick,
  getBagRandomizer,
} from './gameUtils';
import { soundEngine } from './soundEngine';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: createEmptyGrid(),
    currentPiece: null,
    ghostPiece: null,
    heldPiece: null,
    canHold: true,
    nextPieces: getBagRandomizer().concat(getBagRandomizer()),
    score: 0,
    level: 1,
    lines: 0,
    combo: 0,
    gameOver: false,
    paused: false,
    isPlaying: false,
    dropInterval: 1000,
    lastDrop: 0,
    backToBack: false,
    tSpin: false,
    pendingLines: 0,
  }));

  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shake, setShake] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const gameLoopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const spawnNewPiece = useCallback(() => {
    const nextType = gameState.nextPieces[0];
    const newPiece = createPiece(nextType);
    const newNextPieces = gameState.nextPieces.slice(1);
    
    if (newNextPieces.length < 7) {
      newNextPieces.push(...getBagRandomizer());
    }

    const newState: Partial<GameState> = {
      currentPiece: newPiece,
      nextPieces: newNextPieces,
      canHold: true,
    };

    if (!isValidPosition(newPiece, gameState.grid, newPiece.position)) {
      setGameState(prev => ({ ...prev, ...newState, gameOver: true, isPlaying: false }));
      soundEngine.playGameOver();
      return null;
    }

    return newState;
  }, [gameState.grid, gameState.nextPieces]);

  const movePiece = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.paused) return prev;

      const newPosition = {
        x: prev.currentPiece.position.x + dx,
        y: prev.currentPiece.position.y + dy,
      };

      if (isValidPosition(prev.currentPiece, prev.grid, newPosition)) {
        soundEngine.playMove();
        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, position: newPosition },
          ghostPiece: getGhostPiece({ ...prev.currentPiece, position: newPosition }, prev.grid),
        };
      }

      if (dy > 0) {
        const lockedGrid = lockPiece(prev.currentPiece, prev.grid);
        const { grid: clearedGrid, linesCleared } = clearLines(lockedGrid);
        
        let newState = {
          ...prev,
          grid: clearedGrid,
          combo: 0,
          pendingLines: linesCleared.length,
        };

        if (linesCleared.length > 0) {
          const { score, combo: newCombo, backToBack: newBackToBack, type } = calculateScore(
            linesCleared.length,
            prev.level,
            prev.combo,
            prev.backToBack,
            prev.tSpin
          );

          if (linesCleared.length === 4) {
            soundEngine.playTetris();
          } else {
            soundEngine.playLineClear();
          }

          setParticles(prevParticles => {
            const newParticles: Particle[] = [];
            linesCleared.forEach(lineY => {
              for (let x = 0; x < GRID_WIDTH; x++) {
                const color = prev.grid[lineY][x] || '#ffffff';
                newParticles.push({
                  id: `particle-${Date.now()}-${x}-${lineY}`,
                  x: containerRef.current 
                    ? (x / GRID_WIDTH) * containerRef.current.offsetWidth + Math.random() * 20
                    : x * 30,
                  y: containerRef.current 
                    ? (lineY / GRID_HEIGHT) * containerRef.current.offsetHeight + Math.random() * 20
                    : lineY * 30,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10 - 5,
                  color,
                  life: 1,
                });
              }
            });
            return [...prevParticles, ...newParticles];
          });

          setFloatingTexts(prev => [
            ...prev,
            {
              id: `text-${Date.now()}`,
              x: 0.5,
              y: linesCleared.reduce((a, b) => (a + b) / linesCleared.length, 0) / GRID_HEIGHT,
              text: `${type} +${score}`,
              color: linesCleared.length === 4 ? '#ff00ff' : '#00f5ff',
              life: 1,
            },
          ]);

          newState.score += score;
          newState.combo = newCombo;
          newState.backToBack = newBackToBack;
          newState.lines += linesCleared.length;
          newState.level = getLevelForLines(newState.lines);
          newState.dropInterval = getDropInterval(newState.level);
          newState.tSpin = false;
        }

        const spawnState = spawnNewPiece();
        if (spawnState) {
          newState = { ...newState, ...spawnState };
        } else {
          newState.gameOver = true;
          newState.isPlaying = false;
        }

        return newState;
      }

      return prev;
    });
  }, [spawnNewPiece]);

  const rotateCurrentPiece = useCallback((clockwise: boolean = true) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.paused) return prev;

      const rotated = rotatePiece(prev.currentPiece, clockwise);
      const kickPosition = wallKick(rotated, prev.grid);

      if (kickPosition) {
        soundEngine.playRotate();
        return {
          ...prev,
          currentPiece: { ...rotated, position: kickPosition },
          ghostPiece: getGhostPiece({ ...rotated, position: kickPosition }, prev.grid),
        };
      }

      return prev;
    });
  }, []);

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.paused) return prev;

      const ghost = getGhostPiece(prev.currentPiece, prev.grid);
      const dropDistance = ghost.position.y - prev.currentPiece.position.y;
      
      soundEngine.playHardDrop();
      setShake(true);
      setTimeout(() => setShake(false), 200);

      const lockedGrid = lockPiece({ ...prev.currentPiece, position: ghost.position }, prev.grid);
      const { grid: clearedGrid, linesCleared } = clearLines(lockedGrid);
      
      let newState = {
        ...prev,
        score: prev.score + dropDistance * 2,
        grid: clearedGrid,
        combo: 0,
        pendingLines: linesCleared.length,
      };

      if (linesCleared.length > 0) {
        const { score, combo: newCombo, backToBack: newBackToBack, type } = calculateScore(
          linesCleared.length,
          prev.level,
          prev.combo,
          prev.backToBack,
          prev.tSpin
        );

        if (linesCleared.length === 4) {
          soundEngine.playTetris();
        } else {
          soundEngine.playLineClear();
        }

        setParticles(prevParticles => {
          const newParticles: Particle[] = [];
          linesCleared.forEach(lineY => {
            for (let x = 0; x < GRID_WIDTH; x++) {
              const color = prev.grid[lineY][x] || '#ffffff';
              newParticles.push({
                id: `particle-${Date.now()}-${x}-${lineY}`,
                x: containerRef.current 
                  ? (x / GRID_WIDTH) * containerRef.current.offsetWidth + Math.random() * 20
                  : x * 30,
                y: containerRef.current 
                  ? (lineY / GRID_HEIGHT) * containerRef.current.offsetHeight + Math.random() * 20
                  : lineY * 30,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5,
                color,
                life: 1,
              });
            }
          });
          return [...prevParticles, ...newParticles];
        });

        setFloatingTexts(prev => [
          ...prev,
          {
            id: `text-${Date.now()}`,
            x: 0.5,
            y: linesCleared.reduce((a, b) => (a + b) / linesCleared.length, 0) / GRID_HEIGHT,
            text: `${type} +${score}`,
            color: linesCleared.length === 4 ? '#ff00ff' : '#00f5ff',
            life: 1,
          },
        ]);

        newState.score += score;
        newState.combo = newCombo || 1;
        newState.backToBack = newBackToBack;
        newState.lines += linesCleared.length;
        newState.level = getLevelForLines(newState.lines);
        newState.dropInterval = getDropInterval(newState.level);
        newState.tSpin = false;
      }

      const spawnState = spawnNewPiece();
      if (spawnState) {
        newState = { ...newState, ...spawnState };
      } else {
        newState.gameOver = true;
        newState.isPlaying = false;
      }

      return newState;
    });
  }, [spawnNewPiece]);

  const holdPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || !prev.canHold || prev.gameOver || prev.paused) return prev;

      soundEngine.playHold();

      const currentType = prev.currentPiece.type;
      const heldType = prev.heldPiece;

      let newState: Partial<GameState> = {
        heldPiece: currentType,
        canHold: false,
      };

      if (heldType) {
        const newPiece = createPiece(heldType);
        newState.currentPiece = newPiece;
        newState.ghostPiece = getGhostPiece(newPiece, prev.grid);
      } else {
        const spawnState = spawnNewPiece();
        newState = { ...newState, ...spawnState };
      }

      return { ...prev, ...newState };
    });
  }, [spawnNewPiece]);

  const startGame = useCallback(async () => {
    await soundEngine.init();
    const bag = getBagRandomizer();
    const initialPiece = createPiece(bag[0]);
    const nextPieces = bag.slice(1).concat(getBagRandomizer());
    
    setGameState({
      grid: createEmptyGrid(),
      currentPiece: initialPiece,
      ghostPiece: getGhostPiece(initialPiece, createEmptyGrid()),
      heldPiece: null,
      canHold: true,
      nextPieces,
      score: 0,
      level: 1,
      lines: 0,
      combo: 0,
      gameOver: false,
      paused: false,
      isPlaying: true,
      dropInterval: 1000,
      lastDrop: performance.now(),
      backToBack: false,
      tSpin: false,
      pendingLines: 0,
    });
    setParticles([]);
    setFloatingTexts([]);
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      paused: !prev.paused,
    }));
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.repeat) return;
    keysPressedRef.current.add(event.key);

    if (gameState.gameOver) {
      if (event.key === 'Enter' || event.key === ' ') {
        startGame();
      }
      return;
    }

    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
      togglePause();
      return;
    }

    if (event.key === 'h' || event.key === 'H') {
      setShowHelp(prev => !prev);
      if (!gameState.paused && gameState.isPlaying) {
        setGameState(prev => ({ ...prev, paused: true }));
      }
      return;
    }

    if (!gameState.isPlaying || gameState.paused) return;

    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        movePiece(1, 0);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        movePiece(0, 1);
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        event.preventDefault();
        rotateCurrentPiece(true);
        break;
      case ' ':
        event.preventDefault();
        hardDrop();
        break;
      case 'c':
      case 'C':
      case 'Shift':
        event.preventDefault();
        holdPiece();
        break;
      case 'z':
      case 'Z':
        event.preventDefault();
        rotateCurrentPiece(false);
        break;
    }
  }, [gameState.gameOver, gameState.isPlaying, gameState.paused, movePiece, rotateCurrentPiece, hardDrop, holdPiece, startGame, togglePause]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressedRef.current.delete(event.key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    if (gameState.isPlaying && !gameState.paused && !gameState.gameOver) {
      if (timestamp - gameState.lastDrop > gameState.dropInterval) {
        movePiece(0, 1);
        setGameState(prev => ({ ...prev, lastDrop: timestamp }));
      }
    }

    lastTimeRef.current = timestamp;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.isPlaying, gameState.paused, gameState.gameOver, gameState.dropInterval, gameState.lastDrop, movePiece]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({ ...p, life: p.life - 0.02, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.3 }))
          .filter(p => p.life > 0)
      );

      setFloatingTexts(prev => 
        prev
          .map(t => ({ ...t, life: t.life - 0.02, y: t.y - 0.01 }))
          .filter(t => t.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(6, '0');
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col lg:flex-row items-center justify-center p-2 lg:p-4 relative overflow-hidden">
      <div className={`absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.3),transparent_50%)] animate-pulse`} />
      
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm pointer-events-none"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            backgroundColor: particle.color,
            opacity: particle.life,
            boxShadow: `0 0 10px ${particle.color}, 0 0 20px ${particle.color}`,
            transform: 'scale(0.5)',
          }}
        />
      ))}

      <div
        ref={containerRef}
        className={`relative flex flex-col items-center gap-3 lg:flex-row lg:gap-4 z-10 transition-transform ${shake ? 'animate-shake' : ''}`}
      >
        <div className="hidden lg:flex glass-panel-violet glass-panel rounded-xl p-3 lg:p-4 flex-col items-center gap-3 lg:gap-4">
          <h2 className="text-neon-cyan text-xs lg:text-sm font-bold uppercase tracking-wider glow-text">Hold</h2>
          <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
            {gameState.heldPiece ? (
              <MiniPiecePreview type={gameState.heldPiece} />
            ) : (
              <div className="w-12 h-12 lg:w-16 lg:h-16 border-2 border-white/10 border-dashed rounded-lg" />
            )}
          </div>
          <div className={`text-xs lg:text-xs text-white/60 ${!gameState.canHold ? 'opacity-50' : ''}`}>
            Shift/C
          </div>
        </div>

        <div className="glass-panel glass-panel-cyan glass-panel rounded-2xl lg:rounded-3xl p-3 lg:p-6 relative flex flex-col items-center">
          {/* Mobile hold piece at top */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="glass-panel-violet rounded-lg p-2 flex items-center gap-2">
              <span className="text-neon-cyan text-[10px] font-bold uppercase tracking-wider mr-1">H</span>
              <div className="w-10 h-10 flex items-center justify-center">
                {gameState.heldPiece ? (
                  <MiniPiecePreview type={gameState.heldPiece} />
                ) : (
                  <div className="w-8 h-8 border-2 border-white/10 border-dashed rounded" />
                )}
              </div>
            </div>
          </div>

          {/* Mobile next pieces at top */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-2 w-full">
            {gameState.nextPieces.slice(0, 3).map((type, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className={`text-xs font-mono ${index === 0 ? 'text-neon-magenta font-bold' : 'text-white/40'}`}>
                  {index + 1}
                </span>
                <div className={`w-5 h-7 flex items-center justify-center ${index === 0 ? 'opacity-100' : 'opacity-50'}`}>
                  <MiniPiecePreview type={type} size="small" />
                </div>
              </div>
            ))}
          </div>

          <GameGrid
            grid={gameState.grid}
            currentPiece={gameState.currentPiece}
            ghostPiece={gameState.ghostPiece}
          />
          
          {floatingTexts.map(text => (
            <div
              key={text.id}
              className="absolute floating-score text-2xl font-bold pointer-events-none"
              style={{
                left: `${text.x * 100}%`,
                top: `${text.y * 100}%`,
                color: text.color,
                opacity: text.life,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {text.text}
            </div>
          ))}

          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-20">
              <h2 className="text-4xl font-bold text-neon-magenta glow-text mb-4">GAME OVER</h2>
              <p className="text-xl text-white/80 mb-6">Final Score: {formatNumber(gameState.score)}</p>
              <button
                onClick={startGame}
                className="px-8 py-3 glass-panel-cyan rounded-xl text-white font-bold hover:scale-105 transition-transform border-2 border-neon-cyan/30"
              >
                Play Again (Enter)
              </button>
            </div>
          )}

          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-20">
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-white to-neon-magenta glow-text mb-2">
                TETRIS
              </h1>
              <p className="text-sm text-white/60 mb-6 tracking-widest">HOLO-SYNTH EDITION</p>
              <button
                onClick={startGame}
                className="px-8 py-3 glass-panel-cyan rounded-xl text-white font-bold hover:scale-105 transition-transform border-2 border-neon-cyan/30"
              >
                Start Game
              </button>
            </div>
          )}

          {gameState.paused && gameState.isPlaying && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
              <h2 className="text-3xl font-bold text-white glow-text">PAUSED</h2>
            </div>
          )}
        </div>

        {/* Desktop right panel */}
        <div className="hidden lg:flex glass-panel-magenta glass-panel rounded-xl lg:rounded-2xl p-3 lg:p-4 flex-col gap-3 lg:gap-4 min-w-[120px] lg:min-w-[160px]">
          <div className="text-center mb-1 lg:mb-2">
            <h2 className="text-neon-magenta text-xs lg:text-sm font-bold uppercase tracking-wider glow-text">Next</h2>
          </div>
          
          {gameState.nextPieces.slice(0, 3).map((type, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-6 h-8 ${index === 0 ? 'opacity-100' : 'opacity-40 text-xs flex items-center'}`}>
                <span className="text-white/60">{index + 1}</span>
              </div>
              <MiniPiecePreview type={type} size={index === 0 ? 'normal' : 'small'} />
            </div>
          ))}

          <div className="border-t border-white/10 pt-3 lg:pt-4 space-y-2 lg:space-y-3">
            <div className="text-center">
              <div className="text-white/60 text-[10px] lg:text-xs uppercase tracking-wider">Score</div>
              <div className="text-neon-cyan text-lg lg:text-2xl font-bold glow-text font-mono">
                {formatNumber(gameState.score)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-white/60 text-[10px] lg:text-xs uppercase tracking-wider">Level</div>
              <div className="text-neon-magenta text-2xl lg:text-3xl font-bold glow-text font-mono">
                {gameState.level}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-white/60 text-[10px] lg:text-xs uppercase tracking-wider">Lines</div>
              <div className="text-white text-base lg:text-xl font-bold font-mono">
                {formatNumber(gameState.lines)}
              </div>
            </div>

            {gameState.combo > 1 && (
              <div className="text-center">
                <div className="text-white/60 text-[10px] lg:text-xs uppercase tracking-wider">Combo</div>
                <div className="text-neon-violet text-lg lg:text-xl font-bold glow-text">
                  {gameState.combo}x
                </div>
              </div>
            )}

            <div className="pt-2 lg:pt-3 border-t border-white/10">
              <div className="hidden sm:flex items-center justify-center gap-2 text-[10px] lg:text-xs">
                <span className="text-white/40 uppercase tracking-wider">Press</span>
                <kbd className="px-1.5 py-0.5 lg:px-2 lg:py-1 rounded bg-white/10 border border-white/20 text-neon-cyan font-mono glow-text animate-pulse">
                  H
                </kbd>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta font-bold uppercase tracking-wider">
                  for Help
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Mobile stats bar - one line */}
      <div className="lg:hidden flex items-center justify-center gap-4 mb-40 sm:mb-44 w-full px-2 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">Score</span>
          <span className="text-neon-cyan text-sm font-bold glow-text font-mono">
            {formatNumber(gameState.score)}
          </span>
        </div>
        <span className="text-white/30 text-xs">|</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">Level</span>
          <span className="text-neon-magenta text-base font-bold glow-text font-mono">
            {gameState.level}
          </span>
        </div>
        <span className="text-white/30 text-xs">|</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60 uppercase tracking-wider">Lines</span>
          <span className="text-white text-sm font-bold font-mono">
            {formatNumber(gameState.lines)}
          </span>
        </div>
        {gameState.combo > 1 && (
          <>
            <span className="text-white/30 text-xs">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/60 uppercase tracking-wider">Combo</span>
              <span className="text-neon-violet text-sm font-bold glow-text">
                {gameState.combo}x
              </span>
            </div>
          </>
        )}
      </div>

      <MobileControls
        onLeft={() => movePiece(-1, 0)}
        onRight={() => movePiece(1, 0)}
        onDown={() => movePiece(0, 1)}
        onRotate={() => rotateCurrentPiece(true)}
        disabled={!gameState.isPlaying || gameState.gameOver}
      />



      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="glass-panel glass-panel-cyan rounded-2xl lg:rounded-3xl p-4 lg:p-8 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 lg:mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta glow-text">
                CONTROLS
              </h2>
              <button
                onClick={() => {
                  setShowHelp(false);
                  setGameState(prev => ({ ...prev, paused: false }));
                }}
                className="text-white/60 hover:text-white transition-colors text-xl lg:text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 lg:space-y-4">
              <div className="border-b border-white/10 pb-2 lg:pb-3">
                <h3 className="text-neon-cyan text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 lg:mb-3">Movement</h3>
                <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                  <div className="text-white/60">Move Left</div>
                  <div className="text-white text-right">← / A</div>
                  <div className="text-white/60">Move Right</div>
                  <div className="text-white text-right">→ / D</div>
                  <div className="text-white/60">Soft Drop</div>
                  <div className="text-white text-right">↓ / S</div>
                </div>
              </div>
              
              <div className="border-b border-white/10 pb-2 lg:pb-3">
                <h3 className="text-neon-magenta text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 lg:mb-3">Rotation</h3>
                <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                  <div className="text-white/60">Rotate CW</div>
                  <div className="text-white text-right">↑ / W</div>
                  <div className="text-white/60">Rotate CCW</div>
                  <div className="text-white text-right">Z</div>
                </div>
              </div>
              
              <div className="border-b border-white/10 pb-2 lg:pb-3">
                <h3 className="text-neon-violet text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 lg:mb-3">Actions</h3>
                <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                  <div className="text-white/60">Hard Drop</div>
                  <div className="text-white text-right">Space</div>
                  <div className="text-white/60">Hold Piece</div>
                  <div className="text-white text-right">Shift / C</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-white/60 text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 lg:mb-3">Game</h3>
                <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
                  <div className="text-white/60">Pause</div>
                  <div className="text-white text-right">P / Esc</div>
                  <div className="text-white/60">Toggle Help</div>
                  <div className="text-white text-right">H</div>
                  <div className="text-white/60">Start</div>
                  <div className="text-white text-right">Enter</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  setShowHelp(false);
                  setGameState(prev => ({ ...prev, paused: false }));
                }}
                className="px-4 py-2 lg:px-6 lg:py-2 glass-panel-violet rounded-xl text-white font-bold text-sm lg:text-base hover:scale-105 transition-transform border-2 border-neon-violet/30"
              >
                Resume Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameGrid({
  grid,
  currentPiece,
  ghostPiece,
}: {
  grid: (string | null)[][];
  currentPiece: Piece | null;
  ghostPiece: Piece | null;
}) {
  const combinedGrid = React.useMemo(() => {
    const newGrid = grid.map(row => [...row]);

    if (ghostPiece) {
      getOccupiedCells(ghostPiece).forEach(cell => {
        if (cell.y >= 0 && cell.y < GRID_HEIGHT && cell.x >= 0 && cell.x < GRID_WIDTH) {
          if (!newGrid[cell.y][cell.x]) {
            newGrid[cell.y][cell.x] = `${ghostPiece.color}-ghost`;
          }
        }
      });
    }

    if (currentPiece) {
      getOccupiedCells(currentPiece).forEach(cell => {
        if (cell.y >= 0 && cell.y < GRID_HEIGHT && cell.x >= 0 && cell.x < GRID_WIDTH) {
          newGrid[cell.y][cell.x] = currentPiece.color;
        }
      });
    }

    return newGrid;
  }, [grid, currentPiece, ghostPiece]);

  return (
    <div
      className="grid gap-0.5 bg-black/50 p-2 lg:p-3 rounded-2xl w-full"
      style={{
        gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_HEIGHT}, 1fr)`,
        width: 'min(90vw, 350px)',
        height: 'min(min(90vw, 350px) * 2, min(100vh - 12rem, 700px))',
      }}
    >
      {combinedGrid.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${y}-${x}`}
            className={`relative w-full h-full rounded-sm ${
              cell && !cell.includes('-ghost')
                ? 'tetromino-block'
                : cell?.includes('-ghost')
                ? 'ghost-piece tetromino-block'
                : 'grid-cell'
            }`}
            style={
              cell && !cell.includes('-ghost')
                ? { backgroundColor: cell, color: cell }
                : cell?.includes('-ghost')
                ? { backgroundColor: cell.replace('-ghost', ''), color: cell.replace('-ghost', '') }
                : undefined
            }
          />
        ))
      )}
    </div>
  );
}

function MiniPiecePreview({ type, size = 'normal' }: { type: TetrominoType; size?: 'normal' | 'small' }) {
  const shape = TETROMINO_SHAPES[type];
  const color = TETROMINO_COLORS[type];
  const blockSize = size === 'normal' ? 'w-3 h-3 lg:w-4 lg:h-4' : 'w-2 h-2 lg:w-3 lg:h-3';
  const gap = size === 'normal' ? 'gap-px' : 'gap-0.5';

  return (
    <div className={`${gap} grid`} style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}>
      {shape.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <div
              key={`${y}-${x}`}
              className={`${blockSize} rounded-sm tetromino-block`}
              style={{ backgroundColor: color, color }}
            />
          ) : (
            <div key={`${y}-${x}`} className={blockSize} />
          )
        )
      )}
    </div>
  );
}

function MobileControls({
  onLeft,
  onRight,
  onDown,
  onRotate,
  disabled,
}: {
  onLeft: () => void;
  onRight: () => void;
  onDown: () => void;
  onRotate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 lg:hidden w-full max-w-sm px-2 z-40">
      <button
        onPointerDown={(e) => { e.preventDefault(); onLeft(); }}
        disabled={disabled}
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        className="w-16 h-16 glass-panel rounded-xl flex items-center justify-center text-white/80 active:scale-90 transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation"
        aria-label="Move Left"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onPointerDown={(e) => { e.preventDefault(); onRotate(); }}
        disabled={disabled}
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        className="w-16 h-16 glass-panel-cyan rounded-xl flex items-center justify-center text-white/80 active:scale-90 transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation"
        aria-label="Rotate"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button
        onPointerDown={(e) => { e.preventDefault(); onDown(); }}
        disabled={disabled}
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        className="w-16 h-16 glass-panel rounded-xl flex items-center justify-center text-white/80 active:scale-90 transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation"
        aria-label="Move Down"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
      <button
        onPointerDown={(e) => { e.preventDefault(); onRight(); }}
        disabled={disabled}
        style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
        className="w-16 h-16 glass-panel rounded-xl flex items-center justify-center text-white/80 active:scale-90 transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer touch-manipulation"
        aria-label="Move Right"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
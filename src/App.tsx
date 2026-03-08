/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 150;

const playSound = (type: 'eat' | 'die') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    if (type === 'eat') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  } catch (e) {
    console.error('Audio error:', e);
  }
};

type Point = { x: number; y: number };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
  };

  const moveSnake = useCallback(() => {
    if (isPaused || isGameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        playSound('die');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        playSound('eat');
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isPaused, isGameOver, gameStarted, generateFood, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          if (gameStarted && !isGameOver) setIsPaused((p) => !p);
          else if (isGameOver || !gameStarted) resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameStarted, isGameOver]);

  useEffect(() => {
    const interval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(interval);
  }, [moveSnake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear canvas
    ctx.fillStyle = '#111827'; // Dark gray
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw Name inside the box (Watermark style)
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WAI WIN HAN', canvas.width / 2, canvas.height / 2);

    // Draw food
    ctx.fillStyle = '#ef4444'; // Red
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#10b981' : '#34d399'; // Emerald
      ctx.shadowBlur = index === 0 ? 10 : 0;
      ctx.shadowColor = '#10b981';
      
      const padding = 2;
      ctx.fillRect(
        segment.x * cellSize + padding,
        segment.y * cellSize + padding,
        cellSize - padding * 2,
        cellSize - padding * 2
      );
      
      // Draw eyes on head
      if (index === 0) {
        ctx.fillStyle = '#fff';
        const eyeSize = 3;
        const eyeOffset = 5;
        if (direction.y !== 0) {
          ctx.fillRect(segment.x * cellSize + eyeOffset, segment.y * cellSize + cellSize/2 - eyeSize/2, eyeSize, eyeSize);
          ctx.fillRect(segment.x * cellSize + cellSize - eyeOffset - eyeSize, segment.y * cellSize + cellSize/2 - eyeSize/2, eyeSize, eyeSize);
        } else {
          ctx.fillRect(segment.x * cellSize + cellSize/2 - eyeSize/2, segment.y * cellSize + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(segment.x * cellSize + cellSize/2 - eyeSize/2, segment.y * cellSize + cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
        }
      }
    });
  }, [snake, food, direction]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            WAI WIN HAN
          </h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs font-semibold">
            Classic Snake Edition
          </p>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-xl">
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Score</p>
                <p className="text-xl font-mono font-bold leading-none">{score}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Best</p>
              <p className="text-xl font-mono font-bold leading-none text-zinc-400">{highScore}</p>
            </div>
          </div>

          <div className="relative aspect-square w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full h-full"
            />

            <AnimatePresence>
              {(!gameStarted || isGameOver || isPaused) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                >
                  {!gameStarted ? (
                    <>
                      <h2 className="text-2xl font-bold mb-4">Ready?</h2>
                      <button
                        onClick={resetGame}
                        className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Start Game
                      </button>
                    </>
                  ) : isGameOver ? (
                    <>
                      <h2 className="text-3xl font-bold text-red-400 mb-2">Game Over</h2>
                      <p className="text-zinc-400 mb-6">Final Score: {score}</p>
                      <button
                        onClick={resetGame}
                        className="group flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Try Again
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-6">Paused</h2>
                      <button
                        onClick={() => setIsPaused(false)}
                        className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Resume
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Controls</p>
              <div className="flex gap-2">
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700 font-mono">ARROWS</kbd>
                <kbd className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700 font-mono">SPACE</kbd>
              </div>
            </div>
            <div className="flex justify-end items-end">
              <button 
                onClick={() => gameStarted && !isGameOver && setIsPaused(!isPaused)}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-colors"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Controls (Visible only on small screens) */}
        <div className="mt-8 lg:hidden grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
          <div />
          <button 
            className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700"
            onClick={() => direction.y === 0 && setDirection({ x: 0, y: -1 })}
          >
            <ChevronUp className="w-6 h-6 mx-auto" />
          </button>
          <div />
          <button 
            className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700"
            onClick={() => direction.x === 0 && setDirection({ x: -1, y: 0 })}
          >
            <ChevronLeft className="w-6 h-6 mx-auto" />
          </button>
          <button 
            className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700"
            onClick={() => direction.y === 0 && setDirection({ x: 0, y: 1 })}
          >
            <ChevronDown className="w-6 h-6 mx-auto" />
          </button>
          <button 
            className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700"
            onClick={() => direction.x === 0 && setDirection({ x: 1, y: 0 })}
          >
            <ChevronRight className="w-6 h-6 mx-auto" />
          </button>
        </div>

        <footer className="mt-12 text-center text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
          Designed by Wai Win Han 2026
        </footer>
      </motion.div>
    </div>
  );
}

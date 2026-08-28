"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#2f6df6", "#1f7a4d", "#b8860b", "#c0392b", "#5b8dff", "#e0b341"];
const COUNT = 160;
const GRAVITY = 0.28;
const DRAG = 0.995;
const LIFE_MS = 2800;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  w: number;
  h: number;
  color: string;
}

/**
 * One burst of confetti from the middle of the screen. Canvas rather than DOM
 * nodes so a hundred-odd pieces cost nothing, and it takes itself down when the
 * animation is over.
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Nobody who has asked for less motion wants this.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);

    // Two cannons firing up and inward from the bottom corners, rather than one
    // burst from the middle -- that put confetti straight over the dialog you
    // are meant to be reading.
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const spread = (Math.random() - 0.5) * 0.7;
      const angle = (fromLeft ? -Math.PI / 3.4 : -Math.PI + Math.PI / 3.4) + spread;
      const speed = 15 + Math.random() * 14;
      return {
        x: fromLeft ? -10 : width + 10,
        y: height + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const started = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const elapsed = now - started;
      if (elapsed > LIFE_MS) {
        context.clearRect(0, 0, width, height);
        return;
      }
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, 1 - elapsed / LIFE_MS);

      for (const piece of pieces) {
        piece.vy += GRAVITY;
        piece.vx *= DRAG;
        piece.vy *= DRAG;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rot += piece.spin;

        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rot);
        context.fillStyle = piece.color;
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}

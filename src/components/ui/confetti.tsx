"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { create } from "zustand";

interface ConfettiStore {
  active: boolean;
  burstCount: number;
  trigger: () => void;
  stop: () => void;
}

export const useConfettiStore = create<ConfettiStore>((set) => ({
  active: false,
  burstCount: 0,
  trigger: () => set((state) => ({ active: true, burstCount: state.burstCount + 1 })),
  stop: () => set({ active: false }),
}));

export const triggerConfetti = () => useConfettiStore.getState().trigger();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle" | "strip";
}

const COLORS = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#F97316", // Orange
];

export function ConfettiCanvas() {
  const { active, burstCount, stop } = useConfettiStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const createParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height * 0.45 + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: Math.random() > 0.6 ? "circle" : Math.random() > 0.3 ? "rect" : "strip",
      });
    }

    return particles;
  }, []);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = createParticles(canvas.width, canvas.height);

    let frame = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      let alive = 0;
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        if (frame > 40) {
          p.opacity -= 0.015;
        }

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;

          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === "strip") {
            ctx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2);
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }
          ctx.restore();
        }
      }

      if (alive > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      } else {
        stop();
      }
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, burstCount, createParticles, stop]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] w-full h-full"
    />
  );
}

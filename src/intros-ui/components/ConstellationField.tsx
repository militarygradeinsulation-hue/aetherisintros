// @ts-nocheck
import React, { useEffect, useRef } from 'react';

export const ConstellationField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      drawStatic();
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes
    const nodeCount = Math.min(45, Math.floor(width / 35));
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      radius: Math.random() * 1.5 + 0.8,
      alpha: Math.random() * 0.4 + 0.2,
      twinkle: Math.random() * 0.02 + 0.005,
    }));

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      // Subtle background ambient vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        100,
        width / 2,
        height * 0.35,
        Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, 'rgba(61, 107, 242, 0.035)');
      gradient.addColorStop(0.6, 'rgba(14, 17, 22, 0.2)');
      gradient.addColorStop(1, 'rgba(7, 9, 12, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw faint connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(242, 238, 230, ${0.05 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 238, 230, ${node.alpha})`;
        ctx.fill();

        // Accent nodes
        if (node.radius > 1.8) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(61, 107, 242, 0.15)`;
          ctx.fill();
        }
      });
    };

    if (prefersReducedMotion) {
      drawStatic();
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        100,
        width / 2,
        height * 0.35,
        Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, 'rgba(61, 107, 242, 0.03)');
      gradient.addColorStop(0.6, 'rgba(14, 17, 22, 0.2)');
      gradient.addColorStop(1, 'rgba(7, 9, 12, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Move and render nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        node.alpha += node.twinkle;
        if (node.alpha > 0.55 || node.alpha < 0.15) {
          node.twinkle = -node.twinkle;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 238, 230, ${node.alpha})`;
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(242, 238, 230, ${0.05 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70"
      aria-hidden="true"
    />
  );
};

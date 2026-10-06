// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { NetworkMember, RelationshipTier } from '../../networkData';
import { getPortraitForName } from './ExecutivePortrait';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Radio,
  ExternalLink,
  Users,
  Compass,
  MessageSquare,
} from 'lucide-react';

interface FloatingConnectionFieldProps {
  members: NetworkMember[];
  onSelectMember: (memberId: string) => void;
  onRequestIntro?: (member: NetworkMember) => void;
  className?: string;
  density?: 'ambient' | 'interactive' | 'fullscreen';
  speedMultiplier?: number;
  isPaused?: boolean;
}

interface BubbleNode {
  id: string;
  name: string;
  title: string;
  company: string;
  avatarUrl: string;
  matchScore: number;
  matchTier: string;
  tier?: RelationshipTier;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  pulsePhase: number;
  ringHue: string;
}

interface MicroNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  phase: number;
  connectedBubbleIds: string[];
}

const MICRO_LABELS = [
  'Stanford Alum',
  'Series B Syndicate',
  '2nd Degree',
  'Deep Tech Co-founder',
  'OpenAI Ecosystem',
  'Enterprise GTM',
  'Seed LP',
  'Advisory Node',
  'Founding Engineer',
  'Horizon Portfolio',
  'AI Infra Lab',
  'European Tech',
];

export const FloatingConnectionField: React.FC<FloatingConnectionFieldProps> = ({
  members,
  onSelectMember,
  onRequestIntro,
  className = '',
  density = 'interactive',
  speedMultiplier = 0.18,
  isPaused = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Card opened by "Click & Hold"
  const [activeDossier, setActiveDossier] = useState<{
    member: NetworkMember;
    x: number;
    y: number;
  } | null>(null);

  // Transient hover state for gentle highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;

  const nodesRef = useRef<BubbleNode[]>([]);
  const microNodesRef = useRef<MicroNode[]>([]);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // SVG Trail Animation & Radar Ripple Refs
  const svgOverlayRef = useRef<SVGSVGElement | null>(null);
  const trailsGroupRef = useRef<SVGGElement | null>(null);
  const ripplesGroupRef = useRef<SVGGElement | null>(null);
  const nodeTrailsRef = useRef<Map<string, Array<{ x: number; y: number; time: number }>>>(new Map());
  const radarEchoesRef = useRef<Array<{
    id: string;
    nodeId: string;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    startTime: number;
    duration: number;
  }>>([]);

  // Hold & interaction tracking refs
  const interactionRef = useRef<{
    pointerX: number;
    pointerY: number;
    isDown: boolean;
    draggedNode: BubbleNode | null;
    holdTargetNode: BubbleNode | null;
    holdStartTime: number;
    dragDistance: number;
    startX: number;
    startY: number;
    holdTriggered: boolean;
    activeHoldProgress: number; // 0 to 1
  }>({
    pointerX: -1000,
    pointerY: -1000,
    isDown: false,
    draggedNode: null,
    holdTargetNode: null,
    holdStartTime: 0,
    dragDistance: 0,
    startX: 0,
    startY: 0,
    holdTriggered: false,
    activeHoldProgress: 0,
  });

  // Preload images into memory
  useEffect(() => {
    members.forEach((m) => {
      const portraitSrc = getPortraitForName(m.name, m.avatarUrl);
      if (portraitSrc && !imagesRef.current.has(m.id)) {
        const img = new Image();
        img.onload = () => {
          imagesRef.current.set(m.id, img);
        };
        img.src = portraitSrc;
        if (img.complete && img.naturalWidth > 0) {
          imagesRef.current.set(m.id, img);
        }
      }
    });
  }, [members]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;

    const setupDimensions = () => {
      if (!canvas || !container) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 500;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    setupDimensions();

    const handleResize = () => {
      setupDimensions();
    };
    window.addEventListener('resize', handleResize);

    // Initialize bubble nodes with balanced positions
    const displayCount = density === 'fullscreen' ? Math.min(members.length, 18) : Math.min(members.length, 12);
    const displayMembers = members.slice(0, displayCount);

    nodesRef.current = displayMembers.map((m, idx) => {
      const angle = (idx / displayMembers.length) * Math.PI * 2 + 0.3;
      const spread = Math.min(width, height) * (density === 'fullscreen' ? 0.36 : 0.30);
      const isLead = idx === 0 || idx === 1;
      // Scale bubbles to the window: small previews get smaller thumbnails
      const scale = density === 'fullscreen' ? 1 : Math.max(0.55, Math.min(1, Math.min(width, height) / 480));
      const baseR = Math.round((isLead ? 36 : idx < 5 ? 31 : 27) * scale);

      return {
        id: m.id,
        name: m.name,
        title: m.title,
        company: m.company,
        avatarUrl: getPortraitForName(m.name, m.avatarUrl),
        matchScore: m.matchScore,
        matchTier: m.matchTier,
        tier: m.tier,
        x: width / 2 + Math.cos(angle) * spread + (Math.random() - 0.5) * 30,
        y: height / 2 + Math.sin(angle) * spread + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
        radius: baseR,
        baseRadius: baseR,
        pulsePhase: Math.random() * Math.PI * 2,
        _appearAt: idx < 2 ? 1 : 0,
        ringHue: m.tier === 'Core' ? '#3D6BF2' : m.tier === 'Extended' ? '#10B981' : '#F59E0B',
      };
    });

    // Initialize smaller micro connection nodes ("web/radar satellite nodes")
    const microCount = Math.min(displayMembers.length * 2, 16);
    microNodesRef.current = Array.from({ length: microCount }, (_, idx) => {
      const randomParentIndex = idx % displayMembers.length;
      const randomParent = nodesRef.current[randomParentIndex];
      const secondParent = nodesRef.current[(randomParentIndex + 2) % displayMembers.length];
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = 55 + Math.random() * 65;

      return {
        id: `micro-${idx}`,
        x: (randomParent?.x || width / 2) + Math.cos(offsetAngle) * offsetDist,
        y: (randomParent?.y || height / 2) + Math.sin(offsetAngle) * offsetDist,
        vx: (Math.random() - 0.5) * 0.015,
        vy: (Math.random() - 0.5) * 0.015,
        radius: 3 + Math.random() * 1.5,
        label: MICRO_LABELS[idx % MICRO_LABELS.length],
        phase: Math.random() * Math.PI * 2,
        connectedBubbleIds: [
          randomParent?.id || '',
          secondParent?.id || '',
        ].filter(Boolean),
      };
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const microNodes = microNodesRef.current;
      const interact = interactionRef.current;
      const now = Date.now();
      const cx = width / 2;
      const cy = height / 2;

      // 1. Radar background web grid & range rings
      const radarMaxRadius = Math.min(width, height) * 0.46;

      ctx.save();
      // Concentric range rings
      const ringSteps = [0.22, 0.45, 0.70, 0.95];
      ringSteps.forEach((frac, idx) => {
        const r = radarMaxRadius * frac;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 3 ? 'rgba(61, 107, 242, 0.12)' : 'rgba(61, 107, 242, 0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash(idx % 2 === 0 ? [3, 4] : []);
        ctx.stroke();

        // Small range indicators
        ctx.fillStyle = 'rgba(156, 163, 175, 0.25)';
        ctx.font = '8px monospace';
        ctx.fillText(`${Math.round(frac * 100)}m`, cx + r - 12, cy - 4);
      });
      ctx.setLineDash([]);

      // Subtle Web / Crosshair Spokes (8 radial spiderweb spokes)
      for (let s = 0; s < 8; s++) {
        const spokeAngle = (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(spokeAngle) * radarMaxRadius,
          cy + Math.sin(spokeAngle) * radarMaxRadius
        );
        ctx.strokeStyle = 'rgba(61, 107, 242, 0.04)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Smooth, gentle Radar Sweep Beam (slow, serene rotation ~22s per cycle)
      const sweepAngle = (now * 0.00028) % (Math.PI * 2);
      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarMaxRadius);
      sweepGradient.addColorStop(0, 'rgba(61, 107, 242, 0.14)');
      sweepGradient.addColorStop(0.7, 'rgba(96, 165, 250, 0.04)');
      sweepGradient.addColorStop(1, 'rgba(61, 107, 242, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarMaxRadius, sweepAngle - 0.35, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Sharp leading sweep edge
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * radarMaxRadius,
        cy + Math.sin(sweepAngle) * radarMaxRadius
      );
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // 2. Physics Update: Very Slow, Graceful Drift
      nodes.forEach((node) => {
        if (interact.draggedNode === node) {
          node.x = interact.pointerX;
          node.y = interact.pointerY;
          node.vx = 0;
          node.vy = 0;
        } else if (!pausedRef.current) {
          const spd = speedRef.current;
          node.vx *= 0.94;
          node.vy *= 0.94;

          // Cap speed to very slow, serene motion
          const currentSpeed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          const maxSpeed = 0.32;
          // Gentle independent wander so each bubble floats on its own
          node.vx += Math.cos(now * 0.00045 + node.pulsePhase * 3) * 0.006;
          node.vy += Math.sin(now * 0.00038 + node.pulsePhase * 2) * 0.006;
          if (currentSpeed > maxSpeed && currentSpeed > 0) {
            node.vx = (node.vx / currentSpeed) * maxSpeed;
            node.vy = (node.vy / currentSpeed) * maxSpeed;
          }

          // Slow cosmic harmonic drift
          const harmonicX = Math.cos(now * 0.00015 + node.pulsePhase) * 0.02 * spd;
          const harmonicY = Math.sin(now * 0.00018 + node.pulsePhase) * 0.02 * spd;
          node.x += node.vx + harmonicX;
          node.y += node.vy + harmonicY;

          // Soft central tether keeps constellation in radar view
          const dxCenter = cx - node.x;
          const dyCenter = cy - node.y;
          node.vx += dxCenter * 0.000003 * spd;
          node.vy += dyCenter * 0.000003 * spd;

          // Containment boundaries
          const pad = node.radius + 18;
          if (node.x < pad) node.x = pad;
          if (node.x > width - pad) node.x = width - pad;
          if (node.y < pad) node.y = pad;
          if (node.y > height - pad) node.y = height - pad;

          // Soft collision relaxation
          for (const other of nodes) {
            if (other === node) continue;
            const cdx = other.x - node.x;
            const cdy = other.y - node.y;
            const dist = Math.sqrt(cdx * cdx + cdy * cdy);
            const minDist = node.radius + other.radius + 24;
            if (dist < minDist && dist > 0) {
              const push = (minDist - dist) / dist;
              node.x -= cdx * push * 0.006;
              node.y -= cdy * push * 0.006;
            }
          }
        }
      });

      // Update smaller micro connection nodes
      microNodes.forEach((mn) => {
        if (!pausedRef.current) {
          mn.vx *= 0.96;
          mn.vy *= 0.96;
          const driftX = Math.cos(now * 0.0003 + mn.phase) * 0.02;
          const driftY = Math.sin(now * 0.0003 + mn.phase) * 0.02;
          mn.x += mn.vx + driftX;
          mn.y += mn.vy + driftY;

          // Keep micro nodes close to their connected bubbles
          const p1 = nodes.find((n) => n.id === mn.connectedBubbleIds[0]);
          if (p1) {
            const dx = p1.x - mn.x;
            const dy = p1.y - mn.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 130) {
              mn.x += dx * 0.003;
              mn.y += dy * 0.003;
            }
          }
        }
      });

      // 2B. SVG Motion Trail Tracking for dynamic Radar Visual Effect
      nodes.forEach((node) => {
        let trail = nodeTrailsRef.current.get(node.id);
        if (!trail) {
          trail = [];
          nodeTrailsRef.current.set(node.id, trail);
        }
        const lastPt = trail[trail.length - 1];
        const dist = lastPt
          ? Math.sqrt((node.x - lastPt.x) ** 2 + (node.y - lastPt.y) ** 2)
          : 999;

        // Record history point if node moved or at steady 70ms intervals
        if (!lastPt || dist > 0.6 || (now - lastPt.time > 70 && dist > 0.1)) {
          trail.push({ x: node.x, y: node.y, time: now });
        }

        // Retain max 16 historical positions within 1800ms window
        const MAX_TRAIL_AGE = 1800;
        const pruned = trail.filter((pt) => now - pt.time < MAX_TRAIL_AGE);
        if (pruned.length > 16) {
          nodeTrailsRef.current.set(node.id, pruned.slice(pruned.length - 16));
        } else {
          nodeTrailsRef.current.set(node.id, pruned);
        }
      });

      // Render Dynamic SVG Trails to SVG Overlay
      const trailsGroup = trailsGroupRef.current;
      if (trailsGroup) {
        let svgTrailsHtml = '';
        nodes.forEach((node) => {
          const trail = nodeTrailsRef.current.get(node.id);
          if (!trail || trail.length < 2) return;

          // Construct smooth Catmull-Rom / midpoint Bezier spline
          let d = `M ${trail[0].x.toFixed(1)} ${trail[0].y.toFixed(1)}`;
          for (let i = 0; i < trail.length - 1; i++) {
            const pCurr = trail[i];
            const pNext = trail[i + 1];
            const midX = (pCurr.x + pNext.x) / 2;
            const midY = (pCurr.y + pNext.y) / 2;
            d += ` Q ${pCurr.x.toFixed(1)} ${pCurr.y.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
          }
          const lastPoint = trail[trail.length - 1];
          d += ` L ${lastPoint.x.toFixed(1)} ${lastPoint.y.toFixed(1)}`;

          const gradId =
            node.tier === 'Core'
              ? 'trail-grad-core'
              : node.tier === 'Extended'
              ? 'trail-grad-extended'
              : 'trail-grad-prospect';

          const isHovered = hoveredNodeId === node.id;
          const isHeld = interact.holdTargetNode === node && interact.isDown;
          const isDragged = interact.draggedNode === node;
          const isHighlighted = isHovered || isHeld || isDragged;

          const baseWidth = isHighlighted ? 3.8 : 2.5;
          const baseOpacity = isHighlighted ? 0.95 : 0.65;

          // A. Outer glowing ambient radar wake
          svgTrailsHtml += `<path d="${d}" stroke="url(#${gradId})" stroke-width="${baseWidth + 3}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${(baseOpacity * 0.35).toFixed(2)}" filter="url(#radar-trail-glow)"/>`;

          // B. High-resolution primary radar beam trail
          svgTrailsHtml += `<path d="${d}" stroke="url(#${gradId})" stroke-width="${baseWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${baseOpacity.toFixed(2)}"/>`;

          // C. Dynamic dash wake line giving radar scan texture
          svgTrailsHtml += `<path d="${d}" stroke="rgba(255,255,255,0.35)" stroke-width="1.1" stroke-dasharray="2, 4" stroke-linecap="round" fill="none" opacity="${(baseOpacity * 0.5).toFixed(2)}"/>`;

          // D. Trailing radar wake sparks along curve
          if (trail.length >= 4) {
            const p1 = trail[Math.floor(trail.length * 0.35)];
            svgTrailsHtml += `<circle cx="${p1.x.toFixed(1)}" cy="${p1.y.toFixed(1)}" r="1.4" fill="${node.ringHue}" opacity="${(baseOpacity * 0.6).toFixed(2)}"/>`;
          }
          if (trail.length >= 8) {
            const p2 = trail[Math.floor(trail.length * 0.7)];
            svgTrailsHtml += `<circle cx="${p2.x.toFixed(1)}" cy="${p2.y.toFixed(1)}" r="1.8" fill="#60A5FA" opacity="${(baseOpacity * 0.8).toFixed(2)}"/>`;
          }
        });

        trailsGroup.innerHTML = svgTrailsHtml;
      }

      // Render Dynamic SVG Radar Sweep Echoes & Bloom Ripples
      const ripplesGroup = ripplesGroupRef.current;
      if (ripplesGroup) {
        // Detect when radar sweep crosses each node's orbital radial angle
        nodes.forEach((node) => {
          const nodeAngle = (Math.atan2(node.y - cy, node.x - cx) + Math.PI * 2) % (Math.PI * 2);
          let diff = Math.abs(sweepAngle - nodeAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;

          const lastEcho = (node as any)._lastEchoTime || 0;
          if (diff < 0.05 && now - lastEcho > 3500) {
            if (!(node as any)._appearAt) (node as any)._appearAt = now;
            (node as any)._lastEchoTime = now;
            radarEchoesRef.current.push({
              id: `${node.id}-${now}`,
              nodeId: node.id,
              x: node.x,
              y: node.y,
              radius: node.radius + 2,
              maxRadius: node.radius + 36,
              color: node.ringHue,
              startTime: now,
              duration: 1200,
            });
          }
        });

        // Filter and render active echoes
        radarEchoesRef.current = radarEchoesRef.current.filter(
          (echo) => now - echo.startTime < echo.duration
        );

        let ripplesHtml = '';
        radarEchoesRef.current.forEach((echo) => {
          const elapsed = now - echo.startTime;
          const progress = elapsed / echo.duration;
          const currentRadius = echo.radius + (echo.maxRadius - echo.radius) * progress;
          const alpha = (1 - progress) * 0.6;
          ripplesHtml += `<circle cx="${echo.x.toFixed(1)}" cy="${echo.y.toFixed(1)}" r="${currentRadius.toFixed(1)}" stroke="${echo.color}" stroke-width="1.3" fill="none" opacity="${alpha.toFixed(2)}" filter="url(#radar-ripple-glow)"/>`;
          if (progress < 0.65) {
            const innerR = echo.radius + (echo.maxRadius - echo.radius) * progress * 0.55;
            ripplesHtml += `<circle cx="${echo.x.toFixed(1)}" cy="${echo.y.toFixed(1)}" r="${innerR.toFixed(1)}" stroke="rgba(255,255,255,0.7)" stroke-width="0.8" stroke-dasharray="2, 3" fill="none" opacity="${(alpha * 0.7).toFixed(2)}"/>`;
          }
        });
        ripplesGroup.innerHTML = ripplesHtml;
      }

      // 3. Draw Smaller Connections ("radar micro-connections appearing")
      microNodes.forEach((mn) => {
        // Organic life pulse (fading in and out like cosmic beacons)
        const pulse = (Math.sin(now * 0.0015 + mn.phase) + 1) / 2; // 0 to 1
        const alpha = 0.15 + pulse * 0.45;

        // Draw delicate connecting lines to parent bubbles
        mn.connectedBubbleIds.forEach((pId) => {
          const parent = nodes.find((n) => n.id === pId);
          if (parent) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(mn.x, mn.y);
            ctx.lineTo(parent.x, parent.y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha * 0.45})`;
            ctx.lineWidth = 0.8;
            ctx.setLineDash([2, 3]);
            ctx.stroke();
            ctx.restore();
          }
        });

        // Draw micro node point
        ctx.save();
        ctx.beginPath();
        ctx.arc(mn.x, mn.y, mn.radius + pulse * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha * 0.9})`;
        ctx.shadowColor = '#60A5FA';
        ctx.shadowBlur = pulse * 8;
        ctx.fill();

        // Small label that gently appears
        if (pulse > 0.45) {
          ctx.font = '8px monospace';
          ctx.fillStyle = `rgba(203, 213, 225, ${(pulse - 0.45) * 1.5})`;
          ctx.fillText(mn.label, mn.x + 6, mn.y + 3);
        }
        ctx.restore();
      });

      // 4. Draw Primary Web Connections between person bubbles
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          if (!(n1 as any)._appearAt) continue;
          const n2 = nodes[j];
          if (!(n2 as any)._appearAt) continue;
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = density === 'fullscreen' ? 240 : 195;

          if (dist < maxDist) {
            const isHighlighted =
              hoveredNodeId === n1.id ||
              hoveredNodeId === n2.id ||
              activeDossier?.member.id === n1.id ||
              activeDossier?.member.id === n2.id;

            const alpha = (1 - dist / maxDist) * (isHighlighted ? 0.9 : 0.4);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = isHighlighted
              ? `rgba(96, 165, 250, ${alpha})`
              : `rgba(61, 107, 242, ${alpha * 0.85})`;
            ctx.lineWidth = isHighlighted ? 2.4 : 1.2;
            if (isHighlighted) {
              ctx.shadowColor = '#3D6BF2';
              ctx.shadowBlur = 12;
            }
            ctx.stroke();
            ctx.restore();

            // Synaptic photon beam traveling along web line
            const t = ((now / 5200) + (i * 0.2) + (j * 0.12)) % 1;
            const px = n1.x + (n2.x - n1.x) * t;
            const py = n1.y + (n2.y - n1.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(191, 219, 254, ${alpha * 1.5})`;
            ctx.shadowColor = '#60A5FA';
            ctx.shadowBlur = 5;
            ctx.fill();
          }
        }
      }

      // 5. Click & Hold Progress Meter Calculation
      const HOLD_DURATION = 360; // ms to complete hold
      if (interact.isDown && interact.holdTargetNode && !interact.holdTriggered) {
        const elapsed = now - interact.holdStartTime;
        interact.activeHoldProgress = Math.min(1, elapsed / HOLD_DURATION);

        // If hold duration reached, open dossier info!
        if (elapsed >= HOLD_DURATION) {
          interact.holdTriggered = true;
          const target = interact.holdTargetNode;
          const member = members.find((m) => m.id === target.id);
          if (member) {
            setActiveDossier({
              member,
              x: target.x,
              y: target.y,
            });
          }
        }
      } else if (!interact.isDown) {
        interact.activeHoldProgress = 0;
      }

      // 6. Draw Person Bubbles with Real Photos & Hold Indicators
      nodes.forEach((node) => {
        const appearAt = (node as any)._appearAt;
        if (!appearAt) return;
        const appearT = appearAt === 1 ? 1 : Math.min(1, (now - appearAt) / 700);
        const appearScale = 1 - Math.pow(1 - appearT, 3);
        const isHovered = hoveredNodeId === node.id;
        const isHeldTarget = interact.holdTargetNode === node && interact.isDown;
        const breathe = Math.sin(now / 2400 + node.pulsePhase) * 0.7;
        const currentRadius = Math.max(1, (node.radius + breathe + (isHovered ? 3.5 : 0)) * appearScale);

        // A. Hold-charging circular meter (when pressing & holding this bubble)
        if (isHeldTarget && interact.activeHoldProgress > 0) {
          ctx.save();
          const meterRadius = currentRadius + 8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, meterRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * interact.activeHoldProgress);
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#3D6BF2';
          ctx.shadowBlur = 14;
          ctx.stroke();

          // Charging glow text indicator
          ctx.font = '700 9px monospace';
          ctx.fillStyle = '#60A5FA';
          ctx.textAlign = 'center';
          ctx.fillText('HOLDING FOR DOSSIER...', node.x, node.y - currentRadius - 16);
          ctx.restore();
        }

        // B. Outer Orbital Glowing Ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius + (isHovered ? 5 : 2.5), 0, Math.PI * 2);
        ctx.strokeStyle = isHovered || isHeldTarget
          ? '#60A5FA'
          : `${node.ringHue}77`;
        ctx.lineWidth = isHovered || isHeldTarget ? 2.5 : 1.5;
        ctx.shadowColor = node.ringHue;
        ctx.shadowBlur = isHovered || isHeldTarget ? 16 : 8;
        ctx.stroke();
        ctx.restore();

        // C. Base Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0E121A';
        ctx.fill();

        // D. Clip and Draw Photo
        ctx.clip();
        const img = imagesRef.current.get(node.id);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(
            img,
            node.x - currentRadius,
            node.y - currentRadius,
            currentRadius * 2,
            currentRadius * 2
          );

          // Dark rim vignette
          const innerGrad = ctx.createRadialGradient(
            node.x,
            node.y,
            currentRadius * 0.45,
            node.x,
            node.y,
            currentRadius
          );
          innerGrad.addColorStop(0, 'rgba(0,0,0,0)');
          innerGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
          ctx.fillStyle = innerGrad;
          ctx.fill();
        } else {
          ctx.fillStyle = '#1E2536';
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            node.name.split(' ').map((p) => p[0]).join(''),
            node.x,
            node.y
          );
        }
        ctx.restore();

        // Rim border
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // E. Top-Right Match Score Badge
        ctx.save();
        const badgeAngle = -Math.PI / 4;
        const badgeX = node.x + Math.cos(badgeAngle) * currentRadius;
        const badgeY = node.y + Math.sin(badgeAngle) * currentRadius;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#3D6BF2';
        ctx.fill();
        ctx.strokeStyle = '#07090C';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${node.matchScore}%`, badgeX, badgeY);
        ctx.restore();

        // F. Name & Company label below bubble
        ctx.save();
        ctx.font = isHovered ? '600 11px Inter, sans-serif' : '500 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameText = node.name;
        const metrics = ctx.measureText(nameText);
        const pillW = metrics.width + 14;
        const pillH = 18;
        const pillY = node.y + currentRadius + 14;

        ctx.beginPath();
        ctx.roundRect(node.x - pillW / 2, pillY - pillH / 2, pillW, pillH, 9);
        ctx.fillStyle = isHovered ? 'rgba(61, 107, 242, 0.95)' : 'rgba(14, 18, 26, 0.88)';
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#60A5FA' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(nameText, node.x, pillY);

        // Company label beneath name pill
        ctx.font = '400 9px Inter, sans-serif';
        ctx.fillStyle = isHovered ? '#CBD5E1' : '#9CA3AF';
        ctx.fillText(node.company, node.x, pillY + 13);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Pointer helper to find node under coordinate
    const findNodeAt = (x: number, y: number) => {
      return nodesRef.current.find(
        (n) => Math.sqrt((x - n.x) ** 2 + (y - n.y) ** 2) < n.radius + 10
      );
    };

    // Event handlers: Hover, Click & Hold, Quick Click, Drag
    const onPointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const interact = interactionRef.current;
      interact.pointerX = x;
      interact.pointerY = y;

      if (interact.isDown) {
        const moved = Math.sqrt((x - interact.startX) ** 2 + (y - interact.startY) ** 2);
        interact.dragDistance += moved;
        // If moved more than 10px, cancel hold and allow dragging!
        if (moved > 10) {
          interact.holdTargetNode = null;
          interact.activeHoldProgress = 0;
        }
      } else {
        const target = findNodeAt(x, y);
        if (target) {
          setHoveredNodeId(target.id);
          canvas.style.cursor = 'pointer';
        } else {
          setHoveredNodeId(null);
          canvas.style.cursor = 'default';
        }
      }
    };

    const onPointerDown = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const interact = interactionRef.current;
      interact.isDown = true;
      interact.startX = x;
      interact.startY = y;
      interact.dragDistance = 0;
      interact.holdStartTime = Date.now();
      interact.holdTriggered = false;

      const target = findNodeAt(x, y);
      if (target) {
        interact.draggedNode = target;
        interact.holdTargetNode = target;
      } else {
        interact.draggedNode = null;
        interact.holdTargetNode = null;
      }
    };

    const onPointerUp = () => {
      const interact = interactionRef.current;
      const heldTime = Date.now() - interact.holdStartTime;
      const wasQuickClick = heldTime < 360 && interact.dragDistance < 10;
      const clickedTarget = interact.holdTargetNode;

      // If released quickly without dragging, it's a CLICK -> open profile directly!
      if (wasQuickClick && clickedTarget && !interact.holdTriggered) {
        onSelectMember(clickedTarget.id);
      }

      interact.isDown = false;
      interact.draggedNode = null;
      interact.holdTargetNode = null;
      interact.activeHoldProgress = 0;
    };

    // Mouse listeners
    const handleMouseMove = (e: MouseEvent) => onPointerMove(e.clientX, e.clientY);
    const handleMouseDown = (e: MouseEvent) => onPointerDown(e.clientX, e.clientY);
    const handleMouseUp = () => onPointerUp();

    // Touch listeners
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => onPointerUp();

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [members, onSelectMember, density]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[420px] overflow-hidden select-none bg-[#07090C] ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Dynamic SVG Radar Motion Trails & Expanding Echo Bloom Layer */}
      <svg
        ref={svgOverlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="radar-trail-glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="radar-ripple-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="trail-grad-core" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3D6BF2" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="trail-grad-extended" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="trail-grad-prospect" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FCD34D" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* SVG Motion Trails Group */}
        <g ref={trailsGroupRef} className="radar-trails-group" />

        {/* SVG Sweep Echo Bloom Ripples Group */}
        <g ref={ripplesGroupRef} className="radar-ripples-group" />
      </svg>

      {/* Top Left Live Radar Web HUD Indicator */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-[#0E121A]/85 border border-white/10 rounded-lg px-2.5 py-1 backdrop-blur-md">
        <Radio className="w-3 h-3 text-[#3D6BF2] animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#CBD5E1]">
          Radar Web Active · {members.length} Nodes
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono text-[#60A5FA] bg-[#3D6BF2]/15 border border-[#3D6BF2]/30 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D6BF2] animate-ping" />
          SVG Trails Active
        </span>
      </div>

      {/* Bottom Center Interaction Guide */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#0A0D14]/90 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg text-[11px] font-mono text-[#9CA3AF]">
        <span className="flex items-center gap-1.5 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D6BF2]" />
          Click to open profile
        </span>
        <span className="text-white/20">|</span>
        <span className="flex items-center gap-1.5 text-[#60A5FA]">
          <Sparkles className="w-3 h-3" />
          Click & hold for info dossier
        </span>
        <span className="text-white/20 hidden sm:inline">|</span>
        <span className="hidden sm:inline text-[#9CA3AF]">
          Drag to rearrange
        </span>
      </div>

      {/* CLICK & HOLD DOSSIER CARD */}
      {activeDossier && (
        <div
          style={{
            left: Math.min(
              Math.max(activeDossier.x - 140, 16),
              (containerRef.current?.clientWidth || 800) - 310
            ),
            top: Math.min(
              Math.max(activeDossier.y - 180, 16),
              (containerRef.current?.clientHeight || 600) - 320
            ),
          }}
          className="absolute z-40 bg-[#0E121A]/98 border border-[#3D6BF2]/60 rounded-2xl p-4 shadow-2xl shadow-[#3D6BF2]/20 backdrop-blur-xl w-72 animate-in zoom-in-95 duration-150 space-y-3"
        >
          {/* Card Header with Tier, Match Score and Close */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3D6BF2]" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#60A5FA] font-bold">
                {activeDossier.member.tier ? `${activeDossier.member.tier} Tier` : 'Verified'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#3D6BF2]/20 text-[#60A5FA] font-mono text-[10px] font-bold">
                {activeDossier.member.matchScore}% Match
              </span>
              <button
                onClick={() => setActiveDossier(null)}
                className="p-1 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                title="Close Dossier"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Member Identity Details */}
          <div className="flex items-start gap-3">
            <img
              src={getPortraitForName(activeDossier.member.name, activeDossier.member.avatarUrl)}
              alt={activeDossier.member.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-[#3D6BF2]/60 shadow-md grayscale contrast-110 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-serif-editorial text-base font-bold text-white truncate">
                {activeDossier.member.name}
              </h4>
              <p className="text-xs text-[#9CA3AF] truncate">
                {activeDossier.member.title}
              </p>
              <p className="text-[11px] text-[#60A5FA] font-medium truncate">
                {activeDossier.member.company}
              </p>
            </div>
          </div>

          {/* Bio statement quote */}
          <div className="text-[11px] text-[#CBD5E1] italic bg-white/[0.03] p-2.5 rounded-lg border border-white/5 leading-relaxed line-clamp-3">
            "{activeDossier.member.bioStatement}"
          </div>

          {/* Focus Tags & Mutual connections */}
          <div className="space-y-1.5 pt-1 text-[10px]">
            <div className="flex items-center justify-between text-[#9CA3AF]">
              <span>Location:</span>
              <span className="text-white font-mono">{activeDossier.member.location}</span>
            </div>
            <div className="flex items-center justify-between text-[#9CA3AF]">
              <span>Mutual Connections:</span>
              <span className="text-white font-mono font-bold">
                {activeDossier.member.mutualConnectionsCount} mutuals
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 pt-1">
              {activeDossier.member.focusAreas.slice(0, 3).map((f, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-[#CBD5E1]"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons: Open Profile / Request Intro */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-2">
            <button
              onClick={() => {
                onSelectMember(activeDossier.member.id);
                setActiveDossier(null);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#3D6BF2] hover:bg-[#2563EB] text-white text-xs font-semibold shadow-md shadow-[#3D6BF2]/30 transition-all cursor-pointer"
            >
              <span>Open Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {onRequestIntro && (
              <button
                onClick={() => {
                  onRequestIntro(activeDossier.member);
                  setActiveDossier(null);
                }}
                className="py-2 px-2.5 rounded-lg border border-white/15 hover:border-white/30 text-white text-xs font-medium transition-colors cursor-pointer"
                title="Request Warm Introduction"
              >
                Intro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

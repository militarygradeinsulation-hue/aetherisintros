// @ts-nocheck
import React, { useState } from 'react';

interface ConstellationGraphicProps {
  variant?: 'hero-nodes' | 'world-map' | 'relationship-map';
  className?: string;
  onSelectNode?: (nodeLabel: string) => void;
}

export const ConstellationGraphic: React.FC<ConstellationGraphicProps> = ({
  variant = 'hero-nodes',
  className = '',
  onSelectNode,
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  if (variant === 'world-map') {
    // World map with interconnected tech capitals (Image 5)
    const cities = [
      { id: 'sf', name: 'San Francisco', x: 75, y: 85, count: '248' },
      { id: 'nyc', name: 'New York', x: 120, y: 78, count: '196' },
      { id: 'lon', name: 'London', x: 215, y: 62, count: '142' },
      { id: 'ber', name: 'Berlin', x: 235, y: 60, count: '76' },
      { id: 'dxb', name: 'Dubai', x: 285, y: 92, count: '64' },
      { id: 'sin', name: 'Singapore', x: 350, y: 125, count: '98' },
      { id: 'tyo', name: 'Tokyo', x: 390, y: 82, count: '52' },
      { id: 'syd', name: 'Sydney', x: 405, y: 168, count: '38' },
    ];

    return (
      <div className={`relative w-full h-[180px] bg-[#12100C]/80 rounded-lg border border-white/10 p-3 overflow-hidden ${className}`}>
        <div className="absolute top-2 left-3 text-[10px] uppercase tracking-widest text-[#9CA3AF] font-mono">
          Global Nodes & Flows
        </div>
        <svg viewBox="0 0 450 190" className="w-full h-full">
          {/* Subtle continent background shapes */}
          <path
            d="M 60 70 Q 110 50 140 80 Q 130 130 80 140 Z"
            fill="#12100C"
            opacity="0.2"
          />
          <path
            d="M 190 50 Q 250 45 260 85 Q 230 110 200 95 Z"
            fill="#12100C"
            opacity="0.2"
          />
          <path
            d="M 270 70 Q 360 60 410 90 Q 380 145 320 130 Z"
            fill="#12100C"
            opacity="0.2"
          />

          {/* Connection arcs between tech capitals */}
          <g stroke="#F5B027" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
            <path d="M 75 85 Q 98 60 120 78" />
            <path d="M 120 78 Q 165 40 215 62" />
            <path d="M 215 62 Q 225 58 235 60" />
            <path d="M 215 62 Q 250 68 285 92" />
            <path d="M 285 92 Q 320 100 350 125" />
            <path d="M 350 125 Q 380 95 390 82" />
            <path d="M 75 85 Q 240 10 390 82" stroke="#F59E0B" strokeWidth="0.8" opacity="0.4" />
          </g>

          {/* City Nodes */}
          {cities.map((city) => {
            const isHovered = activeNode === city.id;
            return (
              <g
                key={city.id}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveNode(city.id)}
                onMouseLeave={() => setActiveNode(null)}
                onClick={() => onSelectNode && onSelectNode(city.name)}
              >
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#FFC85C' : '#F5B027'}
                  className="transition-all"
                />
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={isHovered ? 12 : 7}
                  fill="#F5B027"
                  opacity={isHovered ? 0.35 : 0.15}
                  className="animate-pulse"
                />
                {isHovered && (
                  <g>
                    <rect
                      x={city.x - 45}
                      y={city.y - 28}
                      width="90"
                      height="20"
                      rx="4"
                      fill="#12100C"
                      stroke="#F5B027"
                      strokeWidth="1"
                    />
                    <text
                      x={city.x}
                      y={city.y - 14}
                      fill="#FFC85C"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {city.name} ({city.count})
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'relationship-map') {
    // Relationship Intelligence Map (Image 7) with people pictures in bubbles
    const graphNodes = [
      {
        id: 'self',
        label: 'Sarah Chen · Vercelity',
        img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
        x: 190,
        y: 120,
        type: 'self',
        r: 22,
      },
      {
        id: 'marcus',
        label: 'Marcus Lee · Horizon',
        img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
        x: 290,
        y: 160,
        type: 'key',
        r: 20,
      },
      {
        id: 'elena',
        label: 'Elena Rossi · Velora',
        img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
        x: 95,
        y: 80,
        type: 'person',
        r: 18,
      },
      {
        id: 'daniel',
        label: 'Daniel Kim · Nexus',
        img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
        x: 260,
        y: 60,
        type: 'company',
        r: 18,
      },
      {
        id: 'priya',
        label: 'Priya Desai · Aurora',
        img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
        x: 105,
        y: 175,
        type: 'person',
        r: 18,
      },
    ];

    return (
      <div className={`relative w-full h-[270px] bg-[#12100C] rounded-xl border border-white/10 p-3 overflow-hidden ${className}`}>
        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] mb-1 font-mono px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F5B027]" /> People Bubbles
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Companies
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-white bg-transparent" /> Key Relationship
            </div>
          </div>
          <span className="text-[10px] text-[#F5B027]">Interactive Graph</span>
        </div>

        <svg viewBox="0 0 380 230" className="w-full h-[225px]">
          <defs>
            {graphNodes.map((n) => (
              <pattern
                key={`pat-${n.id}`}
                id={`pat-${n.id}`}
                x="0"
                y="0"
                width="1"
                height="1"
                viewBox="0 0 100 100"
              >
                <image
                  href={n.img}
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            ))}
          </defs>

          {/* Connecting lines */}
          <g stroke="rgba(199, 133, 34,0.4)" strokeWidth="1.2">
            <line x1="190" y1="120" x2="260" y2="60" strokeDasharray="3 3" />
            <line x1="190" y1="120" x2="95" y2="80" />
            <line x1="190" y1="120" x2="290" y2="160" stroke="#F5B027" strokeWidth="2.5" />
            <line x1="190" y1="120" x2="105" y2="175" />
            <line x1="95" y1="80" x2="260" y2="60" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          </g>

          {/* Nodes with photos */}
          {graphNodes.map((n) => {
            const isSelf = n.type === 'self';
            const isKey = n.type === 'key';
            const strokeColor = isKey ? '#FFFFFF' : isSelf ? '#F5B027' : '#FFC85C';

            return (
              <g
                key={n.id}
                className="cursor-pointer group"
                onClick={() => onSelectNode && onSelectNode(n.label)}
              >
                {/* Glow ring */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 4}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isKey ? 2 : 1.5}
                  opacity={0.8}
                  className="group-hover:opacity-100 transition-opacity"
                />
                {/* Bubble with Person Picture */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={`url(#pat-${n.id})`}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth="1"
                />
                {/* Text Label */}
                <text
                  x={n.x}
                  y={n.y + n.r + 12}
                  fill="#FFC85C"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                  className="group-hover:fill-[#FFC85C] transition-colors"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Default: Hero Constellation (Image 6 & Image 3) with people portraits in bubbles
  const networkRoles = [
    {
      label: 'Sarah Chen',
      sub: 'Founders',
      img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
      x: 55,
      y: 65,
      r: 18,
    },
    {
      label: 'Marcus Lee',
      sub: 'Investors',
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
      x: 140,
      y: 25,
      r: 19,
    },
    {
      label: 'Daniel Kim',
      sub: 'Operators',
      img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
      x: 225,
      y: 60,
      r: 17,
    },
    {
      label: 'Elena Rossi',
      sub: 'Partners',
      img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
      x: 225,
      y: 145,
      r: 18,
    },
    {
      label: 'Priya Desai',
      sub: 'Advisors',
      img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
      x: 60,
      y: 150,
      r: 17,
    },
  ];

  return (
    <div className={`relative w-full max-w-[320px] aspect-square flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 280 220" className="w-full h-full select-none">
        <defs>
          {networkRoles.map((role, idx) => (
            <pattern
              key={`hero-pat-${idx}`}
              id={`hero-pat-${idx}`}
              x="0"
              y="0"
              width="1"
              height="1"
              viewBox="0 0 100 100"
            >
              <image
                href={role.img}
                x="0"
                y="0"
                width="100"
                height="100"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          ))}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5B027" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F5B027" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="140" cy="105" r="90" fill="url(#centerGlow)" />

        {/* Orbit Rings */}
        <circle cx="140" cy="105" r="75" fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
        <circle cx="140" cy="105" r="45" fill="none" stroke="rgba(199, 133, 34,0.15)" />

        {/* Radiating Lines to Center */}
        <g stroke="rgba(199, 133, 34,0.4)" strokeWidth="1.2">
          {networkRoles.map((role, idx) => (
            <line
              key={idx}
              x1="140"
              y1="105"
              x2={role.x}
              y2={role.y}
              className="transition-all duration-300"
            />
          ))}
          {/* Ring connections */}
          <line x1="55" y1="65" x2="140" y2="25" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          <line x1="140" y1="25" x2="225" y2="60" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          <line x1="225" y1="60" x2="225" y2="145" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          <line x1="225" y1="145" x2="60" y2="150" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
          <line x1="60" y1="150" x2="55" y2="65" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" />
        </g>

        {/* Central Aetheris Delta Icon */}
        <g transform="translate(128, 93)">
          <polygon
            points="12,0 24,24 0,24"
            fill="#F5B027"
            className="filter drop-shadow-[0_0_8px_#F5B027]"
          />
          <polygon points="12,6 20,22 4,22" fill="#12100C" />
        </g>

        {/* Connection Bubbles with People Pictures */}
        {networkRoles.map((role, idx) => {
          const isHovered = activeNode === role.label;
          return (
            <g
              key={idx}
              className="cursor-pointer group"
              onMouseEnter={() => setActiveNode(role.label)}
              onMouseLeave={() => setActiveNode(null)}
              onClick={() => onSelectNode && onSelectNode(role.label)}
            >
              {/* Outer glowing halo ring */}
              <circle
                cx={role.x}
                cy={role.y}
                r={role.r + (isHovered ? 5 : 2.5)}
                fill="none"
                stroke={isHovered ? '#FFC85C' : '#F5B027'}
                strokeWidth={isHovered ? 2.5 : 1.5}
                opacity={0.8}
                className="transition-all"
              />
              {/* Photo inside bubble */}
              <circle
                cx={role.x}
                cy={role.y}
                r={role.r}
                fill={`url(#hero-pat-${idx})`}
                stroke="rgba(0,0,0,0.7)"
                strokeWidth="1"
              />
              {/* Text Label */}
              <text
                x={role.x}
                y={role.y + (role.y > 105 ? role.r + 12 : -role.r - 4)}
                fill={isHovered ? '#FFFFFF' : '#FFC85C'}
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                className="transition-colors tracking-wide"
              >
                {role.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import { NetworkMember } from '../../networkData';

const NODE_POSITIONS: [number, number][] = [
  [16, 22], [40, 12], [74, 16], [87, 44],
  [78, 74], [52, 86], [24, 78], [11, 52],
  [33, 40], [64, 36], [60, 64], [36, 62],
];

const TAXONOMY = [
  'PEOPLE', 'COMPANIES', 'NEEDS', 'MESSAGES',
  'INTRODUCTIONS', 'DECISIONS', 'INTERESTS', 'COMMITMENTS',
];

interface RelationshipFieldGraphProps {
  members: NetworkMember[];
  onSelectMember: (memberId: string) => void;
  limit?: number;
  className?: string;
}

/**
 * Concentric relationship field: the signed-in member at the origin, every
 * potential fit plotted as a node with its own signal strength.
 */
export const RelationshipFieldGraph: React.FC<RelationshipFieldGraphProps> = ({
  members,
  onSelectMember,
  limit = 8,
  className = '',
}) => {
  const fits = useMemo(
    () =>
      [...members]
        .filter((member) => member.matchScore >= 25)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit),
    [members, limit],
  );

  return (
    <div className={`memory-graph compact ${className}`.trim()}>
      <div className="graph-live-status">
        <span className="live-dot" />
        {fits.length} POTENTIAL FITS
      </div>

      <div className="graph-rings">
        <i />
        <i />
        <i />
      </div>
      <div className="graph-lines" />

      <button className="graph-origin" aria-label="Your current context">
        <Eye size={18} />
        <small>YOU</small>
      </button>

      {fits.map((member, i) => {
        const pos = NODE_POSITIONS[i % NODE_POSITIONS.length] ?? [50, 50];
        return (
          <button
            key={member.id}
            className={`graph-node ${i === 0 ? 'selected' : ''} ${member.matchScore >= 85 ? 'signal' : ''}`}
            style={{
              left: `${pos[0]}%`,
              top: `${pos[1]}%`,
              animationDelay: `${i * 120}ms`,
            }}
            onClick={() => onSelectMember(member.id)}
            title={`${member.matchScore}% fit · ${member.title}`}
            aria-label={`Open ${member.name}'s profile, ${member.matchScore} percent fit`}
          >
            <i />
            <span>
              {member.name.split(' ')[0]}
              <b>{member.matchScore}</b>
            </span>
            <small>{member.title}</small>
          </button>
        );
      })}

      <div className="graph-taxonomy">
        {TAXONOMY.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
};

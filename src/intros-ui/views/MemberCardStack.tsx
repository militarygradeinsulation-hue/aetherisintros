import { useState, type CSSProperties } from 'react';
import type { NetworkMember } from '@/intros-ui/networkData';

/** The supplied card-stack interaction, backed by the existing member directory. */
export function MemberCardStack({ members, live, onOpen }: {
  members: NetworkMember[];
  live: boolean;
  onOpen: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cards = members.slice(0, 3);
  // Resolve against current props so a refreshed directory cannot leave a stale profile.
  const selected = cards.find(member => member.id === selectedId) ?? cards[0];
  if (!selected) return <p>{live ? 'No members available in your directory yet.' : 'No showcase members available.'}</p>;
  const order = [...cards.filter(member => member.id !== selected.id), selected];
  return <div className="ledger-member-stack" data-no-drag>
    <div className="ledger-member-stack-label"><span>{live ? 'Your directory' : 'Showcase directory'}</span><span>{members.length} members</span></div>
    <div className="ledger-member-stack-cards" style={{ '--stack-count': order.length } as CSSProperties} role="group" aria-label="Featured member cards">
      {order.map((member, index) => <button key={member.id} type="button"
        className="ledger-member-stack-card" aria-pressed={member.id === selected.id}
        aria-label={`Select ${member.name}`} onClick={() => setSelectedId(member.id)}
        style={{ '--stack-index': index } as CSSProperties}>
        <span className="ledger-member-stack-name"><span aria-hidden="true">{member.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><strong>{member.name}</strong></span>
        <span className="ledger-member-stack-role">{member.title}<br/>{member.company}</span>
      </button>)}
    </div>
    <div className="ledger-member-stack-detail" aria-live="polite">
      <span><strong>{selected.name}</strong><small>{selected.title} · {selected.company}</small></span>
      <button type="button" onClick={() => onOpen(selected.id)}>View profile<span className="sr-only"> of {selected.name}</span></button>
    </div>
  </div>;
}

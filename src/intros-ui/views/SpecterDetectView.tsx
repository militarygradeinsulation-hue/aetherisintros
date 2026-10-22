import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { AetherisWorkspaceShell } from '../components/layout/AetherisWorkspaceShell';
import { SpecterDetectPanel } from '@/features/specter-detect/SpecterDetectPanel';
import type { ActivePage } from '../components/layout/TopNavigation';
import './specter-app.css';

interface Props {
  onNavigate: (page: ActivePage) => void;
  onWorkspace: (page: string) => void;
  onSearch: (query: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  member?: { name: string; avatarUrl?: string } | null;
  notifications?: ReactNode;
  /** Render content only; the surrounding app already provides the shared shell. */
  embedded?: boolean;
}

function SpecterContent() {
  const [help, setHelp] = useState(false);
  return <>
    <div className="specter-how">
      <button type="button" onClick={() => setHelp(open => !open)} aria-expanded={help}>
        <CircleHelp size={17}/> How it works
      </button>
    </div>
    {help && <section className="specter-help">
      <h2>Investigate a public company website</h2>
      <p>Enter a URL and scan to collect public evidence. The interactive view lets you use the website where it permits embedding; sites that block frames must be opened in a separate browser tab. Scanned evidence remains separate from live navigation.</p>
      <button type="button" onClick={() => setHelp(false)}>Close help</button>
    </section>}
    <SpecterDetectPanel/>
  </>;
}

/** Specter now occupies the same navigable shell as the rest of Ask Intros. */
export function SpecterDetectView({ onNavigate, onWorkspace, onSearch, searchQuery, onSearchChange, member, notifications, embedded = false }: Props) {
  if (embedded) return <SpecterContent/>;
  return <AetherisWorkspaceShell
    activePage="specter" onNavigate={onNavigate} onWorkspace={onWorkspace}
    onSearch={onSearch} searchQuery={searchQuery} onSearchChange={onSearchChange} member={member} notifications={notifications}
  >
    <SpecterContent/>
  </AetherisWorkspaceShell>;
}

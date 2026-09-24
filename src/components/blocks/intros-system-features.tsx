import { BadgeCheck, BrainCircuit, CalendarRange, Database, Fingerprint, Grid3X3, LockKeyhole, Network } from 'lucide-react'

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { Card, CardContent } from '@/components/ui/card'
import { useOps } from '@/aetheris/crm/store'
import { useNetwork } from '@/aetheris/store'

const capabilities = [
  { title: 'Private by default', description: 'Verified executive trust, double opt-in introductions, and private viewer context protect every relationship.', icon: LockKeyhole },
  { title: 'Relationship intelligence', description: 'People, timing, trust paths, commitments, and opportunity signals stay connected.', icon: Network },
  { title: 'Why Me · Why Them · Why Now', description: 'Every recommendation explains mutual value, credible fit, and the evidence behind its timing.', icon: Fingerprint },
  { title: 'Active Memory', description: 'Conversations, promises, changes, and open loops remain available when the next decision is made.', icon: BrainCircuit },
  { title: 'One connected system', description: 'CRM, Grid, Calendar, and Forecast work from the same canonical business records.', icon: Database },
  { title: 'CEO operating intelligence', description: 'The Executive Brief turns relationship and operating records into a focused list of consequential moves.', icon: BadgeCheck },
]

export function IntrosSystemFeatures({ compact = false }: { compact?: boolean }) {
  const net = useNetwork()
  const ops = useOps()
  const facts = [
    { value: net.connections.length, label: 'connected relationships', icon: Network },
    { value: ops.opportunities.filter(item => !item.archived && item.status === 'open').length, label: 'active opportunities', icon: Grid3X3 },
    { value: ops.tasks.filter(item => item.status !== 'done' && item.status !== 'cancelled').length, label: 'open commitments and tasks', icon: CalendarRange },
  ]

  return <section className={`intros-system-features ${compact ? 'is-compact' : ''}`}>
    <header><span>ONE CONNECTED SYSTEM</span><h2>Context becomes useful when every record works together.</h2><p>Ask Intros keeps the professional network familiar while the relationship operating system stays quietly underneath.</p></header>
    <BentoGrid className="intros-feature-bento md:grid-cols-6">
      {capabilities.map((capability, index) => {
        const Icon = capability.icon
        const fact = facts[index]
        return <BentoGridItem key={capability.title} className={index < 2 ? 'md:col-span-3' : 'md:col-span-2'}
          header={<Card className="intros-feature-visual"><CardContent><Icon size={24} />{fact ? <strong>{fact.value}<small>{fact.label}</small></strong> : <i aria-hidden="true" />}</CardContent></Card>}
          icon={<Icon size={16} />} title={capability.title} description={capability.description} />
      })}
    </BentoGrid>
  </section>
}
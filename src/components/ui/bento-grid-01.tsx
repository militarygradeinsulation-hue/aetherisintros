import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Lock, Smartphone } from 'lucide-react'

/* Ask Intros bento grid — obsidian ground, graphite cards, hairline borders,
   cobalt for action, amber only as an intelligence signal. */

const CARD =
  'group relative overflow-hidden rounded-[14px] border border-white/10 bg-[#12100C] p-7 transition-colors hover:border-white/20'

function TypeTester() {
  const [big, setBig] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setBig((v) => !v), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex h-36 items-center justify-center">
      <motion.span
        animate={{ scale: big ? 1.5 : 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="font-serif text-6xl text-[#F1EFE9]"
      >
        Aa
      </motion.span>
    </div>
  )
}

function LayoutAnimation() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((v) => (v + 1) % 3), 2500)
    return () => clearInterval(t)
  }, [])
  const cols = ['grid-cols-2', 'grid-cols-3', 'grid-cols-1'][step]
  return (
    <div className="flex h-28 items-center">
      <div className={`grid w-full gap-2 ${cols}`}>
        {[1, 2, 3].map((i) => (
          <motion.i
            key={i}
            layout
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="block h-10 rounded-md border border-white/10 bg-[#12100C]"
          />
        ))}
      </div>
    </div>
  )
}

function SpeedIndicator() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex h-28 flex-col justify-center gap-3">
      <span className="font-serif text-4xl text-[#F1EFE9]">
        {loading ? '—' : '100ms'}
      </span>
      <span className="text-[13px] tracking-[0.18em] text-[#9EA4AC] uppercase">Load time</span>
      <div className="h-[3px] w-full rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: loading ? '30%' : '100%' }}
          transition={{ duration: 1 }}
          className="h-full rounded-full bg-[#C78522]"
        />
      </div>
    </div>
  )
}

function SecurityBadge() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setCount((c) => (c + 1) % 4), 800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex h-28 items-center gap-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: i < count ? 1 : 0.25 }}
          className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-[#12100C]"
        >
          <Lock size={16} className={i < count ? 'text-[#F4A125]' : 'text-[#9EA4AC]'} />
        </motion.span>
      ))}
    </div>
  )
}

function GlobalNetwork() {
  return (
    <div className="relative h-36 overflow-hidden rounded-md border border-white/10 bg-[#12100C]">
      <Globe size={110} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/10" />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.i
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
          className="absolute block h-[3px] w-[3px] rounded-full bg-[#F4A125]"
          style={{ left: `${18 + i * 16}%`, top: `${30 + (i % 3) * 18}%` }}
        />
      ))}
    </div>
  )
}

type Tile = {
  eyebrow?: string
  title: string
  copy: string
  visual: React.ReactNode
  span?: string
}

const tiles: Tile[] = [
  {
    eyebrow: 'Typography',
    title: 'Type that stays readable',
    copy: 'Editorial scale for names and headlines, clear interface text everywhere else.',
    visual: <TypeTester />,
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    eyebrow: 'Layouts',
    title: 'One adaptive workspace',
    copy: 'Social View, CRM, Grid and Calendar over a single relationship graph.',
    visual: <LayoutAnimation />,
    span: 'md:col-span-2',
  },
  {
    eyebrow: 'Network',
    title: 'Relationship network',
    copy: 'Verified members, mutual context and the shortest warm path to anyone.',
    visual: <GlobalNetwork />,
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    eyebrow: 'Why now',
    title: 'Timing you can act on',
    copy: 'Signals surface the moment an introduction is worth making.',
    visual: <SpeedIndicator />,
    span: 'md:col-span-2',
  },
  {
    eyebrow: 'Trust by design',
    title: 'Private by default',
    copy: 'Verified membership, double opt-in introductions, nothing sold or scraped.',
    visual: <SecurityBadge />,
    span: 'md:col-span-3',
  },
  {
    eyebrow: 'Anywhere',
    title: 'Ready wherever you lead',
    copy: 'The same clear workspace on a desk or in a car park between meetings.',
    visual: (
      <div className="flex h-28 items-center gap-4 text-[#9EA4AC]">
        <Smartphone size={30} />
        <div className="h-16 w-28 rounded-md border border-white/10 bg-[#12100C]" />
      </div>
    ),
    span: 'md:col-span-3',
  },
]

export function BentoGrid() {
  return (
    <section className="bg-[#12100C] px-6 py-20 md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] tracking-[0.22em] text-[#9EA4AC] uppercase">One connected system</p>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-[#F1EFE9] md:text-5xl">
          Built around the way relationships <span className="text-[#C78522]">actually move.</span>
        </h2>
        <div className="mt-12 grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 md:grid-cols-6">
          {tiles.map((tile) => (
            <motion.article
              key={tile.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className={`${CARD} ${tile.span ?? ''}`}
            >
              {tile.visual}
              <div className="mt-6 border-t border-white/10 pt-5">
                {tile.eyebrow ? (
                  <p className="text-[12px] tracking-[0.2em] text-[#F4A125] uppercase">{tile.eyebrow}</p>
                ) : null}
                <h3 className="mt-2 font-serif text-2xl text-[#F1EFE9]">{tile.title}</h3>
                <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-[#9EA4AC]">{tile.copy}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BentoGrid

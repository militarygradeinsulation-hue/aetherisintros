import { useMoat } from '../moat-store'
import { Eyebrow, Head } from '../ui'
import { SerendipityCard } from '../moat-ui'
import { rankSerendipity } from '../domain/moat-engine'

export function SerendipityPage() {
  const moat = useMoat()
  const ranked = rankSerendipity(moat.serendipity)

  return <>
    <Head
      label="UNEXPECTEDLY RELEVANT"
      title="The people no algorithm would obviously suggest."
      copy="Similarity is easy and mostly useless. This surface looks for non-obvious relevance — a problem shape you both share, a constraint you have already solved, an adjacent market, timing that briefly aligns — and it always tells you why it might be wrong."
      proof="Every suggestion carries its basis, its uncertainty and its evidence"
    />

    <section className="serendipity-grid">
      {ranked.map(match => <SerendipityCard key={match.id} match={match} />)}
      {!ranked.length && <p className="quiet-empty">Nothing unexpected right now. Aetheris would rather say nothing than manufacture a coincidence.</p>}
    </section>

    <section className="teach-block">
      <div><Eyebrow>WHY UNCERTAINTY IS SHOWN</Eyebrow>
        <h2>Honesty first, with open clarity.</h2>
        <p>A confident recommendation with hidden reasoning is a sales tactic. Aetheris shows the basis, the mutual value, the timing and the part it is unsure about — so you can disagree with it. Marking something not relevant teaches Active Memory and changes future suggestions.</p></div>
    </section>
  </>
}

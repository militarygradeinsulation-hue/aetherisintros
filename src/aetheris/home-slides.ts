import slide01 from '@/assets/home-slide-01.jpg.asset.json'
import slide02 from '@/assets/home-slide-02.jpg.asset.json'
import slide03 from '@/assets/home-slide-03.jpg.asset.json'
import slide04 from '@/assets/home-slide-04.jpg.asset.json'
import slide05 from '@/assets/home-slide-05.jpg.asset.json'
import slide06 from '@/assets/home-slide-06.jpg.asset.json'
import slide07 from '@/assets/home-slide-07.jpg.asset.json'
import slide08 from '@/assets/home-slide-08.jpg.asset.json'
import slide09 from '@/assets/home-slide-09.jpg.asset.json'
import slide10 from '@/assets/home-slide-10.jpg.asset.json'

export interface HomeSlide {
  src: string
  alt: string
}

/** Member-supplied Ask Intros brand graphics, shown in order in the homepage hero. */
export const HOME_SLIDES: HomeSlide[] = [
  { src: slide01.url, alt: 'Ask Intros — the only social platform that runs your business.' },
  { src: slide02.url, alt: 'No time. Busy work. Overtime. Missed moments.' },
  { src: slide03.url, alt: 'Bad systems. Too many tools. Spreadsheets. A CRM that does not talk to the rest.' },
  { src: slide04.url, alt: 'Poor communication. Poor handoffs. Weak branding. Opportunities lost.' },
  { src: slide05.url, alt: 'Replace the chaos. One system. Everything connected.' },
  { src: slide06.url, alt: 'Your AI butler: know what to do, who to meet, when to follow up.' },
  { src: slide07.url, alt: 'Work anywhere. More time for what matters.' },
  { src: slide08.url, alt: 'More time. Work smarter. Be there more.' },
  { src: slide09.url, alt: 'Real people. Real connections. Real opportunities. A social platform built for business.' },
  { src: slide10.url, alt: 'Ask Intros — a social platform built for business.' },
]

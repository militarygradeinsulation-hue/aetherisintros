"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";

type MarkerProps = { src: string; top: number; offset: number; delay: number };

function Marker({ src, top, offset, delay }: MarkerProps) {
  return (
    <motion.div
      variants={{
        idle: { scale: 0.9, opacity: 0.9, rotate: 0, y: 0 },
        active: { y: [-16, 0, 3, 0], scale: [0.9, 1.08, 1], opacity: 1 },
      }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      style={{ "--offset": `${offset}px`, top } as CSSProperties}
      className="absolute left-[calc(50%+var(--offset))] size-[38px] drop-shadow-[0_3px_3px_rgba(0,0,0,.5)]"
    >
      <svg fill="none" viewBox="0 0 38 38" className="absolute size-full">
        <path
          d="M29.607 5.193c5.858 5.857 5.858 15.355 0 21.213l-9.9 9.9-.707.706-.708-.708-9.899-9.898c-5.857-5.858-5.857-15.356 0-21.213 5.858-5.858 15.356-5.858 21.214 0Z"
          fill="rgba(0,0,0,.38)"
        />
        <path
          d="m28.9 25.698-9.9 9.9-9.9-9.9C3.634 20.232 3.634 11.367 9.1 5.9 14.569.432 23.433.432 28.9 5.9c5.467 5.468 5.467 14.332 0 19.8Z"
          fill="#F4F0EC" stroke="#B5541F" strokeWidth="1.2"
        />
      </svg>
      <img alt="" src={src} loading="lazy" decoding="async"
        className="absolute left-[7px] top-[4px] size-6 rounded-full object-cover"
      />
    </motion.div>
  );
}

/** A decorative networking illustration, not a geographical depiction of members. */
export function Map() {
  return (
    <motion.div initial="idle" whileHover="active" whileTap="active"
      variants={{ idle: {}, active: {} }}
      aria-hidden="true" className="relative h-full min-h-[210px] w-full overflow-hidden bg-[#080909]"
    >
      <div className="absolute inset-0 bg-no-repeat opacity-75"
        style={{
          backgroundImage: "url(https://cdn.21st.dev/assets/localized/f2a04222035a445668558f781cecc04117ed2be06b3cc84f223ed8d64e00e44e.png)",
          backgroundSize: "530px 430px",
          backgroundPosition: "center -75px",
          filter: "grayscale(1) invert(1) brightness(.65)",
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0">
        <Marker src="https://cdn.21st.dev/assets/mirror/3b/3bd35e4b23dc0e86d55a283bb35d2b39ebc48b5d82cb4a7b00c0d9277190a4d5.png" top={55} offset={-128} delay={0.15} />
        <Marker src="https://cdn.21st.dev/assets/mirror/60/60d2a9597f10689aa210315374f22dd1f20826d1081470c6fcccfc95a1c991e1.png" top={98} offset={-16} delay={0.4} />
        <Marker src="https://cdn.21st.dev/assets/mirror/c5/c501ce46887ccabf2f8a7ddcfe2c853b040b18f09c9343fa317807464097fa20.png" top={78} offset={96} delay={0.3} />
        <Marker src="https://cdn.21st.dev/assets/mirror/b1/b18f884da799506ad4cb2147714c1ade3cf0221e8e2bfae16120e6dd0554df3c.png" top={145} offset={64} delay={0.6} />
        <Marker src="https://cdn.21st.dev/assets/mirror/de/ded43697f57462095e6733dfc44264f8fc381165785464079aa3ee653b0c447f.png" top={172} offset={-32} delay={0.8} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080909] via-transparent to-transparent" />
    </motion.div>
  );
}

export default Map;

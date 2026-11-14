import "./LovablePartnerSpotlight.css";

/** Official Lovable profile used by every Aetheris site. */
export const AETHERIS_LOVABLE_REFERRAL_URL = "https://lovable.dev/@theonlyarchitect";

type LovablePartnerSpotlightProps = {
  compact?: boolean;
};

/** One linked graphic replaces the former badge, poster and referral QR group. */
export function LovablePartnerSpotlight({ compact = false }: LovablePartnerSpotlightProps) {
  const linkProps = {
    href: AETHERIS_LOVABLE_REFERRAL_URL,
    target: "_blank",
    rel: "noopener noreferrer",
  };

  return (
    <aside
      className={"lv-partner-2026" + (compact ? " lv-partner-2026--compact" : "")}
      aria-label="Lovable Expert Partner 2026"
    >
      <a
        {...linkProps}
        className="lv-partner-2026__desktop"
        aria-label="Hire Aetheris Technology. View our Lovable Expert Partner profile."
      >
        <img
          src="/partner/lovable-expert-aetheris-banner.svg"
          width={2508}
          height={627}
          alt="Lovable Expert Partner ’26. Hire Aetheris Technology. Profile QR code."
          loading="eager"
          decoding="async"
        />
      </a>
      <a
        {...linkProps}
        className="lv-partner-2026__mobile"
        aria-label="Hire Aetheris Technology. View our Lovable profile."
      >
        <span className="lv-partner-2026__headline">
          <span>Lovable <b>Expert</b></span>
          <strong>Partner ’26</strong>
        </span>
        <span className="lv-partner-2026__hire">Hire Aetheris Technology</span>
        <img
          src="/partner/lovable-profile-qr.svg"
          width={160}
          height={160}
          alt="Scan the QR code for the Aetheris Technology Lovable profile"
          loading="eager"
          decoding="async"
        />
      </a>
    </aside>
  );
}

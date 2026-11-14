import "./LovablePartnerSpotlight.css";

export const AETHERIS_LOVABLE_REFERRAL_URL = "https://lovable.dev/?partner_ref=499V5382";

type LovablePartnerSpotlightProps = {
  compact?: boolean;
};

/** Public, first-party-hosted 2026 partner artwork and exact referral link. */
export function LovablePartnerSpotlight({ compact = false }: LovablePartnerSpotlightProps) {
  const linkProps = {
    href: AETHERIS_LOVABLE_REFERRAL_URL,
    target: "_blank",
    rel: "sponsored noopener noreferrer",
  };

  return (
    <aside className={"lv-partner-2026" + (compact ? " lv-partner-2026--compact" : "")} aria-labelledby="lv-partner-2026-title">
      <div className="lv-partner-2026__inner">
        <div className="lv-partner-2026__copy">
          <p className="lv-partner-2026__eyebrow">AETHERIS TECHNOLOGY / LOVABLE PARTNER 2026</p>
          <a {...linkProps} className="lv-partner-2026__badge" aria-label="View the Lovable partner referral offer">
            <img src="/partner/lovable-certified-partner.webp" width={450} height={152} alt="Lovable Certified Partner 2026" decoding="async" />
          </a>
          <h2 id="lv-partner-2026-title">Build something. <span>Start with 10 bonus credits.</span></h2>
          <p className="lv-partner-2026__description">New to Lovable? Use my partner link for 10 bonus credits. Ask about the other benefits available through Aetheris.</p>
          <a {...linkProps} className="lv-partner-2026__cta">Get 10 free credits <span aria-hidden="true">↗</span></a>
          <p className="lv-partner-2026__terms">Partner referral. Bonus credits apply to eligible new users under Lovable's current terms. Other benefits may vary.</p>
        </div>
        <div className="lv-partner-2026__visuals">
          <a {...linkProps} className="lv-partner-2026__poster" aria-label="Open Lovable through the Aetheris partner link">
            <img src="/partner/lovable-aetheris-announcement.webp" width={360} height={360} alt="Lovable Expert 2026 announcement with Aetheris Technology" loading="eager" decoding="async" />
          </a>
          <div className="lv-partner-2026__qr-group">
            <a {...linkProps} className="lv-partner-2026__qr" aria-label="Open the referral link shown in the QR code">
              <img src="/partner/lovable-referral-qr.svg" width={220} height={220} alt="QR code for the Aetheris Lovable partner referral" loading="eager" decoding="async" />
            </a>
            <p>Scan to use my link.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

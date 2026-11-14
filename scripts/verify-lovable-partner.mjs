import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const entry = process.argv[2] || "src/aetheris/Landing.tsx";
const component = readFileSync(resolve("src/components/LovablePartnerSpotlight.tsx"), "utf8");
const css = readFileSync(resolve("src/components/LovablePartnerSpotlight.css"), "utf8");
const page = readFileSync(resolve(entry), "utf8");
const banner = readFileSync(resolve("public/partner/lovable-expert-aetheris-banner.svg"), "utf8");
const qr = readFileSync(resolve("public/partner/lovable-profile-qr.svg"), "utf8");
const profile = "https://lovable.dev/@theonlyarchitect";

assert.ok(component.includes(profile), "banner must link to the selected Lovable profile");
assert.ok(component.includes('rel: "noopener noreferrer"'), "outbound links need safe rel attributes");
assert.ok(component.includes("/partner/lovable-expert-aetheris-banner.svg"), "unified banner missing");
assert.ok(component.includes("/partner/lovable-profile-qr.svg"), "mobile QR missing");
assert.ok(!component.includes("lovable-certified-partner.webp"), "old certified badge remains");
assert.ok(!component.includes("lovable-aetheris-announcement.webp"), "old announcement remains");
assert.ok(!component.includes("10 bonus credits"), "old marketing section remains");
assert.ok(page.includes("<LovablePartnerSpotlight"), "top-of-site component missing");
assert.ok(css.includes(".lv-partner-2026--compact"), "compact workspace layout missing");
assert.ok(css.includes("@media(max-width:600px)"), "mobile layout missing");
assert.ok(banner.includes("Lovable Expert Partner 2026"), "banner heading is missing");
assert.ok(banner.includes("Hire Aetheris Technology"), "banner CTA is missing");
assert.ok(banner.includes(profile), "banner QR destination does not match profile");
assert.ok(qr.includes(profile), "QR destination does not match profile");
console.log("PASS: one unified Lovable Expert banner, profile link, QR and responsive placements");

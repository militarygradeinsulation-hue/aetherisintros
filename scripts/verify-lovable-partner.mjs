import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const entry = process.argv[2] || "src/routes/index.tsx";
const expectedSha = {
  "lovable-certified-partner.webp": "6ec8a7a6abbaeb324093b907922a79d89edef29f",
  "lovable-aetheris-announcement.webp": "eed48921aab22564d403b2bfdf309aa3a490795f",
  "lovable-referral-qr.svg": "2ce441bc485956f691d0142969e64d411ddd481e",
};
function gitSha(content) {
  return createHash("sha1").update("blob " + content.length + "\0").update(content).digest("hex");
}
for (const [name, sha] of Object.entries(expectedSha)) {
  const bytes = readFileSync(resolve("public/partner", name));
  assert.equal(gitSha(bytes), sha, name + " must match the original artwork or QR");
}
const component = readFileSync(resolve("src/components/LovablePartnerSpotlight.tsx"), "utf8");
const css = readFileSync(resolve("src/components/LovablePartnerSpotlight.css"), "utf8");
const page = readFileSync(resolve(entry), "utf8");
assert.ok(component.includes('https://lovable.dev/?partner_ref=499V5382'), "wrong referral URL");
assert.ok(component.includes('rel: "sponsored noopener noreferrer"'), "outbound links must be marked sponsored");
assert.ok(component.includes('10 bonus credits'), "offer not shown");
assert.ok(component.includes('eligible new users'), "eligibility disclosure missing");
assert.ok(component.includes('/partner/lovable-referral-qr.svg'), "QR not embedded");
assert.ok(page.includes('import { LovablePartnerSpotlight } from "@/components/LovablePartnerSpotlight";'), "missing component import");
assert.ok(page.includes("<LovablePartnerSpotlight"), "component missing from homepage");
assert.ok(css.includes("@media(max-width:480px)"), "mobile layout missing");
console.log("PASS: Lovable partner artwork, QR, referral link and homepage placement verified.");

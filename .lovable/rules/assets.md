---
description: "Brand assets shipped by the Ask Intros design system (logos, icons, illustrations, photography, fonts, videos) with exact import paths. Read before adding any logo, icon, illustration, image, video, or font to the app: use these real assets instead of placeholders, stock photos, or generated images."
---

# Ask Intros — Assets

These files are copied into `src/design-system/{slug}/assets/` in this project — never generate, placeholder, or substitute an asset that exists here.

Raw files import directly, e.g. `import logo from "@/design-system/{slug}/assets/logos/logo.svg"`.
R2 pointer files (`.asset.json`) are imported as JSON — use the `url` property, e.g. `import hero from "@/design-system/{slug}/assets/hero.png.asset.json"` then `<img src={hero.url} />`.
The full machine-readable catalog lives in this library's `design-system.json` (`assets` array).

## Logos

- `@/design-system/{slug}/assets/aetheris-logo.jpg.asset.json` (jpg, R2 pointer)

## Videos

- `@/design-system/{slug}/assets/aetheris-intro-video.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/aetheris-intros-overview.mp4.asset.json` (mp4, R2 pointer)

## Images

- `@/design-system/{slug}/assets/aetheris-editorial-portrait.jpg` (jpg)
- `@/design-system/{slug}/assets/aetheris-home-portrait.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/aetheris-world-network.jpg` (jpg)
- `@/design-system/{slug}/assets/editorial-discover.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/editorial-insights.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/editorial-intros.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/editorial-memory.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/editorial-messages.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/editorial-needs.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/member-elliot.jpg` (jpg)
- `@/design-system/{slug}/assets/member-marcus.jpg` (jpg)
- `@/design-system/{slug}/assets/member-priya.jpg` (jpg)
- `@/design-system/{slug}/assets/member-sarah.jpg` (jpg)
- `@/design-system/{slug}/assets/one-connected-system.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-joseph.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p1-natural.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p1.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p10.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p12.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p13.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p15.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p16.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p17.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p18.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p19.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p2-natural.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p2.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p20.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p21.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p22.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p23.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p24.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p3-natural.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p3.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p4.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p5.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p6.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/member-p9.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-01.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-02.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-03.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-04.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-05.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-06.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-07.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-08.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-09.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-10.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-11.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/portraits/portrait-12.jpg.asset.json` (jpg, R2 pointer)
- …and 15 more — full list in `design-system.json`


# Supplied component adaptations — October 22, 2026

The seven supplied files and inline PDF viewer are references for the existing Ask Intros product. No new CRM, account, metrics, document store or permission model is introduced.

| Reference | Adaptation |
| --- | --- |
| Pasted text(10).txt — analytics bento | Compact owner metric tiles and membership/activity selector in the existing authorized overview. Snapshot counts only; no invented revenue, growth, seasonality or prior-period series. |
| Pasted text (2)(6).txt — Web3 bento | Quiet card edges, featured tile, pill selectors and numeric hierarchy. Wallets, tokens, yields and seeded portfolio histories are excluded. |
| Pasted text (3)(3).txt — animated beams | Resize-aware curved SVG paths behind the existing connection check results. Only successful reads receive a brief beam animation; errors keep their real states. Motion stops under reduced-motion preferences; narrow screens use plain cards. |
| Pasted text (4)(2).txt — ink hero | Restrained card-transition easing and editorial hierarchy inform the surfaces. The photo hero, pinned scroll sequence, WebGL layer and extra scroll engine are excluded to preserve the compact workspace and existing shared background. |
| Pasted text (5)(2).txt — feature bento | Interactive selector and focused featured card. Static uptime/security/throughput claims and example deployment code are excluded. |
| Pasted text (6)(1).txt — animated feature grid | Responsive card spans and reduced visual density. Repeating type/layout timers and generic security claims are excluded. |
| Pasted text (7).txt — particle drift | Existing shared ambient field remains canonical; no extra iframe, animation loop, arbitrary postMessage layer or duplicate particle background is mounted. |
| Inline PDF viewer | In-workspace reader for existing Journal/message PDF attachments: thumbnails, page controls, bounded zoom/raster size, rotation, text search, accessible extracted text and original-file link. Uses the already installed PDF.js legacy runtime/worker bundled with the app; no react-pdf dependency, public worker CDN, document upload or string-to-HTML highlighter. |

The reader renders one main page and at most seven nearby thumbnails, searches at most 200 pages after an explicit Find action, and destroys the document worker on close/source change. PDF text renders through React text nodes. Existing signed storage URLs and access rules are preserved.

Validation uses a generated three-page PDF with literal HTML-like text and controlled authorized statistics. These browser fixtures do not certify production storage, backend deployment or two-member isolation. Those remain release acceptance requirements.

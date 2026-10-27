/** Bounded DOM window for reviewing large local CSV/XLSX uploads. All parsed rows remain reviewable. */
export const REVIEW_ROW_HEIGHT = 68;
export const REVIEW_VIEWPORT_HEIGHT = 544;
const OVERSCAN = 7;

export function importReviewWindow(total: number, scrollTop: number, viewport = REVIEW_VIEWPORT_HEIGHT) {
  const length = Math.max(0, Math.floor(total));
  const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  const first = length ? Math.min(length - 1, Math.floor(top / REVIEW_ROW_HEIGHT)) : 0;
  const start = Math.max(0, first - OVERSCAN);
  const end = Math.min(length, Math.max(start, first + Math.ceil(viewport / REVIEW_ROW_HEIGHT) + OVERSCAN));
  return { start, end, topSpace: start * REVIEW_ROW_HEIGHT, bottomSpace: (length - end) * REVIEW_ROW_HEIGHT };
}

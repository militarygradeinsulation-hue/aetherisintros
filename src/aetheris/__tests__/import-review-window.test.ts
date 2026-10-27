import { describe, expect, it } from 'vitest';
import { importReviewWindow, REVIEW_ROW_HEIGHT } from '../import-review-window';

describe('bulk contact preview window', () => {
  it('can reach every row beyond the former 50-row preview, including the last of 20,000', () => {
    const total = 20_000;
    const first = importReviewWindow(total, 0);
    expect(first.start).toBe(0);
    expect(first.end).toBeGreaterThan(0);
    expect(first.end).toBeLessThan(total);
    for (const row of [50, 100, 999, 9_999, 19_999]) {
      const win = importReviewWindow(total, row * REVIEW_ROW_HEIGHT);
      expect(win.start).toBeLessThanOrEqual(row);
      expect(win.end).toBeGreaterThan(row);
      expect(win.topSpace + (win.end - win.start) * REVIEW_ROW_HEIGHT + win.bottomSpace).toBe(total * REVIEW_ROW_HEIGHT);
    }
  });
  it('handles empty imports and invalid scroll offsets', () => {
    expect(importReviewWindow(0, 0)).toEqual({ start:0, end:0, topSpace:0, bottomSpace:0 });
    expect(importReviewWindow(200, Number.NaN).start).toBe(0);
  });
});

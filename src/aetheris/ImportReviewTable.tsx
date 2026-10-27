import { useEffect, useRef, useState, type ReactNode } from 'react';
import { importReviewWindow, REVIEW_ROW_HEIGHT } from './import-review-window';
import './import-review-table.css';

interface Props<T> {
  rows: readonly T[];
  headings: readonly string[];
  renderRow: (row: T, index: number) => ReactNode;
  scopeKey: string;
  label: string;
  tableClassName?: string;
}

export function ImportReviewTable<T>({ rows, headings, renderRow, scopeKey, label, tableClassName = '' }: Props<T>) {
  const container = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [jump, setJump] = useState('');
  const visible = importReviewWindow(rows.length, scrollTop);
  useEffect(() => {
    setScrollTop(0);
    setJump('');
    if (container.current) container.current.scrollTop = 0;
  }, [scopeKey]);
  const jumpTo = () => {
    const requested = Number(jump);
    if (!Number.isInteger(requested) || requested < 1 || requested > rows.length) return;
    const top = (requested - 1) * REVIEW_ROW_HEIGHT;
    container.current?.scrollTo({ top, behavior: 'instant' });
    setScrollTop(top);
  };
  return <section className="import-review" aria-label={label}>
    <div className="import-review-controls">
      <span role="status">
        All <strong>{rows.length.toLocaleString()}</strong> rows available · viewing {rows.length ? visible.start + 1 : 0}–{visible.end}. Scroll for more.
      </span>
      <form onSubmit={event => { event.preventDefault(); jumpTo(); }}>
        <label>Jump to row
          <input type="number" min={1} max={rows.length} value={jump} placeholder="Row #" aria-label="Preview row number"
            onChange={event => setJump(event.target.value)} />
        </label>
        <button type="submit" disabled={!rows.length}>Go</button>
      </form>
    </div>
    <div className="import-review-scroll" ref={container} tabIndex={0} aria-label={label + ' — scroll to review all rows'}
      onScroll={event => {
        const top = event.currentTarget.scrollTop;
        setScrollTop(previous => Math.floor(previous / REVIEW_ROW_HEIGHT) === Math.floor(top / REVIEW_ROW_HEIGHT) ? previous : top);
      }}>
      <table className={['import-review-table', tableClassName].filter(Boolean).join(' ')} style={{ minWidth: headings.length * 150 }} aria-rowcount={rows.length + 1}>
        <thead><tr>{headings.map((heading, i) => <th key={i}>{heading}</th>)}</tr></thead>
        <tbody>
          {visible.topSpace > 0 && <tr className="import-review-spacer" aria-hidden="true"><td colSpan={headings.length} style={{ height: visible.topSpace }} /></tr>}
          {rows.slice(visible.start, visible.end).map((row, index) => renderRow(row, visible.start + index))}
          {visible.bottomSpace > 0 && <tr className="import-review-spacer" aria-hidden="true"><td colSpan={headings.length} style={{ height: visible.bottomSpace }} /></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

/** Bounded DOM pages without discarding members or changing ranking. */
export const DIRECTORY_PAGE_SIZE = 30;
export interface DirectoryFilters { role: string; sort: 'name' | 'match'; page: number }
export const defaultDirectoryFilters: DirectoryFilters = { role: 'all', sort: 'match', page: 0 };
export function directoryWindow<T>(rows: readonly T[], requestedPage: number, size = DIRECTORY_PAGE_SIZE) {
  const pageSize = Math.max(1, Math.min(100, Math.trunc(size) || DIRECTORY_PAGE_SIZE));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0));
  const start = page * pageSize;
  return { page, pages, start, end: Math.min(start + pageSize, rows.length), rows: rows.slice(start, start + pageSize) };
}

import type { LibraryContactEdits, LibraryRecord } from './repo';

export const CONTACT_EDIT_FIELDS: ReadonlyArray<{ key: keyof LibraryContactEdits; label: string; max: number; type?: string }> = [
  { key: 'name', label: 'Name', max: 300 },
  { key: 'email', label: 'Email', max: 500, type: 'email' },
  { key: 'phone', label: 'Phone', max: 500, type: 'tel' },
  { key: 'business', label: 'Company', max: 500 },
  { key: 'title', label: 'Job title', max: 500 },
  { key: 'location', label: 'Location', max: 1000 },
  { key: 'website', label: 'Website', max: 2000 },
  { key: 'industry', label: 'Industry', max: 500 },
  { key: 'raw_contact_person', label: 'Original contact-person text', max: 1000 },
  { key: 'dnc_status', label: 'Do-not-contact status', max: 200 },
];

export function contactEditableFields(record: LibraryRecord): LibraryContactEdits {
  return Object.fromEntries(CONTACT_EDIT_FIELDS.map(({ key }) => [key, record[key] ?? ''])) as unknown as LibraryContactEdits;
}

export function validateContactEdits(values: LibraryContactEdits): string | null {
  if (!values.name.trim()) return 'A contact name is required.';
  if (!values.dnc_status.trim()) return 'Do-not-contact status is required.';
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    return 'Enter a valid email address or leave the field empty.';
  for (const { key, label, max } of CONTACT_EDIT_FIELDS) {
    if (values[key].trim().length > max) return `${label} must be ${max} characters or fewer.`;
  }
  return null;
}


import { describe, expect, it } from 'vitest';
import { CONTACT_EDIT_FIELDS, contactEditableFields, validateContactEdits } from '../contact-record-model';
import type { LibraryRecord } from '../repo';

const base = {
  id: 'record-1', owner_id: 'member-1', workspace_id: 'workspace-1', batch_id: 'batch-1',
  created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:01Z',
  import_key: 'hash:Contacts:2',
  record_type: 'person', name: 'Example Contact',
  phone: '555-0100', email: 'contact@example.test', business: 'Example Inc',
  title: '', location: '', website: '', industry: '', raw_contact_person: '',
  source_file: 'contacts.csv', source_sheet: 'Contacts', source_row: 2, source_reference: 'original',
  dnc_status: 'unknown', verification_status: 'unverified', duplicate_candidate: false,
  original_columns: { Name: 'Example Contact' },
} as LibraryRecord;

describe('private contact editor contract', () => {
  it('includes only allowed, editable fields and never modifies provenance', () => {
    const editable = contactEditableFields(base);
    expect(editable.name).toBe('Example Contact');
    expect(CONTACT_EDIT_FIELDS.map(field => field.key)).toEqual([
      'name', 'email', 'phone', 'business', 'title', 'location',
      'website', 'industry', 'raw_contact_person', 'dnc_status',
    ]);
    expect('original_columns' in editable).toBe(false);
    expect('owner_id' in editable).toBe(false);
    expect('verification_status' in editable).toBe(false);
    expect(base.original_columns).toEqual({ Name: 'Example Contact' });
  });
  it('validates edits but does not require optional contact fields', () => {
    const good = contactEditableFields(base);
    expect(validateContactEdits(good)).toBeNull();
    expect(validateContactEdits({ ...good, name: ' ' })).toMatch(/name/i);
    expect(validateContactEdits({ ...good, email: 'broken' })).toMatch(/email/i);
    expect(validateContactEdits({ ...good, dnc_status: '' })).toMatch(/do-not-contact/i);
    expect(validateContactEdits({ ...good, name: 'a'.repeat(301) })).toMatch(/300/);
    expect(validateContactEdits({ ...good, website: 'example.com' })).toBeNull();
  });
});

import { useEffect, useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { deleteLibraryRecord, updateLibraryRecord, type LibraryContactEdits, type LibraryRecord } from './repo';
import { CONTACT_EDIT_FIELDS, contactEditableFields, validateContactEdits } from './contact-record-model';
import './contact-record-actions.css';

export function ContactRecordActions({
  record, canEdit, canDelete, startEditing = false, onSaved, onDeleted,
}: {
  record: LibraryRecord;
  canEdit: boolean;
  canDelete: boolean;
  startEditing?: boolean;
  onSaved: (updated: LibraryRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState(() => contactEditableFields(record));
  const [editing, setEditing] = useState(startEditing);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDraft(contactEditableFields(record));
    setEditing(startEditing);
    setConfirming(false);
    setConfirmation('');
    setError('');
    setNotice('');
  }, [record.id, startEditing]);

  const save = async () => {
    if (!canEdit || busy) return;
    setError(''); setNotice('');
    const problem = validateContactEdits(draft);
    if (problem) { setError(problem); return; }
    const original = contactEditableFields(record);
    const changed = Object.fromEntries(CONTACT_EDIT_FIELDS
      .filter(field => original[field.key] !== draft[field.key].trim())
      .map(field => [field.key, draft[field.key].trim()])) as Partial<LibraryContactEdits>;
    if (!Object.keys(changed).length) { setEditing(false); return; }
    setBusy(true);
    try {
      const saved = await updateLibraryRecord(record.id, record.updated_at, changed);
      setEditing(false);
      setNotice('Saved. Your changes are available across devices.');
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This contact could not be saved.');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!canDelete || busy || confirmation.trim() !== record.name.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteLibraryRecord(record.id, record.updated_at);
      onDeleted(record.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This contact could not be deleted.');
    } finally { setBusy(false); }
  };

  return <section className="pl-manage" aria-label={`Manage ${record.name}`}>
    <div className="pl-manage-actions">
      {canEdit && <button type="button" onClick={() => { setEditing(value => !value); setConfirming(false); setError(''); }}
        disabled={busy} aria-expanded={editing}><Pencil size={16} /> {editing ? 'Cancel edit' : 'Edit contact'}</button>}
      {canDelete && <button type="button" className="pl-manage-danger" onClick={() => { setConfirming(value => !value); setEditing(false); setError(''); }}
        disabled={busy} aria-expanded={confirming}><Trash2 size={16} /> {confirming ? 'Cancel deletion' : 'Delete contact'}</button>}
    </div>
    {notice && <p className="pl-notice" role="status">{notice}</p>}
    {error && <p className="pl-error" role="alert">{error}</p>}
    {editing && canEdit && <form className="pl-edit-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <p>Update the saved contact. The original uploaded file, source row and verification status stay unchanged.</p>
      <div className="pl-edit-grid">
        {CONTACT_EDIT_FIELDS.map(({ key, label, max, type }) => <label key={key}>
          <span>{label}</span>
          <input
            type={type || 'text'}
            maxLength={max}
            autoComplete="off"
            required={key === 'name' || key === 'dnc_status'}
            value={draft[key]}
            onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))}
          />
        </label>)}
      </div>
      <p className="pl-manage-hint">Editing contact information does not verify it or authorize outreach. DNC restrictions remain your responsibility.</p>
      <div className="pl-manage-actions">
        <button type="submit" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save changes'}</button>
        <button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(contactEditableFields(record)); setError(''); }}><X size={16} /> Cancel</button>
      </div>
    </form>}
    {confirming && canDelete && <div className="pl-delete-confirm">
      <strong>Delete ${record.name} permanently?</strong>
      <p>This deletes the selected private contact and its enrichment suggestions. It cannot be undone. Other contacts are not affected.</p>
      <label>Type <b>{record.name}</b> to confirm
        <input aria-label="Type contact name to confirm deletion" value={confirmation}
          onChange={event => setConfirmation(event.target.value)} autoComplete="off" />
      </label>
      <div className="pl-manage-actions">
        <button type="button" className="pl-manage-danger" disabled={busy || confirmation.trim() !== record.name.trim()}
          onClick={() => void remove()}><Trash2 size={16} /> {busy ? 'Deleting…' : 'Permanently delete'}</button>
        <button type="button" disabled={busy} onClick={() => { setConfirming(false); setConfirmation(''); setError(''); }}>Keep contact</button>
      </div>
    </div>}
  </section>;
}

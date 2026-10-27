import { useCallback, useEffect, useRef, useState } from "react";
import { useAccess } from "@/aetheris/access";
import { deleteMemoryNote, listMemoryNotes, saveMemoryNote } from "@/lib/memoryNotes.functions";
import { localNoteDate, NOTES_CHANGED, type MemoryNote, type NoteFields } from "./model";
import "./memory-notes.css";

const emptyNote = (): NoteFields => ({
  title: "",
  date: localNoteDate(),
  context: "",
  content: "",
  type: "note",
});

export function MemoryNotes() {
  const { access } = useAccess();
  // Remount private state on account changes, including pending drafts and search results.
  return (
    <NotesForAccount
      key={access.userId ?? "signed-out"}
      owner={access.userId}
      authLoading={access.loading}
    />
  );
}

function NotesForAccount({ owner, authLoading }: { owner: string | null; authLoading: boolean }) {
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const [search, setSearch] = useState("");
  const [loadedSearch, setLoadedSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<NoteFields>(emptyNote);
  const [removing, setRemoving] = useState<string | null>(null);
  const id = useRef(crypto.randomUUID());
  const version = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (query: string, more = false) => {
      if (!owner) return;
      const request = ++version.current;
      setLoading(true);
      setError("");
      try {
        const result = await listMemoryNotes({
          data: { search: query, offset: more ? notesRef.current.length : 0 },
        });
        if (!mounted.current || request !== version.current) return;
        setNotes((previous) =>
          more
            ? [
                ...previous,
                ...result.notes.filter((note) => !previous.some((row) => row.id === note.id)),
              ]
            : result.notes,
        );
        setHasMore(result.hasMore);
        setLoadedSearch(query);
      } catch (e) {
        if (mounted.current && request === version.current)
          setError(e instanceof Error ? e.message : "Notes could not be loaded.");
      } finally {
        if (mounted.current && request === version.current) setLoading(false);
      }
    },
    [owner],
  );
  useEffect(() => {
    void load("");
    const refresh = () => {
      setSearch("");
      void load("");
    };
    window.addEventListener(NOTES_CHANGED, refresh);
    return () => window.removeEventListener(NOTES_CHANGED, refresh);
  }, [owner, load]);

  const save = async () => {
    if (!owner || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveMemoryNote({ data: { owner, id: id.current, note: draft, fromButler: false } });
      if (!mounted.current) return;
      setDraft(emptyNote());
      id.current = crypto.randomUUID();
      setShowForm(false);
      setNotice("Saved privately. Butler can recall this note in future conversations.");
      window.dispatchEvent(new Event(NOTES_CHANGED));
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Note was not saved. Your draft is still here.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const remove = async (noteId: string) => {
    if (!owner || busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteMemoryNote({ data: { owner, id: noteId } });
      if (!mounted.current) return;
      setRemoving(null);
      setNotice("Deleted from Notes. Saved conversation history is separate.");
      window.dispatchEvent(new Event(NOTES_CHANGED));
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not delete this note.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <section className="memory-notes" aria-label="Memory notes">
      <header>
        <div>
          <span className="memory-notes-eyebrow">PRIVATE MEMORY</span>
          <h2>Notes, ideas & conversations</h2>
          <p>
            Keep the title, date and context together. Ask Butler to save something here or recall
            it later.
          </p>
        </div>
        <button
          type="button"
          disabled={!owner || authLoading || busy}
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? "Close editor" : "+ New note"}
        </button>
      </header>
      {authLoading ? (
        <p role="status">Loading your account…</p>
      ) : !owner ? (
        <p>Sign in to save private notes and let Butler recall them across visits.</p>
      ) : (
        <>
          {showForm && (
            <form
              className="memory-notes-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label>
                Title
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Partnership idea with Ana"
                />
              </label>
              <div className="memory-notes-fields">
                <label>
                  Date
                  <input
                    required
                    type="date"
                    value={draft.date}
                    disabled={busy}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  />
                </label>
                <label>
                  Type
                  <select
                    value={draft.type}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft({ ...draft, type: e.target.value as NoteFields["type"] })
                    }
                  >
                    <option value="note">Note</option>
                    <option value="idea">Idea</option>
                    <option value="conversation">Conversation</option>
                  </select>
                </label>
              </div>
              <label>
                Context
                <textarea
                  required
                  maxLength={2000}
                  rows={2}
                  value={draft.context}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, context: e.target.value })}
                  placeholder="Who, what led to this, and why it matters"
                />
              </label>
              <label>
                Note
                <textarea
                  required
                  maxLength={100000}
                  rows={5}
                  value={draft.content}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  placeholder="Write what you want to remember…"
                />
              </label>
              <button
                type="submit"
                disabled={
                  busy || !draft.title.trim() || !draft.context.trim() || !draft.content.trim()
                }
              >
                {busy ? "Saving…" : "Save to Memory"}
              </button>
            </form>
          )}
          <form
            className="memory-notes-search"
            onSubmit={(event) => {
              event.preventDefault();
              void load(search);
            }}
          >
            <input
              aria-label="Search saved notes"
              placeholder="Search titles, dates, context or notes…"
              value={search}
              maxLength={160}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button disabled={loading}>Search</button>
          </form>
          {error && (
            <p role="alert">
              {error}{" "}
              <button type="button" disabled={loading} onClick={() => void load(search)}>
                Retry loading
              </button>
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {loading && <p role="status">Loading notes…</p>}
          {!loading && !error && !notes.length && (
            <p>
              {loadedSearch
                ? "No notes match that search."
                : "No saved notes yet. Try telling Butler: “Save this conversation as Partnership planning.”"}
            </p>
          )}
          <div className="memory-notes-list">
            {notes.map((note) => (
              <article key={note.id}>
                <div className="memory-notes-meta">
                  <span>{note.type}</span>
                  <time dateTime={note.date}>
                    {new Date(note.date + "T12:00:00").toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </time>
                  <span>Private</span>
                </div>
                <h3>{note.title}</h3>
                <p className="memory-notes-context">{note.context}</p>
                <details>
                  <summary>Read {note.type}</summary>
                  <p className="memory-notes-body">{note.content}</p>
                  <small>
                    {note.source} · Saved {new Date(note.createdAt).toLocaleString()}
                  </small>
                </details>
                <footer>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("aetheris:open-assistant", {
                          detail: {
                            question: `Recall my saved note titled "${note.title}" from ${note.date}. Note ID: ${note.id}`,
                          },
                        }),
                      )
                    }
                  >
                    Ask Butler about this
                  </button>
                  {removing === note.id ? (
                    <>
                      <span>Delete this note?</span>
                      <button type="button" disabled={busy} onClick={() => void remove(note.id)}>
                        Delete
                      </button>
                      <button type="button" disabled={busy} onClick={() => setRemoving(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => setRemoving(note.id)}>
                      Delete note
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
          {hasMore && (
            <button type="button" disabled={loading} onClick={() => void load(loadedSearch, true)}>
              Load more notes
            </button>
          )}
        </>
      )}
    </section>
  );
}

// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
  Code,
  Sparkles,
  FileText,
  Save,
  Trash2,
  Copy,
  Check,
  Plus,
  Eye,
  Edit3,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StructuredMeetingNote, Person } from '../types';
import { INITIAL_MEETING_NOTES } from '../dataStore';

interface ExecutiveRichTextEditorProps {
  person: Person;
  onAddTaskToInbox?: (title: string, linkedPerson?: string) => void;
}

const TEMPLATES = {
  meeting_minutes: {
    title: 'Executive Briefing Minutes',
    category: 'meeting_minutes' as const,
    tags: ['Briefing', 'Strategy', 'Syndicate'],
    content: `## Executive Briefing Minutes
**Date & Location:** ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Executive Briefing Room
**Attendees:** [Attendee Names]

### 1. Key Strategic Discussion
- Addressed primary strategic mandates and syndication priorities.
- Discussed deal terms, timeline expectations, and stakeholder alignment.

### 2. Capital & Pipeline Implications
- Target allocation and commitment milestones outlined for the upcoming quarter.

### 3. Tactical Next Steps & Action Items
- [ ] Circulate revised memorandum to syndicate partners
- [ ] Confirm governance review touchpoint next week
- [ ] Align with legal counsel on co-investment rights`,
  },
  tactical_note: {
    title: 'Tactical Relationship Note',
    category: 'tactical_note' as const,
    tags: ['Tactical', 'Intelligence'],
    content: `## Tactical Relationship Note
**Trigger Event:** Recent market movement or key partnership announcement.

### Strategic Leverage Angle
- Direct peer connection presents high-conviction warm bridge.
- Specific mandate alignment observed across current funding cycle.

### Tactical Action
- [ ] Prepare tailored outreach referencing shared portfolio node`,
  },
  action_items: {
    title: 'Priority Action Deliverables',
    category: 'action_items' as const,
    tags: ['Execution', 'Follow-up'],
    content: `## Priority Action Deliverables
**Accountable Lead:** CEO Desk

### Immediate Execution Items (48-Hour SLA)
- [ ] Deliver updated cap table and financial projections
- [ ] Schedule follow-up sync with principal allocator
- [ ] Log correspondence in relationship memory ledger`,
  },
};

export const ExecutiveRichTextEditor: React.FC<ExecutiveRichTextEditorProps> = ({
  person,
  onAddTaskToInbox,
}) => {
  // Load notes for this person from localStorage or INITIAL_MEETING_NOTES
  const storageKey = `aetheris_notes_${person.id}`;
  const [notes, setNotes] = useState<StructuredMeetingNote[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return INITIAL_MEETING_NOTES[person.id] || [];
  });

  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);

  // Editor form state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<StructuredMeetingNote['category']>('meeting_minutes');
  const [content, setContent] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Update notes if person changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`aetheris_notes_${person.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotes(parsed);
        setSelectedNoteId(parsed[0]?.id || null);
        return;
      }
    } catch {
      // ignore
    }
    const defaultNotes = INITIAL_MEETING_NOTES[person.id] || [];
    setNotes(defaultNotes);
    setSelectedNoteId(defaultNotes[0]?.id || null);
  }, [person.id]);

  // Persist notes
  const saveNotesToStorage = (updatedNotes: StructuredMeetingNote[]) => {
    setNotes(updatedNotes);
    try {
      localStorage.setItem(`aetheris_notes_${person.id}`, JSON.stringify(updatedNotes));
    } catch {
      // ignore
    }
  };

  // Insert markdown tag around selection or at cursor
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'text') + suffix;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 0);
  };

  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[key];
    setTitle(`${t.title} — ${person.name}`);
    setCategory(t.category);
    setTagsInput(t.tags.join(', '));
    setContent(t.content);
    setIsPreview(false);
  };

  const handleStartNewNote = () => {
    setEditingNoteId(null);
    applyTemplate('meeting_minutes');
    setActiveTab('editor');
  };

  const handleEditExistingNote = (note: StructuredMeetingNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setCategory(note.category);
    setContent(note.content);
    setTagsInput(note.tags ? note.tags.join(', ') : '');
    setIsPreview(false);
    setActiveTab('editor');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotesToStorage(updated);
    if (selectedNoteId === id) {
      setSelectedNoteId(updated[0]?.id || null);
    }
  };

  const handleSaveNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Extract action items from markdown lines with "- [ ]" or "- [x]"
    const extractedActionItems: string[] = [];
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^-\s*\[\s*[ xX]?\s*\]\s*(.+)/);
      if (match && match[1]) {
        extractedActionItems.push(match[1].trim());
      }
    });

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const nowStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ` · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    let updated: StructuredMeetingNote[];
    if (editingNoteId) {
      updated = notes.map((n) =>
        n.id === editingNoteId
          ? {
              ...n,
              title: title.trim(),
              category,
              content: content.trim(),
              tags: parsedTags,
              actionItems: extractedActionItems,
            }
          : n
      );
      setSelectedNoteId(editingNoteId);
    } else {
      const newNote: StructuredMeetingNote = {
        id: `note-${person.id}-${Date.now()}`,
        personId: person.id,
        title: title.trim(),
        category,
        content: content.trim(),
        createdAt: nowStr,
        tags: parsedTags,
        actionItems: extractedActionItems,
      };
      updated = [newNote, ...notes];
      setSelectedNoteId(newNote.id);
    }

    saveNotesToStorage(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('list');
    }, 800);
  };

  const handleCopyNote = (note: StructuredMeetingNote) => {
    navigator.clipboard.writeText(
      `${note.title}\n${note.createdAt}\nCategory: ${note.category}\n\n${note.content}`
    );
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // Simple, elegant Markdown renderer for preview
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="font-serif-editorial text-base text-[#F2EEE6] font-bold mt-3 mb-1.5 pb-1 border-b border-white/10">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-mono text-xs uppercase tracking-wider text-[#F5B027] font-semibold mt-2.5 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-2 border-[#F5B027] pl-3 py-1 my-1.5 italic text-[11px] text-[#F2EEE6]/85 bg-white/5 rounded-r">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
        const itemText = line.replace(/^- \[[ xX]\] /, '');
        return (
          <div key={idx} className="flex items-start gap-2 py-0.5 text-xs text-[#F2EEE6]/90">
            <span className={`mt-0.5 text-xs ${isChecked ? 'text-[#C78522]' : 'text-[#F5B027]'}`}>
              {isChecked ? '☑' : '☐'}
            </span>
            <span className={isChecked ? 'line-through text-[#F2EEE6]/50' : ''}>{itemText}</span>
            {onAddTaskToInbox && !isChecked && (
              <button
                type="button"
                onClick={() => onAddTaskToInbox(itemText, person.name)}
                className="ml-auto text-[9px] font-mono text-[#F5B027] hover:underline px-1 py-0.5 rounded bg-[#F5B027]/10 shrink-0"
                title="Send task to Actionable Inbox"
              >
                + Inbox
              </button>
            )}
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 py-0.5 text-xs text-[#F2EEE6]/80 pl-2">
            <span className="text-[#F5B027] mt-1 text-[8px]">●</span>
            <span>{line.replace('- ', '')}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs text-[#F2EEE6]/80 leading-relaxed font-sans">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="rounded-xl bg-[#12100C] border border-white/10 overflow-hidden shadow-lg">
      {/* Top Header / Mode Switcher */}
      <div className="p-3 bg-[#12100C] border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-[#F5B027]" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#F2EEE6] font-bold">
            Executive Minutes & Tactical Notes
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-[#F5B027] font-semibold">
            {notes.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'list'
                ? 'bg-white/15 text-white font-semibold'
                : 'text-[#F2EEE6]/60 hover:text-white'
            }`}
          >
            Archive
          </button>
          <button
            onClick={handleStartNewNote}
            className="px-2.5 py-1 rounded bg-[#F5B027] hover:bg-[#F5B027]/90 text-white text-[10px] font-mono font-semibold flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus size={11} />
            <span>New Minutes</span>
          </button>
        </div>
      </div>

      {/* Mode A: View Notes List & Active Selected Note */}
      {activeTab === 'list' && (
        <div className="p-3 space-y-3">
          {notes.length > 0 ? (
            <>
              {/* Note Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {notes.map((note) => {
                  const isSelected = note.id === selectedNoteId;
                  return (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#F5B027]/20 border border-[#F5B027]/50 text-white font-semibold shadow-sm'
                          : 'bg-white/5 border border-white/5 text-[#F2EEE6]/60 hover:text-white'
                      }`}
                    >
                      <span className="capitalize">{note.category.replace('_', ' ')}</span>
                      <span className="text-[9px] text-[#F2EEE6]/40">·</span>
                      <span className="truncate max-w-[120px]">{note.title.split('—')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Note Reader Card */}
              {activeNote && (
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#F5B027] uppercase font-bold tracking-wider">
                        <span>{activeNote.category.replace('_', ' ')}</span>
                        <span>·</span>
                        <span className="text-[#F2EEE6]/50">{activeNote.createdAt}</span>
                      </div>
                      <h4 className="font-serif-editorial text-sm sm:text-base text-[#F2EEE6] font-semibold mt-0.5">
                        {activeNote.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyNote(activeNote)}
                        className="p-1 rounded text-[#F2EEE6]/50 hover:text-white hover:bg-white/10 transition-colors"
                        title="Copy structured minutes to clipboard"
                      >
                        {copiedNoteId === activeNote.id ? (
                          <Check size={12} className="text-[#C78522]" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditExistingNote(activeNote)}
                        className="p-1 rounded text-[#F2EEE6]/50 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit note"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(activeNote.id)}
                        className="p-1 rounded text-[#F2EEE6]/50 hover:text-[#C78522] hover:bg-white/10 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {activeNote.tags && activeNote.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {activeNote.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-[#F2EEE6]/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rendered Body */}
                  <div className="space-y-1.5 pt-1 font-sans">
                    {renderMarkdown(activeNote.content)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-xs text-[#F2EEE6]/50 space-y-2">
              <p>No meeting minutes or tactical notes recorded yet for {person.name}.</p>
              <button
                onClick={handleStartNewNote}
                className="px-3 py-1.5 rounded bg-[#F5B027]/20 hover:bg-[#F5B027]/30 text-[#F5B027] border border-[#F5B027]/40 text-xs font-mono"
              >
                + Record First Meeting Minutes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Full Structured Rich-Text Editor Form */}
      {activeTab === 'editor' && (
        <form onSubmit={handleSaveNote} className="p-3.5 space-y-3">
          {/* Quick Structured Templates Bar */}
          <div className="flex items-center justify-between text-[9px] font-mono text-[#F2EEE6]/50 border-b border-white/5 pb-2">
            <span className="uppercase tracking-wider">Insert Executive Template:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate('meeting_minutes')}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[#F2EEE6]/80 text-[9px]"
              >
                Minutes
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('tactical_note')}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[#F2EEE6]/80 text-[9px]"
              >
                Tactical Brief
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('action_items')}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[#F2EEE6]/80 text-[9px]"
              >
                Action Items
              </button>
            </div>
          </div>

          {/* Meta inputs: Title & Category */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="e.g. Series B Strategic Alignment Meeting..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027] font-semibold"
              required
            />

            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-[#F2EEE6] focus:outline-none focus:border-[#F5B027]"
              >
                <option value="meeting_minutes">Meeting Minutes</option>
                <option value="tactical_note">Tactical Note</option>
                <option value="deal_memo">Deal Memo</option>
                <option value="action_items">Action Items</option>
              </select>

              <input
                type="text"
                placeholder="Tags (e.g. Series B, Governance, Apex)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
          </div>

          {/* Rich-Text Editorial Formatting Toolbar */}
          <div className="p-1.5 rounded-lg bg-[#12100C] border border-white/10 flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Bold (⌘B)"
              >
                <Bold size={12} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Italic (⌘I)"
              >
                <Italic size={12} />
              </button>
              <div className="h-4 w-[1px] bg-white/10 mx-0.5" />
              <button
                type="button"
                onClick={() => insertFormatting('\n## ', '\n')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Heading 2"
              >
                <Heading2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n### ', '\n')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Heading 3"
              >
                <Heading3 size={12} />
              </button>
              <div className="h-4 w-[1px] bg-white/10 mx-0.5" />
              <button
                type="button"
                onClick={() => insertFormatting('\n- ', '')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Bullet List"
              >
                <List size={12} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n- [ ] ', '')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Action Item Task"
              >
                <CheckSquare size={12} className="text-[#F5B027]" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n> ', '\n')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Blockquote"
              >
                <Quote size={12} />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`', '`')}
                className="p-1.5 rounded text-[#F2EEE6]/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Mandate Code Pill"
              >
                <Code size={12} />
              </button>
            </div>

            {/* Toggle Preview / Edit */}
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors ${
                isPreview ? 'bg-[#F5B027] text-white' : 'bg-white/5 text-[#F2EEE6]/70 hover:text-white'
              }`}
            >
              <Eye size={10} />
              <span>{isPreview ? 'Edit' : 'Preview'}</span>
            </button>
          </div>

          {/* Textarea or Preview View */}
          {isPreview ? (
            <div className="min-h-[180px] p-3 rounded-lg bg-black/40 border border-white/15 overflow-y-auto space-y-1.5 font-sans">
              {renderMarkdown(content)}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Structured notes, strategic minutes, commitments, decisions..."
              className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-xs text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027] font-mono leading-relaxed resize-y"
              required
            />
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="text-[11px] font-mono text-[#F2EEE6]/60 hover:text-white"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-[11px] font-mono text-[#C78522] flex items-center gap-1">
                  <Check size={12} /> Saved!
                </span>
              )}
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-[#F5B027] hover:bg-[#F5B027]/90 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Save size={12} />
                <span>Save Minutes</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

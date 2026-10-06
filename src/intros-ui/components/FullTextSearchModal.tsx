// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  FileText,
  Tag,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Building,
  Mail,
  Phone,
  CornerDownLeft,
  Filter,
} from 'lucide-react';
import { Person, CalendarEvent } from '../types';
import { INITIAL_MEETING_NOTES, INITIAL_CALENDAR, INITIAL_ACTIONABLE_TASKS } from '../dataStore';
import { RelationshipTierBadge } from './RelationshipTierBadge';

interface FullTextSearchResult {
  id: string;
  type: 'person' | 'note' | 'tag' | 'calendar' | 'task';
  title: string;
  subtitle: string;
  snippet: string;
  matchField: string;
  tags?: string[];
  person?: Person;
  dateOrMeta?: string;
  actionLabel?: string;
  tier?: 'inner_circle' | 'strategic' | 'network';
}

interface FullTextSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  onSelectPerson: (person: Person) => void;
  onOpenTileWorkspace?: (tileId: string) => void;
  onOpenSidebar?: () => void;
}

export const FullTextSearchModal: React.FC<FullTextSearchModalProps> = ({
  isOpen,
  onClose,
  people,
  onSelectPerson,
  onOpenTileWorkspace,
  onOpenSidebar,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'notes' | 'tags' | 'calendar'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Extract all meeting notes into a flat list
  const allMeetingNotes = useMemo(() => {
    const list: Array<{
      id: string;
      personId: string;
      title: string;
      content: string;
      tags: string[];
      actionItems: string[];
      createdAt: string;
      personName?: string;
      personCompany?: string;
      person?: Person;
    }> = [];

    Object.entries(INITIAL_MEETING_NOTES).forEach(([personId, notes]) => {
      const person = people.find((p) => p.id === personId);
      notes.forEach((note) => {
        list.push({
          ...note,
          tags: note.tags || [],
          actionItems: note.actionItems || [],
          personName: person?.name || 'Executive Contact',
          personCompany: person?.company || 'Network Enterprise',
          person,
        });
      });
    });

    return list;
  }, [people]);

  // Extract all distinct tags with counts
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    people.forEach((p) => {
      p.tags?.forEach((t) => tagMap.set(t, (tagMap.get(t) || 0) + 1));
    });
    allMeetingNotes.forEach((n) => {
      n.tags?.forEach((t) => tagMap.set(t, (tagMap.get(t) || 0) + 1));
    });
    return Array.from(tagMap.entries()).map(([tag, count]) => ({ tag, count }));
  }, [people, allMeetingNotes]);

  // Execute full-text query matching across profile data, tags, notes, calendar, and tasks
  const searchResults = useMemo<FullTextSearchResult[]>(() => {
    const trimmed = query.trim().toLowerCase();
    const results: FullTextSearchResult[] = [];

    // Helper to test if any term matches
    const matches = (text?: string): boolean => {
      if (!text) return false;
      return text.toLowerCase().includes(trimmed);
    };

    // Helper to highlight snippet around match
    const makeSnippet = (fullText: string, maxLen = 140): string => {
      if (!trimmed) return fullText.slice(0, maxLen) + (fullText.length > maxLen ? '...' : '');
      const idx = fullText.toLowerCase().indexOf(trimmed);
      if (idx === -1) return fullText.slice(0, maxLen) + (fullText.length > maxLen ? '...' : '');
      const start = Math.max(0, idx - 40);
      const end = Math.min(fullText.length, idx + trimmed.length + 80);
      const prefix = start > 0 ? '...' : '';
      const suffix = end < fullText.length ? '...' : '';
      return `${prefix}${fullText.slice(start, end)}${suffix}`;
    };

    // 1. Search People Profiles
    people.forEach((p) => {
      const matchName = matches(p.name);
      const matchCompany = matches(p.company);
      const matchTitle = matches(p.title);
      const matchBio = matches(p.notes);
      const matchEmail = matches(p.email);
      const matchPhone = matches(p.phone);
      const matchTouchpoint = matches(p.lastTouchpoint);
      const matchTag = p.tags?.some((t) => matches(t));

      if (!trimmed || matchName || matchCompany || matchTitle || matchBio || matchEmail || matchPhone || matchTouchpoint || matchTag) {
        let matchField = 'Profile Record';
        let snippet = p.notes || '';
        if (matchName) matchField = 'Executive Name';
        else if (matchCompany) matchField = 'Company Organization';
        else if (matchTitle) matchField = 'Executive Title';
        else if (matchEmail) { matchField = 'Email'; snippet = p.email; }
        else if (matchTag) { matchField = 'Tags'; snippet = `Tagged: ${(p.tags || []).join(', ')}`; }
        else if (matchTouchpoint) { matchField = 'Last Touchpoint'; snippet = p.lastTouchpoint || ''; }

        results.push({
          id: `person-${p.id}`,
          type: 'person',
          title: p.name,
          subtitle: `${p.title} · ${p.company}`,
          snippet: makeSnippet(snippet),
          matchField,
          tags: p.tags,
          person: p,
          tier: p.tier,
          dateOrMeta: p.lastTouchpoint || 'Active in Network',
          actionLabel: 'Open Dossier',
        });
      }
    });

    // 2. Search Structured Meeting Notes & Minutes
    allMeetingNotes.forEach((note) => {
      const matchTitle = matches(note.title);
      const matchContent = matches(note.content);
      const matchTags = note.tags?.some((t) => matches(t));
      const matchActions = note.actionItems?.some((a) => matches(a));
      const matchPerson = matches(note.personName);

      if (!trimmed || matchTitle || matchContent || matchTags || matchActions || matchPerson) {
        let matchField = 'Meeting Minutes';
        let snippet = note.content;
        if (matchTitle) matchField = 'Note Title';
        else if (matchActions) {
          matchField = 'Action Items';
          snippet = `Action: ${note.actionItems.join(' · ')}`;
        } else if (matchTags) {
          matchField = 'Meeting Tags';
          snippet = `Tags: ${note.tags.join(', ')}`;
        }

        results.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title,
          subtitle: `With ${note.personName} (${note.personCompany})`,
          snippet: makeSnippet(snippet),
          matchField,
          tags: note.tags,
          person: note.person,
          dateOrMeta: note.createdAt,
          actionLabel: 'View Meeting Note',
        });
      }
    });

    // 3. Search Tags
    allTags.forEach(({ tag, count }) => {
      if (trimmed && matches(tag)) {
        results.push({
          id: `tag-${tag}`,
          type: 'tag',
          title: `#${tag}`,
          subtitle: `Categorized tag linked across ${count} relationship records`,
          snippet: `Filter relationships and intelligence records categorized with tag "${tag}".`,
          matchField: 'Network Taxonomy Tag',
          tags: [tag],
          dateOrMeta: `${count} Associated Entities`,
          actionLabel: 'Filter by Tag',
        });
      }
    });

    // 4. Search Calendar Events
    INITIAL_CALENDAR.forEach((event: CalendarEvent) => {
      const matchTitle = matches(event.title);
      const matchNotes = matches(event.notes);
      const matchCompany = matches(event.company);
      const matchPerson = matches(event.linkedPerson);
      const matchLocation = matches(event.location);

      if (!trimmed || matchTitle || matchNotes || matchCompany || matchPerson || matchLocation) {
        const person = people.find((p) => p.name === event.linkedPerson);
        results.push({
          id: `cal-${event.id}`,
          type: 'calendar',
          title: event.title,
          subtitle: `${event.meetingDate || event.time} · ${event.linkedPerson || event.company}`,
          snippet: makeSnippet(event.notes || `${event.location || ''} · ${event.priorityCategory || 'Scheduled Briefing'}`),
          matchField: 'Calendar Briefing',
          person,
          tier: person?.tier,
          dateOrMeta: event.meetingDate || event.time,
          actionLabel: 'Open Briefing',
        });
      }
    });

    // 5. Search Actionable Tasks & Commitments
    INITIAL_ACTIONABLE_TASKS.forEach((task) => {
      const matchTitle = matches(task.title);
      const matchDesc = matches(task.description);
      const matchPerson = matches(task.linkedPerson);

      if (trimmed && (matchTitle || matchDesc || matchPerson)) {
        const person = people.find((p) => p.name === task.linkedPerson);
        results.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          subtitle: `${task.sourceTileTitle} · Due ${task.dueDate}`,
          snippet: makeSnippet(task.description || ''),
          matchField: 'Inbox Action Item',
          person,
          tier: person?.tier,
          dateOrMeta: task.dueDate,
          actionLabel: 'View in Inbox',
        });
      }
    });

    return results;
  }, [query, people, allMeetingNotes, allTags]);

  // Filter results by active category tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return searchResults;
    if (activeTab === 'people') return searchResults.filter((r) => r.type === 'person');
    if (activeTab === 'notes') return searchResults.filter((r) => r.type === 'note');
    if (activeTab === 'tags') return searchResults.filter((r) => r.type === 'tag');
    if (activeTab === 'calendar') return searchResults.filter((r) => r.type === 'calendar' || r.type === 'task');
    return searchResults;
  }, [searchResults, activeTab]);

  // Keyboard navigation within the results list
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    }
  };

  const handleSelectResult = (item: FullTextSearchResult) => {
    if (item.person) {
      onSelectPerson(item.person);
      if (onOpenSidebar) onOpenSidebar();
    } else if (item.type === 'note' && item.person) {
      onSelectPerson(item.person);
      if (onOpenSidebar) onOpenSidebar();
    } else if (item.type === 'tag' && item.tags?.[0]) {
      setQuery(item.tags[0]);
      return;
    } else if (item.type === 'calendar' && onOpenTileWorkspace) {
      onOpenTileWorkspace('calendar');
    } else if (item.type === 'task' && onOpenTileWorkspace) {
      onOpenTileWorkspace('inbox');
    }
    onClose();
  };

  // Helper to highlight matching text in query
  const renderHighlighted = (text: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.trim().toLowerCase() ? (
            <mark key={i} className="bg-[#3D6BF2]/30 text-[#60A5FA] font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-Text Relationship Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#090C10] border border-white/15 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="relative flex items-center px-4 sm:px-6 py-4 border-b border-white/10 bg-[#0E1116]">
          <Search size={18} className="text-[#3D6BF2] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Full-text query: Search contacts, bio, tags, meeting notes, radar status..."
            className="w-full bg-transparent text-[#F2EEE6] text-sm sm:text-base font-sans-clean placeholder-[#F2EEE6]/40 focus:outline-none"
            aria-label="Search query"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[#F2EEE6]/50 hover:text-white hover:bg-white/10 transition-colors mr-2"
              title="Clear search query"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/15 bg-white/5 text-[10px] font-mono text-[#F2EEE6]/60">
            ESC
          </kbd>
        </div>

        {/* Category Tabs & Quick Tag Recommendations */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#07090C] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                activeTab === 'all'
                  ? 'bg-[#3D6BF2]/20 text-[#60A5FA] border border-[#3D6BF2]/40 font-semibold'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({searchResults.length})
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                activeTab === 'people'
                  ? 'bg-[#3D6BF2]/20 text-[#60A5FA] border border-[#3D6BF2]/40 font-semibold'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={11} />
              <span>Profiles ({searchResults.filter((r) => r.type === 'person').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                activeTab === 'notes'
                  ? 'bg-[#3D6BF2]/20 text-[#60A5FA] border border-[#3D6BF2]/40 font-semibold'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText size={11} />
              <span>Meeting Notes ({searchResults.filter((r) => r.type === 'note').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                activeTab === 'tags'
                  ? 'bg-[#3D6BF2]/20 text-[#60A5FA] border border-[#3D6BF2]/40 font-semibold'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tag size={11} />
              <span>Tags</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                activeTab === 'calendar'
                  ? 'bg-[#3D6BF2]/20 text-[#60A5FA] border border-[#3D6BF2]/40 font-semibold'
                  : 'text-[#F2EEE6]/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={11} />
              <span>Briefings ({searchResults.filter((r) => r.type === 'calendar' || r.type === 'task').length})</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-[#F2EEE6]/40 hidden md:inline shrink-0">
            {filteredResults.length} records indexed
          </span>
        </div>

        {/* Results Stream */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[55vh] scrollbar-thin scrollbar-thumb-white/10"
        >
          {filteredResults.length === 0 ? (
            <div className="py-14 text-center">
              <Search size={32} className="mx-auto text-[#F2EEE6]/20 mb-3" />
              <div className="font-serif-editorial text-lg text-[#F2EEE6]/80">
                No matching relationship records found
              </div>
              <p className="text-xs text-[#F2EEE6]/50 mt-1 max-w-sm mx-auto">
                No profile bio, tag taxonomy, meeting notes, or calendar items matched "{query}". Try searching for keywords like "Syndicate", "Series B", "RFP", or "Nordic".
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {allTags.slice(0, 6).map(({ tag }) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono text-[#60A5FA] hover:bg-white/5"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            filteredResults.map((result, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#0E1524] border-[#3D6BF2]/60 shadow-[0_0_15px_rgba(61,107,242,0.25)]'
                      : 'bg-[#0A0D12] border-white/5 hover:border-white/15 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Icon per type */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                          result.type === 'person'
                            ? 'bg-[#3D6BF2]/20 text-[#60A5FA]'
                            : result.type === 'note'
                            ? 'bg-[#F97316]/20 text-[#F97316]'
                            : result.type === 'tag'
                            ? 'bg-[#A855F7]/20 text-[#C084FC]'
                            : 'bg-[#3FB37F]/20 text-[#3FB37F]'
                        }`}
                      >
                        {result.type === 'person' && <User size={13} />}
                        {result.type === 'note' && <FileText size={13} />}
                        {result.type === 'tag' && <Tag size={13} />}
                        {result.type === 'calendar' && <Calendar size={13} />}
                        {result.type === 'task' && <CheckCircle2 size={13} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif-editorial text-sm sm:text-base font-medium text-[#F2EEE6] truncate">
                            {renderHighlighted(result.title)}
                          </h4>
                          {result.tier && (
                            <RelationshipTierBadge tier={result.tier} size="xs" showLabel />
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-[#F2EEE6]/70 uppercase">
                            {result.matchField}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#F2EEE6]/60 truncate">
                          {renderHighlighted(result.subtitle)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {result.dateOrMeta && (
                        <span className="text-[10px] font-mono text-[#F2EEE6]/40 hidden sm:inline">
                          {result.dateOrMeta}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-[#3D6BF2] text-white shadow-sm'
                            : 'bg-white/5 text-[#F2EEE6]/60'
                        }`}
                      >
                        <span>{result.actionLabel || 'Select'}</span>
                        <CornerDownLeft size={10} />
                      </span>
                    </div>
                  </div>

                  {/* Highlighted text snippet */}
                  <p className="text-xs text-[#F2EEE6]/75 font-sans-clean leading-relaxed pl-9 pr-2 line-clamp-2">
                    {renderHighlighted(result.snippet)}
                  </p>

                  {/* Associated tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex items-center gap-1 pl-9 flex-wrap pt-0.5">
                      {result.tags.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuery(t);
                          }}
                          className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-white/5 hover:bg-[#3D6BF2]/20 text-[#60A5FA] border border-white/10 transition-colors"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Shortcuts Navigation Guide */}
        <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-[#07090C] flex items-center justify-between text-[11px] font-mono text-[#F2EEE6]/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px] border border-white/15">↑</kbd>
              <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px] border border-white/15">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px] border border-white/15">↵</kbd>
              <span>Select record</span>
            </span>
            <span className="flex items-center gap-1 hidden sm:inline-flex">
              <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px] border border-white/15">ESC</kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles size={11} className="text-[#3D6BF2]" />
            <span className="text-[#3D6BF2] font-semibold">Aetheris Full-Text Intelligence</span>
          </div>
        </div>
      </div>
    </div>
  );
};

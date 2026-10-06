// @ts-nocheck
import React, { useState } from 'react';
import { UserPlus, X, ShieldCheck, Tag, Building, Mail, Phone } from 'lucide-react';
import { Person } from '../types';
import { RelationshipTier } from './RelationshipTierBadge';

interface QuickAddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (newPerson: Person) => void;
}

const SECTORS = ['Finance', 'Tech', 'Venture', 'Sovereign', 'Defense', 'Aerospace', 'Healthcare', 'Enterprise SaaS'];

export const QuickAddContactModal: React.FC<QuickAddContactModalProps> = ({
  isOpen,
  onClose,
  onAddContact,
}) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sector, setSector] = useState('Venture');
  const [tier, setTier] = useState<RelationshipTier>('strategic');
  const [engagement, setEngagement] = useState<'active' | 'followup' | 'dormant'>('active');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim()) return;

    const newPerson: Person = {
      id: `person-${Date.now()}`,
      name: name.trim(),
      title: title.trim() || 'Executive',
      company: company.trim(),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
      connectionScore: 85,
      scoreBreakdown: { recency: 90, frequency: 85, reciprocity: 82, mutuals: 88 },
      mutualsCount: 12,
      mutualAvatars: [],
      radarBucket: 'hot',
      engagement,
      tier,
      tags: [sector, 'Executive', tier === 'inner_circle' ? 'Apex' : 'Strategic'],
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      phone: phone.trim() || '+1 (415) 555-0199',
      lastTouchpoint: 'Just added · Initial contact record created',
      touchpointType: 'Meeting',
      notes: notes.trim() || `Newly indexed executive relationship in ${sector} sector.`,
    };

    onAddContact(newPerson);
    setName('');
    setTitle('');
    setCompany('');
    setEmail('');
    setPhone('');
    setNotes('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Add Contact"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#090C10] border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#0E1116] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5B027]/20 border border-[#F5B027]/40 flex items-center justify-center text-[#F5B027]">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="font-serif-editorial text-base text-[#F2EEE6] font-medium">
                Quick Add Contact
              </h3>
              <p className="text-[10px] font-mono text-[#F2EEE6]/60">
                Index a new relationship into the Aetheris grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#F2EEE6]/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Company *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Vertex Ventures"
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Executive Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. General Partner"
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Primary Sector Tag
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#F2EEE6] focus:outline-none focus:border-[#F5B027] cursor-pointer"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s} className="bg-[#0E1116]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Relationship Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as RelationshipTier)}
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#F2EEE6] focus:outline-none focus:border-[#F5B027] cursor-pointer"
              >
                <option value="inner_circle" className="bg-[#0E1116]">▲ Inner Circle</option>
                <option value="strategic" className="bg-[#0E1116]">◆ Strategic</option>
                <option value="network" className="bg-[#0E1116]">● Network</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Engagement Status
              </label>
              <select
                value={engagement}
                onChange={(e) => setEngagement(e.target.value as any)}
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#F2EEE6] focus:outline-none focus:border-[#F5B027] cursor-pointer"
              >
                <option value="active" className="bg-[#0E1116]">🟢 Active Touch</option>
                <option value="followup" className="bg-[#0E1116]">🟡 Follow-up Needed</option>
                <option value="dormant" className="bg-[#0E1116]">⚪ Dormant</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@vertexventures.com"
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (415) 300-1192"
                className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#F2EEE6]/70 uppercase tracking-wider mb-1">
              Executive Notes / Mandate
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Strategic introduction context, investment criteria, or notes..."
              className="w-full bg-[#0E1116] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans-clean text-[#F2EEE6] placeholder-[#F2EEE6]/30 focus:outline-none focus:border-[#F5B027]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#F2EEE6] text-xs font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#F5B027] hover:bg-[#F5B027]/90 text-white text-xs font-mono font-medium shadow-[0_0_15px_rgba(199, 133, 34,0.4)] transition-all"
            >
              Index Contact →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

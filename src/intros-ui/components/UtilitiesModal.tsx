import React, { useState } from 'react';
import { X, Search, Briefcase, Building, ShieldCheck, Mail, Folder, LogOut, BookOpen, HelpCircle, Settings, LayoutGrid, CheckSquare } from 'lucide-react';

interface UtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UtilitiesModal: React.FC<UtilitiesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      title: 'Relationship Intelligence',
      items: [
        { name: 'Relationship Inbox', icon: <Building size={18} /> },
        { name: 'Evidence Ledger', icon: <ShieldCheck size={18} /> },
      ],
    },
    {
      title: 'Executive Work',
      items: [
        { name: 'Opportunity Rooms', icon: <Briefcase size={18} /> },
        { name: 'Approvals', icon: <CheckSquare size={18} /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { name: 'Security & Privacy', icon: <ShieldCheck size={18} /> },
        { name: 'Connected Apps', icon: <LayoutGrid size={18} /> },
        { name: 'Preferences', icon: <Settings size={18} /> },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="drawer-panel w-full max-w-[400px] flex flex-col">
        <div className="panel-head flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#3D6BF2] uppercase font-bold">Account</span>
            <h2 className="text-xl font-serif-editorial text-[#F2EEE6]">Utilities</h2>
            <p className="text-xs text-[#F2EEE6]/60">The essentials, without a directory of features.</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#F2EEE6] hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="py-4">
              <span className="px-4 text-[10px] font-mono text-[#F2EEE6]/50 uppercase tracking-wider">
                {section.title}
              </span>
              <div className="mt-2">
                {section.items.map((item) => (
                  <div key={item.name} className="panel-item text-[#F2EEE6]/80 text-sm">
                    {item.icon}
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="border-t border-sys-panel-line mt-2">
             <div className="panel-item text-[#F2EEE6]/80 text-sm"><HelpCircle size={18} /> Help</div>
             <div className="panel-item text-[#F2EEE6]/80 text-sm"><BookOpen size={18} /> Founder Story</div>
             <div className="panel-item text-[#E5484D]/80 text-sm"><LogOut size={18} /> Sign Out</div>
          </div>
        </div>
      </div>
    </div>
  );
};

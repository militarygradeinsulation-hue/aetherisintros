// @ts-nocheck
import React from 'react';
import { ActivePage } from './TopNavigation';

interface EditorialFooterProps {
  onNavigate: (page: ActivePage) => void;
}

export const EditorialFooter: React.FC<EditorialFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-white/10 bg-[#07090C] pt-8 pb-20 md:pb-24 px-4 md:px-8 mt-16 text-[#9CA3AF] print:hidden">
      <div className="max-w-7xl mx-auto flex flex-wrap flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase">
          <span className="text-white font-semibold">People</span>
          <span>×</span>
          <span>Context</span>
          <span>×</span>
          <span>Opportunity</span>
        </div>

        <div className="text-[10px] font-mono tracking-[0.2em] text-[#6B7280] uppercase text-center">
          The intelligence layer for meaningful connections · Ask Intros
        </div>

        <div className="flex items-center gap-6 text-xs">
          <button
            onClick={() => onNavigate('people')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Directory
          </button>
          <button
            onClick={() => onNavigate('bubbles')}
            className="text-[#FFC85C] hover:text-white transition-colors cursor-pointer font-medium"
          >
            Connection Bubbles
          </button>
          <button
            onClick={() => onNavigate('intros')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Introductions
          </button>
          <button
            onClick={() => onNavigate('insights')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Intelligence
          </button>
        </div>

        <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/5 pt-6 text-[10px] font-mono tracking-[0.18em] uppercase">
          <span className="text-[#9CA3AF]">The Architect</span>
          <span className="text-white/85">Joseph Toney</span>
          <span className="whitespace-nowrap">
            <span className="text-[#4B5563]">—</span>{' '}
            <a
              href="https://aetheris.technology"
              rel="noopener noreferrer"
              className="text-[#FFC85C] hover:text-white transition-colors"
            >
              Aetheris.Technology
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { Globe } from 'lucide-react';
import craftDockLogo from '../assets/icon.png';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TitleBarProps {
  activeServer?: ServerProfile | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeServer }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <header
      className="h-[38px] min-h-[38px] max-h-[38px] w-full bg-[#070a14] border-b border-white/[0.08] flex items-center justify-between px-3.5 select-none shrink-0 z-50 relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: App Logo, Name & Version */}
      <div
        className="flex items-center gap-2.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img
          src={craftDockLogo}
          alt="CraftDock"
          className="w-5 h-5 rounded-lg object-cover shadow-sm shadow-sky-500/20 border border-sky-400/30"
        />
        <span className="text-xs font-black text-slate-100 tracking-wide font-sans">
          CraftDock
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 font-bold">
          v2.0.9
        </span>
        <span className="text-slate-600 text-xs hidden sm:inline">•</span>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Server Manager
        </span>
      </div>

      {/* Center: Draggable status or active server info */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden pointer-events-none">
        {activeServer ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate max-w-md bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeServer.status === 'running'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : activeServer.status === 'starting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-slate-200 font-bold truncate">{activeServer.name}</span>
            <span className="text-slate-500">
              ({activeServer.software} v{activeServer.version})
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 font-mono tracking-wider opacity-60">
            {language === 'en' ? 'CraftDock • Drag window from here' : 'CraftDock • Премести прозореца оттук'}
          </span>
        )}
      </div>

      {/* Right side: Language Switcher + reserved 140px space for native Windows titleBarOverlay buttons */}
      <div className="flex items-center">
        <div
          className="flex items-center mr-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-[11px] font-mono text-slate-200 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            title={language === 'en' ? 'Превключи на Български (BG)' : 'Switch to English (EN)'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-sky-300">{language.toUpperCase()}</span>
            <span className="text-[9px] opacity-40">|</span>
            <span className="text-[10px] text-slate-400">{language === 'en' ? 'BG' : 'EN'}</span>
          </button>
        </div>
        <div className="w-[140px] shrink-0 pointer-events-none" />
      </div>
    </header>
  );
};

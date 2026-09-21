import React from 'react';
import { Languages, Sun, Moon, Smartphone } from 'lucide-react';
import craftDockLogo from '../assets/icon.png';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface TitleBarProps {
  activeServer?: ServerProfile | null;
  onOpenMobileRemote?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeServer, onOpenMobileRemote }) => {
  const { language, toggleLanguage } = useLanguage();
  const { theme, activeTheme, toggleTheme } = useTheme();
  const isMac = (window as any).api?.platform === 'darwin' || (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac'));

  return (
    <header
      className={`h-[38px] min-h-[38px] max-h-[38px] w-full ${
        theme === 'light'
          ? 'bg-white/80 border-slate-200/80 text-slate-800 shadow-sm backdrop-blur-md'
          : 'bg-[#070a14] border-white/[0.08] text-slate-100'
      } border-b flex items-center justify-between ${
        isMac ? 'pl-[76px] pr-3.5' : 'px-3.5'
      } select-none shrink-0 z-50 relative transition-colors duration-200`}
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
        <span className={`text-xs font-black tracking-wide font-sans ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
          CraftDock
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-500 dark:text-sky-300 border border-sky-400/20 font-bold">
          v3.4.0
        </span>
        <span className="text-slate-400 dark:text-slate-600 text-xs hidden sm:inline">•</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
          Server Manager
        </span>
      </div>

      {/* Center: Draggable status or active server info */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden pointer-events-none">
        {activeServer ? (
          <div className={`flex items-center gap-2 text-[11px] font-mono truncate max-w-md px-3 py-1 rounded-full border ${
            theme === 'light' ? 'bg-slate-200/50 text-slate-700 border-slate-300/70' : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
          }`}>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeServer.status === 'running'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : activeServer.status === 'starting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className={`font-bold truncate ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>{activeServer.name}</span>
            <span className="opacity-70">
              ({activeServer.software} v{activeServer.version})
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider opacity-60">
            {language === 'en' ? 'CraftDock • Drag window from here' : 'CraftDock • Премести прозореца оттук'}
          </span>
        )}
      </div>

      {/* Right side: Theme Toggle + Language Switcher + reserved 140px space for native Windows controls */}
      <div className="flex items-center">
        <div
          className="flex items-center gap-2 mr-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Mobile Remote Quick Button */}
          {onOpenMobileRemote && (
            <button
              type="button"
              onClick={onOpenMobileRemote}
              className="btn-bounce flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer shadow-sm bg-sky-500/10 hover:bg-sky-500/20 border-sky-400/30 text-sky-300 hover:text-white"
              title={language === 'en' ? 'Open Mobile Web Remote (Wi-Fi)' : 'Отвори управление от телефон (Wi-Fi)'}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-[10px]">REMOTE</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-bounce flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer shadow-sm bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-slate-200 hover:text-white"
            title={activeTheme === 'dark' ? (language === 'en' ? 'Switch to Light Theme' : 'Смени на Светла тема') : (language === 'en' ? 'Switch to Dark Theme' : 'Смени на Тъмна тема')}
          >
            {activeTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 icon-rotate" />
                <span className="font-bold text-amber-300 text-[10px]">{language === 'en' ? 'LIGHT' : 'СВЕТЛА'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 icon-rotate" />
                <span className="font-bold text-indigo-400 text-[10px]">{language === 'en' ? 'DARK' : 'ТЪМНА'}</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className={`btn-bounce flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all shadow-sm cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-200/80 hover:bg-slate-300/80 border-slate-300 text-slate-800'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.1] text-slate-200 hover:text-white'
            }`}
            title={language === 'en' ? 'Превключи на Български (BG)' : 'Switch to English (EN)'}
          >
            <Languages className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 icon-rotate" />
            <span className="font-bold text-sky-500 dark:text-sky-300">{language.toUpperCase()}</span>
            <span className="text-[9px] opacity-40">|</span>
            <span className="text-[10px] opacity-70">{language === 'en' ? 'BG' : 'EN'}</span>
          </button>
        </div>
        {!isMac && <div className="w-[140px] shrink-0 pointer-events-none" />}
      </div>
    </header>
  );
};

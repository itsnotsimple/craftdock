import React from 'react';
import { Server, PlusCircle, Terminal, HardDrive, Sparkles, Settings } from 'lucide-react';
import { ServerProfile, SystemInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentTab: 'library' | 'wizard' | 'dashboard' | 'settings';
  onTabChange: (tab: 'library' | 'wizard' | 'dashboard' | 'settings') => void;
  servers: ServerProfile[];
  activeServerId: string | null;
  systemInfo: SystemInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  servers,
  activeServerId,
  systemInfo,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const activeServer = servers.find((s) => s.id === activeServerId);
  const runningServersCount = servers.filter((s) => s.status === 'running' || s.status === 'starting').length;

  return (
    <aside
      className={`w-64 border-r flex flex-col justify-between shrink-0 select-none h-full backdrop-blur-2xl relative z-10 transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-white/70 border-slate-200/80 text-slate-800 shadow-sm'
          : 'bg-slate-950/40 border-white/[0.08] text-slate-100'
      }`}
    >
      <div>
        {/* Navigation */}
        <div className="p-3.5 space-y-1.5">
          <button
            onClick={() => onTabChange('library')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group cursor-pointer ${
              currentTab === 'library'
                ? theme === 'light'
                  ? 'bg-sky-50 text-sky-800 border border-sky-300 font-bold shadow-xs'
                  : 'bg-sky-500/15 text-sky-200 border border-sky-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {currentTab === 'library' && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${
                theme === 'light' ? 'bg-sky-600' : 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]'
              }`} />
            )}
            <div className="flex items-center gap-3">
              <Server className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                currentTab === 'library'
                  ? theme === 'light' ? 'text-sky-600' : 'text-indigo-400'
                  : theme === 'light' ? 'text-slate-500' : 'text-indigo-400/70'
              }`} />
              <span>{t('sidebar.library')}</span>
            </div>
            {servers.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-lg font-mono border ${
                theme === 'light'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-900/80 text-slate-300 border-white/[0.08]'
              }`}>
                {servers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('wizard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group cursor-pointer ${
              currentTab === 'wizard'
                ? theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs'
                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {currentTab === 'wizard' && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${
                theme === 'light' ? 'bg-emerald-600' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`} />
            )}
            <PlusCircle className={`w-4 h-4 transition-transform group-hover:scale-110 ${
              theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
            }`} />
            <span>{t('sidebar.wizard')}</span>
          </button>

          {activeServer && (
            <button
              onClick={() => onTabChange('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group cursor-pointer ${
                currentTab === 'dashboard'
                  ? theme === 'light'
                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold shadow-xs'
                    : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {currentTab === 'dashboard' && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${
                  theme === 'light' ? 'bg-cyan-600' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                }`} />
              )}
              <div className="flex items-center gap-3">
                <Terminal className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  activeServer.status === 'running'
                    ? theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                    : theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'
                }`} />
                <span className="truncate max-w-[120px]">{activeServer.name}</span>
              </div>
              <div className="relative flex items-center justify-center">
                {activeServer.status === 'running' ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : activeServer.status === 'starting' ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <span className={`w-2.5 h-2.5 rounded-full ${theme === 'light' ? 'bg-slate-400' : 'bg-slate-700'}`} />
                )}
              </div>
            </button>
          )}

          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group cursor-pointer ${
              currentTab === 'settings'
                ? theme === 'light'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold shadow-xs'
                  : 'bg-amber-500/15 text-amber-200 border border-amber-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {currentTab === 'settings' && (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${
                theme === 'light' ? 'bg-amber-600' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              }`} />
            )}
            <Settings className={`w-4 h-4 transition-transform group-hover:scale-110 ${
              theme === 'light' ? 'text-amber-600' : 'text-amber-400'
            }`} />
            <span>{t('sidebar.settings')}</span>
          </button>
        </div>
      </div>

      {/* Footer / System Status */}
      <div className={`p-4 border-t space-y-3 ${
        theme === 'light'
          ? 'border-slate-200 bg-slate-50/50'
          : 'border-white/[0.06] bg-white/[0.01]'
      }`}>
        {runningServersCount > 0 && (
          <div className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-xl border shadow-xs ${
            theme === 'light'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">
              {runningServersCount} {language === 'en' ? (runningServersCount === 1 ? 'server active' : 'servers active') : (runningServersCount === 1 ? 'активен сървър' : 'активни сървъра')}
            </span>
          </div>
        )}

        {systemInfo && (
          <div className={`space-y-2 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                {t('sidebar.systemRam')}
              </span>
              <span className={`font-semibold font-mono ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                {systemInfo.freeRamGb}GB / {systemInfo.totalRamGb}GB
              </span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
              theme === 'light'
                ? 'bg-slate-200 border-slate-300'
                : 'bg-slate-900/90 border-white/[0.06]'
            }`}>
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((systemInfo.totalRamGb - systemInfo.freeRamGb) / systemInfo.totalRamGb) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className={`pt-2 text-[10px] flex items-center justify-between font-mono ${
          theme === 'light' ? 'text-slate-500' : 'text-slate-500'
        }`}>
          <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            <Sparkles className="w-3 h-3 text-sky-500" /> {language === 'en' ? 'Local Hardware' : '100% Твой Хардуер'}
          </span>
          <span className={`font-medium ${theme === 'light' ? 'text-sky-700' : 'text-sky-400'}`}>v2.3.1</span>
        </div>
      </div>
    </aside>
  );
};

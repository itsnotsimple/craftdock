import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Server as ServerIcon,
  Sparkles,
  Search,
  Activity,
  Cpu,
  Layers,
  X,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { ServerCard } from '../components/ServerCard';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface LibraryViewProps {
  servers: ServerProfile[];
  onStartServer: (id: string) => void;
  onStopServer: (id: string) => void;
  onOpenDashboard: (id: string) => void;
  onOpenNetwork: (server: ServerProfile) => void;
  onOpenFolder: (id: string) => void;
  onDeleteServer: (id: string) => void;
  onNavigateToWizard: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  servers,
  onStartServer,
  onStopServer,
  onOpenDashboard,
  onOpenNetwork,
  onOpenFolder,
  onDeleteServer,
  onNavigateToWizard,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  const runningCount = useMemo(() => {
    return servers.filter((s) => s.status === 'running' || s.status === 'starting').length;
  }, [servers]);

  const totalRamGb = useMemo(() => {
    return servers.reduce((acc, s) => acc + (s.allocatedRamGb || 0), 0);
  }, [servers]);

  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      // Status filter
      if (statusFilter === 'online') {
        if (server.status !== 'running' && server.status !== 'starting') return false;
      } else if (statusFilter === 'offline') {
        if (server.status === 'running' || server.status === 'starting') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = server.name.toLowerCase().includes(q);
        const matchSoftware = server.software.toLowerCase().includes(q);
        const matchVersion = server.version?.toLowerCase().includes(q);
        const matchMotd = server.motd?.toLowerCase().includes(q);
        const matchPort = server.port?.toString().includes(q);
        return matchName || matchSoftware || matchVersion || matchMotd || matchPort;
      }

      return true;
    });
  }, [servers, statusFilter, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {t('library.title')}
            </h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border font-mono ${
              theme === 'light'
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {servers.length} {t('library.totalServers')}
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {t('library.subtitle')}
          </p>
        </div>

        <button
          onClick={onNavigateToWizard}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-950/50 glow-purple cursor-pointer btn-bounce shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" />
          <span>{t('library.createNew')}</span>
        </button>
      </div>

      {servers.length > 0 && (
        <>
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Servers */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs'
                : 'glass-card'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-white/[0.05] border-white/[0.08] text-slate-300'
              }`}>
                <Layers className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <div className={`text-lg font-black leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  {servers.length}
                </div>
                <div className={`text-[11px] font-medium truncate ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'bg' ? 'Всички сървъри' : 'Total Servers'}
                </div>
              </div>
            </div>

            {/* Active Running */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs'
                : 'glass-card'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                theme === 'light'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <div className={`text-lg font-black leading-tight flex items-center gap-2 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  {runningCount}
                  {runningCount > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <div className={`text-[11px] font-medium truncate ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'bg' ? 'Активни / Онлайн' : 'Active / Running'}
                </div>
              </div>
            </div>

            {/* Total RAM */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs'
                : 'glass-card'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                theme === 'light'
                  ? 'bg-purple-50 border-purple-200 text-purple-600'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
              }`}>
                <Cpu className="w-5 h-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <div className={`text-lg font-black leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  {totalRamGb} GB
                </div>
                <div className={`text-[11px] font-medium truncate ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('library.totalRam')}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('library.searchPlaceholder')}
                className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs transition-all focus:outline-none border ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xs'
                    : 'glass-input text-slate-200 placeholder:text-slate-500 focus:border-indigo-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border self-start sm:self-auto ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'glass-card border-white/[0.08]'
            }`}>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? theme === 'light'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('library.allStatus')} ({servers.length})
              </button>

              <button
                onClick={() => setStatusFilter('online')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'online'
                    ? theme === 'light'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('library.onlineOnly')} ({runningCount})
              </button>

              <button
                onClick={() => setStatusFilter('offline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'offline'
                    ? theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-slate-700 text-white shadow-sm'
                    : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('library.offlineOnly')} ({servers.length - runningCount})
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty State: No servers at all */}
      {servers.length === 0 ? (
        <div className={`rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto mt-12 shadow-2xl border ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-lg'
            : 'border-white/[0.08] bg-slate-900/40 backdrop-blur-2xl'
        }`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border ${
            theme === 'light'
              ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
              : 'bg-indigo-500/15 text-indigo-400 border-indigo-400/30'
          }`}>
            <ServerIcon className="w-8 h-8" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {t('library.emptyTitle')}
          </h3>
          <p className={`text-xs leading-relaxed mb-6 max-w-md ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('library.emptySubtitle')}
          </p>
          <button
            onClick={onNavigateToWizard}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-950/60 glow-green cursor-pointer btn-bounce"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t('library.createNew')}</span>
          </button>
        </div>
      ) : filteredServers.length === 0 ? (
        /* Empty State: Filters returned 0 servers */
        <div className={`p-10 rounded-2xl text-center border space-y-3 ${
          theme === 'light'
            ? 'bg-slate-50/80 border-slate-200 text-slate-600'
            : 'glass-card text-slate-400'
        }`}>
          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-slate-500/10 text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold">
            {t('library.noFilterResults')}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-white text-indigo-700 border-slate-300 hover:bg-slate-50 shadow-xs'
                : 'glass-input text-slate-200 hover:bg-white/[0.08]'
            }`}
          >
            {t('library.clearFilter')}
          </button>
        </div>
      ) : (
        /* Grid of Servers */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onStart={onStartServer}
              onStop={onStopServer}
              onOpenDashboard={onOpenDashboard}
              onOpenNetwork={onOpenNetwork}
              onOpenFolder={onOpenFolder}
              onDelete={onDeleteServer}
              activeRunningServer={servers.find((s) => s.status === 'running' || s.status === 'starting')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

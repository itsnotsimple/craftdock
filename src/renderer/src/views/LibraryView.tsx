import React from 'react';
import { PlusCircle, Server as ServerIcon, Sparkles } from 'lucide-react';
import { ServerProfile } from '../types';
import { ServerCard } from '../components/ServerCard';
import { useLanguage } from '../context/LanguageContext';

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
  const runningCount = servers.filter((s) => s.status === 'running').length;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              {t('library.title')}
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-900 text-slate-300 font-bold border border-slate-800 font-mono">
              {servers.length} {language === 'en' ? (servers.length === 1 ? 'total' : 'total') : 'общо'}
            </span>
            {runningCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-400/30 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {runningCount} {language === 'en' ? 'active' : 'активен'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1.5">
            {t('library.subtitle')}
          </p>
        </div>

        <button
          onClick={onNavigateToWizard}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-950/50 glow-purple cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" /> {t('library.createNew')}
        </button>
      </div>

      {/* Empty State */}
      {servers.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] p-12 text-center bg-slate-900/40 backdrop-blur-2xl flex flex-col items-center justify-center max-w-xl mx-auto mt-12 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-400/30">
            <ServerIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">{t('library.emptyTitle')}</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-md">
            {t('library.emptySubtitle')}
          </p>
          <button
            onClick={onNavigateToWizard}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-950/60 glow-green cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> {t('library.createNew')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
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

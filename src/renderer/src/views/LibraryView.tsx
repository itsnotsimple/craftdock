import React from 'react';
import { PlusCircle, Server as ServerIcon, Sparkles } from 'lucide-react';
import { ServerProfile } from '../types';
import { ServerCard } from '../components/ServerCard';

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
  const runningCount = servers.filter((s) => s.status === 'running').length;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex items-center justify-between mb-8" style={{ paddingRight: '145px' }}>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              Моите Сървъри
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-900 text-slate-300 font-bold border border-slate-800 font-mono">
              {servers.length} общо
            </span>
            {runningCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-400/30 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                {runningCount} активен
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1.5">
            Управлявай твоите лични домашни Minecraft светове без месечни такси и без лаг
          </p>
        </div>

        <button
          onClick={onNavigateToWizard}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-xl shadow-sky-950/50 glow-ice cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Създай Нов Сървър
        </button>
      </div>

      {/* Empty State */}
      {servers.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] p-12 text-center bg-slate-900/40 backdrop-blur-2xl flex flex-col items-center justify-center max-w-xl mx-auto mt-12 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-400/20">
            <ServerIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Все още нямаш създадени сървъри</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-md">
            Забрави за умрелите безплатни хостове с 1 GB RAM, опашки и прекъсвания! Превърни твоя мощен компютър в гейминг хост за твоите авери с един клик.
          </p>
          <button
            onClick={onNavigateToWizard}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-sky-950/60 glow-ice cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Стартирай Server Wizard
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

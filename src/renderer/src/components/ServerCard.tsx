import React from 'react';
import { Play, Square, Terminal, FolderOpen, Trash2, Globe, Users, Cpu, ShieldCheck } from 'lucide-react';
import { ServerProfile } from '../types';

interface ServerCardProps {
  server: ServerProfile;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onOpenDashboard: (id: string) => void;
  onOpenNetwork: (server: ServerProfile) => void;
  onOpenFolder: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onStart,
  onStop,
  onOpenDashboard,
  onOpenNetwork,
  onOpenFolder,
  onDelete,
}) => {
  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const isStopping = server.status === 'stopping';

  const getSoftwareBadge = () => {
    switch (server.software) {
      case 'paper':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PaperMC (Бърз)</span>;
      case 'purpur':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Purpur</span>;
      case 'fabric':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Fabric Модове</span>;
      case 'vanilla':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Vanilla</span>;
    }
  };

  return (
    <div
      onClick={() => onOpenDashboard(server.id)}
      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/95 transition-all duration-200 flex flex-col justify-between shadow-lg relative group cursor-pointer"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors">
                {server.name}
              </h3>
              {getSoftwareBadge()}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Minecraft v{server.version} • Порт: :{server.port}
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {isRunning && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Онлайн
              </span>
            )}
            {isStarting && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Стартира...
              </span>
            )}
            {isStopping && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Спира се...
              </span>
            )}
            {!isRunning && !isStarting && !isStopping && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-500" /> Офлайн
              </span>
            )}
          </div>
        </div>

        {/* Server specs row */}
        <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>RAM: <strong className="text-slate-100 font-mono">{server.allocatedRamGb} GB</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Играчи: <strong className="text-slate-100 font-mono">{isRunning ? (server.playerCount || 0) : 0}/{server.maxPlayers || 20}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="space-y-2 pt-2 border-t border-slate-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStop(server.id);
              }}
              disabled={isStopping}
              className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-900/30"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Спри Сървъра
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(server.id);
              }}
              disabled={isStarting}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/40 glow-green"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Стартирай (1 Клик)
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDashboard(server.id);
            }}
            title="Конзола и управление"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenNetwork(server);
            }}
            title="Връзка и IP за играчите"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Secondary subtle actions */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder(server.id);
            }}
            className="flex items-center gap-1 hover:text-slate-200 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Отвори папка
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(server.id);
            }}
            disabled={isRunning}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" /> Изтрий
          </button>
        </div>
      </div>
    </div>
  );
};

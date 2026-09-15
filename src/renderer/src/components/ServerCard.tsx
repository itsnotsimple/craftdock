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
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-400/20 font-mono">PaperMC</span>;
      case 'purpur':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-400/20 font-mono">Purpur</span>;
      case 'fabric':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-400/20 font-mono">Fabric</span>;
      case 'vanilla':
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-400/20 font-mono">Vanilla</span>;
    }
  };

  return (
    <div
      onClick={() => onOpenDashboard(server.id)}
      className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] hover:border-sky-400/40 hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between shadow-xl relative group cursor-pointer backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors tracking-tight">
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
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-sm shadow-sky-950/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                Онлайн
              </span>
            )}
            {isStarting && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-400/30 shadow-sm shadow-amber-950/50">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Стартира...
              </span>
            )}
            {isStopping && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-400/30">
                Спира се...
              </span>
            )}
            {!isRunning && !isStarting && !isStopping && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                <span className="w-2 h-2 rounded-full bg-slate-600" /> Офлайн
              </span>
            )}
          </div>
        </div>

        {/* Server specs row */}
        <div className="grid grid-cols-2 gap-2 my-3.5 p-3 rounded-xl bg-slate-950/40 border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>RAM: <strong className="text-slate-100">{server.allocatedRamGb} GB</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Играчи: <strong className="text-slate-100">{isRunning ? (server.playerCount || 0) : 0}/{server.maxPlayers || 20}</strong></span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="space-y-2 pt-2.5 border-t border-white/[0.06]"
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
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50"
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
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-950/50 glow-ice cursor-pointer disabled:opacity-50"
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
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white transition-all border border-white/[0.08] hover:border-sky-400/40 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-sky-400" />
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

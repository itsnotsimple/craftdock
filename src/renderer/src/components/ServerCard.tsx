import React from 'react';
import {
  Play,
  Square,
  Terminal,
  FolderOpen,
  Trash2,
  Globe,
  Users,
  Cpu,
  ShieldCheck,
  Loader2,
  HardDrive,
  Flame,
  ArrowRightLeft,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ServerCardProps {
  server: ServerProfile;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onOpenDashboard: (id: string) => void;
  onOpenNetwork: (server: ServerProfile) => void;
  onOpenFolder: (id: string) => void;
  onDelete: (id: string) => void;
  activeRunningServer?: ServerProfile | null;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onStart,
  onStop,
  onOpenDashboard,
  onOpenNetwork,
  onOpenFolder,
  onDelete,
  activeRunningServer,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const isStopping = server.status === 'stopping';

  const getSoftwareBadge = () => {
    const isLight = theme === 'light';
    switch (server.software) {
      case 'paper':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono border ${
            isLight ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-sky-500/10 text-sky-300 border-sky-400/20'
          }`}>
            PaperMC
          </span>
        );
      case 'purpur':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono border ${
            isLight ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-indigo-500/10 text-indigo-300 border-indigo-400/20'
          }`}>
            Purpur
          </span>
        );
      case 'fabric':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono border ${
            isLight ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-blue-500/10 text-blue-300 border-blue-400/20'
          }`}>
            Fabric
          </span>
        );
      case 'vanilla':
      default:
        return (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono border ${
            isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-500/10 text-slate-300 border-slate-400/20'
          }`}>
            Vanilla
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onOpenDashboard(server.id)}
      className={`p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between relative group cursor-pointer overflow-hidden border ${
        theme === 'light'
          ? isRunning
            ? 'bg-white border-emerald-300 shadow-md shadow-emerald-500/10 hover:shadow-lg hover:border-emerald-400'
            : isStarting
              ? 'bg-white border-amber-300 shadow-md shadow-amber-500/10'
              : 'bg-white border-slate-200 hover:border-indigo-400/70 shadow-xs hover:shadow-md'
          : isRunning
            ? 'bg-slate-900/60 border-emerald-500/30 shadow-xl shadow-emerald-950/20 hover:border-emerald-400/50 backdrop-blur-2xl'
            : isStarting
              ? 'bg-slate-900/60 border-amber-500/30 shadow-xl shadow-amber-950/20 backdrop-blur-2xl'
              : 'bg-slate-900/40 border-white/[0.08] hover:border-indigo-400/40 hover:bg-slate-900/60 shadow-xl backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]'
      }`}
    >
      {/* Top Status Ambient Glow Strip */}
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
      )}
      {isStarting && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />
      )}
      {isStopping && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 animate-pulse" />
      )}
      {!isRunning && !isStarting && !isStopping && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/[0.06]'}`} />
      )}

      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`text-base font-bold transition-colors tracking-tight truncate ${
                theme === 'light' ? 'text-slate-900 group-hover:text-indigo-600' : 'text-slate-100 group-hover:text-indigo-300'
              }`}>
                {server.name}
              </h3>
              {getSoftwareBadge()}
              {server.hardcore && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border bg-rose-500/15 text-rose-500 border-rose-500/30 flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5 text-rose-500" />
                  Hardcore
                </span>
              )}
            </div>
            <p className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Minecraft v{server.version} • {language === 'en' ? 'Port:' : 'Порт:'} :{server.port}
            </p>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isRunning && (
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-sm shadow-emerald-950/50'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {t('common.online')}
              </span>
            )}
            {isStarting && (
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                theme === 'light'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                  : 'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-sm shadow-amber-950/50'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {t('common.starting')}
              </span>
            )}
            {isStopping && (
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                theme === 'light'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
              }`}>
                {t('common.stopping')}
              </span>
            )}
            {!isRunning && !isStarting && !isStopping && (
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                theme === 'light'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
              }`}>
                <span className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-slate-400' : 'bg-slate-600'}`} /> {t('common.offline')}
              </span>
            )}
          </div>
        </div>

        {/* MOTD Preview (if set) */}
        {server.motd && (
          <p className={`text-[11px] truncate italic px-2.5 py-1 rounded-lg border my-1.5 ${
            theme === 'light'
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-400'
          }`}>
            "{server.motd}"
          </p>
        )}

        {/* Server specs row: RAM, Players, Storage */}
        <div className={`grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl border text-[11px] font-mono ${
          theme === 'light'
            ? 'bg-slate-50/80 border-slate-200 text-slate-700'
            : 'bg-slate-950/40 border-white/[0.06] text-slate-300'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <Cpu className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="truncate">
              {t('common.ram')}: <strong className={theme === 'light' ? 'text-slate-900 font-bold' : 'text-slate-100'}>{server.allocatedRamGb}G</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="truncate">
              {isRunning ? (server.playerCount || 0) : 0}/{server.maxPlayers || 20}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              {server.storageQuotaGb ? `${server.storageQuotaGb}G` : (language === 'bg' ? 'Без лимит' : 'Unlimited')}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={`space-y-2 pt-2.5 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/[0.06]'}`}
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
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/50 cursor-pointer disabled:opacity-50 btn-bounce"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> {isStopping ? t('common.stopping') : t('common.stop')}
            </button>
          ) : isStarting ? (
            <button
              disabled={true}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-not-allowed opacity-90"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>{t('common.starting')}</span>
            </button>
          ) : isStopping ? (
            <button
              disabled={true}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/30 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-not-allowed opacity-90"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              <span>{t('common.stopping')}</span>
            </button>
          ) : activeRunningServer && activeRunningServer.id !== server.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(server.id);
              }}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-amber-400/30 cursor-pointer shadow-sm shadow-amber-950/40 btn-bounce"
              title={t('serverCard.runningAnother', { name: activeRunningServer.name })}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">{t('serverCard.switchToThis')}</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart(server.id);
              }}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 glow-green cursor-pointer btn-bounce"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> {t('common.startOneClick')}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDashboard(server.id);
            }}
            title={t('serverCard.console')}
            className={`p-2.5 rounded-xl transition-all border cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs hover:border-emerald-500/50'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border-white/[0.08] hover:border-emerald-400/40'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenNetwork(server);
            }}
            title={t('dashboard.ipForFriends')}
            className={`p-2.5 rounded-xl transition-all border cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs hover:border-cyan-500/50'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border-white/[0.08] hover:border-cyan-400/40'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-500" />
          </button>
        </div>

        {/* Secondary subtle actions */}
        <div className={`flex items-center justify-between pt-1 text-[11px] ${
          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder(server.id);
            }}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'light'
                ? 'text-slate-600 hover:text-amber-600 font-medium'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> {language === 'en' ? 'Open Folder' : 'Отвори папка'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(server.id);
            }}
            disabled={isRunning}
            className={`flex items-center gap-1 transition-colors disabled:opacity-30 cursor-pointer ${
              theme === 'light'
                ? 'text-slate-500 hover:text-rose-600'
                : 'text-slate-500 hover:text-rose-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

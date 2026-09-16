import React from 'react';
import { AlertTriangle, Play, X, ArrowRight } from 'lucide-react';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ServerConflictModalProps {
  isOpen: boolean;
  runningServer: ServerProfile;
  targetServer: ServerProfile;
  onClose: () => void;
  onStopAndSwitch: () => void;
  onGoToRunning: () => void;
}

export const ServerConflictModal: React.FC<ServerConflictModalProps> = ({
  isOpen,
  runningServer,
  targetServer,
  onClose,
  onStopAndSwitch,
  onGoToRunning,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const isStarting = runningServer.status === 'starting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-2xl p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/30 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 tracking-tight">
                {t('conflict.title')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('conflict.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Body */}
        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-400">
                {t('conflict.currentlyRunning')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {isStarting ? t('common.starting') : t('common.online')}
              </span>
            </div>
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>{runningServer.name}</span>
              <span className="text-xs font-mono text-slate-400">(:{runningServer.port})</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed">
            💡 <strong>{t('conflict.whyOnlyOneTitle')}</strong> {t('conflict.whyOnlyOneDesc')}
          </div>

          <p className="text-slate-400 text-xs">
            {t('conflict.switchPrompt', { running: runningServer.name, target: targetServer.name })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
          <button
            onClick={onStopAndSwitch}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 glow-green cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('conflict.switchBtn', { running: runningServer.name, target: targetServer.name })}</span>
          </button>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onGoToRunning}
              className="flex-1 py-2 px-3 rounded-xl glass-card hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/[0.08] cursor-pointer"
            >
              <span>{t('conflict.goToRunningBtn', { running: runningServer.name })}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl glass-card hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all border border-white/[0.08] cursor-pointer"
            >
              {t('conflict.cancelBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

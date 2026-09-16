import React from 'react';
import { AlertTriangle, Play, X, ArrowRight, Lightbulb } from 'lucide-react';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  if (!isOpen) return null;

  const isStarting = runningServer.status === 'starting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-2xl p-4 animate-in fade-in duration-200 select-none">
      <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
        theme === 'light'
          ? 'bg-white border border-amber-300 shadow-xl'
          : 'glass-panel border border-amber-500/30'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              theme === 'light'
                ? 'bg-amber-100 border-amber-300 text-amber-600'
                : 'bg-amber-500/15 border-amber-400/30 text-amber-400 shadow-lg shadow-amber-950/50'
            }`}>
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className={`text-base font-black tracking-tight ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {t('conflict.title')}
              </h3>
              <p className={`text-xs mt-0.5 ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {t('conflict.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              theme === 'light' ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Body */}
        <div className="space-y-3 text-xs leading-relaxed">
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            theme === 'light'
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-950/60 border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] uppercase font-bold ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {t('conflict.currentlyRunning')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                theme === 'light'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {isStarting ? t('common.starting') : t('common.online')}
              </span>
            </div>
            <div className={`font-bold text-sm flex items-center gap-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              <span>{runningServer.name}</span>
              <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>(:{runningServer.port})</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2 ${
            theme === 'light'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-200/90'
          }`}>
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>{t('conflict.whyOnlyOneTitle')}</strong> {t('conflict.whyOnlyOneDesc')}
            </div>
          </div>

          <p className={theme === 'light' ? 'text-slate-600 text-xs' : 'text-slate-400 text-xs'}>
            {t('conflict.switchPrompt', { running: runningServer.name, target: targetServer.name })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className={`space-y-2 pt-2 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'}`}>
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
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
              }`}
            >
              <span>{t('conflict.goToRunningBtn', { running: runningServer.name })}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border-white/[0.08]'
              }`}
            >
              {t('conflict.cancelBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

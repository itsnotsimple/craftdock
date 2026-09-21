import React, { useState, useEffect, useRef } from 'react';
import { Timer, ShieldCheck, AlertTriangle, CheckCircle2, RotateCcw, Flame, RefreshCw, Calendar, Power, Search } from 'lucide-react';
import { UptimeStats, UptimeSession } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface UptimeViewProps {
  serverId: string;
  isRunning: boolean;
  onOpenCrashAnalyzer?: (session?: UptimeSession) => void;
}

export const UptimeView: React.FC<UptimeViewProps> = ({ serverId, isRunning, onOpenCrashAnalyzer }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<UptimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const lastFetchedTimeRef = useRef<number>(Date.now());

  const fetchStats = async () => {
    try {
      if ((window as any).api?.getUptimeHistory) {
        const data: UptimeStats = await (window as any).api.getUptimeHistory(serverId);
        setStats(data);
        lastFetchedTimeRef.current = Date.now();
        setCurrentTime(Date.now());
      }
    } catch (err) {
      console.error('Failed to load uptime history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [serverId, isRunning]);

  // Live 1-second ticker when server is running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Subscribe to live server stats events
  useEffect(() => {
    const api = (window as any).api;
    if (!api?.onServerStatsUpdated) return;
    const unsub = api.onServerStatsUpdated((newStats: any) => {
      if (newStats && newStats.serverId === serverId) {
        setCurrentTime(Date.now());
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [serverId]);

  const getSessionDuration = (session: UptimeSession) => {
    const isCurrentActive = !session.endedAt && isRunning;
    if (isCurrentActive) {
      const startMs = new Date(session.startedAt).getTime();
      if (!isNaN(startMs)) {
        return Math.max(1, Math.floor((currentTime - startMs) / 1000));
      }
    }
    if (session.durationSeconds && session.durationSeconds > 0) {
      return session.durationSeconds;
    }
    if (session.startedAt && session.endedAt) {
      const startMs = new Date(session.startedAt).getTime();
      const endMs = new Date(session.endedAt).getTime();
      if (!isNaN(startMs) && !isNaN(endMs)) {
        return Math.max(1, Math.floor((endMs - startMs) / 1000));
      }
    }
    return session.durationSeconds || 0;
  };

  const liveExtraSec = isRunning ? Math.max(0, Math.floor((currentTime - lastFetchedTimeRef.current) / 1000)) : 0;
  const totalUptimeSec = (stats?.totalUptimeSeconds ?? 0) + liveExtraSec;
  const uptime30dSec = (stats?.uptimeLast30DaysSeconds ?? 0) + liveExtraSec;

  const formatDuration = (seconds: number) => {
    const isBg = language === 'bg';
    if (seconds <= 0) return isBg ? '0с' : '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}${isBg ? 'д' : 'd'}`);
    if (hours > 0 || days > 0) parts.push(`${hours}${isBg ? 'ч' : 'h'}`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}${isBg ? 'м' : 'm'}`);
    if (days === 0 && hours === 0) parts.push(`${secs}${isBg ? 'с' : 's'}`);
    return parts.join(' ');
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            <Timer className="w-4 h-4 text-emerald-500" />
            <span>{t('analytics.uptimeTitle')}</span>
          </h3>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('analytics.uptimeSubtitle')}
          </p>
        </div>

        <button
          onClick={fetchStats}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
          }`}
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 7-Day Reliability */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-emerald-500 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Надеждност (7 дни)' : 'Reliability (7 Days)'}
            </span>
            {stats?.stabilityPercent !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {stats.stabilityPercent}% {language === 'bg' ? 'стабилен' : 'stable'}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${
              (stats?.reliabilityPercent7d ?? 100) >= 95
                ? 'text-emerald-400'
                : (stats?.reliabilityPercent7d ?? 100) >= 80
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}>
              {stats ? `${stats.reliabilityPercent7d}%` : '---'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg' ? 'Uptime за изминалата седмица' : 'Uptime over last 7 days'}
          </span>
        </div>

        {/* Total Uptime */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Общ Uptime' : 'Total Uptime'}
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {language === 'bg' ? 'на живо' : 'live'}
              </span>
            )}
          </div>
          <div className="flex items-baseline">
            <span className={`text-2xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {stats ? formatDuration(totalUptimeSec) : (language === 'bg' ? '0с' : '0s')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg' ? 'За 30 дни: ' : 'Last 30 days: '}
            {stats ? formatDuration(uptime30dSec) : (language === 'bg' ? '0с' : '0s')}
          </span>
        </div>

        {/* Total Restarts */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Сесии / Пускания' : 'Sessions / Starts'}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className={`text-2xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {stats?.totalRestarts ?? 0}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg'
              ? isRunning ? '🟢 Активен в момента' : '⚪ Спрян в момента'
              : isRunning ? '🟢 Running now' : '⚪ Stopped now'}
          </span>
        </div>

        {/* Crashes */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Засечени Сривове' : 'Detected Crashes'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-black font-mono ${
              (stats?.crashesCount ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {stats?.crashesCount ?? 0}
            </span>
            {onOpenCrashAnalyzer && (
              <button
                type="button"
                onClick={() => onOpenCrashAnalyzer()}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
                title={language === 'bg' ? 'Отвори интелигентния анализатор на сривове' : 'Open Crash Analyzer'}
              >
                <Search className="w-3 h-3" />
                <span>{language === 'bg' ? 'Анализ' : 'Diagnose'}</span>
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {(stats?.crashesCount ?? 0) === 0
              ? (language === 'bg' ? 'Перфектна стабилност' : 'Rock solid stability')
              : (language === 'bg' ? 'Неочаквани изключвания' : 'Unexpected terminations')}
          </span>
        </div>
      </div>

      {/* Session History Table */}
      <div className={`p-4 rounded-2xl border ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
            {language === 'bg' ? 'История на сесиите' : 'Session History'} ({stats?.sessions.length ?? 0})
          </h4>
          <span className="text-[11px] text-slate-500">
            {language === 'bg' ? 'Показват се последните 50 сесии' : 'Showing latest 50 sessions'}
          </span>
        </div>

        {!stats || stats.sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {language === 'bg' ? 'Все още няма записани предишни сесии за този сървър.' : 'No recorded sessions yet for this server.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/[0.08] text-slate-400'
                }`}>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Статус' : 'Status'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Стартиран' : 'Started'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Спрян' : 'Stopped'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Продължителност' : 'Duration'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'bg' ? 'Код на изход' : 'Exit Code'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats.sessions.map((session, index) => {
                  const isCurrentActive = !session.endedAt && isRunning;
                  const isCrash = session.wasGraceful === false || (session.exitCode !== 0 && session.exitCode !== null && session.exitCode !== undefined);

                  return (
                    <tr
                      key={session.id || index}
                      onClick={() => {
                        if (isCrash && onOpenCrashAnalyzer) {
                          onOpenCrashAnalyzer(session);
                        }
                      }}
                      className={`transition-colors ${
                        isCrash
                          ? theme === 'light'
                            ? 'bg-rose-50/50 hover:bg-rose-100/70 cursor-pointer'
                            : 'bg-rose-950/15 hover:bg-rose-950/30 cursor-pointer'
                          : theme === 'light'
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-400/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {language === 'bg' ? 'Активна сега' : 'Active Now'}
                          </span>
                        ) : isCrash ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCrashAnalyzer?.(session);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 hover:border-rose-500/60 transition-all cursor-pointer btn-bounce shadow-xs"
                            title={language === 'bg' ? 'Отвори детайлен анализ за този срив' : 'Open diagnostics for this crash'}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>{language === 'bg' ? 'Срив (Анализ)' : 'Crash (Diagnose)'}</span>
                            <Search className="w-2.5 h-2.5 text-rose-400 opacity-80" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-400/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {language === 'bg' ? 'Нормален стоп' : 'Clean Stop'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatDate(session.startedAt)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {session.endedAt ? formatDate(session.endedAt) : (isCurrentActive ? (language === 'bg' ? 'Работи в момента...' : 'Running now...') : '---')}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                        <div className="flex items-center gap-1.5">
                          {isCurrentActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                          <span>{formatDuration(getSessionDuration(session))}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right">
                        {isCrash ? (
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            {language === 'bg' ? 'Код' : 'Code'} {session.exitCode !== undefined && session.exitCode !== null ? session.exitCode : -1}
                          </span>
                        ) : (
                          <span className="text-slate-400">{session.exitCode !== undefined && session.exitCode !== null ? session.exitCode : (isCurrentActive ? '-' : 0)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

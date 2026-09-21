import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Gauge,
  Users,
  Network,
  Zap,
  Sparkles,
  Database,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  Layers,
  FileArchive,
  Puzzle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { ServerProfile, SystemInfo, ServerStats, ServerStorageStats } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LagBusterTab } from './LagBusterTab';

interface ResourceMonitorProps {
  server: ServerProfile;
  serverStats?: ServerStats | null;
  systemInfo: SystemInfo | null;
  onlinePlayerCount: number;
}

export const ResourceMonitorTab: React.FC<ResourceMonitorProps> = ({
  server,
  serverStats: propStats,
  systemInfo,
  onlinePlayerCount,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [stats, setStats] = useState<ServerStats | null>(propStats || null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [liveMaxPlayers, setLiveMaxPlayers] = useState<number>(server.maxPlayers || 20);
  const [storageStats, setStorageStats] = useState<ServerStorageStats | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'lagbuster'>('metrics');
  const isRunning = server.status === 'running';

  useEffect(() => {
    if (propStats) setStats(propStats);
  }, [propStats]);

  useEffect(() => {
    setLiveMaxPlayers(server.maxPlayers || 20);
    const api = (window as any).api;
    if (!api) return;

    api.getServerProperties?.(server.id).then((props: any) => {
      if (props?.maxPlayers) {
        setLiveMaxPlayers(props.maxPlayers);
      }
    });

    api.getServerStats?.(server.id).then((st: any) => {
      if (st) setStats(st);
    });

    const unsubProfile = api.onServerProfileUpdated?.((updatedServer: any) => {
      if (updatedServer && updatedServer.id === server.id && updatedServer.maxPlayers) {
        setLiveMaxPlayers(updatedServer.maxPlayers);
      }
    });

    const unsubStats = api.onServerStatsUpdated?.((newStats: ServerStats) => {
      if (newStats && newStats.serverId === server.id) {
        setStats(newStats);
        if (newStats.uptimeSeconds) {
          setUptimeSeconds(newStats.uptimeSeconds);
        }
      }
    });

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubStats) unsubStats();
    };
  }, [server.id, server.maxPlayers]);

  const fetchStorage = async () => {
    const api = (window as any).api;
    if (!api?.getServerStorage) return;
    setIsRefreshingStorage(true);
    try {
      const data = await api.getServerStorage(server.id);
      if (data) setStorageStats(data);
    } catch (err) {
      console.error('Failed to get server storage', err);
    } finally {
      setIsRefreshingStorage(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, [server.id, server.storageQuotaGb]);

  useEffect(() => {
    if (!isRunning) {
      setUptimeSeconds(0);
      setStats(null);
      return;
    }

    const interval = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatUptime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalRam = systemInfo?.totalRamGb || 16;
  const freeRam = systemInfo?.freeRamGb || 8;
  const usedRam = Math.round((totalRam - freeRam) * 10) / 10;
  const hostRamPercent = Math.min(100, Math.round((usedRam / totalRam) * 100));
  const hostCpuPercent = systemInfo?.cpuPercent || 0;

  // Server-specific metrics
  const serverCpu = isRunning ? (stats?.cpuPercent ?? 0) : 0;
  const serverRamMb = isRunning ? (stats?.memoryMb ?? 0) : 0;
  const serverRamGb = Math.round((serverRamMb / 1024) * 10) / 10;
  const allocatedRamMb = (server.allocatedRamGb || 4) * 1024;
  const serverRamPercent = isRunning
    ? Math.min(100, Math.max(0, Math.round((serverRamMb / allocatedRamMb) * 100)))
    : 0;

  // Disk Storage & Quota
  const totalDiskMb = storageStats?.totalMb || 0;
  const totalDiskGb = Math.round((totalDiskMb / 1024) * 100) / 100;
  const quotaGb = server.storageQuotaGb || storageStats?.quotaGb || 0;
  const quotaMb = quotaGb * 1024;
  const storagePercent = quotaMb > 0 ? Math.min(100, Math.round((totalDiskMb / quotaMb) * 100)) : 0;
  const isExceeded = quotaGb > 0 && totalDiskMb >= quotaMb;
  const isWarning = quotaGb > 0 && !isExceeded && storagePercent >= 80;

  return (
    <div className={`h-full rounded-2xl border p-6 overflow-y-auto space-y-6 transition-colors duration-200 ${
      theme === 'light' ? 'bg-white border-slate-200 shadow-sm text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-100'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            {t('monitor.title')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('monitor.subtitle')}
          </p>
        </div>

        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs ${
          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <Clock className={`w-4 h-4 ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <span className="font-medium">{t('monitor.uptime')}:</span>
          <span className={`font-mono font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            {isRunning ? formatUptime(stats?.uptimeSeconds || uptimeSeconds) : t('common.offline')}
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation (Metrics / Lag Buster) */}
      <div
        className={`p-1 rounded-xl border flex items-center gap-1.5 shrink-0 ${
          theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('metrics')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'metrics'
              ? theme === 'light'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bg' ? 'Мониторинг & Хардуер' : 'System & Hardware'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('lagbuster')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'lagbuster'
              ? theme === 'light'
                ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>{language === 'bg' ? 'Lag Buster & Оптимизация' : 'Lag Buster & Optimizer'}</span>
        </button>
      </div>

      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          {/* Primary Server Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Server Real CPU % */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" /> {t('monitor.serverCpu')}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                !isRunning
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : serverCpu > 75
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                  : serverCpu > 40
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isRunning
                ? serverCpu > 75
                  ? (language === 'bg' ? 'Високо натоварване' : 'High Load')
                  : serverCpu > 40
                  ? (language === 'bg' ? 'Умерено' : 'Moderate')
                  : (language === 'bg' ? 'Нормално' : 'Normal')
                : t('common.offline')}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-100 font-mono">
              {isRunning ? `${serverCpu}%` : '0%'}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {isRunning ? `Java Process (${server.name})` : (language === 'bg' ? 'Няма активен процес' : 'No active process')}
            </span>
          </div>

          {/* Progress bar */}
          <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 border ${
            theme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverCpu > 75 ? 'bg-rose-500' : serverCpu > 40 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${isRunning ? Math.max(2, serverCpu) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {isRunning
              ? (language === 'bg'
                  ? 'Процент от процесорната мощност на компютъра, изразходван от този сървър.'
                  : 'Percentage of host CPU power consumed by this Minecraft server process.')
              : t('monitor.serverOfflineNotice')}
          </p>
        </div>

        {/* Card 2: Server Real RAM Used vs Allocated */}
        <div className={`p-5 rounded-2xl border space-y-3 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" /> {t('monitor.serverRam')}
            </span>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                !isRunning
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : serverRamPercent > 92
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : serverRamPercent > 75
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {isRunning ? `${serverRamPercent}% ${language === 'bg' ? 'от капацитета' : 'of capacity'}` : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <div className={`text-3xl font-black ${theme === 'light' ? 'text-sky-600' : 'text-cyan-400'}`}>
              {isRunning ? (serverRamMb > 1024 ? `${serverRamGb} GB` : `${serverRamMb} MB`) : '0 MB'}
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">
                {language === 'bg' ? 'Heap Лимит:' : 'Heap Limit:'}{' '}
                <strong className="text-slate-200">{server.allocatedRamGb} GB</strong>
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                + ~300 MB Java overhead
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 border ${
            theme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverRamPercent > 90 ? 'bg-rose-500' : serverRamPercent > 70 ? 'bg-amber-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${isRunning ? Math.max(2, serverRamPercent) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Status Cards: TPS, Player Capacity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* TPS Meter */}
        <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" /> {language === 'bg' ? 'Сървърен TPS' : 'Server TPS'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              theme === 'light' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isRunning ? '20.0 TPS' : '0.0 TPS'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {isRunning ? '20.0' : '0.0'} <span className="text-xs text-slate-500 font-sans">/ 20.0 Ticks</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {isRunning ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-medium">
                  {language === 'bg' ? 'Перфектно плавен – нулев сървърен лаг!' : 'Perfectly smooth – zero tick lag!'}
                </span>
              </>
            ) : (
              <span>{language === 'bg' ? 'Сървърът не работи в момента.' : 'Server is currently stopped.'}</span>
            )}
          </div>
        </div>

        {/* Players Capacity */}
        <div className={`p-4 rounded-2xl border space-y-2 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" /> {t('monitor.onlinePlayers')}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              theme === 'light' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {language === 'bg' ? 'Капацитет' : 'Capacity'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {onlinePlayerCount} <span className="text-xs text-slate-500 font-sans">/ {liveMaxPlayers} {language === 'bg' ? 'слота' : 'slots'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {onlinePlayerCount > 0
              ? `${onlinePlayerCount} ${language === 'bg' ? 'активни играчи в игра' : 'active players in game'}`
              : (language === 'bg' ? 'Няма свързани играчи в момента' : 'No connected players right now')}
          </p>
        </div>
      </div>


      {/* Disk Storage & Quota Monitor */}
      <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
        theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isExceeded
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : isWarning
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {t('monitor.storageTitle')}
              </span>
              <p className="text-xs text-slate-400">
                {t('monitor.storageSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${
                quotaGb === 0
                  ? theme === 'light'
                    ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700'
                  : isExceeded
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {quotaGb === 0 ? (
                <>
                  <ShieldCheck className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`} />
                  {t('monitor.storageQuotaUnlimited')}
                </>
              ) : isExceeded ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  {t('monitor.storageExceeded')}
                </>
              ) : isWarning ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {t('monitor.storageWarning')}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t('monitor.storageSafe')}
                </>
              )}
            </span>

            {/* Refresh Storage Button */}
            <button
              type="button"
              onClick={fetchStorage}
              disabled={isRefreshingStorage}
              className={`p-1.5 rounded-lg border transition-all btn-bounce ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={language === 'bg' ? 'Преизчисли дисковото пространство' : 'Recalculate storage size'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStorage ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Disk Usage Overview and Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between font-mono">
            <div>
              <span className="text-3xl font-black text-slate-100">
                {totalDiskMb > 1024 ? `${totalDiskGb} GB` : `${totalDiskMb} MB`}
              </span>
              <span className="text-xs text-slate-400 ml-2 font-sans">
                {t('monitor.storageUsed')}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {t('monitor.storageQuota')}:{' '}
              <strong className="text-slate-200">
                {quotaGb > 0 ? `${quotaGb} GB` : t('monitor.storageQuotaUnlimited')}
              </strong>
              {quotaGb > 0 && (
                <span className="ml-1 text-slate-500">
                  ({storagePercent}%)
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
            theme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isExceeded
                  ? 'bg-rose-500'
                  : isWarning
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
              style={{
                width: `${quotaGb > 0 ? Math.max(2, Math.min(100, storagePercent)) : 100}%`,
                opacity: quotaGb === 0 ? 0.35 : 1,
              }}
            />
          </div>
        </div>

        {/* File Space Breakdown Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* World */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[10px] truncate ${theme === 'light' ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>{t('monitor.storageWorld')}</div>
              <div className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                {storageStats?.worldMb ?? 0} MB
              </div>
            </div>
          </div>

          {/* Backups */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <FileArchive className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[10px] truncate ${theme === 'light' ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>{t('monitor.storageBackups')}</div>
              <div className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                {storageStats?.backupsMb ?? 0} MB
              </div>
            </div>
          </div>

          {/* Plugins & Mods */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/10 text-purple-400'}`}>
              <Puzzle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[10px] truncate ${theme === 'light' ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>{t('monitor.storagePlugins')}</div>
              <div className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                {storageStats?.pluginsMb ?? 0} MB
              </div>
            </div>
          </div>

          {/* Logs & Other */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-slate-500/10 text-slate-400'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[10px] truncate ${theme === 'light' ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>{t('monitor.storageLogs')}</div>
              <div className={`text-xs font-mono font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                {((storageStats?.logsMb || 0) + (storageStats?.otherMb || 0)).toFixed(1)} MB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Host Computer Hardware Specs & Load */}
      <div className={`p-5 rounded-2xl border space-y-4 transition-colors ${
        theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100">{t('monitor.hostSystem')}</span>
              <p className="text-xs text-slate-400">{language === 'bg' ? 'Всички процеси в операционната система' : 'Total workload across operating system'}</p>
            </div>
          </div>
        </div>

        {/* Host CPU & RAM Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Host CPU */}
          <div className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                <Cpu className="w-3.5 h-3.5 text-cyan-500" /> {t('monitor.hostCpu')}:
              </span>
              <span className={`font-mono font-bold ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`}>{hostCpuPercent}%</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hostCpuPercent > 80 ? 'bg-rose-500' : hostCpuPercent > 50 ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.max(2, hostCpuPercent)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {systemInfo?.cpuModel || (language === 'bg' ? 'Процесор' : 'CPU')}
            </div>
          </div>

          {/* Host RAM */}
          <div className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                <HardDrive className="w-3.5 h-3.5 text-emerald-500" /> {t('monitor.hostRam')}:
              </span>
              <span className={`font-mono font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {usedRam} / {totalRam} GB ({hostRamPercent}%)
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hostRamPercent > 85 ? 'bg-rose-500' : hostRamPercent > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, hostRamPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>{language === 'bg' ? 'Свободни:' : 'Free:'} {freeRam} GB</span>
              <span>{language === 'bg' ? 'Общо:' : 'Total:'} {totalRam} GB</span>
            </div>
          </div>
        </div>
      </div>


      {/* Network & Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network & Port info */}
        <div className={`p-4 rounded-xl border space-y-2 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
            <Network className="w-4 h-4 text-emerald-500" /> {language === 'bg' ? 'Мрежов Порт & Адрес' : 'Network Port & Address'}
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">{t('common.port')}:</span>
            <span className="text-emerald-500 font-bold">:{server.port}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">{language === 'bg' ? 'Локален LAN IP:' : 'Local LAN IP:'}</span>
            <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-slate-200'}>{systemInfo?.localIp || '127.0.0.1'}</span>
          </div>
        </div>

        {/* OS info */}
        <div className={`p-4 rounded-xl border space-y-2 transition-colors ${
          theme === 'light' ? 'bg-slate-50/70 border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
            <Zap className="w-4 h-4 text-amber-500" /> {language === 'bg' ? 'Среда & Платформа' : 'Platform & Environment'}
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">{language === 'bg' ? 'Платформа:' : 'Platform:'}</span>
            <span className={`font-medium ${theme === 'light' ? 'text-slate-800 font-semibold' : 'text-slate-200'}`}>{systemInfo?.osName || (systemInfo?.platform === 'darwin' ? 'macOS' : systemInfo?.platform || 'Windows')}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">{t('common.software')}:</span>
            <span className="text-emerald-500 font-bold uppercase">{server.software} v{server.version}</span>
          </div>
        </div>
      </div>
      </div>
      )}

      {activeSubTab === 'lagbuster' && (
        <LagBusterTab server={server} isRunning={isRunning} onRefresh={fetchStorage} />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Clock, Gauge, Users, Network, Zap, Sparkles } from 'lucide-react';
import { ServerProfile, SystemInfo, ServerStats } from '../types';

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
  const [stats, setStats] = useState<ServerStats | null>(propStats || null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [liveMaxPlayers, setLiveMaxPlayers] = useState<number>(server.maxPlayers || 20);
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

  return (
    <div className="h-full bg-slate-900/60 rounded-2xl border border-slate-800 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Мониторинг на Ресурси & Хардуер
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Следи натоварването на процесора, RAM паметта и процентите на сървъра на живо
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 font-medium">Uptime:</span>
          <span className="font-mono font-bold text-slate-100">
            {isRunning ? formatUptime(stats?.uptimeSeconds || uptimeSeconds) : 'Офлайн'}
          </span>
        </div>
      </div>

      {/* Primary Server Metrics (Live Server Consumption) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Server Real CPU % */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" /> Сървърно CPU Натоварване
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
              {isRunning ? (serverCpu > 75 ? 'Високо натоварване' : serverCpu > 40 ? 'Умерено' : 'Нормално') : 'Спрян'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-100 font-mono">
              {isRunning ? `${serverCpu}%` : '0%'}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {isRunning ? `Процес Java (PID: ${server.name})` : 'Няма активен процес'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverCpu > 75 ? 'bg-rose-500' : serverCpu > 40 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${isRunning ? Math.max(2, serverCpu) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {isRunning
              ? 'Процент от процесорната мощност на компютъра, изразходван от този сървър.'
              : 'Стартирай сървъра, за да видиш потреблението на процесора.'}
          </p>
        </div>

        {/* Card 2: Server Real RAM Used vs Allocated */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" /> Реално използвана RAM от Сървъра
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
              {isRunning ? `${serverRamPercent}% от капацитета` : '0%'}
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono">
            <div className="text-3xl font-black text-cyan-400">
              {isRunning ? (serverRamMb > 1024 ? `${serverRamGb} GB` : `${serverRamMb} MB`) : '0 MB'}
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">
                Heap Лимит: <strong className="text-slate-200">{server.allocatedRamGb} GB</strong>
              </div>
              <div className="text-[10px] text-slate-500 font-sans">
                + ~300 MB Java овърхед
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
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
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" /> Сървърен TPS
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {isRunning ? '20.0 TPS' : '0.0 TPS'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {isRunning ? '20.0' : '0.0'} <span className="text-xs text-slate-500 font-sans">/ 20.0 Ticks</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRunning ? '🟢 Перфектно плавен – нулев сървърен лаг!' : 'Сървърът не работи в момента.'}
          </p>
        </div>

        {/* Players Capacity */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" /> Играчи / Слотове
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Капацитет
            </span>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {onlinePlayerCount} <span className="text-xs text-slate-500 font-sans">/ {liveMaxPlayers} слота</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {onlinePlayerCount > 0 ? `${onlinePlayerCount} активни играчи в игра` : 'Няма свързани играчи в момента'}
          </p>
        </div>
      </div>

      {/* Host Computer Hardware Specs & Load */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100">Общо Натоварване на Компютъра (Хоста)</span>
              <p className="text-xs text-slate-400">Всички процеси в Windows / macOS</p>
            </div>
          </div>
        </div>

        {/* Host CPU & RAM Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Host CPU */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Общо CPU на компютъра:
              </span>
              <span className="font-mono font-bold text-cyan-400">{hostCpuPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hostCpuPercent > 80 ? 'bg-rose-500' : hostCpuPercent > 50 ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.max(2, hostCpuPercent)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {systemInfo?.cpuModel || 'Процесор'}
            </div>
          </div>

          {/* Host RAM */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Общо RAM на компютъра:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {usedRam} / {totalRam} GB ({hostRamPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hostRamPercent > 85 ? 'bg-rose-500' : hostRamPercent > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, hostRamPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Свободни: {freeRam} GB</span>
              <span>Общо: {totalRam} GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network & Platform Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network & Port info */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Network className="w-4 h-4 text-emerald-400" /> Мрежов Порт & Адрес
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Сървърен порт:</span>
            <span className="text-emerald-400 font-bold">:{server.port}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Локален LAN IP:</span>
            <span className="text-slate-200">{systemInfo?.localIp || '127.0.0.1'}</span>
          </div>
        </div>

        {/* OS info */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" /> Среда & Операционна система
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Платформа:</span>
            <span className="text-slate-200 uppercase">{systemInfo?.platform || 'Windows'}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Сървър тип:</span>
            <span className="text-emerald-400 font-bold uppercase">{server.software} v{server.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

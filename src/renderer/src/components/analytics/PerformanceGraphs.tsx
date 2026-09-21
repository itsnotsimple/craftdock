import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, HardDrive, Users, Clock, RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PerfSample, PerfTimeRange } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface PerformanceGraphsProps {
  serverId: string;
  isRunning: boolean;
}

export const PerformanceGraphs: React.FC<PerformanceGraphsProps> = ({ serverId, isRunning }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [range, setRange] = useState<PerfTimeRange>('1h');
  const [samples, setSamples] = useState<PerfSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchHistory = async () => {
    try {
      if ((window as any).api?.getPerformanceHistory) {
        const data: PerfSample[] = await (window as any).api.getPerformanceHistory(serverId, range);
        setSamples(data || []);
      }
    } catch (err) {
      console.error('Failed to load perf history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [serverId, range]);

  // Periodic polling if running
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(fetchHistory, 15000);
    return () => clearInterval(timer);
  }, [serverId, range, isRunning]);

  // Derived metrics
  const stats = useMemo(() => {
    if (samples.length === 0) {
      return { avgCpu: 0, maxCpu: 0, avgMem: 0, maxMem: 0, maxPlayers: 0 };
    }
    const totalCpu = samples.reduce((acc, s) => acc + s.cpuPercent, 0);
    const maxCpu = Math.max(...samples.map((s) => s.cpuPercent));
    const totalMem = samples.reduce((acc, s) => acc + s.memoryMb, 0);
    const maxMem = Math.max(...samples.map((s) => s.memoryMb));
    const maxPlayers = Math.max(...samples.map((s) => s.playerCount));

    return {
      avgCpu: Math.round(totalCpu / samples.length),
      maxCpu: Math.round(maxCpu),
      avgMem: Math.round(totalMem / samples.length),
      maxMem: Math.round(maxMem),
      maxPlayers,
    };
  }, [samples]);

  // SVG Chart Geometry
  const width = 680;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Player Chart Dimensions
  const playerHeight = 140;
  const playerChartH = playerHeight - padding.top - padding.bottom;

  // Build SVG Path helper
  const getCoordinates = (values: number[], maxVal = 100, customH = chartH) => {
    if (values.length === 0) return [];
    if (values.length === 1) {
      const y = padding.top + customH - (values[0] / (maxVal || 1)) * customH;
      return [
        { x: padding.left, y },
        { x: padding.left + chartW, y },
      ];
    }
    const step = chartW / (values.length - 1);
    return values.map((val, idx) => {
      const x = padding.left + idx * step;
      const normalized = Math.min(maxVal, Math.max(0, val));
      const y = padding.top + customH - (normalized / (maxVal || 1)) * customH;
      return { x, y };
    });
  };

  const createLinePath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
  };

  const createAreaPath = (coords: { x: number; y: number }[], customH = chartH) => {
    if (coords.length === 0) return '';
    const line = createLinePath(coords);
    const bottomY = (padding.top + customH).toFixed(1);
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  };

  const cpuCoords = useMemo(() => getCoordinates(samples.map((s) => s.cpuPercent), 100), [samples]);
  const memCoords = useMemo(() => getCoordinates(samples.map((s) => s.memoryPercent), 100), [samples]);
  const playerMax = Math.max(4, stats.maxPlayers > 0 ? stats.maxPlayers + 2 : 4);
  const playerCoords = useMemo(
    () => getCoordinates(samples.map((s) => s.playerCount), playerMax, playerChartH),
    [samples, playerMax, playerChartH]
  );

  const activeSample = hoverIndex !== null && samples[hoverIndex] ? samples[hoverIndex] : null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    if (range === '7d' || range === '24h') {
      return `${d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Range Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            <Activity className="w-4 h-4 text-cyan-500" />
            <span>{t('analytics.perfTitle')}</span>
          </h3>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('analytics.perfSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className={`p-1 rounded-xl flex items-center gap-1 border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/60 border-white/[0.08]'
          }`}>
            {(['1h', '6h', '24h', '7d'] as PerfTimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                  range === r
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
            }`}
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-amber-500 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              {language === 'bg' ? 'CPU Ср./Макс' : 'CPU Avg/Max'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {stats.avgCpu}%
            </span>
            <span className="text-xs font-mono text-amber-500/80">/ {stats.maxCpu}%</span>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              {language === 'bg' ? 'RAM Ср./Макс' : 'RAM Avg/Max'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {stats.avgMem >= 1024 ? `${(stats.avgMem / 1024).toFixed(1)}GB` : `${stats.avgMem}MB`}
            </span>
            <span className="text-xs font-mono text-purple-400/80">
              / {stats.maxMem >= 1024 ? `${(stats.maxMem / 1024).toFixed(1)}GB` : `${stats.maxMem}MB`}
            </span>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Пик Играчи' : 'Peak Players'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {stats.maxPlayers}
            </span>
            <span className="text-xs text-slate-400">{language === 'bg' ? 'онлайн' : 'online'}</span>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {language === 'bg' ? 'Точки Данни' : 'Data Points'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {samples.length}
            </span>
            <span className="text-xs text-slate-400">{language === 'bg' ? 'записани' : 'recorded'}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      {samples.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'glass-panel border-white/[0.06] text-slate-400'
        }`}>
          <Activity className="w-10 h-10 text-cyan-500/40 mb-3 animate-pulse" />
          <p className="font-semibold text-sm">
            {language === 'bg'
              ? 'Все още няма хронологични данни за избрания период'
              : 'No performance history recorded for this period'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {language === 'bg'
              ? 'Когато сървърът работи, CraftDock автоматично събира метрики за процесор, памет и активни играчи на всеки няколко секунди.'
              : 'When the server runs, CraftDock automatically records CPU, RAM, and active player metrics every few seconds.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart 1: CPU & RAM Chart */}
          <div className={`p-4 rounded-2xl border transition-all ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
          }`}>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>{language === 'bg' ? 'CPU Натоварване (%)' : 'CPU Load (%)'}</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span>{language === 'bg' ? 'RAM Използване (%)' : 'RAM Usage (%)'}</span>
              </span>

              {activeSample && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {formatTime(activeSample.timestamp)} — CPU: <b>{activeSample.cpuPercent}%</b> | RAM: <b>{activeSample.memoryMb}MB ({activeSample.memoryPercent}%)</b>
                </span>
              )}
            </div>

            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto overflow-visible select-none"
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = padding.top + chartH - (val / 100) * chartH;
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartW}
                        y2={y}
                        stroke={theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}
                        strokeDasharray={val === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill={theme === 'light' ? '#94a3b8' : '#64748b'}
                        fontFamily="monospace"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Memory Area & Line */}
                <path d={createAreaPath(memCoords)} fill="url(#memGrad)" />
                <path
                  d={createLinePath(memCoords)}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* CPU Area & Line */}
                <path d={createAreaPath(cpuCoords)} fill="url(#cpuGrad)" />
                <path
                  d={createLinePath(cpuCoords)}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Overlay for Hover Points */}
                {samples.map((s, idx) => {
                  const x = padding.left + (samples.length === 1 ? chartW / 2 : idx * (chartW / (samples.length - 1)));
                  const isHovered = hoverIndex === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIndex(idx)}
                    >
                      <rect
                        x={x - (chartW / samples.length / 2)}
                        y={padding.top}
                        width={Math.max(10, chartW / samples.length)}
                        height={chartH}
                        fill="transparent"
                      />
                      {isHovered && (
                        <>
                          <line
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={padding.top + chartH}
                            stroke="#38bdf8"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          {cpuCoords[idx] && (
                            <circle cx={cpuCoords[idx].x} cy={cpuCoords[idx].y} r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                          )}
                          {memCoords[idx] && (
                            <circle cx={memCoords[idx].x} cy={memCoords[idx].y} r="4" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Chart 2: Player Count Over Time */}
          <div className={`p-4 rounded-2xl border transition-all ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
          }`}>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>{language === 'bg' ? 'Активни Играчи Онлайн' : 'Active Players Online'}</span>
              </span>

              {activeSample && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {language === 'bg' ? 'Играчи' : 'Players'}: <b>{activeSample.playerCount}</b>
                </span>
              )}
            </div>

            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${width} ${playerHeight}`}
                className="w-full h-auto overflow-visible select-none"
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="playersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Labels for Players */}
                {Array.from(new Set([0, Math.round(playerMax / 2), playerMax])).map((val) => {
                  const y = padding.top + playerChartH - (val / playerMax) * playerChartH;
                  return (
                    <g key={val}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartW}
                        y2={y}
                        stroke={theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}
                        strokeDasharray={val === 0 ? undefined : '3 3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill={theme === 'light' ? '#94a3b8' : '#64748b'}
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Player Area & Line */}
                <path d={createAreaPath(playerCoords, playerChartH)} fill="url(#playersGrad)" />
                <path
                  d={createLinePath(playerCoords)}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Overlay */}
                {samples.map((_, idx) => {
                  const x = padding.left + (samples.length === 1 ? chartW / 2 : idx * (chartW / (samples.length - 1)));
                  const isHovered = hoverIndex === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIndex(idx)}
                    >
                      <rect
                        x={x - (chartW / samples.length / 2)}
                        y={padding.top}
                        width={Math.max(10, chartW / samples.length)}
                        height={playerChartH}
                        fill="transparent"
                      />
                      {isHovered && playerCoords[idx] && (
                        <>
                          <line
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={padding.top + playerChartH}
                            stroke="#34d399"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <circle cx={playerCoords[idx].x} cy={playerCoords[idx].y} r="4" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

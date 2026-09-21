import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Crosshair,
  ExternalLink,
  Copy,
  Check,
  Search,
  Navigation,
  Send,
  Layers,
  Globe,
  Flame,
  Sparkles,
  RefreshCw,
  Castle,
  Building,
  Landmark,
  Shield,
  Swords,
  Anchor,
  Tent,
  Eye,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import { ServerProfile, WorldSeedInfo, LocatedStructure } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SeedMapRadarProps {
  server: ServerProfile;
  onSendCommand?: (command: string) => void;
  onClose?: () => void;
}

export const SeedMapRadar: React.FC<SeedMapRadarProps> = ({
  server,
  onSendCommand,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const [seedInfo, setSeedInfo] = useState<WorldSeedInfo | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(true);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [structures, setStructures] = useState<LocatedStructure[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<'overworld' | 'nether' | 'the_end'>('overworld');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [originX, setOriginX] = useState<number>(0);
  const [originZ, setOriginZ] = useState<number>(0);
  const [searchRadius, setSearchRadius] = useState<number>(5000);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [copiedTpId, setCopiedTpId] = useState<string | null>(null);
  const [hoveredStructure, setHoveredStructure] = useState<LocatedStructure | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);

  // Load Seed on Mount
  const loadSeed = async () => {
    setLoadingSeed(true);
    try {
      const api = (window as any).api;
      if (api?.getWorldSeed) {
        const info = await api.getWorldSeed(server.id);
        setSeedInfo(info);
      }
    } catch (e) {
      console.error('Failed to load world seed:', e);
    } finally {
      setLoadingSeed(false);
    }
  };

  useEffect(() => {
    loadSeed();
  }, [server.id]);

  // Load Structures when Seed, Dimension, Origin or Radius change
  useEffect(() => {
    if (!seedInfo?.seed) return;

    let isMounted = true;
    const fetchStructures = async () => {
      setLoadingStructures(true);
      try {
        const api = (window as any).api;
        if (api?.locateStructures) {
          const list = await api.locateStructures(
            seedInfo.seed,
            selectedDimension,
            originX,
            originZ,
            searchRadius
          );
          if (isMounted) {
            setStructures(list || []);
          }
        }
      } catch (e) {
        console.error('Failed to locate structures:', e);
      } finally {
        if (isMounted) setLoadingStructures(false);
      }
    };

    fetchStructures();
    return () => {
      isMounted = false;
    };
  }, [seedInfo?.seed, selectedDimension, originX, originZ, searchRadius]);

  const handleCopySeed = () => {
    if (!seedInfo?.seed) return;
    navigator.clipboard.writeText(seedInfo.seed);
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 2000);
  };

  const handleCopyTp = (struct: LocatedStructure) => {
    const yCoord = struct.y !== undefined ? struct.y : '~';
    const cmd = `/tp @p ${struct.x} ${yCoord} ${struct.z}`;
    navigator.clipboard.writeText(cmd);
    setCopiedTpId(struct.id);
    setTimeout(() => setCopiedTpId(null), 2000);
  };

  const handleTeleport = (struct: LocatedStructure) => {
    if (!onSendCommand) return;
    const yCoord = struct.y !== undefined ? struct.y : '~';
    onSendCommand(`/tp @p ${struct.x} ${yCoord} ${struct.z}`);
  };

  const handleOpenChunkbase = () => {
    if (!seedInfo?.chunkbaseLink) return;
    const api = (window as any).api;
    if (api?.openExternalUrl) {
      api.openExternalUrl(seedInfo.chunkbaseLink);
    } else {
      window.open(seedInfo.chunkbaseLink, '_blank');
    }
  };

  // Filter structures by category
  const filteredStructures = useMemo(() => {
    if (selectedCategory === 'all') return structures;
    return structures.filter((s) => s.category === selectedCategory);
  }, [structures, selectedCategory]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stronghold':
        return <Castle className="w-4 h-4 text-emerald-400" />;
      case 'village':
        return <Building className="w-4 h-4 text-amber-400" />;
      case 'ancient_city':
        return <Landmark className="w-4 h-4 text-cyan-400" />;
      case 'mansion':
        return <Shield className="w-4 h-4 text-amber-600" />;
      case 'trial_chamber':
        return <Swords className="w-4 h-4 text-orange-400" />;
      case 'monument':
        return <Anchor className="w-4 h-4 text-sky-400" />;
      case 'outpost':
        return <Tent className="w-4 h-4 text-rose-400" />;
      case 'nether':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'end':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stronghold':
        return '#10b981';
      case 'village':
        return '#f59e0b';
      case 'ancient_city':
        return '#06b6d4';
      case 'mansion':
        return '#d97706';
      case 'trial_chamber':
        return '#f97316';
      case 'monument':
        return '#0284c7';
      case 'outpost':
        return '#f43f5e';
      case 'nether':
        return '#ef4444';
      case 'end':
        return '#a855f7';
      default:
        return '#94a3b8';
    }
  };

  // Radar Canvas Projection (origin at center)
  const radarSize = 360;
  const radarRadius = radarSize / 2;
  const center = radarRadius;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-slate-900/60 border-white/10 shadow-xl'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title={language === 'bg' ? 'Назад към световете' : 'Back to worlds'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-sky-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {t('seedMap.title')}
                </h2>
                {seedInfo?.source && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-400/30 uppercase tracking-wide">
                    {seedInfo.source}
                  </span>
                )}
              </div>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('seedMap.subtitle')}
              </p>
            </div>
          </div>

          {/* Seed Pill & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-black/40 border-white/10 text-sky-300'
              }`}
            >
              <span className="text-slate-400 select-none">Seed:</span>
              <span className="font-bold select-all tracking-wider">
                {loadingSeed ? 'Loading...' : seedInfo?.seed || '0'}
              </span>
            </div>

            <button
              onClick={handleCopySeed}
              disabled={loadingSeed}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                copiedSeed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : theme === 'light'
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title={t('seedMap.copySeed')}
            >
              {copiedSeed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSeed ? t('common.copied') : t('seedMap.copySeed')}</span>
            </button>

            <button
              onClick={handleOpenChunkbase}
              disabled={loadingSeed || !seedInfo?.chunkbaseLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              title="Open prefilled interactive Chunkbase Map"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('seedMap.openChunkbase')}</span>
            </button>

            <button
              onClick={loadSeed}
              disabled={loadingSeed}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
              }`}
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSeed ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Dimension Selector, Center Coordinates & Radius */}
      <div
        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.08]'
        }`}
      >
        {/* Dimension Switcher */}
        <div className="flex p-1 rounded-xl bg-black/30 border border-white/10 gap-1">
          <button
            onClick={() => setSelectedDimension('overworld')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedDimension === 'overworld'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('seedMap.overworld')}</span>
          </button>
          <button
            onClick={() => setSelectedDimension('nether')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedDimension === 'nether'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('seedMap.nether')}</span>
          </button>
          <button
            onClick={() => setSelectedDimension('the_end')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedDimension === 'the_end'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{t('seedMap.theEnd')}</span>
          </button>
        </div>

        {/* Center Coordinate Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('seedMap.radarCenter')}:</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="font-mono text-slate-400">X:</span>
              <input
                type="number"
                value={originX}
                onChange={(e) => setOriginX(parseInt(e.target.value, 10) || 0)}
                className={`w-20 px-2 py-1 rounded-lg border font-mono text-xs ${
                  theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/50 border-white/10 text-sky-200'
                }`}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-slate-400">Z:</span>
              <input
                type="number"
                value={originZ}
                onChange={(e) => setOriginZ(parseInt(e.target.value, 10) || 0)}
                className={`w-20 px-2 py-1 rounded-lg border font-mono text-xs ${
                  theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/50 border-white/10 text-sky-200'
                }`}
              />
            </div>
            {(originX !== 0 || originZ !== 0) && (
              <button
                onClick={() => {
                  setOriginX(0);
                  setOriginZ(0);
                }}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                {t('seedMap.resetSpawn')}
              </button>
            )}
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">{t('seedMap.radius')}:</span>
            <select
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseInt(e.target.value, 10))}
              className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-black/50 border-white/10 text-slate-200'
              }`}
            >
              <option value="2000">2,000 blocks</option>
              <option value="4000">4,000 blocks</option>
              <option value="6000">6,000 blocks</option>
              <option value="10000">10,000 blocks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Radar Screen (Left) & Structure List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Interactive Radar Canvas */}
        <div
          className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center relative ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-slate-950/80 border-white/10 shadow-2xl'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3 text-xs">
            <span className="font-bold flex items-center gap-1.5 text-sky-400">
              <Compass className="w-4 h-4" />
              <span>{t('seedMap.radarView')}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Radius: {searchRadius.toLocaleString()}b
            </span>
          </div>

          {/* SVG Radar Visualizer */}
          <div className="relative w-[340px] h-[340px] flex items-center justify-center select-none">
            <svg
              width={radarSize}
              height={radarSize}
              viewBox={`0 0 ${radarSize} ${radarSize}`}
              className="overflow-visible"
            >
              {/* Radar Outer Background */}
              <circle
                cx={center}
                cy={center}
                r={radarRadius - 10}
                fill="rgba(7, 10, 20, 0.95)"
                stroke={selectedDimension === 'nether' ? '#ef4444' : selectedDimension === 'the_end' ? '#a855f7' : '#0284c7'}
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />

              {/* Concentric Distance Rings */}
              {[0.25, 0.5, 0.75, 1].map((scale, i) => {
                const r = (radarRadius - 10) * scale;
                const distNum = Math.round(searchRadius * scale);
                return (
                  <g key={i}>
                    <circle
                      cx={center}
                      cy={center}
                      r={r}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeDasharray={scale === 1 ? 'none' : '3 3'}
                      strokeWidth="1"
                    />
                    <text
                      x={center + 4}
                      y={center - r + 11}
                      fill="rgba(148, 163, 184, 0.5)"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {distNum}b
                    </text>
                  </g>
                );
              })}

              {/* Axis Crosshairs */}
              <line
                x1={10}
                y1={center}
                x2={radarSize - 10}
                y2={center}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />
              <line
                x1={center}
                y1={10}
                x2={center}
                y2={radarSize - 10}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />

              {/* Cardinal Directions */}
              <text x={center} y={22} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                N (-Z)
              </text>
              <text x={center} y={radarSize - 14} fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
                S (+Z)
              </text>
              <text x={radarSize - 14} y={center + 4} fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
                E (+X)
              </text>
              <text x={18} y={center + 4} fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
                W (-X)
              </text>

              {/* Origin Center Crosshair */}
              <circle cx={center} cy={center} r={3} fill="#38bdf8" />
              <circle cx={center} cy={center} r={6} fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />

              {/* Plotted Structure Pins */}
              {filteredStructures.map((s) => {
                const dx = s.x - originX;
                const dz = s.z - originZ;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > searchRadius) return null;

                const normDist = (dist / searchRadius) * (radarRadius - 10);
                const angle = Math.atan2(dz, dx);
                const px = center + Math.cos(angle) * normDist;
                const py = center + Math.sin(angle) * normDist;

                const isSelected = selectedStructureId === s.id;
                const isHovered = hoveredStructure?.id === s.id;
                const color = getCategoryColor(s.category);

                return (
                  <g
                    key={s.id}
                    className="cursor-pointer transition-transform duration-150"
                    onMouseEnter={() => setHoveredStructure(s)}
                    onMouseLeave={() => setHoveredStructure(null)}
                    onClick={() => setSelectedStructureId(s.id)}
                  >
                    {/* Outer Glow on hover / select */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={px}
                        cy={py}
                        r={12}
                        fill={color}
                        fillOpacity="0.3"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? 6.5 : isHovered ? 5.5 : 4}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2 : 1}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Radar Tooltip on Hover */}
            {hoveredStructure && (
              <div className="absolute top-3 left-3 right-3 pointer-events-none p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/15 text-left text-xs shadow-2xl animate-fade-in z-20">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-white truncate">
                    {getCategoryIcon(hoveredStructure.category)}
                    <span>{hoveredStructure.name}</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                    {hoveredStructure.distanceBlocks.toLocaleString()}b {hoveredStructure.direction}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-400">
                  X: <span className="text-sky-300 font-bold">{hoveredStructure.x}</span>
                  {hoveredStructure.y !== undefined && (
                    <> Y: <span className="text-amber-300 font-bold">{hoveredStructure.y}</span></>
                  )}
                  {' '}Z: <span className="text-sky-300 font-bold">{hoveredStructure.z}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Legend Bar */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] w-full flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Stronghold</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Village</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Ancient City</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Trial Chamber</span>
            </span>
          </div>
        </div>

        {/* Right Column: Structure Leaderboard & Action Cards */}
        <div className="space-y-4 min-w-0">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
                selectedCategory === 'all'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/30 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
              }`}
            >
              {t('seedMap.filterAll')} ({structures.length})
            </button>
            {['stronghold', 'village', 'ancient_city', 'trial_chamber', 'mansion', 'monument', 'outpost', 'nether', 'end'].map(
              (cat) => {
                const count = structures.filter((s) => s.category === cat).length;
                if (count === 0 && selectedDimension === 'overworld' && (cat === 'nether' || cat === 'end')) return null;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      selectedCategory === cat
                        ? 'bg-white/15 text-white border-white/30 shadow-xs'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span className="capitalize">{cat.replace('_', ' ')}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              }
            )}
          </div>

          {/* Loading or Empty State */}
          {loadingStructures ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400" />
              <p className="text-xs font-semibold">{t('seedMap.locating')}</p>
            </div>
          ) : filteredStructures.length === 0 ? (
            <div className="p-12 text-center text-slate-400 rounded-2xl border border-dashed border-white/10">
              <Compass className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">{t('seedMap.noStructuresFound')}</p>
              <p className="text-xs opacity-75 mt-1">{t('seedMap.tryIncreaseRadius')}</p>
            </div>
          ) : (
            /* Structure Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredStructures.map((s) => {
                const isSelected = selectedStructureId === s.id;
                const isCopied = copiedTpId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStructureId(s.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-400/40 shadow-md shadow-sky-500/10'
                        : theme === 'light'
                        ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0">
                          {getCategoryIcon(s.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate text-slate-100">
                            {s.name}
                          </div>
                          <div className="text-[11px] font-mono text-sky-300">
                            X: {s.x} {s.y !== undefined ? `Y: ${s.y}` : ''} Z: {s.z}
                          </div>
                        </div>
                      </div>

                      {/* Distance Pill */}
                      <span className="px-2 py-1 rounded-lg text-[11px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                        {s.distanceBlocks.toLocaleString()}b {s.direction}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTp(s);
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                        }`}
                        title="Copy /tp command to clipboard"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? t('common.copied') : t('seedMap.copyTp')}</span>
                      </button>

                      {server.status === 'running' && onSendCommand && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTeleport(s);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-xs"
                          title="Teleport nearest player in game immediately"
                        >
                          <Send className="w-3 h-3" />
                          <span>{t('seedMap.teleport')}</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOriginX(s.x);
                          setOriginZ(s.z);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 transition-colors cursor-pointer"
                        title={t('seedMap.centerRadarHere')}
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

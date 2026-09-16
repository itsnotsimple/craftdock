import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  ArrowLeft,
  CheckCircle,
  DownloadCloud,
  Settings,
  HelpCircle,
  Cpu,
  Loader2,
  Skull,
  Flame,
  Package,
  Search,
  Database,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { ServerSoftware, SystemInfo, VersionInfo } from '../types';
import { RamSlider } from '../components/RamSlider';
import { StorageSlider } from '../components/StorageSlider';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';

interface WizardViewProps {
  systemInfo: SystemInfo | null;
  onCancel: () => void;
  onCreateServer: (data: {
    name: string;
    software: ServerSoftware;
    version: string;
    allocatedRamGb: number;
    storageQuotaGb?: number;
    port: number;
    motd: string;
    hardcore?: boolean;
    maxPlayers?: number;
    difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
    onlineMode?: boolean;
  }) => Promise<void>;
  downloadProgress: { percent: number; downloadedMb: number; totalMb: number; message: string } | null;
  isCreating: boolean;
}

export const WizardView: React.FC<WizardViewProps> = ({
  systemInfo,
  onCancel,
  onCreateServer,
  downloadProgress,
  isCreating,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showAlert } = useDialog();
  const [name, setName] = useState(language === 'bg' ? 'Survival с Аверите' : 'Survival SMP');
  const [software, setSoftware] = useState<ServerSoftware>('paper');
  const [version, setVersion] = useState<string>('1.21.4');
  const [hardcore, setHardcore] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'peaceful' | 'easy' | 'normal' | 'hard'>('normal');
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [storageQuotaGb, setStorageQuotaGb] = useState<number>(0);
  const [engineMode, setEngineMode] = useState<'software' | 'modpack'>('software');
  const [modpacksList, setModpacksList] = useState<any[]>([]);
  const [modpackSearch, setModpackSearch] = useState<string>('');
  const [loadingModpacks, setLoadingModpacks] = useState<boolean>(false);
  const [selectedModpack, setSelectedModpack] = useState<any | null>(null);
  const [versionsList, setVersionsList] = useState<VersionInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(true);

  const [targetPlayers, setTargetPlayers] = useState<number>(4);
  const [ramGb, setRamGb] = useState<number>(() => {
    if (systemInfo && systemInfo.totalRamGb >= 16) return 6;
    if (systemInfo && systemInfo.totalRamGb >= 8) return 4;
    return 2;
  });

  const [port, setPort] = useState<number>(25565);
  const [motd, setMotd] = useState<string>(
    language === 'bg' ? 'Добре дошли в нашия личен домашен сървър!' : 'Welcome to our private Minecraft server!'
  );

  const loadModpacks = async (query = '') => {
    setLoadingModpacks(true);
    try {
      const api = (window as any).api;
      if (api?.searchModrinthModpacks) {
        const results = await api.searchModrinthModpacks(query, 12);
        setModpacksList(results);
      }
    } catch (err) {
      console.error('Failed to load Modrinth modpacks', err);
    } finally {
      setLoadingModpacks(false);
    }
  };

  useEffect(() => {
    loadModpacks();
  }, []);

  const handleSelectModpack = (pack: any) => {
    setSelectedModpack(pack);
    setSoftware('fabric');
    const cleanTitle = pack.title.replace(/\s*\[.*?\]/g, '').trim();
    setName(cleanTitle + ' Server');
    setMotd(`${cleanTitle} - Powered by CraftDock`);
    if (pack.versions && pack.versions.length > 0) {
      setVersion(pack.versions[0]);
    }
    // Modpacks run best with 6GB to 8GB RAM
    if (systemInfo && systemInfo.totalRamGb >= 16) {
      setRamGb(8);
    } else if (systemInfo && systemInfo.totalRamGb >= 8) {
      setRamGb(6);
    }
  };

  // Fetch versions dynamically from online APIs
  useEffect(() => {
    let isCancelled = false;
    setLoadingVersions(true);

    (window as any).api
      ?.fetchVersions(software)
      .then((data: VersionInfo[]) => {
        if (!isCancelled && data && data.length > 0) {
          setVersionsList(data);
          setVersion(data[0].version);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load versions online:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingVersions(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [software]);

  const isOverRamLimit = Boolean(systemInfo && systemInfo.freeRamGb > 0 && ramGb > systemInfo.freeRamGb);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version || isCreating) return;

    if (isOverRamLimit) {
      await showAlert({
        type: 'error',
        title: language === 'bg' ? 'Недостатъчно свободна RAM памет' : 'Insufficient Free RAM',
        message: language === 'bg'
          ? `Не можеш да създадеш сървър с ${ramGb} GB RAM, защото на компютъра ти в момента има само ${systemInfo?.freeRamGb} GB свободни. Намали заделената памет от плъзгача.`
          : `Cannot create server with ${ramGb} GB RAM because your system only has ${systemInfo?.freeRamGb} GB free right now. Please lower the allocated RAM.`,
        buttonText: language === 'bg' ? 'Разбрах' : 'Understood',
      });
      return;
    }

    onCreateServer({
      name,
      software,
      version,
      allocatedRamGb: ramGb,
      storageQuotaGb,
      port,
      motd,
      hardcore,
      maxPlayers: targetPlayers,
      difficulty: hardcore ? 'hard' : difficulty,
      onlineMode,
    });
  };

  const softwareOptions: Array<{
    id: ServerSoftware;
    name: string;
    badge: string;
    desc: string;
  }> = [
    {
      id: 'paper',
      name: t('wizard.software.paper.name'),
      badge: t('wizard.software.paper.badge'),
      desc: t('wizard.software.paper.desc'),
    },
    {
      id: 'purpur',
      name: t('wizard.software.purpur.name'),
      badge: t('wizard.software.purpur.badge'),
      desc: t('wizard.software.purpur.desc'),
    },
    {
      id: 'fabric',
      name: t('wizard.software.fabric.name'),
      badge: t('wizard.software.fabric.badge'),
      desc: t('wizard.software.fabric.desc'),
    },
    {
      id: 'vanilla',
      name: t('wizard.software.vanilla.name'),
      badge: t('wizard.software.vanilla.badge'),
      desc: t('wizard.software.vanilla.desc'),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full relative">
      {/* Download / Creation Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xl p-6">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200 border ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-xl'
              : 'glass-panel'
          }`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
              theme === 'light'
                ? 'bg-sky-50 text-sky-600 border-sky-200'
                : 'bg-sky-500/15 text-sky-400 border-sky-400/30 glow-ice'
            }`}>
              <DownloadCloud className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className={`text-lg font-black mb-1 ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {t('wizard.overlayTitle')}
              </h3>
              <p className={`text-xs ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {downloadProgress?.message || t('wizard.overlaySubtitle')}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200'
                  : 'bg-slate-800/80 border-white/[0.08]'
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-300 shadow-md shadow-sky-500/30"
                  style={{ width: `${downloadProgress?.percent || 15}%` }}
                />
              </div>
              <div className={`flex justify-between text-xs font-mono ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>{downloadProgress?.percent || 0}%</span>
                <span>
                  {downloadProgress?.downloadedMb || 0}MB / {downloadProgress?.totalMb || 45}MB
                </span>
              </div>
            </div>

            <p className={`text-[11px] ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {t('wizard.overlayFooter')}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              theme === 'light'
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {t('wizard.title')}
            </h2>
            <p className={`text-xs mt-0.5 ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {t('wizard.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Server Name & Software */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${
              theme === 'light' ? 'text-indigo-700' : 'text-indigo-400'
            }`}>
              <span>{t('wizard.step1')}</span> • {t('wizard.step1Desc')}
            </div>

            {/* Mode Switcher: Engines vs Modpacks */}
            <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
              theme === 'light'
                ? 'bg-slate-100 border-slate-200'
                : 'bg-white/[0.04] border-white/[0.08]'
            }`}>
              <button
                type="button"
                onClick={() => setEngineMode('software')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer btn-bounce ${
                  engineMode === 'software'
                    ? theme === 'light'
                      ? 'bg-white text-indigo-900 border border-indigo-200 shadow-xs font-bold'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 shadow-sm'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'bg' ? 'Сървърен Енджин' : 'Server Engine'}
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('modpack')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer btn-bounce ${
                  engineMode === 'modpack'
                    ? theme === 'light'
                      ? 'bg-white text-purple-900 border border-purple-200 shadow-xs font-bold'
                      : 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-sm'
                    : theme === 'light'
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-purple-500" />
                <span>{language === 'bg' ? 'Modrinth Модпакове' : 'Modrinth Modpacks'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold ${
              theme === 'light' ? 'text-slate-800' : 'text-slate-300'
            }`}>{t('wizard.serverNameLabel')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wizard.serverNamePlaceholder')}
              className={`w-full px-4 py-2.5 rounded-xl text-sm transition-colors border focus:outline-none ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-xs'
                  : 'glass-input text-slate-100 placeholder-slate-500 focus:border-indigo-400'
              }`}
            />
          </div>

          {engineMode === 'software' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {softwareOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSoftware(opt.id);
                    setSelectedModpack(null);
                  }}
                  className={`p-4 rounded-2xl text-left border transition-all duration-200 relative cursor-pointer ${
                    software === opt.id && !selectedModpack
                      ? theme === 'light'
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-400/40'
                        : 'bg-indigo-500/15 border-indigo-400/60 shadow-lg shadow-indigo-950/40 glow-ice'
                      : theme === 'light'
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      : 'glass-card hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-extrabold text-sm ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                    }`}>{opt.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        software === opt.id && !selectedModpack
                          ? theme === 'light'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                            : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                          : theme === 'light'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modpackSearch}
                  onChange={(e) => {
                    setModpackSearch(e.target.value);
                    loadModpacks(e.target.value);
                  }}
                  placeholder={t('modrinth.searchModpacks')}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs transition-colors border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 shadow-xs'
                      : 'glass-input text-slate-200 placeholder:text-slate-500 focus:border-purple-400'
                  }`}
                />
              </div>

              {loadingModpacks ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {modpacksList.map((pack) => {
                    const isSelected = selectedModpack?.id === pack.id;

                    return (
                      <div
                        key={pack.id}
                        onClick={() => handleSelectModpack(pack)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? theme === 'light'
                              ? 'bg-purple-50/80 border-purple-400 shadow-xs ring-1 ring-purple-400/40'
                              : 'bg-purple-500/20 border-purple-400/60 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/40'
                            : theme === 'light'
                            ? 'bg-white border-slate-200 shadow-xs hover:border-purple-300'
                            : 'glass-card hover:border-white/[0.15]'
                        }`}
                      >
                        {pack.iconUrl ? (
                          <img
                            src={pack.iconUrl}
                            alt={pack.title}
                            className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-200 dark:border-white/[0.08] shrink-0"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                            theme === 'light'
                              ? 'bg-purple-50 border-purple-200 text-purple-600'
                              : 'bg-purple-500/15 text-purple-400 border-purple-400/30'
                          }`}>
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className={`font-extrabold text-xs truncate ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`} title={pack.title}>
                              {pack.title}
                            </h5>
                            {isSelected && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 border ${
                                theme === 'light'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-purple-500/30 text-purple-200 border-purple-400/50'
                              }`}>
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            {pack.description}
                          </p>
                          <div className={`flex items-center gap-2 text-[10px] font-mono pt-1 ${
                            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            <span>{pack.downloads?.toLocaleString()} {t('modrinth.downloads')}</span>
                            <span>•</span>
                            <span className={theme === 'light' ? 'text-purple-700 font-sans font-semibold' : 'text-purple-300 font-sans'}>Fabric</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Step 2: Minecraft Version (Loaded live via API) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${
              theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'
            }`}>
              <span>{t('wizard.step2')}</span> • {t('wizard.step2Desc')}
            </div>
            {loadingVersions && (
              <span className={`text-xs flex items-center gap-1.5 ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" /> {t('wizard.loadingVersions')}
              </span>
            )}
          </div>

          <div className={`p-4 rounded-2xl border space-y-3 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold ${
                theme === 'light' ? 'text-slate-800' : 'text-slate-300'
              }`}>
                {t('wizard.chooseVersionFor')} <strong className={theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'}>{software.toUpperCase()}</strong>:
              </label>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>{t('wizard.apiSourceNotice')}</span>
            </div>

            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={loadingVersions}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono transition-colors cursor-pointer border focus:outline-none ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 shadow-xs'
                  : 'glass-input text-slate-100 focus:border-cyan-400'
              }`}
            >
              {versionsList.map((v) => (
                <option key={v.version} value={v.version}>
                  Minecraft v{v.version} {v.isLatest ? `(${t('wizard.latestOfficial')})` : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Step 3: RAM Slider & Intelligent Capacity Advisor */}
        <section className="space-y-4">
          <div className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${
            theme === 'light' ? 'text-purple-700' : 'text-purple-400'
          }`}>
            <span>{t('wizard.step3')}</span> • {t('wizard.step3Desc')}
          </div>

          <div className={`p-6 rounded-2xl border ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <RamSlider
              ramGb={ramGb}
              onRamChange={setRamGb}
              targetPlayers={targetPlayers}
              onPlayersChange={setTargetPlayers}
              software={software}
              systemTotalRamGb={systemInfo?.totalRamGb || 16}
              systemFreeRamGb={systemInfo?.freeRamGb || 8}
            />
          </div>
        </section>

        {/* Hardcore & Optional Settings */}
        <section className="space-y-4">
          {/* Hardcore Toggle Card */}
          <div
            onClick={() => setHardcore(!hardcore)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
              hardcore
                ? theme === 'light'
                  ? 'bg-rose-50 border-rose-300 shadow-xs text-rose-950'
                  : 'bg-gradient-to-r from-rose-950/40 via-slate-950/70 to-slate-950/70 border-rose-500/40 glow-crimson shadow-2xl'
                : theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                : 'glass-card hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  hardcore
                    ? theme === 'light'
                      ? 'bg-rose-100 border-rose-300 text-rose-600'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : theme === 'light'
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                }`}
              >
                <Skull className={`w-5 h-5 ${hardcore ? 'animate-pulse text-rose-500' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    {t('wizard.hardcoreLabel')}
                  </span>
                  {hardcore && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase font-mono animate-pulse border ${
                      theme === 'light'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {t('wizard.hardcoreActiveBadge')}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${
                  theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {hardcore
                    ? t('wizard.hardcoreActiveDesc')
                    : t('wizard.hardcoreDisabledDesc')}
                </p>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                hardcore
                  ? 'bg-rose-600'
                  : theme === 'light'
                  ? 'bg-slate-300'
                  : 'bg-white/[0.08] border border-white/[0.1]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                  hardcore ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Optional Settings (Port, MOTD) */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <div className={`flex items-center gap-2 text-xs font-bold ${
              theme === 'light' ? 'text-amber-600' : 'text-amber-400'
            }`}>
              <Settings className="w-4 h-4 text-amber-500" /> {t('wizard.optionalNetworkSettings')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-medium ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>{t('wizard.networkPortLabel')}</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10) || 25565)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 shadow-xs'
                      : 'glass-input text-slate-200 focus:border-amber-400'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>{t('wizard.motdLabel')}</label>
                <input
                  type="text"
                  value={motd}
                  onChange={(e) => setMotd(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 shadow-xs'
                      : 'glass-input text-slate-200 focus:border-amber-400'
                  }`}
                />
              </div>
            </div>

            {/* Gameplay Rules (Difficulty & Cracked / Online Mode) */}
            <div className={`pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
            }`}>
              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-800' : 'text-slate-300'
                }`}>
                  {t('settings.difficulty')}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(['peaceful', 'easy', 'normal', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      disabled={hardcore}
                      onClick={() => setDifficulty(diff)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer text-center capitalize ${
                        (hardcore ? 'hard' : difficulty) === diff
                          ? theme === 'light'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                            : 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-sm'
                          : theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                      } ${hardcore ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {t(`settings.diff${diff.charAt(0).toUpperCase() + diff.slice(1)}` as any) || diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Online Mode (Cracked) */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-800' : 'text-slate-300'
                }`}>
                  {t('settings.crackedTitle')}
                </label>
                <button
                  type="button"
                  onClick={() => setOnlineMode(!onlineMode)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                    !onlineMode
                      ? theme === 'light'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {!onlineMode ? t('settings.crackedBtnAllowed') : t('settings.crackedBtnBlocked')}
                </button>
              </div>
            </div>

            {/* Storage Quota Limiter Slider */}
            <div className={`pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'}`}>
              <StorageSlider
                storageQuotaGb={storageQuotaGb}
                onChange={setStorageQuotaGb}
              />
            </div>
          </div>
        </section>

        {/* Submit Bar */}
        <div className={`flex items-center justify-between pt-4 border-t ${
          theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
        }`}>
          <button
            type="button"
            onClick={onCancel}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer border ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                : 'glass-card hover:bg-white/[0.08] text-slate-300'
            }`}
          >
            {t('common.cancel')}
          </button>

          <div className="flex items-center gap-3">
            {isOverRamLimit && (
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {language === 'bg'
                  ? `Недостатъчно RAM (${ramGb}G избрани / ${systemInfo?.freeRamGb}G свободни)`
                  : `Insufficient RAM (${ramGb}G selected / ${systemInfo?.freeRamGb}G free)`}
              </span>
            )}
            <button
              type="submit"
              disabled={isCreating || loadingVersions || isOverRamLimit}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm transition-all shadow-xl shadow-emerald-950/60 glow-green cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {t('wizard.createBtn')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

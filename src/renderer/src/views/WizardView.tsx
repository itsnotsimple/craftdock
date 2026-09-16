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
} from 'lucide-react';
import { ServerSoftware, SystemInfo, VersionInfo } from '../types';
import { RamSlider } from '../components/RamSlider';
import { useLanguage } from '../context/LanguageContext';

interface WizardViewProps {
  systemInfo: SystemInfo | null;
  onCancel: () => void;
  onCreateServer: (data: {
    name: string;
    software: ServerSoftware;
    version: string;
    allocatedRamGb: number;
    port: number;
    motd: string;
    hardcore?: boolean;
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
  const [name, setName] = useState(language === 'bg' ? 'Survival с Аверите' : 'Survival SMP');
  const [software, setSoftware] = useState<ServerSoftware>('paper');
  const [version, setVersion] = useState<string>('1.21.4');
  const [hardcore, setHardcore] = useState<boolean>(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version || isCreating) return;

    onCreateServer({
      name,
      software,
      version,
      allocatedRamGb: ramGb,
      port,
      motd,
      hardcore,
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
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center mx-auto border border-sky-400/30 glow-ice">
              <DownloadCloud className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-100 mb-1">
                {t('wizard.overlayTitle')}
              </h3>
              <p className="text-xs text-slate-400">
                {downloadProgress?.message || t('wizard.overlaySubtitle')}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-300 shadow-md shadow-sky-500/30"
                  style={{ width: `${downloadProgress?.percent || 15}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>{downloadProgress?.percent || 0}%</span>
                <span>
                  {downloadProgress?.downloadedMb || 0}MB / {downloadProgress?.totalMb || 45}MB
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              {t('wizard.overlayFooter')}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              {t('wizard.title')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('wizard.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Server Name & Software */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-400 uppercase tracking-wider">
            <span>{t('wizard.step1')}</span> • {t('wizard.step1Desc')}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('wizard.serverNameLabel')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wizard.serverNamePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {softwareOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSoftware(opt.id)}
                className={`p-4 rounded-2xl text-left border transition-all duration-200 relative cursor-pointer ${
                  software === opt.id
                    ? 'bg-indigo-500/15 border-indigo-400/60 shadow-lg shadow-indigo-950/40 glow-ice'
                    : 'glass-card hover:border-white/[0.15]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-slate-100">{opt.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      software === opt.id
                        ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Minecraft Version (Loaded live via API) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-400 uppercase tracking-wider">
              <span>{t('wizard.step2')}</span> • {t('wizard.step2Desc')}
            </div>
            {loadingVersions && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> {t('wizard.loadingVersions')}
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {t('wizard.chooseVersionFor')} <strong className="text-cyan-400">{software.toUpperCase()}</strong>:
              </label>
              <span className="text-[11px] text-slate-500">{t('wizard.apiSourceNotice')}</span>
            </div>

            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={loadingVersions}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-mono transition-colors cursor-pointer"
            >
              {versionsList.map((v) => (
                <option key={v.version} value={v.version}>
                  Minecraft v{v.version} {v.isLatest ? `⭐ ${t('wizard.latestOfficial')}` : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Step 3: RAM Slider & Intelligent Capacity Advisor */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-purple-400 uppercase tracking-wider">
            <span>{t('wizard.step3')}</span> • {t('wizard.step3Desc')}
          </div>

          <div className="p-6 rounded-2xl glass-card">
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
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none backdrop-blur-2xl ${
              hardcore
                ? 'bg-gradient-to-r from-rose-950/40 via-slate-950/70 to-slate-950/70 border-rose-500/40 glow-crimson shadow-2xl'
                : 'glass-card hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  hardcore
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                }`}
              >
                <Skull className={`w-5 h-5 ${hardcore ? 'animate-pulse text-rose-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100">
                    {t('wizard.hardcoreLabel')}
                  </span>
                  {hardcore && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-mono animate-pulse">
                      {t('wizard.hardcoreActiveBadge')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {hardcore
                    ? t('wizard.hardcoreActiveDesc')
                    : t('wizard.hardcoreDisabledDesc')}
                </p>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                hardcore ? 'bg-rose-600' : 'bg-white/[0.08] border border-white/[0.1]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  hardcore ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Optional Settings (Port, MOTD) */}
          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Settings className="w-4 h-4 text-amber-400" /> {t('wizard.optionalNetworkSettings')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">{t('wizard.networkPortLabel')}</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10) || 25565)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">{t('wizard.motdLabel')}</label>
                <input
                  type="text"
                  value={motd}
                  onChange={(e) => setMotd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-300 font-semibold text-xs transition-all cursor-pointer"
          >
            {t('common.cancel')}
          </button>

          <button
            type="submit"
            disabled={isCreating || loadingVersions}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm transition-all shadow-xl shadow-emerald-950/60 glow-green cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {t('wizard.createBtn')}
          </button>
        </div>
      </form>
    </div>
  );
};

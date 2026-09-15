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
  const [name, setName] = useState('Survival с Аверите');
  const [software, setSoftware] = useState<ServerSoftware>('paper');
  const [version, setVersion] = useState<string>('1.21.4');
  const [hardcore, setHardcore] = useState<boolean>(false);
  const [versionsList, setVersionsList] = useState<VersionInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(true);

  const [targetPlayers, setTargetPlayers] = useState<number>(4);
  const [ramGb, setRamGb] = useState<number>(() => {
    // Recommend around 4GB if system has at least 8GB
    if (systemInfo && systemInfo.totalRamGb >= 16) return 6;
    if (systemInfo && systemInfo.totalRamGb >= 8) return 4;
    return 2;
  });

  const [port, setPort] = useState<number>(25565);
  const [motd, setMotd] = useState<string>('Добре дошли в нашия личен домашен сървър!');

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
      name: 'PaperMC',
      badge: 'Препоръчително ⚡',
      desc: 'Най-добрата производителност, 20 TPS, поддържа Spigot/Paper плъгини без лаг.',
    },
    {
      id: 'purpur',
      name: 'Purpur',
      badge: 'Още по-бърз',
      desc: 'Paper базиран с допълнителни оптимизации и настройки на геймплея.',
    },
    {
      id: 'fabric',
      name: 'Fabric',
      badge: 'Модове',
      desc: 'Модерен и лек модлоудър за модове като Lithium, Sodium, Voice Chat.',
    },
    {
      id: 'vanilla',
      name: 'Vanilla Mojang',
      badge: 'Оригинален',
      desc: 'Чистият официален Mojang сървър без модификации.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full relative">
      {/* Download / Creation Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <DownloadCloud className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-100 mb-1">
                Подготвяне на сървъра...
              </h3>
              <p className="text-xs text-slate-400">
                {downloadProgress?.message || 'Изтегляне на най-новите файлове от официалното API...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/30"
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
              Приложението не заема място предварително – сваля само това, което ти трябва!
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80" style={{ paddingRight: '145px' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              Server Wizard (Създаване на Сървър)
            </h2>
            <p className="text-xs text-slate-400">
              Настрой персоналния си домашен сървър само в 3 бързи стъпки
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Server Name & Software */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
            <span>Стъпка 1</span> • Име и Тип Сървър
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Име на твоя сървър</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Survival с Аверите"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {softwareOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSoftware(opt.id)}
                className={`p-4 rounded-2xl text-left border transition-all duration-200 relative ${
                  software === opt.id
                    ? 'bg-emerald-950/20 border-emerald-500/70 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-slate-100">{opt.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      software === opt.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
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
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
              <span>Стъпка 2</span> • Версия на Minecraft (Онлайн API)
            </div>
            {loadingVersions && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Зареждане на версии на живо...
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Избери версия за <strong className="text-emerald-400">{software.toUpperCase()}</strong>:
              </label>
              <span className="text-[11px] text-slate-500">Дърпа се директно от официалното API</span>
            </div>

            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={loadingVersions}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
            >
              {versionsList.map((v) => (
                <option key={v.version} value={v.version}>
                  Minecraft v{v.version} {v.isLatest ? '⭐ (Най-нова официална)' : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Step 3: RAM Slider & Intelligent Capacity Advisor */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
            <span>Стъпка 3</span> • RAM Памет & Капацитет за Играчи
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
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
                ? 'bg-gradient-to-r from-rose-950/60 via-slate-950 to-slate-950 border-rose-500/50 glow-crimson'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  hardcore
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Skull className={`w-5 h-5 ${hardcore ? 'animate-pulse text-rose-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100">
                    Hardcore Режим (1 Живот & Permadeath)
                  </span>
                  {hardcore && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-mono animate-pulse">
                      ВКЛЮЧЕН
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {hardcore
                    ? '💀 ВНИМАНИЕ: Всеки играч има точно 1 живот! При смърт – крайно отпадане (Spectator) и заключена трудност Hard.'
                    : 'Стандартно оцеляване с възможност за нормално прераждане на спаун или легло.'}
                </p>
              </div>
            </div>

            <div
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                hardcore ? 'bg-rose-600' : 'bg-slate-800 border border-slate-700'
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
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Settings className="w-4 h-4 text-slate-400" /> Допълнителни мрежови настройки
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Мрежов Порт (По подразбиране: 25565)</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10) || 25565)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">MOTD (Описание в сървър листа)</label>
                <input
                  type="text"
                  value={motd}
                  onChange={(e) => setMotd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
          >
            Отказ
          </button>

          <button
            type="submit"
            disabled={isCreating || loadingVersions}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-950/60 glow-green disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Създай и Изтегли Сървъра (1 Клик)
          </button>
        </div>
      </form>
    </div>
  );
};

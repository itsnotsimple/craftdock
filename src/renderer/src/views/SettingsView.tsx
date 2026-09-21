import React, { useState, useEffect } from 'react';
import {
  Settings,
  Check,
  Coffee,
  HardDrive,
  Globe,
  Zap,
  Palette,
  Info,
  FolderOpen,
  Copy,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon,
  Bell,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { AppSettings, GlobalDiagnostics } from '../types';
import {
  playMinecraftStartupSound,
  playMinecraftBackupSound,
  playMinecraftJoinSound,
  playMinecraftCrashSound,
} from '../utils/sound-effects';

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, activeTheme, setTheme } = useTheme();

  const [settings, setSettings] = useState<AppSettings>({
    customJavaPath: '',
    useAikarFlags: true,
    serversFolder: '',
    backupsFolder: '',
    defaultPort: 25565,
    autoRestartOnCrash: true,
    autoStartLastServer: true,
    autoStartPlayitTunnel: true,
    autoUpdate: true,
    minimizeToTray: true,
    soundOnStartup: true,
    notifyOnServerReady: false,
    notifyOnPlayerJoinLeave: false,
    notifyOnCrash: false,
    notifyOnBackup: false,
    theme: 'dark',
    language: 'bg',
  });

  const [diagnostics, setDiagnostics] = useState<GlobalDiagnostics | null>(null);
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'java' | 'storage' | 'network' | 'automation' | 'notifications' | 'appearance' | 'about'
  >('all');
  const [copiedLocalIp, setCopiedLocalIp] = useState(false);
  const [copiedPublicIp, setCopiedPublicIp] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);

  // Load initial settings and diagnostics
  useEffect(() => {
    const api = (window as any).api;
    if (!api) return;

    api.getAppSettings?.().then((appSet: AppSettings) => {
      if (appSet) {
        setSettings(appSet);
      }
    });

    api.getGlobalDiagnostics?.().then((diag: GlobalDiagnostics) => {
      if (diag) {
        setDiagnostics(diag);
      }
    });
  }, []);

  const handleCopyLocalIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedLocalIp(true);
    setTimeout(() => setCopiedLocalIp(false), 2000);
  };

  const handleCopyPublicIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedPublicIp(true);
    setTimeout(() => setCopiedPublicIp(false), 2000);
  };

  const handleOpenServersFolder = async () => {
    const api = (window as any).api;
    if (api?.openServersFolder) {
      await api.openServersFolder();
    }
  };

  const handleOpenAppLogs = async () => {
    const api = (window as any).api;
    if (api?.openAppLogs) {
      await api.openAppLogs();
    }
  };

  const handleClearCache = async () => {
    const api = (window as any).api;
    if (api?.clearAppCache) {
      const res = await api.clearAppCache();
      const freed = res?.freedMb ?? 0;
      setCacheNotice(t('globalSettings.cacheCleared', { mb: freed.toString() }));
      setTimeout(() => setCacheNotice(null), 3500);
    }
  };

  const handleUninstall = async () => {
    setUninstalling(true);
    try {
      const api = (window as any).api;
      if (api?.uninstallApp) {
        await api.uninstallApp();
      }
    } catch (_e) {
      // app will quit anyway
    }
  };

  const primaryLocalIp = diagnostics?.network.localIps[0]?.ip || '127.0.0.1';
  const publicIp = diagnostics?.network.publicIp || 'Fetching...';

  const diskUsedPercent = diagnostics?.disk.totalGb
    ? Math.min(100, Math.round((diagnostics.disk.usedGb / diagnostics.disk.totalGb) * 100))
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/40 border-white/[0.08] backdrop-blur-xl'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {t('globalSettings.title')}
            </h2>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('globalSettings.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold select-none self-start sm:self-auto">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bg' ? 'Автоматично се запазват' : 'Auto-saved'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-white/[0.06]">
          {[
            { id: 'all', label: language === 'bg' ? 'Всички' : 'All', icon: Settings },
            { id: 'java', label: t('globalSettings.tabJava'), icon: Coffee },
            { id: 'storage', label: t('globalSettings.tabStorage'), icon: HardDrive },
            { id: 'network', label: t('globalSettings.tabNetwork'), icon: Globe },
            { id: 'automation', label: t('globalSettings.tabAutomation'), icon: Zap },
            { id: 'notifications', label: language === 'bg' ? 'Известия & Звуци' : 'Notifications & Sounds', icon: Bell },
            { id: 'appearance', label: t('globalSettings.tabAppearance'), icon: Palette },
            { id: 'about', label: t('globalSettings.tabAbout'), icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? theme === 'light'
                      ? 'bg-sky-50 text-sky-800 border border-sky-300 shadow-xs'
                      : 'bg-sky-500/15 text-sky-200 border border-sky-400/30'
                    : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= 1. JAVA RUNTIME & CONFIGURATION ================= */}
        {(activeCategory === 'all' || activeCategory === 'java') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    1. {t('globalSettings.tabJava')}
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Управление на Java инсталациите и флаговете за производителност' : 'Manage Java runtimes and performance optimization flags'}
                  </p>
                </div>
              </div>

              {diagnostics?.java && (
                <span className={`text-xs px-2.5 py-1 rounded-lg font-mono border font-semibold ${
                  diagnostics.java.version >= 17
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  {diagnostics.java.version > 0 ? `Java ${diagnostics.java.version} Active` : 'No System Java'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Detected System Java Info */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  {t('globalSettings.javaDetected')}
                </span>
                <p className="text-xs font-mono text-slate-400 break-all">
                  {diagnostics?.java.raw || 'Scanning system Java environment...'}
                </p>
                <p className={`text-[11px] leading-relaxed pt-0.5 ${theme === 'light' ? 'text-amber-700' : 'text-amber-400/80'}`}>
                  ℹ {t('globalSettings.javaSystemNote')}
                </p>
              </div>

              {/* Aikar's Flags Toggle */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div className="space-y-0.5 pr-2">
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.javaAikarTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.javaAikarDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.useAikarFlags}
                    onChange={(e) => {
                      const next = { ...settings, useAikarFlags: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Custom Java Path */}
            <div className="space-y-1.5 pt-1">
              <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                {t('globalSettings.javaCustomPath')}
              </label>
              <input
                type="text"
                value={settings.customJavaPath}
                onChange={(e) => setSettings({ ...settings, customJavaPath: e.target.value })}
                onBlur={() => (window as any).api?.saveAppSettings?.(settings)}
                placeholder={t('globalSettings.javaCustomPathPlaceholder')}
                className={`w-full p-2.5 rounded-xl text-xs font-mono border focus:outline-none transition-all ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                    : 'glass-input text-slate-100 focus:border-indigo-400'
                }`}
              />
              <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('globalSettings.javaCustomPathDesc')}
              </p>
            </div>
          </div>
        )}

        {/* ================= 2. FOLDERS & DISK STORAGE ================= */}
        {(activeCategory === 'all' || activeCategory === 'storage') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/30">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    2. {t('globalSettings.tabStorage')}
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Директории на световете и диагностика на свободното място' : 'Server directories and disk space allocation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenServersFolder}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer btn-bounce ${
                  theme === 'light'
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 shadow-xs'
                    : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{t('globalSettings.openFolder')}</span>
              </button>
            </div>

            {/* Disk Bar & Metrics */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-300'}>
                  {t('globalSettings.diskTotal')}: {diagnostics?.disk.totalGb || 0} GB
                </span>
                <span className="text-emerald-400">
                  {t('globalSettings.diskFree')}: {diagnostics?.disk.freeGb || 0} GB
                </span>
              </div>

              <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                theme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-white/[0.08]'
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${diskUsedPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{t('globalSettings.diskUsed')}: {diagnostics?.disk.usedGb || 0} GB ({diskUsedPercent}%)</span>
                <span>{t('globalSettings.serversSize')}: {diagnostics?.disk.serversSizeMb || 0} MB</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. NETWORK & IP ================= */}
        {(activeCategory === 'all' || activeCategory === 'network') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  3. {t('globalSettings.tabNetwork')}
                </h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('globalSettings.ipFriendsTip')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Local IP */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    {t('globalSettings.localIpTitle')}
                  </span>
                  <span className="text-sm font-mono font-bold text-cyan-400">
                    {primaryLocalIp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyLocalIp(primaryLocalIp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer btn-bounce ${
                    theme === 'light'
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                  }`}
                >
                  {copiedLocalIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Public WAN IP */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    {t('globalSettings.publicIpTitle')}
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-400">
                    {publicIp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyPublicIp(publicIp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer btn-bounce ${
                    theme === 'light'
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                      : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                  }`}
                >
                  {copiedPublicIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Default Port */}
            <div className="space-y-1.5 pt-1">
              <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                {t('globalSettings.defaultPortTitle')}
              </label>
              <input
                type="number"
                min={1024}
                max={65535}
                value={settings.defaultPort}
                onChange={(e) => setSettings({ ...settings, defaultPort: parseInt(e.target.value, 10) || 25565 })}
                onBlur={() => (window as any).api?.saveAppSettings?.(settings)}
                className={`w-full max-w-xs p-2.5 rounded-xl text-xs font-mono border focus:outline-none transition-all ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'glass-input text-slate-100 focus:border-cyan-400'
                }`}
              />
              <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('globalSettings.defaultPortDesc')}
              </p>
            </div>
          </div>
        )}

        {/* ================= 4. AUTOMATION & SAFEGUARDS ================= */}
        {(activeCategory === 'all' || activeCategory === 'automation') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  4. {t('globalSettings.tabAutomation')}
                </h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'bg' ? 'Поведение на програмата, предпазни мерки и автоматично възстановяване' : 'Background safeguards, auto-recovery, and startup behavior'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Auto Restart on Crash */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.autoRestartTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.autoRestartDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.autoRestartOnCrash}
                    onChange={(e) => {
                      const next = { ...settings, autoRestartOnCrash: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Auto Start Last Server on App Launch */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.autoStartTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.autoStartDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.autoStartLastServer}
                    onChange={(e) => {
                      const next = { ...settings, autoStartLastServer: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Auto Start Playit Tunnel with Server */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.autoStartPlayitTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.autoStartPlayitDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.autoStartPlayitTunnel !== false}
                    onChange={(e) => {
                      const next = { ...settings, autoStartPlayitTunnel: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Smart Sleep Mode / Auto-Hibernate */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div className="flex-1">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{language === 'bg' ? 'Smart Sleep Режим (Auto-Hibernate)' : 'Smart Sleep Mode (Auto-Hibernate)'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono">0% RAM/CPU</span>
                  </span>
                  <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Автоматично приспива сървъра при 5 минути празен ход (0 играчи), освобождавайки 100% RAM памет. Автоматично събужда сървъра при опит за вход на играч.'
                      : 'Automatically puts server to sleep when empty for 5 minutes, freeing 100% RAM and CPU. Auto-wakes when a player connects.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {settings.sleepModeEnabled !== false && (
                    <div className="flex items-center gap-1">
                      {[1, 3, 5, 10].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            const next = { ...settings, sleepIdleMinutes: mins };
                            setSettings(next);
                            (window as any).api?.saveAppSettings?.(next);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            (settings.sleepIdleMinutes ?? 5) === mins
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : theme === 'light'
                              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              : 'bg-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sleepModeEnabled !== false}
                      onChange={(e) => {
                        const next = { ...settings, sleepModeEnabled: e.target.checked };
                        setSettings(next);
                        (window as any).api?.saveAppSettings?.(next);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Auto-Update */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div className="flex-1">
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.autoUpdateTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.autoUpdateDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => (window as any).api?.checkForUpdates?.()}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer btn-bounce ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/[0.1]'
                    }`}
                  >
                    {t('globalSettings.checkNow')}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoUpdate}
                      onChange={(e) => {
                        const next = { ...settings, autoUpdate: e.target.checked };
                        setSettings(next);
                        (window as any).api?.saveAppSettings?.(next);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Minimize to Tray */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div className="flex-1">
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('globalSettings.minimizeToTrayTitle')}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('globalSettings.minimizeToTrayDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTray}
                    onChange={(e) => {
                      const next = { ...settings, minimizeToTray: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. NOTIFICATIONS & SOUNDS ================= */}
        {(activeCategory === 'all' || activeCategory === 'notifications') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    5. {language === 'bg' ? 'Известия & Звуци' : 'Notifications & Sounds'}
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Звукови ефекти и Desktop нотификации (Windows & macOS)'
                      : 'Audio feedback and native Desktop notifications (Windows & macOS)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Windows & Mac Native
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* 1. Minecraft Startup Sound */}
              <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Minecraft звук при стартиране (Level-Up / Ding)' : 'Minecraft Startup Sound (Level-Up / Ding)'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {language === 'bg' ? 'Препоръчително' : 'Recommended'}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg'
                        ? 'Възпроизвежда автентичния Minecraft звук в момента, в който конзолата изпише "Done!" и сървърът е готов за игра.'
                        : 'Plays an authentic Minecraft chime as soon as the server boots and is ready for players.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.soundOnStartup !== false}
                      onChange={(e) => {
                        const next = { ...settings, soundOnStartup: e.target.checked };
                        setSettings(next);
                        (window as any).api?.saveAppSettings?.(next);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Sound Previews Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">
                    {language === 'bg' ? 'Прослушай звуци:' : 'Preview sounds:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => playMinecraftStartupSound()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 btn-bounce bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/[0.1]"
                    title={language === 'bg' ? 'Стартиране на сървър (Level-Up chime)' : 'Server start (Level-Up chime)'}
                  >
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'bg' ? 'Старт (Start)' : 'Start'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => playMinecraftBackupSound()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 btn-bounce bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/[0.1]"
                    title={language === 'bg' ? 'Завършен бекъп (Backup chime)' : 'Backup completed chime'}
                  >
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                    <span>{language === 'bg' ? 'Бекъп (Backup)' : 'Backup'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => playMinecraftJoinSound()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 btn-bounce bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/[0.1]"
                    title={language === 'bg' ? 'Играч влиза в сървъра (Join)' : 'Player joins server (Join)'}
                  >
                    <Volume2 className="w-3 h-3 text-violet-400" />
                    <span>{language === 'bg' ? 'Влизане (Join)' : 'Join'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => playMinecraftCrashSound()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 btn-bounce bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/[0.1]"
                    title={language === 'bg' ? 'Предупреждение при срив (Crash)' : 'Server crash warning alarm'}
                  >
                    <Volume2 className="w-3 h-3 text-rose-400" />
                    <span>{language === 'bg' ? 'Краш (Crash)' : 'Crash'}</span>
                  </button>
                </div>

                <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-2 ${
                  theme === 'light' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-300/90 border border-amber-500/20'
                }`}>
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    {language === 'bg'
                      ? 'Всички звуци се генерират автоматично чрез вграден Web Audio синтезатор — не се налага да слагате аудио файлове! За собствен звук можете да поставите файл "startup.mp3" в папка "resources/sounds/".'
                      : 'All sounds are synthesized automatically via Web Audio API — zero sound files needed! For custom audio, place a "startup.mp3" into "resources/sounds/".'}
                  </span>
                </div>
              </div>

              {/* 2. Desktop Notification on Ready */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {language === 'bg' ? 'Desktop известие при готовност на сървъра' : 'Desktop notification on server ready'}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Показва известие в Windows Action Center / macOS Notification Center при успешно зареждане.'
                      : 'Shows a system notification in Windows or macOS when server finishes booting.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.notifyOnServerReady}
                    onChange={(e) => {
                      const next = { ...settings, notifyOnServerReady: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* 3. Desktop Notification on Player Join / Leave */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {language === 'bg' ? 'Desktop известие при влизане / излизане на играч' : 'Desktop notification on player join/leave'}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Известява веднага, когато приятел или играч влезе или напусне сървъра.'
                      : 'Alerts you instantly when a player connects to or disconnects from your server.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.notifyOnPlayerJoinLeave}
                    onChange={(e) => {
                      const next = { ...settings, notifyOnPlayerJoinLeave: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* 4. Desktop Notification on Unexpected Crash */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {language === 'bg' ? 'Desktop известие при неочакван срив (Crash)' : 'Desktop notification on server crash'}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Предупреждава, ако сървърът спре аварийно поради краш или критична грешка.'
                      : 'Warns you if the server stops unexpectedly due to an exception or crash.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.notifyOnCrash}
                    onChange={(e) => {
                      const next = { ...settings, notifyOnCrash: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* 5. Desktop Notification on Auto Backup */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-white/[0.06]'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {language === 'bg' ? 'Desktop известие при завършен бекъп' : 'Desktop notification on auto-backup'}
                  </span>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg'
                      ? 'Потвърждава, че автоматичният архив на света е създаден успешно.'
                      : 'Confirms when a scheduled backup archive has been created.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!settings.notifyOnBackup}
                    onChange={(e) => {
                      const next = { ...settings, notifyOnBackup: e.target.checked };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Test Desktop Notification Button */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    (window as any).api?.sendTestNotification?.(language);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 btn-bounce ${
                    theme === 'light'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {language === 'bg' ? 'Тествай настолно известие' : 'Test desktop notification'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. APPEARANCE & LANGUAGE ================= */}
        {(activeCategory === 'all' || activeCategory === 'appearance') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/15 text-pink-500 border border-pink-500/30">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  6. {t('globalSettings.tabAppearance')}
                </h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'bg' ? 'Персонализирай външния вид и езика на CraftDock' : 'Customize theme and interface language'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Theme Picker */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  {t('globalSettings.themeTitle')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      const next = { ...settings, theme: 'dark' as const };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-bounce ${
                      activeTheme === 'dark'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs'
                        : 'bg-slate-900/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>{t('globalSettings.themeDark')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      const next = { ...settings, theme: 'light' as const };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-bounce ${
                      activeTheme === 'light'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs'
                        : 'bg-slate-900/40 text-slate-400 border-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>{t('globalSettings.themeLight')}</span>
                  </button>
                </div>
              </div>

              {/* Language Picker */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  {t('globalSettings.languageTitle')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('bg');
                      const next = { ...settings, language: 'bg' as const };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-bounce ${
                      language === 'bg'
                        ? theme === 'light'
                          ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                        : theme === 'light'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-slate-900/40 text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    <span>🇧🇬</span>
                    <span>Български</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      const next = { ...settings, language: 'en' as const };
                      setSettings(next);
                      (window as any).api?.saveAppSettings?.(next);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-bounce ${
                      language === 'en'
                        ? theme === 'light'
                          ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                        : theme === 'light'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-slate-900/40 text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    <span>🇬🇧</span>
                    <span>English</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 7. ABOUT & TOOLS ================= */}
        {(activeCategory === 'all' || activeCategory === 'about') && (
          <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    7. {t('globalSettings.tabAbout')}
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    CraftDock • Free & Self-Hosted Minecraft Control Panel
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30">
                v3.4.0 Release
              </span>
            </div>

            {cacheNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{cacheNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleOpenAppLogs}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer btn-bounce ${
                  theme === 'light'
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
                    : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-sky-400" />
                  <span>{t('globalSettings.openAppLogs')}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all cursor-pointer btn-bounce ${
                  theme === 'light'
                    ? 'bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-800 border-slate-200 shadow-xs'
                    : 'glass-card hover:bg-rose-950/30 hover:text-rose-300 text-slate-200 border-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{t('globalSettings.clearCache')}</span>
                </div>
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* ---- Uninstall Section ---- */}
            <div className={`mt-2 rounded-2xl border p-4 space-y-3 ${
              theme === 'light' ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${theme === 'light' ? 'text-rose-800' : 'text-rose-300'}`}>
                    {t('globalSettings.uninstallTitle')}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${theme === 'light' ? 'text-rose-700' : 'text-rose-400'}`}>
                    {t('globalSettings.uninstallDesc')}
                  </p>
                </div>
              </div>

              {!showUninstallConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowUninstallConfirm(true)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer btn-bounce ${
                    theme === 'light'
                      ? 'bg-white hover:bg-rose-100 text-rose-700 border-rose-300 shadow-xs'
                      : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('globalSettings.uninstallBtn')}
                </button>
              ) : (
                <div className={`p-3 rounded-xl border space-y-3 ${
                  theme === 'light' ? 'bg-white border-rose-300' : 'bg-rose-950/40 border-rose-500/40'
                }`}>
                  <p className={`text-xs font-bold text-center ${theme === 'light' ? 'text-rose-800' : 'text-rose-200'}`}>
                    {t('globalSettings.uninstallConfirmTitle')}
                  </p>
                  <p className={`text-xs text-center whitespace-pre-line leading-relaxed ${theme === 'light' ? 'text-rose-700' : 'text-rose-400'}`}>
                    {t('globalSettings.uninstallConfirmBody')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUninstallConfirm(false)}
                      disabled={uninstalling}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer btn-bounce ${
                        theme === 'light'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUninstall}
                      disabled={uninstalling}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer btn-bounce bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {uninstalling ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          {t('globalSettings.uninstalling')}
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('globalSettings.uninstallConfirmBtn')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Globe,
  FolderOpen,
  Terminal as TerminalIcon,
  Users,
  Settings,
  ArrowLeft,
  UserX,
  Crown,
  Box,
  Package,
  Archive,
  Activity,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Loader2,
  BarChart3,
  ArrowUpCircle,
  Coffee,
  Zap,
  Moon,
} from 'lucide-react';
import { ServerProfile, LogEntry, SystemInfo, ServerStats } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ConsoleView } from '../components/ConsoleView';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Code splitting: Heavy tabs and modals loaded on demand
const PluginManager = React.lazy(() =>
  import('../components/PluginManager').then((m) => ({ default: m.PluginManager }))
);
const ServerSettingsTab = React.lazy(() =>
  import('../components/ServerSettingsTab').then((m) => ({ default: m.ServerSettingsTab }))
);
const VersionUpgraderTab = React.lazy(() =>
  import('../components/VersionUpgraderTab').then((m) => ({ default: m.VersionUpgraderTab }))
);
const ResourceMonitorTab = React.lazy(() =>
  import('../components/ResourceMonitorTab').then((m) => ({ default: m.ResourceMonitorTab }))
);
const WorldManager = React.lazy(() =>
  import('../components/WorldManager').then((m) => ({ default: m.WorldManager }))
);
const PlayerManagement = React.lazy(() =>
  import('../components/PlayerManagement').then((m) => ({ default: m.PlayerManagement }))
);
const AnalyticsTab = React.lazy(() =>
  import('../components/analytics').then((m) => ({ default: m.AnalyticsTab }))
);
const CrashAnalyzerModal = React.lazy(() =>
  import('../components/CrashAnalyzerModal').then((m) => ({ default: m.CrashAnalyzerModal }))
);

const TabLoader: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-3 animate-in fade-in duration-150">
      <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
      <span className="text-xs font-mono text-slate-400">{t('common.loading')}</span>
    </div>
  );
};

interface DashboardViewProps {
  server: ServerProfile;
  logs: LogEntry[];
  players: string[];
  systemInfo?: SystemInfo | null;
  serverStats?: ServerStats | null;
  activeRunningServer?: ServerProfile | null;
  onUpdateServer?: (server: ServerProfile) => void;
  onStartServer: (id: string) => void;
  onStopServer: (id: string) => void;
  onSendCommand: (command: string) => void;
  onClearLogs: () => void;
  onOpenNetworkModal: () => void;
  onOpenFolder: (id: string) => void;
  onBackToLibrary: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  server,
  logs,
  players,
  systemInfo,
  serverStats,
  activeRunningServer,
  onUpdateServer,
  onStartServer,
  onStopServer,
  onSendCommand,
  onClearLogs,
  onOpenNetworkModal,
  onOpenFolder,
  onBackToLibrary,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'console' | 'plugins' | 'settings' | 'version' | 'resources' | 'players' | 'worlds' | 'analytics'>('console');
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [selectedCrashSession, setSelectedCrashSession] = useState<any | null>(null);
  const [crashDetected, setCrashDetected] = useState(false);
  const [javaStatus, setJavaStatus] = useState<{
    systemJavaVersion: number;
    portableJavaAvailable: boolean;
    isCompatible: boolean;
    requiredVersion: number;
  } | null>(null);

  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const isStopping = server.status === 'stopping';
  const isSleeping = server.status === 'sleeping';

  useEffect(() => {
    let isMounted = true;
    const fetchJava = async () => {
      try {
        const api = (window as any).api;
        if (api?.checkJavaStatus) {
          const res = await api.checkJavaStatus(server.version);
          if (isMounted) setJavaStatus(res);
        }
      } catch (e) {
        console.warn('Could not check java status:', e);
      }
    };
    fetchJava();
    return () => {
      isMounted = false;
    };
  }, [server.version]);

  useEffect(() => {
    const api = (window as any).api;
    if (!api?.onServerCrashed) return;
    const unsub = api.onServerCrashed((data: any) => {
      if (data?.serverId === server.id) {
        setCrashDetected(true);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [server.id]);

  useEffect(() => {
    if (isRunning) {
      setCrashDetected(false);
    }
  }, [isRunning]);

  return (
    <div className={`flex-1 flex flex-col h-full ${theme === 'light' ? 'bg-transparent' : 'bg-slate-950/20'} overflow-hidden`}>
      {/* Top Server Bar */}
      <header className={`px-6 py-4 border-b flex items-center justify-between shrink-0 transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-white/95 border-slate-200 shadow-xs'
          : 'border-white/[0.08] glass-panel'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToLibrary}
            className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 hover:text-white'
            }`}
            title={t('dashboard.backTooltip')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              {/* Pulsing Status Beacon */}
              <div className="flex items-center justify-center">
                {isRunning ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-emerald-300"></span>
                  </span>
                ) : isStarting ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-amber-300"></span>
                  </span>
                ) : isStopping ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-rose-300"></span>
                  </span>
                ) : isSleeping ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border border-indigo-300"></span>
                  </span>
                ) : (
                  <span className={`w-3 h-3 rounded-full ${theme === 'light' ? 'bg-slate-400' : 'bg-slate-700'}`} />
                )}
              </div>

              <h2 className={`text-xl font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                {server.name}
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase font-mono tracking-wider border ${
                theme === 'light'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-sky-500/10 text-sky-300 border-sky-400/20'
              }`}>
                v{server.version} • {server.software}
              </span>

              {isSleeping && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span>💤 {language === 'bg' ? 'В готовност (Спи)' : 'Sleeping (Auto-Wake)'}</span>
                </span>
              )}

              {/* Java Version Compatibility Badge */}
              {javaStatus && (
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 border transition-all ${
                    javaStatus.isCompatible
                      ? theme === 'light'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                      : theme === 'light'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                  }`}
                  title={
                    language === 'bg'
                      ? `Изисква Java ${javaStatus.requiredVersion}. ${
                          javaStatus.isCompatible
                            ? javaStatus.portableJavaAvailable
                              ? 'CraftDock разполага с подготвена изолирана Java среда.'
                              : `Инсталирана в системата: Java ${javaStatus.systemJavaVersion} (Съвместима).`
                            : `Системната Java (${javaStatus.systemJavaVersion || 'няма'}) е по-стара. CraftDock ще подготви изолирана Java ${javaStatus.requiredVersion}.`
                        }`
                      : `Requires Java ${javaStatus.requiredVersion}. ${
                          javaStatus.isCompatible
                            ? javaStatus.portableJavaAvailable
                              ? 'CraftDock has an isolated portable Java runtime ready.'
                              : `Installed in system: Java ${javaStatus.systemJavaVersion} (Compatible).`
                            : `System Java (${javaStatus.systemJavaVersion || 'none'}) is outdated. CraftDock will provision Java ${javaStatus.requiredVersion}.`
                        }`
                  }
                >
                  <Coffee className="w-3 h-3 text-amber-500" />
                  <span>Java {javaStatus.requiredVersion}</span>
                  {javaStatus.isCompatible ? (
                    <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                  ) : (
                    <Zap className="w-2.5 h-2.5 text-amber-400 fill-current" />
                  )}
                </span>
              )}

              {isStarting && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 animate-pulse font-mono ${
                  theme === 'light'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {t('common.starting')}
                </span>
              )}
              {isRunning && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-mono ${
                  theme === 'light'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t('common.online')}
                </span>
              )}
              {isStopping && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-mono ${
                  theme === 'light'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {t('common.stopping')}
                </span>
              )}
              {isSleeping && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-mono ${
                  theme === 'light'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30'
                }`}>
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>{language === 'bg' ? 'В готовност (Спи)' : 'Sleeping'}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono mt-1">
              <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                <span className={theme === 'light' ? 'text-slate-400' : 'text-slate-500'}>{t('dashboard.port')}:</span> :{server.port}
              </span>
              <span className={theme === 'light' ? 'text-slate-300' : 'text-slate-600'}>•</span>
              <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                <span className={theme === 'light' ? 'text-slate-400' : 'text-slate-500'}>{t('dashboard.allocatedRam')}:</span> {server.allocatedRamGb} GB
              </span>
            </div>
          </div>
        </div>

        {/* Server Control Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNetworkModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer group ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-cyan-500/40'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.1] hover:border-cyan-400/40'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-500 transition-transform group-hover:rotate-12" />
            <span>{t('dashboard.ipForFriends')}</span>
          </button>

          <button
            onClick={() => onOpenFolder(server.id)}
            className={`p-2.5 rounded-xl transition-all border cursor-pointer shadow-xs ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-amber-500/40'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-slate-100 border-white/[0.1] hover:border-amber-400/40'
            }`}
            title={t('dashboard.openFolderTooltip')}
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
          </button>

          <button
            onClick={async () => {
              const api = (window as any).api;
              if (api?.exportServerZip) {
                await api.exportServerZip(server.id);
              }
            }}
            className={`p-2.5 rounded-xl transition-all border cursor-pointer shadow-xs ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-cyan-500/40'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-slate-100 border-white/[0.1] hover:border-cyan-400/40'
            }`}
            title={language === 'bg' ? 'Експортирай целия сървър в .zip архив' : 'Export full server (.zip)'}
          >
            <Archive className="w-4 h-4 text-cyan-500" />
          </button>

          {isRunning ? (
            <button
              onClick={() => onStopServer(server.id)}
              disabled={isStopping}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs transition-all shadow-lg shadow-rose-950/50 glow-crimson cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-200" />
              <span>{isStopping ? t('common.stopping') : t('common.stop')}</span>
            </button>
          ) : isStarting ? (
            <button
              disabled={true}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 font-bold text-xs shadow-lg shadow-amber-950/40 cursor-not-allowed opacity-90"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>{t('common.starting')}</span>
            </button>
          ) : isStopping ? (
            <button
              disabled={true}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/30 font-bold text-xs shadow-lg cursor-not-allowed opacity-90"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
              <span>{t('common.stopping')}</span>
            </button>
          ) : isSleeping ? (
            <button
              onClick={() => (window as any).api?.wakeServer?.(server.id)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-950/50 cursor-pointer btn-bounce"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>{language === 'bg' ? 'Събуди Сървъра' : 'Wake Up Server'}</span>
            </button>
          ) : activeRunningServer && activeRunningServer.id !== server.id ? (
            <button
              onClick={() => onStartServer(server.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-xs transition-all border border-amber-400/30 cursor-pointer shadow-sm shadow-amber-950/40"
              title={t('serverCard.runningAnother', { name: activeRunningServer.name })}
            >
              <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{t('common.switchServer')}</span>
            </button>
          ) : (
            <button
              onClick={() => onStartServer(server.id)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 glow-green cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current text-emerald-200" />
              <span>{t('common.startOneClick')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`px-6 py-2 border-b flex items-center justify-between gap-4 shrink-0 backdrop-blur-xl transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-white/90 border-slate-200 shadow-xs'
          : 'bg-slate-950/30 border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0 flex-1">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'console'
                ? theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <TerminalIcon className={`w-3.5 h-3.5 ${activeTab === 'console' ? (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : (theme === 'light' ? 'text-emerald-700/70' : 'text-emerald-400/70')}`} />
            <span>{t('dashboard.tabConsole')}</span>
          </button>

          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'plugins'
                ? theme === 'light'
                  ? 'bg-purple-50 text-purple-800 border border-purple-300 shadow-xs font-bold'
                  : 'bg-purple-500/15 text-purple-200 border border-purple-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Package className={`w-3.5 h-3.5 ${activeTab === 'plugins' ? (theme === 'light' ? 'text-purple-600' : 'text-purple-400') : (theme === 'light' ? 'text-purple-700/70' : 'text-purple-400/70')}`} />
            <span>{t('dashboard.tabPlugins')}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? theme === 'light'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs font-bold'
                  : 'bg-amber-500/15 text-amber-200 border border-amber-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${activeTab === 'settings' ? (theme === 'light' ? 'text-amber-600' : 'text-amber-400') : (theme === 'light' ? 'text-amber-700/70' : 'text-amber-400/70')}`} />
            <span>{t('dashboard.tabSettings')}</span>
          </button>

          <button
            onClick={() => setActiveTab('version')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'version'
                ? theme === 'light'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300 shadow-xs font-bold'
                  : 'bg-indigo-500/15 text-indigo-200 border border-indigo-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <ArrowUpCircle className={`w-3.5 h-3.5 ${activeTab === 'version' ? (theme === 'light' ? 'text-indigo-600' : 'text-indigo-400') : (theme === 'light' ? 'text-indigo-700/70' : 'text-indigo-400/70')}`} />
            <span>{language === 'bg' ? 'Версия & Ъпгрейд' : 'Version & Upgrade'}</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'players'
                ? theme === 'light'
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 shadow-xs font-bold'
                  : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'players' ? (theme === 'light' ? 'text-cyan-600' : 'text-cyan-400') : (theme === 'light' ? 'text-cyan-700/70' : 'text-cyan-400/70')}`} />
            <span>{t('dashboard.tabPlayers')} ({players.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'resources'
                ? theme === 'light'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-xs font-bold'
                  : 'bg-pink-500/15 text-pink-200 border border-pink-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeTab === 'resources' ? (theme === 'light' ? 'text-rose-600' : 'text-pink-400') : (theme === 'light' ? 'text-rose-700/70' : 'text-pink-400/70')}`} />
            <span>{t('dashboard.tabResources')}</span>
          </button>

          <button
            onClick={() => setActiveTab('worlds')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'worlds'
                ? theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${activeTab === 'worlds' ? (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : (theme === 'light' ? 'text-emerald-700/70' : 'text-emerald-400/70')}`} />
            <span>{t('dashboard.tabWorlds')}</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? theme === 'light'
                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-300 shadow-xs font-bold'
                  : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? (theme === 'light' ? 'text-cyan-600' : 'text-cyan-400') : (theme === 'light' ? 'text-cyan-700/70' : 'text-cyan-400/70')}`} />
            <span>{t('dashboard.tabAnalytics')}</span>
          </button>
        </div>

        {/* Status indicator - shifted slightly to the right */}
        <div className="flex items-center gap-2 text-xs shrink-0 pl-4 ml-auto translate-x-2 select-none">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : isStarting
                ? 'bg-amber-400 animate-ping'
                : theme === 'light'
                ? 'bg-slate-400'
                : 'bg-slate-600'
            }`}
          />
          <span className={`font-semibold font-mono ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
            {isRunning ? t('common.online') : isStarting ? t('common.starting') : t('common.offline')}
          </span>
        </div>
      </div>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 overflow-hidden">
        {activeTab === 'console' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на конзолата' : 'Error loading console'}>
            <ConsoleView
              logs={logs}
              onSendCommand={onSendCommand}
              onClearLogs={onClearLogs}
              serverStatus={server.status}
              onOpenCrashAnalyzer={() => setShowCrashModal(true)}
              crashDetected={crashDetected || server.status === 'error'}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'plugins' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на мениджъра на плъгини' : 'Error loading plugin manager'}>
            <React.Suspense fallback={<TabLoader />}>
              <PluginManager server={server} />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === 'settings' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на настройките на света' : 'Error loading world settings'}>
            <React.Suspense fallback={<TabLoader />}>
              <ServerSettingsTab server={server} onUpdateServer={onUpdateServer} />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === 'version' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на инструмента за версия' : 'Error loading version upgrader'}>
            <React.Suspense fallback={<TabLoader />}>
              <VersionUpgraderTab server={server} onUpdateServer={onUpdateServer} />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === 'resources' && (
          <React.Suspense fallback={<TabLoader />}>
            <ResourceMonitorTab
              server={server}
              serverStats={serverStats}
              systemInfo={systemInfo ?? null}
              onlinePlayerCount={players.length}
            />
          </React.Suspense>
        )}

        {activeTab === 'players' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на играчите' : 'Error loading player manager'}>
            <React.Suspense fallback={<TabLoader />}>
              <PlayerManagement
                server={server}
                onlinePlayers={players}
                onSendCommand={onSendCommand}
              />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === 'worlds' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на световете' : 'Error loading world manager'}>
            <React.Suspense fallback={<TabLoader />}>
              <WorldManager server={server} onSendCommand={onSendCommand} />
            </React.Suspense>
          </ErrorBoundary>
        )}

        {activeTab === 'analytics' && (
          <ErrorBoundary fallbackTitle={language === 'bg' ? 'Грешка при зареждане на анализите' : 'Error loading analytics'}>
            <React.Suspense fallback={<TabLoader />}>
              <AnalyticsTab
                server={server}
                isRunning={isRunning}
                onSendCommand={onSendCommand}
                onOpenCrashAnalyzer={(session?: any) => {
                  setSelectedCrashSession(session || null);
                  setShowCrashModal(true);
                }}
              />
            </React.Suspense>
          </ErrorBoundary>
        )}
      </main>

      {/* Crash Analyzer Modal */}
      {showCrashModal && (
        <React.Suspense fallback={null}>
          <CrashAnalyzerModal
            serverId={server.id}
            serverName={server.name}
            isOpen={showCrashModal}
            selectedSession={selectedCrashSession}
            onClose={() => {
              setShowCrashModal(false);
              setSelectedCrashSession(null);
            }}
            onNavigateTab={(tab) => {
              setShowCrashModal(false);
              setSelectedCrashSession(null);
              if (['console', 'plugins', 'settings', 'resources', 'players', 'worlds', 'analytics'].includes(tab)) {
                setActiveTab(tab as any);
              }
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

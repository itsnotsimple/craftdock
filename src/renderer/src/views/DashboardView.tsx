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
} from 'lucide-react';
import { ServerProfile, LogEntry, SystemInfo, ServerStats } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ConsoleView } from '../components/ConsoleView';
import { PluginManager } from '../components/PluginManager';
import { ServerSettingsTab } from '../components/ServerSettingsTab';
import { BackupManager } from '../components/BackupManager';
import { ResourceMonitorTab } from '../components/ResourceMonitorTab';

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
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'console' | 'plugins' | 'settings' | 'resources' | 'players' | 'backups'>('console');
  const [whitelist, setWhitelist] = useState<Array<{ name: string; uuid?: string }>>([]);
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [whitelistLoading, setWhitelistLoading] = useState<boolean>(false);
  const isRunning = server.status === 'running';
  const isStarting = server.status === 'starting';
  const isStopping = server.status === 'stopping';

  const loadWhitelistData = async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const [wl, props] = await Promise.all([
        api.getWhitelist(server.id),
        api.getServerProperties(server.id),
      ]);
      setWhitelist(wl || []);
      setIsWhitelistEnabled(props?.whiteList ?? false);
    } catch (e) {
      console.error('Failed to load whitelist:', e);
    }
  };

  useEffect(() => {
    loadWhitelistData();
  }, [server.id, activeTab]);

  const handleAddWhitelist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;

    setWhitelistLoading(true);
    const api = (window as any).api;
    if (api) {
      try {
        await api.addToWhitelist(server.id, name);
        setNewPlayerName('');
        await loadWhitelistData();
      } catch (err) {
        console.error('Failed to add to whitelist:', err);
      } finally {
        setWhitelistLoading(false);
      }
    }
  };

  const handleRemoveWhitelist = async (name: string) => {
    setWhitelistLoading(true);
    const api = (window as any).api;
    if (api) {
      try {
        await api.removeFromWhitelist(server.id, name);
        await loadWhitelistData();
      } catch (err) {
        console.error('Failed to remove from whitelist:', err);
      } finally {
        setWhitelistLoading(false);
      }
    }
  };

  const handleToggleWhitelist = async () => {
    const api = (window as any).api;
    if (!api) return;
    const newState = !isWhitelistEnabled;
    try {
      await api.saveServerProperties(server.id, { whiteList: newState });
      setIsWhitelistEnabled(newState);
      if (isRunning) {
        onSendCommand(`whitelist ${newState ? 'on' : 'off'}`);
        onSendCommand('whitelist reload');
      }
    } catch (e) {
      console.error('Failed to toggle whitelist:', e);
    }
  };

  const handleOpPlayer = (playerName: string) => {
    onSendCommand(`op ${playerName}`);
  };

  const handleKickPlayer = (playerName: string) => {
    onSendCommand(`kick ${playerName}`);
  };

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
      <div className={`px-6 py-2 border-b flex items-center justify-between shrink-0 backdrop-blur-xl transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-white/90 border-slate-200 shadow-xs'
          : 'bg-slate-950/30 border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
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
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'backups'
                ? theme === 'light'
                  ? 'bg-orange-50 text-orange-800 border border-orange-300 shadow-xs font-bold'
                  : 'bg-orange-500/15 text-orange-200 border border-orange-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Archive className={`w-3.5 h-3.5 ${activeTab === 'backups' ? (theme === 'light' ? 'text-orange-600' : 'text-orange-400') : (theme === 'light' ? 'text-orange-700/70' : 'text-orange-400/70')}`} />
            <span>{t('dashboard.tabBackups')}</span>
          </button>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs">
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
          <ConsoleView
            logs={logs}
            onSendCommand={onSendCommand}
            onClearLogs={onClearLogs}
            serverStatus={server.status}
          />
        )}

        {activeTab === 'plugins' && <PluginManager server={server} />}

        {activeTab === 'settings' && (
          <ServerSettingsTab server={server} onUpdateServer={onUpdateServer} />
        )}

        {activeTab === 'resources' && (
          <ResourceMonitorTab
            server={server}
            serverStats={serverStats}
            systemInfo={systemInfo ?? null}
            onlinePlayerCount={players.length}
          />
        )}

        {activeTab === 'backups' && <BackupManager server={server} />}

        {activeTab === 'players' && (
          <div className={`h-full rounded-2xl p-6 overflow-y-auto space-y-8 ${
            theme === 'light'
              ? 'bg-white border border-slate-200 shadow-sm'
              : 'glass-panel'
          }`}>
            {/* Section 1: Online Players */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`text-base font-extrabold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    <Users className="w-5 h-5 text-sky-500" />
                    {t('dashboard.onlinePlayersNow')} ({players.length})
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('dashboard.onlinePlayersSubtitle')}
                  </p>
                </div>
              </div>

              {players.length === 0 ? (
                <div className={`py-8 text-center rounded-xl text-xs border border-dashed ${
                  theme === 'light'
                    ? 'bg-slate-50/70 text-slate-500 border-slate-200'
                    : 'glass-card text-slate-400 border-white/[0.08]'
                }`}>
                  {t('dashboard.noConnectedPlayers')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players.map((player) => (
                    <div
                      key={player}
                      className={`p-3 rounded-xl flex items-center justify-between shadow-xs border ${
                        theme === 'light'
                          ? 'bg-slate-50/80 border-slate-200'
                          : 'glass-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${player}/32`}
                          alt={player}
                          className="w-8 h-8 rounded-md bg-slate-800"
                        />
                        <span className={`font-mono text-sm font-bold ${
                          theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                        }`}>{player}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpPlayer(player)}
                          title={t('dashboard.opTooltip')}
                          className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer ${
                            theme === 'light'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                        >
                          <Crown className="w-3.5 h-3.5" /> OP
                        </button>
                        <button
                          onClick={() => handleKickPlayer(player)}
                          title={t('dashboard.kickTooltip')}
                          className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer ${
                            theme === 'light'
                              ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" /> Kick
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Whitelist Management */}
            <div className={`pt-6 border-t space-y-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-base font-extrabold flex items-center gap-2 ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    <Shield className="w-5 h-5 text-sky-500" />
                    {t('dashboard.whitelistTitle')}
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {t('dashboard.whitelistSubtitle')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                      isWhitelistEnabled
                        ? theme === 'light'
                          ? 'bg-sky-50 text-sky-800 border-sky-300'
                          : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                    }`}
                  >
                    {isWhitelistEnabled ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-500" /> {t('dashboard.whitelistActive')}
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> {t('dashboard.whitelistDisabled')}
                      </>
                    )}
                  </span>

                  <button
                    onClick={handleToggleWhitelist}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isWhitelistEnabled
                        ? theme === 'light'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 shadow-xs'
                          : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                        : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-sky-400/40 glow-ice shadow-sm'
                    }`}
                  >
                    {isWhitelistEnabled ? t('dashboard.disableWhitelist') : t('dashboard.enableWhitelist')}
                  </button>
                </div>
              </div>

              {/* Status information banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 backdrop-blur-xl ${
                  isWhitelistEnabled
                    ? theme === 'light'
                      ? 'bg-sky-50/90 border-sky-200 text-sky-900 shadow-xs'
                      : 'bg-sky-950/30 border-sky-400/30 text-sky-200'
                    : theme === 'light'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-xs'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                {isWhitelistEnabled ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                )}
                <div>
                  <div className="font-bold">
                    {isWhitelistEnabled
                      ? t('dashboard.serverSecured')
                      : t('dashboard.serverUnsecured')}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'opacity-90'}`}>
                    {isWhitelistEnabled
                      ? t('dashboard.serverSecuredDesc')
                      : t('dashboard.serverUnsecuredDesc')}
                  </div>
                </div>
              </div>

              {/* Add player to whitelist form */}
              <form onSubmit={handleAddWhitelist} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('dashboard.addPlayerPlaceholder')}
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className={`flex-1 px-4 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500 border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 shadow-xs'
                      : 'glass-input text-slate-200 focus:border-sky-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim() || whitelistLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm shrink-0 glow-ice cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('dashboard.addToWhitelist')}</span>
                </button>
              </form>

              {/* Whitelisted Players List */}
              {whitelist.length === 0 ? (
                <div className={`py-8 text-center rounded-xl text-xs border border-dashed ${
                  theme === 'light'
                    ? 'bg-slate-50/70 text-slate-500 border-slate-200'
                    : 'glass-card text-slate-400 border-white/[0.08]'
                }`}>
                  {t('dashboard.noPlayers')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whitelist.map((entry) => (
                    <div
                      key={entry.name}
                      className={`p-3 rounded-xl flex items-center justify-between shadow-xs border ${
                        theme === 'light'
                          ? 'bg-slate-50/80 border-slate-200'
                          : 'glass-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${entry.name}/32`}
                          alt={entry.name}
                          className="w-8 h-8 rounded-md bg-slate-800"
                        />
                        <div>
                          <span className={`font-mono text-xs font-bold block ${
                            theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                          }`}>
                            {entry.name}
                          </span>
                          <span className={`text-[10px] font-medium ${
                            theme === 'light' ? 'text-sky-700 font-semibold' : 'text-sky-400'
                          }`}>{t('dashboard.allowedBadge')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveWhitelist(entry.name)}
                        disabled={whitelistLoading}
                        title={t('dashboard.removeWhitelistTooltip')}
                        className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer ${
                          theme === 'light'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

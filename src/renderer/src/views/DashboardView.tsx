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
} from 'lucide-react';
import { ServerProfile, LogEntry, SystemInfo, ServerStats } from '../types';
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
      await api.addToWhitelist(server.id, name);
      setNewPlayerName('');
      await loadWhitelistData();
    }
    setWhitelistLoading(false);
  };

  const handleRemoveWhitelist = async (name: string) => {
    setWhitelistLoading(true);
    const api = (window as any).api;
    if (api) {
      await api.removeFromWhitelist(server.id, name);
      await loadWhitelistData();
    }
    setWhitelistLoading(false);
  };

  const handleToggleWhitelist = async () => {
    const api = (window as any).api;
    if (!api) return;
    const nextState = !isWhitelistEnabled;
    setIsWhitelistEnabled(nextState);
    await api.saveServerProperties(server.id, { whiteList: nextState });
    if (isRunning) {
      onSendCommand(`whitelist ${nextState ? 'on' : 'off'}`);
      onSendCommand('whitelist reload');
    }
  };

  const handleKickPlayer = (playerName: string) => {
    onSendCommand(`kick ${playerName} Изритан от администратор`);
  };

  const handleOpPlayer = (playerName: string) => {
    onSendCommand(`op ${playerName}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative z-1">
      {/* Top Bar Header */}
      <header
        className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/40 backdrop-blur-2xl shrink-0"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToLibrary}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer group"
            title="Назад към списъка със сървъри"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
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
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-slate-700" />
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-100 tracking-tight">{server.name}</h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/20 uppercase font-mono tracking-wider">
                v{server.version} • {server.software}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="text-slate-500">Порт:</span> :{server.port}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="text-slate-500">Заделен RAM:</span> {server.allocatedRamGb} GB
              </span>
            </div>
          </div>
        </div>

        {/* Server Control Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNetworkModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all border border-white/[0.1] hover:border-cyan-400/40 shadow-sm cursor-pointer group"
          >
            <Globe className="w-4 h-4 text-cyan-400 transition-transform group-hover:rotate-12" />
            <span>IP за Приятели</span>
          </button>

          <button
            onClick={() => onOpenFolder(server.id)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-slate-100 transition-all border border-white/[0.1] hover:border-amber-400/40 cursor-pointer"
            title="Отвори папката на сървъра"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </button>

          {isRunning ? (
            <button
              onClick={() => onStopServer(server.id)}
              disabled={isStopping}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs transition-all shadow-lg shadow-rose-950/50 glow-crimson cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-200" />
              <span>{isStopping ? 'Спира...' : 'Спри Сървъра'}</span>
            </button>
          ) : activeRunningServer && activeRunningServer.id !== server.id ? (
            <button
              onClick={() => onStartServer(server.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-xs transition-all border border-amber-400/30 cursor-pointer shadow-sm shadow-amber-950/40"
              title={`В момента работи «${activeRunningServer.name}». Кликни за смяна.`}
            >
              <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>Смени на този сървър</span>
            </button>
          ) : (
            <button
              onClick={() => onStartServer(server.id)}
              disabled={isStarting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 glow-green cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current text-emerald-200" />
              <span>{isStarting ? 'Стартира...' : 'Стартирай (1 Клик)'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 bg-slate-950/30 border-b border-white/[0.06] flex items-center justify-between shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'console'
                ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <TerminalIcon className={`w-3.5 h-3.5 ${activeTab === 'console' ? 'text-emerald-400' : 'text-emerald-400/70'}`} />
            <span>Конзола</span>
          </button>

          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'plugins'
                ? 'bg-purple-500/15 text-purple-200 border border-purple-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Package className={`w-3.5 h-3.5 ${activeTab === 'plugins' ? 'text-purple-400' : 'text-purple-400/70'}`} />
            <span>Плъгини & Ресурс Пакети</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500/15 text-amber-200 border border-amber-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-amber-400' : 'text-amber-400/70'}`} />
            <span>Настройки на Света</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'players'
                ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'players' ? 'text-cyan-400' : 'text-cyan-400/70'}`} />
            <span>Играчи & Whitelist ({players.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-pink-500/15 text-pink-200 border border-pink-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeTab === 'resources' ? 'text-pink-400' : 'text-pink-400/70'}`} />
            <span>Ресурси & Хардуер</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'bg-orange-500/15 text-orange-200 border border-orange-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Archive className={`w-3.5 h-3.5 ${activeTab === 'backups' ? 'text-orange-400' : 'text-orange-400/70'}`} />
            <span>Архиви (Backups)</span>
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
                : 'bg-slate-600'
            }`}
          />
          <span className="font-semibold text-slate-300 font-mono">
            {isRunning ? 'Онлайн' : isStarting ? 'Стартира...' : 'Офлайн'}
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
          <div className="h-full glass-panel rounded-2xl p-6 overflow-y-auto space-y-8">
            {/* Section 1: Online Players */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" />
                    Онлайн играчи в момента ({players.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Играчи, които са свързани и играят в сървъра точно сега
                  </p>
                </div>
              </div>

              {players.length === 0 ? (
                <div className="py-8 text-center glass-card rounded-xl text-slate-400 text-xs">
                  Няма свързани играчи в момента. Когато някой влезе в играта, ще се появи тук с опция за OP и Kick.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players.map((player) => (
                    <div
                      key={player}
                      className="p-3 rounded-xl glass-card flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${player}/32`}
                          alt={player}
                          className="w-8 h-8 rounded-md bg-slate-800"
                        />
                        <span className="font-mono text-sm font-bold text-slate-200">{player}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpPlayer(player)}
                          title="Дай OP (Администраторски права)"
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5" /> OP
                        </button>
                        <button
                          onClick={() => handleKickPlayer(player)}
                          title="Изритай играч (Kick)"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer"
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
            <div className="pt-6 border-t border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-sky-400" />
                    Whitelist (Списък с разрешени играчи)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Защити сървъра, така че само одобрени приятели да могат да влизат
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border ${
                      isWhitelistEnabled
                        ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                    }`}
                  >
                    {isWhitelistEnabled ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Whitelist: Активен
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Whitelist: Изключен
                      </>
                    )}
                  </span>

                  <button
                    onClick={handleToggleWhitelist}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isWhitelistEnabled
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                        : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-sky-400/40 glow-ice shadow-sm'
                    }`}
                  >
                    {isWhitelistEnabled ? 'Изключи Whitelist' : 'Включи Whitelist'}
                  </button>
                </div>
              </div>

              {/* Status information banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 backdrop-blur-xl ${
                  isWhitelistEnabled
                    ? 'bg-sky-950/30 border-sky-400/30 text-sky-200'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                {isWhitelistEnabled ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                )}
                <div>
                  <div className="font-bold">
                    {isWhitelistEnabled
                      ? 'Сървърът е в защитен режим!'
                      : 'Внимание: Всеки играч с твоя IP адрес може да влезе в момента.'}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {isWhitelistEnabled
                      ? 'Само потребителите в списъка по-долу могат да се присъединят към играта.'
                      : 'Натисни "Включи Whitelist", ако искаш да ограничиш достъпа само за хората, добавени в списъка по-долу.'}
                  </div>
                </div>
              </div>

              {/* Add player to whitelist form */}
              <form onSubmit={handleAddWhitelist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Въведи Minecraft потребителско име (напр. Ivan, Alex, Player123)..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl glass-input text-slate-200 text-xs focus:outline-none focus:border-sky-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim() || whitelistLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm shrink-0 glow-ice cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добави в Whitelist</span>
                </button>
              </form>

              {/* Whitelisted Players List */}
              {whitelist.length === 0 ? (
                <div className="py-8 text-center glass-card rounded-xl text-slate-400 text-xs">
                  Няма добавени играчи в белия списък. Напиши името на приятел по-горе и натисни "Добави в Whitelist".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whitelist.map((entry) => (
                    <div
                      key={entry.name}
                      className="p-3 rounded-xl glass-card flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${entry.name}/32`}
                          alt={entry.name}
                          className="w-8 h-8 rounded-md bg-slate-800"
                        />
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-200 block">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-sky-400 font-medium">Разрешен</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveWhitelist(entry.name)}
                        disabled={whitelistLoading}
                        title="Премахни от Whitelist"
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Премахни
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

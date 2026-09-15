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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Top Bar Header */}
      <header
        className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0"
        style={{ paddingRight: '145px' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToLibrary}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            title="Назад към списъка със сървъри"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">{server.name}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                v{server.version} ({server.software})
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
              <span>Порт: :{server.port}</span>
              <span>•</span>
              <span>Заделен RAM: {server.allocatedRamGb} GB</span>
            </div>
          </div>
        </div>

        {/* Server Control Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNetworkModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>IP за Приятели</span>
          </button>

          <button
            onClick={() => onOpenFolder(server.id)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="Отвори папката на сървъра"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {isRunning ? (
            <button
              onClick={() => onStopServer(server.id)}
              disabled={isStopping}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-950/50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isStopping ? 'Спира...' : 'Спри'}</span>
            </button>
          ) : (
            <button
              onClick={() => onStartServer(server.id)}
              disabled={isStarting}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/60 glow-green"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStarting ? 'Стартира...' : 'Стартирай (1 Клик)'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'console'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" /> Конзола
          </button>

          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'plugins'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-pink-400" /> Плъгини & Ресурс Пакети
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Настройки на Света
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'players'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Играчи & Whitelist ({players.length})
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'resources'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Ресурси & Хардуер
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backups'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> Резервни копия
          </button>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning
                ? 'bg-emerald-500 animate-pulse'
                : isStarting
                ? 'bg-amber-400 animate-ping'
                : 'bg-slate-600'
            }`}
          />
          <span className="font-semibold text-slate-300">
            {isRunning ? 'Сървърът е Онлайн' : isStarting ? 'Стартира се...' : 'Сървърът е Офлайн'}
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
          <div className="h-full bg-slate-900/60 rounded-2xl border border-slate-800 p-6 overflow-y-auto space-y-8">
            {/* Section 1: Online Players */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Онлайн играчи в момента ({players.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Играчи, които са свързани и играят в сървъра точно сега
                  </p>
                </div>
              </div>

              {players.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
                  Няма свързани играчи в момента. Когато някой влезе в играта, ще се появи тук с опция за OP и Kick.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players.map((player) => (
                    <div
                      key={player}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-sm"
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
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-xs flex items-center gap-1 font-semibold"
                        >
                          <Crown className="w-3.5 h-3.5" /> OP
                        </button>
                        <button
                          onClick={() => handleKickPlayer(player)}
                          title="Изритай играч (Kick)"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs flex items-center gap-1 font-semibold"
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
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
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
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isWhitelistEnabled ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Whitelist: Активен
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Whitelist: Изключен
                      </>
                    )}
                  </span>

                  <button
                    onClick={handleToggleWhitelist}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isWhitelistEnabled
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-500'
                    }`}
                  >
                    {isWhitelistEnabled ? 'Изключи Whitelist' : 'Включи Whitelist'}
                  </button>
                </div>
              </div>

              {/* Status information banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                  isWhitelistEnabled
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                {isWhitelistEnabled ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
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
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim() || whitelistLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добави в Whitelist</span>
                </button>
              </form>

              {/* Whitelisted Players List */}
              {whitelist.length === 0 ? (
                <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
                  Няма добавени играчи в белия списък. Напиши името на приятел по-горе и натисни "Добави в Whitelist".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whitelist.map((entry) => (
                    <div
                      key={entry.name}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-sm"
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
                          <span className="text-[10px] text-emerald-400 font-medium">Разрешен</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveWhitelist(entry.name)}
                        disabled={whitelistLoading}
                        title="Премахни от Whitelist"
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs flex items-center gap-1 font-semibold"
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

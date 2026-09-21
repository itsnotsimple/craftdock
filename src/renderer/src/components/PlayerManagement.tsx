import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Crown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Plus,
  Trash2,
  Users,
  Search,
  UserX,
  Radio,
  Wifi,
  Gavel,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  Eye,
  Calendar,
  Heart,
  Sparkles,
  Sword,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { ServerProfile, OpEntry, BanEntry, BanIpEntry, PlayerArchiveEntry } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PlayerAvatar } from './PlayerAvatar';

const PlayerInventoryModal = React.lazy(() =>
  import('./PlayerInventoryModal').then((m) => ({ default: m.PlayerInventoryModal }))
);

interface PlayerManagementProps {
  server: ServerProfile;
  onlinePlayers: string[];
  onSendCommand: (command: string) => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  server,
  onlinePlayers,
  onSendCommand,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm } = useDialog();

  const [activeSubTab, setActiveSubTab] = useState<'archive' | 'ops' | 'whitelist' | 'bans' | 'bannedIps'>('archive');
  const [archive, setArchive] = useState<PlayerArchiveEntry[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedPlayerForInventory, setSelectedPlayerForInventory] = useState<{ uuid: string; name: string } | null>(null);
  const [ops, setOps] = useState<OpEntry[]>([]);
  const [whitelist, setWhitelist] = useState<Array<{ name: string; uuid?: string }>>([]);
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState<boolean>(false);
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [bannedIps, setBannedIps] = useState<BanIpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlts, setShowAlts] = useState(false);

  // Group duplicate players by username to separate primary from secondary/alt accounts
  const { primaryPlayers, secondaryPlayers, hasDuplicates } = useMemo(() => {
    const groups = new Map<string, PlayerArchiveEntry[]>();
    for (const p of archive) {
      const key = p.name.toLowerCase();
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);
    }

    const primary: PlayerArchiveEntry[] = [];
    const secondary: PlayerArchiveEntry[] = [];
    let dupsFound = false;

    groups.forEach((players) => {
      if (players.length === 1) {
        primary.push(players[0]);
      } else {
        dupsFound = true;
        // Prioritize:
        // 1. Currently online
        // 2. Official Premium Mojang account (accountType === 'online')
        // 3. Highest playtime ticks
        // 4. Most recent activity
        const sorted = [...players].sort((a, b) => {
          const aOnline = onlinePlayers.some((on) => on.toLowerCase() === a.name.toLowerCase());
          const bOnline = onlinePlayers.some((on) => on.toLowerCase() === b.name.toLowerCase());
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;

          if (a.accountType === 'online' && b.accountType !== 'online') return -1;
          if (a.accountType !== 'online' && b.accountType === 'online') return 1;

          if ((b.playTimeTicks || 0) !== (a.playTimeTicks || 0)) {
            return (b.playTimeTicks || 0) - (a.playTimeTicks || 0);
          }

          return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
        });

        primary.push(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
          secondary.push(sorted[i]);
        }
      }
    });

    return { primaryPlayers: primary, secondaryPlayers: secondary, hasDuplicates: dupsFound };
  }, [archive, onlinePlayers]);

  // Form states
  const [newOpName, setNewOpName] = useState('');
  const [newOpLevel, setNewOpLevel] = useState<number>(4);

  const [newWhitelistName, setNewWhitelistName] = useState('');

  const [newBanName, setNewBanName] = useState('');
  const [newBanReason, setNewBanReason] = useState('');

  const [newBanIp, setNewBanIp] = useState('');
  const [newBanIpReason, setNewBanIpReason] = useState('');

  const loadData = useCallback(async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const [opsList, wlList, props, bansList, ipsList, archiveList] = await Promise.all([
        api.getServerOps ? api.getServerOps(server.id) : Promise.resolve([]),
        api.getWhitelist ? api.getWhitelist(server.id) : Promise.resolve([]),
        api.getServerProperties ? api.getServerProperties(server.id) : Promise.resolve(null),
        api.getServerBans ? api.getServerBans(server.id) : Promise.resolve([]),
        api.getServerBannedIps ? api.getServerBannedIps(server.id) : Promise.resolve([]),
        api.getServerPlayersArchive ? api.getServerPlayersArchive(server.id, onlinePlayers) : Promise.resolve([]),
      ]);
      setOps(Array.isArray(opsList) ? opsList : []);
      setWhitelist(Array.isArray(wlList) ? wlList : []);
      setIsWhitelistEnabled(props?.whiteList ?? false);
      setBans(Array.isArray(bansList) ? bansList : []);
      setBannedIps(Array.isArray(ipsList) ? ipsList : []);
      setArchive(Array.isArray(archiveList) ? archiveList : []);
    } catch (err) {
      console.error('Failed to load player management data:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id, onlinePlayers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Operator Actions
  const handleAddOp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newOpName.trim();
    if (!name) return;

    const api = (window as any).api;
    if (api?.addOp) {
      await api.addOp(server.id, name, newOpLevel);
      setNewOpName('');
      loadData();
    }
  };

  const handleRemoveOp = async (name: string) => {
    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Премахване на оператор' : 'Remove Operator',
      message: language === 'bg'
        ? `Сигурни ли сте, че искате да отнемете операторските права (OP) на "${name}"?`
        : `Are you sure you want to revoke operator status for "${name}"?`,
      confirmText: language === 'bg' ? 'Премахни OP' : 'Remove OP',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (!confirmed) return;

    const api = (window as any).api;
    if (api?.removeOp) {
      await api.removeOp(server.id, name);
      loadData();
    }
  };

  // Whitelist Actions
  const handleAddWhitelist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newWhitelistName.trim();
    if (!name) return;

    const api = (window as any).api;
    if (api?.addToWhitelist) {
      await api.addToWhitelist(server.id, name);
      setNewWhitelistName('');
      loadData();
    }
  };

  const handleRemoveWhitelist = async (name: string) => {
    const api = (window as any).api;
    if (api?.removeFromWhitelist) {
      await api.removeFromWhitelist(server.id, name);
      loadData();
    }
  };

  const handleToggleWhitelist = async () => {
    const api = (window as any).api;
    if (!api) return;
    const newState = !isWhitelistEnabled;
    try {
      await api.saveServerProperties(server.id, { whiteList: newState });
      setIsWhitelistEnabled(newState);
      if (server.status === 'running') {
        onSendCommand(`whitelist ${newState ? 'on' : 'off'}`);
        onSendCommand('whitelist reload');
      }
    } catch (e) {
      console.error('Failed to toggle whitelist:', e);
    }
  };

  // Ban Actions
  const handleAddBan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newBanName.trim();
    if (!name) return;

    const api = (window as any).api;
    if (api?.banPlayer) {
      await api.banPlayer(server.id, name, newBanReason.trim() || 'Banned by operator');
      setNewBanName('');
      setNewBanReason('');
      loadData();
    }
  };

  const handlePardonPlayer = async (name: string) => {
    const api = (window as any).api;
    if (api?.pardonPlayer) {
      await api.pardonPlayer(server.id, name);
      loadData();
    }
  };

  // IP Ban Actions
  const handleAddBanIp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ip = newBanIp.trim();
    if (!ip) return;

    const api = (window as any).api;
    if (api?.banIp) {
      await api.banIp(server.id, ip, newBanIpReason.trim() || 'Banned by operator');
      setNewBanIp('');
      setNewBanIpReason('');
      loadData();
    }
  };

  const handlePardonIp = async (ip: string) => {
    const api = (window as any).api;
    if (api?.pardonIp) {
      await api.pardonIp(server.id, ip);
      loadData();
    }
  };

  // Online Player quick actions
  const isPlayerOp = (name: string, uuid?: string) =>
    ops.some((o) => (o.uuid && uuid ? o.uuid.toLowerCase() === uuid.toLowerCase() : o.name.toLowerCase() === name.toLowerCase()));

  const handleQuickOpToggle = async (playerName: string, playerUuid?: string, currentOpState?: boolean) => {
    const api = (window as any).api;
    const isCurrentlyOp = currentOpState !== undefined ? currentOpState : isPlayerOp(playerName, playerUuid);
    if (isCurrentlyOp) {
      await api.removeOp(server.id, playerName, playerUuid);
    } else {
      await api.addOp(server.id, playerName, 4, playerUuid);
    }
    loadData();
  };

  const handleQuickKick = (playerName: string) => {
    onSendCommand(`kick ${playerName} Kicked by server manager`);
  };

  const handleQuickBan = async (playerName: string, playerUuid?: string) => {
    const confirmed = await showConfirm({
      title: language === 'bg' ? `Бан на ${playerName}` : `Ban ${playerName}`,
      message: language === 'bg'
        ? `Сигурни ли сте, че искате да баннете "${playerName}" от сървъра?`
        : `Are you sure you want to permanently ban "${playerName}" from the server?`,
      confirmText: language === 'bg' ? 'Банни играча' : 'Ban Player',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (!confirmed) return;

    const api = (window as any).api;
    if (api?.banPlayer) {
      await api.banPlayer(server.id, playerName, 'Banned by server operator', playerUuid);
      loadData();
    }
  };

  return (
    <div className={`h-full rounded-2xl p-6 overflow-y-auto space-y-6 ${
      theme === 'light' ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel'
    }`}>
      {/* Online Players Strip */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              theme === 'light' ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {language === 'bg' ? 'В Момента на Линия' : 'Currently Online'} ({onlinePlayers.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            {server.status === 'running'
              ? (language === 'bg' ? 'Сървърът е активен' : 'Server active')
              : (language === 'bg' ? 'Сървърът е спрян' : 'Server stopped')}
          </span>
        </div>

        {onlinePlayers.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            {language === 'bg' ? 'Няма свързани играчи в момента.' : 'No players currently online.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {onlinePlayers.map((player) => {
              const matchedArchive = archive.find(
                (a) => a.name.toLowerCase() === player.toLowerCase() && a.isOnline
              ) || archive.find((a) => a.name.toLowerCase() === player.toLowerCase());
              const op = isPlayerOp(player, matchedArchive?.uuid);
              return (
                <div
                  key={player}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    theme === 'light'
                      ? 'bg-white border-slate-200/90 shadow-2xs'
                      : 'bg-black/20 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar name={player} size={24} className="w-5 h-5 rounded-md" />
                    <div className={`w-2 h-2 rounded-full ${op ? 'bg-amber-400' : 'bg-emerald-400'} shrink-0`} />
                    <span className="font-bold truncate text-xs">{player}</span>
                    {op && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        OP
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerForInventory({
                          uuid: matchedArchive?.uuid || player,
                          name: player,
                        });
                      }}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title={language === 'bg' ? 'Преглед на Инвентар & Ender Chest' : 'Inspect Inventory & Ender Chest'}
                    >
                      <Package className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickOpToggle(player, matchedArchive?.uuid, op)}
                      className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        op
                          ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                          : 'hover:bg-white/10 text-slate-400 hover:text-amber-300'
                      }`}
                      title={op ? 'De-op' : 'Make OP'}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickKick(player)}
                      className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title={language === 'bg' ? 'Изгони (Kick)' : 'Kick player'}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickBan(player)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title={language === 'bg' ? 'Банни (Ban)' : 'Ban player'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-tab switcher */}
      <div className={`flex items-center justify-between gap-4 pb-3 border-b ${
        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('archive')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'archive'
                ? theme === 'light'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{language === 'bg' ? 'Архив на играчите & Инвентар' : 'Player Directory & Inventory'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{archive.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ops')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ops'
                ? theme === 'light'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                  : 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{language === 'bg' ? 'Оператори (OP)' : 'Operators'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{ops.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('whitelist')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'whitelist'
                ? theme === 'light'
                  ? 'bg-sky-50 text-sky-800 border border-sky-300 shadow-xs'
                  : 'bg-sky-500/15 text-sky-200 border border-sky-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span>{language === 'bg' ? 'Бял списък (Whitelist)' : 'Whitelist'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{whitelist.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bans')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'bans'
                ? theme === 'light'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-xs'
                  : 'bg-rose-500/15 text-rose-200 border border-rose-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>{language === 'bg' ? 'Баннати Играчи' : 'Banned Players'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{bans.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bannedIps')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'bannedIps'
                ? theme === 'light'
                  ? 'bg-purple-50 text-purple-800 border border-purple-300 shadow-xs'
                  : 'bg-purple-500/15 text-purple-200 border border-purple-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Wifi className="w-4 h-4 text-purple-400" />
            <span>{language === 'bg' ? 'Баннати IP адреси' : 'Banned IPs'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10">{bannedIps.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          className={`p-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer ${
            theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-400'
          }`}
          title={language === 'bg' ? 'Презареди списъците' : 'Reload lists'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SUB-TAB 0: PLAYER ARCHIVE & INVENTORY */}
      {activeSubTab === 'archive' && (
        <div className="space-y-4">
          {/* Header & Search Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder={
                  language === 'bg'
                    ? 'Търси играч по име или UUID...'
                    : 'Search players by name or UUID...'
                }
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border transition-colors outline-none ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-100 focus:border-emerald-400/50'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 ${
                theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.02] border-white/[0.06] text-slate-300'
              }`}>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{archive.length} {language === 'bg' ? 'играчи в архива' : 'total players'}</span>
              </span>
            </div>
          </div>

          {/* Duplicate Account Alert */}
          {hasDuplicates && (
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              theme === 'light'
                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}>
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-amber-300">
                  {language === 'bg'
                    ? 'Забелязани са профили с еднакво име, но различно UUID (Premium & Cracked)'
                    : 'Duplicate accounts detected with different UUIDs (Premium & Cracked)'}
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {language === 'bg'
                    ? 'В Minecraft инвентарят и изиграното време се записват строго по UUID (уникален код), а не по име. Когато влезете с лицензиран Minecraft (Premium), играта ползва официалното ви Mojang UUID. Ако влезете с кракнат лаунчър (Cracked), играта генерира нов офлайн UUID и започва от нулев инвентар. За да имате еднакъв инвентар навсякъде, влизайте с Premium акаунта си и от двата компютъра.'
                    : 'In Minecraft, inventory and playtime are linked strictly to player UUIDs. Connecting with an official Minecraft account (Premium) uses your Mojang UUID. Connecting with a cracked launcher (Cracked) generates a separate offline UUID and a fresh inventory. Use your Premium account on both machines to share the same inventory.'}
                </p>
              </div>
            </div>
          )}

          {/* Player Cards List */}
          {archive.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                {language === 'bg' ? 'Няма записани играчи' : 'No player history recorded yet'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {language === 'bg'
                  ? 'Когато играчи се присъединят към сървъра, техният прогрес, време в игра и инвентар ще се появят автоматично тук.'
                  : 'Player data, playtime, and inventory items will appear here automatically as players join your server.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Player Cards */}
              <div className="grid grid-cols-1 gap-3">
                {primaryPlayers
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                      p.uuid.toLowerCase().includes(archiveSearch.toLowerCase())
                  )
                  .map((player) => {
                    const isOnline = onlinePlayers.some(
                      (on) => on.toLowerCase() === player.name.toLowerCase()
                    );
                    const isOp = ops.some((o) =>
                      o.uuid ? o.uuid.toLowerCase() === player.uuid.toLowerCase() : o.name.toLowerCase() === player.name.toLowerCase()
                    );
                    const isWhitelisted = whitelist.some((w) =>
                      w.uuid ? w.uuid.toLowerCase() === player.uuid.toLowerCase() : w.name.toLowerCase() === player.name.toLowerCase()
                    );
                    const isBanned = bans.some((b) =>
                      b.uuid ? b.uuid.toLowerCase() === player.uuid.toLowerCase() : b.name.toLowerCase() === player.name.toLowerCase()
                    );

                    return (
                      <div
                        key={player.uuid}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          theme === 'light'
                            ? 'bg-slate-50/70 border-slate-200/90 hover:bg-slate-50 shadow-2xs'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Left: Avatar & Identity */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border-2 border-white/10 flex items-center justify-center shadow-xs">
                              <PlayerAvatar name={player.name} size={64} className="w-full h-full" />
                            </div>
                            {isOnline && (
                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs animate-pulse" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-100 truncate">
                                {player.name}
                              </span>
                              {player.accountType && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    player.accountType === 'online'
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                  title={
                                    player.accountType === 'online'
                                      ? (language === 'bg' ? 'Официален лицензиран Minecraft акаунт (Premium)' : 'Official Minecraft license (Premium)')
                                      : (language === 'bg' ? 'Кракнат лаунчър / Нелицензиран акаунт (Cracked)' : 'Offline/Cracked launcher account')
                                  }
                                >
                                  <span>{player.accountType === 'online' ? '💎' : '⚔️'}</span>
                                  <span>{player.accountType === 'online' ? 'Premium' : 'Cracked'}</span>
                                </span>
                              )}
                              {isOnline && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  {language === 'bg' ? 'Онлайн' : 'Online'}
                                </span>
                              )}
                              {isOp && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  OP
                                </span>
                              )}
                              {isWhitelisted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  {language === 'bg' ? 'Whitelist' : 'Whitelisted'}
                                </span>
                              )}
                              {isBanned && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  {language === 'bg' ? 'Баннат' : 'Banned'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[240px]">
                                {player.uuid}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Stats Highlight */}
                        <div className="flex items-center gap-6 text-xs shrink-0 flex-wrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              <span>{language === 'bg' ? 'Време в игра:' : 'Playtime:'}</span>
                            </div>
                            <div className="font-bold text-sky-300 text-sm">
                              {player.playTimeFormatted}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Sword className="w-3.5 h-3.5 text-rose-400" />
                              <span>{language === 'bg' ? 'Убити Mobs:' : 'Mob Kills:'}</span>
                            </div>
                            <div className="font-bold text-slate-200">
                              {player.mobKills}
                            </div>
                          </div>

                          {player.health !== undefined && (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Heart className="w-3.5 h-3.5 text-rose-500" />
                                <span>{language === 'bg' ? 'Живот / XP:' : 'Health / XP:'}</span>
                              </div>
                              <div className="font-bold text-slate-200">
                                {Math.round(player.health)} HP / Lvl {player.xpLevel ?? 0}
                              </div>
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{language === 'bg' ? 'Последно активен:' : 'Last Seen:'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(player.lastPlayed).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPlayerForInventory({ uuid: player.uuid, name: player.name })}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <Package className="w-4 h-4 text-emerald-400" />
                            <span>{language === 'bg' ? 'Инвентар & Ender Chest' : 'Inventory & Ender Chest'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickOpToggle(player.name, player.uuid, isOp)}
                            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                              isOp
                                ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 hover:bg-amber-500/25'
                                : 'border-white/[0.06] text-slate-400 hover:text-amber-300 hover:bg-white/[0.04]'
                            }`}
                            title={isOp ? 'De-op' : 'Make OP'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickBan(player.name, player.uuid)}
                            className="p-2 rounded-xl border border-white/[0.06] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title={language === 'bg' ? 'Банни играча' : 'Ban player'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Collapsible Secondary / Alt Accounts Section */}
              {secondaryPlayers.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAlts(!showAlts)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100/80 hover:bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-xs font-bold">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>
                        {language === 'bg'
                          ? `Вторични / Алтернативни акаунти (Alts) (${secondaryPlayers.length})`
                          : `Secondary / Alternative Accounts (Alts) (${secondaryPlayers.length})`}
                      </span>
                      <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">
                        {language === 'bg'
                          ? '— дублирани профили от друг клиент/компютър (0м игра)'
                          : '— duplicate profiles from another launcher/PC (0m playtime)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <span>{showAlts ? (language === 'bg' ? 'Скрий' : 'Hide') : (language === 'bg' ? 'Покажи' : 'Show')}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAlts ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {showAlts && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        theme === 'light'
                          ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                      }`}>
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed">
                          {language === 'bg'
                            ? 'Тези профили имат същото име като главния играч, но са с различно UUID (напр. от кракнат лаунчър или от друг компютър). Организирани са тук, за да бъде главното табло чисто и подредено.'
                            : 'These accounts share the same name as the primary player but have a different UUID. Grouped here to keep the main directory clean.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {secondaryPlayers
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
                              p.uuid.toLowerCase().includes(archiveSearch.toLowerCase())
                          )
                          .map((player) => {
                            const isOnline = onlinePlayers.some(
                              (on) => on.toLowerCase() === player.name.toLowerCase()
                            );
                            const isOp = ops.some((o) =>
                              o.uuid ? o.uuid.toLowerCase() === player.uuid.toLowerCase() : o.name.toLowerCase() === player.name.toLowerCase()
                            );
                            const isWhitelisted = whitelist.some((w) =>
                              w.uuid ? w.uuid.toLowerCase() === player.uuid.toLowerCase() : w.name.toLowerCase() === player.name.toLowerCase()
                            );
                            const isBanned = bans.some((b) =>
                              b.uuid ? b.uuid.toLowerCase() === player.uuid.toLowerCase() : b.name.toLowerCase() === player.name.toLowerCase()
                            );

                            return (
                              <div
                                key={player.uuid}
                                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                  theme === 'light'
                                    ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                                    : 'bg-amber-950/10 border-amber-500/20 hover:bg-amber-950/20'
                                }`}
                              >
                                {/* Left: Avatar & Identity */}
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border-2 border-amber-500/30 flex items-center justify-center shadow-xs">
                                      <PlayerAvatar name={player.name} size={64} className="w-full h-full" />
                                    </div>
                                    {isOnline && (
                                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs animate-pulse" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-slate-100 truncate">
                                        {player.name}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{language === 'bg' ? 'Вторичен профил (Alt)' : 'Alt Account'}</span>
                                      </span>
                                      {player.accountType && (
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                            player.accountType === 'online'
                                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                          }`}
                                        >
                                          <span>{player.accountType === 'online' ? '💎' : '⚔️'}</span>
                                          <span>{player.accountType === 'online' ? 'Premium' : 'Cracked'}</span>
                                        </span>
                                      )}
                                      {isOp && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                          <Crown className="w-3 h-3" />
                                          OP
                                        </span>
                                      )}
                                      {isWhitelisted && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                          <Shield className="w-3 h-3" />
                                          {language === 'bg' ? 'Whitelist' : 'Whitelisted'}
                                        </span>
                                      )}
                                      {isBanned && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                          <Ban className="w-3 h-3" />
                                          {language === 'bg' ? 'Баннат' : 'Banned'}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="font-mono text-[11px] text-slate-400 truncate max-w-[240px]">
                                        {player.uuid}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Middle: Stats Highlight */}
                                <div className="flex items-center gap-6 text-xs shrink-0 flex-wrap">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                                      <span>{language === 'bg' ? 'Време в игра:' : 'Playtime:'}</span>
                                    </div>
                                    <div className="font-bold text-sky-300 text-sm">
                                      {player.playTimeFormatted}
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Sword className="w-3.5 h-3.5 text-rose-400" />
                                      <span>{language === 'bg' ? 'Убити Mobs:' : 'Mob Kills:'}</span>
                                    </div>
                                    <div className="font-bold text-slate-200">
                                      {player.mobKills}
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{language === 'bg' ? 'Последно активен:' : 'Last Seen:'}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      {new Date(player.lastPlayed).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlayerForInventory({ uuid: player.uuid, name: player.name })}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                                  >
                                    <Package className="w-4 h-4 text-emerald-400" />
                                    <span>{language === 'bg' ? 'Инвентар & Ender Chest' : 'Inventory & Ender Chest'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickOpToggle(player.name, player.uuid, isOp)}
                                    className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                                      isOp
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-400/30 hover:bg-amber-500/25'
                                        : 'border-white/[0.06] text-slate-400 hover:text-amber-300 hover:bg-white/[0.04]'
                                    }`}
                                    title={isOp ? 'De-op' : 'Make OP'}
                                  >
                                    <Crown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickBan(player.name, player.uuid)}
                                    className="p-2 rounded-xl border border-white/[0.06] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title={language === 'bg' ? 'Банни играча' : 'Ban player'}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: OPERATORS */}
      {activeSubTab === 'ops' && (
        <div className="space-y-4">
          {/* Add OP Form */}
          <form onSubmit={handleAddOp} className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              value={newOpName}
              onChange={(e) => setNewOpName(e.target.value)}
              placeholder={language === 'bg' ? 'Minecraft потребителско име...' : 'Minecraft username...'}
              className={`flex-1 min-w-[200px] px-3.5 py-2 rounded-xl text-xs border outline-none font-mono transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 focus:border-amber-500 text-slate-900'
                  : 'bg-black/20 border-white/[0.08] focus:border-amber-400 text-white'
              }`}
            />

            <select
              value={newOpLevel}
              onChange={(e) => setNewOpLevel(Number(e.target.value))}
              className={`px-3 py-2 rounded-xl text-xs border outline-none cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-900 border-white/[0.08] text-slate-200'
              }`}
            >
              <option value={4}>{language === 'bg' ? 'Ниво 4 (Пълен достъп / Админ)' : 'Level 4 (Full Admin)'}</option>
              <option value={3}>{language === 'bg' ? 'Ниво 3 (Модератор / OP)' : 'Level 3 (OP / Mod)'}</option>
              <option value={2}>{language === 'bg' ? 'Ниво 2 (Command Blocks)' : 'Level 2 (Command Blocks)'}</option>
              <option value={1}>{language === 'bg' ? 'Ниво 1 (Spawn protection bypass)' : 'Level 1 (Spawn bypass)'}</option>
            </select>

            <button
              type="submit"
              disabled={!newOpName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bg' ? 'Направи OP' : 'Add OP'}</span>
            </button>
          </form>

          {/* OPs List */}
          {ops.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <p className="text-xs text-slate-400">
                {language === 'bg'
                  ? 'Няма оператори в ops.json. Добавете оператор от формата горе.'
                  : 'No operators found in ops.json. Add one using the form above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ops.map((op) => (
                <div
                  key={op.name}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar name={op.name} size={32} className="w-8 h-8 rounded-md shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate flex items-center gap-2">
                        <span>{op.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {language === 'bg' ? `Ниво ${op.level}` : `Level ${op.level}`}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        UUID: {op.uuid || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOp(op.name)}
                    className="p-2 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title={language === 'bg' ? 'Премахни OP' : 'Revoke OP'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: WHITELIST */}
      {activeSubTab === 'whitelist' && (
        <div className="space-y-4">
          {/* Whitelist Toggle & Status */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isWhitelistEnabled ? (
                <ShieldCheck className="w-5 h-5 text-sky-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
              <span className="text-xs font-bold">
                {isWhitelistEnabled
                  ? (language === 'bg' ? 'Белият списък е ВКЛЮЧЕН (Само одобрени влизат)' : 'Whitelist is ACTIVE (Only listed players can join)')
                  : (language === 'bg' ? 'Белият списък е ИЗКЛЮЧЕН (Всеки може да влезе)' : 'Whitelist is DISABLED (Anyone can join)')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggleWhitelist}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isWhitelistEnabled
                  ? theme === 'light'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-sky-500 hover:bg-sky-400 text-white border-sky-400/40 shadow-xs'
              }`}
            >
              {isWhitelistEnabled
                ? (language === 'bg' ? 'Изключи Whitelist' : 'Disable Whitelist')
                : (language === 'bg' ? 'Включи Whitelist' : 'Enable Whitelist')}
            </button>
          </div>

          {/* Add to Whitelist Form */}
          <form onSubmit={handleAddWhitelist} className="flex gap-2">
            <input
              type="text"
              value={newWhitelistName}
              onChange={(e) => setNewWhitelistName(e.target.value)}
              placeholder={language === 'bg' ? 'Име на играч за белия списък...' : 'Player username for whitelist...'}
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs border outline-none font-mono transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 focus:border-sky-500 text-slate-900'
                  : 'bg-black/20 border-white/[0.08] focus:border-sky-400 text-white'
              }`}
            />
            <button
              type="submit"
              disabled={!newWhitelistName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bg' ? 'Добави' : 'Add to Whitelist'}</span>
            </button>
          </form>

          {/* Whitelist List */}
          {whitelist.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <p className="text-xs text-slate-400">
                {language === 'bg' ? 'Няма играчи в белия списък.' : 'No players in whitelist.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {whitelist.map((entry) => (
                <div
                  key={entry.name}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar name={entry.name} size={32} className="w-7 h-7 rounded-md shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{entry.name}</div>
                      <div className="text-[10px] text-sky-400 font-semibold">{language === 'bg' ? 'Разрешен' : 'Allowed'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveWhitelist(entry.name)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title={language === 'bg' ? 'Премахни от белия списък' : 'Remove from whitelist'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: BANNED PLAYERS */}
      {activeSubTab === 'bans' && (
        <div className="space-y-4">
          {/* Add Ban Form */}
          <form onSubmit={handleAddBan} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4">
              <input
                type="text"
                value={newBanName}
                onChange={(e) => setNewBanName(e.target.value)}
                placeholder={language === 'bg' ? 'Играч за банване...' : 'Player name...'}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none font-mono transition-all ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 focus:border-rose-500 text-slate-900'
                    : 'bg-black/20 border-white/[0.08] focus:border-rose-400 text-white'
                }`}
              />
            </div>
            <div className="sm:col-span-6">
              <input
                type="text"
                value={newBanReason}
                onChange={(e) => setNewBanReason(e.target.value)}
                placeholder={language === 'bg' ? 'Причина за бана (опционално)...' : 'Reason for ban (optional)...'}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none transition-all ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 focus:border-rose-500 text-slate-900'
                    : 'bg-black/20 border-white/[0.08] focus:border-rose-400 text-white'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!newBanName.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{language === 'bg' ? 'Банни' : 'Ban'}</span>
              </button>
            </div>
          </form>

          {/* Bans List */}
          {bans.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <p className="text-xs text-slate-400">
                {language === 'bg' ? 'Няма баннати играчи в момента.' : 'No banned players currently.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bans.map((ban) => (
                <div
                  key={ban.name}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <PlayerAvatar name={ban.name} size={32} className="w-8 h-8 rounded-md" />
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-rose-600 text-white">
                        <Ban className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate flex items-center gap-2">
                        <span>{ban.name}</span>
                        <span className="text-[10px] text-slate-400">({ban.source})</span>
                      </div>
                      <div className="text-[11px] text-rose-400/90 truncate mt-0.5">
                        {ban.reason}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {language === 'bg' ? 'Дата:' : 'Date:'} {ban.created}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePardonPlayer(ban.name)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {language === 'bg' ? 'Премахни бан (Pardon)' : 'Pardon'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: BANNED IPS */}
      {activeSubTab === 'bannedIps' && (
        <div className="space-y-4">
          {/* Add IP Ban Form */}
          <form onSubmit={handleAddBanIp} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4">
              <input
                type="text"
                value={newBanIp}
                onChange={(e) => setNewBanIp(e.target.value)}
                placeholder="192.168.1.1..."
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none font-mono transition-all ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 focus:border-purple-500 text-slate-900'
                    : 'bg-black/20 border-white/[0.08] focus:border-purple-400 text-white'
                }`}
              />
            </div>
            <div className="sm:col-span-6">
              <input
                type="text"
                value={newBanIpReason}
                onChange={(e) => setNewBanIpReason(e.target.value)}
                placeholder={language === 'bg' ? 'Причина за IP бана...' : 'Reason for IP ban...'}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-none transition-all ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 focus:border-purple-500 text-slate-900'
                    : 'bg-black/20 border-white/[0.08] focus:border-purple-400 text-white'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!newBanIp.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{language === 'bg' ? 'Банни IP' : 'Ban IP'}</span>
              </button>
            </div>
          </form>

          {/* Banned IPs List */}
          {bannedIps.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <p className="text-xs text-slate-400">
                {language === 'bg' ? 'Няма баннати IP адреси.' : 'No banned IP addresses.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bannedIps.map((b) => (
                <div
                  key={b.ip}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-xs truncate">
                        {b.ip}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {b.reason}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {b.created}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePardonIp(b.ip)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {language === 'bg' ? 'Премахни бан' : 'Pardon IP'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Player Inventory & Ender Chest Modal */}
      {selectedPlayerForInventory && (
        <React.Suspense fallback={null}>
          <PlayerInventoryModal
            serverId={server.id}
            uuid={selectedPlayerForInventory.uuid}
            playerName={selectedPlayerForInventory.name}
            isOpen={!!selectedPlayerForInventory}
            onClose={() => setSelectedPlayerForInventory(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Clock, Trophy, Search, RefreshCw, Calendar, ArrowRight, UserCheck } from 'lucide-react';
import { PlayerAnalyticsData, PlayerProfileStats, PlayerSession } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { PlayerAvatar } from '../PlayerAvatar';

interface PlayerHistoryViewProps {
  serverId: string;
  isRunning: boolean;
}

export const PlayerHistoryView: React.FC<PlayerHistoryViewProps> = ({ serverId, isRunning }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [data, setData] = useState<PlayerAnalyticsData>({ players: {}, recentSessions: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const api = (window as any).api;
      if (!api) return;

      const [res, archive]: [PlayerAnalyticsData, any[]] = await Promise.all([
        api.getPlayerAnalytics ? api.getPlayerAnalytics(serverId) : Promise.resolve({ players: {}, recentSessions: [] }),
        api.getServerPlayersArchive ? api.getServerPlayersArchive(serverId) : Promise.resolve([]),
      ]);

      const mergedPlayers: Record<string, PlayerProfileStats> = { ...(res?.players || {}) };
      if (Array.isArray(archive)) {
        for (const p of archive) {
          const playtimeSec = Math.floor((p.playTimeTicks || 0) / 20);
          const existing = mergedPlayers[p.name];
          if (!existing || playtimeSec > (existing.totalPlaytimeSeconds || 0)) {
            mergedPlayers[p.name] = {
              player: p.name,
              totalPlaytimeSeconds: Math.max(playtimeSec, existing?.totalPlaytimeSeconds || 0),
              firstSeen: existing?.firstSeen || p.lastPlayed,
              lastSeen: p.lastPlayed || existing?.lastSeen,
              sessionCount: existing?.sessionCount || 1,
              avatarUrl: p.avatarUrl,
            };
          }
        }
      }

      setData({
        players: mergedPlayers,
        recentSessions: Array.isArray(res?.recentSessions) ? res.recentSessions : [],
      });
    } catch (err) {
      console.error('Failed to load player analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serverId, isRunning]);

  const formatPlaytime = (seconds: number) => {
    const unitM = language === 'bg' ? 'м' : 'm';
    const unitH = language === 'bg' ? 'ч' : 'h';
    if (seconds <= 0) return `0${unitM}`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}${unitH} ${mins}${unitM}`;
    }
    return `${mins}${unitM}`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  // Top players sorted by total playtime
  const leaderboard = useMemo(() => {
    const list = Object.values(data.players || {});
    return list.sort((a, b) => b.totalPlaytimeSeconds - a.totalPlaytimeSeconds);
  }, [data.players]);

  const filteredLeaderboard = useMemo(() => {
    if (!search.trim()) return leaderboard;
    const q = search.toLowerCase();
    return leaderboard.filter((p) => p.player.toLowerCase().includes(q));
  }, [leaderboard, search]);

  const totalHours = useMemo(() => {
    const sec = Object.values(data.players || {}).reduce((acc, p) => acc + p.totalPlaytimeSeconds, 0);
    return (sec / 3600).toFixed(1);
  }, [data.players]);

  const topPlayer = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            <Users className="w-4 h-4 text-cyan-500" />
            <span>{t('analytics.playersTitle')}</span>
          </h3>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('analytics.playersSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bg' ? 'Търси играч...' : 'Search player...'}
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-cyan-500'
                  : 'bg-slate-900/60 border-white/[0.1] text-white focus:border-cyan-400'
              }`}
            />
          </div>

          <button
            onClick={fetchData}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
            }`}
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="text-xs text-cyan-400 font-semibold mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {language === 'bg' ? 'Уникални Играчи' : 'Unique Players'}
          </div>
          <div className={`text-2xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {Object.keys(data.players || {}).length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg' ? 'Регистрирани в сървъра' : 'Joined this server'}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="text-xs text-purple-400 font-semibold mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {language === 'bg' ? 'Общо Игрово Време' : 'Total Playtime'}
          </div>
          <div className={`text-2xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {totalHours}{language === 'bg' ? 'ч' : 'h'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg' ? 'Прекарани от всички играчи' : 'Across all players'}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {language === 'bg' ? 'Топ Играч (MVP)' : 'Top Player (MVP)'}
          </div>
          <div className={`text-base font-bold truncate flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {topPlayer ? (
              <>
                <PlayerAvatar name={topPlayer.player} size={24} className="w-5 h-5 rounded-md shrink-0" />
                <span className="truncate">{topPlayer.player}</span>
              </>
            ) : (
              '---'
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {topPlayer ? formatPlaytime(topPlayer.totalPlaytimeSeconds) : (language === 'bg' ? 'Няма данни' : 'No data')}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="text-xs text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {language === 'bg' ? 'Записани Влизания' : 'Total Logins'}
          </div>
          <div className={`text-2xl font-black font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {data.recentSessions?.length || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {language === 'bg' ? 'Хронология на сесиите' : 'Session history'}
          </span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className={`p-4 rounded-2xl border ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-700' : 'text-slate-300'
          }`}>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            {language === 'bg' ? 'Класация по игрално време (Playtime Leaderboard)' : 'Playtime Leaderboard'}
          </h4>
          <span className="text-[11px] text-slate-500">
            {filteredLeaderboard.length} {language === 'bg' ? 'играчи' : 'players'}
          </span>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {search
              ? (language === 'bg' ? 'Няма открити играчи с това име.' : 'No players found with this name.')
              : (language === 'bg' ? 'Все още няма записана активност на играчи. Влезте в сървъра!' : 'No player activity recorded yet. Join the server!')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/[0.08] text-slate-400'
                }`}>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Играч' : 'Player'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Общо Време' : 'Total Playtime'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Брой Влизания' : 'Session Count'}</th>
                  <th className="py-2.5 px-3">{language === 'bg' ? 'Последно Видян' : 'Last Seen'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeaderboard.map((player, idx) => (
                  <tr
                    key={player.player}
                    className={`transition-colors ${
                      theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-400 font-bold">🥇 1</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300 font-bold">🥈 2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 font-bold">🥉 3</span>
                      ) : (
                        <span className="text-slate-500">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar name={player.player} size={32} className="w-6 h-6 rounded-md shrink-0" />
                        <span className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                          {player.player}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {formatPlaytime(player.totalPlaytimeSeconds)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {player.sessionCount} {language === 'bg' ? 'сесии' : 'sessions'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {formatDate(player.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sessions Table */}
      {data.recentSessions && data.recentSessions.length > 0 && (
        <div className={`p-4 rounded-2xl border ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
              {language === 'bg' ? 'Последни сесии на играчи' : 'Recent Player Sessions'}
            </h4>
            <span className="text-[11px] text-slate-500">
              {language === 'bg' ? 'Показват се последните 100 сесии' : 'Showing last 100 sessions'}
            </span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950/80 backdrop-blur-md">
                <tr className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                  theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/[0.08] text-slate-400'
                }`}>
                  <th className="py-2 px-3">{language === 'bg' ? 'Играч' : 'Player'}</th>
                  <th className="py-2 px-3">{language === 'bg' ? 'Влязъл' : 'Joined'}</th>
                  <th className="py-2 px-3">{language === 'bg' ? 'Излязъл' : 'Left'}</th>
                  <th className="py-2 px-3 text-right">{language === 'bg' ? 'Продължителност' : 'Duration'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.recentSessions.map((session, sIdx) => {
                  const isOnlineNow = !session.leftAt && isRunning;

                  return (
                    <tr
                      key={session.id || sIdx}
                      className={`transition-colors ${
                        theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar name={session.player} size={24} className="w-5 h-5 rounded shrink-0" />
                          <span className="font-semibold text-slate-200">{session.player}</span>
                          {isOnlineNow && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                              title={language === 'bg' ? 'Онлайн сега' : 'Online now'}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">{formatDate(session.joinedAt)}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {session.leftAt ? formatDate(session.leftAt) : (isOnlineNow ? (language === 'bg' ? 'Играе в момента' : 'Playing now') : '---')}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-right text-cyan-400">
                        {formatPlaytime(session.durationSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageSquare, Search, Trash2, RefreshCw, Filter, User, Send } from 'lucide-react';
import { ChatMessage } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialog } from '../../context/DialogContext';
import { PlayerAvatar } from '../PlayerAvatar';

interface ChatLogViewProps {
  serverId: string;
  isRunning: boolean;
  onSendCommand?: (command: string) => void;
}

export const ChatLogView: React.FC<ChatLogViewProps> = ({ serverId, isRunning, onSendCommand }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { showConfirm } = useDialog();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [sayInput, setSayInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      if ((window as any).api?.getChatHistory) {
        const history: ChatMessage[] = await (window as any).api.getChatHistory(serverId, 300);
        // getChatHistory returns latest first, let's reverse to show chronological top-to-bottom
        setMessages((history || []).reverse());
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [serverId]);

  // Real-time listener for incoming chat messages
  useEffect(() => {
    if (!(window as any).api?.onServerChatMessage) return;

    const unsubscribe = (window as any).api.onServerChatMessage((data: { serverId: string; message: ChatMessage }) => {
      if (data && data.serverId === serverId && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [serverId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Unique players list for filter dropdown
  const uniquePlayers = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.player) set.add(m.player);
    });
    return Array.from(set).sort();
  }, [messages]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchPlayer = selectedPlayer === 'all' || m.player.toLowerCase() === selectedPlayer.toLowerCase();
      const matchSearch =
        !search.trim() ||
        m.message.toLowerCase().includes(search.toLowerCase()) ||
        m.player.toLowerCase().includes(search.toLowerCase());
      return matchPlayer && matchSearch;
    });
  }, [messages, selectedPlayer, search]);

  const handleClearChat = async () => {
    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Изчистване на чат дневника' : 'Clear Chat Log',
      message:
        language === 'bg'
          ? 'Сигурен ли си, че искаш да изтриеш цялата история на чата за този сървър? Това действие е необратимо.'
          : 'Are you sure you want to permanently delete all chat history for this server? This action cannot be undone.',
      confirmText: language === 'bg' ? 'Изтрий дневника' : 'Clear Log',
      danger: true,
      icon: 'trash',
    });
    if (!confirmed) return;

    try {
      if ((window as any).api?.clearChatHistory) {
        await (window as any).api.clearChatHistory(serverId);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleSendSay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sayInput.trim() || !onSendCommand || !isRunning) return;
    onSendCommand(`say [${language === 'bg' ? 'Сървър' : 'Server'}] ${sayInput.trim()}`);
    setSayInput('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full max-h-[700px]">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>{t('analytics.chatTitle')}</span>
          </h3>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('analytics.chatSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Player filter dropdown */}
          <div className="relative">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-none cursor-pointer transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-purple-500'
                  : 'bg-slate-900/80 border-white/[0.1] text-white focus:border-purple-400'
              }`}
            >
              <option value="all">
                {language === 'bg' ? `Всички играчи (${uniquePlayers.length})` : `All players (${uniquePlayers.length})`}
              </option>
              {uniquePlayers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bg' ? 'Търси в съобщенията...' : 'Search messages...'}
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-purple-500'
                  : 'bg-slate-900/60 border-white/[0.1] text-white focus:border-purple-400'
              }`}
            />
          </div>

          <button
            onClick={fetchHistory}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
            }`}
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className={`p-2 rounded-xl border transition-all cursor-pointer text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed ${
              theme === 'light' ? 'border-slate-200 hover:border-rose-300' : 'border-white/[0.08] hover:border-rose-400/30'
            }`}
            title={language === 'bg' ? 'Изчисти дневника на чата' : 'Clear chat history'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-[350px] p-4 rounded-2xl border overflow-y-auto space-y-2.5 font-sans ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'glass-panel border-white/[0.06]'
        }`}
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 text-purple-400/30 mb-2" />
            <p className="font-semibold">
              {messages.length === 0
                ? (language === 'bg' ? 'Няма записани чат съобщения.' : 'No chat messages recorded.')
                : (language === 'bg' ? 'Няма резултати по избрания филтър.' : 'No messages match current filter.')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs text-center">
              {language === 'bg'
                ? 'Когато играчите пишат в чата на Minecraft сървъра, техните съобщения се появяват тук на живо в реално време!'
                : 'When players chat in-game on the Minecraft server, their messages will appear here in real time!'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                theme === 'light'
                  ? 'bg-white border border-slate-200/80 shadow-2xs hover:border-purple-200'
                  : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              {/* Player Avatar */}
              <PlayerAvatar
                name={msg.player}
                size={32}
                className="w-7 h-7 rounded-md shrink-0 mt-0.5 border border-white/[0.08]"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className={`font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    {msg.player}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {msg.timeFormatted || new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className={`text-xs break-words leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                  {msg.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Broadcast as Server / Say Input if running */}
      {isRunning && onSendCommand && (
        <form onSubmit={handleSendSay} className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={sayInput}
            onChange={(e) => setSayInput(e.target.value)}
            placeholder={
              language === 'bg'
                ? 'Изпрати съобщение в чата от името на сървъра (broadcast)...'
                : 'Broadcast a message to in-game chat as Server...'
            }
            className={`flex-1 px-4 py-2 rounded-xl text-xs border outline-none transition-all ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-900 focus:border-purple-500'
                : 'glass-card border-white/[0.1] text-white focus:border-purple-400'
            }`}
          />
          <button
            type="submit"
            disabled={!sayInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'bg' ? 'Изпрати' : 'Send'}</span>
          </button>
        </form>
      )}
    </div>
  );
};

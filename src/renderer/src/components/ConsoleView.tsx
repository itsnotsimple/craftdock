import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Trash2,
  Terminal as TerminalIcon,
  AlertTriangle,
  ArrowDown,
  Search,
  Download,
  Copy,
  Check,
  Lock,
  Unlock,
  X,
  MessageSquare,
} from 'lucide-react';
import { LogEntry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ConsoleViewProps {
  logs: LogEntry[];
  onSendCommand: (command: string) => void;
  onClearLogs: () => void;
  serverStatus: string;
  onOpenCrashAnalyzer?: () => void;
  crashDetected?: boolean;
}

type LogFilter = 'all' | 'errors' | 'warns' | 'chat';

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  logs,
  onSendCommand,
  onClearLogs,
  serverStatus,
  onOpenCrashAnalyzer,
  crashDetected,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draftCommand, setDraftCommand] = useState('');

  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRunning = serverStatus === 'running';

  // Filter logs based on category and search query
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filter === 'errors') {
      result = result.filter(
        (l) =>
          l.level === 'error' ||
          l.text.includes('ERROR') ||
          l.text.includes('Exception') ||
          l.text.includes('FATAL')
      );
    } else if (filter === 'warns') {
      result = result.filter((l) => l.text.includes('WARN'));
    } else if (filter === 'chat') {
      result = result.filter(
        (l) =>
          l.text.includes('<') && l.text.includes('>') ||
          l.text.includes('joined the game') ||
          l.text.includes('left the game')
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => l.text.toLowerCase().includes(q));
    }

    return result;
  }, [logs, filter, searchQuery]);

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      setIsScrolledUp(false);
    }
  };

  // Scroll on new logs only if auto-scroll is enabled
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [logs, autoScroll]);

  // Handle scroll events to detect if user has scrolled away from bottom
  const handleScroll = () => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 80);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !isRunning) return;

    onSendCommand(command);

    // Save to history (avoid consecutive duplicates)
    setCommandHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === command) return prev;
      return [...prev.slice(-40), command];
    });
    setHistoryIndex(-1);
    setDraftCommand('');
    setCommand('');

    if (autoScroll) {
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (commandHistory.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex === -1) {
        setDraftCommand(command);
        const newIdx = commandHistory.length - 1;
        setHistoryIndex(newIdx);
        setCommand(commandHistory[newIdx] || '');
      } else if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setCommand(commandHistory[newIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        if (historyIndex < commandHistory.length - 1) {
          const newIdx = historyIndex + 1;
          setHistoryIndex(newIdx);
          setCommand(commandHistory[newIdx] || '');
        } else {
          setHistoryIndex(-1);
          setCommand(draftCommand);
        }
      }
    }
  };

  const handleQuickCommand = (cmd: string) => {
    if (!isRunning) return;
    onSendCommand(cmd);
  };

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft-console-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (text: string, isError?: boolean) => {
    if (isError || text.includes('ERROR') || text.includes('Exception') || text.includes('FATAL')) {
      return 'text-rose-400';
    }
    if (text.includes('WARN')) {
      return 'text-amber-400';
    }
    if (text.includes('Done (') || text.includes('For help, type "help"')) {
      return 'text-emerald-400 font-bold';
    }
    if (text.includes('joined the game')) {
      return 'text-cyan-300 font-semibold';
    }
    if (text.includes('left the game')) {
      return 'text-amber-300 font-semibold';
    }
    return 'text-slate-300';
  };

  return (
    <div
      className={`flex flex-col h-full rounded-2xl overflow-hidden shadow-xl relative ${
        theme === 'light'
          ? 'bg-slate-950 border border-slate-300'
          : 'bg-slate-950/40 backdrop-blur-2xl border border-white/[0.08]'
      }`}
    >
      {/* Console Header */}
      <div
        className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 ${
          theme === 'light'
            ? 'bg-slate-900 border-b border-slate-800'
            : 'bg-white/[0.02] backdrop-blur-md border-b border-white/[0.06]'
        }`}
      >
        {/* Left Side: Title & Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 shrink-0">
            <TerminalIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-200 tracking-tight shrink-0">
            {t('console.liveConsole')}
          </span>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/[0.06] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'bg' ? 'Всички' : 'All'} ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('errors')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'errors'
                  ? 'bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {language === 'bg' ? 'Грешки' : 'Errors'}
            </button>
            <button
              type="button"
              onClick={() => setFilter('warns')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'warns'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {language === 'bg' ? 'Warn' : 'Warn'}
            </button>
            <button
              type="button"
              onClick={() => setFilter('chat')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filter === 'chat'
                  ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {language === 'bg' ? 'Чат' : 'Chat'}
            </button>
          </div>
        </div>

        {/* Right Side: Search, AutoScroll, Copy, Export, Clear */}
        <div className="flex items-center gap-1.5">
          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            title={language === 'bg' ? 'Търсене в конзолата' : 'Search console logs'}
            className={`p-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
              showSearch || searchQuery
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Auto Scroll Lock Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            title={
              autoScroll
                ? language === 'bg'
                  ? 'Авто-скрол: Включен (кликни за пауза)'
                  : 'Auto-scroll: Enabled (click to lock/pause)'
                : language === 'bg'
                ? 'Авто-скрол: Паузиран (кликни за включване)'
                : 'Auto-scroll: Paused (click to resume)'
            }
            className={`px-2 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border ${
              autoScroll
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            {autoScroll ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span className="hidden sm:inline">
              {autoScroll
                ? language === 'bg'
                  ? 'Авто-скрол'
                  : 'Auto-scroll'
                : language === 'bg'
                ? 'Пауза'
                : 'Locked'}
            </span>
          </button>

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopyLogs}
            title={language === 'bg' ? 'Копирай логовете' : 'Copy logs'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Logs */}
          <button
            type="button"
            onClick={handleExportLogs}
            title={language === 'bg' ? 'Свали логовете (.log)' : 'Download logs (.log)'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={onClearLogs}
            title={t('console.clearLogs')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar (Expandable) */}
      {showSearch && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-white/[0.06] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bg'
                ? 'Филтрирай логове по дума, играч или грешка...'
                : 'Filter logs by text, player, or error keyword...'
            }
            className="flex-1 bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredLogs.length} {language === 'bg' ? 'намерени' : 'matches'}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick Action Commands (Time, Weather, Save, Crash Analyzer) */}
      <div className="px-4 py-1.5 bg-black/30 border-b border-white/[0.04] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            {language === 'bg' ? 'Бързи:' : 'Quick:'}
          </span>
          <button
            type="button"
            onClick={() => handleQuickCommand('time set day')}
            disabled={!isRunning}
            className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-mono transition-all border border-amber-400/20 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickDay')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('weather clear')}
            disabled={!isRunning}
            className="px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-mono transition-all border border-cyan-400/20 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickClear')}
          </button>
          <button
            type="button"
            onClick={() => handleQuickCommand('save-all')}
            disabled={!isRunning}
            className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[10px] font-mono transition-all border border-emerald-400/20 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickSave')}
          </button>
        </div>

        {onOpenCrashAnalyzer && (
          <button
            type="button"
            onClick={onOpenCrashAnalyzer}
            className="px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-mono transition-all border border-rose-400/30 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{language === 'bg' ? 'Анализ на сривове' : 'Crash Analyzer'}</span>
          </button>
        )}
      </div>

      {/* Crash Detected Banner */}
      {crashDetected && onOpenCrashAnalyzer && (
        <div className="px-4 py-2 bg-rose-500/20 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-200 shrink-0">
          <span className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>{language === 'bg' ? 'Засечен неочакван срив на сървъра!' : 'Unexpected server crash detected!'}</span>
          </span>
          <button
            type="button"
            onClick={onOpenCrashAnalyzer}
            className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <span>{language === 'bg' ? '🔍 Анализирай срива' : '🔍 Diagnose Crash'}</span>
          </button>
        </div>
      )}

      {/* Logs Output Screen */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto font-mono-code text-xs space-y-1 select-text bg-black/40 backdrop-blur-sm relative"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <TerminalIcon className="w-8 h-8 opacity-40 text-emerald-400" />
            </div>
            <span className="text-slate-400">
              {searchQuery || filter !== 'all'
                ? language === 'bg'
                  ? 'Няма логове, отговарящи на избрания филтър.'
                  : 'No logs match the current filter.'
                : t('console.offlinePlaceholder')}
            </span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="leading-relaxed flex items-start gap-2.5 break-all hover:bg-white/[0.03] py-0.5 px-1.5 rounded-lg transition-colors"
            >
              <span className="text-slate-500 shrink-0 select-none font-mono text-[11px]">
                [{log.timestamp}]
              </span>
              <span className={`${getLogColor(log.text, log.level === 'error')} font-mono text-[11px]`}>
                {log.text}
              </span>
            </div>
          ))
        )}

        {/* Floating "Scroll to Bottom" Button when scrolled up */}
        {isScrolledUp && (
          <div className="sticky bottom-2 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/80 transition-all cursor-pointer animate-bounce"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{language === 'bg' ? 'Към най-новите' : 'Scroll to Bottom'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Console Input Bar */}
      <form
        onSubmit={handleSubmit}
        className={`p-3 border-t flex items-center gap-3 ${
          theme === 'light' ? 'bg-slate-900 border-slate-800' : 'bg-slate-950/60 border-white/[0.06]'
        }`}
      >
        <span className="text-emerald-400 font-mono pl-1 text-sm font-black select-none">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning
              ? language === 'bg'
                ? 'Въведи команда... (↑/↓ за история на командите)'
                : 'Enter command... (↑/↓ for command history)'
              : serverStatus === 'starting'
              ? t('console.inputStarting')
              : serverStatus === 'stopping'
              ? t('console.inputStopping')
              : t('console.inputOffline')
          }
          disabled={!isRunning}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!isRunning || !command.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 glow-green disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" /> {t('console.sendBtn')}
        </button>
      </form>
    </div>
  );
};

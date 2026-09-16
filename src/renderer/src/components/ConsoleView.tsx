import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { LogEntry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ConsoleViewProps {
  logs: LogEntry[];
  onSendCommand: (command: string) => void;
  onClearLogs: () => void;
  serverStatus: string;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  logs,
  onSendCommand,
  onClearLogs,
  serverStatus,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [command, setCommand] = useState('');
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isRunning = serverStatus === 'running';

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !isRunning) return;
    onSendCommand(command);
    setCommand('');
  };

  const handleQuickCommand = (cmd: string) => {
    if (!isRunning) return;
    onSendCommand(cmd);
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
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden shadow-xl relative ${
      theme === 'light'
        ? 'bg-slate-950 border border-slate-300'
        : 'bg-slate-950/40 backdrop-blur-2xl border border-white/[0.08]'
    }`}>
      {/* Console Header / Quick Commands */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${
        theme === 'light'
          ? 'bg-slate-900 border-b border-slate-800'
          : 'bg-white/[0.02] backdrop-blur-md border-b border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-400">
            <TerminalIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-200 tracking-tight">{t('console.liveConsole')}</span>
          <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06]">
            {t('console.linesCount', { count: logs.length })}
          </span>
        </div>

        {/* Quick Commands Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => handleQuickCommand('time set day')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-[11px] font-mono transition-all border border-amber-400/20 hover:border-amber-400/40 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickDay')}
          </button>
          <button
            onClick={() => handleQuickCommand('weather clear')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-[11px] font-mono transition-all border border-cyan-400/20 hover:border-cyan-400/40 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickClear')}
          </button>
          <button
            onClick={() => handleQuickCommand('save-all')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-[11px] font-mono transition-all border border-emerald-400/20 hover:border-emerald-400/40 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickSave')}
          </button>
          <button
            onClick={() => handleQuickCommand('tps')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-[11px] font-mono transition-all border border-purple-400/20 hover:border-purple-400/40 disabled:opacity-40 cursor-pointer"
          >
            {t('console.quickTps')}
          </button>
          <button
            onClick={onClearLogs}
            title={t('console.clearLogs')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Output Screen */}
      <div
        ref={logsContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono-code text-xs space-y-1 select-text bg-black/40 backdrop-blur-sm"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <TerminalIcon className="w-8 h-8 opacity-40 text-emerald-400" />
            </div>
            <span className="text-slate-400">{t('console.offlinePlaceholder')}</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2.5 break-all hover:bg-white/[0.03] py-0.5 px-1.5 rounded-lg transition-colors">
              <span className="text-slate-500 shrink-0 select-none font-mono text-[11px]">[{log.timestamp}]</span>
              <span className={`${getLogColor(log.text)} font-mono text-[11px]`}>{log.text}</span>
            </div>
          ))
        )}
      </div>

      {/* Console Input Bar */}
      <form onSubmit={handleSubmit} className={`p-3 border-t flex items-center gap-3 ${
        theme === 'light'
          ? 'bg-slate-900 border-slate-800'
          : 'bg-slate-950/60 border-white/[0.06]'
      }`}>
        <span className="text-emerald-400 font-mono pl-1 text-sm font-black select-none">❯</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={
            isRunning
              ? t('console.inputRunning')
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

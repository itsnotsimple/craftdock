import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { LogEntry } from '../types';

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
  const [command, setCommand] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isRunning = serverStatus === 'running';

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-full bg-[#070A10] rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl relative">
      {/* Console Header / Quick Commands */}
      <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <TerminalIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 tracking-tight">Конзола на живо</span>
          <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
            {logs.length} реда
          </span>
        </div>

        {/* Quick Commands Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => handleQuickCommand('time set day')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all border border-slate-700/60 disabled:opacity-40 cursor-pointer"
          >
            ☀️ Ден
          </button>
          <button
            onClick={() => handleQuickCommand('weather clear')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all border border-slate-700/60 disabled:opacity-40 cursor-pointer"
          >
            🌤️ Ясно
          </button>
          <button
            onClick={() => handleQuickCommand('save-all')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all border border-slate-700/60 disabled:opacity-40 cursor-pointer"
          >
            💾 Запис
          </button>
          <button
            onClick={() => handleQuickCommand('tps')}
            disabled={!isRunning}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono transition-all border border-slate-700/60 disabled:opacity-40 cursor-pointer"
          >
            ⚡ TPS
          </button>
          <button
            onClick={onClearLogs}
            title="Изчисти конзолата"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-all border border-transparent hover:border-rose-900/40 ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Output Screen */}
      <div className="flex-1 p-4 overflow-y-auto font-mono-code text-xs space-y-1 select-text bg-[#070A10]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <TerminalIcon className="w-8 h-8 opacity-40 text-cyan-400" />
            </div>
            <span className="text-slate-400">Сървърът е изключен. Натисни "Стартирай", за да видиш конзолата на живо.</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2.5 break-all hover:bg-white/[0.02] py-0.5 px-1 rounded transition-colors">
              <span className="text-slate-600 shrink-0 select-none font-mono text-[11px]">[{log.timestamp}]</span>
              <span className={`${getLogColor(log.text)} font-mono text-[11px]`}>{log.text}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Console Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center gap-3">
        <span className="text-cyan-400 font-mono pl-1 text-sm font-black select-none">❯</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={
            isRunning
              ? 'Въведи команда (напр. op krist, gamemode survival @a, say Здравейте!)...'
              : 'Сървърът трябва да е пуснат, за да приема команди'
          }
          disabled={!isRunning}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!isRunning || !command.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" /> Изпрати
        </button>
      </form>
    </div>
  );
};

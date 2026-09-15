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
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
      {/* Console Header / Quick Commands */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200">Сървърна Конзола на живо</span>
          <span className="text-[10px] text-slate-500 font-mono">({logs.length} реда)</span>
        </div>

        {/* Quick Commands */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleQuickCommand('time set day')}
            disabled={!isRunning}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all disabled:opacity-40"
          >
            ☀️ Ден
          </button>
          <button
            onClick={() => handleQuickCommand('weather clear')}
            disabled={!isRunning}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all disabled:opacity-40"
          >
            🌤️ Ясно
          </button>
          <button
            onClick={() => handleQuickCommand('save-all')}
            disabled={!isRunning}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-all disabled:opacity-40"
          >
            💾 Запис
          </button>
          <button
            onClick={onClearLogs}
            title="Изчисти конзолата"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Output Screen */}
      <div className="flex-1 p-4 overflow-y-auto font-mono-code text-xs space-y-1 select-text bg-slate-950">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
            <TerminalIcon className="w-8 h-8 opacity-30 text-emerald-400" />
            <span>Сървърът е изключен. Натисни "СТАРТИРАЙ", за да видиш логовете тук.</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2 break-all">
              <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={getLogColor(log.text)}>{log.text}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Console Input Bar */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-mono pl-2 text-sm font-bold">&gt;</span>
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
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isRunning || !command.trim()}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:bg-emerald-600"
        >
          <Send className="w-3.5 h-3.5" /> Изпрати
        </button>
      </form>
    </div>
  );
};

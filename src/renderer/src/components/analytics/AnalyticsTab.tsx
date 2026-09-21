import React, { useState } from 'react';
import { Activity, Timer, Users, MessageSquare, LineChart, Sparkles } from 'lucide-react';
import { ServerProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { PerformanceGraphs } from './PerformanceGraphs';
import { UptimeView } from './UptimeView';
import { PlayerHistoryView } from './PlayerHistoryView';
import { ChatLogView } from './ChatLogView';

interface AnalyticsTabProps {
  server: ServerProfile;
  isRunning: boolean;
  onSendCommand?: (command: string) => void;
  onOpenCrashAnalyzer?: (session?: any) => void;
}

type SubTab = 'performance' | 'uptime' | 'players' | 'chat';

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ server, isRunning, onSendCommand, onOpenCrashAnalyzer }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('performance');

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1">
      {/* Sub-Tabs Pill Navigation */}
      <div className={`p-1.5 rounded-2xl border flex items-center justify-between shrink-0 transition-colors ${
        theme === 'light' ? 'bg-slate-100/90 border-slate-200 shadow-2xs' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('performance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'performance'
                ? theme === 'light'
                  ? 'bg-white text-cyan-800 shadow-xs font-bold border border-cyan-200'
                  : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${activeSubTab === 'performance' ? 'text-cyan-400' : 'text-cyan-400/70'}`} />
            <span>{t('analytics.tabPerformance')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('uptime')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'uptime'
                ? theme === 'light'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold border border-emerald-200'
                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Timer className={`w-3.5 h-3.5 ${activeSubTab === 'uptime' ? 'text-emerald-400' : 'text-emerald-400/70'}`} />
            <span>{t('analytics.tabUptime')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('players')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'players'
                ? theme === 'light'
                  ? 'bg-white text-blue-800 shadow-xs font-bold border border-blue-200'
                  : 'bg-blue-500/15 text-blue-200 border border-blue-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeSubTab === 'players' ? 'text-blue-400' : 'text-blue-400/70'}`} />
            <span>{t('analytics.tabPlayers')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? theme === 'light'
                  ? 'bg-white text-purple-800 shadow-xs font-bold border border-purple-200'
                  : 'bg-purple-500/15 text-purple-200 border border-purple-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${activeSubTab === 'chat' ? 'text-purple-400' : 'text-purple-400/70'}`} />
            <span>{t('analytics.tabChat')}</span>
          </button>
        </div>

        {/* Live Indicator Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('analytics.collectingLive')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>{t('analytics.offlineRecorded')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Sub-Tab View Content */}
      <div className="flex-1 min-h-0">
        {activeSubTab === 'performance' && (
          <PerformanceGraphs serverId={server.id} isRunning={isRunning} />
        )}
        {activeSubTab === 'uptime' && (
          <UptimeView serverId={server.id} isRunning={isRunning} onOpenCrashAnalyzer={onOpenCrashAnalyzer} />
        )}
        {activeSubTab === 'players' && (
          <PlayerHistoryView serverId={server.id} isRunning={isRunning} />
        )}
        {activeSubTab === 'chat' && (
          <ChatLogView serverId={server.id} isRunning={isRunning} onSendCommand={onSendCommand} />
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { Server, PlusCircle, Terminal, HardDrive, Sparkles } from 'lucide-react';
import { ServerProfile, SystemInfo } from '../types';
import craftDockLogo from '../assets/icon.png';

interface SidebarProps {
  currentTab: 'library' | 'wizard' | 'dashboard';
  onTabChange: (tab: 'library' | 'wizard' | 'dashboard') => void;
  servers: ServerProfile[];
  activeServerId: string | null;
  systemInfo: SystemInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  servers,
  activeServerId,
  systemInfo,
}) => {
  const activeServer = servers.find((s) => s.id === activeServerId);
  const runningServersCount = servers.filter((s) => s.status === 'running' || s.status === 'starting').length;

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none h-screen">
      {/* App Header / Brand */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <img
            src={craftDockLogo}
            alt="CraftDock Logo"
            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-emerald-500/25 border border-emerald-500/30 shrink-0"
          />
          <div>
            <h1 className="font-extrabold text-base text-slate-100 tracking-tight flex items-center gap-1.5">
              CraftDock
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Личен Сървър Мениджър</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 space-y-1">
          <button
            onClick={() => onTabChange('library')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentTab === 'library'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4" />
              <span>Моите Сървъри</span>
            </div>
            {servers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold">
                {servers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('wizard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentTab === 'wizard'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Нов Сървър (Wizard)</span>
          </button>

          {activeServer && (
            <button
              onClick={() => onTabChange('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="truncate max-w-[120px]">{activeServer.name}</span>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeServer.status === 'running'
                    ? 'bg-emerald-500 animate-pulse'
                    : activeServer.status === 'starting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-600'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
        {runningServersCount > 0 && (
          <div className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{runningServersCount} активен сървър</span>
          </div>
        )}

        {systemInfo && (
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                RAM памет
              </span>
              <span className="font-semibold text-slate-200">
                {systemInfo.freeRamGb}GB / {systemInfo.totalRamGb}GB
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((systemInfo.totalRamGb - systemInfo.freeRamGb) / systemInfo.totalRamGb) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-emerald-400" /> 100% Твой Хардуер
          </span>
          <span>v1.2.0</span>
        </div>
      </div>
    </aside>
  );
};

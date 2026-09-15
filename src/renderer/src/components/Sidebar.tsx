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
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none h-screen backdrop-blur-xl relative z-10">
      {/* App Header / Brand */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3.5 bg-slate-950/40">
          <div className="relative group">
            <img
              src={craftDockLogo}
              alt="CraftDock Logo"
              className="w-11 h-11 rounded-2xl object-cover shadow-lg shadow-emerald-500/25 border border-emerald-500/40 shrink-0 transition-transform group-hover:scale-105"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base text-slate-100 tracking-tight">
                CraftDock
              </h1>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-mono tracking-wider shadow-xs">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Ultra Server Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 space-y-1.5">
          <button
            onClick={() => onTabChange('library')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden group cursor-pointer ${
              currentTab === 'library'
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
            }`}
          >
            {currentTab === 'library' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
            <div className="flex items-center gap-3">
              <Server className={`w-4 h-4 transition-transform group-hover:scale-110 ${currentTab === 'library' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>Моите Сървъри</span>
            </div>
            {servers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 font-bold font-mono border border-slate-800">
                {servers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('wizard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden group cursor-pointer ${
              currentTab === 'wizard'
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
            }`}
          >
            {currentTab === 'wizard' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
            <PlusCircle className={`w-4 h-4 text-emerald-400 transition-transform group-hover:scale-110`} />
            <span>Нов Сървър (Wizard)</span>
          </button>

          {activeServer && (
            <button
              onClick={() => onTabChange('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden group cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              {currentTab === 'dashboard' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-cyan-400 transition-transform group-hover:scale-110" />
                <span className="truncate max-w-[120px]">{activeServer.name}</span>
              </div>
              <div className="relative flex items-center justify-center">
                {activeServer.status === 'running' ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : activeServer.status === 'starting' ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        {runningServersCount > 0 && (
          <div className="flex items-center gap-2.5 text-xs px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">{runningServersCount} активен сървър</span>
          </div>
        )}

        {systemInfo && (
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Системна RAM
              </span>
              <span className="font-bold text-slate-200 font-mono">
                {systemInfo.freeRamGb}GB / {systemInfo.totalRamGb}GB
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full transition-all duration-500"
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

        <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-emerald-400" /> 100% Твой Хардуер
          </span>
          <span className="text-emerald-400 font-bold">v2.0.0 ULTRA</span>
        </div>
      </div>
    </aside>
  );
};

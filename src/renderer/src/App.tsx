import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './views/LibraryView';
import { WizardView } from './views/WizardView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { NetworkModal } from './components/NetworkModal';
import { ServerConflictModal } from './components/ServerConflictModal';
import { ServerProfile, SystemInfo, LogEntry, ServerSoftware, ServerStats } from './types';
import { useDialog } from './context/DialogContext';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm, showAlert } = useDialog();
  const [currentTab, setCurrentTab] = useState<'library' | 'wizard' | 'dashboard' | 'settings'>('library');
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Server Conflict Modal state (strictly enforces 1 active server at a time)
  const [conflictModal, setConflictModal] = useState<{
    runningServer: ServerProfile;
    targetServer: ServerProfile;
  } | null>(null);

  // Active server logs, stats & players mapped per serverId
  const [serverLogs, setServerLogs] = useState<Record<string, LogEntry[]>>({});
  const [serverStats, setServerStats] = useState<Record<string, ServerStats>>({});
  const [serverPlayers, setServerPlayers] = useState<Record<string, string[]>>({});

  // Network Modal state
  const [networkModalServer, setNetworkModalServer] = useState<ServerProfile | null>(null);

  // Creation & Download Progress state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    downloadedMb: number;
    totalMb: number;
    message: string;
  } | null>(null);

  // Update banner state
  const [updateInfo, setUpdateInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
    releaseName: string;
    releaseUrl: string;
  } | null>(null);

  // Helper to re-fetch servers and sync slots/status/players in real time
  const refreshServers = React.useCallback(async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const list = await api.getServers();
      if (Array.isArray(list)) {
        setServers(list);
        setActiveServerId((prev) => (!prev && list.length > 0 ? list[0].id : prev));
      }
    } catch (e) {
      console.error('Failed to refresh servers:', e);
    }
  }, []);

  // Sync server logs & stats when activeServerId changes
  useEffect(() => {
    if (!activeServerId) return;
    const api = (window as any).api;
    if (!api) return;

    if (!serverLogs[activeServerId] || serverLogs[activeServerId].length === 0) {
      api.getServerLogs?.(activeServerId).then((history: any[]) => {
        if (Array.isArray(history) && history.length > 0) {
          setServerLogs((prev) => ({
            ...prev,
            [activeServerId]: history,
          }));
        }
      });
    }

    api.getServerStats?.(activeServerId).then((st: any) => {
      if (st) {
        setServerStats((prev) => ({
          ...prev,
          [activeServerId]: st,
        }));
      }
    });
  }, [activeServerId]);

  // Prevent viewport shifting or scrolling under any circumstances
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize System Info, Server List & persistent IPC subscriptions
  useEffect(() => {
    const api = (window as any).api;
    if (!api) return;

    api.getSystemInfo().then((info: SystemInfo) => {
      setSystemInfo(info);
    }).catch(console.error);

    refreshServers();

    // Setup event subscriptions
    const unsubLog = api.onServerLog((data: { serverId: string; text: string; timestamp: string; isError?: boolean }) => {
      const sId = data.serverId;
      if (!sId) return;
      const entry: LogEntry = {
        id: `${Date.now()}_${Math.random()}`,
        timestamp: data.timestamp,
        level: data.isError ? 'error' : 'info',
        text: data.text,
      };
      setServerLogs((prev) => {
        const list = prev[sId] || [];
        return {
          ...prev,
          [sId]: [...list.slice(-400), entry],
        };
      });
    });

    const unsubStats = api.onServerStatsUpdated?.((stats: ServerStats) => {
      if (stats?.serverId) {
        setServerStats((prev) => ({
          ...prev,
          [stats.serverId]: stats,
        }));
      }
    });

    const unsubStatus = api.onServerStatusChanged((data: { serverId: string; status: any }) => {
      setServers((prev) =>
        prev.map((s) => (s.id === data.serverId ? { ...s, status: data.status, playerCount: data.status === 'stopped' ? 0 : s.playerCount } : s))
      );
      refreshServers();
    });

    const unsubPlayers = api.onServerPlayersChanged((data: { serverId: string; players: string[] }) => {
      if (data?.serverId) {
        setServerPlayers((prev) => ({
          ...prev,
          [data.serverId]: data.players,
        }));
      }
      setServers((prev) =>
        prev.map((s) => (s.id === data.serverId ? { ...s, playerCount: data.players.length } : s))
      );
    });

    const unsubDownload = api.onDownloadProgress((data: any) => {
      setDownloadProgress(data);
    });

    const unsubSystemInfo = api.onSystemInfoUpdate?.((info: SystemInfo) => {
      setSystemInfo(info);
    });

    const unsubServerProfile = api.onServerProfileUpdated?.((updatedServer: ServerProfile) => {
      setServers((prev) =>
        prev.map((s) => (s.id === updatedServer.id ? { ...s, ...updatedServer } : s))
      );
      refreshServers();
    });

    const unsubUpdateAvailable = api.onUpdateAvailable?.((data: any) => {
      setUpdateInfo(data);
    });

    return () => {
      if (unsubLog) unsubLog();
      if (unsubStats) unsubStats();
      if (unsubStatus) unsubStatus();
      if (unsubPlayers) unsubPlayers();
      if (unsubDownload) unsubDownload();
      if (unsubSystemInfo) unsubSystemInfo();
      if (unsubServerProfile) unsubServerProfile();
      if (unsubUpdateAvailable) unsubUpdateAvailable();
    };
  }, [refreshServers]);

  // Sync servers whenever the user switches tabs (especially back to Library)
  useEffect(() => {
    refreshServers();
  }, [currentTab, refreshServers]);

  // Auto-refresh poll every 2.5s so players and slots always reflect real time without restart
  useEffect(() => {
    const timer = setInterval(() => {
      refreshServers();
    }, 2500);
    return () => clearInterval(timer);
  }, [refreshServers]);

  const handleStartServer = async (id: string) => {
    const api = (window as any).api;
    if (!api) return;

    const targetServer = servers.find((s) => s.id === id);
    if (!targetServer) return;

    // Check if another server is already running or starting
    const alreadyActive = servers.find(
      (s) => s.id !== id && (s.status === 'running' || s.status === 'starting')
    );

    if (alreadyActive) {
      setConflictModal({
        runningServer: alreadyActive,
        targetServer,
      });
      return;
    }

    setActiveServerId(id);
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'starting' } : s))
    );
    await api.startServer(id);
    refreshServers();
  };

  const handleStopAndSwitch = async () => {
    if (!conflictModal) return;
    const { runningServer, targetServer } = conflictModal;
    setConflictModal(null);

    const api = (window as any).api;
    if (!api) return;

    // Stop currently running server
    setServers((prev) =>
      prev.map((s) => (s.id === runningServer.id ? { ...s, status: 'stopping' } : s))
    );
    await api.stopServer(runningServer.id);

    // Switch active server and start new one
    setActiveServerId(targetServer.id);
    setServers((prev) =>
      prev.map((s) => (s.id === targetServer.id ? { ...s, status: 'starting' } : s))
    );
    await api.startServer(targetServer.id);
    refreshServers();
  };

  const handleGoToRunning = () => {
    if (!conflictModal) return;
    const { runningServer } = conflictModal;
    setConflictModal(null);
    setActiveServerId(runningServer.id);
    setCurrentTab('dashboard');
  };

  const handleStopServer = async (id: string) => {
    const api = (window as any).api;
    if (!api) return;
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'stopping' } : s))
    );
    await api.stopServer(id);
    refreshServers();
  };

  const handleSendCommand = (command: string) => {
    const api = (window as any).api;
    if (!api || !activeServerId) return;
    api.sendCommand(activeServerId, command);
  };

  const handleOpenDashboard = (id: string) => {
    setActiveServerId(id);
    setCurrentTab('dashboard');
  };

  const handleOpenFolder = (id: string) => {
    (window as any).api?.openServerFolder(id);
  };

  const handleDeleteServer = async (id: string) => {
    const target = servers.find((s) => s.id === id);
    const serverName = target ? target.name : (target ? target.name : 'server');
    const confirmed = await showConfirm({
      title: t('dialogs.deleteServerTitle'),
      message: t('dialogs.deleteServerMsg', { name: serverName }),
      confirmText: t('dialogs.deleteServerBtn'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (confirmed) {
      await (window as any).api?.deleteServer(id, true);
      setServers((prev) => prev.filter((s) => s.id !== id));
      if (activeServerId === id) {
        setActiveServerId(null);
        setCurrentTab('library');
      }
    }
  };

  const handleCreateServer = async (data: {
    name: string;
    software: ServerSoftware;
    version: string;
    allocatedRamGb: number;
    storageQuotaGb?: number;
    port: number;
    motd: string;
    hardcore?: boolean;
    maxPlayers?: number;
    difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
    onlineMode?: boolean;
  }) => {
    const api = (window as any).api;
    if (!api) return;

    setIsCreating(true);
    setDownloadProgress({
      percent: 5,
      downloadedMb: 0,
      totalMb: 0,
      message: t('wizard.overlaySubtitle'),
    });

    try {
      const newServer = await api.createServer({
        ...data,
        acceptEula: true,
      });

      setServers((prev) => [...prev, newServer]);
      setActiveServerId(newServer.id);
      setCurrentTab('dashboard');
    } catch (err: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.createError'),
        message: err.message || t('dialogs.createError'),
        buttonText: t('common.understand'),
      });
    } finally {
      setIsCreating(false);
      setDownloadProgress(null);
    }
  };

  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];

  return (
    <div
      className={`flex flex-col h-full w-full fixed inset-0 transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-[#f4f6fb] text-slate-900 selection:bg-sky-500/20 selection:text-sky-800'
          : 'bg-[#060913] text-slate-100 selection:bg-sky-500/30 selection:text-sky-200'
      } overflow-hidden font-sans select-none`}
    >
      {/* Ambient Background Glows for authentic Glassmorphic Refraction */}
      {theme === 'light' ? (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-sky-200/40 blur-[140px] pointer-events-none z-0" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[160px] pointer-events-none z-0" />
          <div className="absolute top-[35%] right-[25%] w-[400px] h-[400px] rounded-full bg-indigo-100/40 blur-[130px] pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[130px] pointer-events-none z-0" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-blue-700/10 blur-[150px] pointer-events-none z-0" />
          <div className="absolute top-[35%] right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0" />
        </>
      )}

      {/* Full-width Draggable TitleBar Strip */}
      <TitleBar activeServer={activeServer} />

      {/* Update Available Banner */}
      {updateInfo && (
        <div className="relative z-20 shrink-0 bg-emerald-600/90 backdrop-blur-sm text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-semibold border-b border-emerald-500/50">
          <div className="flex items-center gap-2">
            <span className="text-emerald-100 font-bold">
              🎉 {t('updateBanner.title', { version: updateInfo.latestVersion })}
            </span>
            <span className="text-emerald-100/80 font-normal hidden sm:inline">
              {t('updateBanner.desc', { current: updateInfo.currentVersion })}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (window as any).api?.openExternal?.(updateInfo.releaseUrl)}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer border border-white/30 btn-bounce text-xs"
            >
              {t('updateBanner.download')}
            </button>
            <button
              type="button"
              onClick={() => setUpdateInfo(null)}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer text-xs"
            >
              {t('updateBanner.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* App Workspace: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          servers={servers}
          activeServerId={activeServerId}
          systemInfo={systemInfo}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentTab === 'library' && (
            <LibraryView
              servers={servers}
              onStartServer={handleStartServer}
              onStopServer={handleStopServer}
              onOpenDashboard={handleOpenDashboard}
              onOpenNetwork={(srv) => setNetworkModalServer(srv)}
              onOpenFolder={handleOpenFolder}
              onDeleteServer={handleDeleteServer}
              onNavigateToWizard={() => setCurrentTab('wizard')}
            />
          )}

          {currentTab === 'wizard' && (
            <WizardView
              systemInfo={systemInfo}
              onCancel={() => setCurrentTab('library')}
              onCreateServer={handleCreateServer}
              downloadProgress={downloadProgress}
              isCreating={isCreating}
            />
          )}

          {currentTab === 'dashboard' && activeServer && (
            <DashboardView
              server={activeServer}
              activeRunningServer={servers.find((s) => s.status === 'running' || s.status === 'starting')}
              logs={serverLogs[activeServer.id] || []}
              players={serverPlayers[activeServer.id] || []}
              serverStats={serverStats[activeServer.id] || null}
              systemInfo={systemInfo}
              onUpdateServer={(updated) => {
                if (!updated) return;
                const targetId = updated.id || activeServerId || activeServer.id;
                setServers((prev) =>
                  prev.map((s) => (s.id === targetId ? { ...s, ...updated, id: targetId } : s))
                );
                refreshServers();
              }}
              onStartServer={handleStartServer}
              onStopServer={handleStopServer}
              onSendCommand={handleSendCommand}
              onClearLogs={() => {
                setServerLogs((prev) => ({
                  ...prev,
                  [activeServer.id]: [],
                }));
              }}
              onOpenNetworkModal={() => setNetworkModalServer(activeServer)}
              onOpenFolder={handleOpenFolder}
              onBackToLibrary={() => setCurrentTab('library')}
            />
          )}

          {currentTab === 'settings' && <SettingsView />}
        </div>
      </div>

      {/* IP / Connection Modal */}
      {networkModalServer && (
        <NetworkModal
          server={networkModalServer}
          isOpen={!!networkModalServer}
          onClose={() => setNetworkModalServer(null)}
        />
      )}

      {/* Server Conflict Modal (Enforce 1 active server at a time) */}
      {conflictModal && (
        <ServerConflictModal
          isOpen={!!conflictModal}
          runningServer={conflictModal.runningServer}
          targetServer={conflictModal.targetServer}
          onClose={() => setConflictModal(null)}
          onStopAndSwitch={handleStopAndSwitch}
          onGoToRunning={handleGoToRunning}
        />
      )}
    </div>
  );
};
export default App;

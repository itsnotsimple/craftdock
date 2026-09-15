import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './views/LibraryView';
import { WizardView } from './views/WizardView';
import { DashboardView } from './views/DashboardView';
import { NetworkModal } from './components/NetworkModal';
import { ServerProfile, SystemInfo, LogEntry, ServerSoftware, ServerStats } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'library' | 'wizard' | 'dashboard'>('library');
  const [servers, setServers] = useState<ServerProfile[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

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

    return () => {
      if (unsubLog) unsubLog();
      if (unsubStats) unsubStats();
      if (unsubStatus) unsubStatus();
      if (unsubPlayers) unsubPlayers();
      if (unsubDownload) unsubDownload();
      if (unsubSystemInfo) unsubSystemInfo();
      if (unsubServerProfile) unsubServerProfile();
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
    setActiveServerId(id);
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'starting' } : s))
    );
    await api.startServer(id);
    refreshServers();
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
    if (confirm('Сигурен ли си, че искаш да изтриеш този сървър?')) {
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
    port: number;
    motd: string;
    hardcore?: boolean;
  }) => {
    const api = (window as any).api;
    if (!api) return;

    setIsCreating(true);
    setDownloadProgress({
      percent: 5,
      downloadedMb: 0,
      totalMb: 0,
      message: 'Инициализация на сървърните файлове...',
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
      alert(`Грешка при създаване на сървъра: ${err.message}`);
    } finally {
      setIsCreating(false);
      setDownloadProgress(null);
    }
  };

  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060913] text-slate-100 overflow-hidden font-sans relative selection:bg-sky-500/30 selection:text-sky-200">
      {/* Ambient Background Glows for authentic Glassmorphic Refraction */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-sky-600/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-blue-700/10 blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0" />

      {/* Full-width Draggable TitleBar Strip */}
      <TitleBar activeServer={activeServer} />

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
    </div>
  );
};
export default App;

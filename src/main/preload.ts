import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronApi {
  platform: string;
  getSystemInfo: () => Promise<any>;
  fetchVersions: (software: string) => Promise<any>;
  getServers: () => Promise<any>;
  createServer: (options: any) => Promise<any>;
  deleteServer: (id: string, deleteFiles: boolean) => Promise<boolean>;
  startServer: (id: string) => Promise<boolean>;
  stopServer: (id: string) => Promise<boolean>;
  sendCommand: (id: string, command: string) => Promise<boolean>;
  getServerLogs: (id: string) => Promise<any[]>;
  getServerStats: (id: string) => Promise<any>;
  getNetworkStatus: (port?: number) => Promise<any>;
  openServerFolder: (id: string) => Promise<void>;

  // Properties, Plugins & Backups
  getServerProperties: (id: string) => Promise<any>;
  saveServerProperties: (id: string, props: any) => Promise<any>;
  getRawServerProperties: (id: string) => Promise<string>;
  saveRawServerProperties: (id: string, rawContent: string) => Promise<boolean>;
  getInstalledPlugins: (id: string) => Promise<any>;
  getCuratedPlugins: () => Promise<any>;
  installCuratedPlugin: (id: string, pluginId: string) => Promise<boolean>;
  deletePlugin: (id: string, fileName: string) => Promise<boolean>;
  openPluginsFolder: (id: string) => Promise<void>;
  openResourcePacksFolder: (id: string) => Promise<void>;
  getSavedResourcePacks: (id: string) => Promise<any[]>;
  saveResourcePacksList: (id: string, list: any[]) => Promise<boolean>;
  getServerIcon: (id: string) => Promise<string | null>;
  setServerIcon: (id: string, base64Data: string) => Promise<boolean>;
  removeServerIcon: (id: string) => Promise<boolean>;
  createWorldBackup: (id: string) => Promise<string>;

  // Whitelist Management
  getWhitelist: (id: string) => Promise<any>;
  addToWhitelist: (id: string, name: string) => Promise<boolean>;
  removeFromWhitelist: (id: string, name: string) => Promise<boolean>;

  // Operators & Bans
  getServerOps: (id: string) => Promise<any[]>;
  addOp: (id: string, name: string, level?: number) => Promise<boolean>;
  removeOp: (id: string, name: string) => Promise<boolean>;
  getServerBans: (id: string) => Promise<any[]>;
  banPlayer: (id: string, name: string, reason?: string) => Promise<boolean>;
  pardonPlayer: (id: string, name: string) => Promise<boolean>;
  getServerBannedIps: (id: string) => Promise<any[]>;
  banIp: (id: string, ip: string, reason?: string) => Promise<boolean>;
  pardonIp: (id: string, ip: string) => Promise<boolean>;

  // Player Directory & Inventory
  getServerPlayersArchive: (id: string, onlinePlayerNames?: string[]) => Promise<any[]>;
  getPlayerInventory: (id: string, uuid: string, playerName?: string) => Promise<any>;

  // World Manager
  getServerWorlds: (id: string) => Promise<any[]>;
  resetWorld: (id: string, worldName: string) => Promise<boolean>;
  importWorld: (id: string, zipPath: string, targetWorldName: string) => Promise<boolean>;
  getWorldBackups: (id: string) => Promise<any[]>;
  deleteWorldBackup: (id: string, fileName: string) => Promise<boolean>;
  restoreWorldBackup: (id: string, fileName: string) => Promise<boolean>;
  updateServerProfile: (id: string, updates: any) => Promise<any>;
  pickWorldZip: () => Promise<string | null>;
  exportServerZip: (id: string) => Promise<any>;
  exportWorldZip: (id: string, worldName?: string) => Promise<any>;
  importServerZip: (customZipPath?: string) => Promise<any>;
  upgradeServerVersion: (id: string, targetVersion: string) => Promise<any>;
  onUpgradeProgress: (callback: (data: { percent: number; message: string }) => void) => () => void;

  // Analytics & Statistics
  getUptimeHistory: (id: string) => Promise<any>;
  getPlayerAnalytics: (id: string) => Promise<any>;
  getChatHistory: (id: string, limit?: number) => Promise<any[]>;
  clearChatHistory: (id: string) => Promise<boolean>;
  getPerformanceHistory: (id: string, range?: string) => Promise<any[]>;

  // Storage & Quota
  getServerStorage: (id: string) => Promise<any>;

  // Modrinth Integration
  searchModrinthModpacks: (query?: string, limit?: number) => Promise<any[]>;
  searchModrinthResourcePacks: (query?: string, limit?: number) => Promise<any[]>;
  searchModrinthPlugins: (query?: string, limit?: number, software?: string) => Promise<any[]>;
  getModrinthPackFile: (projectIdOrSlug: string) => Promise<any>;
  getModrinthProjectVersions: (projectIdOrSlug: string, loaders?: string[], gameVersion?: string) => Promise<any[]>;
  installRemoteResourcePack: (id: string, downloadUrl: string, fileName: string) => Promise<boolean>;
  installRemotePlugin: (id: string, downloadUrl: string, fileName: string) => Promise<boolean>;

  // Embedded Playit Tunnel
  startTunnel: (port?: number) => Promise<any>;
  stopTunnel: () => Promise<boolean>;
  getTunnelStatus: () => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  setTitleBarTheme: (theme: 'dark' | 'light') => Promise<boolean>;

  // Global App Settings & Diagnostics
  getAppSettings: () => Promise<any>;
  saveAppSettings: (updates: any) => Promise<any>;
  getGlobalDiagnostics: () => Promise<any>;
  checkJavaStatus: (mcVersion: string) => Promise<any>;
  openServersFolder: () => Promise<void>;
  openAppLogs: () => Promise<void>;
  clearAppCache: () => Promise<any>;
  uninstallApp: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  startAppUpdate: () => Promise<any>;
  cancelAppUpdate: () => Promise<boolean>;

  // Crash Analyzer & Diagnostics
  getCrashReports: (id: string) => Promise<any[]>;
  analyzeCrash: (id: string, fileName?: string) => Promise<any>;
  testStartupSound: () => Promise<boolean>;
  sendTestNotification: (lang?: 'bg' | 'en') => Promise<boolean>;

  // Lag Buster
  cleanDroppedItems: (serverId: string) => Promise<{ success: boolean; message: string }>;
  cleanHostileMonsters: (serverId: string) => Promise<{ success: boolean; message: string }>;
  cleanMinecartsBoats: (serverId: string) => Promise<{ success: boolean; message: string }>;
  checkLagSettings: (serverId: string) => Promise<any>;
  applyOptimalLagSettings: (serverId: string) => Promise<boolean>;
  runChunkyCommand: (serverId: string, action: 'radius' | 'start' | 'pause' | 'cancel', radius?: number) => Promise<{ success: boolean; error?: string }>;
  isChunkyInstalled: (serverId: string) => Promise<boolean>;

  // Smart Sleep Mode
  putServerToSleep: (serverId: string) => Promise<boolean>;
  wakeServer: (serverId: string) => Promise<boolean>;
  isServerSleeping: (serverId: string) => Promise<boolean>;

  // World Slimmer
  analyzeWorldSlimmer: (serverId: string, radiusBlocks?: number) => Promise<any>;
  trimDistantRegions: (serverId: string, radiusBlocks?: number) => Promise<any>;

  // Mobile Remote Web
  getRemoteStatus: () => Promise<any>;
  toggleRemoteService: (enabled: boolean) => Promise<boolean>;
  regenerateRemotePin: () => Promise<string>;
  setRemotePort: (port: number) => Promise<boolean>;
  getRemoteQrSvg: (mode?: 'local' | 'public') => Promise<string>;
  startRemoteTunnel: () => Promise<{ success: boolean; url?: string; error?: string }>;
  stopRemoteTunnel: () => Promise<boolean>;

  // Task Scheduler
  getScheduledTasks: () => Promise<any[]>;
  saveScheduledTask: (task: any) => Promise<any>;
  deleteScheduledTask: (taskId: string) => Promise<boolean>;
  toggleTaskEnabled: (taskId: string, enabled: boolean) => Promise<boolean>;
  runTaskNow: (taskId: string) => Promise<{ success: boolean; message: string }>;

  // Seed Map & Structure Locator
  getWorldSeed: (serverId: string) => Promise<{ seed: string; source: string; chunkbaseVersion: string; chunkbaseLink: string } | null>;
  locateStructures: (
    seed: string,
    dimension?: 'overworld' | 'nether' | 'the_end',
    originX?: number,
    originZ?: number,
    maxRadius?: number
  ) => Promise<any[]>;

  // Subscriptions
  onScheduledTasksUpdated: (callback: (tasks: any[]) => void) => () => void;
  onServerLog: (callback: (data: any) => void) => () => void;
  onServerStatusChanged: (callback: (data: any) => void) => () => void;
  onServerPlayersChanged: (callback: (data: any) => void) => () => void;
  onServerStatsUpdated: (callback: (data: any) => void) => () => void;
  onDownloadProgress: (callback: (data: any) => void) => () => void;
  onSystemInfoUpdate: (callback: (data: any) => void) => () => void;
  onTunnelStatusChanged: (callback: (data: any) => void) => () => void;
  onServerProfileUpdated: (callback: (data: any) => void) => () => void;
  onUpdateAvailable: (callback: (data: any) => void) => () => void;
  onAppUpdateProgress: (callback: (data: any) => void) => () => void;
  onAutoBackupCompleted: (callback: (data: any) => void) => () => void;
  onServerChatMessage: (callback: (data: any) => void) => () => void;
  onPlaySound: (callback: (soundType: string) => void) => () => void;
  onServerCrashed: (callback: (data: { serverId: string; serverName?: string; code?: number }) => void) => () => void;
  onServerWokenUp: (callback: (data: any) => void) => () => void;
}

const api: IElectronApi = {
  platform: process.platform,
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  fetchVersions: (software: string) => ipcRenderer.invoke('fetch-versions', software),
  getServers: () => ipcRenderer.invoke('get-servers'),
  createServer: (options: any) => ipcRenderer.invoke('create-server', options),
  deleteServer: (id: string, deleteFiles: boolean) => ipcRenderer.invoke('delete-server', id, deleteFiles),
  startServer: (id: string) => ipcRenderer.invoke('start-server', id),
  stopServer: (id: string) => ipcRenderer.invoke('stop-server', id),
  sendCommand: (id: string, command: string) => ipcRenderer.invoke('send-command', id, command),
  getServerLogs: (id: string) => ipcRenderer.invoke('get-server-logs', id),
  getServerStats: (id: string) => ipcRenderer.invoke('get-server-stats', id),
  getNetworkStatus: (port?: number) => ipcRenderer.invoke('get-network-status', port),
  openServerFolder: (id: string) => ipcRenderer.invoke('open-server-folder', id),

  getServerProperties: (id: string) => ipcRenderer.invoke('get-server-properties', id),
  saveServerProperties: (id: string, props: any) => ipcRenderer.invoke('save-server-properties', id, props),
  getRawServerProperties: (id: string) => ipcRenderer.invoke('get-raw-server-properties', id),
  saveRawServerProperties: (id: string, rawContent: string) => ipcRenderer.invoke('save-raw-server-properties', id, rawContent),
  getInstalledPlugins: (id: string) => ipcRenderer.invoke('get-installed-plugins', id),
  getCuratedPlugins: () => ipcRenderer.invoke('get-curated-plugins'),
  installCuratedPlugin: (id: string, pluginId: string) => ipcRenderer.invoke('install-curated-plugin', id, pluginId),
  deletePlugin: (id: string, fileName: string) => ipcRenderer.invoke('delete-plugin', id, fileName),
  openPluginsFolder: (id: string) => ipcRenderer.invoke('open-plugins-folder', id),
  openResourcePacksFolder: (id: string) => ipcRenderer.invoke('open-resourcepacks-folder', id),
  getSavedResourcePacks: (id: string) => ipcRenderer.invoke('get-saved-resource-packs', id),
  saveResourcePacksList: (id: string, list: any[]) => ipcRenderer.invoke('save-resource-packs-list', id, list),
  getServerIcon: (id: string) => ipcRenderer.invoke('get-server-icon', id),
  setServerIcon: (id: string, base64Data: string) => ipcRenderer.invoke('set-server-icon', id, base64Data),
  removeServerIcon: (id: string) => ipcRenderer.invoke('remove-server-icon', id),
  createWorldBackup: (id: string) => ipcRenderer.invoke('create-world-backup', id),

  getWhitelist: (id: string) => ipcRenderer.invoke('get-whitelist', id),
  addToWhitelist: (id: string, name: string, uuid?: string) => ipcRenderer.invoke('add-to-whitelist', id, name, uuid),
  removeFromWhitelist: (id: string, name: string, uuid?: string) => ipcRenderer.invoke('remove-from-whitelist', id, name, uuid),

  // Operators & Bans
  getServerOps: (id: string) => ipcRenderer.invoke('get-server-ops', id),
  addOp: (id: string, name: string, level?: number, uuid?: string) => ipcRenderer.invoke('add-op', id, name, level, uuid),
  removeOp: (id: string, name: string, uuid?: string) => ipcRenderer.invoke('remove-op', id, name, uuid),
  getServerBans: (id: string) => ipcRenderer.invoke('get-server-bans', id),
  banPlayer: (id: string, name: string, reason?: string, uuid?: string) => ipcRenderer.invoke('ban-player', id, name, reason, uuid),
  pardonPlayer: (id: string, name: string, uuid?: string) => ipcRenderer.invoke('pardon-player', id, name, uuid),
  getServerBannedIps: (id: string) => ipcRenderer.invoke('get-server-banned-ips', id),
  banIp: (id: string, ip: string, reason?: string) => ipcRenderer.invoke('ban-ip', id, ip, reason),
  pardonIp: (id: string, ip: string) => ipcRenderer.invoke('pardon-ip', id, ip),

  // Player Directory & Inventory
  getServerPlayersArchive: (id: string, onlinePlayerNames?: string[]) => ipcRenderer.invoke('get-server-players-archive', id, onlinePlayerNames),
  getPlayerInventory: (id: string, uuid: string, playerName?: string) => ipcRenderer.invoke('get-player-inventory', id, uuid, playerName),

  // World Manager
  getServerWorlds: (id: string) => ipcRenderer.invoke('get-server-worlds', id),
  resetWorld: (id: string, worldName: string) => ipcRenderer.invoke('reset-world', id, worldName),
  importWorld: (id: string, zipPath: string, targetWorldName: string) => ipcRenderer.invoke('import-world', id, zipPath, targetWorldName),
  getWorldBackups: (id: string) => ipcRenderer.invoke('get-world-backups', id),
  deleteWorldBackup: (id: string, fileName: string) => ipcRenderer.invoke('delete-world-backup', id, fileName),
  restoreWorldBackup: (id: string, fileName: string) => ipcRenderer.invoke('restore-world-backup', id, fileName),
  updateServerProfile: (id: string, updates: any) => ipcRenderer.invoke('update-server-profile', id, updates),
  pickWorldZip: () => ipcRenderer.invoke('pick-world-zip'),
  exportServerZip: (id: string) => ipcRenderer.invoke('export-server-zip', id),
  exportWorldZip: (id: string, worldName?: string) => ipcRenderer.invoke('export-world-zip', id, worldName),
  importServerZip: (customZipPath?: string) => ipcRenderer.invoke('import-server-zip', customZipPath),
  upgradeServerVersion: (id: string, targetVersion: string) => ipcRenderer.invoke('upgrade-server-version', id, targetVersion),

  // Analytics & Statistics
  getUptimeHistory: (id: string) => ipcRenderer.invoke('get-uptime-history', id),
  getPlayerAnalytics: (id: string) => ipcRenderer.invoke('get-player-analytics', id),
  getChatHistory: (id: string, limit?: number) => ipcRenderer.invoke('get-chat-history', id, limit),
  clearChatHistory: (id: string) => ipcRenderer.invoke('clear-chat-history', id),
  getPerformanceHistory: (id: string, range?: string) => ipcRenderer.invoke('get-performance-history', id, range),

  // Crash Analyzer & Diagnostics
  getCrashReports: (id: string) => ipcRenderer.invoke('get-crash-reports', id),
  analyzeCrash: (id: string, fileName?: string, sessionInfo?: any, lang?: string) => ipcRenderer.invoke('analyze-crash', id, fileName, sessionInfo, lang),
  testStartupSound: () => ipcRenderer.invoke('test-startup-sound'),

  // Storage & Quota
  getServerStorage: (id: string) => ipcRenderer.invoke('get-server-storage', id),

  // Modrinth Integration
  searchModrinthModpacks: (query?: string, limit?: number) => ipcRenderer.invoke('search-modrinth-modpacks', query, limit),
  searchModrinthResourcePacks: (query?: string, limit?: number) => ipcRenderer.invoke('search-modrinth-resourcepacks', query, limit),
  searchModrinthPlugins: (query?: string, limit?: number, software?: string) => ipcRenderer.invoke('search-modrinth-plugins', query, limit, software),
  getModrinthPackFile: (projectIdOrSlug: string) => ipcRenderer.invoke('get-modrinth-pack-file', projectIdOrSlug),
  getModrinthProjectVersions: (projectIdOrSlug: string, loaders?: string[], gameVersion?: string) => ipcRenderer.invoke('get-modrinth-versions', projectIdOrSlug, loaders, gameVersion),
  installRemoteResourcePack: (id: string, downloadUrl: string, fileName: string) => ipcRenderer.invoke('install-remote-resourcepack', id, downloadUrl, fileName),
  installRemotePlugin: (id: string, downloadUrl: string, fileName: string) => ipcRenderer.invoke('install-remote-plugin', id, downloadUrl, fileName),

  startTunnel: (port?: number) => ipcRenderer.invoke('start-tunnel', port),
  stopTunnel: () => ipcRenderer.invoke('stop-tunnel'),
  getTunnelStatus: () => ipcRenderer.invoke('get-tunnel-status'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  setTitleBarTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('set-titlebar-theme', theme),

  // Global App Settings & Diagnostics
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (updates: any) => ipcRenderer.invoke('save-app-settings', updates),
  getGlobalDiagnostics: () => ipcRenderer.invoke('get-global-diagnostics'),
  checkJavaStatus: (mcVersion: string) => ipcRenderer.invoke('check-java-status', mcVersion),
  openServersFolder: () => ipcRenderer.invoke('open-servers-folder'),
  openAppLogs: () => ipcRenderer.invoke('open-app-logs'),
  clearAppCache: () => ipcRenderer.invoke('clear-app-cache'),
  uninstallApp: () => ipcRenderer.invoke('uninstall-app'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startAppUpdate: () => ipcRenderer.invoke('start-app-update'),
  cancelAppUpdate: () => ipcRenderer.invoke('cancel-app-update'),
  sendTestNotification: (lang?: 'bg' | 'en') => ipcRenderer.invoke('send-test-notification', lang),

  // Lag Buster
  cleanDroppedItems: (serverId: string) => ipcRenderer.invoke('clean-dropped-items', serverId),
  cleanHostileMonsters: (serverId: string) => ipcRenderer.invoke('clean-hostile-monsters', serverId),
  cleanMinecartsBoats: (serverId: string) => ipcRenderer.invoke('clean-minecarts-boats', serverId),
  checkLagSettings: (serverId: string) => ipcRenderer.invoke('check-lag-settings', serverId),
  applyOptimalLagSettings: (serverId: string) => ipcRenderer.invoke('apply-optimal-lag-settings', serverId),
  runChunkyCommand: (serverId: string, action: 'radius' | 'start' | 'pause' | 'cancel', radius?: number) =>
    ipcRenderer.invoke('run-chunky-command', serverId, action, radius),
  isChunkyInstalled: (serverId: string) => ipcRenderer.invoke('is-chunky-installed', serverId),

  // Smart Sleep Mode
  putServerToSleep: (serverId: string) => ipcRenderer.invoke('put-server-to-sleep', serverId),
  wakeServer: (serverId: string) => ipcRenderer.invoke('wake-server', serverId),
  isServerSleeping: (serverId: string) => ipcRenderer.invoke('is-server-sleeping', serverId),

  // World Slimmer
  analyzeWorldSlimmer: (serverId: string, radiusBlocks?: number) =>
    ipcRenderer.invoke('analyze-world-slimmer', serverId, radiusBlocks),
  trimDistantRegions: (serverId: string, radiusBlocks?: number) =>
    ipcRenderer.invoke('trim-distant-regions', serverId, radiusBlocks),

  // Mobile Remote Web
  getRemoteStatus: () => ipcRenderer.invoke('get-remote-status'),
  toggleRemoteService: (enabled: boolean) => ipcRenderer.invoke('toggle-remote-service', enabled),
  regenerateRemotePin: () => ipcRenderer.invoke('regenerate-remote-pin'),
  setRemotePort: (port: number) => ipcRenderer.invoke('set-remote-port', port),
  getRemoteQrSvg: (mode?: 'local' | 'public') => ipcRenderer.invoke('get-remote-qr-svg', mode),
  startRemoteTunnel: () => ipcRenderer.invoke('start-remote-tunnel'),
  stopRemoteTunnel: () => ipcRenderer.invoke('stop-remote-tunnel'),

  // Task Scheduler
  getScheduledTasks: () => ipcRenderer.invoke('get-scheduled-tasks'),
  saveScheduledTask: (task: any) => ipcRenderer.invoke('save-scheduled-task', task),
  deleteScheduledTask: (taskId: string) => ipcRenderer.invoke('delete-scheduled-task', taskId),
  toggleTaskEnabled: (taskId: string, enabled: boolean) => ipcRenderer.invoke('toggle-task-enabled', taskId, enabled),
  runTaskNow: (taskId: string) => ipcRenderer.invoke('run-task-now', taskId),

  // Seed Map & Structure Locator
  getWorldSeed: (serverId: string) => ipcRenderer.invoke('get-world-seed', serverId),
  locateStructures: (
    seed: string,
    dimension: 'overworld' | 'nether' | 'the_end' = 'overworld',
    originX = 0,
    originZ = 0,
    maxRadius = 6000
  ) => ipcRenderer.invoke('locate-structures', seed, dimension, originX, originZ, maxRadius),

  onScheduledTasksUpdated: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('scheduled-tasks-updated', handler);
    return () => ipcRenderer.removeListener('scheduled-tasks-updated', handler);
  },

  onServerLog: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-log', handler);
    return () => ipcRenderer.removeListener('server-log', handler);
  },
  onServerStatusChanged: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-status-changed', handler);
    return () => ipcRenderer.removeListener('server-status-changed', handler);
  },
  onServerPlayersChanged: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-players-changed', handler);
    return () => ipcRenderer.removeListener('server-players-changed', handler);
  },
  onServerStatsUpdated: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-stats-updated', handler);
    return () => ipcRenderer.removeListener('server-stats-updated', handler);
  },
  onDownloadProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  onSystemInfoUpdate: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('system-info-update', handler);
    return () => ipcRenderer.removeListener('system-info-update', handler);
  },
  onTunnelStatusChanged: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('tunnel-status-changed', handler);
    return () => ipcRenderer.removeListener('tunnel-status-changed', handler);
  },
  onServerProfileUpdated: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-profile-updated', handler);
    return () => ipcRenderer.removeListener('server-profile-updated', handler);
  },
  onUpdateAvailable: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onAppUpdateProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('app-update-progress', handler);
    return () => ipcRenderer.removeListener('app-update-progress', handler);
  },
  onAutoBackupCompleted: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('auto-backup-completed', handler);
    return () => ipcRenderer.removeListener('auto-backup-completed', handler);
  },
  onServerChatMessage: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-chat-message', handler);
    return () => ipcRenderer.removeListener('server-chat-message', handler);
  },
  onPlaySound: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('play-sound', handler);
    return () => ipcRenderer.removeListener('play-sound', handler);
  },
  onServerCrashed: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-crashed', handler);
    return () => ipcRenderer.removeListener('server-crashed', handler);
  },
  onUpgradeProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('upgrade-progress', handler);
    return () => ipcRenderer.removeListener('upgrade-progress', handler);
  },
  onServerWokenUp: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('server-woken-up', handler);
    return () => ipcRenderer.removeListener('server-woken-up', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

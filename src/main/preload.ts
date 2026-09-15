import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronApi {
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

  // Embedded Playit Tunnel
  startTunnel: (port?: number) => Promise<any>;
  stopTunnel: () => Promise<boolean>;
  getTunnelStatus: () => Promise<any>;
  openExternal: (url: string) => Promise<void>;

  // Subscriptions
  onServerLog: (callback: (data: any) => void) => () => void;
  onServerStatusChanged: (callback: (data: any) => void) => () => void;
  onServerPlayersChanged: (callback: (data: any) => void) => () => void;
  onServerStatsUpdated: (callback: (data: any) => void) => () => void;
  onDownloadProgress: (callback: (data: any) => void) => () => void;
  onSystemInfoUpdate: (callback: (data: any) => void) => () => void;
  onTunnelStatusChanged: (callback: (data: any) => void) => () => void;
  onServerProfileUpdated: (callback: (data: any) => void) => () => void;
}

const api: IElectronApi = {
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
  addToWhitelist: (id: string, name: string) => ipcRenderer.invoke('add-to-whitelist', id, name),
  removeFromWhitelist: (id: string, name: string) => ipcRenderer.invoke('remove-from-whitelist', id, name),

  startTunnel: (port?: number) => ipcRenderer.invoke('start-tunnel', port),
  stopTunnel: () => ipcRenderer.invoke('stop-tunnel'),
  getTunnelStatus: () => ipcRenderer.invoke('get-tunnel-status'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

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
};

contextBridge.exposeInMainWorld('api', api);

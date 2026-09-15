import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { getSystemInfo } from './system-info';
import {
  fetchPaperVersions,
  fetchPurpurVersions,
  fetchVanillaVersions,
  fetchFabricVersions,
  getPaperDownloadUrl,
  getPurpurDownloadUrl,
  getVanillaDownloadUrl,
  getFabricDownloadUrl,
  downloadFileWithProgress,
} from './api-service';
import {
  loadServers,
  addServer,
  deleteServer,
  updateServer,
  getDefaultServerFolder,
  ServerProfile,
} from './server-store';
import {
  startServer,
  stopServer,
  sendServerCommand,
  autoAcceptEula,
  updateServerProperties,
  isServerRunning,
  getServerPlayers,
  getServerLogs,
  getServerStats,
} from './server-runner';
import { getNetworkStatus, startTunnelProcess, stopTunnelProcess, getTunnelStatus } from './tunnel-service';
import {
  readServerProperties,
  writeServerProperties,
  getInstalledPlugins,
  CURATED_PLUGINS,
  installPluginFromUrl,
  deletePlugin,
  createWorldBackup,
  getPluginsDir,
  getResourcePacksDir,
  getSavedResourcePacks,
  saveResourcePacksList,
  getServerIcon,
  setServerIcon,
  removeServerIcon,
  getWhitelist,
  syncWhitelistUuids,
  addToWhitelist,
  removeFromWhitelist,
} from './server-config';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../resources/icon.png');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090d16',
      symbolColor: '#ffffff',
      height: 36,
    },
    show: false,
  });

  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// System & Version IPC Handlers
ipcMain.handle('get-system-info', async () => {
  return getSystemInfo();
});

ipcMain.handle('fetch-versions', async (_event, software: string) => {
  switch (software) {
    case 'paper':
      return await fetchPaperVersions();
    case 'purpur':
      return await fetchPurpurVersions();
    case 'fabric':
      return await fetchFabricVersions();
    case 'vanilla':
    default:
      return await fetchVanillaVersions();
  }
});

ipcMain.handle('get-servers', async () => {
  const servers = loadServers();
  return servers.map((s) => {
    const props = fs.existsSync(s.path) ? readServerProperties(s.path) : null;
    return {
      ...s,
      maxPlayers: props?.maxPlayers ?? s.maxPlayers ?? 20,
      motd: props?.motd ?? s.motd ?? s.name,
      status: isServerRunning(s.id) ? 'running' : s.status === 'starting' ? 'starting' : 'stopped',
      playerCount: getServerPlayers(s.id).length,
    };
  });
});

ipcMain.handle(
  'create-server',
  async (
    event,
    options: {
      name: string;
      software: 'paper' | 'purpur' | 'vanilla' | 'fabric';
      version: string;
      allocatedRamGb: number;
      port: number;
      motd: string;
    }
  ) => {
    const folder = getDefaultServerFolder(options.name);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const jarPath = path.join(folder, 'server.jar');

    event.sender.send('download-progress', {
      percent: 5,
      downloadedMb: 0,
      totalMb: 0,
      message: `Търсене на инсталатор за ${options.software.toUpperCase()} v${options.version}...`,
    });

    let downloadUrl = '';
    switch (options.software) {
      case 'paper':
        downloadUrl = await getPaperDownloadUrl(options.version);
        break;
      case 'purpur':
        downloadUrl = await getPurpurDownloadUrl(options.version);
        break;
      case 'fabric':
        downloadUrl = await getFabricDownloadUrl(options.version);
        break;
      case 'vanilla':
      default:
        downloadUrl = await getVanillaDownloadUrl(options.version);
        break;
    }

    await downloadFileWithProgress(downloadUrl, jarPath, (percent, downloadedMb, totalMb) => {
      event.sender.send('download-progress', {
        percent,
        downloadedMb,
        totalMb,
        message: `Изтегляне на сървърни файлове (${percent}% - ${downloadedMb}MB / ${totalMb}MB)...`,
      });
    });

    autoAcceptEula(folder);
    updateServerProperties(folder, options.port, options.motd);

    const profile: ServerProfile = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: options.name,
      software: options.software,
      version: options.version,
      allocatedRamGb: options.allocatedRamGb,
      port: options.port,
      path: folder,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      playerCount: 0,
      maxPlayers: 20,
      motd: options.motd || `${options.name} - CraftDock Server`,
    };

    addServer(profile);
    return profile;
  }
);

ipcMain.handle('delete-server', async (_event, id: string, deleteFiles: boolean) => {
  stopServer(id);
  return deleteServer(id, deleteFiles);
});

ipcMain.handle('start-server', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return await startServer(server);
});

ipcMain.handle('stop-server', async (_event, id: string) => {
  return stopServer(id);
});

ipcMain.handle('send-command', async (_event, id: string, command: string) => {
  return sendServerCommand(id, command);
});

ipcMain.handle('get-server-logs', async (_event, id: string) => {
  return getServerLogs(id);
});

ipcMain.handle('get-server-stats', async (_event, id: string) => {
  return getServerStats(id);
});

ipcMain.handle('get-network-status', async (_event, port = 25565) => {
  const sys = getSystemInfo();
  return await getNetworkStatus(sys.localIp, port);
});

ipcMain.handle('open-server-folder', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (server && fs.existsSync(server.path)) {
    shell.openPath(server.path);
  }
});

// Plugin & Server Properties Handlers
ipcMain.handle('get-server-properties', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;
  return readServerProperties(server.path);
});

ipcMain.handle('save-server-properties', async (_event, id: string, props: any) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;

  writeServerProperties(server.path, props);

  const updates: Partial<ServerProfile> = {};
  if (props.maxPlayers !== undefined) {
    updates.maxPlayers = parseInt(props.maxPlayers, 10) || 20;
    // Live update running server if Paper/Purpur
    sendServerCommand(id, `setmaxplayers ${updates.maxPlayers}`);
  }
  if (props.motd !== undefined) {
    updates.motd = props.motd;
  }
  if (props.difficulty) {
    sendServerCommand(id, `difficulty ${props.difficulty}`);
  }
  if (props.gamemode) {
    sendServerCommand(id, `defaultgamemode ${props.gamemode}`);
  }
  if (props.viewDistance !== undefined) {
    sendServerCommand(id, `setviewdistance ${props.viewDistance}`);
    sendServerCommand(id, `setsimulationdistance ${props.viewDistance}`);
  }

  const updated = updateServer(id, updates);

  // Broadcast to all windows so renderer immediately updates server state
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('server-profile-updated', updated);
    }
  });

  return updated;
});

ipcMain.handle('get-installed-plugins', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getInstalledPlugins(server.path);
});

ipcMain.handle('get-curated-plugins', async () => {
  return CURATED_PLUGINS;
});

ipcMain.handle('install-curated-plugin', async (event, id: string, pluginId: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;

  const plugin = CURATED_PLUGINS.find((p) => p.id === pluginId);
  if (!plugin) return false;

  await installPluginFromUrl(server.path, plugin.downloadUrl, plugin.fileName, (percent) => {
    event.sender.send('download-progress', {
      percent,
      downloadedMb: 0,
      totalMb: 0,
      message: `Инсталиране на плъгин: ${plugin.name} (${percent}%)...`,
    });
  });

  return true;
});

ipcMain.handle('delete-plugin', async (_event, id: string, fileName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return deletePlugin(server.path, fileName);
});

ipcMain.handle('open-plugins-folder', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (server) {
    shell.openPath(getPluginsDir(server.path));
  }
});

ipcMain.handle('open-resourcepacks-folder', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (server) {
    shell.openPath(getResourcePacksDir(server.path));
  }
});

ipcMain.handle('get-saved-resource-packs', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getSavedResourcePacks(server.path);
});

ipcMain.handle('save-resource-packs-list', async (_event, id: string, list: any[]) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  saveResourcePacksList(server.path, list);
  return true;
});

// Server Icon Handlers
ipcMain.handle('get-server-icon', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;
  return getServerIcon(server.path);
});

ipcMain.handle('set-server-icon', async (_event, id: string, base64Data: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return setServerIcon(server.path, base64Data);
});

ipcMain.handle('remove-server-icon', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return removeServerIcon(server.path);
});

ipcMain.handle('create-world-backup', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return '';
  return createWorldBackup(server.path);
});

// Whitelist Handlers
ipcMain.handle('get-whitelist', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  await syncWhitelistUuids(server.path);
  return getWhitelist(server.path);
});

ipcMain.handle('add-to-whitelist', async (_event, id: string, name: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  await addToWhitelist(server.path, name);
  if (isServerRunning(id)) {
    sendServerCommand(id, `whitelist add ${name}`);
    sendServerCommand(id, 'whitelist reload');
  }
  return true;
});

ipcMain.handle('remove-from-whitelist', async (_event, id: string, name: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  removeFromWhitelist(server.path, name);
  if (isServerRunning(id)) {
    sendServerCommand(id, `whitelist remove ${name}`);
    sendServerCommand(id, 'whitelist reload');
  }
  return true;
});

// Embedded Playit Tunnel Handlers
ipcMain.handle('start-tunnel', async (_event, port = 25565) => {
  return await startTunnelProcess(port, (status) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('tunnel-status-changed', status);
      }
    });
  });
});

ipcMain.handle('stop-tunnel', async () => {
  stopTunnelProcess();
  return true;
});

ipcMain.handle('get-tunnel-status', async () => {
  return getTunnelStatus();
});

ipcMain.handle('open-external', async (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Periodic live RAM & System Info update (every 2.5s)
setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-info-update', getSystemInfo());
  }
}, 2500);


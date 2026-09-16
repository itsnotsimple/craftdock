import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
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
  searchModrinthModpacks,
  searchModrinthResourcePacks,
  searchModrinthPlugins,
  getModrinthProjectVersions,
  getModrinthVersionFile,
} from './api-service';
import {
  loadServers,
  addServer,
  deleteServer,
  updateServer,
  getDefaultServerFolder,
  calculateServerStorage,
  getDataDirectory,
  ServerProfile,
} from './server-store';
import { getSystemJavaVersion } from './java-manager';
import {
  loadAppSettings,
  saveAppSettings,
  getNetworkDiagnostics,
  getDiskDiagnostics,
  clearAppCache,
} from './app-settings';
import {
  startServer,
  stopServer,
  sendServerCommand,
  autoAcceptEula,
  updateServerProperties,
  isServerRunning,
  getServerActiveStatus,
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

// Ensure standard macOS / Linux binary paths are present in process.env.PATH
if (process.platform === 'darwin') {
  const defaultPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin'];
  const currentPath = process.env.PATH || '';
  const missingPaths = defaultPaths.filter((p) => !currentPath.includes(p));
  if (missingPaths.length > 0) {
    process.env.PATH = `${missingPaths.join(':')}:${currentPath}`;
  }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '../resources/icon.png');
  let iconImage = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    iconImage = nativeImage.createFromPath(iconPath);
  }
  tray = new Tray(iconImage.resize({ width: 16, height: 16 }));
  tray.setToolTip('CraftDock - Minecraft Server Manager');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open CraftDock',
      click: () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit CraftDock',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  const iconPath = path.join(__dirname, '../resources/icon.png');
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#060913',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    ...(isMac
      ? {
          trafficLightPosition: { x: 16, y: 12 },
        }
      : {
          titleBarOverlay: {
            color: '#070a14',
            symbolColor: '#cbd5e1',
            height: 38,
          },
        }),
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

  mainWindow.webContents.once('did-finish-load', () => {
    // Auto-start last played server
    const appSettings = loadAppSettings();
    if (appSettings.autoStartLastServer) {
      const allServers = loadServers();
      if (allServers.length > 0) {
        const lastPlayed = allServers
          .filter((s) => s.lastPlayedAt)
          .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())[0]
          ?? allServers[allServers.length - 1];

        if (lastPlayed) {
          console.log(`[CraftDock] Auto-starting last server: ${lastPlayed.name}`);
          setTimeout(() => startServer(lastPlayed), 2000);
        }
      }
    }

    // Auto-update check
    if (appSettings.autoUpdate) {
      checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('close', (event) => {
    const appSettings = loadAppSettings();
    if (!isQuitting && appSettings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();

      if (!appSettings.hasSeenTrayNotice) {
        saveAppSettings({ hasSeenTrayNotice: true });
        if (tray && process.platform === 'win32') {
          const isBg = appSettings.language === 'bg';
          tray.displayBalloon({
            title: isBg ? 'CraftDock работи на заден план' : 'CraftDock is running in background',
            content: isBg
              ? 'Приложението е минимизирано в системната лента (до часовника). Сървърите продължават да работят.'
              : 'CraftDock was minimized to the system tray. Your servers remain online.',
            iconType: 'info',
          });
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── GitHub release update checker ─────────────────────────────────────────────
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/itsnotsimple/craftdock/releases/latest';

function semverGt(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

async function checkForUpdatesAndNotify(): Promise<void> {
  try {
    const currentVersion = app.getVersion();
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        'User-Agent': `CraftDock/${currentVersion}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) return;
    const release = (await res.json()) as { tag_name: string; html_url: string; name: string };
    const latestTag = release.tag_name || '';
    if (semverGt(latestTag, currentVersion)) {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        if (!win.isDestroyed()) {
          win.webContents.send('update-available', {
            currentVersion,
            latestVersion: latestTag,
            releaseName: release.name,
            releaseUrl: release.html_url,
          });
        }
      }
    }
  } catch (e) {
    // silently ignore — network may be offline
    console.warn('[CraftDock] Update check failed:', e);
  }
}

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const appSettings = loadAppSettings();
    if (!appSettings.minimizeToTray || isQuitting) {
      app.quit();
    }
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
    const activeStatus = getServerActiveStatus(s.id);
    const resolvedStatus =
      activeStatus !== 'stopped'
        ? activeStatus
        : s.status === 'starting' || s.status === 'stopping'
        ? s.status
        : 'stopped';
    return {
      ...s,
      maxPlayers: props?.maxPlayers ?? s.maxPlayers ?? 20,
      motd: props?.motd ?? s.motd ?? s.name,
      hardcore: props?.hardcore ?? s.hardcore ?? false,
      status: resolvedStatus,
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
      storageQuotaGb?: number;
      port: number;
      motd: string;
      hardcore?: boolean;
      maxPlayers?: number;
      difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
      gamemode?: 'survival' | 'creative' | 'adventure' | 'spectator';
      onlineMode?: boolean;
      pvp?: boolean;
      viewDistance?: number;
      spawnProtection?: number;
    }
  ) => {
    const folder = getDefaultServerFolder(options.name);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const jarPath = path.join(folder, 'server.jar');

    try {
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
      writeServerProperties(folder, {
        port: options.port,
        motd: options.motd || `${options.name} - CraftDock Server`,
        hardcore: options.hardcore ?? false,
        difficulty: options.hardcore ? 'hard' : (options.difficulty || 'normal'),
        gamemode: options.gamemode || 'survival',
        maxPlayers: options.maxPlayers || 20,
        onlineMode: options.onlineMode ?? false,
        pvp: options.pvp ?? true,
        viewDistance: options.viewDistance || 10,
        spawnProtection: options.spawnProtection ?? 16,
      });
      updateServerProperties(
        folder,
        options.port,
        options.motd,
        options.hardcore,
        options.maxPlayers || 20
      );

      const profile: ServerProfile = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: options.name,
        software: options.software,
        version: options.version,
        allocatedRamGb: options.allocatedRamGb,
        storageQuotaGb: options.storageQuotaGb || 0,
        port: options.port,
        path: folder,
        status: 'stopped',
        createdAt: new Date().toISOString(),
        playerCount: 0,
        maxPlayers: options.maxPlayers || 20,
        motd: options.motd || `${options.name} - CraftDock Server`,
        hardcore: options.hardcore ?? false,
      };

      addServer(profile);
      return profile;
    } catch (err: any) {
      console.error('Failed to create server:', err);
      // Clean up newly created folder if jar failed to download
      try {
        if (fs.existsSync(folder) && (!fs.existsSync(jarPath) || fs.statSync(jarPath).size === 0)) {
          fs.rmSync(folder, { recursive: true, force: true });
        }
      } catch (cleanErr) {}
      throw new Error(`Грешка при сваляне/създаване на ${options.software.toUpperCase()} (${options.version}): ${err.message}`);
    }
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
  if (props.storageQuotaGb !== undefined) {
    updates.storageQuotaGb = Number(props.storageQuotaGb) || 0;
  }
  if (props.allocatedRamGb !== undefined) {
    updates.allocatedRamGb = Math.max(1, Number(props.allocatedRamGb) || 2);
  }
  if (props.hardcore !== undefined) {
    updates.hardcore = !!props.hardcore;
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

// Storage and Quota Handlers
ipcMain.handle('get-server-storage', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;
  return calculateServerStorage(server.path, server.id, server.storageQuotaGb || 0);
});

// Modrinth API Handlers
ipcMain.handle('search-modrinth-modpacks', async (_event, query = '', limit = 24) => {
  return await searchModrinthModpacks(query, limit);
});

ipcMain.handle('search-modrinth-resourcepacks', async (_event, query = '', limit = 24) => {
  return await searchModrinthResourcePacks(query, limit);
});

ipcMain.handle('search-modrinth-plugins', async (_event, query = '', limit = 24, software: any = 'paper') => {
  return await searchModrinthPlugins(query, limit, software);
});

ipcMain.handle('get-modrinth-versions', async (_event, projectIdOrSlug: string, loaders?: string[], gameVersion?: string) => {
  return await getModrinthProjectVersions(projectIdOrSlug, loaders, gameVersion);
});

ipcMain.handle('get-modrinth-pack-file', async (_event, projectIdOrSlug: string) => {
  return await getModrinthVersionFile(projectIdOrSlug);
});

ipcMain.handle('install-remote-resourcepack', async (event, id: string, downloadUrl: string, fileName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  const packsDir = getResourcePacksDir(server.path);
  const destPath = path.join(packsDir, fileName);
  await downloadFileWithProgress(downloadUrl, destPath, (percent, downloadedMb, totalMb) => {
    event.sender.send('download-progress', {
      percent,
      downloadedMb,
      totalMb,
      message: `Изтегляне на ресурс пакет: ${fileName} (${percent}%)...`,
    });
  });
  return true;
});

ipcMain.handle('install-remote-plugin', async (event, id: string, downloadUrl: string, fileName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  const pluginsDir = getPluginsDir(server.path);
  const destPath = path.join(pluginsDir, fileName);
  await downloadFileWithProgress(downloadUrl, destPath, (percent, downloadedMb, totalMb) => {
    event.sender.send('download-progress', {
      percent,
      downloadedMb,
      totalMb,
      message: `Инсталиране на плъгин: ${fileName} (${percent}%)...`,
    });
  });
  return true;
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

ipcMain.handle('set-titlebar-theme', async (_event, theme: 'dark' | 'light') => {
  if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) {
    try {
      if (typeof (mainWindow as any).setTitleBarOverlay === 'function') {
        if (theme === 'light') {
          (mainWindow as any).setTitleBarOverlay({
            color: '#ffffff',
            symbolColor: '#0f172a',
            height: 38,
          });
        } else {
          (mainWindow as any).setTitleBarOverlay({
            color: '#070a14',
            symbolColor: '#cbd5e1',
            height: 38,
          });
        }
      }
    } catch (err) {
      console.error('Failed to set titlebar overlay:', err);
    }
  }
  return true;
});

// Global App Settings IPC Handlers
ipcMain.handle('get-app-settings', async () => {
  return loadAppSettings();
});

ipcMain.handle('save-app-settings', async (_event, updates) => {
  return saveAppSettings(updates);
});

ipcMain.handle('get-global-diagnostics', async () => {
  const network = await getNetworkDiagnostics();
  const disk = await getDiskDiagnostics();
  const java = await getSystemJavaVersion();
  return { network, disk, java };
});

ipcMain.handle('open-servers-folder', async () => {
  const serversBase = path.join(getDataDirectory(), 'servers');
  if (!fs.existsSync(serversBase)) {
    fs.mkdirSync(serversBase, { recursive: true });
  }
  await shell.openPath(serversBase);
  return true;
});

ipcMain.handle('open-app-logs', async () => {
  const dataDir = getDataDirectory();
  await shell.openPath(dataDir);
  return true;
});

ipcMain.handle('clear-app-cache', async () => {
  return clearAppCache();
});

ipcMain.handle('uninstall-app', async () => {
  try {
    const dataDir = getDataDirectory();
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('[uninstall-app] Error deleting data dir:', err);
  }
  isQuitting = true;
  app.quit();
  return true;
});

ipcMain.handle('check-for-updates', async () => {
  await checkForUpdatesAndNotify();
  return true;
});

// Periodic live RAM & System Info update (every 2.5s)
setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-info-update', getSystemInfo());
  }
}, 2500);


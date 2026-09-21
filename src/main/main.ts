import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { getSystemInfo } from './system-info';
import { checkForUpdates, startAppUpdate, cancelAppUpdate } from './auto-updater';
import { performUninstallAndErase } from './uninstaller';
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
  getServerById,
  getDefaultServerFolder,
  calculateServerStorage,
  getDataDirectory,
  ServerProfile,
} from './server-store';
import { getSystemJavaVersion, checkJavaStatusForVersion } from './java-manager';
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
  getRawServerProperties,
  saveRawServerProperties,
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
  getServerOps,
  addOp,
  removeOp,
  getServerBans,
  banPlayer,
  pardonPlayer,
  getServerBannedIps,
  banIp,
  pardonIp,
} from './server-config';
import {
  getServerWorlds,
  resetWorld,
  importWorld,
  getWorldBackups,
  deleteWorldBackup,
  restoreWorldBackup,
  exportWorldZip,
} from './world-manager';
import { exportServerArchive, importServerArchive } from './server-transfer';
import { upgradeServerVersion } from './version-upgrader';
import { uptimeTracker, playerTracker, chatTracker, perfTracker } from './analytics';
import { getCrashReports, analyzeCrash } from './crash-analyzer';
import { notifyAutoBackup, sendDesktopNotification, sendTestNotification } from './notification-service';
import { getServerPlayersArchive, getPlayerFullData } from './player-data-service';
import {
  cleanDroppedItems,
  cleanHostileMonsters,
  cleanMinecartsAndBoats,
  checkLagSettings,
  applyOptimalLagSettings,
  runChunkyCommand,
  isChunkyInstalled,
} from './lag-buster-service';
import { putServerToSleep, wakeServer, isServerSleeping } from './sleep-manager';
import { analyzeWorldSlimmer, trimDistantRegions } from './world-slimmer';
import { getWorldSeedInfo, locateNearbyStructures } from './seed-locator';
import {
  initRemoteService,
  stopRemoteService,
  getRemoteServiceStatus,
  toggleRemoteService,
  regenerateRemotePin,
  setRemotePort,
  getRemoteQrSvg,
  startRemoteTunnel,
  stopRemoteTunnel,
} from './remote-service';
import {
  initTaskScheduler,
  getScheduledTasks,
  saveScheduledTask,
  deleteScheduledTask,
  toggleTaskEnabled,
  runTaskNow,
  ScheduledTask,
} from './task-scheduler';

app.name = 'CraftDock';

// Point userData directly to CraftDock and migrate legacy data if present
const appDataRoot = process.env.APPDATA || app.getPath('appData');
const primaryUserData = path.join(appDataRoot, 'CraftDock');
const legacyUserData = path.join(appDataRoot, 'minecraft-server-manager');

try {
  // If legacy folder exists and CraftDock doesn't, migrate servers & settings seamlessly
  const legacyDataDir = path.join(legacyUserData, 'minecraft_servers_data');
  const newDataDir = path.join(primaryUserData, 'minecraft_servers_data');

  if (fs.existsSync(legacyDataDir) && !fs.existsSync(newDataDir)) {
    fs.mkdirSync(primaryUserData, { recursive: true });
    fs.cpSync(legacyDataDir, newDataDir, { recursive: true, force: true });

    const serversJsonPath = path.join(newDataDir, 'servers.json');
    if (fs.existsSync(serversJsonPath)) {
      const raw = fs.readFileSync(serversJsonPath, 'utf-8');
      fs.writeFileSync(serversJsonPath, raw.split('minecraft-server-manager').join('CraftDock'), 'utf-8');
    }
  }

  app.setPath('userData', primaryUserData);
} catch (err) {
  console.warn('[CraftDock] Could not initialize CraftDock userData path:', err);
}

function getResourceIcon(filename: string): string {
  const candidatePaths = [
    path.join(__dirname, '../resources', filename),
    path.join(process.resourcesPath || '', 'resources', filename),
    path.join(process.resourcesPath || '', filename),
    path.join(typeof app.getAppPath === 'function' ? app.getAppPath() : '', 'resources', filename),
    path.resolve(process.cwd(), 'resources', filename),
  ];
  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '../resources', filename);
}

const APP_ID = 'CraftDock';

// Set AppUserModelId for Windows toast notifications & grouping
if (process.platform === 'win32') {
  try {
    app.setAppUserModelId(APP_ID);
  } catch {}

  try {
    const { exec } = require('child_process');
    const iconPng = getResourceIcon('icon.png');
    exec(`reg delete "HKCU\\Software\\Classes\\AppUserModelId\\CraftDoc" /f`);
    exec(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\CraftDoc" /f`);
    exec(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\CraftDock" /v DisplayName /t REG_SZ /d "CraftDock" /f`);
    exec(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\CraftDock" /v IconUri /t REG_SZ /d "${iconPng}" /f`);
    exec(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\com.craftdock.minecraftservermanager" /v DisplayName /t REG_SZ /d "CraftDock" /f`);
    exec(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\com.craftdock.minecraftservermanager" /v IconUri /t REG_SZ /d "${iconPng}" /f`);
  } catch {}

  // Clean up any stale shortcuts in dev mode so Windows Taskbar doesn't get overridden
  try {
    const startMenuPrograms = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const shortcutsToClean = ['CraftDock Dev.lnk', 'Electron.lnk', 'CraftDoc.lnk', 'CraftDoc Dev.lnk'];
    for (const name of shortcutsToClean) {
      const p = path.join(startMenuPrograms, name);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }
  } catch {}
}

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
  const iconPath = getResourceIcon('icon.png');
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
  const iconPngPath = getResourceIcon('icon.png');
  const iconIcoPath = getResourceIcon('icon.ico');
  const hasIco = process.platform === 'win32' && fs.existsSync(iconIcoPath);
  const windowIcon = hasIco
    ? iconIcoPath
    : (fs.existsSync(iconPngPath) ? nativeImage.createFromPath(iconPngPath) : undefined);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    title: 'CraftDock',
    icon: windowIcon,
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

  if (hasIco) {
    try {
      const icoImg = nativeImage.createFromPath(iconIcoPath);
      if (!icoImg.isEmpty()) {
        mainWindow.setIcon(icoImg);
      }
    } catch {}
  } else if (fs.existsSync(iconPngPath)) {
    try {
      mainWindow.setIcon(nativeImage.createFromPath(iconPngPath));
    } catch {}
  }

  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.warn(`[CraftDock] Failed initial loadURL(${devServerUrl}):`, err?.message || err);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Automatic retry in dev mode if Vite was still starting
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[CraftDock] Page failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    if (!app.isPackaged) {
      console.log('[CraftDock] Retrying page load in 1.5s...');
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173').catch(() => {});
        }
      }, 1500);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Safety fallback: Ensure window is shown even if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('[CraftDock] Fallback showing mainWindow after timeout');
      mainWindow.show();
    }
  }, 3500);

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
      checkForUpdates(mainWindow || undefined);
    }
  });

  mainWindow.on('close', (event) => {
    const appSettings = loadAppSettings();
    if (!isQuitting && appSettings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();

      const isBg = appSettings.language === 'bg';
      sendDesktopNotification(
        isBg ? 'CraftDock работи на заден план' : 'CraftDock is running in background',
        isBg ? 'Приложението е минимизирано' : 'Application is minimized'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();
  initRemoteService();
  initTaskScheduler();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopRemoteService();
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

ipcMain.handle('get-raw-server-properties', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return '';
  return getRawServerProperties(server.path);
});

ipcMain.handle('save-raw-server-properties', async (_event, id: string, rawContent: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return saveRawServerProperties(server.path, rawContent);
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
  if (isServerRunning(server.id)) {
    sendServerCommand(server.id, 'save-all');
    await new Promise((r) => setTimeout(r, 1500));
  }
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

ipcMain.handle('add-to-whitelist', async (_event, id: string, name: string, uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  await addToWhitelist(server.path, name, uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `whitelist add ${name}`);
    sendServerCommand(id, 'whitelist reload');
  }
  return true;
});

ipcMain.handle('remove-from-whitelist', async (_event, id: string, name: string, uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  removeFromWhitelist(server.path, name, uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `whitelist remove ${name}`);
    sendServerCommand(id, 'whitelist reload');
  }
  return true;
});

// Operator Management Handlers
ipcMain.handle('get-server-ops', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getServerOps(server.path);
});

ipcMain.handle('add-op', async (_event, id: string, name: string, level = 4, uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  await addOp(server.path, name, level, uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `op ${name}`);
  }
  return true;
});

ipcMain.handle('remove-op', async (_event, id: string, name: string, uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  removeOp(server.path, name, uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `deop ${name}`);
  }
  return true;
});

// Ban Management Handlers
ipcMain.handle('get-server-bans', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getServerBans(server.path);
});

ipcMain.handle('ban-player', async (_event, id: string, name: string, reason = 'Banned by operator', uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  await banPlayer(server.path, name, reason, 'CraftDock', uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `ban ${name} ${reason}`);
  }
  return true;
});

ipcMain.handle('pardon-player', async (_event, id: string, name: string, uuid?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  pardonPlayer(server.path, name, uuid);
  if (isServerRunning(id)) {
    sendServerCommand(id, `pardon ${name}`);
  }
  return true;
});

// Banned IPs Handlers
ipcMain.handle('get-server-banned-ips', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getServerBannedIps(server.path);
});

ipcMain.handle('ban-ip', async (_event, id: string, ip: string, reason = 'Banned by operator') => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  banIp(server.path, ip, reason);
  if (isServerRunning(id)) {
    sendServerCommand(id, `ban-ip ${ip} ${reason}`);
  }
  return true;
});

ipcMain.handle('pardon-ip', async (_event, id: string, ip: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  pardonIp(server.path, ip);
  if (isServerRunning(id)) {
    sendServerCommand(id, `pardon-ip ${ip}`);
  }
  return true;
});

// Player Directory & Inventory Inspector Handlers
ipcMain.handle('get-server-players-archive', async (_event, id: string, onlinePlayerNames: string[] = []) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  let ops: string[] = [];
  let whitelist: string[] = [];
  let bans: string[] = [];
  try {
    const opsData = getServerOps(server.path);
    ops = opsData.map((o) => o.name);
    const wlData = getWhitelist(server.path);
    whitelist = wlData.map((w) => w.name);
    const banData = getServerBans(server.path);
    bans = banData.map((b) => b.name);
  } catch (e) {}
  return getServerPlayersArchive(server.path, onlinePlayerNames, ops, whitelist, bans);
});

ipcMain.handle('get-player-inventory', async (_event, id: string, uuid: string, playerName?: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;

  // If server is currently running, flush memory to disk so recent equipment & inventory are saved
  if (server.status === 'running') {
    try {
      sendServerCommand(id, 'save-all flush');
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch {}
  }

  return getPlayerFullData(server.path, uuid, playerName);
});

// World Manager Handlers
ipcMain.handle('get-server-worlds', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getServerWorlds(server.path);
});

ipcMain.handle('reset-world', async (_event, id: string, worldName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return resetWorld(server.path, worldName);
});

ipcMain.handle('import-world', async (_event, id: string, zipPath: string, targetWorldName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return await importWorld(server.path, zipPath, targetWorldName);
});

ipcMain.handle('get-world-backups', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getWorldBackups(server.path);
});

ipcMain.handle('delete-world-backup', async (_event, id: string, fileName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return deleteWorldBackup(server.path, fileName);
});

ipcMain.handle('restore-world-backup', async (_event, id: string, fileName: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return await restoreWorldBackup(server.path, fileName);
});

ipcMain.handle('update-server-profile', async (_event, id: string, updates: Partial<ServerProfile>) => {
  const updated = updateServer(id, updates);
  if (updated && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server-profile-updated', updated);
  }
  return updated;
});

ipcMain.handle('pick-world-zip', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select World ZIP Archive',
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
    properties: ['openFile'],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// Export World Archive (.zip)
ipcMain.handle('export-world-zip', async (_event, id: string, worldName = 'world') => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server || !mainWindow) return { success: false, error: 'Server not found' };

  const sanitizedName = server.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Експортиране на Minecraft свят (.zip)',
    defaultPath: `${sanitizedName}_${worldName}_${dateStr}.zip`,
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
  });

  if (res.canceled || !res.filePath) {
    return { success: false, canceled: true };
  }

  const result = await exportWorldZip(server.path, worldName, res.filePath);
  if (result.success) {
    const isEn = loadAppSettings().language === 'en';
    sendDesktopNotification(
      isEn ? 'CraftDock — World Exported 🌍' : 'CraftDock — Свят експортиран 🌍',
      isEn
        ? `World "${worldName}" from "${server.name}" was exported successfully (${result.sizeMb} MB).`
        : `Светът «${worldName}» от «${server.name}» беше експортиран успешно (${result.sizeMb} MB).`
    );
  }
  return result;
});

// Server Export & Import Handlers
ipcMain.handle('export-server-zip', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server || !mainWindow) return { success: false, error: 'Server not found' };

  const sanitizedName = server.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const isEn = loadAppSettings().language === 'en';
  const res = await dialog.showSaveDialog(mainWindow, {
    title: isEn ? 'Export Minecraft Server (.zip)' : 'Експортиране на Minecraft сървър (.zip)',
    defaultPath: `${sanitizedName}_backup_${dateStr}.zip`,
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
  });

  if (res.canceled || !res.filePath) {
    return { success: false, canceled: true };
  }

  const result = await exportServerArchive(server.path, server, res.filePath);
  if (result.success) {
    sendDesktopNotification({
      title: isEn ? 'CraftDock — Export Successful 📦' : 'CraftDock — Успешен експорт 📦',
      body: isEn
        ? `Server "${server.name}" was exported successfully (${result.sizeMb} MB).`
        : `Сървърът «${server.name}» беше експортиран успешно (${result.sizeMb} MB).`,
    });
  }
  return result;
});

ipcMain.handle('import-server-zip', async (_event, customZipPath?: string) => {
  if (!mainWindow) return { success: false, error: 'Window not available' };
  let zipPath = customZipPath;
  const isEn = loadAppSettings().language === 'en';

  if (!zipPath) {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: isEn ? 'Import Minecraft Server from .ZIP Archive' : 'Импортиране на Minecraft сървър от .ZIP архив',
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    zipPath = res.filePaths[0];
  }

  const appSettings = loadAppSettings();
  const destDir = appSettings.serversFolder && appSettings.serversFolder.trim() !== ''
    ? appSettings.serversFolder
    : path.join(getDataDirectory(), 'servers');

  const result = await importServerArchive(zipPath, destDir);
  if (result.success && result.profile) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-profile-updated', result.profile);
    }
    sendDesktopNotification({
      title: isEn ? 'CraftDock — New Server Imported! 📥' : 'CraftDock — Нов сървър е импортиран! 📥',
      body: isEn
        ? `Server "${result.profile.name}" was successfully added to your library.`
        : `Сървърът «${result.profile.name}» е добавен успешно към твоята библиотека.`,
    });
  }
  return result;
});

// In-Place Server Version Upgrader
ipcMain.handle('upgrade-server-version', async (event, id: string, targetVersion: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  const isEn = loadAppSettings().language === 'en';
  if (!server) return { success: false, error: isEn ? 'Server not found.' : 'Сървърът не е намерен.' };

  const result = await upgradeServerVersion(server, targetVersion, (progress) => {
    event.sender.send('upgrade-progress', progress);
  });

  if (result.success) {
    const updatedServer = loadServers().find((s) => s.id === id);
    if (updatedServer && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-profile-updated', updatedServer);
    }
    sendDesktopNotification({
      title: isEn ? 'CraftDock — Server Upgraded! 🚀' : 'CraftDock — Сървърът е обновен! 🚀',
      body: isEn
        ? `Server "${server.name}" was successfully upgraded to version v${targetVersion}.`
        : `Сървърът «${server.name}» премина успешно към версия v${targetVersion}.`,
    });
  }

  return result;
});

// Analytics IPC Handlers
ipcMain.handle('get-uptime-history', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;
  return uptimeTracker.getUptimeHistory(server.path, isServerRunning(server.id));
});

ipcMain.handle('get-player-analytics', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return { players: {}, recentSessions: [] };
  return playerTracker.getPlayerAnalytics(server.path);
});

ipcMain.handle('get-chat-history', async (_event, id: string, limit?: number) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return chatTracker.getChatHistory(server.path, limit);
});

ipcMain.handle('clear-chat-history', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return false;
  return chatTracker.clearChatHistory(server.path);
});

ipcMain.handle('get-performance-history', async (_event, id: string, range?: '1h' | '6h' | '24h' | '7d') => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return perfTracker.getPerformanceHistory(server.path, range);
});

// Crash Analyzer & Diagnostics Handlers
ipcMain.handle('get-crash-reports', async (_event, id: string) => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return [];
  return getCrashReports(server.path);
});

ipcMain.handle('analyze-crash', async (_event, id: string, fileName?: string, sessionInfo?: any, requestedLang?: 'bg' | 'en') => {
  const servers = loadServers();
  const server = servers.find((s) => s.id === id);
  if (!server) return null;
  return analyzeCrash(server.path, fileName, sessionInfo, requestedLang);
});

ipcMain.handle('test-startup-sound', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-sound', 'server-ready');
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

ipcMain.handle('check-java-status', async (_event, mcVersion: string) => {
  return await checkJavaStatusForVersion(mcVersion);
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
  return performUninstallAndErase();
});

ipcMain.handle('check-for-updates', async () => {
  const info = await checkForUpdates(mainWindow || undefined);
  return !!info;
});

ipcMain.handle('start-app-update', async () => {
  return startAppUpdate();
});

ipcMain.handle('cancel-app-update', async () => {
  return cancelAppUpdate();
});

ipcMain.handle('send-test-notification', async (_event, lang?: 'bg' | 'en') => {
  return sendTestNotification(lang);
});

// Lag Buster Handlers
ipcMain.handle('clean-dropped-items', async (_event, serverId: string) => {
  return cleanDroppedItems(serverId);
});

ipcMain.handle('clean-hostile-monsters', async (_event, serverId: string) => {
  return cleanHostileMonsters(serverId);
});

ipcMain.handle('clean-minecarts-boats', async (_event, serverId: string) => {
  return cleanMinecartsAndBoats(serverId);
});

ipcMain.handle('check-lag-settings', async (_event, serverId: string) => {
  return checkLagSettings(serverId);
});

ipcMain.handle('apply-optimal-lag-settings', async (_event, serverId: string) => {
  return applyOptimalLagSettings(serverId);
});

ipcMain.handle('run-chunky-command', async (_event, serverId: string, action: 'radius' | 'start' | 'pause' | 'cancel', radius?: number) => {
  return runChunkyCommand(serverId, action, radius);
});

ipcMain.handle('is-chunky-installed', async (_event, serverId: string) => {
  const server = getServerById(serverId);
  if (!server) return false;
  return isChunkyInstalled(server.path);
});

// Smart Sleep Handlers
ipcMain.handle('put-server-to-sleep', async (_event, serverId: string) => {
  return putServerToSleep(serverId);
});

ipcMain.handle('wake-server', async (_event, serverId: string) => {
  return wakeServer(serverId);
});

ipcMain.handle('is-server-sleeping', async (_event, serverId: string) => {
  return isServerSleeping(serverId);
});

// World Slimmer Handlers
ipcMain.handle('analyze-world-slimmer', async (_event, serverId: string, radiusBlocks?: number) => {
  return analyzeWorldSlimmer(serverId, radiusBlocks);
});

ipcMain.handle('trim-distant-regions', async (_event, serverId: string, radiusBlocks?: number) => {
  return trimDistantRegions(serverId, radiusBlocks);
});

// Periodic live RAM & System Info update (every 2.5s)
setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-info-update', getSystemInfo());
  }
}, 2500);

// Auto-Backup Timer: checks every 60 seconds
setInterval(async () => {
  try {
    const servers = loadServers();
    const now = Date.now();

    for (const server of servers) {
      if (server.autoBackupEnabled) {
        const intervalHours = server.autoBackupIntervalHours || 6;
        const intervalMs = intervalHours * 3600 * 1000;
        const lastBackupTime = server.lastAutoBackupAt ? new Date(server.lastAutoBackupAt).getTime() : 0;

        if (now - lastBackupTime >= intervalMs) {
          console.log(`[Auto-Backup] Creating scheduled backup for server "${server.name}" (every ${intervalHours}h)...`);
          if (isServerRunning(server.id)) {
            sendServerCommand(server.id, 'save-all');
          }

          const backupFileName = createWorldBackup(server.path);
          if (backupFileName) {
            updateServer(server.id, { lastAutoBackupAt: new Date().toISOString() });

            // Enforce retention limit (clean up older backups)
            const retentionCount = server.autoBackupRetentionCount || 5;
            const existingBackups = getWorldBackups(server.path);
            if (existingBackups.length > retentionCount) {
              existingBackups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const toDeleteCount = existingBackups.length - retentionCount;
              for (let i = 0; i < toDeleteCount; i++) {
                deleteWorldBackup(server.path, existingBackups[i].fileName);
              }
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('auto-backup-completed', {
                serverId: server.id,
                serverName: server.name,
                fileName: backupFileName,
              });
            }

            // Desktop notification on backup
            notifyAutoBackup(server.name, backupFileName);
          }
        }
      }
    }
  } catch (err) {
    console.error('Auto-backup loop error:', err);
  }
}, 60 * 1000);

// Mobile Remote Service Handlers
ipcMain.handle('get-remote-status', async () => {
  return getRemoteServiceStatus();
});

ipcMain.handle('toggle-remote-service', async (_event, enabled: boolean) => {
  return toggleRemoteService(enabled);
});

ipcMain.handle('regenerate-remote-pin', async () => {
  return regenerateRemotePin();
});

ipcMain.handle('set-remote-port', async (_event, port: number) => {
  return setRemotePort(port);
});

ipcMain.handle('get-remote-qr-svg', async (_event, mode?: 'local' | 'public') => {
  return getRemoteQrSvg(mode);
});

ipcMain.handle('start-remote-tunnel', async () => {
  return startRemoteTunnel();
});

ipcMain.handle('stop-remote-tunnel', async () => {
  return stopRemoteTunnel();
});

// Task Scheduler Handlers
ipcMain.handle('get-scheduled-tasks', async () => {
  return getScheduledTasks();
});

ipcMain.handle('save-scheduled-task', async (_event, task: ScheduledTask) => {
  return saveScheduledTask(task);
});

ipcMain.handle('delete-scheduled-task', async (_event, taskId: string) => {
  return deleteScheduledTask(taskId);
});

ipcMain.handle('toggle-task-enabled', async (_event, taskId: string, enabled: boolean) => {
  return toggleTaskEnabled(taskId, enabled);
});

ipcMain.handle('run-task-now', async (_event, taskId: string) => {
  return runTaskNow(taskId);
});

// Seed Map & Structure Locator Handlers
ipcMain.handle('get-world-seed', async (_event, serverId: string) => {
  const server = getServerById(serverId);
  if (!server) return null;
  return getWorldSeedInfo(server.path, server.version);
});

ipcMain.handle(
  'locate-structures',
  async (
    _event,
    seed: string,
    dimension: 'overworld' | 'nether' | 'the_end' = 'overworld',
    originX = 0,
    originZ = 0,
    maxRadius = 6000
  ) => {
    return locateNearbyStructures(seed, dimension, originX, originZ, maxRadius);
  }
);



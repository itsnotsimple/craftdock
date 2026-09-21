import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDataDirectory } from './server-store';

export interface AppSettings {
  // Java
  customJavaPath: string; // empty string means auto-detect
  useAikarFlags: boolean; // default true
  // Folders
  serversFolder: string; // empty string means default
  backupsFolder: string; // empty string means default
  // Network
  defaultPort: number; // default 25565
  // Automation
  autoRestartOnCrash: boolean; // default true
  autoStartLastServer: boolean; // default true
  autoStartPlayitTunnel: boolean; // default true — auto launch Playit tunnel on server start
  autoUpdate: boolean; // default true — check GitHub releases on launch
  minimizeToTray: boolean; // default true — close button hides to system tray
  hasSeenTrayNotice?: boolean; // track whether 1-time tray notification was shown
  // Smart Sleep Mode
  sleepModeEnabled: boolean; // default true — Auto-Hibernate when empty
  sleepIdleMinutes: number; // default 5 minutes
  // Notifications & Sound
  soundOnStartup: boolean; // default true — Minecraft chime on server ready
  notifyOnServerReady: boolean; // default false — Desktop notification on ready
  notifyOnPlayerJoinLeave: boolean; // default false — Desktop notification on join/leave
  notifyOnCrash: boolean; // default false — Desktop notification on crash
  notifyOnBackup: boolean; // default false — Desktop notification on auto-backup
  // Mobile Remote Web
  remoteServiceEnabled: boolean; // default true
  remoteServicePort: number; // default 25577
  remoteServicePin: string; // 4-digit PIN, e.g. '4829'
  // Appearance & Language
  theme: 'dark' | 'light';
  language: 'bg' | 'en';
}

const DEFAULT_SETTINGS: AppSettings = {
  customJavaPath: '',
  useAikarFlags: true,
  serversFolder: '',
  backupsFolder: '',
  defaultPort: 25565,
  autoRestartOnCrash: true,
  autoStartLastServer: true,
  autoStartPlayitTunnel: true,
  autoUpdate: true,
  minimizeToTray: true,
  hasSeenTrayNotice: false,
  sleepModeEnabled: true,
  sleepIdleMinutes: 5,
  soundOnStartup: true,
  notifyOnServerReady: false,
  notifyOnPlayerJoinLeave: false,
  notifyOnCrash: false,
  notifyOnBackup: false,
  remoteServiceEnabled: true,
  remoteServicePort: 25577,
  remoteServicePin: '',
  theme: 'dark',
  language: 'bg',
};

let cachedSettings: AppSettings | null = null;

function getSettingsFilePath(): string {
  const dataDir = getDataDirectory();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'app-settings.json');
}

export function loadAppSettings(): AppSettings {
  if (cachedSettings) {
    return cachedSettings;
  }
  try {
    const filePath = getSettingsFilePath();
    if (!fs.existsSync(filePath)) {
      cachedSettings = { ...DEFAULT_SETTINGS };
      saveAppSettings(cachedSettings);
      return cachedSettings;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const loaded: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
    cachedSettings = loaded;
    return loaded;
  } catch (e) {
    console.error('Failed to load app settings:', e);
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

export function saveAppSettings(updates: Partial<AppSettings>): AppSettings {
  const current = loadAppSettings();
  const next: AppSettings = {
    ...current,
    ...updates,
  };
  try {
    const filePath = getSettingsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
    cachedSettings = next;
  } catch (e) {
    console.error('Failed to save app settings:', e);
  }
  return next;
}

export async function getNetworkDiagnostics(): Promise<{
  localIps: Array<{ interfaceName: string; ip: string }>;
  publicIp: string;
}> {
  const localIps: Array<{ interfaceName: string; ip: string }> = [];
  const interfaces = os.networkInterfaces();

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push({
          interfaceName: name,
          ip: net.address,
        });
      }
    }
  }

  let publicIp = 'Fetching...';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as { ip: string };
      publicIp = data.ip;
    } else {
      publicIp = 'Unavailable';
    }
  } catch (e) {
    publicIp = 'Offline / Hidden';
  }

  return { localIps, publicIp };
}

export async function getDiskDiagnostics(targetFolder?: string): Promise<{
  totalGb: number;
  freeGb: number;
  usedGb: number;
  serversSizeMb: number;
}> {
  const dataDir = targetFolder || path.join(getDataDirectory(), 'servers');
  let totalGb = 0;
  let freeGb = 0;
  let usedGb = 0;

  try {
    const checkPath = fs.existsSync(dataDir) ? dataDir : path.parse(process.cwd()).root;
    const stats = await fs.promises.statfs(checkPath);
    totalGb = Math.round((stats.bsize * stats.blocks) / (1024 * 1024 * 1024));
    freeGb = Math.round((stats.bsize * stats.bfree) / (1024 * 1024 * 1024));
    usedGb = Math.max(0, totalGb - freeGb);
  } catch (e) {
    console.warn('Failed to query disk statfs:', e);
  }

  let serversSizeMb = 0;
  try {
    const serversBase = path.join(getDataDirectory(), 'servers');
    if (fs.existsSync(serversBase)) {
      const getDirSize = (dir: string): number => {
        let size = 0;
        try {
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const full = path.join(dir, file.name);
            if (file.isDirectory()) {
              size += getDirSize(full);
            } else if (file.isFile()) {
              try {
                size += fs.statSync(full).size;
              } catch (e) {}
            }
          }
        } catch (e) {}
        return size;
      };
      serversSizeMb = Math.round((getDirSize(serversBase) / (1024 * 1024)) * 10) / 10;
    }
  } catch (e) {}

  return { totalGb, freeGb, usedGb, serversSizeMb };
}

export function clearAppCache(): { freedMb: number } {
  let freedBytes = 0;
  const dataDir = getDataDirectory();

  try {
    const files = fs.readdirSync(dataDir);
    for (const f of files) {
      if (f.startsWith('temurin_') && (f.endsWith('.zip') || f.endsWith('.tar.gz'))) {
        const full = path.join(dataDir, f);
        try {
          freedBytes += fs.statSync(full).size;
          fs.unlinkSync(full);
        } catch (e) {}
      }
    }
  } catch (e) {}

  return { freedMb: Math.round((freedBytes / (1024 * 1024)) * 10) / 10 };
}

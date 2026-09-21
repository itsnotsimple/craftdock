import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';

export interface ServerProfile {
  id: string;
  name: string;
  software: 'paper' | 'purpur' | 'vanilla' | 'fabric';
  version: string;
  buildNumber?: string;
  allocatedRamGb: number;
  storageQuotaGb?: number;
  port: number;
  path: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'sleeping';
  createdAt: string;
  lastPlayedAt?: string;
  playerCount: number;
  maxPlayers: number;
  motd: string;
  hardcore?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  autoBackupRetentionCount?: number;
  lastAutoBackupAt?: string;
  cardTheme?: string;
  cardIcon?: string;
}

export interface ServerStorageStats {
  serverId: string;
  worldMb: number;
  pluginsMb: number;
  backupsMb: number;
  logsMb: number;
  otherMb: number;
  totalMb: number;
  quotaGb: number;
}

export function getDataDirectory(): string {
  try {
    if (app && app.getPath) {
      return path.join(app.getPath('userData'), 'minecraft_servers_data');
    }
  } catch (e) {
    // fallback if app is not yet initialized
  }
  return path.join(os.homedir(), '.minecraft_server_manager');
}

function getStoreFilePath(): string {
  const dataDir = getDataDirectory();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'servers.json');
}

export function getDefaultServerFolder(serverName: string): string {
  const sanitized = serverName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const serversBaseDir = path.join(getDataDirectory(), 'servers');
  if (!fs.existsSync(serversBaseDir)) {
    fs.mkdirSync(serversBaseDir, { recursive: true });
  }
  return path.join(serversBaseDir, `${sanitized}_${Date.now()}`);
}

let cachedServers: ServerProfile[] | null = null;

export function loadServers(): ServerProfile[] {
  if (cachedServers) {
    return cachedServers;
  }
  try {
    const filePath = getStoreFilePath();
    if (!fs.existsSync(filePath)) {
      cachedServers = [];
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const servers = JSON.parse(raw) as ServerProfile[];
    // Mark servers as stopped on initial cold boot
    cachedServers = servers.map(s => ({ ...s, status: 'stopped', playerCount: 0 }));
    return cachedServers;
  } catch (err) {
    console.error('Error loading servers:', err);
    return [];
  }
}

export function getServerById(id: string): ServerProfile | undefined {
  return loadServers().find((s) => s.id === id);
}

export function saveServers(servers: ServerProfile[]): void {
  try {
    cachedServers = servers;
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(servers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving servers:', err);
  }
}

export function addServer(profile: ServerProfile): void {
  const servers = loadServers();
  servers.push(profile);
  saveServers(servers);
}

export function updateServer(id: string, updates: Partial<ServerProfile>): ServerProfile | null {
  const servers = loadServers();
  const index = servers.findIndex(s => s.id === id);
  if (index === -1) return null;
  servers[index] = { ...servers[index], ...updates };
  saveServers(servers);
  return servers[index];
}

export function deleteServer(id: string, deleteFiles = false): boolean {
  const servers = loadServers();
  const server = servers.find(s => s.id === id);
  if (!server) return false;

  if (deleteFiles && fs.existsSync(server.path)) {
    try {
      fs.rmSync(server.path, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to delete server directory:', e);
    }
  }

  const filtered = servers.filter(s => s.id !== id);
  saveServers(filtered);
  return true;
}

function getDirectorySizeBytes(dirPath: string): number {
  let bytes = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          bytes += getDirectorySizeBytes(fullPath);
        } else if (entry.isFile()) {
          const st = fs.statSync(fullPath);
          bytes += st.size;
        }
      } catch {
        // ignore errors on locked files
      }
    }
  } catch {
    // ignore
  }
  return bytes;
}

export function calculateServerStorage(serverPath: string, serverId: string, quotaGb = 0): ServerStorageStats {
  if (!fs.existsSync(serverPath)) {
    return {
      serverId,
      worldMb: 0,
      pluginsMb: 0,
      backupsMb: 0,
      logsMb: 0,
      otherMb: 0,
      totalMb: 0,
      quotaGb,
    };
  }

  // World folders (world, world_nether, world_the_end)
  let worldBytes = 0;
  const worldFolders = ['world', 'world_nether', 'world_the_end'];
  for (const wf of worldFolders) {
    const p = path.join(serverPath, wf);
    if (fs.existsSync(p)) {
      worldBytes += getDirectorySizeBytes(p);
    }
  }

  // Plugins & Mods
  let pluginsBytes = 0;
  const pluginsPath = path.join(serverPath, 'plugins');
  const modsPath = path.join(serverPath, 'mods');
  if (fs.existsSync(pluginsPath)) pluginsBytes += getDirectorySizeBytes(pluginsPath);
  if (fs.existsSync(modsPath)) pluginsBytes += getDirectorySizeBytes(modsPath);

  // Backups
  let backupsBytes = 0;
  const backupsPath = path.join(serverPath, 'backups');
  if (fs.existsSync(backupsPath)) backupsBytes += getDirectorySizeBytes(backupsPath);

  // Logs
  let logsBytes = 0;
  const logsPath = path.join(serverPath, 'logs');
  if (fs.existsSync(logsPath)) logsBytes += getDirectorySizeBytes(logsPath);

  // Total folder size
  const totalBytes = getDirectorySizeBytes(serverPath);

  const toMb = (b: number) => Math.round((b / (1024 * 1024)) * 10) / 10;
  const worldMb = toMb(worldBytes);
  const pluginsMb = toMb(pluginsBytes);
  const backupsMb = toMb(backupsBytes);
  const logsMb = toMb(logsBytes);
  const totalMb = toMb(totalBytes);
  const knownMb = worldMb + pluginsMb + backupsMb + logsMb;
  const otherMb = Math.max(0, Math.round((totalMb - knownMb) * 10) / 10);

  return {
    serverId,
    worldMb,
    pluginsMb,
    backupsMb,
    logsMb,
    otherMb,
    totalMb,
    quotaGb,
  };
}

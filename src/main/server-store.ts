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
  port: number;
  path: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  createdAt: string;
  lastPlayedAt?: string;
  playerCount: number;
  maxPlayers: number;
  motd: string;
}

function getDataDirectory(): string {
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

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { downloadFileWithProgress } from './api-service';

export interface ServerProperties {
  port?: number;
  onlineMode: boolean;
  whiteList: boolean;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  pvp: boolean;
  viewDistance: number;
  simulationDistance?: number;
  maxPlayers: number;
  motd: string;
  spawnProtection: number;
  hardcore?: boolean;
  resourcePack?: string;
  resourcePackSha1?: string;
  requireResourcePack?: boolean;
  resourcePackPrompt?: string;
}

export interface InstalledPlugin {
  name: string;
  fileName: string;
  sizeMb: number;
  lastModified: string;
}

export interface CuratedPlugin {
  id: string;
  name: string;
  description: string;
  category: 'crossplay' | 'admin' | 'performance' | 'tools' | 'customization';
  recommended: boolean;
  downloadUrl: string;
  fileName: string;
}

export const CURATED_PLUGINS: CuratedPlugin[] = [
  {
    id: 'skinsrestorer',
    name: 'SkinsRestorer (Скинове за Всички)',
    description: 'Възстановява и показва скиновете на всички играчи при пиратски/offline сървъри. Поддържа команда /skin <име>!',
    category: 'customization',
    recommended: true,
    downloadUrl: 'https://github.com/SkinsRestorer/SkinsRestorer/releases/download/15.12.5/SkinsRestorer.jar',
    fileName: 'SkinsRestorer.jar',
  },
  {
    id: 'geyser',
    name: 'GeyserMC (Кросплей)',
    description: 'Позволява на приятели от мобилен телефон (iOS/Android) и конзоли да играят в твоя Java сървър!',
    category: 'crossplay',
    recommended: true,
    downloadUrl: 'https://download.geysermc.org/v2/projects/geyser/versions/latest/builds/latest/downloads/spigot',
    fileName: 'Geyser-Spigot.jar',
  },
  {
    id: 'floodgate',
    name: 'Floodgate (Без Java акаунт за Bedrock)',
    description: 'Работи с Geyser – приятелите от телефон влизат директно с техния Xbox/Microsoft акаунт без нужда от купен Java профил.',
    category: 'crossplay',
    recommended: true,
    downloadUrl: 'https://download.geysermc.org/v2/projects/floodgate/versions/latest/builds/latest/downloads/spigot',
    fileName: 'floodgate-spigot.jar',
  },
  {
    id: 'essentialsx',
    name: 'EssentialsX',
    description: 'Основни команди за сървър: /sethome, /home, /spawn, /tpa, /warp, /back, баланс и икономика.',
    category: 'admin',
    recommended: true,
    downloadUrl: 'https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar',
    fileName: 'EssentialsX-2.20.1.jar',
  },
  {
    id: 'viaversion',
    name: 'ViaVersion',
    description: 'Позволява на приятели с по-нови или по-стари версии на играта да влизат в твоя сървър.',
    category: 'tools',
    recommended: true,
    downloadUrl: 'https://hangarcdn.papermc.io/plugins/ViaVersion/ViaVersion/versions/5.2.1/PAPER/ViaVersion-5.2.1.jar',
    fileName: 'ViaVersion-5.2.1.jar',
  },
  {
    id: 'chunky',
    name: 'Chunky (Премахва Лага при Летене)',
    description: 'Предварително генерира чанковете на картата преди да играете, така че бързото летене и тичане да не товари сървъра.',
    category: 'performance',
    recommended: true,
    downloadUrl: 'https://hangarcdn.papermc.io/plugins/pop4959/Chunky/versions/1.4.28/PAPER/Chunky-1.4.28.jar',
    fileName: 'Chunky-1.4.28.jar',
  },
];

export function readServerProperties(serverDir: string): ServerProperties {
  const filePath = path.join(serverDir, 'server.properties');
  const defaults: ServerProperties = {
    onlineMode: true,
    whiteList: false,
    difficulty: 'normal',
    gamemode: 'survival',
    pvp: true,
    viewDistance: 10,
    maxPlayers: 20,
    motd: 'CraftDock Minecraft Server',
    spawnProtection: 16,
  };

  if (!fs.existsSync(filePath)) return defaults;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const map: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      map[key] = val;
    }
  }

  return {
    port: parseInt(map['server-port'] || '25565', 10),
    onlineMode: map['online-mode'] !== 'false',
    whiteList: map['white-list'] === 'true',
    difficulty: (map['difficulty'] as any) || 'normal',
    gamemode: (map['gamemode'] as any) || 'survival',
    pvp: map['pvp'] !== 'false',
    viewDistance: parseInt(map['view-distance'] || '10', 10),
    simulationDistance: parseInt(map['simulation-distance'] || map['view-distance'] || '10', 10),
    maxPlayers: parseInt(map['max-players'] || '20', 10),
    motd: (map['motd'] || defaults.motd).replace(/\\n/g, '\n'),
    spawnProtection: parseInt(map['spawn-protection'] || '16', 10),
    hardcore: map['hardcore'] === 'true',
    resourcePack: map['resource-pack'] || '',
    resourcePackSha1: map['resource-pack-sha1'] || '',
    requireResourcePack: map['require-resource-pack'] === 'true',
    resourcePackPrompt: map['resource-pack-prompt'] || '',
  };
}

export function writeServerProperties(serverDir: string, props: Partial<ServerProperties>): void {
  const filePath = path.join(serverDir, 'server.properties');
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split(/\r?\n/) : [];

  const map: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      map[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }

  if (props.port !== undefined) {
    map['server-port'] = String(props.port);
    map['query.port'] = String(props.port);
  }

  if (props.onlineMode !== undefined) map['online-mode'] = String(props.onlineMode);
  if (props.whiteList !== undefined) {
    map['white-list'] = String(props.whiteList);
    map['enforce-whitelist'] = String(props.whiteList);
  }
  if (props.hardcore !== undefined) {
    map['hardcore'] = String(props.hardcore);
    if (props.hardcore) {
      map['difficulty'] = 'hard';
    }
  }
  if (props.difficulty !== undefined && !props.hardcore) map['difficulty'] = String(props.difficulty);
  if (props.gamemode !== undefined) map['gamemode'] = String(props.gamemode);
  if (props.pvp !== undefined) map['pvp'] = String(props.pvp);
  if (props.viewDistance !== undefined) {
    map['view-distance'] = String(props.viewDistance);
    map['simulation-distance'] = String(props.simulationDistance ?? props.viewDistance);
  }
  if (props.maxPlayers !== undefined) map['max-players'] = String(props.maxPlayers);
  if (props.motd !== undefined) map['motd'] = String(props.motd).replace(/\r?\n/g, '\\n');
  if (props.spawnProtection !== undefined) map['spawn-protection'] = String(props.spawnProtection);
  if (props.resourcePack !== undefined) map['resource-pack'] = props.resourcePack;
  if (props.resourcePackSha1 !== undefined) map['resource-pack-sha1'] = props.resourcePackSha1;
  if (props.requireResourcePack !== undefined) map['require-resource-pack'] = String(props.requireResourcePack);
  if (props.resourcePackPrompt !== undefined) map['resource-pack-prompt'] = props.resourcePackPrompt;

  const output = [
    '# Minecraft server properties',
    `# Modified by CraftDock on ${new Date().toISOString()}`,
    ...Object.entries(map).map(([k, v]) => `${k}=${v}`),
  ].join('\n');

  fs.writeFileSync(filePath, output + '\n', 'utf-8');
}

export function getPluginsDir(serverDir: string): string {
  const pluginsDir = path.join(serverDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, { recursive: true });
  }
  return pluginsDir;
}

export function getResourcePacksDir(serverDir: string): string {
  const dir = path.join(serverDir, 'resourcepacks');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getInstalledPlugins(serverDir: string): InstalledPlugin[] {
  const pluginsDir = getPluginsDir(serverDir);
  try {
    const files = fs.readdirSync(pluginsDir);
    return files
      .filter((f) => f.endsWith('.jar'))
      .map((fileName) => {
        const fullPath = path.join(pluginsDir, fileName);
        const stats = fs.statSync(fullPath);
        return {
          name: fileName.replace(/\.jar$/i, ''),
          fileName,
          sizeMb: Math.round((stats.size / (1024 * 1024)) * 10) / 10,
          lastModified: stats.mtime.toLocaleDateString(),
        };
      });
  } catch (e) {
    return [];
  }
}

export async function installPluginFromUrl(
  serverDir: string,
  downloadUrl: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const destPath = path.join(getPluginsDir(serverDir), fileName);
  await downloadFileWithProgress(downloadUrl, destPath, (p) => {
    if (onProgress) onProgress(p);
  });
}

export function deletePlugin(serverDir: string, fileName: string): boolean {
  const target = path.join(getPluginsDir(serverDir), fileName);
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

export function createWorldBackup(serverDir: string): string {
  const backupsDir = path.join(serverDir, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `backup_${timestamp}.zip`;
  const backupPath = path.join(backupsDir, backupFileName);

  const worldDir = path.join(serverDir, 'world');
  if (fs.existsSync(worldDir)) {
    try {
      execSync(`tar -a -cf "${backupPath}" -C "${serverDir}" world`, { stdio: 'ignore' });
      return backupFileName;
    } catch (e) {
      console.error('Failed to create backup:', e);
    }
  }
  return '';
}

export interface WhitelistEntry {
  name: string;
  uuid?: string;
}

export function isServerOnlineMode(serverDir: string): boolean {
  const propPath = path.join(serverDir, 'server.properties');
  if (fs.existsSync(propPath)) {
    const content = fs.readFileSync(propPath, 'utf-8');
    const match = content.match(/^online-mode=(true|false)/m);
    if (match) {
      return match[1] === 'true';
    }
  }
  return false;
}

export function getOfflinePlayerUuid(username: string): string {
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30; // version 3
  hash[8] = (hash[8] & 0x3f) | 0x80; // IETF variant
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function getMojangPlayerUuid(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { id?: string; name?: string };
      if (data?.id && data.id.length === 32) {
        const id = data.id;
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;
      }
    }
  } catch (e) {}
  return null;
}

export async function resolvePlayerUuid(serverDir: string, username: string): Promise<string> {
  const isOnline = isServerOnlineMode(serverDir);
  if (isOnline) {
    const mojangUuid = await getMojangPlayerUuid(username);
    if (mojangUuid) return mojangUuid;
  }
  return getOfflinePlayerUuid(username);
}

export function getWhitelist(serverDir: string): WhitelistEntry[] {
  const filePath = path.join(serverDir, 'whitelist.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        name: typeof item === 'string' ? item : item.name || 'Unknown',
        uuid: item.uuid,
      }));
    }
  } catch (e) {}
  return [];
}

export async function syncWhitelistUuids(serverDir: string): Promise<WhitelistEntry[]> {
  const filePath = path.join(serverDir, 'whitelist.json');
  if (!fs.existsSync(filePath)) return [];
  const current = getWhitelist(serverDir);
  if (current.length === 0) return current;

  const isOnline = isServerOnlineMode(serverDir);
  let changed = false;

  for (const entry of current) {
    const offlineUuid = getOfflinePlayerUuid(entry.name);
    if (!isOnline) {
      if (entry.uuid !== offlineUuid) {
        entry.uuid = offlineUuid;
        changed = true;
      }
    } else {
      if (!entry.uuid || entry.uuid === '' || entry.uuid === offlineUuid) {
        const mojangUuid = await getMojangPlayerUuid(entry.name);
        if (mojangUuid && entry.uuid !== mojangUuid) {
          entry.uuid = mojangUuid;
          changed = true;
        } else if (!entry.uuid) {
          entry.uuid = offlineUuid;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  }

  return current;
}

export async function addToWhitelist(serverDir: string, name: string): Promise<WhitelistEntry[]> {
  const filePath = path.join(serverDir, 'whitelist.json');
  const current = getWhitelist(serverDir);
  const uuid = await resolvePlayerUuid(serverDir, name);

  const existingIndex = current.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    current[existingIndex].uuid = uuid;
  } else {
    current.push({ name, uuid });
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  return current;
}

export function removeFromWhitelist(serverDir: string, name: string): WhitelistEntry[] {
  const filePath = path.join(serverDir, 'whitelist.json');
  const current = getWhitelist(serverDir);
  const filtered = current.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}

export interface SavedResourcePack {
  id: string;
  name: string;
  url: string;
  sha1?: string;
  required: boolean;
  prompt?: string;
  addedAt: string;
}

export function getSavedResourcePacks(serverDir: string): SavedResourcePack[] {
  const filePath = path.join(serverDir, 'resource-packs.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as SavedResourcePack[];
  } catch (e) {
    return [];
  }
}

export function saveResourcePacksList(serverDir: string, list: SavedResourcePack[]): void {
  const filePath = path.join(serverDir, 'resource-packs.json');
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
}

export function getServerIcon(serverDir: string): string | null {
  const iconPath = path.join(serverDir, 'server-icon.png');
  if (!fs.existsSync(iconPath)) return null;
  try {
    const data = fs.readFileSync(iconPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch (e) {
    return null;
  }
}

export function setServerIcon(serverDir: string, base64Data: string): boolean {
  try {
    const iconPath = path.join(serverDir, 'server-icon.png');
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    fs.writeFileSync(iconPath, buffer);
    return true;
  } catch (e) {
    console.error('Failed to save server icon:', e);
    return false;
  }
}

export function removeServerIcon(serverDir: string): boolean {
  try {
    const iconPath = path.join(serverDir, 'server-icon.png');
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
    }
    return true;
  } catch (e) {
    return false;
  }
}




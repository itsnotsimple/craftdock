import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { downloadFileWithProgress } from './api-service';

export interface ServerProperties {
  // Core
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

  // World Generation
  levelSeed?: string;
  levelType?: string;
  generateStructures?: boolean;
  generatorSettings?: string;
  maxWorldSize?: number;

  // Gameplay
  allowFlight?: boolean;
  allowNether?: boolean;
  enableCommandBlock?: boolean;
  forceGamemode?: boolean;
  spawnNpcs?: boolean;
  spawnAnimals?: boolean;
  spawnMonsters?: boolean;
  playerIdleTimeout?: number;
  maxBuildHeight?: number;

  // Network
  networkCompressionThreshold?: number;
  rateLimitPacketsPerSecond?: number;
  enableStatus?: boolean;
  enableQuery?: boolean;
  queryPort?: number;
  enableRcon?: boolean;
  rconPort?: number;
  rconPassword?: string;

  // Advanced
  entityBroadcastRangePercentage?: number;
  functionPermissionLevel?: number;
  opPermissionLevel?: number;
  syncChunkWrites?: boolean;
  textFilteringConfig?: string;
  logIps?: boolean;
  hideOnlinePlayers?: boolean;
  enforceSecureProfile?: boolean;
  preventProxyConnections?: boolean;
  maxTickTime?: number;
}

// Ops / Bans types
export interface OpEntry {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit: boolean;
}

export interface BanEntry {
  uuid?: string;
  name: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
}

export interface BanIpEntry {
  ip: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
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

    // World Generation
    levelSeed: map['level-seed'] || '',
    levelType: map['level-type'] || 'minecraft\\:normal',
    generateStructures: map['generate-structures'] !== 'false',
    generatorSettings: map['generator-settings'] || '',
    maxWorldSize: parseInt(map['max-world-size'] || '29999984', 10),

    // Gameplay
    allowFlight: map['allow-flight'] === 'true',
    allowNether: map['allow-nether'] !== 'false',
    enableCommandBlock: map['enable-command-block'] === 'true',
    forceGamemode: map['force-gamemode'] === 'true',
    spawnNpcs: map['spawn-npcs'] !== 'false',
    spawnAnimals: map['spawn-animals'] !== 'false',
    spawnMonsters: map['spawn-monsters'] !== 'false',
    playerIdleTimeout: parseInt(map['player-idle-timeout'] || '0', 10),
    maxBuildHeight: parseInt(map['max-build-height'] || '256', 10),

    // Network
    networkCompressionThreshold: parseInt(map['network-compression-threshold'] || '256', 10),
    rateLimitPacketsPerSecond: parseInt(map['rate-limit'] || '0', 10),
    enableStatus: map['enable-status'] !== 'false',
    enableQuery: map['enable-query'] === 'true',
    queryPort: parseInt(map['query.port'] || map['server-port'] || '25565', 10),
    enableRcon: map['enable-rcon'] === 'true',
    rconPort: parseInt(map['rcon.port'] || '25575', 10),
    rconPassword: map['rcon.password'] || '',

    // Advanced
    entityBroadcastRangePercentage: parseInt(map['entity-broadcast-range-percentage'] || '100', 10),
    functionPermissionLevel: parseInt(map['function-permission-level'] || '2', 10),
    opPermissionLevel: parseInt(map['op-permission-level'] || '4', 10),
    syncChunkWrites: map['sync-chunk-writes'] !== 'false',
    textFilteringConfig: map['text-filtering-config'] || '',
    logIps: map['log-ips'] !== 'false',
    hideOnlinePlayers: map['hide-online-players'] === 'true',
    enforceSecureProfile: map['enforce-secure-profile'] !== 'false',
    preventProxyConnections: map['prevent-proxy-connections'] === 'true',
    maxTickTime: parseInt(map['max-tick-time'] || '60000', 10),
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

  // World Generation
  if (props.levelSeed !== undefined) map['level-seed'] = props.levelSeed;
  if (props.levelType !== undefined) map['level-type'] = props.levelType;
  if (props.generateStructures !== undefined) map['generate-structures'] = String(props.generateStructures);
  if (props.generatorSettings !== undefined) map['generator-settings'] = props.generatorSettings;
  if (props.maxWorldSize !== undefined) map['max-world-size'] = String(props.maxWorldSize);

  // Gameplay
  if (props.allowFlight !== undefined) map['allow-flight'] = String(props.allowFlight);
  if (props.allowNether !== undefined) map['allow-nether'] = String(props.allowNether);
  if (props.enableCommandBlock !== undefined) map['enable-command-block'] = String(props.enableCommandBlock);
  if (props.forceGamemode !== undefined) map['force-gamemode'] = String(props.forceGamemode);
  if (props.spawnNpcs !== undefined) map['spawn-npcs'] = String(props.spawnNpcs);
  if (props.spawnAnimals !== undefined) map['spawn-animals'] = String(props.spawnAnimals);
  if (props.spawnMonsters !== undefined) map['spawn-monsters'] = String(props.spawnMonsters);
  if (props.playerIdleTimeout !== undefined) map['player-idle-timeout'] = String(props.playerIdleTimeout);
  if (props.maxBuildHeight !== undefined) map['max-build-height'] = String(props.maxBuildHeight);

  // Network
  if (props.networkCompressionThreshold !== undefined) map['network-compression-threshold'] = String(props.networkCompressionThreshold);
  if (props.rateLimitPacketsPerSecond !== undefined) map['rate-limit'] = String(props.rateLimitPacketsPerSecond);
  if (props.enableStatus !== undefined) map['enable-status'] = String(props.enableStatus);
  if (props.enableQuery !== undefined) map['enable-query'] = String(props.enableQuery);
  if (props.queryPort !== undefined) map['query.port'] = String(props.queryPort);
  if (props.enableRcon !== undefined) map['enable-rcon'] = String(props.enableRcon);
  if (props.rconPort !== undefined) map['rcon.port'] = String(props.rconPort);
  if (props.rconPassword !== undefined) map['rcon.password'] = props.rconPassword;

  // Advanced
  if (props.entityBroadcastRangePercentage !== undefined) map['entity-broadcast-range-percentage'] = String(props.entityBroadcastRangePercentage);
  if (props.functionPermissionLevel !== undefined) map['function-permission-level'] = String(props.functionPermissionLevel);
  if (props.opPermissionLevel !== undefined) map['op-permission-level'] = String(props.opPermissionLevel);
  if (props.syncChunkWrites !== undefined) map['sync-chunk-writes'] = String(props.syncChunkWrites);
  if (props.textFilteringConfig !== undefined) map['text-filtering-config'] = props.textFilteringConfig;
  if (props.logIps !== undefined) map['log-ips'] = String(props.logIps);
  if (props.hideOnlinePlayers !== undefined) map['hide-online-players'] = String(props.hideOnlinePlayers);
  if (props.enforceSecureProfile !== undefined) map['enforce-secure-profile'] = String(props.enforceSecureProfile);
  if (props.preventProxyConnections !== undefined) map['prevent-proxy-connections'] = String(props.preventProxyConnections);
  if (props.maxTickTime !== undefined) map['max-tick-time'] = String(props.maxTickTime);

  const output = [
    '# Minecraft server properties',
    `# Modified by CraftDock on ${new Date().toISOString()}`,
    ...Object.entries(map).map(([k, v]) => `${k}=${v}`),
  ].join('\n');

  fs.writeFileSync(filePath, output + '\n', 'utf-8');
}

export function getRawServerProperties(serverDir: string): string {
  const filePath = path.join(serverDir, 'server.properties');
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

export function saveRawServerProperties(serverDir: string, rawContent: string): boolean {
  try {
    const filePath = path.join(serverDir, 'server.properties');
    fs.writeFileSync(filePath, rawContent, 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save raw server.properties:', e);
    return false;
  }
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

  // Detect all world dimensions (Overworld 'world', Nether 'world_nether', End 'world_the_end', or any dir with level.dat)
  const targetFolders: string[] = [];
  try {
    const entries = fs.readdirSync(serverDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (
          entry.name === 'world' ||
          entry.name === 'world_nether' ||
          entry.name === 'world_the_end' ||
          fs.existsSync(path.join(serverDir, entry.name, 'level.dat'))
        ) {
          targetFolders.push(entry.name);
        }
      }
    }
  } catch (err) {
    console.error('Error scanning world directories for backup:', err);
  }

  if (targetFolders.length === 0) {
    const worldDir = path.join(serverDir, 'world');
    if (fs.existsSync(worldDir)) {
      targetFolders.push('world');
    } else {
      return '';
    }
  }

  try {
    const foldersArg = targetFolders.map((f) => `"${f}"`).join(' ');
    execSync(`tar -a -cf "${backupPath}" --exclude "session.lock" -C "${serverDir}" ${foldersArg}`, { stdio: 'ignore' });
    if (fs.existsSync(backupPath) && fs.statSync(backupPath).size > 0) {
      return backupFileName;
    }
  } catch (e: any) {
    console.error('tar backup encountered an issue, trying fallback:', e?.message);
    if (process.platform === 'win32') {
      try {
        const fullPaths = targetFolders.map((f) => `'${path.join(serverDir, f)}'`).join(',');
        execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path ${fullPaths} -DestinationPath '${backupPath}' -Force"`, { stdio: 'ignore' });
        if (fs.existsSync(backupPath) && fs.statSync(backupPath).size > 0) {
          return backupFileName;
        }
      } catch (psErr) {
        console.error('Failed fallback Compress-Archive backup:', psErr);
      }
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

export async function addToWhitelist(serverDir: string, name: string, specificUuid?: string): Promise<WhitelistEntry[]> {
  const filePath = path.join(serverDir, 'whitelist.json');
  const current = getWhitelist(serverDir);
  const uuid = specificUuid || (await resolvePlayerUuid(serverDir, name));

  const existingIndex = current.findIndex((c) =>
    specificUuid && c.uuid
      ? c.uuid.toLowerCase() === specificUuid.toLowerCase()
      : c.name.toLowerCase() === name.toLowerCase()
  );
  if (existingIndex >= 0) {
    current[existingIndex].uuid = uuid;
  } else {
    current.push({ name, uuid });
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  return current;
}

export function removeFromWhitelist(serverDir: string, name: string, specificUuid?: string): WhitelistEntry[] {
  const filePath = path.join(serverDir, 'whitelist.json');
  const current = getWhitelist(serverDir);
  const filtered = current.filter((c) => {
    if (specificUuid && c.uuid) {
      return c.uuid.toLowerCase() !== specificUuid.toLowerCase();
    }
    return c.name.toLowerCase() !== name.toLowerCase();
  });
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

// Operators (ops.json) Management
export function getServerOps(serverDir: string): OpEntry[] {
  const filePath = path.join(serverDir, 'ops.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        uuid: item.uuid || '',
        name: item.name || '',
        level: typeof item.level === 'number' ? item.level : 4,
        bypassesPlayerLimit: !!item.bypassesPlayerLimit,
      }));
    }
  } catch (e) {}
  return [];
}

export async function addOp(serverDir: string, name: string, level = 4, specificUuid?: string): Promise<OpEntry[]> {
  const filePath = path.join(serverDir, 'ops.json');
  const current = getServerOps(serverDir);
  const uuid = specificUuid || (await resolvePlayerUuid(serverDir, name));

  const existingIdx = current.findIndex((o) =>
    specificUuid && o.uuid
      ? o.uuid.toLowerCase() === specificUuid.toLowerCase()
      : o.name.toLowerCase() === name.toLowerCase()
  );
  if (existingIdx >= 0) {
    current[existingIdx].level = level;
    current[existingIdx].uuid = uuid;
  } else {
    current.push({
      uuid,
      name,
      level,
      bypassesPlayerLimit: false,
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  return current;
}

export function removeOp(serverDir: string, name: string, specificUuid?: string): OpEntry[] {
  const filePath = path.join(serverDir, 'ops.json');
  const current = getServerOps(serverDir);
  const filtered = current.filter((o) => {
    if (specificUuid && o.uuid) {
      return o.uuid.toLowerCase() !== specificUuid.toLowerCase();
    }
    return o.name.toLowerCase() !== name.toLowerCase();
  });
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}

// Banned Players (banned-players.json) Management
export function getServerBans(serverDir: string): BanEntry[] {
  const filePath = path.join(serverDir, 'banned-players.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        uuid: item.uuid || '',
        name: item.name || '',
        created: item.created || new Date().toISOString(),
        source: item.source || 'CraftDock',
        expires: item.expires || 'forever',
        reason: item.reason || 'Banned by operator',
      }));
    }
  } catch (e) {}
  return [];
}

export async function banPlayer(
  serverDir: string,
  name: string,
  reason = 'Banned by operator',
  source = 'CraftDock',
  specificUuid?: string
): Promise<BanEntry[]> {
  const filePath = path.join(serverDir, 'banned-players.json');
  const current = getServerBans(serverDir);
  const uuid = specificUuid || (await resolvePlayerUuid(serverDir, name));

  const existingIdx = current.findIndex((b) =>
    specificUuid && b.uuid
      ? b.uuid.toLowerCase() === specificUuid.toLowerCase()
      : b.name.toLowerCase() === name.toLowerCase()
  );
  const entry: BanEntry = {
    uuid,
    name,
    created: new Date().toLocaleString(),
    source,
    expires: 'forever',
    reason: reason.trim() || 'Banned by operator',
  };

  if (existingIdx >= 0) {
    current[existingIdx] = entry;
  } else {
    current.push(entry);
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  return current;
}

export function pardonPlayer(serverDir: string, name: string, specificUuid?: string): BanEntry[] {
  const filePath = path.join(serverDir, 'banned-players.json');
  const current = getServerBans(serverDir);
  const filtered = current.filter((b) => {
    if (specificUuid && b.uuid) {
      return b.uuid.toLowerCase() !== specificUuid.toLowerCase();
    }
    return b.name.toLowerCase() !== name.toLowerCase();
  });
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}

// Banned IPs (banned-ips.json) Management
export function getServerBannedIps(serverDir: string): BanIpEntry[] {
  const filePath = path.join(serverDir, 'banned-ips.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        ip: item.ip || '',
        created: item.created || new Date().toISOString(),
        source: item.source || 'CraftDock',
        expires: item.expires || 'forever',
        reason: item.reason || 'Banned by operator',
      }));
    }
  } catch (e) {}
  return [];
}

export function banIp(
  serverDir: string,
  ip: string,
  reason = 'Banned by operator',
  source = 'CraftDock'
): BanIpEntry[] {
  const filePath = path.join(serverDir, 'banned-ips.json');
  const current = getServerBannedIps(serverDir);
  const cleanIp = ip.trim();

  const existingIdx = current.findIndex((b) => b.ip === cleanIp);
  const entry: BanIpEntry = {
    ip: cleanIp,
    created: new Date().toLocaleString(),
    source,
    expires: 'forever',
    reason: reason.trim() || 'Banned by operator',
  };

  if (existingIdx >= 0) {
    current[existingIdx] = entry;
  } else {
    current.push(entry);
  }

  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
  return current;
}

export function pardonIp(serverDir: string, ip: string): BanIpEntry[] {
  const filePath = path.join(serverDir, 'banned-ips.json');
  const current = getServerBannedIps(serverDir);
  const cleanIp = ip.trim();
  const filtered = current.filter((b) => b.ip !== cleanIp);
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered;
}





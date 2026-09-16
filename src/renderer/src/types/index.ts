export type ServerSoftware = 'paper' | 'purpur' | 'vanilla' | 'fabric';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ServerProfile {
  id: string;
  name: string;
  software: ServerSoftware;
  version: string;
  buildNumber?: string;
  allocatedRamGb: number;
  storageQuotaGb?: number;
  port: number;
  path: string;
  status: ServerStatus;
  createdAt: string;
  lastPlayedAt?: string;
  playerCount: number;
  maxPlayers: number;
  motd: string;
  hardcore?: boolean;
}

export interface ModrinthProjectVersion {
  id: string;
  name: string;
  versionNumber: string;
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  downloads: number;
  file: {
    url: string;
    filename: string;
    sha1: string;
    size: number;
    primary: boolean;
  };
}

export interface ServerStorageStats {
  serverId: string;
  worldMb: number;
  pluginsMb: number;
  backupsMb: number;
  logsMb: number;
  otherMb: number;
  totalMb: number;
  quotaGb?: number;
}

export interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  downloads: number;
  follows: number;
  categories: string[];
  versions: string[];
  author: string;
  projectType: string;
}

export interface SystemInfo {
  totalRamGb: number;
  freeRamGb: number;
  cpuModel: string;
  cpuPercent?: number;
  platform: string;
  arch?: string;
  osName?: string;
  localIp: string;
}

export interface ServerStats {
  serverId: string;
  cpuPercent: number;
  memoryMb: number;
  memoryPercent: number;
  uptimeSeconds: number;
}

export interface VersionInfo {
  version: string;
  isLatestRelease?: boolean;
  type: 'release' | 'snapshot';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'chat' | 'command';
  text: string;
}

export interface RamAdvice {
  status: 'danger' | 'warning' | 'optimal' | 'beast';
  title: string;
  description: string;
  supportedPlayers: string;
  recommendedUse: string;
  isOverSystemLimit: boolean;
}

export interface CreateServerOptions {
  name: string;
  software: ServerSoftware;
  version: string;
  buildNumber?: string;
  allocatedRamGb: number;
  storageQuotaGb?: number;
  port: number;
  motd: string;
  hardcore?: boolean;
  acceptEula: boolean;
}

export interface AppSettings {
  customJavaPath: string;
  useAikarFlags: boolean;
  serversFolder: string;
  backupsFolder: string;
  defaultPort: number;
  autoRestartOnCrash: boolean;
  autoStartLastServer: boolean;
  autoUpdate: boolean;
  minimizeToTray: boolean;
  hasSeenTrayNotice?: boolean;
  theme: 'dark' | 'light';
  language: 'bg' | 'en';
}

export interface GlobalDiagnostics {
  network: {
    localIps: Array<{ interfaceName: string; ip: string }>;
    publicIp: string;
  };
  disk: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    serversSizeMb: number;
  };
  java: {
    version: number;
    raw: string;
  };
}

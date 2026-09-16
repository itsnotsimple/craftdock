export type ServerSoftware = 'paper' | 'purpur' | 'vanilla' | 'fabric';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface ServerProfile {
  id: string;
  name: string;
  software: ServerSoftware;
  version: string;
  buildNumber?: string;
  allocatedRamGb: number;
  port: number;
  path: string;
  status: ServerStatus;
  createdAt: string;
  lastPlayedAt?: string;
  playerCount: number;
  maxPlayers: number;
  motd: string;
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
  port: number;
  motd: string;
  hardcore?: boolean;
  acceptEula: boolean;
}

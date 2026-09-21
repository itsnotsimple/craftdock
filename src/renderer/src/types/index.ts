export type ServerSoftware = 'paper' | 'purpur' | 'vanilla' | 'fabric';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'sleeping';

export type CardTheme =
  | 'default'
  | 'dirt'
  | 'stone'
  | 'nether'
  | 'end'
  | 'obsidian'
  | 'deepslate'
  | 'bedrock'
  | 'prismarine'
  | 'wood';

export type CardIcon =
  | 'default'
  | 'grass'
  | 'diamond'
  | 'sword'
  | 'pickaxe'
  | 'creeper'
  | 'tnt'
  | 'nether_star'
  | 'ender_pearl'
  | 'steve'
  | 'custom';

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
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  autoBackupRetentionCount?: number;
  lastAutoBackupAt?: string;
  cardTheme?: CardTheme;
  cardIcon?: CardIcon;
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
  isLatest?: boolean;
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
  autoStartPlayitTunnel?: boolean;
  autoUpdate: boolean;
  minimizeToTray: boolean;
  hasSeenTrayNotice?: boolean;
  sleepModeEnabled?: boolean;
  sleepIdleMinutes?: number;
  soundOnStartup?: boolean;
  notifyOnServerReady?: boolean;
  notifyOnPlayerJoinLeave?: boolean;
  notifyOnCrash?: boolean;
  notifyOnBackup?: boolean;
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

export interface WorldInfo {
  name: string;
  path: string;
  sizeMb: number;
  dimension: 'overworld' | 'nether' | 'the_end' | 'custom';
  exists: boolean;
  playerDataCount: number;
  lastModified: string;
}

export interface WorldBackupInfo {
  fileName: string;
  sizeMb: number;
  createdAt: string;
  worldName: string;
}

export interface OpEntry {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit?: boolean;
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

// Analytics & Statistics
export interface UptimeSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  exitCode?: number | null;
  wasGraceful?: boolean;
}

export interface UptimeStats {
  sessions: UptimeSession[];
  totalUptimeSeconds: number;
  uptimeLast7DaysSeconds: number;
  uptimeLast30DaysSeconds: number;
  reliabilityPercent7d: number;
  stabilityPercent?: number;
  totalRestarts: number;
  crashesCount: number;
  firstRecordedAt: string;
}

export interface PlayerSession {
  id: string;
  player: string;
  joinedAt: string;
  leftAt?: string;
  durationSeconds: number;
}

export interface PlayerProfileStats {
  player: string;
  totalPlaytimeSeconds: number;
  firstSeen: string;
  lastSeen: string;
  sessionCount: number;
  avatarUrl: string;
}

export interface PlayerAnalyticsData {
  players: Record<string, PlayerProfileStats>;
  recentSessions: PlayerSession[];
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  timeFormatted: string;
  player: string;
  message: string;
  avatarUrl: string;
}

export interface PerfSample {
  timestamp: number;
  cpuPercent: number;
  memoryMb: number;
  memoryPercent: number;
  playerCount: number;
}

export type PerfTimeRange = '1h' | '6h' | '24h' | '7d';

export interface CrashReportFile {
  fileName: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
}

export interface CrashAnalysisResult {
  hasCrash: boolean;
  fileName?: string;
  fileDate?: string;
  category:
    | 'oom'
    | 'port_bind'
    | 'java_version'
    | 'plugin'
    | 'watchdog'
    | 'session_lock'
    | 'world_corrupt'
    | 'unknown';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  culpritPlugin?: string;
  culpritClass?: string;
  relevantLines: string[];
  rawLog: string;
}

export interface ParsedItem {
  slot: number;
  id: string;
  cleanName: string;
  count: number;
  customName?: string;
  lore?: string[];
  enchantments?: Array<{ id: string; name: string; level: number }>;
  damage?: number;
  maxDamage?: number;
  iconUrl?: string;
}

export interface PlayerInventoryData {
  uuid: string;
  name: string;
  health: number;
  maxHealth: number;
  foodLevel: number;
  xpLevel: number;
  xpTotal: number;
  score: number;
  dimension: string;
  pos: [number, number, number];
  gameType: number; // 0=Survival, 1=Creative, 2=Adventure, 3=Spectator
  lastPlayed: string;
  playTimeTicks: number;
  playTimeFormatted: string;
  mobKills: number;
  playerKills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  hotbar: (ParsedItem | null)[];
  mainInventory: (ParsedItem | null)[];
  armor: {
    head: ParsedItem | null;
    chest: ParsedItem | null;
    legs: ParsedItem | null;
    feet: ParsedItem | null;
  };
  offhand: ParsedItem | null;
  enderChest: (ParsedItem | null)[];
}

export interface PlayerArchiveEntry {
  uuid: string;
  name: string;
  isOnline: boolean;
  isOp: boolean;
  isWhitelisted: boolean;
  isBanned: boolean;
  playTimeTicks: number;
  playTimeFormatted: string;
  lastPlayed: string;
  firstJoined?: string;
  mobKills: number;
  deaths: number;
  xpLevel?: number;
  health?: number;
  dimension?: string;
  avatarUrl: string;
  accountType?: 'online' | 'offline';
}

export interface RemoteServiceStatus {
  enabled: boolean;
  running: boolean;
  port: number;
  ip: string;
  url: string;
  localUrl: string;
  publicUrl?: string;
  isTunnelActive: boolean;
  isTunnelStarting: boolean;
  tunnelError?: string;
  pin: string;
  connectedClients: number;
}

export type TaskAction = 'restart' | 'backup' | 'broadcast' | 'command';
export type TaskScheduleType = 'interval' | 'daily' | 'weekly';

export interface TaskSchedule {
  type: TaskScheduleType;
  time?: string; // "04:00"
  intervalMinutes?: number; // 30, 60, 360
  days?: number[]; // 0=Sunday, ..., 6=Saturday
}

export interface ScheduledTask {
  id: string;
  serverId: string; // server ID or 'all'
  name: string;
  action: TaskAction;
  payload?: {
    command?: string;
    message?: string;
    warningCountdown?: boolean;
  };
  schedule: TaskSchedule;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error' | 'skipped';
  lastRunMessage?: string;
  nextRunAt?: string;
}

export interface WorldSeedInfo {
  seed: string;
  source: 'server.properties' | 'level.dat' | 'default';
  chunkbaseVersion: string;
  chunkbaseLink: string;
}

export interface LocatedStructure {
  id: string;
  type: string;
  name: string;
  dimension: 'overworld' | 'nether' | 'the_end';
  x: number;
  y?: number;
  z: number;
  distanceBlocks: number;
  direction: string;
  category: 'stronghold' | 'village' | 'ancient_city' | 'mansion' | 'monument' | 'trial_chamber' | 'outpost' | 'nether' | 'end';
}

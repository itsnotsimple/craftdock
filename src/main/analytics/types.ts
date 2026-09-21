export interface UptimeSession {
  id: string;
  startedAt: string;     // ISO timestamp
  endedAt?: string;      // ISO timestamp
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

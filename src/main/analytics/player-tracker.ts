import fs from 'fs';
import path from 'path';
import { PlayerAnalyticsData, PlayerSession, PlayerProfileStats } from './types';

function getPlayerFilePath(serverDir: string): string {
  const dir = path.join(serverDir, 'craftdock-data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dir, 'player-history.json');
}

function loadPlayerData(serverDir: string): PlayerAnalyticsData {
  const filePath = getPlayerFilePath(serverDir);
  if (!fs.existsSync(filePath)) {
    return { players: {}, recentSessions: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      players: parsed?.players && typeof parsed.players === 'object' ? parsed.players : {},
      recentSessions: Array.isArray(parsed?.recentSessions) ? parsed.recentSessions : [],
    };
  } catch (err) {
    console.error(`Failed to load player history for ${serverDir}:`, err);
    return { players: {}, recentSessions: [] };
  }
}

function savePlayerData(serverDir: string, data: PlayerAnalyticsData): void {
  const filePath = getPlayerFilePath(serverDir);
  try {
    // Keep at most 200 recent sessions
    const trimmedSessions = data.recentSessions.slice(-200);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ players: data.players, recentSessions: trimmedSessions }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error(`Failed to save player history for ${serverDir}:`, err);
  }
}

// Active session tracking: serverId -> Map(playerName -> { sessionId, startMs })
const activeSessions = new Map<string, Map<string, { sessionId: string; startMs: number }>>();

export function onPlayerJoin(serverId: string, serverDir: string, playerName: string): void {
  if (!playerName || playerName.length < 2) return;

  const data = loadPlayerData(serverDir);
  const now = new Date();
  const nowIso = now.toISOString();

  // Update or create player profile
  const existing = data.players[playerName] || {
    player: playerName,
    totalPlaytimeSeconds: 0,
    firstSeen: nowIso,
    lastSeen: nowIso,
    sessionCount: 0,
    avatarUrl: `https://minotar.net/helm/${encodeURIComponent(playerName)}/32.png`,
  };

  existing.lastSeen = nowIso;
  existing.sessionCount = (existing.sessionCount || 0) + 1;
  data.players[playerName] = existing;

  // Create session entry
  const sessionId = `ps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const session: PlayerSession = {
    id: sessionId,
    player: playerName,
    joinedAt: nowIso,
    durationSeconds: 0,
  };
  data.recentSessions.push(session);

  savePlayerData(serverDir, data);

  // Store in memory
  let serverMap = activeSessions.get(serverId);
  if (!serverMap) {
    serverMap = new Map();
    activeSessions.set(serverId, serverMap);
  }
  serverMap.set(playerName, { sessionId, startMs: now.getTime() });
}

export function onPlayerLeave(serverId: string, serverDir: string, playerName: string): void {
  if (!playerName) return;

  const serverMap = activeSessions.get(serverId);
  const active = serverMap?.get(playerName);
  const data = loadPlayerData(serverDir);
  const now = new Date();
  const nowIso = now.toISOString();

  let durationSec = 1;
  if (active) {
    durationSec = Math.max(1, Math.floor((now.getTime() - active.startMs) / 1000));
    serverMap?.delete(playerName);
  }

  // Update profile
  if (data.players[playerName]) {
    data.players[playerName].lastSeen = nowIso;
    data.players[playerName].totalPlaytimeSeconds = (data.players[playerName].totalPlaytimeSeconds || 0) + durationSec;
  }

  // Update recent session
  const targetId = active?.sessionId;
  let session = targetId ? data.recentSessions.find((s) => s.id === targetId) : undefined;
  if (!session) {
    session = [...data.recentSessions].reverse().find((s) => s.player.toLowerCase() === playerName.toLowerCase() && !s.leftAt);
  }

  if (session) {
    session.leftAt = nowIso;
    session.durationSeconds = durationSec;
  }

  savePlayerData(serverDir, data);
}

export function onServerStop(serverId: string, serverDir: string): void {
  const serverMap = activeSessions.get(serverId);
  if (!serverMap || serverMap.size === 0) return;

  const data = loadPlayerData(serverDir);
  const now = new Date();
  const nowIso = now.toISOString();

  for (const [playerName, active] of serverMap.entries()) {
    const durationSec = Math.max(1, Math.floor((now.getTime() - active.startMs) / 1000));

    if (data.players[playerName]) {
      data.players[playerName].lastSeen = nowIso;
      data.players[playerName].totalPlaytimeSeconds = (data.players[playerName].totalPlaytimeSeconds || 0) + durationSec;
    }

    const session = data.recentSessions.find((s) => s.id === active.sessionId);
    if (session) {
      session.leftAt = nowIso;
      session.durationSeconds = durationSec;
    }
  }

  savePlayerData(serverDir, data);
  activeSessions.delete(serverId);
}

export function getPlayerAnalytics(serverDir: string): PlayerAnalyticsData {
  const data = loadPlayerData(serverDir);
  return {
    players: data.players,
    recentSessions: data.recentSessions.slice(-100).reverse(), // Most recent first
  };
}

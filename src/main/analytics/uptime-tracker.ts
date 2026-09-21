import fs from 'fs';
import path from 'path';
import { UptimeSession, UptimeStats } from './types';

function getUptimeFilePath(serverDir: string): string {
  const dir = path.join(serverDir, 'craftdock-data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dir, 'uptime-history.json');
}

function loadSessions(serverDir: string): UptimeSession[] {
  const filePath = getUptimeFilePath(serverDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load uptime sessions for ${serverDir}:`, err);
    return [];
  }
}

function saveSessions(serverDir: string, sessions: UptimeSession[]): void {
  const filePath = getUptimeFilePath(serverDir);
  try {
    // Keep at most 200 sessions
    const trimmed = sessions.slice(-200);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save uptime sessions for ${serverDir}:`, err);
  }
}

// Memory tracking of active session per serverId
const activeUptimeSessions = new Map<string, { sessionId: string; serverDir: string; startTime: number }>();

export function onServerStart(serverId: string, serverDir: string): void {
  const sessions = loadSessions(serverDir);
  const now = new Date();
  const nowIso = now.toISOString();

  // Close any orphaned active session from a previous crash
  for (const s of sessions) {
    if (!s.endedAt) {
      const startMs = new Date(s.startedAt).getTime();
      s.endedAt = nowIso;
      s.durationSeconds = Math.max(1, Math.floor((now.getTime() - startMs) / 1000));
      s.wasGraceful = false;
      s.exitCode = -1;
    }
  }

  const newSession: UptimeSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    startedAt: nowIso,
    durationSeconds: 0,
  };

  sessions.push(newSession);
  saveSessions(serverDir, sessions);

  activeUptimeSessions.set(serverId, {
    sessionId: newSession.id,
    serverDir,
    startTime: now.getTime(),
  });
}

export function onServerStop(serverId: string, serverDir: string, exitCode: number | null = 0, wasGraceful: boolean = true): void {
  const active = activeUptimeSessions.get(serverId);
  const sessions = loadSessions(serverDir);
  const now = new Date();
  const nowIso = now.toISOString();

  const targetId = active?.sessionId;
  let session = sessions.find((s) => s.id === targetId);

  // If not found by active ID, find the last session without endedAt
  if (!session) {
    session = [...sessions].reverse().find((s) => !s.endedAt);
  }

  if (session) {
    session.endedAt = nowIso;
    const startMs = new Date(session.startedAt).getTime();
    session.durationSeconds = Math.max(1, Math.floor((now.getTime() - startMs) / 1000));
    session.exitCode = exitCode;
    session.wasGraceful = wasGraceful && (exitCode === 0 || exitCode === null);
    saveSessions(serverDir, sessions);
  }

  activeUptimeSessions.delete(serverId);
}

export function getUptimeHistory(serverDir: string, isCurrentlyRunning: boolean = false): UptimeStats {
  const sessions = loadSessions(serverDir);
  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 86400 * 1000;
  const thirtyDaysAgoMs = nowMs - 30 * 86400 * 1000;

  let totalUptimeSeconds = 0;
  let uptimeLast7DaysSeconds = 0;
  let uptimeLast30DaysSeconds = 0;
  let crashesCount = 0;
  let totalRestarts = sessions.length;

  const mappedSessions: UptimeSession[] = [];

  for (const s of sessions) {
    const startMs = new Date(s.startedAt).getTime();
    const isCurrentActive = !s.endedAt && isCurrentlyRunning;
    const endMs = s.endedAt ? new Date(s.endedAt).getTime() : (isCurrentlyRunning ? nowMs : startMs);
    const duration = Math.max(1, Math.floor((endMs - startMs) / 1000));

    totalUptimeSeconds += duration;

    // Check crash
    if (s.wasGraceful === false || (s.exitCode !== 0 && s.exitCode !== null && s.exitCode !== undefined)) {
      crashesCount++;
    }

    // 7 Days
    if (endMs > sevenDaysAgoMs) {
      const effectiveStart = Math.max(startMs, sevenDaysAgoMs);
      const diffSec = Math.max(0, Math.floor((endMs - effectiveStart) / 1000));
      uptimeLast7DaysSeconds += diffSec;
    }

    // 30 Days
    if (endMs > thirtyDaysAgoMs) {
      const effectiveStart = Math.max(startMs, thirtyDaysAgoMs);
      const diffSec = Math.max(0, Math.floor((endMs - effectiveStart) / 1000));
      uptimeLast30DaysSeconds += diffSec;
    }

    mappedSessions.push({
      ...s,
      durationSeconds: isCurrentActive ? duration : (s.durationSeconds > 0 ? s.durationSeconds : duration),
    });
  }

  // Crash-free stability rate (e.g. 100% if 0 crashes, 50% if 1 crash in 2 sessions)
  let stabilityPercent = 100;
  if (totalRestarts > 0) {
    const successfulSessions = Math.max(0, totalRestarts - crashesCount);
    stabilityPercent = Math.min(100, Math.max(0, Math.round((successfulSessions / totalRestarts) * 100)));
  }

  // 7-Day uptime percentage: relative to time since server first recorded session (capped at 7 days)
  const firstRecordMs = sessions.length > 0 ? new Date(sessions[0].startedAt).getTime() : nowMs;
  const timeSinceFirstRunSec = Math.max(60, Math.floor((nowMs - firstRecordMs) / 1000));
  const effectiveWindowSec = Math.min(7 * 86400, timeSinceFirstRunSec);
  const reliabilityPercent7d = Math.min(100, Math.max(0, Math.round((uptimeLast7DaysSeconds / effectiveWindowSec) * 100)));

  return {
    sessions: mappedSessions.slice(-50).reverse(), // Most recent first
    totalUptimeSeconds,
    uptimeLast7DaysSeconds,
    uptimeLast30DaysSeconds,
    reliabilityPercent7d,
    stabilityPercent,
    totalRestarts,
    crashesCount,
    firstRecordedAt: sessions.length > 0 ? sessions[0].startedAt : new Date().toISOString(),
  };
}

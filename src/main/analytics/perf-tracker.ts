import fs from 'fs';
import path from 'path';
import { PerfSample } from './types';

function getPerfFilePath(serverDir: string): string {
  const dir = path.join(serverDir, 'craftdock-data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dir, 'perf-history.json');
}

function loadPerfSamples(serverDir: string): PerfSample[] {
  const filePath = getPerfFilePath(serverDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load perf samples for ${serverDir}:`, err);
    return [];
  }
}

// In-memory buffer before flushing to disk to avoid excessive disk I/O
const pendingSamples = new Map<string, PerfSample[]>();
const lastFlushTime = new Map<string, number>();

export function recordSample(serverDir: string, sample: PerfSample): void {
  let buffer = pendingSamples.get(serverDir);
  if (!buffer) {
    buffer = [];
    pendingSamples.set(serverDir, buffer);
  }
  buffer.push(sample);

  const now = Date.now();
  const lastFlush = lastFlushTime.get(serverDir) || 0;

  // Flush every 30 seconds or if buffer reaches 6 samples
  if (now - lastFlush > 30000 || buffer.length >= 6) {
    flushSamples(serverDir);
  }
}

export function flushSamples(serverDir: string): void {
  const buffer = pendingSamples.get(serverDir);
  if (!buffer || buffer.length === 0) return;

  const existing = loadPerfSamples(serverDir);
  existing.push(...buffer);
  pendingSamples.set(serverDir, []);
  lastFlushTime.set(serverDir, Date.now());

  // Keep last 10,000 samples (over 7 days if downsampled or 28h raw)
  const trimmed = existing.slice(-10000);
  const filePath = getPerfFilePath(serverDir);
  try {
    fs.writeFileSync(filePath, JSON.stringify(trimmed), 'utf-8');
  } catch (err) {
    console.error(`Failed to save perf samples for ${serverDir}:`, err);
  }
}

export type PerfTimeRange = '1h' | '6h' | '24h' | '7d';

export function getPerformanceHistory(serverDir: string, range: PerfTimeRange = '1h'): PerfSample[] {
  // Ensure any buffered samples are written or merged
  const diskSamples = loadPerfSamples(serverDir);
  const buffer = pendingSamples.get(serverDir) || [];
  const allSamples = [...diskSamples, ...buffer];

  if (allSamples.length === 0) return [];

  const now = Date.now();
  let rangeMs = 3600 * 1000; // 1h
  if (range === '6h') rangeMs = 6 * 3600 * 1000;
  if (range === '24h') rangeMs = 24 * 3600 * 1000;
  if (range === '7d') rangeMs = 7 * 24 * 3600 * 1000;

  const cutoff = now - rangeMs;
  const filtered = allSamples.filter((s) => s.timestamp >= cutoff);

  if (filtered.length <= 60) {
    return filtered;
  }

  // Downsample to ~60 evenly spaced points
  const targetPoints = 60;
  const bucketSize = (now - cutoff) / targetPoints;
  const result: PerfSample[] = [];

  for (let i = 0; i < targetPoints; i++) {
    const bucketStart = cutoff + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const inBucket = filtered.filter((s) => s.timestamp >= bucketStart && s.timestamp < bucketEnd);

    if (inBucket.length > 0) {
      const avgCpu = inBucket.reduce((acc, s) => acc + s.cpuPercent, 0) / inBucket.length;
      const avgMemMb = inBucket.reduce((acc, s) => acc + s.memoryMb, 0) / inBucket.length;
      const avgMemPct = inBucket.reduce((acc, s) => acc + s.memoryPercent, 0) / inBucket.length;
      const maxPlayers = Math.max(...inBucket.map((s) => s.playerCount));

      result.push({
        timestamp: Math.round(bucketStart + bucketSize / 2),
        cpuPercent: Math.round(avgCpu * 10) / 10,
        memoryMb: Math.round(avgMemMb),
        memoryPercent: Math.round(avgMemPct * 10) / 10,
        playerCount: maxPlayers,
      });
    }
  }

  return result;
}

import fs from 'fs';
import path from 'path';
import { getServerById } from './server-store';
import { createWorldBackup } from './server-config';

export interface WorldSlimmerAnalysis {
  totalRegions: number;
  totalSizeMb: number;
  overworldRegions: number;
  netherRegions: number;
  endRegions: number;
  distantRegions: number;
  estimatedSavableMb: number;
  radiusBlocks: number;
}

export interface WorldSlimmerResult {
  success: boolean;
  removedCount: number;
  freedMb: number;
  backupName?: string;
  error?: string;
}

interface RegionFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  regX: number;
  regZ: number;
  distBlocks: number;
  dimension: 'overworld' | 'nether' | 'the_end';
  relatedPaths: string[];
}

function parseRegionFileName(fileName: string): { regX: number; regZ: number } | null {
  const match = fileName.match(/^r\.(-?\d+)\.(-?\d+)\.mca$/i);
  if (!match) return null;
  return {
    regX: parseInt(match[1], 10),
    regZ: parseInt(match[2], 10),
  };
}

function scanDimensionRegions(dimDir: string, dimension: 'overworld' | 'nether' | 'the_end'): RegionFileInfo[] {
  const list: RegionFileInfo[] = [];
  const regionDir = path.join(dimDir, 'region');
  if (!fs.existsSync(regionDir)) return list;

  const entitiesDir = path.join(dimDir, 'entities');
  const poiDir = path.join(dimDir, 'poi');

  try {
    const files = fs.readdirSync(regionDir);
    for (const f of files) {
      const parsed = parseRegionFileName(f);
      if (!parsed) continue;

      const fullPath = path.join(regionDir, f);
      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(fullPath).size;
      } catch {
        continue;
      }

      const blockX = parsed.regX * 512 + 256;
      const blockZ = parsed.regZ * 512 + 256;
      const distBlocks = Math.round(Math.hypot(blockX, blockZ));

      const relatedPaths: string[] = [];
      const entityPath = path.join(entitiesDir, f);
      if (fs.existsSync(entityPath)) relatedPaths.push(entityPath);

      const poiPath = path.join(poiDir, f);
      if (fs.existsSync(poiPath)) relatedPaths.push(poiPath);

      list.push({
        fileName: f,
        filePath: fullPath,
        sizeBytes,
        regX: parsed.regX,
        regZ: parsed.regZ,
        distBlocks,
        dimension,
        relatedPaths,
      });
    }
  } catch (err) {
    console.error(`Failed to scan regions in ${regionDir}:`, err);
  }

  return list;
}

function getAllWorldRegions(serverDir: string): RegionFileInfo[] {
  const all: RegionFileInfo[] = [];

  // Overworld (standard: world/ or ./)
  const overworldPath = fs.existsSync(path.join(serverDir, 'world', 'region'))
    ? path.join(serverDir, 'world')
    : serverDir;
  all.push(...scanDimensionRegions(overworldPath, 'overworld'));

  // Nether (Paper/Purpur: world_nether/, Vanilla: world/DIM-1/)
  const paperNether = path.join(serverDir, 'world_nether');
  const vanillaNether = path.join(overworldPath, 'DIM-1');
  if (fs.existsSync(paperNether)) {
    all.push(...scanDimensionRegions(paperNether, 'nether'));
  } else if (fs.existsSync(vanillaNether)) {
    all.push(...scanDimensionRegions(vanillaNether, 'nether'));
  }

  // End (Paper/Purpur: world_the_end/, Vanilla: world/DIM1/)
  const paperEnd = path.join(serverDir, 'world_the_end');
  const vanillaEnd = path.join(overworldPath, 'DIM1');
  if (fs.existsSync(paperEnd)) {
    all.push(...scanDimensionRegions(paperEnd, 'the_end'));
  } else if (fs.existsSync(vanillaEnd)) {
    all.push(...scanDimensionRegions(vanillaEnd, 'the_end'));
  }

  return all;
}

/**
 * Analyzes world regions and calculates how much space can be pruned beyond a safe radius.
 */
export function analyzeWorldSlimmer(serverId: string, radiusBlocks = 2500): WorldSlimmerAnalysis {
  const server = getServerById(serverId);
  if (!server) {
    return {
      totalRegions: 0,
      totalSizeMb: 0,
      overworldRegions: 0,
      netherRegions: 0,
      endRegions: 0,
      distantRegions: 0,
      estimatedSavableMb: 0,
      radiusBlocks,
    };
  }

  const regions = getAllWorldRegions(server.path);
  const totalSizeBytes = regions.reduce((acc, r) => acc + r.sizeBytes, 0);

  const overworld = regions.filter((r) => r.dimension === 'overworld');
  const nether = regions.filter((r) => r.dimension === 'nether');
  const end = regions.filter((r) => r.dimension === 'the_end');

  // Chunks outside chosen radius
  const distant = regions.filter((r) => r.distBlocks > radiusBlocks);
  const savableBytes = distant.reduce((acc, r) => acc + r.sizeBytes, 0);

  return {
    totalRegions: regions.length,
    totalSizeMb: Math.round((totalSizeBytes / (1024 * 1024)) * 10) / 10,
    overworldRegions: overworld.length,
    netherRegions: nether.length,
    endRegions: end.length,
    distantRegions: distant.length,
    estimatedSavableMb: Math.round((savableBytes / (1024 * 1024)) * 10) / 10,
    radiusBlocks,
  };
}

/**
 * Prunes distant unexplored/temporary regions outside specified radius.
 * Automatically takes a full safety backup first!
 */
export async function trimDistantRegions(serverId: string, radiusBlocks = 2500): Promise<WorldSlimmerResult> {
  const server = getServerById(serverId);
  if (!server) {
    return { success: false, removedCount: 0, freedMb: 0, error: 'Server not found' };
  }

  // 1. SAFETY BACKUP FIRST!
  let backupName = '';
  try {
    backupName = createWorldBackup(server.path);
  } catch (err: any) {
    return {
      success: false,
      removedCount: 0,
      freedMb: 0,
      error: `Failed to create safety backup: ${err.message}`,
    };
  }

  // 2. Scan and find regions to trim
  const regions = getAllWorldRegions(server.path);
  const toTrim = regions.filter((r) => r.distBlocks > radiusBlocks);

  let removedCount = 0;
  let freedBytes = 0;

  for (const reg of toTrim) {
    try {
      if (fs.existsSync(reg.filePath)) {
        const sz = fs.statSync(reg.filePath).size;
        fs.unlinkSync(reg.filePath);
        freedBytes += sz;
        removedCount++;
      }

      // Also clean associated entities and poi files
      for (const rel of reg.relatedPaths) {
        if (fs.existsSync(rel)) {
          freedBytes += fs.statSync(rel).size;
          fs.unlinkSync(rel);
        }
      }
    } catch (e) {
      console.warn(`Could not remove distant region file ${reg.fileName}:`, e);
    }
  }

  return {
    success: true,
    removedCount,
    freedMb: Math.round((freedBytes / (1024 * 1024)) * 10) / 10,
    backupName,
  };
}

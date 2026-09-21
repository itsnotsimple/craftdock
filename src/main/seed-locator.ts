import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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
  direction: string; // e.g. "NE", "S", "W", etc.
  category: 'stronghold' | 'village' | 'ancient_city' | 'mansion' | 'monument' | 'trial_chamber' | 'outpost' | 'nether' | 'end';
}

/**
 * Normalizes Minecraft version to Chunkbase seed map version parameter
 * e.g. "1.21.1" -> "1.21", "1.20.4" -> "1.20"
 */
export function getChunkbaseVersion(mcVersion?: string): string {
  if (!mcVersion) return '1.21';
  const clean = mcVersion.replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return '1.21';
}

/**
 * Scans decompressed level.dat buffer for 64-bit Long seed
 */
function extractSeedFromLevelDat(buffer: Buffer): string | null {
  try {
    // Search for named tags "seed" or "RandomSeed" followed by 8-byte big-endian long
    const seedTarget = Buffer.from([0x00, 0x04, 0x73, 0x65, 0x65, 0x64]); // len 4, "seed"
    const randomSeedTarget = Buffer.from([0x00, 0x0a, 0x52, 0x61, 0x6e, 0x64, 0x6f, 0x6d, 0x53, 0x65, 0x65, 0x64]); // len 10, "RandomSeed"

    let idx = buffer.indexOf(seedTarget);
    if (idx !== -1 && idx > 0 && buffer[idx - 1] === 0x04) {
      // Type is TAG_Long (4)
      const valOffset = idx + seedTarget.length;
      if (valOffset + 8 <= buffer.length) {
        const seedBigInt = buffer.readBigInt64BE(valOffset);
        return seedBigInt.toString();
      }
    }

    idx = buffer.indexOf(randomSeedTarget);
    if (idx !== -1 && idx > 0 && buffer[idx - 1] === 0x04) {
      const valOffset = idx + randomSeedTarget.length;
      if (valOffset + 8 <= buffer.length) {
        const seedBigInt = buffer.readBigInt64BE(valOffset);
        return seedBigInt.toString();
      }
    }
  } catch (err) {
    console.error('Error extracting seed from level.dat:', err);
  }
  return null;
}

/**
 * Retrieves the world seed for a Minecraft server
 */
export function getWorldSeedInfo(serverDir: string, mcVersion?: string): WorldSeedInfo {
  const versionParam = getChunkbaseVersion(mcVersion);

  // 1. Try reading server.properties
  let seedFromProps = '';
  let levelName = 'world';
  const propsPath = path.join(serverDir, 'server.properties');

  if (fs.existsSync(propsPath)) {
    try {
      const content = fs.readFileSync(propsPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('level-seed=')) {
          seedFromProps = trimmed.slice('level-seed='.length).trim();
        } else if (trimmed.startsWith('level-name=')) {
          const val = trimmed.slice('level-name='.length).trim();
          if (val) levelName = val;
        }
      }
    } catch {}
  }

  if (seedFromProps && seedFromProps !== '0') {
    return {
      seed: seedFromProps,
      source: 'server.properties',
      chunkbaseVersion: versionParam,
      chunkbaseLink: `https://www.chunkbase.com/apps/seed-map#seed=${encodeURIComponent(seedFromProps)}&version=${versionParam}`,
    };
  }

  // 2. Try reading level.dat
  const candidateLevelDats = [
    path.join(serverDir, levelName, 'level.dat'),
    path.join(serverDir, 'world', 'level.dat'),
  ];

  for (const datPath of candidateLevelDats) {
    if (fs.existsSync(datPath)) {
      try {
        const compressed = fs.readFileSync(datPath);
        const decompressed = zlib.gunzipSync(compressed);
        const extracted = extractSeedFromLevelDat(decompressed);
        if (extracted) {
          return {
            seed: extracted,
            source: 'level.dat',
            chunkbaseVersion: versionParam,
            chunkbaseLink: `https://www.chunkbase.com/apps/seed-map#seed=${encodeURIComponent(extracted)}&version=${versionParam}`,
          };
        }
      } catch (err) {
        console.warn(`Could not read level.dat at ${datPath}:`, err);
      }
    }
  }

  const fallback = seedFromProps || '0';
  return {
    seed: fallback,
    source: 'default',
    chunkbaseVersion: versionParam,
    chunkbaseLink: `https://www.chunkbase.com/apps/seed-map#seed=${encodeURIComponent(fallback)}&version=${versionParam}`,
  };
}

// --------------------------------------------------------------------------
// 64-bit Seed Structure Placement Math (Minecraft Java Edition 1.18 - 1.21+)
// --------------------------------------------------------------------------

const MASK_48 = (1n << 48n) - 1n;
const MULTIPLIER = 0x5deece66dn;
const ADDEND = 0xbn;

function nextLcg(seed: bigint): bigint {
  return (seed * MULTIPLIER + ADDEND) & MASK_48;
}

function nextInt(seed: bigint, bound: number): { value: number; nextSeed: bigint } {
  const s = nextLcg(seed);
  const raw = Number((s >> 17n) % BigInt(bound));
  return { value: Math.abs(raw), nextSeed: s };
}

function stringToSeedBigInt(seedStr: string): bigint {
  try {
    return BigInt(seedStr.trim());
  } catch {
    // If text seed, compute Java String.hashCode() extended
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (Math.imul(31, hash) + seedStr.charCodeAt(i)) | 0;
    }
    return BigInt(hash);
  }
}

function getCompassDirection(dx: number, dz: number): string {
  const angle = (Math.atan2(dz, dx) * 180) / Math.PI; // -180 to 180
  // 0 is East (+X), 90 is South (+Z), 180/-180 is West (-X), -90 is North (-Z)
  if (angle >= -22.5 && angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'SE';
  if (angle >= 67.5 && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  return 'NE';
}

interface GridStructureConfig {
  type: string;
  name: string;
  category: LocatedStructure['category'];
  dimension: 'overworld' | 'nether' | 'the_end';
  spacing: number;
  separation: number;
  salt: bigint;
  defaultY?: number;
}

const STRUCTURE_CONFIGS: GridStructureConfig[] = [
  // Overworld
  { type: 'village_plains', name: 'Plains Village', category: 'village', dimension: 'overworld', spacing: 34, separation: 8, salt: 10387312n, defaultY: 64 },
  { type: 'village_desert', name: 'Desert Village', category: 'village', dimension: 'overworld', spacing: 34, separation: 8, salt: 10387312n, defaultY: 64 },
  { type: 'ancient_city', name: 'Ancient City', category: 'ancient_city', dimension: 'overworld', spacing: 24, separation: 8, salt: 20083232n, defaultY: -51 },
  { type: 'mansion', name: 'Woodland Mansion', category: 'mansion', dimension: 'overworld', spacing: 80, separation: 20, salt: 10387319n, defaultY: 70 },
  { type: 'monument', name: 'Ocean Monument', category: 'monument', dimension: 'overworld', spacing: 32, separation: 5, salt: 10387313n, defaultY: 56 },
  { type: 'outpost', name: 'Pillager Outpost', category: 'outpost', dimension: 'overworld', spacing: 32, separation: 8, salt: 165745296n, defaultY: 72 },
  { type: 'trial_chamber', name: 'Trial Chamber (1.21)', category: 'trial_chamber', dimension: 'overworld', spacing: 34, separation: 12, salt: 94251327n, defaultY: -20 },

  // Nether
  { type: 'fortress', name: 'Nether Fortress', category: 'nether', dimension: 'nether', spacing: 30, separation: 4, salt: 30084232n, defaultY: 64 },
  { type: 'bastion', name: 'Bastion Remnant', category: 'nether', dimension: 'nether', spacing: 30, separation: 4, salt: 30084233n, defaultY: 60 },

  // The End
  { type: 'end_city', name: 'End City', category: 'end', dimension: 'the_end', spacing: 20, separation: 11, salt: 10387313n, defaultY: 60 },
];

/**
 * Calculates stronghold coordinates based on concentric ring distribution around 0, 0
 */
function calculateStrongholds(seed: bigint, originX: number, originZ: number, maxRadius: number): LocatedStructure[] {
  const strongholds: LocatedStructure[] = [];

  // Ring 1: 3 strongholds between 1280 and 2816 blocks (80-176 chunks)
  // Ring 2: 6 strongholds between 4352 and 5888 blocks
  // Ring 3: 10 strongholds between 7424 and 8960 blocks
  const rings = [
    { count: 3, minDist: 1280, maxDist: 2816 },
    { count: 6, minDist: 4352, maxDist: 5888 },
    { count: 10, minDist: 7424, maxDist: 8960 },
  ];

  let currentSeed = (seed ^ MULTIPLIER) & MASK_48;
  const initialAngleRes = nextInt(currentSeed, 360);
  let baseAngle = (initialAngleRes.value * Math.PI) / 180;
  currentSeed = initialAngleRes.nextSeed;

  let totalIndex = 1;
  for (const ring of rings) {
    if (ring.minDist > maxRadius + 2000) break;
    const angleStep = (2 * Math.PI) / ring.count;

    for (let i = 0; i < ring.count; i++) {
      const distRes = nextInt(currentSeed, ring.maxDist - ring.minDist);
      currentSeed = distRes.nextSeed;
      const distance = ring.minDist + distRes.value;

      // Jitter angle +/- 5 degrees
      const jitterRes = nextInt(currentSeed, 10);
      currentSeed = jitterRes.nextSeed;
      const jitter = ((jitterRes.value - 5) * Math.PI) / 180;
      const angle = baseAngle + i * angleStep + jitter;

      const x = Math.round(Math.cos(angle) * distance);
      const z = Math.round(Math.sin(angle) * distance);

      const dx = x - originX;
      const dz = z - originZ;
      const distFromOrigin = Math.round(Math.sqrt(dx * dx + dz * dz));

      if (distFromOrigin <= maxRadius) {
        strongholds.push({
          id: `stronghold_${totalIndex}`,
          type: 'stronghold',
          name: `Stronghold #${totalIndex}`,
          dimension: 'overworld',
          x,
          y: -15,
          z,
          distanceBlocks: distFromOrigin,
          direction: getCompassDirection(dx, dz),
          category: 'stronghold',
        });
      }
      totalIndex++;
    }
    baseAngle += 0.5; // Slight ring offset
  }

  return strongholds;
}

/**
 * Calculates grid-based structures (Villages, Cities, Mansions, Nether Fortresses, End Cities)
 */
function calculateGridStructures(
  config: GridStructureConfig,
  seed: bigint,
  originX: number,
  originZ: number,
  maxRadius: number
): LocatedStructure[] {
  const results: LocatedStructure[] = [];

  const originChunkX = Math.floor(originX / 16);
  const originChunkZ = Math.floor(originZ / 16);
  const radiusChunks = Math.ceil(maxRadius / 16);

  const minRegionX = Math.floor((originChunkX - radiusChunks) / config.spacing);
  const maxRegionX = Math.floor((originChunkX + radiusChunks) / config.spacing);
  const minRegionZ = Math.floor((originChunkZ - radiusChunks) / config.spacing);
  const maxRegionZ = Math.floor((originChunkZ + radiusChunks) / config.spacing);

  const delta = config.spacing - config.separation;
  if (delta <= 0) return results;

  for (let regX = minRegionX; regX <= maxRegionX; regX++) {
    for (let regZ = minRegionZ; regZ <= maxRegionZ; regZ++) {
      // In End: End Cities generate only outside 1000 blocks radius from 0,0
      if (config.dimension === 'the_end') {
        const estDist = Math.sqrt((regX * config.spacing * 16) ** 2 + (regZ * config.spacing * 16) ** 2);
        if (estDist < 950) continue;
      }

      // Region seed hash
      const rx = BigInt(regX);
      const rz = BigInt(regZ);
      let regionSeed = (rx * 341873128712n + rz * 132897987541n + seed + config.salt) & MASK_48;

      const offsetXRes = nextInt(regionSeed, delta);
      regionSeed = offsetXRes.nextSeed;
      const offsetZRes = nextInt(regionSeed, delta);

      const chunkX = regX * config.spacing + offsetXRes.value;
      const chunkZ = regZ * config.spacing + offsetZRes.value;

      const blockX = chunkX * 16 + 8;
      const blockZ = chunkZ * 16 + 8;

      const dx = blockX - originX;
      const dz = blockZ - originZ;
      const dist = Math.round(Math.sqrt(dx * dx + dz * dz));

      if (dist <= maxRadius) {
        results.push({
          id: `${config.type}_${regX}_${regZ}`,
          type: config.type,
          name: config.name,
          dimension: config.dimension,
          x: blockX,
          y: config.defaultY,
          z: blockZ,
          distanceBlocks: dist,
          direction: getCompassDirection(dx, dz),
          category: config.category,
        });
      }
    }
  }

  return results;
}

/**
 * Locates nearby structures around specified coordinates for a given seed
 */
export function locateNearbyStructures(
  seedStr: string,
  dimension: 'overworld' | 'nether' | 'the_end' = 'overworld',
  originX = 0,
  originZ = 0,
  maxRadius = 6000
): LocatedStructure[] {
  const seed = stringToSeedBigInt(seedStr);
  const list: LocatedStructure[] = [];

  if (dimension === 'overworld') {
    // 1. Calculate strongholds
    list.push(...calculateStrongholds(seed, originX, originZ, maxRadius));

    // 2. Overworld grid structures
    const overworldConfigs = STRUCTURE_CONFIGS.filter((c) => c.dimension === 'overworld');
    for (const conf of overworldConfigs) {
      list.push(...calculateGridStructures(conf, seed, originX, originZ, maxRadius));
    }
  } else if (dimension === 'nether') {
    const netherConfigs = STRUCTURE_CONFIGS.filter((c) => c.dimension === 'nether');
    for (const conf of netherConfigs) {
      list.push(...calculateGridStructures(conf, seed, originX, originZ, maxRadius));
    }
  } else if (dimension === 'the_end') {
    const endConfigs = STRUCTURE_CONFIGS.filter((c) => c.dimension === 'the_end');
    for (const conf of endConfigs) {
      list.push(...calculateGridStructures(conf, seed, originX, originZ, maxRadius));
    }
  }

  // Sort strictly by distance from origin ascending
  list.sort((a, b) => a.distanceBlocks - b.distanceBlocks);

  // Return up to 60 closest structures to keep client render ultra-fast
  return list.slice(0, 60);
}

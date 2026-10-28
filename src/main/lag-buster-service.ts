import path from 'path';
import fs from 'fs';
import { sendCommand, isServerRunning } from './server-runner';
import { getServerById } from './server-store';
import { readServerProperties, writeServerProperties } from './server-config';

export interface LagBusterSettingsCheck {
  simulationDistance: number;
  viewDistance: number;
  entityBroadcastRange: number;
  networkCompression: number;
  maxTickTime: number;
  isOptimal: boolean;
  recommendations: string[];
}

/**
 * Executes a console command to remove floating dropped items
 */
export async function cleanDroppedItems(serverId: string): Promise<{ success: boolean; message: string }> {
  if (!isServerRunning(serverId)) {
    return { success: false, message: 'Server must be running to clear entities.' };
  }

  // Send both vanilla namespace and standard command to ensure compatibility
  sendCommand(serverId, 'minecraft:kill @e[type=item]');
  sendCommand(serverId, 'kill @e[type=item]');

  return {
    success: true,
    message: 'Command executed to remove all floating dropped items.',
  };
}

const HOSTILE_MOB_TYPES = [
  'zombie', 'husk', 'drowned', 'zombie_villager', 'skeleton', 'stray', 'bogged', 'wither_skeleton',
  'creeper', 'spider', 'cave_spider', 'enderman', 'endermite', 'silverfish', 'witch', 'slime',
  'magma_cube', 'phantom', 'blaze', 'ghast', 'hoglin', 'zoglin', 'piglin_brute', 'pillager',
  'vindicator', 'evoker', 'vex', 'ravager', 'guardian', 'breeze', 'creaking',
];

/**
 * Safely removes hostile monsters in emergencies
 */
export async function cleanHostileMonsters(serverId: string): Promise<{ success: boolean; message: string }> {
  if (!isServerRunning(serverId)) {
    return { success: false, message: 'Server must be running to clear monsters.' };
  }

  // Name the hostile types instead of "everything except a few": the exclusion list also killed farm
  // animals, item frames, paintings and chest minecarts (spilling their items). Mobs that are named or
  // otherwise persistent are spared; bosses, shulkers and elder guardians are left out on purpose.
  // Types missing in older versions just fail with "Unknown entity" in the console.
  for (const type of HOSTILE_MOB_TYPES) {
    sendCommand(serverId, `kill @e[type=minecraft:${type},nbt=!{PersistenceRequired:1b}]`);
  }

  return {
    success: true,
    message: 'Command executed to remove hostile mobs.',
  };
}

/**
 * Removes abandoned minecarts and boats causing physics tick lag
 */
export async function cleanMinecartsAndBoats(serverId: string): Promise<{ success: boolean; message: string }> {
  if (!isServerRunning(serverId)) {
    return { success: false, message: 'Server must be running to clear vehicles.' };
  }

  sendCommand(serverId, 'kill @e[type=minecart]');
  sendCommand(serverId, 'kill @e[type=boat]');
  sendCommand(serverId, 'kill @e[type=chest_boat]');

  return {
    success: true,
    message: 'Command executed to remove abandoned minecarts and boats.',
  };
}

/**
 * Checks current server.properties and returns performance advice
 */
export function checkLagSettings(serverId: string): LagBusterSettingsCheck {
  const server = getServerById(serverId);
  if (!server) {
    return {
      simulationDistance: 10,
      viewDistance: 10,
      entityBroadcastRange: 100,
      networkCompression: 256,
      maxTickTime: 60000,
      isOptimal: false,
      recommendations: ['Server not found.'],
    };
  }

  const props = readServerProperties(server.path);
  const simDist = props.simulationDistance ?? 10;
  const viewDist = props.viewDistance ?? 10;
  const entityRange = props.entityBroadcastRangePercentage ?? 100;
  const compression = props.networkCompressionThreshold ?? 256;
  const maxTickTime = props.maxTickTime ?? 60000;

  const recommendations: string[] = [];
  if (simDist > 5) {
    recommendations.push(`Simulation distance is ${simDist}. Lowering to 4 or 5 greatly improves mob tick performance.`);
  }
  if (viewDist > 8) {
    recommendations.push(`View distance is ${viewDist}. Lowering to 8 cuts chunk generation memory pressure.`);
  }
  if (entityRange > 80) {
    recommendations.push(`Entity broadcast range is ${entityRange}%. Lowering to 75-80% saves network bandwidth.`);
  }
  if (maxTickTime !== -1 && maxTickTime < 120000) {
    recommendations.push(`Watchdog max-tick-time is ${maxTickTime}ms. Setting to -1 prevents sudden crash on heavy lag.`);
  }

  return {
    simulationDistance: simDist,
    viewDistance: viewDist,
    entityBroadcastRange: entityRange,
    networkCompression: compression,
    maxTickTime: maxTickTime,
    isOptimal: recommendations.length === 0,
    recommendations,
  };
}

/**
 * Applies optimal lag buster properties to server.properties
 */
export function applyOptimalLagSettings(serverId: string): boolean {
  const server = getServerById(serverId);
  if (!server) return false;

  writeServerProperties(server.path, {
    simulationDistance: 4,
    viewDistance: 8,
    entityBroadcastRangePercentage: 80,
    networkCompressionThreshold: 256,
    maxTickTime: -1,
  });
  return true;
}

/**
 * Checks if Chunky plugin (.jar in plugins/) or Chunky mod (.jar in mods/) is installed
 */
export function isChunkyInstalled(serverPath: string): boolean {
  try {
    const pluginsDir = path.join(serverPath, 'plugins');
    if (fs.existsSync(pluginsDir)) {
      const files = fs.readdirSync(pluginsDir);
      if (files.some((f) => /chunky/i.test(f) && f.toLowerCase().endsWith('.jar'))) {
        return true;
      }
    }
    const modsDir = path.join(serverPath, 'mods');
    if (fs.existsSync(modsDir)) {
      const files = fs.readdirSync(modsDir);
      if (files.some((f) => /chunky/i.test(f) && f.toLowerCase().endsWith('.jar'))) {
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Executes Chunky pre-generation command on the running server
 */
export function runChunkyCommand(
  serverId: string,
  action: 'radius' | 'start' | 'pause' | 'cancel',
  radius = 2000
): { success: boolean; error?: string } {
  if (!isServerRunning(serverId)) {
    return { success: false, error: 'SERVER_OFFLINE' };
  }

  const server = getServerById(serverId);
  if (!server) {
    return { success: false, error: 'SERVER_NOT_FOUND' };
  }

  if (!isChunkyInstalled(server.path)) {
    return {
      success: false,
      error: 'CHUNKY_NOT_INSTALLED',
    };
  }

  switch (action) {
    case 'radius':
      sendCommand(serverId, `chunky radius ${radius}`);
      return { success: true };
    case 'start':
      sendCommand(serverId, `chunky radius ${radius}`);
      setTimeout(() => {
        sendCommand(serverId, 'chunky start');
      }, 300);
      return { success: true };
    case 'pause':
      sendCommand(serverId, 'chunky pause');
      return { success: true };
    case 'cancel':
      sendCommand(serverId, 'chunky cancel');
      return { success: true };
    default:
      return { success: false, error: 'INVALID_ACTION' };
  }
}

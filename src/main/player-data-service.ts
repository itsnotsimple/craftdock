import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface ParsedItem {
  slot: number;
  id: string; // e.g. "minecraft:diamond_sword"
  cleanName: string; // e.g. "Diamond Sword"
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
  hotbar: (ParsedItem | null)[]; // 9 slots
  mainInventory: (ParsedItem | null)[]; // 27 slots
  armor: {
    head: ParsedItem | null;
    chest: ParsedItem | null;
    legs: ParsedItem | null;
    feet: ParsedItem | null;
  };
  offhand: ParsedItem | null;
  enderChest: (ParsedItem | null)[]; // 27 slots
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

// -------------------------------------------------------------
// Pure TypeScript NBT Binary Reader (Fast, Zero Dependencies)
// -------------------------------------------------------------
function readNBT(buffer: Buffer): any {
  let offset = 0;

  function readString(): string {
    if (offset + 2 > buffer.length) return '';
    const len = buffer.readUInt16BE(offset);
    offset += 2;
    if (offset + len > buffer.length) return '';
    const str = buffer.toString('utf8', offset, offset + len);
    offset += len;
    return str;
  }

  function readTag(tagType: number): any {
    switch (tagType) {
      case 0: // TAG_End
        return null;
      case 1: { // TAG_Byte
        if (offset + 1 > buffer.length) return 0;
        const val = buffer.readInt8(offset);
        offset += 1;
        return val;
      }
      case 2: { // TAG_Short
        if (offset + 2 > buffer.length) return 0;
        const val = buffer.readInt16BE(offset);
        offset += 2;
        return val;
      }
      case 3: { // TAG_Int
        if (offset + 4 > buffer.length) return 0;
        const val = buffer.readInt32BE(offset);
        offset += 4;
        return val;
      }
      case 4: { // TAG_Long
        if (offset + 8 > buffer.length) return 0;
        const val = buffer.readBigInt64BE(offset);
        offset += 8;
        return Number(val);
      }
      case 5: { // TAG_Float
        if (offset + 4 > buffer.length) return 0;
        const val = buffer.readFloatBE(offset);
        offset += 4;
        return val;
      }
      case 6: { // TAG_Double
        if (offset + 8 > buffer.length) return 0;
        const val = buffer.readDoubleBE(offset);
        offset += 8;
        return val;
      }
      case 7: { // TAG_Byte_Array
        if (offset + 4 > buffer.length) return [];
        const len = buffer.readInt32BE(offset);
        offset += 4;
        if (offset + len > buffer.length) return [];
        const slice = buffer.slice(offset, offset + len);
        offset += len;
        return slice;
      }
      case 8: // TAG_String
        return readString();
      case 9: { // TAG_List
        if (offset + 5 > buffer.length) return [];
        const itemType = buffer.readInt8(offset);
        offset += 1;
        const len = buffer.readInt32BE(offset);
        offset += 4;
        const list: any[] = [];
        for (let i = 0; i < len; i++) {
          if (offset >= buffer.length) break;
          list.push(readTag(itemType));
        }
        return list;
      }
      case 10: { // TAG_Compound
        const compound: Record<string, any> = {};
        while (offset < buffer.length) {
          const type = buffer.readInt8(offset);
          offset += 1;
          if (type === 0) break;
          const name = readString();
          compound[name] = readTag(type);
        }
        return compound;
      }
      case 11: { // TAG_Int_Array
        if (offset + 4 > buffer.length) return [];
        const len = buffer.readInt32BE(offset);
        offset += 4;
        const arr: number[] = [];
        for (let i = 0; i < len; i++) {
          if (offset + 4 > buffer.length) break;
          arr.push(buffer.readInt32BE(offset));
          offset += 4;
        }
        return arr;
      }
      case 12: { // TAG_Long_Array
        if (offset + 4 > buffer.length) return [];
        const len = buffer.readInt32BE(offset);
        offset += 4;
        const arr: number[] = [];
        for (let i = 0; i < len; i++) {
          if (offset + 8 > buffer.length) break;
          arr.push(Number(buffer.readBigInt64BE(offset)));
          offset += 8;
        }
        return arr;
      }
      default:
        return null;
    }
  }

  if (buffer.length < 3) return {};
  const rootType = buffer.readInt8(offset);
  offset += 1;
  readString(); // Root compound name (usually empty)
  return readTag(rootType) || {};
}

// -------------------------------------------------------------
// Helpers & Item Normalizers
// -------------------------------------------------------------

function cleanItemName(id: string): string {
  const parts = id.replace(/^minecraft:/, '').split('_');
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function parseJsonText(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parseJsonText(parsed);
    } catch {
      return raw;
    }
  }
  if (typeof raw === 'object') {
    if (raw.text) return raw.text;
    if (Array.isArray(raw.extra)) {
      return (raw.text || '') + raw.extra.map((e: any) => parseJsonText(e)).join('');
    }
  }
  return String(raw);
}

function normalizeItem(raw: any): ParsedItem | null {
  if (!raw) return null;

  // Handle possible wrapped structure (e.g. { item: { id: ... } })
  const itemObj = raw.item && typeof raw.item === 'object' ? raw.item : raw;
  if (!itemObj.id || itemObj.id === 'minecraft:air') return null;

  const id: string = String(itemObj.id);
  const count: number = Number(itemObj.count ?? itemObj.Count ?? raw.count ?? raw.Count ?? 1);
  const slot: number = Number(itemObj.Slot ?? itemObj.slot ?? raw.Slot ?? raw.slot ?? 0);

  let customName: string | undefined;
  const lore: string[] = [];
  const enchantments: Array<{ id: string; name: string; level: number }> = [];
  let damage: number | undefined;

  // 1. Legacy tags (< 1.20.5)
  const tag = itemObj.tag || raw.tag;
  if (tag) {
    if (tag.Damage !== undefined) {
      damage = Number(tag.Damage);
    }
    if (tag.display) {
      if (tag.display.Name) {
        customName = parseJsonText(tag.display.Name);
      }
      if (Array.isArray(tag.display.Lore)) {
        for (const l of tag.display.Lore) {
          lore.push(parseJsonText(l));
        }
      }
    }
    const encList = tag.Enchantments || tag.StoredEnchantments;
    if (Array.isArray(encList)) {
      for (const enc of encList) {
        const encId = String(enc.id || '').replace(/^minecraft:/, '');
        enchantments.push({
          id: encId,
          name: cleanItemName(encId),
          level: Number(enc.lvl || 1),
        });
      }
    }
  }

  // 2. Modern 1.20.5+ item components (supports both 'minecraft:...' and unprefixed '...')
  const comps = itemObj.components || raw.components;
  if (comps) {
    const dmg = comps['minecraft:damage'] ?? comps['damage'];
    if (dmg !== undefined) {
      damage = Number(dmg);
    }
    const cName = comps['minecraft:custom_name'] ?? comps['custom_name'];
    if (cName) {
      customName = parseJsonText(cName);
    }
    const loreList = comps['minecraft:lore'] ?? comps['lore'];
    if (Array.isArray(loreList)) {
      for (const l of loreList) {
        lore.push(parseJsonText(l));
      }
    }
    const enchObj =
      comps['minecraft:enchantments'] ??
      comps['enchantments'] ??
      comps['minecraft:stored_enchantments'] ??
      comps['stored_enchantments'];
    const levels =
      enchObj?.levels ||
      (typeof enchObj === 'object' && !Array.isArray(enchObj) ? enchObj : null);
    if (levels) {
      for (const [encKey, lvl] of Object.entries(levels)) {
        const encId = encKey.replace(/^minecraft:/, '');
        enchantments.push({
          id: encId,
          name: cleanItemName(encId),
          level: Number(lvl),
        });
      }
    }
  }

  return {
    slot,
    id,
    cleanName: cleanItemName(id),
    count,
    customName,
    lore: lore.length > 0 ? lore : undefined,
    enchantments: enchantments.length > 0 ? enchantments : undefined,
    damage,
  };
}

export function formatPlaytime(ticks: number, lang: 'bg' | 'en' = 'bg'): string {
  if (!ticks || ticks <= 0) return lang === 'bg' ? '0 мин' : '0 min';
  const totalSeconds = Math.floor(ticks / 20);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (lang === 'bg') {
    if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes} мин`;
  } else {
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  }
}

// -------------------------------------------------------------
// Directory Discovery Helpers
// -------------------------------------------------------------

function findPlayerDataDirs(serverDir: string): { dataDirs: string[]; statsDirs: string[] } {
  const dataDirs: string[] = [];
  const statsDirs: string[] = [];

  const candidatesData = [
    path.join(serverDir, 'world', 'playerdata'),
    path.join(serverDir, 'world', 'players', 'data'),
    path.join(serverDir, 'playerdata'),
  ];

  const candidatesStats = [
    path.join(serverDir, 'world', 'stats'),
    path.join(serverDir, 'world', 'players', 'stats'),
    path.join(serverDir, 'stats'),
  ];

  for (const d of candidatesData) {
    if (fs.existsSync(d)) dataDirs.push(d);
  }
  for (const s of candidatesStats) {
    if (fs.existsSync(s)) statsDirs.push(s);
  }

  return { dataDirs, statsDirs };
}

function loadUserCache(serverDir: string): Map<string, string> {
  const map = new Map<string, string>(); // uuid -> name
  const cachePath = path.join(serverDir, 'usercache.json');
  if (!fs.existsSync(cachePath)) return map;

  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    const entries = JSON.parse(raw);
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry.uuid && entry.name) {
          map.set(entry.uuid.toLowerCase(), entry.name);
        }
      }
    }
  } catch (e) {
    console.error('Error reading usercache.json:', e);
  }
  return map;
}

function findPlayerDataFile(serverDir: string, uuid: string): string | null {
  const cleanUuid = uuid.toLowerCase();
  const { dataDirs } = findPlayerDataDirs(serverDir);

  for (const dir of dataDirs) {
    const p1 = path.join(dir, `${cleanUuid}.dat`);
    if (fs.existsSync(p1)) return p1;
    // Without dashes fallback
    const noDashes = cleanUuid.replace(/-/g, '');
    const p2 = path.join(dir, `${noDashes}.dat`);
    if (fs.existsSync(p2)) return p2;
  }
  return null;
}

function findStatsFile(serverDir: string, uuid: string): string | null {
  const cleanUuid = uuid.toLowerCase();
  const { statsDirs } = findPlayerDataDirs(serverDir);

  for (const dir of statsDirs) {
    const p1 = path.join(dir, `${cleanUuid}.json`);
    if (fs.existsSync(p1)) return p1;
    const noDashes = cleanUuid.replace(/-/g, '');
    const p2 = path.join(dir, `${noDashes}.json`);
    if (fs.existsSync(p2)) return p2;
  }
  return null;
}

// -------------------------------------------------------------
// Core Public APIs
// -------------------------------------------------------------

export function getServerPlayersArchive(
  serverDir: string,
  onlinePlayerNames: string[] = [],
  ops: string[] = [],
  whitelist: string[] = [],
  bans: string[] = []
): PlayerArchiveEntry[] {
  const userCache = loadUserCache(serverDir);
  const nameToUuid = new Map<string, string>();
  for (const [u, n] of userCache.entries()) {
    nameToUuid.set(n.toLowerCase(), u);
  }

  const foundUuids = new Set<string>();
  const { dataDirs, statsDirs } = findPlayerDataDirs(serverDir);

  // Scan .dat files
  for (const dir of dataDirs) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.dat') && !file.includes('_old')) {
          const rawUuid = file.slice(0, -4);
          foundUuids.add(rawUuid.toLowerCase());
        }
      }
    } catch {}
  }

  // Scan stats .json files
  for (const dir of statsDirs) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const rawUuid = file.slice(0, -5);
          foundUuids.add(rawUuid.toLowerCase());
        }
      }
    } catch {}
  }

  // Also incorporate usercache entries
  for (const uuid of userCache.keys()) {
    foundUuids.add(uuid);
  }

  // Also incorporate online players
  for (const onName of onlinePlayerNames) {
    const matchedUuid = nameToUuid.get(onName.toLowerCase());
    if (matchedUuid) {
      foundUuids.add(matchedUuid);
    }
  }

  // Read player-history.json if present
  let sessionHistory: any = null;
  const historyPath = path.join(serverDir, 'craftdock-data', 'player-history.json');
  if (fs.existsSync(historyPath)) {
    try {
      sessionHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch {}
  }

  const entries: PlayerArchiveEntry[] = [];

  for (const uuid of foundUuids) {
    let name = userCache.get(uuid) || uuid;
    // Check if name is found in online players or session history
    if (name === uuid && sessionHistory?.players) {
      for (const pName of Object.keys(sessionHistory.players)) {
        const u = nameToUuid.get(pName.toLowerCase());
        if (u === uuid) {
          name = pName;
          break;
        }
      }
    }

    let playTimeTicks = 0;
    let mobKills = 0;
    let deaths = 0;
    let lastPlayedDate = new Date(0);

    // 1. Check stats JSON
    const statsFile = findStatsFile(serverDir, uuid);
    if (statsFile) {
      try {
        const mtime = fs.statSync(statsFile).mtime;
        if (mtime > lastPlayedDate) lastPlayedDate = mtime;

        const rawStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        const custom = rawStats?.stats?.['minecraft:custom'] || {};
        playTimeTicks = Number(custom['minecraft:play_time'] || custom['minecraft:play_one_minute'] || 0);
        mobKills = Number(custom['minecraft:mob_kills'] || 0);
        deaths = Number(custom['minecraft:deaths'] || 0);
      } catch {}
    }

    // 2. Check playerdata .dat file mtime
    const datFile = findPlayerDataFile(serverDir, uuid);
    let health: number | undefined;
    let xpLevel: number | undefined;
    let dimension: string | undefined;

    if (datFile) {
      try {
        const mtime = fs.statSync(datFile).mtime;
        if (mtime > lastPlayedDate) lastPlayedDate = mtime;

        // Quick lightweight parse for summary info
        const buf = fs.readFileSync(datFile);
        const decomp = zlib.gunzipSync(buf);
        const nbt = readNBT(decomp);
        if (nbt) {
          if (nbt.Health !== undefined) health = Number(nbt.Health);
          if (nbt.XpLevel !== undefined) xpLevel = Number(nbt.XpLevel);
          if (nbt.Dimension) dimension = String(nbt.Dimension);
        }
      } catch {}
    }

    // 3. Fallback to session tracker if stats play_time wasn't present
    if (playTimeTicks === 0 && sessionHistory?.players?.[name]) {
      const pStats = sessionHistory.players[name];
      playTimeTicks = (pStats.totalPlaytimeSeconds || 0) * 20;
      if (pStats.lastSeen) {
        const dt = new Date(pStats.lastSeen);
        if (dt > lastPlayedDate) lastPlayedDate = dt;
      }
    }

    const lowerName = name.toLowerCase();
    const isOnline = onlinePlayerNames.some((o) => o.toLowerCase() === lowerName);
    const isOp = ops.some((o) => o.toLowerCase() === lowerName);
    const isWhitelisted = whitelist.some((w) => w.toLowerCase() === lowerName);
    const isBanned = bans.some((b) => b.toLowerCase() === lowerName);

    entries.push({
      uuid,
      name,
      isOnline,
      isOp,
      isWhitelisted,
      isBanned,
      playTimeTicks,
      playTimeFormatted: formatPlaytime(playTimeTicks, 'bg'),
      lastPlayed: lastPlayedDate.getTime() > 0 ? lastPlayedDate.toISOString() : new Date().toISOString(),
      mobKills,
      deaths,
      xpLevel,
      health,
      dimension,
      avatarUrl: `https://minotar.net/helm/${encodeURIComponent(name)}/64.png`,
      accountType: (uuid.split('-')?.[2]?.[0] === '3') ? 'offline' : 'online',
    });
  }

  // Sort: Online players first, then by Playtime descending, then by lastPlayed descending
  entries.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (b.playTimeTicks !== a.playTimeTicks) return b.playTimeTicks - a.playTimeTicks;
    return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
  });

  return entries;
}

export function getPlayerFullData(
  serverDir: string,
  uuid: string,
  playerName?: string
): PlayerInventoryData | null {
  const cleanUuid = uuid.toLowerCase();
  const datFile = findPlayerDataFile(serverDir, cleanUuid);

  if (!datFile) {
    return null;
  }

  try {
    const rawBuf = fs.readFileSync(datFile);
    const decompressed = zlib.gunzipSync(rawBuf);
    const data = readNBT(decompressed);
    if (!data) return null;

    const userCache = loadUserCache(serverDir);
    const name = playerName || userCache.get(cleanUuid) || cleanUuid;

    // Parse stats
    let playTimeTicks = 0;
    let mobKills = 0;
    let playerKills = 0;
    let deaths = 0;
    let damageDealt = 0;
    let damageTaken = 0;

    const statsFile = findStatsFile(serverDir, cleanUuid);
    if (statsFile) {
      try {
        const rawStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        const custom = rawStats?.stats?.['minecraft:custom'] || {};
        playTimeTicks = Number(custom['minecraft:play_time'] || custom['minecraft:play_one_minute'] || 0);
        mobKills = Number(custom['minecraft:mob_kills'] || 0);
        playerKills = Number(custom['minecraft:player_kills'] || 0);
        deaths = Number(custom['minecraft:deaths'] || 0);
        damageDealt = Number(custom['minecraft:damage_dealt'] || 0);
        damageTaken = Number(custom['minecraft:damage_taken'] || 0);
      } catch {}
    }

    // Slot containers
    const hotbar: (ParsedItem | null)[] = new Array(9).fill(null);
    const mainInventory: (ParsedItem | null)[] = new Array(27).fill(null);
    const armor = {
      head: null as ParsedItem | null,
      chest: null as ParsedItem | null,
      legs: null as ParsedItem | null,
      feet: null as ParsedItem | null,
    };
    let offhand: ParsedItem | null = null;
    const enderChest: (ParsedItem | null)[] = new Array(27).fill(null);

    // 1. Parse Inventory array (Hotbar, Main Inventory, legacy Armor & Offhand)
    if (Array.isArray(data.Inventory)) {
      for (const rawItem of data.Inventory) {
        const item = normalizeItem(rawItem);
        if (!item) continue;

        const slot = item.slot;
        if (slot >= 0 && slot <= 8) {
          hotbar[slot] = item;
        } else if (slot >= 9 && slot <= 35) {
          mainInventory[slot - 9] = item;
        } else if (slot === 103 || slot === 39) {
          if (!armor.head) armor.head = item;
        } else if (slot === 102 || slot === 38) {
          if (!armor.chest) armor.chest = item;
        } else if (slot === 101 || slot === 37) {
          if (!armor.legs) armor.legs = item;
        } else if (slot === 100 || slot === 36) {
          if (!armor.feet) armor.feet = item;
        } else if (slot === -106 || slot === 150 || slot === 40) {
          if (!offhand) offhand = item;
        }
      }
    }

    // 2. Parse Modern Minecraft 1.21.5+ / Snapshots 25w/26.x `equipment` compound or list
    const eq = (data.equipment || data.Equipment) as any;
    if (eq && typeof eq === 'object') {
      if (Array.isArray(eq)) {
        for (const rawEq of eq) {
          const item = normalizeItem(rawEq);
          if (!item) continue;
          const slotStr = String(rawEq.slot ?? rawEq.Slot ?? rawEq.type ?? '').toLowerCase();
          const slotNum = Number(rawEq.slot ?? rawEq.Slot ?? -999);
          if (slotStr.includes('head') || slotStr.includes('helmet') || slotNum === 103 || slotNum === 3) {
            armor.head = item;
          } else if (slotStr.includes('chest') || slotNum === 102 || slotNum === 2) {
            armor.chest = item;
          } else if (slotStr.includes('leg') || slotNum === 101 || slotNum === 1) {
            armor.legs = item;
          } else if (slotStr.includes('feet') || slotStr.includes('boot') || slotNum === 100 || slotNum === 0) {
            armor.feet = item;
          } else if (slotStr.includes('offhand') || slotStr.includes('shield') || slotNum === -106 || slotNum === 150 || slotNum === 40 || slotNum === 4 || slotNum === 5) {
            offhand = item;
          }
        }
      } else {
        // eq is a Compound map: { head?: {...}, chest?: {...}, legs?: {...}, feet?: {...}, offhand?: {...} }
        for (const [key, val] of Object.entries(eq)) {
          if (!val) continue;
          const item = normalizeItem(val);
          if (!item) continue;
          const k = key.toLowerCase();
          if (k.includes('head') || k.includes('helmet')) {
            armor.head = item;
          } else if (k.includes('chest')) {
            armor.chest = item;
          } else if (k.includes('leg')) {
            armor.legs = item;
          } else if (k.includes('feet') || k.includes('boot')) {
            armor.feet = item;
          } else if (k.includes('offhand') || k.includes('off_hand') || k.includes('subweapon')) {
            offhand = item;
          }
        }
      }
    }

    // 3. Fallback to ArmorItems & HandItems (used by entities, mobs and custom datapacks)
    if (Array.isArray(data.ArmorItems)) {
      if (!armor.feet && data.ArmorItems[0]) armor.feet = normalizeItem(data.ArmorItems[0]);
      if (!armor.legs && data.ArmorItems[1]) armor.legs = normalizeItem(data.ArmorItems[1]);
      if (!armor.chest && data.ArmorItems[2]) armor.chest = normalizeItem(data.ArmorItems[2]);
      if (!armor.head && data.ArmorItems[3]) armor.head = normalizeItem(data.ArmorItems[3]);
    }
    if (Array.isArray(data.HandItems) && !offhand && data.HandItems[1]) {
      offhand = normalizeItem(data.HandItems[1]);
    }

    // Parse EnderItems array
    if (Array.isArray(data.EnderItems)) {
      for (const rawItem of data.EnderItems) {
        const item = normalizeItem(rawItem);
        if (!item) continue;
        if (item.slot >= 0 && item.slot <= 26) {
          enderChest[item.slot] = item;
        }
      }
    }

    const pos = Array.isArray(data.Pos) && data.Pos.length >= 3
      ? [Number(data.Pos[0].toFixed(1)), Number(data.Pos[1].toFixed(1)), Number(data.Pos[2].toFixed(1))] as [number, number, number]
      : [0, 0, 0] as [number, number, number];

    const mtime = fs.statSync(datFile).mtime;

    return {
      uuid: cleanUuid,
      name,
      health: Number(data.Health ?? 20),
      maxHealth: 20,
      foodLevel: Number(data.foodLevel ?? 20),
      xpLevel: Number(data.XpLevel ?? 0),
      xpTotal: Number(data.XpTotal ?? 0),
      score: Number(data.Score ?? 0),
      dimension: String(data.Dimension ?? 'minecraft:overworld'),
      pos,
      gameType: Number(data.playerGameType ?? 0),
      lastPlayed: mtime.toISOString(),
      playTimeTicks,
      playTimeFormatted: formatPlaytime(playTimeTicks, 'bg'),
      mobKills,
      playerKills,
      deaths,
      damageDealt,
      damageTaken,
      hotbar,
      mainInventory,
      armor,
      offhand,
      enderChest,
    };
  } catch (err) {
    console.error(`Failed to parse player data for ${uuid}:`, err);
    return null;
  }
}

import fs from 'fs';
import path from 'path';

/**
 * Reads a CraftDock data file (servers.json, tasks.json, app-settings.json).
 * A damaged file is kept as `<name>.corrupt-<time>` and the copy from the previous save (`<name>.bak`)
 * is used instead, so the next save can never wipe the user's data with an empty list.
 */
export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (err) {
    console.error(`[CraftDock] ${path.basename(filePath)} is damaged:`, err);
    try {
      fs.copyFileSync(filePath, `${filePath}.corrupt-${Date.now()}`);
    } catch {}
  }

  try {
    const restored = JSON.parse(fs.readFileSync(`${filePath}.bak`, 'utf-8')) as T;
    console.warn(`[CraftDock] Restored ${path.basename(filePath)} from its backup copy`);
    return restored;
  } catch {
    console.error(`[CraftDock] No usable backup of ${path.basename(filePath)}; the damaged file was kept next to it`);
    return fallback;
  }
}

/**
 * Writes a data file atomically (temp file + rename), keeping the previous version as `<name>.bak`.
 * A crash or full disk mid-write leaves the old file intact instead of a half-written one.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, content, 'utf-8');

  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    } catch {}
  }

  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    // Windows can refuse the rename while antivirus or an indexer holds the file
    fs.writeFileSync(filePath, content, 'utf-8');
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  }
}

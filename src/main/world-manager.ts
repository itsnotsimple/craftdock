import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface WorldInfo {
  name: string;           // 'world', 'world_nether', 'world_the_end', or custom name
  path: string;           // absolute path
  sizeMb: number;         // total size in MB
  dimension: 'overworld' | 'nether' | 'the_end' | 'custom';
  exists: boolean;
  playerDataCount: number; // number of .dat files in playerdata/
  lastModified: string;    // ISO timestamp of most recent file modification
}

export interface WorldBackupInfo {
  fileName: string;
  sizeMb: number;
  createdAt: string;
  worldName: string;
}

function getDirSizeBytes(dirPath: string): number {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          totalSize += getDirSizeBytes(filePath);
        } else {
          totalSize += stats.size;
        }
      } catch (err) {
        // Ignore inaccessible files
      }
    }
  } catch (err) {
    // Ignore inaccessible directories
  }
  return totalSize;
}

function getDirSizeMb(dirPath: string): number {
  return Math.round((getDirSizeBytes(dirPath) / (1024 * 1024)) * 10) / 10;
}

function getLatestMtime(dirPath: string): Date {
  let latest = new Date(0);
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.mtime > latest) {
          latest = stats.mtime;
        }
        if (stats.isDirectory()) {
          const dirLatest = getLatestMtime(filePath);
          if (dirLatest > latest) {
            latest = dirLatest;
          }
        }
      } catch (err) {
        // Ignore errors
      }
    }
  } catch (err) {
    // Ignore errors
  }
  return latest;
}

export function getServerWorlds(serverDir: string): WorldInfo[] {
  const worlds: WorldInfo[] = [];
  try {
    if (!fs.existsSync(serverDir)) return worlds;
    const entries = fs.readdirSync(serverDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('world')) {
        const worldPath = path.join(serverDir, entry.name);
        
        let dimension: 'overworld' | 'nether' | 'the_end' | 'custom' = 'custom';
        if (entry.name === 'world') dimension = 'overworld';
        else if (entry.name === 'world_nether') dimension = 'nether';
        else if (entry.name === 'world_the_end') dimension = 'the_end';
        
        const sizeMb = getDirSizeMb(worldPath);
        const lastModified = getLatestMtime(worldPath).toISOString();
        
        let playerDataCount = 0;
        const playerDataPath = path.join(worldPath, 'playerdata');
        if (fs.existsSync(playerDataPath)) {
          try {
            const playerFiles = fs.readdirSync(playerDataPath);
            playerDataCount = playerFiles.filter(f => f.endsWith('.dat')).length;
          } catch (e) {
            // Ignore error
          }
        }
        
        worlds.push({
          name: entry.name,
          path: worldPath,
          sizeMb,
          dimension,
          exists: true,
          playerDataCount,
          lastModified
        });
      }
    }
  } catch (error) {
    console.error('Error scanning server worlds:', error);
  }
  return worlds;
}

export function resetWorld(serverDir: string, worldName: string): boolean {
  if (worldName === 'world') {
    console.warn('Safety restriction: Cannot delete the main "world" directory.');
    return false;
  }
  
  try {
    const target = path.join(serverDir, worldName);
    if (!fs.existsSync(target)) {
      return false;
    }
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Error resetting world ${worldName}:`, error);
    return false;
  }
}

export async function importWorld(serverDir: string, zipPath: string, targetWorldName: string): Promise<boolean> {
  try {
    const targetPath = path.join(serverDir, targetWorldName);
    
    if (fs.existsSync(targetPath)) {
      const backupPath = path.join(serverDir, `${targetWorldName}_backup_${Date.now()}`);
      fs.renameSync(targetPath, backupPath);
    }
    
    fs.mkdirSync(targetPath, { recursive: true });
    
    if (process.platform === 'win32') {
      execSync(`powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetPath}' -Force"`);
    } else {
      execSync(`tar -xf "${zipPath}" -C "${targetPath}"`);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing world:', error);
    return false;
  }
}

export function getWorldBackups(serverDir: string): WorldBackupInfo[] {
  const backups: WorldBackupInfo[] = [];
  const backupsDir = path.join(serverDir, 'backups');
  
  try {
    if (!fs.existsSync(backupsDir)) return backups;
    
    const files = fs.readdirSync(backupsDir);
    for (const file of files) {
      if (!file.endsWith('.zip')) continue;
      
      const filePath = path.join(backupsDir, file);
      try {
        const stats = fs.statSync(filePath);
        
        // Attempt to parse world name. e.g., world_backup_12345.zip -> world
        let worldName = file.replace('.zip', '');
        const backupMatch = worldName.match(/^(.*?)_backup_\d+$/);
        if (backupMatch) {
          worldName = backupMatch[1];
        }
        
        backups.push({
          fileName: file,
          sizeMb: Math.round((stats.size / (1024 * 1024)) * 10) / 10,
          createdAt: (stats.birthtime && stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime).toISOString(),
          worldName
        });
      } catch (e) {
        // Ignore file stat errors
      }
    }
  } catch (error) {
    console.error('Error getting world backups:', error);
  }
  
  return backups;
}

export function deleteWorldBackup(serverDir: string, fileName: string): boolean {
  try {
    const backupPath = path.join(serverDir, 'backups', fileName);
    if (!fs.existsSync(backupPath)) return false;
    
    fs.unlinkSync(backupPath);
    return true;
  } catch (error) {
    console.error('Error deleting world backup:', error);
    return false;
  }
}

export async function restoreWorldBackup(serverDir: string, fileName: string): Promise<boolean> {
  try {
    const backupPath = path.join(serverDir, 'backups', fileName);
    if (!fs.existsSync(backupPath)) return false;

    const worldPath = path.join(serverDir, 'world');
    const tempBackup = path.join(serverDir, `world_pre_restore_${Date.now()}`);

    if (fs.existsSync(worldPath)) {
      fs.renameSync(worldPath, tempBackup);
    }

    try {
      if (process.platform === 'win32') {
        execSync(`powershell.exe -NoProfile -Command "Expand-Archive -Path '${backupPath}' -DestinationPath '${serverDir}' -Force"`);
      } else {
        execSync(`tar -xf "${backupPath}" -C "${serverDir}"`);
      }

      if (fs.existsSync(tempBackup)) {
        fs.rmSync(tempBackup, { recursive: true, force: true });
      }
      return true;
    } catch (extractErr) {
      if (fs.existsSync(tempBackup)) {
        if (fs.existsSync(worldPath)) {
          fs.rmSync(worldPath, { recursive: true, force: true });
        }
        fs.renameSync(tempBackup, worldPath);
      }
      throw extractErr;
    }
  } catch (error) {
    console.error('Error restoring world backup:', error);
    return false;
  }
}

export async function exportWorldZip(
  serverDir: string,
  worldName: string,
  destZipPath: string
): Promise<{ success: boolean; sizeMb: number; error?: string }> {
  try {
    const worldDir = path.join(serverDir, worldName);
    if (!fs.existsSync(worldDir)) {
      return { success: false, sizeMb: 0, error: 'Директорията на света не беше намерена.' };
    }

    const destDir = path.dirname(destZipPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (process.platform === 'win32') {
      execSync(`tar -a -cf "${destZipPath}" -C "${serverDir}" "${worldName}"`);
    } else {
      execSync(`tar -czf "${destZipPath}" -C "${serverDir}" "${worldName}"`);
    }

    const stat = fs.statSync(destZipPath);
    const sizeMb = Math.round((stat.size / (1024 * 1024)) * 10) / 10;
    return { success: true, sizeMb };
  } catch (err: any) {
    console.error('Error exporting world archive:', err);
    return { success: false, sizeMb: 0, error: err?.message || 'Export world failed' };
  }
}



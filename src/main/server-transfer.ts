import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ServerProfile, addServer, loadServers, getDefaultServerFolder } from './server-store';
import { readServerProperties } from './server-config';
import { autoAcceptEula } from './server-runner';

export interface ExportResult {
  success: boolean;
  filePath: string;
  sizeMb: number;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  profile?: ServerProfile;
  error?: string;
}

/**
 * Exports an entire server directory to a portable .zip archive
 */
export async function exportServerArchive(
  serverPath: string,
  profile: ServerProfile,
  targetZipPath: string
): Promise<ExportResult> {
  try {
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server directory does not exist: ${serverPath}`);
    }

    // Ensure target folder exists
    const targetDir = path.dirname(targetZipPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Create temporary craftdock-profile.json manifest inside server folder
    const manifestPath = path.join(serverPath, 'craftdock-profile.json');
    const manifestData = {
      craftdockVersion: '3.3.0',
      exportedAt: new Date().toISOString(),
      name: profile.name,
      software: profile.software,
      version: profile.version,
      allocatedRamGb: profile.allocatedRamGb,
      storageQuotaGb: profile.storageQuotaGb || 0,
      port: profile.port,
      motd: profile.motd,
      hardcore: profile.hardcore ?? false,
      cardTheme: profile.cardTheme || 'default',
      cardIcon: profile.cardIcon || 'default',
      maxPlayers: profile.maxPlayers || 20,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');

    // Use native tar (bsdtar) to archive with exclusion of heavy backup directories and old logs
    try {
      execSync(
        `tar -a -cf "${targetZipPath}" -C "${serverPath}" --exclude="backups" --exclude="*.log" --exclude="*.log.gz" --exclude="playit" .`,
        { stdio: 'ignore' }
      );
    } catch (tarErr) {
      // Fallback to PowerShell Compress-Archive on Windows if tar had any parameter issue
      if (process.platform === 'win32') {
        const psCommand = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${serverPath}\\*' -DestinationPath '${targetZipPath}' -Force"`;
        execSync(psCommand, { stdio: 'ignore' });
      } else {
        throw tarErr;
      }
    }

    // Clean up temporary manifest
    if (fs.existsSync(manifestPath)) {
      try {
        fs.unlinkSync(manifestPath);
      } catch (e) {
        // ignore cleanup error
      }
    }

    if (!fs.existsSync(targetZipPath)) {
      throw new Error('Failed to create archive file');
    }

    const stat = fs.statSync(targetZipPath);
    const sizeMb = Math.round((stat.size / (1024 * 1024)) * 10) / 10;

    return {
      success: true,
      filePath: targetZipPath,
      sizeMb,
    };
  } catch (error: any) {
    console.error('Failed to export server archive:', error);
    return {
      success: false,
      filePath: '',
      sizeMb: 0,
      error: error?.message || 'Unknown export error',
    };
  }
}

/**
 * Imports a server from a .zip archive, extracts files, detects properties, and registers a new ServerProfile
 */
export async function importServerArchive(
  zipPath: string,
  destinationServersFolder: string
): Promise<ImportResult> {
  try {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`Archive file does not exist: ${zipPath}`);
    }

    if (!fs.existsSync(destinationServersFolder)) {
      fs.mkdirSync(destinationServersFolder, { recursive: true });
    }

    // Extract file name without extension as initial base name
    const zipBaseName = path.basename(zipPath, path.extname(zipPath)).replace(/^backup_|^export_/, '');
    let targetFolderName = zipBaseName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    let destPath = path.join(destinationServersFolder, targetFolderName);

    // If folder already exists, append timestamp
    if (fs.existsSync(destPath)) {
      targetFolderName = `${targetFolderName}_${Date.now()}`;
      destPath = path.join(destinationServersFolder, targetFolderName);
    }

    fs.mkdirSync(destPath, { recursive: true });

    // Extract archive using tar
    try {
      execSync(`tar -xf "${zipPath}" -C "${destPath}"`, { stdio: 'ignore' });
    } catch (tarErr) {
      if (process.platform === 'win32') {
        const psCommand = `powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`;
        execSync(psCommand, { stdio: 'ignore' });
      } else {
        throw tarErr;
      }
    }

    // Check if extracted content was nested in a single top-level directory
    const extractedEntries = fs.readdirSync(destPath);
    if (extractedEntries.length === 1) {
      const singleItem = path.join(destPath, extractedEntries[0]);
      if (fs.statSync(singleItem).isDirectory()) {
        const nestedFiles = fs.readdirSync(singleItem);
        for (const f of nestedFiles) {
          fs.renameSync(path.join(singleItem, f), path.join(destPath, f));
        }
        try {
          fs.rmdirSync(singleItem);
        } catch (e) {
          // ignore
        }
      }
    }

    // Automatically ensure EULA acceptance
    autoAcceptEula(destPath);

    // Read CraftDock manifest if available
    let manifest: any = null;
    const manifestPath = path.join(destPath, 'craftdock-profile.json');
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch (e) {
        console.warn('Could not parse craftdock-profile.json:', e);
      }
    }

    // Read server.properties if available
    let properties: any = {};
    try {
      properties = readServerProperties(destPath);
    } catch (e) {
      // server.properties might not exist yet
    }

    // Calculate free port to avoid collision with existing servers
    const existingServers = loadServers();
    const usedPorts = new Set(existingServers.map((s) => s.port));
    let assignedPort = manifest?.port || properties.port || 25565;
    while (usedPorts.has(assignedPort)) {
      assignedPort++;
    }

    // Detect software from files
    let detectedSoftware: 'paper' | 'purpur' | 'vanilla' | 'fabric' = 'paper';
    let detectedVersion = '1.21.4';

    if (manifest?.software) {
      detectedSoftware = manifest.software;
    } else {
      const files = fs.readdirSync(destPath).map((f) => f.toLowerCase());
      if (files.some((f) => f.includes('purpur'))) detectedSoftware = 'purpur';
      else if (files.some((f) => f.includes('fabric'))) detectedSoftware = 'fabric';
      else if (files.some((f) => f.includes('paper'))) detectedSoftware = 'paper';
      else detectedSoftware = 'vanilla';
    }

    if (manifest?.version) {
      detectedVersion = manifest.version;
    }

    const serverName = manifest?.name || zipBaseName.replace(/_/g, ' ') || 'Импортиран сървър';

    const newProfile: ServerProfile = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: serverName,
      software: detectedSoftware,
      version: detectedVersion,
      allocatedRamGb: manifest?.allocatedRamGb || 4,
      storageQuotaGb: manifest?.storageQuotaGb || 0,
      port: assignedPort,
      path: destPath,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      playerCount: 0,
      maxPlayers: manifest?.maxPlayers || properties.maxPlayers || 20,
      motd: manifest?.motd || properties.motd || `${serverName} - CraftDock`,
      hardcore: manifest?.hardcore ?? properties.hardcore ?? false,
      cardTheme: manifest?.cardTheme || 'default',
      cardIcon: manifest?.cardIcon || 'default',
    };

    addServer(newProfile);

    // Clean up temporary manifest inside server directory if present
    if (fs.existsSync(manifestPath)) {
      try {
        fs.unlinkSync(manifestPath);
      } catch (e) {
        // ignore
      }
    }

    return {
      success: true,
      profile: newProfile,
    };
  } catch (error: any) {
    console.error('Failed to import server archive:', error);
    return {
      success: false,
      error: error?.message || 'Unknown import error',
    };
  }
}

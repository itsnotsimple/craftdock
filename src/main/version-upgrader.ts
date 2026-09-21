import fs from 'fs';
import path from 'path';
import { ServerProfile, updateServer } from './server-store';
import { isServerRunning } from './server-runner';
import { createWorldBackup } from './server-config';
import {
  getPaperDownloadUrl,
  getPurpurDownloadUrl,
  getVanillaDownloadUrl,
  getFabricDownloadUrl,
  downloadFileWithProgress,
} from './api-service';

export interface UpgradeProgressEvent {
  percent: number;
  message: string;
}

export interface UpgradeResult {
  success: boolean;
  newVersion?: string;
  backupFile?: string;
  error?: string;
}

/**
 * Upgrades the server jar in-place to a new version with an automatic pre-upgrade safety backup
 */
export async function upgradeServerVersion(
  server: ServerProfile,
  targetVersion: string,
  onProgress?: (event: UpgradeProgressEvent) => void
): Promise<UpgradeResult> {
  try {
    // 1. Verify server is stopped
    if (isServerRunning(server.id)) {
      return {
        success: false,
        error: 'Сървърът трябва да бъде спрян преди ъпгрейд.',
      };
    }

    if (!fs.existsSync(server.path)) {
      return {
        success: false,
        error: `Папката на сървъра не съществува: ${server.path}`,
      };
    }

    // 2. Pre-upgrade safety backup
    onProgress?.({
      percent: 10,
      message: 'Създаване на предпазен бекъп на света...',
    });

    let backupFileName = '';
    try {
      backupFileName = createWorldBackup(server.path);
    } catch (bErr) {
      console.warn('Pre-upgrade world backup warning:', bErr);
    }

    // 3. Resolve target download URL
    onProgress?.({
      percent: 25,
      message: `Търсене на инсталатор за ${server.software.toUpperCase()} v${targetVersion}...`,
    });

    let downloadUrl = '';
    switch (server.software) {
      case 'paper':
        downloadUrl = await getPaperDownloadUrl(targetVersion);
        break;
      case 'purpur':
        downloadUrl = await getPurpurDownloadUrl(targetVersion);
        break;
      case 'fabric':
        downloadUrl = await getFabricDownloadUrl(targetVersion);
        break;
      case 'vanilla':
      default:
        downloadUrl = await getVanillaDownloadUrl(targetVersion);
        break;
    }

    if (!downloadUrl) {
      throw new Error(`Не може да бъде намерен линк за изтегляне на ${server.software} v${targetVersion}`);
    }

    // 4. Download new jar to temporary file
    const tempJarPath = path.join(server.path, `server_new_${Date.now()}.jar`);
    await downloadFileWithProgress(downloadUrl, tempJarPath, (percent, downloadedMb, totalMb) => {
      const overallPercent = 25 + Math.round((percent / 100) * 65);
      onProgress?.({
        percent: overallPercent,
        message: `Изтегляне на новата версия (${percent}% - ${downloadedMb}MB / ${totalMb}MB)...`,
      });
    });

    if (!fs.existsSync(tempJarPath) || fs.statSync(tempJarPath).size === 0) {
      throw new Error('Изтегленият файл е празен или липсва.');
    }

    // 5. Replace server.jar
    onProgress?.({
      percent: 92,
      message: 'Заместване на сървърния JAR файл...',
    });

    const targetJarPath = path.join(server.path, 'server.jar');
    const oldJarBackup = path.join(server.path, 'server.jar.old');

    // Backup current jar
    if (fs.existsSync(targetJarPath)) {
      try {
        if (fs.existsSync(oldJarBackup)) {
          fs.unlinkSync(oldJarBackup);
        }
        fs.renameSync(targetJarPath, oldJarBackup);
      } catch (e) {
        console.warn('Could not rename old jar, will overwrite:', e);
      }
    }

    fs.renameSync(tempJarPath, targetJarPath);

    // 6. Update server profile
    onProgress?.({
      percent: 98,
      message: 'Актуализиране на профила на сървъра...',
    });

    updateServer(server.id, { version: targetVersion });

    onProgress?.({
      percent: 100,
      message: `Сървърът е успешно обновен до v${targetVersion}!`,
    });

    return {
      success: true,
      newVersion: targetVersion,
      backupFile: backupFileName,
    };
  } catch (error: any) {
    console.error('Failed to upgrade server version:', error);
    return {
      success: false,
      error: error?.message || 'Грешка при обновяване на версията.',
    };
  }
}

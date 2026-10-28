import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from 'electron';
import { downloadFileWithProgress } from './api-service';

const execFileAsync = promisify(execFile);

function getAppDirectory(): string {
  try {
    if (app && app.getPath) {
      return path.join(app.getPath('userData'), 'minecraft_servers_data');
    }
  } catch (e) {}
  return path.join(os.homedir(), '.minecraft_server_manager');
}

export interface JavaStatus {
  systemJavaVersion: number;
  systemJavaPath: string;
  portableJavaAvailable: boolean;
  portableJavaPath?: string;
  isCompatible: boolean;
  requiredVersion: number;
}

export function parseJavaVersion(output: string): number {
  // matches "1.8.0_..." -> 8, "17.0.2" -> 17, "21.0.1" -> 21, "25.0.0" -> 25
  const match = output.match(/version "(?:1\.)?(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

export async function getSystemJavaVersion(): Promise<{ version: number; raw: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn('java', ['-version']);
      let output = '';
      proc.stderr.on('data', (d) => (output += d.toString()));
      proc.stdout.on('data', (d) => (output += d.toString()));
      proc.on('close', () => {
        resolve({ version: parseJavaVersion(output), raw: output });
      });
      proc.on('error', () => {
        resolve({ version: 0, raw: 'Java not installed' });
      });
    } catch (e) {
      resolve({ version: 0, raw: 'Java not installed' });
    }
  });
}

export function getRequiredJavaVersion(mcVersion: string): number {
  const parts = mcVersion.split('.');
  const majorNum = parseInt(parts[0], 10);

  // Future / 2026 Mojang releases (e.g. 26.x or 25.x) require Java 25!
  if (!isNaN(majorNum) && majorNum >= 25) {
    return 25;
  }

  // Minecraft 1.20.5 through 1.21.x requires Java 21
  if (mcVersion.startsWith('1.21') || mcVersion === '1.20.5' || mcVersion === '1.20.6') {
    return 21;
  }

  // Minecraft 1.17 through 1.20.4 requires Java 17
  if (
    mcVersion.startsWith('1.17') ||
    mcVersion.startsWith('1.18') ||
    mcVersion.startsWith('1.19') ||
    mcVersion.startsWith('1.20')
  ) {
    return 17;
  }

  // 1.16.5 and older run on Java 8
  return 8;
}

/**
 * Newest Java a Minecraft version accepts. Paper/Purpur 1.16 and older refuse to start on a newer Java
 * ("Unsupported Java detected"), so those always get Java 8 even when the Mac has a newer one installed.
 */
export function getMaxJavaVersion(mcVersion: string): number {
  return getRequiredJavaVersion(mcVersion) === 8 ? 8 : Number.POSITIVE_INFINITY;
}

export function isJavaSuitable(javaVersion: number, mcVersion: string): boolean {
  return javaVersion >= getRequiredJavaVersion(mcVersion) && javaVersion <= getMaxJavaVersion(mcVersion);
}

export function findPortableJavaExe(majorVersion: number): string | null {
  const runtimesDir = path.join(getAppDirectory(), 'runtimes', `java${majorVersion}`);
  if (!fs.existsSync(runtimesDir)) return null;

  const search = (dir: string): string | null => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.toLowerCase() === 'bin') {
            const javaExe = path.join(fullPath, process.platform === 'win32' ? 'java.exe' : 'java');
            if (fs.existsSync(javaExe)) return javaExe;
          }
          const found = search(fullPath);
          if (found) return found;
        }
      }
    } catch (e) {}
    return null;
  };

  return search(runtimesDir);
}

export async function checkJavaStatusForVersion(mcVersion: string): Promise<JavaStatus> {
  const { version: sysVer } = await getSystemJavaVersion();
  const reqVer = getRequiredJavaVersion(mcVersion);
  const portable = findPortableJavaExe(reqVer);

  const isCompatible = isJavaSuitable(sysVer, mcVersion) || !!portable;

  return {
    systemJavaVersion: sysVer,
    systemJavaPath: 'java',
    portableJavaAvailable: !!portable,
    portableJavaPath: portable || undefined,
    isCompatible,
    requiredVersion: reqVer,
  };
}

async function getJavaDownloadUrl(version: number, platform: string, arch: string): Promise<string> {
  // Adoptium (Temurin) has no Java 8 build for Apple Silicon; Azul Zulu does
  if (version === 8 && platform === 'mac' && arch === 'aarch64') {
    const res = await fetch(
      'https://api.azul.com/metadata/v1/zulu/packages/?java_version=8&os=macos&arch=aarch64&archive_type=tar.gz' +
        '&java_package_type=jdk&latest=true&release_status=ga&availability_types=CA&page_size=1'
    );
    const packages = res.ok ? ((await res.json()) as Array<{ download_url?: string }>) : [];
    if (!packages[0]?.download_url) {
      throw new Error('Не може да бъде намерена Java 8 за Apple Silicon (Azul Zulu).');
    }
    return packages[0].download_url;
  }
  return `https://api.adoptium.net/v3/binary/latest/${version}/ga/${platform}/${arch}/jdk/hotspot/normal/eclipse`;
}

export async function downloadPortableJava(
  version: number,
  onProgress: (percent: number, downloadedMb: number, totalMb: number, msg: string) => void
): Promise<string> {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const targetDir = path.join(getAppDirectory(), 'runtimes', `java${version}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const ext = isWin ? 'zip' : 'tar.gz';
  const tempArchive = path.join(getAppDirectory(), `temurin_java${version}.${ext}`);

  onProgress(5, 0, 0, `Връзка с Adoptium OpenJDK за сваляне на преносима Java ${version}...`);

  const platform = isWin ? 'windows' : isMac ? 'mac' : 'linux';
  const arch = (process.arch as string) === 'arm64' || (process.arch as string) === 'aarch64' ? 'aarch64' : 'x64';
  const downloadUrl = await getJavaDownloadUrl(version, platform, arch);

  await downloadFileWithProgress(downloadUrl, tempArchive, (percent, downloadedMb, totalMb) => {
    onProgress(percent, downloadedMb, totalMb, `Изтегляне на Java ${version} (${percent}% - ${downloadedMb}MB / ${totalMb}MB)...`);
  });

  onProgress(92, 0, 0, `Разархивиране на преносимата Java ${version}...`);

  try {
    await execFileAsync('tar', ['-xf', tempArchive, '-C', targetDir]);
    fs.unlinkSync(tempArchive);
  } catch (err) {
    console.error(`Failed to extract java ${version} with tar:`, err);
  }

  const javaExe = findPortableJavaExe(version);
  if (!javaExe) {
    throw new Error(`Java ${version} бе изтеглена, но изпълнимият файл на java не бе открит.`);
  }

  // On macOS and Linux, make sure the java binary has execute permissions
  if (!isWin) {
    try {
      fs.chmodSync(javaExe, 0o755);
    } catch (permErr) {
      console.warn('Could not set chmod on java executable:', permErr);
    }
  }

  onProgress(100, 0, 0, `Java ${version} е готова за стартиране!`);
  return javaExe;
}

export async function getEffectiveJavaCommand(
  mcVersion: string,
  onProgress?: (percent: number, msg: string) => void
): Promise<string> {
  const reqVer = getRequiredJavaVersion(mcVersion);
  const { version: sysVer } = await getSystemJavaVersion();

  // Use the system Java only when this Minecraft version accepts it (not too old, not too new)
  if (isJavaSuitable(sysVer, mcVersion)) {
    return 'java';
  }

  // Check if we already have portable Java for this required version
  const existingPortable = findPortableJavaExe(reqVer);
  if (existingPortable) {
    return existingPortable;
  }

  // Otherwise, automatically download portable Java
  if (onProgress) onProgress(5, `Minecraft v${mcVersion} изисква Java ${reqVer}. Изтегляне на преносима Java ${reqVer}...`);
  const downloaded = await downloadPortableJava(reqVer, (p, _d, _t, msg) => {
    if (onProgress) onProgress(p, msg);
  });

  return downloaded;
}

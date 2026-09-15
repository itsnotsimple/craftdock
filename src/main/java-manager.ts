import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from 'electron';
import { downloadFileWithProgress } from './api-service';

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

  const isCompatible = sysVer >= reqVer || !!portable;

  return {
    systemJavaVersion: sysVer,
    systemJavaPath: 'java',
    portableJavaAvailable: !!portable,
    portableJavaPath: portable || undefined,
    isCompatible,
    requiredVersion: reqVer,
  };
}

export async function downloadPortableJava(
  version: number,
  onProgress: (percent: number, downloadedMb: number, totalMb: number, msg: string) => void
): Promise<string> {
  const targetDir = path.join(getAppDirectory(), 'runtimes', `java${version}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const tempZip = path.join(getAppDirectory(), `temurin_java${version}.zip`);

  onProgress(5, 0, 0, `Връзка с Adoptium OpenJDK за сваляне на преносима Java ${version}...`);

  const adoptiumUrl = `https://api.adoptium.net/v3/binary/latest/${version}/ga/windows/x64/jdk/hotspot/normal/eclipse`;

  await downloadFileWithProgress(adoptiumUrl, tempZip, (percent, downloadedMb, totalMb) => {
    onProgress(percent, downloadedMb, totalMb, `Изтегляне на Java ${version} (${percent}% - ${downloadedMb}MB / ${totalMb}MB)...`);
  });

  onProgress(92, 0, 0, `Разархивиране на преносимата Java ${version}...`);

  try {
    execSync(`tar -xf "${tempZip}" -C "${targetDir}"`, { stdio: 'ignore' });
    fs.unlinkSync(tempZip);
  } catch (err) {
    console.error(`Failed to extract java ${version} with tar:`, err);
  }

  const javaExe = findPortableJavaExe(version);
  if (!javaExe) {
    throw new Error(`Java ${version} бе изтеглена, но java.exe не бе открита.`);
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

  // If system java is new enough, use system java
  if (sysVer >= reqVer) {
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

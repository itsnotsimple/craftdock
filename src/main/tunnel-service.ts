import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
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

export interface TunnelStatus {
  isRunning: boolean;
  address?: string;
  claimUrl?: string;
  hasZeroTunnels?: boolean;
  log?: string;
}

let activeTunnelProcess: ChildProcessWithoutNullStreams | null = null;
let currentTunnelStatus: TunnelStatus = { isRunning: false };
let statusChangeCallback: ((status: TunnelStatus) => void) | null = null;

export async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = (await res.json()) as { ip: string };
      return data.ip;
    }
  } catch (err) {}
  return 'Недостъпно (офлайн)';
}

export function getPlayitExePath(): string {
  if (process.platform === 'win32') {
    const dir = path.join(getAppDirectory(), 'runtimes', 'playit');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'playit.exe');
  }

  // Check common macOS/Linux Homebrew or system paths
  const commonPaths = ['/opt/homebrew/bin/playit', '/usr/local/bin/playit', '/usr/bin/playit'];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  const dir = path.join(getAppDirectory(), 'runtimes', 'playit');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'playit');
}

export async function ensurePlayitBinary(onProgress?: (percent: number, msg: string) => void): Promise<string> {
  const exePath = getPlayitExePath();
  if (fs.existsSync(exePath)) {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(exePath, 0o755);
      } catch (e) {}
    }
    return exePath;
  }

  if (process.platform === 'win32') {
    if (onProgress) onProgress(10, 'Връзка с GitHub за изтегляне на Playit Agent...');
    const downloadUrl =
      'https://github.com/playit-cloud/playit-agent/releases/download/v0.15.26/playit-windows-x86_64-signed.exe';

    await downloadFileWithProgress(downloadUrl, exePath, (p) => {
      if (onProgress) onProgress(p, `Изтегляне на Playit агент (${p}%)...`);
    });

    return exePath;
  }

  // On macOS / Linux: playit is distributed via package managers like Homebrew or cargo
  throw new Error(
    'За macOS Playit агентът изисква инсталация чрез Homebrew: отворете Terminal и изпълнете: brew install playit. Или ползвайте директния си локален/публичен IP.'
  );
}

export async function startTunnelProcess(
  port = 25565,
  onStatusChange: (status: TunnelStatus) => void
): Promise<TunnelStatus> {
  statusChangeCallback = onStatusChange;
  if (activeTunnelProcess) {
    return currentTunnelStatus;
  }

  currentTunnelStatus = { isRunning: true, log: 'Подготовка на Playit тунел...' };
  onStatusChange({ ...currentTunnelStatus });

  const exePath = await ensurePlayitBinary((p, msg) => {
    currentTunnelStatus = { isRunning: true, log: msg };
    onStatusChange({ ...currentTunnelStatus });
  });

  const runDir = path.dirname(exePath);
  const secretPath = path.join(runDir, 'playit.toml');

  currentTunnelStatus = { isRunning: true, log: 'Стартиране на тунелен агент...' };
  onStatusChange({ ...currentTunnelStatus });

  const proc = spawn(exePath, ['--secret_path', secretPath, 'start'], {
    cwd: runDir,
    shell: false,
  });

  activeTunnelProcess = proc;

  const handleOutput = (chunk: Buffer, source: string) => {
    const text = chunk.toString();
    console.log(`[Playit ${source}]:`, text);

    // Look for claim url: https://playit.gg/claim/...
    const claimMatch = text.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9_-]+/i);
    if (claimMatch) {
      currentTunnelStatus.claimUrl = claimMatch[0];
      currentTunnelStatus.hasZeroTunnels = false;
      currentTunnelStatus.log = 'Потвърди агента в браузъра (еднократно)';
      onStatusChange({ ...currentTunnelStatus });
    }

    // Check if agent is connected and waiting for tunnel creation on playit.gg
    if (text.includes('0 tunnels') || text.includes('has 0 tunnels')) {
      currentTunnelStatus.hasZeroTunnels = true;
      currentTunnelStatus.claimUrl = undefined;
      currentTunnelStatus.log = 'Агентът е свързан! Добави Minecraft тунел в Playit таблото.';
      onStatusChange({ ...currentTunnelStatus });
    }

    // Look for public address: *.ply.gg:port or *.playit.gg:port or *.joinmc.link
    const addrMatch = text.match(/([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:ply\.gg|playit\.gg|joinmc\.link)(?::\d+)?)/i);
    if (addrMatch) {
      const newAddress = addrMatch[1].replace(/\.$/, '');
      const isNewAddress = currentTunnelStatus.address !== newAddress;
      currentTunnelStatus.address = newAddress;
      currentTunnelStatus.hasZeroTunnels = false;
      currentTunnelStatus.claimUrl = undefined;
      currentTunnelStatus.log = 'Тунелът е активен и готов за игра!';
      if (isNewAddress) {
        onStatusChange({ ...currentTunnelStatus });
      }
    }

    if (text.toLowerCase().includes('tunnel running') || text.toLowerCase().includes('registered tunnel')) {
      if (!currentTunnelStatus.address) {
        currentTunnelStatus.log = 'Свързан към Playit мрежата...';
        onStatusChange({ ...currentTunnelStatus });
      }
    }
  };

  proc.stdout.on('data', (chunk: Buffer) => handleOutput(chunk, 'stdout'));
  proc.stderr.on('data', (chunk: Buffer) => handleOutput(chunk, 'stderr'));

  proc.on('close', () => {
    activeTunnelProcess = null;
    currentTunnelStatus = { isRunning: false, log: 'Тунелът е спрян' };
    onStatusChange({ ...currentTunnelStatus });
  });

  proc.on('error', (err) => {
    activeTunnelProcess = null;
    currentTunnelStatus = { isRunning: false, log: `Грешка при тунела: ${err.message}` };
    onStatusChange({ ...currentTunnelStatus });
  });

  return currentTunnelStatus;
}

export function stopTunnelProcess(): void {
  if (activeTunnelProcess) {
    try {
      activeTunnelProcess.kill();
    } catch (e) {}
    activeTunnelProcess = null;
  }
  currentTunnelStatus = { isRunning: false, log: 'Тунелът е спрян' };
  if (statusChangeCallback) {
    statusChangeCallback({ ...currentTunnelStatus });
  }
}

export function getTunnelStatus(): TunnelStatus {
  return currentTunnelStatus;
}

export interface NetworkStatus {
  localIp: string;
  publicIp: string;
  port: number;
}

export async function getNetworkStatus(localIp: string, port = 25565): Promise<NetworkStatus> {
  const publicIp = await fetchPublicIp();
  return {
    localIp,
    publicIp,
    port,
  };
}


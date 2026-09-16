import os from 'os';
import child_process from 'child_process';

export interface SystemInfoData {
  totalRamGb: number;
  freeRamGb: number;
  cpuModel: string;
  cpuPercent: number;
  platform: string;
  arch: string;
  osName: string;
  localIp: string;
}

let prevCpuTimes = getCpuTimes();
let cachedMacFreeRamBytes = 0;

function parseVmStatOutput(stdout: string): number {
  const pageSizeMatch = stdout.match(/page size of (\d+) bytes/);
  const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 4096;

  const getPages = (key: string): number => {
    const match = stdout.match(new RegExp(`${key}:\\s+(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  };

  const free = getPages('Pages free');
  const inactive = getPages('Pages inactive');
  const speculative = getPages('Pages speculative');
  const purgeable = getPages('Pages purgeable');

  // Available memory on macOS consists of free, inactive, speculative, and purgeable pages
  return (free + inactive + speculative + purgeable) * pageSize;
}

function updateMacFreeRam() {
  if (os.platform() === 'darwin') {
    child_process.exec('vm_stat', (err, stdout) => {
      if (!err && stdout) {
        try {
          const bytes = parseVmStatOutput(stdout);
          if (bytes > 0) cachedMacFreeRamBytes = bytes;
        } catch (e) {}
      }
    });
  }
}

if (os.platform() === 'darwin') {
  try {
    const out = child_process.execSync('vm_stat', { encoding: 'utf-8', timeout: 800 });
    const bytes = parseVmStatOutput(out);
    if (bytes > 0) cachedMacFreeRamBytes = bytes;
  } catch (e) {}
  setInterval(updateMacFreeRam, 2500);
}

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function calculateCpuPercent(): number {
  const current = getCpuTimes();
  const idleDiff = current.idle - prevCpuTimes.idle;
  const totalDiff = current.total - prevCpuTimes.total;
  prevCpuTimes = current;
  if (totalDiff <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((1 - idleDiff / totalDiff) * 100)));
}

export function getSystemInfo(): SystemInfoData {
  const totalRamGb = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  let freeBytes = os.freemem();
  if (os.platform() === 'darwin' && cachedMacFreeRamBytes > 0) {
    freeBytes = cachedMacFreeRamBytes;
  }
  const freeRamGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10;
  const cpuPercent = calculateCpuPercent();
  
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU';
  
  // Find local network IP
  let localIp = '127.0.0.1';
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
    }
  }

  const platform = os.platform();
  const arch = os.arch();
  let osName = 'Windows';
  if (platform === 'darwin') {
    osName = arch === 'arm64' ? 'macOS (Apple Silicon)' : 'macOS (Intel)';
  } else if (platform === 'win32') {
    osName = 'Windows (x64)';
  } else if (platform === 'linux') {
    osName = `Linux (${arch})`;
  }

  return {
    totalRamGb,
    freeRamGb,
    cpuModel,
    cpuPercent,
    platform,
    arch,
    osName,
    localIp,
  };
}

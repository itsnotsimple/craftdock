import os from 'os';

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
  const freeRamGb = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;
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

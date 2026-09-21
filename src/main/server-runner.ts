import { ChildProcessWithoutNullStreams, spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserWindow } from 'electron';
import { updateServer, getServerById, ServerProfile } from './server-store';
import { getEffectiveJavaCommand } from './java-manager';
import { loadAppSettings } from './app-settings';
import { uptimeTracker, playerTracker, chatTracker, perfTracker } from './analytics';
import { startTunnelProcess, stopTunnelProcess } from './tunnel-service';
import {
  notifyServerReady,
  notifyPlayerJoin,
  notifyPlayerLeave,
  notifyServerCrash,
} from './notification-service';
import { registerPlayerActivity, isServerSleeping } from './sleep-manager';

export interface ServerLogEntry {
  id: string;
  serverId: string;
  timestamp: string;
  level: 'info' | 'error';
  text: string;
}

export interface ServerStats {
  serverId: string;
  cpuPercent: number;
  memoryMb: number;
  memoryPercent: number;
  uptimeSeconds: number;
}

interface RunningInstance {
  process: ChildProcessWithoutNullStreams;
  server: ServerProfile;
  players: Set<string>;
  startTime: number;
  lastCpuSec?: number;
  lastSampleTime?: number;
  currentStats: ServerStats;
  status: 'starting' | 'running' | 'stopping';
  lastPerfSampleTime?: number;
}

const activeServers = new Map<string, RunningInstance>();
const serverLogs = new Map<string, ServerLogEntry[]>();

function sendToWindow(channel: string, ...args: any[]) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}

export type RunnerLogListener = (entry: ServerLogEntry) => void;
const runnerLogListeners: RunnerLogListener[] = [];

export function onRunnerLog(listener: RunnerLogListener): () => void {
  runnerLogListeners.push(listener);
  return () => {
    const idx = runnerLogListeners.indexOf(listener);
    if (idx !== -1) runnerLogListeners.splice(idx, 1);
  };
}

export function appendServerLog(serverId: string, text: string, isError = false): void {
  let list = serverLogs.get(serverId);
  if (!list) {
    list = [];
    serverLogs.set(serverId, list);
  }
  const entry: ServerLogEntry = {
    id: `${Date.now()}_${Math.random()}`,
    serverId,
    timestamp: new Date().toLocaleTimeString(),
    level: isError ? 'error' : 'info',
    text,
  };
  list.push(entry);
  if (list.length > 500) {
    list.shift();
  }
  sendToWindow('server-log', entry);

  for (const listener of runnerLogListeners) {
    try {
      listener(entry);
    } catch {}
  }
}

export function getServerLogs(serverId: string): ServerLogEntry[] {
  return serverLogs.get(serverId) || [];
}

export function getServerStats(serverId: string): ServerStats | null {
  const instance = activeServers.get(serverId);
  return instance ? instance.currentStats : null;
}

function queryPidUsage(pid: number): Promise<{ memoryMb: number; cpuSec: number }> {
  return new Promise((resolve) => {
    if (!pid) return resolve({ memoryMb: 0, cpuSec: 0 });

    if (process.platform === 'win32') {
      exec(
        `powershell -NoProfile -NonInteractive -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -Property WorkingSet64, CPU | ConvertTo-Json -Compress)"`,
        { timeout: 3000 },
        (err, stdout) => {
          if (err || !stdout) return resolve({ memoryMb: 0, cpuSec: 0 });
          try {
            const data = JSON.parse(stdout.trim());
            if (data && typeof data.WorkingSet64 === 'number') {
              const memoryMb = Math.round(data.WorkingSet64 / (1024 * 1024));
              const cpuSec = parseFloat(data.CPU) || 0;
              return resolve({ memoryMb, cpuSec });
            }
          } catch {}
          resolve({ memoryMb: 0, cpuSec: 0 });
        }
      );
    } else {
      exec(`ps -p ${pid} -o %cpu,rss`, { timeout: 2000 }, (err, stdout) => {
        if (err || !stdout) return resolve({ memoryMb: 0, cpuSec: 0 });
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) return resolve({ memoryMb: 0, cpuSec: 0 });
        const [cpu, rss] = lines[1].trim().split(/\s+/);
        resolve({
          memoryMb: Math.round(parseInt(rss, 10) / 1024),
          cpuSec: parseFloat(cpu) || 0,
        });
      });
    }
  });
}

// Background sampler for active server CPU and RAM metrics
setInterval(async () => {
  if (activeServers.size === 0) return;
  const numCores = os.cpus().length || 1;
  const now = Date.now();

  for (const [serverId, instance] of activeServers.entries()) {
    const pid = instance.process?.pid;
    if (!pid) continue;

    try {
      const { memoryMb, cpuSec } = await queryPidUsage(pid);
      let cpuPercent = 0;

      if (instance.lastSampleTime && instance.lastCpuSec !== undefined) {
        const deltaSec = (now - instance.lastSampleTime) / 1000;
        if (deltaSec > 0) {
          const cpuDelta = Math.max(0, cpuSec - instance.lastCpuSec);
          cpuPercent = Math.min(100, Math.max(0, Math.round(((cpuDelta / deltaSec) / numCores) * 100)));
        }
      }

      instance.lastSampleTime = now;
      instance.lastCpuSec = cpuSec;

      const allocatedMb = (instance.server.allocatedRamGb || 4) * 1024;
      // OS Working Set includes JVM non-heap (Metaspace, JIT cache, threads ~350MB)
      const expectedCeilingMb = allocatedMb + 384;
      const memoryPercent = Math.min(100, Math.max(0, Math.round((memoryMb / expectedCeilingMb) * 100)));
      const uptimeSeconds = Math.floor((now - instance.startTime) / 1000);

      instance.currentStats = {
        serverId,
        cpuPercent,
        memoryMb,
        memoryPercent,
        uptimeSeconds,
      };

      sendToWindow('server-stats-updated', instance.currentStats);

      // Record periodic perf sample every ~10s for analytics
      if (!instance.lastPerfSampleTime || now - instance.lastPerfSampleTime >= 10000) {
        instance.lastPerfSampleTime = now;
        perfTracker.recordSample(instance.server.path, {
          timestamp: now,
          cpuPercent,
          memoryMb,
          memoryPercent,
          playerCount: instance.players.size,
        });
      }
    } catch (e) {}
  }
}, 2000);

export function autoAcceptEula(serverDir: string) {
  const eulaPath = path.join(serverDir, 'eula.txt');
  const content = `# Generated by CraftDock Server Manager\n# By changing the setting below to TRUE you are indicating your agreement to the Mojang EULA.\neula=true\n`;
  fs.writeFileSync(eulaPath, content, 'utf-8');
}

export function updateServerProperties(
  serverDir: string,
  port: number,
  motd?: string,
  hardcore?: boolean,
  maxPlayers?: number
) {
  const propPath = path.join(serverDir, 'server.properties');
  let content = '';
  if (fs.existsSync(propPath)) {
    content = fs.readFileSync(propPath, 'utf-8');
    content = content.replace(/^server-port=.*$/m, `server-port=${port}`);
    if (motd) {
      content = content.replace(/^motd=.*$/m, `motd=${motd}`);
    }
    if (maxPlayers) {
      if (content.match(/^max-players=.*$/m)) {
        content = content.replace(/^max-players=.*$/m, `max-players=${maxPlayers}`);
      } else {
        content += `\nmax-players=${maxPlayers}`;
      }
    }
    if (hardcore !== undefined) {
      if (content.match(/^hardcore=.*$/m)) {
        content = content.replace(/^hardcore=.*$/m, `hardcore=${hardcore}`);
      } else {
        content += `\nhardcore=${hardcore}`;
      }
      if (hardcore) {
        if (content.match(/^difficulty=.*$/m)) {
          content = content.replace(/^difficulty=.*$/m, `difficulty=hard`);
        } else {
          content += `\ndifficulty=hard`;
        }
      }
    }
  } else {
    // Default to online-mode=false (Cracked friendly) or true
    content = `server-port=${port}\nmotd=${motd || 'CraftDock Minecraft Server'}\nquery.port=${port}\nonline-mode=false\nmax-players=${maxPlayers || 20}\nhardcore=${hardcore ?? false}\ndifficulty=${hardcore ? 'hard' : 'normal'}\n`;
  }
  fs.writeFileSync(propPath, content, 'utf-8');
}

export async function startServer(server: ServerProfile): Promise<boolean> {
  // Prevent running multiple servers simultaneously
  for (const [activeId] of activeServers.entries()) {
    if (activeId !== server.id) {
      console.warn(`Cannot start server ${server.id}: Server ${activeId} is already running.`);
      appendServerLog(
        server.id,
        `[CraftDock Грешка] Сървърът не може да стартира, защото вече работи друг сървър! Първо го спрете.`,
        true
      );
      return false;
    }
  }

  if (activeServers.has(server.id)) {
    console.warn(`Server ${server.id} is already running.`);
    return false;
  }

  const serverDir = server.path;
  const jarPath = path.join(serverDir, 'server.jar');

  if (!fs.existsSync(jarPath)) {
    throw new Error(`Server jar not found at ${jarPath}. Make sure the server files are downloaded.`);
  }

  // Ensure EULA is accepted
  autoAcceptEula(serverDir);
  updateServerProperties(serverDir, server.port, server.motd, server.hardcore, server.maxPlayers);

  updateServer(server.id, { status: 'starting' });
  sendToWindow('server-status-changed', { serverId: server.id, status: 'starting' });

  const appSettings = loadAppSettings();

  let javaExe = 'java';
  if (appSettings.customJavaPath && fs.existsSync(appSettings.customJavaPath)) {
    javaExe = appSettings.customJavaPath;
    appendServerLog(server.id, `[CraftDock] Използване на персонализиран път до Java: ${javaExe}`);
  } else {
    appendServerLog(server.id, `[CraftDock] Проверка на съвместима Java среда за Minecraft v${server.version}...`);
    try {
      javaExe = await getEffectiveJavaCommand(server.version, (percent, msg) => {
        sendToWindow('download-progress', {
          percent,
          downloadedMb: 0,
          totalMb: 0,
          message: msg,
        });
        appendServerLog(server.id, `[CraftDock] ${msg}`);
      });

      appendServerLog(server.id, `[CraftDock] Успешно подготвена Java среда: ${javaExe}`);
    } catch (javaErr: any) {
      appendServerLog(server.id, `[CraftDock Грешка] Неуспешно стартиране на Java: ${javaErr.message}`, true);
      updateServer(server.id, { status: 'error' });
      sendToWindow('server-status-changed', { serverId: server.id, status: 'error', error: javaErr.message });
      return false;
    }
  }

  const ramGb = Math.max(1, server.allocatedRamGb);
  const minRam = ramGb <= 2 ? '512M' : `${Math.floor(ramGb / 2)}G`;
  const javaArgs: string[] = [
    `-Xms${minRam}`,
    `-Xmx${ramGb}G`,
  ];

  if (appSettings.useAikarFlags) {
    javaArgs.push(
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:G1NewSizePercent=30',
      '-XX:G1MaxNewSizePercent=40',
      '-XX:G1ReservePercent=20',
      '-XX:G1HeapRegionSize=8M',
      '-XX:MaxMetaspaceSize=256M'
    );
  } else {
    javaArgs.push('-XX:+UseG1GC', '-XX:MaxMetaspaceSize=256M');
  }

  javaArgs.push('-jar', 'server.jar', 'nogui');

  try {
    const child = spawn(javaExe, javaArgs, {
      cwd: serverDir,
      shell: false,
    });

    const instance: RunningInstance = {
      process: child,
      server,
      players: new Set<string>(),
      startTime: Date.now(),
      status: 'starting',
      currentStats: {
        serverId: server.id,
        cpuPercent: 0,
        memoryMb: 0,
        memoryPercent: 0,
        uptimeSeconds: 0,
      },
    };
    activeServers.set(server.id, instance);
    uptimeTracker.onServerStart(server.id, serverDir);

    // Auto-start Playit tunnel if enabled in settings
    let lastLoggedTunnelAddress: string | null = null;
    if (appSettings.autoStartPlayitTunnel !== false) {
      appendServerLog(server.id, `[CraftDock] Автоматично свързване към Playit тунел за приятели на порт ${server.port}...`);
      startTunnelProcess(server.port, (status) => {
        sendToWindow('tunnel-status-changed', status);
        if (status.address && status.address !== lastLoggedTunnelAddress) {
          lastLoggedTunnelAddress = status.address;
          appendServerLog(server.id, `[CraftDock] Playit тунелът е активен! Публичен адрес за приятели: ${status.address}`);
        }
      }).catch((err) => {
        console.error('Failed to auto-start playit tunnel:', err);
      });
    }

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

      for (const line of lines) {
        appendServerLog(server.id, line);

        // Detect chat messages
        const chatMsg = chatTracker.onConsoleLine(serverDir, line);
        if (chatMsg) {
          sendToWindow('server-chat-message', { serverId: server.id, message: chatMsg });
        }

        // Detect server ready - only transition when Minecraft is 100% finished booting
        const isReadyLine =
          line.includes('Done (') ||
          (line.includes('Done') && line.toLowerCase().includes('help')) ||
          /Done \([0-9.]+s\)/i.test(line) ||
          /Done in [0-9.]+/i.test(line) ||
          /For help, type ["']?help["']?/i.test(line);

        if (instance.status === 'starting' && isReadyLine) {
          instance.status = 'running';
          updateServer(server.id, { status: 'running', lastPlayedAt: new Date().toISOString() });
          sendToWindow('server-status-changed', { serverId: server.id, status: 'running' });
          sendToWindow('server-profile-updated', { id: server.id, status: 'running' });

          // Sound & Desktop Notifications on startup
          const currentSettings = loadAppSettings();
          if (currentSettings.soundOnStartup !== false) {
            sendToWindow('play-sound', 'server-ready');
          }
          notifyServerReady(server.name);
          registerPlayerActivity(server.id, instance.players.size);
        }

        // Detect player join
        const joinMatch = line.match(/([a-zA-Z0-9_.*~-]{2,24}) joined the game/i);
        if (joinMatch) {
          const playerName = joinMatch[1];
          instance.players.add(playerName);
          playerTracker.onPlayerJoin(server.id, serverDir, playerName);
          notifyPlayerJoin(server.name, playerName);
          updateServer(server.id, { playerCount: instance.players.size });
          sendToWindow('server-players-changed', {
            serverId: server.id,
            players: Array.from(instance.players),
          });
          sendToWindow('server-profile-updated', {
            id: server.id,
            playerCount: instance.players.size,
          });
          registerPlayerActivity(server.id, instance.players.size);
        }

        // Detect player leave
        const leaveMatch = line.match(/([a-zA-Z0-9_.*~-]{2,24}) left the game/i);
        if (leaveMatch) {
          const playerName = leaveMatch[1];
          instance.players.delete(playerName);
          playerTracker.onPlayerLeave(server.id, serverDir, playerName);
          notifyPlayerLeave(server.name, playerName);
          updateServer(server.id, { playerCount: instance.players.size });
          sendToWindow('server-players-changed', {
            serverId: server.id,
            players: Array.from(instance.players),
          });
          sendToWindow('server-profile-updated', {
            id: server.id,
            playerCount: instance.players.size,
          });
          registerPlayerActivity(server.id, instance.players.size);
        }

        // Detect /list player command output
        const listMatch = line.match(/There are \d+ of a max of \d+ players online:(.*)/i);
        if (listMatch) {
          const namesStr = listMatch[1].trim();
          instance.players.clear();
          if (namesStr) {
            const names = namesStr.split(',').map((n) => n.trim()).filter((n) => n.length > 0);
            for (const name of names) {
              instance.players.add(name);
            }
          }
          updateServer(server.id, { playerCount: instance.players.size });
          sendToWindow('server-players-changed', {
            serverId: server.id,
            players: Array.from(instance.players),
          });
          sendToWindow('server-profile-updated', {
            id: server.id,
            playerCount: instance.players.size,
          });
          registerPlayerActivity(server.id, instance.players.size);
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      for (const line of lines) {
        appendServerLog(server.id, line, true);
      }
    });

    child.on('close', (code) => {
      console.log(`Server ${server.id} process exited with code ${code}`);
      const wasStopping = instance.status === 'stopping';
      activeServers.delete(server.id);

      uptimeTracker.onServerStop(server.id, serverDir, code, wasStopping);
      playerTracker.onServerStop(server.id, serverDir);
      perfTracker.flushSamples(serverDir);

      const isSleeping = isServerSleeping(server.id);

      // Auto-stop Playit tunnel when server stops normally (not during sleep mode)
      if (!isSleeping) {
        stopTunnelProcess();
        sendToWindow('tunnel-status-changed', { isRunning: false, log: 'Тунелът е спрян' });

        updateServer(server.id, { status: 'stopped', playerCount: 0 });
        sendToWindow('server-status-changed', { serverId: server.id, status: 'stopped' });
        sendToWindow('server-players-changed', { serverId: server.id, players: [] });
        sendToWindow('server-profile-updated', { id: server.id, status: 'stopped', playerCount: 0 });
      }
      sendToWindow('server-stats-updated', {
        serverId: server.id,
        cpuPercent: 0,
        memoryMb: 0,
        memoryPercent: 0,
        uptimeSeconds: 0,
      });

      if (!wasStopping && code !== 0 && code !== null) {
        notifyServerCrash(server.name, code);
        sendToWindow('server-crashed', {
          serverId: server.id,
          serverName: server.name,
          code,
        });

        const settings = loadAppSettings();
        if (settings.autoRestartOnCrash) {
          appendServerLog(
            server.id,
            `[CraftDock] Засечен неочакван срив на сървъра (код ${code}). Автоматичен рестарт след 5 секунди...`,
            true
          );
          setTimeout(() => {
            if (!activeServers.has(server.id)) {
              startServer(server);
            }
          }, 5000);
        }
      }
    });

    child.on('error', (err) => {
      console.error(`Server ${server.id} error:`, err);
      activeServers.delete(server.id);

      uptimeTracker.onServerStop(server.id, serverDir, -1, false);
      playerTracker.onServerStop(server.id, serverDir);
      perfTracker.flushSamples(serverDir);

      // Auto-stop Playit tunnel on server error
      stopTunnelProcess();
      sendToWindow('tunnel-status-changed', { isRunning: false, log: 'Тунелът е спрян' });

      notifyServerCrash(server.name, -1);
      sendToWindow('server-crashed', {
        serverId: server.id,
        serverName: server.name,
        code: -1,
      });

      updateServer(server.id, { status: 'error', playerCount: 0 });
      sendToWindow('server-status-changed', { serverId: server.id, status: 'error', error: err.message });
      sendToWindow('server-profile-updated', { id: server.id, status: 'error', playerCount: 0 });
      sendToWindow('server-stats-updated', {
        serverId: server.id,
        cpuPercent: 0,
        memoryMb: 0,
        memoryPercent: 0,
        uptimeSeconds: 0,
      });
    });

    return true;
  } catch (err: any) {
    console.error('Failed to spawn java process:', err);
    updateServer(server.id, { status: 'error' });
    sendToWindow('server-status-changed', { serverId: server.id, status: 'error', error: err.message });
    return false;
  }
}

export function stopServer(serverId: string): boolean {
  const instance = activeServers.get(serverId);
  if (!instance) return false;

  const isSleeping = isServerSleeping(serverId);
  instance.status = 'stopping';
  if (!isSleeping) {
    updateServer(serverId, { status: 'stopping' });
    sendToWindow('server-status-changed', { serverId, status: 'stopping' });
    sendToWindow('server-profile-updated', { id: serverId, status: 'stopping' });
  }

  try {
    instance.process.stdin.write('stop\n');

    setTimeout(() => {
      if (activeServers.has(serverId)) {
        try {
          instance.process.kill();
        } catch (e) {}
      }
    }, 15000);

    return true;
  } catch (err) {
    console.error(`Failed to gracefully stop server ${serverId}:`, err);
    try {
      instance.process.kill();
    } catch (e) {}
    return false;
  }
}

export async function waitForServerStop(serverId: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (activeServers.has(serverId)) {
    if (Date.now() - start > timeoutMs) {
      const inst = activeServers.get(serverId);
      if (inst) {
        try {
          inst.process.kill();
        } catch {}
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return !activeServers.has(serverId);
}

export function sendServerCommand(serverId: string, command: string): boolean {
  const instance = activeServers.get(serverId);
  if (!instance) return false;
  try {
    const cleanCmd = command.startsWith('/') ? command.slice(1) : command;
    instance.process.stdin.write(cleanCmd + '\n');
    return true;
  } catch (err) {
    console.error(`Failed to send command to ${serverId}:`, err);
    return false;
  }
}

export const sendCommand = sendServerCommand;

export function getActiveServerIds(): string[] {
  return Array.from(activeServers.keys());
}

export function getServerPlayers(serverId: string): string[] {
  const instance = activeServers.get(serverId);
  return instance ? Array.from(instance.players) : [];
}

export function getServerActiveStatus(serverId: string): 'starting' | 'running' | 'stopping' | 'stopped' {
  const instance = activeServers.get(serverId);
  if (!instance) return 'stopped';
  return instance.status;
}

export function isServerRunning(serverId: string): boolean {
  const instance = activeServers.get(serverId);
  return instance?.status === 'running';
}

export function isServerProcessActive(serverId: string): boolean {
  return activeServers.has(serverId);
}


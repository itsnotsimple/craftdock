import net from 'net';
import { BrowserWindow } from 'electron';
import { getServerById, updateServer } from './server-store';
import { isServerRunning, sendCommand, startServer, stopServer, waitForServerStop } from './server-runner';
import { loadAppSettings } from './app-settings';
import { readServerProperties } from './server-config';
import { getTunnelStatus, startTunnelProcess } from './tunnel-service';

interface SleepEntry {
  serverId: string;
  idleTimer?: NodeJS.Timeout;
  tcpServer?: net.Server;
  isSleeping: boolean;
  port: number;
  activeSockets: Set<net.Socket>;
}

const sleepRegistry = new Map<string, SleepEntry>();
const wakeLock = new Set<string>();

function sendToWindow(channel: string, ...args: any[]) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}

function getSleepEntry(serverId: string): SleepEntry {
  let entry = sleepRegistry.get(serverId);
  if (!entry) {
    const server = getServerById(serverId);
    const props = server ? readServerProperties(server.path) : undefined;
    const port = props?.port || server?.port || 25565;
    entry = {
      serverId,
      isSleeping: false,
      port: typeof port === 'number' ? port : 25565,
      activeSockets: new Set<net.Socket>(),
    };
    sleepRegistry.set(serverId, entry);
  }
  return entry;
}

export function isServerSleeping(serverId: string): boolean {
  return sleepRegistry.get(serverId)?.isSleeping || false;
}

/**
 * Called when online player count changes.
 * Starts idle countdown if 0 players, or cancels it if players join.
 */
export function registerPlayerActivity(serverId: string, playerCount: number): void {
  const settings = loadAppSettings();
  if (settings.sleepModeEnabled === false) return;

  const entry = getSleepEntry(serverId);

  if (playerCount > 0) {
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer);
      entry.idleTimer = undefined;
    }
    return;
  }

  // 0 players online: start idle timer
  if (isServerRunning(serverId) && !entry.isSleeping) {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);

    const idleMinutes = settings.sleepIdleMinutes && settings.sleepIdleMinutes > 0 ? settings.sleepIdleMinutes : 5;
    const idleMs = idleMinutes * 60 * 1000;

    entry.idleTimer = setTimeout(() => {
      putServerToSleep(serverId);
    }, idleMs);
  }
}

/**
 * Puts a running server into Sleep Mode / Auto-Hibernate:
 * 1. Executes save-all
 * 2. Stops the Java process (releasing 100% RAM & CPU)
 * 3. Keeps Playit tunnel running so external friends can reach the wake listener
 * 4. Waits until process completely exits and port is free
 * 5. Starts lightweight TCP socket on server port for auto-wake
 */
export async function putServerToSleep(serverId: string): Promise<boolean> {
  const entry = getSleepEntry(serverId);
  if (entry.isSleeping) return true;

  const server = getServerById(serverId);
  if (!server) return false;

  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = undefined;
  }

  // Pre-flag sleeping in registry so server-runner preserves sleep state and keeps Playit tunnel alive
  entry.isSleeping = true;
  updateServer(serverId, { status: 'sleeping' as any });
  sendToWindow('server-status-changed', { serverId, status: 'sleeping' });

  if (isServerRunning(serverId)) {
    try {
      sendCommand(serverId, 'save-all');
      sendCommand(serverId, 'say [CraftDock] Server entering Sleep Mode. Auto-wake active.');
    } catch {
      // Ignore
    }

    stopServer(serverId);
    await waitForServerStop(serverId, 12000);
    // Buffer for Windows OS network stack to release port 25565
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  // Ensure Playit tunnel is running so external connections reach port 25565
  const appSettings = loadAppSettings();
  if (appSettings.autoStartPlayitTunnel !== false) {
    const tunnel = getTunnelStatus();
    if (!tunnel.isRunning) {
      startTunnelProcess(server.port, (status) => {
        sendToWindow('tunnel-status-changed', status);
      }).catch(() => {});
    }
  }

  startAutoWakeSocket(entry);
  return true;
}

/**
 * Manually or automatically wakes a sleeping server
 */
export async function wakeServer(serverId: string): Promise<boolean> {
  if (wakeLock.has(serverId)) return false;
  wakeLock.add(serverId);

  try {
    const entry = getSleepEntry(serverId);
    if (!entry.isSleeping) return false;

    console.log(`[SleepManager] Waking up server ${serverId}...`);

    // 1. Close TCP wake listener and destroy all client sockets
    if (entry.tcpServer) {
      const srv = entry.tcpServer;
      entry.tcpServer = undefined;
      await new Promise<void>((resolve) => {
        srv.close(() => resolve());
        setTimeout(resolve, 500);
      });
    }

    for (const socket of entry.activeSockets) {
      try {
        socket.destroy();
      } catch {}
    }
    entry.activeSockets.clear();

    // 2. Wait 300ms for OS to completely release port 25565
    await new Promise((resolve) => setTimeout(resolve, 300));

    entry.isSleeping = false;
    updateServer(serverId, { status: 'starting' });
    sendToWindow('server-status-changed', { serverId, status: 'starting' });

    // 3. Start the Java server
    const server = getServerById(serverId);
    if (!server) return false;
    const success = await startServer(server);

    sendToWindow('server-woken-up', { serverId, success });
    return success;
  } finally {
    wakeLock.delete(serverId);
  }
}

// -------------------------------------------------------------
// Minecraft Protocol Packet Helpers
// -------------------------------------------------------------

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value;
  while (true) {
    if ((v & ~0x7f) === 0) {
      bytes.push(v);
      break;
    }
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): { value: number; size: number } {
  let value = 0;
  let size = 0;
  let byte: number;
  while (true) {
    if (offset + size >= buf.length) return { value: 0, size: 0 };
    byte = buf[offset + size];
    value |= (byte & 0x7f) << (size * 7);
    size++;
    if ((byte & 0x80) === 0) break;
    if (size > 5) return { value: 0, size: 0 };
  }
  return { value, size };
}

function createMinecraftPacket(packetId: number, data: Buffer | Uint8Array): Buffer {
  const packetIdVarInt = writeVarInt(packetId);
  const payload = Buffer.concat([packetIdVarInt, data]);
  const lengthVarInt = writeVarInt(payload.length);
  return Buffer.concat([lengthVarInt, payload]);
}

function createStringPacket(packetId: number, str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf-8');
  const strLenVarInt = writeVarInt(strBuf.length);
  return createMinecraftPacket(packetId, Buffer.concat([strLenVarInt, strBuf]));
}

/**
 * Starts lightweight TCP server on Minecraft port (e.g. 25565).
 * Responds to ping packets and triggers wakeServer immediately when any client connects.
 */
function startAutoWakeSocket(entry: SleepEntry) {
  if (entry.tcpServer) {
    try {
      entry.tcpServer.close();
    } catch {}
    entry.tcpServer = undefined;
  }

  const server = net.createServer((socket) => {
    entry.activeSockets.add(socket);
    socket.on('close', () => entry.activeSockets.delete(socket));

    let wakeTriggered = false;
    const triggerWake = () => {
      if (wakeTriggered) return;
      wakeTriggered = true;
      console.log(`[SleepManager] Connection detected on port ${entry.port} for server ${entry.serverId}. Waking server immediately!`);
      wakeServer(entry.serverId);
    };

    // Trigger wake-up the instant any connection is established!
    triggerWake();

    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      buffer = Buffer.concat([buffer, data]);

      // Ensure wake is triggered
      triggerWake();

      // Reply with friendly Minecraft status packet so client does not time out
      try {
        let offset = 0;
        const { value: pktLen, size: pktLenSize } = readVarInt(buffer, offset);
        if (pktLenSize > 0 && buffer.length >= pktLen + pktLenSize) {
          offset += pktLenSize;
          const { value: _pktId, size: pktIdSize } = readVarInt(buffer, offset);
          if (pktIdSize > 0) {
            // Send status response
            const statusJson = JSON.stringify({
              version: { name: 'CraftDock Sleep Mode', protocol: -1 },
              players: { max: 20, online: 0, sample: [] },
              description: {
                text: '§b[CraftDock] §eСървърът се събужда! (Waking Up...)\n§aЗапочна автоматично стартиране! Моля изчакайте ~10 сек.'
              }
            });
            socket.write(createStringPacket(0x00, statusJson));
          }
        }
      } catch {}

      // Keep socket open briefly then end gracefully
      setTimeout(() => {
        try {
          socket.end();
        } catch {}
      }, 400);
    });

    socket.on('error', () => {});
  });

  // Bind with retry on EADDRINUSE for Windows socket release safety
  let attempts = 0;
  const maxRetries = 6;

  function bindPort() {
    attempts++;
    try {
      server.listen(entry.port, '0.0.0.0', () => {
        console.log(`[SleepManager] Auto-wake TCP listener successfully active on port ${entry.port} for server ${entry.serverId}`);
      });
      entry.tcpServer = server;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && attempts < maxRetries) {
        console.warn(`[SleepManager] Port ${entry.port} busy, retrying in 500ms (attempt ${attempts}/${maxRetries})...`);
        setTimeout(bindPort, 500);
      } else {
        console.warn(`[SleepManager] Error starting TCP listener on port ${entry.port}:`, err);
      }
    }
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && attempts < maxRetries) {
      console.warn(`[SleepManager] Port ${entry.port} in use, retrying in 500ms...`);
      setTimeout(bindPort, 500);
    } else {
      console.warn(`[SleepManager] TCP listener error on port ${entry.port}:`, err);
    }
  });

  bindPort();
}

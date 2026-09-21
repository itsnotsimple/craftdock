import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { URL } from 'url';
import { loadServers, getServerById, getDataDirectory } from './server-store';
import {
  startServer,
  stopServer,
  sendServerCommand,
  isServerRunning,
  getServerActiveStatus,
  getServerPlayers,
  getServerLogs,
  getServerStats,
  onRunnerLog,
  ServerLogEntry,
} from './server-runner';
import { loadAppSettings, saveAppSettings } from './app-settings';
import { generateQrSvg } from './qr-generator';
import { banPlayer, addOp, removeOp } from './server-config';
import { downloadFileWithProgress } from './api-service';

let serverInstance: http.Server | null = null;
const sseClients = new Set<http.ServerResponse>();
let unsubscribeLog: (() => void) | null = null;
let statsInterval: NodeJS.Timeout | null = null;

// Cloudflare Tunnel State (0 registration, global HTTPS access)
let cloudflaredProcess: ChildProcessWithoutNullStreams | null = null;
let cloudflarePublicUrl: string | null = null;
let isTunnelStarting: boolean = false;
let tunnelError: string | null = null;

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name];
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prioritize common home LAN subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (iface.address.startsWith('192.168.')) {
          return iface.address;
        }
        if (iface.address.startsWith('10.')) {
          candidates.unshift(iface.address);
        } else {
          candidates.push(iface.address);
        }
      }
    }
  }

  return candidates[0] || '127.0.0.1';
}

let currentSessionPin = String(Math.floor(1000 + Math.random() * 9000));

export function ensurePin(): string {
  if (currentSessionPin && /^\d{4}$/.test(currentSessionPin)) {
    return currentSessionPin;
  }
  currentSessionPin = String(Math.floor(1000 + Math.random() * 9000));
  saveAppSettings({ remoteServicePin: currentSessionPin });
  return currentSessionPin;
}

export function regenerateRemotePin(): string {
  currentSessionPin = String(Math.floor(1000 + Math.random() * 9000));
  saveAppSettings({ remoteServicePin: currentSessionPin });
  return currentSessionPin;
}


export function getCloudflaredExePath(): string {
  const dir = path.join(getDataDirectory(), 'runtimes', 'cloudflared');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
}

export async function ensureCloudflaredBinary(): Promise<string> {
  const exePath = getCloudflaredExePath();
  if (fs.existsSync(exePath)) {
    if (process.platform !== 'win32') {
      try { fs.chmodSync(exePath, 0o755); } catch {}
    }
    return exePath;
  }

  const downloadUrl = process.platform === 'win32'
    ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    : (process.arch === 'arm64'
        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz'
        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz');

  await downloadFileWithProgress(downloadUrl, exePath, () => {});
  if (process.platform !== 'win32') {
    try { fs.chmodSync(exePath, 0o755); } catch {}
  }
  return exePath;
}

export async function startRemoteTunnel(): Promise<{ success: boolean; url?: string; error?: string }> {
  if (cloudflarePublicUrl && cloudflaredProcess) {
    return { success: true, url: cloudflarePublicUrl };
  }

  isTunnelStarting = true;
  tunnelError = null;

  try {
    const exePath = await ensureCloudflaredBinary();
    const settings = loadAppSettings();
    const targetPort = settings.remoteServicePort || 25577;

    // Ensure remote service is listening
    await startRemoteService(targetPort);

    return new Promise((resolve) => {
      const proc = spawn(exePath, ['tunnel', '--url', `http://127.0.0.1:${targetPort}`, '--no-autoupdate'], {
        windowsHide: true,
      });

      cloudflaredProcess = proc;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          isTunnelStarting = false;
          tunnelError = 'Tunnel startup timed out';
          resolve({ success: false, error: 'Tunnel startup timed out' });
        }
      }, 25000);

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        // Look for https://...trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          cloudflarePublicUrl = match[0];
          isTunnelStarting = false;
          const pin = ensurePin();
          console.log(`[CraftDock Cloudflare Tunnel] Public URL: ${cloudflarePublicUrl}`);
          resolve({ success: true, url: `${cloudflarePublicUrl}?pin=${pin}` });
        }
      };

      proc.stdout.on('data', onData);
      proc.stderr.on('data', onData);

      proc.on('close', (code) => {
        cloudflaredProcess = null;
        cloudflarePublicUrl = null;
        isTunnelStarting = false;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          tunnelError = `Tunnel exited with code ${code}`;
          resolve({ success: false, error: tunnelError });
        }
      });

      proc.on('error', (err) => {
        cloudflaredProcess = null;
        cloudflarePublicUrl = null;
        isTunnelStarting = false;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          tunnelError = err.message;
          resolve({ success: false, error: err.message });
        }
      });
    });
  } catch (err: any) {
    isTunnelStarting = false;
    tunnelError = err.message;
    return { success: false, error: err.message };
  }
}

export function stopRemoteTunnel(): boolean {
  if (cloudflaredProcess) {
    try {
      cloudflaredProcess.kill();
    } catch {}
    cloudflaredProcess = null;
  }
  cloudflarePublicUrl = null;
  isTunnelStarting = false;
  tunnelError = null;
  return true;
}

export function getRemoteServiceStatus() {
  const settings = loadAppSettings();
  const pin = ensurePin();
  const ip = getLocalIpAddress();
  const port = settings.remoteServicePort || 25577;
  const running = !!serverInstance && serverInstance.listening;
  const localUrl = `http://${ip}:${port}`;
  const publicUrl = cloudflarePublicUrl ? cloudflarePublicUrl : undefined;

  return {
    enabled: settings.remoteServiceEnabled ?? true,
    running,
    port,
    ip,
    url: publicUrl || localUrl,
    localUrl,
    publicUrl,
    isTunnelActive: !!cloudflarePublicUrl && !!cloudflaredProcess,
    isTunnelStarting,
    tunnelError,
    pin,
    connectedClients: sseClients.size,
  };
}

export async function getRemoteQrSvg(mode: 'local' | 'public' = 'local'): Promise<string> {
  const status = getRemoteServiceStatus();
  const targetUrl = (mode === 'public' && status.publicUrl) ? status.publicUrl : status.localUrl;
  return generateQrSvg(targetUrl, {
    margin: 2,
    darkColor: '#0b101e',
    lightColor: '#ffffff',
  });
}


function verifyRequestPin(req: http.IncomingMessage, parsedUrl: URL): boolean {
  const correctPin = ensurePin();
  const pinFromQuery = parsedUrl.searchParams.get('pin');
  if (pinFromQuery === correctPin) return true;

  const pinFromHeader = req.headers['x-craftdock-pin'];
  if (typeof pinFromHeader === 'string' && pinFromHeader === correctPin) return true;

  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/craftdock_pin=(\d{4})/);
    if (match && match[1] === correctPin) return true;
  }

  return false;
}

function broadcastSse(eventType: string, data: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Generate the Mobile Web Dashboard HTML
function getMobileDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>CraftDock Mobile Remote</title>
  <meta name="theme-color" content="#070a14">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2338bdf8'><path d='M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z'/></svg>">
  <style>
    :root {
      --bg: #070a14;
      --card-bg: rgba(15, 23, 42, 0.75);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #0284c7;
      --accent-glow: rgba(2, 132, 199, 0.3);
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }
    header {
      padding: 14px 16px;
      padding-top: max(14px, env(safe-area-inset-top));
      background: rgba(7, 10, 20, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 17px;
      letter-spacing: -0.3px;
    }
    .brand svg { width: 22px; height: 22px; color: #38bdf8; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #64748b;
    }
    .status-running .status-dot { background: var(--success); box-shadow: 0 0 8px var(--success); }
    .status-starting .status-dot { background: var(--warning); animation: pulse 1s infinite; }
    .status-sleeping .status-dot { background: #818cf8; }
    .status-stopped .status-dot { background: #64748b; }
    
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    main {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
    }

    /* Server Selector */
    .server-selector-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .label-xs {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    select.server-select {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      outline: none;
    }

    /* Quick Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .stat-val {
      font-size: 17px;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #fff;
    }
    .stat-lbl {
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
    }

    /* Primary Power Controls */
    .power-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .btn-power {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 8px;
      border-radius: 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid var(--border);
      transition: all 0.15s ease;
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
    }
    .btn-power:active { transform: scale(0.96); }
    .btn-power svg { width: 20px; height: 20px; }
    .btn-start {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3));
      border-color: rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
    }
    .btn-stop {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3));
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .btn-restart {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3));
      border-color: rgba(245, 158, 11, 0.4);
      color: #fde68a;
    }

    /* Tabs */
    .tabs-nav {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border);
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .tab-btn.active {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    /* Console View */
    .console-box {
      background: #03060d;
      border: 1px solid var(--border);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      height: 340px;
      overflow: hidden;
    }
    .console-logs {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      gap: 3px;
      word-break: break-all;
    }
    .log-line { color: #94a3b8; }
    .log-line.error { color: #f87171; }
    .log-line .ts { color: #475569; margin-right: 6px; }
    
    .quick-chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid var(--border);
      scrollbar-width: none;
    }
    .quick-chips::-webkit-scrollbar { display: none; }
    .chip {
      white-space: nowrap;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: #cbd5e1;
      font-size: 10px;
      font-family: var(--font-mono);
      cursor: pointer;
    }
    .chip:active { background: rgba(255, 255, 255, 0.15); }

    .console-input-row {
      display: flex;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.4);
      border-top: 1px solid var(--border);
      gap: 8px;
    }
    .cmd-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
    }
    .btn-send {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0 14px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Players View */
    .players-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px;
      min-height: 220px;
    }
    .player-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .player-row:last-child { border-bottom: none; }
    .player-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .player-avatar {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #1e293b;
    }
    .player-name {
      font-weight: 700;
      font-size: 14px;
    }
    .player-actions {
      display: flex;
      gap: 6px;
    }
    .btn-xs {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      cursor: pointer;
    }
    .btn-xs-danger { color: #f87171; border-color: rgba(239, 68, 68, 0.3); }

    /* PIN Modal */
    .pin-overlay {
      position: fixed;
      inset: 0;
      background: rgba(7, 10, 20, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .pin-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .pin-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
      text-align: center;
    }
    .pin-dots {
      display: flex;
      gap: 14px;
      margin-bottom: 32px;
    }
    .pin-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--border);
      background: transparent;
      transition: all 0.2s ease;
    }
    .pin-dot.filled {
      background: var(--accent);
      border-color: var(--accent);
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      max-width: 280px;
      width: 100%;
    }
    .key-btn {
      aspect-ratio: 1;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: #fff;
      font-size: 22px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.1s ease;
    }
    .key-btn:active {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(0.94);
    }
  </style>
</head>
<body>
  <!-- PIN Keypad Overlay -->
  <div id="pinOverlay" class="pin-overlay">
    <div class="pin-title">CraftDock Security</div>
    <div class="pin-sub">Enter the 4-digit PIN displayed on your PC screen</div>
    <div class="pin-dots">
      <div class="pin-dot" id="dot0"></div>
      <div class="pin-dot" id="dot1"></div>
      <div class="pin-dot" id="dot2"></div>
      <div class="pin-dot" id="dot3"></div>
    </div>
    <div class="keypad">
      <button class="key-btn" onclick="enterDigit('1')">1</button>
      <button class="key-btn" onclick="enterDigit('2')">2</button>
      <button class="key-btn" onclick="enterDigit('3')">3</button>
      <button class="key-btn" onclick="enterDigit('4')">4</button>
      <button class="key-btn" onclick="enterDigit('5')">5</button>
      <button class="key-btn" onclick="enterDigit('6')">6</button>
      <button class="key-btn" onclick="enterDigit('7')">7</button>
      <button class="key-btn" onclick="enterDigit('8')">8</button>
      <button class="key-btn" onclick="enterDigit('9')">9</button>
      <button class="key-btn" style="visibility: hidden;"></button>
      <button class="key-btn" onclick="enterDigit('0')">0</button>
      <button class="key-btn" onclick="backspaceDigit()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
      </button>
    </div>
  </div>

  <!-- Header -->
  <header>
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      <span>CraftDock Mobile</span>
    </div>
    <div id="statusPill" class="status-pill status-stopped">
      <span class="status-dot"></span>
      <span id="statusText">STOPPED</span>
    </div>
  </header>

  <!-- Main Content -->
  <main>
    <!-- Server Selector -->
    <div class="server-selector-card">
      <div class="label-xs">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        <span>Select Active Server</span>
      </div>
      <select id="serverSelect" class="server-select" onchange="onSelectServer(this.value)">
        <option value="">Loading servers...</option>
      </select>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-val" id="statPlayers">0</span>
        <span class="stat-lbl">Players</span>
      </div>
      <div class="stat-card">
        <span class="stat-val" id="statCpu">0%</span>
        <span class="stat-lbl">CPU Load</span>
      </div>
      <div class="stat-card">
        <span class="stat-val" id="statRam">0 MB</span>
        <span class="stat-lbl">Memory</span>
      </div>
    </div>

    <!-- Power Buttons -->
    <div class="power-row">
      <button class="btn-power btn-start" onclick="powerAction('start')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Start</span>
      </button>
      <button class="btn-power btn-stop" onclick="powerAction('stop')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        <span>Stop</span>
      </button>
      <button class="btn-power btn-restart" onclick="powerAction('restart')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <span>Restart</span>
      </button>
    </div>

    <!-- View Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn active" id="tabBtnConsole" onclick="switchTab('console')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        <span>Console</span>
      </button>
      <button class="tab-btn" id="tabBtnPlayers" onclick="switchTab('players')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Players (<span id="tabPlayerCount">0</span>)</span>
      </button>
    </div>

    <!-- Tab 1: Console -->
    <div id="tabContentConsole" class="console-box">
      <div id="consoleLogs" class="console-logs">
        <div class="log-line"><span class="ts">[SYS]</span> Connected to CraftDock Mobile Remote.</div>
      </div>
      <div class="quick-chips">
        <span class="chip" onclick="sendQuickCmd('list')">/list</span>
        <span class="chip" onclick="sendQuickCmd('save-all')">/save-all</span>
        <span class="chip" onclick="sendQuickCmd('tps')">/tps</span>
        <span class="chip" onclick="sendQuickCmd('weather clear')">/weather clear</span>
        <span class="chip" onclick="sendQuickCmd('time set day')">/time set day</span>
        <span class="chip" onclick="sendQuickCmd('say Server maintenance in 5 min')">/say warning</span>
      </div>
      <div class="console-input-row">
        <input type="text" id="cmdInput" class="cmd-input" placeholder="Type Minecraft command..." onkeydown="if(event.key==='Enter') sendCommand()">
        <button class="btn-send" onclick="sendCommand()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <!-- Tab 2: Players -->
    <div id="tabContentPlayers" class="players-card" style="display: none;">
      <div id="playersList">
        <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 30px 0;">
          No players currently online.
        </div>
      </div>
    </div>
  </main>

  <script>
    let currentPin = '';
    let currentServerId = '';
    let serversList = [];
    let enteredPin = '';
    let pollInterval = null;
    let activeMobileTab = 'console';
    let lastLogLength = 0;

    function getStoredPin() {
      return sessionStorage.getItem('craftdock_pin') || '';
    }

    async function init() {
      const urlParams = new URLSearchParams(window.location.search);
      const queryPin = urlParams.get('pin');
      if (queryPin && queryPin.length === 4) {
        currentPin = queryPin;
        sessionStorage.setItem('craftdock_pin', queryPin);
      } else {
        currentPin = getStoredPin();
      }

      if (!currentPin || currentPin.length !== 4) {
        showPinModal();
        return;
      }
      const valid = await verifyPin(currentPin);
      if (!valid) {
        sessionStorage.removeItem('craftdock_pin');
        showPinModal();
        return;
      }
      hidePinModal();
      await loadServers();
      await loadAllData();
      startPolling();
    }

    function showPinModal() {
      enteredPin = '';
      updatePinDots();
      document.getElementById('pinOverlay').style.display = 'flex';
    }

    function hidePinModal() {
      document.getElementById('pinOverlay').style.display = 'none';
    }

    function updatePinDots() {
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot' + i);
        if (i < enteredPin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }

    async function enterDigit(d) {
      if (enteredPin.length < 4) {
        enteredPin += d;
        updatePinDots();
        if (enteredPin.length === 4) {
          const ok = await verifyPin(enteredPin);
          if (ok) {
            currentPin = enteredPin;
            sessionStorage.setItem('craftdock_pin', enteredPin);
            document.cookie = 'craftdock_pin=' + encodeURIComponent(enteredPin) + '; path=/; SameSite=Lax';
            hidePinModal();
            await loadServers();
            await loadAllData();
            startPolling();
          } else {
            enteredPin = '';
            updatePinDots();
            alert('Incorrect PIN. Please check your PC screen.');
          }
        }
      }
    }

    function backspaceDigit() {
      if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDots();
      }
    }

    async function verifyPin(pin) {
      try {
        const res = await fetch('/api/verify-pin?pin=' + encodeURIComponent(pin));
        const data = await res.json();
        return data.valid === true;
      } catch (e) {
        return false;
      }
    }

    function authHeaders() {
      return {
        'Content-Type': 'application/json',
        'x-craftdock-pin': currentPin
      };
    }

    async function loadServers() {
      try {
        const res = await fetch('/api/servers', { headers: authHeaders() });
        if (!res.ok) return;
        serversList = await res.json();
        const select = document.getElementById('serverSelect');
        select.innerHTML = '';
        if (serversList.length === 0) {
          select.innerHTML = '<option value="">No servers configured</option>';
          return;
        }

        serversList.forEach((s) => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.name + ' (' + (s.status || 'stopped').toUpperCase() + ')';
          select.appendChild(opt);
        });

        if (!currentServerId && serversList.length > 0) {
          currentServerId = serversList[0].id;
        }
        select.value = currentServerId;
        updateServerView();
        loadLogs();
      } catch (e) {
        console.error('Failed to load servers:', e);
      }
    }

    function onSelectServer(id) {
      currentServerId = id;
      lastLogLength = 0;
      updateServerView();
      loadAllData();
      loadLogs();
    }

    function updateServerView() {
      const server = serversList.find(s => s.id === currentServerId);
      if (!server) return;

      const pill = document.getElementById('statusPill');
      const text = document.getElementById('statusText');
      pill.className = 'status-pill status-' + (server.status || 'stopped');
      text.textContent = (server.status || 'stopped').toUpperCase();
    }

    async function loadStats() {
      if (!currentServerId) return;
      try {
        const res = await fetch('/api/server/' + currentServerId + '/stats', { headers: authHeaders() });
        if (!res.ok) return;
        const stats = await res.json();
        if (stats) {
          document.getElementById('statCpu').textContent = Math.round(stats.cpuPercent || 0) + '%';
          document.getElementById('statRam').textContent = Math.round(stats.memoryMb || 0) + ' MB';
          if (stats.players !== undefined) {
            document.getElementById('statPlayers').textContent = stats.players;
            document.getElementById('tabPlayerCount').textContent = stats.players;
          }
          if (stats.status) {
            const pill = document.getElementById('statusPill');
            const text = document.getElementById('statusText');
            pill.className = 'status-pill status-' + stats.status;
            text.textContent = stats.status.toUpperCase();
          }
        }
      } catch (e) {}
    }

    async function powerAction(action) {
      if (!currentServerId) return;
      try {
        await fetch('/api/server/' + currentServerId + '/action', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ action })
        });
        setTimeout(loadAllData, 600);
      } catch (e) {
        alert('Action failed: ' + e.message);
      }
    }

    async function sendCommand() {
      const input = document.getElementById('cmdInput');
      const cmd = input.value.trim();
      if (!cmd || !currentServerId) return;
      input.value = '';
      try {
        await fetch('/api/server/' + currentServerId + '/command', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ command: cmd })
        });
      } catch (e) {
        console.error(e);
      }
    }

    function sendQuickCmd(cmd) {
      document.getElementById('cmdInput').value = cmd;
      sendCommand();
    }

    async function loadLogs() {
      if (!currentServerId) return;
      try {
        const res = await fetch('/api/server/' + currentServerId + '/logs', { headers: authHeaders() });
        if (!res.ok) return;
        const logs = await res.json();
        if (logs.length === lastLogLength) return;
        lastLogLength = logs.length;
        const box = document.getElementById('consoleLogs');
        box.innerHTML = '';
        logs.forEach(appendLogLine);
        box.scrollTop = box.scrollHeight;
      } catch (e) {}
    }

    function appendLogLine(log) {
      const box = document.getElementById('consoleLogs');
      const div = document.createElement('div');
      div.className = 'log-line' + (log.level === 'error' ? ' error' : '');
      div.innerHTML = '<span class="ts">[' + (log.timestamp || '') + ']</span> ' + escapeHtml(log.text);
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function loadPlayers() {
      if (!currentServerId) return;
      try {
        const res = await fetch('/api/server/' + currentServerId + '/players', { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        renderPlayers(data.players || []);
      } catch (e) {}
    }

    function renderPlayers(players) {
      const list = document.getElementById('playersList');
      document.getElementById('statPlayers').textContent = players.length;
      document.getElementById('tabPlayerCount').textContent = players.length;

      if (players.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 30px 0;">No players currently online.</div>';
        return;
      }

      list.innerHTML = players.map(p => \`
        <div class="player-row">
          <div class="player-left">
            <img class="player-avatar" loading="lazy" src="https://mc-heads.net/avatar/\${p}/32" alt="\${p}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22 fill=%22%2364748b%22><rect width=%2232%22 height=%2232%22/></svg>'">
            <span class="player-name">\${p}</span>
          </div>
          <div class="player-actions">
            <button class="btn-xs" onclick="playerAction('\${p}', 'op')">OP</button>
            <button class="btn-xs btn-xs-danger" onclick="playerAction('\${p}', 'kick')">Kick</button>
            <button class="btn-xs btn-xs-danger" onclick="playerAction('\${p}', 'ban')">Ban</button>
          </div>
        </div>
      \`).join('');
    }

    async function playerAction(player, action) {
      if (!currentServerId) return;
      if (confirm(action.toUpperCase() + ' player ' + player + '?')) {
        await fetch('/api/server/' + currentServerId + '/player-action', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ player, action })
        });
        setTimeout(loadPlayers, 600);
      }
    }

    function switchTab(tab) {
      activeMobileTab = tab;
      document.getElementById('tabBtnConsole').classList.toggle('active', tab === 'console');
      document.getElementById('tabBtnPlayers').classList.toggle('active', tab === 'players');
      document.getElementById('tabContentConsole').style.display = tab === 'console' ? 'flex' : 'none';
      document.getElementById('tabContentPlayers').style.display = tab === 'players' ? 'block' : 'none';
      if (tab === 'console') {
        loadLogs();
      }
    }

    async function loadAllData() {
      if (!currentServerId) return;
      await Promise.all([
        loadStats(),
        loadPlayers(),
      ]);
    }

    function startPolling() {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(async () => {
        await loadAllData();
        if (activeMobileTab === 'console') {
          await loadLogs();
        }
      }, 2000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  </script>
</body>
</html>`;
}

function handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-craftdock-pin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Fast 204 response for favicon and mobile touch icons so browser does not hang or retry
  if (
    pathname === '/favicon.ico' ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname === '/site.webmanifest' ||
    pathname === '/manifest.json'
  ) {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. PIN verification endpoint
  if (pathname === '/api/verify-pin') {
    const valid = verifyRequestPin(req, parsedUrl);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid }));
    return;
  }

  // 2. Serve Mobile Dashboard HTML
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(getMobileDashboardHtml());
    return;
  }

  // From here on, all /api/* routes require PIN verification
  if (!verifyRequestPin(req, parsedUrl)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_PIN' }));
    return;
  }

  // 3. Server-Sent Events stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    });
    res.write('event: connected\ndata: {}\n\n');

    sseClients.add(res);

    const pingInterval = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
    return;
  }

  // 4. Server List
  if (pathname === '/api/servers' && req.method === 'GET') {
    const servers = loadServers().map((s) => ({
      id: s.id,
      name: s.name,
      software: s.software,
      version: s.version,
      port: s.port,
      status: getServerActiveStatus(s.id) !== 'stopped' ? getServerActiveStatus(s.id) : (s.status || 'stopped'),
      playerCount: getServerPlayers(s.id).length,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(servers));
    return;
  }

  // 5. Server Power Action
  const actionMatch = pathname.match(/^\/api\/server\/([^/]+)\/action$/);
  if (actionMatch && req.method === 'POST') {
    const serverId = actionMatch[1];
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { action } = JSON.parse(body || '{}');
        const srv = getServerById(serverId);
        if (action === 'start' && srv) {
          await startServer(srv);
        } else if (action === 'stop') {
          await stopServer(serverId);
        } else if (action === 'restart' && srv) {
          await stopServer(serverId);
          setTimeout(() => startServer(srv), 1500);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 6. Server Command
  const cmdMatch = pathname.match(/^\/api\/server\/([^/]+)\/command$/);
  if (cmdMatch && req.method === 'POST') {
    const serverId = cmdMatch[1];
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { command } = JSON.parse(body || '{}');
        const success = sendServerCommand(serverId, command);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 7. Server Logs
  const logsMatch = pathname.match(/^\/api\/server\/([^/]+)\/logs$/);
  if (logsMatch && req.method === 'GET') {
    const serverId = logsMatch[1];
    const logs = getServerLogs(serverId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logs));
    return;
  }

  // 8. Server Players
  const playersMatch = pathname.match(/^\/api\/server\/([^/]+)\/players$/);
  if (playersMatch && req.method === 'GET') {
    const serverId = playersMatch[1];
    const players = getServerPlayers(serverId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ players }));
    return;
  }

  // 9. Player Action (Kick, Ban, Op, Deop)
  const playerActionMatch = pathname.match(/^\/api\/server\/([^/]+)\/player-action$/);
  if (playerActionMatch && req.method === 'POST') {
    const serverId = playerActionMatch[1];
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { player, action } = JSON.parse(body || '{}');
        const srv = getServerById(serverId);
        if (action === 'kick') {
          sendServerCommand(serverId, `kick ${player} Kicked by Mobile Remote`);
        } else if (action === 'ban') {
          sendServerCommand(serverId, `ban ${player} Banned by Mobile Remote`);
          if (srv) banPlayer(srv.path, player, 'Banned by Mobile Remote');
        } else if (action === 'op') {
          sendServerCommand(serverId, `op ${player}`);
          if (srv) addOp(srv.path, player);
        } else if (action === 'deop') {
          sendServerCommand(serverId, `deop ${player}`);
          if (srv) removeOp(srv.path, player);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 10. Server Stats
  const statsMatch = pathname.match(/^\/api\/server\/([^/]+)\/stats$/);
  if (statsMatch && req.method === 'GET') {
    const serverId = statsMatch[1];
    const stats = getServerStats(serverId);
    const players = getServerPlayers(serverId);
    const activeStatus = getServerActiveStatus(serverId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      cpuPercent: stats?.cpuPercent || 0,
      memoryMb: stats?.memoryMb || 0,
      uptimeSeconds: stats?.uptimeSeconds || 0,
      players: players.length,
      status: activeStatus,
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

export function startRemoteService(port?: number): Promise<boolean> {
  return new Promise((resolve) => {
    const settings = loadAppSettings();
    const targetPort = port || settings.remoteServicePort || 25577;

    if (serverInstance && serverInstance.listening) {
      if (serverInstance.address() && (serverInstance.address() as any).port === targetPort) {
        return resolve(true);
      }
      stopRemoteService();
    }

    serverInstance = http.createServer(handleHttpRequest);

    serverInstance.listen(targetPort, '0.0.0.0', () => {
      console.log(`[CraftDock Mobile Remote] Running at http://${getLocalIpAddress()}:${targetPort}`);

      // Hook up live logs
      if (!unsubscribeLog) {
        unsubscribeLog = onRunnerLog((entry: ServerLogEntry) => {
          broadcastSse('log', entry);
        });
      }

      // Hook up live stats heartbeat every 2 seconds
      if (!statsInterval) {
        statsInterval = setInterval(() => {
          if (sseClients.size === 0) return;
          const servers = loadServers();
          for (const s of servers) {
            const stats = getServerStats(s.id);
            const players = getServerPlayers(s.id);
            broadcastSse('stats', {
              serverId: s.id,
              cpuPercent: stats?.cpuPercent || 0,
              memoryMb: stats?.memoryMb || 0,
              players: players.length,
            });
            broadcastSse('players', { serverId: s.id, players });
          }
          broadcastSse('status', {
            servers: servers.map((s) => ({
              id: s.id,
              name: s.name,
              status: getServerActiveStatus(s.id) !== 'stopped' ? getServerActiveStatus(s.id) : (s.status || 'stopped'),
              playerCount: getServerPlayers(s.id).length,
            })),
          });
        }, 2000);
      }

      resolve(true);
    });

    serverInstance.on('error', (err) => {
      console.error('[CraftDock Mobile Remote] Failed to listen on port', targetPort, err);
      resolve(false);
    });
  });
}

export function stopRemoteService(): Promise<void> {
  return new Promise((resolve) => {
    stopRemoteTunnel();
    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
    if (unsubscribeLog) {
      unsubscribeLog();
      unsubscribeLog = null;
    }
    for (const client of sseClients) {
      try {
        client.end();
      } catch {}
    }
    sseClients.clear();

    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export async function toggleRemoteService(enabled: boolean): Promise<boolean> {
  saveAppSettings({ remoteServiceEnabled: enabled });
  if (enabled) {
    regenerateRemotePin();
    return startRemoteService();
  } else {
    await stopRemoteService();
    return false;
  }
}


export async function setRemotePort(port: number): Promise<boolean> {
  if (port < 1024 || port > 65535) return false;
  saveAppSettings({ remoteServicePort: port });
  await stopRemoteService();
  return startRemoteService(port);
}

export function initRemoteService() {
  const settings = loadAppSettings();
  if (settings.remoteServiceEnabled !== false) {
    startRemoteService(settings.remoteServicePort);
  }
}

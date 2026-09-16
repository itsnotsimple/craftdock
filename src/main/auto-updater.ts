import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { getActiveServerIds, stopServer } from './server-runner';

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/itsnotsimple/craftdock/releases/latest';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  body: string;
  assets: ReleaseAsset[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseUrl: string;
  assetName?: string;
  assetSize?: number;
}

export interface UpdateProgress {
  status: 'idle' | 'downloading' | 'installing' | 'ready' | 'error';
  percent: number;
  transferred: number;
  total: number;
  error?: string;
}

let cachedRelease: GitHubRelease | null = null;
let currentAbortController: AbortController | null = null;
let isUpdating = false;

function semverGt(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

export function getPlatformAsset(assets: ReleaseAsset[]): ReleaseAsset | null {
  if (process.platform === 'win32') {
    return assets.find((a) => a.name.toLowerCase().endsWith('.exe')) || null;
  }

  if (process.platform === 'darwin') {
    const isArm = process.arch === 'arm64';
    if (isArm) {
      return (
        assets.find((a) => a.name.includes('arm64') && a.name.endsWith('.dmg')) ||
        assets.find((a) => a.name.toLowerCase().includes('applesilicon') && a.name.endsWith('.dmg')) ||
        assets.find((a) => a.name.endsWith('.dmg')) ||
        null
      );
    } else {
      return (
        assets.find((a) => (a.name.includes('x64') || a.name.toLowerCase().includes('intel')) && a.name.endsWith('.dmg')) ||
        assets.find((a) => a.name.endsWith('.dmg')) ||
        null
      );
    }
  }

  return null;
}

export async function checkForUpdates(targetWindow?: BrowserWindow): Promise<UpdateInfo | null> {
  try {
    const currentVersion = app.getVersion();
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        'User-Agent': `CraftDock/${currentVersion}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      console.warn('[AutoUpdater] Release check HTTP status:', res.status);
      return null;
    }

    const release = (await res.json()) as GitHubRelease;
    cachedRelease = release;

    const latestTag = release.tag_name || '';
    if (semverGt(latestTag, currentVersion)) {
      const asset = getPlatformAsset(release.assets || []);
      const info: UpdateInfo = {
        currentVersion,
        latestVersion: latestTag,
        releaseName: release.name || latestTag,
        releaseUrl: release.html_url,
        assetName: asset?.name,
        assetSize: asset?.size,
      };

      const windows = targetWindow ? [targetWindow] : BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('update-available', info);
        }
      }
      return info;
    }

    return null;
  } catch (err) {
    console.warn('[AutoUpdater] Check for updates failed:', err);
    return null;
  }
}

function broadcastProgress(progress: UpdateProgress): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('app-update-progress', progress);
    }
  }
}

export async function startAppUpdate(): Promise<{ success: boolean; error?: string }> {
  if (isUpdating) {
    return { success: false, error: 'Update is already in progress' };
  }

  if (!cachedRelease) {
    await checkForUpdates();
  }

  if (!cachedRelease) {
    return { success: false, error: 'Failed to fetch release information' };
  }

  const asset = getPlatformAsset(cachedRelease.assets || []);
  if (!asset) {
    return { success: false, error: `No matching installer found for platform ${process.platform} (${process.arch})` };
  }

  isUpdating = true;
  currentAbortController = new AbortController();

  const tempDir = path.join(app.getPath('temp'), 'craftdock-update');
  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
  } catch (e) {}

  const destFile = path.join(tempDir, asset.name);

  try {
    broadcastProgress({
      status: 'downloading',
      percent: 0,
      transferred: 0,
      total: asset.size || 0,
    });

    const response = await fetch(asset.browser_download_url, {
      signal: currentAbortController.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status} while downloading update asset`);
    }

    const totalBytes = Number(response.headers.get('content-length')) || asset.size || 0;
    let transferredBytes = 0;
    let lastEmit = 0;

    const nodeStream = Readable.fromWeb(response.body as any);
    const fileStream = fs.createWriteStream(destFile);

    nodeStream.on('data', (chunk: Buffer) => {
      transferredBytes += chunk.length;
      const now = Date.now();
      if (now - lastEmit > 120 || transferredBytes === totalBytes) {
        lastEmit = now;
        const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;
        broadcastProgress({
          status: 'downloading',
          percent,
          transferred: transferredBytes,
          total: totalBytes,
        });
      }
    });

    await pipeline(nodeStream, fileStream);

    broadcastProgress({
      status: 'installing',
      percent: 100,
      transferred: totalBytes,
      total: totalBytes,
    });

    // Gracefully stop any active servers before restarting
    try {
      const runningIds = getActiveServerIds();
      for (const id of runningIds) {
        stopServer(id);
      }
    } catch (err) {
      console.warn('[AutoUpdater] Error stopping servers before update:', err);
    }

    // If running in development (not packaged), simulate success without overriding dev binaries
    if (!app.isPackaged) {
      console.log(`[AutoUpdater] Dev mode: Update file downloaded to ${destFile}. Real installation skipped in dev.`);
      isUpdating = false;
      return { success: true };
    }

    // Perform platform-specific update installation
    if (process.platform === 'darwin') {
      let targetApp = process.execPath.replace(/\/Contents\/MacOS\/[^/]+$/, '');
      if (!targetApp.endsWith('.app') || targetApp.startsWith('/Volumes/')) {
        targetApp = '/Applications/CraftDock.app';
      }

      const scriptPath = path.join(tempDir, 'install-mac.sh');
      const scriptContent = `#!/bin/bash
DMG_FILE="$1"
TARGET_APP="$2"
APP_PID="$3"

# Wait for current app to exit
while kill -0 "$APP_PID" 2>/dev/null; do
  sleep 0.2
done

# Create mount point
MOUNT_DIR=$(mktemp -d /tmp/cdmount.XXXXXX)

# Attach DMG quietly
hdiutil attach "$DMG_FILE" -nobrowse -readonly -mountpoint "$MOUNT_DIR" >/dev/null 2>&1

# Find the .app inside mounted DMG
SOURCE_APP=$(find "$MOUNT_DIR" -maxdepth 2 -name "*.app" -type d | head -n 1)

if [ -n "$SOURCE_APP" ] && [ -d "$SOURCE_APP" ]; then
  if [[ "$TARGET_APP" != *".app" ]]; then
    TARGET_APP="/Applications/CraftDock.app"
  fi

  # Attempt normal copy
  rm -rf "$TARGET_APP" 2>/dev/null
  cp -R "$SOURCE_APP" "$TARGET_APP" 2>/dev/null

  # Fallback to AppleScript admin prompt if standard copy failed due to permissions
  if [ ! -d "$TARGET_APP" ]; then
    osascript -e "do shell script \"rm -rf \\\"$TARGET_APP\\\" && cp -R \\\"$SOURCE_APP\\\" \\\"$TARGET_APP\\\"\" with administrator privileges"
  fi

  # Strip quarantine attribute to prevent Gatekeeper warning
  xattr -cr "$TARGET_APP" 2>/dev/null || true
fi

# Detach and cleanup
hdiutil detach "$MOUNT_DIR" -force >/dev/null 2>&1
rm -rf "$MOUNT_DIR"
rm -f "$DMG_FILE"

# Launch updated CraftDock
open -n "$TARGET_APP"
`;

      await fs.promises.writeFile(scriptPath, scriptContent, { mode: 0o755 });

      const child = spawn('/bin/bash', [scriptPath, destFile, targetApp, String(process.pid)], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      app.exit(0);
    } else if (process.platform === 'win32') {
      const psPath = path.join(tempDir, 'install-win.ps1');
      const safeDest = destFile.replace(/\\/g, '\\\\');
      const safeExec = process.execPath.replace(/\\/g, '\\\\');
      const psContent = `
Start-Sleep -Seconds 2
try {
  $proc = Start-Process -FilePath "${safeDest}" -ArgumentList "/S" -PassThru -Wait
  Start-Process -FilePath "${safeExec}"
  Remove-Item -Path "${safeDest}" -Force -ErrorAction SilentlyContinue
} catch {}
Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
`;

      await fs.promises.writeFile(psPath, psContent, 'utf8');

      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', psPath],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        }
      );
      child.unref();

      app.exit(0);
    }

    return { success: true };
  } catch (err: any) {
    isUpdating = false;
    const msg = err.message || 'Unknown update download error';
    console.error('[AutoUpdater] Update failed:', err);
    broadcastProgress({
      status: 'error',
      percent: 0,
      transferred: 0,
      total: 0,
      error: msg,
    });
    return { success: false, error: msg };
  }
}

export function cancelAppUpdate(): boolean {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    isUpdating = false;
    broadcastProgress({
      status: 'idle',
      percent: 0,
      transferred: 0,
      total: 0,
    });
    return true;
  }
  return false;
}

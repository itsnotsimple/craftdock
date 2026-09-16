import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { getDataDirectory } from './server-store';
import { getActiveServerIds, stopServer } from './server-runner';

export async function performUninstallAndErase(): Promise<boolean> {
  // 1. Forcefully stop all active servers
  try {
    const runningIds = getActiveServerIds();
    for (const id of runningIds) {
      stopServer(id);
    }
  } catch (e) {
    console.warn('[Uninstall] Error stopping servers:', e);
  }

  const dataDir = getDataDirectory();
  const userDataDir = app.getPath('userData');
  const homeFallback = path.join(os.homedir(), '.minecraft_server_manager');
  const tempUpdateDir = path.join(app.getPath('temp'), 'craftdock-update');

  // 2. Best-effort in-process cleanup
  const pathsToClean = [dataDir, homeFallback, tempUpdateDir];
  for (const p of pathsToClean) {
    try {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[Uninstall] In-process delete skipped/failed for ${p}:`, err);
    }
  }

  // 3. Spawn detached post-exit cleanup process
  const tempDir = app.getPath('temp');

  if (process.platform === 'win32') {
    const appDir = path.dirname(process.execPath);
    const uninstallerExe = path.join(appDir, 'Uninstall CraftDock.exe');
    const hasUninstaller = fs.existsSync(uninstallerExe);

    const psPath = path.join(tempDir, 'craftdock-uninstall.ps1');
    const safeData = dataDir.replace(/\\/g, '\\\\');
    const safeUserData = userDataDir.replace(/\\/g, '\\\\');
    const safeHome = homeFallback.replace(/\\/g, '\\\\');
    const safeTemp = tempUpdateDir.replace(/\\/g, '\\\\');
    const safeUninstaller = uninstallerExe.replace(/\\/g, '\\\\');

    const psContent = `
Start-Sleep -Seconds 2
Stop-Process -Name "java", "javaw" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "${safeData}", "${safeUserData}", "${safeHome}", "${safeTemp}" -Recurse -Force -ErrorAction SilentlyContinue
${hasUninstaller ? `Start-Process -FilePath "${safeUninstaller}" -ArgumentList "/S"` : ''}
Remove-Item -Path $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue
`;

    try {
      fs.writeFileSync(psPath, psContent, 'utf8');
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', psPath],
        { detached: true, stdio: 'ignore', windowsHide: true }
      );
      child.unref();
    } catch (e) {
      console.error('[Uninstall] Failed to spawn cleaner ps1:', e);
    }
  } else if (process.platform === 'darwin') {
    let appBundle = process.execPath.replace(/\/Contents\/MacOS\/.*$/, '');
    if (!appBundle.endsWith('.app') || appBundle.startsWith('/Volumes/')) {
      appBundle = '/Applications/CraftDock.app';
    }

    const shPath = path.join(tempDir, 'craftdock-uninstall.sh');
    const shContent = `#!/bin/bash
PID="$1"
DATA_DIR="$2"
USER_DATA="$3"
HOME_FALLBACK="$4"
TEMP_DIR="$5"
APP_BUNDLE="$6"

# Wait for CraftDock process to quit
while kill -0 "$PID" 2>/dev/null; do
  sleep 0.2
done

# Kill any orphaned java processes launched by CraftDock
pkill -f "minecraft_servers_data" 2>/dev/null || true

# Erase all data directories completely
rm -rf "$DATA_DIR" 2>/dev/null
rm -rf "$USER_DATA" 2>/dev/null
rm -rf "$HOME_FALLBACK" 2>/dev/null
rm -rf "$TEMP_DIR" 2>/dev/null

# Remove Application bundle if installed
if [ -d "$APP_BUNDLE" ]; then
  rm -rf "$APP_BUNDLE" 2>/dev/null || osascript -e "do shell script \"rm -rf \\\"$APP_BUNDLE\\\"\" with administrator privileges" 2>/dev/null || true
fi

rm -f "$0" 2>/dev/null
`;

    try {
      fs.writeFileSync(shPath, shContent, { mode: 0o755 });
      const child = spawn(
        '/bin/bash',
        [shPath, String(process.pid), dataDir, userDataDir, homeFallback, tempUpdateDir, appBundle],
        { detached: true, stdio: 'ignore' }
      );
      child.unref();
    } catch (e) {
      console.error('[Uninstall] Failed to spawn cleaner sh:', e);
    }
  }

  // 4. Force exit process immediately
  app.exit(0);
  return true;
}

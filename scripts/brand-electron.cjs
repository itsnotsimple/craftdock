const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  // 1. Terminate leftover craftdock / electron processes to release file locks
  try {
    execSync('taskkill /F /IM craftdock.exe', { stdio: 'ignore' });
  } catch {}
  try {
    execSync('taskkill /F /IM electron.exe', { stdio: 'ignore' });
  } catch {}

  // 2. Free Vite dev port 5173 if held by an orphaned node/vite process
  try {
    const pidsRaw = execSync('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess"', { encoding: 'utf-8' });
    const pids = pidsRaw.trim().split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      const num = parseInt(pid, 10);
      if (!isNaN(num) && num > 0) {
        execSync(`taskkill /F /PID ${num}`, { stdio: 'ignore' });
      }
    }
  } catch {}

  const root = path.resolve(__dirname, '..');
  const rceditExe = path.join(root, 'node_modules/electron-winstaller/vendor/rcedit.exe');
  const electronExe = path.join(root, 'node_modules/electron/dist/electron.exe');
  const craftdockExe = path.join(root, 'node_modules/electron/dist/craftdock.exe');
  const iconIco = path.join(root, 'resources/icon.ico');

  // 3. Create branded craftdock.exe (bypasses Windows Explorer's stale electron.exe icon cache completely)
  if (fs.existsSync(electronExe)) {
    try {
      fs.copyFileSync(electronExe, craftdockExe);
    } catch {}
  }

  // 4. Brand both executables with CraftDock icon and metadata
  const targets = [craftdockExe, electronExe].filter((f) => fs.existsSync(f));
  for (const targetExe of targets) {
    if (fs.existsSync(rceditExe) && fs.existsSync(iconIco)) {
      try {
        execSync(
          `"${rceditExe}" "${targetExe}" --set-icon "${iconIco}" --set-version-string "FileDescription" "CraftDock" --set-version-string "ProductName" "CraftDock" --set-version-string "CompanyName" "CraftDock" --set-version-string "OriginalFilename" "CraftDock.exe"`,
          { stdio: 'ignore' }
        );
      } catch {}
    }
  }
  console.log('[CraftDock] craftdock.exe branded successfully with CraftDock icon.');

  // 4.1 Register Windows AppUserModelId for native toast notifications
  try {
    const iconPng = path.join(root, 'resources', 'icon.png');
    execSync(`reg delete "HKCU\\Software\\Classes\\AppUserModelId\\CraftDoc" /f`, { stdio: 'ignore' });
    execSync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\CraftDoc" /f`, { stdio: 'ignore' });
    execSync(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\CraftDock" /v DisplayName /t REG_SZ /d "CraftDock" /f`, { stdio: 'ignore' });
    execSync(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\CraftDock" /v IconUri /t REG_SZ /d "${iconPng}" /f`, { stdio: 'ignore' });
    execSync(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\com.craftdock.minecraftservermanager" /v DisplayName /t REG_SZ /d "CraftDock" /f`, { stdio: 'ignore' });
    execSync(`reg add "HKCU\\Software\\Classes\\AppUserModelId\\com.craftdock.minecraftservermanager" /v IconUri /t REG_SZ /d "${iconPng}" /f`, { stdio: 'ignore' });
    console.log('[CraftDock] Toast notification AUMID registered.');
  } catch {}

  // 5. Clean up stale or conflicting shortcuts
  const startMenuPrograms = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  if (fs.existsSync(startMenuPrograms)) {
    const staleShortcuts = [
      'Electron.lnk',
      'CraftDock Dev.lnk',
      'CraftDock.lnk',
      'CraftDoc.lnk',
      'CraftDoc Dev.lnk',
    ];
    for (const name of staleShortcuts) {
      const p = path.join(startMenuPrograms, name);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }

    // 6. Invalidate Windows icon cache
    try {
      execSync('ie4uinit.exe -show', { stdio: 'ignore' });
    } catch {}
  }
} catch (e) {
  console.warn('[CraftDock Branding Warning]', e.message);
}

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const craftdockExe = path.join(root, 'node_modules/electron/dist/craftdock.exe');
const electronExe = path.join(root, 'node_modules/electron/dist/electron.exe');

let executable = 'electron';
if (process.platform === 'win32') {
  if (fs.existsSync(craftdockExe)) {
    executable = craftdockExe;
  } else if (fs.existsSync(electronExe)) {
    executable = electronExe;
  }
}

const child = spawn(executable, ['.'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('[CraftDock Launcher Error]:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  try { child.kill('SIGINT'); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { child.kill('SIGTERM'); } catch {}
  process.exit(0);
});

import { Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadAppSettings } from './app-settings';

function getAppIconPath(): string | undefined {
  const candidatePaths = [
    path.join(__dirname, '../resources/icon.png'),
    path.join(process.resourcesPath || '', 'resources/icon.png'),
    path.join(process.resourcesPath || '', 'icon.png'),
    path.resolve(process.cwd(), 'resources/icon.png'),
  ];
  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return undefined;
}

/**
 * Universal cross-platform notification helper (Windows & macOS)
 */
export function sendDesktopNotification(
  titleOrOptions: string | { title: string; body: string; silent?: boolean },
  bodyText?: string,
  silent = false
): void {
  try {
    if (!Notification.isSupported()) {
      console.warn('[NotificationService] Notification.isSupported() is false');
      return;
    }

    let title = 'CraftDock';
    let body = '';
    let isSilent = silent;

    if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
      title = titleOrOptions.title || 'CraftDock';
      body = titleOrOptions.body || '';
      isSilent = titleOrOptions.silent ?? silent;
    } else if (typeof titleOrOptions === 'string') {
      title = titleOrOptions;
      body = bodyText || '';
    }

    const icon = getAppIconPath();
    const notification = new Notification({
      title,
      body,
      icon,
      silent: isSilent,
    });
    notification.show();
  } catch (err) {
    console.error('[NotificationService] Notification error:', err);
  }
}

/**
 * Send a test desktop notification in the current active language
 */
export function sendTestNotification(overrideLang?: 'bg' | 'en'): boolean {
  const settings = loadAppSettings();
  const activeLang = overrideLang || settings.language || 'bg';
  const isEn = activeLang === 'en';

  sendDesktopNotification(
    isEn ? 'CraftDock Test Notification 🔔' : 'CraftDock Тестово известие 🔔',
    isEn
      ? 'Desktop notifications are working perfectly in English!'
      : 'Настолните известия работят перфектно на български език!'
  );
  return true;
}

/**
 * Notify when a server completes booting and is ready for connections
 */
export function notifyServerReady(serverName: string): void {
  const settings = loadAppSettings();
  if (!settings.notifyOnServerReady) return;

  const isEn = settings.language === 'en';
  sendDesktopNotification(
    isEn ? 'Minecraft Server Ready! 🚀' : 'Minecraft Сървърът е готов! 🚀',
    isEn
      ? `Server "${serverName}" started successfully and is waiting for players.`
      : `Сървърът "${serverName}" стартира успешно и очаква играчи.`
  );
}

/**
 * Notify when a player joins the server
 */
export function notifyPlayerJoin(serverName: string, playerName: string): void {
  const settings = loadAppSettings();
  if (!settings.notifyOnPlayerJoinLeave) return;

  const isEn = settings.language === 'en';
  sendDesktopNotification(
    isEn ? 'Player Joined 👤' : 'Играч влезе в играта 👤',
    isEn
      ? `"${playerName}" joined ${serverName}`
      : `"${playerName}" се присъедини към ${serverName}`
  );
}

/**
 * Notify when a player leaves the server
 */
export function notifyPlayerLeave(serverName: string, playerName: string): void {
  const settings = loadAppSettings();
  if (!settings.notifyOnPlayerJoinLeave) return;

  const isEn = settings.language === 'en';
  sendDesktopNotification(
    isEn ? 'Player Left 🚪' : 'Играч напусна играта 🚪',
    isEn
      ? `"${playerName}" left ${serverName}`
      : `"${playerName}" излезе от ${serverName}`
  );
}

/**
 * Notify when a server experiences an unexpected crash
 */
export function notifyServerCrash(serverName: string, exitCode?: number): void {
  const settings = loadAppSettings();
  if (!settings.notifyOnCrash) return;

  const isEn = settings.language === 'en';
  const codeText = exitCode !== undefined && exitCode !== null
    ? (isEn ? ` (exit code ${exitCode})` : ` (код ${exitCode})`)
    : '';

  sendDesktopNotification(
    isEn ? 'Warning: Server Stopped Unexpectedly! ⚠️' : 'Внимание: Сървърът спря неочаквано! ⚠️',
    isEn
      ? `Server "${serverName}" stopped unexpectedly${codeText}. Check Crash Analyzer for solutions.`
      : `Сървърът "${serverName}" прекъсна работа${codeText}. Проверете Crash Analyzer за решение.`
  );
}

/**
 * Notify when an automatic backup completes
 */
export function notifyAutoBackup(serverName: string, fileName: string): void {
  const settings = loadAppSettings();
  if (!settings.notifyOnBackup) return;

  const isEn = settings.language === 'en';
  sendDesktopNotification(
    isEn ? 'Auto-Backup Completed 💾' : 'Автоматичен бекъп готов 💾',
    isEn
      ? `World was successfully backed up for "${serverName}" (${fileName})`
      : `Успешно беше архивиран свят за "${serverName}" (${fileName})`
  );
}

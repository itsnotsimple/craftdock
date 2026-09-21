import fs from 'fs';
import path from 'path';
import { loadAppSettings } from './app-settings';

export interface CrashReportFile {
  fileName: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
}

export interface CrashAnalysisResult {
  hasCrash: boolean;
  fileName?: string;
  fileDate?: string;
  category:
    | 'oom'
    | 'port_bind'
    | 'java_version'
    | 'plugin'
    | 'watchdog'
    | 'session_lock'
    | 'world_corrupt'
    | 'unknown';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  culpritPlugin?: string;
  culpritClass?: string;
  relevantLines: string[];
  rawLog: string;
}

/**
 * Scan serverDir/crash-reports and logs/ for crash reports and log files, sorted newest first
 */
export function getCrashReports(serverDir: string): CrashReportFile[] {
  const reports: CrashReportFile[] = [];

  // 1. Check crash-reports/ directory
  const reportsDir = path.join(serverDir, 'crash-reports');
  if (fs.existsSync(reportsDir)) {
    try {
      const files = fs.readdirSync(reportsDir);
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const fullPath = path.join(reportsDir, file);
          const stats = fs.statSync(fullPath);
          reports.push({
            fileName: file,
            path: fullPath,
            createdAt: stats.mtime.toISOString(),
            sizeBytes: stats.size,
          });
        }
      }
    } catch (err) {
      console.error('[CrashAnalyzer] Error listing crash reports:', err);
    }
  }

  // 2. Also include logs/latest.log so users can inspect/analyze recent logs
  const latestLogPath = path.join(serverDir, 'logs', 'latest.log');
  if (fs.existsSync(latestLogPath)) {
    try {
      const stats = fs.statSync(latestLogPath);
      reports.push({
        fileName: 'latest.log',
        path: latestLogPath,
        createdAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      });
    } catch (e) {}
  }

  return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Analyze a crash report from crash-reports/, logs/latest.log, or uptime history
 */
export function analyzeCrash(
  serverDir: string,
  specificFileName?: string,
  sessionInfo?: any,
  requestedLang?: 'bg' | 'en'
): CrashAnalysisResult {
  let content = '';
  let reportFileName = specificFileName;
  let reportDate = '';

  const reportsDir = path.join(serverDir, 'crash-reports');
  const logsDir = path.join(serverDir, 'logs');

  if (specificFileName) {
    let filePath = path.join(reportsDir, specificFileName);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(logsDir, specificFileName);
    }
    if (fs.existsSync(filePath)) {
      try {
        content = fs.readFileSync(filePath, 'utf-8');
        reportDate = fs.statSync(filePath).mtime.toISOString();
        reportFileName = specificFileName;
      } catch (e) {
        console.error('[CrashAnalyzer] Failed reading specified file:', e);
      }
    }
  } else {
    // Check crash-reports first for the newest report
    const reports = getCrashReports(serverDir);
    const dedicated = reports.find((r) => r.fileName.endsWith('.txt'));
    const chosen = dedicated || (reports.length > 0 ? reports[0] : null);

    if (chosen && fs.existsSync(chosen.path)) {
      try {
        reportFileName = chosen.fileName;
        reportDate = chosen.createdAt;
        content = fs.readFileSync(chosen.path, 'utf-8');
      } catch (e) {
        console.error('[CrashAnalyzer] Failed reading chosen report:', e);
      }
    } else {
      // Fallback to logs/latest.log
      const latestLogPath = path.join(logsDir, 'latest.log');
      if (fs.existsSync(latestLogPath)) {
        try {
          const raw = fs.readFileSync(latestLogPath, 'utf-8');
          const lines = raw.split('\n');
          content = lines.slice(-400).join('\n');
          reportFileName = 'latest.log';
          reportDate = fs.statSync(latestLogPath).mtime.toISOString();
        } catch (e) {
          console.error('[CrashAnalyzer] Failed reading latest.log:', e);
        }
      }
    }
  }

  // Check uptime history for recent ungraceful session, or prioritize explicitly provided sessionInfo
  let lastCrashSession: any = sessionInfo || null;
  if (!lastCrashSession) {
    const uptimePath = path.join(serverDir, 'craftdock-data', 'uptime-history.json');
    if (fs.existsSync(uptimePath)) {
      try {
        const raw = fs.readFileSync(uptimePath, 'utf-8');
        const sessions = JSON.parse(raw);
        if (Array.isArray(sessions)) {
          lastCrashSession = [...sessions].reverse().find(
            (s) => s.wasGraceful === false || (s.exitCode !== 0 && s.exitCode !== null && s.exitCode !== undefined)
          );
        }
      } catch (e) {}
    }
  }

  const isEn = (requestedLang || loadAppSettings().language || 'en') === 'en';

  if (!content.trim()) {
    if (lastCrashSession) {
      const code = lastCrashSession.exitCode ?? -1;
      const isOom = code === 137;
      return {
        hasCrash: true,
        fileName: 'uptime-history.json',
        fileDate: lastCrashSession.endedAt || lastCrashSession.startedAt,
        category: isOom ? 'oom' : 'unknown',
        severity: isOom ? 'critical' : 'warning',
        title: isOom
          ? (isEn ? 'Out of Memory Crash (Exit Code 137 / SIGKILL)' : 'Срив поради недостиг на RAM (Код 137 / OOM)')
          : isEn
            ? `Unexpected Server Stop (Exit Code ${code})`
            : `Неочаквано спиране на сървъра (Код ${code})`,
        description: isOom
          ? (isEn
              ? `Server process was killed by the operating system with Exit Code 137 (SIGKILL / OOM-Killer). Java exceeded memory limits.`
              : `Сървърният процес беше принудително терминиран от операционната система с изходен код 137 (OOM Killer / SIGKILL) поради изчерпване на оперативната памет.`)
          : isEn
            ? `Server stopped unexpectedly on ${new Date(lastCrashSession.endedAt || lastCrashSession.startedAt).toLocaleString()} with exit code ${code}. No crash report file was written by Minecraft before process termination.`
            : `Сървърът е прекъснал работа неочаквано на ${new Date(lastCrashSession.endedAt || lastCrashSession.startedAt).toLocaleString()} с код ${code}. Процесът е приключил преди да успее да запише отделен файл в crash-reports.`,
        recommendation: isOom
          ? (isEn
              ? 'Increase allocated RAM in "Server Settings" (e.g. 4GB - 6GB) or decrease view-distance and loaded plugins.'
              : 'Увеличете заделената RAM памет в "Настройки на сървъра" (напр. 4GB - 6GB) или намалете view-distance и броя плъгини.')
          : isEn
            ? 'Check RAM allocation, CPU limits, or verify if the process was force closed.'
            : 'Проверете заделената RAM памет или дали процесът не е бил принудително затворен от системата.',
        relevantLines: [
          `Session ID: ${lastCrashSession.id || 'N/A'}`,
          `Started: ${lastCrashSession.startedAt}`,
          `Ended: ${lastCrashSession.endedAt || 'unknown'}`,
          `Exit Code: ${code} ${isOom ? '(Out Of Memory / SIGKILL)' : ''}`,
          `Graceful: false`
        ],
        rawLog: '',
      };
    }

    return {
      hasCrash: false,
      category: 'unknown',
      severity: 'info',
      title: isEn ? 'No Crashes Detected' : 'Няма открити сривове',
      description: isEn
        ? 'No crash logs or ungraceful shutdown events were found in the server directory.'
        : 'Не бяха намерени краш логове или скорошни грешки в директорията на сървъра.',
      recommendation: isEn
        ? 'The server is healthy or previous log files have been cleared.'
        : 'Сървърът работи нормално или лог файловете са били изчистени.',
      relevantLines: [],
      rawLog: '',
    };
  }

  // Parse and match patterns
  return parseCrashContent(content, reportFileName, reportDate, lastCrashSession, isEn);
}

function extractRelevantLines(content: string, matchIndex: number, lineCount = 8): string[] {
  const allLines = content.split('\n');
  let targetLineIdx = 0;
  let charAccum = 0;

  for (let i = 0; i < allLines.length; i++) {
    charAccum += allLines[i].length + 1;
    if (charAccum >= matchIndex) {
      targetLineIdx = i;
      break;
    }
  }

  const start = Math.max(0, targetLineIdx - 2);
  const end = Math.min(allLines.length, targetLineIdx + lineCount);
  return allLines.slice(start, end).map((l) => l.trim()).filter(Boolean);
}

function parseCrashContent(
  content: string,
  fileName?: string,
  fileDate?: string,
  lastCrashSession?: any,
  isEn = true
): CrashAnalysisResult {
  const lower = content.toLowerCase();

  // 1. Out of Memory (RAM exhaustion)
  if (
    lower.includes('outofmemoryerror') ||
    lower.includes('java heap space') ||
    lower.includes('gc overhead limit exceeded')
  ) {
    const idx = Math.max(
      content.indexOf('OutOfMemoryError'),
      content.indexOf('Java heap space'),
      content.indexOf('GC overhead')
    );
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'oom',
      severity: 'critical',
      title: isEn
        ? 'Out of Memory Error (RAM Exhaustion)'
        : 'Недостиг на RAM оперативна памет (Out of Memory)',
      description: isEn
        ? 'The server exhausted its allocated Java Heap Space memory and JVM terminated forcibly.'
        : 'Сървърът е изчерпал заделената му RAM памет (Java Heap Space) и виртуалната машина е спряла принудително.',
      recommendation: isEn
        ? 'Go to "Server Settings" and increase maximum RAM (recommended 4GB - 6GB for servers with plugins or players).'
        : 'Отидете в таб "Настройки на сървъра" и увеличете максималната RAM памет (препоръчително поне 4GB - 6GB при използване на плъгини или повече играчи).',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 2. Port already in use / BindException
  if (
    lower.includes('bindexception') ||
    lower.includes('address already in use') ||
    lower.includes('failed to bind to port')
  ) {
    const idx = Math.max(
      content.indexOf('BindException'),
      content.indexOf('Address already in use'),
      content.indexOf('failed to bind')
    );
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'port_bind',
      severity: 'critical',
      title: isEn
        ? 'Port Already in Use (BindException)'
        : 'Зает мрежов порт (Address already in use)',
      description: isEn
        ? 'The server port (default 25565) is already being used by another running server or a lingering process.'
        : 'Портът на сървъра (по подразбиране 25565) вече е зает от друг работещ сървър или предишна инстанция, която не се е затворила напълно.',
      recommendation: isEn
        ? 'Verify no other Minecraft server is running in CraftDock, or change the port to 25566 in "Server Settings".'
        : 'Проверете дали няма друг пуснат сървър в CraftDock. Можете да смените порта на 25566 от "Настройки на сървъра" или да рестартирате компютъра за освобождаване на порта.',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 3. Java Version mismatch
  if (
    lower.includes('unsupportedclassversionerror') ||
    lower.includes('has been compiled by a more recent version of the java runtime')
  ) {
    const idx = content.indexOf('UnsupportedClassVersionError');
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'java_version',
      severity: 'critical',
      title: isEn ? 'Incompatible Java Version' : 'Несъвместима версия на Java',
      description: isEn
        ? 'This Minecraft server edition or an installed plugin requires a newer Java Runtime version.'
        : 'Тази версия на Minecraft сървъра или инсталиран плъгин изискват по-нова версия на Java от инсталираната на компютъра.',
      recommendation: isEn
        ? 'Minecraft 1.20.5+ requires Java 21, while 1.17 - 1.20.4 requires Java 17. Configure your Java path in Settings.'
        : 'За Minecraft 1.20.5+ се изисква Java 21, а за Minecraft 1.17 - 1.20.4 се изисква Java 17. Инсталирайте подходящата версия или задайте пътя в глобалните настройки на CraftDock.',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 4. Watchdog Tick Timeout
  if (
    lower.includes('a single server tick took') ||
    lower.includes('considering it to be crashed, server will also shutdown') ||
    (lower.includes('watchdog') && lower.includes('shutdown'))
  ) {
    const idx = content.indexOf('A single server tick took');
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'watchdog',
      severity: 'warning',
      title: isEn ? 'Server Frozen (Watchdog Timeout)' : 'Сървърът е замръзнал (Watchdog Timeout)',
      description: isEn
        ? 'A single tick took longer than 60 seconds (heavy chunk generation, mob farm, or blocking plugin) and the Watchdog mechanism killed the server.'
        : 'Сървърът не е отговорил на вътрешния брояч за повече от 60 секунди (тежко генериране на свят, огромен брой мобове или блокираща команда) и защитният механизъм Watchdog го е спрял.',
      recommendation: isEn
        ? 'In "Server Settings" -> "Advanced", set "Watchdog Protection (max-tick-time)" to -1 to disable false-positive crashes under high load.'
        : 'Отидете в "Настройки на сървъра" -> "Разширени & Защита" и задайте "Watchdog Crash Защита (max-tick-time)" на -1. Това напълно забранява фалшивите крашове при натоварване.',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 5. Session Lock (World folder locked)
  if (
    lower.includes('session.lock') ||
    lower.includes('already locked') ||
    lower.includes('locked by another') ||
    (lower.includes('world') && lower.includes('locked')) ||
    lower.includes('levelstorageexception')
  ) {
    const idx = Math.max(
      content.indexOf('session.lock'),
      content.indexOf('already locked'),
      content.indexOf('locked')
    );
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'session_lock',
      severity: 'warning',
      title: isEn ? 'Locked World Folder (Session Lock)' : 'Заключена папка на света (Session Lock)',
      description: isEn
        ? 'The world folder is locked by another process or a previous crash did not release the session.lock file.'
        : 'Светът е заключен от друг процес, който в момента пише в него, или предишното изключване не е освободило файла session.lock.',
      recommendation: isEn
        ? 'Make sure the server is stopped, then open the server folder and delete "session.lock" inside the "world" folder.'
        : 'Уверете се, че сървърът не е пуснат в друг прозорец. Ако е спрян, отворете папката на сървъра и изтрийте файла "session.lock" вътре в папка "world".',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 6. World or Chunk Corruption
  if (
    lower.includes('corrupted chunk') ||
    lower.includes('loading entity nbt') ||
    lower.includes('zipexception') ||
    lower.includes('regionfile') ||
    lower.includes('chunk coordinates')
  ) {
    const idx = Math.max(
      content.indexOf('chunk'),
      content.indexOf('RegionFile'),
      content.indexOf('NBT')
    );
    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'world_corrupt',
      severity: 'critical',
      title: isEn ? 'World or Chunk Corruption' : 'Повреден регион или чанк в света (World Corruption)',
      description: isEn
        ? 'The server encountered corrupted bytes when loading a chunk or entity NBT tag.'
        : 'Сървърът е срещнал повредени байтове при зареждане на чанк или същество (NBT tag) в света.',
      recommendation: isEn
        ? 'Restore the world from a recent backup in "Worlds & Backups", or reset the affected dimension.'
        : 'Възстановете света от предишен автоматичен архив от таб "Светове & Архиви". Ако нямате архив, може да се рестартира измерението (напр. Nether или End).',
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 7. Plugin errors
  const pluginMatch =
    content.match(/Could not pass event [^\n]+ to ([a-zA-Z0-9_-]+)/i) ||
    content.match(/Error occurred while enabling ([a-zA-Z0-9_-]+)/i) ||
    content.match(/Plugin `?([a-zA-Z0-9_-]+)`? (?:v[0-9.]+\s+)?generated an exception/i) ||
    content.match(/Could not load ['"]?plugins[\\/]([a-zA-Z0-9_-]+)\.jar/i) ||
    content.match(/plugins[\\/]([a-zA-Z0-9_-]+)\.jar/i);

  if (
    lower.includes('invalidpluginexception') ||
    lower.includes('unknowndependencyexception') ||
    lower.includes('noclassdeffounderror') ||
    pluginMatch
  ) {
    const culprit = pluginMatch ? pluginMatch[1] : undefined;
    const idx = pluginMatch ? pluginMatch.index || 0 : content.indexOf('Plugin');

    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'plugin',
      severity: 'critical',
      title: culprit
        ? (isEn ? `Plugin Error in "${culprit}"` : `Грешка в плъгин "${culprit}"`)
        : (isEn ? 'Plugin Conflict or Missing Dependency' : 'Конфликт или липсващ плъгин'),
      description: culprit
        ? (isEn
            ? `Plugin "${culprit}" caused a critical exception during startup or event execution.`
            : `Плъгинът "${culprit}" предизвика критична грешка при зареждане или инициализация.`)
        : (isEn
            ? 'One of your installed plugins is incompatible with this server version or is missing a dependency library.'
            : 'Някой от инсталираните плъгини не е съвместим с версията на сървъра или му липсва библиотека.'),
      recommendation: culprit
        ? (isEn
            ? `Go to "Plugins" tab and disable or update "${culprit}". Check if it requires a library (like Vault, ProtocolLib).`
            : `Отидете в таб "Плъгини" и деактивирайте или обновете "${culprit}". Проверете дали плъгинът не изисква друга библиотека (напр. Vault, ProtocolLib).`)
        : (isEn
            ? 'Review your installed plugins and disable recently added ones.'
            : 'Проверете инсталираните плъгини и деактивирайте наскоро добавените.'),
      culpritPlugin: culprit,
      relevantLines: extractRelevantLines(content, Math.max(0, idx)),
      rawLog: content,
    };
  }

  // 8. Unknown / Generic Exception
  const isDedicatedCrashReport = fileName && fileName !== 'latest.log';
  const hasFatalIndicator =
    lower.includes('encountered an unexpected exception') ||
    lower.includes('exception in thread "server thread"') ||
    lower.includes('exception in thread "main"') ||
    lower.includes('this crash report has been saved') ||
    lower.includes('/fatal]') ||
    (lower.includes('/error]') && (lower.includes('exception') || lower.includes('fatal error')));

  const firstExceptionMatch = content.match(/([a-zA-Z0-9_.]+(?:Exception|Error):[^\n]+)/);

  if (isDedicatedCrashReport || hasFatalIndicator || (firstExceptionMatch && lower.includes('/error]'))) {
    const exceptionTitle = firstExceptionMatch ? firstExceptionMatch[1].trim() : (isEn ? 'Unexpected Exception' : 'Неочаквана грешка');
    const idx = firstExceptionMatch ? firstExceptionMatch.index || 0 : (content.lastIndexOf('/ERROR]') || 0);

    return {
      hasCrash: true,
      fileName,
      fileDate,
      category: 'unknown',
      severity: 'warning',
      title: `${isEn ? 'Error:' : 'Грешка:'} ${exceptionTitle.slice(0, 65)}...`,
      description: isEn
        ? 'The server terminated with an unhandled exception. Review the stack trace extract below.'
        : 'Сървърът е приключил с неочаквано изключение. Прегледайте извлечения стек лог по-долу.',
      recommendation: isEn
        ? 'Copy the log using the button below to inspect or share. Typically related to plugins or configuration.'
        : 'Копирайте лога от бутона по-долу за преглед или споделяне. Обикновено проблемът е свързан с плъгини или конфигурация.',
      relevantLines: extractRelevantLines(content, Math.max(0, idx), 10),
      rawLog: content,
    };
  }

  // 9. Check if an ungraceful session was registered in uptime-history
  if (lastCrashSession) {
    const code = lastCrashSession.exitCode ?? -1;
    const isOom = code === 137;
    const isInterrupted = code === 130 || code === 143;

    return {
      hasCrash: true,
      fileName: fileName || 'latest.log',
      fileDate: fileDate || lastCrashSession.endedAt || lastCrashSession.startedAt,
      category: isOom ? 'oom' : 'unknown',
      severity: isOom ? 'critical' : 'warning',
      title: isOom
        ? (isEn ? 'Out of Memory Crash (Exit Code 137 / SIGKILL)' : 'Срив поради недостиг на RAM (Код 137 / OOM)')
        : isInterrupted
          ? (isEn ? `Process Terminated Externally (Signal ${code})` : `Процесът е прекъснат външно (Сигнал ${code})`)
          : isEn
            ? `Abrupt Server Stop (Exit Code ${code})`
            : `Неочаквано спиране на сървъра (Код ${code})`,
      description: isOom
        ? (isEn
            ? `Server process was killed by the OS (Exit Code 137) because memory exceeded limits.`
            : `Сървърният процес беше принудително терминиран от ОС с изходен код 137 поради изчерпване на системната или заделената памет.`)
        : isInterrupted
          ? (isEn
              ? 'The server was stopped by an external interrupt signal (SIGINT or SIGTERM).'
              : 'Сървърът е спрян от външен сигнал за прекратяване (SIGINT / SIGTERM) или затваряне на прозорец.')
          : isEn
            ? `Server process exited unexpectedly with code ${code}. The server stopped without a standard clean shutdown.`
            : `Сървърният процес е прекратил работа неочаквано с изходен код ${code} без стандартно плавно изключване.`,
      recommendation: isOom
        ? (isEn
            ? 'Increase allocated RAM in "Server Settings" or close background apps.'
            : 'Увеличете заделената RAM памет в "Настройки на сървъра" или затворете фонови програми.')
        : isEn
          ? 'Review the end of the server log below to check the last actions before termination.'
          : 'Прегледайте края на лога по-долу, за да видите последните действия преди спирането на процеса.',
      relevantLines: content
        ? content.split('\n').filter((l) => l.trim().length > 0).slice(-15)
        : [`Exit Code: ${code}`, `Ended At: ${lastCrashSession.endedAt || 'unknown'}`],
      rawLog: content,
    };
  }

  // 10. Healthy / No crash detected
  return {
    hasCrash: false,
    fileName,
    fileDate,
    category: 'unknown',
    severity: 'info',
    title: isEn ? 'No Crashes Detected' : 'Няма открити сривове',
    description: isEn
      ? 'No fatal errors or crashes were detected in server logs. The server operated normally.'
      : 'В логовете не бяха открити фатални грешки или сривове. Сървърът работи нормално.',
    recommendation: isEn
      ? 'Everything looks healthy! No critical issues recorded.'
      : 'Всичко изглежда наред! Няма регистрирани критични проблеми.',
    relevantLines: [],
    rawLog: content,
  };
}

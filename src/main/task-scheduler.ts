import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getDataDirectory, loadServers, getServerById } from './server-store';
import {
  startServer,
  stopServer,
  waitForServerStop,
  sendServerCommand,
  isServerRunning,
} from './server-runner';
import { createWorldBackup } from './server-config';
import { getWorldBackups, deleteWorldBackup } from './world-manager';
import { notifyAutoBackup } from './notification-service';

export type TaskAction = 'restart' | 'backup' | 'broadcast' | 'command';
export type TaskScheduleType = 'interval' | 'daily' | 'weekly';

export interface TaskSchedule {
  type: TaskScheduleType;
  time?: string; // "04:00" (HH:mm)
  intervalMinutes?: number; // e.g. 30, 60, 360
  days?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export interface ScheduledTask {
  id: string;
  serverId: string; // server ID or 'all'
  name: string;
  action: TaskAction;
  payload?: {
    command?: string;
    message?: string;
    warningCountdown?: boolean;
  };
  schedule: TaskSchedule;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error' | 'skipped';
  lastRunMessage?: string;
  nextRunAt?: string;
}

let schedulerTimer: NodeJS.Timeout | null = null;
let tasksCache: ScheduledTask[] | null = null;

function getTasksFilePath(): string {
  const dir = getDataDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'tasks.json');
}

function sendToWindow(channel: string, ...args: any[]) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}

export function calculateNextRun(task: ScheduledTask, fromDate: Date = new Date()): string {
  const now = fromDate.getTime();
  const sched = task.schedule;

  if (sched.type === 'interval') {
    const mins = Math.max(1, sched.intervalMinutes || 60);
    const last = task.lastRunAt ? new Date(task.lastRunAt).getTime() : now;
    let next = last + mins * 60 * 1000;
    if (next <= now) {
      next = now + mins * 60 * 1000;
    }
    return new Date(next).toISOString();
  }

  if (sched.type === 'daily') {
    const [hh, mm] = (sched.time || '04:00').split(':').map((v) => parseInt(v, 10));
    const target = new Date(fromDate);
    target.setHours(isNaN(hh) ? 4 : hh, isNaN(mm) ? 0 : mm, 0, 0);

    if (target.getTime() <= now) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  if (sched.type === 'weekly') {
    const [hh, mm] = (sched.time || '04:00').split(':').map((v) => parseInt(v, 10));
    const targetDays = (sched.days && sched.days.length > 0) ? [...sched.days].sort() : [0]; // default Sun

    let candidate = new Date(fromDate);
    candidate.setHours(isNaN(hh) ? 4 : hh, isNaN(mm) ? 0 : mm, 0, 0);

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const testDate = new Date(candidate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      if (targetDays.includes(testDate.getDay())) {
        if (testDate.getTime() > now) {
          return testDate.toISOString();
        }
      }
    }

    candidate.setDate(candidate.getDate() + 7);
    return candidate.toISOString();
  }

  return new Date(now + 3600 * 1000).toISOString();
}

export function loadTasks(): ScheduledTask[] {
  if (tasksCache) return tasksCache;
  const filePath = getTasksFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const list: ScheduledTask[] = JSON.parse(data);
      if (Array.isArray(list)) {
        tasksCache = list.map((t) => {
          if (!t.nextRunAt && t.enabled) {
            t.nextRunAt = calculateNextRun(t);
          }
          return t;
        });
        return tasksCache;
      }
    }
  } catch (err) {
    console.error('Failed to load tasks.json:', err);
  }

  tasksCache = [];
  return tasksCache;
}

export function saveTasks(tasks: ScheduledTask[]): void {
  tasksCache = tasks;
  try {
    fs.writeFileSync(getTasksFilePath(), JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save tasks.json:', err);
  }
}

export function getScheduledTasks(): ScheduledTask[] {
  return loadTasks();
}

export function saveScheduledTask(task: ScheduledTask): ScheduledTask {
  const list = loadTasks();
  const existingIdx = list.findIndex((t) => t.id === task.id);

  if (!task.nextRunAt && task.enabled) {
    task.nextRunAt = calculateNextRun(task);
  }

  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...task };
  } else {
    list.push(task);
  }

  saveTasks(list);
  sendToWindow('scheduled-tasks-updated', list);
  return task;
}

export function deleteScheduledTask(taskId: string): boolean {
  const list = loadTasks();
  const nextList = list.filter((t) => t.id !== taskId);
  if (nextList.length !== list.length) {
    saveTasks(nextList);
    sendToWindow('scheduled-tasks-updated', nextList);
    return true;
  }
  return false;
}

export function toggleTaskEnabled(taskId: string, enabled: boolean): boolean {
  const list = loadTasks();
  const task = list.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    if (enabled) {
      task.nextRunAt = calculateNextRun(task);
    }
    saveTasks(list);
    sendToWindow('scheduled-tasks-updated', list);
    return true;
  }
  return false;
}

/**
 * Execute a single scheduled task immediately
 */
export async function executeTask(task: ScheduledTask): Promise<{ success: boolean; message: string }> {
  const nowStr = new Date().toISOString();
  console.log(`[Task Scheduler] Executing task "${task.name}" (${task.action})...`);

  const servers = loadServers();
  const targetServers = task.serverId === 'all'
    ? servers
    : servers.filter((s) => s.id === task.serverId);

  if (targetServers.length === 0) {
    task.lastRunAt = nowStr;
    task.lastRunStatus = 'skipped';
    task.lastRunMessage = 'No target server found';
    task.nextRunAt = calculateNextRun(task);
    saveTasks(loadTasks());
    return { success: false, message: 'No target server found' };
  }

  let allSuccess = true;
  const messages: string[] = [];

  for (const server of targetServers) {
    const running = isServerRunning(server.id);

    try {
      switch (task.action) {
        case 'restart': {
          if (!running) {
            messages.push(`Server ${server.name} not running (skipped restart)`);
            break;
          }

          if (task.payload?.warningCountdown !== false) {
            sendServerCommand(server.id, 'say [CraftDock] Server restarting in 10s... Saving world!');
            sendServerCommand(server.id, 'save-all');
            await new Promise((r) => setTimeout(r, 10000));
          } else {
            sendServerCommand(server.id, 'save-all');
          }

          await stopServer(server.id);
          const stopped = await waitForServerStop(server.id, 15000);
          if (stopped) {
            await startServer(server);
            messages.push(`Server ${server.name} restarted successfully`);
          } else {
            allSuccess = false;
            messages.push(`Server ${server.name} stop timed out`);
          }
          break;
        }

        case 'backup': {
          if (running) {
            sendServerCommand(server.id, 'save-all');
            await new Promise((r) => setTimeout(r, 1500));
          }
          const backupFileName = createWorldBackup(server.path);
          if (backupFileName) {
            // Retention check
            const retentionCount = server.autoBackupRetentionCount || 5;
            const existing = getWorldBackups(server.path);
            if (existing.length > retentionCount) {
              existing.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const toDelete = existing.length - retentionCount;
              for (let i = 0; i < toDelete; i++) {
                deleteWorldBackup(server.path, existing[i].fileName);
              }
            }
            notifyAutoBackup(server.name, backupFileName);
            messages.push(`Backup created: ${backupFileName}`);
          } else {
            allSuccess = false;
            messages.push(`Failed to create backup for ${server.name}`);
          }
          break;
        }

        case 'broadcast': {
          if (!running) {
            messages.push(`Server ${server.name} not running (skipped broadcast)`);
            break;
          }
          const msg = task.payload?.message || 'Scheduled broadcast';
          sendServerCommand(server.id, `say [CraftDock] ${msg}`);
          messages.push(`Broadcast sent: ${msg}`);
          break;
        }

        case 'command': {
          if (!running) {
            messages.push(`Server ${server.name} not running (skipped command)`);
            break;
          }
          const cmd = task.payload?.command;
          if (cmd) {
            sendServerCommand(server.id, cmd);
            messages.push(`Command executed: ${cmd}`);
          }
          break;
        }
      }
    } catch (err: any) {
      allSuccess = false;
      messages.push(`Error on ${server.name}: ${err.message}`);
    }
  }

  task.lastRunAt = nowStr;
  task.lastRunStatus = allSuccess ? 'success' : 'error';
  task.lastRunMessage = messages.join(' | ') || 'Completed';
  task.nextRunAt = calculateNextRun(task);

  saveTasks(loadTasks());
  sendToWindow('scheduled-tasks-updated', loadTasks());

  return { success: allSuccess, message: task.lastRunMessage };
}

export async function runTaskNow(taskId: string): Promise<{ success: boolean; message: string }> {
  const list = loadTasks();
  const task = list.find((t) => t.id === taskId);
  if (!task) {
    return { success: false, message: 'Task not found' };
  }
  return executeTask(task);
}

/**
 * 30-second evaluation tick loop
 */
async function tickScheduler() {
  try {
    const list = loadTasks();
    const now = Date.now();

    for (const task of list) {
      if (!task.enabled) continue;

      const nextRunTime = task.nextRunAt ? new Date(task.nextRunAt).getTime() : 0;
      if (nextRunTime > 0 && nextRunTime <= now) {
        await executeTask(task);
      }
    }
  } catch (err) {
    console.error('Error in task scheduler tick:', err);
  }
}

export function initTaskScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  loadTasks();
  schedulerTimer = setInterval(tickScheduler, 30 * 1000);
  console.log('[Task Scheduler] Initialized (evaluating tasks every 30s)');
}

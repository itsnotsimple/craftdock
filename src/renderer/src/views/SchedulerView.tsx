import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Trash2,
  Edit2,
  RotateCcw,
  Archive,
  MessageSquare,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Layers,
  HelpCircle,
  X,
  Server as ServerIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { ServerProfile, ScheduledTask, TaskAction, TaskScheduleType } from '../types';

interface SchedulerViewProps {
  servers: ServerProfile[];
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({ servers }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm, showAlert } = useDialog();

  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // Form State
  const [formServerId, setFormServerId] = useState<string>('all');
  const [formName, setFormName] = useState<string>('');
  const [formAction, setFormAction] = useState<TaskAction>('restart');
  const [formWarningCountdown, setFormWarningCountdown] = useState<boolean>(true);
  const [formMessage, setFormMessage] = useState<string>('');
  const [formCommand, setFormCommand] = useState<string>('');
  const [formScheduleType, setFormScheduleType] = useState<TaskScheduleType>('daily');
  const [formTime, setFormTime] = useState<string>('04:00');
  const [formIntervalMinutes, setFormIntervalMinutes] = useState<number>(360);
  const [formDays, setFormDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const loadTasks = async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const list = await api.getScheduledTasks();
      if (Array.isArray(list)) {
        setTasks(list);
      }
    } catch (err) {
      console.error('Failed to load scheduled tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const api = (window as any).api;
    if (api?.onScheduledTasksUpdated) {
      const unsub = api.onScheduledTasksUpdated((updatedList: ScheduledTask[]) => {
        if (Array.isArray(updatedList)) {
          setTasks(updatedList);
        }
      });
      return () => unsub();
    }
  }, []);

  const handleToggleTask = async (taskId: string, enabled: boolean) => {
    const api = (window as any).api;
    if (!api) return;
    try {
      await api.toggleTaskEnabled(taskId, enabled);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, enabled } : t))
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleRunNow = async (task: ScheduledTask) => {
    const api = (window as any).api;
    if (!api) return;
    setExecutingTaskId(task.id);
    try {
      const res = await api.runTaskNow(task.id);
      if (res?.success) {
        await showAlert({
          title: t('scheduler.runSuccessTitle'),
          message: res.message || t('scheduler.runSuccessMsg'),
          type: 'success',
        });
      } else {
        await showAlert({
          title: t('scheduler.runErrorTitle'),
          message: res.message || t('scheduler.runErrorMsg'),
          type: 'error',
        });
      }
      loadTasks();
    } catch (err: any) {
      await showAlert({
        title: t('scheduler.runErrorTitle'),
        message: err.message,
        type: 'error',
      });
    } finally {
      setExecutingTaskId(null);
    }
  };

  const handleDeleteTask = async (task: ScheduledTask) => {
    const confirmed = await showConfirm({
      title: t('scheduler.deleteConfirmTitle'),
      message: t('scheduler.deleteConfirmMsg', { name: task.name }),
      danger: true,
      icon: 'trash',
    });
    if (!confirmed) return;

    const api = (window as any).api;
    if (!api) return;
    try {
      await api.deleteScheduledTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormServerId(servers.length > 0 ? servers[0].id : 'all');
    setFormName('');
    setFormAction('restart');
    setFormWarningCountdown(true);
    setFormMessage('');
    setFormCommand('');
    setFormScheduleType('daily');
    setFormTime('04:00');
    setFormIntervalMinutes(360);
    setFormDays([0, 1, 2, 3, 4, 5, 6]);
    setIsModalOpen(true);
  };

  const openEditModal = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormServerId(task.serverId);
    setFormName(task.name);
    setFormAction(task.action);
    setFormWarningCountdown(task.payload?.warningCountdown ?? true);
    setFormMessage(task.payload?.message ?? '');
    setFormCommand(task.payload?.command ?? '');
    setFormScheduleType(task.schedule.type);
    setFormTime(task.schedule.time ?? '04:00');
    setFormIntervalMinutes(task.schedule.intervalMinutes ?? 360);
    setFormDays(task.schedule.days ?? [0, 1, 2, 3, 4, 5, 6]);
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      await showAlert({
        title: t('scheduler.validationError'),
        message: t('scheduler.nameRequired'),
        type: 'warning',
      });
      return;
    }

    const api = (window as any).api;
    if (!api) return;

    const newTask: ScheduledTask = {
      id: editingTask ? editingTask.id : `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      serverId: formServerId,
      name: formName.trim(),
      action: formAction,
      payload: {
        warningCountdown: formAction === 'restart' ? formWarningCountdown : undefined,
        message: formAction === 'broadcast' ? formMessage.trim() : undefined,
        command: formAction === 'command' ? formCommand.trim() : undefined,
      },
      schedule: {
        type: formScheduleType,
        time: formScheduleType !== 'interval' ? formTime : undefined,
        intervalMinutes: formScheduleType === 'interval' ? Number(formIntervalMinutes) : undefined,
        days: formScheduleType === 'weekly' ? formDays : undefined,
      },
      enabled: editingTask ? editingTask.enabled : true,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
    };

    try {
      await api.saveScheduledTask(newTask);
      setIsModalOpen(false);
      loadTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  // Add 1-click Preset Template
  const handleAddPreset = async (presetType: 'dailyRestart' | 'backup6h' | 'broadcast30m' | 'clearItems2h') => {
    const api = (window as any).api;
    if (!api) return;

    const targetServerId = servers.length > 0 ? servers[0].id : 'all';
    let presetTask: ScheduledTask;

    if (presetType === 'dailyRestart') {
      presetTask = {
        id: `task_restart_${Date.now()}`,
        serverId: targetServerId,
        name: language === 'en' ? 'Daily Server Restart (04:00)' : 'Ежедневен рестарт (04:00)',
        action: 'restart',
        payload: { warningCountdown: true },
        schedule: { type: 'daily', time: '04:00' },
        enabled: true,
        createdAt: new Date().toISOString(),
      };
    } else if (presetType === 'backup6h') {
      presetTask = {
        id: `task_backup_${Date.now()}`,
        serverId: targetServerId,
        name: language === 'en' ? 'World Backup Every 6h' : 'Бекъп на света на всеки 6ч',
        action: 'backup',
        payload: {},
        schedule: { type: 'interval', intervalMinutes: 360 },
        enabled: true,
        createdAt: new Date().toISOString(),
      };
    } else if (presetType === 'broadcast30m') {
      presetTask = {
        id: `task_broadcast_${Date.now()}`,
        serverId: targetServerId,
        name: language === 'en' ? 'Rule Reminder Every 30m' : 'Напомняне на правила на всеки 30м',
        action: 'broadcast',
        payload: {
          message: language === 'en' ? 'Welcome to CraftDock! Remember to respect other players.' : 'Добре дошли в CraftDock! Моля, спазвайте правилата на сървъра.',
        },
        schedule: { type: 'interval', intervalMinutes: 30 },
        enabled: true,
        createdAt: new Date().toISOString(),
      };
    } else {
      presetTask = {
        id: `task_clear_${Date.now()}`,
        serverId: targetServerId,
        name: language === 'en' ? 'Clear Ground Lag Items (Every 2h)' : 'Изчистване на паднали предмети (на всеки 2ч)',
        action: 'command',
        payload: { command: 'kill @e[type=item]' },
        schedule: { type: 'interval', intervalMinutes: 120 },
        enabled: true,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      await api.saveScheduledTask(presetTask);
      loadTasks();
      await showAlert({
        title: t('scheduler.presetAddedTitle'),
        message: t('scheduler.presetAddedMsg', { name: presetTask.name }),
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to add preset:', err);
    }
  };

  const getActionIcon = (action: TaskAction) => {
    switch (action) {
      case 'restart':
        return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'backup':
        return <Archive className="w-4 h-4 text-sky-400" />;
      case 'broadcast':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'command':
        return <Terminal className="w-4 h-4 text-purple-400" />;
    }
  };

  const formatSchedule = (task: ScheduledTask) => {
    const s = task.schedule;
    if (s.type === 'daily') {
      return `${t('scheduler.typeDaily')} (${s.time || '04:00'})`;
    }
    if (s.type === 'interval') {
      const mins = s.intervalMinutes || 60;
      if (mins >= 60 && mins % 60 === 0) {
        return `${t('scheduler.typeInterval')} ${mins / 60} ${language === 'en' ? 'hours' : 'часа'}`;
      }
      return `${t('scheduler.typeInterval')} ${mins} ${language === 'en' ? 'min' : 'мин'}`;
    }
    if (s.type === 'weekly') {
      return `${t('scheduler.typeWeekly')} (${s.time || '04:00'})`;
    }
    return '';
  };

  const formatNextRun = (isoStr?: string) => {
    if (!isoStr) return t('scheduler.notScheduled');
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs < 0) return t('scheduler.dueNow');

    const diffMins = Math.round(diffMs / (60 * 1000));
    if (diffMins < 60) {
      return `${t('scheduler.in')} ${diffMins} ${language === 'en' ? 'min' : 'мин'}`;
    }
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) {
      return `${t('scheduler.in')} ${diffHours} ${language === 'en' ? 'hours' : 'часа'}`;
    }
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 shadow-sm">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>{t('scheduler.title')}</span>
            </h1>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('scheduler.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-bounce flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('scheduler.addNewTask')}</span>
        </button>
      </div>

      {/* Quick 1-Click Preset Bar */}
      <div
        className={`p-4 rounded-2xl border space-y-3 ${
          theme === 'light'
            ? 'bg-slate-50/80 border-slate-200'
            : 'bg-white/[0.02] border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {t('scheduler.quickPresets')}
          </span>
          <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('scheduler.presetsHint')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleAddPreset('dailyRestart')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              theme === 'light'
                ? 'bg-white hover:bg-amber-50/50 border-slate-200 hover:border-amber-300'
                : 'bg-white/[0.03] hover:bg-amber-500/10 border-white/[0.06] hover:border-amber-500/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{t('scheduler.presetRestartTitle')}</div>
              <div className="text-[11px] opacity-70 truncate">{t('scheduler.presetRestartDesc')}</div>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('backup6h')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              theme === 'light'
                ? 'bg-white hover:bg-sky-50/50 border-slate-200 hover:border-sky-300'
                : 'bg-white/[0.03] hover:bg-sky-500/10 border-white/[0.06] hover:border-sky-500/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0 group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{t('scheduler.presetBackupTitle')}</div>
              <div className="text-[11px] opacity-70 truncate">{t('scheduler.presetBackupDesc')}</div>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('broadcast30m')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              theme === 'light'
                ? 'bg-white hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-300'
                : 'bg-white/[0.03] hover:bg-emerald-500/10 border-white/[0.06] hover:border-emerald-500/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{t('scheduler.presetBroadcastTitle')}</div>
              <div className="text-[11px] opacity-70 truncate">{t('scheduler.presetBroadcastDesc')}</div>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('clearItems2h')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
              theme === 'light'
                ? 'bg-white hover:bg-purple-50/50 border-slate-200 hover:border-purple-300'
                : 'bg-white/[0.03] hover:bg-purple-500/10 border-white/[0.06] hover:border-purple-500/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{t('scheduler.presetClearTitle')}</div>
              <div className="text-[11px] opacity-70 truncate">{t('scheduler.presetClearDesc')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <span>{t('scheduler.activeTasksList')}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/[0.05] border-white/[0.08]'
            }`}>
              {tasks.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs opacity-60">
            {t('common.loading')}...
          </div>
        ) : tasks.length === 0 ? (
          <div
            className={`p-12 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-600'
                : 'bg-white/[0.02] border-white/[0.08] text-slate-400'
            }`}
          >
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400">
              <CalendarClock className="w-8 h-8 opacity-70" />
            </div>
            <div className="text-base font-bold text-slate-200">
              {t('scheduler.noTasksTitle')}
            </div>
            <p className="text-xs max-w-sm">
              {t('scheduler.noTasksDesc')}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 btn-bounce px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              {t('scheduler.createFirstTask')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => {
              const targetServer = servers.find((s) => s.id === task.serverId);
              const serverName = task.serverId === 'all'
                ? t('scheduler.allServers')
                : (targetServer?.name || task.serverId);

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !task.enabled
                      ? 'opacity-60 grayscale-[40%]'
                      : ''
                  } ${
                    theme === 'light'
                      ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0 mt-0.5">
                      {getActionIcon(task.action)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm tracking-tight truncate">
                          {task.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${
                          theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                        }`}>
                          {serverName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs opacity-75 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 opacity-60" />
                          {formatSchedule(task)}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">
                          {t('scheduler.next')}: <strong className="text-indigo-400 font-bold">{formatNextRun(task.nextRunAt)}</strong>
                        </span>
                      </div>

                      {task.lastRunAt && (
                        <div className="text-[11px] opacity-60 flex items-center gap-1.5 pt-0.5">
                          {task.lastRunStatus === 'success' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : task.lastRunStatus === 'error' ? (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          ) : (
                            <Clock className="w-3 h-3 text-slate-400" />
                          )}
                          <span>
                            {t('scheduler.lastRun')}: {new Date(task.lastRunAt).toLocaleTimeString()} ({task.lastRunMessage || task.lastRunStatus})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleTask(task.id, !task.enabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        task.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                      }`}
                      title={task.enabled ? t('scheduler.disable') : t('scheduler.enable')}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          task.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Run Now Button */}
                    <button
                      onClick={() => handleRunNow(task)}
                      disabled={executingTaskId === task.id}
                      className="btn-bounce p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                      title={t('scheduler.runNow')}
                    >
                      <Play className={`w-3.5 h-3.5 ${executingTaskId === task.id ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(task)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                          : 'border-white/[0.08] hover:bg-white/[0.06] text-slate-300'
                      }`}
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
                : 'bg-[#0b101e] border-white/10 text-slate-100 shadow-black/80'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${
                theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-400" />
                <span>{editingTask ? t('scheduler.editTaskModalTitle') : t('scheduler.createTaskModalTitle')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  theme === 'light' ? 'border-slate-200 hover:bg-slate-100 text-slate-500' : 'border-white/10 hover:bg-white/10 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Task Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  {t('scheduler.taskNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'en' ? 'e.g. Nightly Restart' : 'напр. Нощен рестарт'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
                      : 'bg-white/[0.04] border-white/[0.08] focus:border-indigo-400 text-slate-100'
                  }`}
                />
              </div>

              {/* Target Server */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  {t('scheduler.targetServerLabel')}
                </label>
                <select
                  value={formServerId}
                  onChange={(e) => setFormServerId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-[#0f172a] border-white/[0.08] text-slate-100'
                  }`}
                >
                  <option value="all">{t('scheduler.allServers')}</option>
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  {t('scheduler.actionTypeLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['restart', 'backup', 'broadcast', 'command'] as TaskAction[]).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setFormAction(act)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        formAction === act
                          ? 'bg-indigo-500/15 border-indigo-400 text-indigo-300'
                          : theme === 'light'
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      {getActionIcon(act)}
                      <span className="capitalize">{t(`scheduler.action_${act}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Specific Fields */}
              {formAction === 'restart' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300">
                  <input
                    type="checkbox"
                    id="chkWarning"
                    checked={formWarningCountdown}
                    onChange={(e) => setFormWarningCountdown(e.target.checked)}
                    className="rounded text-amber-500 cursor-pointer"
                  />
                  <label htmlFor="chkWarning" className="text-xs cursor-pointer select-none">
                    {t('scheduler.warnBeforeRestart')}
                  </label>
                </div>
              )}

              {formAction === 'broadcast' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    {t('scheduler.broadcastMessageLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'en' ? 'e.g. Save your items! Server restarting soon.' : 'напр. Запазете си предметите!'}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-100'
                    }`}
                  />
                </div>
              )}

              {formAction === 'command' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    {t('scheduler.consoleCommandLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kill @e[type=item] or weather clear"
                    value={formCommand}
                    onChange={(e) => setFormCommand(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-100'
                    }`}
                  />
                </div>
              )}

              {/* Schedule Type */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <label className="text-xs font-semibold text-slate-400">
                  {t('scheduler.scheduleTypeLabel')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'interval', 'weekly'] as TaskScheduleType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormScheduleType(st)}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer text-center transition-all ${
                        formScheduleType === st
                          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                          : theme === 'light'
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {t(`scheduler.schedule_${st}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Time Picker */}
              {(formScheduleType === 'daily' || formScheduleType === 'weekly') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    {t('scheduler.executionTime')} (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-100'
                    }`}
                  />
                </div>
              )}

              {/* Interval Minutes */}
              {formScheduleType === 'interval' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    {t('scheduler.intervalMinutesLabel')}
                  </label>
                  <select
                    value={formIntervalMinutes}
                    onChange={(e) => setFormIntervalMinutes(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-[#0f172a] border-white/[0.08] text-slate-100'
                    }`}
                  >
                    <option value={15}>15 {language === 'en' ? 'minutes' : 'минути'}</option>
                    <option value={30}>30 {language === 'en' ? 'minutes' : 'минути'}</option>
                    <option value={60}>1 {language === 'en' ? 'hour' : 'час'}</option>
                    <option value={120}>2 {language === 'en' ? 'hours' : 'часа'}</option>
                    <option value={240}>4 {language === 'en' ? 'hours' : 'часа'}</option>
                    <option value={360}>6 {language === 'en' ? 'hours' : 'часа'}</option>
                    <option value={720}>12 {language === 'en' ? 'hours' : 'часа'}</option>
                    <option value={1440}>24 {language === 'en' ? 'hours' : 'часа'}</option>
                  </select>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    theme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-white/10 text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-bounce px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

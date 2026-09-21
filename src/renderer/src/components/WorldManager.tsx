import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Flame,
  Layers,
  Sparkles,
  RefreshCw,
  Archive,
  Trash2,
  Upload,
  HardDrive,
  Users,
  Clock,
  FolderOpen,
  Download,
  CheckCircle2,
  RotateCcw,
  Shield,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { ServerProfile, WorldInfo, WorldBackupInfo } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { SeedMapRadar } from './SeedMapRadar';

interface WorldManagerProps {
  server: ServerProfile;
  onSendCommand?: (command: string) => void;
}

export const WorldManager: React.FC<WorldManagerProps> = ({ server, onSendCommand }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm, showAlert } = useDialog();

  const [currentView, setCurrentView] = useState<'manager' | 'radar'>('manager');
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [backups, setBackups] = useState<WorldBackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(server.autoBackupEnabled ?? false);
  const [autoBackupIntervalHours, setAutoBackupIntervalHours] = useState(server.autoBackupIntervalHours || 6);
  const [autoBackupRetentionCount, setAutoBackupRetentionCount] = useState(server.autoBackupRetentionCount || 5);
  const [autoBackupNotice, setAutoBackupNotice] = useState<string | null>(null);

  // World Slimmer State
  const [showSlimmerModal, setShowSlimmerModal] = useState<boolean>(false);
  const [slimmerAnalysis, setSlimmerAnalysis] = useState<any | null>(null);
  const [slimmerRadius, setSlimmerRadius] = useState<number>(2500);
  const [isAnalyzingSlimmer, setIsAnalyzingSlimmer] = useState<boolean>(false);
  const [isTrimming, setIsTrimming] = useState<boolean>(false);

  const analyzeSlimmer = async (radius: number) => {
    setIsAnalyzingSlimmer(true);
    try {
      const api = (window as any).api;
      if (api?.analyzeWorldSlimmer) {
        const res = await api.analyzeWorldSlimmer(server.id, radius);
        setSlimmerAnalysis(res);
      }
    } catch (e) {
      console.error('Failed to analyze world slimmer:', e);
    } finally {
      setIsAnalyzingSlimmer(false);
    }
  };

  const handleOpenSlimmer = async () => {
    setShowSlimmerModal(true);
    await analyzeSlimmer(slimmerRadius);
  };

  const handleExecuteSlimmer = async () => {
    if (server.status === 'running') {
      await showAlert({
        type: 'warning',
        title: language === 'bg' ? 'Спрете сървъра' : 'Stop Server First',
        message:
          language === 'bg'
            ? 'Моля, спрете сървъра преди да свивате света, за да не се повредят отворените от Minecraft файлове.'
            : 'Please stop the server before pruning chunks to avoid file corruption.',
        buttonText: t('common.understand'),
      });
      return;
    }

    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Свиване на света (World Slimmer)' : 'Prune Distant Chunks (World Slimmer)',
      message:
        language === 'bg'
          ? `CraftDock автоматично ще създаде пълен предпазен бекъп, след което ще изтрие далечните чанкове извън радиус от ${slimmerRadius} блока. Желаете ли да стартирате?`
          : `CraftDock will create a full safety backup first, then prune distant chunks outside a ${slimmerRadius} block radius. Do you want to proceed?`,
      confirmText: language === 'bg' ? 'Свий света' : 'Prune Chunks',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'warning',
    });

    if (!confirmed) return;

    setIsTrimming(true);
    try {
      const api = (window as any).api;
      const res = await api.trimDistantRegions(server.id, slimmerRadius);
      if (res?.success) {
        await showAlert({
          type: 'info',
          title: language === 'bg' ? 'Светът беше свит успешно!' : 'World Pruned Successfully!',
          message:
            language === 'bg'
              ? `Успешно бяха премахнати ${res.removedCount} регионални файла.\nОсвободено дисково пространство: ${res.freedMb} MB.\nПредпазният бекъп беше запазен като:\n${res.backupName}`
              : `Successfully pruned ${res.removedCount} region files.\nDisk space freed: ${res.freedMb} MB.\nSafety backup was saved as:\n${res.backupName}`,
          buttonText: t('common.understand'),
        });
        setShowSlimmerModal(false);
        loadData();
      } else {
        throw new Error(res?.error || 'Trimming failed');
      }
    } catch (err: any) {
      await showAlert({
        type: 'error',
        title: t('common.error'),
        message: err.message,
        buttonText: t('common.understand'),
      });
    } finally {
      setIsTrimming(false);
    }
  };

  const loadData = useCallback(async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const [wList, bList] = await Promise.all([
        api.getServerWorlds ? api.getServerWorlds(server.id) : Promise.resolve([]),
        api.getWorldBackups ? api.getWorldBackups(server.id) : Promise.resolve([]),
      ]);
      setWorlds(Array.isArray(wList) ? wList : []);
      setBackups(Array.isArray(bList) ? bList : []);
    } catch (err) {
      console.error('Failed to load world data:', err);
    } finally {
      setLoading(false);
    }
  }, [server.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  
  useEffect(() => {
    const api = (window as any).api;
    if (api?.onAutoBackupCompleted) {
      const unsub = api.onAutoBackupCompleted((data: any) => {
        if (data.serverId === server.id) {
          loadData();
          setAutoBackupNotice(data.fileName);
          setTimeout(() => setAutoBackupNotice(null), 5000);
        }
      });
      return unsub;
    }
  }, [server.id, loadData]);

  const handleUpdateAutoBackup = async (enabled: boolean, interval: number, retention: number) => {
    setAutoBackupEnabled(enabled);
    setAutoBackupIntervalHours(interval);
    setAutoBackupRetentionCount(retention);

    const api = (window as any).api;
    if (api?.updateServerProfile) {
      await api.updateServerProfile(server.id, {
        autoBackupEnabled: enabled,
        autoBackupIntervalHours: interval,
        autoBackupRetentionCount: retention,
      });
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (server.status === 'running') {
      await showAlert({
        type: 'warning',
        title: language === 'bg' ? 'Спрете сървъра' : 'Stop Server First',
        message: language === 'bg'
          ? 'Моля, спрете сървъра преди да възстановите архив, за да не се повредят файловете на света.'
          : 'Please stop the server before restoring a backup to prevent file corruption.',
        buttonText: t('common.understand'),
      });
      return;
    }

    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Възстановяване на света?' : 'Restore World Backup?',
      message: language === 'bg'
        ? `Сигурни ли сте, че искате да замените текущия свят с архива "${fileName}"? Всички текущи файлове на света ще бъдат подменени.`
        : `Are you sure you want to replace current world files with "${fileName}"?`,
      confirmText: language === 'bg' ? 'Възстанови света' : 'Restore Backup',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'warning',
    });

    if (!confirmed) return;

    setActionLoading(true);
    const api = (window as any).api;
    try {
      const ok = await api.restoreWorldBackup(server.id, fileName);
      if (ok) {
        await showAlert({
          type: 'info',
          title: language === 'bg' ? 'Успешно възстановяване' : 'Restore Complete',
          message: language === 'bg'
            ? 'Светът беше възстановен успешно от архива! Вече можете да пуснете сървъра.'
            : 'World was successfully restored from backup! You can now launch the server.',
          buttonText: t('common.understand'),
        });
        loadData();
      } else {
        throw new Error('Restore failed');
      }
    } catch (err: any) {
      await showAlert({
        type: 'error',
        title: language === 'bg' ? 'Грешка при възстановяване' : 'Restore Error',
        message: err.message || 'Failed to restore backup',
        buttonText: t('common.understand'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetWorld = async (world: WorldInfo) => {
    if (world.dimension === 'overworld' || world.name === 'world') {
      await showAlert({
        type: 'warning',
        title: language === 'bg' ? 'Защита на основния свят' : 'Overworld Protection',
        message: language === 'bg'
          ? 'Основният свят (Overworld) не може да бъде ресетиран оттук, за да се защитят постройките ви. Ако желаете нов свят, създайте нов сървър или сменете seed в настройките.'
          : 'The primary Overworld cannot be reset from here to prevent accidental data loss. To start fresh, create a new server or change the level-seed in settings.',
        buttonText: t('common.understand'),
      });
      return;
    }

    const isRunning = server.status === 'running';
    if (isRunning) {
      await showAlert({
        type: 'warning',
        title: language === 'bg' ? 'Спрете сървъра' : 'Stop Server First',
        message: language === 'bg'
          ? 'Моля, спрете сървъра преди да ресетирате измерение, за да предотвратите срив на файловете.'
          : 'Please stop the server before resetting a dimension to prevent file corruption.',
        buttonText: t('common.understand'),
      });
      return;
    }

    const confirmed = await showConfirm({
      title: language === 'bg' ? `Ресетирате ${world.name}?` : `Reset ${world.name}?`,
      message: language === 'bg'
        ? `Сигурни ли сте, че искате напълно да изтриете "${world.name}"? Всички постройки и блокове в това измерение ще бъдат изтрити. Играта ще го генерира наново при следващото стартиране!`
        : `Are you sure you want to completely erase "${world.name}"? All blocks and builds in this dimension will be lost. Minecraft will regenerate it upon next launch!`,
      confirmText: language === 'bg' ? 'Рестартирай измерението' : 'Reset Dimension',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (!confirmed) return;

    setActionLoading(true);
    const api = (window as any).api;
    try {
      const ok = await api.resetWorld(server.id, world.name);
      if (ok) {
        await showAlert({
          type: 'info',
          title: language === 'bg' ? 'Успешно ресетиране' : 'Reset Complete',
          message: language === 'bg'
            ? `Измерението "${world.name}" беше изтрито успешно. При следващото стартиране ще бъде генерирано чисто ново!`
            : `Dimension "${world.name}" was successfully erased. A fresh one will be generated when the server starts!`,
          buttonText: t('common.understand'),
        });
        loadData();
      } else {
        throw new Error('Reset failed');
      }
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('common.error'),
        message: e?.message || 'Failed to reset world',
        buttonText: t('common.understand'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportZip = async () => {
    const isRunning = server.status === 'running';
    if (isRunning) {
      await showAlert({
        type: 'warning',
        title: language === 'bg' ? 'Спрете сървъра' : 'Stop Server First',
        message: language === 'bg'
          ? 'Моля, спрете сървъра преди да импортирате свят.'
          : 'Please stop the server before importing a world archive.',
        buttonText: t('common.understand'),
      });
      return;
    }

    const api = (window as any).api;
    if (!api?.pickWorldZip) return;

    try {
      const zipPath = await api.pickWorldZip();
      if (!zipPath) return;

      setActionLoading(true);
      const ok = await api.importWorld(server.id, zipPath, 'world');
      if (ok) {
        await showAlert({
          type: 'info',
          title: language === 'bg' ? 'Светът е импортиран!' : 'World Imported!',
          message: language === 'bg'
            ? 'Архивът на света беше успешно разархивиран в сървъра. Предишният свят беше запазен като автоматичен бекъп.'
            : 'The world ZIP was successfully installed into the server. The previous world was backed up automatically.',
          buttonText: t('common.understand'),
        });
        loadData();
      }
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('common.error'),
        message: e?.message || 'Failed to import world ZIP',
        buttonText: t('common.understand'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportZip = async () => {
    const api = (window as any).api;
    if (!api?.exportWorldZip) return;

    setActionLoading(true);
    try {
      const res = await api.exportWorldZip(server.id, 'world');
      if (res?.success) {
        await showAlert({
          type: 'info',
          title: language === 'bg' ? 'Светът е експортиран!' : 'World Exported!',
          message: language === 'bg'
            ? `Светът беше архивиран и записан успешно (${res.sizeMb} MB).`
            : `World archive was created successfully (${res.sizeMb} MB).`,
          buttonText: t('common.understand'),
        });
      } else if (!res?.canceled && res?.error) {
        throw new Error(res.error);
      }
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('common.error'),
        message: e?.message || 'Failed to export world ZIP',
        buttonText: t('common.understand'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    const api = (window as any).api;
    if (!api) return;

    setActionLoading(true);
    try {
      const backupName = await api.createWorldBackup(server.id);
      if (backupName) {
        loadData();
      }
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('common.error'),
        message: e?.message || 'Failed to create backup',
        buttonText: t('common.understand'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Изтриване на бекъп' : 'Delete Backup',
      message: language === 'bg'
        ? `Сигурни ли сте, че искате да изтриете бекъп архива "${fileName}"?`
        : `Are you sure you want to permanently delete backup "${fileName}"?`,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (!confirmed) return;

    const api = (window as any).api;
    if (api?.deleteWorldBackup) {
      await api.deleteWorldBackup(server.id, fileName);
      loadData();
    }
  };

  const getDimensionCardStyle = (dim: WorldInfo['dimension']) => {
    switch (dim) {
      case 'overworld':
        return {
          border: theme === 'light' ? 'border-emerald-200' : 'border-emerald-500/20',
          bg: theme === 'light' ? 'bg-emerald-50/50' : 'bg-emerald-950/15',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <Globe className="w-5 h-5 text-emerald-400 shrink-0" />,
          label: language === 'bg' ? 'Основен свят (Overworld)' : 'Overworld Dimension',
        };
      case 'nether':
        return {
          border: theme === 'light' ? 'border-rose-200' : 'border-rose-500/20',
          bg: theme === 'light' ? 'bg-rose-50/50' : 'bg-rose-950/15',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <Flame className="w-5 h-5 text-rose-400 shrink-0" />,
          label: language === 'bg' ? 'Ад / Недър (Nether)' : 'The Nether Dimension',
        };
      case 'the_end':
        return {
          border: theme === 'light' ? 'border-purple-200' : 'border-purple-500/20',
          bg: theme === 'light' ? 'bg-purple-50/50' : 'bg-purple-950/15',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />,
          label: language === 'bg' ? 'Край (The End)' : 'The End Dimension',
        };
      default:
        return {
          border: theme === 'light' ? 'border-amber-200' : 'border-amber-500/20',
          bg: theme === 'light' ? 'bg-amber-50/50' : 'bg-amber-950/15',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <Layers className="w-5 h-5 text-amber-400 shrink-0" />,
          label: language === 'bg' ? 'Допълнителен свят' : 'Custom World',
        };
    }
  };

  if (currentView === 'radar') {
    return (
      <div className={`h-full rounded-2xl p-6 overflow-y-auto ${
        theme === 'light' ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel'
      }`}>
        <SeedMapRadar
          server={server}
          onSendCommand={onSendCommand}
          onClose={() => setCurrentView('manager')}
        />
      </div>
    );
  }

  return (
    <div className={`h-full rounded-2xl p-6 overflow-y-auto space-y-6 ${
      theme === 'light' ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel'
    }`}>
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
      }`}>
        <div>
          <h3 className={`text-lg font-black flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            <Globe className="w-5 h-5 text-sky-500" />
            {language === 'bg' ? 'Управление на светове и измерения' : 'World & Dimension Manager'}
          </h3>
          <p className={`text-xs mt-0.5 ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {language === 'bg'
              ? 'Преглед на светове, размер, играчи, ресет на Nether/End и архиви'
              : 'Inspect world sizes, playerdata, reset Nether/End dimensions, and manage backups'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleImportZip}
            disabled={actionLoading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.1]'
            } disabled:opacity-50`}
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'bg' ? 'Импорт от ZIP' : 'Import ZIP World'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportZip}
            disabled={actionLoading}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              theme === 'light'
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
            } disabled:opacity-50`}
            title={language === 'bg' ? 'Експортирай света като самостоятелен .zip файл' : 'Export world as .zip'}
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>{language === 'bg' ? 'Експорт на свят (.zip)' : 'Export World (.zip)'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSlimmer}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              theme === 'light'
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300'
                : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border-purple-400/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{language === 'bg' ? 'World Slimmer (Свиване)' : 'World Slimmer (Prune)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('radar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
              theme === 'light'
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-400/30'
            }`}
            title={language === 'bg' ? 'Интерактивна Seed Карта и Радар за структури' : 'Interactive Seed Map & Structure Radar'}
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>{language === 'bg' ? 'Seed Карта & Радар' : 'Seed Map & Radar'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/40 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{language === 'bg' ? 'Бекъп на света' : 'Create Backup'}</span>
          </button>

          <button
            type="button"
            onClick={() => (window as any).api?.openServerFolder?.(server.id)}
            className={`p-2 rounded-xl text-xs transition-all border cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border-white/[0.06]'
            }`}
            title={language === 'bg' ? 'Отвори папката на сървъра' : 'Open server folder'}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* World Dimensions Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${
            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {language === 'bg' ? 'Открити Измерения & Светове' : 'Detected Dimensions & Worlds'} ({worlds.length})
          </h4>
          <button
            type="button"
            onClick={loadData}
            className={`text-xs flex items-center gap-1 cursor-pointer hover:underline ${
              theme === 'light' ? 'text-sky-600' : 'text-sky-400'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{language === 'bg' ? 'Обнови' : 'Refresh'}</span>
          </button>
        </div>

        {worlds.length === 0 ? (
          <div className={`p-8 rounded-2xl border text-center ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
          }`}>
            <p className="text-xs text-slate-400">
              {language === 'bg'
                ? 'Все още няма генерирани светове. Стартирайте сървъра поне веднъж, за да се генерира картата.'
                : 'No worlds generated yet. Start the server once to generate world files.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((w) => {
              const style = getDimensionCardStyle(w.dimension);
              const isOverworld = w.dimension === 'overworld' || w.name === 'world';

              return (
                <div
                  key={w.name}
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${style.border} ${style.bg}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-white/10 shrink-0">
                          {style.icon}
                        </div>
                        <div className="min-w-0">
                          <h5 className={`font-bold text-sm truncate ${
                            theme === 'light' ? 'text-slate-900' : 'text-white'
                          }`}>
                            {w.name}
                          </h5>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-xl ${
                        theme === 'light' ? 'bg-white/80 border border-slate-200/80' : 'bg-black/20 border border-white/[0.04]'
                      }`}>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <HardDrive className="w-3 h-3" />
                          <span>{language === 'bg' ? 'Размер' : 'Size'}</span>
                        </div>
                        <span className="font-mono font-bold text-xs mt-0.5 block">
                          {w.sizeMb} MB
                        </span>
                      </div>

                      <div className={`p-2.5 rounded-xl ${
                        theme === 'light' ? 'bg-white/80 border border-slate-200/80' : 'bg-black/20 border border-white/[0.04]'
                      }`}>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <Users className="w-3 h-3" />
                          <span>{language === 'bg' ? 'Играчи (data)' : 'Playerdata'}</span>
                        </div>
                        <span className="font-mono font-bold text-xs mt-0.5 block">
                          {w.playerDataCount} {language === 'bg' ? 'записа' : 'files'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {language === 'bg' ? 'Последна промяна:' : 'Modified:'}{' '}
                        {new Date(w.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    {isOverworld ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'bg' ? 'Защитен основен свят' : 'Protected Primary World'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResetWorld(w)}
                        disabled={actionLoading}
                        className="w-full py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {language === 'bg' ? `Ресетирай ${w.name}` : `Reset ${w.name}`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto-Backup Banner Notice */}
      {autoBackupNotice && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 backdrop-blur-xl ${
          theme === 'light'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
            : 'bg-emerald-950/30 border-emerald-400/40 text-emerald-200'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <strong>{language === 'bg' ? 'Създаден нов автоматичен архив:' : 'New scheduled backup created:'}</strong>{' '}
            <code className={`px-1.5 py-0.5 rounded font-mono ${
              theme === 'light' ? 'bg-emerald-100 text-emerald-950' : 'bg-emerald-950/80 text-emerald-200'
            }`}>${autoBackupNotice}</code>
          </div>
        </div>
      )}

      {/* Auto-Backup Scheduler Configuration Card */}
      <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
        theme === 'light'
          ? 'bg-slate-50/80 border-slate-200'
          : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            }`}>
              <Clock className="w-4 h-4 text-amber-500" />
              {language === 'bg' ? 'Автоматичен График за Архивиране (Auto-Backup)' : 'Scheduled Auto-Backup'}
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-normal">✨ {language === 'bg' ? 'Ново' : 'New'}</span>
            </span>
            <span className={`text-[11px] block mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {language === 'bg'
                ? 'CraftDock автоматично създава пълен .zip архив на света на определен интервал, без да спира играта'
                : 'CraftDock automatically creates a full .zip world snapshot at your chosen interval'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleUpdateAutoBackup(!autoBackupEnabled, autoBackupIntervalHours, autoBackupRetentionCount)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
              autoBackupEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
            }`}
          >
            {autoBackupEnabled
              ? (language === 'bg' ? 'ВКЛЮЧЕН (Активен)' : 'ENABLED')
              : (language === 'bg' ? 'ИЗКЛЮЧЕН' : 'DISABLED')}
          </button>
        </div>

        {autoBackupEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
            {/* Interval Dropdown */}
            <div className={`p-3.5 rounded-xl space-y-1.5 border ${
              theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
            }`}>
              <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                {language === 'bg' ? 'Интервал на бекъпите' : 'Backup Interval'}
              </label>
              <select
                value={autoBackupIntervalHours}
                onChange={(e) => handleUpdateAutoBackup(true, Number(e.target.value), autoBackupRetentionCount)}
                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/40 border-white/[0.1] text-white'
                }`}
              >
                <option value={1}>{language === 'bg' ? 'На всеки 1 час' : 'Every 1 hour'}</option>
                <option value={2}>{language === 'bg' ? 'На всеки 2 часа' : 'Every 2 hours'}</option>
                <option value={4}>{language === 'bg' ? 'На всеки 4 часа' : 'Every 4 hours'}</option>
                <option value={6}>{language === 'bg' ? 'На всеки 6 часа (Препоръчително)' : 'Every 6 hours (Recommended)'}</option>
                <option value={12}>{language === 'bg' ? 'На всеки 12 часа' : 'Every 12 hours'}</option>
                <option value={24}>{language === 'bg' ? 'Веднъж на 24 часа (Ежедневно)' : 'Every 24 hours (Daily)'}</option>
              </select>
            </div>

            {/* Retention Dropdown */}
            <div className={`p-3.5 rounded-xl space-y-1.5 border ${
              theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
            }`}>
              <label className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                {language === 'bg' ? 'Пази последните копия' : 'Keep Latest Copies'}
              </label>
              <select
                value={autoBackupRetentionCount}
                onChange={(e) => handleUpdateAutoBackup(true, autoBackupIntervalHours, Number(e.target.value))}
                className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none cursor-pointer ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/40 border-white/[0.1] text-white'
                }`}
              >
                <option value={3}>{language === 'bg' ? 'Пази 3 копия (Минимум дисково пространство)' : 'Keep 3 copies'}</option>
                <option value={5}>{language === 'bg' ? 'Пази 5 копия (Балансирано)' : 'Keep 5 copies'}</option>
                <option value={10}>{language === 'bg' ? 'Пази 10 копия (Висока сигурност)' : 'Keep 10 copies'}</option>
                <option value={20}>{language === 'bg' ? 'Пази 20 копия' : 'Keep 20 copies'}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Backups Section */}
      <div className="space-y-3 pt-2">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          {language === 'bg' ? 'Архиви на Световете (.zip)' : 'World Backups (.zip)'} ({backups.length})
        </h4>

        {backups.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
          }`}>
            <p className="text-xs text-slate-400">
              {language === 'bg'
                ? 'Няма намерени архивни копия. Натиснете "Бекъп на света" горе, за да създадете.'
                : 'No backups found. Click "Create Backup" above to save a snapshot.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.fileName}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                  theme === 'light'
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold truncate text-xs">{b.fileName}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{b.sizeMb} MB</span>
                      <span>•</span>
                      <span>{new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreBackup(b.fileName)}
                    disabled={actionLoading}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      theme === 'light'
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-400/30'
                    } disabled:opacity-50`}
                    title={language === 'bg' ? 'Възстанови този архив' : 'Restore this backup'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'bg' ? 'Възстанови' : 'Restore'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBackup(b.fileName)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title={language === 'bg' ? 'Изтрий бекъп' : 'Delete backup'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* World Slimmer Modal */}
      {showSlimmerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative space-y-5 ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'glass-panel border-white/[0.1] text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {language === 'bg' ? '🧹 World Slimmer (Свиване на света)' : '🧹 World Slimmer (Chunk Pruner)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bg'
                      ? 'Премахни неизползваните далечни чанкове и освободи гигабайти'
                      : 'Remove unused distant chunks and free gigabytes of disk space'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSlimmerModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Analysis KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-3 rounded-xl border text-center ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <span className="text-[11px] text-slate-400 block">{language === 'bg' ? 'Всички Региони' : 'Total Regions'}</span>
                <span className="text-base font-bold font-mono text-sky-400">{slimmerAnalysis?.totalRegions ?? '...'}</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <span className="text-[11px] text-slate-400 block">{language === 'bg' ? 'Размер' : 'Current Size'}</span>
                <span className="text-base font-bold font-mono text-slate-200">{slimmerAnalysis ? `${slimmerAnalysis.totalSizeMb} MB` : '...'}</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <span className="text-[11px] text-slate-400 block">{language === 'bg' ? 'Далечни Региони' : 'Distant Regions'}</span>
                <span className="text-base font-bold font-mono text-amber-400">{slimmerAnalysis?.distantRegions ?? '...'}</span>
              </div>

              <div className={`p-3 rounded-xl border text-center ${
                theme === 'light' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-500/15 border-purple-500/30'
              }`}>
                <span className="text-[11px] text-purple-300 block">{language === 'bg' ? 'Спестяване' : 'Space Freed'}</span>
                <span className="text-base font-bold font-mono text-purple-400">
                  {slimmerAnalysis ? `~${slimmerAnalysis.estimatedSavableMb} MB` : '...'}
                </span>
              </div>
            </div>

            {/* Radius Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>{language === 'bg' ? 'Запази чанковете в радиус от Spawn:' : 'Preserve chunks within radius of Spawn:'}</span>
                <span className="text-purple-400 font-mono">{slimmerRadius} {language === 'bg' ? 'блока' : 'blocks'}</span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[1500, 2500, 4000, 6000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSlimmerRadius(r);
                      analyzeSlimmer(r);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                      slimmerRadius === r
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                    }`}
                  >
                    {r}m {r === 2500 ? '★' : ''}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'bg'
                  ? 'Всички строежи и бази в този радиус се запазват напълно. Изтриват се само далечните чанкове, генерирани при изследване с елитри.'
                  : 'All structures and bases in this radius are 100% preserved. Only distant chunks loaded during flight are trimmed.'}
              </p>
            </div>

            {/* Safety Backup Guarantee */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2.5">
              <Shield className="w-5 h-5 shrink-0" />
              <span>
                {language === 'bg'
                  ? 'Гарантирана безопасност: Преди свиването CraftDock автоматично ще създаде пълен предпазен .zip бекъп в backups/.'
                  : 'Safety Guaranteed: CraftDock will create a complete .zip backup in backups/ before any files are pruned.'}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowSlimmerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                {t('common.cancel')}
              </button>

              <button
                type="button"
                onClick={handleExecuteSlimmer}
                disabled={isTrimming || isAnalyzingSlimmer}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-950/50 cursor-pointer disabled:opacity-50 flex items-center gap-2 btn-bounce"
              >
                {isTrimming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'bg' ? 'Свиване и Архивиране...' : 'Backing up & Pruning...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'bg' ? 'Свий Света Сега' : 'Prune Chunks Now'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

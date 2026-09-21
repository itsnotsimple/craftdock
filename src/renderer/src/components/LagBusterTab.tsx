import React, { useState, useEffect } from 'react';
import {
  Zap,
  Trash2,
  Skull,
  Compass,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  Pause,
  XCircle,
  Sparkles,
  Info,
  RefreshCw,
  Layers,
  Package,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';

interface LagBusterTabProps {
  server: ServerProfile;
  isRunning: boolean;
  onRefresh?: () => void;
}

export const LagBusterTab: React.FC<LagBusterTabProps> = ({ server, isRunning, onRefresh }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm, showAlert } = useDialog();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lagCheck, setLagCheck] = useState<any | null>(null);
  const [loadingCheck, setLoadingCheck] = useState<boolean>(true);
  const [chunkyRadius, setChunkyRadius] = useState<number>(2000);
  const [chunkyInstalled, setChunkyInstalled] = useState<boolean>(false);

  const fetchLagSettings = async () => {
    setLoadingCheck(true);
    try {
      const api = (window as any).api;
      if (api?.checkLagSettings) {
        const check = await api.checkLagSettings(server.id);
        setLagCheck(check);
      }
      if (api?.isChunkyInstalled) {
        const installed = await api.isChunkyInstalled(server.id);
        setChunkyInstalled(Boolean(installed));
      }
    } catch (e) {
      console.error('Failed to check lag settings:', e);
    } finally {
      setLoadingCheck(false);
    }
  };

  useEffect(() => {
    fetchLagSettings();
  }, [server.id]);

  // Clean Dropped Items
  const handleCleanItems = async () => {
    if (!isRunning) {
      await showAlert({
        title: language === 'bg' ? 'Сървърът е изключен' : 'Server is Offline',
        message:
          language === 'bg'
            ? 'Сървърът трябва да работи, за да се изчистят предметите от активните чанкове.'
            : 'The server must be running to clear entities from active chunks.',
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Изчистване на дропнати предмети' : 'Clear Dropped Items',
      message:
        language === 'bg'
          ? 'Сигурни ли сте, че искате да премахнете всички дропнати предмети на пода? Това незабавно ще облекчи ентити тиковете на сървъра.'
          : 'Are you sure you want to remove all floating dropped items? This will immediately reduce entity tick lag.',
      confirmText: language === 'bg' ? 'Изчисти предметите' : 'Clear Items',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (!confirmed) return;

    setLoadingAction('clean-items');
    try {
      const api = (window as any).api;
      await api.cleanDroppedItems(server.id);
      await showAlert({
        title: language === 'bg' ? 'Предметите са изчистени' : 'Items Cleared',
        message:
          language === 'bg'
            ? 'Командата за изчистване на дропнатите предмети беше изпълнена успешно в конзолата.'
            : 'Command to remove floating items was executed successfully in console.',
        type: 'success',
      });
    } catch (err: any) {
      await showAlert({
        title: language === 'bg' ? 'Грешка' : 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Clean Hostile Monsters
  const handleCleanMonsters = async () => {
    if (!isRunning) {
      await showAlert({
        title: language === 'bg' ? 'Сървърът е изключен' : 'Server is Offline',
        message:
          language === 'bg'
            ? 'Сървърът трябва да работи, за да се изчистят чудовищата.'
            : 'The server must be running to purge monsters.',
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Премахване на чудовища' : 'Purge Hostile Monsters',
      message:
        language === 'bg'
          ? 'Това действие ще премахне враждебните чудовища (зомбита, скелети, крийпъри), но ще ЗАПАЗИ играчите, домашните любимци и селяните.'
          : 'This will remove hostile monsters while safely preserving players, pets, and villagers.',
      confirmText: language === 'bg' ? 'Премахни чудовищата' : 'Purge Monsters',
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'warning',
    });

    if (!confirmed) return;

    setLoadingAction('clean-mobs');
    try {
      const api = (window as any).api;
      await api.cleanHostileMonsters(server.id);
      await showAlert({
        title: language === 'bg' ? 'Чудовищата са премахнати' : 'Monsters Purged',
        message:
          language === 'bg'
            ? 'Враждебните чудовища бяха премахнати за възстановяване на нормален TPS.'
            : 'Hostile monsters were purged to restore server TPS.',
        type: 'success',
      });
    } catch (err: any) {
      await showAlert({
        title: language === 'bg' ? 'Грешка' : 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Clean Minecarts & Boats
  const handleCleanVehicles = async () => {
    if (!isRunning) return;
    setLoadingAction('clean-vehicles');
    try {
      const api = (window as any).api;
      await api.cleanMinecartsBoats(server.id);
      await showAlert({
        title: language === 'bg' ? 'Превозните средства са изчистени' : 'Vehicles Cleared',
        message:
          language === 'bg'
            ? 'Изоставените вагонетки и лодки бяха премахнати.'
            : 'Abandoned minecarts and boats were removed.',
        type: 'success',
      });
    } catch (err: any) {
      await showAlert({
        title: language === 'bg' ? 'Грешка' : 'Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Chunky commands
  const handleChunky = async (action: 'start' | 'pause' | 'cancel') => {
    if (!isRunning) {
      await showAlert({
        title: language === 'bg' ? 'Сървърът е изключен' : 'Server is Offline',
        message:
          language === 'bg'
            ? 'Сървърът трябва да работи, за да се изпълни командата.'
            : 'The server must be running to execute this command.',
        type: 'warning',
      });
      return;
    }

    if (!chunkyInstalled) {
      await showAlert({
        title: language === 'bg' ? 'Chunky не е инсталиран' : 'Chunky Not Installed',
        message:
          language === 'bg'
            ? 'Vanilla Minecraft не поддържа командата chunky. За да генерирате чанкове предварително, превключете сървъра на Paper/Purpur или инсталирайте Chunky от таб "Плъгини & Пакове".'
            : 'The chunky command does not exist on Vanilla Minecraft. To pre-generate chunks, switch your server to Paper/Purpur or install Chunky from the Plugins & Packs tab.',
        type: 'warning',
      });
      return;
    }

    try {
      const api = (window as any).api;
      const res = await api.runChunkyCommand(server.id, action, chunkyRadius);
      if (res && res.success === false) {
        if (res.error === 'CHUNKY_NOT_INSTALLED') {
          await showAlert({
            title: language === 'bg' ? 'Chunky не е намерен' : 'Chunky Missing',
            message:
              language === 'bg'
                ? 'Плъгинът или модът Chunky не е открит в папката на сървъра.'
                : 'Chunky is not installed in the server plugins or mods folder.',
            type: 'warning',
          });
          return;
        }
      }

      await showAlert({
        title: language === 'bg' ? 'Командата е изпратена' : 'Command Sent',
        message:
          language === 'bg'
            ? `Изпратена Chunky команда (${action}, радиус: ${chunkyRadius} блока). Следете таб Конзола за прогреса.`
            : `Chunky command (${action}, radius: ${chunkyRadius} blocks) was sent. Check Console tab for live progress.`,
        type: 'info',
      });
    } catch (err: any) {
      await showAlert({
        title: language === 'bg' ? 'Грешка' : 'Error',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Apply Optimal Performance Settings
  const handleApplyOptimalSettings = async () => {
    const confirmed = await showConfirm({
      title: language === 'bg' ? 'Прилагане на Оптимални Настройки' : 'Apply Optimal Lag Settings',
      message:
        language === 'bg'
          ? 'CraftDock ще оптимизира параметрите в server.properties (Simulation Distance: 4, View Distance: 8, Entity Broadcast: 80%, Watchdog Crash: Disabled). Желаете ли да продължите?'
          : 'CraftDock will optimize server.properties (Simulation Distance: 4, View Distance: 8, Entity Broadcast: 80%, Watchdog Crash: Disabled). Do you wish to continue?',
      confirmText: language === 'bg' ? 'Приложи Настройките' : 'Apply Settings',
      cancelText: t('common.cancel'),
      danger: false,
      icon: 'info',
    });

    if (!confirmed) return;

    try {
      const api = (window as any).api;
      await api.applyOptimalLagSettings(server.id);
      await fetchLagSettings();
      await showAlert({
        title: language === 'bg' ? 'Настройките са приложени' : 'Settings Applied',
        message:
          language === 'bg'
            ? 'Оптималните настройки за производителност бяха запазени в server.properties. Рестартирайте сървъра, за да влязат в сила.'
            : 'Optimal performance settings were saved to server.properties. Restart the server for changes to take full effect.',
        type: 'success',
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      await showAlert({
        title: language === 'bg' ? 'Грешка' : 'Error',
        message: err.message,
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner without PRO badge and without emojis */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          theme === 'light'
            ? 'bg-amber-500/10 border-amber-500/20 text-slate-900'
            : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>{language === 'bg' ? 'Lag Buster & Оптимизатор на Лага' : 'Lag Buster & Performance Optimizer'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'bg'
                ? 'Бързо отстраняване на спад в TPS, пренаселени мобове и оптимизация на чанковете'
                : 'Instant fixes for TPS drops, entity overcrowding, and chunk optimization'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchLagSettings}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingCheck ? 'animate-spin text-amber-500' : ''}`} />
          <span>{t('common.refresh')}</span>
        </button>
      </div>

      {/* Grid: Emergency Cleaners & Performance Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions (2 Columns on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className={`p-4 rounded-2xl border ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.08]'
            }`}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{language === 'bg' ? '1-Клик Почистване на Ентитита' : '1-Click Entity Cleaners'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Clean Dropped Items */}
              <div
                className={`p-3 rounded-xl border flex flex-col justify-between space-y-3 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'bg' ? 'Дропнати Предмети' : 'Floating Items'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'bg'
                      ? 'Премахва хиляди предмети по пода от взривове или mob ферми.'
                      : 'Removes ground items from explosions or mob farms causing lag.'}
                  </p>
                </div>

                <button
                  onClick={handleCleanItems}
                  disabled={loadingAction === 'clean-items'}
                  className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bg' ? 'Изчисти Предмети' : 'Purge Items'}</span>
                </button>
              </div>

              {/* Clean Hostile Mobs */}
              <div
                className={`p-3 rounded-xl border flex flex-col justify-between space-y-3 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Skull className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'bg' ? 'Враждебни Мобове' : 'Hostile Monsters'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'bg'
                      ? 'Премахва чудовищата, но предпазва селяни, коне и любимци.'
                      : 'Clears hostile mobs while preserving villagers and pets.'}
                  </p>
                </div>

                <button
                  onClick={handleCleanMonsters}
                  disabled={loadingAction === 'clean-mobs'}
                  className="w-full py-2 px-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Skull className="w-3.5 h-3.5" />
                  <span>{language === 'bg' ? 'Премахни Мобове' : 'Purge Monsters'}</span>
                </button>
              </div>

              {/* Clean Abandoned Vehicles */}
              <div
                className={`p-3 rounded-xl border flex flex-col justify-between space-y-3 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {language === 'bg' ? 'Лодки & Вагонетки' : 'Boats & Carts'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {language === 'bg'
                      ? 'Спира лага от физически симулации на изоставени превозни средства.'
                      : 'Stops physics tick lag from abandoned boats and carts.'}
                  </p>
                </div>

                <button
                  onClick={handleCleanVehicles}
                  disabled={loadingAction === 'clean-vehicles'}
                  className="w-full py-2 px-3 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bg' ? 'Изчисти Превозни' : 'Purge Vehicles'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chunky World Pre-Generation Section */}
          <div
            className={`p-4 rounded-2xl border ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                <span>{language === 'bg' ? 'Chunky Предварителна Генерация на Света' : 'Chunky World Pre-Generation'}</span>
              </h4>
              {chunkyInstalled ? (
                <span className="text-[11px] font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{language === 'bg' ? 'Chunky е готов' : 'Chunky Ready'}</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'bg' ? 'Липсва Chunky' : 'Chunky Missing'}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              {language === 'bg'
                ? 'Генерирането на нови чанкове в реално време, докато играчите летят или бягат, е основна причина за спад в TPS. Предварителната генерация зарежда света предварително.'
                : 'Generating chunks in real-time while players fly or sprint causes severe server freezes. Pre-generating the world fixes this completely.'}
            </p>

            {!chunkyInstalled && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2 mb-3">
                <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  {language === 'bg'
                    ? 'Сървърът не разполага с плъгин Chunky. Vanilla Minecraft не поддържа конзолната команда chunky. За да я ползвате, превключете сървъра на Paper/Purpur или Fabric и добавете Chunky.'
                    : 'Chunky is not installed on this server. Vanilla Minecraft does not have the chunky command. Switch to Paper/Purpur or Fabric and install Chunky to use pre-generation.'}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{language === 'bg' ? 'Радиус на генерация:' : 'Generation Radius:'}</span>
                <div
                  className={`p-0.5 rounded-xl border flex items-center gap-1 ${
                    theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/60 border-white/[0.08]'
                  }`}
                >
                  {[1000, 2000, 5000].map((rad) => (
                    <button
                      key={rad}
                      onClick={() => setChunkyRadius(rad)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        chunkyRadius === rad
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rad}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleChunky('start')}
                  className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    chunkyInstalled
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-slate-600 hover:bg-slate-500 opacity-80'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{language === 'bg' ? 'Стартирай Chunky' : 'Start Chunky'}</span>
                </button>
                <button
                  onClick={() => handleChunky('pause')}
                  disabled={!chunkyInstalled}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  title={language === 'bg' ? 'Пауза' : 'Pause'}
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleChunky('cancel')}
                  disabled={!chunkyInstalled}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border border-rose-500/30 disabled:opacity-50"
                  title={language === 'bg' ? 'Откажи' : 'Cancel'}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Settings Check & 1-Click Optimizer */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-panel border-white/[0.08]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-500" />
                <span>{language === 'bg' ? 'Анализ на Параметрите' : 'Performance Audit'}</span>
              </h4>
              {lagCheck?.isOptimal ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/30">
                  Optimal
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">
                  Needs Tuning
                </span>
              )}
            </div>

            {/* Metric Checklist */}
            <div className="space-y-2.5 mb-4 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-500/5">
                <span className="text-slate-500 dark:text-slate-400">Simulation Distance</span>
                <span
                  className={`font-bold ${
                    lagCheck?.simulationDistance <= 5 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {lagCheck?.simulationDistance ?? '---'} chunks
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-500/5">
                <span className="text-slate-500 dark:text-slate-400">View Distance</span>
                <span
                  className={`font-bold ${
                    lagCheck?.viewDistance <= 8 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {lagCheck?.viewDistance ?? '---'} chunks
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-500/5">
                <span className="text-slate-500 dark:text-slate-400">Entity Broadcast</span>
                <span
                  className={`font-bold ${
                    lagCheck?.entityBroadcastRange <= 80 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {lagCheck?.entityBroadcastRange ?? '---'}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-500/5">
                <span className="text-slate-500 dark:text-slate-400">Watchdog Protection</span>
                <span
                  className={`font-bold ${
                    lagCheck?.maxTickTime === -1 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {lagCheck?.maxTickTime === -1 ? 'Disabled (Crash-Safe)' : `${lagCheck?.maxTickTime}ms`}
                </span>
              </div>
            </div>

            {/* Recommendations notice */}
            {lagCheck?.recommendations && lagCheck.recommendations.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-1 mb-4">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === 'bg' ? 'Препоръки за оптимизация:' : 'Tuning Recommendations:'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  {lagCheck.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>
                  {language === 'bg'
                    ? 'Всички основни параметри са настроени за максимален TPS!'
                    : 'All core settings are tuned for maximum TPS performance!'}
                </span>
              </div>
            )}
          </div>

          {/* 1-Click Apply Button */}
          <button
            onClick={handleApplyOptimalSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 btn-bounce"
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'bg' ? 'Приложи Препоръчителни Настройки' : 'Apply Optimal Performance'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

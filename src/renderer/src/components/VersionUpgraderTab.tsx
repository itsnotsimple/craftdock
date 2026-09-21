import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  ShieldCheck,
  Download,
  Loader2,
  Server as ServerIcon,
  Sparkles,
  Archive,
  Check,
} from 'lucide-react';
import { ServerProfile, VersionInfo } from '../types';
import { VersionCombobox } from './VersionCombobox';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';

interface VersionUpgraderTabProps {
  server: ServerProfile;
  onUpdateServer?: (server: ServerProfile) => void;
}

export const VersionUpgraderTab: React.FC<VersionUpgraderTabProps> = ({ server, onUpdateServer }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm, showAlert } = useDialog();

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(true);
  const [targetVersion, setTargetVersion] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [upgradeProgress, setUpgradeProgress] = useState<{ percent: number; message: string } | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<{
    success: boolean;
    newVersion?: string;
    backupFile?: string;
    error?: string;
  } | null>(null);

  const isRunning = server.status === 'running' || server.status === 'starting';

  // Fetch available versions for this software
  useEffect(() => {
    let mounted = true;
    const fetchAvailVersions = async () => {
      setLoadingVersions(true);
      try {
        const api = (window as any).api;
        if (api?.fetchVersions) {
          const list: VersionInfo[] = await api.fetchVersions(server.software);
          if (mounted && Array.isArray(list)) {
            setVersions(list);
            // Default target version to the latest release that is different from current, or first
            const latest = list.find((v) => v.isLatest) || list[0];
            if (latest) {
              setTargetVersion(latest.version);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch versions for upgrader:', err);
      } finally {
        if (mounted) setLoadingVersions(false);
      }
    };

    fetchAvailVersions();
    return () => {
      mounted = false;
    };
  }, [server.software]);

  // Subscribe to progress events
  useEffect(() => {
    const api = (window as any).api;
    if (!api?.onUpgradeProgress) return;

    const unsub = api.onUpgradeProgress((data: { percent: number; message: string }) => {
      setUpgradeProgress(data);
    });

    return () => {
      unsub();
    };
  }, []);

  const handleStartUpgrade = async () => {
    if (isRunning) {
      await showAlert({
        title: language === 'bg' ? 'Сървърът работи' : 'Server is Running',
        message:
          language === 'bg'
            ? 'Моля, спрете сървъра от главното меню преди да стартирате ъпгрейд.'
            : 'Please stop the server before attempting a version upgrade.',
        type: 'warning',
      });
      return;
    }

    if (!targetVersion) return;

    const isSameVersion = targetVersion === server.version;

    const confirmed = await showConfirm({
      title:
        language === 'bg'
          ? `Ъпгрейд до Minecraft v${targetVersion}`
          : `Upgrade to Minecraft v${targetVersion}`,
      message: isSameVersion
        ? language === 'bg'
          ? `Вече използвате версия ${server.version}. Желаете ли да преинсталирате ядрото? CraftDock автоматично ще създаде предпазен бекъп.`
          : `You are already on version ${server.version}. Do you want to reinstall the engine? CraftDock will create a safety backup first.`
        : language === 'bg'
        ? `Сигурни ли сте, че искате да обновите «${server.name}» от v${server.version} до v${targetVersion}? Световете и настройките се запазват напълно, а преди ъпгрейда ще бъде направен автоматичен бекъп.`
        : `Are you sure you want to upgrade «${server.name}» from v${server.version} to v${targetVersion}? Worlds and settings will be preserved, and a full safety backup will be created automatically.`,
      confirmText: language === 'bg' ? '🚀 Започни ъпгрейд' : '🚀 Start Upgrade',
      cancelText: t('common.cancel'),
      danger: false,
      icon: 'info',
    });

    if (!confirmed) return;

    setIsUpgrading(true);
    setUpgradeResult(null);
    setUpgradeProgress({
      percent: 5,
      message: language === 'bg' ? 'Инициализиране на процеса...' : 'Initializing upgrade...',
    });

    try {
      const api = (window as any).api;
      if (api?.upgradeServerVersion) {
        const res = await api.upgradeServerVersion(server.id, targetVersion);
        setUpgradeResult(res);
        if (res.success) {
          if (onUpdateServer) {
            onUpdateServer({
              ...server,
              version: targetVersion,
            });
          }
        }
      }
    } catch (err: any) {
      setUpgradeResult({
        success: false,
        error: err?.message || (language === 'bg' ? 'Неочаквана грешка при ъпгрейд.' : 'Unexpected error during upgrade.'),
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          theme === 'light'
            ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-purple-50/90 border-indigo-200 shadow-xs'
            : 'bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/50 border-white/[0.08] backdrop-blur-xl'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40 shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                  {language === 'bg' ? 'Server Version Upgrader' : 'Server Version Upgrader'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase">
                  1-Click
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                {language === 'bg'
                  ? 'Обновете ядрото на сървъра до по-нова версия безопасно, без да губите световете и конфигурациите.'
                  : 'Upgrade your server engine to a newer Minecraft release safely without losing worlds or configs.'}
              </p>
            </div>
          </div>

          {/* Current Engine Badge */}
          <div className={`px-4 py-2 rounded-xl border text-right shrink-0 ${
            theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-black/30 border-white/[0.08]'
          }`}>
            <span className="text-[10px] block font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'bg' ? 'Текуща версия' : 'Current Version'}
            </span>
            <span className="text-sm font-black font-mono text-indigo-500">
              {server.software.toUpperCase()} v{server.version}
            </span>
          </div>
        </div>
      </div>

      {/* Running Alert Banner */}
      {isRunning && (
        <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
          <div className="text-xs">
            <span className="font-bold text-amber-400">
              {language === 'bg' ? 'Внимание: Сървърът в момента работи!' : 'Warning: Server is currently running!'}
            </span>
            <p className="text-slate-300 mt-0.5">
              {language === 'bg'
                ? 'Преди да стартирате ъпгрейд, моля спрете сървъра от главното табло. Това гарантира, че няма отворени файлове в паметта.'
                : 'Please stop the server from the main dashboard before upgrading to ensure no world files are locked.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Upgrade Card */}
      <div
        className={`p-6 rounded-2xl border space-y-5 ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-inherit">
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-800' : 'text-slate-200'
          }`}>
            <ArrowUpCircle className="w-4 h-4 text-indigo-500" />
            {language === 'bg' ? 'Избор на целева версия' : 'Select Target Version'}
          </span>
          <span className={`text-[11px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {versions.length > 0 ? `${versions.length} ${language === 'bg' ? 'налични версии' : 'versions found'}` : ''}
          </span>
        </div>

        {loadingVersions ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === 'bg' ? 'Зареждане на официалните версии...' : 'Fetching official releases...'}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Version Selection Combobox & Quick Grid */}
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                  {language === 'bg' ? 'Търси или избери версия на Minecraft:' : 'Search or Pick Minecraft Version:'}
                </label>
                <VersionCombobox
                  value={targetVersion}
                  onChange={(v) => setTargetVersion(v)}
                  versions={versions}
                  disabled={isUpgrading}
                  currentVersion={server.version}
                  placeholder={
                    language === 'bg'
                      ? `Въведи версия за ${server.software.toUpperCase()} (напр. 1.21.4, 1.8.8)...`
                      : `Type version for ${server.software.toUpperCase()} (e.g. 1.21.4, 1.8.8)...`
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Всички налични версии за бърз избор:' : 'All available versions for quick selection:'}
                  </span>
                  <span className={`text-[10px] font-mono ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {versions.length} {language === 'bg' ? 'версии' : 'versions'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                {versions.map((v) => {
                  const isCurrent = v.version === server.version;
                  const isSelected = targetVersion === v.version;
                  return (
                    <button
                      key={v.version}
                      type="button"
                      disabled={isUpgrading}
                      onClick={() => setTargetVersion(v.version)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40 glow-ice font-bold'
                          : isCurrent
                          ? theme === 'light'
                            ? 'bg-slate-100 border-slate-300 text-slate-800'
                            : 'bg-white/[0.04] border-white/[0.12] text-slate-200'
                          : theme === 'light'
                          ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs font-bold">{v.version}</span>
                        {v.isLatest && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {language === 'bg' ? 'Най-нова' : 'Latest'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-80 truncate">
                        {isCurrent ? (language === 'bg' ? '✓ Инсталирана' : '✓ Installed') : `${server.software}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

            {/* Safety Guarantee Info Box */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                theme === 'light' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold">
                  {language === 'bg' ? '🛡️ Автоматична защита на данните' : '🛡️ Automatic Data Protection'}
                </span>
                <p className={`text-[11px] ${theme === 'light' ? 'text-emerald-800/90' : 'text-emerald-300/80'}`}>
                  {language === 'bg'
                    ? 'Преди всяка замяна на ядрото, CraftDock създава пълен архив на световете в backups/. Дори при проблем можете да възстановите предишното състояние с 1 клик.'
                    : 'Before replacing any server files, CraftDock creates a complete backup in backups/. You can restore anytime.'}
                </p>
              </div>
            </div>

            {/* Progress Bar (during upgrade) */}
            {isUpgrading && upgradeProgress && (
              <div className="p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/30 space-y-2 animate-pulse">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2 text-indigo-300">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    {upgradeProgress.message}
                  </span>
                  <span className="font-mono text-indigo-200">{upgradeProgress.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${upgradeProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Result Box */}
            {upgradeResult && upgradeResult.success && (
              <div className="p-4 rounded-xl border bg-emerald-500/15 border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-emerald-300">
                    {language === 'bg' ? 'Успешен ъпгрейд на сървъра! 🎉' : 'Server upgraded successfully! 🎉'}
                  </span>
                  <p className="text-slate-300">
                    {language === 'bg'
                      ? `Сървърът «${server.name}» вече използва ${server.software.toUpperCase()} v${upgradeResult.newVersion}.`
                      : `Server «${server.name}» is now running ${server.software.toUpperCase()} v${upgradeResult.newVersion}.`}
                  </p>
                  {upgradeResult.backupFile && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400/90 pt-1">
                      <Archive className="w-3.5 h-3.5" />
                      <span>{language === 'bg' ? 'Защитен бекъп:' : 'Safety backup:'} {upgradeResult.backupFile}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Result Box */}
            {upgradeResult && !upgradeResult.success && (
              <div className="p-4 rounded-xl border bg-rose-500/15 border-rose-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-rose-300">
                    {language === 'bg' ? 'Грешка при обновяване' : 'Upgrade failed'}
                  </span>
                  <p className="text-rose-200">
                    {upgradeResult.error || (language === 'bg' ? 'Възникна непредвидена грешка.' : 'An unexpected error occurred.')}
                  </p>
                </div>
              </div>
            )}

            {/* Upgrade Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleStartUpgrade}
                disabled={isUpgrading || isRunning || !targetVersion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-xl shadow-indigo-950/50 glow-purple cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-bounce"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'bg' ? 'Обновяване...' : 'Upgrading...'}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 text-emerald-300" />
                    <span>
                      {language === 'bg'
                        ? `Инсталирай ${server.software.toUpperCase()} v${targetVersion || server.version} с 1 клик`
                        : `Install ${server.software.toUpperCase()} v${targetVersion || server.version} with 1-Click`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

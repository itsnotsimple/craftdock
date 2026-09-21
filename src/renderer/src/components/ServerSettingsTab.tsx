import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  Save,
  Check,
  CheckCircle2,
  X,
  Loader2,
  Swords,
  Eye,
  Users,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Trash2,
  Shield,
  Skull,
  Flame,
  Lock,
  Cpu,
  HardDrive,
  Globe,
  Zap,
  Sliders,
  Compass,
  Mountain,
  Building,
  Clock,
  ShieldAlert,
  Code2,
  Search,
  RefreshCw,
  Palette,
} from 'lucide-react';
import { ServerProfile, CardTheme, CardIcon } from '../types';
import { useDialog } from '../context/DialogContext';
import { StorageSlider } from './StorageSlider';
import { MotdEditor, parseMinecraftMotd } from './MotdEditor';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { MinecraftCardIcon } from './MinecraftIcons';
import { THEME_CONFIGS, getCardThemeConfig } from '../utils/theme-styles';
import { VersionUpgraderTab } from './VersionUpgraderTab';

interface ServerSettingsProps {
  server: ServerProfile;
  onUpdateServer?: (server: ServerProfile) => void;
}

type SettingsSubTab = 'visual' | 'gameplay' | 'world' | 'performance' | 'security' | 'version';

export const ServerSettingsTab: React.FC<ServerSettingsProps> = ({ server, onUpdateServer }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showConfirm } = useDialog();
  const [subTab, setSubTab] = useState<SettingsSubTab>('visual');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawContent, setRawContent] = useState('');
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSaved, setRawSaved] = useState(false);
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cardTheme, setCardTheme] = useState<CardTheme>(server.cardTheme || 'default');
  const [cardIcon, setCardIcon] = useState<CardIcon>(server.cardIcon || 'default');

  useEffect(() => {
    if (server.cardTheme) setCardTheme(server.cardTheme);
    if (server.cardIcon) setCardIcon(server.cardIcon);
  }, [server.cardTheme, server.cardIcon]);

  // Auto-Save & Toast Notification State
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastDetails, setToastDetails] = useState<{ title: string; message: string }>({
    title: '',
    message: '',
  });

  const isLoadedRef = useRef(false);
  const prevSettingsJsonRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [systemTotalRamGb, setSystemTotalRamGb] = useState<number>(16);
  const [systemFreeRamGb, setSystemFreeRamGb] = useState<number>(8);

  const [settings, setSettings] = useState({
    onlineMode: false,
    difficulty: 'normal' as 'peaceful' | 'easy' | 'normal' | 'hard',
    gamemode: 'survival',
    pvp: true,
    hardcore: false,
    viewDistance: 10,
    simulationDistance: 10,
    maxPlayers: 20,
    allocatedRamGb: server.allocatedRamGb || 4,
    storageQuotaGb: server.storageQuotaGb || 0,
    motd: 'CraftDock Minecraft Server',
    spawnProtection: 16,
    // World Generation
    levelSeed: '',
    levelType: 'minecraft:normal',
    generateStructures: true,
    maxWorldSize: 29999984,
    // Gameplay
    allowFlight: false,
    allowNether: true,
    enableCommandBlock: false,
    forceGamemode: false,
    spawnNpcs: true,
    spawnAnimals: true,
    spawnMonsters: true,
    playerIdleTimeout: 0,
    maxBuildHeight: 256,
    // Advanced & Network
    entityBroadcastRangePercentage: 100,
    hideOnlinePlayers: false,
    syncChunkWrites: true,
    rateLimitPacketsPerSecond: 0,
    networkCompressionThreshold: 256,
    enforceSecureProfile: true,
    preventProxyConnections: false,
    maxTickTime: 60000,
    // RCON
    enableRcon: false,
    rconPort: 25575,
    rconPassword: '',
  });

  useEffect(() => {
    const api = (window as any).api;
    if (!api) return;

    Promise.all([
      api.getServerProperties(server.id),
      api.getServerIcon(server.id),
      api.getSystemInfo ? api.getSystemInfo() : Promise.resolve(null),
    ]).then(([props, icon, sysInfo]) => {
      if (sysInfo) {
        setSystemTotalRamGb(sysInfo.totalRamGb || 16);
        setSystemFreeRamGb(sysInfo.freeRamGb || 8);
      }
      if (props) {
        const initialProps = {
          onlineMode: props.onlineMode ?? false,
          difficulty: props.difficulty || 'normal',
          gamemode: props.gamemode || 'survival',
          pvp: props.pvp ?? true,
          hardcore: props.hardcore ?? server.hardcore ?? false,
          viewDistance: props.viewDistance || 10,
          simulationDistance: props.simulationDistance || 10,
          maxPlayers: props.maxPlayers || server.maxPlayers || 20,
          allocatedRamGb: server.allocatedRamGb || 4,
          storageQuotaGb: server.storageQuotaGb || 0,
          motd: props.motd || server.motd || 'CraftDock Minecraft Server',
          spawnProtection: props.spawnProtection !== undefined ? Number(props.spawnProtection) : 16,
          levelSeed: props.levelSeed || '',
          levelType: props.levelType || 'minecraft:normal',
          generateStructures: props.generateStructures !== false,
          maxWorldSize: props.maxWorldSize || 29999984,
          allowFlight: props.allowFlight ?? false,
          allowNether: props.allowNether !== false,
          enableCommandBlock: props.enableCommandBlock ?? false,
          forceGamemode: props.forceGamemode ?? false,
          spawnNpcs: props.spawnNpcs !== false,
          spawnAnimals: props.spawnAnimals !== false,
          spawnMonsters: props.spawnMonsters !== false,
          playerIdleTimeout: props.playerIdleTimeout || 0,
          maxBuildHeight: props.maxBuildHeight || 256,
          entityBroadcastRangePercentage: props.entityBroadcastRangePercentage || 100,
          hideOnlinePlayers: props.hideOnlinePlayers ?? false,
          syncChunkWrites: props.syncChunkWrites !== false,
          rateLimitPacketsPerSecond: props.rateLimitPacketsPerSecond || 0,
          networkCompressionThreshold: props.networkCompressionThreshold || 256,
          enforceSecureProfile: props.enforceSecureProfile !== false,
          preventProxyConnections: props.preventProxyConnections ?? false,
          maxTickTime: props.maxTickTime !== undefined ? Number(props.maxTickTime) : 60000,
          enableRcon: props.enableRcon ?? false,
          rconPort: props.rconPort || 25575,
          rconPassword: props.rconPassword || '',
        };
        setSettings(initialProps);
        prevSettingsJsonRef.current = JSON.stringify(initialProps);
      }
      if (icon) {
        setServerIcon(icon);
      }
      setLoading(false);
      setTimeout(() => {
        isLoadedRef.current = true;
      }, 250);
    });
  }, [server.id, server.maxPlayers, server.name, server.allocatedRamGb, server.storageQuotaGb, server.hardcore]);

  const triggerToast = (title?: string, message?: string) => {
    setToastDetails({
      title: title || t('settings.toastSavedTitle'),
      message: message || t('settings.toastSavedDesc'),
    });
    setShowToast(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3200);
  };

  const performSave = async (settingsToSave: typeof settings, isAuto: boolean = false) => {
    const api = (window as any).api;
    if (!api) return;

    setSaveState('saving');
    try {
      const res = await api.saveServerProperties(server.id, settingsToSave);
      const updatedServer: ServerProfile =
        res && typeof res === 'object' && res.id
          ? res
          : {
              ...server,
              maxPlayers: Number(settingsToSave.maxPlayers) || 20,
              allocatedRamGb: Number(settingsToSave.allocatedRamGb) || 4,
              motd: settingsToSave.motd,
              hardcore: settingsToSave.hardcore,
              storageQuotaGb: Number(settingsToSave.storageQuotaGb) || 0,
            };

      if (onUpdateServer) {
        onUpdateServer(updatedServer);
      }

      setSaved(true);
      setSaveState('saved');
      setTimeout(() => setSaved(false), 2500);
      setTimeout(() => setSaveState('idle'), 2500);

      // Trigger toast notification
      triggerToast();
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveState('idle');
    }
  };

  // Auto-Save Effect: Automatically saves 650ms after user finishes making any change
  useEffect(() => {
    if (!isLoadedRef.current || isRawMode) return;

    const currentJson = JSON.stringify(settings);
    if (currentJson === prevSettingsJsonRef.current) return;
    prevSettingsJsonRef.current = currentJson;

    setSaveState('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave(settings, true);
    }, 650);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [settings, isRawMode]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Handle picking & resizing any uploaded image to 64x64 PNG
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, 64, 64);
          const dataUrl = canvas.toDataURL('image/png');
          setServerIcon(dataUrl);

          const api = (window as any).api;
          if (api) {
            api.setServerIcon(server.id, dataUrl);
            triggerToast(
              language === 'bg' ? 'Иконата е запазена' : 'Icon Saved',
              language === 'bg' ? 'Новата 64x64 икона на сървъра е качена успешно.' : 'New 64x64 server icon was uploaded.'
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveIcon = async () => {
    const confirmed = await showConfirm({
      title: t('dialogs.removeIconTitle'),
      message: t('dialogs.removeIconMsg'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (confirmed) {
      const api = (window as any).api;
      if (api) {
        await api.removeServerIcon(server.id);
      }
      setServerIcon(null);
      triggerToast(
        language === 'bg' ? 'Иконата е премахната' : 'Icon Removed',
        language === 'bg' ? 'Сървърът ще се показва със стандартната си икона.' : 'Default server icon restored.'
      );
    }
  };

  const handleSelectTheme = async (themeId: CardTheme) => {
    setCardTheme(themeId);
    const api = (window as any).api;
    if (api?.updateServerProfile) {
      await api.updateServerProfile(server.id, { cardTheme: themeId });
    }
    if (onUpdateServer) {
      onUpdateServer({ ...server, cardTheme: themeId });
    }
    triggerToast(
      language === 'bg' ? 'Темата е запазена' : 'Theme Saved',
      language === 'bg'
        ? `Избрана тема: ${THEME_CONFIGS[themeId]?.nameBg || themeId}`
        : `Selected theme: ${THEME_CONFIGS[themeId]?.nameEn || themeId}`
    );
  };

  const handleSelectCardIcon = async (iconId: CardIcon) => {
    setCardIcon(iconId);
    const api = (window as any).api;
    if (api?.updateServerProfile) {
      await api.updateServerProfile(server.id, { cardIcon: iconId });
    }
    if (onUpdateServer) {
      onUpdateServer({ ...server, cardIcon: iconId });
    }
    triggerToast(
      language === 'bg' ? 'Иконката е запазена' : 'Icon Saved',
      language === 'bg' ? 'Иконката на картичката беше обновена.' : 'Card icon was updated.'
    );
  };

  const loadRawProperties = async () => {
    const api = (window as any).api;
    if (!api) return;
    setRawLoading(true);
    try {
      const content = await api.getRawServerProperties(server.id);
      setRawContent(content || '');
    } catch (e) {
      console.error('Failed to load raw properties', e);
    } finally {
      setRawLoading(false);
    }
  };

  const handleToggleRawMode = async (mode: boolean) => {
    setIsRawMode(mode);
    if (mode) {
      await loadRawProperties();
    }
  };

  const handleSaveRaw = async () => {
    const api = (window as any).api;
    if (!api) return;
    setRawLoading(true);
    try {
      const success = await api.saveRawServerProperties(server.id, rawContent);
      if (success) {
        setRawSaved(true);
        setTimeout(() => setRawSaved(false), 2000);
        triggerToast(
          t('settings.toastRawSavedTitle'),
          t('settings.toastRawSavedDesc')
        );
        // Sync parsed settings back to GUI state
        const updated = await api.getServerProperties(server.id);
        if (updated) {
          setSettings((prev) => ({
            ...prev,
            ...updated,
            allocatedRamGb: server.allocatedRamGb || prev.allocatedRamGb,
            storageQuotaGb: server.storageQuotaGb || prev.storageQuotaGb,
            motd: updated.motd || prev.motd,
            difficulty: updated.difficulty || prev.difficulty,
            gamemode: updated.gamemode || prev.gamemode,
            preventProxyConnections: updated.preventProxyConnections ?? false,
            maxTickTime: updated.maxTickTime !== undefined ? Number(updated.maxTickTime) : 60000,
            forceGamemode: updated.forceGamemode ?? false,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to save raw properties', e);
    } finally {
      setRawLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await performSave(settings, false);
  };

  const parsedMotdLines = parseMinecraftMotd(settings.motd || 'CraftDock Minecraft Server');

  const subTabs: {
    id: SettingsSubTab;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    description: string;
  }[] = [
    {
      id: 'visual',
      labelKey: 'settings.subtab.visual',
      icon: Sparkles,
      colorClass: 'text-amber-400',
      description: language === 'bg' ? 'Икона, MOTD & слотове' : 'Icon, MOTD & slots',
    },
    {
      id: 'gameplay',
      labelKey: 'settings.subtab.gameplay',
      icon: Swords,
      colorClass: 'text-rose-400',
      description: language === 'bg' ? 'Hardcore, трудност & PvP' : 'Difficulty, PvP & rules',
    },
    {
      id: 'world',
      labelKey: 'settings.subtab.world',
      icon: Globe,
      colorClass: 'text-emerald-400',
      description: language === 'bg' ? 'Seed, биоми & граница' : 'Seed, biomes & border',
    },
    {
      id: 'performance',
      labelKey: 'settings.subtab.performance',
      icon: Cpu,
      colorClass: 'text-purple-400',
      description: language === 'bg' ? 'RAM памет & чанкове' : 'RAM & chunk distance',
    },
    {
      id: 'security',
      labelKey: 'settings.subtab.security',
      icon: Shield,
      colorClass: 'text-sky-400',
      description: language === 'bg' ? 'Пиратски режим & VPN' : 'Cracked, VPN & watchdog',
    },
    {
      id: 'version',
      labelKey: 'settings.subtab.version',
      icon: RefreshCw,
      colorClass: 'text-indigo-400',
      description: language === 'bg' ? '1-клик ъпгрейд на ядрото' : '1-click engine upgrade',
    },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className={`h-full rounded-2xl p-6 overflow-y-auto space-y-6 ${
        theme === 'light'
          ? 'bg-white border border-slate-200 shadow-sm'
          : 'bg-slate-950/40 backdrop-blur-2xl border border-white/[0.08] shadow-2xl'
      }`}
    >
      {/* Hidden File Input for Server Icon */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/png,image/jpeg,image/webp,image/jpg,image/bmp"
        className="hidden"
      />

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            <Settings className="w-5 h-5 text-amber-500" />
            {isRawMode ? t('settings.rawTitle') : t('settings.title')}
          </h3>
          <p className={`text-xs mt-0.5 ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {isRawMode ? t('settings.rawSubtitle') : t('settings.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Auto-save Status Indicator */}
          {!isRawMode && (
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              saveState === 'saving'
                ? theme === 'light'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                : saveState === 'saved'
                ? theme === 'light'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : theme === 'light'
                ? 'bg-slate-100/70 border-slate-200 text-slate-600 shadow-xs'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
            }`}>
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span className="font-semibold">{t('settings.autoSaving')}</span>
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold">{t('settings.autoSaved')}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  <span>{t('settings.autoSaveActive')}</span>
                </>
              )}
            </div>
          )}

          {/* Mode Switcher: GUI vs RAW */}
          <div className={`flex items-center p-1 rounded-xl border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/[0.04] border-white/[0.08]'
          }`}>
            <button
              type="button"
              onClick={() => handleToggleRawMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isRawMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('settings.modeVisual')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleRawMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isRawMode
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{t('settings.modeRaw')}</span>
            </button>
          </div>

          {!isRawMode ? (
            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-950/50 glow-ice cursor-pointer disabled:opacity-50"
            >
              {saved || saveState === 'saved' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> {t('settings.savedSuccess')}
                </>
              ) : saveState === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> {t('settings.autoSaving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {t('settings.saveChanges')}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveRaw}
              disabled={rawLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
            >
              {rawSaved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" /> {t('settings.rawSaved')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {t('settings.rawSave')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Raw Mode Editor */}
      {isRawMode ? (
        <div className="space-y-4">
          {/* Search bar & info */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border w-full ${
                theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-950/60 border-white/[0.1]'
              }`}>
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  placeholder={t('settings.rawSearchPlaceholder')}
                  className={`w-full text-xs font-mono bg-transparent outline-none ${
                    theme === 'light' ? 'text-slate-900 placeholder:text-slate-400' : 'text-slate-100 placeholder:text-slate-500'
                  }`}
                />
                {rawSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRawSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400">
                {t('settings.rawLinesCount').replace('{count}', String(rawContent.split('\n').length))}
              </span>
              <button
                type="button"
                onClick={loadRawProperties}
                disabled={rawLoading}
                title={t('settings.rawReload')}
                className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rawLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('settings.rawReload')}</span>
              </button>
            </div>
          </div>

          {/* Editor Container with Line Numbers */}
          <div className={`relative rounded-xl border overflow-hidden font-mono text-xs ${
            theme === 'light'
              ? 'bg-slate-900 text-slate-100 border-slate-300'
              : 'bg-slate-950/90 text-emerald-300/90 border-white/[0.08]'
          }`}>
            <div className="flex max-h-[560px] overflow-y-auto">
              {/* Line numbers gutter */}
              <div className="py-3 px-3 text-right select-none font-mono text-[11px] text-slate-500 bg-black/20 border-r border-white/[0.06] shrink-0 leading-5">
                {rawContent.split('\n').map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              {/* Text Area */}
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                spellCheck={false}
                wrap="off"
                rows={Math.max(25, rawContent.split('\n').length + 2)}
                className="w-full bg-transparent p-3 outline-none resize-none font-mono text-xs leading-5 focus:ring-0 selection:bg-indigo-500/30 overflow-x-auto"
                style={{
                  tabSize: 2,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }}
              />
            </div>
          </div>

          {/* Help tip */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {language === 'bg'
                ? 'Съвет: Можеш директно да променяш, добавяш или премахваш настройки. При натискане на "Запази server.properties", файлът се презаписва на диска.'
                : 'Tip: You can directly edit, add, or delete properties. Clicking "Save server.properties" writes the changes directly to disk.'}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* 6 Sub-Tabs Navigation Grid */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 rounded-2xl border ${
            theme === 'light'
              ? 'bg-slate-100/90 border-slate-200 shadow-inner'
              : 'bg-slate-900/60 border-white/[0.08] backdrop-blur-xl'
          }`}>
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? theme === 'light'
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80 font-bold'
                        : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-950/40 glow-ice font-bold'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : theme === 'light'
                      ? 'bg-white shadow-xs text-slate-700'
                      : 'bg-white/[0.06] text-slate-300'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.colorClass}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">
                      {t(tab.labelKey)}
                    </div>
                    <div className={`text-[10px] truncate ${
                      isActive
                        ? 'text-white/80'
                        : theme === 'light'
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ================= 1. SUB-TAB: VISUAL & BRANDING ================= */}
          {subTab === 'visual' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Server Icon & Multiplayer Realistic Item Preview */}
              <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <ImageIcon className="w-4 h-4 text-cyan-500" />
                    {t('settings.iconSection')}
                  </span>
                  <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('settings.iconHelp')}
                  </span>
                </div>

                {/* Realistic Minecraft Multiplayer Server Item Preview */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  theme === 'light'
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-950/50 border-white/[0.08]'
                }`}>
                  <div className="flex items-center gap-4">
                    {/* 64x64 Icon Box */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-16 h-16 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 shadow-inner group cursor-pointer relative transition-all ${
                        theme === 'light'
                          ? 'bg-slate-100 border-slate-300 hover:border-cyan-500'
                          : 'bg-slate-950 border-white/[0.15] hover:border-cyan-400'
                      }`}
                      title={t('settings.changeIcon')}
                    >
                      {serverIcon ? (
                        <img
                          src={serverIcon}
                          alt="Server Icon"
                          className="w-full h-full object-cover [image-rendering:pixelated]"
                        />
                      ) : (
                        <div className={`flex flex-col items-center justify-center transition-colors ${
                          theme === 'light' ? 'text-slate-400 group-hover:text-cyan-600' : 'text-slate-500 group-hover:text-cyan-400'
                        }`}>
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[9px] font-mono mt-0.5">64x64</span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-cyan-300 text-[10px] font-bold transition-opacity">
                        {t('settings.changeIcon')}
                      </div>
                    </div>

                    {/* Server Text Preview */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm font-sans tracking-wide ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          {server.name}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          theme === 'light'
                            ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold'
                            : 'bg-white/[0.04] text-cyan-300 border-white/[0.08]'
                        }`}>
                          {server.version}
                        </span>
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {parsedMotdLines.map((lineSegments, lineIdx) => (
                          <div key={lineIdx} className="text-xs font-mono tracking-tight whitespace-pre truncate max-w-[420px]">
                            {lineSegments.map((seg, segIdx) => (
                              <span
                                key={segIdx}
                                style={{
                                  color: seg.color || undefined,
                                  fontWeight: seg.bold ? 'bold' : 'normal',
                                  fontStyle: seg.italic ? 'italic' : 'normal',
                                  textDecoration: [
                                    (seg.underline || (seg as any).underlined) ? 'underline' : '',
                                    seg.strikethrough ? 'line-through' : '',
                                  ].filter(Boolean).join(' ') || undefined,
                                }}
                              >
                                {seg.text}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right side of preview: Slots & Ping */}
                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${
                        theme === 'light' ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        0 / {settings.maxPlayers}
                      </span>
                      <span className={`text-[10px] block ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                      }`}>{t('common.players').toLowerCase()}</span>
                    </div>

                    {/* 5-bar Minecraft signal icon */}
                    <div className="flex items-end gap-0.5 h-4 text-emerald-500" title={t('settings.pingExcellent')}>
                      <span className="w-1 h-1.5 bg-emerald-500 rounded-xs"></span>
                      <span className="w-1 h-2.5 bg-emerald-500 rounded-xs"></span>
                      <span className="w-1 h-3.5 bg-emerald-500 rounded-xs"></span>
                      <span className="w-1 h-4 bg-emerald-500 rounded-xs"></span>
                    </div>

                    {/* Action Buttons */}
                    <div className={`flex items-center gap-1.5 pl-2 border-l ${
                      theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs btn-bounce ${
                          theme === 'light'
                            ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/30'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t('settings.changeIcon')}</span>
                      </button>

                      {serverIcon && (
                        <button
                          type="button"
                          onClick={handleRemoveIcon}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer btn-bounce ${
                            theme === 'light'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title={t('settings.removeIcon')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dedicated MOTD Designer with Color Palette and Special Symbols */}
                <MotdEditor
                  value={settings.motd}
                  onChange={(newMotd) => setSettings({ ...settings, motd: newMotd })}
                />

                <p className={`text-[11px] leading-relaxed ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {t('settings.iconTip')}
                </p>
              </div>

              {/* Slots / Max Players Selector */}
              <div className={`p-4 rounded-2xl space-y-3 border shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'glass-card'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-bold flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                    }`}>
                      <Users className="w-4 h-4 text-sky-500" />
                      {t('settings.maxPlayersTitle')}
                    </span>
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('settings.maxPlayersDesc', { max: settings.maxPlayers })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={settings.maxPlayers}
                      onChange={(e) => setSettings({ ...settings, maxPlayers: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className={`w-20 px-3 py-1.5 rounded-xl text-sm font-black text-center font-mono focus:outline-none border ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-sky-700 focus:border-sky-500 shadow-xs'
                          : 'glass-input text-sky-400 focus:border-sky-400'
                      }`}
                    />
                    <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {language === 'bg' ? 'слота' : 'slots'}
                    </span>
                  </div>
                </div>

                {/* Quick Slot Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[4, 8, 10, 20, 50, 100].map((slotCount) => (
                    <button
                      key={slotCount}
                      type="button"
                      onClick={() => setSettings({ ...settings, maxPlayers: slotCount })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                        settings.maxPlayers === slotCount
                          ? theme === 'light'
                            ? 'bg-sky-100 border-sky-400 text-sky-900 shadow-xs font-bold'
                            : 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                          : theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                      }`}
                    >
                      {slotCount} {t('common.players').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hide Online Players */}
              <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-xs ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'glass-card'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {language === 'bg' ? 'Скрий Играчите в Списъка (Hide Online Players)' : 'Hide Online Players'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'bg' ? 'Скрива имената на играчите при задържане на мишката върху сървъра в мултиплейър менюто' : 'Hides player names from multiplayer server list hover'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, hideOnlinePlayers: !settings.hideOnlinePlayers })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    settings.hideOnlinePlayers
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                  }`}
                >
                  {settings.hideOnlinePlayers ? t('common.yes') : t('common.no')}
                </button>
              </div>

              {/* Minecraft Card Theme Picker */}
              <div className={`p-5 rounded-2xl space-y-3.5 border shadow-xs ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                    }`}>
                      <Palette className="w-4 h-4 text-amber-500" />
                      {language === 'bg' ? 'Тема на картичката (Minecraft Theme)' : 'Server Card Theme'}
                    </span>
                    <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg'
                        ? 'Персонализирайте стила и фона на картичката на този сървър в главното меню.'
                        : 'Choose a themed Minecraft background for this server card in the library.'}
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-500">
                    {THEME_CONFIGS[cardTheme]?.nameBg || cardTheme}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                  {(Object.keys(THEME_CONFIGS) as CardTheme[]).map((themeKey) => {
                    const cfg = THEME_CONFIGS[themeKey];
                    const isSelected = cardTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => handleSelectTheme(themeKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                            : theme === 'light'
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          {cfg.textureUrl ? (
                            <div
                              className="w-7 h-7 rounded-lg border shrink-0 shadow-xs relative overflow-hidden"
                              style={{
                                backgroundImage: `url(${cfg.textureUrl})`,
                                backgroundSize: '28px 28px',
                                backgroundRepeat: 'repeat',
                                imageRendering: 'pixelated',
                              }}
                            />
                          ) : (
                            <div
                              className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.previewGradient} border shrink-0 shadow-xs`}
                            />
                          )}
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold truncate">
                          {language === 'bg' ? cfg.nameBg : cfg.nameEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minecraft Card Pixel-Art Icon Picker */}
              <div className={`p-5 rounded-2xl space-y-3.5 border shadow-xs ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                    }`}>
                      <Sparkles className="w-4 h-4 text-cyan-500" />
                      {language === 'bg' ? 'Иконка на картичката (Pixel-Art Icon)' : 'Server Card Icon'}
                    </span>
                    <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg'
                        ? 'Изберете емблематична пиксел-арт Minecraft иконка за визуализация на картичката.'
                        : 'Choose an iconic pixel-art Minecraft badge to display on the card.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                  {[
                    { id: 'default' as CardIcon, label: language === 'bg' ? 'По подразбиране' : 'Default' },
                    { id: 'grass' as CardIcon, label: language === 'bg' ? 'Grass Block' : 'Grass Block' },
                    { id: 'diamond' as CardIcon, label: language === 'bg' ? 'Диамант' : 'Diamond' },
                    { id: 'sword' as CardIcon, label: language === 'bg' ? 'Меч' : 'Sword' },
                    { id: 'pickaxe' as CardIcon, label: language === 'bg' ? 'Кирка' : 'Pickaxe' },
                    { id: 'creeper' as CardIcon, label: language === 'bg' ? 'Creeper' : 'Creeper' },
                    { id: 'tnt' as CardIcon, label: language === 'bg' ? 'TNT' : 'TNT' },
                    { id: 'nether_star' as CardIcon, label: language === 'bg' ? 'Nether Star' : 'Nether Star' },
                    { id: 'ender_pearl' as CardIcon, label: language === 'bg' ? 'Ender Pearl' : 'Ender Pearl' },
                    { id: 'steve' as CardIcon, label: language === 'bg' ? 'Steve' : 'Steve' },
                  ].map((item) => {
                    const isSelected = cardIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCardIcon(item.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/30 shadow-md font-bold'
                            : theme === 'light'
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                        }`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          <MinecraftCardIcon icon={item.id} customIconUrl={serverIcon} size={24} />
                        </div>
                        <span className="text-[11px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= 2. SUB-TAB: GAMEPLAY & RULES ================= */}
          {subTab === 'gameplay' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Hardcore Mode Card */}
              <div
                className={`p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-2xl ${
                  settings.hardcore
                    ? theme === 'light'
                      ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
                      : 'bg-gradient-to-r from-rose-950/40 via-slate-950/70 to-slate-950/70 border-rose-500/40 glow-crimson shadow-2xl'
                    : theme === 'light'
                    ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                    : 'glass-card hover:border-white/[0.15]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        settings.hardcore
                          ? 'bg-rose-600/30 border-rose-400 text-rose-400 shadow-lg shadow-rose-950/50'
                          : theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      <Skull className={`w-6 h-6 ${settings.hardcore ? 'text-rose-400 animate-pulse' : ''}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-extrabold tracking-wide ${
                          settings.hardcore
                            ? theme === 'light' ? 'text-rose-950' : 'text-rose-200'
                            : theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                        }`}>
                          {t('settings.hardcoreTitle')}
                        </span>
                        {settings.hardcore && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse">
                            {language === 'bg' ? '1 Живот • Без Възраждане' : '1 Life • Permadeath'}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed max-w-xl ${
                        theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        {t('settings.hardcoreDesc')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !settings.hardcore;
                      setSettings({
                        ...settings,
                        hardcore: nextVal,
                        difficulty: nextVal ? 'hard' : settings.difficulty,
                      });
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border shrink-0 cursor-pointer flex items-center gap-2 ${
                      settings.hardcore
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-950/40'
                        : theme === 'light'
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.1] hover:border-white/[0.2]'
                    }`}
                  >
                    {settings.hardcore ? (
                      <>
                        <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                        <span>{t('settings.hardcoreTitle')}</span>
                      </>
                    ) : (
                      <>
                        <Skull className={`w-4 h-4 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <span>{language === 'bg' ? 'Включи Hardcore' : 'Enable Hardcore'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Core Gameplay Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div
                  className={`p-4 rounded-xl border space-y-2 transition-all ${
                    settings.hardcore
                      ? theme === 'light'
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-rose-950/20 border-rose-500/30'
                      : theme === 'light'
                      ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                      : 'glass-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                    }`}>{t('settings.difficulty')}</label>
                    {settings.hardcore && (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3 text-rose-500" />
                        {language === 'bg' ? 'Заключено на Hard (Hardcore)' : 'Locked to Hard (Hardcore)'}
                      </span>
                    )}
                  </div>
                  <select
                    value={settings.difficulty}
                    disabled={settings.hardcore}
                    onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none cursor-pointer border ${
                      settings.hardcore
                        ? 'border-rose-300 text-rose-700 bg-rose-50/50 cursor-not-allowed opacity-80'
                        : theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 shadow-xs'
                        : 'glass-input text-slate-200 focus:border-amber-400'
                    }`}
                  >
                    <option value="peaceful">{t('settings.diffPeaceful')}</option>
                    <option value="easy">{t('settings.diffEasy')}</option>
                    <option value="normal">{t('settings.diffNormal')}</option>
                    <option value="hard">{t('settings.diffHard')}</option>
                  </select>
                </div>

                {/* Gamemode */}
                <div className={`p-4 rounded-xl space-y-2 border ${
                  theme === 'light'
                    ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                    : 'glass-card'
                }`}>
                  <label className={`text-xs font-bold ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                  }`}>{t('settings.gamemode')}</label>
                  <select
                    value={settings.gamemode}
                    onChange={(e) => setSettings({ ...settings, gamemode: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none cursor-pointer border ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 shadow-xs'
                        : 'glass-input text-slate-200 focus:border-purple-400'
                    }`}
                  >
                    <option value="survival">{t('settings.gmSurvival')}</option>
                    <option value="creative">{t('settings.gmCreative')}</option>
                    <option value="adventure">{t('settings.gmAdventure')}</option>
                    <option value="spectator">{t('settings.gmSpectator')}</option>
                  </select>
                </div>

                {/* Force Gamemode */}
                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  theme === 'light' ? 'bg-slate-50/80 border-slate-200 shadow-xs' : 'glass-card'
                }`}>
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-slate-300'}`}>
                      {t('settings.forceGamemodeTitle')}
                      <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono ml-2 font-normal">✨ {language === 'bg' ? 'Ново' : 'New'}</span>
                    </span>
                    <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('settings.forceGamemodeDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, forceGamemode: !settings.forceGamemode })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                      settings.forceGamemode
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                    }`}
                  >
                    {settings.forceGamemode ? t('common.yes') : t('common.no')}
                  </button>
                </div>

                {/* PvP */}
                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  theme === 'light'
                    ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                    : 'glass-card'
                }`}>
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                    }`}>
                      <Swords className="w-4 h-4 text-rose-500" /> {t('settings.pvp')}
                    </span>
                    <p className={`text-[11px] ${
                      theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {settings.pvp ? t('settings.pvpEnabled') : t('settings.pvpDisabled')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, pvp: !settings.pvp })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      settings.pvp
                        ? theme === 'light'
                          ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {settings.pvp ? t('common.yes') : t('common.no')}
                  </button>
                </div>
              </div>

              {/* Spawn Protection Card */}
              <div className={`p-4 rounded-2xl space-y-3 border shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'glass-card'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className={`text-sm font-bold flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                    }`}>
                      <Shield className="w-4 h-4 text-amber-500" />
                      {t('settings.spawnProtection')}
                    </span>
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg'
                        ? 'Радиус в блокове около началната точка (Spawn), в който обикновените играчи без OP права не могат да чупят или строят'
                        : 'Radius in blocks around spawn where non-OP players cannot place or break blocks'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={settings.spawnProtection}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          spawnProtection: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className={`w-20 px-3 py-1.5 rounded-xl text-sm font-black text-center font-mono focus:outline-none border ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-amber-700 focus:border-amber-500 shadow-xs'
                          : 'glass-input text-amber-400 focus:border-amber-400'
                      }`}
                    />
                    <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {language === 'bg' ? 'блока' : 'blocks'}
                    </span>
                  </div>
                </div>

                {/* Quick Spawn Protection Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { value: 0, label: language === 'bg' ? '0 (Изключена - свободно строителство)' : '0 (Disabled - free building)' },
                    { value: 16, label: language === 'bg' ? '16 (Minecraft Стандарт)' : '16 (Minecraft Standard)' },
                    { value: 32, label: language === 'bg' ? '32 (Средна зона)' : '32 (Medium Area)' },
                    { value: 64, label: language === 'bg' ? '64 (Голяма зона)' : '64 (Large Area)' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setSettings({ ...settings, spawnProtection: preset.value })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                        settings.spawnProtection === preset.value
                          ? theme === 'light'
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs font-bold'
                            : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Mechanics & Spawning Grid */}
              <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <Zap className="w-4 h-4 text-amber-500" />
                    {language === 'bg' ? 'Механики & Спавн на Същества' : 'Mechanics & Mob Spawning'}
                  </span>
                  <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Летене, Недър, мобове и команди' : 'Flight, Nether, entities & AFK'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Allow Flight */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Позволи Летене' : 'Allow Flight'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Без кик при Elytra/модове' : 'Prevents flying kick'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, allowFlight: !settings.allowFlight })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.allowFlight
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.allowFlight ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Allow Nether */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Достъп до Недър' : 'Allow Nether'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Портали към Ада' : 'Enable Nether dimension'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, allowNether: !settings.allowNether })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.allowNether
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.allowNether ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Enable Command Blocks */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Командни Блокове' : 'Command Blocks'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Активира командни блокове' : 'Enable command blocks'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, enableCommandBlock: !settings.enableCommandBlock })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.enableCommandBlock
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.enableCommandBlock ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Spawn NPCs */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Селяни (NPCs)' : 'Spawn Villagers'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Търговия и села' : 'Spawn NPC villagers'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, spawnNpcs: !settings.spawnNpcs })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.spawnNpcs
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.spawnNpcs ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Spawn Animals */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Животни (Animals)' : 'Spawn Animals'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Крави, прасета, овце' : 'Passive mob spawning'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, spawnAnimals: !settings.spawnAnimals })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.spawnAnimals
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.spawnAnimals ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Spawn Monsters */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Чудовища (Monsters)' : 'Spawn Monsters'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Зомбита, крийпъри' : 'Hostile mob spawning'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, spawnMonsters: !settings.spawnMonsters })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.spawnMonsters
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.spawnMonsters ? t('common.yes') : t('common.no')}
                    </button>
                  </div>
                </div>

                {/* Player Idle Timeout */}
                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                }`}>
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      <Clock className="w-4 h-4 text-amber-500" />
                      {language === 'bg' ? 'Автоматичен AFK Кик (Минути)' : 'AFK Idle Timeout (Minutes)'}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {language === 'bg' ? '0 = изключено (играчите никога не се изгонват при неактивност)' : '0 = disabled (players are never kicked for AFK)'}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={settings.playerIdleTimeout}
                    onChange={(e) => setSettings({ ...settings, playerIdleTimeout: parseInt(e.target.value, 10) || 0 })}
                    className={`w-24 px-3 py-1.5 rounded-lg text-xs font-mono text-center border outline-none ${
                      theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/[0.08] text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= 3. SUB-TAB: WORLD GENERATION ================= */}
          {subTab === 'world' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <Globe className="w-4 h-4 text-emerald-500" />
                    {language === 'bg' ? 'Генерация на Света (World Generation)' : 'World Generation & Biomes'}
                  </span>
                  <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Seed, тип на света и структури' : 'Seed, level type & structures'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Level Seed */}
                  <div className={`p-4 rounded-xl space-y-1.5 border ${
                    theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
                  }`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                    }`}>
                      <Compass className="w-4 h-4 text-emerald-500" />
                      {language === 'bg' ? 'Светлинен Сийд (Level Seed)' : 'World Seed'}
                    </span>
                    <input
                      type="text"
                      value={settings.levelSeed}
                      onChange={(e) => setSettings({ ...settings, levelSeed: e.target.value })}
                      placeholder={language === 'bg' ? 'Празно = случаен сийд...' : 'Leave empty for random...'}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono border outline-none ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-black/30 border-white/[0.08] text-white'
                      }`}
                    />
                    <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg' ? '* Важи само за нови светове или след ресет' : '* Applies when generating new chunks'}
                    </p>
                  </div>

                  {/* Level Type */}
                  <div className={`p-4 rounded-xl space-y-1.5 border ${
                    theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
                  }`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                    }`}>
                      <Mountain className="w-4 h-4 text-emerald-500" />
                      {language === 'bg' ? 'Тип на Терена (Level Type)' : 'World Type'}
                    </span>
                    <select
                      value={settings.levelType}
                      onChange={(e) => setSettings({ ...settings, levelType: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg text-xs border outline-none cursor-pointer ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-800'
                          : 'bg-slate-950 border-white/[0.08] text-slate-200'
                      }`}
                    >
                      <option value="minecraft:normal">{language === 'bg' ? 'Стандартен (Normal)' : 'Normal'}</option>
                      <option value="minecraft:flat">{language === 'bg' ? 'Плосък (Superflat)' : 'Flat'}</option>
                      <option value="minecraft:large_biomes">{language === 'bg' ? 'Големи биоми (Large Biomes)' : 'Large Biomes'}</option>
                      <option value="minecraft:amplified">{language === 'bg' ? 'Екстремни планини (Amplified)' : 'Amplified'}</option>
                    </select>
                  </div>

                  {/* Generate Structures */}
                  <div className={`p-4 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                      }`}>
                        <Building className="w-4 h-4 text-emerald-500" />
                        {language === 'bg' ? 'Структури (Села, Крепости)' : 'Generate Structures'}
                      </span>
                      <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {settings.generateStructures ? (language === 'bg' ? 'Включено' : 'Enabled') : (language === 'bg' ? 'Изключено' : 'Disabled')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, generateStructures: !settings.generateStructures })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.generateStructures
                          ? theme === 'light'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : theme === 'light'
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.generateStructures ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* Max World Size */}
                  <div className={`p-4 rounded-xl space-y-1.5 border ${
                    theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
                  }`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                    }`}>
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                      {language === 'bg' ? 'Граница на Света (Border Radius)' : 'World Border Size'}
                    </span>
                    <input
                      type="number"
                      value={settings.maxWorldSize}
                      onChange={(e) => setSettings({ ...settings, maxWorldSize: parseInt(e.target.value, 10) || 29999984 })}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono border outline-none ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-black/30 border-white/[0.08] text-white'
                      }`}
                    />
                    <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {language === 'bg' ? 'Максимален радиус в блокове (default: 29999984)' : 'Max radius in blocks'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. SUB-TAB: PERFORMANCE & RAM ================= */}
          {subTab === 'performance' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Hardware Resources & Limits (RAM & Storage) */}
              <div className={`p-5 rounded-2xl border space-y-5 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'glass-card'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className={`text-sm font-bold flex items-center gap-2 ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                      <Cpu className="w-4 h-4 text-purple-500" />
                      {t('settings.hardwareTitle')}
                    </span>
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('settings.hardwareSubtitle')}
                    </p>
                  </div>
                  {systemTotalRamGb > 0 && (
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border self-start sm:self-auto ${
                      theme === 'light'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                        : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    }`}>
                      {t('settings.ramHost', { total: Math.round(systemTotalRamGb), free: Math.round(systemFreeRamGb) })}
                    </span>
                  )}
                </div>

                {/* 1. RAM Allocation Control */}
                <div className={`p-4 rounded-xl border space-y-3 shadow-xs ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-white/[0.06]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                      }`}>
                        <Cpu className="w-3.5 h-3.5 text-purple-500" />
                        {t('settings.ramTitle')}
                      </span>
                      <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t('settings.ramDesc')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={Math.min(64, Math.max(16, Math.floor(systemTotalRamGb)))}
                        value={settings.allocatedRamGb}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            allocatedRamGb: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className={`w-20 px-3 py-1.5 rounded-xl text-sm font-black text-center font-mono focus:outline-none border ${
                          theme === 'light'
                            ? 'bg-white border-slate-300 text-purple-700 focus:border-purple-500 shadow-xs'
                            : 'glass-input text-purple-400 focus:border-purple-400'
                        }`}
                      />
                      <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                        GB RAM
                      </span>
                    </div>
                  </div>

                  {/* RAM Range Slider */}
                  <input
                    type="range"
                    min="1"
                    max={Math.min(32, Math.max(12, Math.floor(systemTotalRamGb)))}
                    step="1"
                    value={settings.allocatedRamGb}
                    onChange={(e) => setSettings({ ...settings, allocatedRamGb: parseInt(e.target.value, 10) })}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-600 ${
                      theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                    }`}
                  />

                  {/* Quick RAM Presets */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[2, 4, 6, 8, 12, 16].map((ramOption) => (
                      <button
                        key={ramOption}
                        type="button"
                        onClick={() => setSettings({ ...settings, allocatedRamGb: ramOption })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer btn-bounce ${
                          settings.allocatedRamGb === ramOption
                            ? theme === 'light'
                              ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-xs font-bold'
                              : 'bg-purple-500/25 border-purple-400/50 text-purple-200 glow-purple font-bold'
                            : theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ramOption} GB
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Disk Storage Quota Slider */}
                <div className={`p-4 rounded-xl border shadow-xs ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-white/[0.06]'
                }`}>
                  <StorageSlider
                    storageQuotaGb={settings.storageQuotaGb}
                    onChange={(val) => setSettings({ ...settings, storageQuotaGb: val })}
                  />
                </div>
              </div>

              {/* Render & Simulation Limits */}
              <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <Sliders className="w-4 h-4 text-sky-500" />
                    {language === 'bg' ? 'Дистанция & Мрежови Лимити' : 'Render & Simulation Distance'}
                  </span>
                  <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'View distance, симулация и пакети' : 'View distance, simulation & sync'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* View Distance */}
                  <div className={`p-4 rounded-xl space-y-2 border ${
                    theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'glass-card'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                      }`}>
                        <Eye className="w-4 h-4 text-teal-500" /> {t('settings.viewDistance')}
                      </span>
                      <span className={`text-xs font-bold font-mono ${
                        theme === 'light' ? 'text-teal-700' : 'text-teal-400'
                      }`}>
                        {settings.viewDistance} {language === 'bg' ? 'чанка' : 'chunks'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="16"
                      step="1"
                      value={settings.viewDistance}
                      onChange={(e) => setSettings({ ...settings, viewDistance: parseInt(e.target.value, 10) })}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-teal-500 ${
                        theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'
                      }`}
                    />
                    <div className={`flex justify-between text-[10px] font-mono ${
                      theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      <span>4</span>
                      <span>8</span>
                      <span>12</span>
                      <span>16</span>
                    </div>
                  </div>

                  {/* Simulation Distance */}
                  <div className={`p-4 rounded-xl space-y-2 border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Дистанция на симулация' : 'Simulation Distance'}
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {settings.simulationDistance} {language === 'bg' ? 'чанка' : 'chunks'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="24"
                      value={settings.simulationDistance}
                      onChange={(e) => setSettings({ ...settings, simulationDistance: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      {language === 'bg' ? 'Колко далече работят ферми и се движат мобове' : 'Distance in chunks where entities and farms update'}
                    </p>
                  </div>

                  {/* Entity Broadcast Range */}
                  <div className={`p-4 rounded-xl space-y-2 border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Обхват на мобовете' : 'Entity Broadcast Range'}
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {settings.entityBroadcastRangePercentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="10"
                      value={settings.entityBroadcastRangePercentage}
                      onChange={(e) => setSettings({ ...settings, entityBroadcastRangePercentage: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      {language === 'bg' ? 'По-ниска стойност намалява натоварването при много животни' : 'Lower values improve FPS on heavy farms'}
                    </p>
                  </div>

                  {/* Sync Chunk Writes */}
                  <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Синхронно Записване (Sync)' : 'Sync Chunk Writes'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'bg' ? 'Максимална защита срещу сривове на диска' : 'Synchronous filesystem flush'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, syncChunkWrites: !settings.syncChunkWrites })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.syncChunkWrites
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.syncChunkWrites ? t('common.yes') : t('common.no')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5. SUB-TAB: SECURITY & NETWORK ================= */}
          {subTab === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Online Mode / Cracked Selector */}
              <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'glass-card'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className={`text-sm font-bold ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                    }`}>{t('settings.crackedTitle')}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {!settings.onlineMode
                      ? t('settings.crackedAllowedDesc')
                      : t('settings.crackedBlockedDesc')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, onlineMode: !settings.onlineMode })}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 cursor-pointer ${
                    !settings.onlineMode
                      ? theme === 'light'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 glow-green'
                      : theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  {!settings.onlineMode ? t('settings.crackedBtnAllowed') : t('settings.crackedBtnBlocked')}
                </button>
              </div>

              {/* Mojang Чат Сигурност (enforceSecureProfile) */}
              <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-xs ${
                theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
              }`}>
                <div>
                  <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    {t('settings.enforceSecureProfileTitle')}
                    <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono ml-2 font-normal">✨ {language === 'bg' ? 'Ново' : 'New'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t('settings.enforceSecureProfileDesc')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, enforceSecureProfile: !settings.enforceSecureProfile })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ml-3 ${
                    settings.enforceSecureProfile
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {settings.enforceSecureProfile
                    ? (language === 'bg' ? 'Включен (Mojang)' : 'Enforced')
                    : (language === 'bg' ? 'Изключен (Съвместим)' : 'Disabled')}
                </button>
              </div>

              {/* Prevent Proxy & VPN Connections */}
              <div className={`p-5 rounded-2xl border space-y-3 shadow-xs ${
                theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      <Shield className="w-4 h-4 text-emerald-400" />
                      {t('settings.preventProxyConnectionsTitle')}
                      <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono ml-2 font-normal">✨ {language === 'bg' ? 'Ново' : 'New'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {t('settings.preventProxyConnectionsDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, preventProxyConnections: !settings.preventProxyConnections })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      settings.preventProxyConnections
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                    }`}
                  >
                    {settings.preventProxyConnections ? t('common.yes') : t('common.no')}
                  </button>
                </div>

                {/* Explanatory Notice */}
                <div className={`p-3.5 rounded-xl text-[11px] leading-relaxed border space-y-1.5 ${
                  !settings.onlineMode
                    ? theme === 'light'
                      ? 'bg-amber-50 border-amber-300/80 text-amber-950'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">
                        {language === 'bg'
                          ? 'Сървърът е в режим за пиратски акаунти (online-mode=false):'
                          : 'Server is running in offline/cracked mode (online-mode=false):'}
                      </p>
                      <p>
                        {language === 'bg'
                          ? 'prevent-proxy-connections е официална функция на Mojang. Тя работи само когато сървърът е в Официален режим (online-mode=true). Когато сървърът е пуснат за пиратски акаунти, Minecraft изобщо не пита Mojang за проверка на IP адреса на играча и защитата се пропуска.'
                          : 'prevent-proxy-connections is an official Mojang feature. It only works when the server is in Official mode (online-mode=true). When running in cracked mode, Minecraft does not check player IP addresses with Mojang, so proxy protection is skipped.'}
                      </p>
                      <p className="text-[10px] opacity-80 pt-0.5">
                        {language === 'bg'
                          ? '💡 Забележка при Playit.gg / Локална игра: Тунелите препращат пакетите през локален агент (127.0.0.1), поради което за сървъра играчите изглеждат като локални връзки.'
                          : '💡 Note on Playit.gg / Local play: Tunnels route traffic through a local agent (127.0.0.1), so players appear to the server as loopback connections.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Watchdog Crash Protection (max-tick-time) */}
              <div className={`p-4 rounded-2xl space-y-2 border ${
                theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      {t('settings.maxTickTimeTitle')}
                      <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono ml-2 font-normal">✨ {language === 'bg' ? 'Ново' : 'New'}</span>
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t('settings.maxTickTimeDesc')}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {settings.maxTickTime === -1 ? (language === 'bg' ? 'Изключен (-1)' : 'Disabled (-1)') : `${settings.maxTickTime} ms`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.maxTickTime}
                    onChange={(e) => setSettings({ ...settings, maxTickTime: parseInt(e.target.value, 10) || -1 })}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono border outline-none ${
                      theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/[0.08] text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, maxTickTime: -1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                      settings.maxTickTime === -1
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bg' ? 'Изключи (-1)' : 'Disable (-1)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, maxTickTime: 60000 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                      settings.maxTickTime === 60000
                        ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    60000 ms (Default)
                  </button>
                </div>
              </div>

              {/* RCON Remote Protocol */}
              <div className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-900/40 border-white/[0.08] backdrop-blur-xl shadow-lg'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <Lock className="w-4 h-4 text-purple-400" />
                    {language === 'bg' ? 'Отдалечена Конзола (RCON Remote Access)' : 'RCON Remote Protocol'}
                  </span>
                  <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {language === 'bg' ? 'Дистанционни команди през мрежата' : 'Remote server console access'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Enable RCON */}
                  <div className={`p-4 rounded-xl flex items-center justify-between border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <div>
                      <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                        {language === 'bg' ? 'Активирай RCON' : 'Enable RCON'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {settings.enableRcon ? (language === 'bg' ? 'Портът е отворен' : 'Active') : (language === 'bg' ? 'Изключен' : 'Disabled')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, enableRcon: !settings.enableRcon })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        settings.enableRcon
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {settings.enableRcon ? t('common.yes') : t('common.no')}
                    </button>
                  </div>

                  {/* RCON Port */}
                  <div className={`p-4 rounded-xl space-y-1.5 border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      {language === 'bg' ? 'RCON Порт' : 'RCON Port'}
                    </span>
                    <input
                      type="number"
                      value={settings.rconPort}
                      onChange={(e) => setSettings({ ...settings, rconPort: parseInt(e.target.value, 10) || 25575 })}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono border outline-none ${
                        theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/[0.08] text-white'
                      }`}
                    />
                  </div>

                  {/* RCON Password */}
                  <div className={`p-4 rounded-xl space-y-1.5 border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'glass-card'
                  }`}>
                    <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                      {language === 'bg' ? 'RCON Парола' : 'RCON Password'}
                    </span>
                    <input
                      type="password"
                      value={settings.rconPassword}
                      onChange={(e) => setSettings({ ...settings, rconPassword: e.target.value })}
                      placeholder="Secret password..."
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono border outline-none ${
                        theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/30 border-white/[0.08] text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 6. SUB-TAB: VERSION UPGRADER ================= */}
          {subTab === 'version' && (
            <VersionUpgraderTab server={server} onUpdateServer={onUpdateServer} />
          )}

          {/* ================= SHARED FOOTER: RESTART NOTICE ================= */}
          {server.status === 'running' ? (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              theme === 'light'
                ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {language === 'bg'
                    ? 'Важно за новите настройки и снимката на сървъра:'
                    : 'Important for new settings and server icon:'}
                </p>
                <p className={`text-[11px] leading-relaxed ${
                  theme === 'light' ? 'text-amber-800' : 'text-amber-300/80'
                }`}>
                  {language === 'bg'
                    ? 'Vanilla Minecraft чете лимита на чанковете (View Distance) и снимката на сървъра (server-icon.png) само при стартиране. Рестартирай сървъра (Спиране и повторно Стартиране), за да се заредят в играта.'
                    : 'Minecraft loads view distance and server-icon.png only during server startup. Restart the server (Stop and then Start) for changes to appear in-game.'}
                </p>
              </div>
            </div>
          ) : (
            <p className={`text-[11px] pt-1 ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {language === 'bg'
                ? '* Забележка: Новите настройки и снимката ще влязат в сила веднага при следващото стартиране на сървъра.'
                : '* Note: New settings and server icon will take effect upon the next server start.'}
            </p>
          )}
        </>
      )}

      {/* ================= FLOATING TOAST NOTIFICATION (PORTAL) ================= */}
      {showToast &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-6 right-6 z-[99999] max-w-sm rounded-2xl p-4 border shadow-2xl backdrop-blur-2xl flex items-center gap-3.5 select-none transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto ${
              theme === 'light'
                ? 'bg-white/95 border-emerald-300 text-slate-900 shadow-xl shadow-slate-400/20'
                : 'bg-slate-950/95 border-emerald-500/40 text-slate-100 shadow-2xl shadow-emerald-950/60 glow-green'
            }`}
          >
            {/* Glowing Icon Badge */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              theme === 'light'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs'
                : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}>
              <CheckCircle2 className="w-5 h-5 animate-in zoom-in-50 duration-200" />
            </div>

            {/* Text details */}
            <div className="min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold truncate">
                  {toastDetails.title || t('settings.toastSavedTitle')}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className={`text-[11px] leading-tight mt-0.5 ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {toastDetails.message || t('settings.toastSavedDesc')}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowToast(false)}
              className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                theme === 'light'
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>,
          document.body
        )}
    </form>
  );
};

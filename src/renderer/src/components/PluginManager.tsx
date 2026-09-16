import React, { useState, useEffect } from 'react';
import {
  Download,
  FolderOpen,
  Trash2,
  CheckCircle2,
  Sparkles,
  Box,
  Shield,
  Zap,
  Smartphone,
  ExternalLink,
  Globe,
  Palette,
  AlertTriangle,
  Flame,
  Layers,
  Package,
  Save,
  Check,
  Plus,
  PowerOff,
  Radio,
  FileArchive,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';
import { translations, TranslationKey } from '../i18n/translations';

interface InstalledPlugin {
  name: string;
  fileName: string;
  sizeMb: number;
  lastModified: string;
}

interface CuratedPlugin {
  id: string;
  name: string;
  description: string;
  category: 'crossplay' | 'admin' | 'performance' | 'tools' | 'customization';
  recommended: boolean;
  fileName: string;
}

export interface SavedResourcePack {
  id: string;
  name: string;
  url: string;
  sha1?: string;
  required: boolean;
  prompt?: string;
  addedAt: string;
}

interface PluginManagerProps {
  server: ServerProfile;
}

export const PluginManager: React.FC<PluginManagerProps> = ({ server }) => {
  const { t, language } = useLanguage();
  const { showConfirm, showAlert } = useDialog();
  const [subTab, setSubTab] = useState<'plugins' | 'resourcepacks'>('plugins');
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [curated, setCurated] = useState<CuratedPlugin[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Server properties state for active resource pack
  const [activePackUrl, setActivePackUrl] = useState('');
  const [activePackSha1, setActivePackSha1] = useState('');
  const [activePackRequired, setActivePackRequired] = useState(false);
  const [activePackPrompt, setActivePackPrompt] = useState('');

  // Resource Pack Library
  const [savedPacks, setSavedPacks] = useState<SavedResourcePack[]>([]);

  // Form for adding a new pack
  const [newPack, setNewPack] = useState({
    name: '',
    url: '',
    required: false,
    prompt: '',
    sha1: '',
  });
  const [savingAction, setSavingAction] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const getPluginName = (plugin: CuratedPlugin) => {
    const key = `plugins.plugin.${plugin.id}.name` as TranslationKey;
    return translations[language][key] || plugin.name;
  };

  const getPluginDesc = (plugin: CuratedPlugin) => {
    const key = `plugins.plugin.${plugin.id}.desc` as TranslationKey;
    return translations[language][key] || plugin.description;
  };

  const loadData = async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const [inst, cur, props, library] = await Promise.all([
        api.getInstalledPlugins(server.id),
        api.getCuratedPlugins(),
        api.getServerProperties(server.id),
        api.getSavedResourcePacks(server.id),
      ]);

      setInstalled(inst || []);
      setCurated(cur || []);

      const propUrl = props?.resourcePack || '';
      const propSha1 = props?.resourcePackSha1 || '';
      const propReq = !!props?.requireResourcePack;
      const propPrompt = props?.resourcePackPrompt || '';

      setActivePackUrl(propUrl);
      setActivePackSha1(propSha1);
      setActivePackRequired(propReq);
      setActivePackPrompt(propPrompt);

      let libList: SavedResourcePack[] = library || [];

      // If server.properties has a pack not in library, add it automatically so it's displayed
      if (propUrl && !libList.some((p) => p.url === propUrl)) {
        const autoPack: SavedResourcePack = {
          id: 'pack_' + Date.now(),
          name: language === 'bg' ? 'Текущ Сървърен Пакет' : 'Current Server Pack',
          url: propUrl,
          sha1: propSha1,
          required: propReq,
          prompt: propPrompt,
          addedAt: new Date().toISOString(),
        };
        libList = [autoPack, ...libList];
        await api.saveResourcePacksList(server.id, libList);
      }

      setSavedPacks(libList);
    } catch (e) {
      console.error('Failed to load plugin/resource pack data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [server.id]);

  const handleInstall = async (plugin: CuratedPlugin) => {
    const api = (window as any).api;
    if (!api || installingId) return;

    setInstallingId(plugin.id);
    try {
      await api.installCuratedPlugin(server.id, plugin.id);
      await loadData();
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.errorTitle'),
        message: e.message || 'Failed to install plugin.',
        buttonText: t('common.understand'),
      });
    } finally {
      setInstallingId(null);
    }
  };

  const handleDeletePlugin = async (fileName: string) => {
    const confirmed = await showConfirm({
      title: t('dialogs.deletePluginTitle'),
      message: (
        <span>
          {t('dialogs.deletePluginMsg', { name: fileName })}
        </span>
      ),
      confirmText: t('dialogs.deletePluginBtn'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (confirmed) {
      await (window as any).api?.deletePlugin(server.id, fileName);
      await loadData();
    }
  };

  // Activate a specific pack on the server
  const handleActivatePack = async (pack: SavedResourcePack) => {
    const api = (window as any).api;
    if (!api) return;

    setSavingAction(true);
    try {
      await api.saveServerProperties(server.id, {
        resourcePack: pack.url,
        resourcePackSha1: pack.sha1 || '',
        requireResourcePack: pack.required,
        resourcePackPrompt: pack.prompt || '',
      });

      setActivePackUrl(pack.url);
      setActivePackSha1(pack.sha1 || '');
      setActivePackRequired(pack.required);
      setActivePackPrompt(pack.prompt || '');

      setSaveFeedback(`${language === 'bg' ? 'Активиран' : 'Activated'}: ${pack.name}`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.errorTitle'),
        message: e.message || 'Error activating resource pack.',
        buttonText: t('common.understand'),
      });
    } finally {
      setSavingAction(false);
    }
  };

  // Deactivate the active resource pack (removes it from server.properties)
  const handleDeactivatePack = async () => {
    const api = (window as any).api;
    if (!api) return;

    const confirmed = await showConfirm({
      title: t('dialogs.deactivatePackTitle'),
      message: t('dialogs.deactivatePackMsg'),
      confirmText: t('plugins.deactivate'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'warning',
    });

    if (!confirmed) {
      return;
    }

    setSavingAction(true);
    try {
      await api.saveServerProperties(server.id, {
        resourcePack: '',
        resourcePackSha1: '',
        requireResourcePack: false,
        resourcePackPrompt: '',
      });

      setActivePackUrl('');
      setActivePackSha1('');
      setActivePackRequired(false);
      setActivePackPrompt('');

      setSaveFeedback(language === 'bg' ? 'Ресурс пакетът е деактивиран от сървъра.' : 'Resource pack deactivated from server.');
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.errorTitle'),
        message: e.message || 'Error deactivating pack.',
        buttonText: t('common.understand'),
      });
    } finally {
      setSavingAction(false);
    }
  };

  // Add a new pack to the library and activate it
  const handleAddNewPack = async (e: React.FormEvent) => {
    e.preventDefault();
    const api = (window as any).api;
    if (!api) return;

    if (!newPack.url.trim()) {
      await showAlert({
        type: 'warning',
        title: t('dialogs.warningTitle'),
        message: language === 'bg'
          ? 'Моля, въведи директен линк за сваляне на .zip файла на ресурс пакета!'
          : 'Please enter a direct download link for the .zip resource pack file!',
        buttonText: t('common.understand'),
      });
      return;
    }

    setSavingAction(true);
    try {
      const packName = newPack.name.trim() || `${language === 'bg' ? 'Ресурс Пакет' : 'Resource Pack'} #${savedPacks.length + 1}`;
      const packItem: SavedResourcePack = {
        id: 'pack_' + Date.now(),
        name: packName,
        url: newPack.url.trim(),
        required: newPack.required,
        prompt: newPack.prompt.trim(),
        sha1: newPack.sha1.trim(),
        addedAt: new Date().toISOString(),
      };

      const updatedList = [packItem, ...savedPacks.filter((p) => p.url !== packItem.url)];
      await api.saveResourcePacksList(server.id, updatedList);
      setSavedPacks(updatedList);

      // Also set it as the active server pack immediately
      await api.saveServerProperties(server.id, {
        resourcePack: packItem.url,
        resourcePackSha1: packItem.sha1 || '',
        requireResourcePack: packItem.required,
        resourcePackPrompt: packItem.prompt || '',
      });

      setActivePackUrl(packItem.url);
      setActivePackSha1(packItem.sha1 || '');
      setActivePackRequired(packItem.required);
      setActivePackPrompt(packItem.prompt || '');

      setNewPack({
        name: '',
        url: '',
        required: false,
        prompt: '',
        sha1: '',
      });

      setSaveFeedback(`${language === 'bg' ? 'Успешно запазен и активиран' : 'Successfully saved and activated'}: ${packName}!`);
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.errorTitle'),
        message: e.message || 'Error saving resource pack.',
        buttonText: t('common.understand'),
      });
    } finally {
      setSavingAction(false);
    }
  };

  // Delete pack from library
  const handleDeleteFromLibrary = async (packId: string) => {
    const api = (window as any).api;
    if (!api) return;

    const target = savedPacks.find((p) => p.id === packId);
    if (!target) return;

    const confirmed = await showConfirm({
      title: t('dialogs.confirmTitle'),
      message: (
        <span>
          {language === 'bg'
            ? `Сигурен ли си, че искаш да премахнеш "${target.name}" от списъка със запазени ресурс пакети?`
            : `Are you sure you want to remove "${target.name}" from your saved resource packs?`}
        </span>
      ),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      danger: true,
      icon: 'trash',
    });

    if (confirmed) {
      const updated = savedPacks.filter((p) => p.id !== packId);
      await api.saveResourcePacksList(server.id, updated);
      setSavedPacks(updated);

      // If the deleted one was currently active, prompt or keep
      if (activePackUrl === target.url) {
        const deactivateConfirmed = await showConfirm({
          title: t('dialogs.deactivatePackTitle'),
          message: language === 'bg'
            ? 'Този пакет в момента е активен на сървъра. Искаш ли да го изключиш и от настройките (server.properties)?'
            : 'This pack is currently active on the server. Do you also want to remove it from server.properties?',
          confirmText: t('plugins.deactivate'),
          cancelText: language === 'bg' ? 'Остави го включен' : 'Keep it active',
          danger: false,
          icon: 'warning',
        });

        if (deactivateConfirmed) {
          handleDeactivatePack();
        }
      }
    }
  };

  const isInstalled = (fileName: string) => {
    return installed.some((i) => i.fileName.toLowerCase() === fileName.toLowerCase());
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'crossplay':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'performance':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'customization':
        return <Palette className="w-4 h-4 text-pink-400" />;
      default:
        return <Box className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="h-full glass-panel rounded-2xl p-6 overflow-y-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-400" />
            {t('plugins.title')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('plugins.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (window as any).api?.openPluginsFolder(server.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all border border-white/[0.08] shadow-sm cursor-pointer"
            title={t('plugins.openPluginsFolder')}
          >
            <FolderOpen className="w-4 h-4 text-purple-400" />
            <span>plugins</span>
          </button>

          <button
            type="button"
            onClick={() => (window as any).api?.openResourcePacksFolder(server.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all border border-white/[0.08] shadow-sm cursor-pointer"
            title={t('plugins.openPacksFolder')}
          >
            <FolderOpen className="w-4 h-4 text-pink-400" />
            <span>resourcepacks</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center gap-2 p-1 glass-card rounded-xl border border-white/[0.08] w-fit">
        <button
          type="button"
          onClick={() => setSubTab('plugins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'plugins'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-sm shadow-purple-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className={`w-3.5 h-3.5 ${subTab === 'plugins' ? 'text-purple-400' : 'text-slate-400'}`} />
          <span>{t('plugins.tabPlugins')} ({installed.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('resourcepacks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'resourcepacks'
              ? 'bg-pink-500/20 text-pink-200 border border-pink-400/40 shadow-sm shadow-pink-950/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className={`w-3.5 h-3.5 ${subTab === 'resourcepacks' ? 'text-pink-400' : 'text-slate-400'}`} />
          <span>{t('plugins.tabPacks')} ({savedPacks.length})</span>
          {activePackUrl && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Feedback Banner */}
      {saveFeedback && (
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-400/30 text-purple-200 text-xs font-bold flex items-center gap-2 backdrop-blur-xl animate-in fade-in">
          <Check className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* ===================== TAB 1: PLUGINS ===================== */}
      {subTab === 'plugins' && (
        <div className="space-y-6">
          {server.software === 'vanilla' ? (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-200">
                  {language === 'bg'
                    ? 'Препоръчаните плъгини са скрити, защото сървърът е на ядро Vanilla'
                    : 'Recommended plugins are hidden because the server engine is Vanilla'}
                </span>
              </div>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {language === 'bg'
                  ? 'Официалният чист Vanilla Minecraft не поддържа плъгини от папка plugins/. Затова бутоните за инсталиране на плъгини са деактивирани тук.'
                  : 'Official pure Vanilla Minecraft does not load plugins from plugins/. Therefore plugin installation is disabled here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  {t('plugins.curatedTitle')}
                </span>
                <span className="text-[11px] text-slate-500">{t('plugins.curatedDesc')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {curated.map((plugin) => {
                  const installedState = isInstalled(plugin.fileName);
                  const isProcessing = installingId === plugin.id;

                  return (
                    <div
                      key={plugin.id}
                      className="p-4 rounded-2xl glass-card hover:border-white/[0.15] flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(plugin.category)}
                            <span className="font-extrabold text-sm text-slate-100">{getPluginName(plugin)}</span>
                          </div>
                          {plugin.recommended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 font-bold">
                              {language === 'bg' ? 'Топ избор' : 'Top Choice'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{getPluginDesc(plugin)}</p>
                      </div>

                      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">{plugin.fileName}</span>

                        {installedState ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('plugins.installed')}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInstall(plugin)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-950/40 glow-ice disabled:opacity-50 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {isProcessing ? t('plugins.installing') : t('plugins.install')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Installed Plugins List */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('plugins.installedTitle')} ({installed.length})
              </span>
              <span className="text-[11px] text-slate-500">
                {language === 'bg'
                  ? 'За да добавиш други плъгини, просто ги пусни в папка plugins'
                  : 'To add other plugins, simply drop them into the plugins folder'}
              </span>
            </div>

            {installed.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                {t('plugins.noInstalled')}
              </div>
            ) : (
              <div className="space-y-2">
                {installed.map((item) => (
                  <div
                    key={item.fileName}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-emerald-400">
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-200">{item.fileName}</span>
                        <span className="text-[11px] text-slate-500 ml-3">({item.sizeMb} MB)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePlugin(item.fileName)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Online Repositories & Mods Directory */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                {language === 'bg' ? 'Търси още добавки и ресурси онлайн' : 'Search more plugins and resources online'}
              </span>
              <span className="text-[11px] text-slate-500">
                {language === 'bg' ? 'Свали .jar файл и го пусни в папката' : 'Download .jar file and drop it in plugins/'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* CurseForge */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://www.curseforge.com/minecraft')}
                className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-orange-300">CurseForge</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bg' ? 'Хиляди популярни плъгини, текстури и модификации.' : 'Thousands of popular plugins, textures, and mods.'}
                  </p>
                </div>
                <span className="text-[10px] text-orange-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  curseforge.com &rarr;
                </span>
              </button>

              {/* Modrinth */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://modrinth.com/plugins')}
                className="p-3.5 rounded-xl glass-card hover:border-sky-400/40 hover:bg-sky-500/5 transition-all text-left group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">Modrinth</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bg' ? 'Модерен, бърз каталог с отворен код за плъгини и оптимизации.' : 'Modern, fast open-source catalog for plugins and optimizations.'}
                  </p>
                </div>
                <span className="text-[10px] text-sky-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  modrinth.com &rarr;
                </span>
              </button>

              {/* SpigotMC */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://www.spigotmc.org/resources/')}
                className="p-3.5 rounded-xl glass-card hover:border-sky-400/40 hover:bg-sky-500/5 transition-all text-left group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">SpigotMC</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bg' ? 'Класически ресурси, мини-игри, икономика и сървърни инструменти.' : 'Classic server resources, minigames, economy, and tools.'}
                  </p>
                </div>
                <span className="text-[10px] text-amber-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  spigotmc.org &rarr;
                </span>
              </button>

              {/* Hangar */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://hangar.papermc.io/')}
                className="p-3.5 rounded-xl glass-card hover:border-sky-400/40 hover:bg-sky-500/5 transition-all text-left group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300">Hangar (PaperMC)</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === 'bg' ? 'Официален портал на PaperMC за проверени и безопасни добавки.' : 'Official PaperMC portal for verified and secure plugins.'}
                  </p>
                </div>
                <span className="text-[10px] text-sky-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  hangar.papermc.io &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: RESOURCE PACKS ===================== */}
      {subTab === 'resourcepacks' && (
        <div className="space-y-6">
          {/* 1. CURRENT ACTIVE STATUS CARD */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              activePackUrl
                ? 'bg-gradient-to-r from-pink-950/40 via-slate-950/70 to-slate-950/70 border-pink-400/40 shadow-lg shadow-pink-950/30 backdrop-blur-xl'
                : 'glass-card'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activePackUrl ? 'bg-pink-500/20 text-pink-300' : 'bg-white/[0.04] text-slate-400'
                  }`}
                >
                  <Palette className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-100">
                      {activePackUrl
                        ? (language === 'bg' ? '🟢 Активен Сървърен Ресурс Пакет' : '🟢 Active Server Resource Pack')
                        : (language === 'bg' ? '⚪ Няма активен ресурс пакет' : '⚪ No Active Resource Pack')}
                    </h4>
                    {activePackUrl && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-400/30 font-mono">
                        {language === 'bg' ? 'Записан в server.properties' : 'Saved in server.properties'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activePackUrl
                      ? t('plugins.activePackDesc')
                      : (language === 'bg'
                          ? 'Сървърът в момента изпраща обикновените стандартни Minecraft текстури.'
                          : 'The server currently serves default standard Minecraft textures.')}
                  </p>
                </div>
              </div>

              {activePackUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => (window as any).api?.openExternal(activePackUrl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                    title={language === 'bg' ? 'Свали и провери файла' : 'Download and verify link'}
                  >
                    <Download className="w-3.5 h-3.5 text-pink-400" />
                    <span>{language === 'bg' ? 'Тествай линка' : 'Test URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivatePack}
                    disabled={savingAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
                    title={t('plugins.deactivate')}
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>{t('plugins.deactivate')}</span>
                  </button>
                </div>
              )}
            </div>

            {activePackUrl && (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {language === 'bg' ? 'Директен линк:' : 'Direct URL:'}
                  </span>
                  <p className="font-mono text-slate-200 text-[11px] truncate" title={activePackUrl}>
                    {activePackUrl}
                  </p>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {language === 'bg' ? 'Задължителен за играчите:' : 'Required for players:'}
                  </span>
                  <span className={`font-bold text-[11px] ${activePackRequired ? 'text-amber-400' : 'text-pink-300'}`}>
                    {activePackRequired
                      ? (language === 'bg' ? '🔒 ДА (Задължителен)' : '🔒 YES (Required)')
                      : (language === 'bg' ? '🟢 НЕ (По избор на играча)' : '🟢 NO (Optional)')}
                  </span>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {language === 'bg' ? 'Съобщение при запитване:' : 'Join Prompt Message:'}
                  </span>
                  <span className="text-slate-200 text-[11px] italic">
                    {activePackPrompt || (language === 'bg' ? 'Стандартно питане от Minecraft' : 'Default Minecraft prompt')}
                  </span>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {language === 'bg' ? 'Кеш Хеш (SHA-1):' : 'Cache Hash (SHA-1):'}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px] truncate block" title={activePackSha1 || 'Automatic'}>
                    {activePackSha1 ? `${activePackSha1.slice(0, 16)}...` : (language === 'bg' ? 'Автоматичен кеш' : 'Automatic cache')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. RESOURCE PACKS LIBRARY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileArchive className="w-3.5 h-3.5 text-pink-400" />
                  {t('plugins.savedPacksLibrary')} ({savedPacks.length})
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'bg'
                    ? 'Можеш да запазваш множество пакети и да ги сменяш с 1 клик'
                    : 'Save multiple resource packs and switch between them in 1-click'}
                </p>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {savedPacks.length} {language === 'bg' ? 'добавени' : 'saved'}
              </span>
            </div>

            {savedPacks.length === 0 ? (
              <div className="p-6 rounded-2xl glass-card border border-dashed border-white/[0.1] text-center text-xs text-slate-400">
                {t('plugins.noPacks')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedPacks.map((pack) => {
                  const isActive = activePackUrl === pack.url;

                  return (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isActive
                          ? 'glass-card border-pink-400/60 shadow-md shadow-pink-950/40 ring-1 ring-pink-400/30'
                          : 'glass-card hover:border-white/[0.15]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Palette className={`w-4 h-4 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                            <span className="font-extrabold text-sm text-slate-100">{pack.name}</span>
                          </div>

                          {isActive ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/40 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {t('plugins.activeBadge')}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                              {language === 'bg' ? 'В наличност' : 'Saved'}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-mono text-slate-400 truncate mb-2" title={pack.url}>
                          🔗 {pack.url}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-4">
                          <span className="px-2 py-0.5 rounded-md glass-card">
                            {pack.required
                              ? (language === 'bg' ? '🔒 Задължителен' : '🔒 Required')
                              : (language === 'bg' ? '🟢 По избор' : '🟢 Optional')}
                          </span>
                          {pack.prompt && (
                            <span className="px-2 py-0.5 rounded-md glass-card truncate max-w-[200px]" title={pack.prompt}>
                              💬 {pack.prompt}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => (window as any).api?.openExternal(pack.url)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all cursor-pointer"
                            title={language === 'bg' ? 'Свали пакета за тест' : 'Download pack'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFromLibrary(pack.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                            title={t('plugins.deletePack')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isActive ? (
                          <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {language === 'bg' ? 'Зареден на сървъра' : 'Loaded on Server'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivatePack(pack)}
                            disabled={savingAction}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs transition-all shadow-md shadow-pink-950/40 cursor-pointer disabled:opacity-50"
                          >
                            <Radio className="w-3 h-3" />
                            <span>{t('plugins.activate')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. ADD NEW RESOURCE PACK FORM */}
          <form
            onSubmit={handleAddNewPack}
            className="p-5 rounded-2xl glass-card space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-400" />
                {t('plugins.addNewPack')}
              </span>
              <span className="text-[11px] text-slate-500">
                {language === 'bg' ? 'Ще бъде добавен към списъка и активиран веднага' : 'Will be saved and activated immediately'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  {t('plugins.packNameLabel')}
                </label>
                <input
                  type="text"
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  placeholder={t('plugins.packNamePlaceholder')}
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-400"
                />
              </div>

              {/* Direct Download URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{t('plugins.packUrlLabel')} *</span>
                  <span className="text-[10px] text-pink-400 font-mono">.zip URL</span>
                </label>
                <input
                  type="url"
                  required
                  value={newPack.url}
                  onChange={(e) => setNewPack({ ...newPack, url: e.target.value })}
                  placeholder="https://download.mc-packs.net/pack/...zip"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Require Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{t('plugins.requirePack')}</label>
                <button
                  type="button"
                  onClick={() => setNewPack({ ...newPack, required: !newPack.required })}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    newPack.required
                      ? 'bg-pink-500/20 border-pink-400/50 text-pink-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {newPack.required
                    ? (language === 'bg' ? '🔒 Задължителен' : '🔒 Required')
                    : (language === 'bg' ? '🟢 По избор' : '🟢 Optional')}
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">{t('plugins.packPromptLabel')}</label>
                <input
                  type="text"
                  value={newPack.prompt}
                  onChange={(e) => setNewPack({ ...newPack, prompt: e.target.value })}
                  placeholder={t('plugins.packPromptPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 focus:outline-none focus:border-pink-400"
                />
              </div>

              {/* SHA-1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">SHA-1 Hash</label>
                <input
                  type="text"
                  value={newPack.sha1}
                  onChange={(e) => setNewPack({ ...newPack, sha1: e.target.value })}
                  placeholder="40-char sha1 code"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 font-mono focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <p className="text-[11px] text-slate-400">
                {language === 'bg'
                  ? '* При Vanilla сървър направи рестарт (Спри 🛑 и Пусни ▶️), за да влезе новият пакет в сила.'
                  : '* For Vanilla servers, restart (Stop 🛑 and Start ▶️) to apply the resource pack in-game.'}
              </p>

              <button
                type="submit"
                disabled={savingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-pink-950/50 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{t('plugins.saveAndActivate')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

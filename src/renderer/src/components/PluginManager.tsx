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
  Search,
  Lock,
  Link,
  MessageSquare,
  HardDrive,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
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

  // Modrinth Resource Packs
  const [modrinthPacks, setModrinthPacks] = useState<any[]>([]);
  const [modrinthSearch, setModrinthSearch] = useState<string>('');
  const [loadingModrinthPacks, setLoadingModrinthPacks] = useState<boolean>(false);
  const [installingPackId, setInstallingPackId] = useState<string | null>(null);

  // Modrinth Plugins
  const [modrinthPlugins, setModrinthPlugins] = useState<any[]>([]);
  const [modrinthPluginSearch, setModrinthPluginSearch] = useState<string>('');
  const [loadingModrinthPlugins, setLoadingModrinthPlugins] = useState<boolean>(false);
  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null);
  const [selectedPluginVersions, setSelectedPluginVersions] = useState<Record<string, any>>({});
  const [loadedPluginVersions, setLoadedPluginVersions] = useState<Record<string, any[]>>({});
  const [loadingPluginVersionsFor, setLoadingPluginVersionsFor] = useState<string | null>(null);

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

  const loadModrinthPacks = async (query = '') => {
    setLoadingModrinthPacks(true);
    try {
      const api = (window as any).api;
      if (api?.searchModrinthResourcePacks) {
        const results = await api.searchModrinthResourcePacks(query, 16);
        setModrinthPacks(results);
      }
    } catch (err) {
      console.error('Failed to load Modrinth resource packs', err);
    } finally {
      setLoadingModrinthPacks(false);
    }
  };

  const loadModrinthPlugins = async (query = '') => {
    if (server.software === 'vanilla') return;
    setLoadingModrinthPlugins(true);
    try {
      const api = (window as any).api;
      if (api?.searchModrinthPlugins) {
        const results = await api.searchModrinthPlugins(query, 18, server.software);
        setModrinthPlugins(results || []);
      }
    } catch (err) {
      console.error('Failed to load Modrinth plugins:', err);
    } finally {
      setLoadingModrinthPlugins(false);
    }
  };

  const handleFetchPluginVersions = async (projectIdOrSlug: string) => {
    if (loadedPluginVersions[projectIdOrSlug]) return;
    setLoadingPluginVersionsFor(projectIdOrSlug);
    try {
      const api = (window as any).api;
      if (api?.getModrinthProjectVersions) {
        const loaders = server.software === 'fabric' ? ['fabric'] : ['paper', 'spigot', 'purpur', 'bukkit'];
        const versions = await api.getModrinthProjectVersions(projectIdOrSlug, loaders, server.version);
        setLoadedPluginVersions((prev) => ({ ...prev, [projectIdOrSlug]: versions || [] }));
        if (versions && versions.length > 0 && !selectedPluginVersions[projectIdOrSlug]) {
          setSelectedPluginVersions((prev) => ({ ...prev, [projectIdOrSlug]: versions[0] }));
        }
      }
    } catch (err) {
      console.error('Failed to load plugin versions:', err);
    } finally {
      setLoadingPluginVersionsFor(null);
    }
  };

  const handleInstallModrinthPlugin = async (plugin: any) => {
    const api = (window as any).api;
    if (!api) return;

    setInstallingPluginId(plugin.id);
    try {
      let chosenVersion = selectedPluginVersions[plugin.id];
      if (!chosenVersion) {
        const loaders = server.software === 'fabric' ? ['fabric'] : ['paper', 'spigot', 'purpur', 'bukkit'];
        const versions = await api.getModrinthProjectVersions(plugin.id, loaders, server.version);
        if (versions && versions.length > 0) {
          chosenVersion = versions[0];
          setSelectedPluginVersions((prev) => ({ ...prev, [plugin.id]: versions[0] }));
        }
      }

      if (!chosenVersion || !chosenVersion.file?.url) {
        throw new Error(
          language === 'bg'
            ? 'Не беше открит файл за сваляне за тази версия.'
            : 'No download file found for this version.'
        );
      }

      const fileName = chosenVersion.file.filename || `${plugin.slug}.jar`;
      await api.installRemotePlugin(server.id, chosenVersion.file.url, fileName);

      setSaveFeedback(
        language === 'bg'
          ? `Плъгин ${plugin.title} беше успешно инсталиран!`
          : `Plugin ${plugin.title} was installed successfully!`
      );
      setTimeout(() => setSaveFeedback(null), 3000);
      await loadData();
    } catch (err: any) {
      await showAlert({
        type: 'error',
        title: language === 'bg' ? 'Грешка при инсталация' : 'Installation Error',
        message: err.message || 'Failed to install plugin from Modrinth',
        buttonText: t('common.understand'),
      });
    } finally {
      setInstallingPluginId(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [server.id, server.software]);

  // Debounced search for Modrinth plugins & mods
  useEffect(() => {
    const timer = setTimeout(() => {
      loadModrinthPlugins(modrinthPluginSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [modrinthPluginSearch, server.software]);

  // Debounced search for Modrinth resource packs
  useEffect(() => {
    const timer = setTimeout(() => {
      loadModrinthPacks(modrinthSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [modrinthSearch]);

  const handleApplyModrinthPack = async (pack: any) => {
    const api = (window as any).api;
    if (!api?.getModrinthPackFile) return;
    setInstallingPackId(pack.id);
    try {
      const fileInfo = await api.getModrinthPackFile(pack.id);
      if (fileInfo?.url) {
        await api.saveServerProperties(server.id, {
          resourcePack: fileInfo.url,
          resourcePackSha1: fileInfo.sha1 || '',
          requireResourcePack: false,
          resourcePackPrompt: `Textures for ${pack.title}`,
        });
        setActivePackUrl(fileInfo.url);
        setActivePackSha1(fileInfo.sha1 || '');
        setActivePackRequired(false);
        setActivePackPrompt(`Textures for ${pack.title}`);

        const alreadyInLibrary = savedPacks.some((p) => p.url === fileInfo.url);
        if (!alreadyInLibrary) {
          const newEntry: SavedResourcePack = {
            id: 'pack_' + Date.now(),
            name: pack.title,
            url: fileInfo.url,
            sha1: fileInfo.sha1 || '',
            required: false,
            prompt: `Textures for ${pack.title}`,
            addedAt: new Date().toISOString(),
          };
          const updatedList = [newEntry, ...savedPacks];
          setSavedPacks(updatedList);
          await api.saveResourcePacksList(server.id, updatedList);
        }
        setSaveFeedback(language === 'bg' ? `Активиран: ${pack.title}!` : `Activated: ${pack.title}!`);
        setTimeout(() => setSaveFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to apply modrinth pack', err);
    } finally {
      setInstallingPackId(null);
    }
  };

  const handleDownloadModrinthPack = async (pack: any) => {
    const api = (window as any).api;
    if (!api?.getModrinthPackFile || !api?.installRemoteResourcePack) return;
    setInstallingPackId(pack.id);
    try {
      const fileInfo = await api.getModrinthPackFile(pack.id);
      if (fileInfo?.url && fileInfo?.filename) {
        await api.installRemoteResourcePack(server.id, fileInfo.url, fileInfo.filename);
        setSaveFeedback(language === 'bg' ? `Свален в папка resourcepacks!` : `Downloaded to resourcepacks folder!`);
        setTimeout(() => setSaveFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to download modrinth pack', err);
    } finally {
      setInstallingPackId(null);
    }
  };

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
    <div className={`h-full rounded-2xl p-6 overflow-y-auto space-y-6 ${
      theme === 'light' ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel'
    }`}>
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
      }`}>
        <div>
          <h3 className={`text-lg font-black flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            <Package className="w-5 h-5 text-purple-500" />
            {t('plugins.title')}
          </h3>
          <p className={`text-xs mt-0.5 ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {t('plugins.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (window as any).api?.openPluginsFolder(server.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
            }`}
            title={t('plugins.openPluginsFolder')}
          >
            <FolderOpen className="w-4 h-4 text-purple-500" />
            <span>plugins</span>
          </button>

          <button
            type="button"
            onClick={() => (window as any).api?.openResourcePacksFolder(server.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
            }`}
            title={t('plugins.openPacksFolder')}
          >
            <FolderOpen className="w-4 h-4 text-pink-500" />
            <span>resourcepacks</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Pill Switcher */}
      <div className={`flex items-center gap-2 p-1 rounded-xl border w-fit ${
        theme === 'light'
          ? 'bg-slate-100 border-slate-200'
          : 'glass-card border-white/[0.08]'
      }`}>
        <button
          type="button"
          onClick={() => setSubTab('plugins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'plugins'
              ? theme === 'light'
                ? 'bg-white text-purple-900 border border-slate-200 shadow-xs'
                : 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-sm shadow-purple-950/40'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className={`w-3.5 h-3.5 ${subTab === 'plugins' ? (theme === 'light' ? 'text-purple-600' : 'text-purple-400') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`} />
          <span>{t('plugins.tabPlugins')} ({installed.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('resourcepacks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'resourcepacks'
              ? theme === 'light'
                ? 'bg-white text-pink-900 border border-slate-200 shadow-xs'
                : 'bg-pink-500/20 text-pink-200 border border-pink-400/40 shadow-sm shadow-pink-950/40'
              : theme === 'light'
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className={`w-3.5 h-3.5 ${subTab === 'resourcepacks' ? (theme === 'light' ? 'text-pink-600' : 'text-pink-400') : (theme === 'light' ? 'text-slate-500' : 'text-slate-400')}`} />
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
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-xl animate-in fade-in border ${
          theme === 'light'
            ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-xs'
            : 'bg-purple-950/40 border-purple-400/30 text-purple-200'
        }`}>
          <Check className="w-4 h-4 text-purple-500 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* ===================== TAB 1: PLUGINS ===================== */}
      {subTab === 'plugins' && (
        <div className="space-y-6">
          {server.software === 'vanilla' ? (
            <div className={`p-6 rounded-2xl space-y-3 border ${
              theme === 'light'
                ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-amber-900' : 'text-amber-200'}`}>
                  {language === 'bg'
                    ? 'Препоръчаните плъгини са скрити, защото сървърът е на ядро Vanilla'
                    : 'Recommended plugins are hidden because the server engine is Vanilla'}
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-amber-800' : 'text-amber-300/80'}`}>
                {language === 'bg'
                  ? 'Официалният чист Vanilla Minecraft не поддържа плъгини от папка plugins/. Затова бутоните за инсталиране на плъгини са деактивирани тук.'
                  : 'Official pure Vanilla Minecraft does not load plugins from plugins/. Therefore plugin installation is disabled here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  {t('plugins.curatedTitle')}
                </span>
                <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('plugins.curatedDesc')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {curated.map((plugin) => {
                  const installedState = isInstalled(plugin.fileName);
                  const isProcessing = installingId === plugin.id;

                  return (
                    <div
                      key={plugin.id}
                      className={`p-4 rounded-2xl flex flex-col justify-between transition-all border ${
                        theme === 'light'
                          ? 'bg-slate-50/80 border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md'
                          : 'glass-card hover:border-white/[0.15]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(plugin.category)}
                            <span className={`font-extrabold text-sm ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>{getPluginName(plugin)}</span>
                          </div>
                          {plugin.recommended && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              theme === 'light'
                                ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                                : 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                            }`}>
                              {language === 'bg' ? 'Топ избор' : 'Top Choice'}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed mb-4 ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>{getPluginDesc(plugin)}</p>
                      </div>

                      <div className={`pt-2 border-t flex items-center justify-between ${
                        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
                      }`}>
                        <span className={`text-[11px] font-mono ${
                          theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                        }`}>{plugin.fileName}</span>

                        {installedState ? (
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${
                            theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
                          }`}>
                            <CheckCircle2 className={`w-4 h-4 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} /> {t('plugins.installed')}
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
          <div className={`space-y-3 pt-4 border-t ${
            theme === 'light' ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-300'
              }`}>
                {t('plugins.installedTitle')} ({installed.length})
              </span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                {language === 'bg'
                  ? 'За да добавиш други плъгини, просто ги пусни в папка plugins'
                  : 'To add other plugins, simply drop them into the plugins folder'}
              </span>
            </div>

            {installed.length === 0 ? (
              <div className={`p-8 rounded-xl border border-dashed text-center text-xs ${
                theme === 'light'
                  ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}>
                {t('plugins.noInstalled')}
              </div>
            ) : (
              <div className="space-y-2">
                {installed.map((item) => (
                  <div
                    key={item.fileName}
                    className={`p-3 rounded-xl flex items-center justify-between border shadow-xs ${
                      theme === 'light'
                        ? 'bg-slate-50/80 border-slate-200'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        theme === 'light'
                          ? 'bg-white border-slate-200 text-emerald-600'
                          : 'bg-slate-900 border-slate-800 text-emerald-400'
                      }`}>
                        <Box className="w-4 h-4" />
                      </div>
                      <div>
                        <span className={`text-xs font-mono font-bold ${
                          theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                        }`}>{item.fileName}</span>
                        <span className={`text-[11px] ml-3 ${
                          theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                        }`}>({item.sizeMb} MB)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePlugin(item.fileName)}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/30'
                      }`}
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= ONLINE MODRINTH PLUGINS EXPLORER ================= */}
          {server.software !== 'vanilla' && (
            <div className={`space-y-4 pt-4 border-t ${
              theme === 'light' ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                  }`}>
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    {t('plugins.onlinePluginsTitle')}
                  </span>
                  <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('plugins.onlinePluginsDesc')}
                  </p>
                </div>

                {/* Search input */}
                <div className="relative min-w-[260px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={modrinthPluginSearch}
                    onChange={(e) => setModrinthPluginSearch(e.target.value)}
                    placeholder={t('plugins.searchPluginsPlaceholder')}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none border ${
                      theme === 'light'
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500 shadow-xs'
                        : 'glass-input text-slate-200 placeholder:text-slate-500 focus:border-purple-400'
                    }`}
                  />
                </div>
              </div>

              {loadingModrinthPlugins ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              ) : modrinthPlugins.length === 0 ? (
                <div className={`p-6 rounded-xl text-center text-xs border border-dashed ${
                  theme === 'light' ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'glass-card text-slate-500'
                }`}>
                  {t('plugins.noResults')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modrinthPlugins.map((plugin) => {
                    const isInstallingThis = installingPluginId === plugin.id;
                    const alreadyInstalled = isInstalled(`${plugin.slug}.jar`) || installed.some((i) => i.name.toLowerCase().includes(plugin.title.toLowerCase()) || i.fileName.toLowerCase().includes(plugin.slug.toLowerCase()));
                    const versions = loadedPluginVersions[plugin.id] || [];
                    const selectedVersion = selectedPluginVersions[plugin.id] || (versions.length > 0 ? versions[0] : null);
                    const isLoadingVer = loadingPluginVersionsFor === plugin.id;

                    return (
                      <div
                        key={plugin.id}
                        className={`p-3.5 rounded-xl flex flex-col justify-between transition-all space-y-3 border ${
                          theme === 'light'
                            ? 'bg-slate-50/80 border-slate-200 shadow-xs hover:border-purple-400 hover:bg-white'
                            : 'glass-card hover:border-purple-400/40'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start gap-2.5">
                            {plugin.iconUrl ? (
                              <img
                                src={plugin.iconUrl}
                                alt={plugin.title}
                                className={`w-10 h-10 rounded-lg object-cover shrink-0 border ${
                                  theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-white/[0.08]'
                                }`}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                                theme === 'light' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-purple-500/10 text-purple-400'
                              }`}>
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h5 className={`font-bold text-xs truncate ${
                                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                              }`} title={plugin.title}>
                                {plugin.title}
                              </h5>
                              <span className={`text-[10px] truncate block ${
                                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                              }`}>
                                {t('modrinth.author')} {plugin.author} • {plugin.downloads?.toLocaleString()} {t('modrinth.downloads')}
                              </span>
                            </div>
                          </div>

                          <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            {plugin.description}
                          </p>

                          {/* Category / Loader Badges */}
                          <div className="flex flex-wrap gap-1">
                            {plugin.categories?.slice(0, 3).map((cat: string) => (
                              <span
                                key={cat}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold border ${
                                  theme === 'light'
                                    ? 'bg-white text-slate-600 border-slate-200'
                                    : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
                                }`}
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Version selector & Actions */}
                        <div className={`pt-2 border-t space-y-2 ${
                          theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
                        }`}>
                          {/* Version picker dropdown */}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold shrink-0 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                              {language === 'bg' ? 'Версия:' : 'Version:'}
                            </span>
                            <div className="flex-1 relative">
                              <select
                                onFocus={() => handleFetchPluginVersions(plugin.id)}
                                onClick={() => handleFetchPluginVersions(plugin.id)}
                                value={selectedVersion?.id || ''}
                                onChange={(e) => {
                                  const targetVer = versions.find((v) => v.id === e.target.value);
                                  if (targetVer) {
                                    setSelectedPluginVersions((prev) => ({ ...prev, [plugin.id]: targetVer }));
                                  }
                                }}
                                className={`w-full py-1 px-2 text-[10px] rounded-lg border font-mono truncate focus:outline-none cursor-pointer ${
                                  theme === 'light'
                                    ? 'bg-white border-slate-200 text-slate-800 focus:border-purple-500 shadow-xs'
                                    : 'glass-input text-slate-200 focus:border-purple-400'
                                }`}
                              >
                                {isLoadingVer ? (
                                  <option value="">{language === 'bg' ? 'Зареждане на версии...' : 'Loading versions...'}</option>
                                ) : versions.length === 0 ? (
                                  <option value="">{language === 'bg' ? 'Последна съвместима' : 'Latest compatible'}</option>
                                ) : (
                                  versions.map((ver) => (
                                    <option key={ver.id} value={ver.id}>
                                      {ver.versionNumber || ver.name} ({ver.loaders?.join(', ')})
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>

                          {/* Action Buttons: Install & Open on Modrinth */}
                          <div className="flex items-center gap-2">
                            {alreadyInstalled ? (
                              <span className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border ${
                                theme === 'light'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                              }`}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{t('plugins.installed')}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInstallModrinthPlugin(plugin)}
                                disabled={isInstallingThis}
                                className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-50 btn-bounce"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{isInstallingThis ? t('plugins.downloadingPlugin') : t('plugins.install')}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => (window as any).api?.openExternal(`https://modrinth.com/plugin/${plugin.slug}`)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                                theme === 'light'
                                  ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-purple-600 border-slate-200 shadow-xs'
                                  : 'glass-card hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]'
                              }`}
                              title={t('plugins.viewOnModrinth')}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Online Repositories & Mods Directory */}
          <div className={`space-y-3 pt-4 border-t ${
            theme === 'light' ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-300'
              }`}>
                <Globe className="w-3.5 h-3.5 text-cyan-500" />
                {language === 'bg' ? 'Търси още добавки и ресурси онлайн' : 'Search more plugins and resources online'}
              </span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                {language === 'bg' ? 'Свали .jar файл и го пусни в папката' : 'Download .jar file and drop it in plugins/'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* CurseForge */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://www.curseforge.com/minecraft')}
                className={`p-3.5 rounded-xl border transition-all text-left group flex flex-col justify-between cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50/70 border-slate-200 hover:border-orange-400 hover:bg-white shadow-xs'
                    : 'bg-slate-950/90 border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                      <span className={`text-xs font-bold group-hover:text-orange-600 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                      }`}>CurseForge</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Хиляди популярни плъгини, текстури и модификации.' : 'Thousands of popular plugins, textures, and mods.'}
                  </p>
                </div>
                <span className="text-[10px] text-orange-600 font-mono mt-3 inline-flex items-center gap-1 font-semibold">
                  curseforge.com &rarr;
                </span>
              </button>

              {/* Modrinth */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://modrinth.com/plugins')}
                className={`p-3.5 rounded-xl border transition-all text-left group flex flex-col justify-between cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50/70 border-slate-200 hover:border-sky-400 hover:bg-white shadow-xs'
                    : 'glass-card hover:border-sky-400/40 hover:bg-sky-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                      <span className={`text-xs font-bold group-hover:text-sky-600 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                      }`}>Modrinth</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Модерен, бърз каталог с отворен код за плъгини и оптимизации.' : 'Modern, fast open-source catalog for plugins and optimizations.'}
                  </p>
                </div>
                <span className="text-[10px] text-sky-600 font-mono mt-3 inline-flex items-center gap-1 font-semibold">
                  modrinth.com &rarr;
                </span>
              </button>

              {/* SpigotMC */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://www.spigotmc.org/resources/')}
                className={`p-3.5 rounded-xl border transition-all text-left group flex flex-col justify-between cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50/70 border-slate-200 hover:border-amber-400 hover:bg-white shadow-xs'
                    : 'glass-card hover:border-amber-400/40 hover:bg-amber-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className={`text-xs font-bold group-hover:text-amber-600 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                      }`}>SpigotMC</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" />
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Класически ресурси, мини-игри, икономика и сървърни инструменти.' : 'Classic server resources, minigames, economy, and tools.'}
                  </p>
                </div>
                <span className="text-[10px] text-amber-600 font-mono mt-3 inline-flex items-center gap-1 font-semibold">
                  spigotmc.org &rarr;
                </span>
              </button>

              {/* Hangar */}
              <button
                type="button"
                onClick={() => (window as any).api?.openExternal('https://hangar.papermc.io/')}
                className={`p-3.5 rounded-xl border transition-all text-left group flex flex-col justify-between cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-50/70 border-slate-200 hover:border-sky-400 hover:bg-white shadow-xs'
                    : 'glass-card hover:border-sky-400/40 hover:bg-sky-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                      <span className={`text-xs font-bold group-hover:text-sky-600 ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                      }`}>Hangar (PaperMC)</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500" />
                  </div>
                  <p className={`text-[11px] leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Официален портал на PaperMC за проверени и безопасни добавки.' : 'Official PaperMC portal for verified and secure plugins.'}
                  </p>
                </div>
                <span className="text-[10px] text-sky-600 font-mono mt-3 inline-flex items-center gap-1 font-semibold">
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
                ? theme === 'light'
                  ? 'bg-white border-2 border-pink-400/90 shadow-md ring-1 ring-pink-200'
                  : 'bg-gradient-to-r from-pink-950/40 via-slate-950/70 to-slate-950/70 border-pink-400/40 shadow-lg shadow-pink-950/30 backdrop-blur-xl'
                : theme === 'light'
                ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                : 'glass-card'
            }`}
          >
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
              theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
            }`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    activePackUrl
                      ? theme === 'light'
                        ? 'bg-pink-100 text-pink-700 border-pink-300'
                        : 'bg-pink-500/20 text-pink-300 border-pink-400/30'
                      : theme === 'light'
                      ? 'bg-white text-slate-400 border-slate-200'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                  }`}
                >
                  <Palette className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-black flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-slate-950' : 'text-slate-100'
                    }`}>
                      {activePackUrl ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                          <span>{language === 'bg' ? 'Активен Сървърен Ресурс Пакет' : 'Active Server Resource Pack'}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                          <span>{language === 'bg' ? 'Няма активен ресурс пакет' : 'No Active Resource Pack'}</span>
                        </>
                      )}
                    </h4>
                    {activePackUrl && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border font-mono ${
                        theme === 'light'
                          ? 'bg-pink-100 text-pink-900 border-pink-300'
                          : 'bg-pink-500/20 text-pink-300 border-pink-400/30'
                      }`}>
                        {language === 'bg' ? 'Записан в server.properties' : 'Saved in server.properties'}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 font-medium ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-400'
                  }`}>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                    }`}
                    title={language === 'bg' ? 'Свали и провери файла' : 'Download and verify link'}
                  >
                    <Download className="w-3.5 h-3.5 text-pink-600" />
                    <span>{language === 'bg' ? 'Тествай линка' : 'Test URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivatePack}
                    disabled={savingAction}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs ${
                      theme === 'light'
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                    title={t('plugins.deactivate')}
                  >
                    <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t('plugins.deactivate')}</span>
                  </button>
                </div>
              )}
            </div>

            {activePackUrl && (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className={`p-3 rounded-xl border shadow-xs ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300' : 'glass-card'
                }`}>
                  <span className={`text-[10px] uppercase font-black block mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Директен линк:' : 'Direct URL:'}
                  </span>
                  <p className={`font-mono text-[11px] truncate font-bold ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                  }`} title={activePackUrl}>
                    {activePackUrl}
                  </p>
                </div>

                <div className={`p-3 rounded-xl border shadow-xs ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300' : 'glass-card'
                }`}>
                  <span className={`text-[10px] uppercase font-black block mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Задължителен за играчите:' : 'Required for players:'}
                  </span>
                  <span className={`font-black text-[11px] flex items-center gap-1 ${
                    activePackRequired
                      ? theme === 'light' ? 'text-amber-800' : 'text-amber-400'
                      : theme === 'light' ? 'text-emerald-800' : 'text-pink-300'
                  }`}>
                    {activePackRequired ? (
                      <>
                        <Lock className="w-3 h-3 inline text-amber-600" />
                        <span>{language === 'bg' ? 'ДА (Задължителен)' : 'YES (Required)'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 inline text-emerald-600" />
                        <span>{language === 'bg' ? 'НЕ (По избор на играча)' : 'NO (Optional)'}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border shadow-xs ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300' : 'glass-card'
                }`}>
                  <span className={`text-[10px] uppercase font-black block mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Съобщение при запитване:' : 'Join Prompt Message:'}
                  </span>
                  <span className={`text-[11px] italic font-semibold ${
                    theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    {activePackPrompt || (language === 'bg' ? 'Стандартно питане от Minecraft' : 'Default Minecraft prompt')}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border shadow-xs ${
                  theme === 'light' ? 'bg-slate-50 border-slate-300' : 'glass-card'
                }`}>
                  <span className={`text-[10px] uppercase font-black block mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {language === 'bg' ? 'Кеш Хеш (SHA-1):' : 'Cache Hash (SHA-1):'}
                  </span>
                  <span className={`font-mono text-[11px] truncate block font-bold ${
                    theme === 'light' ? 'text-slate-800' : 'text-slate-400'
                  }`} title={activePackSha1 || 'Automatic'}>
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
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  <FileArchive className="w-3.5 h-3.5 text-pink-500" />
                  {t('plugins.savedPacksLibrary')} ({savedPacks.length})
                </span>
                <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {language === 'bg'
                    ? 'Можеш да запазваш множество пакети и да ги сменяш с 1 клик'
                    : 'Save multiple resource packs and switch between them in 1-click'}
                </p>
              </div>

              <span className={`text-[11px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                {savedPacks.length} {language === 'bg' ? 'добавени' : 'saved'}
              </span>
            </div>

            {savedPacks.length === 0 ? (
              <div className={`p-6 rounded-2xl border border-dashed text-center text-xs ${
                theme === 'light'
                  ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                  : 'glass-card border-white/[0.1] text-slate-400'
              }`}>
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
                          ? theme === 'light'
                            ? 'bg-pink-50/40 border-pink-400 shadow-xs ring-1 ring-pink-300'
                            : 'glass-card border-pink-400/60 shadow-md shadow-pink-950/40 ring-1 ring-pink-400/30'
                          : theme === 'light'
                          ? 'bg-slate-50/80 border-slate-200 shadow-xs hover:border-slate-300'
                          : 'glass-card hover:border-white/[0.15]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Palette className={`w-4 h-4 ${isActive ? 'text-pink-500' : theme === 'light' ? 'text-slate-400' : 'text-slate-400'}`} />
                            <span className={`font-extrabold text-sm ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`}>{pack.name}</span>
                          </div>

                          {isActive ? (
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                              theme === 'light'
                                ? 'bg-pink-100 text-pink-800 border-pink-300'
                                : 'bg-pink-500/20 text-pink-300 border-pink-400/40'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" /> {t('plugins.activeBadge')}
                            </span>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              theme === 'light'
                                ? 'bg-white text-slate-600 border-slate-200'
                                : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                            }`}>
                              {language === 'bg' ? 'В наличност' : 'Saved'}
                            </span>
                          )}
                        </div>

                        <p className={`text-[11px] font-mono truncate mb-2 flex items-center gap-1.5 ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`} title={pack.url}>
                          <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{pack.url}</span>
                        </p>

                        <div className={`flex flex-wrap items-center gap-2 text-[11px] mb-4 ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                            theme === 'light'
                              ? 'bg-white border-slate-200 shadow-xs'
                              : 'glass-card'
                          }`}>
                            {pack.required ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-500" />
                                <span className={theme === 'light' ? 'text-amber-800 font-semibold' : ''}>{language === 'bg' ? 'Задължителен' : 'Required'}</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className={theme === 'light' ? 'text-emerald-800 font-semibold' : ''}>{language === 'bg' ? 'По избор' : 'Optional'}</span>
                              </>
                            )}
                          </span>
                          {pack.prompt && (
                            <span className={`px-2 py-0.5 rounded-md truncate max-w-[200px] flex items-center gap-1 border ${
                              theme === 'light' ? 'bg-white border-slate-200 shadow-xs text-slate-700' : 'glass-card'
                            }`} title={pack.prompt}>
                              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{pack.prompt}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`pt-3 border-t flex items-center justify-between ${
                        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
                      }`}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => (window as any).api?.openExternal(pack.url)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              theme === 'light'
                                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                            }`}
                            title={language === 'bg' ? 'Свали пакета за тест' : 'Download pack'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFromLibrary(pack.id)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              theme === 'light'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/30'
                            }`}
                            title={t('plugins.deletePack')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isActive ? (
                          <span className={`text-xs font-bold flex items-center gap-1 ${
                            theme === 'light' ? 'text-pink-700' : 'text-pink-400'
                          }`}>
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

          {/* MODRINTH TEXTURE PACKS EXPLORER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  <Palette className="w-4 h-4 text-pink-500" />
                  {t('modrinth.resourcePacksTitle')}
                </span>
                <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('modrinth.resourcePacksSubtitle')}
                </p>
              </div>

              {/* Search bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modrinthSearch}
                  onChange={(e) => setModrinthSearch(e.target.value)}
                  placeholder={t('modrinth.searchResourcePacks')}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500 shadow-xs'
                      : 'glass-input text-slate-200 placeholder:text-slate-500 focus:border-pink-400'
                  }`}
                />
              </div>
            </div>

            {loadingModrinthPacks ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            ) : modrinthPacks.length === 0 ? (
              <div className={`p-6 rounded-xl text-center text-xs border border-dashed ${
                theme === 'light' ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'glass-card text-slate-500'
              }`}>
                {t('modrinth.noResults')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {modrinthPacks.map((pack) => {
                  const isApplying = installingPackId === pack.id;
                  const isAlreadyActive = activePackUrl.includes(pack.id) || activePackUrl.includes(pack.slug);

                  return (
                    <div
                      key={pack.id}
                      className={`p-3.5 rounded-xl flex flex-col justify-between transition-all space-y-3 border ${
                        theme === 'light'
                          ? 'bg-slate-50/80 border-slate-200 shadow-xs hover:border-pink-400 hover:bg-white'
                          : 'glass-card hover:border-pink-400/40'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          {pack.iconUrl ? (
                            <img
                              src={pack.iconUrl}
                              alt={pack.title}
                              className={`w-10 h-10 rounded-lg object-cover shrink-0 border ${
                                theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-white/[0.08]'
                              }`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                              theme === 'light' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-pink-500/10 text-pink-400'
                            }`}>
                              <Palette className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h5 className={`font-bold text-xs truncate ${
                              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                            }`} title={pack.title}>
                              {pack.title}
                            </h5>
                            <span className={`text-[10px] truncate block ${
                              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              {t('modrinth.author')} {pack.author} • {pack.downloads?.toLocaleString()} {t('modrinth.downloads')}
                            </span>
                          </div>
                        </div>

                        <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {pack.description}
                        </p>
                      </div>

                      <div className={`pt-2 border-t flex items-center gap-2 ${
                        theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleApplyModrinthPack(pack)}
                          disabled={isApplying}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 btn-bounce border ${
                            theme === 'light'
                              ? 'bg-pink-100 hover:bg-pink-200 text-pink-900 border-pink-300 shadow-xs'
                              : 'bg-pink-600/20 hover:bg-pink-600/30 text-pink-200 border-pink-500/30'
                          }`}
                        >
                          <Palette className="w-3 h-3 text-pink-500" />
                          <span>{isApplying ? t('common.loading') : isAlreadyActive ? t('plugins.activeBadge') : t('modrinth.applyResourcePack')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadModrinthPack(pack)}
                          disabled={isApplying}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer btn-bounce border ${
                            theme === 'light'
                              ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs'
                              : 'glass-card hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]'
                          }`}
                          title={t('modrinth.downloadToFolder')}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => (window as any).api?.openExternal(`https://modrinth.com/resourcepack/${pack.slug}`)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer border btn-bounce ${
                            theme === 'light'
                              ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-pink-600 border-slate-200 shadow-xs'
                              : 'glass-card hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]'
                          }`}
                          title={t('plugins.viewOnModrinth')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
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
            className={`p-5 rounded-2xl space-y-4 border ${
              theme === 'light'
                ? 'bg-slate-50/80 border-slate-200 shadow-xs'
                : 'glass-card'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${
              theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
            }`}>
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-200'
              }`}>
                <Plus className="w-4 h-4 text-pink-500" />
                {t('plugins.addNewPack')}
              </span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
                {language === 'bg' ? 'Ще бъде добавен към списъка и активиран веднага' : 'Will be saved and activated immediately'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  {t('plugins.packNameLabel')}
                </label>
                <input
                  type="text"
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  placeholder={t('plugins.packNamePlaceholder')}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs focus:outline-none border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500 shadow-xs'
                      : 'glass-input text-slate-200 placeholder:text-slate-600 focus:border-pink-400'
                  }`}
                />
              </div>

              {/* Direct Download URL */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold flex items-center justify-between ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>
                  <span>{t('plugins.packUrlLabel')} *</span>
                  <span className={`text-[10px] font-mono ${theme === 'light' ? 'text-pink-600' : 'text-pink-400'}`}>.zip URL</span>
                </label>
                <input
                  type="url"
                  required
                  value={newPack.url}
                  onChange={(e) => setNewPack({ ...newPack, url: e.target.value })}
                  placeholder="https://download.mc-packs.net/pack/...zip"
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono focus:outline-none border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500 shadow-xs'
                      : 'glass-input text-slate-200 placeholder:text-slate-600 focus:border-pink-400'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Require Toggle */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>{t('plugins.requirePack')}</label>
                <button
                  type="button"
                  onClick={() => setNewPack({ ...newPack, required: !newPack.required })}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    newPack.required
                      ? theme === 'light'
                        ? 'bg-pink-100 border-pink-400 text-pink-900 shadow-xs'
                        : 'bg-pink-500/20 border-pink-400/50 text-pink-200'
                      : theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {newPack.required ? (
                    <span className="flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>{language === 'bg' ? 'Задължителен' : 'Required'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>{language === 'bg' ? 'По избор' : 'Optional'}</span>
                    </span>
                  )}
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>{t('plugins.packPromptLabel')}</label>
                <input
                  type="text"
                  value={newPack.prompt}
                  onChange={(e) => setNewPack({ ...newPack, prompt: e.target.value })}
                  placeholder={t('plugins.packPromptPlaceholder')}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500 shadow-xs'
                      : 'glass-input text-slate-200 focus:border-pink-400'
                  }`}
                />
              </div>

              {/* SHA-1 */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-300'
                }`}>SHA-1 Hash</label>
                <input
                  type="text"
                  value={newPack.sha1}
                  onChange={(e) => setNewPack({ ...newPack, sha1: e.target.value })}
                  placeholder="40-char sha1 code"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none border ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-pink-500 shadow-xs'
                      : 'glass-input text-slate-200 font-mono focus:border-pink-400'
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-3 border-t ${
              theme === 'light' ? 'border-slate-200' : 'border-white/[0.08]'
            }`}>
              <p className={`text-[11px] ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {language === 'bg'
                  ? '* При Vanilla сървър направи рестарт (Спиране и повторно Стартиране), за да влезе новият пакет в сила.'
                  : '* For Vanilla servers, restart (Stop and then Start) to apply the resource pack in-game.'}
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

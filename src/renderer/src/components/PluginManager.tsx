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
          name: 'Текущ Сървърен Пакет',
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
        title: 'Грешка при инсталиране',
        message: e.message || 'Неуспешно инсталиране на плъгина.',
        buttonText: 'Разбрах',
      });
    } finally {
      setInstallingId(null);
    }
  };

  const handleDeletePlugin = async (fileName: string) => {
    const confirmed = await showConfirm({
      title: 'Изтриване на плъгин',
      message: (
        <span>
          Сигурен ли си, че искаш да изтриеш <strong className="text-white font-semibold">"{fileName}"</strong> от сървъра?
        </span>
      ),
      confirmText: 'Изтрий файла',
      cancelText: 'Отказ',
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

      setSaveFeedback(`Активиран: ${pack.name}`);
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: 'Грешка при активиране',
        message: e.message || 'Възникна грешка при активиране на ресурс пакета.',
        buttonText: 'Разбрах',
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
      title: 'Изключване на ресурс пакет',
      message: 'Сигурен ли си, че искаш да изключиш активния ресурс пакет от сървъра? Играчите ще влизат със стандартните текстури.',
      confirmText: 'Изключи пакета',
      cancelText: 'Отказ',
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

      setSaveFeedback('Ресурс пакетът е деактивиран от сървъра.');
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: 'Грешка при деактивиране',
        message: e.message || 'Възникна грешка при деактивиране на пакета.',
        buttonText: 'Разбрах',
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
        title: 'Липсващ линк',
        message: 'Моля, въведи директен линк за сваляне на .zip файла на ресурс пакета!',
        buttonText: 'Разбрах',
      });
      return;
    }

    setSavingAction(true);
    try {
      const packName = newPack.name.trim() || `Ресурс Пакет #${savedPacks.length + 1}`;
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

      setSaveFeedback(`Успешно запазен и активиран: ${packName}!`);
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: 'Грешка при запазване',
        message: e.message || 'Възникна грешка при запазване на ресурс пакета.',
        buttonText: 'Разбрах',
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
      title: 'Премахване на пакет',
      message: (
        <span>
          Сигурен ли си, че искаш да премахнеш <strong className="text-white font-semibold">"{target.name}"</strong> от списъка със запазени ресурс пакети?
        </span>
      ),
      confirmText: 'Премахни пакета',
      cancelText: 'Отказ',
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
          title: 'Деактивиране на пакета',
          message: 'Този пакет в момента е активен на сървъра. Искаш ли да го изключиш и от настройките (server.properties)?',
          confirmText: 'Изключи го',
          cancelText: 'Остави го включен',
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
            Плъгини & Ресурс Пакети
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Управлявай добавките и автоматичните текстурни пакети за всички играчи
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => (window as any).api?.openPluginsFolder(server.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all border border-white/[0.08] shadow-sm cursor-pointer"
            title="Отвори папка за .jar плъгини"
          >
            <FolderOpen className="w-4 h-4 text-purple-400" />
            <span>Папка plugins</span>
          </button>

          <button
            type="button"
            onClick={() => (window as any).api?.openResourcePacksFolder(server.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold transition-all border border-white/[0.08] shadow-sm cursor-pointer"
            title="Отвори папка за локални ресурс пакети"
          >
            <FolderOpen className="w-4 h-4 text-pink-400" />
            <span>Папка resourcepacks</span>
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
          <span>Сървърни Плъгини ({installed.length})</span>
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
          <span>Сървърни Ресурс Пакети ({savedPacks.length})</span>
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
          {/* Curated 1-Click Catalog - Only for non-Vanilla servers (Paper, Purpur, Spigot) */}
          {server.software === 'vanilla' ? (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-200">
                  Препоръчаните плъгини са скрити, защото сървърът е на ядро Vanilla
                </span>
              </div>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Официалният чист <strong>Vanilla</strong> Minecraft не поддържа плъгини от папка <code>plugins/</code>. Затова бутоните за инсталиране на плъгини са деактивирани тук.
              </p>
              <div className="p-3.5 rounded-xl glass-card text-xs text-slate-300 space-y-1.5">
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  💡 Искаш да ползваш SkinsRestorer, Geyser (кросплей) и команди?
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Създай нов сървър от бутона <strong>+ Нов Сървър</strong> и избери софтуер <strong>Paper</strong> или <strong>Purpur</strong>. Те поддържат 100% от тези плъгини с 1 клик, съвместими са с всички обикновени Minecraft клиенти и имат много по-висока производителност!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Препоръчани плъгини за игра с приятели
                </span>
                <span className="text-[11px] text-slate-500">100% съвместими и тествани</span>
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
                            <span className="font-extrabold text-sm text-slate-100">{plugin.name}</span>
                          </div>
                          {plugin.recommended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 font-bold">
                              Топ избор
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{plugin.description}</p>
                      </div>

                      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">{plugin.fileName}</span>

                        {installedState ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Инсталиран
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInstall(plugin)}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-950/40 glow-ice disabled:opacity-50 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {isProcessing ? 'Сваляне...' : 'Инсталирай (1 Клик)'}
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
                Инсталирани файлове в сървъра ({installed.length})
              </span>
              <span className="text-[11px] text-slate-500">
                За да добавиш други плъгини, просто ги пусни в папка plugins
              </span>
            </div>

            {installed.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Все още няма инсталирани плъгини. Избери някой от горния списък или натисни "Папка plugins"!
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
                      title="Изтрий плъгина"
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
                Търси още добавки и ресурси онлайн
              </span>
              <span className="text-[11px] text-slate-500">Свали .jar файл и го пусни в папката</span>
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
                    Хиляди популярни плъгини, текстури и модификации.
                  </p>
                </div>
                <span className="text-[10px] text-orange-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  Отвори curseforge.com &rarr;
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
                    Модерен, бърз каталог с отворен код за плъгини и оптимизации.
                  </p>
                </div>
                <span className="text-[10px] text-sky-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  Отвори modrinth.com &rarr;
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
                    Класически ресурси, мини-игри, икономика и сървърни инструменти.
                  </p>
                </div>
                <span className="text-[10px] text-amber-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  Отвори spigotmc.org &rarr;
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
                    Официален портал на PaperMC за проверени и безопасни добавки.
                  </p>
                </div>
                <span className="text-[10px] text-sky-400/80 font-mono mt-3 inline-flex items-center gap-1">
                  Отвори hangar.papermc.io &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: RESOURCE PACKS ===================== */}
      {subTab === 'resourcepacks' && (
        <div className="space-y-6">
          {/* 1. CURRENT ACTIVE STATUS CARD (WHERE IT SHOWS IT IS SAVED) */}
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
                      {activePackUrl ? '🟢 Активен Сървърен Ресурс Пакет' : '⚪ Няма активен ресурс пакет'}
                    </h4>
                    {activePackUrl && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-400/30 font-mono">
                        Записан в server.properties
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activePackUrl
                      ? 'Всеки играч, който се свърже към сървъра, ще изтегли този пакет автоматично в играта.'
                      : 'Сървърът в момента изпраща обикновените стандартни Minecraft текстури.'}
                  </p>
                </div>
              </div>

              {activePackUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => (window as any).api?.openExternal(activePackUrl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                    title="Свали и провери файла"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-400" />
                    <span>Тествай линка</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivatePack}
                    disabled={savingAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-all cursor-pointer"
                    title="Премахни пакета от сървъра"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Деактивирай</span>
                  </button>
                </div>
              )}
            </div>

            {activePackUrl && (
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Директен линк:</span>
                  <p className="font-mono text-slate-200 text-[11px] truncate" title={activePackUrl}>
                    {activePackUrl}
                  </p>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Задължителен за играчите:</span>
                  <span className={`font-bold text-[11px] ${activePackRequired ? 'text-amber-400' : 'text-pink-300'}`}>
                    {activePackRequired ? '🔒 ДА (Задължителен)' : '🟢 НЕ (По избор на играча)'}
                  </span>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Съобщение при запитване:</span>
                  <span className="text-slate-200 text-[11px] italic">
                    {activePackPrompt || 'Стандартно питане от Minecraft'}
                  </span>
                </div>

                <div className="p-3 rounded-xl glass-card">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Кеш Хеш (SHA-1):</span>
                  <span className="font-mono text-slate-400 text-[11px] truncate block" title={activePackSha1 || 'Не е зададен'}>
                    {activePackSha1 ? `${activePackSha1.slice(0, 16)}...` : 'Автоматичен кеш'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. RESOURCE PACKS LIBRARY (SHOWS ALL ADDED PACKS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileArchive className="w-3.5 h-3.5 text-pink-400" />
                  Запазени Ресурс Пакети в Библиотеката ({savedPacks.length})
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Можеш да запазваш множество пакети и да ги сменяш с 1 клик според това коя игра играете
                </p>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {savedPacks.length} добавени
              </span>
            </div>

            {savedPacks.length === 0 ? (
              <div className="p-6 rounded-2xl glass-card border border-dashed border-white/[0.1] text-center text-xs text-slate-400">
                Все още нямаш запазени ресурс пакети в списъка. Добави първия чрез формата по-долу!
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
                              <CheckCircle2 className="w-3 h-3" /> Активен в момента
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                              В наличност
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-mono text-slate-400 truncate mb-2" title={pack.url}>
                          🔗 {pack.url}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-4">
                          <span className="px-2 py-0.5 rounded-md glass-card">
                            {pack.required ? '🔒 Задължителен' : '🟢 По избор'}
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
                            title="Свали пакета за тест"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFromLibrary(pack.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                            title="Изтрий от списъка"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {isActive ? (
                          <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Зареден на сървъра
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivatePack(pack)}
                            disabled={savingAction}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs transition-all shadow-md shadow-pink-950/40 cursor-pointer disabled:opacity-50"
                          >
                            <Radio className="w-3 h-3" />
                            <span>Активирай на този сървър</span>
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
                Добави нов ресурс пакет чрез линк
              </span>
              <span className="text-[11px] text-slate-500">
                Ще бъде добавен към списъка и активиран веднага
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Име на пакета (за лесно разпознаване)
                </label>
                <input
                  type="text"
                  value={newPack.name}
                  onChange={(e) => setNewPack({ ...newPack, name: e.target.value })}
                  placeholder="напр. Faithful 32x, Bare Bones или PvP Pack"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-pink-400"
                />
              </div>

              {/* Direct Download URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Директен линк за сваляне на .zip файла *</span>
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
                <label className="text-xs font-bold text-slate-300">Задължителен ли е?</label>
                <button
                  type="button"
                  onClick={() => setNewPack({ ...newPack, required: !newPack.required })}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    newPack.required
                      ? 'bg-pink-500/20 border-pink-400/50 text-pink-200'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {newPack.required ? '🔒 Задължителен' : '🟢 По избор (Препоръчително)'}
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Съобщение при запитване</label>
                <input
                  type="text"
                  value={newPack.prompt}
                  onChange={(e) => setNewPack({ ...newPack, prompt: e.target.value })}
                  placeholder="Официален текстурен пакет за сървъра"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 focus:outline-none focus:border-pink-400"
                />
              </div>

              {/* SHA-1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">SHA-1 Хеш (по избор)</label>
                <input
                  type="text"
                  value={newPack.sha1}
                  onChange={(e) => setNewPack({ ...newPack, sha1: e.target.value })}
                  placeholder="40-знаков sha1 код"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-200 font-mono focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <p className="text-[11px] text-slate-400">
                * При Vanilla сървър направи рестарт (Спри 🛑 и Пусни ▶️), за да влезе новият пакет в сила.
              </p>

              <button
                type="submit"
                disabled={savingAction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-lg shadow-pink-950/50 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Запази и Активирай в Сървъра</span>
              </button>
            </div>
          </form>

          {/* 4. MULTIPLE PACKS EXPLANATION & FREE HOSTING */}
          <div className="p-4 rounded-2xl glass-card space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">
                Как да ползваш няколко ресурс пакета едновременно в Minecraft?
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              В Minecraft файлът <code>server.properties</code> технически приема <strong>1 активен линк</strong>. Ако искаш да комбинираш няколко пакета едновременно (например текстурен пакет + 3D предмети + персонализирани звуци), решението е те да се обединят в <strong>един общ .zip файл (Merge)</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl glass-card space-y-1.5">
                <span className="text-xs font-bold text-sky-400">1. Обедини ги онлайн</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Използвай безплатния инструмент за обединяване на пакети.
                </p>
                <button
                  type="button"
                  onClick={() => (window as any).api?.openExternal('https://merge.elmakers.com/')}
                  className="text-[11px] text-sky-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  merge.elmakers.com <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 rounded-xl glass-card space-y-1.5">
                <span className="text-xs font-bold text-cyan-400">2. Качи готовия .zip</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Качи обединения пакет в безплатен хостинг, за да вземеш директен линк.
                </p>
                <button
                  type="button"
                  onClick={() => (window as any).api?.openExternal('https://mc-packs.net/')}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  mc-packs.net <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 rounded-xl glass-card space-y-1.5">
                <span className="text-xs font-bold text-amber-400">3. Добави го тук</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Постави новия линк във формата горе и цъкни „Запази и Активирай“.
                </p>
                <span className="text-[11px] text-amber-300/80 font-mono block">
                  100% готов за игра!
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

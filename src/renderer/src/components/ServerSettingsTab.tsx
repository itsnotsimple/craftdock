import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Save,
  Check,
  Swords,
  Eye,
  Users,
  FileText,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Trash2,
  Shield,
  Wifi,
  Skull,
  Flame,
} from 'lucide-react';
import { ServerProfile } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';

interface ServerSettingsProps {
  server: ServerProfile;
  onUpdateServer?: (server: ServerProfile) => void;
}

export const ServerSettingsTab: React.FC<ServerSettingsProps> = ({ server, onUpdateServer }) => {
  const { t, language } = useLanguage();
  const { showConfirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    onlineMode: false,
    difficulty: 'normal' as 'peaceful' | 'easy' | 'normal' | 'hard',
    gamemode: 'survival',
    pvp: true,
    hardcore: false,
    viewDistance: 10,
    maxPlayers: 20,
    motd: 'CraftDock Minecraft Server',
    spawnProtection: 16,
  });

  useEffect(() => {
    const api = (window as any).api;
    if (!api) return;

    Promise.all([
      api.getServerProperties(server.id),
      api.getServerIcon(server.id),
    ]).then(([props, icon]) => {
      if (props) {
        setSettings({
          onlineMode: props.onlineMode ?? false,
          difficulty: props.difficulty || 'normal',
          gamemode: props.gamemode || 'survival',
          pvp: props.pvp ?? true,
          hardcore: props.hardcore ?? false,
          viewDistance: props.viewDistance || 10,
          maxPlayers: props.maxPlayers || server.maxPlayers || 20,
          motd: props.motd || server.name,
          spawnProtection: props.spawnProtection !== undefined ? Number(props.spawnProtection) : 16,
        });
      }
      if (icon) {
        setServerIcon(icon);
      }
      setLoading(false);
    });
  }, [server.id, server.maxPlayers, server.name]);

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
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const api = (window as any).api;
    if (!api) return;

    const res = await api.saveServerProperties(server.id, settings);
    const updatedServer: ServerProfile =
      res && typeof res === 'object' && res.id
        ? res
        : {
            ...server,
            maxPlayers: Number(settings.maxPlayers) || 20,
            motd: settings.motd,
          };

    if (onUpdateServer) {
      onUpdateServer(updatedServer);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
      className="h-full bg-slate-950/40 backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-6 overflow-y-auto space-y-6 shadow-2xl"
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
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            {t('settings.title')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('settings.subtitle')}
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-950/50 glow-ice cursor-pointer"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" /> {t('settings.savedSuccess')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {t('settings.saveChanges')}
            </>
          )}
        </button>
      </div>

      {/* ================= SERVER ICON & MULTIPLAYER PREVIEW ================= */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            {t('settings.iconSection')}
          </span>
          <span className="text-[11px] text-slate-400">
            {t('settings.iconHelp')}
          </span>
        </div>

        {/* Realistic Minecraft Multiplayer Server Item Preview */}
        <div className="p-4 rounded-xl bg-slate-950/50 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* 64x64 Icon Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-xl bg-slate-950 border border-white/[0.15] hover:border-cyan-400 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group cursor-pointer relative transition-all"
              title={t('settings.changeIcon')}
            >
              {serverIcon ? (
                <img
                  src={serverIcon}
                  alt="Server Icon"
                  className="w-full h-full object-cover [image-rendering:pixelated]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-cyan-400 transition-colors">
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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 font-sans tracking-wide">
                  {server.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-cyan-300 border border-white/[0.08]">
                  {server.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono tracking-tight line-clamp-1">
                {settings.motd || 'CraftDock Minecraft Server'}
              </p>
            </div>
          </div>

          {/* Right side of preview: Slots & Ping */}
          <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-300">
                0 / {settings.maxPlayers}
              </span>
              <span className="text-[10px] text-slate-500 block">{t('common.players').toLowerCase()}</span>
            </div>

            {/* 5-bar Minecraft signal icon */}
            <div className="flex items-end gap-0.5 h-4 text-emerald-400" title={t('settings.pingExcellent')}>
              <span className="w-1 h-1.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-2.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-3.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-4 bg-emerald-400 rounded-xs"></span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold border border-cyan-400/30 transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('settings.changeIcon')}</span>
              </button>

              {serverIcon && (
                <button
                  type="button"
                  onClick={handleRemoveIcon}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title={t('settings.removeIcon')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          {t('settings.iconTip')}
        </p>
      </div>

      {/* Online Mode / Cracked Selector */}
      <div className="p-4 rounded-2xl glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-slate-100">{t('settings.crackedTitle')}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
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
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 glow-green'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
          }`}
        >
          {!settings.onlineMode ? t('settings.crackedBtnAllowed') : t('settings.crackedBtnBlocked')}
        </button>
      </div>

      {/* Slots / Max Players Selector */}
      <div className="p-4 rounded-2xl glass-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              {t('settings.maxPlayersTitle')}
            </span>
            <p className="text-xs text-slate-400">
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
              className="w-20 px-3 py-1.5 rounded-xl glass-input text-sm font-black text-sky-400 text-center font-mono focus:outline-none focus:border-sky-400"
            />
            <span className="text-xs text-slate-400 font-bold">{language === 'bg' ? 'слота' : 'slots'}</span>
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
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
              }`}
            >
              {slotCount} {t('common.players').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ================= SPAWN PROTECTION CARD ================= */}
      <div className="p-4 rounded-2xl glass-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              {t('settings.spawnProtection')}
            </span>
            <p className="text-xs text-slate-400">
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
              className="w-20 px-3 py-1.5 rounded-xl glass-input text-sm font-black text-amber-400 text-center font-mono focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-slate-400 font-bold">{language === 'bg' ? 'блока' : 'blocks'}</span>
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
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= HARDCORE MODE CARD ================= */}
      <div
        className={`p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-2xl ${
          settings.hardcore
            ? 'bg-gradient-to-r from-rose-950/40 via-slate-950/70 to-slate-950/70 border-rose-500/40 glow-crimson shadow-2xl'
            : 'glass-card hover:border-white/[0.15]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  settings.hardcore
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                }`}
              >
                <Skull className={`w-5 h-5 ${settings.hardcore ? 'animate-pulse text-rose-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100 tracking-wide">
                    {t('settings.hardcoreTitle')}
                  </span>
                  {settings.hardcore ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-mono tracking-wider animate-pulse">
                      {t('wizard.hardcoreActiveBadge')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] font-mono">
                      {t('common.offline')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {settings.hardcore
                    ? t('settings.hardcoreActiveNotice')
                    : t('settings.hardcoreDisabledNotice')}
                </p>
              </div>
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
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-950/60'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.1] hover:border-white/[0.2]'
            }`}
          >
            {settings.hardcore ? (
              <>
                <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>💀 {t('settings.hardcoreTitle')}</span>
              </>
            ) : (
              <>
                <Skull className="w-4 h-4 text-slate-400" />
                <span>{language === 'bg' ? 'Включи Hardcore' : 'Enable Hardcore'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gameplay Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Difficulty */}
        <div
          className={`p-4 rounded-xl border space-y-2 transition-all ${
            settings.hardcore
              ? 'bg-rose-950/20 border-rose-500/30'
              : 'glass-card'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">{t('settings.difficulty')}</label>
            {settings.hardcore && (
              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 font-mono">
                🔒 {language === 'bg' ? 'Заключено на Hard (Hardcore)' : 'Locked to Hard (Hardcore)'}
              </span>
            )}
          </div>
          <select
            value={settings.difficulty}
            disabled={settings.hardcore}
            onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
            className={`w-full px-3 py-2 rounded-lg glass-input text-xs text-slate-200 focus:outline-none cursor-pointer ${
              settings.hardcore
                ? 'border-rose-500/40 text-rose-300 cursor-not-allowed opacity-80'
                : 'focus:border-amber-400'
            }`}
          >
            <option value="peaceful">{t('settings.diffPeaceful')}</option>
            <option value="easy">{t('settings.diffEasy')}</option>
            <option value="normal">{t('settings.diffNormal')}</option>
            <option value="hard">{t('settings.diffHard')}</option>
          </select>
        </div>

        {/* Gamemode */}
        <div className="p-4 rounded-xl glass-card space-y-2">
          <label className="text-xs font-bold text-slate-300">{t('settings.gamemode')}</label>
          <select
            value={settings.gamemode}
            onChange={(e) => setSettings({ ...settings, gamemode: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg glass-input text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="survival">{t('settings.gmSurvival')}</option>
            <option value="creative">{t('settings.gmCreative')}</option>
            <option value="adventure">{t('settings.gmAdventure')}</option>
            <option value="spectator">{t('settings.gmSpectator')}</option>
          </select>
        </div>

        {/* PvP */}
        <div className="p-4 rounded-xl glass-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-rose-400" /> {t('settings.pvp')}
            </span>
            <p className="text-[11px] text-slate-400">
              {settings.pvp ? t('settings.pvpEnabled') : t('settings.pvpDisabled')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, pvp: !settings.pvp })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              settings.pvp
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200'
            }`}
          >
            {settings.pvp ? t('common.yes') : t('common.no')}
          </button>
        </div>

        {/* View Distance */}
        <div className="p-4 rounded-xl glass-card space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-400" /> {t('settings.viewDistance')}
            </span>
            <span className="text-xs font-bold text-teal-400 font-mono">
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>4</span>
            <span>6</span>
            <span>10</span>
            <span>16</span>
          </div>
        </div>
      </div>

      {/* MOTD */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-indigo-400" /> {t('settings.motd')}
        </label>
        <input
          type="text"
          value={settings.motd}
          onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
          className="w-full px-4 py-2 rounded-xl glass-input text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Restart Notice for Running Server */}
      {server.status === 'running' ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              {language === 'bg'
                ? 'Важно за новите настройки и снимката на сървъра:'
                : 'Important for new settings and server icon:'}
            </p>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              {language === 'bg'
                ? 'Vanilla Minecraft чете лимита на чанковете (View Distance) и снимката на сървъра (server-icon.png) само при стартиране. Рестартирай сървъра (Спри 🛑 и след това Стартирай ▶️), за да се заредят в играта.'
                : 'Minecraft loads view distance and server-icon.png only during server startup. Restart the server (Stop 🛑 and then Start ▶️) for changes to appear in-game.'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 pt-1">
          {language === 'bg'
            ? '* Забележка: Новите настройки и снимката ще влязат в сила веднага при следващото стартиране на сървъра.'
            : '* Note: New settings and server icon will take effect upon the next server start.'}
        </p>
      )}
    </form>
  );
};

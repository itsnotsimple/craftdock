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

interface ServerSettingsProps {
  server: ServerProfile;
  onUpdateServer?: (server: ServerProfile) => void;
}

export const ServerSettingsTab: React.FC<ServerSettingsProps> = ({ server, onUpdateServer }) => {
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
        // Render to exact 64x64 canvas for Minecraft
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
    // Reset file input so same file can be picked again if desired
    e.target.value = '';
  };

  const handleRemoveIcon = async () => {
    if (confirm('Сигурен ли си, че искаш да премахнеш снимката на сървъра?')) {
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
        Зареждане на настройките на сървъра...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="h-full bg-slate-900/60 rounded-2xl border border-slate-800 p-6 overflow-y-auto space-y-6"
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Настройки на Света (server.properties)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Променяй правилата на играта, снимката на сървъра, слотовете и защитата с 1 клик
          </p>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/50 glow-green cursor-pointer"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Запазено успешно!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Запази Настройките
            </>
          )}
        </button>
      </div>

      {/* ================= SERVER ICON & MULTIPLAYER PREVIEW ================= */}
      <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            Снимка на Сървъра (Server Icon & Меню Изглед)
          </span>
          <span className="text-[11px] text-slate-500">
            Автоматично се оразмерява в точен 64x64 PNG за Minecraft
          </span>
        </div>

        {/* Realistic Minecraft Multiplayer Server Item Preview */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* 64x64 Icon Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg bg-slate-950 border-2 border-slate-700 hover:border-emerald-500 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group cursor-pointer relative transition-all"
              title="Кликни, за да качиш снимка"
            >
              {serverIcon ? (
                <img
                  src={serverIcon}
                  alt="Server Icon"
                  className="w-full h-full object-cover [image-rendering:pixelated]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-emerald-400 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[9px] font-mono mt-0.5">64x64</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-emerald-300 text-[10px] font-bold transition-opacity">
                Качи
              </div>
            </div>

            {/* Server Text Preview (Simulates Minecraft Multiplayer List) */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 font-sans tracking-wide">
                  {server.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
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
              <span className="text-[10px] text-slate-500 block">играчи</span>
            </div>

            {/* 5-bar Minecraft signal icon */}
            <div className="flex items-end gap-0.5 h-4 text-emerald-400" title="Пинг: Отличен">
              <span className="w-1 h-1.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-2.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-3.5 bg-emerald-400 rounded-xs"></span>
              <span className="w-1 h-4 bg-emerald-400 rounded-xs"></span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Качи Снимка</span>
              </button>

              {serverIcon && (
                <button
                  type="button"
                  onClick={handleRemoveIcon}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                  title="Премахни снимката"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          💡 Можеш да избереш <strong>всяко изображение</strong> (JPG, PNG, WEBP) от компютъра си. CraftDock автоматично го преобразува в перфектен <code>server-icon.png</code> с размер 64x64 пиксела.
        </p>
      </div>

      {/* Online Mode / Cracked Selector (Full width card) */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-slate-100">Пиратски акаунти (TLauncher / Неофициален Minecraft)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {!settings.onlineMode
              ? '🟢 Разрешени – приятели без платен Minecraft акаунт могат да играят с теб безпроблемно.'
              : '🔒 Забранени – сървърът изисква официален платен Minecraft профил.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSettings({ ...settings, onlineMode: !settings.onlineMode })}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border shrink-0 cursor-pointer ${
            !settings.onlineMode
              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {!settings.onlineMode ? '🟢 Разрешени (Всеки може да влезе)' : '🔒 Само Купен Minecraft'}
        </button>
      </div>

      {/* Slots / Max Players Selector */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Максимален брой слотове за сървъра (Max Players)
            </span>
            <p className="text-xs text-slate-400">
              Колко играчи едновременно могат да бъдат в сървъра (показва се в Minecraft листа като 0/{settings.maxPlayers})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="500"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({ ...settings, maxPlayers: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-black text-emerald-400 text-center font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400 font-bold">слота</span>
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
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {slotCount} играчи
            </button>
          ))}
        </div>
      </div>

      {/* ================= SPAWN PROTECTION CARD ================= */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Защита на Спауна (Spawn Protection)
            </span>
            <p className="text-xs text-slate-400">
              Радиус в блокове около началната точка (Spawn), в който обикновените играчи без OP права не могат да чупят или строят
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
              className="w-20 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-black text-amber-400 text-center font-mono focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400 font-bold">блока</span>
          </div>
        </div>

        {/* Quick Spawn Protection Presets */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { value: 0, label: '0 (Изключена - свободно строителство)' },
            { value: 16, label: '16 (Minecraft Стандарт)' },
            { value: 32, label: '32 (Средна зона)' },
            { value: 64, label: '64 (Голяма зона)' },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setSettings({ ...settings, spawnProtection: preset.value })}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                settings.spawnProtection === preset.value
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= HARDCORE MODE CARD ================= */}
      <div
        className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
          settings.hardcore
            ? 'bg-gradient-to-r from-rose-950/70 via-slate-950/90 to-slate-950/90 border-rose-500/50 glow-crimson'
            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  settings.hardcore
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <Skull className={`w-5 h-5 ${settings.hardcore ? 'animate-pulse text-rose-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-100 tracking-wide">
                    Hardcore Режим (1 Живот & Permadeath)
                  </span>
                  {settings.hardcore ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-mono tracking-wider animate-pulse">
                      АКТИВЕН
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      Изключен
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {settings.hardcore
                    ? '💀 ВНИМАНИЕ: При смърт играчите НЯМАТ право на прераждане и стават Наблюдатели (Spectator). Трудността се заключва на "Трудна" (Hard).'
                    : 'Стандартен режим: При смърт играчите се прераждат нормално на своето легло или на спауна.'}
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
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            {settings.hardcore ? (
              <>
                <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>💀 Включен (Hardcore)</span>
              </>
            ) : (
              <>
                <Skull className="w-4 h-4 text-slate-400" />
                <span>Включи Hardcore</span>
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
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Трудност (Difficulty)</label>
            {settings.hardcore && (
              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 font-mono">
                🔒 Заключено на Hard (Hardcore)
              </span>
            )}
          </div>
          <select
            value={settings.difficulty}
            disabled={settings.hardcore}
            onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
            className={`w-full px-3 py-2 rounded-lg bg-slate-900 border text-xs text-slate-200 focus:outline-none cursor-pointer ${
              settings.hardcore
                ? 'border-rose-500/40 text-rose-300 cursor-not-allowed opacity-80'
                : 'border-slate-700 focus:border-emerald-500'
            }`}
          >
            <option value="peaceful">Мирна (Peaceful - без мобове)</option>
            <option value="easy">Лесна (Easy)</option>
            <option value="normal">Нормална (Normal)</option>
            <option value="hard">Трудна (Hard)</option>
          </select>
        </div>

        {/* Gamemode */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300">Режим на игра по подразбиране</label>
          <select
            value={settings.gamemode}
            onChange={(e) => setSettings({ ...settings, gamemode: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="survival">Оцеляване (Survival)</option>
            <option value="creative">Творчески (Creative)</option>
            <option value="adventure">Приключенски (Adventure)</option>
            <option value="spectator">Наблюдател (Spectator)</option>
          </select>
        </div>

        {/* PvP */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-rose-400" /> PvP битки между играчите
            </span>
            <p className="text-[11px] text-slate-500">Могат ли приятелите да се удрят взаимно</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, pvp: !settings.pvp })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              settings.pvp
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {settings.pvp ? 'Включено' : 'Изключено'}
          </button>
        </div>

        {/* View Distance */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-400" /> Видимост (View Distance)
            </span>
            <span className="text-xs font-bold text-cyan-400 font-mono">{settings.viewDistance} чанка</span>
          </div>
          <input
            type="range"
            min="4"
            max="16"
            step="1"
            value={settings.viewDistance}
            onChange={(e) => setSettings({ ...settings, viewDistance: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>4 (Минимум)</span>
            <span>6 (Препоръчително)</span>
            <span>10 (Стандартно)</span>
            <span>16 (Макс)</span>
          </div>
        </div>
      </div>

      {/* MOTD */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-400" /> MOTD Описание (Текстът под сървъра в Minecraft менюто)
        </label>
        <input
          type="text"
          value={settings.motd}
          onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
          className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Restart Notice for Running Server */}
      {server.status === 'running' ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              Важно за новите настройки и снимката на сървъра:
            </p>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Vanilla Minecraft чете лимита на чанковете (View Distance) и снимката на сървъра (<code>server-icon.png</code>) <strong>само при стартиране</strong>. Рестартирай сървъра (<strong>Спри</strong> 🛑 и след това <strong>Стартирай</strong> ▶️), за да се заредят в играта.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 pt-1">
          * Забележка: Новите настройки и снимката ще влязат в сила веднага при следващото стартиране на сървъра.
        </p>
      )}
    </form>
  );
};

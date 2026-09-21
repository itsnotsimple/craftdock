import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Clock,
  Heart,
  Utensils,
  Compass,
  Sparkles,
  Shield,
  Layers,
  Sword,
  Skull,
  Crosshair,
  Package,
  Copy,
  Check,
  Award,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PlayerInventoryData, ParsedItem } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import woodTexture from '../assets/minecraft/textures/wood.png';
import obsidianTexture from '../assets/minecraft/textures/obsidian.png';
import shieldIcon from '../assets/minecraft/icons/shield.png';
import enderEyeIcon from '../assets/minecraft/icons/ender_eye.png';
import chestIcon from '../assets/minecraft/icons/chest.png';

interface PlayerInventoryModalProps {
  serverId: string;
  uuid: string;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerInventoryModal: React.FC<PlayerInventoryModalProps> = ({
  serverId,
  uuid,
  playerName,
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlayerInventoryData | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'enderChest' | 'stats'>('inventory');
  const [hoveredItem, setHoveredItem] = useState<ParsedItem | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  const fetchPlayerData = async () => {
    setLoading(true);
    try {
      const api = (window as any).api;
      if (!api?.getPlayerInventory) return;
      const res: PlayerInventoryData = await api.getPlayerInventory(serverId, uuid, playerName);
      setData(res);
    } catch (err) {
      console.error('Failed to load player inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayerData();
    } else {
      setData(null);
      setHoveredItem(null);
    }
  }, [isOpen, serverId, uuid]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const getDimensionName = (dim?: string) => {
    if (!dim) return language === 'bg' ? 'Основен свят (Overworld)' : 'Overworld';
    if (dim.includes('nether')) return language === 'bg' ? 'Недър (The Nether)' : 'The Nether';
    if (dim.includes('end')) return language === 'bg' ? 'Ендър (The End)' : 'The End';
    return language === 'bg' ? 'Основен свят' : 'Overworld';
  };

  const getGameModeName = (type: number) => {
    switch (type) {
      case 0:
        return language === 'bg' ? 'Оцеляване (Survival)' : 'Survival';
      case 1:
        return language === 'bg' ? 'Творчески (Creative)' : 'Creative';
      case 2:
        return language === 'bg' ? 'Приключение (Adventure)' : 'Adventure';
      case 3:
        return language === 'bg' ? 'Наблюдател (Spectator)' : 'Spectator';
      default:
        return language === 'bg' ? 'Оцеляване' : 'Survival';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'glass-panel border-white/[0.08] text-slate-100'
        }`}
      >
        {/* Top Player Header */}
        <div
          className={`p-5 px-6 border-b flex items-center justify-between gap-4 shrink-0 ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            {/* Skin Avatar with pixel frame */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-md bg-slate-800 flex items-center justify-center">
                <PlayerAvatar name={playerName} size={64} className="w-full h-full" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold truncate text-slate-100">{playerName}</h3>
                {data && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    {getGameModeName(data.gameType)}
                  </span>
                )}
                {uuid.split('-')?.[2]?.[0] === '3' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                    ⚔️ Cracked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                    💎 Premium
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-[11px] truncate max-w-[200px]">{uuid}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(uuid)}
                  className="p-1 hover:text-slate-200 transition-colors cursor-pointer"
                  title={language === 'bg' ? 'Копирай UUID' : 'Copy UUID'}
                >
                  {copiedUuid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchPlayerData}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
              }`}
              title={language === 'bg' ? 'Презареди данните' : 'Refresh data'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-400 hover:text-slate-100 border-white/[0.08]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {data && (
          <div
            className={`px-6 py-2.5 border-b grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs ${
              theme === 'light' ? 'bg-slate-100/70 border-slate-200' : 'bg-white/[0.01] border-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-slate-400">{language === 'bg' ? 'Живот:' : 'Health:'}</span>
              <span className="font-bold text-slate-200">
                {Math.round(data.health)} / {data.maxHealth}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-400">{language === 'bg' ? 'Храна:' : 'Food:'}</span>
              <span className="font-bold text-slate-200">{Math.round(data.foodLevel)} / 20</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400">{language === 'bg' ? 'Ниво:' : 'Level:'}</span>
              <span className="font-bold text-emerald-400">Lvl {data.xpLevel}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-400">{language === 'bg' ? 'Време:' : 'Playtime:'}</span>
              <span className="font-bold text-sky-300">{data.playTimeFormatted}</span>
            </div>

            <div className="flex items-center gap-1.5 truncate">
              <Compass className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-slate-400 truncate">{getDimensionName(data.dimension)}</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <span>
                [{data.pos[0]}, {data.pos[1]}, {data.pos[2]}]
              </span>
            </div>
          </div>
        )}

        {/* Sub-Tabs Nav */}
        <div
          className={`px-6 pt-3 border-b flex items-center gap-2 shrink-0 ${
            theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/[0.06] bg-black/20'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{language === 'bg' ? 'Главен инвентар & Екипировка' : 'Main Inventory & Armor'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enderChest')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'enderChest'
                ? 'border-purple-400 text-purple-300 bg-purple-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{language === 'bg' ? 'Ender Chest (Ендър чест)' : 'Ender Chest'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'border-sky-400 text-sky-300 bg-sky-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>{language === 'bg' ? 'Статистики & Постижения' : 'Player Statistics'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !data ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm text-slate-400">
                {language === 'bg' ? 'Зареждане на инвентара от NBT файловете...' : 'Loading player inventory...'}
              </p>
            </div>
          ) : !data ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                {language === 'bg' ? 'Няма намерени данни за инвентар' : 'No player data found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {language === 'bg'
                  ? 'Възможно е играчът още да не е влизал в света или светът да не е съхранил playerdata файл.'
                  : 'Player data file could not be found or has not been saved yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: Main Inventory & Armor */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* Container Frame styled like an authentic Minecraft GUI */}
                  <div className={`rounded-2xl p-5 border-4 border-t-[#3b3c43] border-l-[#3b3c43] border-r-[#131316] border-b-[#131316] ${
                    theme === 'light'
                      ? 'bg-slate-100/90 shadow-md'
                      : 'bg-[#18181c] shadow-2xl'
                  }`}>
                    {/* Container GUI Title */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-amber-600/20 border border-amber-600/30 flex items-center justify-center text-amber-400 text-xs shadow-xs">
                          📦
                        </div>
                        <div>
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                            {language === 'bg' ? 'Инвентар на играча' : 'Player Inventory & Equipment'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {data.mainInventory.filter(Boolean).length + data.hotbar.filter(Boolean).length} / 36 {language === 'bg' ? 'заети слота' : 'slots filled'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-black/30 border border-white/[0.04]">
                          {getDimensionName(data.dimension)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Armor & Off-hand Column */}
                      <div className="lg:col-span-3 rounded-xl p-3.5 border-2 border-t-[#2d2e35] border-l-[#2d2e35] border-r-[#101014] border-b-[#101014] bg-black/40 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                          <Shield className="w-4 h-4 text-amber-400" />
                          <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                            {language === 'bg' ? 'Броня & Щит' : 'Armor & Offhand'}
                          </h5>
                        </div>

                        <div className="grid grid-cols-2 gap-3 justify-items-center">
                          {/* Armor Column: Head, Chest, Legs, Feet */}
                          <div className="flex flex-col gap-2">
                            <SlotView
                              item={data.armor.head}
                              placeholder="helmet"
                              label={language === 'bg' ? 'Каска (Head)' : 'Helmet (Head)'}
                              onHover={setHoveredItem}
                            />
                            <SlotView
                              item={data.armor.chest}
                              placeholder="chestplate"
                              label={language === 'bg' ? 'Нагръдник (Chest)' : 'Chestplate (Chest)'}
                              onHover={setHoveredItem}
                            />
                            <SlotView
                              item={data.armor.legs}
                              placeholder="leggings"
                              label={language === 'bg' ? 'Клин (Legs)' : 'Leggings (Legs)'}
                              onHover={setHoveredItem}
                            />
                            <SlotView
                              item={data.armor.feet}
                              placeholder="boots"
                              label={language === 'bg' ? 'Ботуши (Feet)' : 'Boots (Feet)'}
                              onHover={setHoveredItem}
                            />
                          </div>

                          {/* Offhand Column */}
                          <div className="flex flex-col justify-end">
                            <div className="space-y-1 text-center">
                              <SlotView
                                item={data.offhand}
                                placeholder="shield"
                                label={language === 'bg' ? 'Лява ръка (Off-hand)' : 'Off-hand'}
                                onHover={setHoveredItem}
                              />
                              <span className="text-[10px] font-mono text-slate-400 block mt-1">
                                {language === 'bg' ? 'Втора ръка' : 'Off-hand'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Open Minecraft Chest Grid (3x9) + Hotbar (1x9) */}
                      <div className="lg:col-span-9 space-y-4">
                        {/* Open Minecraft Chest with Lid & Wood Interior */}
                        <div className="shadow-2xl">
                          <OpenChestLid
                            isEnder={false}
                            itemCount={data.mainInventory.filter(Boolean).length}
                            language={language}
                          />
                          <div
                            className="rounded-b-2xl p-4 border-b-4 border-l-4 border-r-4 border-[#2d1605] relative shadow-2xl overflow-hidden"
                            style={{
                              backgroundColor: '#4a290e',
                              backgroundImage: `url(${woodTexture})`,
                              backgroundRepeat: 'repeat',
                              backgroundSize: '64px',
                            }}
                          >
                            {/* Lower Latch Receiver in center */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-3 rounded-xs bg-[#3a2d20] border-2 border-[#e8dfc8] shadow-md z-20" />

                            {/* Deep dark inner cavity of the open chest where items sit */}
                            <div className="relative rounded-xl p-3 border-2 border-[#2b1607] bg-[#1a0e05]/95 shadow-[inset_0_8px_20px_rgba(0,0,0,0.9)]">
                              <div className="grid grid-cols-9 gap-1.5">
                                {data.mainInventory.map((item, idx) => (
                                  <SlotView
                                    key={`main-${idx}`}
                                    item={item}
                                    slotNumber={idx + 9}
                                    onHover={setHoveredItem}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 1x9 Hotbar Grid Below */}
                        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-black/50 space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              {language === 'bg' ? 'Бърза лента на играча (Hotbar 1-9)' : 'Player Hotbar (Slots 1-9)'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {data.hotbar.filter(Boolean).length} / 9
                            </span>
                          </div>

                          <div className="grid grid-cols-9 gap-1.5 p-2 rounded-xl bg-black/60 border-2 border-amber-500/30 shadow-inner">
                            {data.hotbar.map((item, idx) => (
                              <SlotView
                                key={`hotbar-${idx}`}
                                item={item}
                                hotbarIndex={idx + 1}
                                slotNumber={idx}
                                onHover={setHoveredItem}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Item Inspector Box */}
                  <ItemInspectorDetail item={hoveredItem} language={language} />
                </div>
              )}

              {/* TAB 2: Ender Chest */}
              {activeTab === 'enderChest' && (
                <div className="space-y-6">
                  {/* Open Ender Chest with Lid & Obsidian Void Interior */}
                  <div className="shadow-2xl">
                    <OpenChestLid
                      isEnder={true}
                      itemCount={data.enderChest.filter(Boolean).length}
                      language={language}
                    />
                    <div
                      className="rounded-b-2xl p-5 border-b-4 border-l-4 border-r-4 border-[#07020d] relative shadow-[0_0_40px_rgba(147,51,234,0.35)] overflow-hidden"
                      style={{
                        backgroundColor: '#130721',
                        backgroundImage: `url(${obsidianTexture})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '48px',
                      }}
                    >
                      {/* Lower Latch Receiver in center */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-3 rounded-xs bg-[#11071c] border-2 border-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)] z-20" />

                      {/* Deep cosmic void inner cavity of the open Ender Chest */}
                      <div className="relative rounded-xl p-4 border-2 border-purple-500/40 bg-[#090312]/95 shadow-[inset_0_10px_30px_rgba(147,51,234,0.5)]">
                        <div className="grid grid-cols-9 gap-2">
                          {data.enderChest.map((item, idx) => (
                            <SlotView
                              key={`ender-${idx}`}
                              item={item}
                              slotNumber={idx}
                              isEnder
                              onHover={setHoveredItem}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Item Inspector Box */}
                  <ItemInspectorDetail item={hoveredItem} language={language} />
                </div>
              )}

              {/* TAB 3: Player Statistics */}
              {activeTab === 'stats' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={<Clock className="w-5 h-5 text-sky-400" />}
                    title={language === 'bg' ? 'Изиграно време' : 'Total Playtime'}
                    value={data.playTimeFormatted}
                    subtext={
                      language === 'bg'
                        ? `${data.playTimeTicks.toLocaleString()} тика на сървъра`
                        : `${data.playTimeTicks.toLocaleString()} server ticks`
                    }
                  />

                  <StatCard
                    icon={<Sword className="w-5 h-5 text-rose-400" />}
                    title={language === 'bg' ? 'Убити чудовища (Mobs)' : 'Mob Kills'}
                    value={data.mobKills.toLocaleString()}
                    subtext={language === 'bg' ? 'Всички убити същества' : 'Total mobs slain'}
                  />

                  <StatCard
                    icon={<Crosshair className="w-5 h-5 text-amber-400" />}
                    title={language === 'bg' ? 'Убити играчи (PvP)' : 'Player Kills (PvP)'}
                    value={data.playerKills.toLocaleString()}
                    subtext={language === 'bg' ? 'Победи над играчи' : 'Total PvP kills'}
                  />

                  <StatCard
                    icon={<Skull className="w-5 h-5 text-slate-400" />}
                    title={language === 'bg' ? 'Умирания' : 'Deaths'}
                    value={data.deaths.toLocaleString()}
                    subtext={language === 'bg' ? 'Брой смърти в света' : 'Total times died'}
                  />

                  <StatCard
                    icon={<Heart className="w-5 h-5 text-rose-500" />}
                    title={language === 'bg' ? 'Нанесени щети' : 'Damage Dealt'}
                    value={data.damageDealt.toLocaleString()}
                    subtext={language === 'bg' ? 'Точки нанесен демидж' : 'Total damage points dealt'}
                  />

                  <StatCard
                    icon={<Shield className="w-5 h-5 text-emerald-400" />}
                    title={language === 'bg' ? 'Понесени щети' : 'Damage Taken'}
                    value={data.damageTaken.toLocaleString()}
                    subtext={language === 'bg' ? 'Точки понесен демидж' : 'Total damage points taken'}
                  />

                  <StatCard
                    icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
                    title={language === 'bg' ? 'Опит и точки (Score)' : 'XP & Score'}
                    value={`Lvl ${data.xpLevel}`}
                    subtext={
                      language === 'bg'
                        ? `Общ XP: ${data.xpTotal} | Точки: ${data.score}`
                        : `Total XP: ${data.xpTotal} | Score: ${data.score}`
                    }
                  />

                  <StatCard
                    icon={<Compass className="w-5 h-5 text-purple-400" />}
                    title={language === 'bg' ? 'Текущо измерение' : 'Current Dimension'}
                    value={getDimensionName(data.dimension)}
                    subtext={data.dimension}
                  />

                  <StatCard
                    icon={<Award className="w-5 h-5 text-amber-400" />}
                    title={language === 'bg' ? 'Координати на играча' : 'Coordinates'}
                    value={`X: ${data.pos[0]}, Y: ${data.pos[1]}, Z: ${data.pos[2]}`}
                    subtext={language === 'bg' ? 'Последно записано местоположение' : 'Last recorded location'}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------
// Sub-components: OpenChestLid, ArmorSlotPlaceholder, SlotView, ItemInspectorDetail, StatCard
// -----------------------------------------------------------------

const OpenChestLid: React.FC<{ isEnder?: boolean; itemCount: number; language: string }> = ({
  isEnder,
  itemCount,
  language,
}) => {
  if (isEnder) {
    return (
      <div className="relative w-full rounded-t-2xl overflow-hidden border-t-4 border-l-4 border-r-4 border-[#5b21b6] shadow-xl select-none">
        {/* Obsidian texture base */}
        <div
          className="absolute inset-0 opacity-45 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url(${obsidianTexture})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '36px',
          }}
        />
        <div className="bg-gradient-to-b from-[#24133d] via-[#160a27] to-[#0d0417] p-3.5 px-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            {/* Real Minecraft Eye of Ender Icon */}
            <div className="w-10 h-10 rounded-xl bg-purple-950/90 border-2 border-teal-400 shadow-[0_0_16px_rgba(20,184,166,0.6)] flex items-center justify-center relative group p-1">
              <img
                src={enderEyeIcon}
                alt="Eye of Ender"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_#2dd4bf]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-sm font-bold text-teal-300 uppercase tracking-widest flex items-center gap-1.5">
                  {language === 'bg' ? 'Ender Chest на играча' : 'Player Ender Chest'}
                </h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  {language === 'bg' ? 'Отворен' : 'Open'}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/60 font-sans">
                {language === 'bg'
                  ? 'Междупространствен инвентар (27 слота)'
                  : 'Interdimensional inventory (27 slots)'}
              </p>
            </div>
          </div>

          {/* Latch & Item Count */}
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 font-mono font-bold">
              {itemCount} / 27
            </span>
            {/* Tilted Open Latch on Lid */}
            <div className="w-6 h-8 rounded-sm bg-[#11071c] border-2 border-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)] flex items-center justify-center">
              <div className="w-2 h-3 rounded-xs bg-teal-400" />
            </div>
          </div>
        </div>
        {/* Angled lid bottom bevel lip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#3b0764] via-[#0d9488] to-[#3b0764]" />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-t-2xl overflow-hidden border-t-4 border-l-4 border-r-4 border-[#b87a38] shadow-xl select-none">
      {/* Oak wood texture base */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url(${woodTexture})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '48px',
        }}
      />
      <div className="bg-gradient-to-b from-[#8f5623] via-[#6e3e15] to-[#45240a] p-3.5 px-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Real Minecraft Chest Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#3f210a] border-2 border-[#caa069] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center p-1">
            <img
              src={chestIcon}
              alt="Chest"
              className="w-full h-full object-contain filter drop-shadow"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-mono text-sm font-bold text-amber-200 uppercase tracking-widest flex items-center gap-1.5">
                {language === 'bg' ? 'Инвентар на играча' : 'Player Inventory'}
              </h4>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/40">
                {language === 'bg' ? 'Отворен' : 'Open'}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/60 font-sans">
              {language === 'bg'
                ? 'Основно хранилище (27 слота)'
                : 'Main storage inventory (27 slots)'}
            </p>
          </div>
        </div>

        {/* Silver Latch & Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-black/40 text-amber-200 border border-[#8f5623] font-mono font-bold">
            {itemCount} / 27
          </span>
          {/* Authentic Silver Latch on open lid */}
          <div className="w-6 h-8 rounded-xs bg-[#3a2d20] border-2 border-[#e8dfc8] shadow-[0_2px_6px_rgba(0,0,0,0.7)] flex flex-col items-center justify-between py-1">
            <div className="w-2.5 h-2 rounded-xs bg-[#e8dfc8]" />
            <div className="w-1.5 h-1.5 rounded-full bg-black/80" />
          </div>
        </div>
      </div>
      {/* Angled lid bottom bevel lip */}
      <div className="h-1.5 w-full bg-[#caa069]/60 border-b border-[#2d1605]" />
    </div>
  );
};

function getItemTextureCandidates(cleanId: string): string[] {
  // If shield, use local bundled authentic Minecraft shield icon first!
  if (cleanId === 'shield') {
    return [
      shieldIcon,
      'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/entity/shield_base.png',
      'https://assets.mcasset.cloud/latest/assets/minecraft/textures/entity/shield_base.png',
    ];
  }

  // Aliases for Minecraft items and blocks whose texture filenames differ from their registry ID
  const aliases: string[] = [];

  if (cleanId === 'compass') {
    aliases.push('compass_16', 'compass_00');
  } else if (cleanId === 'recovery_compass') {
    aliases.push('recovery_compass_00');
  } else if (cleanId === 'clock') {
    aliases.push('clock_00');
  } else if (cleanId === 'crossbow') {
    aliases.push('crossbow_standby');
  } else if (cleanId === 'grass_block') {
    aliases.push('grass_block_side', 'grass_block_top');
  } else if (cleanId === 'podzol') {
    aliases.push('podzol_side', 'podzol_top');
  } else if (cleanId === 'mycelium') {
    aliases.push('mycelium_side', 'mycelium_top');
  } else if (cleanId === 'dirt_path') {
    aliases.push('dirt_path_top', 'dirt_path_side');
  } else if (cleanId === 'tnt') {
    aliases.push('tnt_side', 'tnt_top');
  } else if (cleanId === 'furnace') {
    aliases.push('furnace_front', 'furnace_side');
  } else if (cleanId === 'blast_furnace') {
    aliases.push('blast_furnace_front');
  } else if (cleanId === 'smoker') {
    aliases.push('smoker_front');
  } else if (cleanId === 'crafter') {
    aliases.push('crafter_top', 'crafter_side');
  } else if (cleanId === 'dispenser') {
    aliases.push('dispenser_front');
  } else if (cleanId === 'dropper') {
    aliases.push('dropper_front');
  } else if (cleanId === 'observer') {
    aliases.push('observer_front');
  } else if (cleanId === 'barrel') {
    aliases.push('barrel_top', 'barrel_side');
  } else if (cleanId === 'stonecutter') {
    aliases.push('stonecutter_side', 'stonecutter_top');
  } else if (cleanId === 'loom') {
    aliases.push('loom_front');
  } else if (cleanId === 'grindstone') {
    aliases.push('grindstone_side');
  } else if (cleanId === 'lectern') {
    aliases.push('lectern_top');
  } else if (cleanId === 'enchanting_table') {
    aliases.push('enchanting_table_top');
  } else if (cleanId === 'crafting_table') {
    aliases.push('crafting_table_front', 'crafting_table_top');
  } else if (cleanId === 'cartography_table') {
    aliases.push('cartography_table_top', 'cartography_table_side1');
  } else if (cleanId === 'fletching_table') {
    aliases.push('fletching_table_front', 'fletching_table_top');
  } else if (cleanId === 'smithing_table') {
    aliases.push('smithing_table_front', 'smithing_table_top');
  } else if (cleanId === 'bookshelf') {
    aliases.push('bookshelf');
  } else if (cleanId === 'chiseled_bookshelf') {
    aliases.push('chiseled_bookshelf_empty');
  }

  const idsToTry = [cleanId, ...aliases];
  const list: string[] = [];

  // Priority 1: Misode mcmeta (Directly from latest Mojang client jar, includes 26.x snapshots & 1.21.5)
  for (const id of idsToTry) {
    list.push(`https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/textures/item/${id}.png`);
    list.push(`https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/textures/block/${id}.png`);
  }

  // Priority 2: mcasset.cloud latest
  for (const id of idsToTry) {
    list.push(`https://assets.mcasset.cloud/latest/assets/minecraft/textures/item/${id}.png`);
    list.push(`https://assets.mcasset.cloud/latest/assets/minecraft/textures/block/${id}.png`);
  }

  // Priority 3: mcasset.cloud 1.21.4 (Latest stable release)
  for (const id of idsToTry) {
    list.push(`https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/item/${id}.png`);
    list.push(`https://assets.mcasset.cloud/1.21.4/assets/minecraft/textures/block/${id}.png`);
  }

  // Priority 4: Inventivetalent 1.20.4 fallback
  for (const id of idsToTry) {
    list.push(`https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/${id}.png`);
    list.push(`https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/${id}.png`);
  }

  return list;
}

interface ArmorSlotPlaceholderProps {
  placeholder: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'shield';
}

const ArmorSlotPlaceholder: React.FC<ArmorSlotPlaceholderProps> = ({ placeholder }) => {
  const [cdnFailed, setCdnFailed] = useState(false);
  const cdnUrl = `https://raw.githubusercontent.com/misode/mcmeta/assets/assets/minecraft/textures/item/empty_armor_slot_${placeholder}.png`;

  if (!cdnFailed) {
    return (
      <img
        src={cdnUrl}
        alt={placeholder}
        onError={() => setCdnFailed(true)}
        className="w-5 h-5 object-contain opacity-35 group-hover:opacity-70 transition-opacity pointer-events-none select-none"
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }

  // Crisp pixel-art SVG fallback when offline
  return (
    <div className="w-5 h-5 text-slate-500/40 group-hover:text-amber-400/60 transition-colors flex items-center justify-center pointer-events-none select-none">
      {placeholder === 'helmet' && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M4 2h8v2H4V2zm-1 2h10v3H3V4zm0 3h2v4H3V7zm8 0h2v4h-2V7zm-5 0h4v2H6V7z" />
        </svg>
      )}
      {placeholder === 'chestplate' && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M2 3h4v2h4V3h4v5h-2v6H4V8H2V3zm3 4h6v5H5V7z" />
        </svg>
      )}
      {placeholder === 'leggings' && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M3 2h10v4h-1v8H8V8H7v6H3V6H2V2h1zm2 5v5h1V7H5zm5 0v5h1V7h-1z" />
        </svg>
      )}
      {placeholder === 'boots' && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M2 3h3v6h2v3H2V3zm7 0h3v6h2v3H9V3z" />
        </svg>
      )}
      {placeholder === 'shield' && (
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M3 2h10v5c0 4-3 6-5 7-2-1-5-3-5-7V2zm2 2v3c0 2 2 4 3 5 1-1 3-3 3-5V4H5z" />
        </svg>
      )}
    </div>
  );
};

interface SlotViewProps {
  item: ParsedItem | null;
  placeholder?: 'helmet' | 'chestplate' | 'leggings' | 'boots' | 'shield';
  label?: string;
  slotNumber?: number;
  hotbarIndex?: number;
  isEnder?: boolean;
  onHover: (item: ParsedItem | null) => void;
}

const SlotView: React.FC<SlotViewProps> = ({
  item,
  placeholder,
  label,
  slotNumber,
  hotbarIndex,
  isEnder,
  onHover,
}) => {
  const cleanId = item ? item.id.replace(/^minecraft:/, '') : '';
  const [imgErrorIndex, setImgErrorIndex] = useState(0);

  // Reset index whenever item changes
  useEffect(() => {
    setImgErrorIndex(0);
  }, [cleanId]);

  // Robust multi-tier texture cascade covering newest 1.21.5 / 26.x blocks & items
  const textureCandidates = React.useMemo(() => getItemTextureCandidates(cleanId), [cleanId]);
  const currentImgSrc = textureCandidates[imgErrorIndex] || '';

  return (
    <div
      onMouseEnter={() => item && onHover(item)}
      onMouseLeave={() => onHover(null)}
      className={`relative aspect-square w-full min-w-[36px] max-w-[46px] rounded-lg border-2 flex items-center justify-center transition-all select-none cursor-pointer group ${
        isEnder
          ? 'border-t-[#0a0412] border-l-[#0a0412] border-r-[#4a1d74] border-b-[#4a1d74] bg-[#1a0f2b] hover:bg-[#25153d] hover:border-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.35)]'
          : 'border-t-[#1c1c1f] border-l-[#1c1c1f] border-r-[#404048] border-b-[#404048] bg-[#232328] hover:bg-[#2e2e34] hover:border-amber-400/60'
      }`}
      style={{
        boxShadow: isEnder
          ? 'inset 2px 2px 0px rgba(0, 0, 0, 0.7), inset -1px -1px 0px rgba(168, 85, 247, 0.2)'
          : 'inset 2px 2px 0px rgba(0, 0, 0, 0.6), inset -1px -1px 0px rgba(255, 255, 255, 0.1)',
      }}
      title={item ? `${item.customName || item.cleanName} (x${item.count})` : label || `Slot ${slotNumber ?? ''}`}
    >
      {/* Hotbar index badge */}
      {hotbarIndex !== undefined && (
        <span className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-slate-500 group-hover:text-amber-300">
          {hotbarIndex}
        </span>
      )}

      {/* Item Icon */}
      {item ? (
        <div className="relative w-7 h-7 flex items-center justify-center pointer-events-none">
          {imgErrorIndex < textureCandidates.length ? (
            <img
              src={currentImgSrc}
              alt={item.cleanName}
              onError={() => setImgErrorIndex((prev) => prev + 1)}
              className="w-full h-full object-contain filter drop-shadow"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-[10px] font-bold font-mono">
              {item.cleanName.substring(0, 2).toUpperCase()}
            </div>
          )}

          {/* Stack count badge */}
          {item.count > 1 && (
            <span
              className="absolute -bottom-1 -right-1 text-[11px] font-bold font-mono text-white leading-none px-1 rounded select-none"
              style={{
                textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
              }}
            >
              {item.count}
            </span>
          )}

          {/* Enchanted glow effect */}
          {item.enchantments && item.enchantments.length > 0 && (
            <div className="absolute inset-0 bg-purple-500/20 rounded mix-blend-screen pointer-events-none animate-pulse" />
          )}
        </div>
      ) : placeholder ? (
        /* Empty Slot Silhouette Placeholder */
        <ArmorSlotPlaceholder placeholder={placeholder} />
      ) : null}
    </div>
  );
};

interface ItemInspectorDetailProps {
  item: ParsedItem | null;
  language: string;
}

const ItemInspectorDetail: React.FC<ItemInspectorDetailProps> = ({ item, language }) => {
  if (!item) {
    return (
      <div className="p-3.5 rounded-2xl border border-dashed border-white/[0.08] bg-black/20 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Package className="w-4 h-4 text-slate-500" />
        <span>
          {language === 'bg'
            ? 'Посочете предмет с мишката, за да видите неговите детайли и омагьосвания.'
            : 'Hover over an item to inspect its attributes, lore, and enchantments.'}
        </span>
      </div>
    );
  }

  const isEnchanted = item.enchantments && item.enchantments.length > 0;

  return (
    <div className="p-4 rounded-2xl border border-purple-500/30 bg-[#100010] text-slate-100 shadow-xl space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`font-bold text-sm ${
              item.customName
                ? 'text-cyan-400 italic'
                : isEnchanted
                ? 'text-purple-300'
                : 'text-yellow-300'
            }`}
          >
            {item.customName || item.cleanName}
          </span>
          <span className="text-xs text-slate-400 font-mono">x{item.count}</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{item.id}</span>
      </div>

      {/* Enchantments list */}
      {isEnchanted && (
        <div className="space-y-1 pt-1 border-t border-purple-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
            {language === 'bg' ? 'Омагьосвания (Enchantments)' : 'Enchantments'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {item.enchantments!.map((enc, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-200"
              >
                {enc.name} {toRoman(enc.level)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lore */}
      {item.lore && item.lore.length > 0 && (
        <div className="text-xs text-purple-200 italic space-y-0.5 pt-1 border-t border-purple-500/20">
          {item.lore.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtext: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtext }) => (
  <div className="p-4 rounded-2xl border border-white/[0.06] bg-black/25 space-y-1.5 hover:border-white/[0.12] transition-colors">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
    </div>
    <div className="text-xl font-bold text-slate-100">{value}</div>
    <div className="text-[11px] text-slate-400 truncate">{subtext}</div>
  </div>
);

function toRoman(num: number): string {
  const lookup: Record<string, number> = {
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman || String(num);
}

import { CardTheme } from '../types';

// Authentic Minecraft Textures downloaded directly from official game dump
import dirtTexture from '../assets/minecraft/textures/dirt.png';
import cobblestoneTexture from '../assets/minecraft/textures/cobblestone.png';
import netherrackTexture from '../assets/minecraft/textures/netherrack.png';
import endStoneTexture from '../assets/minecraft/textures/end_stone.png';
import obsidianTexture from '../assets/minecraft/textures/obsidian.png';
import deepslateTexture from '../assets/minecraft/textures/cobbled_deepslate.png';
import bedrockTexture from '../assets/minecraft/textures/bedrock.png';
import prismarineTexture from '../assets/minecraft/textures/prismarine.png';
import woodTexture from '../assets/minecraft/textures/wood.png';

export interface ThemeStyleConfig {
  id: CardTheme;
  nameBg: string;
  nameEn: string;
  iconColor: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  glowStrip: string;
  accentBadge: string;
  previewGradient: string;
  textureUrl?: string;
  textureOpacityLight?: number;
  textureOpacityDark?: number;
  patternSize?: string;
}

export const THEME_CONFIGS: Record<CardTheme, ThemeStyleConfig> = {
  default: {
    id: 'default',
    nameBg: 'Класическа (Default)',
    nameEn: 'Classic (Default)',
    iconColor: '#6366f1',
    bgLight: 'bg-white',
    bgDark: 'bg-slate-900/40 backdrop-blur-2xl',
    borderLight: 'border-slate-200 hover:border-indigo-400/70',
    borderDark: 'border-white/[0.08] hover:border-indigo-400/40',
    glowStrip: 'bg-indigo-500',
    accentBadge: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/20',
    previewGradient: 'from-slate-800 to-slate-900 border-slate-700',
  },
  dirt: {
    id: 'dirt',
    nameBg: 'Пръст (Dirt Block)',
    nameEn: 'Dirt Block',
    iconColor: '#8d5b34',
    bgLight: 'bg-[#fbf8f5]/90',
    bgDark: 'bg-[#1f130b]/90 backdrop-blur-2xl',
    borderLight: 'border-[#d6c4b2] hover:border-[#8d5b34]/80',
    borderDark: 'border-[#5c3a21]/70 hover:border-[#a3693c]',
    glowStrip: 'bg-gradient-to-r from-[#8d5b34] via-[#b57a48] to-[#8d5b34]',
    accentBadge: 'bg-[#8d5b34]/25 text-[#e0b085] border-[#8d5b34]/40',
    previewGradient: 'from-[#3b2314] to-[#25160d] border-[#5c3a21]',
    textureUrl: dirtTexture,
    textureOpacityLight: 0.28,
    textureOpacityDark: 0.44,
    patternSize: '48px 48px',
  },
  stone: {
    id: 'stone',
    nameBg: 'Камък (Cobblestone)',
    nameEn: 'Cobblestone',
    iconColor: '#7a828e',
    bgLight: 'bg-[#f4f6f8]/90',
    bgDark: 'bg-[#181c22]/90 backdrop-blur-2xl',
    borderLight: 'border-slate-300 hover:border-slate-500',
    borderDark: 'border-slate-700/80 hover:border-slate-400',
    glowStrip: 'bg-gradient-to-r from-slate-500 via-slate-300 to-slate-500',
    accentBadge: 'bg-slate-500/25 text-slate-200 border-slate-500/40',
    previewGradient: 'from-[#2e3440] to-[#1e222b] border-slate-600',
    textureUrl: cobblestoneTexture,
    textureOpacityLight: 0.25,
    textureOpacityDark: 0.38,
    patternSize: '48px 48px',
  },
  nether: {
    id: 'nether',
    nameBg: 'Недър (Netherrack)',
    nameEn: 'Netherrack',
    iconColor: '#ef4444',
    bgLight: 'bg-[#fdf2f2]/90',
    bgDark: 'bg-[#23060a]/90 backdrop-blur-2xl',
    borderLight: 'border-rose-300 hover:border-rose-500',
    borderDark: 'border-rose-900/70 hover:border-rose-500',
    glowStrip: 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600',
    accentBadge: 'bg-rose-500/25 text-rose-200 border-rose-500/40',
    previewGradient: 'from-[#4a0e17] via-[#2d070c] to-[#1a0306] border-rose-800',
    textureUrl: netherrackTexture,
    textureOpacityLight: 0.28,
    textureOpacityDark: 0.44,
    patternSize: '48px 48px',
  },
  end: {
    id: 'end',
    nameBg: 'Енд (End Stone)',
    nameEn: 'End Stone',
    iconColor: '#c084fc',
    bgLight: 'bg-[#faf5ff]/90',
    bgDark: 'bg-[#150f24]/90 backdrop-blur-2xl',
    borderLight: 'border-purple-300 hover:border-purple-500',
    borderDark: 'border-purple-900/70 hover:border-purple-400',
    glowStrip: 'bg-gradient-to-r from-purple-500 via-fuchsia-400 to-purple-500',
    accentBadge: 'bg-purple-500/25 text-purple-200 border-purple-500/40',
    previewGradient: 'from-[#2a1c42] to-[#120b20] border-purple-800',
    textureUrl: endStoneTexture,
    textureOpacityLight: 0.28,
    textureOpacityDark: 0.38,
    patternSize: '48px 48px',
  },
  obsidian: {
    id: 'obsidian',
    nameBg: 'Обсидиан (Obsidian)',
    nameEn: 'Obsidian',
    iconColor: '#818cf8',
    bgLight: 'bg-[#f5f3ff]/90',
    bgDark: 'bg-[#100c22]/90 backdrop-blur-2xl',
    borderLight: 'border-indigo-300 hover:border-indigo-500',
    borderDark: 'border-indigo-900/80 hover:border-indigo-400',
    glowStrip: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600',
    accentBadge: 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40',
    previewGradient: 'from-[#171131] to-[#0a0717] border-indigo-900',
    textureUrl: obsidianTexture,
    textureOpacityLight: 0.25,
    textureOpacityDark: 0.45,
    patternSize: '48px 48px',
  },
  deepslate: {
    id: 'deepslate',
    nameBg: 'Дийпслейт (Deepslate)',
    nameEn: 'Deepslate',
    iconColor: '#0ea5e9',
    bgLight: 'bg-[#f0f4f8]/90',
    bgDark: 'bg-[#0e1318]/90 backdrop-blur-2xl',
    borderLight: 'border-slate-300 hover:border-sky-500',
    borderDark: 'border-slate-800 hover:border-sky-400',
    glowStrip: 'bg-gradient-to-r from-slate-600 via-sky-500 to-slate-600',
    accentBadge: 'bg-sky-500/20 text-sky-200 border-sky-500/35',
    previewGradient: 'from-[#1b222c] to-[#0c1015] border-slate-700',
    textureUrl: deepslateTexture,
    textureOpacityLight: 0.28,
    textureOpacityDark: 0.44,
    patternSize: '48px 48px',
  },
  bedrock: {
    id: 'bedrock',
    nameBg: 'Бедрок (Bedrock)',
    nameEn: 'Bedrock',
    iconColor: '#94a3b8',
    bgLight: 'bg-[#f1f3f5]/90',
    bgDark: 'bg-[#101012]/90 backdrop-blur-2xl',
    borderLight: 'border-slate-400 hover:border-slate-600',
    borderDark: 'border-zinc-800 hover:border-zinc-400',
    glowStrip: 'bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600',
    accentBadge: 'bg-zinc-500/25 text-zinc-200 border-zinc-500/40',
    previewGradient: 'from-[#1a1a1d] to-[#0a0a0c] border-zinc-700',
    textureUrl: bedrockTexture,
    textureOpacityLight: 0.25,
    textureOpacityDark: 0.44,
    patternSize: '48px 48px',
  },
  prismarine: {
    id: 'prismarine',
    nameBg: 'Призмарин (Prismarine)',
    nameEn: 'Prismarine',
    iconColor: '#14b8a6',
    bgLight: 'bg-[#f0fdfa]/90',
    bgDark: 'bg-[#061c20]/90 backdrop-blur-2xl',
    borderLight: 'border-teal-300 hover:border-teal-500',
    borderDark: 'border-teal-900/70 hover:border-teal-400',
    glowStrip: 'bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500',
    accentBadge: 'bg-teal-500/25 text-teal-200 border-teal-500/40',
    previewGradient: 'from-[#0e363d] to-[#061e22] border-teal-800',
    textureUrl: prismarineTexture,
    textureOpacityLight: 0.3,
    textureOpacityDark: 0.44,
    patternSize: '48px 48px',
  },
  wood: {
    id: 'wood',
    nameBg: 'Дърво (Oak Planks)',
    nameEn: 'Oak Planks',
    iconColor: '#b45309',
    bgLight: 'bg-[#fdfbf7]/90',
    bgDark: 'bg-[#1e130b]/90 backdrop-blur-2xl',
    borderLight: 'border-amber-300 hover:border-amber-500',
    borderDark: 'border-amber-900/70 hover:border-amber-400',
    glowStrip: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600',
    accentBadge: 'bg-amber-500/25 text-amber-200 border-amber-500/40',
    previewGradient: 'from-[#3e2415] to-[#211208] border-amber-800',
    textureUrl: woodTexture,
    textureOpacityLight: 0.28,
    textureOpacityDark: 0.42,
    patternSize: '48px 48px',
  },
};

export function getCardThemeConfig(theme?: CardTheme): ThemeStyleConfig {
  if (!theme || !THEME_CONFIGS[theme]) {
    return THEME_CONFIGS.default;
  }
  return THEME_CONFIGS[theme];
}

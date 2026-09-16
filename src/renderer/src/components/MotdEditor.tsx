import React, { useRef, useState, useEffect } from 'react';
import {
  Palette,
  CornerDownLeft,
  Trash2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  MonitorPlay,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export interface MotdSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
}

export const MINECRAFT_COLORS: Record<string, { hex: string; nameEn: string; nameBg: string }> = {
  '0': { hex: '#000000', nameEn: 'Black', nameBg: 'Черно' },
  '1': { hex: '#0000AA', nameEn: 'Dark Blue', nameBg: 'Тъмно синьо' },
  '2': { hex: '#00AA00', nameEn: 'Dark Green', nameBg: 'Тъмно зелено' },
  '3': { hex: '#00AAAA', nameEn: 'Dark Aqua', nameBg: 'Тъмна аква' },
  '4': { hex: '#AA0000', nameEn: 'Dark Red', nameBg: 'Тъмно червено' },
  '5': { hex: '#AA00AA', nameEn: 'Dark Purple', nameBg: 'Тъмно лилаво' },
  '6': { hex: '#FFAA00', nameEn: 'Gold', nameBg: 'Златно' },
  '7': { hex: '#AAAAAA', nameEn: 'Gray', nameBg: 'Сиво' },
  '8': { hex: '#555555', nameEn: 'Dark Gray', nameBg: 'Тъмно сиво' },
  '9': { hex: '#5555FF', nameEn: 'Blue', nameBg: 'Синьо' },
  'a': { hex: '#55FF55', nameEn: 'Bright Green', nameBg: 'Ярко зелено' },
  'b': { hex: '#55FFFF', nameEn: 'Aqua', nameBg: 'Аква' },
  'c': { hex: '#FF5555', nameEn: 'Red', nameBg: 'Червено' },
  'd': { hex: '#FF55FF', nameEn: 'Pink / Light Purple', nameBg: 'Розово / Светло лилаво' },
  'e': { hex: '#FFFF55', nameEn: 'Yellow', nameBg: 'Жълто' },
  'f': { hex: '#FFFFFF', nameEn: 'White', nameBg: 'Бяло' },
};

export function parseMinecraftMotd(text: string): MotdSegment[][] {
  if (!text) return [[{ text: '' }]];
  const normalized = text.replace(/\\n/g, '\n');
  const rawLines = normalized.split('\n');

  return rawLines.map((line) => {
    const segments: MotdSegment[] = [];
    let currentColor: string | undefined = undefined;
    let bold = false;
    let italic = false;
    let underline = false;
    let strikethrough = false;
    let obfuscated = false;

    let currentText = '';

    const flush = () => {
      if (currentText.length > 0) {
        segments.push({
          text: currentText,
          color: currentColor,
          bold,
          italic,
          underline,
          strikethrough,
          obfuscated,
        });
        currentText = '';
      }
    };

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if ((char === '§' || char === '&') && i + 1 < line.length) {
        const code = line[i + 1].toLowerCase();
        if (MINECRAFT_COLORS[code] !== undefined) {
          flush();
          currentColor = MINECRAFT_COLORS[code].hex;
          bold = false;
          italic = false;
          underline = false;
          strikethrough = false;
          obfuscated = false;
          i++;
          continue;
        } else if (code === 'l') {
          flush();
          bold = true;
          i++;
          continue;
        } else if (code === 'o') {
          flush();
          italic = true;
          i++;
          continue;
        } else if (code === 'n') {
          flush();
          underline = true;
          i++;
          continue;
        } else if (code === 'm') {
          flush();
          strikethrough = true;
          i++;
          continue;
        } else if (code === 'k') {
          flush();
          obfuscated = true;
          i++;
          continue;
        } else if (code === 'r') {
          flush();
          currentColor = undefined;
          bold = false;
          italic = false;
          underline = false;
          strikethrough = false;
          obfuscated = false;
          i++;
          continue;
        }
      }
      currentText += char;
    }
    flush();

    if (segments.length === 0) {
      segments.push({ text: '' });
    }
    return segments;
  });
}

// Scrambled text component for authentic §k magic obfuscated effect
const ObfuscatedText: React.FC<{ length: number }> = ({ length }) => {
  const [scramble, setScramble] = useState('');

  useEffect(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const interval = setInterval(() => {
      let res = '';
      for (let i = 0; i < length; i++) {
        res += chars[Math.floor(Math.random() * chars.length)];
      }
      setScramble(res);
    }, 60);
    return () => clearInterval(interval);
  }, [length]);

  return <span className="font-mono">{scramble || 'x'.repeat(length)}</span>;
};

interface MotdEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const MotdEditor: React.FC<MotdEditorProps> = ({ value, onChange }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeSymbolCategory, setActiveSymbolCategory] = useState<'arrows' | 'stars' | 'rpg' | 'bars' | 'brackets'>('arrows');
  const [copied, setCopied] = useState(false);

  // Parse lines in real time for the Live Minecraft Display
  const parsedLines = parseMinecraftMotd(value || '');
  const linesCount = (value.replace(/\\n/g, '\n').split('\n')).length;

  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + textToInsert);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + textToInsert + value.slice(end);

    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + textToInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const handleConvertAmp = () => {
    const converted = value.replace(/&([0-9a-fk-orA-FK-OR])/g, '§$1');
    onChange(converted);
  };

  const handleClearFormatting = () => {
    const cleared = value.replace(/[§&][0-9a-fk-orA-FK-OR]/g, '');
    onChange(cleared);
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const templates = [
    {
      id: 'survival',
      label: t('settings.motdTemplateSurvival'),
      icon: '✦',
      val: '§6✦ §e§lSURVIVAL SMP §6✦ §7[1.21.4]\\n§a» §fNew Season §7| §cHardcore §7| §bJoin Now! §a«',
    },
    {
      id: 'friends',
      label: t('settings.motdTemplateFriends'),
      icon: '★',
      val: '§b★ §f§lFriends SMP Server §b★\\n§e» §fWhitelisted & Chill §7• §a24/7 Online §e«',
    },
    {
      id: 'crossplay',
      label: t('settings.motdTemplateCrossplay'),
      icon: '⚡',
      val: '§3⚡ §b§lCROSSPLAY SERVER §3⚡\\n§eJava §7& §eBedrock §fSupported §7| §aWelcome Everyone!',
    },
    {
      id: 'hardcore',
      label: t('settings.motdTemplateHardcore'),
      icon: '☠',
      val: '§4☠ §c§lHARDCORE PVP & RPG §4☠\\n§f1 Life Only §7• §6Weekly Bosses §7• §eGuild Wars',
    },
    {
      id: 'vanilla',
      label: t('settings.motdTemplateVanilla'),
      icon: '🌿',
      val: '§fA Minecraft Server\\n§7Vanilla 1.21.4 §8• §aReady to play',
    },
  ];

  const symbolCategories = {
    arrows: {
      labelEn: 'Arrows',
      labelBg: 'Стрелки',
      symbols: ['»', '«', '▶', '◀', '➜', '➤', '➔', '►', '◄'],
    },
    stars: {
      labelEn: 'Stars',
      labelBg: 'Звезди',
      symbols: ['★', '☆', '✦', '✧', '✪', '✯', '✨', '❂', '✵'],
    },
    rpg: {
      labelEn: 'RPG & Gaming',
      labelBg: 'Гейминг / RPG',
      symbols: ['⚔', '⚡', '🛡', '⛏', '☠', '❤', '🔥', '👑', '💎', '🏹'],
    },
    bars: {
      labelEn: 'Dividers',
      labelBg: 'Разделители',
      symbols: ['•', '|', '│', '┃', '▌', '░', '▒', '▓', '═', '―', '■'],
    },
    brackets: {
      labelEn: 'Brackets',
      labelBg: 'Скоби',
      symbols: ['【', '】', '「', '」', '『', '』', '⟦', '⟧'],
    },
  };

  const formatStyles = [
    { code: '§l', label: 'B', title: language === 'bg' ? 'Получер (Bold §l)' : 'Bold (§l)', className: 'font-extrabold' },
    { code: '§o', label: 'I', title: language === 'bg' ? 'Курсив (Italic §o)' : 'Italic (§o)', className: 'italic' },
    { code: '§n', label: 'U', title: language === 'bg' ? 'Подчертан (Underline §n)' : 'Underline (§n)', className: 'underline' },
    { code: '§m', label: 'S', title: language === 'bg' ? 'Зачеркнат (Strike §m)' : 'Strikethrough (§m)', className: 'line-through' },
    { code: '§k', label: '?', title: language === 'bg' ? 'Магически / Объркващ (§k)' : 'Obfuscated / Magic (§k)', className: 'font-mono' },
    { code: '§r', label: '⟳', title: language === 'bg' ? 'Нулирай форматирането (Reset §r)' : 'Reset Formatting (§r)', className: 'text-amber-500 font-bold' },
  ];

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 shadow-xs transition-all ${
      theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/[0.08]'
    }`}>
      {/* Header & Quick Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold tracking-tight flex items-center gap-1.5 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {t('settings.motdSection')}
              <span className={`text-[10px] px-2 py-0.2 rounded-md font-mono border font-semibold ${
                linesCount > 2
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : theme === 'light'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
              }`}>
                {language === 'bg' ? `${linesCount}/2 реда` : `${linesCount}/2 lines`}
              </span>
            </h4>
            <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('settings.motdSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick Utility Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => insertAtCursor('§')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
            }`}
            title={t('settings.motdInsertSection')}
          >
            {t('settings.motdInsertSection')}
          </button>

          <button
            type="button"
            onClick={handleConvertAmp}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
            }`}
            title={t('settings.motdConvertAmp')}
          >
            {t('settings.motdConvertAmp')}
          </button>

          <button
            type="button"
            onClick={() => insertAtCursor('\\n')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer btn-bounce ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
            }`}
            title={t('settings.motdAddLine')}
          >
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              <span>{t('settings.motdAddLine')}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleClearFormatting}
            className={`p-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
              theme === 'light'
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border-white/[0.06]'
            }`}
            title={t('settings.motdClearFormat')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyRaw}
            className={`p-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
              theme === 'light'
                ? 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200'
                : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/30 border-white/[0.06]'
            }`}
            title={language === 'bg' ? 'Копирай суров код' : 'Copy raw MOTD'}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* ================= REAL-TIME MINECRAFT LIVE OUTPUT SCREEN ================= */}
      <div className="relative rounded-xl border border-black/40 overflow-hidden shadow-lg bg-[#0b0c10]">
        {/* Top Screen Status Bar */}
        <div className="px-3.5 py-2 bg-[#12141c] border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-400 tracking-wide flex items-center gap-1.5 font-mono">
              <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
              {t('settings.motdLivePreview')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              Real-Time Compiler (§ / &)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 border border-white/[0.1]">
              Minecraft 1.21.x
            </span>
          </div>
        </div>

        {/* Screen Display Lines with authentic Minecraft font styling & text shadows */}
        <div className="p-4 space-y-1.5 min-h-[76px] flex flex-col justify-center select-text">
          {/* Line 1 */}
          <div
            className="text-xs sm:text-[13px] font-mono tracking-wide leading-relaxed truncate"
            style={{ textShadow: '1.5px 1.5px 0px rgba(0,0,0,0.95)' }}
          >
            {parsedLines[0] && parsedLines[0].some((s) => s.text.trim().length > 0) ? (
              parsedLines[0].map((seg, idx) => (
                <span
                  key={idx}
                  style={{
                    color: seg.color || '#AAAAAA',
                    fontWeight: seg.bold ? 'bold' : 'normal',
                    fontStyle: seg.italic ? 'italic' : 'normal',
                    textDecoration: [
                      seg.underline ? 'underline' : '',
                      seg.strikethrough ? 'line-through' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined,
                  }}
                >
                  {seg.obfuscated ? <ObfuscatedText length={seg.text.length} /> : seg.text}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-[11px] select-none">
                {t('settings.motdLine1Empty')}
              </span>
            )}
          </div>

          {/* Line 2 */}
          <div
            className="text-xs sm:text-[13px] font-mono tracking-wide leading-relaxed truncate"
            style={{ textShadow: '1.5px 1.5px 0px rgba(0,0,0,0.95)' }}
          >
            {parsedLines[1] && parsedLines[1].some((s) => s.text.trim().length > 0) ? (
              parsedLines[1].map((seg, idx) => (
                <span
                  key={idx}
                  style={{
                    color: seg.color || '#AAAAAA',
                    fontWeight: seg.bold ? 'bold' : 'normal',
                    fontStyle: seg.italic ? 'italic' : 'normal',
                    textDecoration: [
                      seg.underline ? 'underline' : '',
                      seg.strikethrough ? 'line-through' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined,
                  }}
                >
                  {seg.obfuscated ? <ObfuscatedText length={seg.text.length} /> : seg.text}
                </span>
              ))
            ) : (
              <span className="text-slate-600 italic text-[11px] select-none">
                {t('settings.motdLine2Empty')}
              </span>
            )}
          </div>
        </div>

        {/* Warning if more than 2 lines */}
        {linesCount > 2 && (
          <div className="px-3.5 py-1.5 bg-rose-950/70 border-t border-rose-500/30 flex items-center gap-1.5 text-rose-300 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{t('settings.motdLineWarning')}</span>
          </div>
        )}
      </div>

      {/* ================= 1-CLICK QUICK TEMPLATES ================= */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
          }`}>
            <Sparkles className="w-3 h-3 text-amber-400" />
            {t('settings.motdTemplates')}:
          </span>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
            {language === 'bg' ? 'Кликни за бързо зареждане' : 'Click to load'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onChange(tpl.val)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 btn-bounce ${
                theme === 'light'
                  ? 'bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 border-slate-200 shadow-xs'
                  : 'glass-card hover:bg-indigo-500/15 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-200 border-white/[0.08]'
              }`}
              title={tpl.label}
            >
              <span>{tpl.icon}</span>
              <span className="truncate">{tpl.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ================= MOTD TEXTAREA INPUT ================= */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="§6✦ CraftDock Server ✦ §a[1.21]\\n§e» §bSurvival §7| §cHardcore §e«"
          className={`w-full p-3 rounded-xl text-xs font-mono transition-all focus:outline-none border leading-relaxed resize-y ${
            theme === 'light'
              ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-pink-500 shadow-xs'
              : 'glass-input text-slate-100 focus:border-pink-400'
          }`}
        />
        <div className={`text-[10px] flex items-center justify-between mt-1 px-1 ${
          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <span>{t('settings.motdLinesHint')}</span>
          <span className="font-mono">{value.length} {language === 'bg' ? 'символа' : 'chars'}</span>
        </div>
      </div>

      {/* ================= COLOR PALETTE & STYLES ================= */}
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          {/* 16 Minecraft Colors */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${
              theme === 'light' ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t('settings.motdColors')}:
            </span>
            {Object.entries(MINECRAFT_COLORS).map(([code, info]) => (
              <button
                key={code}
                type="button"
                onClick={() => insertAtCursor(`§${code}`)}
                style={{ backgroundColor: info.hex }}
                className={`w-5 h-5 rounded-md border shadow-xs transition-transform hover:scale-115 active:scale-95 cursor-pointer btn-bounce ${
                  info.hex === '#FFFFFF' || info.hex === '#FFFF55'
                    ? 'border-slate-400/80'
                    : 'border-black/30'
                }`}
                title={`§${code} - ${language === 'bg' ? info.nameBg : info.nameEn}`}
              />
            ))}
          </div>

          {/* Styles: Bold, Italic, Underline, Strike, Reset */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${
              theme === 'light' ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {t('settings.motdStyles')}:
            </span>
            {formatStyles.map((style) => (
              <button
                key={style.code}
                type="button"
                onClick={() => insertAtCursor(style.code)}
                className={`w-6 h-6 rounded-md text-[11px] font-bold border transition-all cursor-pointer btn-bounce flex items-center justify-center ${style.className} ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'glass-card hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                }`}
                title={style.title}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Special Symbols Toolbar */}
        <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
          theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-white/[0.06]'
        }`}>
          {/* Symbol Category Tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(symbolCategories) as Array<keyof typeof symbolCategories>).map((catKey) => {
              const cat = symbolCategories[catKey];
              const isActive = activeSymbolCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setActiveSymbolCategory(catKey)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? theme === 'light'
                        ? 'bg-white text-pink-700 shadow-xs border border-slate-200'
                        : 'bg-pink-600/30 text-pink-200 border border-pink-500/40'
                      : theme === 'light'
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bg' ? cat.labelBg : cat.labelEn}
                </button>
              );
            })}
          </div>

          {/* Category Symbols */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {symbolCategories[activeSymbolCategory].symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => insertAtCursor(sym)}
                className={`w-6 h-6 rounded-md text-xs font-bold border transition-all cursor-pointer btn-bounce flex items-center justify-center ${
                  theme === 'light'
                    ? 'bg-white hover:bg-pink-50 hover:text-pink-700 text-slate-800 border-slate-200 shadow-xs'
                    : 'glass-card hover:bg-white/[0.08] hover:text-pink-300 text-slate-200 border-white/[0.08]'
                }`}
                title={`${language === 'bg' ? 'Вмъкни' : 'Insert'} ${sym}`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

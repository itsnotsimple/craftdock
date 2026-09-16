import React, { useState } from 'react';
import { Cpu, HardDrive, AlertTriangle, CheckCircle2, Flame, Users, Sparkles, Wand2, Star } from 'lucide-react';
import { calculateRamAdvice, getRecommendedRam } from '../utils/ramCalculator';
import { ServerSoftware } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface RamSliderProps {
  ramGb: number;
  onRamChange: (ram: number) => void;
  targetPlayers: number;
  onPlayersChange: (players: number) => void;
  software: ServerSoftware;
  systemTotalRamGb: number;
  systemFreeRamGb: number;
}

export const RamSlider: React.FC<RamSliderProps> = ({
  ramGb,
  onRamChange,
  targetPlayers,
  onPlayersChange,
  software,
  systemTotalRamGb,
  systemFreeRamGb,
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [isCustomPlayers, setIsCustomPlayers] = useState<boolean>(![2, 4, 8, 12, 16].includes(targetPlayers));
  const maxSliderRam = Math.min(32, Math.max(12, Math.floor(systemTotalRamGb)));
  const advice = calculateRamAdvice(ramGb, targetPlayers, software, systemTotalRamGb, systemFreeRamGb, language);
  const recommendedRam = getRecommendedRam(targetPlayers, software);

  const getStatusColor = () => {
    if (theme === 'light') {
      switch (advice.status) {
        case 'danger':
          return 'border-rose-300 bg-rose-50 text-rose-950 shadow-xs';
        case 'warning':
          return 'border-amber-300 bg-amber-50 text-amber-950 shadow-xs';
        case 'optimal':
          return 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs';
        case 'beast':
          return 'border-indigo-300 bg-indigo-50 text-indigo-950 shadow-xs';
      }
    }
    switch (advice.status) {
      case 'danger':
        return 'border-rose-500/50 bg-rose-950/20 text-rose-300';
      case 'warning':
        return 'border-amber-500/50 bg-amber-950/20 text-amber-300';
      case 'optimal':
        return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
      case 'beast':
        return 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300';
    }
  };

  const getBadge = () => {
    const isLight = theme === 'light';
    switch (advice.status) {
      case 'danger':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> {t('ramSlider.dangerBadge')}
          </span>
        );
      case 'warning':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {t('ramSlider.warningBadge')}
          </span>
        );
      case 'optimal':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t('ramSlider.optimalBadge')}
          </span>
        );
      case 'beast':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
          }`}>
            <Flame className="w-3.5 h-3.5 text-indigo-500" /> {t('ramSlider.beastBadge')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* System Hardware Insight */}
      <div className={`flex items-center justify-between p-3.5 rounded-xl text-sm border ${
        theme === 'light'
          ? 'bg-slate-50/80 border-slate-200 text-slate-700 shadow-xs'
          : 'glass-card'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            theme === 'light'
              ? 'bg-sky-50 text-sky-600 border-sky-200'
              : 'bg-sky-500/15 text-sky-400 border-sky-400/20'
          }`}>
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-xs font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('ramSlider.pcHas')}</div>
            <div className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
              <span className={theme === 'light' ? 'text-sky-700 font-bold' : 'text-sky-400'}>{systemTotalRamGb} GB</span> {t('ramSlider.totalRam')} /{' '}
              <span className={theme === 'light' ? 'text-cyan-700 font-bold' : 'text-cyan-400'}>{systemFreeRamGb} GB</span> {t('ramSlider.freeRam')}
            </div>
          </div>
        </div>
        <div className={`hidden sm:block text-right text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
          <span className={theme === 'light' ? 'text-sky-700 font-semibold' : 'text-sky-400 font-semibold'}>{t('ramSlider.realHomeHost')}</span>
          <br />{t('ramSlider.noLimits')}
        </div>
      </div>

      {/* Target Players Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-semibold flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-300'
          }`}>
            <Users className="w-4 h-4 text-sky-500" />
            {t('ramSlider.howManyPlayers')}
          </label>
          <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${
            theme === 'light'
              ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
              : 'bg-white/[0.04] border-white/[0.08] text-sky-400'
          }`}>
            {targetPlayers} {targetPlayers === 1 ? t('common.player') : t('common.players')}
          </span>
        </div>

        {/* Player Count Preset Buttons + Custom Option */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[2, 4, 8, 12, 16].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => {
                setIsCustomPlayers(false);
                onPlayersChange(count);
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center cursor-pointer ${
                !isCustomPlayers && targetPlayers === count
                  ? theme === 'light'
                    ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-xs'
                    : 'bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-sm'
                  : theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              {count === 2 && t('ramSlider.preset2')}
              {count === 4 && t('ramSlider.preset4')}
              {count === 8 && t('ramSlider.preset8')}
              {count === 12 && t('ramSlider.preset12')}
              {count === 16 && t('ramSlider.preset16')}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsCustomPlayers(true)}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center cursor-pointer ${
              isCustomPlayers
                ? theme === 'light'
                  ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-xs'
                  : 'bg-sky-500/20 border-sky-400/50 text-sky-200 shadow-sm'
                : theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
          >
            {t('ramSlider.customCount')}
          </button>
        </div>

        {/* Custom Players Input */}
        {isCustomPlayers && (
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'glass-card'
          }`}>
            <span className={`text-xs font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              {t('ramSlider.enterCustomCount')}
            </span>
            <input
              type="number"
              min="1"
              max="100"
              value={targetPlayers}
              onChange={(e) => onPlayersChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-24 px-3 py-1.5 rounded-lg text-sm font-bold font-mono focus:outline-none border ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-sky-800 focus:border-sky-500 shadow-xs'
                  : 'glass-input text-sky-400 focus:border-sky-400'
              }`}
            />
            <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>
              {t('ramSlider.calcNotice')}
            </span>
          </div>
        )}
      </div>

      {/* RAM Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-semibold flex items-center gap-2 ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-300'
          }`}>
            <Cpu className="w-4 h-4 text-sky-500" />
            {t('ramSlider.allocateRam')}
          </label>
          <div className="flex items-center gap-3">
            {/* Auto-set recommended RAM button */}
            {ramGb !== recommendedRam && (
              <button
                type="button"
                onClick={() => onRamChange(Math.min(maxSliderRam, recommendedRam))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 shadow-xs'
                    : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
                }`}
                title={t('ramSlider.setRecommended', { ram: recommendedRam })}
              >
                <Wand2 className="w-3.5 h-3.5" />
                {t('ramSlider.setRecommended', { ram: recommendedRam })}
              </button>
            )}

            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tracking-tight ${
                theme === 'light' ? 'text-sky-700' : 'text-sky-400'
              }`}>{ramGb}</span>
              <span className={`text-sm font-semibold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                GB RAM
              </span>
            </div>
          </div>
        </div>

        {/* Range Track */}
        <div className="relative py-2">
          <input
            type="range"
            min="1"
            max={maxSliderRam}
            step="1"
            value={ramGb}
            onChange={(e) => onRamChange(parseInt(e.target.value, 10))}
            className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none ${
              theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1.5 px-0.5">
            <span>1 GB</span>
            <span>4 GB</span>
            <span>8 GB</span>
            <span>12 GB</span>
            <span>{maxSliderRam} GB</span>
          </div>
        </div>

        {/* Quick RAM Preset buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[2, 4, 6, 8, 10, 12, 16].filter((r) => r <= maxSliderRam).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRamChange(r)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1 ${
                ramGb === r
                  ? theme === 'light'
                    ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold shadow-xs'
                    : 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                  : theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <span>{r} GB</span>
              {r === recommendedRam && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Intelligence Advice Card */}
      <div className={`p-4 rounded-xl border transition-all ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {advice.title}
          </div>
          {getBadge()}
        </div>

        <p className="text-xs leading-relaxed opacity-95">
          {advice.description}
        </p>

        <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
          theme === 'light' ? 'border-slate-200/80 text-slate-600' : 'border-slate-800/60 text-slate-400'
        }`}>
          <span>
            {t('ramSlider.recommendedFor')} <strong className={theme === 'light' ? 'text-slate-900' : 'text-slate-200'}>{advice.recommendedUse}</strong>
          </span>
          <span>
            {t('ramSlider.recommendedRamFor', { players: targetPlayers })}{' '}
            <strong className={theme === 'light' ? 'text-cyan-800 font-bold' : 'text-cyan-300 font-bold'}>{recommendedRam} GB</strong>
          </span>
        </div>

        {advice.isOverSystemLimit && (
          <div className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
            theme === 'light'
              ? 'bg-rose-100 border-rose-300 text-rose-900 shadow-xs'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>
              {t('ramSlider.overSystemWarning', { ram: ramGb, free: systemFreeRamGb })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

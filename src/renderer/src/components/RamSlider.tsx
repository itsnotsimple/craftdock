import React, { useState } from 'react';
import { Cpu, HardDrive, AlertTriangle, CheckCircle2, Flame, Users, Sparkles, Wand2 } from 'lucide-react';
import { calculateRamAdvice, getRecommendedRam } from '../utils/ramCalculator';
import { ServerSoftware } from '../types';

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
  const [isCustomPlayers, setIsCustomPlayers] = useState<boolean>(![2, 4, 8, 12, 16].includes(targetPlayers));
  const maxSliderRam = Math.min(32, Math.max(12, Math.floor(systemTotalRamGb)));
  const advice = calculateRamAdvice(ramGb, targetPlayers, software, systemTotalRamGb, systemFreeRamGb);
  const recommendedRam = getRecommendedRam(targetPlayers, software);

  const getStatusColor = () => {
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
    switch (advice.status) {
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Критичен лаг!
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> На ръба (Спад на TPS)
          </span>
        );
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Идеално съотношение
          </span>
        );
      case 'beast':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Flame className="w-3.5 h-3.5" /> Звяр производителност
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* System Hardware Insight */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Твоят компютър разполага с:</div>
            <div className="font-semibold text-slate-200">
              <span className="text-emerald-400">{systemTotalRamGb} GB</span> Общо RAM /{' '}
              <span className="text-cyan-400">{systemFreeRamGb} GB</span> Свободни
            </div>
          </div>
        </div>
        <div className="hidden sm:block text-right text-xs text-slate-400">
          <span className="text-emerald-400 font-semibold">Истински Домашен Хост</span>
          <br />(Без 1GB ограничения и без опашки)
        </div>
      </div>

      {/* Target Players Selector */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Колко приятели ще играете?
          </label>
          <span className="text-sm font-bold px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400">
            {targetPlayers} {targetPlayers === 1 ? 'играч' : 'играчи'}
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
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center ${
                !isCustomPlayers && targetPlayers === count
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {count === 2 && '2 авери'}
              {count === 4 && '4 човека'}
              {count === 8 && '8 играчи'}
              {count === 12 && '12 души'}
              {count === 16 && '16 тайфа'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsCustomPlayers(true)}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center ${
              isCustomPlayers
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ✏️ Друг брой
          </button>
        </div>

        {/* Custom Players Input */}
        {isCustomPlayers && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Въведи точен брой играчи:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={targetPlayers}
              onChange={(e) => onPlayersChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <span className="text-xs text-slate-500">
              (Калкулаторът ще пресметне автоматично нужната RAM)
            </span>
          </div>
        )}
      </div>

      {/* RAM Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Задели RAM памет за сървъра:
          </label>
          <div className="flex items-center gap-3">
            {/* Auto-set recommended RAM button */}
            {ramGb !== recommendedRam && (
              <button
                type="button"
                onClick={() => onRamChange(Math.min(maxSliderRam, recommendedRam))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
                title="Задай автоматично препоръчаната RAM за избраните играчи"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Задай препоръчана ({recommendedRam} GB)
              </button>
            )}

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-cyan-400 tracking-tight">{ramGb}</span>
              <span className="text-sm font-semibold text-slate-400">GB RAM</span>
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
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
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
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border ${
                ramGb === r
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r} GB {r === recommendedRam ? '⭐' : ''}
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

        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Препоръчително за: <strong className="text-slate-200">{advice.recommendedUse}</strong>
          </span>
          <span className="text-slate-400">
            Препоръчана RAM за {targetPlayers} {targetPlayers === 1 ? 'играч' : 'играчи'}:{' '}
            <strong className="text-cyan-300 font-bold">{recommendedRam} GB</strong>
          </span>
        </div>

        {advice.isOverSystemLimit && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              Внимание: Избирате {ramGb} GB при {systemFreeRamGb} GB налични. Компютърът ви може да се забави.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

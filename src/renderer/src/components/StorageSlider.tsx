import React from 'react';
import { Database, HardDrive, Infinity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface StorageSliderProps {
  storageQuotaGb: number;
  onChange: (val: number) => void;
  maxLimitGb?: number;
}

export const StorageSlider: React.FC<StorageSliderProps> = ({
  storageQuotaGb,
  onChange,
  maxLimitGb = 250,
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const presets = [
    { value: 0, label: t('storage.unlimited') },
    { value: 5, label: '5 GB' },
    { value: 10, label: '10 GB' },
    { value: 25, label: '25 GB' },
    { value: 50, label: '50 GB' },
    { value: 100, label: '100 GB' },
    { value: 200, label: '200 GB' },
  ];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange(isNaN(val) ? 0 : Math.max(0, Math.min(val, maxLimitGb)));
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.trim();
    if (text === '') {
      onChange(0);
      return;
    }
    const val = parseInt(text, 10);
    if (!isNaN(val)) {
      onChange(Math.max(0, Math.min(val, 1000)));
    }
  };

  const sliderPercent = Math.min(100, Math.max(0, (storageQuotaGb / maxLimitGb) * 100));

  return (
    <div className="space-y-3">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-500" />
          <span className={`text-xs font-bold ${
            theme === 'light' ? 'text-slate-800' : 'text-slate-200'
          }`}>
            {t('storage.sliderTitle')}
          </span>
        </div>

        {/* Selected Value Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
            storageQuotaGb > 0
              ? theme === 'light'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs'
                : 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
              : theme === 'light'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
              : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
          }`}>
            {storageQuotaGb > 0 ? (
              <>
                <HardDrive className="w-3 h-3 text-indigo-500" />
                <span>{storageQuotaGb} GB</span>
              </>
            ) : (
              <>
                <Infinity className="w-3 h-3 text-emerald-500" />
                <span>{t('storage.unlimited')}</span>
              </>
            )}
          </span>

          {/* Direct Custom Number Input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="1000"
              value={storageQuotaGb === 0 ? '' : storageQuotaGb}
              placeholder="0"
              onChange={handleNumberInput}
              title={t('storage.customGb')}
              className={`w-14 px-2 py-1 text-xs text-center font-mono font-bold rounded-lg border focus:outline-none transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500 shadow-xs'
                  : 'glass-input text-slate-200 focus:border-indigo-400'
              }`}
            />
            <span className={`text-[10px] font-bold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              GB
            </span>
          </div>
        </div>
      </div>

      {/* Range Slider Track */}
      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min="0"
          max={maxLimitGb}
          step="1"
          value={storageQuotaGb}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-indigo-600 focus:outline-none"
          style={{
            background: theme === 'light'
              ? `linear-gradient(to right, #6366f1 0%, #6366f1 ${sliderPercent}%, #e2e8f0 ${sliderPercent}%, #e2e8f0 100%)`
              : `linear-gradient(to right, #818cf8 0%, #6366f1 ${sliderPercent}%, rgba(255,255,255,0.08) ${sliderPercent}%, rgba(255,255,255,0.08) 100%)`,
          }}
        />
        <div className={`flex justify-between text-[10px] font-mono mt-1 ${
          theme === 'light' ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>0 GB ({t('storage.unlimited')})</span>
          <span>50 GB</span>
          <span>100 GB</span>
          <span>150 GB</span>
          <span>200 GB</span>
          <span>{maxLimitGb} GB</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {presets.map((preset) => {
          const isSelected = storageQuotaGb === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                isSelected
                  ? theme === 'light'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-xs'
                    : 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200 font-bold shadow-sm'
                  : theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

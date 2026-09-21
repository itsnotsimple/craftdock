import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Sparkles, X, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export interface VersionComboboxProps {
  value: string;
  onChange: (version: string) => void;
  versions: Array<{ version: string; isLatest?: boolean }>;
  disabled?: boolean;
  placeholder?: string;
  currentVersion?: string;
  className?: string;
}

export function isValidMinecraftVersion(v: string): boolean {
  if (!v || typeof v !== 'string') return false;
  const clean = v.trim().replace(/^minecraft\s*v?/i, '').replace(/^v/i, '').trim();

  // Standard release: 1.0 to 1.35.x (e.g. 1.8, 1.8.8, 1.20.4, 1.21)
  if (/^1\.\d{1,2}(\.\d{1,2})?$/.test(clean)) {
    const parts = clean.split('.').map(Number);
    if (parts[1] !== undefined && (parts[1] < 0 || parts[1] > 35)) return false;
    if (parts[2] !== undefined && (parts[2] < 0 || parts[2] > 35)) return false;
    return true;
  }

  // Pre-releases and release candidates (e.g. 1.21.4-rc1, 1.20-pre1)
  if (/^1\.\d{1,2}(\.\d{1,2})?-(pre\d+|rc\d+)$/i.test(clean)) {
    return true;
  }

  // Snapshots (e.g. 24w14a, 23w51b)
  if (/^\d{2}w\d{2}[a-z]$/i.test(clean)) {
    return true;
  }

  // Old beta/alpha (e.g. b1.7.3, a1.2.6)
  if (/^[a-b]1\.\d{1,2}(\.\d{1,2})?$/i.test(clean)) {
    return true;
  }

  return false;
}

export const VersionCombobox: React.FC<VersionComboboxProps> = ({
  value,
  onChange,
  versions,
  disabled = false,
  placeholder,
  currentVersion,
  className = '',
}) => {
  const { theme } = useTheme();
  const { language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const cleanSearch = useMemo(() => {
    return searchTerm.trim().replace(/^minecraft\s*v?/i, '').replace(/^v/i, '').trim();
  }, [searchTerm]);

  // Filter and sort versions: exact match always first at index 0!
  const filteredVersions = useMemo(() => {
    if (!cleanSearch) {
      return versions;
    }
    const q = cleanSearch.toLowerCase();
    const matching = versions.filter((v) => v.version.toLowerCase().includes(q));

    return matching.sort((a, b) => {
      const aLower = a.version.toLowerCase();
      const bLower = b.version.toLowerCase();
      if (aLower === q) return -1;
      if (bLower === q) return 1;
      const aStarts = aLower.startsWith(q);
      const bStarts = bLower.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [versions, cleanSearch]);

  const hasExactMatch = useMemo(() => {
    if (!cleanSearch) return false;
    return versions.some((v) => v.version.toLowerCase() === cleanSearch.toLowerCase());
  }, [versions, cleanSearch]);

  const isCustomValidVersion = useMemo(() => {
    if (!cleanSearch) return false;
    return !hasExactMatch && isValidMinecraftVersion(cleanSearch);
  }, [cleanSearch, hasExactMatch]);

  // Close dropdown on click outside and clear unselected search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (v: string) => {
    onChange(v);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. Exact match in versions list (e.g. typing "1.8", "1.20", "1.21.4")
      const exactMatch = versions.find(
        (v) => v.version.toLowerCase() === cleanSearch.toLowerCase()
      );
      if (exactMatch) {
        handleSelect(exactMatch.version);
        return;
      }

      // 2. Custom valid version
      if (isCustomValidVersion) {
        handleSelect(cleanSearch);
        return;
      }

      // 3. If dropdown has matching items, select highlighted item
      if (filteredVersions.length > 0 && filteredVersions[highlightedIndex]) {
        handleSelect(filteredVersions[highlightedIndex].version);
        return;
      }

      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredVersions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredVersions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredVersions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredVersions.length) % filteredVersions.length);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Combobox Trigger & Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-cyan-500" />
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : value ? `Minecraft v${value}` : ''}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={(e) => {
            setSearchTerm(value || '');
            setIsOpen(true);
            setHighlightedIndex(0);
            e.target.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (language === 'bg' ? 'Въведи или избери версия (напр. 1.21.4, 1.8.8)...' : 'Type or pick version (e.g. 1.21.4, 1.8.8)...')
          }
          className={`w-full pl-9 pr-16 py-2.5 rounded-xl text-xs sm:text-sm font-mono transition-all border focus:outline-none cursor-text ${
            theme === 'light'
              ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-xs'
              : 'glass-input text-slate-100 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {isOpen && searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setHighlightedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!isOpen) {
                setSearchTerm(value || '');
                setHighlightedIndex(0);
                inputRef.current?.focus();
              }
              setIsOpen(!isOpen);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Options Popover */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border shadow-2xl z-50 p-1.5 space-y-1 ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-slate-300/50'
              : 'bg-[#0b101e]/95 border-white/[0.1] backdrop-blur-xl shadow-black/80'
          }`}
        >
          {/* Custom valid version write-in (without the press enter button) */}
          {isCustomValidVersion && (
            <button
              type="button"
              onClick={() => handleSelect(cleanSearch)}
              className="w-full flex flex-col gap-1 p-2.5 rounded-lg text-left transition-colors cursor-pointer border bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30 mb-1"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs font-mono">
                  {language === 'bg' ? 'Използвай: ' : 'Use version: '}
                  <strong className="text-cyan-400 font-bold">v{cleanSearch}</strong>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight pl-5.5">
                {language === 'bg'
                  ? 'Тази официална версия ще се потърси и изтегли от сървърите на Mojang / Paper.'
                  : 'This official release will be fetched from Mojang / Paper.'}
              </p>
            </button>
          )}
          {/* List of filtered versions */}
          {filteredVersions.length > 0 ? (
            filteredVersions.map((v, idx) => {
              const isSelected = value === v.version;
              const isCurrent = currentVersion && currentVersion === v.version;
              const isHighlighted = highlightedIndex === idx;

              return (
                <button
                  key={v.version}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(v.version)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : isHighlighted
                      ? theme === 'light'
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'bg-white/10 text-white font-medium'
                      : theme === 'light'
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold tracking-tight">
                      Minecraft v{v.version}
                    </span>
                    {v.isLatest && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {language === 'bg' ? 'Най-нова' : 'Latest'}
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {language === 'bg' ? 'Текуща' : 'Current'}
                      </span>
                    )}
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="py-4 px-3 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>
                  {language === 'bg'
                    ? `Няма намерени версии за "${cleanSearch || searchTerm.trim()}"`
                    : `No versions found for "${cleanSearch || searchTerm.trim()}"`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'bg'
                  ? 'Моля, провери изписването или избери от списъка.'
                  : 'Please check your spelling or select from the list.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Informative helper hint */}
      <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] leading-tight ${
        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
      }`}>
        <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
        <span>
          {language === 'bg'
            ? 'Пиши за бързо търсене (напр. 1.8, 1.20) или избери от падащия списък. Налични са всички официални версии от 1.8 нагоре.'
            : 'Type to search (e.g. 1.8, 1.20) or select from the dropdown. All official releases from 1.8 upwards are available.'}
        </span>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  RefreshCw,
  Sliders,
  Wrench,
  X,
  Layers,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { CrashAnalysisResult, CrashReportFile } from '../types';

interface CrashAnalyzerModalProps {
  serverId: string;
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  selectedSession?: {
    id?: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    exitCode?: number | null;
    wasGraceful?: boolean;
  } | null;
}

export const CrashAnalyzerModal: React.FC<CrashAnalyzerModalProps> = ({
  serverId,
  serverName,
  isOpen,
  onClose,
  onNavigateTab,
  selectedSession,
}) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<CrashReportFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [analysis, setAnalysis] = useState<CrashAnalysisResult | null>(null);
  const [showRawLog, setShowRawLog] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAnalysis = async (file?: string) => {
    setLoading(true);
    try {
      const api = (window as any).api;
      if (!api) return;

      // 1. Fetch file list
      const fileList: CrashReportFile[] = (await api.getCrashReports?.(serverId)) || [];
      setReports(fileList);

      // 2. Fetch analysis for specified file or newest
      const targetFile = file || (fileList.length > 0 ? fileList[0].fileName : undefined);
      if (targetFile) setSelectedFile(targetFile);

      const result: CrashAnalysisResult = await api.analyzeCrash?.(
        serverId,
        targetFile,
        selectedSession,
        language
      );
      setAnalysis(result);
    } catch (err) {
      console.error('Failed to load crash analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShowRawLog(false);
      setCopied(false);
      fetchAnalysis();
    }
  }, [isOpen, serverId, selectedSession, language]);

  // If the user clicked a crash session from history, NEVER show "No Crashes Detected"
  const effectiveAnalysis = useMemo<CrashAnalysisResult | null>(() => {
    if (analysis && analysis.hasCrash) {
      return analysis;
    }
    if (
      selectedSession &&
      (selectedSession.wasGraceful === false ||
        (selectedSession.exitCode !== 0 && selectedSession.exitCode !== null && selectedSession.exitCode !== undefined))
    ) {
      const code = selectedSession.exitCode ?? -1;
      const isOom = code === 137;
      const isInterrupted = code === 130 || code === 143;

      return {
        hasCrash: true,
        fileName: 'uptime-history.json',
        fileDate: selectedSession.endedAt || selectedSession.startedAt,
        category: isOom ? 'oom' : 'unknown',
        severity: isOom ? 'critical' : 'warning',
        title: isOom
          ? language === 'bg'
            ? 'Срив поради недостиг на RAM памет (OOM / Код 137)'
            : 'Out of Memory Crash (Exit Code 137 / SIGKILL)'
          : isInterrupted
          ? language === 'bg'
            ? `Процесът е прекъснат външно (Сигнал ${code})`
            : `Process Terminated Externally (Signal ${code})`
          : language === 'bg'
          ? `Неочаквано спиране на сървъра (Код ${code})`
          : `Unexpected Server Stop (Exit Code ${code})`,
        description: isOom
          ? language === 'bg'
            ? 'Сървърният процес беше принудително терминиран от операционната система (Exit Code 137 / OOM Killer), тъй като надвиши разрешената RAM памет.'
            : 'Server process was killed by the operating system (Exit Code 137 / OOM Killer) because memory exceeded allocated limits.'
          : isInterrupted
          ? language === 'bg'
            ? 'Сървърът е бил спрян от външен сигнал (затваряне на прозореца на конзолата или рестартиране на компютъра).'
            : 'The server was terminated by an external interrupt signal (SIGINT/SIGTERM or system reboot).'
          : language === 'bg'
          ? `Сървърът е прекратил работа с код ${code} без стандартно плавно изключване. Процесът приключи преди да запише отделен файл в crash-reports.`
          : `Server process terminated abruptly with code ${code} without a clean shutdown. No dedicated crash-report file was generated.`,
        recommendation: isOom
          ? language === 'bg'
            ? 'Отидете в "Настройки на сървъра" и увеличете заделената RAM памет (препоръчително поне 4GB - 6GB).'
            : 'Go to "Server Settings" and increase allocated RAM (recommended 4GB - 6GB).'
          : language === 'bg'
          ? 'Прегледайте последните редове от системния лог по-долу. Ако сървърът е спрян от Task Manager, това е очаквано. В противен случай проверете настройките и портовете.'
          : 'Review the recent log output below. If the server was stopped via Task Manager or PC shutdown, this is expected.',
        relevantLines: [
          `Session ID: ${selectedSession.id || 'N/A'}`,
          `Started: ${selectedSession.startedAt}`,
          `Ended: ${selectedSession.endedAt || 'unknown'}`,
          `Exit Code: ${code} ${isOom ? '(Out Of Memory / SIGKILL)' : ''}`,
          `Graceful: false`,
        ],
        rawLog: analysis?.rawLog || '',
      };
    }
    return analysis;
  }, [analysis, selectedSession, language]);

  if (!isOpen) return null;

  const handleCopyLog = () => {
    const raw = effectiveAnalysis?.rawLog || analysis?.rawLog;
    if (!raw) return;
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (fileName: string) => {
    setSelectedFile(fileName);
    fetchAnalysis(fileName);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl max-h-[88vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'glass-panel border-white/[0.08] text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 px-6 border-b flex items-center justify-between gap-4 ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>{t('crash.modalTitle')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('crash.modalSubtitle')}{' '}
                <b className={theme === 'light' ? 'text-slate-900' : 'text-white'}>{serverName}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalysis(selectedFile)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
              }`}
              title={t('crash.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
                  : 'glass-card hover:bg-white/[0.08] text-slate-400 hover:text-slate-100 border-white/[0.08]'
              }`}
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Selected Session Banner if opened from a specific session */}
          {selectedSession && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                theme === 'light'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold block">
                    {t('crash.selectedSession')}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {formatDate(selectedSession.endedAt || selectedSession.startedAt)}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg font-mono text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {t('crash.exitCode')} {selectedSession.exitCode !== undefined && selectedSession.exitCode !== null ? selectedSession.exitCode : -1}
              </span>
            </div>
          )}

          {/* File selector if reports exist */}
          {reports.length > 1 && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                {t('crash.selectReport')}
              </span>
              <select
                value={selectedFile}
                onChange={(e) => handleFileChange(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border font-mono text-xs cursor-pointer outline-none ${
                  theme === 'light'
                    ? 'bg-slate-100 border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-white/[0.08] text-slate-200'
                }`}
              >
                {reports.map((r) => (
                  <option key={r.fileName} value={r.fileName}>
                    {r.fileName} ({formatDate(r.createdAt)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="text-xs text-slate-400">
                {language === 'bg' ? 'Сканиране на crash-reports и logs/latest.log...' : 'Scanning crash-reports and logs/latest.log...'}
              </p>
            </div>
          ) : !effectiveAnalysis || !effectiveAnalysis.hasCrash ? (
            <div className="space-y-4">
              <div
                className={`p-8 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 ${
                  theme === 'light' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20'
                }`}
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
                <h4 className="text-sm font-bold text-emerald-400">
                  {t('crash.noCrashesTitle')}
                </h4>
                <p className="text-xs text-slate-400 max-w-md">
                  {t('crash.noCrashesDesc')}
                </p>
              </div>

              {effectiveAnalysis?.rawLog && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      {t('crash.recentOutput')}
                    </span>
                    <button
                      onClick={handleCopyLog}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? t('crash.copied') : t('crash.copyLog')}</span>
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono max-h-64 overflow-y-auto leading-relaxed text-slate-300 bg-black/60 p-4 rounded-xl border border-white/10 select-text whitespace-pre">
                    {effectiveAnalysis.rawLog}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Problem Overview Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  effectiveAnalysis.severity === 'critical'
                    ? theme === 'light'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-rose-950/25 border-rose-500/30'
                    : theme === 'light'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-amber-950/25 border-amber-500/30'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      effectiveAnalysis.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {effectiveAnalysis.severity === 'critical'
                      ? t('crash.criticalIssue')
                      : t('crash.warningIssue')}
                  </span>

                  {effectiveAnalysis.fileName && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {language === 'bg' ? 'Източник: ' : 'Source: '} <b>{effectiveAnalysis.fileName}</b>{' '}
                      {effectiveAnalysis.fileDate ? `(${formatDate(effectiveAnalysis.fileDate)})` : ''}
                    </span>
                  )}
                </div>

                <h4 className={`text-base font-bold mb-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {effectiveAnalysis.title}
                </h4>
                <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                  {effectiveAnalysis.description}
                </p>
              </div>

              {/* Solution / Recommendation Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  theme === 'light'
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>{t('crash.recommendedFix')}</span>
                </div>
                <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                  {effectiveAnalysis.recommendation}
                </p>

                {/* Contextual Action Button */}
                {onNavigateTab && (
                  <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-wrap gap-2">
                    {['oom', 'port_bind', 'watchdog'].includes(effectiveAnalysis.category) && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('settings');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{t('crash.openSettings')}</span>
                      </button>
                    )}

                    {effectiveAnalysis.category === 'plugin' && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('plugins');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>{t('crash.openPlugins')}</span>
                      </button>
                    )}

                    {['world_corrupt', 'session_lock'].includes(effectiveAnalysis.category) && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('worlds');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t('crash.openWorlds')}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Stack trace snippet */}
              {effectiveAnalysis.relevantLines && effectiveAnalysis.relevantLines.length > 0 && (
                <div
                  className={`p-4 rounded-2xl border ${
                    theme === 'light' ? 'bg-slate-900 text-slate-100' : 'bg-slate-950 border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                      {t('crash.relevantLines')}
                    </span>
                    <button
                      onClick={handleCopyLog}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? t('crash.copied') : t('crash.copyLog')}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto text-rose-300/90 whitespace-pre-wrap">
                    {effectiveAnalysis.relevantLines.join('\n')}
                  </pre>
                </div>
              )}

              {/* Collapsible full raw log */}
              {effectiveAnalysis.rawLog && (
                <div
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'glass-panel border-white/[0.06]'
                  }`}
                >
                  <button
                    onClick={() => setShowRawLog((prev) => !prev)}
                    className="w-full p-3 px-4 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>
                        {showRawLog
                          ? (language === 'bg' ? 'Скрий пълния лог' : 'Hide Full Log')
                          : (language === 'bg' ? 'Преглед на пълния краш лог' : 'View Full Server / Crash Log')}
                      </span>
                    </span>
                    {showRawLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showRawLog && (
                    <div className="p-4 border-t border-white/[0.06] bg-black/40">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={handleCopyLog}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-[11px] font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? t('crash.copied') : t('crash.copyLog')}</span>
                        </button>
                      </div>
                      <pre className="text-[10px] font-mono max-h-60 overflow-y-auto leading-relaxed text-slate-300 whitespace-pre">
                        {effectiveAnalysis.rawLog}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 px-6 border-t flex items-center justify-between text-xs ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
          }`}
        >
          <span className="text-slate-400 text-[11px]">
            {t('crash.footer')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

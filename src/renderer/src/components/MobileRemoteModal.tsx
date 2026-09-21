import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  Globe,
  Shield,
  Zap,
  Users,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { RemoteServiceStatus } from '../types';

interface MobileRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileRemoteModal: React.FC<MobileRemoteModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();

  const [status, setStatus] = useState<RemoteServiceStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'public'>('local');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingTunnel, setIsStartingTunnel] = useState(false);
  const [isEditingPort, setIsEditingPort] = useState(false);
  const [portInput, setPortInput] = useState<string>('25577');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      const st = await api.getRemoteStatus();
      setStatus(st);
      if (st) {
        setPortInput(String(st.port));
        // If tunnel is active and user is in public mode or tunnel just started, switch tab
        const mode = (st.isTunnelActive && activeTab === 'public') ? 'public' : activeTab;
        const svg = await api.getRemoteQrSvg(mode);
        if (svg) {
          setQrSvg((prev) => (prev === svg ? prev : svg));
        }
      }
    } catch (e) {
      console.error('Failed to load remote status:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleToggle = async () => {
    const api = (window as any).api;
    if (!api || !status) return;
    setLoading(true);
    try {
      await api.toggleRemoteService(!status.enabled);
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleStartTunnel = async () => {
    const api = (window as any).api;
    if (!api) return;
    setIsStartingTunnel(true);
    try {
      const res = await api.startRemoteTunnel();
      if (res?.success) {
        setActiveTab('public');
      }
      await loadData();
    } catch (e) {
      console.error('Failed to start Cloudflare tunnel:', e);
    } finally {
      setIsStartingTunnel(false);
    }
  };

  const handleStopTunnel = async () => {
    const api = (window as any).api;
    if (!api) return;
    try {
      await api.stopRemoteTunnel();
      setActiveTab('local');
      await loadData();
    } catch (e) {
      console.error('Failed to stop tunnel:', e);
    }
  };

  const handleRegenPin = async () => {
    const api = (window as any).api;
    if (!api) return;
    setIsRefreshing(true);
    try {
      await api.regenerateRemotePin();
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyUrl = (urlToCopy?: string) => {
    const target = urlToCopy || (activeTab === 'public' && status?.publicUrl ? status.publicUrl : status?.localUrl);
    if (!target) return;
    navigator.clipboard.writeText(target);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePort = async () => {
    const api = (window as any).api;
    const p = parseInt(portInput, 10);
    if (!api || isNaN(p) || p < 1024 || p > 65535) return;
    setLoading(true);
    try {
      await api.setRemotePort(p);
      setIsEditingPort(false);
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = activeTab === 'public' && status?.publicUrl ? status.publicUrl : status?.localUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            : 'bg-[#0b101e] border-white/10 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/[0.08] bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {t('mobileRemote.title')}
              </h2>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {t('mobileRemote.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              theme === 'light'
                ? 'hover:bg-slate-100 border-slate-200 text-slate-500'
                : 'hover:bg-white/10 border-white/10 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto overflow-x-hidden max-h-[82vh]">
          {/* Master Enable/Disable Bar */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200'
                : 'bg-white/[0.02] border-white/[0.08]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  status?.running
                    ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-slate-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {status?.running
                    ? t('mobileRemote.serviceActive')
                    : t('mobileRemote.serviceInactive')}
                </div>
                <div className={`text-xs truncate ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {status?.running
                    ? `${status.connectedClients} ${t('mobileRemote.connectedDevices')}`
                    : t('mobileRemote.serviceDisabledDesc')}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggle}
              disabled={loading}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                status?.enabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 shadow-xs'
                  : 'bg-slate-500/15 border-slate-500/30 text-slate-400 hover:bg-slate-500/25'
              }`}
            >
              {status?.enabled ? t('mobileRemote.enabled') : t('mobileRemote.disabled')}
            </button>
          </div>

          {status?.enabled && (
            <>
              {/* Network Mode Switcher: Local Wi-Fi vs Global Internet (4G/5G) */}
              <div className="space-y-2">
                <div className="flex p-1 rounded-xl bg-black/30 border border-white/[0.08] gap-1">
                  <button
                    onClick={() => setActiveTab('local')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'local'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('mobileRemote.tabLocalWifi')}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('public')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'public'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('mobileRemote.tabGlobalInternet')}</span>
                    {status?.isTunnelActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </button>
                </div>
              </div>

              {/* Public Tunnel Activation Banner if in Public Mode but Tunnel Inactive */}
              {activeTab === 'public' && !status?.isTunnelActive && (
                <div
                  className={`p-4 rounded-xl border text-center space-y-3 ${
                    theme === 'light'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 font-bold text-sm">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>{t('mobileRemote.tunnelPromptTitle')}</span>
                  </div>
                  <p className="text-xs opacity-80 max-w-sm mx-auto leading-relaxed">
                    {t('mobileRemote.tunnelPromptDesc')}
                  </p>
                  <button
                    onClick={handleStartTunnel}
                    disabled={isStartingTunnel}
                    className="btn-bounce inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Zap className={`w-4 h-4 ${isStartingTunnel ? 'animate-spin' : ''}`} />
                    <span>
                      {isStartingTunnel
                        ? t('mobileRemote.tunnelStarting')
                        : t('mobileRemote.startTunnelBtn')}
                    </span>
                  </button>
                </div>
              )}

              {/* QR Code & Connection Info (Visible when Local OR when Public tunnel is active) */}
              {(activeTab === 'local' || status?.isTunnelActive) && (
                <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-5 items-stretch">
                  {/* QR Code Box */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200 shadow-xs'
                        : activeTab === 'public'
                        ? 'bg-slate-950/80 border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
                        : 'bg-slate-950/80 border-sky-500/30 shadow-[0_0_20px_rgba(2,132,199,0.12)]'
                    }`}
                  >
                    <div className="w-40 h-40 bg-white rounded-xl p-2 shadow-md flex items-center justify-center">
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    </div>
                    <div
                      className={`mt-3 w-full px-2 py-1.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 text-center ${
                        activeTab === 'public'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {activeTab === 'public' ? t('mobileRemote.scanAnyNetwork') : t('mobileRemote.scanWithPhone')}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: PIN & Link details */}
                  <div className="flex flex-col justify-between space-y-3 min-w-0">
                    {/* Security PIN Card */}
                    <div
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        theme === 'light'
                          ? 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                          : 'bg-amber-500/[0.06] border-amber-500/25 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-amber-400">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{t('mobileRemote.securityPin')}</span>
                        </span>
                        <button
                          onClick={handleRegenPin}
                          disabled={isRefreshing}
                          className={`p-1 rounded-lg hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer ${
                            isRefreshing ? 'animate-spin' : ''
                          }`}
                          title={t('mobileRemote.regenPin')}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-2xl font-black font-mono tracking-[0.3em] text-center py-1 text-amber-300">
                        {status?.pin?.split('').join(' ')}
                      </div>
                      <p className="text-[11px] text-center opacity-75 leading-tight">
                        {t('mobileRemote.pinNote')}
                      </p>
                    </div>

                    {/* Direct Address */}
                    <div
                      className={`p-3 rounded-xl border space-y-2 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white/[0.02] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold flex items-center gap-1.5 ${
                          theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          {activeTab === 'public' ? (
                            <>
                              <Globe className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t('mobileRemote.globalPublicAddress')}</span>
                            </>
                          ) : (
                            <>
                              <Wifi className="w-3.5 h-3.5 text-sky-400" />
                              <span>{t('mobileRemote.localAddress')}</span>
                            </>
                          )}
                        </span>
                        <button
                          onClick={() => handleCopyUrl()}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            copied
                              ? 'text-emerald-400 bg-emerald-500/15'
                              : 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10'
                          }`}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? t('common.copied') : t('common.copy')}</span>
                        </button>
                      </div>

                      <div
                        className={`text-xs font-mono px-3 py-2 rounded-lg border min-w-0 ${
                          theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-800'
                            : activeTab === 'public'
                            ? 'bg-black/50 border-emerald-500/20 text-emerald-300'
                            : 'bg-black/40 border-white/[0.06] text-sky-300'
                        }`}
                      >
                        <div className="truncate select-all" title={displayUrl}>
                          {displayUrl}
                        </div>
                      </div>

                      {activeTab === 'public' && status?.isTunnelActive && (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {t('mobileRemote.tunnelActiveBadge')}
                          </span>
                          <button
                            onClick={handleStopTunnel}
                            className="text-[11px] text-red-400 hover:text-red-300 hover:underline cursor-pointer font-medium"
                          >
                            {t('mobileRemote.stopTunnelBtn')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Local Port Configuration (Only in Local Mode) */}
                    {activeTab === 'local' && (
                      <div className="flex items-center justify-between text-xs px-1 pt-1">
                        <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>
                          {t('mobileRemote.webPort')}: <strong className="font-mono text-slate-200">{status?.port}</strong>
                        </span>
                        {!isEditingPort ? (
                          <button
                            onClick={() => setIsEditingPort(true)}
                            className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-semibold text-xs whitespace-nowrap"
                          >
                            {t('mobileRemote.changePort')}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              value={portInput}
                              onChange={(e) => setPortInput(e.target.value)}
                              className={`w-20 px-2 py-0.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-400 ${
                                theme === 'light'
                                  ? 'bg-white border-slate-300 text-slate-900'
                                  : 'bg-black/50 border-white/20 text-white'
                              }`}
                            />
                            <button
                              onClick={handleSavePort}
                              className="px-2.5 py-0.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs cursor-pointer transition-colors"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setIsEditingPort(false)}
                              className="px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informative Tip Box */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  activeTab === 'public'
                    ? theme === 'light'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                    : theme === 'light'
                    ? 'bg-sky-50/60 border-sky-200 text-sky-900'
                    : 'bg-sky-500/5 border-sky-500/20 text-sky-200'
                }`}
              >
                {activeTab === 'public' ? (
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Wifi className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed min-w-0">
                  <strong className="font-bold">
                    {activeTab === 'public'
                      ? t('mobileRemote.globalTipTitle')
                      : t('mobileRemote.wifiTipTitle')}
                  </strong>{' '}
                  <span className="opacity-90">
                    {activeTab === 'public'
                      ? t('mobileRemote.globalTipBody')
                      : t('mobileRemote.wifiTipBody')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3.5 border-t flex justify-end shrink-0 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/[0.08] bg-white/[0.02]'
          }`}
        >
          <button
            onClick={onClose}
            className="btn-bounce px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-sky-500/30"
          >
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
};

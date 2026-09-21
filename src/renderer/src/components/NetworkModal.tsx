import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Globe, Wifi, ShieldAlert, Sparkles, ExternalLink, Gamepad2, Zap, Square, Radio } from 'lucide-react';
import { ServerProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface NetworkModalProps {
  server: ServerProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({ server, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [networkInfo, setNetworkInfo] = useState<{ localIp: string; publicIp: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<{
    isRunning: boolean;
    address?: string;
    claimUrl?: string;
    hasZeroTunnels?: boolean;
    log?: string;
  }>({ isRunning: false });
  const [tunnelActionLoading, setTunnelActionLoading] = useState(false);
  const [autoStartPlayit, setAutoStartPlayit] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const api = (window as any).api;
      if (api) {
        api.getAppSettings?.().then((settings: any) => {
          if (settings && typeof settings.autoStartPlayitTunnel === 'boolean') {
            setAutoStartPlayit(settings.autoStartPlayitTunnel);
          }
        }).catch(console.error);

        api.getNetworkStatus(server.port).then((data: any) => {
          setNetworkInfo({
            localIp: data.localIp || '127.0.0.1',
            publicIp: data.publicIp || (language === 'bg' ? 'Няма връзка' : 'No connection'),
          });
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });

        api.getTunnelStatus?.().then((status: any) => {
          if (status) setTunnelStatus(status);
        }).catch(console.error);

        const unsubTunnel = api.onTunnelStatusChanged?.((status: any) => {
          setTunnelStatus(status);
          setTunnelActionLoading(false);
        });

        return () => {
          if (unsubTunnel) unsubTunnel();
        };
      }
    }
  }, [isOpen, server.port, language]);

  if (!isOpen) return null;

  const handleToggleTunnel = async () => {
    const api = (window as any).api;
    if (!api) return;
    setTunnelActionLoading(true);

    try {
      if (tunnelStatus.isRunning) {
        await api.stopTunnel();
        setTunnelStatus({ isRunning: false, log: language === 'bg' ? 'Тунелът е спрян' : 'Tunnel stopped' });
      } else {
        setTunnelStatus((prev) => ({
          ...prev,
          isRunning: true,
          log: language === 'bg' ? 'Инициализация на Playit тунел...' : 'Initializing Playit tunnel...',
        }));
        const status = await api.startTunnel(server.port);
        if (status) setTunnelStatus(status);
      }
    } catch (e: any) {
      console.error(e);
      setTunnelStatus({ isRunning: false, log: `Error: ${e.message}` });
    } finally {
      setTunnelActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const publicAddress =
    networkInfo && networkInfo.publicIp && !networkInfo.publicIp.includes('Няма') && !networkInfo.publicIp.includes('No connection')
      ? `${networkInfo.publicIp}:${server.port}`
      : t('common.loading');
  const localAddress = `${networkInfo?.localIp || '127.0.0.1'}:${server.port}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xl p-4">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${
        theme === 'light'
          ? 'bg-white border border-slate-200'
          : 'glass-panel'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              theme === 'light' ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-sky-500/15 text-sky-400 border-sky-400/20'
            }`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>{t('network.modalTitle')}</h3>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('network.modalSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              theme === 'light' ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Method 1: Zero-Config Playit.gg 1-Click Tunnel */}
          <div className={`p-4 rounded-xl space-y-3 border ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${
                theme === 'light' ? 'text-sky-700' : 'text-sky-300'
              }`}>
                <Sparkles className="w-4 h-4 text-sky-500" /> {t('network.playitTitle')}
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                  tunnelStatus.isRunning
                    ? theme === 'light'
                      ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                      : 'bg-sky-500/20 text-sky-300 border-sky-400/30 animate-pulse'
                    : theme === 'light'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                }`}
              >
                {tunnelStatus.isRunning ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                    <span>{t('common.online')}</span>
                  </>
                ) : (
                  (language === 'bg' ? 'Препоръчително' : 'Recommended')
                )}
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
              {t('network.playitDesc')}
            </p>

            {/* Tunnel is running: show address and controls */}
            {tunnelStatus.isRunning ? (
              <div className="space-y-2.5">
                {tunnelStatus.address ? (
                  <div className={`p-3 rounded-xl border space-y-2 ${
                    theme === 'light'
                      ? 'bg-sky-50/90 border-sky-300 shadow-xs'
                      : 'bg-slate-950/60 border-sky-400/40'
                  }`}>
                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                      theme === 'light' ? 'text-sky-800' : 'text-sky-400'
                    }`}>
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {t('network.giveToFriends')}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-sm font-bold select-all ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                      }`}>
                        {tunnelStatus.address}
                      </span>
                      <button
                        onClick={() => copyToClipboard(tunnelStatus.address!, 'tunnel')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-sm glow-ice cursor-pointer"
                      >
                        {copiedType === 'tunnel' ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> {t('common.copy')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      theme === 'light'
                        ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
                        : 'bg-slate-950 border border-slate-800 text-slate-300'
                    }`}>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                      <span className="truncate">{tunnelStatus.log || (language === 'bg' ? 'Свързване към Playit мрежата...' : 'Connecting to Playit network...')}</span>
                    </div>

                    {!tunnelStatus.claimUrl && (
                      <div className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                        theme === 'light'
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-xs'
                          : 'bg-indigo-950/60 border-indigo-500/40 text-slate-300'
                      }`}>
                        <div className={`flex items-center gap-2 font-bold ${
                          theme === 'light' ? 'text-indigo-900' : 'text-indigo-300'
                        }`}>
                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>{language === 'bg' ? 'Агентът е потвърден! Остава 1 стъпка в сайта:' : 'Agent verified! Final step on website:'}</span>
                        </div>
                        <div className={`space-y-1.5 pl-1 leading-relaxed text-[11px] ${
                          theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600">1.</span>
                            <span>{language === 'bg' ? 'Отвори своето Playit табло чрез бутона по-долу.' : 'Open your Playit dashboard via the button below.'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600">2.</span>
                            <span>{language === 'bg' ? 'Натисни бутона Add Tunnel.' : 'Click Add Tunnel.'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-indigo-600">3.</span>
                            <span>{language === 'bg' ? `Избери Minecraft Java (порт ${server.port}) и цъкни Add Tunnel.` : `Select Minecraft Java (port ${server.port}) and click Add Tunnel.`}</span>
                          </div>
                        </div>
                        <p className={`text-[10px] italic pt-0.5 ${
                          theme === 'light' ? 'text-indigo-700' : 'text-cyan-300/80'
                        }`}>
                          {language === 'bg'
                            ? 'Веднага след като го добавиш в сайта, CraftDock автоматично ще засече адреса и ще го покаже тук в зелено!'
                            : 'Once added on the website, CraftDock will automatically detect the address and display it here!'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const api = (window as any).api;
                            if (api?.openExternal) {
                              api.openExternal('https://playit.gg/account/tunnels?view=tunnel-type&sort=age');
                            } else {
                              window.open('https://playit.gg/account/tunnels?view=tunnel-type&sort=age', '_blank');
                            }
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{t('network.openTunnelsBtn')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Claim URL if first-time usage */}
                {tunnelStatus.claimUrl && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                    theme === 'light'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                  }`}>
                    <div>
                      <div className="font-bold">{language === 'bg' ? 'Първоначално свързване с Playit:' : 'Initial Playit Claim:'}</div>
                      <div className={`text-[11px] ${theme === 'light' ? 'text-amber-800' : 'text-amber-300/80'}`}>{language === 'bg' ? 'Потвърди агента в браузъра (еднократно):' : 'Confirm the agent in your browser (one-time):'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const api = (window as any).api;
                        if (api?.openExternal) {
                          api.openExternal(tunnelStatus.claimUrl!);
                        } else {
                          window.open(tunnelStatus.claimUrl!, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                    >
                      <span>{t('common.confirm')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[11px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {tunnelStatus.log || (language === 'bg' ? 'Връзката е активна' : 'Connection active')}
                  </span>
                  <button
                    onClick={handleToggleTunnel}
                    disabled={tunnelActionLoading}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                      theme === 'light'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-xs'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>{tunnelActionLoading ? t('common.stopping') : t('network.stopTunnel')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <button
                  onClick={handleToggleTunnel}
                  disabled={tunnelActionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer btn-bounce"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>
                    {tunnelActionLoading
                      ? t('common.loading')
                      : t('network.startTunnel')}
                  </span>
                </button>
              </div>
            )}

            {/* Auto-start with server toggle */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/40 border-white/[0.06]'
            }`}>
              <div className="flex-1">
                <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  {t('network.autoStartPlayitTitle')}
                </span>
                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('network.autoStartPlayitDesc')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoStartPlayit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoStartPlayit(checked);
                    (window as any).api?.saveAppSettings?.({ autoStartPlayitTunnel: checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>
          </div>

          {/* Method 2: Public Internet IP */}
          <div className={`p-4 rounded-xl space-y-2.5 border ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                theme === 'light' ? 'text-sky-700' : 'text-cyan-400'
              }`}>
                <Globe className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-sky-600' : 'text-cyan-400'}`} /> {t('network.publicIpTitle')}
              </span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'bg' ? 'Изисква Port Forward' : 'Requires Port Forward'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-slate-950/50 border-white/[0.08]'
            }`}>
              <span className={`font-mono text-sm font-semibold select-all ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {loading ? t('common.loading') : publicAddress}
              </span>
              <button
                onClick={() => copyToClipboard(publicAddress, 'public')}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                }`}
              >
                {copiedType === 'public' ? (
                  <>
                    <Check className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-emerald-600' : 'text-cyan-400'}`} /> {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> {t('common.copy')}
                  </>
                )}
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('network.publicIpDesc', { port: server.port })}
            </p>
          </div>

          {/* Method 3: Local LAN */}
          <div className={`p-4 rounded-xl space-y-2.5 border ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200 shadow-xs' : 'glass-card'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
              }`}>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" /> {t('network.localIpTitle')}
              </span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'bg' ? 'Еднаква мрежа' : 'Same Network'}
              </span>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              theme === 'light'
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-slate-950/50 border-white/[0.08]'
            }`}>
              <span className={`font-mono text-sm font-semibold select-all ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-100'
              }`}>
                {localAddress}
              </span>
              <button
                onClick={() => copyToClipboard(localAddress, 'local')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
                }`}
              >
                {copiedType === 'local' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> {t('common.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> {t('common.copy')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex justify-end ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-white/[0.08]'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                : 'glass-card hover:bg-white/[0.08] text-slate-200 border-transparent'
            }`}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

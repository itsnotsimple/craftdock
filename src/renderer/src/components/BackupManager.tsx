import React, { useState } from 'react';
import { Archive, Save, CheckCircle2, ShieldCheck, Clock, FolderOpen } from 'lucide-react';
import { ServerProfile } from '../types';
import { useDialog } from '../context/DialogContext';
import { useLanguage } from '../context/LanguageContext';

interface BackupManagerProps {
  server: ServerProfile;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ server }) => {
  const { t } = useLanguage();
  const { showAlert } = useDialog();
  const [creating, setCreating] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    const api = (window as any).api;
    if (!api || creating) return;

    setCreating(true);
    try {
      const fileName = await api.createWorldBackup(server.id);
      if (fileName) {
        setLastBackup(fileName);
      } else {
        await showAlert({
          type: 'warning',
          title: t('dialogs.backupError'),
          message: t('dialogs.noWorldBackup'),
          buttonText: t('common.understand'),
        });
      }
    } catch (e: any) {
      await showAlert({
        type: 'error',
        title: t('dialogs.backupError'),
        message: e.message || t('dialogs.backupError'),
        buttonText: t('common.understand'),
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full glass-panel rounded-2xl p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            {t('backups.title')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('backups.subtitle')}
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs transition-all shadow-lg shadow-amber-950/50 glow-amber disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {creating ? t('backups.creating') : t('backups.createBtn')}
        </button>
      </div>

      {lastBackup && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-3 backdrop-blur-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong>{t('backups.successNotice')}</strong> (<code className="bg-emerald-950/80 px-1.5 py-0.5 rounded text-emerald-200">{lastBackup}</code>)
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="p-5 rounded-2xl glass-card space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          {t('backups.whyTitle')}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {t('backups.whyText')}
        </p>
        <div className="pt-2">
          <button
            onClick={() => (window as any).api?.openServerFolder(server.id)}
            className="flex items-center gap-2 text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" /> {t('backups.openFolder')}
          </button>
        </div>
      </div>
    </div>
  );
};

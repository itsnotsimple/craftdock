import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Trash2, AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export interface ConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: 'trash' | 'warning' | 'info';
}

export interface AlertOptions {
  title?: string;
  message: string | React.ReactNode;
  buttonText?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

interface DialogContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

type ActiveDialog =
  | {
      type: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      type: 'alert';
      options: AlertOptions;
      resolve: () => void;
    }
  | null;

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setActiveDialog({
        type: 'confirm',
        options,
        resolve,
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setActiveDialog({
        type: 'alert',
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean = false) => {
      if (!activeDialog) return;

      if (activeDialog.type === 'confirm') {
        activeDialog.resolve(confirmed);
      } else if (activeDialog.type === 'alert') {
        activeDialog.resolve();
      }
      setActiveDialog(null);
    },
    [activeDialog]
  );

  // Keyboard accessibility: Escape cancels, Enter confirms
  useEffect(() => {
    if (!activeDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog, handleClose]);

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}

      {/* Glassmorphic Modal Dialog Overlay */}
      {activeDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-[#0b101e]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={`${t('common.close')} (Esc)`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Confirm Dialog Content */}
            {activeDialog.type === 'confirm' && (
              <>
                {/* Ambient glow */}
                <div
                  className={`absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                    activeDialog.options.danger !== false
                      ? 'bg-rose-600/20'
                      : 'bg-sky-600/20'
                  }`}
                />

                {/* Badge Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
                    activeDialog.options.danger !== false
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                      : 'bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.3)]'
                  }`}
                >
                  {activeDialog.options.icon === 'trash' || activeDialog.options.danger !== false ? (
                    <Trash2 className="w-7 h-7" />
                  ) : activeDialog.options.icon === 'warning' ? (
                    <AlertTriangle className="w-7 h-7" />
                  ) : (
                    <Info className="w-7 h-7" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                  {activeDialog.options.title || t('dialogs.confirmTitle')}
                </h3>

                {/* Message */}
                <div className="text-sm text-slate-300 leading-relaxed mb-6 max-w-sm">
                  {activeDialog.options.message}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm transition-all active:scale-95 focus:outline-none cursor-pointer"
                  >
                    {activeDialog.options.cancelText || t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => handleClose(true)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-white focus:outline-none cursor-pointer ${
                      activeDialog.options.danger !== false
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/40 hover:shadow-rose-900/60'
                        : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-900/40 hover:shadow-sky-900/60'
                    }`}
                  >
                    {activeDialog.options.icon === 'trash' && <Trash2 className="w-4 h-4" />}
                    {activeDialog.options.confirmText || t('common.confirm')}
                  </button>
                </div>
              </>
            )}

            {/* Alert Dialog Content */}
            {activeDialog.type === 'alert' && (
              <>
                {/* Ambient glow */}
                <div
                  className={`absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                    activeDialog.options.type === 'error'
                      ? 'bg-rose-600/20'
                      : activeDialog.options.type === 'warning'
                      ? 'bg-amber-500/20'
                      : activeDialog.options.type === 'success'
                      ? 'bg-emerald-500/20'
                      : 'bg-sky-500/20'
                  }`}
                />

                {/* Badge Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
                    activeDialog.options.type === 'error'
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                      : activeDialog.options.type === 'warning'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                      : activeDialog.options.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                      : 'bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.3)]'
                  }`}
                >
                  {activeDialog.options.type === 'error' ? (
                    <AlertCircle className="w-7 h-7" />
                  ) : activeDialog.options.type === 'warning' ? (
                    <AlertTriangle className="w-7 h-7" />
                  ) : activeDialog.options.type === 'success' ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <Info className="w-7 h-7" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                  {activeDialog.options.title ||
                    (activeDialog.options.type === 'error'
                      ? t('dialogs.errorTitle')
                      : activeDialog.options.type === 'warning'
                      ? t('dialogs.warningTitle')
                      : activeDialog.options.type === 'success'
                      ? t('dialogs.successTitle')
                      : t('dialogs.infoTitle'))}
                </h3>

                {/* Message */}
                <div className="text-sm text-slate-300 leading-relaxed mb-6 max-w-sm">
                  {activeDialog.options.message}
                </div>

                {/* Action */}
                <div className="w-full">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => handleClose(true)}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 text-white focus:outline-none cursor-pointer ${
                      activeDialog.options.type === 'error'
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/40 hover:shadow-rose-900/60'
                        : activeDialog.options.type === 'warning'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/40 hover:shadow-amber-900/60'
                        : activeDialog.options.type === 'success'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40 hover:shadow-emerald-900/60'
                        : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-sky-900/40 hover:shadow-sky-900/60'
                    }`}
                  >
                    {activeDialog.options.buttonText || t('common.understand')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

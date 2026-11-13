import React from 'react';
import { Language, NotificationSeverity, ToastItem } from '../types';
import { translations } from '../i18n/translations';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  language: Language;
}

const SEVERITY_STYLES: Record<
  NotificationSeverity,
  {
    container: string;
    badge: string;
    iconClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  critical: {
    container: 'border-rose-500/70 bg-slate-900/95 shadow-rose-950/50',
    badge: 'bg-rose-950 border-rose-700 text-rose-300',
    iconClass: 'text-rose-400',
    Icon: AlertOctagon,
  },
  warning: {
    container: 'border-amber-500/70 bg-slate-900/95 shadow-amber-950/40',
    badge: 'bg-amber-950 border-amber-700 text-amber-300',
    iconClass: 'text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    container: 'border-cyan-500/60 bg-slate-900/95 shadow-cyan-950/40',
    badge: 'bg-cyan-950 border-cyan-700 text-cyan-300',
    iconClass: 'text-cyan-400',
    Icon: Info,
  },
  success: {
    container: 'border-emerald-500/60 bg-slate-900/95 shadow-emerald-950/40',
    badge: 'bg-emerald-950 border-emerald-700 text-emerald-300',
    iconClass: 'text-emerald-400',
    Icon: CheckCircle2,
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  language,
}) => {
  if (toasts.length === 0) return null;

  const t = translations[language];

  const getSeverityLabel = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return t.toasts.criticalLabel;
      case 'warning':
        return t.toasts.warningLabel;
      case 'success':
        return t.toasts.successLabel;
      default:
        return t.toasts.infoLabel;
    }
  };

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const style = SEVERITY_STYLES[toast.severity];
        const IconComp = style.Icon;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-right-4 duration-200 ${style.container}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <IconComp className={`h-5 w-5 ${style.iconClass}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${style.badge}`}
                    >
                      {getSeverityLabel(toast.severity)}
                    </span>
                    {toast.sourceModule && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {toast.sourceModule}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 tabular-nums">
                    {toast.timestamp}
                  </span>
                </div>

                <div className="text-xs font-bold text-white leading-snug">
                  {toast.title}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                aria-label={t.toasts.dismiss}
                title={t.toasts.dismiss}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3500) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast],
  );

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 4000),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '✓' },
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '✕' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'ℹ' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠' },
};

const typeTextColors: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style = typeStyles[t.type];
        const textColor = typeTextColors[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto ${style.bg} border ${style.border} backdrop-blur-xl rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg shadow-black/20 animate-slide-up`}
            role="alert"
          >
            <span className={`${textColor} text-sm font-bold mt-0.5 shrink-0`}>
              {style.icon}
            </span>
            <p className="text-sm text-text-primary flex-1">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-text-tertiary hover:text-text-secondary text-xs shrink-0 mt-0.5 cursor-pointer"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

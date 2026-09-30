import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toast: showToast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-lg shadow-md border text-body-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              t.type === 'error'
                ? 'bg-[#FBE9E9] text-[#B33636] border-[#F5C2C2]'
                : t.type === 'success'
                ? 'bg-[#E3F5EA] text-[#17703D] border-[#BCE8CD]'
                : 'bg-surface text-on-surface border-border'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#B33636] mt-0.5" />}
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#17703D] mt-0.5" />}
              {t.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />}
              <span className="font-medium text-body-sm leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 text-current opacity-70 hover:opacity-100 rounded transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

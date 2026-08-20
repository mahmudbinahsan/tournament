import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

export function Modal({ open, onClose, title, children, fullScreen = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in-soft"
        onClick={onClose}
      />

      <div
        className={[
          'relative z-10 w-full bg-app-card border border-app-border text-ink animate-slide-up flex flex-col shadow-2xl shadow-black/40',
          fullScreen
            ? 'h-full rounded-none'
            : 'rounded-t-[28px] sm:rounded-[28px] sm:max-w-lg sm:mx-4',
          fullScreen ? '' : 'max-h-[88dvh] sm:max-h-[88dvh]',
        ].join(' ')}
      >
        {!fullScreen && (
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="w-9 h-1.5 rounded-full bg-ink-faint/30" />
          </div>
        )}

        {title && (
          <div
            className={[
              'flex items-center justify-between px-5 py-4 border-b border-app-border shrink-0',
              fullScreen ? 'sticky top-0 z-10 bg-app-card' : '',
            ].join(' ')}
            style={fullScreen ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' } : undefined}
          >
            <h2 className="text-base font-bold text-ink tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-app-solid-2 border border-app-border hover:bg-app-solid-3 transition-colors duration-200 ease-out active:scale-95"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div
          className={[
            'overflow-y-auto overscroll-contain flex-1 min-h-0',
            fullScreen ? 'p-4' : 'p-5',
          ].join(' ')}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: Omit<ModalProps, 'fullScreen'>) {
  return <Modal open={open} onClose={onClose} title={title}>{children}</Modal>;
}

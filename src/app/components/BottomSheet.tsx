import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  side?: 'bottom' | 'top';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  side = 'bottom',
}) => {
  const { reducedMotion } = useSettings();
  const isTop = side === 'top';
  const sheetRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Drag state
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);
  const isDragging = useRef(false);

  // Управление видимостью с анимацией
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      triggerClose();
    }
  }, [isOpen]);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 380); // должно совпадать с длительностью slide-down анимации
  };

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Drag handlers
  const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragCurrentY.current = 0;
    isDragging.current = true;
  };

  const onDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const raw = clientY - dragStartY.current;
    // bottom sheet: только вниз; top sheet: только вверх
    const delta = isTop ? Math.min(0, raw) : Math.max(0, raw);
    dragCurrentY.current = delta;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };

  const onDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = 120;
    const shouldClose = isTop
      ? dragCurrentY.current < -threshold
      : dragCurrentY.current > threshold;

    if (shouldClose) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
        sheetRef.current.style.transform = isTop ? 'translateY(-100%)' : 'translateY(100%)';
      }
      setTimeout(() => onClose(), 350);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    dragStartY.current = null;
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] ${
          reducedMotion
            ? (closing ? 'animate-fade-out-fast' : 'animate-fade-in-fast')
            : (closing ? 'animate-fade-out' : 'animate-fade-in')
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bg-card z-[70]
                   max-h-[90vh] overflow-hidden flex flex-col
                   ${isTop
                     ? `top-0 rounded-b-[2.5rem] ${
                         reducedMotion
                           ? (closing ? 'animate-slide-up-out-minimal' : 'animate-slide-down-in-minimal')
                           : (closing ? 'animate-slide-up-out' : 'animate-slide-down-in')
                       }`
                     : `bottom-0 rounded-t-[2.5rem] safe-area-inset-bottom ${
                         reducedMotion
                           ? (closing ? 'animate-slide-down-minimal' : 'animate-slide-up-minimal')
                           : (closing ? 'animate-slide-down' : 'animate-slide-up')
                       }`
                   }`}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={onDragMove}
        onMouseMove={onDragMove}
        onTouchEnd={onDragEnd}
        onMouseUp={onDragEnd}
      >
        {/* Handle — drag zone (сверху для bottom sheet) */}
        {!isTop && (
          <div
            className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={onDragStart}
            onMouseDown={onDragStart}
          >
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Handle — drag zone (снизу для top sheet) */}
        {isTop && (
          <div
            className="flex items-center justify-center pb-3 pt-2 cursor-grab active:cursor-grabbing"
            onTouchStart={onDragStart}
            onMouseDown={onDragStart}
          >
            <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>
        )}
      </div>

      <style>{`
        /* === Появление снизу: scale + blur + fade === */
        @keyframes slide-up {
          0%   { transform: translateY(60%) scale(0.92); filter: blur(16px); opacity: 0; }
          100% { transform: translateY(0) scale(1);     filter: blur(0px);  opacity: 1; }
        }

        /* === Уход вниз === */
        @keyframes slide-down {
          0%   { transform: translateY(0) scale(1);      filter: blur(0px);  opacity: 1; }
          100% { transform: translateY(60%) scale(0.92); filter: blur(16px); opacity: 0; }
        }

        /* === Появление сверху: scale + blur + fade === */
        @keyframes slide-down-in {
          0%   { transform: translateY(-60%) scale(0.92); filter: blur(16px); opacity: 0; }
          100% { transform: translateY(0) scale(1);       filter: blur(0px);  opacity: 1; }
        }

        /* === Уход вверх === */
        @keyframes slide-up-out {
          0%   { transform: translateY(0) scale(1);       filter: blur(0px);  opacity: 1; }
          100% { transform: translateY(-60%) scale(0.92); filter: blur(16px); opacity: 0; }
        }

        /* === Упрощённые анимации (без blur и scale) === */
        @keyframes slide-up-minimal {
          0%   { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }

        @keyframes slide-down-minimal {
          0%   { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }

        @keyframes slide-down-in-minimal {
          0%   { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0);     opacity: 1; }
        }

        @keyframes slide-up-out-minimal {
          0%   { transform: translateY(0);     opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        @keyframes fade-in-fast {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fade-out-fast {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        .animate-slide-up {
          animation: slide-up 0.39s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        .animate-slide-down-in {
          animation: slide-down-in 0.39s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-slide-up-out {
          animation: slide-up-out 0.22s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        .animate-slide-up-minimal {
          animation: slide-up-minimal 0.2s ease-out forwards;
        }
        .animate-slide-down-minimal {
          animation: slide-down-minimal 0.15s ease-in forwards;
        }
        .animate-slide-down-in-minimal {
          animation: slide-down-in-minimal 0.2s ease-out forwards;
        }
        .animate-slide-up-out-minimal {
          animation: slide-up-out-minimal 0.15s ease-in forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.3s ease-in forwards;
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.1s ease-out forwards;
        }
        .animate-fade-out-fast {
          animation: fade-out-fast 0.1s ease-in forwards;
        }
      `}</style>
    </>
  );
};

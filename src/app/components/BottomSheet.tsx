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
  const dragStartTime = useRef<number>(0);
  const dragCurrentY = useRef<number>(0);
  const isDragging = useRef(false);
  const previousUserSelect = useRef<string>('');

  // Управление видимостью с анимацией
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      triggerClose();
    }
  }, [isOpen]);

  const CLOSE_ANIM_MS = 220; // совпадает с длительностью slide-down анимации (0.22s)

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, CLOSE_ANIM_MS);
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

  const getClientY = (e: TouchEvent | MouseEvent | React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      return e.touches[0]?.clientY ?? 0;
    }
    return e.clientY;
  };

  // Drag handlers
  const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('button' in e && e.button !== 0) return;

    const clientY = getClientY(e);
    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    dragCurrentY.current = 0;
    isDragging.current = true;
    previousUserSelect.current = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
  };

  const onDragMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const clientY = getClientY(e);
    const raw = clientY - dragStartY.current;
    // bottom sheet: только вниз; top sheet: только вверх
    const delta = isTop ? Math.min(0, raw) : Math.max(0, raw);
    dragCurrentY.current = delta;
    if ('touches' in e) {
      e.preventDefault();
    }
    // Rubber band: сопротивление нарастает за пределами 120px
    const absDelta = Math.abs(delta);
    const RUBBER_LIMIT = 120;
    const RUBBER_FACTOR = 0.35;
    let visualDelta: number;
    if (absDelta > RUBBER_LIMIT) {
      const excess = absDelta - RUBBER_LIMIT;
      visualDelta = RUBBER_LIMIT + excess * RUBBER_FACTOR;
      visualDelta = isTop ? -visualDelta : visualDelta;
    } else {
      visualDelta = delta;
    }
    // Динамическая тень: затухает по мере оттягивания
    if (sheetRef.current) {
      const shadowStrength = Math.max(0, 1 - absDelta / 280);
      const baseShadow = '0 -4px 20px rgba(0,0,0,';
      const baseShadow2 = '0 -1px 3px rgba(0,0,0,';
      sheetRef.current.style.boxShadow = `${baseShadow}${(0.08 * shadowStrength).toFixed(3)}), ${baseShadow2}${(0.04 * shadowStrength).toFixed(3)})`;
      sheetRef.current.style.transform = `translateY(${visualDelta}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };

  const onDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Velocity calculation (px/s)
    const timeDelta = Date.now() - dragStartTime.current;
    const velocity = timeDelta > 0 ? (dragCurrentY.current / timeDelta) * 1000 : 0;
    const VELOCITY_THRESHOLD = 500;
    const DISTANCE_THRESHOLD = 100;

    const shouldClose = isTop
      ? dragCurrentY.current < -DISTANCE_THRESHOLD || velocity < -VELOCITY_THRESHOLD
      : dragCurrentY.current > DISTANCE_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (shouldClose) {
      // Dismiss: animate from current position to off-screen (imperative — no React re-render)
      if (sheetRef.current) {
        const remainingDistance = Math.abs(dragCurrentY.current);
        const duration = Math.min(0.3, Math.max(0.18, remainingDistance / 800));
        sheetRef.current.style.transition = `transform ${duration}s cubic-bezier(0.4, 0, 0.6, 1), opacity ${duration}s ease-in`;
        sheetRef.current.style.transform = isTop ? 'translateY(-100%)' : 'translateY(100%)';
        sheetRef.current.style.opacity = '0';
        sheetRef.current.style.boxShadow = 'none';
      }
      // Fade backdrop imperatively (avoids React re-render that would reset sheet animation class)
      const backdrop = sheetRef.current?.previousElementSibling as HTMLElement | null;
      if (backdrop) {
        backdrop.style.transition = 'opacity 0.25s ease-in';
        backdrop.style.opacity = '0';
      }
      const dismissDelay = 300;
      setTimeout(() => {
        setVisible(false);
        setClosing(false);
        onClose(); // sync parent isOpen (visible already false → triggerClose skipped)
      }, dismissDelay);
    } else {
      // Spring return: bounce back with overshoot
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sheetRef.current.style.transform = 'translateY(0)';
        sheetRef.current.style.boxShadow = ''; // restore CSS class shadow
        sheetRef.current.style.opacity = '';
      }
    }
    document.body.style.userSelect = previousUserSelect.current;
    dragStartY.current = null;
  };

  useEffect(() => {
    if (!visible) return;

    const handleMouseMove = (e: MouseEvent) => onDragMove(e);
    const handleTouchMove = (e: TouchEvent) => onDragMove(e);
    const handleDragEnd = () => onDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
      document.body.style.userSelect = previousUserSelect.current;
    };
  }, [visible, isTop, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] ${
          reducedMotion
            ? (closing ? 'animate-fade-out-fast' : 'animate-fade-in-fast')
            : (closing ? 'animate-fade-out' : 'animate-fade-in')
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08),0_-1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3),0_-1px_3px_rgba(0,0,0,0.2)] z-[70]
                   max-h-[90vh] flex flex-col will-change-transform
                   ${isTop ? 'sheet-glow-bottom' : 'sheet-glow-top'}
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
      >
        {/* Handle — drag zone (сверху для bottom sheet) */}
        {!isTop && (
          <div
            className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={onDragStart}
            onMouseDown={onDragStart}
          >
            <div className="w-8 h-1 bg-border rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Handle — drag zone (снизу для top sheet) */}
        {isTop && (
          <div
            className="flex items-center justify-center pb-3 pt-2 cursor-grab active:cursor-grabbing"
            onTouchStart={onDragStart}
            onMouseDown={onDragStart}
          >
            <div className="w-8 h-1 bg-border rounded-full" />
          </div>
        )}
      </div>

      <style>{`
        /* === Появление снизу: scale + blur + fade === */
        @keyframes slide-up {
          0%   { transform: translateY(100%) scale(0.96); filter: blur(8px); opacity: 0; }
          100% { transform: translateY(0) scale(1);       filter: blur(0px); opacity: 1; }
        }

        /* === Уход вниз === */
        @keyframes slide-down {
          0%   { transform: translateY(0) scale(1);        filter: blur(0px); opacity: 1; }
          100% { transform: translateY(100%) scale(0.96);  filter: blur(8px); opacity: 0; }
        }

        /* === Появление сверху: scale + blur + fade === */
        @keyframes slide-down-in {
          0%   { transform: translateY(-100%) scale(0.96); filter: blur(8px); opacity: 0; }
          100% { transform: translateY(0) scale(1);         filter: blur(0px); opacity: 1; }
        }

        /* === Уход вверх === */
        @keyframes slide-up-out {
          0%   { transform: translateY(0) scale(1);          filter: blur(0px); opacity: 1; }
          100% { transform: translateY(-100%) scale(0.96);   filter: blur(8px); opacity: 0; }
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

        /* === Spring easing: overshoot + settle === */
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.25s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        .animate-slide-down-in {
          animation: slide-down-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-slide-up-out {
          animation: slide-up-out 0.22s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        .animate-slide-up-minimal {
          animation: slide-up-minimal 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
        }
        .animate-slide-down-minimal {
          animation: slide-down-minimal 0.2s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        .animate-slide-down-in-minimal {
          animation: slide-down-in-minimal 0.35s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
        }
        .animate-slide-up-out-minimal {
          animation: slide-up-out-minimal 0.2s cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.25s ease-in forwards;
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.1s ease-out forwards;
        }
        .animate-fade-out-fast {
          animation: fade-out-fast 0.08s ease-in forwards;
        }

        /* === Animated glow (pseudo-element) === */
        .sheet-glow-top::before {
          content: '';
          position: absolute;
          top: -24px;
          left: 0;
          right: 0;
          height: 36px;
          background: linear-gradient(to bottom,
            rgba(0,0,0,0.06) 0%,
            rgba(0,0,0,0.015) 50%,
            transparent 100%
          );
          filter: blur(8px);
          pointer-events: none;
          z-index: -1;
          animation: glow-in 0.6s 0.12s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .sheet-glow-bottom::before {
          content: '';
          position: absolute;
          bottom: -24px;
          left: 0;
          right: 0;
          height: 36px;
          background: linear-gradient(to top,
            rgba(0,0,0,0.06) 0%,
            rgba(0,0,0,0.015) 50%,
            transparent 100%
          );
          filter: blur(8px);
          pointer-events: none;
          z-index: -1;
          animation: glow-in 0.6s 0.12s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes glow-in {
          0%   { opacity: 0; transform: scaleY(0.6); }
          100% { opacity: 1; transform: scaleY(1); }
        }

        @keyframes glow-out {
          0%   { opacity: 1; transform: scaleY(1); }
          100% { opacity: 0; transform: scaleY(0.6); }
        }
      `}</style>
    </>
  );
};

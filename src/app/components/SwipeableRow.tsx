import { useState, useEffect, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';

const SWIPE_THRESHOLD = 72;
const DELETE_EXIT_DURATION_MS = 260;
const DELETE_SWIPE_OFFSET = 96;
const SWIPE_MAX_OFFSET = 112;
const SWIPE_RESISTANCE = 0.35;
const SWIPE_DIRECTION_LOCK_THRESHOLD = 10;

interface SwipeableRowProps {
  onDelete: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
}

export function SwipeableRow({ onDelete, onEdit, children }: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const deleteBackgroundRef = useRef<HTMLDivElement>(null);
  const editBackgroundRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const gestureLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string | undefined>(undefined);

  const translate = (x: number, animated: boolean) => {
    if (!contentRef.current) return;
    contentRef.current.style.transition = animated ? 'transform 0.22s ease' : 'none';
    contentRef.current.style.transform = `translateX(${x}px)`;
    if (deleteBackgroundRef.current) {
      deleteBackgroundRef.current.style.opacity = x < 0 ? '1' : '0';
    }
    if (editBackgroundRef.current) {
      editBackgroundRef.current.style.opacity = x > 0 ? '1' : '0';
    }
  };

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const startDelete = () => {
    if (isDeleting) return;
    const rowHeight = rowRef.current?.scrollHeight ?? 0;
    setIsDeleting(true);
    setMaxHeight(`${rowHeight}px`);
    translate(-DELETE_SWIPE_OFFSET, true);
    requestAnimationFrame(() => {
      setMaxHeight('0px');
    });
    deleteTimerRef.current = window.setTimeout(() => {
      onDelete();
    }, DELETE_EXIT_DURATION_MS);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentOffsetRef.current = 0;
    gestureLockRef.current = null;
    swipeDirectionRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (!gestureLockRef.current) {
      if (
        Math.abs(dx) < SWIPE_DIRECTION_LOCK_THRESHOLD &&
        Math.abs(dy) < SWIPE_DIRECTION_LOCK_THRESHOLD
      ) {
        return;
      }
      gestureLockRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (gestureLockRef.current !== 'horizontal') return;
    if (dx > 0 && !onEdit) return;

    if (!swipeDirectionRef.current) {
      swipeDirectionRef.current = dx < 0 ? 'left' : 'right';
    }
    if (
      (swipeDirectionRef.current === 'left' && dx > 0) ||
      (swipeDirectionRef.current === 'right' && dx < 0)
    ) return;

    e.preventDefault();

    const swipeDistance = Math.abs(dx);
    const resistedDistance =
      swipeDistance <= SWIPE_THRESHOLD
        ? swipeDistance
        : SWIPE_THRESHOLD + (swipeDistance - SWIPE_THRESHOLD) * SWIPE_RESISTANCE;
    const sign = swipeDirectionRef.current === 'left' ? -1 : 1;
    const offset = sign * Math.min(resistedDistance, SWIPE_MAX_OFFSET);

    currentOffsetRef.current = offset;
    translate(offset, false);
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (gestureLockRef.current === 'horizontal') {
      if (currentOffsetRef.current < -SWIPE_THRESHOLD) {
        startDelete();
      } else if (currentOffsetRef.current > SWIPE_THRESHOLD && onEdit) {
        translate(0, true);
        onEdit();
      } else {
        translate(0, true);
      }
    }
    currentOffsetRef.current = 0;
    gestureLockRef.current = null;
    swipeDirectionRef.current = null;
  };

  return (
    <div
      ref={rowRef}
      data-state={isDeleting ? 'deleting' : 'idle'}
      className="relative overflow-hidden transition-[max-height,opacity] duration-[260ms] ease-out"
      style={{ maxHeight, opacity: isDeleting ? 0 : 1 }}
    >
      {onEdit && (
        <div
          ref={editBackgroundRef}
          className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-blue-500"
          style={{ opacity: 0, transition: 'opacity 0.12s ease' }}
        >
          <Pencil className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        ref={deleteBackgroundRef}
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500"
        style={{ opacity: 0, transition: 'opacity 0.12s ease' }}
      >
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

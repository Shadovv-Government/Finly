import type { Variants } from 'motion/react';

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.05, 0.2), duration: 0.28, ease: 'easeOut' as const },
  }),
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.04, 0.16), duration: 0.24, ease: 'easeOut' as const },
  }),
};

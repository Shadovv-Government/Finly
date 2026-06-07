interface Props {
  isPremium: boolean;
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function PremiumAvatarWrapper({ isPremium, size = 'md', children }: Props) {
  return (
    <div className="relative inline-block">
      <div
        className="rounded-full"
        style={isPremium ? {
          boxShadow: '0 0 0 3px var(--background), 0 0 0 5.5px var(--primary)',
        } : undefined}
      >
        {children}
      </div>

      {isPremium && (
        <span
          className={`
            absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[45%] z-10
            flex items-center gap-1 whitespace-nowrap
            bg-gradient-to-r from-indigo-600 to-purple-600
            text-white font-semibold rounded-full shadow-lg
            ${size === 'sm'
              ? 'text-[11px] px-2 py-[2.5px]'
              : 'text-[13px] px-2.5 py-[3.5px]'}
          `}
        >
          Pro
        </span>
      )}
    </div>
  );
}

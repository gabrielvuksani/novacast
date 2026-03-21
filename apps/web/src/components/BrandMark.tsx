interface BrandMarkProps {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandMark({ compact = false, showTagline = false, className = '', size = 'md' }: BrandMarkProps) {
  const sizeMap = {
    sm: { mark: 'h-8 w-8', ring1: 'w-5 h-5', ring2: 'w-3.5 h-3.5', core: 'w-1 h-1', text: 'text-base' },
    md: { mark: 'h-11 w-11', ring1: 'w-[1.7rem] h-[1.7rem]', ring2: 'w-[1.1rem] h-[1.1rem]', core: 'w-[0.45rem] h-[0.45rem]', text: 'text-lg' },
    lg: { mark: 'h-14 w-14', ring1: 'w-9 h-9', ring2: 'w-6 h-6', core: 'w-2.5 h-2.5', text: 'text-2xl' },
  };
  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`brand-mark ${s.mark}`} aria-hidden="true">
        <span className={`brand-mark__ring brand-mark__ring--outer ${s.ring1}`} />
        <span className={`brand-mark__ring brand-mark__ring--inner ${s.ring2}`} />
        <span className={`brand-mark__core ${s.core}`} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className={`brand-wordmark ${s.text}`}>NovaCast</div>
          {showTagline && (
            <p className="brand-tagline">Your universe of entertainment.</p>
          )}
        </div>
      )}
    </div>
  );
}

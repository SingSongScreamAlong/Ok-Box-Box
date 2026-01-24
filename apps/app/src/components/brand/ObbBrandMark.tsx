type BrandSize = 'sm' | 'md' | 'lg';

interface ObbBrandMarkProps {
  size?: BrandSize;
  showTagline?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    stripeWidth: 'w-1',
    stripeHeight: 'h-4',
    gap: 'gap-0.5',
    title: 'text-xs',
    tagline: 'text-[8px]',
  },
  md: {
    stripeWidth: 'w-1.5',
    stripeHeight: 'h-5',
    gap: 'gap-0.5',
    title: 'text-sm',
    tagline: 'text-[9px]',
  },
  lg: {
    stripeWidth: 'w-2',
    stripeHeight: 'h-7',
    gap: 'gap-1',
    title: 'text-lg',
    tagline: 'text-[10px]',
  },
};

export function ObbBrandMark({ size = 'md', showTagline = true, className = '' }: ObbBrandMarkProps) {
  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Triple stripe mark */}
      <div className={`flex ${config.gap}`}>
        <div className={`${config.stripeWidth} ${config.stripeHeight} bg-white rounded-full transform rotate-12`} />
        <div className={`${config.stripeWidth} ${config.stripeHeight} bg-[#3b82f6] rounded-full transform rotate-12`} />
        <div className={`${config.stripeWidth} ${config.stripeHeight} bg-[#f97316] rounded-full transform rotate-12`} />
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span 
          className={`${config.title} font-bold tracking-wider uppercase text-white`}
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Ok, Box Box
        </span>
        {showTagline && (
          <span className={`${config.tagline} tracking-wider text-[#f97316] uppercase`}>
            Racing Operations System
          </span>
        )}
      </div>
    </div>
  );
}

export default ObbBrandMark;

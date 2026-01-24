import { ReactNode } from 'react';

type AccentColor = 'none' | 'orange' | 'blue';

interface ObbCardProps {
  children: ReactNode;
  accent?: AccentColor;
  className?: string;
}

interface ObbCardHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

interface ObbCardBodyProps {
  children: ReactNode;
  className?: string;
}

const accentClasses: Record<AccentColor, string> = {
  none: '',
  orange: 'border-l-2 border-l-[#f97316]',
  blue: 'border-l-2 border-l-[#3b82f6]',
};

export function ObbCard({ children, accent = 'none', className = '' }: ObbCardProps) {
  return (
    <div className={`border border-white/10 ${accentClasses[accent]} ${className}`}>
      {children}
    </div>
  );
}

export function ObbCardHeader({ title, subtitle, rightContent }: ObbCardHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export function ObbCardBody({ children, className = '' }: ObbCardBodyProps) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
}

ObbCard.Header = ObbCardHeader;
ObbCard.Body = ObbCardBody;

export default ObbCard;

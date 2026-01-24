import { ReactNode } from 'react';
import { ObbBrandMark } from './ObbBrandMark';

interface SurfaceHeaderProps {
  label: string;
  title: string;
  rightContent?: ReactNode;
  showBrand?: boolean;
}

export function SurfaceHeader({ 
  label, 
  title, 
  rightContent,
  showBrand = true 
}: SurfaceHeaderProps) {
  return (
    <header className="bg-[#0a0a0a] border-b border-white/10">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {showBrand && <ObbBrandMark size="md" />}
          
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-[#f97316] uppercase tracking-[0.2em]">
              {label}
            </span>
            <span 
              className="text-sm font-bold text-white uppercase tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {title}
            </span>
          </div>
        </div>
        
        {rightContent && (
          <div className="flex items-center gap-4">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}

export default SurfaceHeader;

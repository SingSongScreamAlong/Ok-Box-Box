import { ReactNode, useRef, useEffect } from 'react';

interface PageWrapperProps {
  children: ReactNode;
  /** Video source path, e.g., "/videos/team-bg.mp4" */
  videoSrc?: string;
  /** Whether to show the video background (default: true if videoSrc provided) */
  showVideo?: boolean;
  /** Additional className for the content wrapper */
  className?: string;
  /** Layout type: 'full' for full-width, 'sidebar' for sidebar+main layout */
  layout?: 'full' | 'sidebar';
}

/**
 * Standardized page wrapper following the Ok, Box Box style guide.
 * Provides consistent video background, gradient overlays, and content structure.
 */
export function PageWrapper({ 
  children, 
  videoSrc,
  showVideo = true,
  className = '',
  layout = 'full'
}: PageWrapperProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  }, []);

  const hasVideo = showVideo && videoSrc;

  return (
    <div className={`min-h-full relative ${layout === 'sidebar' ? 'flex' : ''}`}>
      {/* Video Background Layer */}
      {hasVideo && (
        <div className="absolute inset-0 overflow-hidden z-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-70"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
          {/* Gradient overlays - let video show through */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
        </div>
      )}

      {/* Content Layer */}
      <div className={`relative z-10 ${hasVideo ? '' : ''} ${className}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Standard sidebar component for tool pages
 */
interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function PageSidebar({ children, className = '' }: SidebarProps) {
  return (
    <div className={`w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col ${className}`}>
      {children}
    </div>
  );
}

/**
 * Standard main content area for tool pages
 */
interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function PageMain({ children, className = '' }: MainContentProps) {
  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

/**
 * Standard section header following style guide
 */
interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function SectionHeader({ icon, title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h2 
            className="text-sm font-semibold uppercase tracking-wider text-white/90"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Standard card component following style guide
 */
interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({ children, className = '', elevated = false }: CardProps) {
  const baseClass = elevated
    ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded shadow-lg shadow-black/20'
    : 'bg-white/[0.03] border border-white/[0.06] rounded';
  
  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Standard card header
 */
interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function CardHeader({ icon, title, actions }: CardHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span 
          className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          {title}
        </span>
      </div>
      {actions}
    </div>
  );
}

/**
 * Standard data cell for displaying labeled values
 */
interface DataCellProps {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}

export function DataCell({ label, value, className = '', valueClassName = 'text-white' }: DataCellProps) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.08] rounded p-4 ${className}`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

/**
 * Standard toolbar for page actions
 */
interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div className={`h-12 border-b border-white/[0.06] bg-[#0e0e0e]/60 backdrop-blur-xl flex items-center justify-between px-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Standard tab button
 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function TabButton({ active, onClick, children, className = '' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs uppercase tracking-wider transition-all duration-200 rounded ${
        active
          ? 'bg-white/[0.08] text-white'
          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Evidence Popover Component
 * 
 * Standardized popover for "Trust First, Verify on Demand" UI.
 * Opens on click, anchored to element, closes with click-away or ESC.
 * 
 * Structure:
 * 1. HEADER — Claim + Confidence badge
 * 2. WHY — Primary signals (bullets)
 * 3. EVIDENCE — Micro-visuals (sparklines, bars)
 * 4. DATA QUALITY — Provenance & limitations
 * 5. FOOTER — Affected decisions
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { EvidencePayload, ConfidenceLevel } from '../types/evidence';
import './EvidencePopover.css';

interface EvidencePopoverProps {
    evidence: EvidencePayload;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    maxWidth?: number;
}

export const EvidencePopover: React.FC<EvidencePopoverProps> = ({
    evidence,
    anchorEl,
    onClose,
    maxWidth = 360
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
            if (anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        }
    }, [anchorEl, onClose]);

    // Close on ESC
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleClickOutside, handleKeyDown]);

    // Position popover relative to anchor
    const getPosition = () => {
        if (!anchorEl) return { top: 0, left: 0 };

        const rect = anchorEl.getBoundingClientRect();
        const popoverHeight = 400; // Estimate

        // Prefer below anchor, but flip if near bottom
        const spaceBelow = window.innerHeight - rect.bottom;
        const top = spaceBelow > popoverHeight
            ? rect.bottom + 8
            : rect.top - popoverHeight - 8;

        // Center horizontally, but keep on screen
        let left = rect.left + (rect.width / 2) - (maxWidth / 2);
        left = Math.max(8, Math.min(left, window.innerWidth - maxWidth - 8));

        return { top, left };
    };

    if (!anchorEl) return null;

    const position = getPosition();

    return (
        <div
            ref={popoverRef}
            className="evidence-popover"
            style={{
                top: position.top,
                left: position.left,
                maxWidth
            }}
        >
            {/* HEADER */}
            <div className="popover-header">
                <p className="claim">{evidence.claim}</p>
                <ConfidenceBadge level={evidence.confidence} />
            </div>

            {/* WHY THIS IS FLAGGED */}
            {evidence.primarySignals.length > 0 && (
                <div className="popover-section">
                    <h4>Why This Is Flagged</h4>
                    <ul className="signals-list">
                        {evidence.primarySignals.map((signal, i) => (
                            <li key={i} className={`signal ${signal.importance}`}>
                                <span className="signal-label">{signal.label}</span>
                                <span className="signal-value">
                                    {signal.trend && <TrendArrow direction={signal.trend} />}
                                    {signal.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* EVIDENCE (Micro-visuals) */}
            {evidence.microVisuals && evidence.microVisuals.length > 0 && (
                <div className="popover-section evidence-section">
                    <h4>Evidence</h4>
                    {evidence.microVisuals.map((visual, i) => (
                        <MicroVisual key={i} data={visual} />
                    ))}
                </div>
            )}

            {/* DATA QUALITY & LIMITS */}
            <div className="popover-section quality-section">
                <h4>Data Quality</h4>
                <div className="quality-row">
                    <span className="quality-label">Quality:</span>
                    <QualityBadge quality={evidence.dataQuality} />
                </div>
                <div className="quality-row">
                    <span className="quality-label">Source:</span>
                    <span className="provenance">{formatProvenance(evidence.provenance)}</span>
                </div>
                {evidence.limitations.length > 0 && (
                    <div className="limitations">
                        <span className="limitations-label">Known limits:</span>
                        <ul>
                            {evidence.limitations.map((limit, i) => (
                                <li key={i}>{limit}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* FOOTER — What this affects */}
            {evidence.affectedDecisions.length > 0 && (
                <div className="popover-footer">
                    <span className="affects-label">Affects:</span>
                    {evidence.affectedDecisions.map((decision, i) => (
                        <span key={i} className="affected-decision">{decision}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
    const labels: Record<ConfidenceLevel, string> = {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };

    return (
        <span className={`confidence-badge ${level}`}>
            {labels[level]}
        </span>
    );
};

const QualityBadge: React.FC<{ quality: string }> = ({ quality }) => {
    return (
        <span className={`quality-badge ${quality.toLowerCase()}`}>
            {quality}
        </span>
    );
};

const TrendArrow: React.FC<{ direction: 'up' | 'down' | 'stable' }> = ({ direction }) => {
    const arrows: Record<string, string> = {
        up: '↑',
        down: '↓',
        stable: '→'
    };

    return (
        <span className={`trend-arrow ${direction}`}>
            {arrows[direction]}
        </span>
    );
};

interface MicroVisualProps {
    data: {
        type: 'sparkline' | 'bars' | 'trend';
        sparklineData?: number[];
        sparklineLabel?: string;
        barData?: { label: string; value: number; baseline: number; unit: string }[];
        trendDirection?: 'up' | 'down' | 'stable';
        trendMagnitude?: 'small' | 'medium' | 'large';
    };
}

const MicroVisual: React.FC<MicroVisualProps> = ({ data }) => {
    if (data.type === 'sparkline' && data.sparklineData) {
        return <Sparkline data={data.sparklineData} label={data.sparklineLabel} />;
    }

    if (data.type === 'bars' && data.barData) {
        return <ComparisonBars data={data.barData} />;
    }

    if (data.type === 'trend') {
        return (
            <div className={`trend-indicator ${data.trendDirection} ${data.trendMagnitude}`}>
                <TrendArrow direction={data.trendDirection || 'stable'} />
                <span>{data.trendMagnitude} change</span>
            </div>
        );
    }

    return null;
};

const Sparkline: React.FC<{ data: number[]; label?: string }> = ({ data, label }) => {
    if (data.length === 0) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const height = 30;
    const width = 120;
    const step = width / (data.length - 1 || 1);

    const points = data.map((val, i) => {
        const x = i * step;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="sparkline-container">
            {label && <span className="sparkline-label">{label}</span>}
            <svg width={width} height={height} className="sparkline">
                <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    points={points}
                />
            </svg>
        </div>
    );
};

const ComparisonBars: React.FC<{ data: { label: string; value: number; baseline: number; unit: string }[] }> = ({ data }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.value, d.baseline)));

    return (
        <div className="comparison-bars">
            {data.map((bar, i) => {
                const valuePct = (bar.value / maxVal) * 100;
                const baselinePct = (bar.baseline / maxVal) * 100;
                const isDelta = bar.value !== bar.baseline;
                const isWorse = bar.value > bar.baseline;

                return (
                    <div key={i} className="bar-row">
                        <span className="bar-label">{bar.label}</span>
                        <div className="bar-container">
                            <div
                                className={`bar-fill ${isDelta ? (isWorse ? 'worse' : 'better') : ''}`}
                                style={{ width: `${valuePct}%` }}
                            />
                            {isDelta && (
                                <div
                                    className="bar-baseline"
                                    style={{ left: `${baselinePct}%` }}
                                />
                            )}
                        </div>
                        <span className="bar-value">{bar.value.toFixed(1)}{bar.unit}</span>
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// HELPERS
// ============================================================================

function formatProvenance(provenance: string): string {
    const labels: Record<string, string> = {
        'SDK_DIRECT': 'Direct from SDK',
        'DERIVED': 'Calculated',
        'INFERRED': 'Estimated',
        'UNKNOWN': 'Unknown'
    };
    return labels[provenance] || provenance;
}

// ============================================================================
// CLICKABLE WRAPPER
// ============================================================================

interface ClickableEvidenceProps {
    evidence?: EvidencePayload;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const ClickableEvidence: React.FC<ClickableEvidenceProps> = ({
    evidence,
    children,
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !evidence) return;
        setAnchorEl(event.currentTarget);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setAnchorEl(null);
    };

    const hasEvidence = evidence && !disabled;

    return (
        <>
            <div
                className={`clickable-evidence ${className} ${hasEvidence ? 'has-evidence' : ''}`}
                onClick={handleClick}
                role={hasEvidence ? 'button' : undefined}
                tabIndex={hasEvidence ? 0 : undefined}
            >
                {children}
            </div>
            {isOpen && evidence && (
                <EvidencePopover
                    evidence={evidence}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                />
            )}
        </>
    );
};

export default EvidencePopover;

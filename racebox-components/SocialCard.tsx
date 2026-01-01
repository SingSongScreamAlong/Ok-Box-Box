// =====================================================================
// Social Card Generator (Week 10)
// Client-side PNG export for broadcast-safe highlights.
// =====================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import type { Highlight } from '../../../../server/src/highlights/highlights.registry';
import './SocialCard.css';

// =====================================================================
// Types
// =====================================================================

export type CardTemplate = 'battle' | 'fastest_lap' | 'incident' | 'winner' | 'custom';

interface CardData {
    template: CardTemplate;
    highlight: Highlight | null;
    title: string;
    subtitle: string;
    drivers: { name: string; position?: number; time?: string }[];
    sessionName: string;
    brandingUrl?: string;
}

// =====================================================================
// Component
// =====================================================================

export function SocialCardGenerator() {
    const { hasCap, claims } = useAuth();
    const canExport = hasCap('racebox:social:export');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [sessionId, setSessionId] = useState('');
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
    const [template, setTemplate] = useState<CardTemplate>('battle');
    const [customTitle, setCustomTitle] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Fetch highlights for session
    useEffect(() => {
        if (!sessionId) return;

        fetch(`/api/highlights?sessionId=${sessionId}`)
            .then(res => res.json())
            .then(json => setHighlights(json.data?.highlights || []))
            .catch(console.error);
    }, [sessionId]);

    // Export to PNG
    const handleExport = useCallback(async () => {
        if (!canExport || !canvasRef.current) return;

        setIsExporting(true);

        try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No canvas context');

            // Render card to canvas
            renderCardToCanvas(ctx, canvas.width, canvas.height, {
                template,
                highlight: selectedHighlight,
                title: customTitle || selectedHighlight?.title || 'Highlight',
                subtitle: selectedHighlight?.notes || '',
                drivers: selectedHighlight?.subjectDriverIds.map(id => ({ name: id })) || [],
                sessionName: sessionId,
            });

            // Export
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `social-card-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            // Log export (would POST to audit endpoint in production)
            console.log('📸 Social card exported', {
                userId: claims?.userId,
                highlightId: selectedHighlight?.id,
                template,
            });

        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    }, [canExport, template, selectedHighlight, customTitle, sessionId, claims?.userId]);

    if (!canExport) {
        return (
            <div className="social-card-page social-card-page--unauthorized">
                <h2>🚫 Social Export Not Authorized</h2>
                <p>You need the racebox:social:export capability.</p>
            </div>
        );
    }

    return (
        <div className="social-card-page">
            <header className="social-card-page__header">
                <h1>📸 Social Card Generator</h1>
            </header>

            <div className="social-card-page__content">
                {/* Controls */}
                <div className="controls">
                    <div className="control-group">
                        <label>Session ID</label>
                        <input
                            type="text"
                            value={sessionId}
                            onChange={e => setSessionId(e.target.value)}
                            placeholder="Enter session ID"
                        />
                    </div>

                    <div className="control-group">
                        <label>Template</label>
                        <select value={template} onChange={e => setTemplate(e.target.value as CardTemplate)}>
                            <option value="battle">Battle of the Race</option>
                            <option value="fastest_lap">Fastest Lap</option>
                            <option value="incident">Incident Under Review</option>
                            <option value="winner">Winner / Podium</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Highlight</label>
                        <select
                            value={selectedHighlight?.id || ''}
                            onChange={e => {
                                const h = highlights.find(x => x.id === e.target.value);
                                setSelectedHighlight(h || null);
                            }}
                        >
                            <option value="">Select highlight...</option>
                            {highlights.map(h => (
                                <option key={h.id} value={h.id}>
                                    {h.title} ({h.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Custom Title</label>
                        <input
                            type="text"
                            value={customTitle}
                            onChange={e => setCustomTitle(e.target.value)}
                            placeholder="Override title..."
                        />
                    </div>

                    <button
                        className="export-btn"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? 'Exporting...' : '📥 Export PNG'}
                    </button>
                </div>

                {/* Preview */}
                <div className="preview">
                    <h3>Preview</h3>
                    <canvas
                        ref={canvasRef}
                        width={1200}
                        height={630}
                        className="preview-canvas"
                    />
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Canvas Rendering
// =====================================================================

function renderCardToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    data: CardData
): void {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Template-specific accent
    const accentColors: Record<CardTemplate, string> = {
        battle: '#ef4444',
        fastest_lap: '#a855f7',
        incident: '#f97316',
        winner: '#22c55e',
        custom: '#00d4ff',
    };
    const accent = accentColors[data.template];

    // Accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 8, height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText(data.title.toUpperCase(), 60, 80);

    // Subtitle
    ctx.fillStyle = '#888888';
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText(data.subtitle, 60, 120);

    // Driver names
    ctx.fillStyle = accent;
    ctx.font = 'bold 36px Inter, sans-serif';
    let yPos = 200;
    for (const driver of data.drivers.slice(0, 3)) {
        ctx.fillText(driver.name, 60, yPos);
        yPos += 50;
    }

    // Session info
    ctx.fillStyle = '#666666';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(`Session: ${data.sessionName}`, 60, height - 40);

    // Branding
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Ok, Box Box', width - 40, height - 40);
    ctx.textAlign = 'left';

    // Template-specific elements
    if (data.template === 'battle') {
        ctx.fillStyle = accent;
        ctx.font = 'bold 120px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('VS', width - 60, 180);
        ctx.textAlign = 'left';
    } else if (data.template === 'fastest_lap') {
        ctx.fillStyle = accent;
        ctx.font = 'bold 72px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText('⏱', width - 60, 120);
        ctx.textAlign = 'left';
    }
}

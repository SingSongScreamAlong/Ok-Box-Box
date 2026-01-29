// =====================================================================
// RCO Track Map Component
// Track visualization with incident markers
// =====================================================================

import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { getTrackData, TrackData } from '../../data/trackDataService';
import type { RcoIncident } from '../../types/rco';
import './RcoTrackMap.css';

interface TrackPoint {
    x: number;
    y: number;
    distPct: number;
}

interface TrackBounds {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

interface RcoTrackMapProps {
    trackName: string;
    incidents: RcoIncident[];
    selectedIncidentId: string | null;
    onSelectIncident: (incidentId: string) => void;
}

function buildDefaultTrack(): TrackPoint[] {
    const points: TrackPoint[] = [];
    const numPoints = 200;
    for (let i = 0; i < numPoints; i++) {
        const pct = i / numPoints;
        const angle = pct * Math.PI * 2;
        const radiusX = 150 + Math.sin(angle * 3) * 20;
        const radiusY = 100 + Math.cos(angle * 2) * 15;
        points.push({
            x: 200 + Math.cos(angle) * radiusX,
            y: 125 + Math.sin(angle) * radiusY,
            distPct: pct
        });
    }
    return points;
}

function calculateBounds(points: TrackPoint[]): TrackBounds {
    if (points.length === 0) return { xMin: 0, xMax: 400, yMin: 0, yMax: 250 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const pt of points) {
        xMin = Math.min(xMin, pt.x);
        xMax = Math.max(xMax, pt.x);
        yMin = Math.min(yMin, pt.y);
        yMax = Math.max(yMax, pt.y);
    }
    return { xMin, xMax, yMin, yMax };
}

function getPositionOnTrack(points: TrackPoint[], distPct: number): { x: number; y: number } {
    if (points.length === 0) return { x: 200, y: 125 };
    const normalizedPct = ((distPct % 1) + 1) % 1;
    const targetIdx = normalizedPct * (points.length - 1);
    const idx1 = Math.floor(targetIdx);
    const idx2 = Math.min(idx1 + 1, points.length - 1);
    const t = targetIdx - idx1;
    const p1 = points[idx1];
    const p2 = points[idx2];
    return { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
}

function getSeverityColor(severity: RcoIncident['severity']): string {
    switch (severity) {
        case 'critical': return '#ef4444';
        case 'warn': return '#f97316';
        case 'info': return '#3b82f6';
    }
}

export const RcoTrackMap: React.FC<RcoTrackMapProps> = ({
    trackName,
    incidents,
    selectedIncidentId,
    onSelectIncident,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 500, height: 350 });

    // Resize observer for responsive sizing
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width: Math.floor(width), height: Math.floor(height) - 80 }); // Account for header/legend
                }
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const { width, height } = dimensions;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [trackData, setTrackData] = useState<TrackData | null>(null);
    const [hoveredIncident, setHoveredIncident] = useState<RcoIncident | null>(null);
    const mousePosRef = useRef<{ x: number; y: number } | null>(null);
    const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, xMin: 0, yMin: 0, height: 0 });

    // Load track data
    useEffect(() => {
        const normalizedName = trackName.toLowerCase().replace(/\s+/g, '-');
        const possibleIds = [
            normalizedName,
            normalizedName.split('-')[0] + '-gp',
            normalizedName.split('-')[0],
        ];

        let foundData: TrackData | null = null;
        for (const id of possibleIds) {
            const data = getTrackData(id);
            if (data) {
                foundData = data;
                setTrackData(data);
                break;
            }
        }

        if (foundData?.centerline && foundData.centerline.length > 0) {
            setTrackPoints(foundData.centerline as TrackPoint[]);
        } else {
            setTrackPoints(buildDefaultTrack());
        }
    }, [trackName]);

    // Calculate bounds and transform
    const bounds = useMemo(() => calculateBounds(trackPoints), [trackPoints]);

    useEffect(() => {
        const padding = 30;
        const scaleX = (width - padding * 2) / ((bounds.xMax - bounds.xMin) || 1);
        const scaleY = (height - padding * 2) / ((bounds.yMax - bounds.yMin) || 1);
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (width - (bounds.xMax - bounds.xMin) * scale) / 2;
        const offsetY = (height - (bounds.yMax - bounds.yMin) * scale) / 2;
        transformRef.current = { scale, offsetX, offsetY, xMin: bounds.xMin, yMin: bounds.yMin, height };
    }, [bounds, width, height]);

    const worldToScreen = useCallback((wx: number, wy: number) => {
        const { scale, offsetX, offsetY, xMin, yMin, height: h } = transformRef.current;
        return {
            x: (wx - xMin) * scale + offsetX,
            y: h - ((wy - yMin) * scale + offsetY)
        };
    }, []);

    // Render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const now = Date.now();

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw track surface
            if (trackPoints.length > 2) {
                const { scale } = transformRef.current;
                const scaledWidth = 12 * scale * 0.3;

                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                const start = worldToScreen(trackPoints[0].x, trackPoints[0].y);
                ctx.moveTo(start.x, start.y);
                for (let i = 1; i < trackPoints.length; i++) {
                    const p = worldToScreen(trackPoints[i].x, trackPoints[i].y);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();

                // Outer edge
                ctx.lineWidth = scaledWidth + 2;
                ctx.strokeStyle = '#334155';
                ctx.stroke();

                // Track surface
                ctx.lineWidth = scaledWidth;
                ctx.strokeStyle = '#1e293b';
                ctx.stroke();

                // Start/Finish line
                const sf = worldToScreen(trackPoints[0].x, trackPoints[0].y);
                ctx.beginPath();
                ctx.moveTo(sf.x, sf.y - scaledWidth / 2);
                ctx.lineTo(sf.x, sf.y + scaledWidth / 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw incident markers
            const mousePos = mousePosRef.current;
            let foundHovered: RcoIncident | null = null;

            incidents.forEach((incident) => {
                const pos = getPositionOnTrack(trackPoints, incident.trackLocation.lapDistPct);
                const sPos = worldToScreen(pos.x, pos.y);
                const isSelected = incident.incidentId === selectedIncidentId;
                const color = getSeverityColor(incident.severity);

                // Check hover
                let isHovered = false;
                if (mousePos) {
                    const dx = mousePos.x - sPos.x;
                    const dy = mousePos.y - sPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    isHovered = dist < 15;
                    if (isHovered) foundHovered = incident;
                }

                // Pulse animation for new incidents
                const isNew = incident.status === 'new';
                const pulsePhase = isNew ? Math.sin((now / 500) + incident.timestamp) * 0.3 + 0.7 : 1;
                const baseRadius = isSelected ? 12 : isHovered ? 10 : 8;
                const radius = baseRadius * pulsePhase;

                // Glow effect
                if (isSelected || isHovered) {
                    ctx.beginPath();
                    ctx.arc(sPos.x, sPos.y, radius + 6, 0, Math.PI * 2);
                    ctx.fillStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
                    ctx.fill();
                }

                // Main marker
                ctx.beginPath();
                ctx.arc(sPos.x, sPos.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Border
                ctx.beginPath();
                ctx.arc(sPos.x, sPos.y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0,0,0,0.5)';
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.stroke();

                // Icon
                ctx.fillStyle = '#ffffff';
                ctx.font = `${isSelected ? 10 : 8}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', sPos.x, sPos.y);
            });

            if (foundHovered !== hoveredIncident) {
                setHoveredIncident(foundHovered);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [trackPoints, incidents, selectedIncidentId, width, height, worldToScreen, hoveredIncident]);

    // Mouse handlers
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            mousePosRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const handleMouseLeave = () => {
        mousePosRef.current = null;
        setHoveredIncident(null);
    };

    const handleClick = () => {
        if (hoveredIncident) {
            onSelectIncident(hoveredIncident.incidentId);
        }
    };

    return (
        <div className="rco-track-map" ref={containerRef}>
            <div className="rco-track-map__header">
                <span className="map-title">Track Map</span>
                <span className="map-track-name">{trackData?.name || trackName}</span>
            </div>

            <canvas
                ref={canvasRef}
                width={width}
                height={height - 40}
                className="rco-track-map__canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            />

            {hoveredIncident && (
                <div className="rco-track-map__tooltip">
                    <div className="tooltip-type">{hoveredIncident.type.replace('_', ' ')}</div>
                    <div className="tooltip-drivers">
                        {hoveredIncident.involved.map(d => d.driverName).join(' vs ')}
                    </div>
                    <div className="tooltip-time">
                        {hoveredIncident.cornerName && `${hoveredIncident.cornerName} • `}
                        Lap {hoveredIncident.lapNumber || '?'}
                    </div>
                </div>
            )}

            <div className="rco-track-map__legend">
                <span className="legend-item">
                    <span className="dot critical"></span>Critical
                </span>
                <span className="legend-item">
                    <span className="dot warn"></span>Warning
                </span>
                <span className="legend-item">
                    <span className="dot info"></span>Info
                </span>
                <span className="legend-count">{incidents.length} incidents</span>
            </div>
        </div>
    );
};

export default RcoTrackMap;

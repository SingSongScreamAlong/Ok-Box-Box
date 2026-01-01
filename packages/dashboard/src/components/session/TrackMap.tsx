// =====================================================================
// Track Map Component (Canvas Version)
// High-performance real-time visualization using HTML5 Canvas
// Optimized for 60fps rendering of 60+ cars
// =====================================================================

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useSessionStore } from '../../stores/session.store';
import { getTrackData, TrackData, TrackTurn } from '../../data/trackDataService';
import './TrackMap.css';

// Types
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

interface TrackMapProps {
    showCorners?: boolean;
    showSectors?: boolean;
    showPitLane?: boolean;
    incidentZones?: { lapDistPct: number; severity: 'light' | 'medium' | 'heavy' }[];
    trackWidth?: number;
    width?: number;
    height?: number;
}

// Helper Functions
function buildTrackFromDistPct(): TrackPoint[] {
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

export function TrackMap({
    showCorners = true,
    showSectors = true,
    // showPitLane = true, // Unused for now in canvas version
    incidentZones = [],
    trackWidth = 12,
    width = 400,
    height = 250
}: TrackMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { currentSession, timing } = useSessionStore();

    // Track State
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [trackData, setTrackData] = useState<TrackData | null>(null);
    const [hoveredTurn, setHoveredTurn] = useState<TrackTurn | null>(null);

    // Mouse Interaction
    const mousePosRef = useRef<{ x: number, y: number } | null>(null);

    // 1. Data Loading
    useEffect(() => {
        const trackName = currentSession?.trackName?.toLowerCase() || '';
        const trackConfig = currentSession?.trackConfig?.toLowerCase() || '';
        const possibleIds = [
            `${trackName}-${trackConfig}`.replace(/\s+/g, '-'),
            trackName.replace(/\s+/g, '-'),
            trackName.split(' ')[0] + '-gp',
            trackName.split(' ')[0]
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
            setTrackPoints(buildTrackFromDistPct());
        }
    }, [currentSession?.trackName, currentSession?.trackConfig]);

    // 2. Geometry Calculation
    const bounds = useMemo(() => calculateBounds(trackPoints), [trackPoints]);

    // World to Screen Transform Helper
    const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0, xMin: 0, yMin: 0, height: 0 });

    useEffect(() => {
        const padding = 20;
        const scaleX = (width - padding * 2) / ((bounds.xMax - bounds.xMin) || 1);
        const scaleY = (height - padding * 2) / ((bounds.yMax - bounds.yMin) || 1);
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (width - (bounds.xMax - bounds.xMin) * scale) / 2;
        const offsetY = (height - (bounds.yMax - bounds.yMin) * scale) / 2;

        transformRef.current = { scale, offsetX, offsetY, xMin: bounds.xMin, yMin: bounds.yMin, height };
    }, [bounds, width, height]);

    const worldToScreen = (wx: number, wy: number) => {
        const { scale, offsetX, offsetY, xMin, yMin, height: h } = transformRef.current;
        return {
            x: (wx - xMin) * scale + offsetX,
            y: h - ((wy - yMin) * scale + offsetY)
        };
    };

    // 3. Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Track Surface
            if (trackPoints.length > 2) {
                const { scale } = transformRef.current;
                const scaledWidth = trackWidth * scale * 0.3;

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

                // Outer
                ctx.lineWidth = scaledWidth + 2;
                ctx.strokeStyle = '#334155';
                ctx.stroke();

                // Inner
                ctx.lineWidth = scaledWidth;
                ctx.strokeStyle = '#1e293b';
                ctx.stroke();

                // Start/Finish
                const sf = worldToScreen(trackPoints[0].x, trackPoints[0].y);
                ctx.beginPath();
                ctx.moveTo(sf.x, sf.y - scaledWidth / 2);
                ctx.lineTo(sf.x, sf.y + scaledWidth / 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw Corners/Sectors
            if (showSectors && trackData) {
                ctx.fillStyle = '#22c55e';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                trackData.sector.forEach(sector => {
                    const pos = getPositionOnTrack(trackPoints, sector.marker);
                    const sPos = worldToScreen(pos.x, pos.y);
                    ctx.fillText(`S${sector.name}`, sPos.x, sPos.y - 12);
                    ctx.beginPath();
                    ctx.arc(sPos.x, sPos.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // Draw Incident Zones
            incidentZones.forEach(zone => {
                const pos = getPositionOnTrack(trackPoints, zone.lapDistPct);
                const sPos = worldToScreen(pos.x, pos.y);
                ctx.beginPath();
                ctx.arc(sPos.x, sPos.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = zone.severity === 'heavy' ? 'rgba(239, 68, 68, 0.4)' :
                    zone.severity === 'medium' ? 'rgba(249, 115, 22, 0.4)' :
                        'rgba(251, 191, 36, 0.4)';
                ctx.fill();
            });

            // Draw Cars
            timing.forEach((entry, idx) => {
                const lapDistPct = (entry as any).lapDistPct ?? (entry as any).lapProgress ?? 0;
                const pos = getPositionOnTrack(trackPoints, lapDistPct);
                const sPos = worldToScreen(pos.x, pos.y);

                const isLeader = idx === 0;
                const inPit = (entry as any).inPit;

                let color = '#ffffff';
                if (inPit) color = '#6b7280';
                else if (isLeader) color = '#fbbf24';
                else if (idx < 3) color = '#3b82f6';

                // Shadow
                ctx.beginPath();
                ctx.arc(sPos.x, sPos.y, isLeader ? 6 : 4, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();

                // Dot
                ctx.beginPath();
                ctx.arc(sPos.x, sPos.y, isLeader ? 5 : 3.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Number
                if (idx < 3) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`#${(entry as any).carNumber}`, sPos.x, sPos.y + 12);
                }
            });

            // Hover Check
            if (mousePosRef.current && trackData && showCorners) {
                let foundTurn: TrackTurn | null = null;
                const mx = mousePosRef.current.x;
                const my = mousePosRef.current.y;

                trackData.turn.slice(0, 15).forEach((turn, idx) => {
                    const markerPos = turn.marker ?? (turn.start + turn.end) / 2;
                    const pos = getPositionOnTrack(trackPoints, markerPos);
                    const sPos = worldToScreen(pos.x, pos.y);

                    const dx = mx - sPos.x;
                    const dy = my - sPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isHovered = dist < 10;

                    if (isHovered) foundTurn = turn;

                    ctx.beginPath();
                    ctx.arc(sPos.x, sPos.y, isHovered ? 5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = isHovered ? '#3b82f6' : '#475569';
                    ctx.fill();

                    ctx.fillStyle = isHovered ? '#ffffff' : '#94a3b8';
                    ctx.font = isHovered ? 'bold 9px sans-serif' : '7px sans-serif';
                    ctx.fillText(turn.name.length > 10 ? `T${idx + 1}` : turn.name, sPos.x, sPos.y - 6);
                });

                if (foundTurn !== hoveredTurn) {
                    setHoveredTurn(foundTurn);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [trackPoints, trackData, timing, incidentZones, width, height, showSectors, showCorners, trackWidth]);

    // Input Handling
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
        setHoveredTurn(null);
    };

    return (
        <div className="track-map" style={{ width, height }}>
            <div className="track-map__header">
                <h3>Track Map</h3>
                <span className="track-map__name">
                    {trackData?.name || currentSession?.trackName || 'Unknown Track'}
                </span>
            </div>

            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="track-map__canvas"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ display: 'block' }}
            />

            {hoveredTurn && (
                <div className="track-map__turn-info" style={{ pointerEvents: 'none' }}>
                    <strong>{hoveredTurn.name}</strong>
                    <span>({Math.round((hoveredTurn.marker ?? hoveredTurn.start) * 100)}%)</span>
                </div>
            )}

            <div className="track-map__legend">
                <span className="legend-item"><span className="dot gold"></span>Leader</span>
                <span className="legend-item"><span className="dot blue"></span>Top 3</span>
                <span className="legend-item"><span className="dot gray"></span>Pit</span>
                {trackData && (
                    <span className="legend-item track-count">
                        {trackData.turn.length} corners
                    </span>
                )}
            </div>
        </div>
    );
}

export default TrackMap;

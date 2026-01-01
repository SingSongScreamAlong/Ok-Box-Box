import React, { useEffect, useRef, useState } from 'react';
import { Track3DRenderer } from './Track3DRenderer';
import { Track3DControls } from './Track3DControls';
import styled from 'styled-components';

const Container = styled.div`
    width: 100%;
    height: 100%;
    position: relative;
    background: #111;
    overflow: hidden;
`;

const Overlay = styled.div`
    position: absolute;
    top: 20px;
    left: 20px;
    color: white;
    pointer-events: none;
    z-index: 10;
`;

interface Track3DVisualizationProps {
    isDarkTheme?: boolean;
}

export const Track3DVisualization: React.FC<Track3DVisualizationProps> = ({ isDarkTheme = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<Track3DRenderer | null>(null);
    const [cameraMode, setCameraMode] = useState<'orbit' | 'follow' | 'cockpit'>('orbit');

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Renderer
        const renderer = new Track3DRenderer({
            container: containerRef.current,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            isDarkTheme
        });
        rendererRef.current = renderer;

        // Fetch Track Data (Mock for now, replace with API call)
        // In production: fetch('/api/tracks/current').then(res => res.json()).then(data => renderer.renderTrack(data.path))
        const generateMockTrack = () => {
            const points = [];
            for (let i = 0; i <= 100; i++) {
                const t = (i / 100) * Math.PI * 2;
                // Figure-8 shape
                const x = Math.sin(t) * 100;
                const z = Math.sin(t * 2) * 50;
                points.push({ x, y: 0, z });
            }
            return points;
        };

        renderer.renderTrack(generateMockTrack());

        // Handle Resize
        const handleResize = () => {
            if (containerRef.current && rendererRef.current) {
                rendererRef.current.updateDimensions(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight
                );
            }
        };
        window.addEventListener('resize', handleResize);

        // Mock Data Loop (Temporary for testing)
        let carRotation = 0;
        const interval = setInterval(() => {
            if (rendererRef.current) {
                // Simulate a car moving along the track
                const time = Date.now() * 0.0005;
                const t = time % (Math.PI * 2);

                // Calculate position on the figure-8
                const x = Math.sin(t) * 100;
                const z = Math.sin(t * 2) * 50;

                // Calculate rotation based on direction of movement
                const nextT = (time + 0.01) % (Math.PI * 2);
                const nextX = Math.sin(nextT) * 100;
                const nextZ = Math.sin(nextT * 2) * 50;
                carRotation = Math.atan2(nextX - x, nextZ - z);

                rendererRef.current.updateCarPosition('driver-1', { x, y: 1, z }, carRotation);
            }
        }, 16);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, [isDarkTheme]);

    const handleCameraModeChange = (mode: 'orbit' | 'follow' | 'cockpit') => {
        setCameraMode(mode);
        if (rendererRef.current) {
            rendererRef.current.setCameraMode(mode, 'driver-1');
        }
    };

    return (
        <Container ref={containerRef}>
            <Overlay>
                <h2>3D Track Visualization</h2>
                <p>Status: Active</p>
            </Overlay>
            <Track3DControls
                cameraMode={cameraMode}
                onCameraModeChange={handleCameraModeChange}
            />
        </Container>
    );
};

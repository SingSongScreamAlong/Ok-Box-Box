import { useEffect, useState } from 'react';

// All videos used across the site
const VIDEOS = [
    '/videos/bg-1.mp4',
    '/videos/bg-2.mp4',
    '/videos/bg-3.mp4',
    '/videos/docs-left.mp4',
    '/videos/docs-right.mp4',
    '/videos/download-bg.mp4',
    '/videos/independent-access.mp4',
    '/videos/pricing-driver.mp4',
    '/videos/pricing-league.mp4',
    '/videos/pricing-team.mp4',
    '/videos/track-left.mp4',
    '/videos/track-right.mp4',
];

// All images used across the site
const IMAGES = [
    '/images/system-bg.jpg',
    '/images/winter-testing-bg.jpg',
];

export function AssetPreloader() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Check if already preloaded this session
        if (sessionStorage.getItem('assets-preloaded')) {
            setLoaded(true);
            return;
        }

        let loadedCount = 0;
        const totalAssets = VIDEOS.length + IMAGES.length;

        const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= totalAssets) {
                sessionStorage.setItem('assets-preloaded', 'true');
                setLoaded(true);
            }
        };

        // Preload images
        IMAGES.forEach(src => {
            const img = new Image();
            img.onload = checkComplete;
            img.onerror = checkComplete; // Count errors as complete to not block
            img.src = src;
        });

        // Preload videos (just metadata, not full download)
        VIDEOS.forEach(src => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = checkComplete;
            video.onerror = checkComplete;
            video.src = src;
        });

        // Fallback timeout - don't block forever
        const timeout = setTimeout(() => {
            if (!loaded) {
                sessionStorage.setItem('assets-preloaded', 'true');
                setLoaded(true);
            }
        }, 10000); // 10 second max wait

        return () => clearTimeout(timeout);
    }, [loaded]);

    // This component renders nothing - it just preloads in the background
    return null;
}

// Hook to check if assets are preloaded
export function useAssetsReady() {
    const [ready, setReady] = useState(() => {
        return sessionStorage.getItem('assets-preloaded') === 'true';
    });

    useEffect(() => {
        if (ready) return;
        
        const checkInterval = setInterval(() => {
            if (sessionStorage.getItem('assets-preloaded') === 'true') {
                setReady(true);
                clearInterval(checkInterval);
            }
        }, 100);

        return () => clearInterval(checkInterval);
    }, [ready]);

    return ready;
}

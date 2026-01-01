
// Default Static Track Definitions
// Fallback when external data is unavailable

export interface TrackDefinition {
    id: string;
    name: string;
    path: string; // SVG Path 'd' attribute
    viewBox: string; // SVG viewBox "min-x min-y width height"
    length: number; // In meters
    corners: { id: string; name: string; x: number; y: number }[];
    style: {
        strokeColor: string;
        fillColor: string;
    }
}

export const tracks: Record<string, TrackDefinition> = {
    'Silverstone': {
        id: 'silverstone',
        name: 'Silverstone Circuit (Grand Prix 2011+)',
        // Okay, that's impossible to guess blindly perfectly. 
        // I will use a simplified but clearly recognizable polygon definition.
        path: "M 480 200 L 600 180 L 580 250 L 530 250 L 540 280 L 480 400 L 250 500 L 280 550 L 400 500 L 550 250 L 700 250 L 750 400 L 650 600 L 700 650 L 800 600 L 850 400 L 700 150 L 480 200 Z",

        viewBox: "0 0 1000 800",
        length: 5891,
        corners: [
            { id: 'T1', name: 'Abbey', x: 600, y: 180 },
            { id: 'T3', name: 'Village', x: 580, y: 250 },
            { id: 'T6', name: 'Brooklands', x: 250, y: 500 },
            { id: 'T9', name: 'Copse', x: 700, y: 150 },
            { id: 'T15', name: 'Stowe', x: 800, y: 600 }
        ],
        style: { strokeColor: '#4facfe', fillColor: 'transparent' }
    },
    'Spa-Francorchamps': {
        id: 'spa',
        name: 'Spa-Francorchamps',
        // Approximate path for Spa (Triangle shapeish)
        path: "M 200 700 L 250 800 L 500 750 L 800 600 L 900 400 L 850 200 L 700 100 L 500 150 L 400 100 L 300 200 L 200 300 L 150 500 Z",
        viewBox: "0 0 1000 1000",
        length: 7004,
        corners: [
            { id: 'T1', name: 'La Source', x: 200, y: 700 },
            { id: 'T3', name: 'Eau Rouge', x: 250, y: 800 },
            { id: 'T5', name: 'Les Combes', x: 800, y: 600 },
            { id: 'T18', name: 'Bus Stop', x: 150, y: 550 }
        ],
        style: { strokeColor: '#e0c3fc', fillColor: 'transparent' }
    },
    'Monza': {
        id: 'monza',
        name: 'Autodromo Nazionale Monza',
        // Long fast shape
        path: "M 100 800 L 900 800 L 950 600 L 800 200 L 600 100 L 400 100 L 200 200 L 100 500 Z",
        viewBox: "0 0 1000 1000",
        length: 5793,
        corners: [
            { id: 'T1', name: 'Variante del Rettifilo', x: 100, y: 800 },
            { id: 'T4', name: 'Seconda Variante', x: 200, y: 200 },
            { id: 'T8', name: 'Ascari', x: 800, y: 200 },
            { id: 'T11', name: 'Parabolica', x: 900, y: 800 }
        ],
        style: { strokeColor: '#ff9a9e', fillColor: 'transparent' }
    },
    'Suzuka': {
        id: 'suzuka',
        name: 'Suzuka International Racing Course',
        // Figure 8 shape (approximated)
        path: "M 300 700 L 200 600 L 300 500 L 500 500 L 600 400 L 500 300 L 400 300 L 300 400 L 400 600 L 700 700 L 800 500 L 700 200 L 400 100 L 200 200 Z",
        viewBox: "0 0 1000 800",
        length: 5807,
        corners: [
            { id: 'T1', name: 'First Curve', x: 200, y: 200 },
            { id: 'T8', name: 'Degner', x: 400, y: 300 },
            { id: 'T11', name: 'Hairpin', x: 200, y: 600 },
            { id: 'T13', name: 'Spoon', x: 700, y: 700 },
            { id: 'T16', name: 'Casio Triangle', x: 400, y: 100 }
        ],
        style: { strokeColor: '#f6d365', fillColor: 'transparent' }
    },
    'Red Bull Ring': {
        id: 'rbr',
        name: 'Red Bull Ring',
        // Simple shape
        path: "M 200 700 L 500 800 L 800 700 L 850 500 L 700 300 L 400 200 L 200 400 Z",
        viewBox: "0 0 1000 1000",
        length: 4318,
        corners: [
            { id: 'T1', name: 'Niki Lauda Kurve', x: 200, y: 700 },
            { id: 'T3', name: 'Remus', x: 800, y: 700 },
            { id: 'T4', name: 'Schlossgold', x: 850, y: 500 },
            { id: 'T9', name: 'Rindt', x: 200, y: 400 }
        ],
        style: { strokeColor: '#fd1d1d', fillColor: 'transparent' }
    },
    'Interlagos': {
        id: 'interlagos',
        name: 'Autódromo José Carlos Pace',
        // Complex shape
        path: "M 300 700 L 200 600 L 250 500 L 150 400 L 300 300 L 500 200 L 700 150 L 900 300 L 800 600 L 600 700 L 400 800 Z",
        viewBox: "0 0 1000 1000",
        length: 4309,
        corners: [
            { id: 'T1', name: 'Senna S', x: 200, y: 600 },
            { id: 'T4', name: 'Descida do Lago', x: 150, y: 400 },
            { id: 'T12', name: 'Juncao', x: 600, y: 700 }
        ],
        style: { strokeColor: '#38f9d7', fillColor: 'transparent' }
    }
};

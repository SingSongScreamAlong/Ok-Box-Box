
const fs = require('fs');
const path = require('path');

const filePath = 'packages/dashboard/src/data/trackData/381.shape.json';

function getAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }; // Vector p2 -> p1
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }; // Vector p2 -> p3

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const cosTheta = dot / (mag1 * mag2);
    // Clamp to -1..1 to avoid floating point errors for acos
    const clamped = Math.max(-1, Math.min(1, cosTheta));
    return Math.acos(clamped) * (180 / Math.PI);
}

function analyze() {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const points = data.centerline;

        console.log(`Analyzing ${points.length} points...`);

        // Smoothing window? No, let's just look at raw first.

        for (let i = 1; i < points.length - 1; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const p3 = points[i + 1];

            const angle = getAngle(p1, p2, p3);
            const turnSeverity = 180 - angle;

            if (turnSeverity > 10) {
                console.log(`Index ${i} | Dist: ${p2.distPct.toFixed(4)} | Sev: ${turnSeverity.toFixed(0)} deg | Loc: (${p2.x.toFixed(0)}, ${p2.y.toFixed(0)})`);
            }
        }
    } catch (e) {
        console.error("Error reading file:", e);
    }
}

analyze();

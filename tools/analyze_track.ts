
import * as fs from 'fs';
import * as path from 'path';

const filePath = 'packages/dashboard/src/data/trackData/381.shape.json';

interface Point {
    x: number;
    y: number;
    distPct: number;
}

interface TrackData {
    centerline: Point[];
}

function getAngle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }; // Vector p2 -> p1
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }; // Vector p2 -> p3

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const cosTheta = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
}

function analyze() {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: TrackData = JSON.parse(content);
    const points = data.centerline;

    console.log(`Analyzing ${points.length} points...`);

    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const p3 = points[i + 1];

        const angle = getAngle(p1, p2, p3);
        // Turn angle is 180 - calculated angle (since 180 is straight line)
        const turnSeverity = 180 - angle;

        if (turnSeverity > 10) { // Filter distinct turns
            console.log(`Potential Corner at Index ${i}:`);
            console.log(`  DistPct: ${p2.distPct.toFixed(4)}`);
            console.log(`  Severity: ${turnSeverity.toFixed(1)}°`);
            console.log(`  Coords: (${p2.x.toFixed(0)}, ${p2.y.toFixed(0)})`);
            console.log('---');
        }
    }
}

analyze();

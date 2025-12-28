import type { TrackPoint, Strategy } from '../types';

export const predictTime = (trackPoints: TrackPoint[], strategy: Strategy): TrackPoint[] => {
    let totalSeconds = 0;

    const processedPoints = trackPoints.map((pt, i) => {
        if (i === 0) {
            return { ...pt, predictedTime: 0 };
        }

        const prev = trackPoints[i - 1];
        const distKm = (pt.distanceFromStart - prev.distanceFromStart) / 1000;

        // Safety check for zero distance segments which might occur in some GPS data
        if (distKm <= 0) {
            return { ...pt, predictedTime: totalSeconds };
        }

        const gradient = pt.gradient || 0;

        let pace = strategy.basePace;

        // Choose pace based on gradient
        if (gradient >= strategy.climbThreshold) {
            // Uphill walking
            pace = strategy.climbPace;
        } else if (gradient < -5 && strategy.descentPace) {
            // Significant downhill (optional optimization)
            pace = strategy.descentPace;
        }

        const segmentMinutes = distKm * pace;
        const segmentSeconds = segmentMinutes * 60;
        totalSeconds += segmentSeconds;

        return { ...pt, predictedTime: totalSeconds };
    });

    return processedPoints;
}

export const updateWaypoints = (waypoints: any[], trackPoints: TrackPoint[]): any[] => {
    // Find closest trackpoint time for each waypoint
    return waypoints.map(wp => {
        // Simple search (assuming sorted by distance)
        const closest = trackPoints.reduce((prev, curr) => {
            return (Math.abs(curr.distanceFromStart - wp.distanceFromStart) < Math.abs(prev.distanceFromStart - wp.distanceFromStart) ? curr : prev);
        });
        return { ...wp, predictedTime: closest.predictedTime };
    });
}

export const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

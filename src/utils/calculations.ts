import type { TrackPoint, Strategy } from '../types';

export const predictTime = (trackPoints: TrackPoint[], strategy: Strategy): TrackPoint[] => {
    let totalSeconds = 0;

    // Get total distance for pace distribution calculation
    const totalDistance = trackPoints.length > 0
        ? trackPoints[trackPoints.length - 1].distanceFromStart
        : 0;

    // Pace distribution factor: 100% = even pace, 80% = ends at 80% speed
    // Speed factor at distance d: 1 - (1 - paceDistribution/100) * (d / totalDistance)
    // Pace factor (inverse of speed): 1 / speedFactor
    const paceDistributionRatio = (strategy.paceDistribution || 100) / 100;

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

        let basePace = strategy.basePace;

        // Choose pace based on gradient
        if (gradient >= strategy.climbThreshold) {
            // Uphill walking
            basePace = strategy.climbPace;
        } else if (gradient < -5 && strategy.descentPace) {
            // Significant downhill (optional optimization)
            basePace = strategy.descentPace;
        }

        // Apply pace distribution factor
        // At this segment's midpoint distance, calculate speed factor
        const midpointDistance = (pt.distanceFromStart + prev.distanceFromStart) / 2;
        const progressRatio = totalDistance > 0 ? midpointDistance / totalDistance : 0;

        // Speed decreases linearly from 1.0 to paceDistributionRatio
        const speedFactor = 1 - (1 - paceDistributionRatio) * progressRatio;

        // Pace is inverse of speed (slower speed = higher pace)
        const paceFactor = speedFactor > 0 ? 1 / speedFactor : 1;
        const adjustedPace = basePace * paceFactor;

        const segmentMinutes = distKm * adjustedPace;
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

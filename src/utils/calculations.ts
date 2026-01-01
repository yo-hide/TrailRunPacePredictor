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

export const calculateAdjustedStrategy = (trackPoints: TrackPoint[], waypoints: any[], totalDistance: number, strategy: Strategy): Strategy => {
    if (strategy.mode === 'pace') return strategy;

    // Convert target hours and minutes to seconds
    const targetTotalSeconds = strategy.targetHours * 3600 + strategy.targetMinutes * 60;

    // Calculate total aid time (same logic as ResultTable.tsx)
    const startThreshold = 100;
    const goalThreshold = 100;
    const sortedWpts = [...waypoints].sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    let totalAidCount = sortedWpts.length;
    if (sortedWpts.length > 0 && sortedWpts[0].distanceFromStart < startThreshold) {
        totalAidCount--; // exclude start
    }
    const isLastAtGoal = sortedWpts.length > 0 &&
        Math.abs(sortedWpts[sortedWpts.length - 1].distanceFromStart - totalDistance) < goalThreshold;
    if (isLastAtGoal) {
        totalAidCount--; // exclude goal
    }
    totalAidCount = Math.max(0, totalAidCount);
    const totalAidTimeSeconds = totalAidCount * strategy.aidStationTime * 60;

    const netTargetSeconds = targetTotalSeconds - totalAidTimeSeconds;

    if (netTargetSeconds <= 0) return strategy; // Avoid negative or zero target

    // User requested ratio: Base : Descent : Climb = 1 : 0.8 : 2
    const referenceStrategy: Strategy = {
        ...strategy,
        basePace: 1.0,
        climbPace: 2.0,
        descentPace: 0.8
    };

    // Calculate total time with reference ratio (basePace = 1.0 min/km)
    const refTracks = predictTime(trackPoints, referenceStrategy);
    const totalRefSeconds = refTracks.length > 0 ? (refTracks[refTracks.length - 1].predictedTime || 0) : 0;

    if (totalRefSeconds <= 0) return strategy;

    // Ratio to scale reference paces to reach net target time
    const ratio = netTargetSeconds / totalRefSeconds;

    return {
        ...strategy,
        basePace: 1.0 * ratio,
        climbPace: 2.0 * ratio,
        descentPace: 0.8 * ratio,
    }
}

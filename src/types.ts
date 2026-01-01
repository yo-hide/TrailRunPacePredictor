export interface TrackPoint {
    lat: number;
    lon: number;
    ele: number;
    time?: Date;
    distanceFromStart: number; // meters
    gradient?: number; // percentage
    predictedTime?: number; // seconds from start
}

export interface WayPoint {
    lat: number;
    lon: number;
    ele: number;
    name: string;
    distanceFromStart: number;
    predictedTime?: number; // seconds from start
}

export type CalculationMode = 'pace' | 'targetTime';

export interface Strategy {
    mode: CalculationMode;
    targetHours: number;
    targetMinutes: number;
    basePace: number; // min/km (flat)
    climbThreshold: number; // gradient % to switch to walk
    climbPace: number; // min/km (walking uphill)
    descentPace: number; // min/km (downhill)
    aidStationTime: number; // minutes per aid station
    startTime: string; // HH:mm
    paceDistribution: number; // % (100 = even pace, 80 = ends at 80% of base pace)
}

export interface CourseData {
    trackPoints: TrackPoint[];
    wayPoints: WayPoint[];
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
}

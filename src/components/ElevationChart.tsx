import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, CartesianGrid } from 'recharts';
import type { TrackPoint, WayPoint, Strategy } from '../types';
import { formatTime } from '../utils/calculations';

interface Props {
    data: TrackPoint[];
    wayPoints: WayPoint[];
    strategy: Strategy;
}

interface ChartDataPoint extends TrackPoint {
    pace?: number; // min/km
}

export const ElevationChart: React.FC<Props> = ({ data, wayPoints, strategy }) => {
    // Sort waypoints by distance
    const sortedWpts = React.useMemo(() => {
        return [...wayPoints].sort((a, b) => a.distanceFromStart - b.distanceFromStart);
    }, [wayPoints]);

    // Calculate section average pace between waypoints
    const chartData = React.useMemo(() => {
        let filtered: TrackPoint[];
        if (data.length < 2000) {
            filtered = data;
        } else {
            const factor = Math.ceil(data.length / 2000);
            filtered = data.filter((_, i) => i % factor === 0);
        }

        // Build section boundaries from waypoints
        const sections: { startDist: number; endDist: number; pace: number }[] = [];

        // Add start point if no waypoint at start
        const wpDists = sortedWpts.map(wp => wp.distanceFromStart);
        const totalDist = data.length > 0 ? data[data.length - 1].distanceFromStart : 0;

        // Create all section boundaries including start (0) and end (totalDist)
        const boundaries = [0, ...wpDists, totalDist].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

        for (let i = 0; i < boundaries.length - 1; i++) {
            const startDist = boundaries[i];
            const endDist = boundaries[i + 1];

            // Find time at start and end of section
            const startPt = data.find(p => p.distanceFromStart >= startDist);
            const endPt = [...data].reverse().find(p => p.distanceFromStart <= endDist);

            if (startPt && endPt && endDist > startDist) {
                const distKm = (endDist - startDist) / 1000;
                const timeMin = ((endPt.predictedTime || 0) - (startPt.predictedTime || 0)) / 60;
                const pace = distKm > 0 ? timeMin / distKm : 0;
                sections.push({ startDist, endDist, pace });
            }
        }

        // Assign section pace to each filtered point
        return filtered.map((pt): ChartDataPoint => {
            const section = sections.find(s => pt.distanceFromStart >= s.startDist && pt.distanceFromStart <= s.endDist);
            return { ...pt, pace: section?.pace };
        });
    }, [data, sortedWpts]);

    const lastPoint = data[data.length - 1];
    const maxDist = lastPoint ? lastPoint.distanceFromStart : 0;

    const ticks = React.useMemo(() => {
        if (maxDist === 0) return [0];
        const interval = maxDist < 50000 ? 1000 : 10000;
        const t = [];
        for (let i = 0; i < maxDist; i += interval) {
            t.push(i);
        }
        t.push(maxDist);
        return t;
    }, [maxDist]);

    // Calculate cumulative time with aid station stops (same logic as ResultsTable)
    // Aid time is added AFTER leaving the aid, so it affects the segment to the NEXT waypoint
    const sortedWayPoints = React.useMemo(() => {
        const sorted = [...wayPoints].sort((a, b) => a.distanceFromStart - b.distanceFromStart);
        const startThreshold = 100; // 100m threshold
        const aidTimeSeconds = strategy.aidStationTime * 60;

        return sorted.map((wp, i) => {
            // Aid time at index N is added to segment N -> N+1
            // So at arrival to index N, we have accumulated aid times from aids 0..N-1 (excluding start)
            let aidCount = i;
            if (sorted.length > 0 && sorted[0].distanceFromStart < startThreshold) {
                // First waypoint is at start, so:
                // - index 0 (start): 0 aids
                // - index 1: 0 aids (no aid time because we just left start)
                // - index 2: 1 aid (from index 1)
                aidCount = Math.max(0, i - 1);
            }
            const cumulativeTime = (wp.predictedTime || 0) + (aidCount * aidTimeSeconds);
            return { ...wp, cumulativeTime };
        });
    }, [wayPoints, strategy.aidStationTime]);

    // Calculate elevation ticks at 100m intervals
    const elevationTicks = React.useMemo(() => {
        if (data.length === 0) return [0];
        const elevations = data.map(p => p.ele);
        const minEle = Math.min(...elevations);
        const maxEle = Math.max(...elevations);
        const startTick = Math.floor(minEle / 100) * 100;
        const endTick = Math.ceil(maxEle / 100) * 100;
        const t = [];
        for (let i = startTick; i <= endTick; i += 100) {
            t.push(i);
        }
        return t;
    }, [data]);

    // Calculate pace ticks (for Y-axis on right side)
    const paceTicks = React.useMemo(() => {
        const paces = chartData.filter(p => p.pace !== undefined).map(p => p.pace as number);
        if (paces.length === 0) return [5, 10, 15, 20];
        const minPace = Math.floor(Math.min(...paces));
        const maxPace = Math.ceil(Math.max(...paces));
        const start = Math.floor(minPace / 5) * 5;
        const end = Math.ceil(maxPace / 5) * 5;
        const t = [];
        for (let i = start; i <= end; i += 5) {
            t.push(i);
        }
        return t;
    }, [chartData]);

    return (
        <div style={{ height: '500px', width: '100%', marginTop: '20px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>コース高低図</h3>
            <div style={{ width: '100%', height: '450px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 100, right: 25, left: 20, bottom: 50 }}>
                        <XAxis
                            dataKey="distanceFromStart"
                            tickFormatter={(val) => (val / 1000).toFixed(0)}
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={ticks}
                            label={{ value: '距離 (km)', position: 'insideBottom', offset: -5 }}
                        />
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ccc"
                            strokeOpacity={0.5}
                            horizontal={true}
                            vertical={false}
                            yAxisId="elevation"
                        />
                        <YAxis
                            yAxisId="elevation"
                            label={{ value: '標高 (m)', angle: -90, position: 'insideLeft' }}
                            domain={[elevationTicks[0], elevationTicks[elevationTicks.length - 1]]}
                            width={70}
                            ticks={elevationTicks}
                        />
                        <YAxis
                            yAxisId="pace"
                            orientation="right"
                            label={{ value: 'ペース (分/km)', angle: 90, position: 'insideRight' }}
                            domain={[paceTicks[0], paceTicks[paceTicks.length - 1]]}
                            width={30}
                            ticks={paceTicks}
                        />
                        <Tooltip
                            formatter={(value: number | undefined, name: string) => {
                                if (name === 'ele') return [Math.round(value || 0) + "m", "標高"];
                                if (name === 'pace') return [(value || 0).toFixed(1) + " 分/km", "ペース"];
                                return [value, name];
                            }}
                            labelFormatter={(label: number) => (label / 1000).toFixed(2) + "km"}
                        />
                        <Area
                            yAxisId="elevation"
                            type="monotone"
                            dataKey="ele"
                            stroke="#ff8c00"
                            fill="#ffe4b5"
                            isAnimationActive={false}
                        />
                        <Line
                            yAxisId="pace"
                            type="monotone"
                            dataKey="pace"
                            stroke="#0066cc"
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls={true}
                        />

                        {sortedWayPoints
                            .filter(wp => wp.distanceFromStart >= 100) // スタート地点を除外
                            .map((wp, i) => (
                                <ReferenceDot
                                    key={i}
                                    x={wp.distanceFromStart}
                                    y={wp.ele}
                                    yAxisId="elevation"
                                    r={3}
                                    fill="red"
                                    stroke="none"
                                    label={{
                                        value: `${wp.name} ${(wp.distanceFromStart / 1000).toFixed(1)}km ${formatTime(wp.cumulativeTime)}`,
                                        position: 'insideLeft',
                                        fontSize: 10,
                                        fill: '#333',
                                        angle: -90,
                                        offset: 0,
                                        dy: -5
                                    }}
                                />
                            ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

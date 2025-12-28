import React from 'react';
import type { WayPoint, Strategy } from '../types';
import { formatTime } from '../utils/calculations';

interface Props {
    wayPoints: WayPoint[];
    totalDistance: number;
    totalTime: number; // seconds
    strategy: Strategy;
}

export const ResultsTable: React.FC<Props> = ({ wayPoints, totalDistance, totalTime, strategy }) => {
    const sortedWpts = [...wayPoints].sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    const getClockTime = (secondsFromStart: number) => {
        const [startH, startM] = strategy.startTime.split(':').map(Number);
        const startInSeconds = startH * 3600 + startM * 60;
        const total = startInSeconds + secondsFromStart;

        const h = Math.floor(total / 3600) % 24;
        const m = Math.floor((total % 3600) / 60);
        const s = Math.floor(total % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Check for aid at START (distance ~= 0)
    const startThreshold = 100; // 100m threshold
    const hasAidAtStart = sortedWpts.some(wp => wp.distanceFromStart < startThreshold);

    // Check for aid at GOAL (distance ~= totalDistance)
    const goalThreshold = 100; // 100m threshold
    const hasAidAtGoal = sortedWpts.some(wp => Math.abs(wp.distanceFromStart - totalDistance) < goalThreshold);

    // Calculate aid dwell time for a waypoint index
    // If first waypoint is at start, its dwell time is 0 (no waiting at start)
    const getAidDwellCount = (index: number) => {
        // If first waypoint is at start position, it doesn't count for aid time
        if (sortedWpts.length > 0 && sortedWpts[0].distanceFromStart < startThreshold) {
            // First waypoint is at start, so aid count is index (not index itself)
            return index; // index 0 = 0 aids, index 1 = 1 aid (from index 0 is skipped because it's at start)
        }
        return index;
    };

    return (
        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <h3>予測タイム結果</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                    <tr style={{ background: '#eee' }}>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>ポイント名</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>距離 (km)</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>区間距離 (km)</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>到着時刻</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>経過時間</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Show START row only if no aid at start */}
                    {!hasAidAtStart && (
                        <tr>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>START</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>0.0</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{strategy.startTime}:00</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>00:00:00</td>
                        </tr>
                    )}

                    {sortedWpts.map((wp, i) => {
                        const prevDist = i === 0 ? 0 : sortedWpts[i - 1].distanceFromStart;
                        const sectionDist = (wp.distanceFromStart - prevDist) / 1000;
                        const arrivalSeconds = wp.predictedTime || 0;
                        const aidTimeSeconds = strategy.aidStationTime * 60;

                        // Calculate arrival with previous aid stops (excluding aid at start)
                        const aidCount = getAidDwellCount(i);
                        const arrivalWithPrevAid = arrivalSeconds + (aidCount * aidTimeSeconds);

                        // Mark if this is the start point
                        const isAtStart = wp.distanceFromStart < startThreshold;
                        const displayName = isAtStart ? `${wp.name} (START)` : wp.name;

                        return (
                            <tr key={i}>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{displayName}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{(wp.distanceFromStart / 1000).toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{isAtStart ? '-' : sectionDist.toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getClockTime(arrivalWithPrevAid)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatTime(arrivalWithPrevAid)}{isAtStart ? '' : ' (到着)'}</td>
                            </tr>
                        );
                    })}

                    {/* Show GOAL row only if no aid at goal */}
                    {!hasAidAtGoal && (
                        <tr>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>GOAL</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{(totalDistance / 1000).toFixed(1)}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{getClockTime(totalTime + (sortedWpts.length * strategy.aidStationTime * 60))}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatTime(totalTime + (sortedWpts.length * strategy.aidStationTime * 60))}</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <p style={{ fontSize: '0.9em', color: '#666' }}>※エイド滞在時間({strategy.aidStationTime}分)を考慮しています。スタート地点のエイドでは滞在時間を加算しません。</p>
        </div>
    );
};

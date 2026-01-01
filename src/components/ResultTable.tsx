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

    // Format pace as min:sec /km
    const formatPace = (distanceKm: number, timeSeconds: number): string => {
        if (distanceKm <= 0 || timeSeconds <= 0) return '-';
        const paceMinutes = (timeSeconds / 60) / distanceKm;
        const mins = Math.floor(paceMinutes);
        const secs = Math.round((paceMinutes - mins) * 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Check for aid at START (distance ~= 0)
    const startThreshold = 100; // 100m threshold
    const hasAidAtStart = sortedWpts.some(wp => wp.distanceFromStart < startThreshold);

    // Check for aid at GOAL (distance ~= totalDistance)
    const goalThreshold = 100; // 100m threshold
    const hasAidAtGoal = sortedWpts.some(wp => Math.abs(wp.distanceFromStart - totalDistance) < goalThreshold);

    // Calculate aid dwell time for a waypoint index
    // Aid time is added AFTER leaving the aid, so it affects the segment to the NEXT waypoint
    // First waypoint at start: no aid time added yet
    // Subsequent waypoints: add aid times from all previous aids (except start)
    // Last waypoint (goal): don't add its own aid time
    const getAidDwellCount = (index: number) => {
        // If first waypoint is at start position, it doesn't count for aid time
        if (sortedWpts.length > 0 && sortedWpts[0].distanceFromStart < startThreshold) {
            // First waypoint is at start, so aid count is (index - 1) because:
            // - index 0 (start): 0 aids
            // - index 1: 0 aids (no aid time added because we just left start aid)
            // - index 2: 1 aid (start aid's time is added to segment 1->2)
            // Actually, the aid time at index N is added to segment N -> N+1
            // So at arrival to index N, we have accumulated aid times from aids 0..N-1 (excluding start)
            return Math.max(0, index - 1);
        }
        // No start aid, so all aids count
        return index;
    };

    // Calculate total aid time (excluding start and excluding last waypoint if it's at goal)
    const isLastAtGoal = sortedWpts.length > 0 &&
        Math.abs(sortedWpts[sortedWpts.length - 1].distanceFromStart - totalDistance) < goalThreshold;
    let totalAidCount = sortedWpts.length;
    if (sortedWpts.length > 0 && sortedWpts[0].distanceFromStart < startThreshold) {
        totalAidCount--; // exclude start
    }
    if (isLastAtGoal) {
        totalAidCount--; // exclude goal (no dwell time at goal)
    }
    totalAidCount = Math.max(0, totalAidCount);
    const totalAidTimeSeconds = totalAidCount * strategy.aidStationTime * 60;
    const totalTimeWithAid = totalTime + totalAidTimeSeconds;

    return (
        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <h3>予測タイム結果</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                    <tr style={{ background: '#eee' }}>
                        <th style={{ padding: '8px', border: '1px solid #ddd' }}>ポイント名</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>距離 (km)</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>区間距離<br />(km)</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>到着時刻</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>経過時間</th>
                        <th style={{ padding: '8px', border: '1px solid #ddd', width: '12%' }}>区間ペース</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Show START row only if no aid at start */}
                    {!hasAidAtStart && (
                        <tr>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>START</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>0.0</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>-</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{strategy.startTime}:00</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>00:00:00</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>-</td>
                        </tr>
                    )}

                    {sortedWpts.map((wp, i) => {
                        const prevDist = i === 0 ? 0 : sortedWpts[i - 1].distanceFromStart;
                        const prevTime = i === 0 ? 0 : (sortedWpts[i - 1].predictedTime || 0);
                        const sectionDist = (wp.distanceFromStart - prevDist) / 1000;
                        const sectionTime = (wp.predictedTime || 0) - prevTime;
                        const arrivalSeconds = wp.predictedTime || 0;
                        const aidTimeSeconds = strategy.aidStationTime * 60;

                        // Calculate arrival with previous aid stops (excluding aid at start)
                        const aidCount = getAidDwellCount(i);
                        const arrivalWithPrevAid = arrivalSeconds + (aidCount * aidTimeSeconds);

                        // Mark if this is the start point
                        const isAtStart = wp.distanceFromStart < startThreshold;
                        const displayName = isAtStart ? `${wp.name} (START)` : wp.name;

                        // Calculate section pace (excluding aid time for pacing calculation)
                        const sectionPace = isAtStart ? '-' : formatPace(sectionDist, sectionTime);

                        return (
                            <tr key={i}>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{displayName}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{(wp.distanceFromStart / 1000).toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{isAtStart ? '-' : sectionDist.toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{getClockTime(arrivalWithPrevAid)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{formatTime(arrivalWithPrevAid)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{sectionPace}</td>
                            </tr>
                        );
                    })}

                    {/* Show GOAL row only if no aid at goal */}
                    {!hasAidAtGoal && (() => {
                        // Calculate section from last waypoint to goal
                        const lastWp = sortedWpts[sortedWpts.length - 1];
                        const goalSectionDist = lastWp ? (totalDistance - lastWp.distanceFromStart) / 1000 : 0;
                        const goalSectionTime = lastWp ? totalTime - (lastWp.predictedTime || 0) : 0;
                        const goalSectionPace = formatPace(goalSectionDist, goalSectionTime);

                        return (
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>GOAL</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{(totalDistance / 1000).toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{goalSectionDist.toFixed(1)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{getClockTime(totalTimeWithAid)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{formatTime(totalTimeWithAid)}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{goalSectionPace}</td>
                            </tr>
                        );
                    })()}

                    {/* Total row */}
                    <tr style={{ background: '#f0f8ff', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>合計</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{(totalDistance / 1000).toFixed(1)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{formatTime(totalTimeWithAid)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{formatPace(totalDistance / 1000, totalTime)}</td>
                    </tr>
                </tbody>
            </table>
            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                <p style={{ margin: '2px 0' }}>※エイド滞在時間({strategy.aidStationTime}分)は次の区間の所要時間に加算されます。スタート地点およびゴール地点のエイドでは滞在時間を加算しません。</p>
                <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#d9534f' }}>※各エイドの関門時間は考慮していません。自身の責任において確認をお願いします。</p>
            </div>
        </div>
    );
};

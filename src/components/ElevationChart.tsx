import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import type { TrackPoint, WayPoint } from '../types';
import { formatTime } from '../utils/calculations';

interface Props {
    data: TrackPoint[];
    wayPoints: WayPoint[];
}

export const ElevationChart: React.FC<Props> = ({ data, wayPoints }) => {
    const chartData = React.useMemo(() => {
        if (data.length < 2000) return data;
        const factor = Math.ceil(data.length / 2000);
        return data.filter((_, i) => i % factor === 0);
    }, [data]);

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

    return (
        <div style={{ height: '400px', width: '100%', marginTop: '20px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>コース高低図 (エイド地点プロット)</h3>
            <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                        <XAxis
                            dataKey="distanceFromStart"
                            tickFormatter={(val) => (val / 1000).toFixed(0)}
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={ticks}
                            label={{ value: '距離 (km)', position: 'insideBottomRight', offset: -5 }}
                        />
                        <YAxis
                            label={{ value: '標高 (m)', angle: -90, position: 'insideLeft' }}
                            domain={['auto', 'auto']}
                            width={50}
                        />
                        <Tooltip
                            formatter={(value: number | undefined) => [Math.round(value || 0) + "m", "標高"]}
                            labelFormatter={(label: number) => (label / 1000).toFixed(2) + "km"}
                        />
                        <Area type="monotone" dataKey="ele" stroke="#82ca9d" fill="#82ca9d" isAnimationActive={false} />

                        {wayPoints.map((wp, i) => (
                            <ReferenceDot
                                key={i}
                                x={wp.distanceFromStart}
                                y={wp.ele}
                                r={6}
                                fill="red"
                                stroke="none"
                                label={{
                                    value: `${wp.name}\n${(wp.distanceFromStart / 1000).toFixed(1)}km\n${formatTime(wp.predictedTime || 0)}`,
                                    position: 'top',
                                    fontSize: 10,
                                    fill: '#333'
                                }}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

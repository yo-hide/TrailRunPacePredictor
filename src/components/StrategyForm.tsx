import React from 'react';
import type { Strategy } from '../types';

interface Props {
    strategy: Strategy;
    onChange: (s: Strategy) => void;
}

export const StrategyForm: React.FC<Props> = ({ strategy, onChange }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newValue = name === 'startTime' ? value : parseFloat(value);
        onChange({ ...strategy, [name]: newValue });
    };

    const inputStyle = { marginLeft: '10px', padding: '5px' };
    const labelStyle = { display: 'block', marginBottom: '10px' };

    return (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff' }}>
            <h3>ペース戦略設定</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                <label style={labelStyle}>
                    スタート時間
                    <input style={inputStyle} type="time" name="startTime" value={strategy.startTime} onChange={handleChange} />
                </label>
                <label style={labelStyle}>
                    基本ペース (平地・緩斜面)
                    <input style={inputStyle} type="number" name="basePace" value={strategy.basePace} onChange={handleChange} step="0.1" /> 分/km
                </label>
                <label style={labelStyle}>
                    登り判定勾配 (これ以上は歩く)
                    <input style={inputStyle} type="number" name="climbThreshold" value={strategy.climbThreshold} onChange={handleChange} step="1" /> %
                </label>
                <label style={labelStyle}>
                    登り(歩き)ペース
                    <input style={inputStyle} type="number" name="climbPace" value={strategy.climbPace} onChange={handleChange} step="0.1" /> 分/km
                </label>
                <label style={labelStyle}>
                    下りペース (勾配 -5%以下)
                    <input style={inputStyle} type="number" name="descentPace" value={strategy.descentPace} onChange={handleChange} step="0.1" /> 分/km
                </label>
                <label style={labelStyle}>
                    エイド滞在時間 (1箇所あたり)
                    <input style={inputStyle} type="number" name="aidStationTime" value={strategy.aidStationTime} onChange={handleChange} step="1" /> 分
                </label>
            </div>
        </div>
    );
};

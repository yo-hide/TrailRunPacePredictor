import React from 'react';
import type { Strategy } from '../types';

interface Props {
    strategy: Strategy;           // Current editing state (inputs)
    displayStrategy: Strategy;    // Calculated state for display (outputs)
    onChange: (s: Strategy) => void;
}

export const StrategyForm: React.FC<Props> = ({ strategy, displayStrategy, onChange }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newValue = (name === 'startTime' || name === 'mode') ? value : parseFloat(value);
        onChange({ ...strategy, [name]: newValue });
    };

    const inputStyle = { marginLeft: '10px', padding: '5px' };
    const labelStyle = { display: 'block', marginBottom: '10px' };
    const sectionStyle = { marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' };
    const disabledInputStyle = { ...inputStyle, backgroundColor: '#f0f0f0', color: '#666', cursor: 'not-allowed' };

    const isTargetMode = strategy.mode === 'targetTime';

    return (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff' }}>
            <h3>ペース戦略設定</h3>

            <div style={sectionStyle}>
                <h4 style={{ marginTop: 0 }}>計算モード</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <label style={{ cursor: 'pointer' }}>
                            <input type="radio" name="mode" value="pace" checked={strategy.mode === 'pace'} onChange={handleChange} />
                            ペース指定
                        </label>
                        <label style={{ cursor: 'pointer' }}>
                            <input type="radio" name="mode" value="targetTime" checked={isTargetMode} onChange={handleChange} />
                            完走目標タイム指定
                        </label>
                    </div>

                    {isTargetMode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px', borderLeft: '2px solid #007bff' }}>
                            <span style={{ fontWeight: 'bold' }}>完走目標タイム:</span>
                            <input
                                style={{ width: '60px', padding: '5px', fontSize: '1.1em' }}
                                type="number"
                                name="targetHours"
                                value={strategy.targetHours}
                                onChange={handleChange}
                                min="0"
                            /> 時間
                            <input
                                style={{ width: '50px', padding: '5px', fontSize: '1.1em' }}
                                type="number"
                                name="targetMinutes"
                                value={strategy.targetMinutes}
                                onChange={handleChange}
                                min="0"
                                max="59"
                            /> 分
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                <label style={labelStyle}>
                    スタート時間
                    <input style={inputStyle} type="time" name="startTime" value={strategy.startTime} onChange={handleChange} />
                </label>

                <label style={labelStyle}>
                    基本ペース (平地・緩斜面)
                    <input
                        style={isTargetMode ? disabledInputStyle : inputStyle}
                        type="number"
                        name="basePace"
                        value={isTargetMode ? displayStrategy.basePace.toFixed(2) : strategy.basePace}
                        onChange={handleChange}
                        step="0.1"
                        disabled={isTargetMode}
                    /> 分/km
                </label>

                <label style={labelStyle}>
                    登り判定勾配 (これ以上は歩く)
                    <input style={inputStyle} type="number" name="climbThreshold" value={strategy.climbThreshold} onChange={handleChange} step="1" /> %
                </label>

                <label style={labelStyle}>
                    登り(歩き)ペース
                    <input
                        style={isTargetMode ? disabledInputStyle : inputStyle}
                        type="number"
                        name="climbPace"
                        value={isTargetMode ? displayStrategy.climbPace.toFixed(2) : strategy.climbPace}
                        onChange={handleChange}
                        step="0.1"
                        disabled={isTargetMode}
                    /> 分/km
                </label>

                <label style={labelStyle}>
                    下りペース (勾配 -5%以下)
                    <input
                        style={isTargetMode ? disabledInputStyle : inputStyle}
                        type="number"
                        name="descentPace"
                        value={isTargetMode ? displayStrategy.descentPace.toFixed(2) : strategy.descentPace}
                        onChange={handleChange}
                        step="0.1"
                        disabled={isTargetMode}
                    /> 分/km
                </label>

                <label style={labelStyle}>
                    エイド滞在時間 (1箇所あたり)
                    <input style={inputStyle} type="number" name="aidStationTime" value={strategy.aidStationTime} onChange={handleChange} step="1" /> 分
                </label>

                <label style={labelStyle}>
                    ペース配分 (ゴール時の速度比率)
                    <input style={inputStyle} type="number" name="paceDistribution" value={strategy.paceDistribution} onChange={handleChange} step="1" min="50" max="100" /> %
                </label>
            </div>
            {isTargetMode && (
                <div style={{ marginTop: '15px', color: '#666', fontSize: '0.9em' }}>
                    <p style={{ margin: '2px 0' }}>※完走目標タイムに合わせてペースを自動計算しています（比率固定 平地1 : 下り0.8 : 登り2）。</p>
                </div>
            )}
        </div>
    );
};

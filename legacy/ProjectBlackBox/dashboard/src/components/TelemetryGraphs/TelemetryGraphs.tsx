import React from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GraphsContainer = styled.div`
    background: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
    padding: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const GraphSection = styled.div`
    margin-bottom: 30px;
    
    &:last-child {
        margin-bottom: 0;
    }
`;

const GraphTitle = styled.h3`
    color: #fff;
    font-size: 16px;
    margin-bottom: 15px;
    font-weight: 600;
`;

const ControlBar = styled.div`
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
`;

const ToggleButton = styled.button<{ active?: boolean }>`
    padding: 6px 12px;
    background: ${props => props.active ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)'};
    color: white;
    border: 1px solid ${props => props.active ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'};
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    
    &:hover {
        background: ${props => props.active ? '#45a049' : 'rgba(255, 255, 255, 0.2)'};
    }
`;

export interface TelemetryDataPoint {
    distance: number;
    time: number;
    speed: number;
    throttle: number;
    brake: number;
    rpm: number;
    gear: number;
    steering: number;
    gLat: number;
    gLong: number;
}

interface TelemetryGraphsProps {
    data: TelemetryDataPoint[];
    comparisonData?: TelemetryDataPoint[];
}

export const TelemetryGraphs: React.FC<TelemetryGraphsProps> = ({ data, comparisonData }) => {
    const [visibleMetrics, setVisibleMetrics] = React.useState({
        speed: true,
        throttle: true,
        brake: true,
        rpm: false,
        gear: false,
        steering: false,
        gForces: false
    });

    const toggleMetric = (metric: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
    };

    return (
        <GraphsContainer>
            <GraphSection>
                <GraphTitle>Speed & Inputs</GraphTitle>
                <ControlBar>
                    <ToggleButton
                        active={visibleMetrics.speed}
                        onClick={() => toggleMetric('speed')}
                    >
                        Speed
                    </ToggleButton>
                    <ToggleButton
                        active={visibleMetrics.throttle}
                        onClick={() => toggleMetric('throttle')}
                    >
                        Throttle
                    </ToggleButton>
                    <ToggleButton
                        active={visibleMetrics.brake}
                        onClick={() => toggleMetric('brake')}
                    >
                        Brake
                    </ToggleButton>
                    <ToggleButton
                        active={visibleMetrics.rpm}
                        onClick={() => toggleMetric('rpm')}
                    >
                        RPM
                    </ToggleButton>
                    <ToggleButton
                        active={visibleMetrics.gear}
                        onClick={() => toggleMetric('gear')}
                    >
                        Gear
                    </ToggleButton>
                </ControlBar>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="distance"
                            stroke="#fff"
                            label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                        />
                        <YAxis stroke="#fff" />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(0,0,0,0.9)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px'
                            }}
                        />
                        <Legend />
                        {visibleMetrics.speed && (
                            <Line
                                type="monotone"
                                dataKey="speed"
                                stroke="#2196F3"
                                dot={false}
                                strokeWidth={2}
                                name="Speed (km/h)"
                            />
                        )}
                        {visibleMetrics.throttle && (
                            <Line
                                type="monotone"
                                dataKey="throttle"
                                stroke="#4CAF50"
                                dot={false}
                                strokeWidth={2}
                                name="Throttle (%)"
                            />
                        )}
                        {visibleMetrics.brake && (
                            <Line
                                type="monotone"
                                dataKey="brake"
                                stroke="#f44336"
                                dot={false}
                                strokeWidth={2}
                                name="Brake (%)"
                            />
                        )}
                        {visibleMetrics.rpm && (
                            <Line
                                type="monotone"
                                dataKey="rpm"
                                stroke="#FF9800"
                                dot={false}
                                strokeWidth={1}
                                name="RPM"
                            />
                        )}
                        {visibleMetrics.gear && (
                            <Line
                                type="stepAfter"
                                dataKey="gear"
                                stroke="#9C27B0"
                                dot={false}
                                strokeWidth={2}
                                name="Gear"
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </GraphSection>

            <GraphSection>
                <GraphTitle>G-Forces</GraphTitle>
                <ControlBar>
                    <ToggleButton
                        active={visibleMetrics.gForces}
                        onClick={() => toggleMetric('gForces')}
                    >
                        Show G-Forces
                    </ToggleButton>
                </ControlBar>
                {visibleMetrics.gForces && (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="distance"
                                stroke="#fff"
                                label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#fff' }}
                            />
                            <YAxis stroke="#fff" />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(0,0,0,0.9)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="gLat"
                                stroke="#00BCD4"
                                dot={false}
                                strokeWidth={2}
                                name="Lateral G"
                            />
                            <Line
                                type="monotone"
                                dataKey="gLong"
                                stroke="#FF5722"
                                dot={false}
                                strokeWidth={2}
                                name="Longitudinal G"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </GraphSection>
        </GraphsContainer>
    );
};

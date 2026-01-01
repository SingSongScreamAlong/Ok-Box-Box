import React from 'react';
import styled from 'styled-components';

const StrategyContainer = styled.div`
    background: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
    padding: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h3`
    color: #fff;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: 600;
`;

const Timeline = styled.div`
    position: relative;
    height: 80px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    margin-bottom: 30px;
    overflow: hidden;
`;

const TimelineBar = styled.div`
    position: absolute;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.1));
    border-right: 2px solid #4CAF50;
`;

const Stint = styled.div<{ color: string; left: number; width: number }>`
    position: absolute;
    top: 10px;
    left: ${props => props.left}%;
    width: ${props => props.width}%;
    height: 60px;
    background: ${props => props.color};
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
`;

const PitStopMarker = styled.div<{ position: number }>`
    position: absolute;
    left: ${props => props.position}%;
    top: 0;
    width: 3px;
    height: 100%;
    background: #FF9800;
    
    &::before {
        content: '🔧';
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 16px;
    }
`;

const StintDetails = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
`;

const StintCard = styled.div`
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid ${props => props.color || '#4CAF50'};
`;

const StintHeader = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const StintTitle = styled.div`
    font-weight: 600;
    color: #fff;
    font-size: 14px;
`;

const TireCompound = styled.div<{ compound: string }>`
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    background: ${props => {
        switch (props.compound.toLowerCase()) {
            case 'soft': return '#f44336';
            case 'medium': return '#FF9800';
            case 'hard': return '#fff';
            default: return '#4CAF50';
        }
    }};
    color: ${props => props.compound.toLowerCase() === 'hard' ? '#000' : '#fff'};
`;

const StintStat = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
`;

const StatLabel = styled.span`
    color: rgba(255, 255, 255, 0.7);
`;

const StatValue = styled.span`
    color: #fff;
    font-weight: 500;
`;

export interface TireStint {
    stintNumber: number;
    compound: 'soft' | 'medium' | 'hard' | 'wet' | 'intermediate';
    startLap: number;
    endLap: number;
    laps: number;
    avgLapTime: number;
    degradation: number; // percentage
    fuelUsed: number;
}

export interface PitStop {
    lap: number;
    duration: number;
    tireChange: boolean;
    fuelAdded: number;
}

interface TireStrategyVisualizationProps {
    stints: TireStint[];
    pitStops: PitStop[];
    totalLaps: number;
}

const getTireColor = (compound: string): string => {
    switch (compound.toLowerCase()) {
        case 'soft': return 'rgba(244, 67, 54, 0.7)';
        case 'medium': return 'rgba(255, 152, 0, 0.7)';
        case 'hard': return 'rgba(255, 255, 255, 0.7)';
        case 'wet': return 'rgba(33, 150, 243, 0.7)';
        case 'intermediate': return 'rgba(76, 175, 80, 0.7)';
        default: return 'rgba(156, 39, 176, 0.7)';
    }
};

export const TireStrategyVisualization: React.FC<TireStrategyVisualizationProps> = ({
    stints,
    pitStops,
    totalLaps
}) => {
    return (
        <StrategyContainer>
            <Title>Tire Strategy</Title>

            <Timeline>
                {stints.map((stint) => {
                    const leftPercent = (stint.startLap / totalLaps) * 100;
                    const widthPercent = (stint.laps / totalLaps) * 100;

                    return (
                        <Stint
                            key={stint.stintNumber}
                            color={getTireColor(stint.compound)}
                            left={leftPercent}
                            width={widthPercent}
                        >
                            {stint.compound.toUpperCase()}
                        </Stint>
                    );
                })}

                {pitStops.map((stop, idx) => (
                    <PitStopMarker
                        key={idx}
                        position={(stop.lap / totalLaps) * 100}
                    />
                ))}
            </Timeline>

            <StintDetails>
                {stints.map((stint) => (
                    <StintCard key={stint.stintNumber} color={getTireColor(stint.compound)}>
                        <StintHeader>
                            <StintTitle>Stint {stint.stintNumber}</StintTitle>
                            <TireCompound compound={stint.compound}>
                                {stint.compound.toUpperCase()}
                            </TireCompound>
                        </StintHeader>

                        <StintStat>
                            <StatLabel>Laps:</StatLabel>
                            <StatValue>{stint.laps} ({stint.startLap}-{stint.endLap})</StatValue>
                        </StintStat>

                        <StintStat>
                            <StatLabel>Avg Lap Time:</StatLabel>
                            <StatValue>{stint.avgLapTime.toFixed(3)}s</StatValue>
                        </StintStat>

                        <StintStat>
                            <StatLabel>Degradation:</StatLabel>
                            <StatValue>{stint.degradation.toFixed(1)}%</StatValue>
                        </StintStat>

                        <StintStat>
                            <StatLabel>Fuel Used:</StatLabel>
                            <StatValue>{stint.fuelUsed.toFixed(1)}L</StatValue>
                        </StintStat>
                    </StintCard>
                ))}
            </StintDetails>
        </StrategyContainer>
    );
};

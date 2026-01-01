import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const TowerContainer = styled.div`
    background: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
    padding: 10px;
    min-width: 350px;
    max-height: 600px;
    overflow-y: auto;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
`;

const DriverRow = styled(motion.div) <{ isPlayer?: boolean }>`
    display: grid;
    grid-template-columns: 40px 1fr 80px 80px 80px;
    gap: 10px;
    padding: 8px 10px;
    margin-bottom: 4px;
    background: ${props => props.isPlayer ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
    border-left: 3px solid ${props => props.isPlayer ? '#4CAF50' : 'transparent'};
    border-radius: 4px;
    align-items: center;
    font-size: 13px;
    transition: background 0.2s;
    
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

const Position = styled.div<{ change?: number }>`
    font-weight: bold;
    font-size: 16px;
    color: ${props => {
        if (props.change && props.change > 0) return '#4CAF50';
        if (props.change && props.change < 0) return '#f44336';
        return '#fff';
    }};
    display: flex;
    align-items: center;
    gap: 4px;
`;

const PositionChange = styled.span<{ change: number }>`
    font-size: 10px;
    color: ${props => props.change > 0 ? '#4CAF50' : '#f44336'};
`;

const DriverName = styled.div`
    font-weight: 500;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SectorTime = styled.div<{ status?: 'fastest' | 'personal' | 'normal' }>`
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: ${props => {
        if (props.status === 'fastest') return '#a855f7'; // Purple
        if (props.status === 'personal') return '#4CAF50'; // Green
        return '#fff';
    }};
    font-weight: ${props => props.status === 'fastest' ? 'bold' : 'normal'};
`;

const Gap = styled.div`
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
`;

export interface DriverData {
    id: string;
    position: number;
    previousPosition?: number;
    name: string;
    lastLapTime: number;
    sector1: number;
    sector2: number;
    sector3: number;
    gapToLeader: number;
    gapToNext: number;
    isPlayer?: boolean;
    sector1Status?: 'fastest' | 'personal' | 'normal';
    sector2Status?: 'fastest' | 'personal' | 'normal';
    sector3Status?: 'fastest' | 'personal' | 'normal';
}

interface TimingTowerProps {
    drivers: DriverData[];
}

const formatTime = (seconds: number): string => {
    if (seconds === 0) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
};

const formatGap = (seconds: number): string => {
    if (seconds === 0) return 'Leader';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `+${seconds.toFixed(3)}s`;
};

export const TimingTower: React.FC<TimingTowerProps> = ({ drivers }) => {
    return (
        <TowerContainer>
            <Header>
                <div>Pos</div>
                <div>Driver</div>
                <div>Last Lap</div>
                <div>Best Lap</div>
                <div>Gap</div>
            </Header>
            <AnimatePresence>
                {drivers.map((driver) => {
                    const positionChange = driver.previousPosition
                        ? driver.previousPosition - driver.position
                        : 0;

                    return (
                        <DriverRow
                            key={driver.id}
                            isPlayer={driver.isPlayer}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Position change={positionChange}>
                                {driver.position}
                                {positionChange !== 0 && (
                                    <PositionChange change={positionChange}>
                                        {positionChange > 0 ? '↑' : '↓'}
                                        {Math.abs(positionChange)}
                                    </PositionChange>
                                )}
                            </Position>
                            <DriverName>{driver.name}</DriverName>
                            <SectorTime status={driver.sector1Status}>
                                {formatTime(driver.sector1)}
                            </SectorTime>
                            <SectorTime status={driver.sector2Status}>
                                {formatTime(driver.sector2)}
                            </SectorTime>
                            <Gap>
                                {driver.position === 1
                                    ? 'Leader'
                                    : formatGap(driver.gapToLeader)}
                            </Gap>
                        </DriverRow>
                    );
                })}
            </AnimatePresence>
        </TowerContainer>
    );
};

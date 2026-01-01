import React from 'react';
import styled from 'styled-components';

const ControlsContainer = styled.div`
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 8px;
    color: white;
    z-index: 100;
    min-width: 200px;
`;

const ControlGroup = styled.div`
    margin-bottom: 15px;
    
    &:last-child {
        margin-bottom: 0;
    }
`;

const Label = styled.div`
    font-size: 12px;
    margin-bottom: 8px;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 1px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 5px;
`;

const Button = styled.button<{ active?: boolean }>`
    flex: 1;
    padding: 8px 12px;
    background: ${props => props.active ? '#4CAF50' : '#333'};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
    
    &:hover {
        background: ${props => props.active ? '#45a049' : '#444'};
    }
`;

interface Track3DControlsProps {
    cameraMode: 'orbit' | 'follow' | 'cockpit';
    onCameraModeChange: (mode: 'orbit' | 'follow' | 'cockpit') => void;
}

export const Track3DControls: React.FC<Track3DControlsProps> = ({
    cameraMode,
    onCameraModeChange
}) => {
    return (
        <ControlsContainer>
            <ControlGroup>
                <Label>Camera Mode</Label>
                <ButtonGroup>
                    <Button
                        active={cameraMode === 'orbit'}
                        onClick={() => onCameraModeChange('orbit')}
                    >
                        Orbit
                    </Button>
                    <Button
                        active={cameraMode === 'follow'}
                        onClick={() => onCameraModeChange('follow')}
                    >
                        Follow
                    </Button>
                    <Button
                        active={cameraMode === 'cockpit'}
                        onClick={() => onCameraModeChange('cockpit')}
                    >
                        Cockpit
                    </Button>
                </ButtonGroup>
            </ControlGroup>
        </ControlsContainer>
    );
};

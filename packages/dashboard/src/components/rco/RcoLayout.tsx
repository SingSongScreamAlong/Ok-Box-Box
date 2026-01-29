// =====================================================================
// RCO Layout Component
// Main grid layout for Race Control Observation page
// =====================================================================

import React from 'react';
import './RcoLayout.css';

interface RcoLayoutProps {
    topBar: React.ReactNode;
    trackMap: React.ReactNode;
    leaderboard: React.ReactNode;
    incidentDetail: React.ReactNode;
    incidentFeed: React.ReactNode;
}

export const RcoLayout: React.FC<RcoLayoutProps> = ({
    topBar,
    trackMap,
    leaderboard,
    incidentDetail,
    incidentFeed,
}) => {
    return (
        <div className="rco-layout">
            <div className="rco-layout__top-bar">
                {topBar}
            </div>
            <div className="rco-layout__main">
                <div className="rco-layout__left">
                    {trackMap}
                </div>
                <div className="rco-layout__right">
                    <div className="rco-layout__right-top">
                        {leaderboard}
                    </div>
                    <div className="rco-layout__right-middle">
                        {incidentDetail}
                    </div>
                    <div className="rco-layout__right-bottom">
                        {incidentFeed}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RcoLayout;

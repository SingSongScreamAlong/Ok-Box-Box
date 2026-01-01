/**
 * Billing Return Page
 * 
 * Landing page after Squarespace checkout.
 * Refreshes bootstrap and shows subscription activation status.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../hooks/useBootstrap';
import './BillingReturn.css';

export function BillingReturn() {
    const navigate = useNavigate();
    const { refresh, bootstrap, loading } = useBootstrap();
    const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');
    const [attempts, setAttempts] = useState(0);

    useEffect(() => {
        const checkEntitlement = async () => {
            // Refresh bootstrap to get new entitlements
            await refresh();

            // Check if we have new entitlements
            // Give webhooks a few seconds to process
            if (attempts < 5) {
                setTimeout(() => {
                    setAttempts(a => a + 1);
                }, 2000);
            } else {
                // After 10 seconds, show pending message
                setStatus('pending');
            }
        };

        if (!loading) {
            // Check for new capabilities
            const hasNewAccess = bootstrap?.capabilities.driver_hud ||
                bootstrap?.capabilities.incident_review;

            if (hasNewAccess && attempts > 0) {
                setStatus('success');
            } else if (attempts >= 5) {
                setStatus('pending');
            } else {
                checkEntitlement();
            }
        }
    }, [loading, attempts, bootstrap, refresh]);

    const handleContinue = () => {
        navigate('/home');
    };

    return (
        <div className="billing-return">
            {status === 'loading' && (
                <div className="return-status loading">
                    <div className="spinner" />
                    <h2>Activating your subscription...</h2>
                    <p>This usually takes just a few seconds</p>
                </div>
            )}

            {status === 'success' && (
                <div className="return-status success">
                    <span className="success-icon">✓</span>
                    <h2>Subscription Activated!</h2>
                    <p>Your new features are now unlocked</p>
                    <button onClick={handleContinue} className="continue-btn">
                        Continue to Launchpad
                    </button>
                </div>
            )}

            {status === 'pending' && (
                <div className="return-status pending">
                    <span className="pending-icon">⏳</span>
                    <h2>Almost There!</h2>
                    <p>
                        Your payment was successful. It may take a few minutes for
                        your subscription to be activated. Check your email for
                        confirmation.
                    </p>
                    <button onClick={handleContinue} className="continue-btn">
                        Continue to Launchpad
                    </button>
                    <p className="support-note">
                        Having trouble? Contact <a href="mailto:support@okboxbox.com">support@okboxbox.com</a>
                    </p>
                </div>
            )}
        </div>
    );
}

export default BillingReturn;

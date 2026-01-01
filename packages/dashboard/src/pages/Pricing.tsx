/**
 * Pricing Page
 * 
 * Shows subscription options with links to Squarespace checkout.
 * Preserves intent param for post-purchase redirect.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBootstrap } from '../hooks/useBootstrap';
import './Pricing.css';

// Squarespace checkout URLs (configured in Squarespace Commerce)
const CHECKOUT_URLS = {
    blackbox: {
        monthly: 'https://okboxbox.squarespace.com/checkout/blackbox-monthly',
        annual: 'https://okboxbox.squarespace.com/checkout/blackbox-annual'
    },
    controlbox: {
        monthly: 'https://okboxbox.squarespace.com/checkout/controlbox-monthly',
        annual: 'https://okboxbox.squarespace.com/checkout/controlbox-annual'
    },
    bundle: {
        monthly: 'https://okboxbox.squarespace.com/checkout/bundle-monthly',
        annual: 'https://okboxbox.squarespace.com/checkout/bundle-annual'
    }
};

const RETURN_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/billing/return`
    : '/billing/return';

interface PricingTier {
    id: 'blackbox' | 'controlbox' | 'bundle';
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    features: string[];
    popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
    {
        id: 'blackbox',
        name: 'BlackBox',
        description: 'AI-powered race engineering for drivers and teams',
        monthlyPrice: 19.99,
        annualPrice: 199.99,
        features: [
            'Driver HUD overlay',
            'AI coaching assistant',
            'Voice race engineer',
            'Team pit wall view',
            'Strategy timeline',
            'Opponent intel'
        ]
    },
    {
        id: 'controlbox',
        name: 'ControlBox',
        description: 'Race control and stewarding toolkit for leagues',
        monthlyPrice: 29.99,
        annualPrice: 299.99,
        popular: true,
        features: [
            'Incident review',
            'AI-assisted liability analysis',
            'Penalty assignment',
            'Protest handling',
            'Rulebook management',
            'Audit logging'
        ]
    },
    {
        id: 'bundle',
        name: 'Bundle',
        description: 'Everything in BlackBox + ControlBox',
        monthlyPrice: 39.99,
        annualPrice: 399.99,
        features: [
            'All BlackBox features',
            'All ControlBox features',
            'Priority support',
            'Early access to new features'
        ]
    }
];

export function Pricing() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { bootstrap, hasLicense } = useBootstrap();

    const intent = searchParams.get('intent');

    const handleCheckout = (product: 'blackbox' | 'controlbox' | 'bundle', billing: 'monthly' | 'annual') => {
        // Build checkout URL with return URL
        const baseUrl = CHECKOUT_URLS[product][billing];
        const checkoutUrl = `${baseUrl}?onsuccess=${encodeURIComponent(RETURN_URL)}&email=${encodeURIComponent(bootstrap?.user.email || '')}`;

        // Navigate to Squarespace checkout
        window.location.href = checkoutUrl;
    };

    return (
        <div className="pricing-page">
            <header className="pricing-header">
                <h1>Choose Your Plan</h1>
                <p>Unlock the full power of Ok, Box Box</p>
                {intent && (
                    <p className="intent-notice">
                        Subscribe to unlock <strong>{intent}</strong> features
                    </p>
                )}
            </header>

            <div className="pricing-grid">
                {PRICING_TIERS.map(tier => {
                    const owned = hasLicense(tier.id === 'bundle' ? 'blackbox' : tier.id);

                    return (
                        <div
                            key={tier.id}
                            className={`pricing-card ${tier.popular ? 'popular' : ''} ${owned ? 'owned' : ''}`}
                        >
                            {tier.popular && <span className="popular-badge">Most Popular</span>}
                            {owned && <span className="owned-badge">✓ Active</span>}

                            <h2>{tier.name}</h2>
                            <p className="tier-description">{tier.description}</p>

                            <div className="pricing-amounts">
                                <div className="monthly">
                                    <span className="price">${tier.monthlyPrice}</span>
                                    <span className="period">/month</span>
                                </div>
                                <div className="annual">
                                    <span className="price">${tier.annualPrice}</span>
                                    <span className="period">/year</span>
                                    <span className="savings">Save ${((tier.monthlyPrice * 12) - tier.annualPrice).toFixed(0)}</span>
                                </div>
                            </div>

                            <ul className="features">
                                {tier.features.map((feature, i) => (
                                    <li key={i}>✓ {feature}</li>
                                ))}
                            </ul>

                            {owned ? (
                                <button className="subscribe-btn owned" disabled>
                                    Already Subscribed
                                </button>
                            ) : (
                                <div className="subscribe-buttons">
                                    <button
                                        className="subscribe-btn monthly"
                                        onClick={() => handleCheckout(tier.id, 'monthly')}
                                    >
                                        Subscribe Monthly
                                    </button>
                                    <button
                                        className="subscribe-btn annual"
                                        onClick={() => handleCheckout(tier.id, 'annual')}
                                    >
                                        Subscribe Annually
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <footer className="pricing-footer">
                <p>All plans include a 7-day free trial. Cancel anytime.</p>
                <button onClick={() => navigate('/home')} className="back-link">
                    ← Back to Launchpad
                </button>
            </footer>
        </div>
    );
}

export default Pricing;

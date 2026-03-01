/**
 * Pricing Page
 * Ported from packages/dashboard — adapted for Supabase auth (Gen 3)
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

const CHECKOUT_URLS = {
  blackbox: 'https://okboxbox.squarespace.com/checkout/blackbox-monthly',
  controlbox: 'https://okboxbox.squarespace.com/checkout/controlbox-monthly',
  racebox_plus: 'https://okboxbox.squarespace.com/checkout/racebox-plus-monthly',
};

const RETURN_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/billing/return`
  : '/billing/return';

interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  description: string;
  basePrice: number;
  priceUnit: string;
  seriesAddon?: number;
  features: string[];
  popular?: boolean;
  free?: boolean;
  ctaText: string;
  ctaAction?: 'checkout' | 'navigate';
  ctaTarget?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'racebox',
    name: 'RaceBox',
    tagline: 'Free for Everyone',
    description: 'Basic broadcast tools for leagues, streamers, and spectators.',
    basePrice: 0,
    priceUnit: 'forever free',
    free: true,
    features: [
      'Public timing pages',
      'Basic timing tower overlay',
      'Basic broadcast overlays',
      'Ok, Box Box branding included',
    ],
    ctaText: 'Start Broadcasting',
    ctaAction: 'navigate',
    ctaTarget: '/rco',
  },
  {
    id: 'blackbox',
    name: 'BlackBox',
    tagline: 'For Drivers & Teams',
    description: 'Live race execution and AI crew for competitive drivers.',
    basePrice: 16,
    priceUnit: 'per driver / month',
    features: [
      'AI Race Engineer (voice)',
      'AI Spotter',
      'AI Performance Analyst',
      'Live situational awareness',
      'Fuel & tire strategy',
      'Session history & IDP',
      'Opponent intel',
    ],
    ctaText: 'Start Racing',
    ctaAction: 'checkout',
    popular: true,
  },
  {
    id: 'controlbox',
    name: 'ControlBox',
    tagline: 'For Leagues',
    description: 'Race control automation and steward workflows for league operations.',
    basePrice: 18,
    priceUnit: 'per league / month',
    seriesAddon: 2,
    features: [
      'Race control automation',
      'Incident detection & workflows',
      'Rulebook enforcement',
      'Steward forensics',
      'League & series management',
      'Audit logging',
    ],
    ctaText: 'Run Your League',
    ctaAction: 'checkout',
  },
  {
    id: 'racebox_plus',
    name: 'RaceBox Plus',
    tagline: 'Professional Broadcast',
    description: 'Advanced broadcast features for monetized and professional streams.',
    basePrice: 15,
    priceUnit: 'per league / month',
    seriesAddon: 2,
    features: [
      'Director control panel',
      'Scene presets',
      'Battle box overlays',
      'Incident banners',
      'Delay buffer controls',
      'League branding',
      'Sponsor logo slots',
    ],
    ctaText: 'Go Professional',
    ctaAction: 'checkout',
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const intent = searchParams.get('intent');

  const handleCheckout = (product: string) => {
    const baseUrl = CHECKOUT_URLS[product as keyof typeof CHECKOUT_URLS];
    if (!baseUrl) return;
    const checkoutUrl = `${baseUrl}?onsuccess=${encodeURIComponent(RETURN_URL)}&email=${encodeURIComponent(user?.email || '')}`;
    window.location.href = checkoutUrl;
  };

  const handleCta = (tier: PricingTier) => {
    if (!user && tier.ctaAction === 'checkout') {
      navigate('/login?redirect=/pricing');
      return;
    }
    if (tier.ctaAction === 'navigate' && tier.ctaTarget) {
      navigate(tier.ctaTarget);
    } else {
      handleCheckout(tier.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-white/50">Live race execution. Situational awareness. Broadcast presentation.</p>
          {intent && (
            <p className="mt-3 text-sm text-orange-400">
              Subscribe to unlock <strong>{intent}</strong> features
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {PRICING_TIERS.map(tier => (
            <div
              key={tier.id}
              className={`relative flex flex-col border p-6 ${
                tier.popular
                  ? 'border-orange-500 bg-orange-500/5'
                  : tier.free
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-xs font-bold px-3 py-1 uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              {tier.free && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white/20 text-white text-xs font-bold px-3 py-1 uppercase tracking-wider">
                  Free
                </span>
              )}

              <div className="mb-4">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{tier.tagline}</p>
                <h2 className="text-xl font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>{tier.name}</h2>
              </div>

              <p className="text-sm text-white/50 mb-6">{tier.description}</p>

              <div className="mb-1">
                {tier.free ? (
                  <span className="text-3xl font-bold">$0</span>
                ) : (
                  <span className="text-3xl font-bold">${tier.basePrice}<span className="text-base font-normal text-white/40">/mo</span></span>
                )}
              </div>
              <p className="text-xs text-white/40 mb-4">{tier.priceUnit}</p>
              {tier.seriesAddon && (
                <p className="text-xs text-white/30 mb-4">+ ${tier.seriesAddon}/mo per additional series</p>
              )}

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <CheckCircle size={14} className="text-orange-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCta(tier)}
                className={`w-full py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                  tier.popular
                    ? 'bg-orange-500 hover:bg-orange-400 text-black'
                    : tier.free
                    ? 'border border-white/20 hover:border-white/40 text-white'
                    : 'border border-orange-500/50 hover:border-orange-500 text-orange-400 hover:text-orange-300'
                }`}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>

        <section className="border border-white/10 p-8 mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-6">How It Works</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="font-bold text-white mb-1">RaceBox (Free)</p>
              <p className="text-white/40">Basic overlays for anyone. Ok, Box Box branding required.</p>
            </div>
            <div>
              <p className="font-bold text-orange-400 mb-1">BlackBox</p>
              <p className="text-white/40">Billed per driver. Each team member needs their own license.</p>
            </div>
            <div>
              <p className="font-bold text-white mb-1">ControlBox</p>
              <p className="text-white/40">Billed per league. Add series for $2/month each.</p>
            </div>
            <div>
              <p className="font-bold text-white mb-1">RaceBox Plus</p>
              <p className="text-white/40">For professional streams. Drivers never pay.</p>
            </div>
          </div>
        </section>

        <footer className="text-center">
          <p className="text-white/30 text-sm mb-4">All paid plans include a 7-day free trial. Cancel anytime.</p>
          <button onClick={() => navigate('/driver/home')} className="text-white/40 hover:text-white text-sm transition-colors">
            ← Back to Dashboard
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Pricing;

/**
 * Billing Return Page
 * Landing page after Stripe checkout — polls for entitlement activation.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

type ReturnStatus = 'loading' | 'success' | 'pending';

export function BillingReturn() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ReturnStatus>('loading');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const checkEntitlement = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('pending');
          return;
        }

        const response = await fetch(`${API_BASE}/api/billing/stripe/subscriptions`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const entitlements: any[] = data.data?.entitlements || [];
          const hasActive = entitlements.some(e => !e.expires_at || new Date(e.expires_at) > new Date());

          if (hasActive && attempts > 0) {
            setStatus('success');
            return;
          }
        }
      } catch {
        // Ignore fetch errors — keep polling
      }

      if (attempts >= 5) {
        setStatus('pending');
      } else {
        setTimeout(() => setAttempts(a => a + 1), 2000);
      }
    };

    checkEntitlement();
  }, [attempts]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-white/10 bg-white/[0.02] p-10 text-center">

        {status === 'loading' && (
          <>
            <Loader2 size={40} className="text-orange-400 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Activating Subscription
            </h2>
            <p className="text-white/40 text-sm">This usually takes just a few seconds...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-green-400 mx-auto mb-6" />
            <h2 className="text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Subscription Activated
            </h2>
            <p className="text-white/40 text-sm mb-8">Your new features are now unlocked.</p>
            <button
              onClick={() => navigate('/driver/home')}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm uppercase tracking-wider transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Clock size={40} className="text-amber-400 mx-auto mb-6" />
            <h2 className="text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Almost There
            </h2>
            <p className="text-white/40 text-sm mb-4">
              Payment was successful. It may take a few minutes for your subscription to activate.
              Check your email for confirmation.
            </p>
            <button
              onClick={() => navigate('/driver/home')}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold text-sm uppercase tracking-wider transition-colors mb-4"
            >
              Go to Dashboard
            </button>
            <p className="text-white/20 text-xs">
              Having trouble?{' '}
              <a href="mailto:support@okboxbox.com" className="text-orange-400 hover:text-orange-300 transition-colors">
                support@okboxbox.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default BillingReturn;

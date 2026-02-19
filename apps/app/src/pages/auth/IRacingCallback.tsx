import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://octopus-app-qsi3i.ondigitalocean.app';

/**
 * Handles the iRacing OAuth callback.
 * iRacing redirects here with ?code=...&state=... after user authorization.
 * We forward these to the API server which exchanges the code for tokens.
 */
export function IRacingCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing iRacing authorization...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/settings?iracing_error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (!code || !state) {
      navigate('/settings?iracing_error=missing_params', { replace: true });
      return;
    }

    // Forward to API server for token exchange
    async function exchangeCode() {
      try {
        setStatus('Exchanging authorization code...');
        const res = await fetch(
          `${API_BASE}/api/oauth/iracing/exchange?code=${encodeURIComponent(code!)}&state=${encodeURIComponent(state!)}`,
        );

        const data = await res.json();

        if (data.success) {
          const nameParam = data.displayName
            ? `&name=${encodeURIComponent(data.displayName)}`
            : '';
          navigate(`/settings?iracing_linked=true${nameParam}`, { replace: true });
        } else {
          navigate(`/settings?iracing_error=${encodeURIComponent(data.error || 'exchange_failed')}`, { replace: true });
        }
      } catch (err) {
        console.error('[IRacing Callback] Exchange error:', err);
        navigate('/settings?iracing_error=exchange_failed', { replace: true });
      }
    }

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg]">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-white/50">{status}</p>
      </div>
    </div>
  );
}

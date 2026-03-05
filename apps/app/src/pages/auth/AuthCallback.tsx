import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If the session is already established by the time we mount, redirect immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/driver/home', { replace: true });
      }
    });

    // Otherwise wait for Supabase to fire SIGNED_IN after completing the OAuth exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/driver/home', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="text-center">
      <div className="w-8 h-8 mx-auto mb-4 border-2 border-[--accent] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-white/50">Completing sign in...</p>
    </div>
  );
}

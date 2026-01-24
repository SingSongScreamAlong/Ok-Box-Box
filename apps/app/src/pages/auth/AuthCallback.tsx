import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the OAuth callback automatically
    // Just redirect to dashboard after a brief moment
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="text-center">
      <div className="w-8 h-8 mx-auto mb-4 border-2 border-[--accent] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-white/50">Completing sign in...</p>
    </div>
  );
}

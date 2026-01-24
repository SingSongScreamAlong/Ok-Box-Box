import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Login() {
  const { signIn, signInWithGoogle, signInWithDiscord } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const handleDiscordSignIn = async () => {
    setError('');
    const { error } = await signInWithDiscord();
    if (error) setError(error.message);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Sign In
        </h1>
        <p className="text-sm text-white/50">
          Welcome back to Ok, Box Box
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="text-right">
          <Link 
            to="/forgot-password" 
            className="text-xs text-[--accent] hover:text-[#ea580c] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-4 bg-[--bg] text-white/40">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="btn btn-outline text-xs"
        >
          Google
        </button>
        <button
          type="button"
          onClick={handleDiscordSignIn}
          className="btn btn-outline text-xs"
        >
          Discord
        </button>
      </div>

      <p className="text-center text-sm text-white/50">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[--accent] hover:text-[#ea580c] transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}

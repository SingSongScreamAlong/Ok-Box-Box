import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Signup() {
  const { signUp, signInWithGoogle, signInWithDiscord } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, displayName);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
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

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 
            className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Check Your Email
          </h1>
          <p className="text-sm text-white/50">
            We've sent a confirmation link to <span className="text-white">{email}</span>
          </p>
        </div>
        <Link to="/login" className="text-sm text-[--accent] hover:text-[#ea580c] transition-colors">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 
          className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Create Account
        </h1>
        <p className="text-sm text-white/50">
          Join Ok, Box Box
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
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Your name"
          />
        </div>

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
            minLength={6}
          />
          <p className="text-[10px] text-white/30 mt-1">Minimum 6 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Creating account...' : 'Create Account'}
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
        Already have an account?{' '}
        <Link to="/login" className="text-[--accent] hover:text-[#ea580c] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

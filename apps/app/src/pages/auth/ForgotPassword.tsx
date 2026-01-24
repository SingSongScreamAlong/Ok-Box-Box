import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[--accent]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[--accent]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 
            className="text-xl uppercase tracking-[0.15em] font-semibold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Check Your Email
          </h1>
          <p className="text-sm text-white/50">
            We've sent a password reset link to <span className="text-white">{email}</span>
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
          Reset Password
        </h1>
        <p className="text-sm text-white/50">
          Enter your email and we'll send you a reset link
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

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="text-center text-sm text-white/50">
        Remember your password?{' '}
        <Link to="/login" className="text-[--accent] hover:text-[#ea580c] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

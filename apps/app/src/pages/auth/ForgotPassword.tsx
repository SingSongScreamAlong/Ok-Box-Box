import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Loader2, Send } from 'lucide-react';

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
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 md:p-10 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f97316]/20 flex items-center justify-center">
            <Send className="w-8 h-8 text-[#f97316]" />
          </div>
          <h1 
            className="text-2xl uppercase tracking-[0.2em] font-bold text-white mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Check Your Email
          </h1>
          <p className="text-sm text-white/50">
            We've sent a password reset link to <span className="text-white font-medium">{email}</span>
          </p>
        </div>
        <Link to="/login" className="text-sm text-[#f97316] hover:text-[#fb923c] transition-colors font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 md:p-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-2xl uppercase tracking-[0.2em] font-bold text-white mb-2"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Reset Password
        </h1>
        <p className="text-sm text-white/50">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 mb-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-11"
              placeholder="driver@team.com"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full h-12 text-sm"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      {/* Back link */}
      <p className="text-center text-sm text-white/50">
        Remember your password?{' '}
        <Link to="/login" className="text-[#f97316] hover:text-[#fb923c] transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

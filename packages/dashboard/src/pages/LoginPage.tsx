// =====================================================================
// Login Page
// Authentication UI for ControlBox
// =====================================================================

import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

import './login.css';

// Dev mode bypass - set mock user without server auth
const DEV_BYPASS_ENABLED = true;

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, setDevUser, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const from = (location.state as any)?.from?.pathname || '/';

    const handleDevBypass = () => {
        setDevUser();
        navigate(from, { replace: true });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login(email, password);
        if (success) {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon">🏁</span>
                        <h1>ControlBox</h1>
                    </div>
                    <p className="login-subtitle">Race Control Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@controlbox.local"
                            required
                            disabled={isLoading}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading || !email || !password}
                    >
                        {isLoading ? (
                            <span className="loading-spinner" />
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    {DEV_BYPASS_ENABLED && (
                        <button
                            type="button"
                            className="login-button dev-bypass"
                            onClick={handleDevBypass}
                            style={{
                                marginTop: '12px',
                                background: 'rgba(168, 85, 247, 0.2)',
                                border: '1px solid rgba(168, 85, 247, 0.5)',
                            }}
                        >
                            🔧 Dev Bypass (No Auth)
                        </button>
                    )}
                </form>

                <div className="login-footer">
                    <p>Powered by ok, box box</p>
                </div>
            </div>
        </div>
    );
}

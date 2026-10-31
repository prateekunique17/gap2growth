import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, AlertCircle } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import {
  loginWithGoogle,
  loginWithGitHub,
  signInWithPassword,
  signUpWithPassword,
} from '../../lib/auth';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Note: We intentionally do NOT auto-redirect to /dashboard on user change here,
  // because when a user signs up, Supabase sets `user`, and we want them to stay on /onboarding.


  // Listen for navbar tab-switch events
  const handleNavbarSwitch = useCallback((e) => {
    setMode(e.detail);
    setErrorMsg('');
    setInfoMsg('');
  }, []);

  useEffect(() => {
    window.addEventListener('auth-mode-change', handleNavbarSwitch);
    return () => window.removeEventListener('auth-mode-change', handleNavbarSwitch);
  }, [handleNavbarSwitch]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
    setErrorMsg('');
    setInfoMsg('');
  };

  // Email + Password Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!isSupabaseConfigured) {
      // Graceful fallback for local development before credentials are added
      if (mode === 'signup') {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUpWithPassword(email, password, { full_name: fullName });
        navigate('/onboarding');
        return;
      } else {
        await signInWithPassword(email, password);
        navigate('/dashboard');
        return;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    if (!isSupabaseConfigured) {
      alert('Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.local to enable real Google OAuth.');
      return;
    }
    try {
      setLoading(true);
      const redirectPath = mode === 'signup' ? '/onboarding' : '/dashboard';
      await loginWithGoogle(`${window.location.origin}${redirectPath}`);
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  };

  // GitHub OAuth
  const handleGithubAuth = async () => {
    setErrorMsg('');
    if (!isSupabaseConfigured) {
      alert('Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.local to enable real GitHub OAuth.');
      return;
    }
    try {
      setLoading(true);
      const redirectPath = mode === 'signup' ? '/onboarding' : '/dashboard';
      await loginWithGitHub(`${window.location.origin}${redirectPath}`);
    } catch (err) {
      setErrorMsg(err.message || 'GitHub sign-in failed.');
      setLoading(false);
    }
  };

  const sideImage = theme === 'dark' ? '/auth-side-dark.jpg' : '/auth-side-light.jpg';

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Standard Navbar */}
      <Navbar />

      {/* Split Layout below navbar */}
      <div className="auth-split-wrapper">

        {/* LEFT — Illustration Panel */}
        <div className="auth-illustration-panel">
          <img src={sideImage} alt="Gap2Growth — Career Growth Path" className="auth-illustration-img" />
        </div>

        {/* RIGHT — Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-container">

            <div className="mb-4">
              <h2 className="display-6 fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                {mode === 'signin'
                  ? 'Pick up where you left off — your analyses and roadmaps are waiting.'
                  : 'Start benchmarking your skills and building a structured career plan.'}
              </p>
            </div>

            {/* Status alerts */}
            {errorMsg && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="alert alert-info py-2 px-3 small mb-3" role="alert">
                {infoMsg}
              </div>
            )}

            {/* Tab Switcher */}
            <div className="auth-tab-switcher mb-4">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              >
                Sign Up
              </button>
            </div>

            {/* OAuth Buttons (Google & GitHub) */}
            <div className="d-flex flex-column gap-2 mb-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="btn-outline-theme w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="18" height="18" alt="Google" />
                <span className="small fw-semibold">
                  {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleGithubAuth}
                disabled={loading}
                className="btn-outline-theme w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span className="small fw-semibold">
                  {mode === 'signin' ? 'Continue with GitHub' : 'Sign up with GitHub'}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="position-relative text-center my-3">
              <hr style={{ borderColor: 'var(--border-subtle)' }} />
              <span
                className="position-absolute top-50 start-50 translate-middle px-2 small"
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}
              >
                or email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div className="mb-3">
                  <label className="auth-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control clean-input"
                    placeholder="Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="form-control clean-input"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="auth-label mb-0">Password</label>
                  {mode === 'signin' && (
                    <a href="#" className="small text-decoration-none" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  className="form-control clean-input"
                  placeholder={mode === 'signup' ? 'Minimum 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn-primary-theme w-100 py-3 mb-2"
                disabled={loading}
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
                </span>
                <ArrowRight size={17} />
              </button>

              {mode === 'signup' && (
                <p className="small mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.4 }}>
                  By creating an account you agree to our Terms. Resume files are stored in encrypted private Supabase buckets.
                </p>
              )}
            </form>

            {/* Bottom Switcher */}
            <div className="text-center mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {mode === 'signin' ? (
                <small style={{ color: 'var(--text-muted)' }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="btn btn-link p-0 small text-decoration-none fw-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Sign Up
                  </button>
                </small>
              ) : (
                <small style={{ color: 'var(--text-muted)' }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="btn btn-link p-0 small text-decoration-none fw-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Sign In
                  </button>
                </small>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

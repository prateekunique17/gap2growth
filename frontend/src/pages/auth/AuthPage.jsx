import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ArrowRight } from 'lucide-react';
import Navbar from '../../components/common/Navbar';

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);

  // Listen for navbar tab-switch events
  const handleNavbarSwitch = useCallback((e) => {
    setMode(e.detail);
  }, []);

  useEffect(() => {
    window.addEventListener('auth-mode-change', handleNavbarSwitch);
    return () => window.removeEventListener('auth-mode-change', handleNavbarSwitch);
  }, [handleNavbarSwitch]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');


  const switchMode = (newMode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'signup') {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleAuth = () => {
    alert(`Connecting to Supabase Google OAuth (${mode === 'signup' ? 'Sign Up' : 'Sign In'})...`);
  };

  const sideImage = theme === 'dark' ? '/auth-side-dark.jpg' : '/auth-side-light.jpg';

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Standard Navbar */}
      <Navbar />

      {/* Split Layout below navbar */}
      <div className="auth-split-wrapper mt-5">

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

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="btn-outline-theme w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="18" height="18" alt="Google" />
              <span className="small fw-semibold">
                {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
              </span>
            </button>

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
                />
              </div>

              <button type="submit" className="btn-primary-theme w-100 py-3 mb-2">
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
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

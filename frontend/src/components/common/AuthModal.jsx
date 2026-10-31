import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'

  // Update mode when modal opens with initialMode
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="clean-card p-4 p-md-5 border-0 mx-auto w-100" style={{ maxWidth: 420 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">
              {mode === 'signin' ? 'Sign In to Gap2Growth' : 'Create Your Account'}
            </h5>
            <button type="button" className="btn btn-link p-0" style={{ color: 'var(--text-muted)' }} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
            {mode === 'signin'
              ? 'Access your saved analyses, roadmaps, and matching jobs.'
              : 'Benchmark your skills and generate customized career roadmaps.'}
          </p>

          <button
            onClick={() => alert('Supabase Google OAuth initialization...')}
            className="btn-outline-theme w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="16" height="16" alt="google" />
            <span className="small fw-semibold">
              {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
            </span>
          </button>

          <div className="position-relative text-center my-3">
            <hr style={{ borderColor: 'var(--border-subtle)' }} />
            <span className="position-absolute top-50 start-50 translate-middle px-2 small" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              or email
            </span>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); alert(`Authenticating with Supabase (${mode})...`); onClose(); }}>
            {mode === 'signup' && (
              <div className="mb-3">
                <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Full Name</label>
                <input type="text" className="form-control clean-input" placeholder="Alex Morgan" required />
              </div>
            )}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Email</label>
              <input type="email" className="form-control clean-input" placeholder="you@domain.com" required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Password</label>
              <input type="password" className="form-control clean-input" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary-theme w-100 py-2 mt-2">
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center mt-3">
            {mode === 'signin' ? (
              <small style={{ color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
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
                  onClick={() => setMode('signin')}
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
  );
}

import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  const isOnAuthPage = location.pathname === '/auth';

  const handleAuthNav = (mode) => {
    if (isOnAuthPage) {
      // Already on auth page — just switch the tab via query param
      setSearchParams({ mode });
      // Dispatch a custom event so AuthPage can react to the change
      window.dispatchEvent(new CustomEvent('auth-mode-change', { detail: mode }));
    }
  };

  return (
    <nav className="navbar navbar-expand-lg fixed-top nav-minimal py-3">
      <div className="container">
        {/* Brand */}
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none">
          <span className="brand-font fw-bold fs-4">Gap2Growth</span>
        </Link>

        {/* 3 buttons: Dark/Light Mode, Sign In, and Sign Up */}
        <div className="d-flex align-items-center gap-3">
          {/* 1. Dark/Light Mode Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={15} />
                <span>Light</span>
              </>
            )}
          </button>

          {/* 2. Sign In Button */}
          {isOnAuthPage ? (
            <button
              type="button"
              onClick={() => handleAuthNav('signin')}
              className="btn btn-sm btn-link text-decoration-none p-0"
              style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}
            >
              Sign In
            </button>
          ) : (
            <Link
              to="/auth?mode=signin"
              className="btn btn-sm btn-link text-decoration-none p-0"
              style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}
            >
              Sign In
            </Link>
          )}

          {/* 3. Sign Up Button */}
          {isOnAuthPage ? (
            <button
              type="button"
              onClick={() => handleAuthNav('signup')}
              className="btn-primary-theme py-2 px-3 small"
              style={{ fontSize: '0.85rem' }}
            >
              Sign Up
            </button>
          ) : (
            <Link
              to="/auth?mode=signup"
              className="btn-primary-theme py-2 px-3 small"
              style={{ fontSize: '0.85rem' }}
            >
              Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="py-4 mt-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="brand-font fw-bold">Gap2Growth</span>
            <span className="small" style={{ color: 'var(--text-muted)' }}>&copy; 2026</span>
          </div>
          <div className="d-flex gap-4 small" style={{ color: 'var(--text-muted)' }}>
            <Link to="/auth?mode=signin" className="text-decoration-none" style={{ color: 'var(--text-muted)' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

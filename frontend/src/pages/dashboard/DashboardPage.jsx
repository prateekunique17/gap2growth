import React from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Layers, CheckCircle2, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />
      
      <main className="container pt-5 pb-5 mt-5">
        <div className="pt-4 mb-4">
          <span className="badge-minimal">Dashboard</span>
          <h2 className="display-6 fw-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            Candidate Overview
          </h2>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="clean-card p-4">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Target Role</span>
              <h5 className="fw-bold mt-1 mb-0" style={{ color: 'var(--text-primary)' }}>Senior Full-Stack</h5>
            </div>
          </div>
          <div className="col-md-4">
            <div className="clean-card p-4">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Role Readiness</span>
              <h5 className="fw-bold mt-1 mb-0" style={{ color: 'var(--text-primary)' }}>72% (18/25 criteria)</h5>
            </div>
          </div>
          <div className="col-md-4">
            <div className="clean-card p-4">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Study Pace</span>
              <h5 className="fw-bold mt-1 mb-0" style={{ color: 'var(--text-primary)' }}>6 hours / week</h5>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

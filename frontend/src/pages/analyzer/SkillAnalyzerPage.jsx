import React, { useState } from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import AuthModal from '../../components/common/AuthModal';
import { Target, Check, AlertTriangle, ArrowRight } from 'lucide-react';

export default function SkillAnalyzerPage() {
  const [selectedRole, setSelectedRole] = useState('Senior Full-Stack Engineer');
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-vh-100 d-flex flex-column page-content-offset">
      <Navbar onOpenAuth={() => setShowAuthModal(true)} />
      
      <main className="container py-5">
        <div className="pt-4 mb-4">
          <span className="badge-minimal">Skill Analyzer</span>
          <h2 className="display-6 fw-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            Target Role Distance Diagnostics
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Compare your verified resume skills against market requirements for {selectedRole}.
          </p>
        </div>

        {/* Role Selector & Summary */}
        <div className="clean-card p-4 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                Active Target Role
              </label>
              <select
                className="form-select clean-input"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="Senior Full-Stack Engineer">Senior Full-Stack Engineer</option>
                <option value="AI / ML Systems Engineer">AI / ML Systems Engineer</option>
                <option value="Cloud Infrastructure Architect">Cloud Infrastructure Architect</option>
              </select>
            </div>
            <div className="col-md-6 text-md-end">
              <span className="small text-uppercase fw-semibold d-block" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                Estimated Match Strength
              </span>
              <span className="display-6 fw-bold" style={{ color: 'var(--text-primary)' }}>72%</span>
            </div>
          </div>
        </div>

        {/* Detailed Competency Table */}
        <div className="clean-card p-4 overflow-hidden mb-4">
          <h5 className="fw-bold mb-3" style={{ color: 'var(--text-primary)' }}>Competency Breakdown</h5>
          <div className="table-responsive">
            <table className="table table-borderless align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="small text-uppercase" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="pb-2">Skill / Requirement</th>
                  <th className="pb-2">Importance</th>
                  <th className="pb-2">Status in Profile</th>
                  <th className="pb-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="fw-semibold">pgvector / Vector Search</td>
                  <td><span className="badge bg-secondary-subtle text-secondary small">Mandatory</span></td>
                  <td><span className="tag-minimal-gap"><AlertTriangle size={12} /> Missing</span></td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-theme py-1 px-3">Add to Roadmap</button>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="fw-semibold">React.js & Next.js (App Router)</td>
                  <td><span className="badge bg-secondary-subtle text-secondary small">Mandatory</span></td>
                  <td><span className="tag-minimal-match"><Check size={12} /> Matched (Verified)</span></td>
                  <td className="text-end"><span className="small" style={{ color: 'var(--text-muted)' }}>Ready</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="fw-semibold">Distributed Caching (Redis)</td>
                  <td><span className="badge bg-secondary-subtle text-secondary small">Preferred</span></td>
                  <td><span className="tag-minimal-match"><Check size={12} /> Elementary</span></td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-theme py-1 px-3">Review</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer onOpenAuth={() => setShowAuthModal(true)} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}


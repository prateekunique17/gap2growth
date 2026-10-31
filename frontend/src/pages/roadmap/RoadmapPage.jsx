import React, { useState } from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import AuthModal from '../../components/common/AuthModal';
import { CheckCircle2, Clock, ExternalLink } from 'lucide-react';

export default function RoadmapPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [items, setItems] = useState([
    { id: 1, title: 'Implement Vector Embeddings & Supabase pgvector', hours: 8, done: true, resource: 'https://supabase.com/docs/guides/ai' },
    { id: 2, title: 'Build RAG Pipeline with LangChain & Chunking', hours: 10, done: false, resource: 'https://python.langchain.com' },
    { id: 3, title: 'System Design: Distributed Caching & Rate Limiting', hours: 6, done: false, resource: 'https://github.com/donnemartin/system-design-primer' }
  ]);

  const toggleDone = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar onOpenAuth={() => setShowAuthModal(true)} />
      
      <main className="container pt-5 pb-5 mt-5">
        <div className="pt-4 mb-4">
          <span className="badge-minimal">Weekly Schedule</span>
          <h2 className="display-6 fw-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            Your Tailored Growth Roadmap
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Calculated for 6 hours/week. Check off milestones as you build and verify your skills.
          </p>
        </div>

        <div className="d-flex flex-column gap-3">
          {items.map((item, idx) => (
            <div key={item.id} className="clean-card p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-3">
                <button
                  onClick={() => toggleDone(item.id)}
                  className="btn btn-link p-0 text-decoration-none"
                  style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  <CheckCircle2 size={24} />
                </button>
                <div>
                  <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Milestone 0{idx + 1}
                  </span>
                  <h6 className={`fw-bold mb-0 ${item.done ? 'text-decoration-line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h6>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <span className="small d-flex align-items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={14} /> {item.hours} hours
                </span>
                <a
                  href={item.resource}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-theme py-1 px-3 d-inline-flex align-items-center gap-1"
                >
                  <span>Docs</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer onOpenAuth={() => setShowAuthModal(true)} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}


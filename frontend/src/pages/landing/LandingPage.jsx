import React from 'react';
import { ArrowRight, FileSearch, Target, Route, Briefcase, TrendingUp, Clock, Shield, Sparkles, CheckCircle2, Mail, Globe, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

export default function LandingPage() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />

      {/* ============================================================
          SECTION 1 — HERO
      ============================================================ */}
      <section className="hero-artwork-section pt-5 pb-5 mt-5">
        <div className="hero-artwork-overlay"></div>

        <div className="container pt-5 pb-5 hero-artwork-content">
          <div className="row justify-content-center text-center">
            <div className="col-lg-9 col-xl-8">

              <div className="badge-minimal mb-3">
                Career Gap Diagnostics
              </div>

              <h1 className="display-2 fw-bold mb-4" style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Gap2Growth
              </h1>

              <p className="lead fs-4 mb-5 mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                A tool that shows you the exact distance between the skills on your resume and your target role — then gives you a structured roadmap to close it.
              </p>

              <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mb-5">
                <Link to="/auth?mode=signup" className="btn-primary-theme">
                  <span>Start Free</span>
                  <ArrowRight size={17} />
                </Link>
                <a href="#features" className="btn-outline-theme">
                  Explore Features
                </a>
              </div>

              <div className="pt-4 border-top d-flex justify-content-center gap-4 gap-md-5" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <span className="fw-semibold">Objective</span>
                  <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>Benchmark against real roles</p>
                </div>
                <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-subtle)' }}></div>
                <div>
                  <span className="fw-semibold">Tailored</span>
                  <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>Calibrated to your study hours</p>
                </div>
                <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-subtle)' }}></div>
                <div>
                  <span className="fw-semibold">Private</span>
                  <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>Encrypted Supabase storage</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — FEATURES & WHAT WE DO
      ============================================================ */}
      <section id="features" className="py-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container py-5">

          <div className="text-center mb-5">
            <div className="badge-minimal mb-2">What We Do</div>
            <h2 className="display-6 fw-bold mb-3">Everything you need to close the gap</h2>
            <p className="mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: 560, lineHeight: 1.6 }}>
              Gap2Growth analyzes your resume, benchmarks your skills against real job requirements, and builds a personalized roadmap to get you where you want to be.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="row g-4 justify-content-center">

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <FileSearch size={22} />
                </div>
                <h5 className="fw-bold mb-2">AI Resume Parsing</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Upload your resume and our AI extracts skills, experience, and education into a structured profile — no manual data entry.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <Target size={22} />
                </div>
                <h5 className="fw-bold mb-2">Skill Gap Analysis</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  See exactly which skills you have, which are weak, and which are missing for your target role — scored with a readiness percentage.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <Route size={22} />
                </div>
                <h5 className="fw-bold mb-2">Custom Learning Roadmap</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Get a milestone-based learning plan with practical tasks, estimated hours, and progress tracking — calibrated to your available study time.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <Briefcase size={22} />
                </div>
                <h5 className="fw-bold mb-2">Smart Job Matching</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Ranked job recommendations with match percentage badges and skill deficiency breakdowns so you apply where you fit best.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <TrendingUp size={22} />
                </div>
                <h5 className="fw-bold mb-2">Progress Dashboard</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Track your skill growth over time with visual charts, completed milestones, and an evolving readiness score.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 h-100">
                <div className="feature-icon-wrap mb-3">
                  <Sparkles size={22} />
                </div>
                <h5 className="fw-bold mb-2">Multi-Role Comparison</h5>
                <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Compare your readiness across multiple target roles side by side — discover which career path has the shortest distance.
                </p>
              </div>
            </div>

          </div>

          {/* How It Works — 3 steps */}
          <div className="row justify-content-center mt-5 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="col-lg-10">
              <div className="text-center mb-4">
                <h4 className="fw-bold">How It Works</h4>
              </div>
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="small fw-bold mb-2" style={{ color: 'var(--text-muted)' }}>01 / EXTRACT</div>
                  <h6 className="fw-bold mb-2">Upload Your Resume</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Drop your PDF or DOCX. Our AI reads and structures your skills, experience, and education automatically.
                  </p>
                </div>
                <div className="col-md-4">
                  <div className="small fw-bold mb-2" style={{ color: 'var(--text-muted)' }}>02 / EVALUATE</div>
                  <h6 className="fw-bold mb-2">Get Your Gap Score</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Select your target role. We calculate matched, weak, and missing competencies with a clear readiness percentage.
                  </p>
                </div>
                <div className="col-md-4">
                  <div className="small fw-bold mb-2" style={{ color: 'var(--text-muted)' }}>03 / EXECUTE</div>
                  <h6 className="fw-bold mb-2">Follow Your Roadmap</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Complete milestones, track progress, and apply to jobs that match your growing skill set.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================
          SECTION 3 — BENEFITS
      ============================================================ */}
      <section id="benefits" className="py-5" style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container py-5">

          <div className="text-center mb-5">
            <div className="badge-minimal mb-2">Why Gap2Growth</div>
            <h2 className="display-6 fw-bold mb-3">Benefits that compound over time</h2>
            <p className="mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
              Stop guessing what to learn next. Get clarity, direction, and measurable progress toward the role you want.
            </p>
          </div>

          <div className="row g-4 justify-content-center">

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle2 size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Save Months of Guesswork</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Know exactly which skills matter for your target role instead of randomly picking courses and tutorials.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Study on Your Schedule</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Roadmaps adapt to your weekly study hours — whether it's 4 hours or 20, you get realistic timelines.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Shield size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Your Data Stays Private</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Resumes are stored in encrypted Supabase buckets. We never share or sell your personal data.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Target size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Apply with Confidence</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Job matching shows you where you're ready to apply — and where you need a bit more preparation.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <TrendingUp size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Track Visible Progress</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Watch your readiness score climb as you complete milestones. Momentum you can actually see.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4">
              <div className="d-flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Sparkles size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <h6 className="fw-bold mb-1">AI-Powered, Not Generic</h6>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Every analysis is unique to your resume and target — not a one-size-fits-all career advice template.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — PRICING
      ============================================================ */}
      <section id="pricing" className="py-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container py-5">

          <div className="text-center mb-5">
            <div className="badge-minimal mb-2">Pricing</div>
            <h2 className="display-6 fw-bold mb-3">Simple, transparent plans</h2>
            <p className="mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
              Start free. Upgrade when you're ready for more depth.
            </p>
          </div>

          <div className="row g-4 justify-content-center">

            {/* Free Tier */}
            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 p-md-5 h-100 d-flex flex-column">
                <div className="mb-4">
                  <div className="small text-uppercase fw-semibold mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Free</div>
                  <h3 className="fw-bold mb-1">
                    {'\u0024'}0<span className="small fw-normal" style={{ color: 'var(--text-muted)' }}> / month</span>
                  </h3>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>Get started and see your first gap analysis.</p>
                </div>
                <ul className="list-unstyled flex-grow-1 mb-4">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">1 resume upload</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">1 target role analysis</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Basic roadmap (first 3 milestones)</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Readiness score</span>
                  </li>
                </ul>
                <Link to="/auth?mode=signup" className="btn-outline-theme w-100 justify-content-center">
                  Get Started Free
                </Link>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 p-md-5 h-100 d-flex flex-column" style={{ border: '2px solid var(--btn-primary-bg)' }}>
                <div className="mb-4">
                  <div className="small text-uppercase fw-semibold mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Pro</div>
                  <h3 className="fw-bold mb-1">
                    {'\u0024'}12<span className="small fw-normal" style={{ color: 'var(--text-muted)' }}> / month</span>
                  </h3>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>Full power for serious career growth.</p>
                </div>
                <ul className="list-unstyled flex-grow-1 mb-4">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Unlimited resume uploads</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Unlimited role analyses</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Full roadmap with all milestones</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Smart job matching</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Multi-role comparison</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Progress dashboard & analytics</span>
                  </li>
                </ul>
                <Link to="/auth?mode=signup" className="btn-primary-theme w-100 justify-content-center">
                  <span>Start Pro</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            {/* Team Tier */}
            <div className="col-md-6 col-lg-4">
              <div className="clean-card p-4 p-md-5 h-100 d-flex flex-column">
                <div className="mb-4">
                  <div className="small text-uppercase fw-semibold mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Team</div>
                  <h3 className="fw-bold mb-1">
                    Custom
                  </h3>
                  <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>For organizations upskilling teams at scale.</p>
                </div>
                <ul className="list-unstyled flex-grow-1 mb-4">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Everything in Pro</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Team admin dashboard</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Aggregate skill gap reports</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <CheckCircle2 size={16} className="flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                    <span className="small">Priority support</span>
                  </li>
                </ul>
                <a href="#connect" className="btn-outline-theme w-100 justify-content-center">
                  Contact Us
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — CONNECT WITH US
      ============================================================ */}
      <section id="connect" className="py-5" style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container py-5">

          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <div className="badge-minimal mb-2">Connect With Us</div>
              <h2 className="display-6 fw-bold mb-3">Let's build your career path together</h2>
              <p className="mb-5 mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
                Got questions, feedback, or partnership ideas? We'd love to hear from you.
              </p>

              <div className="clean-card p-4 p-md-5 mx-auto" style={{ maxWidth: 520 }}>
                <form onSubmit={(e) => { e.preventDefault(); alert('Message sent! We\'ll get back to you soon.'); }}>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control clean-input"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="email"
                      className="form-control clean-input"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <textarea
                      className="form-control clean-input"
                      placeholder="Your message..."
                      rows={4}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn-primary-theme w-100 justify-content-center">
                    <span>Send Message</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>

              {/* Social Links */}
              <div className="d-flex justify-content-center gap-4 mt-5">
                <a href="mailto:hello@gap2growth.com" className="connect-social-link" title="Email">
                  <Mail size={20} />
                </a>
                <a href="#" className="connect-social-link" title="LinkedIn">
                  <ExternalLink size={20} />
                </a>
                <a href="#" className="connect-social-link" title="Community">
                  <MessageCircle size={20} />
                </a>
                <a href="#" className="connect-social-link" title="Website">
                  <Globe size={20} />
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

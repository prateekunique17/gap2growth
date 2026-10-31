import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Briefcase,
  Flame,
  Award,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { getCareerState } from '../../../lib/api';

export default function DashboardOverview({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [careerState, setCareerState] = useState(null);

  useEffect(() => {
    let mounted = true;
    getCareerState()
      .then((state) => {
        if (!mounted) return;
        setCareerState(state);
      })
      .catch((err) => {
        console.warn('[DashboardOverview] Error loading career state:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Extract real dynamic values from careerState
  const profile = careerState?.profile || {};
  const analysis = careerState?.analysis || null;
  const roadmap = careerState?.roadmap || null;
  const progress = careerState?.progress || null;
  const jobs = careerState?.jobs?.jobs || [];

  // Target Role & Company
  const targetRole = profile.dream_job_role || analysis?.role || 'Target Role Pending';
  const targetCompany = profile.dream_company || analysis?.company || 'Target Company';

  // Role Readiness Score (0 - 100%)
  const overallMatch = analysis?.overall_match ?? analysis?.resume_dimension_score ?? 0;
  
  // Roadmap Progress calculation
  const totalTasks = progress?.total_tasks ?? (roadmap?.stops?.flatMap(s => s.tasks || []).length || 0);
  const completedTasks = progress?.completed_tasks ?? (roadmap?.stops?.flatMap(s => s.tasks || []).filter(t => t.done).length || 0);
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Active Milestone & Active Sprint Tasks
  const allStops = roadmap?.stops || [];
  // Find current active stop (first stop that is not completed, or fallback to first stop)
  const activeStop = allStops.find(s => s.status !== 'completed') || allStops[0] || null;
  const activeTasks = (activeStop?.tasks || []).slice(0, 3);

  // Strongest verified skills (from resume or match)
  const strongSkills = (analysis?.resume_snapshot?.skills || [])
    .map(s => typeof s === 'string' ? s : s.name)
    .filter(Boolean)
    .slice(0, 5);

  // Fallback if resume skills empty: check analysis skill matches
  const displayStrongSkills = strongSkills.length > 0 
    ? strongSkills 
    : (analysis?.skill_analysis?.filter(s => (s.candidate_score || 0) >= 60).map(s => s.category) || []).slice(0, 4);

  // Priority Gaps to Close
  const priorityGaps = (analysis?.priority_gaps || [])
    .slice(0, 4);

  // Top matching jobs from live Hirebase feed
  const topJobs = jobs.slice(0, 3);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader2 size={32} className="spin mb-3 mx-auto" style={{ color: 'var(--accent-olive)' }} />
        <p className="small" style={{ color: 'var(--text-muted)' }}>
          Loading your verified candidate profile & live analysis...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Top Welcome Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span className="badge-minimal">Dashboard</span>
          <h2 className="display-6 fw-bold mt-1 mb-1" style={{ color: 'var(--text-primary)' }}>
            Candidate Overview
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Track your target role readiness, active learning sprint, and verified live job matches.
          </p>
        </div>
        <div className="mt-3 mt-sm-0 d-flex gap-2">
          <button 
            type="button" 
            onClick={() => onNavigate('analyzer')} 
            className="btn-outline-theme py-2 px-3 small"
            style={{ fontSize: '0.85rem' }}
          >
            Re-run Analysis
          </button>
          <button 
            type="button" 
            onClick={() => onNavigate('roadmap')} 
            className="btn-primary-theme py-2 px-3 small"
            style={{ fontSize: '0.85rem' }}
          >
            <span>Resume Sprint</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="row g-4 mb-4">
        {/* Card 1: Active Target Role */}
        <div className="col-md-4">
          <div className="clean-card p-4 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                Active Target Role
              </span>
              <Target size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{targetRole}</h4>
              <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>Targeting: {targetCompany}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Role Readiness */}
        <div className="col-md-4">
          <div className="clean-card p-4 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                Role Readiness
              </span>
              <span className="badge-minimal fw-bold" style={{ color: 'var(--text-primary)' }}>
                {analysis ? `${overallMatch} / 100 SCORE` : 'RUN ANALYSIS'}
              </span>
            </div>
            <div>
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <span className="display-6 fw-bold" style={{ color: 'var(--text-primary)' }}>
                  {overallMatch}%
                </span>
                <span className="small fw-semibold" style={{ color: 'var(--text-muted)' }}>
                  {analysis?.overall_verdict || 'Ready for evaluation'}
                </span>
              </div>
              <div className="rounded-pill overflow-hidden" style={{ height: 6, backgroundColor: 'var(--meter-track)' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, overallMatch))}%`, height: '100%', backgroundColor: 'var(--meter-bar)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Roadmap Progress */}
        <div className="col-md-4">
          <div className="clean-card p-4 h-100 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <span className="small text-uppercase fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                Roadmap Progress
              </span>
              <Clock size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {completedTasks} of {totalTasks} Tasks Completed
              </h4>
              <p className="small mb-0" style={{ color: 'var(--text-secondary)' }}>
                {allStops.length} Milestones Structured • {progressPercent}% Overall
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Active Roadmap Sprint + Quick Skill Diagnostics */}
      <div className="row g-4 mb-4">
        {/* Next Sprint Tasks */}
        <div className="col-lg-7">
          <div className="clean-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Current Roadmap Sprint</h5>
                <span className="small" style={{ color: 'var(--text-muted)' }}>
                  {activeStop ? `${activeStop.title} (${activeStop.duration_days || 7} days)` : 'No active roadmap generated yet'}
                </span>
              </div>
              <button 
                onClick={() => onNavigate('roadmap')} 
                className="btn btn-link p-0 small text-decoration-none fw-semibold" 
                style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}
              >
                Full Roadmap &rarr;
              </button>
            </div>

            <div className="d-flex flex-column gap-3">
              {activeTasks.length > 0 ? (
                activeTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-3 rounded-2 d-flex align-items-center justify-content-between" 
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      {task.done ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                      ) : (
                        <div className="rounded-circle flex-shrink-0" style={{ width: 18, height: 18, border: '2px solid var(--text-muted)' }}></div>
                      )}
                      <div>
                        <h6 className="fw-semibold mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {task.title}
                        </h6>
                        <span className="small" style={{ color: 'var(--text-muted)' }}>
                          {task.kind === 'code' ? 'Practical Code Exercise' : 'Theoretical Foundation'}
                        </span>
                      </div>
                    </div>
                    <span 
                      className="badge rounded-pill px-2.5 py-1 small" 
                      style={{ 
                        backgroundColor: task.done ? 'var(--tag-matched-bg)' : 'var(--bg-card)', 
                        color: task.done ? 'var(--tag-matched-text)' : 'var(--text-muted)', 
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.72rem' 
                      }}
                    >
                      {task.done ? 'Completed' : 'Actionable'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center" style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 8 }}>
                  <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                    No milestones found. Run your skill analysis to generate a personalized learning roadmap.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => onNavigate('analyzer')} 
                    className="btn btn-sm btn-dark"
                  >
                    Go to Skill Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skill Diagnostic Snapshot */}
        <div className="col-lg-5">
          <div className="clean-card p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
                <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Competency Snapshot</h5>
                <button 
                  onClick={() => onNavigate('analyzer')} 
                  className="btn btn-link p-0 small text-decoration-none fw-semibold" 
                  style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  Analyze &rarr;
                </button>
              </div>

              <div className="mb-3">
                <span className="small text-uppercase fw-semibold d-block mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Strongest Verified Skills
                </span>
                <div className="d-flex flex-wrap gap-2">
                  {displayStrongSkills.length > 0 ? (
                    displayStrongSkills.map((sk, idx) => (
                      <span key={idx} className="tag-minimal-match">
                        <CheckCircle2 size={12} /> {sk}
                      </span>
                    ))
                  ) : (
                    <span className="small text-muted">Upload a resume to verify skills</span>
                  )}
                </div>
              </div>

              <div>
                <span className="small text-uppercase fw-semibold d-block mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Priority Gaps to Close
                </span>
                <div className="d-flex flex-wrap gap-2">
                  {priorityGaps.length > 0 ? (
                    priorityGaps.map((gap, idx) => (
                      <span key={idx} className="tag-minimal-gap">
                        <AlertCircle size={12} /> {gap}
                      </span>
                    ))
                  ) : (
                    <span className="small text-muted">Run analysis to identify gaps</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2 mt-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <Flame size={16} style={{ color: 'var(--text-primary)' }} />
                <span className="small fw-bold" style={{ color: 'var(--text-primary)' }}>AI Diagnostic Summary</span>
              </div>
              <p className="small mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                {analysis?.assessment_summary || 'Analysis summary will appear here once you generate an assessment.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Recommended Jobs preview from Live Hirebase */}
      <div className="clean-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Live Matching Job Openings</h5>
            <span className="small" style={{ color: 'var(--text-muted)' }}>
              Ranked live from Hirebase based on your verified resume competencies and roadmap progress
            </span>
          </div>
          <button 
            onClick={() => onNavigate('jobs')} 
            className="btn btn-link p-0 small text-decoration-none fw-semibold" 
            style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            View All Openings &rarr;
          </button>
        </div>

        <div className="row g-3">
          {topJobs.length > 0 ? (
            topJobs.map((job) => (
              <div key={job.id} className="col-md-4">
                <div className="p-3 rounded-2 h-100 d-flex flex-column justify-content-between" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge rounded-pill px-2 py-1 small fw-bold" style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: '0.72rem' }}>
                        {job.match_score ?? 0}% MATCH
                      </span>
                      <span className="small text-truncate ms-2" style={{ color: 'var(--text-muted)', maxWidth: '50%' }}>
                        {job.location || 'Remote'}
                      </span>
                    </div>
                    <h6 className="fw-bold mb-1 text-truncate" title={job.title} style={{ color: 'var(--text-primary)' }}>
                      {job.title}
                    </h6>
                    <span className="small d-block mb-2" style={{ color: 'var(--text-muted)' }}>
                      {job.company || 'Direct Employer'} • {job.experience_level || 'Open Level'}
                    </span>
                  </div>
                  <div className="pt-2 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="small" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {job.missing_skills?.length ? `${job.missing_skills.length} gap(s)` : 'Ready to apply'}
                    </span>
                    <a 
                      href={job.application_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="small d-flex align-items-center gap-1 text-decoration-none fw-semibold"
                      style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    >
                      <span>Apply</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 py-3 text-center">
              <p className="small text-muted mb-2">No live job openings cached yet.</p>
              <button 
                type="button" 
                onClick={() => onNavigate('jobs')} 
                className="btn btn-sm btn-outline-secondary"
              >
                Go to Job Recommendations to fetch live postings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

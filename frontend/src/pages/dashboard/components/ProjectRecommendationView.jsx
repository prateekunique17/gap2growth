import React, { useState, useEffect } from 'react';
import { 
  FolderCode, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Search, 
  Filter, 
  Sparkles, 
  ArrowUpRight, 
  Check, 
  Loader2, 
  AlertCircle,
  Layers,
  ChevronRight,
  Code2,
  Terminal
} from 'lucide-react';
import { getCareerState, updateTaskProgress } from '../../../lib/api';
import '../../../styles/roadmapTree.css';

/**
 * Classifies tasks into Project vs Exercise/Task.
 * Bounded by: at least 1 and at most 3 projects per milestone component.
 */
function extractAllProjects(stops = []) {
  const projectsList = [];

  stops.forEach((stop, stopIdx) => {
    const rawTasks = stop.tasks || [];
    if (!rawTasks.length) return;

    // Natural classification heuristic
    const classified = rawTasks.map((t, idx) => {
      const title = (t.title || '').toLowerCase();
      const kind = (t.kind || '').toLowerCase();
      const hasProjectKeywords = 
        title.includes('build') ||
        title.includes('create') ||
        title.includes('implement') ||
        title.includes('develop') ||
        title.includes('deploy') ||
        title.includes('design') ||
        title.includes('pipeline') ||
        title.includes('app') ||
        title.includes('platform') ||
        title.includes('system') ||
        title.includes('structure');
      
      const isCode = kind === 'code' || Boolean(t.code_prompt) || Boolean(t.starter_code);
      const isProjectCandidate = (isCode && hasProjectKeywords) || (kind === 'project');

      return {
        ...t,
        isProjectCandidate,
        originalIndex: idx,
      };
    });

    let candidateIndices = classified
      .map((t, i) => (t.isProjectCandidate ? i : -1))
      .filter((i) => i !== -1);

    if (candidateIndices.length === 0) {
      const bestFallbackIdx = classified.findIndex((t) => t.kind === 'code') !== -1
        ? classified.findIndex((t) => t.kind === 'code')
        : 0;
      candidateIndices = [bestFallbackIdx];
    }

    if (candidateIndices.length > 3) {
      candidateIndices = candidateIndices.slice(0, 3);
    }

    const projectSet = new Set(candidateIndices);

    classified.forEach((task, tIdx) => {
      if (projectSet.has(tIdx)) {
        projectsList.push({
          ...task,
          milestoneId: stop.id || `stop-${stopIdx}`,
          milestoneIndex: stopIdx + 1,
          milestoneTitle: stop.title,
          milestonePriority: stop.priority || 'medium',
          milestoneSkills: stop.skills || [],
          duration_days: stop.duration_days,
          resources: stop.resources || [],
          stopCompletionCriteria: stop.completion_criteria,
        });
      }
    });
  });

  return projectsList;
}

export default function ProjectRecommendationView() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'completed' | 'in_progress'
  const [roadmapData, setRoadmapData] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [activeCodeTask, setActiveCodeTask] = useState(null);

  // Fetch career state on mount
  const fetchState = async () => {
    setLoading(true);
    try {
      const state = await getCareerState();
      if (state?.roadmap) {
        setRoadmapData(state.roadmap);
      }
    } catch (err) {
      console.warn('Could not load career state for projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Sync task completion via PATCH /api/career/progress/task/:taskId
  const handleToggleProject = async (taskId, currentDone) => {
    setUpdatingTaskId(taskId);
    const newDone = !currentDone;

    try {
      const res = await updateTaskProgress(taskId, newDone);
      if (res?.roadmap) {
        setRoadmapData(res?.roadmap);
      } else {
        setRoadmapData((prev) => {
          if (!prev?.stops) return prev;
          return {
            ...prev,
            stops: prev.stops.map((stop) => ({
              ...stop,
              tasks: stop.tasks?.map((t) => t.id === taskId ? { ...t, done: newDone } : t),
            })),
          };
        });
      }
    } catch (err) {
      console.error('Failed to update project progress:', err);
      setRoadmapData((prev) => {
        if (!prev?.stops) return prev;
        return {
          ...prev,
          stops: prev.stops.map((stop) => ({
            ...stop,
            tasks: stop.tasks?.map((t) => t.id === taskId ? { ...t, done: newDone } : t),
          })),
        };
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const rawStops = roadmapData?.stops || [];
  const allProjects = extractAllProjects(rawStops);

  // Calculations
  const completedProjects = allProjects.filter((p) => p.done).length;
  const totalProjects = allProjects.length;
  const progressPct = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // Filter
  const filteredProjects = allProjects.filter((proj) => {
    const matchesSearch = 
      (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.milestoneTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.milestoneSkills || []).some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterStatus === 'completed') return matchesSearch && proj.done;
    if (filterStatus === 'in_progress') return matchesSearch && !proj.done;
    return matchesSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span className="badge-minimal">Project Hub</span>
          <h2 className="display-6 fw-bold mt-1 mb-1" style={{ color: 'var(--text-primary)' }}>
            Project Recommendations
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Direct access to all verified build & portfolio projects extracted directly from your active roadmap milestones.
          </p>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="clean-card p-3 mb-4">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-1.5">
          <div className="d-flex align-items-center gap-2">
            <FolderCode size={16} style={{ color: 'var(--accent-olive)' }} />
            <span className="small fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Project Mastery ({completedProjects}/{totalProjects} Projects Completed)
            </span>
          </div>
          <span className="small fw-bold" style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
            {progressPct}%
          </span>
        </div>
        <div className="rounded-pill overflow-hidden" style={{ height: 8, backgroundColor: 'var(--meter-track)' }}>
          <div 
            style={{ 
              width: `${progressPct}%`, 
              height: '100%', 
              backgroundColor: 'var(--meter-bar)', 
              transition: 'width 0.4s ease' 
            }}
          />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="clean-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-7 d-flex align-items-center gap-2">
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control border-0 clean-input p-1"
              placeholder="Search projects by title, milestone, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-5 d-flex justify-content-md-end align-items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`btn btn-sm px-3 rounded-pill ${
                filterStatus === 'all' ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{
                fontSize: '0.76rem',
                backgroundColor: filterStatus === 'all' ? 'var(--btn-primary-bg)' : 'transparent',
                color: filterStatus === 'all' ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              All ({totalProjects})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in_progress')}
              className={`btn btn-sm px-3 rounded-pill ${
                filterStatus === 'in_progress' ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{
                fontSize: '0.76rem',
                backgroundColor: filterStatus === 'in_progress' ? 'var(--btn-primary-bg)' : 'transparent',
                color: filterStatus === 'in_progress' ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Pending ({totalProjects - completedProjects})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`btn btn-sm px-3 rounded-pill ${
                filterStatus === 'completed' ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{
                fontSize: '0.76rem',
                backgroundColor: filterStatus === 'completed' ? 'var(--btn-primary-bg)' : 'transparent',
                color: filterStatus === 'completed' ? 'var(--btn-primary-text)' : 'var(--text-muted)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Completed ({completedProjects})
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <Loader2 size={28} className="spinner-border spinner-border-sm mb-3" style={{ color: 'var(--accent-olive)' }} />
          <p className="small" style={{ color: 'var(--text-muted)' }}>
            Loading live project deliverables from active roadmap...
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="row g-4 mb-4">
          {filteredProjects.map((proj, pIdx) => {
            const isUpdating = updatingTaskId === proj.id;
            return (
              <div key={proj.id || pIdx} className="col-12 col-lg-6">
                <div 
                  className="clean-card p-4 h-100 d-flex flex-column justify-content-between position-relative"
                  style={{
                    borderLeft: proj.done ? '4px solid #10b981' : '4px solid var(--accent-olive)',
                    opacity: proj.done ? 0.85 : 1,
                  }}
                >
                  <div>
                    {/* Top Meta */}
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                        <span className="badge-project">
                          <FolderCode size={11} />
                          <span>Project</span>
                        </span>
                        <span className="small text-uppercase fw-bold" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          Milestone 0{proj.milestoneIndex}
                        </span>
                      </div>

                      <span 
                        className="badge rounded-pill px-2.5 py-0.5 small fw-semibold"
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: proj.done ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                          color: proj.done ? '#10b981' : 'var(--text-muted)',
                          border: `1px solid ${proj.done ? '#10b981' : 'var(--border-subtle)'}`
                        }}
                      >
                        {proj.done ? 'Completed' : 'Ready to Build'}
                      </span>
                    </div>

                    {/* Title */}
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {proj.title}
                    </h5>

                    {/* From Milestone */}
                    <p className="small mb-3" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Part of: <span className="fw-semibold" style={{ color: 'var(--text-secondary)' }}>{proj.milestoneTitle}</span>
                    </p>

                    {/* Prompt / Code Prompt details if present */}
                    {proj.code_prompt && (
                      <div className="p-2.5 rounded mb-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div className="d-flex align-items-center gap-1.5 mb-1">
                          <Terminal size={12} style={{ color: 'var(--accent-olive)' }} />
                          <span className="small fw-semibold text-uppercase" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Implementation Brief
                          </span>
                        </div>
                        <p className="small mb-0" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: '1.45' }}>
                          {proj.code_prompt}
                        </p>
                      </div>
                    )}

                    {/* Skills pills */}
                    {proj.milestoneSkills.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {proj.milestoneSkills.map((skill) => (
                          <span key={skill} className="tag-minimal-match" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom / Action Row */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top mt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleProject(proj.id, proj.done)}
                      disabled={isUpdating}
                      className="btn btn-sm d-inline-flex align-items-center gap-2"
                      style={{
                        fontSize: '0.78rem',
                        backgroundColor: proj.done ? 'transparent' : 'var(--btn-primary-bg)',
                        color: proj.done ? '#10b981' : 'var(--btn-primary-text)',
                        border: proj.done ? '1px solid #10b981' : '1px solid var(--btn-primary-bg)',
                        borderRadius: '6px',
                        padding: '0.4rem 0.8rem',
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 size={13} className="spinner-border spinner-border-sm" />
                      ) : proj.done ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>{proj.done ? 'Marked Complete' : 'Mark as Completed'}</span>
                    </button>

                    {/* Starter Code modal/prompt view or Resources */}
                    <div className="d-flex align-items-center gap-2">
                      {proj.resources?.[0] && (
                        <a
                          href={proj.resources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost-theme d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        >
                          <span>Guide</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProjects.length === 0 && (
        <div className="clean-card p-5 text-center">
          <FolderCode size={36} className="mb-3" style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
          <h4 className="fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>No projects found</h4>
          <p className="small mb-0" style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
            No projects match the current search or filter query. Try selecting &apos;All&apos; or adjusting your search keyword.
          </p>
        </div>
      )}
    </div>
  );
}


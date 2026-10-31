import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, ExternalLink, Sparkles, Plus, BookOpen, Loader2, 
  AlertCircle, ChevronRight, ChevronDown, GitBranch, FolderGit2, Check, 
  CircleDot, HelpCircle, Layers, ArrowDown, FolderCode, FileText
} from 'lucide-react';
import { generateRoadmap, updateTaskProgress, getCareerState } from '../../../lib/api';
import '../../../styles/roadmapTree.css';

/**
 * Classifies sub-components/tasks into Project vs Exercise/Task.
 * Enforces rule: each milestone component must have at least 1 and at most 3 projects.
 */
function classifyTasksForStop(tasks = []) {
  if (!tasks.length) return [];

  // Pass 1: Natural classification heuristic
  const classified = tasks.map((t, idx) => {
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

  // Count candidates
  let candidateIndices = classified
    .map((t, i) => (t.isProjectCandidate ? i : -1))
    .filter((i) => i !== -1);

  // Guarantee AT LEAST 1 project: if none qualified, elevate the most actionable/code task, or the first task
  if (candidateIndices.length === 0) {
    const bestFallbackIdx = classified.findIndex((t) => t.kind === 'code') !== -1
      ? classified.findIndex((t) => t.kind === 'code')
      : 0;
    candidateIndices = [bestFallbackIdx];
  }

  // Guarantee AT MOST 3 projects: keep the first 3 best candidates
  if (candidateIndices.length > 3) {
    candidateIndices = candidateIndices.slice(0, 3);
  }

  const projectSet = new Set(candidateIndices);

  return classified.map((t, idx) => ({
    ...t,
    isProject: projectSet.has(idx),
  }));
}

export default function RoadmapGenerationView() {
  const [loading, setLoading] = useState(false);
  const [fetchingInitial, setFetchingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [roadmapData, setRoadmapData] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  // Store expanded milestone stop IDs.
  const [expandedStops, setExpandedStops] = useState({});

  // Fallback default roadmap items for preview before first backend run
  const defaultStops = [
    {
      id: 'stop-1',
      title: 'Vector Embeddings & pgvector on Supabase',
      description: 'Implement cosine similarity searches for semantic text retrieval and document indexing.',
      duration_days: 7,
      priority: 'high',
      status: 'completed',
      skills: ['AI / Search', 'PostgreSQL'],
      resources: [{ title: 'Supabase Vector Guide', url: 'https://supabase.com/docs/guides/ai' }],
      tasks: [
        { id: 'task-1-1', title: 'Enable pgvector extension on database', done: true },
        { id: 'task-1-2', title: 'Write embedding generation script with Gemini/OpenAI', done: true }
      ]
    },
    {
      id: 'stop-2',
      title: 'Distributed Caching Architecture with Redis',
      description: 'Deploy Redis cluster with LRU eviction policies, cache invalidation, and session management.',
      duration_days: 10,
      priority: 'high',
      status: 'in_progress',
      skills: ['Infrastructure', 'Redis'],
      resources: [{ title: 'Redis Node.js Quickstart', url: 'https://redis.io/docs/latest/develop/use/frameworks/nodejs/' }],
      tasks: [
        { id: 'task-2-1', title: 'Setup Redis connection and key expiration policies', done: true },
        { id: 'task-2-2', title: 'Implement cache-aside pattern for heavy API endpoints', done: false }
      ]
    },
    {
      id: 'stop-3',
      title: 'Level 4 System Design: Rate Limiting & High Availability',
      description: 'Build scalable rate limiters using token bucket algorithms and analyze distributed consensus mechanisms.',
      duration_days: 14,
      priority: 'medium',
      status: 'pending',
      skills: ['System Design', 'Architecture'],
      resources: [{ title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' }],
      tasks: [
        { id: 'task-3-1', title: 'Implement sliding window counter rate limiter', done: false },
        { id: 'task-3-2', title: 'Design high-availability fallback strategies', done: false }
      ]
    },
    {
      id: 'stop-4',
      title: 'Microservices Communication with gRPC & RabbitMQ',
      description: 'Event-driven service orchestration with asynchronous message brokers and structured protocol buffers.',
      duration_days: 10,
      priority: 'medium',
      status: 'pending',
      skills: ['Backend', 'gRPC'],
      resources: [{ title: 'gRPC Node Guide', url: 'https://grpc.io/docs/languages/node/basics/' }],
      tasks: [
        { id: 'task-4-1', title: 'Define protobuf schemas for service contracts', done: false },
        { id: 'task-4-2', title: 'Setup RabbitMQ publisher & subscriber queue', done: false }
      ]
    }
  ];

  // Fetch initial roadmap state from backend immediately on mount
  useEffect(() => {
    let mounted = true;
    console.log('[Roadmap] Fetching current career state from backend...');
    getCareerState()
      .then((state) => {
        if (!mounted) return;
        console.log('[Roadmap] Backend response received:', {
          hasRoadmap: Boolean(state?.roadmap),
          title: state?.roadmap?.title,
          stopsCount: state?.roadmap?.stops?.length,
        });

        if (state?.roadmap?.stops?.length) {
          setRoadmapData(state.roadmap);
          // Auto-expand in-progress stop or the first stop
          const inProgress = state.roadmap.stops.find((s) => s.status === 'in_progress') || state.roadmap.stops[0];
          if (inProgress?.id) {
            setExpandedStops({ [inProgress.id]: true });
          }
        } else {
          console.warn('[Roadmap] No saved roadmap on server. Showing preview roadmap.');
          setRoadmapData(null);
          setExpandedStops({ 'stop-1': true });
        }
      })
      .catch((err) => {
        console.error('[Roadmap] Failed to load career state from server:', err);
        if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota'))) {
          console.error('[Roadmap Quota Alert] Upstream AI quota or rate limit encountered:', err.message);
        }
        setErrorMsg('Failed to sync roadmap with server. ' + (err.message || ''));
      })
      .finally(() => {
        if (mounted) setFetchingInitial(false);
      });

    return () => { mounted = false; };
  }, []);

  // Generate / Regenerate Roadmap with POST /api/career/generate-roadmap
  const handleGenerateRoadmap = async () => {
    setLoading(true);
    setErrorMsg('');
    console.log('[Roadmap] Initiating AI roadmap generation with Gemini...');

    try {
      const data = await generateRoadmap();
      console.log('[Roadmap] Gemini generation succeeded:', {
        title: data.title,
        stopsCount: data.stops?.length
      });
      setRoadmapData(data);
      if (data.stops?.length) {
        setExpandedStops({ [data.stops[0].id]: true });
      }
    } catch (err) {
      console.error('[Roadmap Generation Error]', err);
      if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('resource_exhausted'))) {
        console.error('[Roadmap Quota Alert] Gemini API quota or rate limit exceeded:', err.message);
      }
      setErrorMsg(err.message || 'Run skill analysis first before generating roadmap.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle tree expansion for a milestone node
  const toggleNodeExpand = (stopId) => {
    setExpandedStops((prev) => ({
      ...prev,
      [stopId]: !prev[stopId]
    }));
  };

  const expandAll = () => {
    const all = {};
    activeStops.forEach((s, idx) => {
      all[s.id || `stop-${idx}`] = true;
    });
    setExpandedStops(all);
  };

  const collapseAll = () => {
    setExpandedStops({});
  };

  // Toggle task done via PATCH /api/career/progress/task/:taskId
  const handleToggleTask = async (taskId, currentDone) => {
    setUpdatingTaskId(taskId);
    const newDone = !currentDone;

    try {
      const res = await updateTaskProgress(taskId, newDone);
      if (res?.roadmap) {
        setRoadmapData(res.roadmap);
      } else {
        // Optimistic update
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
      console.error('Task progress update error:', err);
      // Fallback for mock/offline preview
      setRoadmapData((prev) => {
        const stops = prev?.stops || defaultStops;
        return {
          ...prev,
          stops: stops.map((stop) => ({
            ...stop,
            tasks: stop.tasks?.map((t) => t.id === taskId ? { ...t, done: newDone } : t),
          })),
        };
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Compute active stops & stats
  const activeStops = roadmapData?.stops?.length ? roadmapData.stops : defaultStops;
  const allTasks = activeStops.flatMap((s) => s.tasks || []);
  const completedTasks = allTasks.filter((t) => t.done).length;
  const totalTasks = allTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedHours = completedTasks * 4;
  const totalEstimatedHours = totalTasks * 4;

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span className="badge-minimal">Interactive Learning Tree</span>
          <h2 className="display-6 fw-bold mt-1 mb-1" style={{ color: 'var(--text-primary)' }}>
            Personalized Roadmap Generation
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Sequential tree graph mapping foundational stops to target competencies. Click any node to branch open its learning tasks and resources.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-3 mt-sm-0">
          <button
            type="button"
            onClick={expandAll}
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            style={{ fontSize: '0.78rem', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            style={{ fontSize: '0.78rem', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={handleGenerateRoadmap}
            disabled={loading}
            className="btn-primary-theme py-2 px-3 small d-flex align-items-center gap-2"
            style={{ fontSize: '0.85rem' }}
          >
            {loading ? <Loader2 size={15} className="spinner-border spinner-border-sm" /> : <Sparkles size={15} />}
            <span>{loading ? 'Generating with Gemini...' : 'Regenerate Live Roadmap'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-4" role="alert">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {fetchingInitial && !roadmapData && (
        <div className="clean-card p-4 text-center mb-4">
          <Loader2 size={24} className="spinner-border spinner-border-sm mb-2" style={{ color: 'var(--accent-olive)' }} />
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Loading AI-calibrated career roadmap from server...
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="clean-card p-3 mb-4">
        <div className="d-flex align-items-center justify-content-between gap-3 mb-1.5">
          <span className="small fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Roadmap Progress ({completedTasks}/{totalTasks} tasks)
          </span>
          <span className="small fw-bold" style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
            {progressPercent}%
          </span>
        </div>
        <div className="rounded-pill overflow-hidden" style={{ height: 8, backgroundColor: 'var(--meter-track)' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              backgroundColor: 'var(--meter-bar)', 
              transition: 'width 0.4s ease' 
            }}
          />
        </div>
      </div>

      {/* INTERACTIVE TREE GRAPH VIEW */}
      <div className="roadmap-tree-container">
        {/* Tree Root Header */}
        <div className="d-flex align-items-center gap-2 mb-4 ms-2">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
            style={{ 
              width: 32, 
              height: 32, 
              backgroundColor: 'var(--accent-olive)', 
              color: '#ffffff' 
            }}
          >
            <GitBranch size={16} />
          </div>
          <span className="fw-bold small" style={{ color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
            START CAREER TRAJECTORY
          </span>
          <span className="badge rounded-pill px-2 py-0.5 text-uppercase" style={{ fontSize: '0.65rem', backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
            Sequential Pathway
          </span>
        </div>

        {/* Tree Vertical Track & Nodes */}
        <div className="position-relative ps-4 ps-md-5">
          {/* Main Continuous Trunk/Spine */}
          <div 
            className="position-absolute"
            style={{
              left: 20,
              top: 0,
              bottom: 40,
              width: 3,
              backgroundColor: 'var(--border-subtle)',
              borderRadius: 2,
              zIndex: 0
            }}
          />

          <div className="d-flex flex-column gap-5">
            {activeStops.map((stop, stopIdx) => {
              const stopId = stop.id || `stop-${stopIdx}`;
              const isExpanded = Boolean(expandedStops[stopId]);
              const rawTasks = stop.tasks || [];
              const stopTasks = classifyTasksForStop(rawTasks);
              const stopCompletedCount = stopTasks.filter((t) => t.done).length;
              const isStopComplete = stopTasks.length > 0 && stopCompletedCount === stopTasks.length;
              const isNextStop = !isStopComplete && (stopIdx === 0 || activeStops[stopIdx - 1]?.tasks?.every((t) => t.done));

              const projectCount = stopTasks.filter((t) => t.isProject).length;

              return (
                <div key={stopId} className="position-relative">
                  {/* Connector Circle on Trunk */}
                  <div
                    onClick={() => toggleNodeExpand(stopId)}
                    className="position-absolute rounded-circle d-flex align-items-center justify-content-center cursor-pointer"
                    style={{
                      left: -29,
                      top: 24,
                      width: 22,
                      height: 22,
                      backgroundColor: isStopComplete ? '#10b981' : isNextStop ? 'var(--accent-olive)' : 'var(--bg-card)',
                      border: `2.5px solid ${isStopComplete ? '#10b981' : isNextStop ? 'var(--accent-olive)' : 'var(--border-subtle)'}`,
                      color: isStopComplete || isNextStop ? '#ffffff' : 'var(--text-muted)',
                      zIndex: 2,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    title={isStopComplete ? 'Completed Milestone' : 'Click to toggle sub-tree'}
                  >
                    {isStopComplete ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{stopIdx + 1}</span>
                    )}
                  </div>

                  {/* Horizontal Branch Line connecting Trunk to Main Node */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -16,
                      top: 34,
                      width: 16,
                      height: 2,
                      backgroundColor: isStopComplete ? '#10b981' : isNextStop ? 'var(--accent-olive)' : 'var(--border-subtle)',
                      zIndex: 1
                    }}
                  />

                  {/* Node Card */}
                  <div 
                    className={`roadmap-tree-node ${isExpanded ? 'expanded' : ''} p-3 p-md-4`}
                    onClick={() => toggleNodeExpand(stopId)}
                    style={{
                      borderLeft: isStopComplete 
                        ? '4px solid #10b981' 
                        : isNextStop 
                        ? '4px solid var(--accent-olive)' 
                        : '4px solid var(--border-subtle)',
                    }}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                      <div className="d-flex align-items-start gap-2.5">
                        <div 
                          className="mt-1 d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 24,
                            height: 24,
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            flexShrink: 0,
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>

                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span className="small text-uppercase fw-bold" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                              Milestone 0{stopIdx + 1}
                            </span>
                            {(stop.skills || []).map((skill) => (
                              <span key={skill} className="badge rounded-pill px-2 py-0 small" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', fontSize: '0.7rem' }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                          
                          <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {stop.title}
                          </h5>

                          <p className="small mb-0" style={{ color: 'var(--text-secondary)', maxWidth: 640 }}>
                            {stop.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-end ms-auto d-flex flex-column align-items-end gap-1">
                        <span 
                          className="badge rounded-pill px-3 py-1 small fw-semibold"
                          style={{
                            fontSize: '0.76rem',
                            backgroundColor: isStopComplete 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : isNextStop 
                              ? 'var(--btn-primary-bg)' 
                              : 'var(--bg-surface)',
                            color: isStopComplete 
                              ? '#10b981' 
                              : isNextStop 
                              ? 'var(--btn-primary-text)' 
                              : 'var(--text-muted)',
                            border: `1px solid ${isStopComplete ? '#10b981' : isNextStop ? 'transparent' : 'var(--border-subtle)'}`
                          }}
                        >
                          {isStopComplete ? 'Completed' : isNextStop ? 'In Progress' : 'Pending'}
                        </span>
                        
                        <div className="small d-flex align-items-center gap-2 mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <span>{projectCount} {projectCount === 1 ? 'Project' : 'Projects'}</span>
                          <span>•</span>
                          <span>{stopCompletedCount}/{stopTasks.length} Sub-tasks</span>
                          {stop.duration_days && (
                            <>
                              <span>•</span>
                              <span className="d-inline-flex align-items-center gap-1">
                                <Clock size={11} /> ~{stop.duration_days}d
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPREADING TREE BRANCH SUBCHILDREN */}
                  {isExpanded && (
                    <div className="tree-subchildren-container position-relative mt-3 ms-3 ms-md-4 ps-4">
                      {/* Sub-tree connecting vertical spine */}
                      <div 
                        className="position-absolute"
                        style={{
                          left: 4,
                          top: 0,
                          bottom: 20,
                          width: 2,
                          backgroundColor: 'var(--accent-olive)',
                          opacity: 0.5,
                          borderRadius: 1
                        }}
                      />

                      <div className="d-flex flex-column gap-3">
                        {/* Subchildren: Tasks */}
                        {stopTasks.map((task, tIdx) => {
                          const isUpdating = updatingTaskId === task.id;
                          return (
                            <div key={task.id || tIdx} className="position-relative">
                              {/* Curved Branch Line to Task Leaf */}
                              <svg 
                                className="position-absolute" 
                                style={{ left: -26, top: 14, width: 30, height: 20, pointerEvents: 'none' }}
                              >
                                <path 
                                  d="M 2 2 Q 2 12, 28 12" 
                                  fill="none" 
                                  stroke="var(--accent-olive)" 
                                  strokeWidth="1.5" 
                                  opacity="0.6"
                                />
                              </svg>

                              {/* Task Leaf Card */}
                              <div 
                                className={`tree-task-leaf p-3 d-flex align-items-center justify-content-between gap-3 ${task.isProject ? 'is-project' : ''}`}
                                style={{
                                  backgroundColor: task.done ? 'var(--bg-surface)' : 'var(--bg-card)',
                                  borderColor: 'var(--border-subtle)',
                                  opacity: task.done ? 0.8 : 1,
                                }}
                              >
                                <div className="d-flex align-items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTask(task.id, task.done);
                                    }}
                                    disabled={isUpdating}
                                    className="btn btn-link p-0 text-decoration-none d-flex align-items-center justify-content-center"
                                    style={{
                                      width: 22,
                                      height: 22,
                                      color: task.done ? '#10b981' : 'var(--text-muted)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isUpdating ? (
                                      <Loader2 size={16} className="spinner-border spinner-border-sm" />
                                    ) : task.done ? (
                                      <CheckCircle2 size={20} />
                                    ) : (
                                      <div 
                                        className="rounded-circle border"
                                        style={{ 
                                          width: 18, 
                                          height: 18, 
                                          borderColor: 'var(--text-muted)' 
                                        }} 
                                      />
                                    )}
                                  </button>

                                  <div className="d-flex flex-column">
                                    <span 
                                      className={`small fw-medium ${task.done ? 'text-decoration-line-through' : ''}`}
                                      style={{ color: task.done ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.88rem' }}
                                    >
                                      {task.title}
                                    </span>
                                    {task.language && (
                                      <span className="small text-uppercase" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                        {task.language}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  {task.isProject ? (
                                    <span className="badge-project">
                                      <FolderCode size={12} />
                                      <span>Project</span>
                                    </span>
                                  ) : (
                                    <span className="badge-task">
                                      <FileText size={11} />
                                      <span>Task</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Subchildren: Resources Leaf Node */}
                        {(stop.resources || []).length > 0 && (
                          <div className="position-relative mt-1">
                            {/* Curved Branch Line to Resources Leaf */}
                            <svg 
                              className="position-absolute" 
                              style={{ left: -26, top: 14, width: 30, height: 20, pointerEvents: 'none' }}
                            >
                              <path 
                                d="M 2 2 Q 2 12, 28 12" 
                                fill="none" 
                                stroke="var(--accent-olive)" 
                                strokeWidth="1.5" 
                                opacity="0.6"
                              />
                            </svg>

                            <div 
                              className="tree-task-leaf p-2.5 px-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
                              style={{ 
                                backgroundColor: 'var(--bg-surface)',
                                borderStyle: 'dashed'
                              }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <BookOpen size={14} style={{ color: 'var(--accent-olive)' }} />
                                <span className="small fw-semibold" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                  Target Curriculum & Study Documentation:
                                </span>
                              </div>

                              <div className="d-flex flex-wrap gap-2">
                                {stop.resources.map((res, rIdx) => (
                                  <a
                                    key={rIdx}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="d-inline-flex align-items-center gap-1.5 small text-decoration-none px-2 py-1 rounded border"
                                    style={{ 
                                      backgroundColor: 'var(--bg-card)', 
                                      borderColor: 'var(--border-subtle)',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.75rem' 
                                    }}
                                  >
                                    <span>{res.title}</span>
                                    <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tree End / Mastery Destination */}
        <div className="d-flex align-items-center gap-2 mt-5 ms-2">
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
            style={{ 
              width: 32, 
              height: 32, 
              backgroundColor: isAllRoadmapDone(activeStops) ? '#10b981' : 'var(--bg-surface)', 
              color: isAllRoadmapDone(activeStops) ? '#ffffff' : 'var(--text-muted)',
              border: '2px solid var(--border-subtle)'
            }}
          >
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="fw-bold small d-block" style={{ color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
              TARGET ROLE MASTERY ACHIEVED
            </span>
            <span className="small" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              All sequential milestones verified and unlocked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function isAllRoadmapDone(stops) {
  if (!stops || stops.length === 0) return false;
  return stops.every((s) => (s.tasks || []).every((t) => t.done));
}

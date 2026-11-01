import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, ExternalLink, Sparkles, Plus, BookOpen, Loader2, 
  AlertCircle, ChevronRight, ChevronDown, GitBranch, FolderGit2, Check, 
  CircleDot, HelpCircle, Layers, ArrowDown, FolderCode, FileText, Video,
  ShieldCheck, Award, PlayCircle
} from 'lucide-react';
import { generateRoadmap, updateTaskProgress, getCareerState, generateMilestoneExam } from '../../../lib/api';
import '../../../styles/roadmapTree.css';

// Helper to extract YouTube video ID or construct high-quality thumbnail URL
function getYouTubeThumbnail(url, title = '') {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let videoId = null;
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1).split('?')[0];
    } else if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v');
    }
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
  } catch {}
  return null;
}

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
  const [examModalState, setExamModalState] = useState(null); // { stop, loading, examData, pollInterval }
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

  // Handle launching SEB exam for a milestone
  const handleStartExam = async (stop) => {
    setExamModalState({ stop, loading: true, examData: null });
    try {
      const data = await generateMilestoneExam(stop.id, 10, 'medium');
      setExamModalState({ stop, loading: false, examData: data });
    } catch (err) {
      console.error('[Milestone Exam Error]', err);
      alert(err.message || 'Failed to generate milestone exam. Ensure backend is running.');
      setExamModalState(null);
    }
  };

  const handleLaunchSeb = (examToken, currentStop) => {
    // SEB must connect directly to the backend API host (port 5000), not the Vite dev server (port 5173)
    const backendHost = '127.0.0.1:5000';
    const targetStopId = currentStop?.id || examModalState?.stop?.id;
    window.location.href = `seb://${backendHost}/api/career/exam/seb-config/${encodeURIComponent(examToken)}.seb`;

    // Start polling for completed exam results
    const pollId = setInterval(async () => {
      try {
        const state = await getCareerState();
        if (state?.roadmap) {
          const updatedStop = (state.roadmap.stops || []).find(s => s.id === targetStopId);
          if (updatedStop?.exam_result) {
            clearInterval(pollId);
            setRoadmapData(state.roadmap);
            setExamModalState((prev) => prev ? { ...prev, finishedResult: updatedStop.exam_result } : null);
          }
        }
      } catch {}
    }, 2500);

    setExamModalState(prev => ({ ...prev, launched: true, pollInterval: pollId }));
  };

  // Close exam modal and clear polling
  const closeExamModal = () => {
    if (examModalState?.pollInterval) {
      clearInterval(examModalState.pollInterval);
    }
    setExamModalState(null);
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
                        {(() => {
                          const allResources = [...(stop.resources || [])];
                          // If no explicit video resource in legacy state, provide direct YouTube video search
                          const hasVideo = allResources.some(
                            (r) => r.type === 'video' || (r.url && (r.url.includes('youtube.com') || r.url.includes('youtu.be')))
                          );
                          if (!hasVideo && stop.title) {
                            allResources.push({
                              title: `${stop.title} Video Tutorial`,
                              url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${stop.title} video tutorial`)}`,
                              type: 'video',
                            });
                          }

                          if (!allResources.length) return null;

                          const videoResources = allResources.filter(
                            (r) => r.type === 'video' || (r.url && (r.url.includes('youtube.com') || r.url.includes('youtu.be')))
                          );
                          const docResources = allResources.filter(
                            (r) => !(r.type === 'video' || (r.url && (r.url.includes('youtube.com') || r.url.includes('youtu.be'))))
                          );

                          return (
                            <div className="position-relative mt-2">
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
                                className="tree-task-leaf p-3 d-flex flex-column gap-3"
                                style={{ 
                                  backgroundColor: 'var(--bg-surface)',
                                  borderStyle: 'dashed'
                                }}
                              >
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <BookOpen size={14} style={{ color: 'var(--accent-olive)' }} />
                                    <span className="small fw-semibold" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                      Target Curriculum & Study Documentation:
                                    </span>
                                  </div>

                                  {/* Documentation Links */}
                                  {docResources.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2">
                                      {docResources.map((res, rIdx) => (
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
                                          title={res.title}
                                        >
                                          <BookOpen size={12} style={{ color: 'var(--text-muted)' }} />
                                          <span className="fw-medium">{res.title}</span>
                                          <ExternalLink size={11} style={{ opacity: 0.6 }} />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* YouTube Video Cards with Subnode-Sized Thumbnails */}
                                {videoResources.length > 0 && (
                                  <div className="d-flex flex-column gap-2 pt-1">
                                    <div className="d-flex align-items-center gap-1.5">
                                      <Video size={13} style={{ color: '#ef4444' }} />
                                      <span className="small fw-bold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                                        Recommended YouTube Video Guides
                                      </span>
                                    </div>

                                    <div className="row g-2">
                                      {videoResources.map((vRes, vIdx) => {
                                        const directThumb = getYouTubeThumbnail(vRes.url, vRes.title);
                                        return (
                                          <div key={vIdx} className="col-12 col-md-6">
                                            <a
                                              href={vRes.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 rounded-2 border text-decoration-none d-flex align-items-center gap-3 h-100 transition-all"
                                              style={{
                                                backgroundColor: 'var(--bg-card)',
                                                borderColor: 'var(--border-subtle)',
                                              }}
                                            >
                                              {/* Video Thumbnail Box */}
                                              <div 
                                                className="position-relative rounded overflow-hidden flex-shrink-0 d-flex align-items-center justify-content-center"
                                                style={{
                                                  width: 104,
                                                  height: 60,
                                                  backgroundColor: '#0f172a',
                                                  backgroundImage: directThumb ? `url(${directThumb})` : 'none',
                                                  backgroundSize: 'cover',
                                                  backgroundPosition: 'center',
                                                  border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                              >
                                                {!directThumb && (
                                                  <div className="text-center p-1">
                                                    <span className="d-block fw-bold text-white text-truncate" style={{ fontSize: '0.65rem' }}>
                                                      {stop.title?.split(' ')[0] || 'YouTube'}
                                                    </span>
                                                    <span className="small text-danger fw-bold" style={{ fontSize: '0.6rem' }}>
                                                      VIDEO
                                                    </span>
                                                  </div>
                                                )}
                                                {/* Play Button Overlay */}
                                                <div 
                                                  className="position-absolute rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                                  style={{
                                                    width: 24,
                                                    height: 24,
                                                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                                    color: '#ffffff'
                                                  }}
                                                >
                                                  <div 
                                                    style={{ 
                                                      width: 0, 
                                                      height: 0, 
                                                      borderTop: '4px solid transparent',
                                                      borderBottom: '4px solid transparent',
                                                      borderLeft: '7px solid white',
                                                      marginLeft: 2
                                                    }} 
                                                  />
                                                </div>
                                              </div>

                                              {/* Title & Channel / Watch Info */}
                                              <div className="overflow-hidden flex-grow-1">
                                                <span 
                                                  className="d-block fw-semibold text-truncate small mb-1" 
                                                  style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                                  title={vRes.title}
                                                >
                                                  {vRes.title}
                                                </span>
                                                <div className="d-flex align-items-center gap-1.5">
                                                  <span className="badge rounded-pill px-1.5 py-0.5 text-danger bg-danger-subtle" style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                                    YouTube
                                                  </span>
                                                  <span className="small d-flex align-items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                                    Watch Video <ExternalLink size={10} />
                                                  </span>
                                                </div>
                                              </div>
                                            </a>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* SINGLE MILESTONE CERTIFICATION EXAM CARD (Once per Node) */}
                        <div className="position-relative mt-2">
                          {/* Curved Branch Line to Exam Leaf */}
                          <svg 
                            className="position-absolute" 
                            style={{ left: -26, top: 20, width: 30, height: 20, pointerEvents: 'none' }}
                          >
                            <path 
                              d="M 2 2 Q 2 12, 28 12" 
                              fill="none" 
                              stroke={stop.exam_result?.passed ? '#10b981' : 'var(--accent-olive)'} 
                              strokeWidth="1.5" 
                              opacity="0.8"
                            />
                          </svg>

                          <div 
                            className="tree-task-leaf p-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3 shadow-sm"
                            style={{
                              backgroundColor: stop.exam_result?.passed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                              border: `1.5px solid ${stop.exam_result?.passed ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                              borderLeft: `4px solid ${stop.exam_result?.passed ? '#10b981' : 'var(--accent-olive)'}`,
                            }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div 
                                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: 40,
                                  height: 40,
                                  backgroundColor: stop.exam_result?.passed ? '#10b981' : 'var(--bg-surface)',
                                  color: stop.exam_result?.passed ? '#ffffff' : 'var(--accent-olive)',
                                  border: '1.5px solid var(--border-subtle)'
                                }}
                              >
                                {stop.exam_result?.passed ? <Award size={22} /> : <ShieldCheck size={22} />}
                              </div>
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <h6 className="fw-bold mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                                    Milestone Mastery Assessment (SEB)
                                  </h6>
                                  {stop.exam_result?.passed ? (
                                    <span className="badge rounded-pill bg-success-subtle text-success px-2.5 py-0.5" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                      VERIFIED ({stop.exam_result.percentage}%)
                                    </span>
                                  ) : (
                                    <span className="badge rounded-pill px-2 py-0.5" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.68rem', border: '1px solid var(--border-subtle)' }}>
                                      Final Node Check
                                    </span>
                                  )}
                                </div>
                                <p className="small mb-0 mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                  {stop.exam_result?.passed 
                                    ? `Score: ${stop.exam_result.score}/${stop.exam_result.total} · Verified mastery on ${new Date(stop.exam_result.verified_at).toLocaleDateString()}`
                                    : `Comprehensive exam testing all concepts and practical skills learned across ${stop.title}.`}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartExam(stop);
                              }}
                              className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3.5 py-2"
                              style={{
                                backgroundColor: stop.exam_result?.passed ? 'var(--bg-card)' : 'var(--btn-primary-bg)',
                                color: stop.exam_result?.passed ? 'var(--text-primary)' : 'var(--btn-primary-text)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                              }}
                            >
                              <ShieldCheck size={15} />
                              <span>{stop.exam_result?.passed ? 'Retake Milestone Exam' : 'Take Milestone Exam in SEB'}</span>
                            </button>
                          </div>
                        </div>
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

      {/* Safe Exam Browser (SEB) Modal Dialog */}
      {examModalState && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1050, backdropFilter: 'blur(4px)' }}
          onClick={closeExamModal}
        >
          <div 
            className="clean-card p-4 shadow-lg position-relative"
            style={{ maxWidth: 540, width: '100%', backgroundColor: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {examModalState.loading ? (
              <div className="text-center py-4">
                <Loader2 size={32} className="spin mb-3 mx-auto" style={{ color: 'var(--accent-olive)' }} />
                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Generating Milestone Exam
                </h5>
                <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                  Gemini is assembling 10 calibrated questions covering {examModalState.stop?.title}...
                </p>
              </div>
            ) : examModalState.finishedResult ? (
              <div className="text-center py-3">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ 
                    width: 56, 
                    height: 56, 
                    backgroundColor: examModalState.finishedResult.passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                    color: examModalState.finishedResult.passed ? '#10b981' : '#ef4444' 
                  }}
                >
                  <Award size={30} />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {examModalState.finishedResult.passed ? 'Milestone Passed! 🎉' : 'Needs Practice'}
                </h4>
                <p className="small mb-3" style={{ color: 'var(--text-muted)' }}>
                  {examModalState.stop?.title}
                </p>
                <div 
                  className="display-5 fw-bold mb-1" 
                  style={{ color: examModalState.finishedResult.passed ? '#10b981' : '#ef4444' }}
                >
                  {examModalState.finishedResult.percentage}%
                </div>
                <p className="small mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Score: <b>{examModalState.finishedResult.score} / {examModalState.finishedResult.total}</b> (Required: ≥ 75%)
                  <br />
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {examModalState.finishedResult.passed 
                      ? 'Milestone verified & marked complete in Supabase.' 
                      : 'You scored below 75%. Please review the milestone topics and retry.'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={closeExamModal}
                  className="btn btn-dark w-100 rounded-pill py-2"
                >
                  Return to Roadmap
                </button>
              </div>
            ) : examModalState.launched ? (
              <div className="text-center py-3">
                <Loader2 size={36} className="spin mb-3 mx-auto text-danger" />
                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Exam Running in Safe Exam Browser
                </h5>
                <p className="small mb-3" style={{ color: 'var(--text-muted)' }}>
                  Please confirm <b>"Open Safe Exam Browser"</b> if prompted by your system.
                </p>
                <div className="p-3 rounded-2 text-start small mb-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  • Do not close this browser tab.<br/>
                  • Once you submit your test inside SEB, the kiosk will close and your score will update automatically here.
                </div>
                <div className="d-flex gap-2 justify-content-center">
                  <a
                    href={`http://127.0.0.1:5000/api/career/exam/seb-config/${encodeURIComponent(examModalState.examData?.examToken)}.seb`}
                    className="btn btn-outline-secondary btn-sm"
                    download="milestone-exam.seb"
                  >
                    Download .seb config manually
                  </a>
                  <button
                    type="button"
                    onClick={closeExamModal}
                    className="btn btn-light btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <ShieldCheck size={20} style={{ color: 'var(--accent-olive)' }} />
                  <span className="small fw-bold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                    Safe Exam Browser Certification
                  </span>
                </div>
                <h4 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {examModalState.stop?.title}
                </h4>
                <p className="small mb-3" style={{ color: 'var(--text-muted)' }}>
                  Exam covers: {(examModalState.stop?.skills || []).join(', ') || 'Core concepts'}
                </p>

                <div className="p-3 rounded-2 small mb-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Questions:</span>
                    <b style={{ color: 'var(--text-primary)' }}>{examModalState.examData?.questionCount || 10} MCQs</b>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Duration:</span>
                    <b style={{ color: 'var(--text-primary)' }}>{Math.round((examModalState.examData?.durationSeconds || 750) / 60)} minutes</b>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Passing Threshold:</span>
                    <b style={{ color: 'var(--text-primary)' }}>75% or higher</b>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Proctor Mode:</span>
                    <b className="text-danger">Kiosk Lockdown (No Alt-Tab)</b>
                  </div>
                </div>

                <div className="mb-4 small" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  <b>Requirement:</b> Make sure Safe Exam Browser is installed on your machine.
                  <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noreferrer" className="ms-1 text-decoration-none">
                    Download SEB ↗
                  </a>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleLaunchSeb(examModalState.examData?.examToken, examModalState.stop)}
                    className="btn btn-primary-theme flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2"
                  >
                    <PlayCircle size={16} />
                    <span>Start Exam in SEB</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeExamModal}
                    className="btn btn-outline-secondary py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isAllRoadmapDone(stops) {
  if (!stops || stops.length === 0) return false;
  return stops.every((s) => (s.tasks || []).every((t) => t.done));
}

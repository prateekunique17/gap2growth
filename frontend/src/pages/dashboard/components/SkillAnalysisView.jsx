import React, { useState, useEffect } from 'react';
import { Target, Check, AlertTriangle, ArrowRight, Sparkles, Filter, Loader2, RefreshCw, Award, Layers } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { analyzeSkills, getCareerState } from '../../../lib/api';

export default function SkillAnalysisView({ onRoleChange }) {
  const [selectedRole, setSelectedRole] = useState('Junior Software Engineer');
  const [activeFilter, setActiveFilter] = useState('all'); // all, matched, missing
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [analysisData, setAnalysisData] = useState(null);

  // Fetch initial analysis from backend on mount
  useEffect(() => {
    let mounted = true;
    getCareerState()
      .then((state) => {
        if (!mounted) return;
        if (state?.analysis) {
          setAnalysisData(state.analysis);
          if (state.profile?.dream_job_role) {
            setSelectedRole(state.profile.dream_job_role);
            if (typeof onRoleChange === 'function') {
              onRoleChange(state.profile.dream_job_role);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Backend not running or state empty:', err.message);
      });
    return () => { mounted = false; };
  }, []);

  // Run skill analysis with backend POST /api/career/analyze-skills
  const handleRunAnalysis = async (role = selectedRole) => {
    setLoading(true);
    setErrorMsg('');
    setStatusText('Analyzing skills against Hirebase requirements & generating learning roadmap with Gemini...');

    try {
      const data = await analyzeSkills({
        dream_job_role: role,
        dream_company: 'Microsoft',
        location: 'Remote',
        education_level: 'Undergraduate',
        experience_level: 'Student / Fresh Graduate',
        known_skills: [],
      });
      setAnalysisData(data);
      if (typeof onRoleChange === 'function') {
        onRoleChange(role);
      }
    } catch (err) {
      console.error('Skill analysis API error:', err);
      setErrorMsg(err.message || 'Failed to complete analysis. Ensure backend is running at http://127.0.0.1:5000');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // 1. Overall Scoring
  const overallScore = analysisData?.overall_match ?? analysisData?.resume_dimension_score ?? 80;
  const assessmentSummary = analysisData?.assessment_summary || 'The candidate shows solid web development experience and hackathon participation, but lacks explicit evidence in advanced algorithmic problem solving and heavy production backend systems.';
  const positiveSignals = analysisData?.positive_signals || [
    'Winner of Envox AI Hackathon and Top 5 in Watch The Code 2026',
    'Practical internship experience using React, Tailwind CSS, and Git workflows',
    'Pursuing a B.E. in Computer Science & Engineering with a Specialization in AI & Machine Learning'
  ];

  // 2. Data for 5-Dimension Radar Chart
  const defaultDimensions = [
    { subject: 'Education', candidateScore: 85, companyTarget: 90 },
    { subject: 'Languages', candidateScore: 75, companyTarget: 90 },
    { subject: 'Achievements', candidateScore: 80, companyTarget: 85 },
    { subject: 'Projects', candidateScore: 90, companyTarget: 90 },
    { subject: 'Skills', candidateScore: 70, companyTarget: 90 },
  ];

  const dimensionRadarData = analysisData?.resume_dimensions?.length
    ? analysisData.resume_dimensions.map((dim) => ({
        subject: dim.category,
        candidateScore: dim.candidate_score,
        companyTarget: dim.target_score,
      }))
    : defaultDimensions;

  // 3. Data for Category Competency Radar Chart
  const defaultCategories = [
    { subject: 'Programming', candidateScore: 80, companyTarget: 90 },
    { subject: 'Machine Learning', candidateScore: 70, companyTarget: 80 },
    { subject: 'Software Eng', candidateScore: 60, companyTarget: 90 },
    { subject: 'Algorithms', candidateScore: 25, companyTarget: 85 },
    { subject: 'Databases', candidateScore: 20, companyTarget: 85 },
    { subject: 'Cloud Computing', candidateScore: 15, companyTarget: 80 },
  ];

  const categoryRadarData = analysisData?.skill_analysis?.length
    ? analysisData.skill_analysis.slice(0, 6).map((c) => ({
        subject: c.category.length > 14 ? c.category.slice(0, 12) + '...' : c.category,
        candidateScore: c.candidate_score || 0,
        companyTarget: c.target_score || 80,
      }))
    : defaultCategories;

  // 4. Detailed Skill Competency Table Rows
  const skillsList = (() => {
    if (!analysisData?.skill_analysis?.length) {
      return [
        { id: 1, name: 'Python, JavaScript & Java', type: 'Programming', importance: 'Mandatory', status: 'matched', matchLevel: 'Verified in Resume' },
        { id: 2, name: 'Machine Learning & NLP', type: 'AI / ML', importance: 'Mandatory', status: 'matched', matchLevel: 'Verified in Projects' },
        { id: 3, name: 'Git & GitHub Workflows', type: 'Tooling', importance: 'Mandatory', status: 'matched', matchLevel: 'Verified in Internships' },
        { id: 4, name: 'Data Structures & Algorithms', type: 'Core CS', importance: 'Mandatory', status: 'missing', matchLevel: 'Priority Gap' },
        { id: 5, name: 'SQL & Database Systems', type: 'Databases', importance: 'Mandatory', status: 'missing', matchLevel: 'Priority Gap' },
        { id: 6, name: 'Docker & Containerization', type: 'DevOps', importance: 'Preferred', status: 'missing', matchLevel: 'Priority Gap' },
        { id: 7, name: 'Cloud Services (AWS / Azure)', type: 'Cloud', importance: 'Preferred', status: 'missing', matchLevel: 'Priority Gap' },
      ];
    }

    const list = [];
    let id = 1;
    analysisData.skill_analysis.forEach((cat) => {
      (cat.resume_skills || []).forEach((name) => {
        list.push({
          id: id++,
          name,
          type: cat.category,
          importance: cat.importance >= 8 ? 'Mandatory' : 'Preferred',
          status: 'matched',
          matchLevel: 'Verified in Profile',
        });
      });
      (cat.missing_skills || []).forEach((name) => {
        list.push({
          id: id++,
          name,
          type: cat.category,
          importance: cat.importance >= 8 ? 'Mandatory' : 'Preferred',
          status: 'missing',
          matchLevel: 'Missing in Profile',
        });
      });
    });
    return list;
  })();

  const filteredSkills = skillsList.filter((s) => {
    if (activeFilter === 'matched') return s.status === 'matched';
    if (activeFilter === 'missing') return s.status === 'missing';
    return true;
  });

  const matchedCount = skillsList.filter((s) => s.status === 'matched').length;
  const missingCount = skillsList.filter((s) => s.status === 'missing').length;

  // Custom Tooltip for Recharts
  const CustomRadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 rounded-2 small shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
          <span className="fw-bold d-block mb-1">{payload[0]?.payload?.subject}</span>
          <div className="d-flex align-items-center gap-2" style={{ color: '#858875' }}>
            <span>Target Benchmark:</span>
            <span className="fw-bold">{payload.find(p => p.dataKey === 'companyTarget')?.value}%</span>
          </div>
          <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>Your Profile Score:</span>
            <span className="fw-bold">{payload.find(p => p.dataKey === 'candidateScore')?.value}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span className="badge-minimal">Skill Diagnostics</span>
          <h2 className="display-6 fw-bold mt-1 mb-1" style={{ color: 'var(--text-primary)' }}>
            Skill Gap Analysis
          </h2>
          <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
            Compare your verified resume competencies against live benchmarks for {selectedRole}.
          </p>
        </div>
        <div className="mt-3 mt-sm-0">
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={loading}
            className="btn-primary-theme py-2 px-3 small d-flex align-items-center gap-2"
            style={{ fontSize: '0.85rem' }}
          >
            {loading ? <Loader2 size={15} className="spinner-border spinner-border-sm" /> : <RefreshCw size={15} />}
            <span>{loading ? 'Analyzing with Gemini...' : 'Run Live Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Status or loading notice */}
      {loading && statusText && (
        <div className="clean-card p-3 mb-4 d-flex align-items-center gap-3" style={{ borderLeft: '4px solid var(--accent-olive)' }}>
          <Loader2 size={18} className="spin" style={{ color: 'var(--accent-olive)', flexShrink: 0 }} />
          <div className="small" style={{ color: 'var(--text-secondary)' }}>
            {statusText}
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-4" role="alert">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ============================================================
          ROW 1: OVERALL SCORE & ROLE BENCHMARK CARD
      ============================================================ */}
      <div className="clean-card p-4 mb-4">
        <div className="row g-4 align-items-center">
          <div className="col-lg-7">
            <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              Benchmark Target Role
            </label>
            <select
              className="form-select clean-input mb-3"
              value={selectedRole}
              onChange={(e) => {
                const role = e.target.value;
                setSelectedRole(role);
                handleRunAnalysis(role);
              }}
              disabled={loading}
            >
              <option value="Junior Software Engineer">Junior Software Engineer</option>
              <option value="Senior Full-Stack Engineer">Senior Full-Stack Engineer</option>
              <option value="AI / ML Systems Engineer">AI / ML Systems Engineer</option>
              <option value="Cloud Infrastructure Architect">Cloud Infrastructure Architect</option>
              <option value="Frontend Specialist (React/Next)">Frontend Specialist (React / Next)</option>
              <option value="Engineering Manager">Engineering Manager</option>
            </select>

            <div className="p-3 rounded-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <span className="small fw-bold text-uppercase d-block mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
                Executive Assessment
              </span>
              <p className="small mb-0" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {assessmentSummary}
              </p>
            </div>
          </div>

          <div className="col-lg-5 text-center text-lg-end">
            <span className="small text-uppercase fw-semibold d-block mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Overall Readiness Score
            </span>
            <div className="d-flex align-items-baseline justify-content-center justify-content-lg-end gap-2 mb-2">
              <span className="display-4 fw-bold" style={{ color: 'var(--text-primary)' }}>{overallScore}%</span>
              <span className="small fw-semibold" style={{ color: overallScore >= 70 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {overallScore >= 75 ? 'Strong Match' : overallScore >= 60 ? 'Competitive' : 'Developing'}
              </span>
            </div>
            <div className="rounded-pill overflow-hidden mt-2" style={{ height: 8, backgroundColor: 'var(--meter-track)' }}>
              <div style={{ width: `${overallScore}%`, height: '100%', backgroundColor: 'var(--meter-bar)', transition: 'width 0.5s ease' }}></div>
            </div>
            <span className="small d-block mt-2" style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
              Overlapping Company Target Benchmark vs Candidate Profile
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          ROW 2: RECHARTS RADAR CHARTS (OVERLAPPING SCORES)
      ============================================================ */}
      <div className="row g-4 mb-4">
        {/* Radar Chart 1: 5-Dimension Profile Scoring */}
        <div className="col-lg-6">
          <div className="clean-card p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                <Layers size={17} />
                <span>5-Dimension Profile Radar</span>
              </h5>
              <div className="d-flex align-items-center gap-3 small" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1">
                  <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#858875' }}></span>
                  <span style={{ color: 'var(--text-muted)' }}>Company Target</span>
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: 'var(--btn-primary-bg)' }}></span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Your Score</span>
                </span>
              </div>
            </div>

            <p className="small mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Comparison across Education, Languages, Achievements, Projects, and Skills.
            </p>

            <div style={{ width: '100%', height: 310 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={dimensionRadarData} outerRadius="75%">
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                    stroke="var(--border-subtle)"
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                  {/* Company Target Radar (Dusty Olive transparent overlay) */}
                  <Radar
                    name="Company Benchmark"
                    dataKey="companyTarget"
                    stroke="#858875"
                    fill="#858875"
                    fillOpacity={0.22}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  {/* Candidate Score Radar (Deep Theme Accent) */}
                  <Radar
                    name="Your Profile Score"
                    dataKey="candidateScore"
                    stroke="var(--btn-primary-bg)"
                    fill="var(--btn-primary-bg)"
                    fillOpacity={0.45}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Radar Chart 2: Category Competency Radar */}
        <div className="col-lg-6">
          <div className="clean-card p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                <Sparkles size={17} />
                <span>Category Competency Radar</span>
              </h5>
              <div className="d-flex align-items-center gap-3 small" style={{ fontSize: '0.75rem' }}>
                <span className="d-flex align-items-center gap-1">
                  <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#858875' }}></span>
                  <span style={{ color: 'var(--text-muted)' }}>Target Benchmark</span>
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: 'var(--btn-primary-bg)' }}></span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Your Competency</span>
                </span>
              </div>
            </div>

            <p className="small mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Functional domain gap analysis across programming, architecture, and tools.
            </p>

            <div style={{ width: '100%', height: 310 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryRadarData} outerRadius="75%">
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                    stroke="var(--border-subtle)"
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                  {/* Company Target Radar */}
                  <Radar
                    name="Company Benchmark"
                    dataKey="companyTarget"
                    stroke="#858875"
                    fill="#858875"
                    fillOpacity={0.22}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  {/* Candidate Score Radar */}
                  <Radar
                    name="Your Competency"
                    dataKey="candidateScore"
                    stroke="var(--btn-primary-bg)"
                    fill="var(--btn-primary-bg)"
                    fillOpacity={0.45}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Positive Signals Highlight box */}
      <div className="clean-card p-3 mb-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <span className="small fw-bold text-uppercase d-flex align-items-center gap-1 mb-1" style={{ color: 'var(--text-primary)', fontSize: '0.74rem' }}>
          <Award size={15} /> Verified Positive Signals
        </span>
        <div className="row g-2">
          {positiveSignals.map((sig, idx) => (
            <div key={idx} className="col-md-4">
              <div className="p-2 rounded-2 h-100 small" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                <Check size={13} style={{ color: 'var(--text-primary)', marginRight: 4 }} />
                <span>{sig}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          ROW 3: DETAILED COMPETENCY BREAKDOWN TABLE
      ============================================================ */}
      <div className="clean-card p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
          <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Role Requirements Breakdown</h5>
          <div className="d-flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary-theme' : 'btn-outline-theme'} py-1 px-3`}
              style={{ fontSize: '0.8rem' }}
            >
              All ({skillsList.length})
            </button>
            <button
              onClick={() => setActiveFilter('matched')}
              className={`btn btn-sm ${activeFilter === 'matched' ? 'btn-primary-theme' : 'btn-outline-theme'} py-1 px-3`}
              style={{ fontSize: '0.8rem' }}
            >
              Matched ({matchedCount})
            </button>
            <button
              onClick={() => setActiveFilter('missing')}
              className={`btn btn-sm ${activeFilter === 'missing' ? 'btn-primary-theme' : 'btn-outline-theme'} py-1 px-3`}
              style={{ fontSize: '0.8rem' }}
            >
              Gaps ({missingCount})
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr className="small text-uppercase" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                <th className="py-3 px-3">Skill / Requirement</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Weight</th>
                <th className="py-3 px-2">Profile Status</th>
                <th className="py-3 px-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((skill) => (
                <tr key={skill.id} className="skill-table-row" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="fw-semibold py-3 px-3" style={{ color: 'var(--text-primary)' }}>
                    {skill.name}
                  </td>
                  <td className="py-3 px-2">
                    <span className="small" style={{ color: 'var(--text-secondary)' }}>{skill.type}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`badge rounded-pill ${skill.importance === 'Mandatory' ? 'badge-weight-mandatory' : 'badge-weight-preferred'}`}>
                      {skill.importance}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {skill.status === 'matched' ? (
                      <span className="tag-minimal-match">
                        <Check size={13} /> {skill.matchLevel}
                      </span>
                    ) : (
                      <span className="tag-minimal-gap">
                        <AlertTriangle size={13} /> {skill.matchLevel}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-end">
                    {skill.status === 'missing' ? (
                      <button className="btn btn-sm btn-outline-theme py-1 px-3" style={{ fontSize: '0.8rem' }}>
                        + Add to Roadmap
                      </button>
                    ) : (
                      <span className="small fw-semibold d-inline-flex align-items-center gap-1" style={{ color: '#56d364', fontSize: '0.82rem' }}>
                        <Check size={13} /> Verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

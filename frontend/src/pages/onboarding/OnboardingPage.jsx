import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ArrowRight, ArrowLeft, Upload, FileText, CheckCircle2, X, Plus, AlertCircle } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import { uploadResume, analyzeSkills } from '../../lib/api';

const TOTAL_STEPS = 6; // 5 questions + 1 resume upload

const CURRENT_ROLES = [
  'Student / Fresh Graduate',
  'Junior Developer (0-2 yrs)',
  'Mid-Level Developer (2-5 yrs)',
  'Senior Developer (5-8 yrs)',
  'Lead / Staff Engineer (8+ yrs)',
  'Non-Tech Professional',
  'Career Switcher',
];

const COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta',
  'Netflix', 'Uber', 'Stripe', 'Salesforce', 'Adobe',
  'Startups', 'Any Top Tech Company', 'Government / PSU',
  'Freelance / Independent',
];

const DOMAINS = [
  'Frontend Development',
  'Backend Development',
  'Full-Stack Development',
  'AI / Machine Learning',
  'Data Science & Analytics',
  'Cloud & DevOps',
  'Mobile Development',
  'Cybersecurity',
  'Blockchain / Web3',
  'Product Management',
  'UI / UX Design',
];

const TARGET_ROLES = [
  'Junior Software Engineer',
  'Software Engineer',
  'Senior Software Engineer',
  'Staff / Principal Engineer',
  'Frontend Specialist',
  'Backend Specialist',
  'Full-Stack Engineer',
  'AI / ML Engineer',
  'Data Scientist',
  'DevOps / Cloud Engineer',
  'Engineering Manager',
  'Product Manager',
];

const TIMELINES = [
  { value: '1-month', label: '1 Month', desc: 'Intensive sprint — 20+ hrs/week' },
  { value: '3-months', label: '3 Months', desc: 'Focused — 10-15 hrs/week' },
  { value: '6-months', label: '6 Months', desc: 'Steady — 6-10 hrs/week' },
  { value: '12-months', label: '12 Months', desc: 'Relaxed — 4-6 hrs/week' },
  { value: 'no-rush', label: 'No Rush', desc: 'Learning at my own pace' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);

  // Answers state
  const [currentRole, setCurrentRole] = useState('');
  const [targetCompanies, setTargetCompanies] = useState([]);
  const [customCompanyInput, setCustomCompanyInput] = useState('');
  const [showCustomCompanyInput, setShowCustomCompanyInput] = useState(false);

  const [domain, setDomain] = useState('');
  const [isOtherDomain, setIsOtherDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  const [targetRole, setTargetRole] = useState('');
  const [isOtherTargetRole, setIsOtherTargetRole] = useState(false);
  const [customTargetRole, setCustomTargetRole] = useState('');

  const [timeline, setTimeline] = useState('');

  // Resume upload state
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0: idle, 1: uploading/parsing, 2: ready, 3: analyzing, 4: done
  const [uploadError, setUploadError] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const toggleCompany = (company) => {
    // Single selection for now: if already selected, clear it; otherwise replace with selected company
    setTargetCompanies((prev) => (prev.includes(company) ? [] : [company]));
  };

  const addCustomCompany = () => {
    const trimmed = customCompanyInput.trim();
    if (trimmed) {
      setTargetCompanies([trimmed]);
      setCustomCompanyInput('');
      setShowCustomCompanyInput(false);
    }
  };

  const removeCompany = (company) => {
    setTargetCompanies((prev) => prev.filter((c) => c !== company));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return currentRole !== '';
      case 2: return targetCompanies.length > 0;
      case 3: return isOtherDomain ? customDomain.trim() !== '' : domain !== '';
      case 4: return isOtherTargetRole ? customTargetRole.trim() !== '' : targetRole !== '';
      case 5: return timeline !== '';
      case 6: return true; // resume is optional
      default: return false;
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setResumeFile(file);
    setUploadError('');
    setUploadProgress(1); // Uploading & parsing

    try {
      const result = await uploadResume(file);
      setParsedData(result);
      setUploadProgress(2); // Ready
    } catch (err) {
      console.error('Resume upload error:', err);
      setUploadError(err.message || 'Failed to parse resume. You can still proceed or try another file.');
      setUploadProgress(0);
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Step 6 finish: if a resume was uploaded, optionally kick off initial skill analysis
      const resolvedTargetRole = isOtherTargetRole ? customTargetRole.trim() : targetRole;
      const resolvedCompany = targetCompanies[0] || 'Top Tier Tech';

      if (parsedData) {
        setUploadProgress(3); // Analyzing skills
        try {
          await analyzeSkills({
            dream_job_role: resolvedTargetRole || 'Software Engineer',
            dream_company: resolvedCompany,
            location: 'Remote',
            education_level: 'Undergraduate',
            experience_level: currentRole || 'Intermediate',
            known_skills: parsedData.parsed?.skills?.map((s) => typeof s === 'string' ? s : s.name).filter(Boolean) || [],
          });
        } catch (err) {
          console.warn('Initial skill analysis error:', err);
          // Non-blocking: user can still view the dashboard
        }
      }

      navigate('/dashboard');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const removeFile = () => {
    setResumeFile(null);
    setUploadProgress(0);
  };

  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="onboarding-layout">
      <Navbar />

      <div className="flex-grow-1 d-flex flex-column justify-content-center py-4">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-lg-7 col-xl-6">

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-semibold" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Step {step} of {TOTAL_STEPS}
                  </span>
                  <span className="small fw-bold" style={{ color: 'var(--text-primary)' }}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="rounded-pill overflow-hidden" style={{ height: 4, backgroundColor: 'var(--meter-track)' }}>
                  <div
                    className="rounded-pill"
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: 'var(--meter-bar)',
                      transition: 'width 0.4s ease',
                    }}
                  ></div>
                </div>
              </div>

              {/* Question Card */}
              <div className="clean-card onboarding-card-glass p-4 p-md-5">

                {/* ========== STEP 1: Current Role ========== */}
                {step === 1 && (
                  <div>
                    <h3 className="fw-bold mb-2">What is your current role?</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      This helps us understand where you're starting from.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      {CURRENT_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setCurrentRole(role)}
                          className={`onboarding-option ${currentRole === role ? 'selected' : ''}`}
                        >
                          <span>{role}</span>
                          {currentRole === role && <CheckCircle2 size={18} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ========== STEP 2: Target Companies ========== */}
                {step === 2 && (
                  <div>
                    <h3 className="fw-bold mb-2">Which company do you want to work at?</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      Select 1 target company. We'll tailor skill requirements accordingly.
                    </p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {COMPANIES.map((company) => (
                        <button
                          key={company}
                          type="button"
                          onClick={() => toggleCompany(company)}
                          className={`onboarding-chip ${targetCompanies.includes(company) ? 'selected' : ''}`}
                        >
                          {company}
                          {targetCompanies.includes(company) && <CheckCircle2 size={14} />}
                        </button>
                      ))}

                      {/* Display custom added company if not in standard list */}
                      {targetCompanies
                        .filter((c) => !COMPANIES.includes(c))
                        .map((customC) => (
                          <button
                            key={customC}
                            type="button"
                            onClick={() => removeCompany(customC)}
                            className="onboarding-chip selected"
                          >
                            {customC}
                            <X size={14} />
                          </button>
                        ))}

                      {/* "Others" button */}
                      <button
                        type="button"
                        onClick={() => setShowCustomCompanyInput(!showCustomCompanyInput)}
                        className={`onboarding-chip ${showCustomCompanyInput ? 'selected' : ''}`}
                      >
                        <Plus size={14} />
                        Others
                      </button>
                    </div>

                    {/* Custom Company Input Form */}
                    {showCustomCompanyInput && (
                      <div className="p-3 rounded-2 mb-3" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <label className="form-label small fw-semibold text-uppercase" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                          Add your target company
                        </label>
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className="form-control clean-input"
                            placeholder="e.g. OpenAI, Palantir, Local Startup..."
                            value={customCompanyInput}
                            onChange={(e) => setCustomCompanyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomCompany();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={addCustomCompany}
                            className="btn-primary-theme py-2 px-3 small"
                            style={{ fontSize: '0.85rem' }}
                            disabled={!customCompanyInput.trim()}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    )}

                    {targetCompanies.length > 0 && (
                      <p className="small mt-2 mb-0" style={{ color: 'var(--text-muted)' }}>
                        Selected: <span className="fw-semibold" style={{ color: 'var(--text-primary)' }}>{targetCompanies[0]}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* ========== STEP 3: Domain ========== */}
                {step === 3 && (
                  <div>
                    <h3 className="fw-bold mb-2">What is your domain?</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      What area do you want to work in? This shapes your roadmap.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      {DOMAINS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDomain(d);
                            setIsOtherDomain(false);
                          }}
                          className={`onboarding-option ${!isOtherDomain && domain === d ? 'selected' : ''}`}
                        >
                          <span>{d}</span>
                          {!isOtherDomain && domain === d && <CheckCircle2 size={18} />}
                        </button>
                      ))}

                      {/* "Others" Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherDomain(true);
                          setDomain('Other');
                        }}
                        className={`onboarding-option ${isOtherDomain ? 'selected' : ''}`}
                      >
                        <span>Others (Type your own)</span>
                        {isOtherDomain && <CheckCircle2 size={18} />}
                      </button>

                      {isOtherDomain && (
                        <div className="mt-2">
                          <input
                            type="text"
                            className="form-control clean-input"
                            placeholder="Enter your custom domain (e.g. Game Development, Embedded Systems, QA Automation)"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========== STEP 4: Target Role ========== */}
                {step === 4 && (
                  <div>
                    <h3 className="fw-bold mb-2">What is your target role?</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      The role you're working toward. We'll benchmark your skills against it.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      {TARGET_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setTargetRole(role);
                            setIsOtherTargetRole(false);
                          }}
                          className={`onboarding-option ${!isOtherTargetRole && targetRole === role ? 'selected' : ''}`}
                        >
                          <span>{role}</span>
                          {!isOtherTargetRole && targetRole === role && <CheckCircle2 size={18} />}
                        </button>
                      ))}

                      {/* "Others" Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherTargetRole(true);
                          setTargetRole('Other');
                        }}
                        className={`onboarding-option ${isOtherTargetRole ? 'selected' : ''}`}
                      >
                        <span>Others (Type your own)</span>
                        {isOtherTargetRole && <CheckCircle2 size={18} />}
                      </button>

                      {isOtherTargetRole && (
                        <div className="mt-2">
                          <input
                            type="text"
                            className="form-control clean-input"
                            placeholder="Enter your target role (e.g. ML Platform Engineer, Security Architect)"
                            value={customTargetRole}
                            onChange={(e) => setCustomTargetRole(e.target.value)}
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========== STEP 5: Timeline ========== */}
                {step === 5 && (
                  <div>
                    <h3 className="fw-bold mb-2">When do you want to become job-ready?</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      We'll calibrate your roadmap milestones and weekly tasks to this timeline.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      {TIMELINES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTimeline(t.value)}
                          className={`onboarding-option ${timeline === t.value ? 'selected' : ''}`}
                        >
                          <div>
                            <span className="fw-semibold">{t.label}</span>
                            <span className="small d-block mt-1" style={{ color: 'var(--text-muted)' }}>{t.desc}</span>
                          </div>
                          {timeline === t.value && <CheckCircle2 size={18} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ========== STEP 6: Resume Upload ========== */}
                {step === 6 && (
                  <div>
                    <h3 className="fw-bold mb-2">Upload your resume</h3>
                    <p className="small mb-4" style={{ color: 'var(--text-muted)' }}>
                      We'll extract your skills automatically. You can also skip this and add it later.
                    </p>

                    {/* Upload Error feedback */}
                    {uploadError && (
                      <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {!resumeFile ? (
                      <div
                        className="clean-dropzone p-5 text-center"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('onboardingResumeInput').click()}
                      >
                        <input
                          type="file"
                          id="onboardingResumeInput"
                          className="d-none"
                          accept=".pdf,.docx,.doc"
                          onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                          style={{ width: 52, height: 52, backgroundColor: 'var(--bg-main)' }}
                        >
                          <Upload size={22} style={{ color: 'var(--text-primary)' }} />
                        </div>
                        <h6 className="fw-semibold mb-1">Click or drop your resume here</h6>
                        <p className="small mb-0" style={{ color: 'var(--text-muted)' }}>
                          PDF or Word documents up to 10MB
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <FileText size={20} style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <span className="small fw-semibold d-block">{resumeFile.name}</span>
                              <span className="small" style={{ color: 'var(--text-muted)' }}>
                                {(resumeFile.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="small fw-bold" style={{ color: uploadProgress >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {uploadProgress === 1 && 'Uploading & Parsing...'}
                              {uploadProgress === 2 && 'Ready ✓'}
                              {uploadProgress === 3 && 'Analyzing Skills...'}
                            </span>
                            <button
                              type="button"
                              onClick={removeFile}
                              className="btn btn-sm p-1"
                              style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}
                              title="Remove file"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="rounded-pill overflow-hidden" style={{ height: 4, backgroundColor: 'var(--meter-track)' }}>
                          <div
                            className="rounded-pill"
                            style={{
                              height: '100%',
                              backgroundColor: 'var(--meter-bar)',
                              width: uploadProgress === 1 ? '45%' : '100%',
                              transition: 'width 0.4s ease',
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="d-flex justify-content-between align-items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="btn-outline-theme py-2 px-3"
                      style={{ fontSize: '0.88rem' }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="d-flex align-items-center gap-3">
                    {step === 6 && !resumeFile && (
                      <button
                        type="button"
                        onClick={() => { navigate('/dashboard'); }}
                        className="btn btn-link text-decoration-none small p-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Skip for now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary-theme py-2 px-4"
                      style={{ fontSize: '0.88rem' }}
                      disabled={!canProceed()}
                    >
                      <span>{step === TOTAL_STEPS ? 'Finish' : 'Continue'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


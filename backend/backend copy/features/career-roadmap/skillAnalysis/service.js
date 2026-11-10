
const { TAXONOMY, cleanResumeSkills } = require('../resume/parser');
const modelName = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const RESUME_DIMENSIONS = ['Education', 'Languages', 'Achievements', 'Projects', 'Skills'];

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    role: { type: 'string' }, company: { type: 'string' }, location: { type: 'string' },
    overall_verdict: { type: 'string' }, assessment_summary: { type: 'string' },
    positive_signals: { type: 'array', items: { type: 'string' } },
    priority_gaps: { type: 'array', items: { type: 'string' } },
    resume_dimensions: {
      type: 'array',
      items: { type: 'object', properties: {
        category: { type: 'string' }, candidate_score: { type: 'number' }, target_score: { type: 'number' },
        evidence: { type: 'array', items: { type: 'string' } }, role_requirements: { type: 'array', items: { type: 'string' } },
        gaps: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' },
        recommended_improvements: { type: 'array', items: { type: 'string' } },
      }, required: ['category', 'candidate_score', 'target_score', 'evidence', 'role_requirements', 'gaps', 'reason', 'recommended_improvements'] },
    },
    job_skill_match: {
      type: 'object',
      properties: {
        overall_score: { type: 'number' },
        summary: { type: 'string' },
        requirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill: { type: 'string' }, candidate_score: { type: 'number' },
              reason: { type: 'string' }, recommended_improvement: { type: 'string' },
            },
            required: ['skill', 'candidate_score', 'reason', 'recommended_improvement'],
          },
        },
      },
      required: ['overall_score', 'summary', 'requirements'],
    },
    skill_analysis: {
      type: 'array',
      items: { type: 'object', properties: {
        category: { type: 'string' }, required_skills: { type: 'array', items: { type: 'string' } },
        resume_skills: { type: 'array', items: { type: 'string' } },
        self_declared_skills: { type: 'array', items: { type: 'string' } }, missing_skills: { type: 'array', items: { type: 'string' } },
        candidate_score: { type: 'number' }, target_score: { type: 'number' }, importance: { type: 'number' },
        reason: { type: 'string' }, recommended_improvements: { type: 'array', items: { type: 'string' } }, confidence: { type: 'string' },
      }, required: ['category', 'required_skills', 'resume_skills', 'self_declared_skills', 'missing_skills', 'candidate_score', 'target_score', 'importance', 'reason', 'recommended_improvements', 'confidence'] },
    },
    disclaimer: { type: 'string' },
  },
  required: ['role', 'company', 'location', 'overall_verdict', 'assessment_summary', 'positive_signals', 'priority_gaps', 'resume_dimensions', 'skill_analysis', 'job_skill_match', 'disclaimer'],
};

function parseJson(value) {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(text); } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw error;
  }
}

function providerMessage(error) {
  const status = Number(error?.status || error?.statusCode);
  if (/timed out/i.test(error?.message || '')) return 'Gemini timed out. Try again in a moment.';
  if (status === 401 || status === 403) return 'Gemini rejected the API key or this key cannot use the selected model. Check GEMINI_API_KEY and GEMINI_MODEL.';
  if (status === 404) return `Gemini model "${modelName()}" was not found for this API key. Choose an available model in backend/.env.`;
  if (status === 429) return 'Gemini rate limit or quota reached. Check the API project quota, then retry.';
  if (status === 400) return 'Gemini rejected the request format. Check the model/API version and retry.';
  if (status >= 500) return 'Gemini is temporarily unavailable. Try again shortly.';
  if (error instanceof SyntaxError) return 'Gemini returned invalid JSON. Retry the analysis.';
  return 'Gemini could not complete this request. Check the backend log for the provider error.';
}

async function generateJson(prompt, schema) {
  if (process.env.AI_DEMO_MODE !== 'false') return null;
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error('GEMINI_API_KEY is not configured.'), {
    statusCode: 503,
    publicMessage: 'Add GEMINI_API_KEY to backend/.env, then restart the backend.',
  });

  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let timer;
    try {
      const interaction = await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Gemini request timed out')), 45000);
        client.interactions.create({
          model: modelName(), input: prompt, store: false,
          generation_config: { max_output_tokens: Math.max(2048, Math.min(32768, Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 16000)) },
          response_format: { type: 'text', mime_type: 'application/json', ...(schema ? { schema } : {}) },
        }).then(resolve, reject).finally(() => clearTimeout(timer));
      });
      if (!interaction.output_text) throw new Error('Gemini returned no JSON output');
      return parseJson(interaction.output_text);
    } catch (error) {
      lastError = error;
      const status = Number(error.status || error.statusCode);
      const retryable = status === 429 || status >= 500 || /timed out/i.test(error.message || '');
      if (attempt === 2 || !retryable) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  console.error('[career-roadmap] Gemini provider error:', lastError?.status || lastError?.statusCode || lastError?.message);
  throw Object.assign(new Error('Gemini provider request failed.'), {
    statusCode: 502,
    errorCode: 'GEMINI_PROVIDER_ERROR',
    providerStatus: Number(lastError?.status || lastError?.statusCode) || null,
    providerCode: lastError?.code ? String(lastError.code).slice(0, 80) : null,
    publicMessage: providerMessage(lastError),
    cause: lastError,
  });
}

const CATEGORY_GROUPS = [
  ['Programming', ['Python', 'Java', 'C++']], ['Algorithms', ['Data Structures', 'Algorithms']],
  ['Mathematics and Statistics', ['Statistics']], ['Machine Learning', ['Machine Learning', 'Scikit-learn']],
  ['Deep Learning', ['Deep Learning', 'TensorFlow', 'PyTorch']], ['Data Processing', ['NumPy', 'Pandas', 'SQL']],
  ['Python Libraries', ['NumPy', 'Pandas', 'Scikit-learn']], ['Software Engineering', ['Git', 'Docker']],
  ['Databases', ['SQL', 'PostgreSQL', 'MongoDB']], ['Cloud Computing', ['AWS', 'Google Cloud', 'Microsoft Azure']],
  ['MLOps and Deployment', ['MLOps', 'Model Deployment', 'Docker']], ['Projects and Practical Experience', ['Machine Learning', 'Python']],
];
const FRONTEND_CATEGORY_GROUPS = [
  ['Programming Languages', ['JavaScript', 'TypeScript', 'HTML', 'CSS']],
  ['Frontend Frameworks', ['React', 'Next.js', 'Vue.js', 'Angular', 'Svelte']],
  ['Web Fundamentals', ['HTML', 'CSS', 'JavaScript']],
  ['UI Styling and State', ['Tailwind CSS', 'Bootstrap', 'Redux']],
  ['APIs and Integration', ['REST APIs', 'GraphQL', 'API Design']],
  ['Testing and Accessibility', ['React', 'JavaScript', 'Testing']],
  ['Performance and Tooling', ['Vite', 'Webpack', 'JavaScript']],
  ['Projects and Practical Experience', ['React', 'TypeScript', 'Next.js']],
];
const BACKEND_CATEGORY_GROUPS = [
  ['Programming Languages', ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'C#']],
  ['Backend Frameworks', ['Node.js', 'Express', 'NestJS', 'FastAPI', 'Flask', 'Django', 'Spring Boot', 'Laravel', 'ASP.NET']],
  ['APIs and Integration', ['REST APIs', 'GraphQL', 'API Design']],
  ['Databases', ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis']],
  ['System Design and Architecture', ['System Design', 'Microservices', 'Redis']],
  ['Testing and Security', ['Authentication', 'Testing', 'API Design']],
  ['Cloud and Deployment', ['AWS', 'Google Cloud', 'Microsoft Azure', 'Docker', 'Kubernetes']],
  ['Projects and Practical Experience', ['Node.js', 'SQL', 'Docker']],
];
const FULLSTACK_CATEGORY_GROUPS = [
  ['Programming Languages', ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'SQL']],
  ['Frontend Frameworks', ['React', 'Next.js', 'Vue.js', 'Angular']],
  ['Web Fundamentals and UI', ['HTML', 'CSS', 'Tailwind CSS', 'Bootstrap']],
  ['Backend Frameworks', ['Node.js', 'Express', 'NestJS', 'FastAPI']],
  ['APIs and Integration', ['REST APIs', 'GraphQL', 'API Design']],
  ['Databases', ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB']],
  ['Testing and Security', ['Testing', 'Authentication', 'Git']],
  ['Cloud and Deployment', ['AWS', 'Google Cloud', 'Docker', 'Kubernetes']],
  ['System Design', ['System Design', 'Microservices']],
  ['Projects and Practical Experience', ['React', 'Node.js', 'SQL']],
];

function categoryGroupsForRole(profile = {}) {
  const role = String(profile.dream_job_role || '').toLowerCase();
  if (/full[ -]?stack/.test(role)) return FULLSTACK_CATEGORY_GROUPS;
  if (/front[ -]?end|frontend|web developer|ui developer/.test(role)) return FRONTEND_CATEGORY_GROUPS;
  if (/back[ -]?end|backend|server[- ]side|api developer/.test(role)) return BACKEND_CATEGORY_GROUPS;
  return CATEGORY_GROUPS;
}

const PROGRAMMING_LANGUAGES = new Set(['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'SQL', 'Bash', 'Scala', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'R', 'Dart', 'Perl', 'PowerShell', 'HTML', 'CSS']);

function dimensionEvidenceSources(resume = {}) {
  const skills = (resume.skills || []).filter((skill) => skill && skill.name);
  const measuredAchievements = [...(resume.experience || []), ...(resume.projects || [])].filter((item) => /(?:\b(?:increased|reduced|improved|saved|won|awarded|ranked|published|selected|recognized|recognised)\b|\btop\s+\d+\b|\b\d+\s?%|\$\s?\d+|\bINR\s?[\d,]+)/i.test(item));
  return {
    Education: (resume.education?.entries || []).map(String),
    Languages: [
      ...(resume.languages || []).map((language) => typeof language === 'string' ? language : language.evidence || language.name),
      ...skills.filter((skill) => PROGRAMMING_LANGUAGES.has(skill.name)).map((skill) => skill.evidence || skill.name),
    ],
    Achievements: [...(resume.achievements || []), ...(resume.certifications || []), ...measuredAchievements].map(String),
    Projects: (resume.projects || []).map(String),
    Skills: skills.map((skill) => skill.evidence || skill.name),
  };
}

function normalizeResumeDimensions(value, resume) {
  const canonicalCategory = (name) => {
    const key = String(name || '').trim().toLowerCase();
    if (/education|degree/.test(key)) return 'education';
    if (/language/.test(key)) return 'languages';
    if (/achievement|award|certification|recognition|impact/.test(key)) return 'achievements';
    if (/project/.test(key)) return 'projects';
    if (/skill|frontend|front.end|backend|back.end|machine learning|data science|cloud/.test(key)) return 'skills';
    return key;
  };
  const generated = new Map((value?.resume_dimensions || []).filter((item) => typeof item?.category === 'string')
    .map((item) => [canonicalCategory(item.category), item]));
  const sources = dimensionEvidenceSources(resume);
  const defaults = {
    Education: 'Add your education level, field of study, and graduation details to the resume.',
    Languages: 'Add spoken or programming languages and include examples that show where you used them.',
    Achievements: 'Add measurable results, awards, recognition, or certifications.',
    Projects: 'Add relevant projects with your contribution, technologies, and outcomes.',
    Skills: 'Add role relevant technical skills and evidence showing how you used them.',
  };
  return RESUME_DIMENSIONS.map((category) => {
    const item = generated.get(category.toLowerCase()) || {};
    const evidence = sources[category] || [];
    const parsedScore = Number(item.candidate_score);
    const parsedTarget = Number(item.target_score);
    const hasEvidence = evidence.length > 0;
    let candidateScore = hasEvidence && Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(100, Math.round(parsedScore)))
      : 0;
    const targetScore = Number.isFinite(parsedTarget) ? Math.max(0, Math.min(100, Math.round(parsedTarget))) : 80;
    const gaps = Array.isArray(item.gaps) ? item.gaps.map(String).filter(Boolean).slice(0, 12) : [];
    const recommendations = Array.isArray(item.recommended_improvements)
      ? item.recommended_improvements.map(String).filter(Boolean).slice(0, 8)
      : [];
    return {
      category,
      candidate_score: candidateScore,
      target_score: targetScore,
      evidence,
      role_requirements: Array.isArray(item.role_requirements) ? item.role_requirements.map(String).filter(Boolean).slice(0, 12) : [],
      gaps: hasEvidence ? gaps : [...new Set([...gaps, defaults[category]])].slice(0, 12),
      reason: hasEvidence
        ? String(item.reason || `${category} was scored from the evidence extracted from the resume.`).trim().slice(0, 500)
        : `No ${category.toLowerCase()} evidence was found in the parsed resume; score set to 0.`,
      recommended_improvements: recommendations.length ? recommendations : [defaults[category]],
    };
  });
}

function demoAnalysis(resume, profile) {
  const known = (profile.known_skills || []).map((skill) => skill.toLowerCase());
  const entries = cleanResumeSkills(resume).skills || [];
  const roleCategories = categoryGroupsForRole(profile);
  const skillAnalysis = roleCategories.map(([category, skills], index) => {
    const resumeSkills = entries.filter((entry) => skills.includes(entry.name)).map((entry) => entry.name);
    const selfDeclared = skills.filter((skill) => known.includes(skill.toLowerCase()) && !entries.some((entry) => entry.name === skill));
    const missing = skills.filter((skill) => !resumeSkills.includes(skill) && !selfDeclared.includes(skill));
    const score = resumeSkills.length ? Math.min(82, 35 + resumeSkills.length * 12) : selfDeclared.length ? 20 : 0;
    return {
      category, required_skills: skills, resume_skills: resumeSkills,
      self_declared_skills: selfDeclared, missing_skills: missing, candidate_score: score,
      target_score: 82 + index % 3 * 5, importance: 10,
      reason: resumeSkills.length ? `The resume contains these relevant skill mentions: ${resumeSkills.join(', ')}.` : selfDeclared.length ? 'These skills appear in the profile but not in the parsed resume.' : 'No relevant skill mentions were found in the parsed resume.',
      recommended_improvements: [`Complete a practical ${category.toLowerCase()} exercise and document the result.`], confidence: resumeSkills.length ? 'medium' : 'low',
    };
  });
  const dimensionSources = dimensionEvidenceSources(resume);
  const languageEntries = entries.filter((entry) => PROGRAMMING_LANGUAGES.has(entry.name));
  const spokenLanguages = resume.languages || [];
  const dimensionScores = {
    Education: dimensionSources.Education.length ? 55 : 0,
    Languages: Math.min(100, languageEntries.length * 18 + spokenLanguages.length * 15),
    Achievements: Math.min(100, dimensionSources.Achievements.length ? 40 + dimensionSources.Achievements.length * 10 : 0),
    Projects: Math.min(100, dimensionSources.Projects.length * 25),
    Skills: Math.min(100, entries.length * 10),
  };
  const resumeDimensions = RESUME_DIMENSIONS.map((category) => ({
    category,
    candidate_score: dimensionSources[category].length ? dimensionScores[category] : 0,
    target_score: 80,
    evidence: dimensionSources[category],
    role_requirements: [],
    gaps: dimensionSources[category].length ? [] : [`No ${category.toLowerCase()} evidence was found in the parsed resume.`],
    reason: dimensionSources[category].length ? 'Demo heuristic score from parsed resume evidence; not a Gemini assessment.' : `No ${category.toLowerCase()} evidence was found in the parsed resume; score set to 0.`,
    recommended_improvements: [`Improve ${category.toLowerCase()} evidence for the ${profile.dream_job_role || 'target role'}.`],
  }));
  return {
    role: profile.dream_job_role, company: profile.dream_company, location: profile.location, mode: 'demo', overall_match: null,
    overall_verdict: 'Demo assessment only', assessment_summary: 'Rule-based demo output; it is not a live AI assessment or hiring prediction.',
    positive_signals: [], resume_dimensions: resumeDimensions, skill_analysis: skillAnalysis,
    priority_gaps: skillAnalysis.map((item) => item.category),
    job_skill_match: { overall_score: 0, summary: 'No live Gemini match was run in demo mode.', requirements: [] },
    disclaimer: 'Demo heuristic output, not an AI assessment or hiring prediction.',
  };
}

async function analyze(resume, profile, jobBenchmarks = [], jobAttributes = []) {
  const { contact: _contact, extracted_text: _text, ...nonSensitiveResume } = resume;
  const prompt = [
    'You are an evidence-based career assessor. Return only JSON matching the supplied schema.',
    'Assess this candidate for the target role using the parsed resume, declared profile, and aggregated requirements from current Hirebase job postings.',
    'Do not infer proficiency from a skill name alone. Evaluate resume context, projects, education, and work examples; separate skills found in the resume from skills declared only in the profile. Identify missing role requirements and cite the resume text that supports each assessment.',
    `Return exactly five resume_dimensions, in this order and with these exact category names: ${RESUME_DIMENSIONS.join(', ')}. Give every candidate_score and target_score an integer from 0 to 100; never return null or "unknown". If the parsed resume has no evidence for a dimension, score it 0 and explain that. Education measures education fit for the target role. Languages includes spoken languages and programming, query, and scripting languages; distinguish these in the evidence. Achievements means measurable outcomes, awards, recognition, and certifications. Projects measures relevance, depth, implementation, and outcomes. Skills means target-role technical skills and technologies; name the role-relevant areas such as frontend, backend, machine learning, data, or cloud according to the actual dream role and Hirebase requirements. Cite only evidence present in the parsed resume, list what the job requires, identify concrete gaps, and give improvements.`,
    'Write a clear overall verdict, a short specific assessment summary, positive_signals, and priority gaps. Do not make a hiring prediction.',
    'For every specific Hirebase skill/technology supplied, return exactly one job_skill_match.requirements record using its exact skill name. Score the resume evidence from 0 to 100, explain the evidence briefly, and give a concrete next improvement. Do not assign a high score without supporting resume evidence.',
    `Use exactly these category names and cover all: ${categoryGroupsForRole(profile).map(([category]) => category).join(', ')}.`,
    `PROFILE: ${JSON.stringify(profile)}`,
    `PARSED RESUME: ${JSON.stringify(nonSensitiveResume)}`,
    `RESUME SKILL MENTIONS WITH EXCERPTS: ${JSON.stringify((nonSensitiveResume.skills || []).map(({ name, evidence }) => ({ name, evidence })))}`,
    `HIREBASE JOB REQUIREMENT BENCHMARKS: ${JSON.stringify(jobBenchmarks)}`,
    `COMPLETE HIREBASE REQUIREMENT INVENTORY WITH RESUME EVIDENCE: ${JSON.stringify(jobAttributes.map(({ name, posting_count, sample_size, demand_percent, sources, evidence_status, evidence, resume_score }) => ({ name, posting_count, sample_size, demand_percent, sources, evidence_status, evidence, resume_score })))}`,
    `SKILL TAXONOMY: ${JSON.stringify(TAXONOMY)}`,
  ].join('\n');
  return (await generateJson(prompt, ANALYSIS_SCHEMA)) || demoAnalysis(resume, profile);
}

function makeVerdict(score, target) {
  if (score === null) return 'Not enough resume evidence';
  if (score >= target) return 'Meets target evidence threshold';
  if (score >= target * 0.7) return 'Developing; practice recommended';
  return 'Priority skill gap';
}

function validateJobSkillMatch(value, jobAttributes) {
  const aiRequirements = new Map((value?.job_skill_match?.requirements || [])
    .filter((item) => typeof item?.skill === 'string')
    .map((item) => [item.skill.trim().toLowerCase(), item]));
  const requirements = jobAttributes.map((attribute) => {
    const generated = aiRequirements.get(String(attribute.name).trim().toLowerCase());
    const status = attribute.evidence_status || 'not found in resume';
    const evidenceMax = status === 'found in resume' ? 100 : status === 'self-reported' ? 25 : 0;
    const generatedScore = Number(generated?.candidate_score);
    const fallbackScore = Number(attribute.resume_score) || 0;
    const score = status === 'not found in resume'
      ? 0
      : Math.round(Math.max(0, Math.min(evidenceMax, Number.isFinite(generatedScore) ? generatedScore : fallbackScore)));
    const reason = String(generated?.reason || '').trim().slice(0, 300)
      || (attribute.evidence ? `Matching resume content was found for ${attribute.name}.` : `No supporting resume evidence was found; status is ${status}.`);
    const recommendedImprovement = String(generated?.recommended_improvement || '').trim().slice(0, 300)
      || (score < 70 ? `Complete a practical exercise using ${attribute.name} and add the result to a project.` : `Extend the resume evidence for ${attribute.name} with a production-quality example.`);
    return {
      skill: attribute.name,
      posting_count: attribute.posting_count,
      sample_size: attribute.sample_size,
      demand_percent: attribute.demand_percent,
      sources: attribute.sources,
      evidence_status: status,
      candidate_score: score,
      resume_evidence: attribute.evidence || '',
      reason,
      recommended_improvement: recommendedImprovement,
    };
  });
  const weight = requirements.reduce((sum, item) => sum + Math.max(1, Number(item.posting_count) || 1), 0);
  const overallScore = weight
    ? Math.round(requirements.reduce((sum, item) => sum + item.candidate_score * Math.max(1, Number(item.posting_count) || 1), 0) / weight)
    : 0;
  const meetsThreshold = requirements.filter((item) => item.candidate_score >= 70).length;
  const partial = requirements.filter((item) => item.candidate_score > 0 && item.candidate_score < 70).length;
  const notFound = requirements.filter((item) => item.evidence_status === 'not found in resume').length;
  const priorityGaps = requirements.filter((item) => item.candidate_score < 70)
    .sort((a, b) => b.posting_count - a.posting_count || a.candidate_score - b.candidate_score)
    .map((item) => item.skill);
  return {
    overall_score: overallScore,
    score_source: value?.mode === 'demo' ? 'resume evidence rules (demo)' : 'Gemini scores, constrained by parsed resume evidence',
    weighting: 'Hirebase posting frequency',
    requirements_assessed: requirements.length,
    meets_threshold_count: meetsThreshold,
    partial_count: partial,
    no_resume_evidence_count: notFound,
    priority_gaps: priorityGaps,
    summary: requirements.length
      ? `Gemini assessed ${requirements.length} unique Hirebase requirements. The posting-frequency-weighted score is ${overallScore}/100: ${meetsThreshold} meet the score threshold, ${partial} have partial scores, and ${notFound} were not found in the resume.`
      : 'No Hirebase skill requirements were available for a posting-based match.',
    requirements,
  };
}

function validateAnalysis(value, resume, profile, jobBenchmarks = [], jobAttributes = []) {
  resume = cleanResumeSkills(resume || {});
  if (!value || !Array.isArray(value.skill_analysis) || value.skill_analysis.length < 8 || value.skill_analysis.length > 12) {
    throw Object.assign(new Error('AI returned an invalid skill analysis.'), { statusCode: 502, publicMessage: 'The AI returned an incomplete skill analysis. Click Analyze skills again.' });
  }
  const observed = new Map((resume.skills || []).map((skill) => [skill.name.toLowerCase(), skill]));
  const declared = new Set((profile.known_skills || []).map((skill) => skill.toLowerCase()));
  for (const item of value.skill_analysis) {
    if (typeof item.category !== 'string' || !item.category.trim()) throw Object.assign(new Error('Analysis category is missing.'), { statusCode: 502 });
    for (const key of ['importance', 'target_score']) {
      if (!Number.isFinite(item[key]) || item[key] < 0 || item[key] > 100) throw Object.assign(new Error(`Invalid ${key} in ${item.category}.`), { statusCode: 502 });
    }
    if (item.candidate_score !== null && (!Number.isFinite(item.candidate_score) || item.candidate_score < 0 || item.candidate_score > 100)) {
      throw Object.assign(new Error(`Invalid candidate score in ${item.category}.`), { statusCode: 502 });
    }
    for (const key of ['required_skills', 'resume_skills', 'self_declared_skills', 'missing_skills']) {
      if (!Array.isArray(item[key])) throw Object.assign(new Error(`Invalid ${key} in ${item.category}.`), { statusCode: 502 });
    }
    item.resume_skills = item.resume_skills.filter((skill) => observed.has(String(skill).toLowerCase()));
    item.self_declared_skills = item.self_declared_skills.filter((skill) => declared.has(String(skill).toLowerCase()) && !observed.has(String(skill).toLowerCase()));
    const benchmark = jobBenchmarks.find((entry) => entry.category.toLowerCase() === item.category.toLowerCase());
    item.job_required_skills = benchmark?.required_skills || [];
    item.job_demand_score = benchmark?.demand_score ?? null;
    item.job_postings_sampled = benchmark?.sample_size || 0;
    if (benchmark?.required_skills?.length) item.required_skills = benchmark.required_skills;
    const categorySkills = new Set([...(item.required_skills || []), ...(item.job_required_skills || [])].map((skill) => String(skill).toLowerCase()));
    const categoryResumeSkills = [...observed.values()].filter((entry) => categorySkills.has(entry.name.toLowerCase())).map((entry) => entry.name);
    item.resume_skills = [...new Set([...item.resume_skills, ...categoryResumeSkills])];
    item.self_declared_skills = [...new Set([
      ...item.self_declared_skills,
      ...(item.required_skills || []).filter((skill) => declared.has(String(skill).toLowerCase()) && !observed.has(String(skill).toLowerCase())),
    ])];
    const knownForCategory = new Set([...item.resume_skills, ...item.self_declared_skills].map((skill) => String(skill).toLowerCase()));
    item.missing_skills = [...new Set([
      ...item.missing_skills.filter((skill) => !knownForCategory.has(String(skill).toLowerCase())),
      ...(item.required_skills || []).filter((skill) => !knownForCategory.has(String(skill).toLowerCase())),
    ])];
    item.evidence = item.resume_skills.map((skill) => ({ skill, text: observed.get(skill.toLowerCase())?.evidence || '' }));
    if (!item.resume_skills.length && !item.self_declared_skills.length) item.candidate_score = 0;
    else if (!item.resume_skills.length) item.candidate_score = Math.min(35, item.candidate_score);
    if (!Number.isFinite(item.candidate_score)) item.candidate_score = 0;
    item.verdict = makeVerdict(item.candidate_score, item.target_score);
  }

  value.resume_dimensions = normalizeResumeDimensions(value, resume);
  value.resume_dimension_score = Math.round(value.resume_dimensions.reduce((sum, item) => sum + item.candidate_score, 0) / RESUME_DIMENSIONS.length);
  const scored = value.skill_analysis.filter((item) => item.candidate_score !== null);
  const totalWeight = scored.reduce((sum, item) => sum + item.importance, 0);
  value.category_match_score = totalWeight ? Math.round(scored.reduce((sum, item) => sum + item.candidate_score * item.importance, 0) / totalWeight) : null;
  value.job_skill_match = validateJobSkillMatch(value, jobAttributes);
  value.overall_match = value.resume_dimension_score;
  value.priority_gaps = value.skill_analysis.filter((item) => item.candidate_score === null || item.candidate_score < item.target_score)
    .sort((a, b) => b.importance - a.importance).map((item) => item.category);
  value.positive_signals = Array.isArray(value.positive_signals) ? value.positive_signals.map(String).slice(0, 12) : [];
  value.overall_verdict = value.overall_match >= 75
      ? 'Good evidence alignment with the target role'
      : value.overall_match >= 50
        ? 'Developing alignment; focus on priority gaps'
        : 'Significant skill gaps remain before this target role';
  const detailSummary = jobAttributes.length
    ? value.job_skill_match.summary
    : typeof value.assessment_summary === 'string' && value.assessment_summary.trim()
      ? value.assessment_summary.trim()
      : `Resume evidence meets the target threshold in ${value.skill_analysis.filter((item) => item.candidate_score >= item.target_score).length} categories; ${value.priority_gaps.length} categories need more evidence or practice.`;
  value.assessment_summary = `Five-area resume score: ${value.resume_dimension_score}/100. ${detailSummary}`.slice(0, 1200);
  value.role = profile.dream_job_role;
  value.company = profile.dream_company;
  value.location = profile.location;
  value.analysis_version = 'five-dimension-v2';
  return value;
}

module.exports = { analyze, generateJson, validateAnalysis, validateJobSkillMatch, modelName, ANALYSIS_SCHEMA, CATEGORY_GROUPS };

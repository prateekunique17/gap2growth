const crypto = require('node:crypto');
const { TAXONOMY } = require('../resume/parser');

const CHECK_HOURS = 6;
const CACHE_VERSION = 'hirebase-live-evidence-v6-resume-evidence';
const SKILL_ALIASES = {
  nlp: 'natural language processing',
  'machine learning fundamentals': 'machine learning',
  'algorithm development': 'algorithms',
  'statistical modeling': 'statistics',
  'object oriented programming': 'object oriented programming',
  'object-oriented programming': 'object oriented programming',
  'ml ops': 'mlops',
};
const SKILL_MATCH_VARIANTS = {
  'natural language processing': ['natural language processing', 'nlp'],
  'machine learning': ['machine learning', 'machine learning fundamentals'],
  algorithms: ['algorithms', 'algorithm development'],
  statistics: ['statistics', 'statistical modeling'],
  'object oriented programming': ['object oriented programming', 'object-oriented programming', 'oop'],
};
const CATEGORY_SKILLS = {
  Programming: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust'],
  Algorithms: ['Data Structures', 'Algorithms'],
  'Mathematics and Statistics': ['Statistics'],
  'Machine Learning': ['Machine Learning', 'Scikit-learn', 'MLflow'],
  'Deep Learning': ['Deep Learning', 'TensorFlow', 'PyTorch', 'Keras'],
  'Data Processing': ['SQL', 'NumPy', 'Pandas', 'Airflow', 'BigQuery'],
  'Python Libraries': ['NumPy', 'Pandas', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras', 'Matplotlib'],
  'Software Engineering': ['Git', 'Linux', 'Docker', 'Kubernetes', 'Jenkins', 'System Design'],
  Databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite'],
  'Cloud Computing': ['AWS', 'Google Cloud', 'Microsoft Azure'],
  'MLOps and Deployment': ['MLOps', 'Model Deployment', 'Docker', 'Kubernetes', 'MLflow', 'FastAPI'],
  'Projects and Practical Experience': ['Machine Learning', 'Computer Vision', 'Natural Language Processing'],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentions(text, skill) {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(skill)}(?=$|[^a-z0-9])`, 'i');
  return pattern.test(text);
}

function normalizeSkills(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((item) => typeof item === 'string' ? item : item?.name || item?.skill || item?.value || '')
    .map((skill) => String(skill).trim())
    .filter((skill) => {
      const key = normalizeSkillKey(skill);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSkillKey(value) {
  const key = String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim().replace(/\s+/g, ' ');
  return SKILL_ALIASES[key] || key;
}

function matchesSkillText(text, skillName) {
  const key = normalizeSkillKey(skillName);
  const variants = SKILL_MATCH_VARIANTS[key] || [skillName];
  return variants.some((variant) => mentions(String(text || ''), variant));
}

function skillsForJob(job) {
  const text = `${job.description || ''} ${job.description_raw || ''} ${job.requirements_summary || ''}`;
  const skills = new Map();
  for (const skill of [...normalizeSkills(job.required_skills), ...normalizeSkills(job.skills), ...normalizeSkills(job.technologies), ...TAXONOMY.filter((item) => mentions(text, item))]) {
    const key = normalizeSkillKey(skill);
    if (key && !skills.has(key)) skills.set(key, skill);
  }
  return [...skills.values()];
}

function getJobRequirementEntries(job) {
  const explicitSkills = normalizeSkills(job.hirebase_skills || job.skills || job.required_skills);
  const technologies = normalizeSkills(job.technologies);
  const description = `${job.description || ''} ${job.description_raw || ''} ${job.requirements_summary || ''}`;
  const fromDescription = TAXONOMY.filter((skill) => mentions(description, skill));
  const entries = new Map();
  for (const name of explicitSkills) entries.set(normalizeSkillKey(name), { name, source: 'Hirebase skills' });
  for (const name of technologies) entries.set(normalizeSkillKey(name), { name, source: 'Hirebase technologies' });
  for (const name of fromDescription) {
    const key = normalizeSkillKey(name);
    if (!entries.has(key)) entries.set(key, { name, source: 'job description' });
  }
  return [...entries.values()];
}

function resumeEvidenceForSkill(skillName, resume, profile) {
  const target = normalizeSkillKey(skillName);
  const skillEntry = (resume?.skills || []).find((item) => normalizeSkillKey(item.name) === target);
  if (skillEntry) {
    return { score: 45, status: 'found in resume', evidence: skillEntry.evidence || '' };
  }

  const sections = [
    ...(resume?.projects || []), ...(resume?.experience || []), ...(resume?.education?.entries || []),
  ].map((text) => String(text));
  const matchingEvidence = sections.find((text) => matchesSkillText(text, skillName));
  if (matchingEvidence) {
    return { score: 45, status: 'found in resume', evidence: matchingEvidence.slice(0, 280) };
  }

  const declared = (profile?.known_skills || []).find((item) => normalizeSkillKey(item) === target);
  if (declared) return { score: 20, status: 'self-reported', evidence: `Listed in profile skills: ${declared}` };
  return { score: 0, status: 'not found in resume', evidence: '' };
}

function buildRadarAttributes(jobs, resume, profile, limit = 200) {
  const postings = Array.isArray(jobs) ? jobs : [];
  const aggregate = new Map();
  for (const job of postings) {
    const seenForJob = new Set();
    for (const entry of getJobRequirementEntries(job)) {
      const key = normalizeSkillKey(entry.name);
      if (!key || seenForJob.has(key)) continue;
      seenForJob.add(key);
      const item = aggregate.get(key) || { name: entry.name, posting_count: 0, sources: new Set() };
      item.posting_count += 1;
      item.sources.add(entry.source);
      aggregate.set(key, item);
    }
  }
  const attributes = [...aggregate.values()]
    .sort((a, b) => b.posting_count - a.posting_count || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Math.min(200, limit)))
    .map((item) => {
      const evidence = resumeEvidenceForSkill(item.name, resume, profile);
      return {
        name: item.name,
        resume_score: evidence.score,
        evidence_status: evidence.status,
        evidence: evidence.evidence,
        posting_count: item.posting_count,
        sample_size: postings.length,
        demand_percent: postings.length ? Math.round(item.posting_count / postings.length * 100) : 0,
        sources: [...item.sources],
      };
    });
  const quality = {
    returned_postings: postings.length,
    postings_with_skill_tags: postings.filter((job) => normalizeSkills(job.hirebase_skills || job.skills || job.required_skills).length > 0).length,
    postings_with_technologies: postings.filter((job) => normalizeSkills(job.technologies).length > 0).length,
    postings_with_description: postings.filter((job) => Boolean(job.description || job.description_raw || job.requirements_summary)).length,
    distinct_attributes_found: aggregate.size,
    attributes_shown: attributes.length,
  };
  return { source: postings.length ? 'Hirebase' : 'role taxonomy fallback', sample_size: postings.length, attributes, quality };
}

function roadmapSkillProgress(skillName, roadmap) {
  const target = normalizeSkillKey(skillName);
  const relatedStops = (roadmap?.stops || []).filter((stop) =>
    (stop.skills || []).some((skill) => normalizeSkillKey(skill) === target));
  const tasks = relatedStops.flatMap((stop) => stop.tasks || []);
  const completedTasks = tasks.filter((task) => task.done).length;
  return {
    score: tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0,
    completed_tasks: completedTasks,
    total_tasks: tasks.length,
  };
}

function geminiRequirement(skillName, analysis) {
  const target = normalizeSkillKey(skillName);
  return (analysis?.job_skill_match?.requirements || []).find((item) =>
    normalizeSkillKey(item.skill) === target);
}

function scoreJob(job, profile, resume, analysis, roadmap) {
  const required = skillsForJob(job);
  const skillEvidence = required.map((skill) => {
    const gemini = geminiRequirement(skill, analysis);
    // Do not award points for profile-only claims. Recommendations use resume
    // evidence, Gemini's resume assessment, and tasks completed on the roadmap.
    const resumeEvidence = resumeEvidenceForSkill(skill, resume, { known_skills: [] });
    const resumeScore = resumeEvidence.status === 'found in resume'
      ? resumeEvidence.score
      : 0;
    const geminiScore = gemini && gemini.evidence_status === 'found in resume'
      ? Math.max(0, Math.min(100, Number(gemini.candidate_score) || 0))
      : 0;
    const learning = roadmapSkillProgress(skill, roadmap);
    const assessedScore = gemini ? geminiScore : resumeScore;
    const score = Math.max(assessedScore, learning.score);
    const evidenceSources = [];
    if (resumeScore) evidenceSources.push('resume');
    if (geminiScore) evidenceSources.push('Gemini resume assessment');
    if (learning.completed_tasks) evidenceSources.push('completed roadmap tasks');
    return {
      skill,
      score,
      resume_score: resumeScore,
      resume_status: resumeEvidence.status,
      gemini_score: geminiScore,
      gemini_assessed: Boolean(gemini),
      completed_tasks: learning.completed_tasks,
      total_tasks: learning.total_tasks,
      evidence_sources: evidenceSources,
      score_source: learning.score > assessedScore
        ? 'completed roadmap tasks'
        : gemini ? 'Gemini resume assessment' : 'parsed resume evidence',
      evidence: resumeEvidence.evidence || gemini?.resume_evidence || '',
    };
  });
  const average = (values) => values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
  const skillScore = average(skillEvidence.map((item) => item.score)) ?? 0;
  const resumeScore = average(skillEvidence.map((item) => item.resume_score));
  const geminiScore = average(skillEvidence.filter((item) => item.gemini_assessed).map((item) => item.gemini_score));
  const learningScore = average(skillEvidence.filter((item) => item.total_tasks > 0).map((item) =>
    Math.round(item.completed_tasks / item.total_tasks * 100)));
  const matching = skillEvidence.filter((item) => item.score >= 70).map((item) => item.skill);
  const partial = skillEvidence.filter((item) => item.score > 0 && item.score < 70).map((item) => item.skill);
  const missing = skillEvidence.filter((item) => item.score === 0).map((item) => item.skill);
  const evidenceCount = skillEvidence.filter((item) => item.score > 0).length;
  const completedTasks = (roadmap?.stops || []).flatMap((stop) => stop.tasks || []).filter((task) => task.done).length;
  const totalTasks = (roadmap?.stops || []).reduce((sum, stop) => sum + (stop.tasks || []).length, 0);

  return {
    match_score: skillScore,
    matching_skills: matching,
    partial_matching_skills: partial,
    missing_skills: missing,
    skill_match_details: skillEvidence,
    score_breakdown: {
      learned_skill_alignment: skillScore,
      resume_evidence: resumeScore,
      gemini_resume_assessment: geminiScore,
      completed_roadmap_tasks: learningScore,
    },
    evidence_summary: `${evidenceCount} of ${required.length} listed skills have resume, Gemini, or roadmap-task evidence. ${completedTasks} of ${totalTasks} roadmap tasks are complete overall.`,
    why_matches: evidenceCount
      ? `${matching.length} requirements meet the resume and learning evidence threshold, ${partial.length} have partial scores, and ${missing.length} have no matching evidence yet.`
      : 'No matching resume evidence or completed roadmap tasks were found for this posting.',
    qualification_notes: [
      missing.length ? `No resume evidence or completed roadmap work was found for: ${missing.slice(0, 8).join(', ')}.` : '',
      !missing.length ? 'Every extracted requirement has some resume, AI assessment, or roadmap evidence; this score does not guarantee qualification.' : '',
    ].filter(Boolean).join(' '),
    status: 'live',
    checked_at: job.live_verified_at || job.last_checked_at || null,
  };
}

function searchLinks(profile) {
  const role = encodeURIComponent(profile.dream_job_role || 'Machine Learning Engineer');
  const location = encodeURIComponent(profile.location || 'India');
  const company = encodeURIComponent(profile.dream_company || 'Google');
  return [
    { source: 'LinkedIn Jobs search', url: `https://www.linkedin.com/jobs/search/?keywords=${role}%20${company}&location=${location}` },
    { source: 'Google Careers search', url: `https://www.google.com/about/careers/applications/jobs/results/?q=${role}&location=${location}` },
  ];
}

async function fetchHirebase(profile) {
  if (!process.env.HIREBASE_API_KEY) return null;
  const rawRole = profile.dream_job_role || 'Frontend Developer';
  const sanitizedRole = rawRole.replace(/\(.*?\)/g, '').trim() || 'Frontend Developer';

  const common = {
    job_titles: [sanitizedRole],
    geo_locations: [{ country: profile.location || 'India' }],
    limit: 25,
    page: 1,
  };
  const queries = [
    { ...common, company_name: profile.dream_company || 'Google', experience: ['Entry'], yoe: { min: 0, max: 2 }, scope: 'preferred company, role, location, entry-level' },
    { ...common, experience: ['Entry'], yoe: { min: 0, max: 2 }, scope: 'role, location, entry-level' },
    { ...common, scope: 'role and location' },
    { job_titles: [sanitizedRole], limit: 25, page: 1, scope: 'role broad' },
  ];
  for (const query of queries) {
    const { scope, ...payload } = query;
    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch('https://api.hirebase.org/v2/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.HIREBASE_API_KEY },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(payload),
      });
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(Math.ceil(retryAfter), 3600) : null;
        throw Object.assign(new Error('Hirebase rate limit reached.'), {
          statusCode: 429,
          errorCode: 'HIREBASE_RATE_LIMIT',
          retryAfterSeconds,
          publicMessage: `Hirebase has rate-limited job searches (HTTP 429). No live listings were refreshed.${retryAfterSeconds ? ` Try again in about ${retryAfterSeconds} seconds.` : ' Try again after the limit resets.'}`,
        });
      }
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
      const retryAfter = Number(response.headers.get('retry-after'));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : 500 * 2 ** attempt));
    }
    if (!response.ok) throw Object.assign(new Error(`Hirebase request failed (${response.status}).`), {
      statusCode: 502,
      errorCode: 'HIREBASE_UPSTREAM_ERROR',
      providerStatus: response.status,
      publicMessage: `Hirebase job search failed with HTTP ${response.status}. Try again later.`,
    });
    const data = await response.json();
    const jobs = (data.jobs || []).filter(isCurrentlyLive).map((job) => {
      const hirebaseSkills = normalizeSkills(job.skills);
      const technologies = normalizeSkills(job.technologies);
      return {
      id: String(job._id || ''),
      title: job.job_title || '',
      company: job.company_name || '',
      location: (job.locations || []).map((item) => [item.city, item.region, item.country].filter(Boolean).join(', ')).join('; ')
        || job.location_raw || 'Location not listed',
      description: job.description || '',
      description_raw: job.description_raw || '',
      requirements_summary: job.requirements_summary || '',
      hirebase_skills: hirebaseSkills,
      technologies,
      required_skills: normalizeSkills([...hirebaseSkills, ...technologies]),
      education_requirements: job.education_requirements || job.education || null,
      experience_level: job.experience_level || job.seniority || '',
      experience_range: job.yoe_range || job.experience_years || null,
      application_url: job.application_link || '',
      source: 'Hirebase',
      search_scope: scope,
      source_total_count: Number(data.total_count) || null,
      posted_date: job.date_posted || null,
      last_checked_at: new Date().toISOString(),
      live_verified_at: new Date().toISOString(),
      expired: false,
      };
    }).filter((job) => {
      if (!job.id || !job.application_url) return false;
      try { return new URL(job.application_url).protocol === 'https:'; } catch { return false; }
    });
    if (jobs.length) return jobs;
  }
  return [];
}

function isCurrentlyLive(job) {
  if (!job || typeof job !== 'object') return false;
  const status = String(job.status || job.job_status || '').trim().toLowerCase();
  if (['expired', 'closed', 'inactive', 'filled', 'removed'].includes(status)) return false;
  const expired = job.expired ?? job.is_expired;
  if (expired === true || expired === 1 || String(expired).toLowerCase() === 'true') return false;
  if (expired === false || expired === 0 || String(expired).toLowerCase() === 'false') return true;
  // If Hirebase does not provide explicit expired or status fields, treat the returned live search job as active
  if (!status && expired === undefined) return true;
  return ['active', 'open', 'live', 'published'].includes(status);
}

function dedupeJobs(jobs) {
  const seenIds = new Set();
  const seenUrls = new Set();
  return jobs.filter((job) => {
    const id = String(job.id || '').trim();
    let normalizedUrl = String(job.application_url || '').trim();
    try {
      const url = new URL(normalizedUrl);
      url.hash = '';
      normalizedUrl = url.toString().replace(/\/$/, '').toLowerCase();
    } catch { /* Keep the original value for dedupe; invalid URLs are removed at fetch time. */ }
    if ((id && seenIds.has(id)) || (normalizedUrl && seenUrls.has(normalizedUrl))) return false;
    if (id) seenIds.add(id);
    if (normalizedUrl) seenUrls.add(normalizedUrl);
    return true;
  });
}

function buildJobBenchmarks(jobs) {
  const sampleSize = jobs.length;
  return Object.entries(CATEGORY_SKILLS).map(([category, categorySkills]) => {
    const skillCounts = new Map();
    let postingsMentioningCategory = 0;
    for (const job of jobs) {
      const jobSkills = skillsForJob(job);
      const matching = categorySkills.filter((skill) => jobSkills.some((jobSkill) => normalizeSkillKey(jobSkill) === normalizeSkillKey(skill)));
      if (matching.length) postingsMentioningCategory += 1;
      for (const skill of matching) skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    }
    const requiredSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([skill]) => skill);
    return {
      category,
      required_skills: requiredSkills,
      demand_score: sampleSize ? Math.round(postingsMentioningCategory / sampleSize * 100) : null,
      postings_mentioning_category: postingsMentioningCategory,
      sample_size: sampleSize,
    };
  });
}

function profileCacheKey(profile) {
  return crypto.createHash('sha256').update(JSON.stringify({
    version: CACHE_VERSION,
    dream_job_role: profile.dream_job_role,
    dream_company: profile.dream_company,
    location: profile.location,
  })).digest('hex');
}

async function getRecommendations(state, force = false) {
  const profile = state.profile || {};
  const cacheKey = profileCacheKey(profile);
  const checkedAt = Date.parse(state.jobs?.checked_at || '');
  if (!force && state.jobs?.cache_key === cacheKey && Date.now() - checkedAt < CHECK_HOURS * 3600000) {
    return rankRecommendations(state.jobs, state, profile, cacheKey);
  }

  let jobs;
  try {
    jobs = await fetchHirebase(profile);
  } catch (error) {
    if (error.errorCode !== 'HIREBASE_RATE_LIMIT') throw error;
    return rankRecommendations({
      source: 'Search links only',
      search_scope: null,
      checked_at: new Date().toISOString(),
      total_matching_jobs: 0,
      jobs: [],
      hirebase_rate_limited: true,
      refresh_warning: error.publicMessage,
    }, state, profile, cacheKey);
  }
  return rankRecommendations({
    source: jobs === null ? 'Search links only' : 'Hirebase',
    search_scope: jobs?.[0]?.search_scope || null,
    checked_at: new Date().toISOString(),
    total_matching_jobs: jobs?.[0]?.source_total_count || (jobs || []).length,
    jobs: dedupeJobs(jobs || []),
  }, state, profile, cacheKey);
}

function rankRecommendations(source, state, profile, cacheKey) {
  const rawJobs = dedupeJobs(source.jobs || []);
  const ranked = rawJobs
    .filter((job) => job.expired === false && job.application_url)
    .map((job) => ({ ...job, ...scoreJob(job, profile, state.resume?.parsed || null, state.analysis, state.roadmap) }))
    .sort((a, b) => b.match_score - a.match_score || String(b.posted_date || '').localeCompare(String(a.posted_date || '')));
  const resume = state.resume?.parsed || null;
  const requirementProfile = buildRadarAttributes(ranked, resume, profile, 200);
  const tasks = (state.roadmap?.stops || []).flatMap((stop) => stop.tasks || []);
  const completedTasks = tasks.filter((task) => task.done).length;
  const checkedAt = source.checked_at || new Date().toISOString();
  return {
    ...source,
    cache_key: cacheKey,
    source: source.source || 'Hirebase',
    checked_at: checkedAt,
    live_postings_returned: ranked.length,
    total_matching_jobs: source.total_matching_jobs || rawJobs[0]?.source_total_count || rawJobs.length,
    jobs: ranked,
    requirement_benchmarks: buildJobBenchmarks(ranked),
    requirement_attributes: requirementProfile.attributes.slice(0, 12),
    requirement_inventory: requirementProfile.attributes,
    requirement_data_quality: requirementProfile.quality,
    search_links: searchLinks(profile),
    candidate_evidence: {
      basis: 'Resume evidence, Gemini resume assessment, and completed roadmap tasks; profile-only skill claims are excluded.',
      completed_tasks: completedTasks,
      total_tasks: tasks.length,
      analysis_available: Boolean(state.analysis?.job_skill_match?.requirements?.length),
      roadmap_available: Boolean(state.roadmap?.stops?.length),
    },
    notice: ranked.length
      ? `Showing ${ranked.length} Hirebase postings marked live at ${checkedAt}. Ranked only by resume evidence, Gemini assessment, and roadmap task progress. Recheck the application page before applying.`
      : source.refresh_warning || (source.source === 'Hirebase'
        ? 'Hirebase returned no postings with a confirmed live status and valid application link. Refresh later to check again.'
        : 'No Hirebase API key is configured. Search links open live job search pages; no job listings are fabricated.'),
  };
}

module.exports = { scoreJob, dedupeJobs, searchLinks, fetchHirebase, getRecommendations, buildJobBenchmarks, buildRadarAttributes, resumeEvidenceForSkill, normalizeSkillKey, profileCacheKey, isCurrentlyLive, roadmapSkillProgress, CATEGORY_SKILLS };

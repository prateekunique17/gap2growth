const { generateJson } = require('../skillAnalysis/service');

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    kind: { type: 'string' },
    language: { type: 'string' },
    code_prompt: { type: 'string' },
    starter_code: { type: 'string' },
    expected_behavior: { type: 'string' },
    validation_steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'kind'],
};

const RESOURCE_SCHEMA = {
  type: 'object',
  properties: { 
    title: { type: 'string' }, 
    url: { type: 'string' },
    type: { type: 'string', description: 'documentation | video | course' }
  },
  required: ['title', 'url'],
};

const STOP_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    topics: { type: 'array', items: { type: 'string' } },
    resources: { type: 'array', items: RESOURCE_SCHEMA },
    tasks: { type: 'array', items: TASK_SCHEMA },
    duration_days: { type: 'number' },
    priority: { type: 'string' },
    prerequisites: { type: 'array', items: { type: 'string' } },
    completion_criteria: { type: 'string' },
    project: { type: 'string' },
    project_id: { type: 'string' },
    track_id: { type: 'string' },
  },
  required: ['id', 'title', 'description', 'skills', 'topics', 'resources', 'tasks', 'duration_days', 'priority', 'prerequisites', 'completion_criteria', 'project'],
};

const PROJECT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    deliverables: { type: 'array', items: { type: 'string' } },
    completion_criteria: { type: 'string' },
    tasks: { type: 'array', items: TASK_SCHEMA },
  },
  required: ['id', 'title', 'description', 'skills', 'deliverables', 'completion_criteria', 'tasks'],
};

const PROJECT_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    deliverables: { type: 'array', items: { type: 'string' } },
    completion_criteria: { type: 'string' },
  },
  required: ['id', 'title', 'description', 'skills', 'deliverables', 'completion_criteria'],
};

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tracks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          goal: { type: 'string' },
          priority: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'goal', 'priority', 'skills'],
      },
    },
    projects: { type: 'array', items: PROJECT_PLAN_SCHEMA },
  },
  required: ['title', 'description', 'tracks', 'projects'],
};

const ROADMAP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tracks: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, title: { type: 'string' }, goal: { type: 'string' },
      priority: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } },
      milestone_ids: { type: 'array', items: { type: 'string' } },
    }, required: ['id', 'title', 'goal', 'priority', 'skills', 'milestone_ids'] } },
    stops: { type: 'array', items: STOP_SCHEMA },
    projects: { type: 'array', items: PROJECT_SCHEMA },
  },
  required: ['title', 'description', 'tracks', 'stops', 'projects'],
};

const MAX_SOURCE_STOPS = 80;
const MIN_ROADMAP_STOPS = 24;
const MAX_TRACKS = 12;
const MAX_SKILLS_PER_TRACK = 25;
const MIN_TECHNICAL_TRACKS = 4;

function cleanText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeSkill(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function roadmapRequirements(analysis) {
  const assessed = analysis.job_skill_match?.requirements || [];
  if (assessed.length) {
    const seen = new Set();
    return assessed.flatMap((item) => {
      const key = normalizeSkill(item.skill);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{
        skill: String(item.skill).trim(),
        candidate_score: Number(item.candidate_score) || 0,
        evidence_status: item.evidence_status || 'not found in resume',
        posting_count: Number(item.posting_count) || 0,
        demand_percent: Number(item.demand_percent) || 0,
        improvement: cleanText(item.recommended_improvement),
        evidence: cleanText(item.resume_evidence).slice(0, 220),
      }];
    });
  }

  const categories = analysis.skill_analysis || [];
  const seen = new Set();
  const resumeSkills = new Map((analysis.resume_snapshot?.skills || []).map((item) => [normalizeSkill(item.name), item]));
  return categories.flatMap((category) => {
    const skills = [...(category.job_required_skills || []), ...(category.required_skills || [])];
    return skills.flatMap((skill) => {
      const key = normalizeSkill(skill);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      const resumeEntry = resumeSkills.get(key);
      const selfReported = (category.self_declared_skills || []).some((entry) => normalizeSkill(entry) === key);
      return [{
        skill: String(skill).trim(),
        candidate_score: resumeEntry ? 45 : selfReported ? 20 : 0,
        evidence_status: resumeEntry ? 'found in resume' : selfReported ? 'self-reported' : 'not found in resume',
        posting_count: 0,
        demand_percent: 0,
        improvement: `Study ${skill} foundations and apply them in a practical exercise.`,
        evidence: resumeEntry?.evidence || '',
        category: category.category,
      }];
    });
  });
}

function defaultProjects(profile, requirements) {
  const role = profile.dream_job_role || 'target role';
  const skills = requirements.slice(0, 8).map((item) => item.skill);
  return [
    {
      id: 'project-1',
      title: `${role} end-to-end portfolio project`,
      description: `Build a complete project that solves a realistic problem for a ${role} using the candidate's highest-priority target skills.`,
      skills,
      deliverables: ['Problem statement and dataset', 'Reproducible code and tests', 'Evaluation report and README'],
      completion_criteria: 'A reviewer can reproduce the work, understand the design choices, and inspect measured results.',
    },
    {
      id: 'project-2',
      title: 'Production deployment and monitoring project',
      description: `Package a useful model or data product for the ${role} target, deploy it, and document its reliability.`,
      skills: skills.slice(0, 6),
      deliverables: ['Versioned model or service', 'Automated tests and deployment steps', 'Monitoring and error analysis'],
      completion_criteria: 'The application can be started from documented instructions and returns validated results.',
    },
  ];
}

function normalizeProjects(value, profile, requirements) {
  const source = Array.isArray(value?.projects) ? value.projects : [];
  const projects = source.slice(0, 3).map((project, index) => ({
    id: `project-${index + 1}`,
    title: cleanText(project?.title, `Portfolio project ${index + 1}`).slice(0, 140),
    description: cleanText(project?.description, `Build and document a practical ${profile.dream_job_role || 'career'} project.`).slice(0, 700),
    skills: Array.isArray(project?.skills) && project.skills.length
      ? normalizeStringList(project.skills, profile.dream_job_role || 'Target role skills')
      : requirements.slice(0, 8).map((item) => item.skill),
    deliverables: normalizeStringList(project?.deliverables, 'Working code, tests, and a clear README'),
    completion_criteria: cleanText(project?.completion_criteria, 'Publish reproducible work with tests and a clear explanation.').slice(0, 600),
  }));
  const defaults = defaultProjects(profile, requirements);
  while (projects.length < 2) projects.push(defaults[projects.length]);
  return projects;
}

function fallbackTracks(analysis, requirements) {
  const groups = new Map();
  for (const item of requirements) {
    const category = (analysis.skill_analysis || []).find((entry) =>
      [...(entry.job_required_skills || []), ...(entry.required_skills || [])]
        .some((skill) => normalizeSkill(skill) === normalizeSkill(item.skill)));
    const name = category?.category || 'Role-specific requirements';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item.skill);
  }
  const tracks = [...groups.entries()].map(([title, skills], index) => ({
    id: `track-${index + 1}`,
    title: `${title} learning track`,
    goal: `Build practical foundations and advanced evidence in ${title}.`,
    priority: 'high',
    skills,
  }));
  if (!tracks.length) {
    tracks.push({ id: 'track-1', title: 'Career foundations', goal: 'Build core skills for the target role.', priority: 'high', skills: [] });
  }
  return tracks;
}

function splitTracks(tracks) {
  const split = [];
  for (const track of tracks) {
    const skills = [...new Set(track.skills || [])];
    if (!skills.length || skills.length <= MAX_SKILLS_PER_TRACK) {
      split.push({ ...track, skills });
      continue;
    }
    for (let index = 0; index < skills.length; index += MAX_SKILLS_PER_TRACK) {
      const part = Math.floor(index / MAX_SKILLS_PER_TRACK) + 1;
      split.push({
        ...track,
        id: `${track.id}-part-${part}`,
        title: `${track.title} (part ${part})`,
        skills: skills.slice(index, index + MAX_SKILLS_PER_TRACK),
      });
    }
  }
  return split;
}

function normalizePlan(value, analysis, profile, requirements) {
  const canonical = new Map(requirements.map((item) => [normalizeSkill(item.skill), item.skill]));
  const tracks = [];
  const claimed = new Set();
  for (const track of Array.isArray(value?.tracks) ? value.tracks : []) {
    const skills = [...new Set((Array.isArray(track.skills) ? track.skills : [])
      .map((skill) => canonical.get(normalizeSkill(skill)))
      .filter((skill) => skill && !claimed.has(normalizeSkill(skill))))];
    for (const skill of skills) claimed.add(normalizeSkill(skill));
    if (!skills.length && tracks.length >= MIN_TECHNICAL_TRACKS) continue;
    tracks.push({
      id: cleanText(track.id, `track-${tracks.length + 1}`),
      title: cleanText(track.title, `Learning track ${tracks.length + 1}`).slice(0, 140),
      goal: cleanText(track.goal, 'Build practical skills through focused study and coding exercises.').slice(0, 500),
      priority: ['high', 'medium', 'low'].includes(String(track.priority).toLowerCase()) ? String(track.priority).toLowerCase() : 'medium',
      skills,
    });
  }

  if (!tracks.length) {
    tracks.push(...fallbackTracks(analysis, requirements));
    for (const track of tracks) for (const skill of track.skills) claimed.add(normalizeSkill(skill));
  }
  const unassigned = requirements.map((item) => item.skill).filter((skill) => !claimed.has(normalizeSkill(skill)));
  if (unassigned.length) {
    if (tracks.length < MAX_TRACKS) tracks.push({ id: `track-${tracks.length + 1}`, title: 'Additional Hirebase requirements', goal: 'Study every remaining skill found in the live target-role listings.', priority: 'high', skills: unassigned });
    else tracks[tracks.length - 1].skills.push(...unassigned);
  }

  let detailTracks = splitTracks(tracks);
  while (detailTracks.length < MIN_TECHNICAL_TRACKS) {
    detailTracks.push({
      id: `practice-track-${detailTracks.length + 1}`,
      title: ['Coding practice and problem solving', 'Applied engineering practice', 'Review and interview preparation'][detailTracks.length - tracks.length] || 'Independent practice and review',
      goal: `Build and explain practical ${profile.dream_job_role || 'target role'} skills through independent exercises.`,
      priority: 'medium',
      skills: [],
    });
  }
  if (detailTracks.length > MAX_TRACKS - 1) {
    const keepCount = MAX_TRACKS - 2;
    const overflow = detailTracks.slice(keepCount);
    detailTracks = [
      ...detailTracks.slice(0, keepCount),
      {
        id: 'additional-track-bundle',
        title: 'Additional role technologies and advanced practice',
        goal: 'Cover every remaining target-job requirement with deeper code practice.',
        priority: 'high',
        skills: [...new Set(overflow.flatMap((track) => track.skills))],
      },
    ];
  }
  const portfolioTrack = {
    id: 'portfolio-track',
    title: 'Portfolio projects and interview practice',
    goal: 'Turn the learned skills into two or three complete, reviewable portfolio projects.',
    priority: 'high',
    skills: [],
    portfolio: true,
  };
  const normalizedTracks = [...detailTracks, portfolioTrack].map((track, index) => ({ ...track, id: `track-${index + 1}` }));
  const projects = normalizeProjects(value, profile, requirements);
  return {
    title: cleanText(value?.title, `Route to ${profile.dream_job_role || 'your target role'}`).slice(0, 160),
    description: cleanText(value?.description, 'A multi-track learning route generated from live role requirements and resume evidence.').slice(0, 700),
    tracks: normalizedTracks,
    projects,
  };
}

function compactRequirements(requirements) {
  return requirements.map((item) => ({
    skill: item.skill,
    current_score: item.candidate_score,
    resume_status: item.evidence_status,
    posting_count: item.posting_count,
    demand_percent: item.demand_percent,
    improvement: item.improvement,
    evidence: item.evidence,
  }));
}

function buildPlanPrompt(analysis, profile, requirements) {
  return [
    'Plan a comprehensive career learning roadmap as JSON matching the supplied schema.',
    'Organize every supplied job requirement into 4 to 8 prerequisite-ordered technical learning tracks. Each exact requirement must appear in exactly one track skills list. Add foundational tracks when a requirement needs prerequisites. Do not omit skills because the candidate has some resume evidence; advanced practice still belongs in the route.',
    'Use the candidate score and resume evidence to choose an appropriate starting point. Teach foundations before advanced use, and do not claim any skill is already mastered based only on its name.',
    'Return exactly 2 or 3 integrated portfolio projects that combine the target role skills. Projects should be distinct and substantial, not toy examples. Keep this call focused on planning; each track will be expanded separately.',
    `PROFILE: ${JSON.stringify(profile)}`,
    `GEMINI SKILL ANALYSIS SUMMARY: ${JSON.stringify((analysis.skill_analysis || []).map((item) => ({ category: item.category, candidate_score: item.candidate_score, target_score: item.target_score, gaps: item.missing_skills, resume_skills: item.resume_skills })))}`,
    `COMPLETE HIREBASE REQUIREMENT LIST: ${JSON.stringify(compactRequirements(requirements))}`,
  ].join('\n');
}

function projectDetailsSchema() {
  return {
    type: 'object',
    properties: { title: { type: 'string' }, description: { type: 'string' }, stops: { type: 'array', items: STOP_SCHEMA }, projects: { type: 'array', items: PROJECT_SCHEMA } },
    required: ['title', 'description', 'stops', 'projects'],
  };
}

function trackPrompt(track, analysis, profile, requirementMap, projects) {
  const skills = track.skills.map((skill) => requirementMap.get(normalizeSkill(skill))).filter(Boolean);
  const categories = (analysis.skill_analysis || []).map((item) => ({
    category: item.category,
    score: item.candidate_score,
    target: item.target_score,
    relevant_gaps: (item.missing_skills || []).slice(0, 8),
  }));
  return [
    'Expand this one learning track into a detailed, comprehensive JSON curriculum matching the schema.',
    'Create 4 to 6 distinct milestones for this track and 5 to 8 actionable tasks in every milestone. A milestone should cover a focused level of depth, not a single broad technology name.',
    'Every skill assigned to this track must appear exactly in at least one milestone skills list. Teach foundations before advanced use. Include specific subtopics, exercises, measurable completion criteria, and free HTTPS learning resources.',
    'For resources in every milestone, provide a mix of official documentation and targeted YouTube video tutorials: include 1-2 curated YouTube video tutorial links (e.g., https://www.youtube.com/results?search_query=... for direct video tutorials) along with official documentation guides. Set resource.type as "video" or "documentation".',
    'Use the supplied resume evidence and candidate score to calibrate each milestone. Teach foundational concepts before advanced use, and do not assume prior mastery.',
    'Every milestone must include at least two explicit code practice tasks. For each code task fill kind="code", language, a concrete code_prompt, a short starter_code skeleton, expected_behavior, and 2 or more validation_steps. Make code prompts specific to the named technologies and include edge cases or tests.',
    'Do not say tasks are already completed. Keep prerequisites limited to earlier milestone IDs from this track; the backend will connect tracks in the supplied order.',
    projects.length ? 'Also expand every supplied portfolio project into a sequenced checklist of 8 to 12 concrete tasks. Give each project the exact supplied id and title. Include code, tests, documentation, and a reviewable deliverable.' : 'Return an empty projects list for this non-project track.',
    `PROFILE: ${JSON.stringify(profile)}`,
    `TRACK: ${JSON.stringify({ id: track.id, title: track.title, goal: track.goal, priority: track.priority, skills: track.skills })}`,
    `REQUIREMENT EVIDENCE FOR THIS TRACK: ${JSON.stringify(skills)}`,
    `CAREER GAP CONTEXT: ${JSON.stringify(categories)}`,
    `ASSIGNED PROJECTS: ${JSON.stringify(projects)}`,
  ].join('\n');
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await callback(items[index], index);
    }
  }));
  return results;
}

function defaultCodeTasks(project, index) {
  const title = project.title;
  return [
    { id: `${project.id}-task-${index + 1}`, title: `Implement the core feature for ${title}`, kind: 'code', language: 'Python', code_prompt: `Build the main technical component of ${title}. Include input validation and a reusable function or module.`, starter_code: 'def build_solution(data):\n    # TODO: implement the core behavior\n    raise NotImplementedError', expected_behavior: 'The function returns a result for valid input and handles invalid or empty input clearly.', validation_steps: ['Test a normal input', 'Test an empty input', 'Test an invalid input'] },
    { id: `${project.id}-task-${index + 2}`, title: `Write automated tests and fix edge cases for ${title}`, kind: 'code', language: 'Python', code_prompt: `Write automated tests for the core feature in ${title}, including at least one edge case.`, starter_code: 'def test_solution():\n    # TODO: add normal and edge-case assertions\n    assert True', expected_behavior: 'Tests fail for a broken implementation and pass when expected behavior is correct.', validation_steps: ['Run the test suite', 'Check a boundary value', 'Record test output'] },
    { id: `${project.id}-task-${index + 3}`, title: `Document and review the project deliverables`, kind: 'review' },
    { id: `${project.id}-task-${index + 4}`, title: `Publish a reproducible README and demo`, kind: 'project' },
    { id: `${project.id}-task-${index + 5}`, title: `Review the result against the project success criteria`, kind: 'review' },
  ];
}

function assembleRoadmap(plan, expandedTracks, profile, analysis) {
  const stops = [];
  const projectDetails = new Map();
  const portfolioTrack = plan.tracks.find((track) => track.portfolio) || plan.tracks.at(-1);
  let previousTrackStop = null;
  for (const [trackIndex, result] of expandedTracks.entries()) {
    const track = plan.tracks[trackIndex];
    for (const project of result?.projects || []) projectDetails.set(String(project.id), project);
    const trackStops = Array.isArray(result?.stops) ? result.stops : [];
    const localIds = new Map(trackStops.map((stop, index) => [String(stop.id || `stage-${index + 1}`), `${track.id}-stage-${index + 1}`]));
    if (!trackStops.length) {
      const id = `${track.id}-stage-1`;
      const title = track.title;
      stops.push({
        id, track_id: track.id, title, description: track.goal, skills: track.skills, topics: track.skills.map((skill) => `${skill} foundations and applied practice`),
        tasks: defaultCodeTasks({ id: track.id, title }, stops.length * 5), resources: [], duration_days: 21, priority: track.priority,
        prerequisites: previousTrackStop ? [previousTrackStop] : [], completion_criteria: `Complete and explain practical work for ${track.title}.`, project: `Portfolio evidence for ${track.title}`,
      });
      previousTrackStop = id;
      continue;
    }
    trackStops.forEach((source, index) => {
      const id = localIds.get(String(source.id || `stage-${index + 1}`));
      const prerequisites = (Array.isArray(source.prerequisites) ? source.prerequisites : [])
        .map((sourceId) => localIds.get(String(sourceId)))
        .filter(Boolean);
      if (!index && previousTrackStop) prerequisites.push(previousTrackStop);
      stops.push({ ...source, id, track_id: track.id, prerequisites: [...new Set(prerequisites)] });
    });
    previousTrackStop = localIds.get(String(trackStops.at(-1).id || `stage-${trackStops.length}`));
  }

  const projects = plan.projects.slice(0, 3).map((planned, index) => {
    const generated = projectDetails.get(planned.id) || {};
    const project = {
      ...planned,
      description: cleanText(generated.description, planned.description).slice(0, 700),
      skills: normalizeStringList(generated.skills, planned.skills.join(', ') || profile.dream_job_role),
      deliverables: normalizeStringList(generated.deliverables, planned.deliverables.join(', ') || 'Working code, tests, and project documentation'),
      completion_criteria: cleanText(generated.completion_criteria, planned.completion_criteria).slice(0, 600),
    };
    const id = `project-stage-${index + 1}`;
    const tasks = Array.isArray(generated.tasks) && generated.tasks.length >= 4
      ? generated.tasks
      : defaultCodeTasks(project, index * 10);
    stops.push({
      id,
      project_id: project.id,
      track_id: portfolioTrack?.id || 'portfolio-track',
      title: `Portfolio project ${index + 1}: ${project.title}`,
      description: project.description,
      skills: project.skills,
      topics: project.deliverables,
      tasks,
      resources: [],
      duration_days: 30,
      priority: 'high',
      prerequisites: previousTrackStop ? [previousTrackStop] : [],
      completion_criteria: project.completion_criteria,
      project: project.title,
    });
    project.stop_id = id;
    previousTrackStop = id;
    return project;
  });

  return {
    title: plan.title,
    description: plan.description,
    tracks: plan.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      goal: track.goal,
      priority: track.priority,
      skills: track.skills,
      milestone_ids: stops.filter((stop) => stop.track_id === track.id).map((stop) => stop.id),
    })),
    stops,
    projects,
    mode: 'live',
    generation: {
      strategy: 'requirements planner followed by one Gemini expansion call per learning track',
      planner_calls: 1,
      track_calls: plan.tracks.length,
      total_gemini_calls: 1 + plan.tracks.length,
      learning_tracks: plan.tracks.length,
      portfolio_projects: projects.length,
    },
  };
}

function demoRoadmap(analysis, profile) {
  const requirements = roadmapRequirements(analysis);
  const gaps = requirements.length ? requirements : (analysis.priority_gaps || []).map((skill) => ({ skill }));
  const groups = [];
  for (let index = 0; index < gaps.length; index += 4) groups.push(gaps.slice(index, index + 4));
  const stops = groups.map((group, index) => {
    const skills = group.map((item) => item.skill);
    const title = `Practice ${skills.join(', ')}`;
    const id = `demo-stop-${index + 1}`;
    return {
      id, track_id: `practice-track-${index + 1}`, title, description: `Build practical experience with ${skills.join(', ')} for the target role.`, skills,
      topics: skills.flatMap((skill) => [`${skill} foundations`, `${skill} practical use`, `${skill} testing`]),
      resources: [], tasks: defaultCodeTasks({ id, title }, index * 5), duration_days: 21, priority: index < 3 ? 'high' : 'medium',
      prerequisites: index ? [`demo-stop-${index}`] : [], completion_criteria: `Complete code exercises and publish evidence for ${skills.join(', ')}.`, project: `Practice artifact for ${skills.join(', ')}`,
    };
  });
  const projects = defaultProjects(profile, requirements);
  let previous = stops.at(-1)?.id;
  projects.forEach((project, index) => {
    const id = `demo-project-${index + 1}`;
    stops.push({
      id, track_id: 'portfolio-track', project_id: project.id, title: `Portfolio project ${index + 1}: ${project.title}`, description: project.description,
      skills: project.skills, topics: project.deliverables, resources: [], tasks: defaultCodeTasks(project, index * 10),
      duration_days: 30, priority: 'high', prerequisites: previous ? [previous] : [], completion_criteria: project.completion_criteria, project: project.title,
    });
    project.stop_id = id;
    previous = id;
  });
  return { title: `Route to ${profile.dream_job_role || 'your target role'}`, description: 'Demo roadmap outline. Configure Gemini for detailed track-specific exercises and projects.', stops, projects, mode: 'demo' };
}

async function generateRoadmap(analysis, profile) {
  const requirements = roadmapRequirements(analysis);
  const planOutput = await generateJson(buildPlanPrompt(analysis, profile, requirements), PLAN_SCHEMA);
  if (!planOutput) return { ...normalizeRoadmap(demoRoadmap(analysis, profile), profile, analysis, MIN_ROADMAP_STOPS), mode: 'demo' };

  const plan = normalizePlan(planOutput, analysis, profile, requirements);
  const requirementMap = new Map(requirements.map((item) => [normalizeSkill(item.skill), item]));
  const portfolioTrack = plan.tracks.at(-1);
  const concurrency = Math.max(1, Math.min(3, Number(process.env.ROADMAP_TRACK_CONCURRENCY) || 2));
  const expandedTracks = await mapWithConcurrency(plan.tracks, concurrency, async (track) => {
    const assignedProjects = track.portfolio ? plan.projects : [];
    const prompt = trackPrompt(track, analysis, profile, requirementMap, assignedProjects);
    const output = await generateJson(prompt, projectDetailsSchema());
    if (!output) throw Object.assign(new Error(`Gemini did not return the ${track.title} roadmap track.`), { statusCode: 502 });
    return output;
  });
  const combined = assembleRoadmap(plan, expandedTracks, profile, analysis);
  return { ...normalizeRoadmap(combined, profile, analysis, MIN_ROADMAP_STOPS), mode: 'live', generation: combined.generation };
}

function normalizeRoadmap(value, profile = {}, analysis = {}, minimumStops = 0) {
  const sourceStops = Array.isArray(value?.stops) ? value.stops.slice(0, MAX_SOURCE_STOPS) : [];
  if (!sourceStops.length) throw Object.assign(new Error('AI returned no roadmap stops.'), { statusCode: 502, publicMessage: 'The AI returned an empty roadmap. Click Generate roadmap again.' });
  const originalIds = new Map();
  const stops = sourceStops.map((stop, index) => {
    const id = `stop-${index + 1}`;
    if (stop?.id != null) originalIds.set(String(stop.id), id);
    const title = cleanText(stop?.title, `Learning milestone ${index + 1}`).slice(0, 160);
    const taskList = Array.isArray(stop?.tasks) ? stop.tasks.slice(0, 12) : [];
    const tasks = taskList.map((task, taskIndex) => normalizeTask(task, id, taskIndex, title));
    const resources = (Array.isArray(stop?.resources) ? stop.resources : []).flatMap((resource) => {
      const urlText = typeof resource === 'string' ? resource : resource?.url;
      try {
        const url = new URL(urlText);
        if (url.protocol !== 'https:') return [];
        const isYoutube = url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be');
        const detectedType = isYoutube ? 'video' : (resource?.type || 'documentation');
        return [{ 
          title: String(resource?.title || `Free ${title} resource`).slice(0, 120), 
          url: url.toString(),
          type: detectedType
        }];
      } catch { return []; }
    }).slice(0, 10);

    // Ensure at least one YouTube video link exists if not provided
    const hasVideo = resources.some((r) => r.type === 'video' || r.url.includes('youtube.com'));
    if (!hasVideo) {
      resources.push({
        title: `${title} Video Tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} tutorial video`)}`,
        type: 'video'
      });
    }

    if (!resources.some((r) => r.type === 'documentation' || !r.url.includes('youtube.com'))) {
      resources.unshift({
        title: `${title} Official Documentation & Guide`,
        url: `https://www.google.com/search?q=${encodeURIComponent(`${title} documentation tutorial`)}`,
        type: 'documentation'
      });
    }
    const priority = String(stop?.priority || 'medium').toLowerCase();
    return {
      id, title, track_id: cleanText(stop?.track_id, `track-${Math.floor(index / 4) + 1}`),
      description: cleanText(stop?.description, `Develop and demonstrate ${title}.`).slice(0, 900),
      skills: normalizeStringList(stop?.skills, title),
      topics: normalizeStringList(stop?.topics, `Foundations and applied practice in ${title}`),
      resources, tasks,
      duration_days: Math.max(1, Math.min(365, Math.round(Number(stop?.duration_days) || 14))),
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      prerequisites: [],
      completion_criteria: cleanText(stop?.completion_criteria, 'Complete the tasks and demonstrate the result with a practical example.').slice(0, 700),
      project: cleanText(stop?.project, `Create a portfolio artifact demonstrating ${title}.`).slice(0, 300),
      project_id: stop?.project_id ? String(stop.project_id) : null,
      status: 'pending',
    };
  });
  sourceStops.forEach((source, index) => {
    const earlier = new Set(stops.slice(0, index).map((stop) => stop.id));
    stops[index].prerequisites = (Array.isArray(source?.prerequisites) ? source.prerequisites : [])
      .map((id) => originalIds.get(String(id)) || String(id))
      .filter((id, position, all) => earlier.has(id) && all.indexOf(id) === position);
  });
  addRequirementCoverageStops(stops, analysis, profile);
  addDepthStops(stops, analysis, profile, minimumStops);
  ensureComprehensiveTasks(stops);

  const projectStops = new Map(stops.filter((stop) => stop.project_id).map((stop) => [stop.project_id, stop]));
  const projects = (Array.isArray(value?.projects) ? value.projects : []).slice(0, 3).map((project, index) => {
    const id = String(project.id || `project-${index + 1}`);
    const stop = projectStops.get(id);
    return {
      id,
      title: cleanText(project.title, `Portfolio project ${index + 1}`).slice(0, 140),
      description: cleanText(project.description).slice(0, 700),
      skills: normalizeStringList(project.skills, profile.dream_job_role || 'Target role skills'),
      deliverables: normalizeStringList(project.deliverables, 'Working code, tests, and project documentation'),
      completion_criteria: cleanText(project.completion_criteria, 'Publish reproducible work with tests and an explanation.').slice(0, 700),
      stop_id: stop?.id || null,
    };
  });

  const sourceTracks = Array.isArray(value?.tracks) ? value.tracks : [];
  const trackById = new Map(sourceTracks.map((track, index) => {
    const id = cleanText(track?.id, `track-${index + 1}`);
    return [id, {
      id,
      title: cleanText(track?.title, `Learning path ${index + 1}`).slice(0, 140),
      goal: cleanText(track?.goal, 'Build practical skills through focused study and coding exercises.').slice(0, 500),
      priority: ['high', 'medium', 'low'].includes(String(track?.priority).toLowerCase()) ? String(track.priority).toLowerCase() : 'medium',
      skills: normalizeStringList(track?.skills, 'Target role skills'),
    }];
  }));
  for (const stop of stops) {
    if (!trackById.has(stop.track_id)) {
      trackById.set(stop.track_id, {
        id: stop.track_id,
        title: stop.track_id === 'portfolio-track' ? 'Portfolio projects' : `Learning path ${trackById.size + 1}`,
        goal: stop.description,
        priority: stop.priority,
        skills: [],
      });
    }
    const track = trackById.get(stop.track_id);
    track.skills = [...new Set([...track.skills, ...(stop.skills || [])])];
  }
  const tracks = [...trackById.values()].map((track) => ({
    ...track,
    milestone_ids: stops.filter((stop) => stop.track_id === track.id).map((stop) => stop.id),
  })).filter((track) => track.milestone_ids.length);

  return {
    title: cleanText(value?.title, `Route to ${profile.dream_job_role || 'your target role'}`).slice(0, 160),
    description: cleanText(value?.description, 'A personalized, multi-stage learning route based on the target role and resume evidence.').slice(0, 900),
    tracks,
    stops,
    projects,
  };
}

function normalizeTask(task, stopId, taskIndex, stopTitle) {
  const title = cleanText(task?.title || task?.task, `Complete a ${stopTitle} practice task`).slice(0, 220);
  const kind = ['code', 'study', 'project', 'review'].includes(String(task?.kind).toLowerCase()) ? String(task.kind).toLowerCase() : 'study';
  const taskValue = {
    id: `${stopId}-task-${taskIndex + 1}`,
    title,
    kind,
    done: Boolean(task?.done),
  };
  if (kind === 'code' || task?.code_prompt || task?.starter_code) {
    taskValue.kind = 'code';
    taskValue.language = cleanText(task.language, 'Python').slice(0, 40);
    taskValue.code_prompt = cleanText(task.code_prompt, `Write and test a small program that completes this exercise: ${title}`).slice(0, 1200);
    taskValue.starter_code = cleanText(task.starter_code, '# TODO: implement the exercise\n').slice(0, 3000);
    taskValue.expected_behavior = cleanText(task.expected_behavior, 'The solution handles normal, empty, and invalid inputs as appropriate.').slice(0, 800);
    taskValue.validation_steps = normalizeStringList(task.validation_steps, 'Run the code and verify a normal and an edge-case input.');
  }
  return taskValue;
}

function ensureComprehensiveTasks(stops) {
  for (const stop of stops) {
    const tasks = Array.isArray(stop.tasks) ? stop.tasks.slice(0, 12) : [];
    while (tasks.length < 5) {
      const index = tasks.length + 1;
      tasks.push({
        id: `${stop.id}-task-${index}`,
        title: `Practice and review ${stop.skills?.[0] || stop.title}: activity ${index}`,
        kind: 'study',
        done: false,
      });
    }
    for (const task of tasks) {
      task.kind = ['code', 'study', 'project', 'review'].includes(task.kind) ? task.kind : 'study';
    }
    let codeTasks = tasks.filter((task) => task.kind === 'code' || task.code_prompt).length;
    for (const task of tasks) {
      if (codeTasks >= 2) break;
      if (task.kind === 'code' || task.code_prompt) continue;
      task.kind = 'code';
      task.title = `Code practice: ${task.title}`.slice(0, 220);
      codeTasks += 1;
    }
    stop.tasks = tasks.map((task, index) => normalizeTask(task, stop.id, index, stop.title));
  }
}

function addRequirementCoverageStops(stops, analysis, profile) {
  const requirements = (analysis.job_skill_match?.requirements || [])
    .filter((item) => item.candidate_score < 70);
  const covered = new Set(stops.flatMap((stop) => stop.skills || []).map(normalizeSkill));
  const uncovered = requirements.filter((item) => !covered.has(normalizeSkill(item.skill)));
  const groups = [];
  for (let index = 0; index < uncovered.length; index += 4) groups.push(uncovered.slice(index, index + 4));
  for (const group of groups) {
    const id = `stop-${stops.length + 1}`;
    const previous = stops.at(-1)?.id;
    const skills = group.map((item) => item.skill);
    const title = `Hirebase skill practice: ${skills.join(', ')}`.slice(0, 150);
    const skillPhrase = skills.join(', ');
    stops.push({
      id,
      track_id: 'additional-requirements',
      title,
      description: `Build practical experience with the job requirements ${skillPhrase} identified in current Hirebase postings.`,
      skills,
      topics: skills.flatMap((skill) => [`${skill} foundations`, `${skill} applied practice`, `${skill} testing`]),
      resources: [{ title: `Free learning resources for ${skillPhrase}`, url: `https://www.google.com/search?q=${encodeURIComponent(`free ${skillPhrase} course`)}` }],
      tasks: [
        { id: `${id}-task-1`, title: `Study ${skillPhrase} foundations and core terminology.`, kind: 'study' },
        { id: `${id}-task-2`, title: `Code a focused exercise using ${skillPhrase}.`, kind: 'code' },
        { id: `${id}-task-3`, title: `Test an applied example for ${skillPhrase}.`, kind: 'code' },
        { id: `${id}-task-4`, title: `Document evidence and limitations for ${skillPhrase}.`, kind: 'review' },
        { id: `${id}-task-5`, title: `Apply ${skillPhrase} in a small project.`, kind: 'project' },
      ],
      duration_days: 21,
      priority: group.some((item) => item.posting_count >= 3) ? 'high' : 'medium',
      prerequisites: previous ? [previous] : [],
      completion_criteria: `Complete the exercises and publish a project artifact demonstrating ${skillPhrase}.`,
      project: `Add a portfolio feature using ${skillPhrase}.`,
      status: 'pending',
    });
  }
}

function addDepthStops(stops, analysis, profile, minimumStops) {
  const gaps = (analysis.job_skill_match?.requirements || [])
    .filter((item) => item.candidate_score < 70)
    .sort((a, b) => b.posting_count - a.posting_count || a.candidate_score - b.candidate_score);
  const categories = (analysis.skill_analysis || [])
    .filter((item) => item.candidate_score === null || item.candidate_score < item.target_score)
    .map((item) => item.category);
  const targets = gaps.length ? gaps.map((item) => item.skill) : categories.length ? categories : [profile.dream_job_role || 'Target role skills'];
  const phases = ['focused practice', 'integrated project', 'review and explain', 'interview application'];
  let cursor = 0;
  while (stops.length < minimumStops) {
    const target = targets[cursor % targets.length];
    const phase = phases[Math.floor(cursor / targets.length) % phases.length];
    const id = `stop-${stops.length + 1}`;
    const previous = stops.at(-1)?.id;
    stops.push({
      id,
      track_id: 'extended-practice',
      title: `${target} - ${phase}`.slice(0, 150),
      description: `Apply ${target} in the ${phase} stage of the ${profile.dream_job_role || 'target role'} plan.`,
      skills: [target],
      topics: [`${target} review`, `${target} ${phase}`, 'Self-assessment and feedback'],
      resources: [{ title: `Free ${target} learning resources`, url: `https://www.google.com/search?q=${encodeURIComponent(`free ${target} practice course`)}` }],
      tasks: [
        { id: `${id}-task-1`, title: `Review important ${target} concepts.`, kind: 'study' },
        { id: `${id}-task-2`, title: `Code a timed hands-on ${target} exercise.`, kind: 'code' },
        { id: `${id}-task-3`, title: `Test the ${target} exercise with edge cases.`, kind: 'code' },
        { id: `${id}-task-4`, title: `Explain decisions and record feedback.`, kind: 'review' },
        { id: `${id}-task-5`, title: `Update portfolio evidence for ${target}.`, kind: 'project' },
      ],
      duration_days: 10,
      priority: cursor < 4 ? 'high' : 'medium',
      prerequisites: previous ? [previous] : [],
      completion_criteria: `Finish the exercise, review feedback, and publish evidence of ${target}.`,
      project: `Extend a portfolio project to demonstrate ${target} at the ${phase} level.`,
      status: 'pending',
    });
    cursor += 1;
  }
}

function normalizeStringList(value, fallback) {
  const values = Array.isArray(value) ? value : [];
  const clean = values.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 20);
  return clean.length ? clean : [fallback];
}

function validateRoadmap(value) {
  if (!value || !Array.isArray(value.stops) || !value.stops.length) {
    throw Object.assign(Error('AI returned an invalid roadmap.'), { statusCode: 502, publicMessage: 'The AI returned an empty roadmap. Click Generate roadmap again.' });
  }
  if (value.mode === 'live' && (!Array.isArray(value.projects) || value.projects.length < 2 || value.projects.length > 3)) {
    throw Object.assign(Error('The generated roadmap must include two or three portfolio projects.'), { statusCode: 502, publicMessage: 'The AI roadmap did not include the required two or three project plans. Generate the roadmap again.' });
  }
  const ids = new Set(value.stops.map((stop) => stop.id));
  if (ids.size !== value.stops.length) throw Object.assign(Error('Roadmap stop IDs must be unique.'), { statusCode: 502, publicMessage: 'The generated roadmap had duplicate milestones. Click Generate roadmap again.' });
  if (Array.isArray(value.tracks)) {
    const trackIds = new Set(value.tracks.map((track) => track.id));
    if (trackIds.size !== value.tracks.length || value.tracks.some((track) => !track.id || !Array.isArray(track.milestone_ids))) {
      throw Object.assign(Error('Roadmap learning paths are invalid.'), { statusCode: 502, publicMessage: 'The generated roadmap has invalid learning paths. Click Generate roadmap again.' });
    }
    for (const stop of value.stops) {
      const parentTrack = value.tracks.find((track) => track.id === stop.track_id);
      if (!parentTrack || !parentTrack.milestone_ids.includes(stop.id)) {
        throw Object.assign(Error('Every milestone must belong to a roadmap learning path.'), { statusCode: 502, publicMessage: 'A roadmap milestone was not attached to its learning path. Click Generate roadmap again.' });
      }
    }
  }
  for (const [index, stop] of value.stops.entries()) {
    if (!stop.id || !Array.isArray(stop.tasks) || stop.tasks.length < 5 || !Array.isArray(stop.prerequisites) || !stop.prerequisites.every((id) => ids.has(id) && value.stops.findIndex((item) => item.id === id) < index)) {
      throw Object.assign(Error('Roadmap prerequisites must refer to earlier stops and each stop must have at least five tasks.'), { statusCode: 502, publicMessage: 'The generated roadmap had incomplete tasks or invalid milestone dependencies. Click Generate roadmap again.' });
    }
    const taskIds = stop.tasks.map((task) => task.id);
    if (taskIds.some((id) => !id) || new Set(taskIds).size !== taskIds.length) throw Object.assign(Error('Roadmap task IDs must be unique.'), { statusCode: 502, publicMessage: 'The generated roadmap had duplicate tasks. Click Generate roadmap again.' });
    if (stop.tasks.filter((task) => task.kind === 'code' && task.code_prompt).length < 2) {
      throw Object.assign(Error('Each roadmap milestone needs at least two code exercises.'), { statusCode: 502, publicMessage: 'A roadmap milestone is missing its code practice exercises. Generate the roadmap again.' });
    }
    for (const resource of stop.resources || []) {
      try { if (new URL(resource.url).protocol !== 'https:') throw new Error('invalid'); }
      catch { throw Object.assign(Error('Roadmap resource URLs must use HTTPS.'), { statusCode: 502, publicMessage: 'The generated roadmap contained an invalid learning resource. Click Generate roadmap again.' }); }
    }
  }
  for (const project of value.projects || []) {
    if (!project.stop_id || !value.stops.some((stop) => stop.id === project.stop_id && stop.project_id === project.id)) {
      throw Object.assign(Error('Each portfolio project must have a tracked roadmap milestone.'), { statusCode: 502, publicMessage: 'A portfolio project is missing its progress-tracked milestone. Generate the roadmap again.' });
    }
  }
  return value;
}

module.exports = { generateRoadmap, validateRoadmap, normalizeRoadmap, ROADMAP_SCHEMA, PLAN_SCHEMA };

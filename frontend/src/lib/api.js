const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/career';

/**
 * Upload resume (PDF, DOCX, or TXT)
 * Sends multipart/form-data to POST /api/career/upload-resume
 */
export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE_URL}/upload-resume`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to parse resume.');
  }
  return data;
}

/**
 * Trigger Skill Gap Analysis
 * Sends JSON to POST /api/career/analyze-skills
 */
export async function analyzeSkills(profile = {}) {
  const res = await fetch(`${API_BASE_URL}/analyze-skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to analyze skills.');
  }
  return data;
}

/**
 * Generate Learning Roadmap
 * Sends POST /api/career/generate-roadmap
 */
export async function generateRoadmap() {
  const res = await fetch(`${API_BASE_URL}/generate-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate roadmap. Please run skill analysis first.');
  }
  return data;
}

/**
 * Update individual task progress
 * Sends PATCH /api/career/progress/task/:taskId
 * Body: { done: boolean }
 */
export async function updateTaskProgress(taskId, done) {
  const res = await fetch(`${API_BASE_URL}/progress/task/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update task.');
  }
  return data;
}

/**
 * Fetch Recommended Jobs
 * Sends GET /api/career/recommended-jobs
 */
export async function getRecommendedJobs() {
  const res = await fetch(`${API_BASE_URL}/recommended-jobs`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch job recommendations.');
  }
  return data;
}

/**
 * Force Refresh Job Listings from Hirebase
 * Sends POST /api/career/refresh-jobs (bypasses 6-hour cache)
 */
export async function refreshJobs() {
  const res = await fetch(`${API_BASE_URL}/refresh-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to refresh job listings from Hirebase.');
  }
  return data;
}

/**
 * Get the full user career state from backend
 * (Includes saved profile, resume, analysis, roadmap, progress, and jobs)
 */
export async function getCareerState() {
  const res = await fetch(`${API_BASE_URL}/state`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch career state.');
  }
  return data;
}

/**
 * Health check
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

import { supabase } from './supabase';
import config from './config';

const API_BASE_URL = config.apiBaseUrl;

/**
 * Get the current Supabase session access token (JWT).
 * Returns the token string or null if not logged in.
 */
async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Build headers with Authorization bearer token when available.
 */
async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  const headers = { ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Upload resume (PDF, DOCX, or TXT)
 * Sends multipart/form-data to POST /api/career/upload-resume
 */
export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);

  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/upload-resume`, {
    method: 'POST',
    headers,
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
  const headers = await authHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/analyze-skills`, {
    method: 'POST',
    headers,
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
  const headers = await authHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/generate-roadmap`, {
    method: 'POST',
    headers,
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
  const headers = await authHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/progress/task/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers,
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
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/recommended-jobs`, { headers });
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
  const headers = await authHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/refresh-jobs`, {
    method: 'POST',
    headers,
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
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/state`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch career state.');
  }
  return data;
}

/**
 * Generate Milestone Exam in Safe Exam Browser
 * Sends POST /api/career/exam/generate
 * Body: { milestoneId, questionCount, difficulty }
 */
export async function generateMilestoneExam(milestoneId, questionCount = 10, difficulty = 'medium') {
  const headers = await authHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/exam/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ milestoneId, questionCount, difficulty }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate milestone exam.');
  }
  return data;
}

/**
 * Check Milestone Exam Status (Score, Pass status)
 * Sends GET /api/career/exam/status/:milestoneId
 */
export async function checkMilestoneExamStatus(milestoneId) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/exam/status/${encodeURIComponent(milestoneId)}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to check exam status.');
  }
  return data;
}

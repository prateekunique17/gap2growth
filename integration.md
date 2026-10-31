# Gap2Growth Full-Stack Integration Guide

This guide walks you step-by-step through connecting the **Express.js Career Roadmap Backend** (`backend/backend copy/`) with the **React + Vite Frontend** (`frontend/`).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          React Frontend (Vite)         │
                      │          http://localhost:5173         │
                      └───────────────────┬────────────────────┘
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            │                                                           │
            ▼                                                           ▼
┌─────────────────────────┐                                 ┌─────────────────────────┐
│     Supabase Auth       │                                 │   Career Roadmap API    │
│  (Session, Google,      │                                 │   (Express + Gemini)    │
│   GitHub, Email)        │                                 │  http://localhost:5000  │
└─────────────────────────┘                                 └───────────┬─────────────┘
                                                                        │
                                       ┌────────────────────────────────┴───────────────────────────────┐
                                       ▼                                ▼                               ▼
                             [Resume Parser]                  [Skill Analyzer]                 [Roadmap & Jobs]
                              (pdf-parse)                      (Gemini AI)                     (Milestones/Matches)
```

---

## Step 1: Clean Up & Prepare the Backend Folder

The folder name `backend copy` should ideally be renamed to `api` or `server` for clarity.

### Option A: Rename to `backend/api` (Recommended)
```powershell
Rename-Item -Path "c:\Users\HP\OneDrive\Documents\Gap2Growth2\backend\backend copy" -NewName "api"
```

### Option B: Keep as-is
If you keep the folder as `backend copy`, navigate into it:
```powershell
cd "c:\Users\HP\OneDrive\Documents\Gap2Growth2\backend\backend copy"
```

---

## Step 2: Configure Backend Environment Variables

1. Open `backend/backend copy/.env` (or copy `.env.example` to `.env`).
2. Set your environment variables:

```env
PORT=5000
HOST=127.0.0.1
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Set to false to use live Gemini API; true for offline mock data
AI_DEMO_MODE=true

# If using live Gemini AI, provide your key from Google AI Studio:
# GEMINI_API_KEY=your_gemini_api_key_here
# GEMINI_MODEL=gemini-1.5-flash
```

3. Install backend dependencies (if not already installed):
```powershell
cd "c:\Users\HP\OneDrive\Documents\Gap2Growth2\backend\backend copy"
npm install
```

4. Start the backend server:
```powershell
npm start
```
*You should see:*
```
Career Roadmap API listening at http://127.0.0.1:5000
AI mode: demo
```

---

## Step 3: Configure Frontend Environment Variables

Add the backend API URL to your `frontend/.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://fsxooysamvccofwoineb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NYOYTXhtkl_HVMNwJenZmg_yn7J-hYo
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_NYOYTXhtkl_HVMNwJenZmg_yn7J-hYo

# Career Roadmap Backend API
VITE_API_BASE_URL=http://localhost:5000/api/career
```

---

## Step 4: Frontend API Client Setup

Create a helper file at `frontend/src/lib/api.js` to manage calls to the backend:

```javascript
// frontend/src/lib/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/career';

/**
 * Upload resume (PDF or DOCX)
 */
export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE_URL}/upload-resume`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to upload resume');
  }
  return res.json();
}

/**
 * Trigger Skill Gap Analysis
 */
export async function analyzeSkills(profileData) {
  const res = await fetch(`${API_BASE_URL}/analyze-skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to analyze skills');
  }
  return res.json();
}

/**
 * Generate Learning Roadmap
 */
export async function generateRoadmap() {
  const res = await fetch(`${API_BASE_URL}/generate-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate roadmap');
  }
  return res.json();
}

/**
 * Fetch Recommended Jobs
 */
export async function getRecommendedJobs() {
  const res = await fetch(`${API_BASE_URL}/recommended-jobs`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch jobs');
  }
  return res.json();
}

/**
 * Update Task Completion Status
 */
export async function updateTaskProgress(taskId, done) {
  const res = await fetch(`${API_BASE_URL}/progress/task/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update task');
  }
  return res.json();
}

/**
 * Fetch Current User State (Profile, Resume, Analysis, Roadmap)
 */
export async function getCareerState() {
  const res = await fetch(`${API_BASE_URL}/state`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch state');
  }
  return res.json();
}
```

---

## Step 5: Connecting Views to the Backend Endpoints

### 1. Onboarding Page (`/onboarding`)
- **Step 6 (Resume Upload):** When the user drops their PDF/DOCX resume, call `uploadResume(file)`.
- Upon success, call `analyzeSkills({ dream_job_role: targetRole, dream_company: targetCompanies[0] })`.
- Redirect to `/dashboard`.

### 2. Skill Analysis View (`/dashboard?tab=analyzer`)
- When the user selects a different target role or clicks "Re-run Analysis", call `analyzeSkills({ dream_job_role: selectedRole })`.
- Render the real returned `skills_matched`, `skills_missing`, and `overall_match_percentage`.

### 3. Roadmap View (`/dashboard?tab=roadmap`)
- Call `generateRoadmap()` or `getCareerState()` on mount.
- When the user checks a task box, call `updateTaskProgress(task.id, !task.done)` so the server updates the progress state.

### 4. Job Recommendations View (`/dashboard?tab=jobs`)
- Call `getRecommendedJobs()` on mount.
- Display real match rankings, company names, requirements, and missing attributes.

---

## Step 6: Running the Full Application

To run both services side-by-side during development:

### Terminal 1: Backend API
```powershell
cd "c:\Users\HP\OneDrive\Documents\Gap2Growth2\backend\backend copy"
npm start
# Runs on http://127.0.0.1:5000
```

### Terminal 2: React Frontend
```powershell
cd "c:\Users\HP\OneDrive\Documents\Gap2Growth2\frontend"
npm run dev
# Runs on http://localhost:5173
```

---

## Verification Checklist

- [ ] Backend health endpoint responds: `curl http://127.0.0.1:5000/health` $\rightarrow$ `{"status":"ok"}`
- [ ] Resume upload parses text without crashing (`/api/career/upload-resume`).
- [ ] Supabase authentication functions smoothly on `/auth`.
- [ ] Dashboard displays live data loaded from the backend API.
- [ ] Dark/Light mode renders consistently across public landing, auth, onboarding, and dashboard views.


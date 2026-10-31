# Gap2Growth

> Bridging the distance between the skills you have and the role you want.

Gap2Growth is an AI-powered SaaS web application designed to help job seekers identify their precise skill gaps for target positions, generate tailored milestone-driven learning roadmaps, and discover ranked job recommendations based on real skill match metrics.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Journey](#user-journey)
- [System Architecture](#system-architecture)
- [AI & NLP Pipeline](#ai--nlp-pipeline)
- [Database Schema (Supabase)](#database-schema-supabase)
- [Project Structure & Routes](#project-structure--routes)
- [Implementation Roadmap](#implementation-roadmap)
- [Risks & Mitigation Strategies](#risks--mitigation-strategies)
- [Getting Started](#getting-started)

---

## 🚀 Overview

Many job seekers struggle to know why they aren't landing interviews or what specific skills they are missing for their dream jobs. **Gap2Growth** eliminates the guesswork:
1. **Parses & Extracts** skills, education, and experience from resumes.
2. **Analyzes Skill Gaps** against target roles and benchmark expectations.
3. **Generates Actionable Roadmaps** with estimated learning hours and curated resources.
4. **Matches Jobs Intelligently** using vector embeddings and semantic ranking.

---

## ✨ Key Features

- **Intuitive Onboarding & Diagnostic Quiz:** 7–8 questions assessing domain preferences, current level, and target companies.
- **Smart Resume Parser:** Hybrid extraction leveraging PyMuPDF / python-docx, spaCy entity recognition, and high-speed LLM structuring (Groq / Gemini).
- **Interactive Parsed Data Review:** User-editable review flow to correct or supplement parsed skills and experience before saving.
- **Skill Gap Analyzer:** Dynamic comparison between current competencies and target role requirements, generating match scores and gap classifications (matched, weak, missing).
- **Personalized Learning Roadmaps:** Step-by-step milestones ordered by priority, tailored to weekly availability and learning style, complete with progress tracking (`done` state).
- **Semantic Job Matching:** Vector similarity matching (embeddings + cosine similarity) with LLM-assisted re-ranking.

---

## 🔄 User Journey

```
[ Landing Page (/) ]
         │
         ▼
[ Authentication (/login, /signup) ] (Email / Google via Supabase Auth)
         │
         ▼
[ Onboarding Quiz (/onboarding) ] (7-8 preference & skill questions)
         │
         ▼
[ Resume Upload (/resume) ] (PDF / DOCX uploaded to Supabase Storage)
         │
         ▼
[ Parsing & Editable Review (/resume/processing) ] (spaCy + Groq/Gemini structuring)
         │
         ▼
[ Main Dashboard (/dashboard) ] (Profile summary, skill chips, progress chart)
         │
         ├───────────────────────────┬───────────────────────────┐
         ▼                           ▼                           ▼
[ Skill Analyzer (/analyzer) ]  [ Roadmap (/roadmap) ]   [ Job Matching (/jobs) ]
  • Role picker                   • Step-by-step path        • Ranked job cards
  • Matched vs. missing           • Curated resources        • Match percentages
  • Role strength score           • Track progress           • Gap-aware filter
```

---

## 🏗️ System Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS | UI components, forms, responsive layouts, data visualization via **Recharts** |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) | Google OAuth & Email/Password login, session cookie management |
| **Database** | [Supabase Postgres](https://supabase.com/database) | Relational storage with Row Level Security (RLS) policies |
| **File Storage** | [Supabase Storage](https://supabase.com/storage) | Secure private bucket for uploaded resumes (PDF / DOCX) |
| **NLP Microservice** | [Python](https://www.python.org/) + [FastAPI](https://fastapi.tiangolo.com/) | `/parse` endpoint, document text extraction & spaCy entity recognition |
| **LLMs & GenAI** | [Groq API](https://groq.com/) / [Google Gemini API](https://ai.google.dev/) | Structured JSON transformation, skill gap analysis, roadmap generation |
| **Deployment / Hosting** | Vercel & Render / Railway | Next.js on Vercel; Python FastAPI service hosted on Render or Railway |

---

## 🧠 AI & NLP Pipeline

```
[ PDF / DOCX Resume ]
         │
         ▼
[ Step 1: Text Extraction ] ──── PyMuPDF / python-docx
         │
         ▼
[ Step 2: Entity Recognition ] ── spaCy (en_core_web_lg + custom EntityRuler)
         │
         ▼
[ Step 3: Structuring ] ───────── Groq (Llama / Mixtral) -> Validated JSON
         │
         ▼
[ Step 4: Skill Normalization ] ─ Python + Taxonomy Table (e.g. "ReactJS" -> "React")
         │
         ▼
[ Step 5: Gap Analysis ] ──────── Google Gemini (Target role vs. user skill taxonomy)
         │
         ▼
[ Step 6: Roadmap Generation ] ── Gemini (Groq fast fallback) with milestone schedules
         │
         ▼
[ Step 7: Job Matching ] ──────── Vector Embeddings + Cosine Similarity + LLM re-rank
```

---

## 🗄️ Database Schema (Supabase)

All user-owned data is strictly protected using PostgreSQL Row Level Security (RLS).

| Table | Key Columns | Description |
|---|---|---|
| `profiles` | `id`, `full_name`, `target_role`, `target_companies`, `hours_per_week` | Created on user signup |
| `quiz_responses` | `user_id`, `question_key`, `answer`, `created_at` | Stores onboarding questionnaire answers |
| `resumes` | `id`, `user_id`, `file_path`, `status`, `uploaded_at` | Tracks uploaded files (`uploaded`, `parsing`, `parsed`, `failed`) |
| `parsed_profiles` | `resume_id`, `raw_json`, `education`, `experience`, `projects` | Intermediate data, editable by the user post-parsing |
| `skills` | `id`, `name`, `category`, `aliases` | Shared standardized skills taxonomy |
| `user_skills` | `user_id`, `skill_id`, `level`, `source` | Skills mapped from resume, quiz, or manual entry |
| `skill_analyses` | `id`, `user_id`, `target_role`, `matched`, `missing`, `score` | Historical and active gap analysis results |
| `roadmaps` | `id`, `user_id`, `analysis_id`, `title`, `status` | Learning roadmap tied to an analysis run |
| `roadmap_items` | `roadmap_id`, `skill_id`, `order`, `resource_url`, `est_hours`, `done_at` | Individual actionable milestones driving progress charts |
| `jobs` | `id`, `title`, `company`, `location`, `description`, `embedding`, `source_url` | Global indexed job postings |
| `job_matches` | `user_id`, `job_id`, `match_pct`, `missing_skills` | Real-time computed job recommendation matches |

---

## 🗺️ Application Routes

| Route | Stage | Primary Components & Functionality |
|---|---|---|
| `/` | Landing | Hero section, feature breakdown, pricing, CTA |
| `/login`, `/signup` | Auth | Email sign-in, Google OAuth, password reset |
| `/onboarding` | Quiz | Multi-step quiz (7–8 questions) with progress indicator |
| `/resume` | Upload | Drag-and-drop resume upload with validation |
| `/resume/processing` | Parsing | Real-time parsing status and review/editing screen |
| `/dashboard` | Dashboard | User overview card, skill chips, progress chart, next actions |
| `/analyzer` | Gap Analyzer | Target role selection, matched/missing skill visualizer, strength score |
| `/roadmap` | Roadmap | Milestone progression, time allocations, resource links, task completion |
| `/jobs` | Job Matches | Ranked job listings, match percentage badges, skill deficiency breakdown |

---

## 📅 Build Phases

- [x] **Phase 1: Foundation** — Next.js project setup, Tailwind CSS styling, Supabase authentication & base tables with RLS.
- [ ] **Phase 2: Onboarding & Resume Service** — Multi-step quiz UI, resume storage buckets, FastAPI microservice with spaCy text extraction.
- [ ] **Phase 3: Parsing & User Dashboard** — Groq-powered structuring, skill taxonomy normalization, editable parsed review screen, and analytics dashboard with Recharts.
- [ ] **Phase 4: Analyzer & Roadmap Engine** — Gemini gap analysis integration, roadmap creation, milestone completion tracking.
- [ ] **Phase 5: Job Matching System** — Job data ingestion, vector embeddings generation, cosine similarity matching, and interactive job cards.
- [ ] **Phase 6: Polish & Production Launch** — Rate limiting, caching, error boundaries, privacy compliance, and production deployment on Vercel and Render.

---

## ⚠️ Risks & Considerations

1. **Resume Privacy & Compliance:** Resumes contain PII. Private storage buckets, RLS policies, explicit deletion triggers, and verification of LLM zero-data-retention terms are enforced.
2. **API Rate Limits & Reliability:** Both Groq and Gemini free tiers are subject to rate constraints; request queuing, response caching, and automated fallback logic between Groq and Gemini are implemented.
3. **Parsing Accuracy for Diverse Layouts:** Unconventional multi-column resume formats may challenge NLP extraction. The **editable review screen** (`/resume/processing`) is mandatory so users can curate their parsed profile.
4. **Job Data Sourcing:** Selecting job board APIs or scraping pipelines that provide adequate localized coverage (e.g., India/regional markets).

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+) & npm/pnpm/yarn
- Python 3.10+
- Supabase account & project
- Groq and/or Google Gemini API keys

### Environment Variables

Create `.env.local` for the frontend and `.env` for the Python NLP service:

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
FASTAPI_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

**NLP Service (`.env`):**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
```

---

## 👤 Author & Credits

- **Project Lead / Product:** @Prateek
- **Project:** Gap2Growth
- **Planning Date:** October 31, 2026


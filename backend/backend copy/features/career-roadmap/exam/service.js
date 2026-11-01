const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sessionsDir = path.join(__dirname, '..', 'data', 'exam-sessions');
try {
  fs.mkdirSync(sessionsDir, { recursive: true });
} catch {}

const examSessions = new Map();

function saveSessionToDisk(token, session) {
  try {
    const file = path.join(sessionsDir, `${token}.json`);
    fs.writeFileSync(file, JSON.stringify(session), 'utf8');
  } catch (err) {
    console.warn('[career-exam] Failed to save session to disk:', err.message);
  }
}

function loadSessionFromDisk(token) {
  try {
    const file = path.join(sessionsDir, `${token}.json`);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      examSessions.set(token, data);
      return data;
    }
  } catch (err) {
    console.warn('[career-exam] Failed to load session from disk:', err.message);
  }
  return null;
}

function deleteSessionFromDisk(token) {
  try {
    const file = path.join(sessionsDir, `${token}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function isSeb(req) {
  const userAgent = req.headers['user-agent'] || '';
  return /\bSEB\b/i.test(userAgent);
}

/**
 * Generate multiple-choice question batches using Gemini
 */
async function generateExamBatch(topic, skills = [], topics = [], difficulty = 'medium', batchCount = 10, batchIndex = 1, batchTotal = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const skillStr = skills.length ? ` focusing on skills: ${skills.join(', ')}` : '';
  const topicStr = topics.length ? ` and concepts: ${topics.join(', ')}` : '';
  const prompt = [
    `Create exactly ${batchCount} original ${difficulty} multiple-choice questions for the learning module: "${topic}"${skillStr}${topicStr}.`,
    `This is batch ${batchIndex} of ${batchTotal}. Vary the subtopics to ensure comprehensive coverage of the module.`,
    'Return JSON only, with no markdown, preamble, or text outside the JSON array.',
    'Each item must be an object with: question (string), options (array of exactly 4 strings), and answer (integer 0 to 3).',
    'Ensure questions test conceptual understanding, practical problem solving, and syntax/best practices correctly.'
  ].join(' ');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING' },
              options: { type: 'ARRAY', items: { type: 'STRING' } },
              answer: { type: 'INTEGER' }
            },
            required: ['question', 'options', 'answer']
          }
        },
        thinkingConfig: { thinkingLevel: 'low' },
        temperature: 0.5
      }
    })
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error?.message || `Gemini exam question generation failed (${res.status}).`);

  const text = result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed) || parsed.length !== batchCount || parsed.some(q => !q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.answer !== 'number')) {
    throw new Error(`Invalid questions batch returned by Gemini for ${topic}.`);
  }

  return parsed;
}

/**
 * Create a new exam session for a milestone
 */
async function createMilestoneExam({ candidateId, milestoneId, milestoneTitle, skills = [], topics = [], questionCount = 10, difficulty = 'medium' }) {
  const count = Math.max(5, Math.min(30, Number(questionCount) || 10));
  const batchSizes = Array.from({ length: Math.ceil(count / 10) }, (_, i) => Math.min(10, count - i * 10));

  const batches = await Promise.all(
    batchSizes.map((size, i) => generateExamBatch(milestoneTitle, skills, topics, difficulty, size, i + 1, batchSizes.length))
  );

  const questions = batches.flat().slice(0, count);
  const examToken = crypto.randomUUID();
  const durationSeconds = count * 75; // 75 seconds per question

  const session = {
    examToken,
    candidateId: candidateId || 'local-demo-user',
    milestoneId,
    milestoneTitle,
    skills,
    topics,
    questions: questions.map(({ question, options }) => ({ question, options })),
    answers: questions.map(q => q.answer),
    durationSeconds,
    issuedAt: Date.now(),
    startedAt: null,
  };

  examSessions.set(examToken, session);
  saveSessionToDisk(examToken, session);

  return {
    examToken,
    durationSeconds,
    questionCount: questions.length,
    milestoneId,
    milestoneTitle,
  };
}

/**
 * Generate SEB XML Config for the exam session
 */
function generateSebConfig(token, origin) {
  const exam = examSessions.get(token) || loadSessionFromDisk(token);
  if (!exam || Date.now() - exam.issuedAt > 4 * 60 * 60 * 1000) {
    return null;
  }

  const settings = {
    startURL: `${origin}/api/career/exam/seb-page?token=${encodeURIComponent(token)}`,
    quitURL: `${origin}/api/career/exam/seb-exit?token=${encodeURIComponent(token)}`,
    quitURLConfirm: false,
    allowQuit: false,
    allowSwitchToApplications: false,
    enableAltTab: false,
    enableCtrlEsc: false,
    enableAltF4: false,
    sebConfigPurpose: 1,
  };

  const xml = Object.entries(settings).map(([key, value]) =>
    `<key>${key}</key>${typeof value === 'boolean' ? `<${value ? 'true' : 'false'}/>` : `<string>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>`}`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>${xml}</dict></plist>`;
}

function getExamSession(token) {
  return examSessions.get(token) || loadSessionFromDisk(token);
}

function gradeAndCompleteExam(token, answers) {
  const exam = examSessions.get(token) || loadSessionFromDisk(token);
  if (!exam) return null;

  const score = exam.answers.reduce((acc, ans, i) => acc + (answers[i] === ans ? 1 : 0), 0);
  const total = exam.answers.length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= 75;

  const record = {
    examToken: token,
    candidateId: exam.candidateId,
    milestoneId: exam.milestoneId,
    milestoneTitle: exam.milestoneTitle,
    score,
    total,
    percentage,
    passed,
    submittedAt: new Date().toISOString(),
  };

  examSessions.delete(token);
  deleteSessionFromDisk(token);
  return record;
}

module.exports = {
  isSeb,
  createMilestoneExam,
  generateSebConfig,
  getExamSession,
  gradeAndCompleteExam,
};


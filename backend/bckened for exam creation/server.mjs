import { createServer } from 'node:http';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
try {
  const envText = await readFile(join(root, '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}
const publicDir = join(root, 'public');
const resultsFile = join(root, 'data', 'results.jsonl');
const port = Number(process.env.PORT || 3000);
const examSessions = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error('Request too large'); }
  return JSON.parse(raw || '{}');
}
function send(res, status, data) { res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' }); res.end(JSON.stringify(data)); }
function isSeb(req) { return /\bSEB\b/i.test(req.headers['user-agent'] || ''); }
async function generateQuestionBatch(topic, difficulty, batchCount, batchNumber, batchTotal) {
  const started=Date.now();
  const prompt=`Create exactly ${batchCount} original ${difficulty} Java multiple-choice questions about ${String(topic).slice(0,100)}. This is batch ${batchNumber} of ${batchTotal}; vary the Java subtopics to reduce repetition. Return JSON only, with no markdown, preamble, or text outside the JSON array. Each item must contain question (string), options (array of exactly 4 strings), and answer (integer from 0 to 3). Ensure every question and answer is technically correct.`;
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'ARRAY',items:{type:'OBJECT',properties:{question:{type:'STRING'},options:{type:'ARRAY',items:{type:'STRING'}},answer:{type:'INTEGER'}},required:['question','options','answer']}},thinkingConfig:{thinkingLevel:'low'},temperature:0.6}})
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error?.message||`Gemini batch ${batchNumber} failed.`);
  const text=result.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  const questions=JSON.parse(text);
  if(!Array.isArray(questions)||questions.length!==batchCount||questions.some(q=>typeof q.question!=='string'||!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string')||!Number.isInteger(q.answer)||q.answer<0||q.answer>3))throw new Error(`Gemini batch ${batchNumber} did not contain exactly ${batchCount} valid questions. Please try again.`);
  console.log(`Gemini batch ${batchNumber}/${batchTotal}: ${Date.now()-started} ms`);
  return questions;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && url.pathname === '/api/generate') {
    if (!process.env.GEMINI_API_KEY) return send(res, 503, { error:'Gemini is not configured. Set GEMINI_API_KEY on the server and restart it.' });
    try {
      const { topic = 'Core Java', count = 50, difficulty = 'mixed', candidateId = '' } = await body(req);
      if (!/^[a-zA-Z0-9_-]{2,40}$/.test(candidateId)) return send(res, 400, {error:'Invalid candidate ID.'});
      const questionCount=Number(count);
      if (!Number.isInteger(questionCount) || questionCount<10 || questionCount>50) return send(res,400,{error:'Choose between 10 and 50 questions.'});
      const batchSizes=Array.from({length:Math.ceil(questionCount/10)},(_,i)=>Math.min(10,questionCount-i*10));
      const batches=await Promise.all(batchSizes.map((size,i)=>generateQuestionBatch(topic,difficulty,size,i+1,batchSizes.length)));
      const questions=batches.flat(),selected=questions.slice(0,questionCount),examToken=randomUUID();
      const durationSeconds=questionCount*72;
      examSessions.set(examToken, { candidateId, topic:String(topic).slice(0,100), questions:selected.map(({question,options})=>({question,options})), answers:selected.map(q=>q.answer), durationSeconds, issuedAt:Date.now(), startedAt:null });
      send(res, 200, { questions:selected.map(({question,options})=>({question,options})), examToken, durationSeconds });
    } catch (e) { send(res, 400, { error:e.message || 'Could not generate questions.' }); }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/seb-exam') {
    try { const content=await readFile(join(publicDir,'seb-exam.html')); res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); res.end(content); }
    catch { res.writeHead(404); res.end('Exam page not found'); }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/seb-exit') {
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end('<!doctype html><meta charset="utf-8"><title>Exam finished</title><p>Exam submitted. Safe Exam Browser is closing and returning you to the portal.</p>');
    return;
  }
  const configMatch = url.pathname.match(/^\/api\/seb-config\/([a-f0-9-]+)\.seb$/i);
  if (req.method === 'GET' && configMatch) {
    const token=configMatch[1], exam=examSessions.get(token);
    if (!exam || Date.now()-exam.issuedAt > 4*60*60*1000) return send(res,404,{error:'Exam session not found or expired.'});
    const origin=`${url.protocol}//${req.headers.host}`;
    const settings={startURL:`${origin}/seb-exam?token=${encodeURIComponent(token)}`,quitURL:`${origin}/seb-exit?token=${encodeURIComponent(token)}`,quitURLConfirm:false,allowQuit:false,allowSwitchToApplications:false,enableAltTab:false,enableCtrlEsc:false,enableAltF4:false,sebConfigPurpose:1};
    const xml=Object.entries(settings).map(([key,value])=>`<key>${key}</key>${typeof value==='boolean'?`<${value?'true':'false'}/>`:`<string>${String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</string>`}`).join('');
    const plist=`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>${xml}</dict></plist>`;
    res.writeHead(200,{'content-type':'application/seb','content-disposition':'inline; filename="java-exam.seb"','cache-control':'no-store'}); res.end(plist);
    return;
  }
  const examMatch=url.pathname.match(/^\/api\/exam\/([a-f0-9-]+)$/i);
  if (req.method === 'GET' && examMatch) {
    if (!isSeb(req)) return send(res,403,{error:'Open this exam in Safe Exam Browser.'});
    const exam=examSessions.get(examMatch[1]);
    if (!exam || Date.now()-exam.issuedAt > 4*60*60*1000) return send(res,404,{error:'This exam session is not available.'});
    if (!exam.startedAt) exam.startedAt=Date.now();
    return send(res,200,{candidateId:exam.candidateId,topic:exam.topic,questions:exam.questions,durationSeconds:exam.durationSeconds,secondsRemaining:Math.max(0,exam.durationSeconds-Math.floor((Date.now()-exam.startedAt)/1000))});
  }
  if (req.method === 'POST' && url.pathname === '/api/results') {
    try {
      if (!isSeb(req)) return send(res,403,{error:'Submit this exam from Safe Exam Browser.'});
      const data = await body(req);
      const exam = examSessions.get(data.examToken);
      if (!exam || Date.now()-exam.issuedAt > 4*60*60*1000 || !Array.isArray(data.answers) || data.answers.length !== exam.answers.length) return send(res, 400, {error:'Invalid or expired exam session.'});
      const score = exam.answers.reduce((n, answer, i)=>n+(data.answers[i]===answer?1:0),0);
      const record = { candidateId:exam.candidateId, score, total:exam.answers.length, percentage:Math.round(score/exam.answers.length*100), submittedAt:new Date().toISOString(), topic:exam.topic };
      examSessions.delete(data.examToken);
      await mkdir(dirname(resultsFile), {recursive:true}); await appendFile(resultsFile, JSON.stringify(record)+'\n', 'utf8');
      send(res, 201, { saved:true, result:record });
    } catch { send(res, 400, {error:'Could not save this result.'}); }
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/results/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/results/'.length));
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(id)) return send(res, 400, {error:'Invalid candidate ID.'});
    try {
      const text = await readFile(resultsFile, 'utf8');
      const results = text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)).filter(r=>r.candidateId===id).reverse();
      return send(res, 200, {results});
    } catch { return send(res, 200, {results:[]}); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 404, {error:'Not found'});
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = normalize(join(publicDir, pathname));
  if (!file.startsWith(publicDir)) { res.writeHead(403); return res.end(); }
  try { const content = await readFile(file); res.writeHead(200, {'content-type':mime[extname(file)]||'application/octet-stream'}); res.end(content); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, () => console.log(`Java Exam Portal running at http://localhost:${port}`));

const express=require('express');const multer=require('multer');const crypto=require('crypto');const path=require('path');const fs=require('fs/promises');
const {extractText,parseResumeText,cleanResumeSkills}=require('../resume/parser');const {readState,updateState,clearState}=require('../storage');const {analyze,validateAnalysis}=require('../skillAnalysis/service');const {generateRoadmap,validateRoadmap}=require('../roadmap/service');const {getRecommendations,buildJobBenchmarks,buildRadarAttributes,profileCacheKey}=require('../jobRecommendations/service');
const {isSeb,createMilestoneExam,generateSebConfig,getExamSession,gradeAndCompleteExam}=require('../exam/service');
const { supabase } = require('../storage/supabaseStore');
const router=express.Router();const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024},fileFilter(_req,file,cb){const ext=file.originalname.toLowerCase().split('.').pop();cb(null,['pdf','docx','txt'].includes(ext));}});
const ROADMAP_GENERATOR_VERSION='comprehensive-multitrack-v2';
const ANALYSIS_VERSION='five-dimension-v2';
function userId(req){return String(req.user?.id||req.user?.userId||'local-demo-user');}
function requireUser(req,res,next){if(req.user?.id||req.user?.userId)return next();if(process.env.NODE_ENV==='production'||process.env.CAREER_DEMO_AUTH==='false')return res.status(401).json({error:'Authentication is required.'});req.user={id:'local-demo-user'};next();}
const defaults={dream_job_role:'Machine Learning Engineer',dream_company:'Google',location:'India',education_level:'Undergraduate',known_skills:['Python','SQL','NumPy','Pandas','Machine Learning'],experience_level:'Beginner'};
function safeProfile(body={}){const p={dream_job_role:body.dream_job_role??defaults.dream_job_role,dream_company:body.dream_company??defaults.dream_company,location:body.location??defaults.location,education_level:body.education_level??defaults.education_level,experience_level:body.experience_level??defaults.experience_level,known_skills:body.known_skills??defaults.known_skills};for(const k of ['dream_job_role','dream_company','location','education_level','experience_level'])if(typeof p[k]!=='string'||p[k].length>120)throw Object.assign(Error(`Invalid ${k}`),{statusCode:400});if(!Array.isArray(p.known_skills)||p.known_skills.length>80||p.known_skills.some(s=>typeof s!=='string'||s.length>80))throw Object.assign(Error('known_skills must be a list of short strings'),{statusCode:400});return p;}
router.get('/health',(_req,res)=>res.json({status:'ok',feature:'career-roadmap',storage:'local-json',ai_demo_mode:process.env.AI_DEMO_MODE!=='false'}));router.use(requireUser);
router.get('/state',async(req,res,next)=>{try{const s=await readState(userId(req));const analysisCurrent=s.analysis?.analysis_version===ANALYSIS_VERSION;const roadmap=analysisCurrent?s.roadmap:null;const profile=s.profile||defaults;res.json({profile,resume:s.resume?{resume_id:s.resume.resume_id,filename:s.resume.filename,parsed:cleanResumeSkills(s.resume.parsed)}:null,analysis:analysisCurrent?s.analysis:null,roadmap,progress:roadmap?progressOf(roadmap):null,jobs:s.jobs?.cache_key===profileCacheKey(profile)?s.jobs:null});}catch(e){next(e);}});
router.put('/profile',async(req,res,next)=>{try{const profile=safeProfile(req.body||{});let changed=false;await updateState(userId(req),s=>{if(JSON.stringify(s.profile||defaults)===JSON.stringify(profile))return s;changed=true;return{...s,profile,analysis:null,analysis_cache:null,roadmap:null,roadmap_cache:null};});res.json({profile,saved:true,changed});}catch(e){next(e);}});
router.post('/upload-resume',upload.single('resume'),async(req,res,next)=>{try{if(!req.file)return res.status(400).json({error:'Upload a PDF, DOCX, or TXT file using form field "resume".'});const ext=req.file.originalname.toLowerCase().split('.').pop();if(ext==='pdf'&&(req.file.size<4||req.file.buffer.subarray(0,4).toString()!=='%PDF'))return res.status(415).json({error:'File extension and content do not match.'});if(ext==='docx'&&(req.file.size<4||req.file.buffer.readUInt32LE(0)!==0x04034b50))return res.status(415).json({error:'Invalid DOCX file.'});const text=await extractText(req.file.buffer,req.file.originalname);if(text.trim().length<50)return res.status(422).json({error:'Could not extract enough text. Scanned PDFs need OCR before upload.'});const parsed=parseResumeText(text);delete parsed.extracted_text;const result={resume_id:crypto.randomUUID(),filename:req.file.originalname,content_type:ext,parsed_at:new Date().toISOString(),parsed};await updateState(userId(req),s=>({...s,resume:result,analysis:null,roadmap:null,profile:s.profile||defaults}));res.json(result);}catch(e){next(e);}});
router.post('/analyze-skills',async(req,res,next)=>{
  try {
    const id=userId(req),s=await readState(id);
    if(!s.resume)return res.status(409).json({error:'Upload a resume before skill analysis.'});
    const profile=safeProfile(req.body||{});
    let jobsState=s.jobs||null;
    try { jobsState=await getRecommendations({...s,profile},false); }
    catch(error) { console.warn('[career-roadmap] Hirebase benchmark unavailable:',error.statusCode||error.message); }
    const benchmarkSource=jobsState?.source==='Hirebase'&&jobsState.jobs?.length?'Hirebase':null;
    const benchmarks=benchmarkSource?(jobsState.requirement_benchmarks||buildJobBenchmarks(jobsState.jobs)):[];
    const parsed=cleanResumeSkills(s.resume.parsed);
    const requirementProfile=benchmarkSource?buildRadarAttributes(jobsState.jobs,parsed,profile,200):null;
    const requirementInventory=requirementProfile?.attributes||[];
    const chartAttributes=requirementInventory.slice(0,12);
    const requirements={
      source:benchmarkSource||'role taxonomy fallback',
      postings_sampled:benchmarkSource?jobsState.jobs.length:0,
      total_matching_jobs:benchmarkSource?jobsState.total_matching_jobs||jobsState.jobs.length:0,
      requirements_collected:requirementInventory.length,
      search_scope:benchmarkSource?jobsState.search_scope||null:null,
      data_quality:requirementProfile?.quality||null,
      inventory:requirementInventory.map(({name,posting_count,sample_size,demand_percent,sources})=>({name,posting_count,sample_size,demand_percent,sources})),
      note:benchmarkSource?'All unique skill and technology attributes found in the retrieved Hirebase postings are sent to Gemini for matching.':'Hirebase listings were unavailable, so requirements use the built-in role taxonomy.',
    };
    const cacheKey=crypto.createHash('sha256').update(JSON.stringify({analysis_version:ANALYSIS_VERSION,resume_id:s.resume.resume_id,profile,model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',ai_demo_mode:process.env.AI_DEMO_MODE!=='false',requirements,benchmarks,requirementInventory})).digest('hex');
    if(s.analysis&&s.analysis_cache===cacheKey)return res.json(s.analysis);
    const analysis=validateAnalysis(await analyze({...parsed,contact:undefined,extracted_text:undefined},profile,benchmarks,requirementInventory),parsed,profile,benchmarks,requirementInventory);
    analysis.mode=analysis.mode||'live';
    analysis.job_requirements=requirements;
    analysis.radar={source:chartAttributes.length?'Hirebase':'role taxonomy fallback',sample_size:chartAttributes.length?jobsState.jobs.length:0,attributes:chartAttributes,quality:requirementProfile?.quality||null};
    analysis.resume_snapshot={education:parsed.education?.entries||[],graduation_year:parsed.education?.graduation_year||null,languages:parsed.languages||[],skills:parsed.skills||[],projects:(parsed.projects||[]).slice(0,8),experience:(parsed.experience||[]).slice(0,8),certifications:(parsed.certifications||[]).slice(0,8),achievements:(parsed.achievements||[]).slice(0,8)};
    
    // Auto-generate learning roadmap alongside skill analysis
    let roadmap = null;
    let roadmapCacheKey = null;
    try {
      console.log('[career-roadmap] Auto-generating learning roadmap alongside skill analysis for:', profile.dream_job_role);
      const generated = validateRoadmap(await generateRoadmap(analysis, profile));
      roadmap = {
        ...generated,
        stops: generated.stops.map(stop => ({
          ...stop,
          status: 'pending',
          tasks: stop.tasks.map(t => ({ ...t, done: false }))
        }))
      };
      roadmapCacheKey = crypto.createHash('sha256').update(JSON.stringify({ version: ROADMAP_GENERATOR_VERSION, analysis })).digest('hex');
    } catch (roadmapError) {
      console.warn('[career-roadmap] Auto roadmap generation failed, user can retry manually:', roadmapError.message);
    }

    await updateState(id,current=>({...current,profile,resume:{...current.resume,parsed},jobs:jobsState||current.jobs,analysis,analysis_cache:cacheKey,roadmap:roadmap||current.roadmap,roadmap_cache:roadmapCacheKey||current.roadmap_cache}));
    res.json(analysis);
  } catch(e) { next(e); }
});
router.post('/generate-roadmap',async(req,res,next)=>{try{const id=userId(req),s=await readState(id);if(!s.analysis||s.analysis.analysis_version!==ANALYSIS_VERSION)return res.status(409).json({error:'Run skill analysis before generating a roadmap.'});const cacheKey=crypto.createHash('sha256').update(JSON.stringify({version:ROADMAP_GENERATOR_VERSION,analysis:s.analysis})).digest('hex'),cached=s.roadmap&&s.roadmap_cache===cacheKey;let roadmap=cached?s.roadmap:validateRoadmap(await generateRoadmap(s.analysis,s.profile||defaults));roadmap={...roadmap,stops:roadmap.stops.map(stop=>({...stop,status:cached?stop.status:'pending',tasks:stop.tasks.map(t=>({...t,done:cached?Boolean(t.done):false}))}))};await updateState(id,current=>({...current,roadmap,roadmap_cache:cacheKey}));res.json({...roadmap,progress:progressOf(roadmap)});}catch(e){next(e);}});
function progressOf(roadmap){const stops=roadmap?.stops||[],tasks=stops.flatMap(s=>s.tasks||[]),completed=tasks.filter(t=>t.done).length;return{completed_tasks:completed,total_tasks:tasks.length,percent:tasks.length?Math.round(completed/tasks.length*100):0,completed_stops:stops.filter(s=>s.status==='completed').length,total_stops:stops.length};}
function hasCompletedDependents(roadmap,stopId){function dependsOn(stop,target,seen=new Set()){if(seen.has(stop.id))return false;seen.add(stop.id);for(const id of stop.prerequisites||[]){if(id===target)return true;const parent=roadmap.stops.find(x=>x.id===id);if(parent&&dependsOn(parent,target,seen))return true;}return false;}return roadmap.stops.some(s=>s.status!=='pending'&&s.id!==stopId&&dependsOn(s,stopId));}
router.get('/progress',async(req,res,next)=>{try{const s=await readState(userId(req));if(s.analysis?.analysis_version!==ANALYSIS_VERSION||!s.roadmap)return res.status(404).json({error:'Run analysis and generate a roadmap first.'});res.json({roadmap:s.roadmap,progress:progressOf(s.roadmap)});}catch(e){next(e);}});
router.patch('/progress/task/:taskId',async(req,res,next)=>{try{if(typeof req.body?.done!=='boolean')return res.status(400).json({error:'Body must include boolean done.'});let updated;await updateState(userId(req),s=>{if(s.analysis?.analysis_version!==ANALYSIS_VERSION||!s.roadmap)throw Object.assign(Error('Run analysis and generate a roadmap first.'),{statusCode:404});let found=false;for(const stop of s.roadmap.stops){if(stop.tasks.some(t=>t.id===req.params.taskId)){found=true;const locked=stop.prerequisites.some(id=>!s.roadmap.stops.find(x=>x.id===id&&x.status==='completed'));if(locked)throw Object.assign(Error('Complete prerequisite stops first.'),{statusCode:409});if(!req.body.done&&stop.status==='completed'&&hasCompletedDependents(s.roadmap,stop.id))throw Object.assign(Error('Reset completed dependent stops first.'),{statusCode:409});stop.tasks=stop.tasks.map(t=>t.id===req.params.taskId?{...t,done:req.body.done}:t);stop.status=stop.tasks.every(t=>t.done)?'completed':stop.tasks.some(t=>t.done)?'in_progress':'pending';}}if(!found)throw Object.assign(Error('Task not found.'),{statusCode:404});updated=s.roadmap;return s;});res.json({roadmap:updated,progress:progressOf(updated)});}catch(e){next(e);}});
router.patch('/progress/milestone/:milestoneId',async(req,res,next)=>{try{if(typeof req.body?.completed!=='boolean')return res.status(400).json({error:'Body must include boolean completed.'});let updated;await updateState(userId(req),s=>{if(s.analysis?.analysis_version!==ANALYSIS_VERSION||!s.roadmap)throw Object.assign(Error('Run analysis and generate a roadmap first.'),{statusCode:404});const stop=s.roadmap.stops.find(x=>x.id===req.params.milestoneId);if(!stop)throw Object.assign(Error('Milestone not found.'),{statusCode:404});if(req.body.completed&&stop.prerequisites.some(id=>!s.roadmap.stops.find(x=>x.id===id&&x.status==='completed')))throw Object.assign(Error('Complete prerequisite stops first.'),{statusCode:409});if(!req.body.completed&&hasCompletedDependents(s.roadmap,stop.id))throw Object.assign(Error('Reset completed dependent stops first.'),{statusCode:409});stop.tasks=stop.tasks.map(t=>({...t,done:req.body.completed}));stop.status=req.body.completed?'completed':'pending';updated=s.roadmap;return s;});res.json({roadmap:updated,progress:progressOf(updated)});}catch(e){next(e);}});
async function recommendations(req,res,next,force){try{const id=userId(req);let state=await readState(id);if(!state.profile)state={...state,profile:defaults};if(state.analysis?.analysis_version!==ANALYSIS_VERSION)state={...state,analysis:null};const result=await getRecommendations(state,force);await updateState(id,s=>({...s,profile:state.profile,jobs:result}));res.json(result);}catch(e){next(e);}}
router.get('/recommended-jobs', (req,res,next)=>recommendations(req,res,next,false));router.post('/refresh-jobs',(req,res,next)=>recommendations(req,res,next,true));

// ==========================================
// INTEGRATED MILESTONE EXAM & SEB ROUTES
// ==========================================
const examPublicDir = path.resolve(__dirname, '../exam');

router.post('/exam/generate', async (req, res, next) => {
  try {
    const id = userId(req);
    const { milestoneId, questionCount = 10, difficulty = 'medium' } = req.body || {};
    if (!milestoneId) return res.status(400).json({ error: 'milestoneId is required.' });

    const s = await readState(id);
    const stop = (s.roadmap?.stops || []).find(st => st.id === milestoneId);
    if (!stop) return res.status(404).json({ error: 'Milestone not found in active roadmap.' });

    console.log(`[career-exam] Generating exam for candidate ${id} on milestone: ${stop.title}`);
    const examData = await createMilestoneExam({
      candidateId: id,
      milestoneId: stop.id,
      milestoneTitle: stop.title,
      skills: stop.skills || [],
      topics: stop.topics || [],
      questionCount,
      difficulty,
    });

    res.json(examData);
  } catch (err) {
    next(err);
  }
});

router.get('/exam/seb-page', async (_req, res) => {
  try {
    const content = await fs.readFile(path.join(examPublicDir, 'seb-exam.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(content);
  } catch {
    res.status(404).send('SEB Exam page not found');
  }
});

router.get('/exam/seb-exit', (_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end('<!doctype html><meta charset="utf-8"><title>Exam finished</title><p>Exam submitted. Safe Exam Browser is closing and returning you to the roadmap.</p>');
});

router.get('/exam/seb-config/:token.seb', (req, res) => {
  const token = req.params.token;
  const origin = `${req.protocol}://${req.get('host')}`;
  const plist = generateSebConfig(token, origin);
  if (!plist) return res.status(404).json({ error: 'Exam session not found or expired.' });

  res.writeHead(200, {
    'content-type': 'application/seb',
    'content-disposition': 'inline; filename="milestone-exam.seb"',
    'cache-control': 'no-store'
  });
  res.end(plist);
});

router.get('/exam/session/:token', (req, res) => {
  if (!isSeb(req)) {
    return res.status(403).json({ error: 'Open this milestone exam inside Safe Exam Browser.' });
  }
  const token = req.params.token;
  const exam = getExamSession(token);
  if (!exam || Date.now() - exam.issuedAt > 4 * 60 * 60 * 1000) {
    return res.status(404).json({ error: 'This exam session is not available or has expired.' });
  }
  if (!exam.startedAt) exam.startedAt = Date.now();

  res.json({
    candidateId: exam.candidateId,
    milestoneId: exam.milestoneId,
    milestoneTitle: exam.milestoneTitle,
    topic: exam.milestoneTitle,
    skills: exam.skills,
    topics: exam.topics,
    questions: exam.questions,
    durationSeconds: exam.durationSeconds,
    secondsRemaining: Math.max(0, exam.durationSeconds - Math.floor((Date.now() - exam.startedAt) / 1000))
  });
});

router.post('/exam/results', async (req, res, next) => {
  try {
    if (!isSeb(req)) {
      return res.status(403).json({ error: 'Submit this exam from Safe Exam Browser.' });
    }
    const { examToken, answers } = req.body || {};
    if (!examToken || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid exam submission payload.' });
    }

    const record = gradeAndCompleteExam(examToken, answers);
    if (!record) return res.status(400).json({ error: 'Invalid or expired exam session.' });

    const id = record.candidateId || userId(req);

    // 1) Save exam result to Supabase exam_results table
    if (supabase) {
      try {
        const { error: insertErr } = await supabase
          .from('exam_results')
          .insert({
            user_id: id,
            milestone_id: record.milestoneId,
            milestone_title: record.milestoneTitle,
            score: record.score,
            total: record.total,
            percentage: record.percentage,
            passed: record.passed,
            submitted_at: record.submittedAt,
            exam_token: record.examToken,
          });
        if (insertErr) {
          console.warn('[career-exam] Supabase exam_results insert error:', insertErr.message);
        } else {
          console.log(`[career-exam] Saved exam result to Supabase for user ${id}, milestone ${record.milestoneId}: ${record.percentage}% ${record.passed ? 'PASSED' : 'FAILED'}`);
        }
      } catch (sbErr) {
        console.warn('[career-exam] Supabase exam_results exception:', sbErr.message);
      }
    }

    // 2) Update the roadmap state (also syncs to Supabase via updateState)
    try {
      await updateState(id, s => {
        if (!s.roadmap) return s;
        const stop = s.roadmap.stops?.find(x => x.id === record.milestoneId);
        if (stop) {
          if (record.passed) {
            stop.tasks = stop.tasks.map(t => ({ ...t, done: true }));
            stop.status = 'completed';
          }
          stop.exam_result = {
            score: record.score,
            total: record.total,
            percentage: record.percentage,
            passed: record.passed,
            verified_at: record.submittedAt,
          };
        }
        return s;
      });
    } catch (err) {
      console.warn('[career-exam] State update note:', err.message);
    }

    res.status(201).json({ saved: true, result: record });
  } catch (e) {
    next(e);
  }
});

router.get('/exam/status/:milestoneId', async (req, res) => {
  try {
    const id = userId(req);
    const s = await readState(id);
    const stop = (s.roadmap?.stops || []).find(st => st.id === req.params.milestoneId);
    res.json({
      milestoneId: req.params.milestoneId,
      status: stop?.status || 'pending',
      exam_result: stop?.exam_result || null
    });
  } catch {
    res.status(500).json({ error: 'Could not fetch exam status.' });
  }
});
router.delete('/data',async(req,res,next)=>{try{await clearState(userId(req));res.json({deleted:true});}catch(e){next(e);}});
router.use((err,req,res,_next)=>{if(err instanceof multer.MulterError)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:err.message});const status=err.statusCode||500;const requestId=crypto.randomUUID();console.error('[career-roadmap]',requestId,status,err.errorCode||'REQUEST_ERROR',err.providerStatus||'',err.message);const safeError=err.publicMessage||(status>=500?'Career roadmap request failed. Check backend logs for details.':err.message);res.setHeader('X-Request-Id',requestId);res.status(status).json({error:safeError,request_id:requestId,error_code:err.errorCode||undefined,provider_status:err.providerStatus||undefined,provider_code:err.providerCode||undefined});});
module.exports=router;

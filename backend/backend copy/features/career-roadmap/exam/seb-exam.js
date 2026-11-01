const root=document.querySelector('#examRoot'),token=new URLSearchParams(location.search).get('token');let exam,answers=[],index=0,seconds=3600,timer,submitted=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmt(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
function error(msg){root.innerHTML=`<div class="secure-error"><b>Unable to load the exam.</b><br>${esc(msg)}<br><br>Close Safe Exam Browser and try launching the exam again from the portal.</div><div style="margin-top:18px;text-align:center;"><button id="exitExamBtn" style="background:#d32f2f;color:#fff;border:none;padding:12px 28px;border-radius:6px;font-size:14px;cursor:pointer;">✕ Exit Safe Exam Browser</button></div>`;document.querySelector('#exitExamBtn').onclick=()=>location.assign('/api/career/exam/seb-exit?token='+encodeURIComponent(token||''))}
async function load(){if(!token){error('The exam session link is missing.');return}try{const r=await fetch('/api/career/exam/session/'+encodeURIComponent(token),{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error);exam=d;answers=Array(d.questions.length).fill(null);seconds=d.secondsRemaining;if(seconds<=0)throw Error('The time limit has passed.');render();timer=setInterval(()=>{seconds--;const el=document.querySelector('#timeLeft');if(el)el.textContent=fmt(seconds);if(seconds<=0)submit(true)},1000)}catch(e){error(e.message||'Network error')}}
function exitExam(){
  if(confirm('Are you sure you want to EXIT the exam?\n\nYour answers will NOT be submitted and you will score 0.\nSafe Exam Browser will close.')){
    location.assign('/api/career/exam/seb-exit?token='+encodeURIComponent(token));
  }
}
function render(){const q=exam.questions[index],letters=['A','B','C','D'];root.innerHTML=`<div class="secure-meta"><span>${esc(exam.topic)} · ${esc(exam.candidateId)}</span><span>TIME LEFT&nbsp; <b id="timeLeft">${fmt(seconds)}</b></span></div><div class="secure-progress"><span style="width:${Math.round(index/exam.questions.length*100)}%"></span></div><div class="secure-meta"><span>QUESTION ${String(index+1).padStart(2,'0')} / ${String(exam.questions.length).padStart(2,'0')}</span><span>1 POINT</span></div><h1 class="secure-title">${esc(q.question)}</h1><div class="secure-options">${q.options.map((o,n)=>`<label class="option ${answers[index]===n?'selected':''}"><input type="radio" name="answer" value="${n}" ${answers[index]===n?'checked':''}><span><b>${letters[n]}.</b> ${esc(o)}</span></label>`).join('')}</div><div class="secure-actions"><button class="secondary-button" id="previous" ${index===0?'disabled':''}>← Previous</button><button class="primary-button" id="next"><span>${index===exam.questions.length-1?'Submit exam':'Save & continue'}</span><span>→</span></button></div><div style="margin-top:18px;text-align:center;"><button id="exitExamBtn" style="background:none;border:1px solid #d32f2f;color:#d32f2f;padding:8px 22px;border-radius:6px;font-size:13px;cursor:pointer;transition:all .2s;">✕ Exit Exam</button></div>`;document.querySelectorAll('[name=answer]').forEach(el=>el.onchange=()=>{answers[index]=Number(el.value);document.querySelectorAll('.option').forEach((o,n)=>o.classList.toggle('selected',n===answers[index]))});document.querySelector('#previous').onclick=()=>{index--;render()};document.querySelector('#next').onclick=()=>{if(index===exam.questions.length-1){if(confirm('Submit your exam now?'))submit(false)}else{index++;render()}};document.querySelector('#exitExamBtn').onclick=exitExam}
async function submit(timeUp){
  if(submitted)return;
  submitted=true;
  clearInterval(timer);
  root.innerHTML='<p>Submitting your exam…</p>';
  try{
    const r=await fetch('/api/career/exam/results',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({examToken:token,answers})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error || `Server responded with HTTP ${r.status}`);
    const x=d.result;
    root.innerHTML=`<div class="secure-meta"><span>EXAM COMPLETE · ${esc(exam.candidateId)}</span><span>${timeUp?'TIME EXPIRED':'SUBMITTED'}</span></div>
      <h1 class="secure-title">Your Result: ${x.score} / ${x.total}</h1>
      <div class="secure-score">${x.score}<span style="font-size:20px;color:#8b9b90"> / ${x.total}</span></div>
      <div class="result-detail" style="margin:16px 0;font-size:16px;">
        <span>Final Score: <b>${x.percentage}%</b> — <span style="color:${x.passed ? '#2e7d32' : '#c62828'};font-weight:700;">${x.passed ? 'PASSED ✓' : 'NEEDS PRACTICE'}</span></span>
        <br><span style="color:#666;font-size:14px;">${x.total-x.score} incorrect or unanswered</span>
      </div>
      <div class="callout" style="padding:16px;background:#f0f9f1;border-radius:8px;border-left:4px solid ${x.passed ? '#4caf50' : '#ff9800'};">
        ${x.passed ? '🎉 Congratulations! You have successfully passed this milestone. Your roadmap has been verified and updated!' : 'Exam completed. You scored under 75%. Review the milestone lessons and try again.'}
      </div>
      <div class="secure-actions" style="margin-top:24px;">
        <button class="primary-button" id="exitSebBtn" style="width:100%;padding:14px;font-size:16px;cursor:pointer;">
          Exit Safe Exam Browser & Return to Roadmap →
        </button>
      </div>
      <div class="secure-meta" style="margin-top:12px;text-align:center;">Safe Exam Browser will also close automatically in 8 seconds…</div>`;
    
    document.querySelector('#exitSebBtn').onclick = () => {
      location.assign('/api/career/exam/seb-exit?token='+encodeURIComponent(token));
    };
    setTimeout(()=>location.assign('/api/career/exam/seb-exit?token='+encodeURIComponent(token)),8000);
  }catch(e){
    submitted=false;
    root.innerHTML=`<div class="secure-error"><b>Could not save your result:</b><br>${esc(e.message||'Network error')}<br><br>Check backend terminal logs, then click Retry submission below.</div><button class="primary-button" id="retry">Retry submission <span>↻</span></button>`;
    document.querySelector('#retry').onclick=()=>submit(timeUp);
  }
}
load();

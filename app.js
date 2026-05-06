/* ============ Browser Language Auto-Detection ============ */
(function(){
  // Only run on root pages (not /en/), only on first visit
  const path = window.location.pathname;
  const isInEn = path.indexOf('/en/') === 0 || path.indexOf('/en/') !== -1;
  const hasChosenLang = (function(){ try { return localStorage.getItem('gu-lang'); } catch(e){ return null; }})();
  if(isInEn || hasChosenLang) return;
  const lang = (navigator.language || navigator.userLanguage || 'de').toLowerCase();
  if(lang.indexOf('en') === 0){
    // Build /en/ equivalent path
    const file = path.split('/').pop() || 'index.html';
    window.location.replace('/en/' + file);
  }
})();

/* ============ Signal / Noise Canvas (Hero) ============ */
(function(){
  const cv = document.getElementById('signalCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  let W=0,H=0,DPR=Math.max(1,window.devicePixelRatio||1);
  const nodes = [];
  const pulses = []; // travelling signal pulses between connected nodes
  let mouse = {x:-999,y:-999,active:false};
  let signalBoost = 0;
  let lastPulseT = 0;

  function resize(){
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W*DPR; cv.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function init(){
    resize();
    nodes.length = 0;
    // Density scales with area — always enough connecting points
    const N = Math.min(140, Math.max(70, Math.floor((W*H)/9000)));
    for(let i=0;i<N;i++){
      nodes.push({
        x: Math.random()*W, y: Math.random()*H,
        vx:(Math.random()-.5)*0.35, vy:(Math.random()-.5)*0.35,
        r:1.2+Math.random()*1.6,
        s:Math.random(),
        // unique orbital phase for gentle drift
        ph: Math.random()*Math.PI*2
      });
    }
  }

  function spawnPulse(){
    if(nodes.length < 2) return;
    const a = nodes[(Math.random()*nodes.length)|0];
    // pick a neighbour within connection range
    let best=null, bd=Infinity;
    for(const b of nodes){
      if(b===a) continue;
      const d = Math.hypot(a.x-b.x,a.y-b.y);
      if(d<160 && d<bd && Math.random()<0.4){ best=b; bd=d; }
    }
    if(!best) return;
    pulses.push({x:a.x,y:a.y,tx:best.x,ty:best.y,t:0,life:60+Math.random()*30});
  }

  function step(t){
    ctx.clearRect(0,0,W,H);

    // --- update nodes ---
    for(const n of nodes){
      // gentle sin drift layered on velocity
      const drift = Math.sin(t*0.0006 + n.ph)*0.12;
      n.x += n.vx + drift*0.3;
      n.y += n.vy + Math.cos(t*0.0005 + n.ph)*0.12;
      if(n.x<0||n.x>W) n.vx*=-1;
      if(n.y<0||n.y>H) n.vy*=-1;
      n.s += (Math.sin(t*0.0008 + n.x*0.008 + n.y*0.006)*0.5 + 0.5 - n.s)*0.02;

      // mouse attraction — nodes near cursor get nudged toward it
      if(mouse.active){
        const mdx = mouse.x - n.x, mdy = mouse.y - n.y;
        const md = Math.hypot(mdx,mdy);
        if(md < 180 && md > 0.1){
          const f = (1 - md/180) * 0.12;
          n.vx += (mdx/md)*f*0.05;
          n.vy += (mdy/md)*f*0.05;
          n.s = Math.min(1, n.s + 0.01);
        }
      }
      // damping
      n.vx *= 0.995; n.vy *= 0.995;
      // keep minimum motion
      if(Math.abs(n.vx)<0.04) n.vx += (Math.random()-.5)*0.04;
      if(Math.abs(n.vy)<0.04) n.vy += (Math.random()-.5)*0.04;
    }

    // --- connections (visualize as the network breathing) ---
    const maxDist = 150;
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j];
        const dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
        if(d<maxDist){
          const t01 = 1 - d/maxDist;
          const alpha = t01 * (0.18 + signalBoost*0.35);
          const mix = (a.s+b.s)/2;
          if(mix > 0.62){
            ctx.strokeStyle = `rgba(123,142,200,${alpha})`;
          } else if(mix > 0.35){
            ctx.strokeStyle = `rgba(17,17,17,${alpha*0.55})`;
          } else {
            ctx.strokeStyle = `rgba(17,17,17,${alpha*0.28})`;
          }
          ctx.lineWidth = 0.6 + t01*0.6;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }

    // --- nodes on top ---
    for(const n of nodes){
      const strong = n.s > 0.7;
      // glow halo for strong
      if(strong){
        ctx.beginPath();
        ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2);
        ctx.fillStyle = `rgba(123,142,200,${0.08 + signalBoost*0.15})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r + (strong?1.0:0),0,Math.PI*2);
      ctx.fillStyle = strong
        ? `rgba(123,142,200,${0.65 + signalBoost*0.25})`
        : `rgba(17,17,17,${0.32})`;
      ctx.fill();
    }

    // --- travelling pulses along links ---
    // spawn regularly, more often when user interacts
    if(t - lastPulseT > (280 - signalBoost*220)){
      spawnPulse(); lastPulseT = t;
    }
    for(let i=pulses.length-1;i>=0;i--){
      const p = pulses[i];
      p.t++;
      const k = p.t / p.life;
      if(k >= 1){ pulses.splice(i,1); continue; }
      const x = p.x + (p.tx-p.x)*k;
      const y = p.y + (p.ty-p.y)*k;
      // trail
      ctx.strokeStyle = `rgba(224,90,40,${0.18*(1-k)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x + (p.tx-p.x)*Math.max(0,k-0.15), p.y + (p.ty-p.y)*Math.max(0,k-0.15));
      ctx.lineTo(x,y);
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(x,y,2.5+Math.sin(k*Math.PI)*2,0,Math.PI*2);
      ctx.fillStyle = `rgba(224,90,40,${0.55 + 0.45*Math.sin(k*Math.PI)})`;
      ctx.fill();
    }

    // --- Ember flare at random high-signal node ---
    if(Math.random()<0.0018 + signalBoost*0.01){
      const n = nodes[(Math.random()*nodes.length)|0];
      if(n.s > 0.5){
        ctx.beginPath();
        ctx.arc(n.x,n.y,8+Math.random()*5,0,Math.PI*2);
        const g = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,14);
        g.addColorStop(0,'rgba(224,90,40,0.9)');
        g.addColorStop(1,'rgba(224,90,40,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    signalBoost = Math.max(0, signalBoost - 0.0022);
    requestAnimationFrame(step);
  }

  // mouse tracking over hero
  const hero = cv.parentElement;
  if(hero){
    hero.addEventListener('mousemove', (e)=>{
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    });
    hero.addEventListener('mouseleave', ()=>{ mouse.active = false; });
  }

  window.addEventListener('resize', init, {passive:true});
  init(); requestAnimationFrame(step);
  window.__boostSignal = (v=0.6)=>{ signalBoost = Math.min(1, signalBoost+v); };
})();

/* ============ Multi-Step Signal Check ============ */
(function(){
  const root = document.getElementById('signalCheck');
  if(!root) return;
  const steps = root.querySelectorAll('.sc-step');
  const progress = root.querySelectorAll('.sc-progress span');
  const progressEl = root.querySelector('#sc-progress');
  const stepsWrap = root.querySelector('#sc-steps-wrap');
  const backBtn = root.querySelector('#sc-back');
  const nextBtn = root.querySelector('#sc-next');
  const skipBtn = root.querySelector('#sc-skip');
  const resultCard = root.querySelector('#sc-result');
  const startBtn = root.querySelector('#sc-start');
  const scNav = root.querySelector('#sc-nav');
  const intro = root.querySelector('#sc-intro');
  if(!startBtn) { console.warn('Signal Check: start button missing'); return; }

  let current = 0; // -1 = intro, 0..N = questions
  const TOTAL = 5; // 4 scale questions + 1 free text
  const answers = { q1:null, q2:null, q3:null, q4:null, q5:'' };

  // Question definitions
  const questions = [
    { key:'q1', dim:'Marktklarheit',
      text:'Wie deutlich erkennen Sie aktuelle Marktverschiebungen, die Ihr Geschäft beeinflussen?',
      type:'scale',
      options:[
        {v:5, lbl:'Sehr klar — wir wissen, was sich verschiebt und was es für uns bedeutet.'},
        {v:4, lbl:'Gut — wir sehen die Bewegungen, einzelne Implikationen sind unklar.'},
        {v:3, lbl:'Teilweise — wir spüren Unruhe, aber das Bild ist nicht scharf.'},
        {v:2, lbl:'Vage — etwas verändert sich, wir können es nicht greifen.'},
        {v:1, lbl:'Gar nicht — wir reagieren, statt zu antizipieren.'}
      ]
    },
    { key:'q2', dim:'Fokus',
      text:'Wenn fünf Personen aus Ihrem Führungsteam die zwei wichtigsten Prioritäten der nächsten 90 Tage nennen — wie ähnlich wären die Antworten?',
      type:'scale',
      options:[
        {v:5, lbl:'Identisch — gleiche Sicht, fast wortgleich.'},
        {v:4, lbl:'Sehr ähnlich — kleinere Akzent-Unterschiede.'},
        {v:3, lbl:'Überlappend — Reihenfolge variiert.'},
        {v:2, lbl:'Bunt — grundsätzlich nah, aber jede:r setzt anders.'},
        {v:1, lbl:'Sehr unterschiedlich — keine geteilte Sicht.'}
      ]
    },
    { key:'q3', dim:'Geschwindigkeit',
      text:'Wie schnell trifft Ihr Führungsteam strategische Entscheidungen, wenn neue Information vorliegt?',
      type:'scale',
      options:[
        {v:5, lbl:'Innerhalb von Tagen.'},
        {v:4, lbl:'In 1–2 Wochen.'},
        {v:3, lbl:'In 3–4 Wochen.'},
        {v:2, lbl:'1–2 Monate.'},
        {v:1, lbl:'Quartale oder länger — oder gar nicht.'}
      ]
    },
    { key:'q4', dim:'Umsetzung',
      text:'Wie konsequent wird das, was beschlossen wird, auch umgesetzt?',
      type:'scale',
      options:[
        {v:5, lbl:'Sehr konsequent — Beschlüsse halten.'},
        {v:4, lbl:'Meistens — kleine Abweichungen.'},
        {v:3, lbl:'Mittelmässig — häufige Re-Diskussionen.'},
        {v:2, lbl:'Oft schwammig — Beschluss ≠ Umsetzung.'},
        {v:1, lbl:'Selten — vieles verflüchtigt sich.'}
      ]
    },
    { key:'q5', dim:'Kontext',
      text:'Was beschäftigt Sie gerade am meisten? (Optional)',
      type:'text',
      placeholder:'Stichworte reichen — z. B. „neuer Wettbewerber, der mit AI Preise senkt" oder „Team verliert Fokus".'
    }
  ];

  function renderStep(i){
    if(i < 0){
      intro.style.display = 'block';
      progressEl.style.display = 'none';
      stepsWrap.style.display = 'none';
      scNav.style.display = 'none';
      resultCard.style.display = 'none';
      resultCard.classList.remove('show');
      steps.forEach(s => s.classList.remove('active'));
      return;
    }
    if(i >= TOTAL){
      intro.style.display = 'none';
      progressEl.style.display = 'none';
      stepsWrap.style.display = 'none';
      scNav.style.display = 'none';
      steps.forEach(s => s.classList.remove('active'));
      showResult();
      return;
    }
    intro.style.display = 'none';
    progressEl.style.display = 'flex';
    stepsWrap.style.display = 'block';
    scNav.style.display = 'flex';
    resultCard.style.display = 'none';
    resultCard.classList.remove('show');
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
    progress.forEach((p, idx) => {
      p.classList.toggle('done', idx < i);
      p.classList.toggle('active', idx === i);
    });
    backBtn.disabled = i === 0;
    const q = questions[i];
    const isText = q.type === 'text';
    skipBtn.style.display = isText ? 'inline' : 'none';
    nextBtn.disabled = isText ? false : (answers[q.key] === null);
    nextBtn.querySelector('.lbl').textContent = (i === TOTAL - 1) ? 'Auswerten' : 'Weiter';
    if(window.__boostSignal) window.__boostSignal(0.15);
  }

  // Build the step DOM
  steps.forEach((stepEl, idx) => {
    const q = questions[idx];
    stepEl.innerHTML = `
      <div class="qnum">Frage ${idx+1} von ${TOTAL}</div>
      <div class="qtxt">${q.text}</div>
      ${q.type === 'scale' ? `
        <div class="scale-opts" data-step="${idx}">
          ${q.options.map(o => `<button data-v="${o.v}"><span class="lbl">${o.lbl}</span></button>`).join('')}
        </div>
      ` : `
        <textarea class="sc-text" data-step="${idx}" placeholder="${q.placeholder}"></textarea>
      `}
    `;
  });

  // Hook up scale option clicks
  root.querySelectorAll('.scale-opts').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-v]');
      if(!btn) return;
      const idx = parseInt(group.dataset.step, 10);
      const q = questions[idx];
      group.querySelectorAll('button').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      answers[q.key] = parseInt(btn.dataset.v, 10);
      nextBtn.disabled = false;
    });
  });
  root.querySelectorAll('.sc-text').forEach(t => {
    t.addEventListener('input', () => {
      const idx = parseInt(t.dataset.step, 10);
      answers[questions[idx].key] = t.value.trim();
    });
  });

  startBtn.addEventListener('click', () => { current = 0; renderStep(current); });
  backBtn.addEventListener('click', () => {
    if(current > 0){ current--; renderStep(current); }
  });
  nextBtn.addEventListener('click', () => {
    current++; renderStep(current);
  });
  skipBtn.addEventListener('click', () => {
    current++; renderStep(current);
  });

  function showResult(){
    if(window.__boostSignal) window.__boostSignal(0.8);
    resultCard.style.display = 'block';
    resultCard.classList.add('show');
    const dims = ['Marktklarheit','Fokus','Geschwindigkeit','Umsetzung'];
    const vals = [answers.q1, answers.q2, answers.q3, answers.q4];
    const grid = resultCard.querySelector('#sc-grid');
    grid.innerHTML = vals.map((v, i) => `
      <div class="sc-dim">
        <div class="name">${dims[i]}</div>
        <div class="score-row"><div class="score">${v}<small>/5</small></div></div>
        <div class="barwrap"><div class="bar" style="width:0"></div></div>
      </div>
    `).join('');
    // animate bars
    setTimeout(() => {
      grid.querySelectorAll('.bar').forEach((bar, i) => {
        bar.style.width = (vals[i]/5*100) + '%';
      });
    }, 50);

    // summary
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    let summary = '';
    if(avg >= 4.2){
      summary = "Ihr Profil ist <b>stark</b>. Marktbild scharf, Team ausgerichtet, Entscheidungen schnell, Umsetzung konsequent. Wenn dennoch ein konkreter Druckpunkt da ist — sprechen wir gezielt darüber.";
    } else if(avg >= 3.2){
      summary = "Ihr Profil ist <b>solide mit Lücken</b>. Die Grundlage trägt, aber an mindestens einer Stelle reibt es. Eine fokussierte Diagnose würde die schwächste Dimension aufdecken — oft der grösste Hebel.";
    } else if(avg >= 2.2){
      summary = "Ihr Profil zeigt <b>deutliche Spannung</b>. Mehr als eine Dimension ist unter Druck. Genau die Konstellation, in der wir arbeiten — meist mit einer 2-Wochen-Diagnose, die in einer 90-Day-Transformation mündet.";
    } else {
      summary = "Ihr Profil zeigt <b>strukturelle Belastung</b>. Wenn das die ehrliche Selbst­einschätzung ist, gehört das nicht in einen Online-Check, sondern in ein Gespräch — bevor weitere Wochen verloren gehen.";
    }
    resultCard.querySelector('#sc-summary').innerHTML = summary;
    // Save to sessionStorage so contact form can pick it up
    try {
      sessionStorage.setItem('signalCheckResult', JSON.stringify({
        scores: { Marktklarheit:vals[0], Fokus:vals[1], Geschwindigkeit:vals[2], Umsetzung:vals[3] },
        text: answers.q5 || '',
        avg: avg.toFixed(1),
        timestamp: new Date().toISOString()
      }));
    } catch(e){}
  }
})();

/* ============ Hamburger / Mobile Menu ============ */
(function(){
  const ham = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  const close = document.getElementById('mob-close');
  if(!ham || !menu) return;
  function open(){
    menu.classList.add('open');
    ham.classList.add('open');
    document.body.style.overflow = 'hidden';
    menu.setAttribute('aria-hidden', 'false');
  }
  function shut(){
    menu.classList.remove('open');
    ham.classList.remove('open');
    document.body.style.overflow = '';
    menu.setAttribute('aria-hidden', 'true');
  }
  ham.addEventListener('click', () => menu.classList.contains('open') ? shut() : open());
  if(close) close.addEventListener('click', shut);
  // Close on link tap inside drawer
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', shut));
  // Close on escape
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') shut(); });
})();

/* ============ Cookie Banner ============ */
(function(){
  const KEY = 'gu-cookie-pref';
  const banner = document.getElementById('cookie-banner');
  if(!banner) return;
  const stored = (function(){ try { return localStorage.getItem(KEY); } catch(e){ return null; }})();
  if(!stored){
    setTimeout(()=> banner.classList.add('show'), 1200);
  }
  banner.querySelector('.accept').addEventListener('click', ()=>{
    try { localStorage.setItem(KEY, 'accepted'); } catch(e){}
    banner.classList.remove('show');
  });
  banner.querySelector('.reject').addEventListener('click', ()=>{
    try { localStorage.setItem(KEY, 'rejected'); } catch(e){}
    banner.classList.remove('show');
  });
})();

/* ============ E-Mail Spam-Schutz ============ */
(function(){
  // Reveal email addresses encoded as data-email="user|domain.tld"
  document.querySelectorAll('[data-email]').forEach(el => {
    const parts = el.dataset.email.split('|');
    if(parts.length !== 2) return;
    const addr = parts[0] + '@' + parts[1];
    el.textContent = addr;
    if(el.tagName === 'A') el.href = 'mailto:' + addr;
  });
})();

/* ============ Blog Filter ============ */
(function(){
  const filter = document.querySelector('.blog-filter');
  if(!filter) return;
  const chips = filter.querySelectorAll('.chip');
  const grid = document.querySelector('.blog-grid');
  if(!grid) return;
  const posts = grid.querySelectorAll('.post');

  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const term = chip.textContent.trim().toLowerCase();
    posts.forEach(p => {
      const cat = (p.querySelector('.cat')?.textContent || '').toLowerCase();
      const matches = term === 'alle' || cat.includes(term);
      p.style.display = matches ? '' : 'none';
    });
  }));
})();

/* ============ Contact Form: Signal Check Result attachment (Netlify Forms) ============ */
(function(){
  const form = document.querySelector('form[name="contact"]');
  if(!form) return;
  const attachBox = form.querySelector('#signal-attach-box');
  const attachCheck = form.querySelector('#attach-check');
  const attachSummary = form.querySelector('#attach-summary');
  const hiddenInput = form.querySelector('#signal-result-hidden');
  let savedResult = null;
  try { savedResult = sessionStorage.getItem('signalCheckResult'); } catch(e){}
  if(savedResult){
    const r = JSON.parse(savedResult);
    const txt = `Marktklarheit ${r.scores.Marktklarheit}/5 · Fokus ${r.scores.Fokus}/5 · Geschwindigkeit ${r.scores.Geschwindigkeit}/5 · Umsetzung ${r.scores.Umsetzung}/5 (Ø ${r.avg})`;
    if(attachSummary) attachSummary.textContent = txt;
    if(attachBox) attachBox.style.display = 'block';
  }

  // Before submit: serialise signal-check result into hidden field if attached
  form.addEventListener('submit', () => {
    if(savedResult && attachCheck && attachCheck.checked && hiddenInput){
      const r = JSON.parse(savedResult);
      hiddenInput.value = `Marktklarheit: ${r.scores.Marktklarheit}/5\nFokus: ${r.scores.Fokus}/5\nGeschwindigkeit: ${r.scores.Geschwindigkeit}/5\nUmsetzung: ${r.scores.Umsetzung}/5\nDurchschnitt: ${r.avg}/5\nKontext: ${r.text || '—'}`;
    }
  });
})();

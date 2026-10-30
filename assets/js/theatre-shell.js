/* Shared navigation and opening theatre. Existing text, players and menus remain. */
(() => {
  'use strict';
  if (window.PaganiniTheatre) return;
  const base = new URL('../../', document.currentScript.src);
  const asset = path => new URL(path, base).href;
  const $ = s => document.querySelector(s);
  const get = (key, fallback = '') => { try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const set = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };
  const reduced = () => document.documentElement.matches('.reduce-motion,.less-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const routes = [
    ['life/story.html','传记长卷','book'], ['life/begining.html','人生 · 剧场旅程','stage'],
    ['beihou/extra.html','传奇背后','book'], ['music/style.html','作曲风格','score'],
    ['music/works.html','聆听作品','record'], ['effects/effects.html','音乐的回响','legacy'],
    ['instrument/instrument.html','亲手演奏','instrument'], ['reflection.sumber.html','感想与资料','book'],
    ['index.html','NICCOLÒ PAGANINI','stage']
  ];
  const modelSVG = '<svg viewBox="0 0 180 410" aria-hidden="true"><defs><linearGradient id="pg-wood"><stop stop-color="#352016"/><stop offset=".45" stop-color="#ae6b31"/><stop offset=".7" stop-color="#66371c"/><stop offset="1" stop-color="#291710"/></linearGradient></defs><path d="M80 8q30-20 26 18l-9 18-3 113q48-14 47 33-28 15-8 42 37 28 27 69-12 52-67 54-58-3-66-54-6-39 26-69 17-26-7-42-4-46 37-33L79 44Q63 20 80 8" fill="url(#pg-wood)" stroke="#d0a064" stroke-width="2"/><path d="M86 48h10l1 214H84Z" fill="#17110e"/><path d="M73 287h39l-12 53H82Z" fill="#17110e"/><path d="M65 230q-20 0-10 24t-9 25m73-49q20 0 10 24t9 25" fill="none" stroke="#1b100b" stroke-width="5"/><path d="M85 42v287m4-287v287m4-287v287m4-287v287" stroke="#d8c8a4" stroke-width=".6"/><path d="M73 277h39" stroke="#e5c58a" stroke-width="5"/></svg>';
  const themeScene = `<div class="pg-curtain left"></div><div class="pg-curtain right"></div><div class="pg-film-light"></div>
    <div class="pg-film-book"><div class="pg-book-page">NICCOLÒ<br><span>1782 — 1840</span></div><div class="pg-book-page turn">PAGANINI<br><span>Una vita in musica</span></div></div>
    <div class="pg-film-score"><span>𝄞</span><i>♩</i><i>♪</i><i>♫</i><i>♬</i></div><div class="pg-film-record"><b>P</b></div>
    <div class="pg-film-instrument">${modelSVG}</div><div class="pg-film-portrait"></div><div class="pg-film-particles">${Array.from({length:32},(_,i)=>`<i style="--x:${(i*37)%100}%;--y:${(i*61)%100}%;--d:${i%7*.05}s"></i>`).join('')}</div>`;
  const shell = document.createElement('div'); shell.className = 'pg-film'; shell.hidden = true;
  shell.setAttribute('role','status'); shell.setAttribute('aria-live','polite');
  shell.innerHTML = `<div class="pg-film-scene" aria-hidden="true">${themeScene}</div><div class="pg-film-copy"><small>PAGANINI · LA MUSIQUE CONTINUE</small><p></p></div>`;
  shell.style.setProperty('--portrait', `url("${asset('assets/images/paganini-portrait.jpg')}")`);
  document.body.append(shell);
  let leaving = false, timer, releaseTimer;
  function reset() {
    clearTimeout(timer); clearTimeout(releaseTimer); leaving = false; shell.hidden = true;
    shell.classList.remove('is-running','is-entering'); document.body.removeAttribute('aria-busy');
    document.querySelectorAll('.transition,.cinema-portal').forEach(el => el.classList.remove('active','closed','is-active'));
  }
  function show(theme,title,entering = false) {
    shell.dataset.theme=theme; shell.querySelector('.pg-film-copy p').textContent=title;
    shell.hidden=false; shell.classList.remove('is-running','is-entering'); void shell.offsetWidth;
    shell.classList.add('is-running'); if (entering) shell.classList.add('is-entering');
  }
  // Only life progression is gated; all other original reference pages remain readable.
  function required(url) {
    const m=url.pathname.match(/\/life\/scene(\d+)\.html$/); if(!m) return null;
    const n=Number(m[1]); let a=false,b=false;
    try { a=localStorage.getItem('pg_scene03_pass_goal80')==='passed-v3-100'; b=localStorage.getItem('pg_scene04_pass_goal80')==='passed-v3-100'; } catch {}
    if(n>=4&&!a) return ['life/scene03.html','请先完成年少练习挑战，达到本曲满分的 80%，再继续下一阶段。'];
    if(n>=5&&!b) return ['life/scene04.html','请先完成少年演出挑战，达到本曲满分的 80%，再继续下一阶段。'];
    return null;
  }
  const announce = message => { if(window.Paganini?.toast) window.Paganini.toast(message); else { let el=$('.pg-shell-notice'); if(!el){el=document.createElement('p');el.className='pg-shell-notice';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;clearTimeout(el._timer);el._timer=setTimeout(()=>el.remove(),6000); } };
  function navigate(url,theme,title) {
    if(leaving)return; leaving=true;
    window.Paganini?.audio?.stopAll(); window.dispatchEvent(new CustomEvent('paganini:navigate'));
    document.body.setAttribute('aria-busy','true');
    if(reduced()) { location.assign(url); return; }
    show(theme,title); set('pg-film-pending',JSON.stringify({theme,title}));
    timer=setTimeout(()=>{ location.assign(url); releaseTimer=setTimeout(reset,1800); },850);
  }
  // Window capture runs before old per-page document capture or link listeners.
  window.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest?.('a[href]'); if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
    let u;try{u=new URL(a.href,location.href)}catch{return;}
    if(u.origin!==location.origin||!u.pathname.endsWith('.html')||(u.pathname===location.pathname&&u.hash))return;
    const gate=required(u);
    if(gate||a.classList.contains('locked-link')||a.getAttribute('aria-disabled')==='true'){
      e.preventDefault();e.stopImmediatePropagation(); announce(gate?.[1]||'请先达到本曲满分的 80%，才能继续下一幕。');return;
    }
    const row=routes.find(r=>u.pathname.endsWith('/'+r[0])) || ['','人生 · 下一幕','stage'];
    e.preventDefault();e.stopImmediatePropagation(); a.classList.add('is-selected'); navigate(u.href,row[2],row[1]);
  },true);
  function enter() {
    reset(); const pending=get('pg-film-pending'); try{sessionStorage.removeItem('pg-film-pending')}catch{}
    if(!pending||reduced())return;
    try{const p=JSON.parse(pending);show(p.theme,p.title,true);releaseTimer=setTimeout(reset,600)}catch{reset()}
  }
  window.addEventListener('pageshow',enter); window.addEventListener('pagehide',reset);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!leaving)reset()});
  if(document.readyState==='complete')enter();
  // Direct URL entry cannot bypass chapter progression. A readable notice routes to the prerequisite.
  const directGate=required(new URL(location.href));
  if(directGate) {
    const gate=document.createElement('section');gate.className='pg-chapter-gate';
    gate.innerHTML='<p class="eyebrow">CONTINUE YOUR JOURNEY</p><h1>这一幕尚未解锁</h1><p></p><a class="btn primary">返回尚未完成的挑战 →</a><a class="btn subtle">返回封页</a>';
    gate.querySelector('p:not(.eyebrow)').textContent=directGate[1];gate.querySelectorAll('a')[0].href=asset(directGate[0]);gate.querySelectorAll('a')[1].href=asset('index.html');
    const main=$('main');if(main){main.hidden=true;main.inert=true;main.before(gate);document.body.classList.add('pg-gated');}
    window.Paganini?.audio?.stopAll();
  }
  const bar=document.createElement('div');bar.className='pg-reading-progress';document.body.append(bar);
  let queued=false;window.addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{bar.style.width=100*scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'%';queued=false;})},{passive:true});
  if('IntersectionObserver'in window){const obs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');obs.unobserve(entry.target)}})},{threshold:.03});document.querySelectorAll('.feature,.track,.portal-card,.cta-inner,.style-break').forEach(el=>{el.classList.add('pg-reveal');obs.observe(el)});}
  // The smaller legacy story/style pages do not have the shared Paganini controller.
  if(!window.Paganini){
    const motion=$('[data-motion-toggle]'),mute=$('[data-mute-toggle]');
    let less=get('paganini-motion')==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
    let silent=get('paganini-mute')==='1';
    function refresh(){document.documentElement.classList.toggle('reduce-motion',less);document.documentElement.classList.toggle('less-motion',less);motion?.setAttribute('aria-pressed',String(less));motion?.setAttribute('aria-label',less?'恢复动态效果':'减少动态效果');mute?.setAttribute('aria-pressed',String(silent));mute?.setAttribute('aria-label',silent?'解除静音':'静音并停止声音');if(mute)mute.textContent=silent?'◌':'♪';}
    refresh();
    window.addEventListener('click',e=>{
      if(e.target.closest?.('[data-motion-toggle]')){e.stopImmediatePropagation();less=!less;set('paganini-motion',less?'reduced':'full');refresh();}
      if(e.target.closest?.('[data-mute-toggle]')){e.stopImmediatePropagation();silent=!silent;set('paganini-mute',silent?'1':'0');document.querySelectorAll('audio,video').forEach(media=>{media.muted=silent;if(silent)media.pause()});if(silent){window.speechSynthesis?.cancel();window.dispatchEvent(new CustomEvent('paganini:audio-stop'));}refresh();}
    },true);
  }
  // First-visit opening: explicit user choice, no audible autoplay.
  async function opening() {
    if(!document.body.matches('[data-page="cover"]')||get('pg-intro-v3')==='seen')return;
    const intro=document.createElement('section');intro.className='pg-overture';intro.setAttribute('role','dialog');intro.setAttribute('aria-modal','true');intro.setAttribute('aria-labelledby','pg-overture-title');
    intro.style.setProperty('--portrait',`url("${asset('assets/images/paganini-portrait.jpg')}")`);
    intro.innerHTML=`<div class="pg-overture-stage" aria-hidden="true"><div class="pg-overture-light"></div><div class="pg-overture-model">${modelSVG}</div><div class="pg-overture-curtain left"></div><div class="pg-overture-curtain right"></div><div class="pg-overture-portrait"></div></div><div class="pg-overture-copy"><p class="eyebrow">GENOVA · 1782 / NICE · 1840</p><h2 id="pg-overture-title">NICCOLÒ<br>PAGANINI</h2><p class="pg-overture-subtitle">THE DEVIL'S VIOLINIST</p><p class="pg-overture-invitation">请就座。让琴声，翻开一生。</p><div class="pg-overture-choices"><button class="btn primary" data-intro-sound>开始体验 · 开启音乐</button><button class="btn subtle" data-intro-silent>静音进入</button></div></div><button class="pg-intro-skip">SKIP INTRO <span>跳过开场 →</span></button>`;
    document.body.append(intro);document.body.style.overflow='hidden';
    const main=$('main');if(main)main.inert=true;const previous=document.activeElement;let finished=false,introTimer,host;
    const dismiss=()=>{if(finished)return;finished=true;clearTimeout(introTimer);set('pg-intro-v3','seen');intro.remove();document.body.style.overflow='';if(main)main.inert=false;host?.destroy();(previous?.matches('button,a')?previous:main)?.focus({preventScroll:true});};
    function begin(sound){if(intro.classList.contains('is-playing'))return;intro.classList.add('is-playing');intro.querySelectorAll('.pg-overture-choices button').forEach(b=>b.disabled=true);intro.querySelector('.pg-intro-skip').focus();if(sound&&!window.Paganini?.audio?.isMuted()){const audio=$('[data-opening-audio]');if(audio)window.Paganini?.audio?.play(audio);}else window.Paganini?.audio?.stopAll();if(reduced())dismiss();else introTimer=setTimeout(dismiss,7200);}
    intro.querySelector('[data-intro-sound]').onclick=()=>begin(true);intro.querySelector('[data-intro-silent]').onclick=()=>begin(false);intro.querySelector('.pg-intro-skip').onclick=()=>{window.Paganini?.audio?.stopAll();dismiss()};
    intro.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dismiss()}if(e.key==='Tab'){const bs=[...intro.querySelectorAll('button:not(:disabled)')];if(!bs.length)return;const at=bs.indexOf(document.activeElement);if((e.shiftKey&&at<=0)||(!e.shiftKey&&at===bs.length-1)){e.preventDefault();bs[e.shiftKey?bs.length-1:0].focus()}}});
    intro.querySelector('[data-intro-sound]').focus();
    try{
      const {THREE,SceneHost,createInstrument}=await import(asset('assets/js/three-scenes-shared.js'));
      if(finished)return;const view=intro.querySelector('.pg-overture-model');
      host=new SceneHost(view,{camera:[0,1.2,6],target:[0,.6,0]});host.scene.add(new THREE.HemisphereLight(0xffdcaa,0x17100a,2));const light=new THREE.DirectionalLight(0xffd5a2,4);light.position.set(-3,4,5);host.scene.add(light);const model=createInstrument('violin');host.scene.add(model);model.rotation.z=-.25;
      host.callbacks.push(t=>{if(!reduced())model.rotation.y=Math.sin(t*.2)*.3;});view.classList.add('has-webgl');
    }catch{/* SVG violin remains available when WebGL or module loading is unavailable. */}
    window.addEventListener('pagehide',dismiss,{once:true});
  }
  window.PaganiniTheatre={navigate,reset,reduced,required,base:base.href};
  // Run after inline controllers have registered media and controls.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',opening,{once:true});else opening();
})();

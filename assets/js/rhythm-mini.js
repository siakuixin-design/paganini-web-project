/* Paganini rhythm engine: decoded recording, AudioContext clock, editable onset charts. */
(function (global) {
  'use strict';
  const POINTS = Object.freeze({PERFECT:100, GREAT:80, GOOD:50, MISS:0});
  const WINDOWS = Object.freeze({PERFECT:.075, GREAT:.15, GOOD:.24});
  function judge(delta) {
    const d = Math.abs(delta);
    return d <= WINDOWS.PERFECT ? 'PERFECT' : d <= WINDOWS.GREAT ? 'GREAT' : d <= WINDOWS.GOOD ? 'GOOD' : 'MISS';
  }
  function normalizeChart(events, lanes, duration = Infinity) {
    return events.map(n => ({t:Number(n.t), lane:Number(n.lane)}))
      .filter(n => Number.isFinite(n.t) && n.t >= 0 && n.t < duration && Number.isInteger(n.lane) && n.lane >= 0 && n.lane < lanes)
      .sort((a,b) => a.t-b.t);
  }
  function summarize(counts, total, best) {
    const maximum = total * POINTS.PERFECT;
    const score = Object.keys(POINTS).reduce((n,k) => n + (counts[k] || 0)*POINTS[k], 0);
    const goal = Math.ceil(maximum*.8);
    return {score, maximum, goal, percentage:maximum ? score/maximum*100 : 0, passed:maximum > 0 && score >= goal, counts:{...counts}, best};
  }
  const core = {POINTS, WINDOWS, judge, normalizeChart, summarize};
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (!global.document) return;
  const instances = new Set();
  const scriptURL = document.currentScript?.src || new URL('assets/js/rhythm-mini.js', location.href).href;
  const sheet = document.createElement('link'); sheet.rel='stylesheet'; sheet.href=new URL('../css/rhythm-upgrade.css',scriptURL).href; document.head.append(sheet);
  const sampleURLs = {guitar:new URL('../audio/samples/guitar/C4.mp3',scriptURL).href, violin:new URL('../audio/samples/violin/C4.mp3',scriptURL).href};
  let sequence=0;
  function create(root, options) {
    if (!root || root.paganiniGame) return root?.paganiniGame || null;
    const cfg = Object.assign({piece:'帕格尼尼 · 音乐挑战',keys:['J','K','L'],instrument:'violin',audioSrc:'',chart:[]}, options);
    const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
    const canvas=$('.rg-canvas'), ctx=canvas?.getContext('2d'); if(!ctx) return null;
    const keys=cfg.keys.map(k=>k.toUpperCase()), storage=root.dataset.storageKey || '';
    root.id ||= storage.includes('scene03') ? 'pg-scene03-rhythm' : storage.includes('scene04') ? 'pg-scene04-rhythm' : 'paganini-rhythm-'+(++sequence);
    const unlockLink = root.dataset.unlockTarget ? document.querySelector(root.dataset.unlockTarget) : null;
    const startButton=$('.rg-start'), retryButton=$('.rg-retry'), result=$('.rg-result'), status=$('.rg-status');
    if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite')}
    const toolbar=$('.rg-toolbar');
    const pauseButton=document.createElement('button'); pauseButton.type='button'; pauseButton.className='btn rg-pause';pauseButton.textContent='暂停';pauseButton.disabled=true;toolbar?.append(pauseButton);
    const intro=document.createElement('div'); intro.className='rg-brief';
    intro.innerHTML='<p><b>NICCOLÒ PAGANINI</b> · <span class="rg-instrument-name"></span> · MEDIUM</p><p>J / K / L 或触控琴弦。PERFECT 100 · GREAT 80 · GOOD 50 · MISS 0。过关须达理论最高分的 80%。</p><p class="rg-chart-note">简化起音谱面：时间取自录音起音分析，三条音轨为人工游戏编排，并非原曲准确音高谱。</p>';
    intro.querySelector('.rg-instrument-name').textContent=cfg.instrument==='guitar'?'木吉他':'小提琴';
    canvas.before(intro);
    const calibration=document.createElement('label');calibration.className='rg-calibration';
    calibration.innerHTML='谱面时间校正 <input type="range" min="-200" max="200" step="10" value="0" aria-label="谱面时间校正（毫秒）"><output>0 ms</output><small>负值提前，正值延后；开始前按 J/K/L 试音。蓝牙耳机会增加延迟。</small>';
    toolbar?.after(calibration);
    const offsetInput=calibration.querySelector('input'), offsetOutput=calibration.querySelector('output');
    let chart=normalizeChart(cfg.chart,keys.length), notes=[], ac=null, song=null, sample=null, loading=null;
    let source=null, songGain=null, effects=new Set(), active=false, paused=false, finished=false, resumePending=false, token=0, previewGeneration=0, raf=0;
    let offset=0, startedAt=0, position=0, duration=0, counts={}, combo=0, best=0, perfectRun=0, width=900,height=380,dpr=1, feedback='', feedbackAt=0;
    const pitches=cfg.instrument==='guitar'?[52,57,62]:[60,64,67];
    function message(text){if(status)status.textContent=text}
    function saved(){try{return !!storage && localStorage.getItem(storage)==='passed-v3-100'}catch{return false}}
    function unlock(ok){if(unlockLink){unlockLink.classList.toggle('locked-link',!ok);unlockLink.setAttribute('aria-disabled',String(!ok));unlockLink.tabIndex=ok?0:-1}}
    function clock(){return active && ac ? Math.min(duration,Math.max(0,offset+ac.currentTime-startedAt)) : position}
    function event(name,detail){window.dispatchEvent(new CustomEvent(name,{detail:{rootId:root.id,sectionId:root.closest('section')?.id,instrument:cfg.instrument,...detail}}))}
    function summary(){return summarize(counts,notes.length,best)}
    function hud(){const s=summary(); if($('.rg-score'))$('.rg-score').textContent=s.score;if($('.rg-combo'))$('.rg-combo').textContent=combo;
      if($('.rg-goal'))$('.rg-goal').textContent=s.goal+'（满分 '+s.maximum+' 的 80%）';if($('.rg-maximum'))$('.rg-maximum').textContent=s.maximum;
      if($('.rg-piece'))$('.rg-piece').textContent=cfg.piece;
      if($('.rg-progress'))$('.rg-progress').style.width=(duration?Math.min(100,clock()/duration*100):0)+'%';
      root.dataset.combo=combo>=30?'30':combo>=20?'20':combo>=10?'10':'0';
    }
    function draw(){
      ctx.clearRect(0,0,width,height);const time=clock(), laneW=width/keys.length, hitY=height-58;
      const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,cfg.instrument==='guitar'?'#38271a':'#251c18');bg.addColorStop(1,'#0b0908');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
      // Three string-like lanes and a restrained theatre light.
      for(let lane=0;lane<keys.length;lane++){
        const x=(lane+.5)*laneW;const glow=ctx.createRadialGradient(x,0,0,x,0,height*.9);glow.addColorStop(0,'rgba(207,171,102,'+(combo>=30?'.18':'.07')+')');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(lane*laneW,0,laneW,height);
        ctx.strokeStyle='rgba(211,179,126,.4)';ctx.lineWidth=lane===1?2:1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height-40);ctx.stroke();
        ctx.fillStyle='#dec69a';ctx.font='bold 19px Georgia';ctx.textAlign='center';ctx.fillText(keys[lane],x,height-18);
        if(cfg.instrument==='guitar'){ctx.font='13px Georgia';ctx.fillText(['E3','A3','D4'][lane],x,24)}
      }
      ctx.strokeStyle='#e7c68a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,hitY);ctx.lineTo(width,hitY);ctx.stroke();
      const shift=Number(offsetInput.value)/1000;
      for(const n of notes){if(n.judged)continue;const y=hitY+(time-n.t-shift)*190;if(y< -20 || y>height+20)continue;const x=(n.lane+.5)*laneW;
        ctx.shadowColor='#cba76b';ctx.shadowBlur=12;ctx.fillStyle='#e8ca8d';ctx.beginPath();ctx.ellipse(x,y,18,9,-.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      }
      if(feedback && performance.now()-feedbackAt<650){ctx.font='bold 22px Georgia';ctx.fillStyle='#f1dfb9';ctx.textAlign='center';ctx.fillText(feedback,width/2,height*.28)}
      if(combo>=10 && !(window.Paganini?.isReduced?.())){ctx.fillStyle='rgba(217,183,118,.45)';for(let i=0;i<8;i++){const x=(Math.sin(i*73+time*.4)+1)*width*.5,y=(time*24+i*49)%height;ctx.fillRect(x,y,2,2)}}
    }
    function resize(){const r=canvas.getBoundingClientRect();width=Math.max(300,r.width||900);height=Math.max(280,r.height||380);dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw()}
    function stopSource(){if(source){source.onended=null;try{source.stop()}catch{}source.disconnect();source=null}if(songGain){songGain.disconnect();songGain=null}}
    function stopEffects(){for(const node of effects){try{node.stop()}catch{}node.disconnect()}effects.clear()}
    function reset(){token++;previewGeneration++;cancelAnimationFrame(raf);stopSource();stopEffects();active=false;paused=false;finished=false;resumePending=false;position=offset=0;
      counts={PERFECT:0,GREAT:0,GOOD:0,MISS:0};notes=chart.map(n=>({...n,judged:false}));combo=best=perfectRun=0;feedback='';if(result)result.hidden=true;
      startButton.disabled=false;startButton.textContent='开始挑战';if(retryButton)retryButton.hidden=true;pauseButton.disabled=true;pauseButton.textContent='暂停';offsetInput.disabled=false;
      root.dataset.state='ready';unlock(saved());hud();draw();message('准备就绪 · 点击开始。音频只在你操作后播放，判定与下落共用录音播放时钟。')}
    async function prepare(){
      if(!ac){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('浏览器不支持 Web Audio');ac=new AC({latencyHint:'interactive'})}
      const context=ac;
      await context.resume();
      // Song decoding alone is not readiness: concurrent preview/start calls must
      // also await the editable chart and sample. Publish all resources together.
      if(loading){await loading;return}
      if(song)return;
      const pending=(async()=>{
        const response=await fetch(cfg.audioSrc);if(!response.ok)throw new Error('录音请求失败 '+response.status);const decodedSong=await context.decodeAudioData(await response.arrayBuffer());
        let events=cfg.chart, decodedSample=null;
        if(cfg.chartSrc!==false){
          const chartResponse=await fetch(cfg.chartSrc||cfg.audioSrc.replace(/\.mp3(?=$|\?)/,'.json'));
          if(!chartResponse.ok)throw new Error('谱面请求失败 '+chartResponse.status);
          const data=await chartResponse.json();if(!Array.isArray(data.events))throw new Error('谱面格式不正确');
          const adjustment=Number(data.manualOffsetSeconds||0);if(!Number.isFinite(adjustment))throw new Error('谱面时间偏移无效');
          events=data.events.map(n=>({...n,t:Number(n.t)+adjustment}));
        }
        const decodedChart=normalizeChart(events,keys.length,decodedSong.duration);if(!decodedChart.length || decodedChart.length!==events.length)throw new Error('谱面存在无效或超出录音时长的音符');
        try{const r=await fetch(cfg.instrument==='guitar'?(cfg.guitarSample||sampleURLs.guitar):sampleURLs.violin);if(r.ok)decodedSample=await context.decodeAudioData(await r.arrayBuffer())}catch{/* Frequency-correct fallback below. */}
        if(ac!==context || context.state==='closed')throw new Error('音频会话已关闭，请重新开始');
        song=decodedSong;duration=song.duration;sample=decodedSample;chart=decodedChart;
      })();
      loading=pending;
      try{await pending}finally{if(loading===pending)loading=null}
    }
    function sampleTap(lane){
      if(!ac || ac.state!=='running')return;
      const now=ac.currentTime,midi=pitches[lane],level=ac.createGain();level.gain.setValueAtTime(.001,now);level.gain.exponentialRampToValueAtTime(cfg.instrument==='guitar'?.23:.07,now+.008);level.gain.exponentialRampToValueAtTime(.0001,now+.58);level.connect(ac.destination);
      const node=sample?ac.createBufferSource():ac.createOscillator();if(sample){node.buffer=sample;node.playbackRate.value=Math.pow(2,(midi-60)/12)}else{node.type='triangle';node.frequency.value=440*Math.pow(2,(midi-69)/12)}
      node.connect(level);effects.add(node);node.onended=()=>{effects.delete(node);node.disconnect();level.disconnect()};node.start(now);node.stop(now+.62);
      event('paganini:note',{lane,midi});
    }
    async function preview(lane){const generation=previewGeneration;try{if(window.Paganini?.audio?.isMuted?.()){message('请先解除右上角的静音。');return}await prepare();if(generation!==previewGeneration || active || paused || window.Paganini?.audio?.isMuted?.())return;sampleTap(lane);message('试音 · '+(cfg.instrument==='guitar'?['E3 · 164.81 Hz','A3 · 220 Hz','D4 · 293.66 Hz'][lane]:['C4','E4','G4'][lane])+(sample?' · 真实采样':' · 合成备用'))}catch(e){if(generation===previewGeneration)message('音频尚未就绪：'+e.message)}}
    function mark(note,verdict){note.judged=true;counts[verdict]++;if(verdict==='MISS'){combo=perfectRun=0}else{combo++;best=Math.max(best,combo);perfectRun=verdict==='PERFECT'?perfectRun+1:0}}
    function overdue(time){const shift=Number(offsetInput.value)/1000;for(const n of notes)if(!n.judged && time>n.t+shift+WINDOWS.GOOD)mark(n,'MISS')}
    function hit(lane){
      if(root.closest('[data-instrument-game]')?.hidden || lane<0 || lane>=keys.length)return;
      if(!active){if(!paused)void preview(lane);return}
      const time=clock();overdue(time);const shift=Number(offsetInput.value)/1000;
      sampleTap(lane);const button=$$('[data-rg-lane]').find(b=>Number(b.dataset.rgLane)===lane);if(button){button.classList.remove('hit');void button.offsetWidth;button.classList.add('hit')}
      const choice=notes.filter(n=>!n.judged&&n.lane===lane).sort((a,b)=>Math.abs(a.t+shift-time)-Math.abs(b.t+shift-time))[0];
      const verdict=choice?judge(time-choice.t-shift):'MISS';
      if(choice && verdict!=='MISS')mark(choice,verdict);else{combo=perfectRun=0;/* Empty taps break combo, but cannot invent extra chart misses. */}
      feedback=perfectRun>=5?'EXCELLENT PERFORMANCE!':verdict;feedbackAt=performance.now();message(feedback);hud();draw();
    }
    function finish(){if(finished)return;finished=true;active=paused=false;position=duration;cancelAnimationFrame(raf);stopSource();stopEffects();for(const n of notes)if(!n.judged)mark(n,'MISS');
      const s=summary();if(s.passed){try{if(storage)localStorage.setItem(storage,'passed-v3-100')}catch{}}unlock(saved()||s.passed);
      result.hidden=false;result.dataset.ok=String(s.passed);result.replaceChildren();
      const heading=document.createElement('h4');heading.textContent=s.passed?'PERFORMANCE COMPLETED · PASS':'PERFORMANCE FAILED — TRY AGAIN';result.append(heading);
      const line=document.createElement('p');line.textContent=`最终 ${s.score} / 理论最高 ${s.maximum} · ${s.percentage.toFixed(1)}% · 过关线 ${s.goal}（80%）`;result.append(line);
      const stats=document.createElement('p');stats.textContent=`PERFECT ${counts.PERFECT}　GREAT ${counts.GREAT}　GOOD ${counts.GOOD}　MISS ${counts.MISS}　最高连击 ${best}`;result.append(stats);
      message(s.passed?'演出完成，下一幕已解锁。':'未达到最高分的 80%，可以重新挑战。');pauseButton.disabled=true;startButton.disabled=false;startButton.textContent='再次挑战';if(retryButton)retryButton.hidden=false;offsetInput.disabled=false;root.dataset.state='finished';hud();draw();event('paganini:game-result',s)
    }
    function frame(){if(!active)return;position=clock();overdue(position);hud();draw();if(position>=duration){finish();return}raf=requestAnimationFrame(frame)}
    function launch(){source=ac.createBufferSource();source.buffer=song;songGain=ac.createGain();songGain.gain.value=cfg.songVolume??.48;source.connect(songGain).connect(ac.destination);offset=position;startedAt=ac.currentTime;source.start(startedAt,offset);active=true;paused=false;root.dataset.state='playing';source.onended=()=>{if(active)finish()};pauseButton.disabled=false;pauseButton.textContent='暂停';raf=requestAnimationFrame(frame)}
    async function start(){
      if(window.Paganini?.audio?.isMuted?.()){message('请先解除右上角静音，再开始有声挑战。');return}
      reset();const current=token;startButton.disabled=true;root.dataset.state='loading';message('正在解码录音与真实乐器采样…');
      try{for(const game of instances)if(game!==api)game.stop();window.Paganini?.audio?.stopAll?.();window.dispatchEvent(new CustomEvent('paganini:audio-start',{detail:{owner:'rhythm',rootId:root.id}}));const generation=previewGeneration;await prepare();if(current!==token)return;
        if(generation!==previewGeneration || window.Paganini?.audio?.isMuted?.() || document.hidden){reset();message('声音会话已变化，准备好后请重新开始。');return}
        notes=chart.map(n=>({...n,judged:false}));offsetInput.disabled=true;hud();launch();message('MEDIUM · 听准音乐，在金线按 J / K / L。空按会中断连击。')
      }catch(e){if(current===token){message('无法开始：'+e.message+'。请使用本地 HTTP 服务器，检查录音路径后重试。');startButton.disabled=false;root.dataset.state='error'}}
    }
    function pause(){if(!active)return;position=clock();active=false;paused=true;stopSource();stopEffects();cancelAnimationFrame(raf);pauseButton.textContent='继续';root.dataset.state='paused';message('已暂停 · 录音与音符同时冻结。');draw()}
    async function resume(){if(!paused||resumePending)return;if(window.Paganini?.audio?.isMuted?.()){message('请先解除静音，再继续。');return}const current=token,context=ac;resumePending=true;try{await context.resume();if(current!==token||!paused||context!==ac||document.hidden||window.Paganini?.audio?.isMuted?.())return;for(const game of instances)if(game!==api)game.stop();window.Paganini?.audio?.stopAll?.();launch();message('继续演奏 · 与暂停位置同步。')}catch(e){if(current===token)message('恢复失败：'+e.message)}finally{if(current===token)resumePending=false}}
    const api={start,hit,reset,stop:reset,pause,resume,getState:()=>({state:root.dataset.state,time:clock(),duration,sampleReady:!!sample,feedbackMidi:[...pitches],...summary()})};root.paganiniGame=api;instances.add(api);
    startButton?.addEventListener('click',start);retryButton?.addEventListener('click',start);pauseButton.addEventListener('click',()=>paused?resume():pause());
    $$('[data-rg-lane]').forEach(b=>{
      b.addEventListener('pointerdown',e=>{e.preventDefault();hit(Number(b.dataset.rgLane))});
      // Keyboard and assistive activation emit click without a pointer event.
      b.addEventListener('click',e=>{if(e.detail===0)hit(Number(b.dataset.rgLane))});
    });
    offsetInput.addEventListener('input',()=>{offsetOutput.textContent=offsetInput.value+' ms';draw()});
    document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const lane=keys.findIndex(k=>'Key'+k===e.code);if(active&&lane>=0){e.preventDefault();e.stopImmediatePropagation();hit(lane)}else if(e.code==='Space'&&(active||paused)&&root.contains(document.activeElement)&&!document.activeElement.matches('button,a,input')){e.preventDefault();paused?resume():pause()}},true);
    if(unlockLink)document.addEventListener('click',e=>{if(e.target.closest?.('a')===unlockLink && !saved()){e.preventDefault();e.stopImmediatePropagation();message('请先取得理论最高分的 80%，再继续下一幕。');root.scrollIntoView({behavior:'smooth',block:'center'})}},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){previewGeneration++;pause()}});document.addEventListener('play',()=>{previewGeneration++;pause()},true);
    document.querySelectorAll('[data-mute-toggle]').forEach(b=>b.addEventListener('click',()=>{previewGeneration++;pause();stopEffects()}));
    window.addEventListener('paganini:audio-start',e=>{if(e.detail?.owner!=='rhythm'){previewGeneration++;pause()}});
    window.addEventListener('paganini:audio-stop',()=>{previewGeneration++;pause();stopEffects()});
    window.addEventListener('pagehide',()=>{reset();ac?.close().catch(()=>{});ac=null;song=sample=loading=null});
    document.addEventListener('click',e=>{if(e.target.closest?.('a[href]')){previewGeneration++;pause();stopEffects()}});
    window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
    reset();resize();return api;
  }
  global.PaganiniRhythmGame={create,...core};
})(typeof window === 'undefined' ? globalThis : window);

(function(){
  'use strict';
  const AC=window.AudioContext||window.webkitAudioContext;
  const NOTE_FREQ=[261.63,293.66,329.63,392,440,493.88];
  const KEYCODE=key=>'Key'+key.toUpperCase();
  function create(root,options){
    if(!root)return null;
    const cfg=Object.assign({piece:'帕格尼尼 · 音乐节奏挑战',goalRatio:.8,keys:['J','K','L'],instrument:'violin',hitWindowPerfect:.135,hitWindowGood:.34,audioSrc:'',chart:[]},options||{});
    const $=sel=>root.querySelector(sel), $$=sel=>[...root.querySelectorAll(sel)];
    const canvas=$('.rg-canvas');if(!canvas)return null;const ctx=canvas.getContext('2d');
    const scoreEl=$('.rg-score'),comboEl=$('.rg-combo'),goalEl=$('.rg-goal'),status=$('.rg-status'),result=$('.rg-result');
    const btnStart=$('.rg-start'),btnRetry=$('.rg-retry'),progress=$('.rg-progress'),piece=$('.rg-piece'),keys=cfg.keys.map(x=>x.toUpperCase());
    const storage=root.dataset.storageKey||'';const unlockSelector=root.dataset.unlockTarget||'';const unlockLink=unlockSelector?document.querySelector(unlockSelector):null;
    const buttons=$$('[data-rg-lane]');
    let audio=null,audioCtx=null,guitarBuffer=null,notes=[],active=false,raf=0,score=0,combo=0,best=0,time=0,width=900,height=380,dpr=1,hasFinished=false,instrument=cfg.instrument,runToken=0;
    const chart=cfg.chart.map(p=>({t:Number(p.t),lane:Number(p.lane)})).sort((a,b)=>a.t-b.t);
    const duration=chart.length?chart.at(-1).t+1.2:40;
    const maxScore=chart.length*120;
    const goal=Math.ceil(maxScore*(cfg.goalRatio??0.8));
    const guitarPitches=cfg.guitarPitches||[{label:'E3 · 低音',semitones:-8},{label:'A3 · 中音',semitones:-3},{label:'D4 · 高音',semitones:2}];
    if(goalEl)goalEl.textContent=String(goal)+'（满分 '+maxScore+' 的 80%）';
    if(piece)piece.textContent=cfg.piece;
    if(root.querySelector('.rg-maximum'))root.querySelector('.rg-maximum').textContent=maxScore;
    function message(txt){if(status)status.textContent=txt;}
    function resultMessage(txt,ok){if(result){result.hidden=!txt;result.dataset.ok=ok?'true':'false';result.textContent=txt||'';}}
    function isSaved(){try{return storage&&localStorage.getItem(storage)==='passed-v2'}catch{return false}}
    function save(){try{if(storage)localStorage.setItem(storage,'passed-v2')}catch{}}
    function unlock(ok){if(!unlockLink)return;unlockLink.classList.toggle('locked-link',!ok);unlockLink.setAttribute('aria-disabled',String(!ok));unlockLink.tabIndex=ok?0:-1;}
    function hud(){if(scoreEl)scoreEl.textContent=score;if(comboEl)comboEl.textContent=combo;if(progress)progress.style.width=(Math.min(1,time/duration)*100).toFixed(1)+'%';}
    function resize(){const r=canvas.getBoundingClientRect();width=Math.max(300,Math.round(r.width||900));height=Math.max(270,Math.round(r.height||380));dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
    function draw(){
      if(!width)return;ctx.clearRect(0,0,width,height);
      const laneW=width/keys.length,hitY=height-58;
      const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,instrument==='guitar'?'#26180f':'#17120f');bg.addColorStop(1,'#090807');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
      for(let i=0;i<keys.length;i++){
        const x=i*laneW;ctx.fillStyle=i%2?'rgba(229,190,128,.055)':'rgba(189,142,72,.035)';ctx.fillRect(x,0,laneW,height);ctx.strokeStyle='rgba(230,188,114,.18)';ctx.lineWidth=1;ctx.strokeRect(x+.5,.5,laneW-1,height-1);
        ctx.textAlign='center';ctx.fillStyle='#eaddc8';ctx.font='700 20px sans-serif';ctx.fillText(keys[i],x+laneW/2,height-18);
        if(instrument==='guitar'){ctx.font='14px serif';ctx.fillStyle='#d3af7a';ctx.fillText(guitarPitches[i]?.label||'Guitar',x+laneW/2,24)}
      }
      ctx.strokeStyle='#f0ce93';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,hitY);ctx.lineTo(width,hitY);ctx.stroke();
      for(const n of notes){if(n.judged)continue;
        const y=hitY+(time-n.t)*240;if(y < -25 || y > height+30)continue;
        const x=n.lane*laneW+laneW/2;
        const halo=ctx.createRadialGradient(x,y,0,x,y,27);halo.addColorStop(0,'rgba(245,213,155,.38)');halo.addColorStop(1,'rgba(245,213,155,0)');ctx.fillStyle=halo;ctx.fillRect(x-27,y-27,54,54);
        ctx.fillStyle=instrument==='guitar'?'#f3bd7e':'#f2d99b';ctx.beginPath();ctx.roundRect(x-19,y-12,38,24,9);ctx.fill();ctx.strokeStyle='#5b3d21';ctx.stroke();
      }
    }
    function stopAudio(){if(audio){audio.pause();try{audio.currentTime=0}catch{}}}
    function reset(){runToken++;cancelAnimationFrame(raf);active=false;hasFinished=false;stopAudio();score=0;combo=0;best=0;time=0;notes=chart.map(n=>({...n,judged:false}));hud();draw();message('点击开始播放作品录音。音符对应原曲音响起的时间，在金色线条上按相应按键。');resultMessage('',false);if(btnRetry)btnRetry.hidden=true;unlock(isSaved());}
    // The original <audio playbackRate> approach kept the pitch unchanged in
    // browsers with pitch correction enabled. AudioBufferSourceNode plays
    // C4 at different *rates*, so J / K / L genuinely sound E3 / A3 / D4.
    const defaultGuitarMidi = 60; // The bundled acoustic guitar sample is C4.
    let guitarLoadPromise = null;
    function initAudioContext(){
      if(!AC)return null;
      if(!audioCtx)audioCtx=new AC();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
      return audioCtx;
    }
    async function prepareGuitarSample(){
      if(instrument!=='guitar')return null;
      const ac=initAudioContext();if(!ac)return null;
      if(guitarBuffer)return guitarBuffer;
      if(guitarLoadPromise)return guitarLoadPromise;
      guitarLoadPromise=(async()=>{
        try{
          // This embedded sample also works when index.html is opened offline.
          const sample=window.PAGANINI_SAMPLE_BANK?.guitar?.find(x=>x.midi===defaultGuitarMidi);
          let raw;
          if(sample?.data){
            const binary=atob(sample.data.split(',')[1]);
            const bytes=new Uint8Array(binary.length);
            for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
            raw=bytes.buffer;
          } else if(cfg.guitarSample){
            const response=await fetch(cfg.guitarSample);
            if(!response.ok)throw new Error('Sample unavailable');
            raw=await response.arrayBuffer();
          }
          if(raw)guitarBuffer=await ac.decodeAudioData(raw);
        }catch(e){/* Keep the pitched plucked-string fallback available. */}
        return guitarBuffer;
      })();
      return guitarLoadPromise;
    }
    function pluckedFallback(ac,midi){
      // Clearly different fundamental frequencies even if a sample cannot decode.
      const now=ac.currentTime, frequency=440*Math.pow(2,(midi-69)/12);
      const env=ac.createGain();env.gain.setValueAtTime(.001,now);
      env.gain.exponentialRampToValueAtTime(.15,now+.006);
      env.gain.exponentialRampToValueAtTime(.0001,now+.72);
      const filter=ac.createBiquadFilter();filter.type='lowpass';
      filter.frequency.setValueAtTime(2400,now);
      filter.frequency.exponentialRampToValueAtTime(650,now+.6);
      filter.connect(env).connect(ac.destination);
      [1,2,3].forEach((multiplier,index)=>{
        const osc=ac.createOscillator(),partial=ac.createGain();
        osc.type='triangle';osc.frequency.value=frequency*multiplier;
        partial.gain.value=[.9,.22,.09][index];
        osc.connect(partial).connect(filter);osc.start(now);osc.stop(now+.74);
        osc.onended=()=>{osc.disconnect();partial.disconnect();};
      });
      setTimeout(()=>{filter.disconnect();env.disconnect();},850);
    }
    function sampleTap(lane){
      try{
        const ac=initAudioContext();if(!ac)return;
        if(instrument==='guitar'){
          const semitones=guitarPitches[lane]?.semitones ?? 0;
          const midi=defaultGuitarMidi+semitones;
          // Kick off decoding on demand; this is also preloaded at game start.
          if(!guitarBuffer)void prepareGuitarSample();
          if(guitarBuffer){
            const now=ac.currentTime;
            const source=ac.createBufferSource(),level=ac.createGain();
            source.buffer=guitarBuffer;
            source.playbackRate.value=Math.pow(2,semitones/12);
            level.gain.setValueAtTime(.001,now);
            level.gain.exponentialRampToValueAtTime(.31,now+.008);
            level.gain.exponentialRampToValueAtTime(.0001,now+.86);
            source.connect(level).connect(ac.destination);
            source.start(now);source.stop(now+.89);
            source.onended=()=>{source.disconnect();level.disconnect();};
          }else{pluckedFallback(ac,midi);}
          return;
        }
        const osc=ac.createOscillator(),gain=ac.createGain(),now=ac.currentTime;
        osc.type='triangle';osc.frequency.value=NOTE_FREQ[(lane+3)%NOTE_FREQ.length];gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.06,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+.22);osc.connect(gain).connect(ac.destination);osc.start();osc.stop(now+.24);
      }catch{}
    }
    function hit(lane){
      if(root.closest('[data-instrument-game]')?.hidden)return;
      if(!active||!audio||audio.paused){
        if(instrument==='guitar'){
          sampleTap(lane);
          message('吉他试音：'+(guitarPitches[lane]?.label||'木吉他')+'。点击「开始挑战」后跟随音符计分。');
        }
        return;
      }
      time=audio.currentTime;
      const button=buttons.find(x=>Number(x.dataset.rgLane)===lane);if(button){button.classList.remove('hit');void button.offsetWidth;button.classList.add('hit')}
      sampleTap(lane);
      const choice=notes.filter(x=>!x.judged&&x.lane===lane).sort((a,b)=>Math.abs(a.t-time)-Math.abs(b.t-time))[0];
      if(choice&&Math.abs(choice.t-time)<=cfg.hitWindowGood){choice.judged=true;const perfect=Math.abs(choice.t-time)<=cfg.hitWindowPerfect;score+=perfect?120:90;combo++;best=Math.max(best,combo);message(perfect?'PERFECT ✦ 和原曲同拍！':'GOOD ♪ 跟上节奏！');}
      else{combo=0;message('MISS · 注意听音乐，等音符靠近判定线再按。');}
      hud();draw();
    }
    function finish(){if(hasFinished)return;hasFinished=true;active=false;cancelAnimationFrame(raf);if(audio)audio.pause();const ok=score>=goal;
      if(ok){save();unlock(true);resultMessage(`★ 通关成功！得分 ${score} / ${goal}，最高连击 ${best}。`,true);message('恭喜达到本曲满分的 80%，作品节奏挑战已通过。');}
      else{unlock(isSaved());resultMessage(`本次得分 ${score} / ${goal}；请再挑战一次，听准原曲节奏。`,false);message('未达到本曲满分的 80%，可点击「重新挑战」再试。');}
      if(btnRetry)btnRetry.hidden=false;if(btnStart)btnStart.textContent='再次挑战';
    }
    function frame(){if(!active)return;if(!audio||audio.paused){raf=requestAnimationFrame(frame);return;}
      time=audio.currentTime;for(const note of notes){if(!note.judged && time>note.t+cfg.hitWindowGood){note.judged=true;combo=0;}}
      hud();draw();if(time>=duration||audio.ended){finish();return;}raf=requestAnimationFrame(frame);
    }
    async function start(){
      reset();const token=runToken;
      if(instrument==='guitar')void prepareGuitarSample();
      if(!cfg.audioSrc){message('缺少作品录音，无法启动与音乐同步的关卡。');return;}
      audio=audio||new Audio();audio.src=cfg.audioSrc;audio.preload='auto';audio.volume=cfg.songVolume ?? .48;
      try{await audio.play();if(token!==runToken){audio.pause();return;}}
      catch(e){message('音频加载失败：请检查素材文件路径，并使用 Chrome/Edge 打开网站。');resultMessage('未成功播放作品录音；为了保证节奏判定准确，未开始挑战。',false);return;}
      active=true;if(btnStart)btnStart.textContent='重新开始';message('音乐已开始！跟随原曲的音响落点按键，目标：最高分的 80%。');raf=requestAnimationFrame(frame);
    }
    function setInstrument(name){instrument=name;$$('[data-rg-instrument]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.rgInstrument===name)));const b=$('.rg-instrument-current');if(b)b.textContent={guitar:'吉他',violin:'小提琴',mandolin:'曼陀林'}[name]||name;draw();}
    btnStart?.addEventListener('click',start);btnRetry?.addEventListener('click',start);
    buttons.forEach(btn=>btn.addEventListener('pointerdown',e=>{e.preventDefault();hit(Number(btn.dataset.rgLane))}));
    $$('[data-rg-instrument]').forEach(b=>b.addEventListener('click',()=>setInstrument(b.dataset.rgInstrument)));
    document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const lane=keys.findIndex(k=>KEYCODE(k)===e.code);if(lane<0)return;if(active){e.preventDefault();e.stopImmediatePropagation();hit(lane);}},true);
    if(unlockLink)unlockLink.addEventListener('click',e=>{if(unlockLink.classList.contains('locked-link')){e.preventDefault();message('请先在本页取得最高分的 80%，才能继续下一幕。')}});
    window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){reset();message('页面切到后台，挑战已停止；请重新开始，保持音乐与判定同步。')}});
    resize();reset();if(isSaved()){resultMessage('你在这个新版音乐游戏中已经通关，可以继续。',true);unlock(true)}
    return {start,hit,reset,stop:()=>{if(active||audio)reset()}};
  }
  window.PaganiniRhythmGame={create};
})();

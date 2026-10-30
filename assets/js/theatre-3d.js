/* Shared, lazy-loaded 3D biography. Original pages and text stay in the document. */
(() => {
 'use strict';
 if(document.body.classList.contains('pg-gated'))return;
 const page=document.body.dataset.page;
 const chapters={
  scene02:{label:'1782 · 热那亚',title:'一束光，照进热那亚',intro:'从城市外的屋顶靠近一间家屋。点击摇篮、窗户或炉火，镜头会带你走近。',kind:'birth'},
  scene03:{label:'THE PRACTICE ROOM',title:'年少练习室',intro:'在灯下找到小提琴。点击琴身，靠近乐器，再进入与录音同步的练习挑战。',kind:'practice'},
  scene04:{label:'THE FIRST STAGE',title:'从后台，走向聚光灯',intro:'幕布、乐谱与观众席之间，少年演奏者准备迎接听众。',kind:'concert'},
  scene05:{label:'1801—1831 · EUROPE',title:'越过城市，留下声音',intro:'点击地图上的城市，查看有史料依据的生涯节点；家庭物件记录舞台之外的人生。',kind:'tour'},
  scene06:{label:'THE LATE YEARS',title:'雨声里的房间',intro:'放慢脚步。窗外下着雨，琴与未合上的乐谱留在房间里。',kind:'late'},
  scene07:{label:'1840 · NICE',title:'余音，仍在延续',intro:'镜头离开房间，留下名字与年代。点击继续，走向原有的音乐遗产篇章。',kind:'ending'},
  prologue:{label:'OVERTURE',title:'剧场即将开幕',intro:'从后台望向舞台。探索灯光与乐器，然后沿下方原有剧情开始人生体验。',kind:'concert'}
 };
 // The existing prologue uses data-page="begining" on some revisions.
 const cfg=chapters[page]||(location.pathname.endsWith('/begining.html')?chapters.prologue:null);if(!cfg)return;
 const source=document.currentScript?.src||new URL('assets/js/theatre-3d.js',location.href).href;
 const section=document.createElement('section');section.className='pg-3d-section wrap';section.dataset.threeScene=cfg.kind;
 section.innerHTML=`<div class="pg-3d-heading"><div><p class="eyebrow">${cfg.label} / INTERACTIVE 3D</p><h2>${cfg.title}</h2></div><span class="pg-3d-badge">可探索 · 3D 场景原型</span></div><p class="pg-3d-intro">${cfg.intro}</p><div class="pg-3d-viewport"><p class="pg-3d-loading" role="status">正在准备灯光与场景…</p><div class="pg-3d-cinema-title" hidden>NICCOLÒ PAGANINI<small>1782 — 1840</small></div><button type="button" class="pg-3d-skip">跳过镜头动画</button></div><div class="pg-3d-objects" role="group" aria-label="探索场景物品"></div><div class="pg-3d-caption"><p class="pg-3d-narrative" role="status" aria-live="polite">${cfg.intro}</p><button type="button" class="btn pg-3d-continue">继续探索 →</button></div><p class="pg-3d-note">程序化三维模型 · 艺术化环境重建，并非历史建筑或实物的精确复原。原有完整图文保留在下方。</p>`;
 const hero=document.querySelector('main > .chapter-hero');if(hero)hero.after(section);else document.querySelector('main')?.prepend(section);
 const viewport=section.querySelector('.pg-3d-viewport'),objects=section.querySelector('.pg-3d-objects'),narrative=section.querySelector('.pg-3d-narrative'),loading=section.querySelector('.pg-3d-loading'),skip=section.querySelector('.pg-3d-skip');
 let host=null,module=null,model=null,index=-1,passed=false,hotspots=[],loaded=false,dead=false,sequence=null,returnTimer=null;
 let endingAudio=null,endingFrame=0,endingRun=0,endingStarting=false,endingButton=null,endingNotice=null;
 function stopEnding(dispose=false){endingRun++;cancelAnimationFrame(endingFrame);endingFrame=0;if(endingAudio){endingAudio.pause();if(dispose){endingAudio.removeAttribute('src');endingAudio.load();}}if(endingButton){endingButton.textContent='播放落幕音乐';endingButton.setAttribute('aria-pressed','false');}section.dataset.endingPlaying='false';}
 function practice(){const game=document.querySelector('.rg-wrap');if(!game){narrative.textContent='请继续向下阅读，音乐挑战位于本章后半段。';return;}game.scrollIntoView({behavior:module?.reduced()?'auto':'smooth',block:'center'});game.querySelector('.rg-start')?.focus({preventScroll:true});}
 const definitions={
  birth:[['cradle','摇篮',[0,1.7,3.4],[0,.65,-.4],'1782 年 10 月 27 日，尼科洛·帕格尼尼出生于热那亚。这座港口城市是他生命的起点。'],['window','热那亚窗景',[2.5,2.6,-.4],[2.2,2.5,-4],'18 世纪的热那亚是一座港口城市。眼前街屋为艺术化概括，不代表他的故居原貌。'],['hearth','炉火',[-2.3,1.7,-.3],[-2.7,.8,-3.5],'关于家庭与早年生活的完整文字，继续保留在下方原有章节。']],
  practice:[['violin','靠近小提琴',[-.3,2.1,1.7],[-1.7,1.5,-1.5],'小提琴练习需要反复磨练握弓、音准与配合。准备好后，进入音乐挑战。','game'],['score','乐谱架',[1.3,2.1,1.5],[1,1.6,-1],'这里的纸页是场景道具，不是所播放作品的准确乐谱。音乐挑战使用可校正的简化节奏谱。'],['window','窗前的时间',[2.5,2.5,-.4],[2.2,2.5,-4],'多年的练习不能由一场游戏概括。通过挑战后，窗外将从白昼缓缓转为夜晚。']],
  concert:[['curtain','打开幕布',[0,2.8,7],[0,1.8,-1.8],'幕布开启。舞台的光线照亮乐器，听众在观众席等待。','curtain'],['violin','演奏挑战',[0,2.5,3],[0,1.5,-1],'少年时期的公开演奏让帕格尼尼开始走向听众。这是节奏挑战，并非历史演出的逐音重现。','game'],['audience','观众席',[3,2.2,-.5],[0,.9,3],'观众以简化三维剪影呈现。通过本章演奏挑战后，舞台光线将随之增强。']],
  tour:[['lucca','卢卡 · 1801',[1,7,5],[-1,.4,.8],'1801 年起，帕格尼尼在卢卡工作；1805 年成为埃莉萨·巴乔基宫廷的乐手。他的音乐生涯在意大利逐步展开。'],['vienna','维也纳 · 1828',[2,7,4],[1.2,.4,-.2],'1828 年，帕格尼尼在维也纳演出，开启他声名卓著的欧洲巡演重要阶段。'],['paris','巴黎 · 1831',[-2,7,4],[-1.8,.4,-1],'1831 年，帕格尼尼在巴黎演出，他的演奏令当地音乐界瞩目。'],['london','伦敦 · 1831',[-3,7,2],[-2.5,.4,-2],'1831 年，帕格尼尼到伦敦演出；这些城市与年份是生涯节点，并非一张完整的逐站行程表。'],['family','家庭 · 1825',[2.4,2,3],[3.1,1,1.5],'歌唱家 Antonia Bianchi 是他的伴侣，儿子 Achille 于 1825 年在巴勒莫出生。这里没有编造家庭对话；轮廓与物件只作艺术表达。']],
  late:[['window','雨窗',[2.4,2.5,-.5],[2.2,2.5,-4],'晚年的帕格尼尼受到健康问题困扰。雨景是艺术表达，不是某一天的气象记录。'],['violin','静置的琴',[0,2,2],[-1.7,1.5,-1.5],'演奏生涯之外，作品与乐器仍然见证他的音乐。他晚年的生活说明保留在下方。'],['score','未合上的乐谱',[1.3,2.1,1.5],[1,1.6,-1],'纸页没有发声。继续阅读，了解健康变化与最后岁月；这里没有使用未经证实的临终对话。']],
  ending:[['violin','最后的房间',[0,2.2,6],[0,1,-1],'1840 年 5 月 27 日，帕格尼尼在尼斯去世。他的作品与演奏传统继续影响后世。'],['memory','让镜头远去',[0,3.5,13],[0,1.2,-1],'NICCOLÒ PAGANINI · 1782 — 1840。继续向下，走向音乐遗产与后世影响。','ending']]
 };
 const def=definitions[cfg.kind];
 if(cfg.kind==='ending'){
  endingButton=document.createElement('button');endingButton.type='button';endingButton.className='btn primary pg-ending-music';endingButton.textContent='播放落幕音乐';endingButton.setAttribute('aria-pressed','false');
  endingNotice=document.createElement('p');endingNotice.className='pg-3d-note pg-ending-music-note';endingNotice.textContent='可选：《Cantabile》既有录音片段，随镜头在 7 秒内淡出；仅作艺术化落幕配乐，并非历史场景录音。';
  const legacy=document.createElement('a');legacy.className='btn pg-ending-legacy';legacy.href='../effects/effects.html';legacy.dataset.transition='legacy';legacy.textContent='继续 · 音乐遗产与后世影响 →';
  section.querySelector('.pg-3d-caption').append(endingButton,legacy);section.querySelector('.pg-3d-caption').after(endingNotice);
  endingAudio=document.createElement('audio');endingAudio.dataset.endingAudio='';endingAudio.preload='none';endingAudio.hidden=true;section.append(endingAudio);window.Paganini?.audio?.register?.(endingAudio);
  endingAudio.addEventListener('pause',()=>{cancelAnimationFrame(endingFrame);endingFrame=0;});
  endingAudio.addEventListener('ended',()=>stopEnding(true));
  endingAudio.addEventListener('error',()=>{stopEnding(true);endingNotice.textContent='落幕录音未能载入。你仍可观看镜头、阅读文字并继续音乐遗产章节。';});
  endingButton.addEventListener('click',async()=>{
   if(section.dataset.endingPlaying==='true'){stopEnding(true);return;}
   if(window.Paganini?.audio?.isMuted?.()||document.querySelector('[data-mute-toggle]')?.getAttribute('aria-pressed')==='true'){endingNotice.textContent='请先解除右上角的静音，再播放落幕音乐。';return;}
   stopEnding(true);const run=endingRun;endingAudio.src=new URL('../audio/works/cantabile.mp3',source).href;endingAudio.volume=.42;
   try{
    endingStarting=true;const playing=window.Paganini?.audio?.play?window.Paganini.audio.play(endingAudio):endingAudio.play().then(()=>true);endingStarting=false;const ok=await playing;
    if(!ok||run!==endingRun||dead){endingAudio.pause();return;}
    section.dataset.endingPlaying='true';endingButton.textContent='停止落幕音乐';endingButton.setAttribute('aria-pressed','true');endingNotice.textContent='《Cantabile》录音片段 · 艺术化落幕配乐，7 秒淡出。';
    host?.move([0,2.6,6.5],[0,1,-1],0);host?.skip();host?.move([0,3.5,13],[0,1.2,-1],7);
    const title=section.querySelector('.pg-3d-cinema-title');title.hidden=false;section.classList.add('pg-3d-ending');title.style.background='rgba(8,8,7,.25)';const started=endingAudio.currentTime;
    const fade=()=>{if(run!==endingRun||dead||endingAudio.paused)return;const progress=Math.min(1,Math.max(0,(endingAudio.currentTime-started)/7));endingAudio.volume=.42*(1-progress);title.style.background='rgba(8,8,7,'+(.25+progress*.7).toFixed(3)+')';section.dataset.endingFade=progress.toFixed(3);if(progress<1)endingFrame=requestAnimationFrame(fade);else{stopEnding(true);endingNotice.textContent='落幕音乐已淡出。NICCOLÒ PAGANINI · 1782 — 1840。你可以继续探索他的音乐遗产。';}};endingFrame=requestAnimationFrame(fade);
   }catch(error){endingStarting=false;stopEnding(true);endingNotice.textContent='浏览器未能播放落幕音乐，请再次点击。';}
  });
  window.addEventListener('paganini:audio-stop',()=>{if(!endingStarting)stopEnding(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopEnding(true);});
 }

 def.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='pg-3d-object';b.textContent=item[1];b.dataset.hotspot=item[0];b.addEventListener('click',()=>select(i));objects.append(b);});
 function select(i){index=i;const d=def[i];narrative.textContent=d[4];objects.querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));if(host)host.move(d[2],d[3],2.4);
  clearTimeout(sequence);if(d[5]==='curtain'){section.classList.add('pg-3d-curtains-open');}
  if(d[5]==='game'){const open=()=>{narrative.textContent=d[4]+' 点击「进入音乐挑战」即可开始。';let button=section.querySelector('.pg-3d-game');if(!button){button=document.createElement('button');button.type='button';button.className='btn primary pg-3d-game';button.textContent='进入音乐挑战 ♫';button.addEventListener('click',practice);section.querySelector('.pg-3d-caption').append(button);}};sequence=setTimeout(open,module?.reduced()?0:600);}
  if(d[5]==='ending'){section.querySelector('.pg-3d-cinema-title').hidden=false;section.classList.add('pg-3d-ending');}
 }
 section.querySelector('.pg-3d-continue').addEventListener('click',()=>select((index+1)%def.length));skip.addEventListener('click',()=>{host?.skip();narrative.textContent='镜头已就位。点击物品或下方按钮开始探索。';});
 function fallback(reason){if(dead)return;loading.textContent='三维显示暂不可用。你仍可用下方物品按钮探索，并阅读原有图文。';viewport.classList.add('pg-3d-fallback');skip.hidden=true;section.dataset.renderState='fallback';section.dataset.fallbackReason=reason;}
 viewport.addEventListener('paganini:webgl-lost',()=>fallback('context-lost'));
 async function load(){if(loaded||dead)return;loaded=true;try{
  module=await import(new URL('./three-scenes-shared.js',source));if(dead)return;const {THREE,SceneHost,addRoom,box,sphere,material,createInstrument}=module;
  host=new SceneHost(viewport,{camera:cfg.kind==='tour'?[0,8,7]:cfg.kind==='birth'?[8,4,14]:[5,3.2,8],target:[0,1,-1]});
  const scene=host.scene;const room=cfg.kind==='tour'?null:addRoom(scene,cfg.kind);let curtains=[],audienceArms=[];
  if(cfg.kind==='tour'){
   scene.add(new THREE.HemisphereLight(0xffdca6,0x20120c,3));const light=new THREE.DirectionalLight(0xffe4bc,3);light.position.set(4,7,3);scene.add(light);
   const paper=box(scene,0,0,0,8,.12,6,material(0xa88c57));paper.rotation.y=-.1;
   // Map outlines are a schematic 3D route diagram, not geographic survey data.
   const route=[[-2.5,.13,-2],[-1.8,.13,-1],[-1,.13,.8],[1.2,.13,-.2]];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:0x614022}));scene.add(line);
   def.slice(0,4).forEach((d,i)=>{const p=d[3],marker=sphere(scene,p[0],.28,p[2],.12,material(0xc54335,.35,.2));marker.userData.hotspot=i;hotspots.push(marker);const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.025,8,24),material(0x67421c));ring.rotation.x=-Math.PI/2;ring.position.set(p[0],.1,p[2]);scene.add(ring);});
   const family=new THREE.Group();box(family,0,.75,0,.13,1.5,.13,material(0x483123));sphere(family,0,1.65,0,.22,material(0x483123));box(family,.6,.5,0,.1,1,.1,material(0x5b3e29));sphere(family,.6,1.13,0,.16,material(0x5b3e29));family.position.set(3.1,.1,1.5);family.userData.hotspot=4;scene.add(family);hotspots.push(family);section.querySelector('.pg-3d-note').textContent+=' 地图为示意路线，不作精确地理比例。';
  }else{
   model=createInstrument(cfg.kind==='birth'?'mandolin':'violin');model.scale.setScalar(.64);model.rotation.set(-Math.PI/2,.1,-.3);model.position.set(-1.7,1.47,-1.6);scene.add(model);model.userData.hotspot=def.findIndex(d=>d[0]==='violin');if(model.userData.hotspot>=0)hotspots.push(model);
   if(cfg.kind==='birth'){
    const cradle=new THREE.Group();const wood=material(0x8a5d38);box(cradle,0,.55,0,1.3,.12,.75,wood);for(const s of [-1,1]){box(cradle,s*.7,.75,0,.1,.65,.85,wood);for(let j=0;j<5;j++)box(cradle,-.5+j*.25,.8,s*.4,.045,.6,.045,wood);}box(cradle,0,.65,0,1,.15,.6,material(0xc6b99e));cradle.position.z=-.4;cradle.userData.hotspot=0;scene.add(cradle);hotspots.push(cradle);
    for(const x of [-8,-6,6,8]){const house=box(scene,x,2,4,1.5,4,2,material(x<0?0x6b4c39:0x8a735a));const roof=new THREE.Mesh(new THREE.ConeGeometry(1.45,1.3,4),material(0x553225));roof.position.set(x,4.6,4);roof.rotation.y=Math.PI/4;scene.add(roof);}
    host.move([0,2.4,5.5],[0,.9,-.4],5);
   }else if(cfg.kind==='concert'){
    const velvet=material(0x651e28);for(const side of [-1,1]){const curtain=new THREE.Group();for(let i=0;i<8;i++)box(curtain,(i-3.5)*.3,2.6,0,.35,5.2,.45,velvet);curtain.position.set(side*1.25,0,0);scene.add(curtain);curtains.push(curtain);}for(let row=0;row<4;row++)for(let seat=0;seat<9;seat++){const person=new THREE.Group();sphere(person,0,.75,0,.15,material(0x16120f));box(person,0,.34,0,.3,.6,.2,material(0x17120f));for(const side of [-1,1]){const arm=box(person,side*.2,.55,-.08,.06,.34,.07,material(0x211813));arm.userData.side=side;audienceArms.push(arm);}person.position.set((seat-4)*.65,0,2+row*.7);scene.add(person);}
    const stage=box(scene,0,.12,-1,7,.3,3.3,material(0x69432c));stage.userData.hotspot=0;hotspots.push(stage);model.position.set(0,1.5,-1);model.rotation.set(0,0,-.3);host.move([0,3.1,7],[0,1.5,-1],3.5);
    host.callbacks.push((t,dt)=>{if(passed&&!module.reduced())audienceArms.forEach((arm,i)=>{arm.rotation.z=arm.userData.side*(.5+Math.sin(t*7+(i%4))*.35);arm.rotation.x=-.5;});const open=section.classList.contains('pg-3d-curtains-open')||passed;curtains.forEach((c,i)=>{const goal=(i?1:-1)*(open?3.7:1.25);c.position.x+=(goal-c.position.x)*Math.min(1,dt*2);});});
   }else if(cfg.kind==='late'||cfg.kind==='ending'){
    room.ambient.intensity=.7;room.key.color.setHex(0x7c95a6);room.key.intensity=1.3;
    const points=[];for(let i=0;i<180;i++)points.push(1.2+Math.random()*2,1.4+Math.random()*2.5,-3.85);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const rain=new THREE.Points(g,new THREE.PointsMaterial({color:0xa9bfcc,size:.018,transparent:true,opacity:.5}));scene.add(rain);host.callbacks.push((t,dt)=>{if(module.reduced())return;const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)-dt*1.8;p.setY(i,y<1.4?3.9:y);}p.needsUpdate=true;});
    host.move([0,2.6,6.5],[0,1,-1],4);
   }else host.move([0,2.5,5.8],[-1.2,1.3,-1.4],4);
   if(room){room.fireplace.userData.hotspot=def.findIndex(d=>d[0]==='hearth');if(room.fireplace.userData.hotspot>=0)hotspots.push(room.fireplace);room.sheet.userData.hotspot=def.findIndex(d=>d[0]==='score');if(room.sheet.userData.hotspot>=0)hotspots.push(room.sheet);const win=box(scene,2.2,2.65,-3.88,2.2,2.5,.01,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));win.userData.hotspot=def.findIndex(d=>d[0]==='window');if(win.userData.hotspot>=0)hotspots.push(win);}
   let dayProgress=0;host.callbacks.push((t,dt)=>{if(model)module.animateInstrument(model,t,dt);if(room&&passed&&cfg.kind==='practice'){dayProgress=Math.min(1,dayProgress+dt*.15);room.key.intensity=3-dayProgress*2.3;room.ambient.intensity=2-dayProgress*1.1;room.key.color.lerp(new THREE.Color(0x6e81aa),dt*.25);}if(room&&passed&&cfg.kind==='concert'){room.key.intensity+=(6-room.key.intensity)*Math.min(1,dt*.7);room.ambient.intensity+=(3-room.ambient.intensity)*Math.min(1,dt*.7);}if(room&&!module.reduced())room.candle.intensity=13+Math.sin(t*4)*.5;});
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();host.renderer.domElement.addEventListener('click',e=>{const r=host.renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,host.camera);const hits=raycaster.intersectObjects(hotspots,true);if(!hits.length)return;let object=hits[0].object;while(object&&object.userData.hotspot===undefined)object=object.parent;if(object?.userData.hotspot>=0)select(object.userData.hotspot);});
  loading.hidden=true;section.dataset.renderState='ready';viewport.dataset.webgl='true';
 }catch(error){host?.destroy();fallback(error?.message||'renderer-unavailable');}}
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'180px'});observer.observe(section);
 window.addEventListener('paganini:game-result',e=>{if(!e.detail?.passed||!['practice','concert'].includes(cfg.kind))return;passed=true;section.dataset.challengePassed='true';narrative.textContent=cfg.kind==='practice'?'练习挑战通过。窗外由昼入夜，时间在反复练习中走过。可沿原有剧情继续下一幕。':'演出挑战通过。幕布开启，舞台灯光增强。可沿原有剧情继续下一幕。';if(model)module?.vibrateInstrument(model,1);host?.move(cfg.kind==='practice'?[1.5,2.5,4.5]:[0,2.6,6],[0,1.5,-1],3);clearTimeout(returnTimer);returnTimer=setTimeout(()=>{if(!dead)section.scrollIntoView({behavior:module?.reduced()?'auto':'smooth',block:'start'});},1800);});
 window.addEventListener('paganini:note',e=>{if(model)module?.vibrateInstrument(model,e.detail?.lane||0);});
 window.addEventListener('pagehide',()=>{dead=true;stopEnding(true);clearTimeout(sequence);clearTimeout(returnTimer);observer.disconnect();host?.destroy();},{once:true});
})();

(()=>{
'use strict';
const script=document.currentScript;
if(!script||document.querySelector('.pg-global-menu'))return;
const base=new URL('../../',script.src);
const routes=[
  ['封页','index.html','♛'],['人生体验 · 文字介绍','life/story.html','▤'],
  ['人生体验 · 剧场旅程','life/begining.html','♟'],['背后','beihou/extra.html','✦'],
  ['帕格尼尼的作曲风格','music/style.html','𝄞'],['著名作品','music/works.html','♫'],
  ['对后世的影响','effects/effects.html','✧'],['乐器体验平台','instrument/instrument.html','♬'],
  ['感想与资料来源','reflection.sumber.html','✎']
];
const css=document.createElement('style');css.textContent=`
.pg-global-menu{position:fixed;right:25px;bottom:25px;z-index:2147480000;font-family:"Microsoft YaHei","PingFang SC",sans-serif;color:#efe4cf;line-height:1.45}
.pg-menu-toggle{appearance:none;border:1px solid rgba(225,193,130,.58);border-radius:99px;padding:13px 19px 13px 15px;display:flex;align-items:center;gap:9px;justify-content:center;background:linear-gradient(132deg,#2f2419,#17120f);color:#f3e2be;box-shadow:0 10px 35px #0009,inset 0 1px #d7b77830;cursor:pointer;font:600 15px/1.4 inherit;min-height:56px;transition:transform .25s,border-color .25s,box-shadow .25s}
.pg-menu-toggle:hover,.pg-menu-toggle[aria-expanded="true"]{transform:translateY(-3px);border-color:#f2d49f;box-shadow:0 13px 42px #000b,0 0 20px #c6a66d30}
.pg-menu-icon{font:23px/1 Georgia,serif;color:#d7b778}
.pg-menu-panel{position:absolute;right:0;bottom:70px;width:min(360px,calc(100vw - 35px));max-height:min(75vh,700px);overflow:auto;padding:20px;border-radius:24px;background:linear-gradient(145deg,#251c15f8,#0e0c0af9);box-shadow:0 25px 75px #000c;border:1px solid #c6a66d67;backdrop-filter:blur(12px);animation:pgMenuIn .25s ease-out}
.pg-menu-panel[hidden]{display:none!important}
.pg-menu-heading{font:32px/1.35 "KaiTi","STKaiti",serif;color:#ead7af;margin:0 0 6px}
.pg-menu-caption{font-size:12px;letter-spacing:.12em;color:#bda67f;margin:0 0 15px}
.pg-menu-list{display:grid;gap:5px}
.pg-menu-link{display:grid;grid-template-columns:26px 1fr 17px;gap:10px;align-items:center;text-decoration:none;color:#ebdfc6;padding:11px 12px;border-radius:12px;background:transparent;border:1px solid transparent;transition:background .18s,border-color .18s,transform .18s;font-size:14px}
.pg-menu-link:hover,.pg-menu-link:focus-visible{border-color:#d9b5797a;background:#c6a66d21;transform:translateX(-3px)}
.pg-menu-link[aria-current="page"]{background:#c6a66d24;border-color:#d9b5795c;color:#f5d79a}
.pg-menu-link .pg-link-icon{font:19px/1 Georgia,serif;color:#c6a66d}
.pg-menu-footer{padding-top:14px;margin-top:11px;border-top:1px solid #c6a66d38;color:#b1a797;font-size:12px}
@keyframes pgMenuIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.pg-global-menu *{animation:none!important;transition:none!important}}
@media(max-width:600px){.pg-global-menu{right:13px;bottom:13px}.pg-menu-toggle{min-height:50px;padding:10px 13px}.pg-menu-panel{bottom:63px}}
`;document.head.appendChild(css);
const menu=document.createElement('aside');menu.className='pg-global-menu';menu.innerHTML=`
<div id="pg-menu-panel" class="pg-menu-panel" hidden role="region" aria-label="全站目录">
  <h2 class="pg-menu-heading">帕格尼尼 · 全站目录</h2><p class="pg-menu-caption">THE COMPLETE JOURNEY</p>
  <nav class="pg-menu-list" aria-label="各页面直达链接"></nav>
  <div class="pg-menu-footer">从文字传记到剧场、聆听和亲手演奏，选择你想去的章节。</div>
</div>
<button type="button" class="pg-menu-toggle" aria-expanded="false" aria-controls="pg-menu-panel" aria-label="打开全站目录"><span class="pg-menu-icon" aria-hidden="true">☷</span><span>全站目录</span></button>`;
document.body.append(menu);
const panel=menu.querySelector('.pg-menu-panel'),btn=menu.querySelector('.pg-menu-toggle'),list=menu.querySelector('nav');
routes.forEach(([label,path,icon])=>{
 const a=document.createElement('a');a.className='pg-menu-link';a.href=new URL(path,base).href;
 const current=new URL(location.href).pathname.replace(/\/$/,'/index.html');
 if(current===new URL(path,base).pathname)a.setAttribute('aria-current','page');
 a.innerHTML=`<span class="pg-link-icon" aria-hidden="true">${icon}</span><span>${label}</span><span aria-hidden="true">↗</span>`;
 list.append(a);
});
function toggle(force){const open=force??panel.hidden;panel.hidden=!open;btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'关闭全站目录':'打开全站目录');btn.querySelector('.pg-menu-icon').textContent=open?'×':'☷';}
btn.addEventListener('click',()=>toggle());
document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!menu.contains(e.target))toggle(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){toggle(false);btn.focus()}});
})();

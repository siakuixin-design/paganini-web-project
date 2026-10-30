/* Focused, bounded first-person exploration. No pointer lock or global game keys. */
import * as THREE from '../vendor/three.module.min.js';

const KEYS = {KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
let controlSequence=0;
export class SceneControls {
 constructor(host, options={}) {
  this.host=host;this.canvas=host.renderer.domElement;this.viewport=host.viewport;
  this.home={position:[...(options.home?.position||host.camera.position.toArray())],target:[...(options.home?.target||host.look.toArray())]};
  this.bounds=options.bounds||{minX:-3.95,maxX:3.95,minY:1.2,maxY:3.7,minZ:-3.85,maxZ:4.1};
  this.obstacles=options.obstacles||[];this.speed=options.speed||1.8;this.radius=.16;
  this.active=false;this.held=new Set();this.listeners=[];this.pointer=null;this.suppressUntil=0;this.lastTelemetry=0;
  this.toolbar=document.createElement('div');this.toolbar.className='pg-explore-controls';
  const id='pg-explore-help-'+(++controlSequence);
  this.toolbar.innerHTML=`<div class="pg-explore-toolbar"><button class="pg-3d-object pg-explore-toggle" type="button" aria-pressed="false">自由探索</button><button class="pg-3d-object pg-explore-reset" type="button">返回剧情视角</button><span class="pg-explore-status" role="status">剧情镜头 · 点击物品可走近查看</span></div><p id="${id}" class="pg-explore-help">自由探索：拖动三维画面环顾；点选画面后用 W/A/S/D 或方向键移动。滚轮靠近／远离；下方方向按钮也可操作。Esc 返回剧情视角，Tab 离开后不再接收移动按键。</p><div class="pg-explore-pad" role="group" aria-label="三维移动方向" hidden><button type="button" class="pg-3d-object" data-move="left" aria-label="向左移动">← 左移</button><button type="button" class="pg-3d-object" data-move="forward" aria-label="向前移动">↑ 前进</button><button type="button" class="pg-3d-object" data-move="back" aria-label="向后移动">↓ 后退</button><button type="button" class="pg-3d-object" data-move="right" aria-label="向右移动">右移 →</button></div>`;
  this.viewport.after(this.toolbar);this.toggle=this.toolbar.querySelector('.pg-explore-toggle');this.pad=this.toolbar.querySelector('.pg-explore-pad');this.status=this.toolbar.querySelector('.pg-explore-status');
  this.canvas.tabIndex=0;this.canvas.setAttribute('role','group');this.canvas.setAttribute('aria-describedby',id);
  this.canvas.setAttribute('aria-label','三维探索画面：拖动环顾，聚焦后使用 W A S D 或方向键移动；也可点击场景物品');
  this.on(this.toggle,'click',()=>this.active?this.suspend():this.enable());
  this.on(this.toolbar.querySelector('.pg-explore-reset'),'click',()=>this.reset());
  this.on(this.canvas,'pointerdown',e=>{
   if(e.button!==0)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:false,type:e.pointerType};
   if(e.pointerType!=='touch'||this.active)this.canvas.focus({preventScroll:true});
  });
  this.on(this.canvas,'pointermove',e=>{
   const p=this.pointer;if(!p||p.id!==e.pointerId)return;
   if(!p.dragged&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>5){
    if(p.type==='touch'&&!this.active){this.pointer=null;return;}
    p.dragged=true;if(!this.active)this.enable(false);this.host.motion=null;
    try{this.canvas.setPointerCapture(e.pointerId)}catch{}
   }
   if(p.dragged){e.preventDefault();this.yaw-=(e.clientX-p.lastX)*.004;this.pitch=THREE.MathUtils.clamp(this.pitch-(e.clientY-p.lastY)*.004,-1.15,1.15);this.applyLook();}
   p.lastX=e.clientX;p.lastY=e.clientY;
  });
  const releasePointer=e=>{if(this.pointer?.id!==e.pointerId)return;if(this.pointer.dragged)this.suppressUntil=performance.now()+400;this.pointer=null;};
  this.on(this.canvas,'pointerup',releasePointer);this.on(this.canvas,'pointercancel',releasePointer);
  this.on(this.canvas,'click',e=>{if(performance.now()<this.suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  this.on(this.canvas,'keydown',e=>{
   if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
   if(e.code==='Escape'){if(this.active){e.preventDefault();this.reset();}return;}
   if(!KEYS[e.code])return;e.preventDefault();e.stopPropagation();if(!this.active)this.enable(false);this.held.add(KEYS[e.code]);
  });
  this.on(this.canvas,'keyup',e=>{if(KEYS[e.code]){this.held.delete(KEYS[e.code]);if(this.active)e.preventDefault();}});
  this.on(this.canvas,'blur',()=>this.release());
  this.on(this.canvas,'wheel',e=>{if(!this.active||document.activeElement!==this.canvas)return;e.preventDefault();this.translate(0,-Math.sign(e.deltaY)*.32);},{passive:false});
  for(const button of this.pad.querySelectorAll('[data-move]')){
   this.on(button,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();if(!this.active)this.enable(false);button.setPointerCapture?.(e.pointerId);button._explorePressedAt=performance.now();this.held.add(button.dataset.move);});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])this.on(button,event,()=>this.held.delete(button.dataset.move));
   this.on(button,'click',e=>{if(e.detail===0||performance.now()-(button._explorePressedAt||0)<180){if(!this.active)this.enable(false);this.step(button.dataset.move,e.detail===0?.4:.22);}});
   this.on(button,'blur',()=>this.held.delete(button.dataset.move));
  }
  this.on(window,'blur',()=>this.release());this.on(document,'visibilitychange',()=>{if(document.hidden)this.release();});
  this.update=(time,delta)=>{
   if(this.active){let x=(this.held.has('right')?1:0)-(this.held.has('left')?1:0),z=(this.held.has('forward')?1:0)-(this.held.has('back')?1:0);if(x||z){const length=Math.hypot(x,z);this.translate(x/length*this.speed*delta,z/length*this.speed*delta);}}
   if(time-this.lastTelemetry>.08){this.publish();this.lastTelemetry=time;}
  };host.callbacks.push(this.update);this.publish();
 }
 on(target,event,callback,options){target.addEventListener(event,callback,options);this.listeners.push(()=>target.removeEventListener(event,callback,options));}
 publish(){this.viewport.dataset.exploreState=this.active?'active':'story';this.viewport.dataset.cameraPosition=JSON.stringify(this.host.camera.position.toArray().map(n=>Number(n.toFixed(4))));this.viewport.dataset.cameraTarget=JSON.stringify(this.host.look.toArray().map(n=>Number(n.toFixed(4))));}
 release(){this.held.clear();this.pointer=null;}
 blocked(x,z){return this.obstacles.some(o=>x>o.minX-this.radius&&x<o.maxX+this.radius&&z>o.minZ-this.radius&&z<o.maxZ+this.radius);}
 safePosition(){const p=this.host.camera.position,b=this.bounds;p.set(THREE.MathUtils.clamp(p.x,b.minX,b.maxX),THREE.MathUtils.clamp(p.y,b.minY,b.maxY),THREE.MathUtils.clamp(p.z,b.minZ,b.maxZ));if(!this.blocked(p.x,p.z))return;
  const candidates=[];for(const o of this.obstacles){candidates.push([o.minX-this.radius-.02,p.z],[o.maxX+this.radius+.02,p.z],[p.x,o.minZ-this.radius-.02],[p.x,o.maxZ+this.radius+.02]);}candidates.sort((a,c)=>Math.hypot(a[0]-p.x,a[1]-p.z)-Math.hypot(c[0]-p.x,c[1]-p.z));for(const [x,z] of candidates)if(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&!this.blocked(x,z)){p.x=x;p.z=z;break;}}
 enable(focus=true){if(!this.host.alive)return;this.host.motion=null;const direction=this.host.look.clone().sub(this.host.camera.position).normalize();this.yaw=Math.atan2(direction.x,direction.z);this.pitch=Math.asin(THREE.MathUtils.clamp(direction.y,-1,1));this.safePosition();this.active=true;this.toggle.textContent='结束自由探索';this.toggle.setAttribute('aria-pressed','true');this.pad.hidden=false;this.status.textContent='自由探索中 · 拖动环顾 / W A S D 移动';this.canvas.style.touchAction='none';if(focus)this.canvas.focus({preventScroll:true});this.applyLook();this.host.start();}
 suspend(){this.release();this.active=false;this.toggle.textContent='自由探索';this.toggle.setAttribute('aria-pressed','false');this.pad.hidden=true;this.status.textContent='剧情镜头 · 点击物品可走近查看';this.canvas.style.touchAction='pan-y';this.publish();}
 reset(){this.suspend();this.canvas.scrollIntoView({block:'nearest',behavior:'auto'});this.host.move(this.home.position,this.home.target,1.1);this.status.textContent='正在返回剧情视角';}
 applyLook(){const p=this.host.camera.position;this.host.look.set(p.x+Math.sin(this.yaw)*Math.cos(this.pitch)*4,p.y+Math.sin(this.pitch)*4,p.z+Math.cos(this.yaw)*Math.cos(this.pitch)*4);this.host.camera.lookAt(this.host.look);this.publish();}
 translate(side,forward){if(!this.active)return;const p=this.host.camera.position,b=this.bounds;const dx=(-Math.cos(this.yaw)*side+Math.sin(this.yaw)*forward),dz=(Math.sin(this.yaw)*side+Math.cos(this.yaw)*forward);const x=THREE.MathUtils.clamp(p.x+dx,b.minX,b.maxX);if(!this.blocked(x,p.z))p.x=x;const z=THREE.MathUtils.clamp(p.z+dz,b.minZ,b.maxZ);if(!this.blocked(p.x,z))p.z=z;this.applyLook();}
 step(direction,distance){const values={left:[-distance,0],right:[distance,0],forward:[0,distance],back:[0,-distance]};this.translate(...values[direction]);}
 destroy(){this.release();this.listeners.forEach(remove=>remove());const index=this.host.callbacks.indexOf(this.update);if(index>=0)this.host.callbacks.splice(index,1);this.toolbar.remove();this.canvas.removeAttribute('aria-describedby');}
}

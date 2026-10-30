import * as THREE from '../vendor/three.module.min.js';
import {SceneControls} from './scene-controls.js';
export {THREE};
export const reduced = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
export function material(color, roughness=.68, metalness=0) { return new THREE.MeshStandardMaterial({color,roughness,metalness}); }
export function woodMaterial(color) {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#e3c296';ctx.fillRect(0,0,256,256);
 for(let line=0;line<86;line++){ctx.beginPath();ctx.strokeStyle=line%5===0?'rgba(52,24,9,.23)':'rgba(82,43,17,.09)';ctx.lineWidth=line%7===0?1.5:.7;for(let y=0;y<=256;y+=4){const x=line*3+Math.sin(y*.018+line*.7)*2.2+Math.sin(y*.05+line)*.65;if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;const mat=material(color,.59);mat.map=texture;return mat;
}
export function box(parent,x,y,z,w,h,d,mat) { const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); parent.add(m); return m; }
export function sphere(parent,x,y,z,r,mat) { const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mat); m.position.set(x,y,z); parent.add(m); return m; }
export function disposeObject(object) { const geometries=new Set(),materials=new Set(); object.traverse(o=>{if(o.geometry)geometries.add(o.geometry); if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}); geometries.forEach(g=>g.dispose());materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)v.dispose();});m.dispose();}); }
// Procedural geometry, not a historical instrument reconstruction. No remote models/textures.
export function createInstrument(type='violin') {
 const group=new THREE.Group(), wood=woodMaterial(type==='guitar'?0xb47745:type==='mandolin'?0xc18c51:0xb3713f), rim=material(0x32190d), dark=material(0x17100b), gold=material(0xcead70,.27,.65);
 const shape=new THREE.Shape();
 if(type==='mandolin') { shape.moveTo(0,1); shape.bezierCurveTo(-.16,.55,-.83,.18,-.77,-.45);shape.bezierCurveTo(-.76,-1.24,.76,-1.24,.77,-.45);shape.bezierCurveTo(.83,.18,.16,.55,0,1); }
 else if(type==='guitar') {shape.moveTo(0,.95);shape.bezierCurveTo(-.8,1.05,-.87,.4,-.46,.12);shape.bezierCurveTo(-.43,-.02,-1.0,-.33,-.83,-.9);shape.bezierCurveTo(-.65,-1.5,.65,-1.5,.83,-.9);shape.bezierCurveTo(1,-.33,.43,-.02,.46,.12);shape.bezierCurveTo(.87,.4,.8,1.05,0,.95);}
 else {shape.moveTo(0,.92);shape.bezierCurveTo(-.65,1.05,-.8,.5,-.42,.3);shape.bezierCurveTo(-.17,.13,-.3,-.05,-.48,-.18);shape.bezierCurveTo(-1,-.6,-.62,-1.2,0,-1.15);shape.bezierCurveTo(.62,-1.2,1,-.6,.48,-.18);shape.bezierCurveTo(.3,-.05,.17,.13,.42,.3);shape.bezierCurveTo(.8,.5,.65,1.05,0,.92);}
 const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:type==='mandolin'?.33:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:24}),[wood,rim]);group.add(body);
 box(group,0,1.53,.08,.16,1.5,.13,wood);box(group,0,1.3,.24,type==='guitar'?.19:.15,1.65,.045,dark);box(group,0,2.35,.08,.25,.55,.15,wood);
 if(type!=='violin') { const hole=new THREE.Mesh(new THREE.CircleGeometry(type==='guitar'?.23:.18,32),dark);hole.position.set(0,.08,.23);group.add(hole);for(let i=0;i<11;i++)box(group,0,.68+i*.112,.269,.19,.008,.009,gold); }
 else {for(const s of [-1,1]) { const f=new THREE.Shape();f.moveTo(-.02,-.2);f.bezierCurveTo(.12,-.12,-.13,.15,.03,.3);const curve=new THREE.ShapeGeometry(f);const m=new THREE.Mesh(curve,dark);m.position.set(s*.32,-.12,.24);m.rotation.z=s*.25;group.add(m);sphere(group,s*.31,-.3,.245,.045,dark);} box(group,0,-.87,.25,.18,.38,.055,dark);}
 box(group,0,-.48,.265,.48,.06,.065,wood);
 const count=type==='guitar'?6:type==='mandolin'?8:4, strings=[];
 for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.038, geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:17},(_,j)=>new THREE.Vector3(x,-.7+j*3.27/16,.31))),line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:i%2?0xceb78b:0xeee0ba}));line.userData.x=x;strings.push(line);group.add(line);}
 for(let i=0;i<4;i++)sphere(group,(i%2?1:-1)*.2,2.2+Math.floor(i/2)*.18,.08,.07,dark);
 let bow=null;if(type==='violin'){bow=new THREE.Group();box(bow,0,0,0,2.6,.025,.025,rim);box(bow,0,-.035,0,2.4,.012,.012,gold);bow.position.set(.1,.15,.4);bow.rotation.z=-.3;group.add(bow);}
 group.userData={strings,bow,type,pulse:0,lane:0};
 return group;
}
export function vibrateInstrument(model,lane=0){model.userData.pulse=1;model.userData.lane=lane;}
export function animateInstrument(model,elapsed,delta){const data=model.userData;if(!data?.strings)return;data.pulse=Math.max(0,data.pulse-delta*2.8);data.strings.forEach((line,i)=>{const p=line.geometry.attributes.position;const x=line.userData.x;const active=i%3===data.lane%3;for(let j=0;j<p.count;j++)p.setX(j,x+(active?Math.sin(elapsed*74)*Math.sin(j/(p.count-1)*Math.PI)*.025*data.pulse:0));p.needsUpdate=true;});if(data.bow)data.bow.position.x=.1+Math.sin(elapsed*19)*.19*data.pulse;}
export function addRoom(scene,mode='practice') {
 const wood=woodMaterial(0x503522),plaster=material(mode==='late'?0x292b29:0x615044),dark=material(0x19120f),gold=material(0x947044,.4,.3),glass=material(0x7b9aaa,.25,.1);
 box(scene,0,-.13,0,9,.25,9,wood);box(scene,0,2.4,-4.25,9,5,.22,plaster);box(scene,-4.4,2.4,0,.2,5,8.5,plaster);box(scene,4.4,2.4,0,.2,5,8.5,plaster);
 for(let i=0;i<15;i++)box(scene,-4.2+i*.6,.004,0,.018,.008,8.4,dark);
 // Window and mullions, candle-lit desk, and individual furniture legs.
 box(scene,2.2,2.65,-4.05,2.2,2.5,.1,glass);box(scene,2.2,2.65,-3.97,.08,2.5,.12,wood);box(scene,2.2,2.65,-3.96,2.2,.08,.12,wood);
 box(scene,-1.8,1.3,-1.7,2.8,.16,1.4,wood);for(let x of [-2.9,-.7])for(let z of [-2.2,-1.2])box(scene,x,.65,z,.12,1.3,.12,dark);
 box(scene,-2.6,1.65,-1.8,.11,.55,.11,material(0xd2bc86));const flame=sphere(scene,-2.6,1.98,-1.8,.07,material(0xfbd98d));flame.scale.y=1.6;
 const candle=new THREE.PointLight(0xffbd65,13,7,2);candle.position.set(-2.6,2.1,-1.8);scene.add(candle);
 const fireplace=box(scene,-2.7,.8,-3.8,1.7,1.7,.5,dark);box(scene,-2.7,.55,-3.45,1.2,.8,.1,material(0x8e3919));
 box(scene,2.6,.7,1.1,1,.15,1,wood);for(let x of [2.18,3.02])for(let z of [.7,1.5])box(scene,x,.34,z,.08,.7,.08,dark);box(scene,2.6,1.35,1.55,1,1.3,.1,wood);
 const stand=new THREE.Group();box(stand,0,.9,0,.07,1.8,.07,dark);const sheet=box(stand,0,1.8,0,1.0,.72,.04,material(0xcab78d));sheet.rotation.x=-.2;for(let i=0;i<5;i++)box(stand,0,1.6+i*.08,.033,.8,.009,.005,dark);stand.position.set(1,0,-1);scene.add(stand);
 const ambient=new THREE.HemisphereLight(0xf3ce93,0x1a0e0b,2);scene.add(ambient);const key=new THREE.DirectionalLight(0xf8d6a1,3);key.position.set(3,5,4);scene.add(key);
 return {candle,ambient,key,fireplace,desk:new THREE.Vector3(-1.8,1.4,-1.7),sheet,flame};
}
export class SceneHost {
 constructor(viewport,{background=0x0d0a08,camera=[5,3.1,7],target=[0,1.3,0]}={}) {
  this.viewport=viewport;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(background);this.scene.fog=new THREE.Fog(background,13,35);this.camera=new THREE.PerspectiveCamera(42,1,.1,90);this.camera.position.fromArray(camera);this.look=new THREE.Vector3(...target);this.camera.lookAt(this.look);
  this.renderer=new THREE.WebGLRenderer({antialias:devicePixelRatio<2,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;this.renderer.domElement.setAttribute('aria-label','可点击探索的三维场景；也可使用下方物品按钮');this.renderer.domElement.setAttribute('role','img');viewport.append(this.renderer.domElement);this.alive=true;this.visible=true;this.callbacks=[];this.clock=new THREE.Clock();this.elapsed=0;this.last=0;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(viewport);this.resize();
  this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.start();});this.intersection.observe(viewport);
  this.contextLost=e=>{e.preventDefault();this.destroy();viewport.dispatchEvent(new Event('paganini:webgl-lost'));};this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.visibility=()=>{if(!document.hidden)this.start();};document.addEventListener('visibilitychange',this.visibility);
  this.motionObserver=new MutationObserver(()=>{if(reduced())this.skip();});this.motionObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  if(!window.__pg3DRestoreHandler){window.__pg3DRestoreHandler=true;window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});}
  this.pagehide=()=>this.destroy();window.addEventListener('pagehide',this.pagehide,{once:true});this.start();
 }
 resize(){const r=this.viewport.getBoundingClientRect();this.renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);this.camera.aspect=Math.max(r.width,1)/Math.max(r.height,1);this.camera.updateProjectionMatrix();}
 enableExploration(options={}){this.controls?.destroy();this.controls=new SceneControls(this,options);return this.controls;}
 move(position,target,duration=2.4){this.controls?.suspend();this.motion={from:this.camera.position.clone(),to:new THREE.Vector3(...position),lookFrom:this.look.clone(),lookTo:new THREE.Vector3(...target),time:0,duration:reduced()?0:duration};this.start();}
 skip(){if(this.motion){this.camera.position.copy(this.motion.to);this.look.copy(this.motion.lookTo);this.camera.lookAt(this.look);this.motion=null;}this.renderer.render(this.scene,this.camera);}
 start(){if(!this.alive||this.frame||!this.visible||document.hidden)return;this.last=performance.now();const frame=now=>{this.frame=0;if(!this.alive||!this.visible||document.hidden)return;const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.elapsed+=dt;if(this.motion){const m=this.motion;m.time+=dt;const p=m.duration?Math.min(1,m.time/m.duration):1,t=p*p*(3-2*p);this.camera.position.lerpVectors(m.from,m.to,t);this.look.lerpVectors(m.lookFrom,m.lookTo,t);if(p===1)this.motion=null;}this.camera.lookAt(this.look);this.callbacks.forEach(f=>f(this.elapsed,dt));this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(frame);};this.frame=requestAnimationFrame(frame);}
 destroy(){if(!this.alive)return;this.controls?.destroy();this.controls=null;this.alive=false;cancelAnimationFrame(this.frame);this.frame=0;this.resizeObserver.disconnect();this.intersection.disconnect();this.motionObserver.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.pagehide);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();}
}

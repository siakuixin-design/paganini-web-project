#!/usr/bin/env python3
"""Exercise concurrent preview/start and late audio responses after global mute."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:8000/');p.add_argument('--output',default='/tmp/paganini-validation/rhythm-loading.json');a=p.parse_args();base=a.base_url.rstrip('/')+'/';report={};errors=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':1440,'height':960})
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 page.goto(base+'instrument/instrument.html',wait_until='domcontentloaded');page.locator('[data-instrument-select="guitar"]').click()
 # Capture listener starts preview and the original click starts gameplay in
 # the same user gesture; both await the same real decoding operation.
 page.locator('#pg-guitar-game .rg-start').evaluate('(button)=>button.addEventListener("click",()=>pgGuitarGame.hit(0),{once:true,capture:true})')
 page.locator('#pg-guitar-game .rg-start').click();page.wait_for_function('pgGuitarGame.getState().state==="playing"',timeout=20000)
 state=page.evaluate('pgGuitarGame.getState()');assert state['maximum']==4600 and state['duration']>40 and state['sampleReady'],state
 report['concurrent_preview_start']={'state':state['state'],'maximum':state['maximum'],'sampleReady':state['sampleReady']}
 page.evaluate('pgGuitarGame.stop()');page.close()
 for mode in ['start','preview']:
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
  page.add_init_script('''window.__lateSources=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__lateSources.push({duration:this.buffer?.duration,rate:this.playbackRate.value});return original.apply(this,args)}''')
  delayed=[]
  page.route('**/assets/audio/game/guitar.mp3',lambda route:delayed.append(route))
  page.goto(base+'instrument/instrument.html',wait_until='domcontentloaded');page.locator('[data-instrument-select="guitar"]').click()
  if mode=='start':page.locator('#pg-guitar-game .rg-start').click()
  else:page.locator('#pg-guitar-game [data-rg-lane="0"]').click()
  page.wait_for_timeout(150);assert delayed,'Audio fetch was not pending'
  page.locator('[data-mute-toggle]').click()
  for route in delayed:route.continue_()
  page.wait_for_timeout(1200)
  late=page.evaluate('({sources:window.__lateSources,state:pgGuitarGame.getState().state,muted:Paganini.audio.isMuted()})')
  assert late['muted'] and late['state']=='ready' and not late['sources'],late
  report['mute_during_pending_'+mode]=late;page.close()
 assert not errors,errors
 report['errors']=errors;b.close()
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

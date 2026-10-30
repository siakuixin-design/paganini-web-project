#!/usr/bin/env python3
"""Measure actual AudioBufferSource playback rates for J/E3 K/A3 L/D4.
Uses the bundled decoded acoustic sample, with no fake buffers or audio clocks.
"""
import argparse,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:8000/');p.add_argument('--output',default='/tmp/paganini-validation/guitar-pitches.json');a=p.parse_args()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':960});errors=[];page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 page.add_init_script('''window.__sampleStarts=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__sampleStarts.push({rate:this.playbackRate.value,duration:this.buffer?.duration});return original.apply(this,args)};''')
 page.goto(a.base_url.rstrip('/')+'/instrument/instrument.html',wait_until='domcontentloaded')
 page.locator('[data-instrument-select="guitar"]').click()
 for lane in range(3):
  page.locator(f'#pg-guitar-game [data-rg-lane="{lane}"]').click()
  page.wait_for_function('(n)=>window.__sampleStarts.length>=n',arg=lane+1,timeout=20000)
 sources=page.evaluate('window.__sampleStarts')
 assert len(sources)==3,sources
 expected=[2**(-8/12),2**(-3/12),2**(2/12)]
 for source,want in zip(sources,expected):
  assert abs(source['rate']-want)<1e-6,sources
  assert source['duration']>0,sources
 state=page.evaluate('pgGuitarGame.getState()');assert state['sampleReady'] is True,state
 page.locator('#pg-guitar-game .rg-start').click()
 page.wait_for_function('pgGuitarGame.getState().state === "playing"')
 page.locator('[data-instrument-select="violin"]').click()
 assert page.evaluate('pgGuitarGame.getState().state')=='ready'
 assert page.locator('#pg-guitar-game').is_hidden()
 report={'actual_sample_sources':sources,'expected_midi':[52,57,62],'expected_hz':[440*2**((n-69)/12) for n in [52,57,62]],'sample_decoded':True,'instrument_switch_stops_previous_game':True,'errors':errors}
 assert not errors,errors
 b.close()
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

#!/usr/bin/env python3
"""Representative 390px touch viewport checks (not a physical-device benchmark)."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base-url',default='http://127.0.0.1:8000/');p.add_argument('--output',default='/tmp/paganini-validation/mobile.json');a=p.parse_args();report=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 ctx.add_init_script("sessionStorage.setItem('pg-intro-v3','seen')")
 for path in ['index.html','life/story.html','music/works.html','instrument/instrument.html','life/scene03.html']:
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
  page.goto(a.base_url.rstrip('/')+'/'+path,wait_until='domcontentloaded');page.wait_for_timeout(600)
  size=page.evaluate('({viewport:innerWidth,document:document.documentElement.scrollWidth})')
  assert size['document']<=398 and size['viewport']<=398,(path,size)
  if path=='index.html':assert page.locator('.portal-card').count()==7
  elif path=='life/story.html':
   page.locator('.story-year-nav a').nth(2).click();page.wait_for_function('document.querySelector(".story-cinema").dataset.chapter === "2"')
  elif path=='music/works.html':
   page.locator('.record-button').first.click();page.wait_for_function('document.querySelector("[data-track]")._audio.currentTime>.2');assert page.locator('.work-score-panel').first.is_visible();page.locator('[data-mute-toggle]').click()
  elif path=='instrument/instrument.html':
   page.locator('[data-instrument-select="guitar"]').click();assert page.locator('#pg-guitar-game').is_visible();assert page.locator('#pg-concerto-game').is_hidden()
  elif path=='life/scene03.html':
   page.locator('.pg-3d-section').scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".pg-3d-section").dataset.renderState === "ready"');page.locator('[data-hotspot="violin"]').click();page.wait_for_selector('.pg-3d-game');page.locator('.pg-3d-game').click();assert page.locator('.rg-start').evaluate('(b)=>document.activeElement===b')
  assert not errors,errors
  report.append({'page':path,'viewport':size,'interaction_passed':True,'errors':errors});page.close()
 b.close()
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

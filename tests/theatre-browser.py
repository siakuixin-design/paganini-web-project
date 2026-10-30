#!/usr/bin/env python3
"""Chromium checks for first intro, themed navigation, progression and 3D/fallback."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',default='http://127.0.0.1:8000/')
parser.add_argument('--output',default='/tmp/paganini-validation/theatre.json')
a=parser.parse_args();base=a.base_url.rstrip('/')+'/';report={};errors=[]
flags=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags)
 ctx=b.new_context(viewport={'width':1440,'height':960})
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 page.goto(base+'index.html',wait_until='domcontentloaded')
 page.wait_for_selector('.pg-overture')
 assert page.evaluate('document.querySelector("main").inert')
 assert page.evaluate('[...document.querySelectorAll("audio")].every(a=>a.paused)'),'Audible autoplay'
 page.wait_for_timeout(500)
 page.locator('.pg-intro-skip').click()
 assert page.locator('.pg-overture').count()==0
 assert page.evaluate('!document.querySelector("main").inert')
 page.locator('.portal-card[href="music/works.html"]').click()
 assert page.locator('.pg-film').get_attribute('data-theme')=='record'
 page.wait_for_url('**/music/works.html')
 page.wait_for_timeout(800)
 assert page.locator('.pg-film').is_hidden()
 page.go_back(wait_until='domcontentloaded')
 page.wait_for_timeout(800)
 assert page.locator('.pg-overture').count()==0
 assert page.locator('.pg-film').is_hidden()
 report['opening_navigation']={'no_autoplay':True,'skip_unblocks_content':True,'record_transition':True,'back_restores_controls':True,'intro_once_per_session':True}
 # No progress seeded here: direct URL cannot bypass challenge prerequisites.
 page.goto(base+'life/scene04.html',wait_until='domcontentloaded')
 assert page.locator('.pg-chapter-gate').is_visible()
 assert page.locator('main').is_hidden()
 report['direct_gate']=True
 # Unlock only for scene-content tests; scoring tests verify actual gameplay separately.
 page.evaluate("localStorage.setItem('pg_scene03_pass_goal80','passed-v3-100');localStorage.setItem('pg_scene04_pass_goal80','passed-v3-100')")
 page.goto(base+'life/scene03.html',wait_until='domcontentloaded')
 page.locator('.pg-3d-section').scroll_into_view_if_needed()
 page.wait_for_function('document.querySelector(".pg-3d-section").dataset.renderState === "ready"')
 assert page.locator('.pg-3d-viewport canvas').count()==1
 page.locator('.pg-3d-skip').click()
 before=page.locator('.pg-3d-narrative').inner_text()
 canvas=page.locator('.pg-3d-viewport canvas'); rect=canvas.bounding_box(); clicked=False
 for y in [.4,.55,.7]:
  if clicked:break
  for x in [.25,.4,.5,.6,.75]:
   canvas.click(position={'x':rect['width']*x,'y':rect['height']*y})
   if page.locator('.pg-3d-narrative').inner_text()!=before:clicked=True;break
 assert clicked,'Canvas raycast did not select any scene object'
 page.locator('[data-hotspot="violin"]').click()
 page.wait_for_selector('.pg-3d-game')
 page.locator('.pg-3d-game').click()
 assert page.locator('.rg-start').evaluate('(b)=>document.activeElement===b')
 report['practice_3d']={'webgl_canvas':True,'canvas_raycast_selects_object':True,'instrument_hotspot_opens_game':True}
 page.goto(base+'instrument/instrument.html',wait_until='domcontentloaded')
 page.locator('.pg-instrument-3d').scroll_into_view_if_needed()
 page.wait_for_function('document.querySelector(".pg-instrument-3d").dataset.renderState === "ready"')
 page.locator('[data-instrument-select="violin"]').click()
 assert page.locator('#pg-concerto-game').is_visible()
 assert page.locator('#pg-guitar-game').is_hidden()
 page.locator('[data-instrument-select="guitar"]').click()
 assert page.locator('#pg-guitar-game').is_visible()
 assert page.locator('#pg-concerto-game').is_hidden()
 page.locator('#enable-instrument').click()
 page.wait_for_function('document.querySelector("#enable-instrument").textContent.includes("✓")')
 page.keyboard.down('a');page.wait_for_timeout(100)
 assert int(page.locator('#voice-count').inner_text())>=1
 page.keyboard.up('a');page.wait_for_timeout(250)
 assert page.locator('#voice-count').inner_text()=='0'
 report['instruments']={'three_models_switch':True,'games_match_instrument':True,'sampled_keyboard_voice_starts_and_releases':True}
 fallback=b.new_context(viewport={'width':1280,'height':900})
 fallback.add_init_script('''const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)}''')
 fp=fallback.new_page();fp.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 fp.goto(base+'life/scene03.html',wait_until='domcontentloaded')
 fp.locator('.pg-3d-section').scroll_into_view_if_needed()
 fp.wait_for_function('document.querySelector(".pg-3d-section").dataset.renderState === "fallback"')
 fp.locator('[data-hotspot="violin"]').click()
 fp.wait_for_selector('.pg-3d-game')
 report['webgl_unavailable']={'fallback_visible':True,'hotspot_navigation_remains':True}
 assert not errors,errors
 report['errors']=errors
 b.close()
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

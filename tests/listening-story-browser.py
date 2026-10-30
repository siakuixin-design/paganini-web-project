#!/usr/bin/env python3
"""Check real player/Analyser sync and biography navigation in Chromium.
Requires local HTTP server, Python Playwright and installed Chromium.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',default='http://127.0.0.1:8000/')
parser.add_argument('--output',default='/tmp/paganini-validation/listening-story.json')
args=parser.parse_args(); base=args.base_url.rstrip('/')+'/'
flags=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
report={}; errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags)
 page=b.new_page(viewport={'width':1440,'height':960})
 page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 page.goto(base+'music/works.html',wait_until='domcontentloaded')
 page.wait_for_function('!!window.PaganiniScore')
 assert page.locator('[data-track]').count()==12
 assert page.locator('.work-score-panel').count()==12
 assert page.evaluate('PaganiniScore.validateScore({})') is False
 track=page.locator('[data-track]').first
 track.locator('.record-button').click()
 page.wait_for_function('document.querySelector("[data-track]")._audio.currentTime>.4')
 assert track.locator('.work-score-panel').is_visible()
 assert track.locator('.work-score-panel').get_attribute('data-analysis')=='live'
 first=track.locator('canvas').evaluate('(c)=>c.toDataURL()')
 page.wait_for_function('(prior)=>document.querySelector("[data-track] canvas").toDataURL()!==prior',arg=first,timeout=10000)
 second=track.locator('canvas').evaluate('(c)=>c.toDataURL()')
 assert first!=second,'Analyser canvas did not change during real MP3 playback'
 t1=track.evaluate('(t)=>t._audio.currentTime')
 track.locator('.record-button').click()
 page.wait_for_timeout(250)
 t2=track.evaluate('(t)=>t._audio.currentTime')
 page.wait_for_timeout(300)
 t3=track.evaluate('(t)=>t._audio.currentTime')
 assert abs(t2-t3)<.02,'Audio clock advanced while paused'
 assert track.evaluate('(t)=>t._audio.paused')
 track.locator('input[type=range]').evaluate('(r)=>{r.value=450;r.dispatchEvent(new Event("input",{bubbles:true}))}')
 page.wait_for_function('Math.abs(document.querySelector("[data-track]")._audio.currentTime/document.querySelector("[data-track]")._audio.duration-.45)<.01',timeout=10000)
 seek=track.evaluate('(t)=>({time:t._audio.currentTime,duration:t._audio.duration})')
 assert abs(seek['time']/seek['duration']-.45)<.01,seek
 track.locator('.record-button').click()
 page.wait_for_function('!document.querySelector("[data-track]")._audio.paused')
 next_track=page.locator('[data-track]').nth(1)
 next_track.locator('.record-button').click()
 page.wait_for_function('document.querySelectorAll("[data-track]")[1]._audio.currentTime>.2')
 active=page.evaluate('[...document.querySelectorAll("[data-track]")].filter(t=>!t._audio.paused).length')
 assert active==1
 assert track.evaluate('(t)=>t._audio.paused')
 page.locator('[data-mute-toggle]').click()
 assert page.evaluate('[...document.querySelectorAll("[data-track]")].every(t=>t._audio.paused)')
 report['listening']={'tracks':12,'live_canvas_changes':first!=second,'paused_time':t3,'seek_fraction':seek['time']/seek['duration'],'active_after_switch':active,'mute_stops':True,'verified_score_available':False}
 page.goto(base+'life/story.html',wait_until='domcontentloaded')
 page.wait_for_selector('.story-year-nav')
 assert page.locator('.story-year-nav a').count()==8
 original_count=page.locator('.timeline .period').count()
 link=page.locator('.story-year-nav a').nth(3)
 link.click()
 page.wait_for_function('document.querySelector(".story-cinema").dataset.chapter === "3"')
 assert link.get_attribute('aria-current')=='location'
 assert page.locator('.timeline .period').count()==original_count==8
 report['story']={'chapters':8,'timeline_navigation':True,'active_chapter':'3'}
 assert not errors,errors
 report['errors']=errors
 b.close()
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

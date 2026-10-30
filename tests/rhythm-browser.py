#!/usr/bin/env python3
"""Play bundled practice recording using real Web Audio time and keyboard events.
No audio-clock mocks, source replacements, shortened recordings, or score overrides.
Start the site on port 8000 first. Requires installed Python Playwright + Chromium.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FLAGS = ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
         '--use-angle=swiftshader','--enable-unsafe-swiftshader']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://127.0.0.1:8000/')
parser.add_argument('--output', default='/tmp/paganini-validation/rhythm-browser.json')
parser.add_argument('--miss', action='store_true', help='Let all notes miss and check FAILED instead')
args = parser.parse_args()
chart = json.loads((ROOT/'assets/audio/game/practice.json').read_text())['events']
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=FLAGS)
    page = browser.new_page(viewport={'width':1440,'height':960})
    errors = []
    page.on('pageerror', lambda e: errors.append(e.stack or str(e)))
    page.goto(args.base_url.rstrip('/')+'/life/scene03.html', wait_until='domcontentloaded')
    page.wait_for_function('!!document.querySelector(".rg-wrap")?.paganiniGame')
    page.locator('.rg-start').click()
    page.wait_for_function('document.querySelector(".rg-wrap").paganiniGame.getState().state === "playing"',timeout=20000)
    page.wait_for_timeout(300)
    page.locator('.rg-pause').click()
    paused = page.evaluate('document.querySelector(".rg-wrap").paganiniGame.getState()')
    page.wait_for_timeout(350)
    frozen = page.evaluate('document.querySelector(".rg-wrap").paganiniGame.getState()')
    assert paused['state'] == frozen['state'] == 'paused'
    assert abs(paused['time']-frozen['time']) < .001, (paused,frozen)
    page.locator('.rg-pause').click()
    page.wait_for_function('document.querySelector(".rg-wrap").paganiniGame.getState().state === "playing"')
    if not args.miss:
        # The same keydown listener used by the physical keyboard is exercised.
        # Only reads the public clock; production hit/judgement logic is untouched.
        page.evaluate('''events => {
            const game=document.querySelector('.rg-wrap').paganiniGame;
            let i=0;
            window.__rhythmKeyTimer=setInterval(()=>{
                const state=game.getState();
                if(state.state==='finished'){clearInterval(window.__rhythmKeyTimer);return}
                while(i<events.length && state.time>=events[i].t){
                    const key=['J','K','L'][events[i++].lane];
                    document.dispatchEvent(new KeyboardEvent('keydown',{code:'Key'+key,key:key.toLowerCase(),bubbles:true}));
                    document.dispatchEvent(new KeyboardEvent('keyup',{code:'Key'+key,key:key.toLowerCase(),bubbles:true}));
                }
            },5);
        }''',chart)
    page.wait_for_function('document.querySelector(".rg-wrap").paganiniGame.getState().state === "finished"',timeout=60000)
    result = page.evaluate('document.querySelector(".rg-wrap").paganiniGame.getState()')
    result.update(paused_time=paused['time'], frozen_time=frozen['time'], errors=errors,
                  input='none' if args.miss else 'keyboard events scheduled against real audio clock')
    assert not errors, errors
    assert result['maximum'] == len(chart)*100, result
    assert result['goal'] == result['maximum']*.8, result
    assert sum(result['counts'].values()) == len(chart), result
    assert result['time'] == result['duration'], result
    if args.miss:
        assert result['score']==0 and not result['passed'] and result['counts']['MISS']==len(chart), result
    else:
        assert result['passed'] and result['percentage']>=80, result
    assert page.locator('.rg-result').is_visible()
    assert page.locator('.rg-retry').is_visible()
    page.locator('.rg-retry').click()
    page.wait_for_function('document.querySelector(".rg-wrap").paganiniGame.getState().state === "playing"')
    retry=page.evaluate('document.querySelector(".rg-wrap").paganiniGame.getState()')
    assert retry['score']==0 and retry['time']<1, retry
    page.evaluate('document.querySelector(".rg-wrap").paganiniGame.stop()')
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False,indent=2))
    browser.close()

#!/usr/bin/env python3
"""Real Chromium checks for focused, bounded life-scene camera controls."""
import argparse,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base-url',default='http://127.0.0.1:8000/');parser.add_argument('--output',default='/tmp/paganini-validation/exploration.json');args=parser.parse_args()
flags=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];report={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags);page=b.new_page(viewport={'width':1440,'height':960});page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 page.goto(args.base_url.rstrip('/')+'/life/scene03.html',wait_until='domcontentloaded');view=page.locator('.pg-3d-viewport');view.scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".pg-3d-section").dataset.renderState==="ready"');page.locator('.pg-3d-skip').click()
 def pos():return json.loads(view.get_attribute('data-camera-position'))
 def target():return json.loads(view.get_attribute('data-camera-target'))
 def distance(a,c):return math.sqrt(sum((x-y)**2 for x,y in zip(a,c)))
 def reset():
  page.locator('.pg-explore-reset').click();page.wait_for_function('Math.hypot(...JSON.parse(document.querySelector(".pg-3d-viewport").dataset.cameraPosition).map((v,i)=>v-[0,2.5,5.8][i]))<.01',timeout=10000);page.locator('.pg-explore-toggle').click();page.wait_for_timeout(120)
 page.locator('.pg-explore-toggle').click();page.wait_for_timeout(120);before=pos();assert view.get_attribute('data-explore-state')=='active'
 page.keyboard.down('w');page.wait_for_timeout(650);page.keyboard.up('w');page.wait_for_timeout(120);after=pos();assert distance(before,after)>.4,(before,after);report['focused_w_moves_camera']=True
 canvas=view.locator('canvas');canvas.scroll_into_view_if_needed();r=canvas.bounding_box();before=target();narrative=page.locator('.pg-3d-narrative').inner_text();page.mouse.move(r['x']+r['width']*.65,r['y']+r['height']*.5);page.mouse.down();page.mouse.move(r['x']+r['width']*.8,r['y']+r['height']*.4,steps=12);page.mouse.up();page.wait_for_timeout(120);assert distance(before,target())>.5;assert page.locator('.pg-3d-narrative').inner_text()==narrative;report['drag_changes_look_without_hotspot_click']=True
 page.keyboard.press('Tab');page.wait_for_timeout(150);before=pos();page.keyboard.down('w');page.wait_for_timeout(350);page.keyboard.up('w');page.wait_for_timeout(120);assert distance(before,pos())<.001;report['unfocused_keys_do_not_move_camera']=True
 reset();page.keyboard.down('w');page.wait_for_timeout(4800);page.keyboard.up('w');page.wait_for_timeout(100);at_table=pos();assert not (-3.46<at_table[0]<-.14 and -2.66<at_table[2]<-.74),at_table;assert at_table[2]>=-.741,at_table;report['table_collision_position']=at_table
 page.keyboard.down('s');page.wait_for_timeout(4200);page.keyboard.up('s');page.wait_for_timeout(120);bound=pos();assert -3.95<=bound[0]<=3.95 and -3.85<=bound[2]<=4.1,bound;report['room_bounds_position']=bound
 page.locator('[data-move="left"]').evaluate('(b)=>b.focus()');before=pos();page.keyboard.press('Enter');page.wait_for_timeout(120);assert distance(before,pos())>.2;report['accessible_direction_button_moves']=True
 page.locator('.pg-explore-reset').click();page.wait_for_function('Math.hypot(...JSON.parse(document.querySelector(".pg-3d-viewport").dataset.cameraPosition).map((v,i)=>v-[0,2.5,5.8][i]))<.01',timeout=10000);assert view.get_attribute('data-explore-state')=='story';assert distance(pos(),[0,2.5,5.8])<.01;report['reset_restores_story_camera']=True
 page.locator('[data-hotspot="violin"]').click();page.wait_for_selector('.pg-3d-game');page.locator('.pg-3d-game').click();assert page.locator('.rg-start').evaluate('(b)=>document.activeElement===b');report['hotspot_still_opens_game']=True
 assert not errors,errors;report['errors']=errors;b.close()
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

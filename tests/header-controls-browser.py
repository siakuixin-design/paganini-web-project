#!/usr/bin/env python3
"""Regression: saved header settings must toggle on the first click; intro traps focus.
Run a local HTTP server on 8000, then python3 tests/header-controls-browser.py.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

FLAGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8000/')
    parser.add_argument('--output', default='/tmp/paganini-validation/header-controls.json')
    args = parser.parse_args()
    base = args.base_url.rstrip('/') + '/'
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=FLAGS)
        for route in ('life/story.html', 'music/style.html'):
            context = browser.new_context(reduced_motion='no-preference')
            context.add_init_script("sessionStorage.setItem('paganini-motion','reduced');sessionStorage.setItem('paganini-mute','1');")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + route, wait_until='domcontentloaded')
            motion = page.locator('[data-motion-toggle]')
            mute = page.locator('[data-mute-toggle]')
            assert motion.get_attribute('aria-pressed') == 'true', route
            assert mute.get_attribute('aria-pressed') == 'true', route
            motion.click()
            assert motion.get_attribute('aria-pressed') == 'false', route
            assert not page.evaluate("document.documentElement.matches('.reduce-motion,.less-motion')"), route
            assert page.evaluate("sessionStorage.getItem('paganini-motion')") == 'full', route
            motion.click()
            assert motion.get_attribute('aria-pressed') == 'true', route
            assert page.evaluate("document.documentElement.matches('.reduce-motion,.less-motion')"), route
            mute.click()
            assert mute.get_attribute('aria-pressed') == 'false', route
            assert page.evaluate("sessionStorage.getItem('paganini-mute')") == '0', route
            mute.click()
            assert mute.get_attribute('aria-pressed') == 'true', route
            assert page.evaluate("sessionStorage.getItem('paganini-mute')") == '1', route
            assert not errors, errors
            results.append({'route': route, 'saved_first_click_motion_and_mute': 'passed', 'pageerrors': errors})
            context.close()
        context = browser.new_context(reduced_motion='no-preference')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + 'index.html', wait_until='domcontentloaded')
        page.locator('.pg-overture').wait_for(state='visible')
        page.locator('[data-intro-silent]').click()
        assert page.evaluate("document.activeElement.matches('.pg-intro-skip')")
        page.keyboard.press('Tab')
        assert page.evaluate("document.activeElement.matches('.pg-intro-skip')")
        page.keyboard.press('Shift+Tab')
        assert page.evaluate("document.activeElement.matches('.pg-intro-skip')")
        assert page.evaluate("document.querySelector('[data-opening-audio]').paused")
        page.keyboard.press('Escape')
        assert not page.locator('.pg-overture').count()
        assert not page.evaluate("document.querySelector('main').inert")
        assert page.evaluate("sessionStorage.getItem('pg-intro-v3')") == 'seen'
        assert not errors, errors
        results.append({'route': 'index.html', 'silent_intro_focus_trap_and_escape': 'passed', 'pageerrors': errors})
        context.close()
        browser.close()
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    main()

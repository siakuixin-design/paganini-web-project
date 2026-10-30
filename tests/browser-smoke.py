#!/usr/bin/env python3
"""Real Chromium smoke checks. Run a local HTTP server first; see --help.

Requires Python playwright and system Chromium. Does not use simulated DOM/audio.
Results and screenshots go outside the checkout by default.
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FLAGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8000/')
    parser.add_argument('--output', default='/tmp/paganini-validation/current')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    args = parser.parse_args()
    base = args.base_url.rstrip('/') + '/'
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    results = []
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium,
                                             headless=True, args=FLAGS)
        context = browser.new_context(viewport={'width': 1440, 'height': 960})
        # Seed completed prerequisites only for unrestricted page-content smoke checks.
        # Direct navigation gating is tested separately in theatre-browser.py.
        context.add_init_script("localStorage.setItem('pg_scene03_pass_goal80','passed-v3-100'); localStorage.setItem('pg_scene04_pass_goal80','passed-v3-100'); sessionStorage.setItem('pg-intro-v3','seen');")
        for html in sorted(ROOT.rglob('*.html')):
            if any(p in html.parts for p in ('node_modules', '.git', 'tests')):
                continue
            rel = html.relative_to(ROOT).as_posix()
            page = context.new_page()
            errors, local_failures = [], []
            page.on('pageerror', lambda error: errors.append(error.stack or str(error)))
            page.on('response', lambda response: local_failures.append({
                'url': response.url, 'status': response.status
            }) if response.status >= 400 and
                urlsplit(response.url).netloc == urlsplit(base).netloc and
                not response.url.endswith('/favicon.ico') else None)
            record = {'page': rel}
            try:
                response = page.goto(base + rel, wait_until='domcontentloaded', timeout=15000)
                assert response and response.status == 200, 'HTML did not return HTTP 200'
                page.wait_for_timeout(1500)
                record.update(title=page.title(), status=response.status)
                assert page.locator('main').count(), 'Missing main content'
                assert page.locator('body').inner_text().strip(), 'Empty page'
                # Modules expose accessible UI even if WebGL is unavailable.
                record['webgl2'] = page.evaluate(
                    '!!document.createElement("canvas").getContext("webgl2")')
                record['canvas_count'] = page.locator('canvas').count()
                record['horizontal_overflow'] = page.evaluate(
                    'document.documentElement.scrollWidth > innerWidth + 8')
                if rel in ('index.html', 'life/scene03.html', 'life/story.html',
                           'instrument/instrument.html', 'music/works.html'):
                    page.screenshot(path=str(out / (rel.replace('/', '-') + '.png')))
                assert not errors, 'JavaScript page errors'
                assert not local_failures, 'Local resources returned errors'
            except Exception as error:
                record['failure'] = str(error)
                failures.append(rel)
            record.update(errors=errors, local_failures=local_failures)
            results.append(record)
            print(json.dumps(record, ensure_ascii=False), flush=True)
            page.close()
        browser.close()
    (out / 'browser-smoke.json').write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(results) - len(failures)}/{len(results)} pages passed; report: {out}')
    return bool(failures)


if __name__ == '__main__':
    sys.exit(main())

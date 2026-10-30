/* Progressive scrollytelling: original prose, images and URLs stay in place. */
(() => {
  'use strict';
  if (!location.pathname.endsWith('/life/story.html')) return;
  const timeline = document.querySelector('section.timeline');
  if (!timeline || timeline.dataset.scrollStory) return;
  const periods = [...timeline.querySelectorAll('.period')];
  if (!periods.length) return;
  timeline.dataset.scrollStory = 'true';
  const chapters = [
    ['1782', '热那亚 · 出生', '海港城市里的音乐启蒙'],
    ['幼年', '家庭练习室', '从日复一日的训练开始'],
    ['1790s / 1801', '少年舞台 · 卢卡', '公开演出与职业音乐家的起点'],
    ['1828 起', '欧洲巡演', '维也纳，继而巴黎与伦敦'],
    ['1825', '爱情与家庭', 'Antonia Bianchi 与儿子 Achille'],
    ['晚年', '安静的房间', '健康、乐器与音乐事务'],
    ['1840', '尼斯 · 告别', '1782 — 1840'],
    ['身后', '未完的回声', '音乐遗产与新的演奏者']
  ];
  const layout = document.createElement('div'); layout.className = 'story-scroll-layout'; timeline.before(layout); layout.append(timeline);
  const visual = document.createElement('aside'); visual.className = 'story-cinema'; visual.setAttribute('aria-label', '随生平章节变化的历史场景');
  visual.innerHTML = '<div class="story-frame"><img class="story-scene-image" alt=""><div class="story-frame-shade"></div><div class="story-scene-caption"><span class="story-scene-year"></span><h2></h2><p></p><small>原项目图片 · 历史氛围示意</small></div></div><div class="story-chapter-progress" aria-hidden="true"><i></i></div><p class="story-reading-status" aria-live="polite" aria-atomic="true"></p>';
  layout.append(visual);
  const nav = document.createElement('nav'); nav.className = 'story-year-nav'; nav.setAttribute('aria-label', '生平章节时间轴');
  const navInner = document.createElement('div'); nav.append(navInner); layout.before(nav);
  const note = document.createElement('p'); note.className = 'story-chronology-note';
  note.textContent = '时间轴沿用本页叙事顺序，家庭章节回溯 1825 年。少年公开演出的具体日期在不同传记资料中有差异，时间轴采用“1790 年代”；原有正文保留，展示时请对照页末所列资料核定。场景图片为艺术化示意。';
  nav.after(note);
  const buttons = periods.map((period, index) => {
    period.id ||= `biography-chapter-${index + 1}`;
    period.setAttribute('aria-labelledby', `biography-heading-${index + 1}`);
    const heading = period.querySelector('h2'); if (heading) heading.id = `biography-heading-${index + 1}`;
    const link = document.createElement('a'); link.href = `#${period.id}`; link.innerHTML = `<strong>${chapters[index]?.[0] || index + 1}</strong><span>${chapters[index]?.[1] || heading?.textContent}</span>`;
    navInner.append(link); return link;
  });
  const image = visual.querySelector('img'), caption = visual.querySelector('.story-scene-caption');
  let current = -1, raf = 0;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.matches('.less-motion,.reduce-motion');
  function activate(index) {
    if (index === current) return;
    current = index;
    const chapter = chapters[index] || [], original = periods[index].querySelector('.photo img');
    if (original) { image.src = original.src; image.alt = original.alt; }
    caption.querySelector('.story-scene-year').textContent = chapter[0] || '';
    caption.querySelector('h2').textContent = chapter[1] || periods[index].querySelector('h2')?.textContent;
    caption.querySelector('p').textContent = chapter[2] || '';
    visual.dataset.chapter = String(index);
    visual.querySelector('.story-reading-status').textContent = `第 ${index + 1} / ${periods.length} 章 · ${chapter[1] || ''}`;
    buttons.forEach((button, i) => { if (i === index) button.setAttribute('aria-current', 'location'); else button.removeAttribute('aria-current'); });
    periods.forEach((period, i) => period.classList.toggle('story-chapter-current', i === index));
    if (!reduced() && image.animate) image.animate([{ opacity: .45, transform: 'scale(1.035)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 650, easing: 'ease-out' });
  }
  function update() {
    raf = 0;
    let index = 0;
    for (let i = 0; i < periods.length; i++) if (periods[i].getBoundingClientRect().top <= innerHeight * .46) index = i;
    activate(index);
    const rect = periods[index].getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (innerHeight * .46 - rect.top) / rect.height));
    visual.querySelector('.story-chapter-progress i').style.width = `${(index + fraction) / periods.length * 100}%`;
    if (!reduced()) image.style.objectPosition = `50% ${48 + fraction * 4}%`;
  }
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(update); });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf));
  update();
})();

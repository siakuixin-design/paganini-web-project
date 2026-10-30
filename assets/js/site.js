/* 公共交互。没有音频会自动播放；所有发声始于用户点击。 */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const saved = (key, fallback = '') => { try { return sessionStorage.getItem('paganini-' + key) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { sessionStorage.setItem('paganini-' + key, value); } catch { /* file:// 私密窗口可能禁用储存 */ } };
  let toastTimer;
  function toast(message) {
    const box = $('.toast'); if (!box) return;
    box.textContent = message; box.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 4200);
  }
  let reduced = saved('motion') === 'reduced' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const motionButton = $('[data-motion-toggle]');
  function updateMotion() {
    document.documentElement.classList.toggle('reduce-motion', reduced);
    if (motionButton) { motionButton.setAttribute('aria-pressed', String(reduced)); motionButton.title = reduced ? '恢复动态效果' : '减少动态效果'; }
  }
  updateMotion();
  motionButton?.addEventListener('click', () => { reduced = !reduced; save('motion', reduced ? 'reduced' : 'full'); updateMotion(); });

  /* 唯一音频总线：音乐、旁白、影片和键盘乐器互相让出声音。 */
  const media = new Set(); let active = null; let playbackToken = 0; let muted = saved('mute') === '1';
  const muteButton = $('[data-mute-toggle]');
  function updateMute() {
    if (!muteButton) return;
    muteButton.textContent = muted ? '◌' : '♪';
    muteButton.title = muted ? '解除静音（不会自动恢复播放）' : '静音并停止声音';
    muteButton.setAttribute('aria-label', muteButton.title);
    muteButton.setAttribute('aria-pressed', String(muted));
  }
  function stopAll({ keep = null } = {}) {
    playbackToken++;
    media.forEach(audio => {
      if (audio === keep) return;
      audio.pause(); try { audio.currentTime = 0; } catch { /* 未载入时允许 currentTime 失败 */ }
    });
    if (active !== keep) active = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $$('[data-narrate]').forEach(b => { b.classList.remove('speaking'); b.setAttribute('aria-pressed', 'false'); b.querySelector('.voice-action').textContent = '听我的旁白 ▷'; });
    $$('iframe[data-film]').forEach(frame => { frame.remove(); });
    $$('[data-local-video]').forEach(video => { if (video !== keep) video.pause(); });
    window.dispatchEvent(new CustomEvent('paganini:audio-stop'));
    refreshTracks();
  }
  function register(audio) {
    media.add(audio); audio.volume = .55;
    ['pause', 'play', 'ended', 'error'].forEach(e => audio.addEventListener(e, refreshTracks));
    audio.addEventListener('error', () => toast('这段音频未能载入，请检查文件是否完整。'));
    return audio;
  }
  async function play(audio) {
    if (muted) { toast('目前已静音。请先点击右上角的声音按钮解除静音。'); return false; }
    stopAll({ keep: audio }); active = audio;
    const token = playbackToken;
    try {
      await audio.play();
      if (token !== playbackToken) { if (active !== audio) audio.pause(); return false; }
      refreshTracks(); return true;
    } catch (error) {
      if (token === playbackToken && error.name !== 'AbortError') { active = null; toast('浏览器未能播放音频，请再次点击播放按钮。'); }
      return false;
    }
  }
  window.Paganini = { toast, audio: { stopAll, play, register, isMuted: () => muted }, isReduced: () => reduced };
  muteButton?.addEventListener('click', () => { muted = !muted; save('mute', muted ? '1' : '0'); if (muted) stopAll(); updateMute(); });
  updateMute();

  /* 右上角是旅程说明，不提供跳章入口，保留连续浏览。 */
  const menu = $('.journey-panel'); const menuButton = $('.journey-toggle');
  function closeMenu() { if (menu) menu.hidden = true; menuButton?.setAttribute('aria-expanded', 'false'); }
  menuButton?.addEventListener('click', () => { const opening = menu.hidden; menu.hidden = !opening; menuButton.setAttribute('aria-expanded', String(opening)); });
  document.addEventListener('click', e => { if (menu && !menu.hidden && !menu.contains(e.target) && !menuButton.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* 正常进入 → 展开；退出 → 关闭 → 导航。超时与 bfcache 会恢复状态。 */
  const transition = $('.transition'); let navigating = false; let transitionTimer;
  function resetTransition() {
    navigating = false; clearTimeout(transitionTimer);
    transition?.classList.remove('closed', 'active'); document.body.removeAttribute('aria-busy');
  }
  function enterTransition() {
    if (!transition) return;
    transition.dataset.theme = document.body.dataset.enter || 'curtain';
    updateTransitionBadge(transition.dataset.theme);
    transition.classList.add('active', 'closed');
    requestAnimationFrame(() => requestAnimationFrame(() => { transition.classList.remove('closed'); }));
    transitionTimer = setTimeout(resetTransition, reduced ? 100 : 850);
  }
  function navigate(url, theme) {
    if (navigating) return;
    navigating = true; clearTimeout(transitionTimer); closeMenu(); stopAll();
    document.body.setAttribute('aria-busy', 'true');
    if (transition) { transition.dataset.theme = theme || 'curtain'; updateTransitionBadge(transition.dataset.theme); transition.classList.add('active'); void transition.offsetWidth; transition.classList.add('closed'); }
    transitionTimer = setTimeout(() => { window.location.assign(url); setTimeout(resetTransition, 1500); }, reduced ? 30 : 640);
  }
  function updateTransitionBadge(theme) {
    const badge = $('.transition-badge'); if (!badge) return;
    badge.innerHTML = theme === 'reflection' ? '<span class="hero-heart">♥</span>　▤<br><small>心中所想 · 纸上所记</small>' : theme === 'instrument' ? '♬<br><small>下一幕 · 亲手演奏</small>' : theme === 'score' ? '♩　♫<br><small>翻开下一页乐谱</small>' : '𝄞<br><small>下一幕即将开始</small>';
  }
  $$('a[data-transition]').forEach(link => link.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;
    const url = new URL(link.href, window.location.href);
    if (url.hash && url.pathname === window.location.pathname) return;
    e.preventDefault(); navigate(url.href, link.dataset.transition);
  }));
  window.addEventListener('pageshow', e => { resetTransition(); if (!e.persisted && document.body.dataset.page !== 'cover') enterTransition(); });
  window.addEventListener('pagehide', () => { stopAll(); resetTransition(); });
  window.addEventListener('beforeunload', () => { stopAll(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });

  /* 封页前的翻谱开场：点击后播放原包音乐；无声进入始终可用。 */
  const intro = $('.opening-overlay'); const openingAudio = $('[data-opening-audio]');
  if (openingAudio) register(openingAudio);
  if (intro) {
    intro.hidden = false; document.body.style.overflow = 'hidden';
    function dismissIntro(sound) {
      const start = $('[data-opening-start]'); const silent = $('[data-opening-silent]');
      start.disabled = true; silent.disabled = true;
      if (sound && openingAudio) { play(openingAudio); } else { stopAll(); }
      intro.classList.add('opening-play');
      setTimeout(() => {
        intro.classList.add('dismiss');
        setTimeout(() => { intro.hidden = true; document.body.style.overflow = ''; $('#main').focus({ preventScroll: true }); }, reduced ? 30 : 520);
      }, reduced ? 40 : 1500);
    }
    $('[data-opening-start]').addEventListener('click', () => dismissIntro(true));
    $('[data-opening-silent]').addEventListener('click', () => dismissIntro(false));
    document.addEventListener('keydown', e => {
      if (intro.hidden || e.key !== 'Tab') return;
      const focusables = $$('button:not(:disabled)', intro);
      if (!focusables.length) return;
      if (e.shiftKey && document.activeElement === focusables[0]) { e.preventDefault(); focusables.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === focusables.at(-1)) { e.preventDefault(); focusables[0].focus(); }
    });
    $('[data-opening-start]').focus({ preventScroll: true });
  }
  $('[data-opening-toggle]')?.addEventListener('click', () => { if (!openingAudio) return; if (openingAudio.paused) play(openingAudio); else openingAudio.pause(); });

  /* 唱片按钮与原生进度条；同一时间只有一首曲子。 */
  const tracks = $$('[data-track]');
  function refreshTracks() {
    tracks.forEach(track => {
      const audio = track._audio; const playing = audio && !audio.paused && !audio.ended;
      track.classList.toggle('playing', Boolean(playing));
      const button = $('.record-button', track); button?.setAttribute('aria-pressed', String(Boolean(playing)));
      const symbol = $('.play-symbol', track); if (symbol && !track.classList.contains('unavailable')) symbol.textContent = playing ? 'Ⅱ 再点暂停' : '▷ 点击聆听';
    });
    const toggle = $('[data-opening-toggle]'); if (toggle && openingAudio) toggle.textContent = openingAudio.paused ? '▷ 开场音乐' : 'Ⅱ 暂停开场音乐';
  }
  const formatTime = t => Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00';
  tracks.forEach(track => {
    const button = $('.record-button', track);
    if (!track.dataset.src) { button.disabled = true; return; }
    const audio = register(new Audio()); audio.preload = 'none'; track._audio = audio;
    button.addEventListener('click', () => {
      if (!audio.src) audio.src = track.dataset.src;
      if (!audio.paused) { audio.pause(); return; }
      play(audio);
    });
    const range = $('.track-progress', track); const time = $('.track-time', track);
    function updateTime() { time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`; range.value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 1000 : 0; }
    ['timeupdate', 'loadedmetadata', 'ended'].forEach(e => audio.addEventListener(e, updateTime));
    range.addEventListener('input', () => { if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(range.value) / 1000 * audio.duration; });
    audio.addEventListener('ended', () => { audio.currentTime = 0; updateTime(); });
  });

  /* 合成旁白，不模仿也不声称是帕格尼尼的真实声音。 */
  let speechToken = 0;
  const voiceProfile = { child: { pitch: 1.3, rate: .95 }, young: { pitch: 1.13, rate: .94 }, adult: { pitch: .9, rate: .9 }, old: { pitch: .72, rate: .78 } };
  $$('[data-narrate]').forEach(button => button.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { toast('这个浏览器没有语音合成功能，你可以阅读画面旁的完整旁白。'); return; }
    if (button.classList.contains('speaking')) { stopAll(); return; }
    if (muted) { toast('请先解除右上角的静音，再播放合成旁白。'); return; }
    const text = document.getElementById(button.dataset.narrate)?.textContent;
    if (!text) return;
    stopAll(); const token = ++speechToken;
    const utterance = new SpeechSynthesisUtterance(text.trim());
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /^zh/.test(v.lang) && /male|男|yunxi|yunyang|kang/i.test(v.name)) || voices.find(v => /^zh/.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'zh-CN';
    Object.assign(utterance, voiceProfile[button.dataset.age] || voiceProfile.adult);
    utterance.volume = .8;
    button.classList.add('speaking'); button.setAttribute('aria-pressed', 'true'); $('.voice-action', button).textContent = '停止旁白 ■';
    utterance.onend = () => { if (token !== speechToken) return; button.classList.remove('speaking'); button.setAttribute('aria-pressed', 'false'); $('.voice-action', button).textContent = '听我的旁白 ▷'; };
    utterance.onerror = e => { utterance.onend(); if (!['canceled', 'interrupted'].includes(e.error)) toast('未能调用语音，请检查电脑是否安装中文语音。文字旁白仍可阅读。'); };
    window.speechSynthesis.speak(utterance);
  }));

  /* 全页淡入、阅读进度、背景音符、鼠标拖尾与点击音符。 */
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }), { threshold: .1 });
    $$('.reveal').forEach(e => observer.observe(e));
  }
  let ticking = false;
  const progress = $('.read-progress');
  function readPosition() {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = height > 0 ? Math.min(1, window.scrollY / height) : 0;
    if (progress) progress.style.width = fraction * 100 + '%';
    const lamp = $('.reflection-lamp'); if (lamp) lamp.style.height = fraction * 100 + '%';
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(readPosition); } }, { passive: true }); readPosition();
  const field = $('.note-field');
  if (field) for (let i = 0; i < 12; i++) { const note = document.createElement('span'); note.className = 'floating-note'; note.textContent = ['♪','♫','♩','♬'][i % 4]; note.style.left = (i * 8 + 2) + '%'; note.style.animationDelay = -i * 1.9 + 's'; note.style.animationDuration = 18 + i % 5 * 3 + 's'; field.appendChild(note); }
  const cursor = $('.cursor-dot'); let lastTrail = 0;
  function noteAt(x, y, click = false) {
    if (reduced || $$('.cursor-note').length >= 22) return;
    const note = document.createElement('span'); note.className = 'cursor-note'; note.textContent = click ? '♫' : '♪'; note.setAttribute('aria-hidden', 'true');
    note.style.left = x + 'px'; note.style.top = y + 'px'; note.style.fontSize = click ? '26px' : '15px'; document.body.appendChild(note); setTimeout(() => note.remove(), 850);
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (cursor && !reduced) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }
    document.documentElement.style.setProperty('--pointer-x', e.clientX / window.innerWidth * 100 + '%');
    document.documentElement.style.setProperty('--pointer-y', e.clientY / window.innerHeight * 100 + '%');
    if (e.timeStamp - lastTrail > 100) { noteAt(e.clientX, e.clientY); lastTrail = e.timeStamp; }
  }, { passive: true });
  document.addEventListener('pointerdown', e => noteAt(e.clientX, e.clientY, true), { passive: true });

  /* scene03.03：同一张底图，天色、琴弓、手指及谱页分层改变。 */
  const practice = $('[data-practice]'); let practiceTimer; let practiceBusy = false; let practices = 0;
  practice?.addEventListener('click', () => {
    if (practiceBusy) return; practiceBusy = true;
    practices = Math.min(8, practices + 1);
    const frame = $('#practice-frame'); frame.style.setProperty('--night', String(Math.min(.83, practices / 9)));
    $('#practice-count').textContent = String(practices).padStart(2, '0'); $('#practice-progress').value = practices;
    $('#practice-caption').textContent = practices < 3 ? '白昼 · 再试一次，我要把这个音拉稳。' : practices < 6 ? '黄昏 · 乐谱翻过一页，时间继续流动。' : '深夜 · 我已练了很久，也需要休息。';
    const sheet = $('.practice-sheet', frame); sheet.classList.remove('flipping'); void sheet.offsetWidth; sheet.classList.add('flipping');
    sheet.querySelector('span').textContent = practices % 2 ? '♩ ♫\n♪ ♬' : '♫ ♪\n♬ ♩';
    const figure = $('.performer-layer', frame); figure.classList.add('practice-playing');
    practiceTimer = setTimeout(() => { figure.classList.remove('practice-playing'); sheet.classList.remove('flipping'); practiceBusy = false; }, reduced ? 40 : 850);
    if (practices === 8) { practice.textContent = '练习完成 · 休息片刻'; practice.disabled = true; }
  });
  $('[data-practice-reset]')?.addEventListener('click', () => {
    clearTimeout(practiceTimer); practiceBusy = false; practices = 0; $('#practice-frame').style.setProperty('--night', '0');
    $('#practice-count').textContent = '00'; $('#practice-progress').value = 0; $('#practice-caption').textContent = '白昼 · 试着拉响第一个音。';
    $('#practice-frame .performer-layer').classList.remove('practice-playing'); $('#practice-frame .practice-sheet').classList.remove('flipping');
    practice.disabled = false; practice.textContent = '继续练习 ＋';
  });

  /* scene05.04 的议论均是情境对白，而非引用原始历史记录。 */
  $$('[data-whisper]').forEach(button => button.addEventListener('click', () => {
    const panel = $('#whisper-panel'); $('#whisper-text').textContent = button.dataset.whisper; panel.hidden = false;
    $$('[data-whisper]').forEach(b => b.setAttribute('aria-expanded', String(b === button)));
  }));
  $('[data-whisper-close]')?.addEventListener('click', () => { $('#whisper-panel').hidden = true; $$('[data-whisper]').forEach(b => b.setAttribute('aria-expanded', 'false')); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#whisper-panel')) { $('#whisper-panel').hidden = true; $$('[data-whisper]').forEach(b => b.setAttribute('aria-expanded', 'false')); } });

  /* 巡演地点不切换人物图片，只改变地名、光影和舞台氛围。 */
  $$('[data-tour-city]').forEach(button => button.addEventListener('click', () => {
    $$('[data-tour-city]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('#tour-city').textContent = button.dataset.tourCity; $('#tour-year').textContent = button.dataset.tourYear;
    $('#tour-context').textContent = button.dataset.tourContext;
    $('#tour-frame').style.setProperty('filter', `sepia(${button.dataset.warmth})`);
  }));
  $$('[data-archive-tab]').forEach(button => button.addEventListener('click', () => {
    const root = button.closest('[data-tabs]');
    $$('[data-archive-tab]', root).forEach(b => { b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1; });
    $$('[role="tabpanel"]', root).forEach(panel => { panel.hidden = panel.id !== button.getAttribute('aria-controls'); });
  }));
  $$('[role="tablist"]').forEach(list => list.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    const tabs = $$('[role="tab"]', list); const current = tabs.indexOf(document.activeElement); if (current < 0) return;
    e.preventDefault(); const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[index].focus(); tabs[index].click();
  }));
  $$('[data-reveal-answer]').forEach(button => button.addEventListener('click', () => { document.getElementById(button.dataset.revealAnswer).hidden = false; button.setAttribute('aria-expanded', 'true'); }));

  /* 可替换的短视频：未提供文件时不设 src，因此不会产生假视频或 404。 */
  $$('[data-local-video]').forEach(video => {
    const available = video.dataset.available === 'true';
    const button = document.querySelector(`[data-video-target="${video.id}"]`);
    if (!available || !button) return;
    video.src = video.dataset.videoSrc; button.hidden = false;
    const filmButton = $('[data-film-open]');
    if (video.id === 'prologue-video' && filmButton) filmButton.hidden = true;
    button.addEventListener('click', async () => {
      if (muted && !video.muted) { toast('请先解除静音再播放影片。'); return; }
      if (!video.paused) { video.pause(); button.textContent = '▷ 播放人物短片'; return; }
      stopAll(); video.hidden = false;
      try { await video.play(); button.textContent = 'Ⅱ 暂停人物短片'; } catch { video.hidden = true; toast('本地短片未能播放，已保留静态画面。'); }
    });
    video.addEventListener('play', () => {
      if (muted && !video.muted) { video.pause(); toast('请先解除静音再播放影片。'); return; }
      stopAll({ keep: video });
    });
    video.addEventListener('error', () => { video.hidden = true; button.hidden = true; if (video.id === 'prologue-video' && filmButton) filmButton.hidden = false; });
    video.addEventListener('pause', () => { button.textContent = '▷ 播放人物短片'; });
  });
  $('[data-film-open]')?.addEventListener('click', () => {
    if (muted) { toast('请先解除静音再打开电影片段。'); return; }
    stopAll(); const stage = $('#prologue-stage');
    const frame = document.createElement('iframe'); frame.dataset.film = ''; frame.title = '电影演奏片段（艺术改编，非历史影像）';
    frame.src = 'https://www.youtube.com/embed/vK47Ygt3jv4?start=4229&end=4269&controls=1&rel=0';
    frame.allow = 'encrypted-media; picture-in-picture'; frame.allowFullscreen = true; stage.appendChild(frame);
    toast('电影片段需要联网；请在播放器内点击播放。');
  });
})();

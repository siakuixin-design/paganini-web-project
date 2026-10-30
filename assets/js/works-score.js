/* Actual PCM visualisation and an explicit, recording-aligned score contract.
 * No pitches are inferred from the MP3 and no decorative notes are called a score. */
(() => {
  'use strict';
  const tracks = [...document.querySelectorAll('[data-track]')].filter(track => track._audio);
  if (!tracks.length) return;
  const scriptURL = document.currentScript?.src || new URL('../assets/js/works-score.js', location.href).href;
  const dataURL = new URL('../data/score-manifest.json', scriptURL);
  const AC = window.AudioContext || window.webkitAudioContext;
  const reduced = () => window.Paganini?.isReduced?.() || document.documentElement.matches('.reduce-motion,.less-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scoreData = new Map();
  const states = new Map();
  let audioContext, active, raf = 0, lastFrame = 0;
  const filename = track => decodeURIComponent(track.dataset.src.split('/').pop());
  const format = time => Number.isFinite(time) ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}` : '0:00';

  function validateScore(data) {
    if (!data || data.version !== 1 || data.verified !== true || typeof data.source !== 'string' || !data.source.trim() || !Array.isArray(data.notes) || !data.notes.length) return false;
    return data.notes.every(note => Number.isFinite(note.time) && note.time >= 0 && Number.isFinite(note.duration) && note.duration > 0 && Number.isInteger(note.midi) && note.midi >= 21 && note.midi <= 108);
  }
  function setScore(name, data) {
    if (!validateScore(data) || data.recording !== name) throw new TypeError('Score requires verified recording-aligned notes, version 1, a matching recording filename, and a source reference.');
    scoreData.set(name, { ...data, notes: [...data.notes].sort((a, b) => a.time - b.time) });
    tracks.filter(track => filename(track) === name).forEach(track => renderScore(track));
  }
  window.PaganiniScore = Object.freeze({ setScore, validateScore });

  function createContext(track) {
    const state = states.get(track);
    if (!AC || !state) return;
    try {
      audioContext ||= new AC();
      // Resume on the original record gesture, before the player's async play.
      if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
      if (state.source) return;
      const source = audioContext.createMediaElementSource(track._audio);
      state.source = source;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = filename(track) === 'cantabile.mp3' ? .86 : .68;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      Object.assign(state, { source, analyser, samples: new Uint8Array(analyser.fftSize), bins: new Uint8Array(analyser.frequencyBinCount) });
      state.panel.dataset.analysis = 'live';
    } catch (error) {
      state.help.textContent = '此浏览器暂不支持实时音频分析；原有唱片播放与进度控制仍可使用。';
      // Fail open: if analysis wiring failed after source creation, retain audio.
      state.source?.connect(audioContext.destination);
    }
  }

  function renderScore(track) {
    const state = states.get(track), score = scoreData.get(filename(track));
    if (!state) return;
    const target = state.notation;
    target.replaceChildren();
    if (!score) {
      const text = document.createElement('p');
      text.className = 'score-pending';
      text.textContent = '动态乐谱待补充：当前未提供与本录音对齐并核验的 MIDI、MusicXML 或音符时间标记。下方展示真实录音波形／频谱，不代表原曲乐谱。';
      target.append(text);
      return;
    }
    const time = track._audio.currentTime, span = 12, start = Math.max(0, Math.floor(time / span) * span);
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 600 110');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `已核验乐段 ${format(start)} 至 ${format(start + span)}，当前 ${format(time)}`);
    const add = (tag, attributes) => { const el = document.createElementNS(ns, tag); Object.entries(attributes).forEach(([k, v]) => el.setAttribute(k, v)); svg.append(el); return el; };
    for (let line = 0; line < 5; line++) add('line', { x1: 15, x2: 585, y1: 25 + line * 12, y2: 25 + line * 12, stroke: '#9b835c', 'stroke-width': 1 });
    // MIDI displayed as pitch markers; this is a timed excerpt, not an engraving engine.
    score.notes.filter(note => note.time >= start && note.time < start + span).forEach(note => {
      const current = time >= note.time && time < note.time + note.duration;
      const noteEl = add('ellipse', { cx: 20 + (note.time - start) / span * 560, cy: 73 - (note.midi - 64) * 3.5, rx: 6, ry: 4.5, fill: current ? '#ffdf97' : '#b5a17b', 'data-active': current });
      const title = document.createElementNS(ns, 'title'); title.textContent = `MIDI ${note.midi} · ${note.time.toFixed(2)} s`; noteEl.append(title);
    });
    target.append(svg);
    const source = document.createElement('small'); source.textContent = `核验乐段音高标记 · 资料：${score.source}`; target.append(source);
  }

  function draw(track) {
    const state = states.get(track), audio = track._audio, { canvas } = state;
    const rect = canvas.getBoundingClientRect(), w = Math.max(240, rect.width), h = 116, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#6d593a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    if (state.analyser && !audio.paused && !audio.ended) {
      ctx.strokeStyle = '#e0bd7d'; ctx.fillStyle = 'rgba(198,166,109,.62)'; ctx.lineWidth = 1.5;
      if (state.mode.value === 'waveform') {
        state.analyser.getByteTimeDomainData(state.samples);
        ctx.beginPath();
        for (let i = 0; i < state.samples.length; i += 4) { const x = i / (state.samples.length - 1) * w, y = h / 2 + (state.samples[i] - 128) / 128 * 50; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      } else {
        state.analyser.getByteFrequencyData(state.bins);
        const columns = 52, step = w / columns;
        for (let i = 0; i < columns; i++) {
          const lo = Math.floor((2 ** (i / columns * 9) - 1) / 511 * state.bins.length), hi = Math.max(lo + 1, Math.floor((2 ** ((i + 1) / columns * 9) - 1) / 511 * state.bins.length));
          let sum = 0; for (let j = lo; j < hi; j++) sum += state.bins[j] || 0;
          const bar = sum / (hi - lo) / 255 * 96;
          ctx.fillRect(i * step, h - 8 - bar, Math.max(1, step - 3), bar);
        }
      }
    }
    state.clock.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}${audio.paused ? ' · 已暂停' : ' · 录音同步'}`;
    if (scoreData.has(filename(track))) renderScore(track);
  }
  function loop(now) {
    if (!active || active._audio.paused || document.hidden) { raf = 0; return; }
    if (now - lastFrame >= (reduced() ? 240 : 33)) { draw(active); lastFrame = now; }
    raf = requestAnimationFrame(loop);
  }
  function startLoop(track) {
    if (active && active !== track) draw(active);
    active = track; states.get(track).panel.hidden = false;
    createContext(track); draw(track);
    if (!raf) raf = requestAnimationFrame(loop);
  }

  tracks.forEach((track, index) => {
    const panel = document.createElement('section'); panel.className = 'work-score-panel'; panel.hidden = true;
    panel.setAttribute('aria-label', `${track.querySelector('h2')?.textContent || '作品'} · 录音可视化与动态乐谱`);
    panel.innerHTML = `<div class="score-panel-heading"><h3>聆听的形状</h3><label for="work-spectrum-${index}">录音可视化 <select id="work-spectrum-${index}"><option value="waveform">实时波形</option><option value="spectrum">实时频谱</option></select></label></div><div class="score-notation"></div><canvas class="work-spectrum" height="116" aria-label="由正在播放的真实录音生成的波形或频谱"></canvas><div class="score-panel-footer"><span class="score-clock"></span><span class="score-help">使用真实录音数据 · 暂停时停止 · 拖动原有进度条可寻位</span></div>`;
    track.querySelector('.track-info').append(panel);
    const mode = panel.querySelector('select');
    if (filename(track) !== 'cantabile.mp3') mode.value = 'spectrum';
    const state = { panel, mode, notation: panel.querySelector('.score-notation'), canvas: panel.querySelector('canvas'), clock: panel.querySelector('.score-clock'), help: panel.querySelector('.score-help') };
    states.set(track, state); renderScore(track);
    track.querySelector('.record-button').addEventListener('click', () => createContext(track), { capture: true });
    track._audio.addEventListener('play', () => startLoop(track));
    ['pause', 'ended', 'seeked', 'loadedmetadata'].forEach(event => track._audio.addEventListener(event, () => draw(track)));
    mode.addEventListener('change', () => draw(track));
  });
  fetch(dataURL).then(response => { if (!response.ok) throw new Error('Score manifest unavailable'); return response.json(); }).then(manifest => {
    for (const [name, data] of Object.entries(manifest.recordings || {})) if (validateScore(data) && data.recording === name) setScore(name, data);
  }).catch(() => { /* The explicit unverified state remains; audio needs no score file. */ });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (active && !active._audio.paused) startLoop(active);
  });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; if (audioContext?.state === 'running') void audioContext.suspend(); });
})();

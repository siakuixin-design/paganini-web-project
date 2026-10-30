/* 页面控制器：按下发声，松开发声停止；切换/静音/失焦都会释放音符。 */
(() => {
  'use strict';
  if (!document.querySelector('[data-instrument-platform]')) return;
  const $ = s => document.querySelector(s); const $$ = s => [...document.querySelectorAll(s)];
  const descriptions = {
    mandolin: { title: '曼陀林', intro: '儿时的第一种乐器。成对的金属弦带来清脆、短促的声音；真实演奏常用快速重复拨弦形成颤音。这里使用已切分的真实拨弦录音。' },
    violin: { title: '小提琴', intro: '陪伴他走上欧洲舞台的乐器。按住按键，琴弓般的持续声音继续；松开按键，声音淡出。采样移调与短循环并不能完整重现真人的运弓和揉弦。' },
    guitar: { title: '吉他', intro: '舞台之外温柔的一面。他也熟悉吉他并为它创作。这里使用真实木吉他拨弦采样，按一下发出一个音，尾音自然衰减；松开会收住余音。' }
  };
  let engine, context, enabled = false, selected = 'mandolin', octave = 0, loading;
  const held = new Map(); let session = 0; let melodyTimers = [];
  const keyboard = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12 };
  function clearMelody() { melodyTimers.forEach(clearTimeout); melodyTimers = []; }
  function releaseAll() {
    session++; clearMelody(); held.clear(); engine?.allNotesOff();
    $$('.note-key').forEach(key => key.classList.remove('active')); $('#instrument-art').classList.remove('sounding'); $('#signal-meter').classList.remove('sounding');
    $('#voice-count').textContent = '0';
  }
  function updateInstrument() {
    $('#instrument-name').textContent = descriptions[selected].title; $('#instrument-description').textContent = descriptions[selected].intro;
    $$('[data-instrument-art]').forEach(art => { art.hidden = art.dataset.instrumentArt !== selected; });
    $$('[data-instrument-select]').forEach(button => { const on = button.dataset.instrumentSelect === selected; button.setAttribute('aria-selected', String(on)); button.tabIndex = on ? 0 : -1; });
    const status = $('#sample-status');
    status.textContent = !enabled ? '已附真实采样 · 点击「启用演奏」载入' : engine.hasSamples(selected) ? '真实录音采样 · 键盘移调演奏' : '电子合成备用 · 非真实乐器录音';
    status.classList.toggle('synth-badge', enabled && !engine.hasSamples(selected));
    const notes = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B','C'];
    $$('.note-key').forEach(key => { const offset = Number(key.dataset.note); key.querySelector('small').textContent = notes[offset] + (offset === 12 ? 5 + octave / 12 : 4 + octave / 12); });
  }
  async function enable() {
    if (enabled) { if (context.state === 'suspended') await context.resume(); return true; }
    if (loading) return loading;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { Paganini.toast('浏览器不支持 Web Audio。请使用电脑版 Chrome、Edge 或 Firefox。'); return false; }
    $('#enable-instrument').disabled = true; $('#enable-instrument').textContent = '正在载入真实采样…';
    loading = (async () => {
      try {
        context = new AudioContext({ latencyHint: 'interactive' });
        await context.resume(); engine = new PaganiniInstrumentEngine(context);
        await engine.loadEmbedded(window.PAGANINI_SAMPLE_BANK || {});
        engine.setVolume(Number($('#instrument-volume').value) / 100);
        engine.onVoiceChange = count => { $('#voice-count').textContent = String(count); $('#signal-meter').classList.toggle('sounding', count > 0); $('#instrument-art').classList.toggle('sounding', count > 0); };
        enabled = true; $('#enable-instrument').textContent = '演奏已启用 ✓'; $('#enable-instrument').disabled = true;
        updateInstrument(); return true;
      } catch { $('#enable-instrument').disabled = false; $('#enable-instrument').textContent = '重新启用演奏'; Paganini.toast('音频引擎未能启动，请再次点击启用。'); return false; }
      finally { loading = null; }
    })();
    return loading;
  }
  async function startNote(id, offset, key) {
    if (held.has(id) || Paganini.audio.isMuted()) { if (Paganini.audio.isMuted()) Paganini.toast('请先解除右上角的静音。'); return; }
    // 先记录按下状态，保证异步 resume/decode 期间松手不会留下声音。
    if (!enabled) { Paganini.toast('请先点击「启用演奏」载入采样。'); return; }
    const token = session; const instrument = selected; held.set(id, { offset, key });
    if (context.state !== 'running') { try { await context.resume(); } catch { held.delete(id); return; } }
    if (!held.has(id) || token !== session || Paganini.audio.isMuted()) return;
    engine.noteOn(id, 60 + octave + offset, instrument); key?.classList.add('active');
    $('#instrument-log').textContent = descriptions[instrument].title + ' · MIDI ' + (60 + octave + offset) + ' · ' + PaganiniInstrumentEngine.frequency(60 + octave + offset).toFixed(1) + ' Hz';
  }
  function stopNote(id) { const state = held.get(id); held.delete(id); state?.key?.classList.remove('active'); engine?.noteOff(id); }
  $('#enable-instrument').addEventListener('click', () => { Paganini.audio.stopAll(); enable(); });
  $$('[data-instrument-select]').forEach(button => button.addEventListener('click', () => { releaseAll(); selected = button.dataset.instrumentSelect; updateInstrument(); }));
  $('#instrument-volume').addEventListener('input', e => engine?.setVolume(Number(e.target.value) / 100));
  $('#instrument-octave').addEventListener('change', e => { releaseAll(); octave = Number(e.target.value); updateInstrument(); });
  $('#stop-instrument').addEventListener('click', () => { releaseAll(); $('#instrument-log').textContent = '所有音符已停止'; });
  document.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.code === 'Escape') { releaseAll(); return; }
    if (!(e.code in keyboard)) return;
    e.preventDefault(); const offset = keyboard[e.code]; startNote('key:' + e.code, offset, $(`.note-key[data-note="${offset}"]`));
  });
  document.addEventListener('keyup', e => { if (e.code in keyboard) { e.preventDefault(); stopNote('key:' + e.code); } });
  $$('.note-key').forEach(key => {
    key.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); key.setPointerCapture(e.pointerId); startNote('pointer:' + e.pointerId, Number(key.dataset.note), key); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(event => key.addEventListener(event, e => stopNote('pointer:' + e.pointerId)));
    // Tab 后用空格/Enter 也可以操作屏幕琴键。
    key.addEventListener('keydown', e => { if (['Space','Enter'].includes(e.code) && !e.repeat) { e.preventDefault(); startNote('button:' + key.dataset.note, Number(key.dataset.note), key); } });
    key.addEventListener('keyup', e => { if (['Space','Enter'].includes(e.code)) { e.preventDefault(); stopNote('button:' + key.dataset.note); } });
  });
  window.addEventListener('blur', releaseAll); window.addEventListener('pagehide', releaseAll); window.addEventListener('paganini:audio-stop', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  $('#sample-upload').addEventListener('change', async e => {
    if (!await enable()) return;
    releaseAll(); const instrument = selected;
    try {
      const count = await engine.loadFiles(instrument, [...e.target.files]);
      Paganini.toast(count ? `已载入 ${count} 个${descriptions[instrument].title}采样。` : '文件请命名为 C4.wav、A4.mp3 等音名格式。');
    } catch { Paganini.toast('部分音频无法解码。请使用有效的 WAV、MP3 或 OGG 文件。'); }
    updateInstrument(); e.target.value = '';
  });
  $('#play-scale').addEventListener('click', async () => {
    if (Paganini.audio.isMuted()) { Paganini.toast('请先解除静音。'); return; }
    if (!await enable()) return;
    releaseAll(); const token = session;
    [0,2,4,5,7,9,11,12].forEach((offset, i) => {
      melodyTimers.push(setTimeout(() => { if (token === session) startNote('demo:' + i, offset, $(`.note-key[data-note="${offset}"]`)); }, i * 360));
      melodyTimers.push(setTimeout(() => stopNote('demo:' + i), i * 360 + 280));
    });
  });
  updateInstrument();
})();

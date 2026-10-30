/* 独立 Web Audio 乐器引擎。真实录音优先；失效时才使用有标示的合成备用。 */
(function (root) {
  'use strict';
  class InstrumentEngine {
    constructor(context) {
      this.context = context; this.voices = new Map(); this.banks = { mandolin: [], violin: [], guitar: [] };
      this.cache = new Map(); this.maxVoices = 12; this.volume = .48;
      this.output = context.createGain(); this.output.gain.value = this.volume;
      this.compressor = context.createDynamicsCompressor();
      this.compressor.threshold.value = -16; this.compressor.ratio.value = 5;
      this.output.connect(this.compressor); this.compressor.connect(context.destination);
      this.onVoiceChange = () => {};
    }
    static frequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    static nearest(samples, midi) { return samples.reduce((best, sample) => !best || Math.abs(sample.midi - midi) < Math.abs(best.midi - midi) ? sample : best, null); }
    setVolume(value) { this.volume = Math.max(0, Math.min(.8, Number(value) || 0)); this.output.gain.setTargetAtTime(this.volume, this.context.currentTime, .02); }
    async loadEmbedded(bank) {
      for (const instrument of Object.keys(this.banks)) {
        const loaded = [];
        for (const sample of bank[instrument] || []) {
          try {
            const binary = atob(sample.data.split(',')[1]); const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const buffer = await this.context.decodeAudioData(bytes.buffer);
            loaded.push({ ...sample, buffer });
          } catch { /* 保留该乐器的实际可用采样，缺失时走备用 */ }
        }
        this.banks[instrument] = loaded;
      }
      return Object.fromEntries(Object.entries(this.banks).map(([k, v]) => [k, v.length]));
    }
    async loadFiles(instrument, files) {
      const loaded = [];
      for (const file of files) {
        const match = /^([A-G])([#b]?)([0-7])\.(wav|mp3|ogg)$/i.exec(file.name);
        if (!match) continue;
        const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const midi = (Number(match[3]) + 1) * 12 + semitones[match[1].toUpperCase()] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
        const buffer = await this.context.decodeAudioData(await file.arrayBuffer());
        loaded.push({ midi, buffer, file: file.name, custom: true });
      }
      if (loaded.length) { this.allNotesOff(); this.banks[instrument] = loaded; }
      return loaded.length;
    }
    hasSamples(instrument) { return this.banks[instrument]?.length > 0; }
    noteOn(id, midi, instrument) {
      if (this.voices.has(id)) return false;
      if (this.voices.size >= this.maxVoices) this.noteOff(this.voices.keys().next().value, true);
      const c = this.context, now = c.currentTime;
      const gain = c.createGain(); gain.gain.setValueAtTime(0, now); gain.connect(this.output);
      const sample = InstrumentEngine.nearest(this.banks[instrument] || [], midi);
      const nodes = [gain]; let source;
      if (sample) {
        source = c.createBufferSource(); source.buffer = sample.buffer;
        source.playbackRate.value = Math.pow(2, (midi - sample.midi) / 12);
        // 小提琴用录音稳定区循环；拨弦乐器保持自然衰减。
        if (instrument === 'violin' && sample.buffer.duration > 1.2) {
          source.loop = true;
          source.loopStart = sample.loopStart || .65;
          source.loopEnd = Math.min(sample.loopEnd || 1.8, sample.buffer.duration - .15);
        }
        const level = instrument === 'violin' ? .22 : .5;
        gain.gain.linearRampToValueAtTime(level, now + (instrument === 'violin' ? .055 : .009));
        source.connect(gain); nodes.push(source); source.start(now);
      } else if (instrument === 'violin') {
        // 明确标示的电子备用：谐波 + 轻微揉弦，不能重现真实琴弓细节。
        source = c.createOscillator(); source.type = 'sawtooth'; source.frequency.value = InstrumentEngine.frequency(midi);
        const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2700; filter.Q.value = .8;
        source.connect(filter); filter.connect(gain);
        const lfo = c.createOscillator(), amount = c.createGain(); lfo.frequency.value = 5.2; amount.gain.value = 4;
        lfo.connect(amount); amount.connect(source.frequency); lfo.start(now);
        gain.gain.linearRampToValueAtTime(.14, now + .09); nodes.push(source, filter, lfo, amount); source.start(now);
      } else {
        // 拨弦备用是 Karplus–Strong 模型，不是单一正弦电子音。
        source = c.createBufferSource(); source.buffer = this.pluckedBuffer(midi, instrument);
        gain.gain.linearRampToValueAtTime(.35, now + .006); source.connect(gain); nodes.push(source); source.start(now);
      }
      const voice = { id, midi, instrument, source, gain, nodes, releasing: false };
      this.voices.set(id, voice); this.onVoiceChange(this.voices.size);
      source.onended = () => {
        if (this.voices.get(id) === voice) { this.voices.delete(id); this.onVoiceChange(this.voices.size); }
        this.dispose(voice);
      };
      return true;
    }
    pluckedBuffer(midi, instrument) {
      const key = instrument + ':' + midi;
      if (this.cache.has(key)) return this.cache.get(key);
      const c = this.context, rate = c.sampleRate, f = InstrumentEngine.frequency(midi);
      const duration = instrument === 'mandolin' ? 1.5 : 2.8;
      const buffer = c.createBuffer(1, Math.ceil(rate * duration), rate), data = buffer.getChannelData(0);
      const period = Math.max(4, Math.round(rate / f)), ring = new Float32Array(period);
      for (let i = 0; i < period; i++) ring[i] = (Math.random() * 2 - 1) * .6;
      let pointer = 0; const decay = instrument === 'mandolin' ? .982 : .994;
      for (let i = 0; i < data.length; i++) {
        const next = (pointer + 1) % period;
        data[i] = ring[pointer] * Math.min(1, i / 150) * Math.min(1, (data.length - i) / 500);
        ring[pointer] = decay * (ring[pointer] + ring[next]) * .5; pointer = next;
      }
      this.cache.set(key, buffer); return buffer;
    }
    noteOff(id, immediate = false) {
      const voice = this.voices.get(id); if (!voice || voice.releasing) return;
      voice.releasing = true; this.voices.delete(id); this.onVoiceChange(this.voices.size);
      const now = this.context.currentTime, release = immediate ? .012 : voice.instrument === 'violin' ? .09 : .07;
      const parameter = voice.gain.gain;
      if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
      else { const value = parameter.value; parameter.cancelScheduledValues(now); parameter.setValueAtTime(value, now); }
      parameter.linearRampToValueAtTime(0, now + release);
      voice.nodes.forEach(node => { if (typeof node.stop === 'function') { try { node.stop(now + release + .02); } catch { /* 已结束 */ } } });
      // source.onended 是清理路径，不依赖另建大量计时器。
    }
    dispose(voice) { voice.nodes.forEach(node => { try { node.disconnect(); } catch { /* 节点已经清理 */ } }); }
    allNotesOff(immediate = true) { [...this.voices.keys()].forEach(id => this.noteOff(id, immediate)); }
  }
  root.PaganiniInstrumentEngine = InstrumentEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = InstrumentEngine;
})(typeof window !== 'undefined' ? window : globalThis);

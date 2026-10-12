/* Âm thanh tổng hợp bằng WebAudio – không cần file âm thanh. */
window.G = window.G || {};

G.Sound = (() => {
  let ctx = null;
  const on = () => G.Store.state.settings.sound;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
    if (!on()) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, { vol = 0.12, freq = 900, q = 0.8 } = {}) {
    if (!on()) return;
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock: () => ac(),
    click: () => tone(660, 0.06, { type: 'triangle', vol: 0.08 }),
    beep: (strength) => tone(300 + strength * 900, 0.07, { type: 'square', vol: 0.05 + strength * 0.05 }),
    scan: () => tone(1200, 0.05, { type: 'sine', vol: 0.04 }),
    lock: () => { tone(520, 0.12, { type: 'triangle' }); tone(780, 0.18, { type: 'triangle', delay: 0.1 }); },
    brush: () => noise(0.08, { vol: 0.05, freq: 2500, q: 0.6 }),
    dig: () => noise(0.14, { vol: 0.14, freq: 500, q: 0.7 }),
    crack: () => { noise(0.2, { vol: 0.25, freq: 1800, q: 3 }); tone(140, 0.25, { type: 'sawtooth', vol: 0.1, slide: -60 }); },
    success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.12, delay: i * 0.11 })),
    fail: () => tone(220, 0.3, { type: 'sawtooth', vol: 0.08, slide: -80 }),
    shutter: () => { noise(0.05, { vol: 0.2, freq: 3000 }); noise(0.05, { vol: 0.15, freq: 1500 }); },
  };
})();

G.vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };

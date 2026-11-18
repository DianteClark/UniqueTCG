/* Plebes TCG — tiny synthesized chiptune sound effects (WebAudio, no files). */
(function (root) {
  'use strict';
  const KEY = 'plebes-tcg-sfx';
  let ctx = null, master = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { }

  function ac() {
    if (!ctx) {
      const C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, dur, type, vol, slideTo, delay) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq || 1800;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t);
  }
  const SFX = {
    click: () => tone(660, 0.05, 'square', 0.12),
    play: () => { noise(0.12, 0.35, 900); tone(140, 0.12, 'triangle', 0.4, 70); },
    draw: () => tone(880, 0.06, 'triangle', 0.15, 1320),
    swing: () => noise(0.09, 0.18, 3000),
    hit: () => { noise(0.1, 0.4, 2200); tone(220, 0.08, 'square', 0.2, 110); },
    castle: () => { noise(0.25, 0.5, 600); tone(90, 0.3, 'triangle', 0.5, 40); },
    die: () => { tone(440, 0.25, 'square', 0.2, 80); noise(0.2, 0.2, 1200, 0.05); },
    heal: () => { tone(523, 0.1, 'triangle', 0.25); tone(784, 0.14, 'triangle', 0.25, null, 0.08); },
    magic: () => { [0, 1, 2, 3].forEach(i => tone(660 + i * 220, 0.08, 'triangle', 0.18, null, i * 0.05)); },
    coin: () => { tone(988, 0.08, 'square', 0.2); tone(1319, 0.25, 'square', 0.2, null, 0.08); },
    flip: () => { for (let i = 0; i < 8; i++) tone(500 + (i % 2) * 300, 0.04, 'square', 0.1, null, i * 0.12); },
    turn: () => { tone(392, 0.09, 'square', 0.18); tone(587, 0.16, 'square', 0.18, null, 0.09); },
    combo: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.18, null, i * 0.07)); },
    bluff: () => { tone(300, 0.12, 'sawtooth', 0.2); tone(250, 0.2, 'sawtooth', 0.2, null, 0.12); },
    lie: () => { tone(200, 0.35, 'sawtooth', 0.3, 60); noise(0.3, 0.3, 800); },
    truth: () => { tone(784, 0.1, 'square', 0.2); tone(1047, 0.3, 'square', 0.2, null, 0.1); },
    win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.22, null, i * 0.13)); },
    lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.3, null, i * 0.22)); },
    pack: () => { noise(0.3, 0.25, 4000); tone(440, 0.3, 'triangle', 0.2, 880); },
    legend: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'square', 0.2, null, i * 0.09)); }
  };
  root.Sfx = {
    play(name) { if (!on || !SFX[name]) return; try { SFX[name](); } catch (e) { } },
    get on() { return on; },
    set(v) { on = !!v; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { } if (on) ac(); }
  };
})(this);

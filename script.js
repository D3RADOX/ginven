/* ============================================================
   AGI DJ — NEURAL CORE  |  script.js
   Web Audio API DJ engine + canvas visualizers + neural bg
   ============================================================ */

'use strict';

// ── Audio Context ──────────────────────────────────────────
let ctx = null;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

// ── BPM / Master Clock ────────────────────────────────────
let bpm = 128;
let beatInterval = null;
let beatPhase = 0;

const bpmValue  = document.getElementById('bpm-value');
const beatDot   = document.getElementById('beat-indicator');

function setBpm(val) {
  bpm = Math.max(60, Math.min(220, val));
  bpmValue.textContent = bpm;
  restartClock();
}

document.getElementById('bpm-up').addEventListener('click',   () => setBpm(bpm + 1));
document.getElementById('bpm-down').addEventListener('click', () => setBpm(bpm - 1));

function restartClock() {
  clearInterval(beatInterval);
  const ms = (60 / bpm) * 1000;
  beatInterval = setInterval(() => {
    beatPhase = (beatPhase + 1) % 4;
    beatDot.classList.add('active');
    setTimeout(() => beatDot.classList.remove('active'), 80);
  }, ms);
}
restartClock();

// ── Deck State ────────────────────────────────────────────
const decks = {
  a: { playing: false, osc: null, gainNode: null, loopId: null,
       time: 0, waveOffset: 0, color: '#00f5ff' },
  b: { playing: false, osc: null, gainNode: null, loopId: null,
       time: 0, waveOffset: 0, color: '#bf00ff' },
};

// ── Play / Stop deck ──────────────────────────────────────
function startDeck(id) {
  const deck = decks[id];
  const ac = getCtx();
  stopDeck(id);

  // Simple oscillator tone as placeholder for loaded tracks
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = id === 'a' ? 80 : 100;
  gain.gain.value = 0.0; // silent — we route through master gain
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  deck.osc = osc;
  deck.gainNode = gain;

  deck.playing = true;
  document.getElementById(`play-${id}`).textContent = '⏸';
  document.getElementById(`play-${id}`).classList.add('playing');
  document.getElementById(`turntable-${id}`).querySelector('.platter').classList.add('spinning');

  // Animate time counter
  deck.loopId = setInterval(() => {
    deck.time += 0.1;
    const m = Math.floor(deck.time / 60).toString().padStart(1, '0');
    const s = Math.floor(deck.time % 60).toString().padStart(2, '0');
    document.getElementById(`track-${id}-time`).textContent = `${m}:${s}`;
  }, 100);
}

function stopDeck(id) {
  const deck = decks[id];
  if (deck.osc) { try { deck.osc.stop(); } catch(e) {} deck.osc = null; }
  clearInterval(deck.loopId);
  deck.playing = false;
  document.getElementById(`play-${id}`).textContent = '▶';
  document.getElementById(`play-${id}`).classList.remove('playing');
  document.getElementById(`turntable-${id}`).querySelector('.platter').classList.remove('spinning');
}

['a','b'].forEach(id => {
  document.getElementById(`play-${id}`).addEventListener('click', () => {
    if (decks[id].playing) stopDeck(id); else startDeck(id);
  });
});

// ── Master Gain ───────────────────────────────────────────
let masterGain = null;
const mvSlider = document.getElementById('master-vol');
const mvVal    = document.getElementById('master-vol-val');

const ensureMaster = () => {
  if (!masterGain) {
    const ac = getCtx();
    masterGain = ac.createGain();
    masterGain.gain.value = parseInt(mvSlider.value) / 100;
    masterGain.connect(ac.destination);
  }
};

mvSlider.addEventListener('input', () => {
  ensureMaster();
  mvVal.textContent = mvSlider.value;
  masterGain.gain.value = parseInt(mvSlider.value) / 100;
});

// ── Crossfader ────────────────────────────────────────────
document.getElementById('crossfader').addEventListener('input', function() {
  const v = parseInt(this.value) / 100; // 0=A, 1=B
  if (decks.a.gainNode) decks.a.gainNode.gain.value = 1 - v;
  if (decks.b.gainNode) decks.b.gainNode.gain.value = v;
});

// ── Pitch faders ──────────────────────────────────────────
['a','b'].forEach(id => {
  const slider = document.getElementById(`pitch-${id}`);
  const valEl  = document.getElementById(`pitch-${id}-val`);
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    valEl.textContent = (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
    if (decks[id].osc) {
      const base = id === 'a' ? 80 : 100;
      decks[id].osc.frequency.value = base * (1 + v / 100);
    }
  });
});

// ── Sync buttons ──────────────────────────────────────────
document.getElementById('sync-a').addEventListener('click', function() {
  document.getElementById('pitch-a').value = 0;
  document.getElementById('pitch-a-val').textContent = '0.0%';
  this.classList.toggle('active');
});
document.getElementById('sync-b').addEventListener('click', function() {
  document.getElementById('pitch-b').value = 0;
  document.getElementById('pitch-b-val').textContent = '0.0%';
  this.classList.toggle('active');
});

// ── CUE buttons ───────────────────────────────────────────
['a','b'].forEach(id => {
  document.getElementById(`cue-${id}`).addEventListener('click', function() {
    this.classList.toggle('active');
    // Flash cue accent
    const btn = this;
    btn.style.background = '#ff6600';
    setTimeout(() => btn.style.background = '', 150);
  });
});

// ── FX buttons ───────────────────────────────────────────
document.querySelectorAll('.fx-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    this.classList.toggle('active');
  });
});

// ── Beat pads ─────────────────────────────────────────────
const padFreqs = {
  kick:     [50, 'sine'],
  snare:    [200, 'square'],
  hat:      [8000, 'sawtooth'],
  'open-hat': [6000, 'sawtooth'],
  bass:     [80, 'triangle'],
  chord:    [440, 'sawtooth'],
  lead:     [880, 'square'],
  fx:       [1200, 'sawtooth'],
  perc1:    [300, 'square'],
  perc2:    [500, 'triangle'],
  rise:     [200, 'sawtooth'],
  drop:     [60,  'sine'],
  sweep:    [2000, 'sawtooth'],
  noise:    [1000, 'square'],
  vox1:     [600, 'triangle'],
  vox2:     [900, 'square'],
};

document.querySelectorAll('.pad').forEach(pad => {
  pad.addEventListener('mousedown', () => triggerPad(pad));
  pad.addEventListener('touchstart', e => { e.preventDefault(); triggerPad(pad); });
});

function triggerPad(pad) {
  const note = pad.dataset.note;
  const [freq, type] = padFreqs[note] || [440, 'sine'];
  ensureMaster();
  const ac = getCtx();
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);

  // Frequency sweep for some pads
  if (note === 'rise')  osc.frequency.exponentialRampToValueAtTime(2000, ac.currentTime + 0.3);
  if (note === 'drop')  osc.frequency.exponentialRampToValueAtTime(20,   ac.currentTime + 0.3);
  if (note === 'sweep') osc.frequency.exponentialRampToValueAtTime(200,  ac.currentTime + 0.4);
  if (note === 'kick')  osc.frequency.exponentialRampToValueAtTime(30,   ac.currentTime + 0.25);

  gain.gain.setValueAtTime(0.4, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ac.currentTime + 0.55);

  pad.classList.add('hit');
  setTimeout(() => pad.classList.remove('hit'), 120);
}

// ── Waveform Canvases ─────────────────────────────────────
function drawWaveform(canvasId, color, offset) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx2  = canvas.getContext('2d');
  const W = canvas.width  = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;
  ctx2.clearRect(0, 0, W, H);

  ctx2.strokeStyle = color;
  ctx2.lineWidth = 1.5;
  ctx2.shadowBlur = 8;
  ctx2.shadowColor = color;
  ctx2.beginPath();

  const amp = H / 2 - 4;
  for (let x = 0; x < W; x++) {
    const t = (x + offset) * 0.04;
    const y = H / 2
      + Math.sin(t) * amp * 0.45
      + Math.sin(t * 2.3) * amp * 0.22
      + Math.sin(t * 5.1) * amp * 0.12
      + Math.sin(t * 11.7 + offset * 0.01) * amp * 0.06;
    x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
  }
  ctx2.stroke();

  // Draw transient markers
  ctx2.strokeStyle = color;
  ctx2.globalAlpha = 0.3;
  for (let i = 0; i < 12; i++) {
    const mx = ((i * 73 + offset * 0.3) % W);
    const mh = 6 + Math.random() * (H * 0.2);
    ctx2.beginPath();
    ctx2.moveTo(mx, H / 2 - mh);
    ctx2.lineTo(mx, H / 2 + mh);
    ctx2.stroke();
  }
  ctx2.globalAlpha = 1;
}

// ── Spectrum Visualizer ───────────────────────────────────
let spectrumBars = new Array(40).fill(0);
let spectrumTargets = new Array(40).fill(0);

function drawSpectrum() {
  const canvas = document.getElementById('spectrum');
  if (!canvas) return;
  const ctx2 = canvas.getContext('2d');
  const W = canvas.width  = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;
  ctx2.clearRect(0, 0, W, H);

  // Update targets with beat influence
  const beatBoost = beatPhase === 0 ? 1.4 : 1;
  for (let i = 0; i < spectrumBars.length; i++) {
    spectrumTargets[i] = (Math.random() * H * 0.7 + H * 0.08) * beatBoost;
    if (i < 4) spectrumTargets[i] *= 1.5; // bass boost
    spectrumBars[i] += (spectrumTargets[i] - spectrumBars[i]) * 0.18;
  }

  const barW = (W / spectrumBars.length) - 1;
  for (let i = 0; i < spectrumBars.length; i++) {
    const x = i * (barW + 1);
    const h = spectrumBars[i];
    const t = i / spectrumBars.length;

    // Gradient: cyan → purple → magenta
    const r = Math.round(0   + t * 191 + (1 - t) * 255 * (t > 0.7 ? (t - 0.7) / 0.3 : 0));
    const g = Math.round(245 * (1 - t * 0.9));
    const b = Math.round(255 - t * 100);

    ctx2.fillStyle = `rgb(${r},${g},${b})`;
    ctx2.shadowBlur = 6;
    ctx2.shadowColor = `rgb(${r},${g},${b})`;
    ctx2.fillRect(x, H - h, barW, h);
  }
}

// ── AGI Signal meter ──────────────────────────────────────
const agiBars = document.querySelectorAll('.agi-bar');
function updateAgiMeter() {
  agiBars.forEach((bar, i) => {
    const h = 5 + Math.random() * 31;
    bar.style.height = h + 'px';
    // Color threshold
    if (h > 28) bar.style.background = 'var(--red)';
    else if (h > 20) bar.style.background = 'var(--orange)';
    else bar.style.background = 'var(--cyan)';
  });
}

// ── Neural background canvas ──────────────────────────────
(function initNeuralBg() {
  const canvas = document.getElementById('neural-bg');
  const ctx2 = canvas.getContext('2d');
  let W, H;

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Neural nodes
  const NODES = 60;
  const nodes = Array.from({ length: NODES }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: 1.5 + Math.random() * 2,
  }));

  function drawNeural() {
    ctx2.clearRect(0, 0, W, H);

    // Move nodes
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    // Draw edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) {
          const alpha = (1 - d / 160) * 0.5;
          ctx2.strokeStyle = `rgba(0,245,255,${alpha})`;
          ctx2.lineWidth = 0.5;
          ctx2.beginPath();
          ctx2.moveTo(nodes[i].x, nodes[i].y);
          ctx2.lineTo(nodes[j].x, nodes[j].y);
          ctx2.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      ctx2.beginPath();
      ctx2.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx2.fillStyle = 'rgba(0,245,255,0.7)';
      ctx2.fill();
    });

    requestAnimationFrame(drawNeural);
  }
  drawNeural();
})();

// ── Main animation loop ───────────────────────────────────
let frame = 0;
function loop() {
  frame++;
  if (decks.a.playing) decks.a.waveOffset += 3;
  if (decks.b.playing) decks.b.waveOffset += 3;

  drawWaveform('waveform-a', decks.a.color, decks.a.waveOffset);
  drawWaveform('waveform-b', decks.b.color, decks.b.waveOffset);
  drawSpectrum();

  if (frame % 3 === 0) updateAgiMeter();

  requestAnimationFrame(loop);
}

// ── Spin turntable on drag ────────────────────────────────
['a','b'].forEach(id => {
  const platter = document.getElementById(`turntable-${id}`).querySelector('.platter');
  let dragging = false, lastY = 0;

  platter.addEventListener('mousedown', e => { dragging = true; lastY = e.clientY; });
  document.addEventListener('mouseup',  () => { dragging = false; });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    decks[id].waveOffset += dy * 2;
  });
});

// ── Init ──────────────────────────────────────────────────
// Draw initial static waveforms
drawWaveform('waveform-a', decks.a.color, 0);
drawWaveform('waveform-b', decks.b.color, 100);

// Start loop
loop();

// Ensure audio context on first interaction
document.body.addEventListener('click', () => {
  ensureMaster();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}, { once: false });

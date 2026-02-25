'use strict';

// ─────────────────────────── Canvas dimensions ───────────────────────────
const CW = 360, CH = 580;

// ─────────────────────────── Physics constants ───────────────────────────
const GRAVITY   = 0.28;
const MAX_SPD   = 20;
const FLIP_SPD  = 0.22;   // radians/frame – flipper rotation speed
const FLEN      = 78;     // flipper length in pixels
const FTHICK    = 7;      // flipper half-thickness for collision

// ─────────────────────────── Game state ──────────────────────────────────
let score       = 0;
let ballsLeft   = 3;
let gameRunning = false;
let ballActive  = false;
let combo       = 1;
let comboTimer  = 0;

// ─────────────────────────── Ball ────────────────────────────────────────
const ball = { x: CW / 2, y: 100, vx: 0, vy: 0, r: 9 };

// ─────────────────────────── Flippers ────────────────────────────────────
// Left pivot at bottom-left, right pivot at bottom-right
const LF = {
  px: 88,  py: 548,
  restA:   0.45,
  activeA: -0.45,
  angle:   0.45,
  prevAngle: 0.45,
  pressed: false
};
const RF = {
  px: 272, py: 548,
  restA:   Math.PI - 0.45,
  activeA: Math.PI + 0.45,
  angle:   Math.PI - 0.45,
  prevAngle: Math.PI - 0.45,
  pressed: false
};

// ─────────────────────────── Bumpers ─────────────────────────────────────
const BUMPERS = [
  { x: 180, y: 138, r: 26, pts: 200, label: '♦',     color: '#ffd700', glow: 0 },
  { x: 116, y: 200, r: 22, pts: 100, label: 'VIP',   color: '#ff1493', glow: 0 },
  { x: 244, y: 200, r: 22, pts: 100, label: 'BAR',   color: '#ff1493', glow: 0 },
  { x: 180, y: 256, r: 22, pts: 150, label: 'STAGE', color: '#da70d6', glow: 0 },
  { x: 106, y: 298, r: 18, pts:  75, label: '♦',     color: '#ffd700', glow: 0 },
  { x: 254, y: 298, r: 18, pts:  75, label: '♦',     color: '#ffd700', glow: 0 },
];

// ─────────────────────────── Rollover lanes ──────────────────────────────
const LANES = [
  { x:  62, y: 64, r: 13, lit: false, pts: 100, label: 'A' },
  { x: 130, y: 47, r: 13, lit: false, pts: 100, label: 'L' },
  { x: 200, y: 42, r: 13, lit: false, pts: 100, label: '♦' },
  { x: 265, y: 47, r: 13, lit: false, pts: 100, label: 'S' },
  { x: 298, y: 64, r: 13, lit: false, pts: 100, label: '♦' },
];

// ─────────────────────────── Gutter guide walls ──────────────────────────
// Angled lines that funnel the ball toward the flippers
const GUTTERS = [
  { x1: 10,        y1: 468, x2: LF.px, y2: LF.py },
  { x1: CW - 10,   y1: 468, x2: RF.px, y2: RF.py },
];

// ─────────────────────────── Score popups ────────────────────────────────
const popups = []; // { x, y, text, life, maxLife }

// ─────────────────────────── DOM refs ────────────────────────────────────
let canvas, ctx;

// ═════════════════════════════════════════════════════════════════════════
//  INIT
// ═════════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('c');
  ctx    = canvas.getContext('2d');

  // Overlay restart button
  document.getElementById('ov-btn').addEventListener('click', startGame);

  // ── Keyboard controls ──────────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (['z', 'Z', 'ArrowLeft'].includes(e.key))  { e.preventDefault(); LF.pressed = true; }
    if (['/', 'ArrowRight'].includes(e.key))       { e.preventDefault(); RF.pressed = true; }
  });
  window.addEventListener('keyup', e => {
    if (['z', 'Z', 'ArrowLeft'].includes(e.key))  LF.pressed = false;
    if (['/', 'ArrowRight'].includes(e.key))       RF.pressed = false;
  });

  // ── Canvas touch (tap left half / right half) ──────────────────────────
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: false });
  canvas.addEventListener('touchmove',  onCanvasTouch, { passive: false });
  canvas.addEventListener('touchend',   onCanvasTouchEnd, { passive: false });

  // ── On-screen buttons ──────────────────────────────────────────────────
  bindBtn('btn-left',  LF);
  bindBtn('btn-right', RF);

  startGame();
  requestAnimationFrame(loop);
});

function bindBtn(id, flipper) {
  const btn = document.getElementById(id);
  const activate   = e => { e.preventDefault(); flipper.pressed = true;  btn.classList.add('pressed'); };
  const deactivate = e => { e.preventDefault(); flipper.pressed = false; btn.classList.remove('pressed'); };
  btn.addEventListener('mousedown',    activate);
  btn.addEventListener('touchstart',   activate,   { passive: false });
  btn.addEventListener('mouseup',      deactivate);
  btn.addEventListener('mouseleave',   deactivate);
  btn.addEventListener('touchend',     deactivate, { passive: false });
  btn.addEventListener('touchcancel',  deactivate, { passive: false });
}

function onCanvasTouch(e) {
  e.preventDefault();
  const rect   = canvas.getBoundingClientRect();
  const scaleX = CW / rect.width;
  let left = false, right = false;
  for (const t of e.touches) {
    if ((t.clientX - rect.left) * scaleX < CW / 2) left  = true;
    else                                             right = true;
  }
  LF.pressed = left;
  RF.pressed = right;
}

function onCanvasTouchEnd(e) {
  e.preventDefault();
  if (e.touches.length === 0) { LF.pressed = false; RF.pressed = false; }
  else onCanvasTouch(e);
}

// ═════════════════════════════════════════════════════════════════════════
//  GAME FLOW
// ═════════════════════════════════════════════════════════════════════════
function startGame() {
  score      = 0;
  ballsLeft  = 3;
  combo      = 1;
  comboTimer = 0;
  popups.length = 0;
  LANES.forEach(l => l.lit = false);
  BUMPERS.forEach(b => b.glow = 0);
  LF.pressed = false;
  RF.pressed = false;
  updateHUD();
  document.getElementById('overlay').classList.add('hidden');
  gameRunning = true;
  launchBall();
}

function launchBall() {
  ball.x  = CW / 2 + (Math.random() * 50 - 25);
  ball.y  = 90;
  ball.vx = (Math.random() > 0.5 ? 1.8 : -1.8);
  ball.vy = 3.5;
  LF.angle = LF.restA; LF.prevAngle = LF.restA;
  RF.angle = RF.restA; RF.prevAngle = RF.restA;
  ballActive = true;
}

function drainBall() {
  if (!ballActive) return;
  ballActive = false;
  ballsLeft--;
  updateHUD();
  if (ballsLeft <= 0) {
    setTimeout(endGame, 400);
  } else {
    setTimeout(launchBall, 1000);
  }
}

function endGame() {
  gameRunning = false;
  document.getElementById('ov-title').textContent = 'GAME OVER';
  document.getElementById('ov-score').innerHTML =
    `FINAL SCORE<br><span style="color:#ffd700;font-size:22px">${score.toLocaleString()}</span>`;
  document.getElementById('overlay').classList.remove('hidden');
}

function updateHUD() {
  document.getElementById('score-el').textContent = score.toLocaleString();
  document.getElementById('balls-el').textContent = ballsLeft;
}

// ═════════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═════════════════════════════════════════════════════════════════════════
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ═════════════════════════════════════════════════════════════════════════
//  UPDATE
// ═════════════════════════════════════════════════════════════════════════
function update() {
  // Combo timer decay
  if (comboTimer > 0 && --comboTimer === 0) combo = 1;

  // Animate flippers even when ball is not active (visual feedback)
  moveFlipper(LF);
  moveFlipper(RF);

  if (!gameRunning || !ballActive) return;

  // ── Gravity + velocity cap ─────────────────────────────────────────────
  ball.vy += GRAVITY;
  const spd = Math.hypot(ball.vx, ball.vy);
  if (spd > MAX_SPD) {
    ball.vx = (ball.vx / spd) * MAX_SPD;
    ball.vy = (ball.vy / spd) * MAX_SPD;
  }
  ball.x += ball.vx;
  ball.y += ball.vy;

  // ── Side & top walls ───────────────────────────────────────────────────
  if (ball.x - ball.r < 10)       { ball.x = 10 + ball.r;        ball.vx =  Math.abs(ball.vx) * 0.82; }
  if (ball.x + ball.r > CW - 10)  { ball.x = CW - 10 - ball.r;  ball.vx = -Math.abs(ball.vx) * 0.82; }
  if (ball.y - ball.r < 28)       { ball.y = 28 + ball.r;        ball.vy =  Math.abs(ball.vy) * 0.75; }

  // ── Gutter walls ──────────────────────────────────────────────────────
  GUTTERS.forEach(g => checkSegCollision(g.x1, g.y1, g.x2, g.y2));

  // ── Bumper collisions ─────────────────────────────────────────────────
  for (const b of BUMPERS) {
    const dx   = ball.x - b.x;
    const dy   = ball.y - b.y;
    const dist = Math.hypot(dx, dy);
    const minD = ball.r + b.r;

    if (dist < minD && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      // Push ball out
      ball.x = b.x + nx * minD;
      ball.y = b.y + ny * minD;
      // Reflect + slight speed boost
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx = (ball.vx - 2 * dot * nx) * 1.12;
      ball.vy = (ball.vy - 2 * dot * ny) * 1.12;
      // Minimum outward speed
      const ns = Math.hypot(ball.vx, ball.vy);
      if (ns < 7) { ball.vx = nx * 7; ball.vy = ny * 7; }
      // Score & visual
      const pts = b.pts * combo;
      addScore(pts, b.x, b.y - b.r - 10);
      b.glow    = 14;
      combo     = Math.min(combo + 1, 10);
      comboTimer = 90;
    }
    if (b.glow > 0) b.glow--;
  }

  // ── Rollover lanes ────────────────────────────────────────────────────
  for (const l of LANES) {
    if (!l.lit && Math.hypot(ball.x - l.x, ball.y - l.y) < ball.r + l.r) {
      l.lit = true;
      addScore(l.pts * combo, l.x, l.y - l.r - 8);
      if (LANES.every(ln => ln.lit)) {
        addScore(2000, CW / 2, 35);
        setTimeout(() => LANES.forEach(ln => ln.lit = false), 2200);
      }
    }
  }

  // ── Flipper collisions ────────────────────────────────────────────────
  checkFlipperCollision(LF);
  checkFlipperCollision(RF);

  // ── Drain ─────────────────────────────────────────────────────────────
  if (ball.y > CH + 20) drainBall();

  // ── Popup decay ───────────────────────────────────────────────────────
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].y -= 1.3;
    if (--popups[i].life <= 0) popups.splice(i, 1);
  }
}

// ─────────────────────────── Flipper helpers ─────────────────────────────
function moveFlipper(f) {
  f.prevAngle = f.angle;
  const target = f.pressed ? f.activeA : f.restA;
  const diff   = target - f.angle;
  if (Math.abs(diff) < 0.005) { f.angle = target; return; }
  f.angle += Math.sign(diff) * Math.min(Math.abs(diff), FLIP_SPD);
}

function checkFlipperCollision(f) {
  const tx   = f.px + FLEN * Math.cos(f.angle);
  const ty   = f.py + FLEN * Math.sin(f.angle);
  const cp   = closestPtOnSeg(f.px, f.py, tx, ty, ball.x, ball.y);
  const dx   = ball.x - cp.x;
  const dy   = ball.y - cp.y;
  const dist = Math.hypot(dx, dy);
  const minD = ball.r + FTHICK;

  if (dist < minD && dist > 0) {
    const nx = dx / dist, ny = dy / dist;
    ball.x = cp.x + nx * minD;
    ball.y = cp.y + ny * minD;

    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;

      // Add angular velocity contribution from moving flipper
      const flipVel = f.angle - f.prevAngle;
      if (Math.abs(flipVel) > 0.005) {
        // Compute contact point's distance from pivot
        const t = Math.max(0, Math.min(1,
          ((cp.x - f.px) * Math.cos(f.angle) + (cp.y - f.py) * Math.sin(f.angle)) / FLEN
        ));
        const d = t * FLEN;
        ball.vx += -Math.sin(f.angle) * d * flipVel * 0.40;
        ball.vy +=  Math.cos(f.angle) * d * flipVel * 0.40;
      }
      // Guarantee minimum upward launch when flipper is active
      if (f.pressed && ball.vy > -6) ball.vy = -8.5 - Math.random() * 2;
    }
  }
}

// ─────────────────────────── Segment collision ───────────────────────────
function checkSegCollision(x1, y1, x2, y2) {
  const cp   = closestPtOnSeg(x1, y1, x2, y2, ball.x, ball.y);
  const dx   = ball.x - cp.x;
  const dy   = ball.y - cp.y;
  const dist = Math.hypot(dx, dy);
  if (dist < ball.r + 3 && dist > 0) {
    const nx = dx / dist, ny = dy / dist;
    ball.x = cp.x + nx * (ball.r + 3);
    ball.y = cp.y + ny * (ball.r + 3);
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) { ball.vx -= 2 * dot * nx * 0.82; ball.vy -= 2 * dot * ny * 0.82; }
  }
}

function closestPtOnSeg(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

// ─────────────────────────── Score ───────────────────────────────────────
function addScore(pts, x, y) {
  score += pts;
  updateHUD();
  popups.push({ x, y, text: '+' + pts.toLocaleString(), life: 52, maxLife: 52 });
}

// ═════════════════════════════════════════════════════════════════════════
//  COLOR HELPERS
// ═════════════════════════════════════════════════════════════════════════

// rgba string from a #rrggbb hex + alpha 0..1
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// Brighten a #rrggbb color by adding (amount * 255) to each channel
function lighten(hex, amount) {
  const d = Math.round(255 * amount);
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + d);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + d);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + d);
  return `rgb(${r},${g},${b})`;
}

// Darken a #rrggbb color by subtracting (amount * 255) from each channel
function darken(hex, amount) {
  const d = Math.round(255 * amount);
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - d);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - d);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - d);
  return `rgb(${r},${g},${b})`;
}

// ═════════════════════════════════════════════════════════════════════════
//  PLAYFIELD TEXTURE  (rendered once to an offscreen canvas)
// ═════════════════════════════════════════════════════════════════════════
let _fieldCanvas = null;

function getFieldCanvas() {
  if (_fieldCanvas) return _fieldCanvas;

  _fieldCanvas      = document.createElement('canvas');
  _fieldCanvas.width  = CW;
  _fieldCanvas.height = CH;
  const c = _fieldCanvas.getContext('2d');

  // ── Base gradient ────────────────────────────────────────────────────
  const bg = c.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0,    '#1e0034');
  bg.addColorStop(0.4,  '#110022');
  bg.addColorStop(1,    '#07000f');
  c.fillStyle = bg;
  c.fillRect(0, 0, CW, CH);

  // ── Diagonal diamond lattice (very subtle felt-weave) ────────────────
  c.save();
  c.globalAlpha = 0.038;
  c.strokeStyle = '#b060ff';
  c.lineWidth   = 0.7;
  const step = 20;
  for (let i = -CH; i < CW + CH; i += step) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i + CH, CH); c.stroke();
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i - CH, CH); c.stroke();
  }
  c.restore();

  // ── Overhead spotlight (centre-top, simulates physical table light) ──
  const spot = c.createRadialGradient(CW * 0.5, CH * 0.25, 10, CW * 0.5, CH * 0.38, CW * 0.72);
  spot.addColorStop(0, 'rgba(110, 30, 90, 0.22)');
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = spot;
  c.fillRect(0, 0, CW, CH);

  // ── Second warm spotlight lower-centre (around bumper cluster) ───────
  const spot2 = c.createRadialGradient(CW * 0.5, CH * 0.44, 5, CW * 0.5, CH * 0.44, CW * 0.42);
  spot2.addColorStop(0, 'rgba(60, 0, 80, 0.18)');
  spot2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = spot2;
  c.fillRect(0, 0, CW, CH);

  // ── Edge vignette ────────────────────────────────────────────────────
  const vig = c.createRadialGradient(CW / 2, CH / 2, CH * 0.2, CW / 2, CH / 2, CH * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.72)');
  c.fillStyle = vig;
  c.fillRect(0, 0, CW, CH);

  return _fieldCanvas;
}

// ═════════════════════════════════════════════════════════════════════════
//  DRAW
// ═════════════════════════════════════════════════════════════════════════
function draw() {
  // Playfield texture (pre-rendered, drawn once per frame as background)
  ctx.drawImage(getFieldCanvas(), 0, 0);

  drawWalls();
  drawLanes();
  drawBumpers();
  drawFlipper(LF);
  drawFlipper(RF);
  if (ballActive) drawBall();
  drawPopups();
  drawComboHint();
}

// ─────────────────────────── Walls & chrome rails ────────────────────────
function drawWalls() {
  ctx.save();

  // Helper: draw a 3-layer chrome rail along any path
  function chromePath(pathFn) {
    // Layer 1 – thick dark base shadow
    ctx.save();
    ctx.lineWidth   = 9;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur  = 0;
    ctx.lineCap     = 'round';
    pathFn(); ctx.stroke();
    ctx.restore();

    // Layer 2 – main metal rail with purple/magenta glow
    ctx.save();
    ctx.lineWidth   = 5;
    ctx.strokeStyle = '#7020a0';
    ctx.shadowColor = '#ff1493';
    ctx.shadowBlur  = 14;
    ctx.lineCap     = 'round';
    pathFn(); ctx.stroke();
    ctx.restore();

    // Layer 3 – bright top-edge highlight
    ctx.save();
    ctx.lineWidth   = 1.4;
    ctx.strokeStyle = 'rgba(210, 100, 255, 0.80)';
    ctx.shadowBlur  = 0;
    ctx.lineCap     = 'round';
    pathFn(); ctx.stroke();
    ctx.restore();
  }

  // Left wall
  chromePath(() => { ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(10, CH); });
  // Right wall
  chromePath(() => { ctx.beginPath(); ctx.moveTo(CW - 10, 28); ctx.lineTo(CW - 10, CH); });
  // Top arch
  chromePath(() => { ctx.beginPath(); ctx.arc(CW / 2, 28, CW / 2 - 10, Math.PI, 0, false); });

  // Gutter guide walls
  ctx.save();
  ctx.lineCap     = 'round';
  ctx.lineWidth   = 4;
  ctx.strokeStyle = '#5a1880';
  ctx.shadowColor = '#cc44ff';
  ctx.shadowBlur  = 8;
  GUTTERS.forEach(g => {
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.stroke();
  });
  // highlight edge
  ctx.lineWidth   = 1;
  ctx.strokeStyle = 'rgba(180, 90, 230, 0.55)';
  ctx.shadowBlur  = 0;
  GUTTERS.forEach(g => {
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.stroke();
  });
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────── Rollover lanes (insert lights) ──────────────
function drawLanes() {
  ctx.save();
  for (const l of LANES) {
    // Bezel / housing ring
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r + 2.5, 0, Math.PI * 2);
    const bezel = ctx.createRadialGradient(l.x - 2, l.y - 2, l.r * 0.3, l.x, l.y, l.r + 3);
    bezel.addColorStop(0, '#48485a');
    bezel.addColorStop(1, '#111118');
    ctx.fillStyle = bezel;
    ctx.fill();
    ctx.strokeStyle = '#555568';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Lens body
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    if (l.lit) {
      const lens = ctx.createRadialGradient(
        l.x - l.r * 0.25, l.y - l.r * 0.28, l.r * 0.08,
        l.x, l.y, l.r
      );
      lens.addColorStop(0,    '#fffce8');
      lens.addColorStop(0.28, '#ffd700');
      lens.addColorStop(0.65, '#cc9800');
      lens.addColorStop(1,    '#7a5a00');
      ctx.fillStyle   = lens;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 20;
    } else {
      ctx.fillStyle = '#12102a';
      ctx.shadowBlur = 0;
    }
    ctx.fill();

    // Specular highlight on lens when lit
    if (l.lit) {
      const spec = ctx.createRadialGradient(
        l.x - l.r * 0.28, l.y - l.r * 0.30, 0,
        l.x - l.r * 0.28, l.y - l.r * 0.30, l.r * 0.52
      );
      spec.addColorStop(0, 'rgba(255,255,255,0.82)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fillStyle  = spec;
      ctx.shadowBlur = 0;
      ctx.fill();
    }

    // Label
    ctx.fillStyle    = l.lit ? '#000000' : '#80659a';
    ctx.font         = 'bold 8px Courier New';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.fillText(l.label, l.x, l.y);
  }
  ctx.restore();
}

// ─────────────────────────── Bumpers (3-D domes) ─────────────────────────
function drawBumpers() {
  ctx.save();
  for (const b of BUMPERS) {
    const lit = b.glow > 0;
    const gf  = b.glow / 14;  // 0..1

    ctx.shadowBlur = 0;

    // ── 1. Extended light halo radiating out when hit ──────────────────
    if (lit) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 22, 0, Math.PI * 2);
      const halo = ctx.createRadialGradient(b.x, b.y, b.r - 2, b.x, b.y, b.r + 22);
      halo.addColorStop(0,   hexAlpha(b.color, 0.50 * gf));
      halo.addColorStop(0.4, hexAlpha(b.color, 0.22 * gf));
      halo.addColorStop(1,   hexAlpha(b.color, 0));
      ctx.fillStyle = halo;
      ctx.fill();
    }

    // ── 2. Cast shadow (makes dome feel raised off the playfield) ──────
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y + b.r * 0.48, b.r * 0.88, b.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fill();

    // ── 3. Metallic collar ring at the dome base ───────────────────────
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 3, 0, Math.PI * 2);
    const collar = ctx.createRadialGradient(b.x - 3, b.y - 3, b.r * 0.35, b.x, b.y, b.r + 3.5);
    collar.addColorStop(0,   '#5a5a70');
    collar.addColorStop(0.6, '#28283a');
    collar.addColorStop(1,   '#0e0e1a');
    ctx.fillStyle = collar;
    ctx.fill();

    // ── 4. Neon indicator ring (bright when hit) ───────────────────────
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = lit ? b.color : hexAlpha(b.color, 0.30);
    ctx.lineWidth   = lit ? 3.5 : 2;
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = lit ? 18 * gf + 4 : 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // ── 5. Dome body — 3-D sphere gradient ────────────────────────────
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    const dome = ctx.createRadialGradient(
      b.x - b.r * 0.33, b.y - b.r * 0.35, b.r * 0.06,
      b.x + b.r * 0.08, b.y + b.r * 0.08, b.r
    );
    if (lit) {
      dome.addColorStop(0,    '#ffffff');
      dome.addColorStop(0.18, lighten(b.color, 0.55));
      dome.addColorStop(0.52, b.color);
      dome.addColorStop(0.82, darken(b.color, 0.40));
      dome.addColorStop(1,    darken(b.color, 0.72));
    } else {
      dome.addColorStop(0,    '#b8b8cc');
      dome.addColorStop(0.22, '#6a6a82');
      dome.addColorStop(0.55, '#2e2040');
      dome.addColorStop(0.85, '#160a20');
      dome.addColorStop(1,    '#070010');
    }
    ctx.fillStyle = dome;
    ctx.fill();

    // ── 6. Primary specular highlight (sharp top-left glint) ──────────
    const spec1 = ctx.createRadialGradient(
      b.x - b.r * 0.30, b.y - b.r * 0.33, 0,
      b.x - b.r * 0.30, b.y - b.r * 0.33, b.r * 0.52
    );
    spec1.addColorStop(0,   lit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)');
    spec1.addColorStop(0.3, lit ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.12)');
    spec1.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = spec1;
    ctx.fill();

    // ── 7. Label ───────────────────────────────────────────────────────
    const fsize = b.label.length > 3 ? 7 : (b.label.length > 2 ? 9 : 11);
    ctx.font         = `bold ${fsize}px 'Courier New', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = lit ? '#ffffff' : 'rgba(200,170,240,0.85)';
    ctx.shadowColor  = lit ? '#ffffff' : 'transparent';
    ctx.shadowBlur   = lit ? 6 : 0;
    ctx.fillText(b.label, b.x, b.y + 1);
    ctx.shadowBlur   = 0;
  }
  ctx.restore();
}

// ─────────────────────────── Flippers (3-D tapered rubber) ───────────────
function drawFlipper(f) {
  const cos_a = Math.cos(f.angle), sin_a = Math.sin(f.angle);
  const nx = -sin_a, ny = cos_a;          // normal perpendicular to flipper axis
  const tx = f.px + FLEN * cos_a;
  const ty = f.py + FLEN * sin_a;

  // Tapered shape: wider at pivot, narrower at tip
  const BW = 11, TW = 4.5;
  const p = [
    [f.px + nx * BW,  f.py + ny * BW ],   // base, top edge
    [tx   + nx * TW,  ty   + ny * TW ],   // tip,  top edge
    [tx   - nx * TW,  ty   - ny * TW ],   // tip,  bottom edge
    [f.px - nx * BW,  f.py - ny * BW ],   // base, bottom edge
  ];

  function flipPath() {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    ctx.lineTo(p[1][0], p[1][1]);
    ctx.lineTo(p[2][0], p[2][1]);
    ctx.lineTo(p[3][0], p[3][1]);
    ctx.closePath();
  }

  ctx.save();

  // ── Drop shadow ────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.80)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  flipPath();
  ctx.fillStyle = 'rgba(0,0,0,0.001)';  // transparent fill triggers shadow
  ctx.fill();
  ctx.restore();

  // ── Flipper body — gradient top-to-bottom for 3-D depth ───────────
  const grad = ctx.createLinearGradient(
    f.px + nx * BW, f.py + ny * BW,
    f.px - nx * BW, f.py - ny * BW
  );
  if (f.pressed) {
    grad.addColorStop(0,    '#fff080');   // bright lit edge
    grad.addColorStop(0.10, '#e8c000');   // gold highlight
    grad.addColorStop(0.42, '#b09000');   // mid gold
    grad.addColorStop(0.72, '#6a5200');   // shadow side
    grad.addColorStop(1,    '#241a00');   // dark underside
  } else {
    grad.addColorStop(0,    '#d878f5');   // bright top rim
    grad.addColorStop(0.10, '#9030b8');   // purple body
    grad.addColorStop(0.42, '#601888');   // mid shadow
    grad.addColorStop(0.72, '#350a55');   // dark shadow side
    grad.addColorStop(1,    '#100020');   // black underside
  }
  flipPath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Top-edge highlight (bright rim, physically accurate bevel) ─────
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  ctx.lineTo(p[1][0], p[1][1]);
  ctx.strokeStyle = f.pressed ? 'rgba(255,248,160,0.90)' : 'rgba(220,130,255,0.80)';
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = f.pressed ? '#ffd700' : '#cc88ff';
  ctx.shadowBlur  = f.pressed ? 12 : 7;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // ── Bottom-edge shadow line ────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(p[3][0], p[3][1]);
  ctx.lineTo(p[2][0], p[2][1]);
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth   = 1.5;
  ctx.shadowBlur  = 0;
  ctx.stroke();

  // ── Chrome pivot pin ───────────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(f.px, f.py, 7, 0, Math.PI * 2);
  const pin = ctx.createRadialGradient(f.px - 2.5, f.py - 2.5, 1, f.px, f.py, 7);
  pin.addColorStop(0,   '#e8e8e8');
  pin.addColorStop(0.4, '#909090');
  pin.addColorStop(1,   '#282828');
  ctx.fillStyle   = pin;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur  = 5;
  ctx.fill();

  // Pin specular glint
  ctx.beginPath();
  ctx.arc(f.px - 2, f.py - 2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle  = 'rgba(255,255,255,0.72)';
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────── Ball (chrome metal sphere) ──────────────────
function drawBall() {
  ctx.save();

  // ── 1. Soft drop shadow beneath the ball ─────────────────────────────
  ctx.beginPath();
  ctx.ellipse(ball.x + 2, ball.y + ball.r * 0.55, ball.r * 0.84, ball.r * 0.30, 0, 0, Math.PI * 2);
  ctx.fillStyle  = 'rgba(0,0,0,0.52)';
  ctx.shadowBlur = 0;
  ctx.fill();

  // ── 2. Main chrome sphere ─────────────────────────────────────────────
  // Inner highlight centre is offset upper-left; outer fade is lower-right
  const chrome = ctx.createRadialGradient(
    ball.x - ball.r * 0.30, ball.y - ball.r * 0.34, ball.r * 0.04,
    ball.x + ball.r * 0.10, ball.y + ball.r * 0.10, ball.r
  );
  chrome.addColorStop(0,    '#f6f6ff');   // bright specular centre
  chrome.addColorStop(0.16, '#d8d8f0');   // near-white chrome
  chrome.addColorStop(0.40, '#9090b8');   // mid chrome
  chrome.addColorStop(0.65, '#505068');   // dark chrome
  chrome.addColorStop(0.85, '#282838');   // very dark edge
  chrome.addColorStop(1,    '#181820');   // near-black rim

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle   = chrome;
  ctx.shadowColor = 'rgba(170,150,255,0.42)';
  ctx.shadowBlur  = 12;
  ctx.fill();
  ctx.shadowBlur  = 0;

  // ── 3. Primary specular highlight (sharp bright glint, upper-left) ───
  const spec1 = ctx.createRadialGradient(
    ball.x - ball.r * 0.33, ball.y - ball.r * 0.36, 0,
    ball.x - ball.r * 0.33, ball.y - ball.r * 0.36, ball.r * 0.44
  );
  spec1.addColorStop(0,   'rgba(255,255,255,0.97)');
  spec1.addColorStop(0.30, 'rgba(255,255,255,0.42)');
  spec1.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = spec1;
  ctx.fill();

  // ── 4. Soft ambient reflection (bottom, purple table colour tint) ─────
  const spec2 = ctx.createRadialGradient(
    ball.x + ball.r * 0.20, ball.y + ball.r * 0.28, 0,
    ball.x + ball.r * 0.20, ball.y + ball.r * 0.28, ball.r * 0.48
  );
  spec2.addColorStop(0, 'rgba(150, 60, 200, 0.28)');
  spec2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = spec2;
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────── Score popups ────────────────────────────────
function drawPopups() {
  if (popups.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  for (const p of popups) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.font = 'bold 14px Courier New';
    // Inset text shadow for depth
    ctx.fillStyle = 'rgba(60,30,0,0.65)';
    ctx.fillText(p.text, p.x + 1, p.y + 1.5);
    // Main text
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 10;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.restore();
}

// ─────────────────────────── Combo hint ──────────────────────────────────
function drawComboHint() {
  if (combo <= 1 || comboTimer <= 0) return;
  ctx.save();
  ctx.textAlign   = 'center';
  const a = Math.min(1, comboTimer / 20);
  ctx.globalAlpha = a;
  ctx.font        = 'bold 13px Courier New';
  // Shadow
  ctx.fillStyle = 'rgba(60,40,0,0.6)';
  ctx.fillText(`× ${combo} COMBO`, CW / 2 + 1, CH - 21);
  // Main
  ctx.fillStyle   = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 12;
  ctx.fillText(`× ${combo} COMBO`, CW / 2, CH - 22);
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.restore();
}

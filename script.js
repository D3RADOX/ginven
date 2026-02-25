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
//  DRAW
// ═════════════════════════════════════════════════════════════════════════
function draw() {
  // Background
  ctx.fillStyle = '#080010';
  ctx.fillRect(0, 0, CW, CH);

  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, '#160022');
  bg.addColorStop(1, '#060010');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  drawWalls();
  drawLanes();
  drawBumpers();
  drawFlipper(LF);
  drawFlipper(RF);
  if (ballActive) drawBall();
  drawPopups();
  drawComboHint();
}

// ─────────────────────────── Walls & borders ─────────────────────────────
function drawWalls() {
  ctx.save();

  ctx.strokeStyle = '#ff1493';
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#ff1493';
  ctx.shadowBlur  = 10;

  // Left wall
  ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(10, CH); ctx.stroke();
  // Right wall
  ctx.beginPath(); ctx.moveTo(CW - 10, 28); ctx.lineTo(CW - 10, CH); ctx.stroke();
  // Top arch
  ctx.beginPath();
  ctx.arc(CW / 2, 28, CW / 2 - 10, Math.PI, 0, false);
  ctx.stroke();

  // Gutter guides
  ctx.strokeStyle = '#c060c0';
  ctx.lineWidth   = 2;
  ctx.shadowColor = '#c060c0';
  ctx.shadowBlur  = 6;
  GUTTERS.forEach(g => {
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.stroke();
  });

  // Drain glow
  const drain = ctx.createLinearGradient(0, CH - 35, 0, CH);
  drain.addColorStop(0, 'rgba(255,20,147,0)');
  drain.addColorStop(1, 'rgba(255,20,147,0.07)');
  ctx.fillStyle = drain;
  ctx.fillRect(0, CH - 35, CW, 35);

  ctx.restore();
}

// ─────────────────────────── Rollover lanes ──────────────────────────────
function drawLanes() {
  ctx.save();
  for (const l of LANES) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fillStyle   = l.lit ? '#ffd700' : '#1e0035';
    ctx.shadowColor = l.lit ? '#ffd700' : 'transparent';
    ctx.shadowBlur  = l.lit ? 16 : 0;
    ctx.fill();
    ctx.strokeStyle = l.lit ? '#ffd700' : '#ff1493';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.fillStyle      = l.lit ? '#000' : '#ff69b4';
    ctx.font           = 'bold 9px Courier New';
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.shadowBlur     = 0;
    ctx.fillText(l.label, l.x, l.y);
  }
  ctx.restore();
}

// ─────────────────────────── Bumpers ─────────────────────────────────────
function drawBumpers() {
  ctx.save();
  for (const b of BUMPERS) {
    const lit = b.glow > 0;

    if (lit) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 7, 0, Math.PI * 2);
      ctx.fillStyle   = b.color + '35';
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 22;
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, b.r);
    if (lit) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, b.color);
      grad.addColorStop(1, b.color + '55');
    } else {
      grad.addColorStop(0, b.color + '88');
      grad.addColorStop(1, '#150025');
    }

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle   = grad;
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = lit ? 20 : 8;
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.fillStyle    = lit ? '#000000' : b.color;
    ctx.font         = `bold ${b.label.length > 3 ? '7' : '10'}px Courier New`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.fillText(b.label, b.x, b.y);
  }
  ctx.restore();
}

// ─────────────────────────── Flipper ─────────────────────────────────────
function drawFlipper(f) {
  const tx = f.px + FLEN * Math.cos(f.angle);
  const ty = f.py + FLEN * Math.sin(f.angle);
  ctx.save();
  ctx.lineCap     = 'round';
  ctx.lineWidth   = 14;
  ctx.strokeStyle = f.pressed ? '#ffd700' : '#ff69b4';
  ctx.shadowColor = f.pressed ? '#ffd700' : '#ff1493';
  ctx.shadowBlur  = f.pressed ? 22 : 10;
  ctx.beginPath();
  ctx.moveTo(f.px, f.py);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  // Pivot dot
  ctx.beginPath();
  ctx.arc(f.px, f.py, 5, 0, Math.PI * 2);
  ctx.fillStyle   = f.pressed ? '#ffd700' : '#ff1493';
  ctx.shadowBlur  = 8;
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────── Ball ────────────────────────────────────────
function drawBall() {
  ctx.save();
  const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#d0d0ff');
  g.addColorStop(1, '#6060aa');
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle   = g;
  ctx.shadowColor = '#aaaaff';
  ctx.shadowBlur  = 14;
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────── Score popups ────────────────────────────────
function drawPopups() {
  if (popups.length === 0) return;
  ctx.save();
  ctx.font      = 'bold 13px Courier New';
  ctx.textAlign = 'center';
  for (const p of popups) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle   = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 8;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─────────────────────────── Combo hint ──────────────────────────────────
function drawComboHint() {
  if (combo <= 1 || comboTimer <= 0) return;
  ctx.save();
  ctx.font        = 'bold 12px Courier New';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur  = 10;
  ctx.globalAlpha = Math.min(1, comboTimer / 20);
  ctx.fillText(`× ${combo} COMBO`, CW / 2, CH - 22);
  ctx.globalAlpha = 1;
  ctx.restore();
}

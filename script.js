'use strict';

// ════════════════════════════════════════════════════════════
//  SUMO SOCCER  —  Intense mobile-first 2D canvas game
// ════════════════════════════════════════════════════════════

// ── Logical canvas size ──────────────────────────────────────
const LW = 800, LH = 560;

// ── Field geometry ───────────────────────────────────────────
const FX = 52, FY = 48;          // field top-left
const FW = 696, FH = 388;        // field width / height
const FCX = FX + FW / 2;         // field centre X = 400
const FCY = FY + FH / 2;         // field centre Y = 242

// ── Goal geometry ────────────────────────────────────────────
const GH   = 148;                 // goal mouth height
const GD   = 46;                  // goal depth (behind field wall)
const GY   = FCY - GH / 2;       // goal top Y  (~168)
const LGX1 = FX - GD;            // left-goal back wall X
const RGX2 = FX + FW + GD;       // right-goal back wall X

// ── Physics constants ────────────────────────────────────────
const PR        = 28;             // player radius
const PM        = 9;              // player mass
const P_ACCEL   = 1.4;            // player acceleration per frame
const P_MAXSP   = 6;              // player max speed
const P_FRIC    = 0.80;           // player friction (per frame)

const DASH_PWR  = 22;             // dash launch speed
const DASH_DUR  = 200;            // ms dash lasts
const DASH_COOL = 1500;           // ms dash cooldown

const BR        = 14;             // ball radius
const BM        = 1;              // ball mass
const B_FRIC    = 0.987;          // ball rolling friction
const B_BOUNCE  = 0.60;           // ball wall restitution

// ── Match settings ───────────────────────────────────────────
const GOALS_WIN  = 5;
const GOAL_PAUSE = 2800;          // ms freeze after goal

// ── Colours ──────────────────────────────────────────────────
const C = {
  bg:       '#080812',
  field:    '#1b5e1b',
  fieldAlt: '#1e661e',
  lines:    'rgba(255,255,255,0.55)',
  net:      'rgba(255,255,255,0.12)',
  p1:       '#ff2244',
  p1dk:     '#99001a',
  p1belt:   '#ffd700',
  p2:       '#2255ff',
  p2dk:     '#001199',
  p2belt:   '#00e5ff',
  ball:     '#f0ede0',
  ballDk:   '#bbb89a',
  ctrlBg:   '#0e0e1a',
  ctrlLine: '#22224a',
  hud:      '#0c0c1c',
  hudLine:  '#242448',
  text:     '#ffffff',
  gold:     '#ffd700',
};

// ── Control layout ───────────────────────────────────────────
const CTRL_Y  = FY + FH + 2;     // top of control strip = 438
const JCX     = 130;
const JCY     = CTRL_Y + 61;
const JR_BASE = 54;
const JR_KNOB = 22;
const DBX     = LW - 120;
const DBY     = JCY;
const DB_R    = 46;

// ════════════════════════════════════════════════════════════
//  CANVAS SETUP
// ════════════════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = LW;
canvas.height = LH;

function resize() {
  const sw = window.innerWidth, sh = window.innerHeight;
  const scale = Math.min(sw / LW, sh / LH);
  const cw = LW * scale, ch = LH * scale;
  canvas.style.width   = cw + 'px';
  canvas.style.height  = ch + 'px';
  canvas.style.left    = ((sw - cw) / 2) + 'px';
  canvas.style.top     = ((sh - ch) / 2) + 'px';
}
resize();
window.addEventListener('resize', resize);

function screenToLogical(cx, cy) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (cx - r.left) * (LW / r.width),
    y: (cy - r.top)  * (LH / r.height),
  };
}

// ════════════════════════════════════════════════════════════
//  GAME STATE
// ════════════════════════════════════════════════════════════
let mode       = 'menu';   // menu | playing | goal | gameover
let score      = [0, 0];
let scoredTeam = -1;
let goalTimer  = 0;
let winner     = -1;
let matchAnim  = 0;

// Screen shake
let shakeX = 0, shakeY = 0, shakeTtl = 0;

// ════════════════════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════════════════════
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); }, { passive: false });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

const joy = {
  active: false, tid: -1,
  bx: JCX, by: JCY,
  kx: JCX, ky: JCY,
  dx: 0, dy: 0,
};
const dashTouch = { active: false, tid: -1 };

canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
canvas.addEventListener('touchend',    onTouchEnd,   { passive: false });
canvas.addEventListener('touchcancel', onTouchEnd,   { passive: false });
canvas.addEventListener('click', onClick);

function onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const { x, y } = screenToLogical(t.clientX, t.clientY);
    if (mode === 'menu' || mode === 'gameover') { startGame(); return; }
    if (y > CTRL_Y) {
      if (x < LW / 2) {
        joy.active = true;  joy.tid = t.identifier;
        joy.bx = x; joy.by = y;
        joy.kx = x; joy.ky = y;
        joy.dx = 0; joy.dy = 0;
      } else {
        dashTouch.active = true; dashTouch.tid = t.identifier;
        triggerDash(p1);
      }
    }
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== joy.tid) continue;
    const { x, y } = screenToLogical(t.clientX, t.clientY);
    const dx = x - joy.bx, dy = y - joy.by;
    const d  = Math.hypot(dx, dy);
    if (d > 0) {
      const mx = JR_BASE - JR_KNOB;
      const c  = Math.min(d, mx);
      joy.kx = joy.bx + (dx / d) * c;
      joy.ky = joy.by + (dy / d) * c;
      joy.dx = dx / d;
      joy.dy = dy / d;
    }
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joy.tid) {
      joy.active = false; joy.tid = -1;
      joy.kx = joy.bx; joy.ky = joy.by;
      joy.dx = 0; joy.dy = 0;
    }
    if (t.identifier === dashTouch.tid) {
      dashTouch.active = false; dashTouch.tid = -1;
    }
  }
}

function onClick() {
  if (mode === 'menu' || mode === 'gameover') startGame();
}

// ════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API, procedural)
// ════════════════════════════════════════════════════════════
let AC = null;
function getAC() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}

function playKick(vol) {
  try {
    const ac  = getAC();
    const len = Math.floor(ac.sampleRate * 0.08);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * vol;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(ac.destination);
    src.start();
  } catch (_) {}
}

function playGoalSfx() {
  try {
    const ac = getAC();
    [440, 554, 659, 880, 1108].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.value = f;
      const t0 = ac.currentTime + i * 0.1;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
      g.gain.linearRampToValueAtTime(0, t0 + 0.35);
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + 0.38);
    });
  } catch (_) {}
}

function playDashSfx() {
  try {
    const ac = getAC();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.18);
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.18);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.18);
  } catch (_) {}
}

function playBump(vol) {
  try {
    const ac = getAC();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.12);
    g.gain.setValueAtTime(vol * 0.35, ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.12);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.14);
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════
//  PARTICLES
// ════════════════════════════════════════════════════════════
const particles = [];

function spawnGoalBurst(x, y, color) {
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp    = 2 + Math.random() * 9;
    particles.push({
      x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp - 1.5,
      life: 1.0, decay: 0.011 + Math.random() * 0.016,
      r: 3 + Math.random() * 6, color, gravity: 0.12,
    });
  }
}

function spawnHitSparks(x, y, nx, ny, intensity) {
  const n = 4 + Math.floor(intensity * 12);
  for (let i = 0; i < n; i++) {
    const a  = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.8;
    const sp = 0.5 + Math.random() * intensity * 4;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.7, decay: 0.04 + Math.random() * 0.05,
      r: 1.5 + Math.random() * 2.5, color: '#ffcc44', gravity: 0.05,
    });
  }
}

function spawnDashTrail(x, y, color) {
  particles.push({
    x: x + (Math.random() - 0.5) * 12,
    y: y + (Math.random() - 0.5) * 12,
    vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
    life: 0.55, decay: 0.06, r: 7 + Math.random() * 9,
    color, gravity: 0, alpha: 0.42,
  });
}

function spawnConfetti(x, y) {
  const cols = ['#ff2244','#2255ff','#ffd700','#00e5ff','#ff69b4','#44ff88'];
  for (let i = 0; i < 55; i++) {
    const a  = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const sp = 3 + Math.random() * 7;
    const side = Math.random() < 0.5 ? -1 : 1;
    particles.push({
      x: x + (Math.random() - 0.5) * 80, y,
      vx: Math.cos(a) * sp * side, vy: Math.sin(a) * sp - 2,
      life: 1.0, decay: 0.007 + Math.random() * 0.01,
      r: 4 + Math.random() * 4,
      color: cols[Math.floor(Math.random() * cols.length)],
      gravity: 0.1, isConfetti: true,
      rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.22,
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x   += p.vx * dt; p.y += p.vy * dt;
    p.vx  *= 0.97;      p.vy *= 0.97;
    p.vy  += (p.gravity || 0) * dt;
    p.life -= p.decay * dt;
    if (p.rot !== undefined) p.rot += p.rotV;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life) * (p.alpha || 1);
    ctx.fillStyle   = p.color;
    if (p.isConfetti) {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════════════
//  GAME ENTITIES
// ════════════════════════════════════════════════════════════
let p1, p2, ball;

function makePlayer(x, y, team) {
  return {
    x, y, vx: 0, vy: 0,
    r: PR, mass: PM, team,
    angle: team === 0 ? 0 : Math.PI,
    dashTimer: 0, dashCooldown: 0, stun: 0,
    aiTarget: { x, y }, aiDashWait: 600 + Math.random() * 800,
  };
}

function makeBall() {
  return { x: FCX, y: FCY, vx: 0, vy: 0, r: BR, mass: BM, spin: 0, spinV: 0 };
}

// ════════════════════════════════════════════════════════════
//  PHYSICS
// ════════════════════════════════════════════════════════════
function circleCollide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minD = a.r + b.r;
  if (dist >= minD || dist < 0.001) return false;

  const nx = dx / dist, ny = dy / dist;
  const overlap = minD - dist, tm = a.mass + b.mass;

  a.x -= nx * overlap * (b.mass / tm);
  a.y -= ny * overlap * (b.mass / tm);
  b.x += nx * overlap * (a.mass / tm);
  b.y += ny * overlap * (a.mass / tm);

  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const rvn = rvx * nx + rvy * ny;
  if (rvn >= 0) return true;

  const e  = 0.68;
  const jA = a.dashTimer > 0 ? 2.8 : 1.0;
  const jB = b.dashTimer > 0 ? 2.8 : 1.0;
  const imp = -(1 + e) * rvn / (1 / a.mass + 1 / b.mass);

  a.vx -= imp * nx / a.mass * jA;
  a.vy -= imp * ny / a.mass * jA;
  b.vx += imp * nx / b.mass * jB;
  b.vy += imp * ny / b.mass * jB;
  return true;
}

function boundBall(b) {
  const inGoalY     = b.y > GY && b.y < GY + GH;
  const inLeftGoal  = b.x < FX;
  const inRightGoal = b.x > FX + FW;

  // Top / bottom field walls
  if (b.y < FY + b.r)       { b.y = FY + b.r;       b.vy =  Math.abs(b.vy) * B_BOUNCE; b.spinV *= -0.5; }
  if (b.y > FY + FH - b.r)  { b.y = FY + FH - b.r;  b.vy = -Math.abs(b.vy) * B_BOUNCE; b.spinV *= -0.5; }

  if (!inLeftGoal && !inRightGoal) {
    // Normal field – left/right walls, open at goal mouth
    if (b.x < FX + b.r && !inGoalY) { b.x = FX + b.r;      b.vx =  Math.abs(b.vx) * B_BOUNCE; b.spinV *= -0.4; }
    if (b.x > FX + FW - b.r && !inGoalY) { b.x = FX + FW - b.r; b.vx = -Math.abs(b.vx) * B_BOUNCE; b.spinV *= -0.4; }
  } else if (inLeftGoal) {
    if (b.x < LGX1 + b.r)   { b.x = LGX1 + b.r;    b.vx =  Math.abs(b.vx) * B_BOUNCE; }
    if (b.y < GY + b.r)     { b.y = GY + b.r;       b.vy =  Math.abs(b.vy) * B_BOUNCE; }
    if (b.y > GY + GH - b.r){ b.y = GY + GH - b.r;  b.vy = -Math.abs(b.vy) * B_BOUNCE; }
  } else if (inRightGoal) {
    if (b.x > RGX2 - b.r)   { b.x = RGX2 - b.r;    b.vx = -Math.abs(b.vx) * B_BOUNCE; }
    if (b.y < GY + b.r)     { b.y = GY + b.r;       b.vy =  Math.abs(b.vy) * B_BOUNCE; }
    if (b.y > GY + GH - b.r){ b.y = GY + GH - b.r;  b.vy = -Math.abs(b.vy) * B_BOUNCE; }
  }
}

function boundPlayer(p) {
  if (p.x < FX + p.r)       { p.x = FX + p.r;       p.vx =  Math.abs(p.vx) * 0.3; }
  if (p.x > FX + FW - p.r)  { p.x = FX + FW - p.r;  p.vx = -Math.abs(p.vx) * 0.3; }
  if (p.y < FY + p.r)       { p.y = FY + p.r;        p.vy =  Math.abs(p.vy) * 0.3; }
  if (p.y > FY + FH - p.r)  { p.y = FY + FH - p.r;  p.vy = -Math.abs(p.vy) * 0.3; }
}

function checkGoal() {
  const inGY = ball.y > GY && ball.y < GY + GH;
  if (!inGY) return -1;
  if (ball.x < FX - 6)       return 1;  // ball in left goal → p2 scored
  if (ball.x > FX + FW + 6)  return 0;  // ball in right goal → p1 scored
  return -1;
}

// ════════════════════════════════════════════════════════════
//  DASH
// ════════════════════════════════════════════════════════════
function triggerDash(player) {
  if (!player || player.dashCooldown > 0) return;
  const sp  = Math.hypot(player.vx, player.vy);
  const ddx = sp > 0.1 ? player.vx / sp : Math.cos(player.angle);
  const ddy = sp > 0.1 ? player.vy / sp : Math.sin(player.angle);
  player.vx = ddx * DASH_PWR;
  player.vy = ddy * DASH_PWR;
  player.dashTimer    = DASH_DUR;
  player.dashCooldown = DASH_COOL;
  playDashSfx();
  if (navigator.vibrate) navigator.vibrate(25);
}

// ════════════════════════════════════════════════════════════
//  PLAYER CONTROL (p1)
// ════════════════════════════════════════════════════════════
let _dashKeyWas = false;

function applyPlayerInput() {
  if (!p1 || p1.stun > 0) return;

  let ix = 0, iy = 0;
  if (keys['KeyA'] || keys['ArrowLeft'])  ix -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
  if (keys['KeyW'] || keys['ArrowUp'])    iy -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  iy += 1;
  if (joy.active) { ix = joy.dx; iy = joy.dy; }

  if (ix !== 0 || iy !== 0) {
    const len = Math.hypot(ix, iy);
    const nx  = ix / len, ny = iy / len;
    p1.vx += nx * P_ACCEL;
    p1.vy += ny * P_ACCEL;
    const sp = Math.hypot(p1.vx, p1.vy);
    if (sp > P_MAXSP) { p1.vx = (p1.vx / sp) * P_MAXSP; p1.vy = (p1.vy / sp) * P_MAXSP; }
    p1.angle = Math.atan2(ny, nx);
  }

  const dashKey = keys['Space'] || keys['ShiftLeft'] || keys['ShiftRight'];
  if (dashKey && !_dashKeyWas) triggerDash(p1);
  _dashKeyWas = !!dashKey;
}

// ════════════════════════════════════════════════════════════
//  AI  (p2)
// ════════════════════════════════════════════════════════════
const AI_SPEED = 5.2;
const AI_REACT = 0.88;

function updateAI(dt) {
  if (!p2 || !ball || p2.stun > 0) return;
  const bx = ball.x, by = ball.y;
  const defGoalX = FX + FW;
  const distToBall = Math.hypot(bx - p2.x, by - p2.y);

  let tx, ty;
  const ballThreat = ball.vx > 0.8 && bx > FCX;

  if (ballThreat || (bx > defGoalX - 180 && distToBall > 85)) {
    // Defensive: intercept between ball and own goal
    tx = bx + (defGoalX - bx) * 0.42;
    ty = by;
  } else {
    // Offensive: come at ball from behind (relative to p1's goal)
    const angleToOpGoal = Math.atan2(FCY - by, FX - bx);
    const backAngle     = angleToOpGoal + Math.PI;
    const approachR     = (p2.r + BR) * 1.7;
    tx = bx + Math.cos(backAngle) * approachR;
    ty = by + Math.sin(backAngle) * approachR;
  }

  tx = Math.max(FX + p2.r, Math.min(FX + FW - p2.r, tx));
  ty = Math.max(FY + p2.r, Math.min(FY + FH - p2.r, ty));

  const tdx = tx - p2.x, tdy = ty - p2.y;
  const td  = Math.hypot(tdx, tdy);
  if (td > 1) {
    const nx = tdx / td, ny = tdy / td;
    p2.vx += nx * P_ACCEL * AI_REACT;
    p2.vy += ny * P_ACCEL * AI_REACT;
    const sp = Math.hypot(p2.vx, p2.vy);
    if (sp > AI_SPEED) { p2.vx = (p2.vx / sp) * AI_SPEED; p2.vy = (p2.vy / sp) * AI_SPEED; }
    p2.angle = Math.atan2(ny, nx);
  }

  // AI dash when close to ball
  p2.aiDashWait -= dt;
  if (p2.aiDashWait <= 0 && p2.dashCooldown <= 0) {
    if (distToBall < (p2.r + BR) * 3.5) triggerDash(p2);
    p2.aiDashWait = 400 + Math.random() * 1000;
  }
}

// ════════════════════════════════════════════════════════════
//  UPDATE HELPERS
// ════════════════════════════════════════════════════════════
function updatePlayer(p, dt) {
  if (p.stun > 0) p.stun -= dt;
  if (p.dashTimer    > 0) p.dashTimer    -= dt;
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.stun > 0) { p.vx *= P_FRIC; p.vy *= P_FRIC; }
  p.vx *= P_FRIC; p.vy *= P_FRIC;
  p.x  += p.vx;   p.y  += p.vy;
  if (p.dashTimer > 0) spawnDashTrail(p.x, p.y, p.team === 0 ? C.p1 : C.p2);
}

function addShake(intensity, dur) {
  if (intensity > shakeTtl / 4) {
    shakeX   = (Math.random() - 0.5) * intensity;
    shakeY   = (Math.random() - 0.5) * intensity;
    shakeTtl = dur;
  }
}

// ════════════════════════════════════════════════════════════
//  RENDERING HELPERS
// ════════════════════════════════════════════════════════════
function hexLighten(hex, amt) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}

function drawFieldBg() {
  const strW = 58;
  ctx.fillStyle = C.fieldAlt;
  for (let x = FX; x < FX + FW; x += strW * 2)
    ctx.fillRect(x, FY, Math.min(strW, FX + FW - x), FH);

  // Goal nets
  ctx.fillStyle = C.net;
  ctx.fillRect(LGX1, GY, GD, GH);
  ctx.fillRect(FX + FW, GY, GD, GH);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth   = 0.8;
  for (let nx = LGX1; nx < FX; nx += 12) {
    ctx.beginPath(); ctx.moveTo(nx, GY); ctx.lineTo(nx, GY + GH); ctx.stroke();
  }
  for (let ny = GY; ny < GY + GH; ny += 12) {
    ctx.beginPath(); ctx.moveTo(LGX1, ny); ctx.lineTo(FX, ny); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FX + FW, ny); ctx.lineTo(RGX2, ny); ctx.stroke();
  }
  for (let nx = FX + FW; nx < RGX2; nx += 12) {
    ctx.beginPath(); ctx.moveTo(nx, GY); ctx.lineTo(nx, GY + GH); ctx.stroke();
  }

  // Field lines
  ctx.strokeStyle = C.lines;
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(FX, FY, FW, FH);
  ctx.beginPath(); ctx.moveTo(FCX, FY); ctx.lineTo(FCX, FY + FH); ctx.stroke();
  ctx.beginPath(); ctx.arc(FCX, FCY, 56, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.lines;
  ctx.beginPath(); ctx.arc(FCX, FCY, 4, 0, Math.PI * 2); ctx.fill();

  // Penalty boxes
  ctx.lineWidth = 1.8;
  const pW = 88, pH = 196;
  ctx.strokeRect(FX,          FCY - pH/2, pW, pH);
  ctx.strokeRect(FX + FW - pW, FCY - pH/2, pW, pH);

  // Corner arcs
  [[FX,    FY,     0,           Math.PI/2],
   [FX+FW, FY,     Math.PI/2,   Math.PI],
   [FX+FW, FY+FH,  Math.PI,     Math.PI*1.5],
   [FX,    FY+FH,  Math.PI*1.5, Math.PI*2]
  ].forEach(([cx,cy,sa,ea]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 18, sa, ea); ctx.stroke();
  });

  // Goal posts
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(FX, GY); ctx.lineTo(LGX1, GY);
  ctx.lineTo(LGX1, GY + GH); ctx.lineTo(FX, GY + GH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(FX + FW, GY); ctx.lineTo(RGX2, GY);
  ctx.lineTo(RGX2, GY + GH); ctx.lineTo(FX + FW, GY + GH);
  ctx.stroke();
}

function drawShadowEllipse(x, y, r) {
  const g = ctx.createRadialGradient(x+3, y+5, 0, x+3, y+5, r*1.3);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x+3, y+7, r*1.1, r*0.45, 0, 0, Math.PI*2); ctx.fill();
}

function drawPlayer(p) {
  const { x, y, r, team, angle, dashTimer, dashCooldown, stun } = p;
  const col  = team === 0 ? C.p1    : C.p2;
  const colD = team === 0 ? C.p1dk  : C.p2dk;
  const belt = team === 0 ? C.p1belt: C.p2belt;

  drawShadowEllipse(x, y, r);

  if (dashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.025);
    ctx.strokeStyle = col; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  if (stun > 0 && Math.floor(stun / 70) % 2 === 0) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  const bg = ctx.createRadialGradient(x - r*0.28, y - r*0.28, r*0.05, x, y, r);
  bg.addColorStop(0, hexLighten(col, 55));
  bg.addColorStop(0.5, col);
  bg.addColorStop(1, colD);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();

  // Mawashi belt + face
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = belt;
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(-r*0.82, -r*0.21, r*1.64, r*0.42, 4); ctx.fill();
  } else {
    ctx.fillRect(-r*0.82, -r*0.21, r*1.64, r*0.42);
  }
  ctx.fillStyle = hexLighten(belt, 40);
  ctx.beginPath(); ctx.arc(r*0.55, 0, r*0.14, 0, Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(r*0.38, -r*0.22, r*0.15, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(r*0.38,  r*0.22, r*0.15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(r*0.43, -r*0.22, r*0.07, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(r*0.43,  r*0.22, r*0.07, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Specular highlight
  ctx.save();
  const shine = ctx.createRadialGradient(x-r*0.32, y-r*0.38, 0, x-r*0.18, y-r*0.22, r*0.55);
  shine.addColorStop(0, 'rgba(255,255,255,0.5)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Dash-cooldown arc
  if (dashCooldown > 0 && dashTimer <= 0) {
    const frac = dashCooldown / DASH_COOL;
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r + 5, -Math.PI/2, -Math.PI/2 + (1 - frac) * Math.PI * 2);
    ctx.stroke(); ctx.restore();
  }
}

function drawBall(b) {
  const { x, y, r, spin } = b;
  drawShadowEllipse(x, y, r);

  const bg = ctx.createRadialGradient(x-r*0.3, y-r*0.4, 0, x, y, r);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, C.ball); bg.addColorStop(1, C.ballDk);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();

  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.fillStyle = '#222';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2 - Math.PI/2;
    i === 0 ? ctx.moveTo(Math.cos(a)*r*0.37, Math.sin(a)*r*0.37)
            : ctx.lineTo(Math.cos(a)*r*0.37, Math.sin(a)*r*0.37);
  }
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const ba = (i/5)*Math.PI*2 + Math.PI/10;
    const px = Math.cos(ba)*r*0.68, py = Math.sin(ba)*r*0.68;
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (j/6)*Math.PI*2 + ba;
      const hx = px + Math.cos(a)*r*0.26, hy = py + Math.sin(a)*r*0.26;
      j === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  const shine = ctx.createRadialGradient(x-r*0.28, y-r*0.38, 0, x-r*0.15, y-r*0.25, r*0.52);
  shine.addColorStop(0, 'rgba(255,255,255,0.72)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = C.hud;
  ctx.fillRect(0, 0, LW, FY - 2);
  ctx.strokeStyle = C.hudLine; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FY-2); ctx.lineTo(LW, FY-2); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold; ctx.font = 'bold 13px monospace';
  ctx.fillText('SUMO SOCCER', LW/2, 17);

  ctx.fillStyle = C.p1; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'right';
  ctx.fillText(score[0], LW/2 - 28, 37);
  ctx.fillStyle = '#555'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
  ctx.fillText('–', LW/2, 37);
  ctx.fillStyle = C.p2; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'left';
  ctx.fillText(score[1], LW/2 + 28, 37);

  ctx.font = '10px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = C.p1; ctx.fillText('YOU', LW/2 - 34, FY - 6);
  ctx.fillStyle = '#444'; ctx.textAlign = 'center';
  ctx.fillText(`FIRST TO ${GOALS_WIN}`, LW/2, FY - 6);
  ctx.fillStyle = C.p2; ctx.textAlign = 'left';
  ctx.fillText('CPU', LW/2 + 34, FY - 6);
}

function drawControls() {
  ctx.fillStyle = C.ctrlBg;
  ctx.fillRect(0, CTRL_Y, LW, LH - CTRL_Y);
  ctx.strokeStyle = C.ctrlLine; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, CTRL_Y); ctx.lineTo(LW, CTRL_Y); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.setLineDash([4,5]);
  ctx.beginPath(); ctx.moveTo(LW/2, CTRL_Y+6); ctx.lineTo(LW/2, LH-6); ctx.stroke();
  ctx.setLineDash([]);

  ctx.save(); ctx.globalAlpha = 0.82;

  // Joystick
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.fillStyle   = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(joy.bx, joy.by, JR_BASE, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(joy.bx + Math.cos(a)*JR_BASE*0.62, joy.by + Math.sin(a)*JR_BASE*0.62);
    ctx.lineTo(joy.bx + Math.cos(a)*JR_BASE*0.88, joy.by + Math.sin(a)*JR_BASE*0.88);
    ctx.stroke();
  }
  const knobG = ctx.createRadialGradient(joy.kx-4, joy.ky-4, 1, joy.kx, joy.ky, JR_KNOB);
  knobG.addColorStop(0, 'rgba(255,255,255,0.62)');
  knobG.addColorStop(1, 'rgba(150,150,180,0.38)');
  ctx.fillStyle = knobG;
  ctx.beginPath(); ctx.arc(joy.kx, joy.ky, JR_KNOB, 0, Math.PI*2); ctx.fill();

  // Dash button
  const cool  = p1 ? Math.max(0, p1.dashCooldown / DASH_COOL) : 0;
  const ready = cool <= 0;
  if (ready) {
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.18 * Math.sin(Date.now() * 0.006);
    ctx.strokeStyle = '#ff2244'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(DBX, DBY, DB_R + 7, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle   = ready ? 'rgba(255,25,55,0.28)' : 'rgba(70,70,100,0.22)';
  ctx.strokeStyle = ready ? 'rgba(255,55,75,0.65)' : 'rgba(90,90,120,0.38)';
  ctx.lineWidth   = 3;
  ctx.beginPath(); ctx.arc(DBX, DBY, DB_R, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  if (cool > 0) {
    ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = 'rgba(255,70,90,0.5)';
    ctx.beginPath(); ctx.moveTo(DBX, DBY);
    ctx.arc(DBX, DBY, DB_R, -Math.PI/2, -Math.PI/2 + (1-cool)*Math.PI*2);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = ready ? 'rgba(255,255,255,0.9)' : 'rgba(110,110,150,0.6)';
  ctx.fillText('⚡', DBX, DBY);
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = 0.42; ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MOVE', joy.bx, joy.by + JR_BASE + 17);
  ctx.fillText('DASH', DBX,    DBY    + DB_R    + 17);
  ctx.restore();
}

// ── Overlay screens ──────────────────────────────────────────
function drawMenu() {
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, LW, LH);
  const t = Date.now() * 0.001;
  ctx.textAlign = 'center';

  const pulse = 1 + 0.03 * Math.sin(t * 1.1);
  ctx.save(); ctx.translate(LW/2, LH/2 - 100); ctx.scale(pulse, pulse);
  ctx.fillStyle = C.gold; ctx.font = 'bold 54px monospace'; ctx.fillText('SUMO', 0, 0);
  ctx.restore();
  ctx.save(); ctx.translate(LW/2, LH/2 - 42); ctx.scale(pulse, pulse);
  ctx.fillStyle = C.p1; ctx.font = 'bold 54px monospace'; ctx.fillText('SOCCER', 0, 0);
  ctx.restore();

  // VS graphic
  const cy = LH/2 + 14;
  ctx.fillStyle = C.p1; ctx.beginPath(); ctx.arc(LW/2-55, cy, 22, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = C.p1belt; ctx.fillRect(LW/2-72, cy-4, 34, 8);
  ctx.fillStyle = C.p2; ctx.beginPath(); ctx.arc(LW/2+55, cy, 22, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = C.p2belt; ctx.fillRect(LW/2+38, cy-4, 34, 8);
  ctx.fillStyle = '#888'; ctx.font = 'bold 26px monospace'; ctx.fillText('VS', LW/2, cy + 8);
  ctx.fillStyle = '#ccc'; ctx.font = '11px monospace';
  ctx.fillText('YOU', LW/2-55, cy+40); ctx.fillText('CPU', LW/2+55, cy+40);

  ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
  ctx.fillText(`First to ${GOALS_WIN} goals wins!`, LW/2, LH/2 + 75);
  ctx.fillStyle = '#555'; ctx.font = '12px monospace';
  ctx.fillText('WASD / Arrows · Space = Dash  |  On-screen joystick + ⚡', LW/2, LH/2 + 100);

  const blink = 0.5 + 0.5 * Math.sin(t * 3.5);
  ctx.globalAlpha = 0.5 + 0.5 * blink;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
  ctx.fillText('TAP  /  CLICK  TO  PLAY', LW/2, LH/2 + 148);
  ctx.globalAlpha = 1;
}

function drawGoalOverlay() {
  const teamCol  = scoredTeam === 0 ? C.p1 : C.p2;
  const teamName = scoredTeam === 0 ? 'YOU SCORE!' : 'CPU SCORES!';
  const progress = 1 - goalTimer / GOAL_PAUSE;
  const fadeIn   = Math.min(1, progress * 6);
  const fadeOut  = progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.28) : 1;
  const alpha    = fadeIn * fadeOut;

  ctx.save(); ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, LW, LH);
  ctx.globalAlpha = alpha;

  const scale = 1 + 0.06 * Math.sin(Date.now() * 0.012);
  ctx.translate(LW/2, LH/2 - 28);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.fillStyle = teamCol; ctx.font = 'bold 74px monospace'; ctx.fillText('GOAL!', 0, 0);
  ctx.scale(1/scale, 1/scale);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace'; ctx.fillText(teamName, 0, 52);
  ctx.font = 'bold 34px monospace';
  ctx.fillStyle = C.p1; ctx.fillText(score[0], -44, 104);
  ctx.fillStyle = '#666'; ctx.fillText('–', 0, 104);
  ctx.fillStyle = C.p2; ctx.fillText(score[1], 44, 104);
  ctx.restore();
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.86)'; ctx.fillRect(0, 0, LW, LH);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold; ctx.font = 'bold 46px monospace'; ctx.fillText('GAME OVER', LW/2, LH/2 - 82);

  const wCol  = winner === 0 ? C.p1 : C.p2;
  const wText = winner === 0 ? 'YOU WIN!' : 'CPU WINS!';
  ctx.fillStyle = wCol; ctx.font = 'bold 38px monospace'; ctx.fillText(wText, LW/2, LH/2 - 28);

  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = C.p1; ctx.fillText(score[0], LW/2 - 56, LH/2 + 42);
  ctx.fillStyle = '#555'; ctx.font = 'bold 40px monospace'; ctx.fillText('–', LW/2, LH/2 + 42);
  ctx.fillStyle = C.p2; ctx.font = 'bold 56px monospace'; ctx.fillText(score[1], LW/2 + 56, LH/2 + 42);
  ctx.fillStyle = '#555'; ctx.font = '12px monospace'; ctx.fillText('YOU            CPU', LW/2, LH/2 + 60);

  const blink = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
  ctx.globalAlpha = 0.5 + 0.5 * blink;
  ctx.fillStyle = '#aaa'; ctx.font = 'bold 18px monospace'; ctx.fillText('TAP TO PLAY AGAIN', LW/2, LH/2 + 112);
  ctx.globalAlpha = 1;
}

// ════════════════════════════════════════════════════════════
//  GAME MANAGEMENT
// ════════════════════════════════════════════════════════════
function startGame() {
  score  = [0, 0]; winner = -1;
  p1     = makePlayer(FCX - 155, FCY, 0);
  p2     = makePlayer(FCX + 155, FCY, 1);
  ball   = makeBall();
  particles.length = 0;
  shakeX = shakeY = shakeTtl = 0;
  mode   = 'playing';
}

function resetRound() {
  p1.x = FCX - 155; p1.y = FCY; p1.vx = 0; p1.vy = 0; p1.stun = 0; p1.angle = 0;
  p2.x = FCX + 155; p2.y = FCY; p2.vx = 0; p2.vy = 0; p2.stun = 0; p2.angle = Math.PI;
  ball = makeBall();
  shakeX = shakeY = shakeTtl = 0;
}

function onGoalScored(team) {
  score[team]++;
  scoredTeam = team;
  spawnGoalBurst(ball.x, ball.y, team === 0 ? C.p1 : C.p2);
  spawnConfetti(LW / 2, FY + 80);
  addShake(24, 600);
  playGoalSfx();
  if (navigator.vibrate) navigator.vibrate([100, 40, 120]);

  if (score[team] >= GOALS_WIN) { winner = team; mode = 'gameover'; }
  else { mode = 'goal'; goalTimer = GOAL_PAUSE; }
}

// ════════════════════════════════════════════════════════════
//  MAIN UPDATE
// ════════════════════════════════════════════════════════════
let lastTS = 0;

function update(ts) {
  const dt = Math.min(ts - lastTS, 60);
  lastTS = ts;
  matchAnim++;

  // Shake decay
  if (shakeTtl > 0) {
    shakeTtl -= dt;
    const i = Math.max(0, shakeTtl / 60);
    shakeX = (Math.random() - 0.5) * i;
    shakeY = (Math.random() - 0.5) * i;
    if (shakeTtl <= 0) shakeX = shakeY = 0;
  }

  updateParticles(dt / 16);

  if (mode === 'menu' || mode === 'gameover') return;
  if (mode === 'goal') {
    goalTimer -= dt;
    if (goalTimer <= 0) { mode = 'playing'; resetRound(); }
    return;
  }

  // ─── Playing ───────────────────────────────────────────────
  applyPlayerInput();
  updateAI(dt);
  updatePlayer(p1, dt);
  updatePlayer(p2, dt);

  ball.vx *= B_FRIC; ball.vy *= B_FRIC;
  ball.x  += ball.vx; ball.y  += ball.vy;
  ball.spin += ball.spinV; ball.spinV *= 0.95;

  // p1 ↔ ball
  if (circleCollide(p1, ball)) {
    const imp = Math.hypot(ball.vx, ball.vy);
    ball.spinV += (Math.random()-0.5) * imp * 0.18;
    const nx = (ball.x-p1.x)/(p1.r+ball.r), ny = (ball.y-p1.y)/(p1.r+ball.r);
    if (imp > 3) { spawnHitSparks(ball.x, ball.y, nx, ny, Math.min(1,imp/13)); playKick(Math.min(1,imp/11)); }
    if (imp > 9) addShake(imp*0.65, 130);
  }

  // p2 ↔ ball
  if (circleCollide(p2, ball)) {
    const imp = Math.hypot(ball.vx, ball.vy);
    ball.spinV += (Math.random()-0.5) * imp * 0.18;
    const nx = (ball.x-p2.x)/(p2.r+ball.r), ny = (ball.y-p2.y)/(p2.r+ball.r);
    if (imp > 3) { spawnHitSparks(ball.x, ball.y, nx, ny, Math.min(1,imp/13)); playKick(Math.min(1,imp/11)); }
    if (imp > 9) addShake(imp*0.65, 130);
  }

  // p1 ↔ p2 (sumo clash!)
  if (circleCollide(p1, p2)) {
    const relV = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
    if (relV > 4) {
      spawnHitSparks((p1.x+p2.x)/2, (p1.y+p2.y)/2, 0, -1, Math.min(1, relV/17));
      addShake(relV * 1.1, 220);
      playBump(Math.min(1, relV / 14));
      if (navigator.vibrate) navigator.vibrate(20);
    }
    if (p1.dashTimer > 0 && relV > 7) p2.stun = 440;
    if (p2.dashTimer > 0 && relV > 7) p1.stun = 440;
  }

  boundPlayer(p1); boundPlayer(p2); boundBall(ball);

  const g = checkGoal();
  if (g >= 0) onGoalScored(g);
}

// ════════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════════
function render() {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, LW, LH);

  if (shakeX || shakeY) { ctx.save(); ctx.translate(shakeX, shakeY); }

  ctx.fillStyle = C.field; ctx.fillRect(FX, FY, FW, FH);
  drawFieldBg();
  drawParticles();
  if (p1 && p2 && ball) { drawPlayer(p1); drawPlayer(p2); drawBall(ball); }

  if (shakeX || shakeY) ctx.restore();

  if (p1 && p2) drawHUD();
  drawControls();

  if (mode === 'menu')     drawMenu();
  if (mode === 'goal')     drawGoalOverlay();
  if (mode === 'gameover') drawGameOver();
}

// ════════════════════════════════════════════════════════════
//  GAME LOOP
// ════════════════════════════════════════════════════════════
canvas.addEventListener('contextmenu', e => e.preventDefault());
requestAnimationFrame(ts => { lastTS = ts; requestAnimationFrame(loop); });

function loop(ts) { update(ts); render(); requestAnimationFrame(loop); }

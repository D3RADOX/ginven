import { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS & LOOKUP TABLES
// ─────────────────────────────────────────────────────────────────
const PERSONALITIES = [
  'Workhorse', 'Lazy Talent', 'Hothead', 'Natural Leader',
  'Fragile Confidence', 'Silent Grinder', 'Showboat', 'Stoic',
];

const KIMARITE_LIST = [
  'Yorikiri', 'Oshidashi', 'Uwatenage', 'Shitatenage',
  'Kotenage', 'Tsukiotoshi', 'Hatakikomi', 'Uwatedashinage',
  'Yoritaoshi', 'Tsukidashi', 'Oshitaoshi', 'Hikiotoshi',
];

const RANKS = ['Yokozuna','Ozeki','Sekiwake','Komusubi','Maegashira 1','Maegashira 3','Maegashira 5','Maegashira 8','Maegashira 10','Juryo 1','Juryo 5','Juryo 12','Makushita 1'];

const TRAINING_POLICIES = [
  { id: 'power',     name: 'Teppō Drills',     fatigue: 8,  morale: -3, growth: { power: 0.9, stamina: 0.3 },               injuryRisk: false, desc: 'Iron post striking — builds raw power and body hardness.' },
  { id: 'technique', name: 'Shiko Practice',   fatigue: 5,  morale: 1,  growth: { technique: 0.9, balance: 0.3 },           injuryRisk: false, desc: 'Leg-stomp rituals — develops kimarite and balance.' },
  { id: 'balanced',  name: 'Mōsōgeiko',        fatigue: 4,  morale: 0,  growth: { power:0.3, technique:0.3, speed:0.2, balance:0.2 }, injuryRisk: false, desc: 'Imaginary bout training — steady all-round growth.' },
  { id: 'light',     name: 'Butsukari-geiko',  fatigue: -10,morale: 5,  growth: {},                                          injuryRisk: false, desc: 'Light pushing drill — rest and recovery, no stat gains.' },
  { id: 'intensive', name: 'Sanbangeiko',       fatigue: 14, morale: -6, growth: { power:0.6, technique:0.5, stamina:0.5 },  injuryRisk: true,  desc: 'Repetitive bout sparring — maximum gains, high injury risk.' },
];

const DISCIPLINE_LEVELS = [
  { id: 'lenient',  name: 'Lenient',  moraleEff: 4,  discEff: -3, desc: 'Relaxed. Morale rises, discipline erodes.' },
  { id: 'moderate', name: 'Moderate', moraleEff: 1,  discEff: 1,  desc: 'Balanced approach. Sustainable long-term.' },
  { id: 'strict',   name: 'Strict',   moraleEff: -2, discEff: 4,  desc: 'Demanding. Discipline improves quickly.' },
  { id: 'iron',     name: 'Iron',     moraleEff: -6, discEff: 8,  desc: 'Absolute discipline. High burnout risk.' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BASHO_MONTHS = [1, 3, 5, 7, 9, 11]; // Jan, Mar, May, Jul, Sep, Nov

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function ri(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

function makeWrestler(id, name, rank, age, stats, personality, kimarite) {
  return {
    id, name, rank, age,
    stats: { power: stats.power, technique: stats.technique, speed: stats.speed, balance: stats.balance, stamina: stats.stamina, mental: stats.mental },
    condition: { morale: ri(65, 85), fatigue: ri(15, 35), discipline: ri(55, 80) },
    personality: personality || rnd(PERSONALITIES),
    kimarite: kimarite || rnd(KIMARITE_LIST),
    record: { wins: ri(0, 25), losses: ri(0, 20) },
    injured: false, injuryDays: 0,
    streak: 0,
    hidden: { growthRate: 0.4 + Math.random() * 0.8, injuryProne: Math.random() < 0.2, peakAge: ri(26, 32) },
  };
}

const INITIAL_WRESTLERS = [
  makeWrestler(1, 'Takahashi Ryū',   'Maegashira 3',  26, { power:78, technique:72, speed:65, balance:71, stamina:74, mental:68 }, 'Workhorse',          'Yorikiri'),
  makeWrestler(2, 'Yamamoto Tetsuo', 'Maegashira 8',  23, { power:65, technique:80, speed:75, balance:79, stamina:62, mental:71 }, 'Silent Grinder',     'Uwatenage'),
  makeWrestler(3, 'Ogawa Hiroshi',   'Juryo 5',       29, { power:82, technique:60, speed:55, balance:63, stamina:80, mental:58 }, 'Hothead',            'Oshidashi'),
  makeWrestler(4, 'Kimura Daisuke',  'Juryo 12',      21, { power:60, technique:65, speed:70, balance:68, stamina:59, mental:75 }, 'Natural Leader',     'Hatakikomi'),
  makeWrestler(5, 'Satō Kenji',      'Makushita 1',   19, { power:55, technique:62, speed:72, balance:60, stamina:57, mental:63 }, 'Fragile Confidence', 'Tsukiotoshi'),
];

const INITIAL_PROSPECTS = [
  { id:101, name:'Watanabe Kōji',  age:18, rating:78, cost:150000, potential:'High',  personality:'Workhorse',      kimarite:'Yorikiri',   stats:{power:58,technique:52,speed:68,balance:64,stamina:60,mental:55} },
  { id:102, name:'Itō Masaru',     age:17, rating:65, cost:80000,  potential:'Medium', personality:'Natural Leader', kimarite:'Uwatenage',  stats:{power:52,technique:60,speed:62,balance:55,stamina:58,mental:70} },
  { id:103, name:'Fujita Akira',   age:20, rating:85, cost:250000, potential:'Elite',  personality:'Stoic',          kimarite:'Kotenage',   stats:{power:70,technique:65,speed:73,balance:72,stamina:68,mental:78} },
  { id:104, name:'Nakamura Shin',  age:19, rating:55, cost:60000,  potential:'Low',    personality:'Lazy Talent',    kimarite:'Tsukidashi', stats:{power:55,technique:48,speed:58,balance:52,stamina:62,mental:50} },
  { id:105, name:'Hayashi Tōru',   age:22, rating:72, cost:120000, potential:'High',   personality:'Showboat',       kimarite:'Hatakikomi', stats:{power:66,technique:70,speed:68,balance:65,stamina:63,mental:60} },
];

const STOCK_OPPONENTS = [
  { id:201, name:'Tanaka Yūji',    rank:'Maegashira 2',  stats:{power:80,technique:75,speed:70,balance:72,stamina:78,mental:73}, condition:{morale:80,fatigue:22,discipline:75}, kimarite:'Uwatenage',   personality:'Stoic' },
  { id:202, name:'Inoue Ryōta',    rank:'Maegashira 5',  stats:{power:73,technique:78,speed:72,balance:76,stamina:70,mental:75}, condition:{morale:72,fatigue:30,discipline:68}, kimarite:'Yorikiri',    personality:'Natural Leader' },
  { id:203, name:'Mori Kazuhiko',  rank:'Maegashira 10', stats:{power:68,technique:65,speed:75,balance:70,stamina:66,mental:72}, condition:{morale:65,fatigue:20,discipline:70}, kimarite:'Hatakikomi',  personality:'Hothead' },
  { id:204, name:'Aoki Shinnosuke',rank:'Juryo 3',       stats:{power:74,technique:68,speed:64,balance:67,stamina:72,mental:66}, condition:{morale:70,fatigue:28,discipline:72}, kimarite:'Oshidashi',   personality:'Workhorse' },
  { id:205, name:'Yoshida Taiga',  rank:'Juryo 9',       stats:{power:62,technique:71,speed:78,balance:73,stamina:60,mental:80}, condition:{morale:78,fatigue:18,discipline:65}, kimarite:'Tsukiotoshi', personality:'Silent Grinder' },
];

const OPPONENT_NAMES = [
  'Suzuki Yūta', 'Kobayashi Ryū', 'Katō Masaru', 'Itō Hiroki', 'Watanabe Daisuke',
  'Tanaka Shinji', 'Yamada Takuya', 'Inoue Haruki', 'Kimura Satoshi', 'Hasegawa Nori',
  'Hayashi Minoru', 'Matsumoto Ken', 'Fujii Akihiro', 'Nishimura Tarō', 'Mori Genshiro',
  'Aoki Kazuki', 'Yoshida Bungō', 'Ikeda Ryūnosuke', 'Ogata Makoto', 'Shimizu Tetsuya',
  'Miura Isamu', 'Otsuka Hiroaki', 'Kaneko Naoki', 'Saito Yūki', 'Endo Shōhei',
];

// ─────────────────────────────────────────────────────────────────
//  BOUT ENGINE
// ─────────────────────────────────────────────────────────────────
function calcEffective(w) {
  const s = w.stats;
  const c = w.condition;
  const base = (s.power + s.technique + s.speed + s.balance + s.stamina + s.mental) / 6;
  return Math.max(1, base + (c.morale - 50) * 0.15 - c.fatigue * 0.2 + c.discipline * 0.05);
}

const NARRATIVES = {
  shikiri:    ["The gyōji raises his fan. The dohyō falls silent.", "Both rikishi glare across the shikiri line. The crowd holds its breath.", "Ritual salt scatters across the clay. Time slows."],
  tai_even:   ["An even collision — neither gains the opening!", "Perfectly matched tachiai. This will be decided in the grip.", "Simultaneous explosion — the impact echoes through the hall."],
  tai_adv:    ["surges forward with a thunderous tachiai, seizing the initiative!", "blasts off the line first — instant advantage!", "catches the opponent completely off-balance at the charge!"],
  tai_henka:  ["sidesteps sharply at the tachiai — the crowd murmurs!", "pulls a lightning 変化 — the opponent crashes through empty air!", "dives to the side at the charge — audacious!"],
  grip_even:  ["Both rikishi battle fiercely for mawashi control.", "A tense grip battle — sweat-slicked hands, shuffling feet.", "Neither can establish the dominant hold."],
  grip_adv:   ["locks in a devastating double-inside grip — total control!", "secures the outside belt with an iron fist!", "wraps up both arms — the crowd gasps at the technique!"],
  push_adv:   ["drives with tremendous force toward the tawara!", "grinds forward step by relentless step!", "the weight advantage is overwhelming — ground is being given!"],
  retreat:    ["scrambles desperately at the bales — toes on the edge!", "pivots in a last-ditch attempt to escape!", "the sand is crumbling underfoot at the ring's rim!"],
  win:        ["forces them out! Victory by", "sends them tumbling! The kimarite:", "executes the decisive move — the kimarite:"],
  loss_sfx:   ["steps out — it's over!", "touches the sand first!", "cannot hold the edge!"],
};

function generateOpponent(rank) {
  const rankIdx = RANKS.indexOf(rank);
  const tierBase = Math.max(48, 88 - rankIdx * 3);
  const statVal = () => clamp(tierBase - 8 + ri(0, 16), 40, 95);
  const oppRankIdx = clamp(rankIdx + ri(-1, 1), 0, RANKS.length - 1);
  return {
    id: Date.now() + Math.random(),
    name: rnd(OPPONENT_NAMES),
    rank: RANKS[oppRankIdx],
    stats: { power: statVal(), technique: statVal(), speed: statVal(), balance: statVal(), stamina: statVal(), mental: statVal() },
    condition: { morale: ri(60, 85), fatigue: ri(15, 35), discipline: ri(55, 80) },
    kimarite: rnd(KIMARITE_LIST),
    personality: rnd(PERSONALITIES),
  };
}

function generateBout(w1, w2, tactic = 'balanced') {
  const e1 = calcEffective(w1), e2 = calcEffective(w2);
  const phases = [];
  let momentum = 0;

  // Tactic modifiers
  const TACTIC_MODS = {
    oshi:     { tachiai: 1.30, grip: 0.75, henkaSwing: 0 },
    yotsu:    { tachiai: 0.85, grip: 1.30, henkaSwing: 0 },
    henka:    { tachiai: 1.00, grip: 1.00, henkaSwing: (Math.random() < 0.52 ? 1 : -1) * (14 + Math.random() * 12) },
    balanced: { tachiai: 1.00, grip: 1.00, henkaSwing: 0 },
  };
  const mods = TACTIC_MODS[tactic] || TACTIC_MODS.balanced;
  const isHenka = tactic === 'henka';

  // Phase 0 — Shikiri (always even, visual setup)
  phases.push({ name: 'Shikiri', pose1: 'squat', pose2: 'squat', adv: 'even', x1: 0.25, x2: 0.75, text: rnd(NARRATIVES.shikiri) });

  // Phase 1 — Tachiai
  const tachiai_e1 = e1 * (1 + w1.stats.speed / 200) * mods.tachiai;
  const t = (Math.random() * tachiai_e1) - (Math.random() * e2) + mods.henkaSwing;
  const tAdv = t > 5 ? 'w1' : t < -5 ? 'w2' : 'even';
  momentum += t * 0.38;
  const taiText = isHenka
    ? `${w1.name} ${rnd(NARRATIVES.tai_henka)}`
    : (tAdv === 'even' ? rnd(NARRATIVES.tai_even) : `${tAdv==='w1'?w1.name:w2.name} ${rnd(NARRATIVES.tai_adv)}`);
  phases.push({
    name: 'Tachiai', adv: tAdv,
    pose1: tAdv === 'w2' ? 'retreat' : 'charge',
    pose2: tAdv === 'w1' ? 'retreat' : 'charge',
    x1: tAdv === 'w1' ? 0.38 : 0.30, x2: tAdv === 'w2' ? 0.62 : 0.70,
    text: taiText,
  });

  // Phase 2 — Grip Battle
  const grip_e1 = e1 * (1 + w1.stats.technique / 180) * mods.grip;
  const g = (Math.random() * grip_e1) - (Math.random() * e2 * (1 + w2.stats.technique / 180));
  const gAdv = g > 6 ? 'w1' : g < -6 ? 'w2' : 'even';
  momentum += g * 0.28;
  phases.push({
    name: 'Grip Battle', adv: gAdv,
    pose1: gAdv === 'w1' ? 'grip' : gAdv === 'w2' ? 'grip_def' : 'grip',
    pose2: gAdv === 'w2' ? 'grip' : gAdv === 'w1' ? 'grip_def' : 'grip',
    x1: 0.35, x2: 0.65,
    text: gAdv === 'even' ? rnd(NARRATIVES.grip_even) : `${gAdv==='w1'?w1.name:w2.name} ${rnd(NARRATIVES.grip_adv)}`,
  });

  // Phase 3 — Push & Position
  const p = (Math.random() * e1 * (1 + w1.stats.power / 180)) - (Math.random() * e2 * (1 + w2.stats.power / 180));
  const pAdv = (momentum + p) > 0 ? 'w1' : 'w2';
  momentum += p * 0.28;
  phases.push({
    name: 'Push & Position', adv: pAdv,
    pose1: pAdv === 'w1' ? 'push' : 'retreat',
    pose2: pAdv === 'w2' ? 'push' : 'retreat',
    x1: pAdv === 'w1' ? 0.42 : 0.22, x2: pAdv === 'w2' ? 0.58 : 0.78,
    text: `${pAdv==='w1'?w1.name:w2.name} ${rnd(NARRATIVES.push_adv)}`,
  });

  // Phase 4 — Finish
  const finalRoll = momentum + (Math.random() - 0.48) * Math.max(e1, e2) * 0.4;
  const winner = finalRoll > 0 ? 'w1' : 'w2';
  const kim = winner === 'w1' ? w1.kimarite : w2.kimarite;
  phases.push({
    name: 'Finish', adv: winner, kimarite: kim, winner,
    pose1: winner === 'w1' ? 'victory' : 'fall',
    pose2: winner === 'w2' ? 'victory' : 'fall',
    x1: winner === 'w1' ? 0.48 : 0.12, x2: winner === 'w2' ? 0.52 : 0.88,
    text: winner === 'w1'
      ? `${w1.name} ${rnd(NARRATIVES.win)} ${kim}!`
      : `${w2.name} ${rnd(NARRATIVES.win)} ${kim}! ${w1.name} ${rnd(NARRATIVES.loss_sfx)}`,
  });

  return { phases, winner, kimarite: kim, e1, e2 };
}

// ─────────────────────────────────────────────────────────────────
//  SEGA-STYLE 2D CANVAS BOUT RENDERER
// ─────────────────────────────────────────────────────────────────

// Pose: [bodyLean°, lArm°, rArm°, lLeg°, rLeg°, tuckY]
const CPOSES = {
  squat:    [  0, -44,  44, -48,  48,  14],
  ready:    [  0, -28,  28, -20,  20,   0],
  charge:   [ 24, -60, -12, -10,  10,   4],
  grip:     [ 14,  38, -38, -28,  28,   2],
  grip_def: [ -6, -38,  38, -36,  36,   6],
  push:     [ 30, -20, -20,  -8,   8,   0],
  retreat:  [-24,  28, -28, -22,  22,   6],
  victory:  [  0,-140, 140, -16,  16,  -8],
  fall:     [ 52,  68,  88, -52,  52,  20],
};

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function segaWrestler(ctx, cx, groundY, side, pose, skin, belt) {
  const pc = CPOSES[pose] || CPOSES.ready;
  const [lean, lA, rA, lL, rL, tY] = pc;
  const OL   = '#08060a';
  const flip = side === 'right' ? -1 : 1;

  // Vertical anchors relative to groundY
  const HIP_Y   = -20 + tY;
  const BELT_T  = -34 + tY;
  const TORSO_T = -58 + tY;
  const HEAD_CY = -74 + tY;
  const SHLDR_Y = -54 + tY;

  // Draw a limb with highlight shading
  const limb = (ox, oy, w, h, angleDeg) => {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(angleDeg * Math.PI / 180);
    // Outline
    ctx.fillStyle = OL;
    rrect(ctx, -w / 2 - 1.5, -1.5, w + 3, h + 3, 5);
    ctx.fill();
    // Skin fill
    ctx.fillStyle = skin;
    rrect(ctx, -w / 2, 0, w, h, 4);
    ctx.fill();
    // Highlight strip (lit side)
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    rrect(ctx, -w / 2, 0, w * 0.45, h * 0.6, 4);
    ctx.fill();
    // End cap (hand/foot)
    const capR = w * 0.52;
    ctx.fillStyle = OL;
    ctx.beginPath(); ctx.arc(0, h + capR * 0.4, capR + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, h + capR * 0.4, capR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(flip, 1);

  // Ground shadow — ellipse at feet, wider when leaning forward
  const shadowW = 34 + Math.abs(lean) * 0.3;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, shadowW, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body lean pivots around hip centre
  ctx.save();
  ctx.translate(0, HIP_Y);
  ctx.rotate(lean * Math.PI / 180);
  ctx.translate(0, -HIP_Y);

  // Left arm (behind — drawn first)
  limb(-15, SHLDR_Y, 11, 26, lA);

  // Torso
  ctx.fillStyle = OL;
  rrect(ctx, -18, TORSO_T - 1.5, 38, 41, 9); ctx.fill();
  ctx.fillStyle = skin;
  rrect(ctx, -16.5, TORSO_T, 35, 38, 8);     ctx.fill();
  // Torso highlight (upper-left lit area)
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  rrect(ctx, -16.5, TORSO_T, 20, 18, 8);     ctx.fill();
  // Torso muscle definition lines
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-8, TORSO_T + 10); ctx.lineTo(-8, TORSO_T + 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 8, TORSO_T + 10); ctx.lineTo( 8, TORSO_T + 28); ctx.stroke();

  // Mawashi belt
  ctx.fillStyle = OL;
  rrect(ctx, -20, BELT_T - 1.5, 42, 18, 5);  ctx.fill();
  ctx.fillStyle = belt;
  rrect(ctx, -18.5, BELT_T, 39, 16, 4);      ctx.fill();
  // Belt top-edge sheen
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rrect(ctx, -18.5, BELT_T, 39, 4, 4);       ctx.fill();
  // Knot highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rrect(ctx, -5, BELT_T + 3, 10, 9, 3);      ctx.fill();

  // Right arm (front)
  limb(15, SHLDR_Y, 11, 26, rA);

  // Left leg
  limb(-10, HIP_Y + 8, 13, 24, lL);
  // Right leg
  limb( 10, HIP_Y + 8, 13, 24, rL);

  // Head
  ctx.fillStyle = OL;
  ctx.beginPath(); ctx.ellipse(0, HEAD_CY, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0, HEAD_CY, 16.5, 14.5, 0, 0, Math.PI * 2); ctx.fill();
  // Head highlight
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.ellipse(-4, HEAD_CY - 4, 8, 6, -0.4, 0, Math.PI * 2); ctx.fill();

  // Topknot
  ctx.fillStyle = '#120810';
  ctx.beginPath(); ctx.ellipse(0, HEAD_CY - 12, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
  // Topknot sheen
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.ellipse(-1, HEAD_CY - 14, 2.5, 4, -0.3, 0, Math.PI * 2); ctx.fill();

  // Eyes
  ctx.fillStyle = '#0a0808';
  ctx.beginPath(); ctx.ellipse(-6, HEAD_CY + 1, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 6, HEAD_CY + 1, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Eye glint
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(-5, HEAD_CY - 0.5, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 7, HEAD_CY - 0.5, 1, 0, Math.PI * 2); ctx.fill();

  // Brows (intensity expression)
  ctx.strokeStyle = '#0a0808'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-9, HEAD_CY - 6); ctx.lineTo(-3, HEAD_CY - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 9, HEAD_CY - 6); ctx.lineTo( 3, HEAD_CY - 4); ctx.stroke();

  ctx.restore(); // lean
  ctx.restore(); // flip
}

function renderBoutFrame(ctx, W, H, phase, x1, x2, names, t = 1) {
  const GY = H - 28;
  const pn = phase.name; // phase name for effects

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   '#070510');
  sky.addColorStop(0.5, '#0c0818');
  sky.addColorStop(1,   '#080514');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Crowd silhouettes — 4 rows with occasional accent spectators
  const crowdPalette = ['#1a0d30','#140924','#1c0c1c','#18101e'];
  for (let row = 0; row < 4; row++) {
    const ry = 6 + row * 18;
    const count = 18 + row * 4;
    for (let i = 0; i < count; i++) {
      const seed = (i * 7 + row * 13) % 32;
      const hx = (i * (W / count)) + (row % 2) * (W / count / 2);
      const hw = 10 + (i % 3) * 3;
      const hh = 14 + (i % 4) * 3;
      // 1-in-8 chance of accent spectator (standing out, waving)
      const isAccent = seed % 8 === 0;
      ctx.fillStyle = isAccent
        ? (seed % 2 === 0 ? '#3a1a5a' : '#1a3a1a')
        : crowdPalette[(i + row) % 4];
      ctx.fillRect(hx + 1, ry + hh * 0.42, hw - 2, hh * 0.62);
      ctx.beginPath();
      ctx.ellipse(hx + hw / 2, ry + hh * 0.28, hw * 0.38, hh * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Accent: raised arm
      if (isAccent) {
        ctx.fillRect(hx + hw * 0.6, ry + hh * 0.05, hw * 0.18, hh * 0.38);
      }
    }
  }

  // Hanging banners
  const bannerCols = ['#1e0a30','#0a1c0a','#1e0808','#1c1608'];
  for (let i = 0; i < 8; i++) {
    const bx = i * 58 - 6;
    ctx.fillStyle = bannerCols[i % 4];
    ctx.fillRect(bx, 0, 28, 54);
    ctx.strokeStyle = '#2e1e48'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, 0, 28, 54);
    // Rope
    ctx.strokeStyle = '#3c2858'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(W, 5); ctx.stroke();
  }

  // Dohyo shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(W / 2, GY + 20, W * 0.44, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dohyo clay
  const clay = ctx.createRadialGradient(W / 2, GY - 12, 18, W / 2, GY + 4, W * 0.44);
  clay.addColorStop(0,   '#dab890');
  clay.addColorStop(0.65,'#c09a70');
  clay.addColorStop(1,   '#8a6040');
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.ellipse(W / 2, GY + 6, W * 0.44, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arena spotlight — radial glow on dohyo surface
  const spot = ctx.createRadialGradient(W / 2, GY - 10, 8, W / 2, GY - 10, 180);
  spot.addColorStop(0,   'rgba(255,240,200,0.09)');
  spot.addColorStop(0.5, 'rgba(255,230,160,0.04)');
  spot.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = spot;
  ctx.beginPath();
  ctx.ellipse(W / 2, GY + 6, W * 0.44, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tawara straw boundary
  ctx.strokeStyle = '#6a3818'; ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(W / 2, GY + 6, W * 0.44, 36, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Tawara bale markings
  ctx.fillStyle = '#8a5028';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(W / 2 + Math.cos(a) * W * 0.44, GY + 6 + Math.sin(a) * 36, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Inner dohyo chalk circle (traditional marking, dashed)
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(W / 2, GY + 6, W * 0.35, 28, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Shikiri lines
  ctx.fillStyle = '#2a1414';
  ctx.fillRect(W / 2 - 30, GY - 28, 5, 22);
  ctx.fillRect(W / 2 + 25, GY - 28, 5, 22);

  // Gyōji (referee)
  const gx = W / 2 + 64, gy = GY - 48;
  ctx.fillStyle = '#d8a860';
  ctx.beginPath(); ctx.arc(gx, gy, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a2808';
  rrect(ctx, gx - 7, gy + 6, 14, 26, 3); ctx.fill();
  ctx.fillStyle = '#c83800';
  ctx.fillRect(gx - 12, gy + 10, 22, 3);

  // ── PHASE EFFECTS (drawn before wrestlers) ──────────────────

  // Tachiai: animated dust burst from feet (scales with t)
  if (pn === 'Tachiai' && t > 0) {
    const dustCols = ['#c8a060','#b89050','#a07840'];
    for (let side = 0; side < 2; side++) {
      const bx = side === 0 ? x1 : x2;
      const dir = side === 0 ? 1 : -1;
      for (let d = 0; d < 10; d++) {
        const angle = (d / 10) * Math.PI + (dir > 0 ? 0 : Math.PI);
        const speed = 10 + (d % 3) * 8;
        const dx = bx + Math.cos(angle) * speed * t;
        const dy = GY - Math.abs(Math.sin(angle)) * speed * 0.5 * t
                      + t * t * speed * 0.7; // arc + gravity
        const alpha = Math.max(0, (0.7 - t * 0.75) - d * 0.02);
        ctx.fillStyle = dustCols[d % 3];
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(dx, dy, 2.5 + (d % 3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Push: motion lines behind retreating wrestler
  if (pn === 'Push & Position') {
    const retX = phase.adv === 'w1' ? x2 : x1;
    const dir   = phase.adv === 'w1' ? 1 : -1;
    ctx.strokeStyle = 'rgba(180,140,80,0.16)'; ctx.lineWidth = 1.5;
    for (let l = 0; l < 3; l++) {
      const ly = GY - 30 - l * 16;
      ctx.beginPath();
      ctx.moveTo(retX + dir * 14, ly);
      ctx.lineTo(retX + dir * 38, ly);
      ctx.stroke();
    }
  }

  // Grip: pressure dots + momentum arc
  if (pn === 'Grip Battle' || pn === 'Push & Position') {
    const mx = (x1 + x2) / 2;
    // Pressure dots (grip only)
    if (pn === 'Grip Battle') {
      ctx.fillStyle = 'rgba(220,200,160,0.35)';
      for (let d = 0; d < 5; d++) {
        const angle = (d / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(mx + Math.cos(angle) * 6, GY - 38 + Math.sin(angle) * 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Momentum arc — dashed quadratic curve with arrowhead, fades in with t
    if (t > 0.25) {
      const arcAlpha = Math.min(0.55, (t - 0.25) * 1.2);
      const adv = phase.adv || 'even';
      // Control point leans toward advantaged side
      const cpX = adv === 'w1' ? mx + 20 : adv === 'w2' ? mx - 20 : mx;
      const cpY = GY - 58;
      ctx.save();
      ctx.strokeStyle = `rgba(200,168,80,${arcAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(x1 + 18, GY - 32);
      ctx.quadraticCurveTo(cpX, cpY, x2 - 18, GY - 32);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead at the disadvantaged end
      const arrowDir = adv === 'w2' ? -1 : 1; // points toward w2 if w1 has adv
      const ax = mx + arrowDir * 8;
      const ay = GY - 32 - 4; // slightly above curve baseline
      ctx.fillStyle = `rgba(200,168,80,${arcAlpha})`;
      ctx.beginPath();
      ctx.moveTo(ax + arrowDir * 7, ay);
      ctx.lineTo(ax - arrowDir * 1, ay - 5);
      ctx.lineTo(ax - arrowDir * 1, ay + 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Wrestlers
  segaWrestler(ctx, x1, GY, 'left',  phase.pose1, '#c9a040', '#183acc');
  segaWrestler(ctx, x2, GY, 'right', phase.pose2, '#d03028', '#101010');

  // ── POST-WRESTLER EFFECTS ────────────────────────────────────

  // Finish: animated starburst + confetti on winner, elongated shadow on loser
  if (pn === 'Finish') {
    const winX = phase.winner === 'w1' ? x1 : x2;
    const losX = phase.winner === 'w1' ? x2 : x1;

    // Animated starburst — rays grow with t
    const burstAlpha = Math.min(0.75, t * 1.1);
    const rays = 12;
    ctx.lineWidth = 1.8;
    for (let r = 0; r < rays; r++) {
      const a    = (r / rays) * Math.PI * 2;
      const r1   = 6;
      const r2   = (18 + (r % 4) * 12) * Math.min(1, t * 1.6);
      ctx.strokeStyle = r % 2 === 0
        ? `rgba(220,180,40,${burstAlpha * 0.85})`
        : `rgba(255,220,100,${burstAlpha * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(winX + Math.cos(a) * r1, GY - 52 + Math.sin(a) * r1);
      ctx.lineTo(winX + Math.cos(a) * r2, GY - 52 + Math.sin(a) * r2);
      ctx.stroke();
    }

    // Confetti rain — starts at t > 0.35
    if (t > 0.35) {
      const cf_t  = (t - 0.35) / 0.65; // 0→1 over second half
      const CONF_COLS = ['#c9a84c','#44cc66','#e84040','#4a88cc','#e8a840','#cc44aa'];
      for (let i = 0; i < 16; i++) {
        const startX = winX + ((i % 8) - 3.5) * 13;
        const cx     = startX + Math.sin(i * 1.7 + cf_t * 2.5) * 16 * cf_t;
        const cy     = (GY - 85) + cf_t * cf_t * 130 * (0.5 + (i % 3) * 0.3);
        const rot    = i * 0.55 + cf_t * 4;
        const alpha  = Math.max(0, 0.95 - cf_t * 1.1);
        if (alpha <= 0) continue;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = CONF_COLS[i % CONF_COLS.length];
        ctx.fillRect(-3.5, -2, 7, 4);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Loser elongated fall shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(losX, GY + 6, 44, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tachiai / Finish: animated screen flash (bell-shaped pulse via t)
  if ((pn === 'Tachiai' || pn === 'Finish') && t > 0 && t < 1) {
    const flashAlpha = pn === 'Finish'
      ? Math.max(0, 0.22 * Math.sin(t * Math.PI))
      : Math.max(0, 0.14 * Math.sin(t * Math.PI));
    if (flashAlpha > 0) {
      const midX = (x1 + x2) / 2;
      const flash = ctx.createRadialGradient(midX, GY - 40, 4, midX, GY - 40, 80);
      flash.addColorStop(0,   `rgba(255,255,210,${flashAlpha})`);
      flash.addColorStop(0.5, `rgba(255,230,130,${flashAlpha * 0.5})`);
      flash.addColorStop(1,   'rgba(255,210,60,0)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── NAME TAGS (Sega fighter style) ──────────────────────────
  if (names) {
    const drawTag = (nx, label, accentColor) => {
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      const tw = ctx.measureText(label).width;
      const pw = tw + 14, ph = 14, px = nx - pw / 2, py = GY + 12;
      // Pill background
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      rrect(ctx, px, py, pw, ph, 5); ctx.fill();
      // Accent underline
      ctx.fillStyle = accentColor;
      rrect(ctx, px, py + ph - 2, pw, 2, 2); ctx.fill();
      // Text
      ctx.fillStyle = '#e8e0c0';
      ctx.fillText(label, nx - tw / 2, py + 10);
    };
    drawTag(x1, (names.n1 || '').slice(0, 10), 'rgba(200,168,60,0.8)');
    drawTag(x2, (names.n2 || '').slice(0, 10), 'rgba(210,60,50,0.8)');
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.028)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

function BoutCanvas({ phases, currentPhase, names }) {
  const cvRef  = useRef(null);
  const posRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const cur = phases[currentPhase];
    const tX1 = cur.x1 * W, tX2 = cur.x2 * W;

    if (!posRef.current) posRef.current = { x1: tX1, x2: tX2 };
    const { x1: sX1, x2: sX2 } = posRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    let t = 0;

    const tick = () => {
      t = Math.min(1, t + 0.055);
      const e = 1 - Math.pow(1 - t, 3);
      const x1 = sX1 + (tX1 - sX1) * e;
      const x2 = sX2 + (tX2 - sX2) * e;
      posRef.current = { x1, x2 };
      renderBoutFrame(ctx, W, H, cur, x1, x2, names, t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentPhase, phases, names]);

  return (
    <canvas
      ref={cvRef}
      width={430}
      height={272}
      style={{ width: '100%', display: 'block' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
//  FIGHT VIEWER
// ─────────────────────────────────────────────────────────────────
function FightViewer({ bout, onClose, kachiKoshi }) {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef(null);
  const cur = bout.phases[phase];
  const isLast = phase === bout.phases.length - 1;

  useEffect(() => {
    if (isLast) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setPhase(p => Math.min(p + 1, bout.phases.length - 1)), 2400);
    return () => clearInterval(timerRef.current);
  }, [phase, isLast, bout.phases.length]);

  const advance = () => {
    if (isLast) { onClose(); return; }
    clearInterval(timerRef.current);
    setPhase(p => Math.min(p + 1, bout.phases.length - 1));
  };

  const advColor = cur.adv === 'w1' ? '#c9a84c' : cur.adv === 'w2' ? '#e84040' : '#666';
  const advName  = cur.adv === 'w1' ? bout.w1.name : cur.adv === 'w2' ? bout.w2.name : null;

  const GOLD = '#c9a84c', RED = '#e84040';

  return (
    <div onClick={advance} style={{ position:'fixed', inset:0, zIndex:200, background:'#07060e', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}>

      {/* Header */}
      <div style={{ width:'100%', maxWidth:430, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px 8px' }} onClick={e => { e.stopPropagation(); onClose(); }}>
        <span style={{ color:GOLD, fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:3, fontWeight:700 }}>FIGHT VIEWER</span>
        <span style={{ color:'#444', fontSize:22, lineHeight:1 }}>✕</span>
      </div>

      {/* Name plates */}
      <div style={{ width:'100%', maxWidth:430, display:'flex', justifyContent:'space-between', padding:'0 16px 10px' }}>
        <div>
          <div style={{ color:GOLD, fontFamily:'Noto Serif JP,serif', fontSize:13, fontWeight:700 }}>{bout.w1.name}</div>
          <div style={{ color:'#3a3a60', fontFamily:'JetBrains Mono,monospace', fontSize:10 }}>EFF {Math.round(bout.e1)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:RED, fontFamily:'Noto Serif JP,serif', fontSize:13, fontWeight:700 }}>{bout.w2.name}</div>
          <div style={{ color:'#3a3a60', fontFamily:'JetBrains Mono,monospace', fontSize:10 }}>EFF {Math.round(bout.e2)}</div>
        </div>
      </div>

      {/* Arena — Sega-style 2D Canvas */}
      <BoutCanvas phases={bout.phases} currentPhase={phase} names={{ n1: bout.w1.name, n2: bout.w2.name }} />

      {/* Phase progress dots */}
      <div style={{ display:'flex', gap:6, padding:'14px 0 6px' }}>
        {bout.phases.map((_, i) => (
          <div key={i} style={{ width:i === phase ? 22 : 8, height:6, borderRadius:3, background: i <= phase ? advColor : '#1a1a2e', transition:'all 0.3s' }} />
        ))}
      </div>

      {/* Phase label */}
      <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:3, marginBottom:4 }}>{cur.name.toUpperCase()}</div>

      {/* Advantage chip */}
      <div style={{ color: advColor, fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:10, minHeight:18 }}>
        {advName ? `▶ ${advName}` : '— EVEN —'}
      </div>

      {/* Commentary */}
      <div style={{ maxWidth:370, width:'92%', background:'#0c0b18', border:'1px solid #1a1836', borderRadius:12, padding:'14px 18px', marginBottom:14, minHeight:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'#c8c4d8', fontFamily:'Noto Serif JP,serif', fontSize:14, lineHeight:1.6, margin:0, textAlign:'center' }}>{cur.text}</p>
      </div>

      {/* Kachi-koshi overlay */}
      {isLast && kachiKoshi && cur.winner === 'w1' && (
        <div style={{ maxWidth:370, width:'92%', background:'linear-gradient(135deg,#0c1a08,#0a1408)', border:'1px solid rgba(68,204,102,0.5)', borderRadius:12, padding:'14px', marginBottom:10, textAlign:'center', boxShadow:'0 0 24px rgba(68,204,102,0.15)' }}>
          <div style={{ color:GREEN, fontSize:22, fontFamily:'Noto Serif JP,serif', fontWeight:700, letterSpacing:2 }}>勝ち越し</div>
          <div style={{ color:'#2a5a2a', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:4 }}>KACHI-KOSHI · MAJORITY WINS</div>
        </div>
      )}

      {/* Finish highlight card */}
      {isLast && (
        <div style={{ maxWidth:370, width:'92%', background:'linear-gradient(135deg,#0e0b1c,#150c10)', border:`1px solid ${cur.winner==='w1'?GOLD:RED}`, borderRadius:14, padding:'18px 22px', marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:26, fontWeight:700, fontFamily:'Noto Serif JP,serif', color:cur.winner==='w1'?GOLD:RED, marginBottom:6 }}>
            {cur.winner === 'w1' ? '⚡ VICTORY' : '✗ DEFEAT'}
          </div>
          <div style={{ color:'#666', fontFamily:'JetBrains Mono,monospace', fontSize:11, marginBottom:12 }}>
            Kimarite: <span style={{ color:GOLD }}>{cur.kimarite}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:36, marginBottom:12 }}>
            {[{ label:'YOUR EFF.', val:Math.round(bout.e1), col:GOLD }, { label:'OPP. EFF.', val:Math.round(bout.e2), col:RED }].map(x => (
              <div key={x.label}>
                <div style={{ color:x.col, fontSize:26, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{x.val}</div>
                <div style={{ color:'#333', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>{x.label}</div>
              </div>
            ))}
          </div>
          <div style={{ color:'#333', fontSize:11, fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>TAP TO CLOSE</div>
        </div>
      )}

      {!isLast && (
        <div style={{ color:'#282840', fontSize:11, fontFamily:'JetBrains Mono,monospace', paddingBottom:24 }}>TAP TO ADVANCE · AUTO-ADVANCING</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COLOUR HELPERS & SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
const GOLD = '#c9a84c', RED = '#e84040', GREEN = '#44cc66', ORANGE = '#e8a840';

const PERSONALITY_COLORS = {
  'Workhorse':          '#4a8a4a',
  'Lazy Talent':        '#8a5a8a',
  'Hothead':            '#cc4422',
  'Natural Leader':     '#c9a84c',
  'Fragile Confidence': '#6688cc',
  'Silent Grinder':     '#448888',
  'Showboat':           '#cc7722',
  'Stoic':              '#888888',
};

// Rank badge: shape ('circle'|'diamond'|'square'), color, kanji
const RANK_BADGE = {
  'Yokozuna':   { color: '#c9a84c', shape: 'circle'  },
  'Ozeki':      { color: '#c9a84c', shape: 'diamond' },
  'Sekiwake':   { color: '#8888cc', shape: 'diamond' },
  'Komusubi':   { color: '#8888cc', shape: 'square'  },
  'Maegashira': { color: '#6688aa', shape: 'square'  },
  'Juryo':      { color: '#888888', shape: 'square'  },
  'Makushita':  { color: '#555568', shape: 'square'  },
};

function rankBadge(rank) {
  const key = Object.keys(RANK_BADGE).find(k => rank.startsWith(k));
  return key ? RANK_BADGE[key] : RANK_BADGE['Makushita'];
}

function RankBadge({ rank, size = 18 }) {
  const b = rankBadge(rank);
  const inner = size - 4;
  const shared = {
    width: inner, height: inner,
    background: b.color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
  if (b.shape === 'circle') {
    shared.borderRadius = '50%';
  } else if (b.shape === 'diamond') {
    shared.transform = 'rotate(45deg)';
    shared.borderRadius = 2;
    shared.width = inner * 0.78;
    shared.height = inner * 0.78;
  } else {
    shared.borderRadius = 2;
  }
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={shared} />
    </div>
  );
}

function StatBar({ val, max = 99 }) {
  const pct = (val / max) * 100;
  const grad = val > 90
    ? 'linear-gradient(90deg,#9a7010,#c9a84c)'
    : val > 75
    ? 'linear-gradient(90deg,#7a5a10,#b8902c)'
    : val > 50
    ? 'linear-gradient(90deg,#2a4a7a,#4a88cc)'
    : 'linear-gradient(90deg,#1e2e4a,#3a4a6a)';
  const glow = val > 90 ? '0 0 6px rgba(200,168,76,0.5)' : 'none';
  return (
    <div style={{ height:4, background:'#12122a', borderRadius:2, flex:1, position:'relative' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:grad, borderRadius:2, transition:'width 0.3s', boxShadow:glow }} />
      {/* Tick marks at 25/50/75 */}
      {[25, 50, 75].map(t => (
        <div key={t} style={{ position:'absolute', top:0, left:`${t}%`, width:1, height:'100%', background:'rgba(255,255,255,0.06)' }} />
      ))}
    </div>
  );
}

function CondBar({ stat, val }) {
  const isFatigue = stat === 'fatigue';
  const col = isFatigue
    ? (val > 70 ? RED : val > 40 ? ORANGE : GREEN)
    : (val > 70 ? GREEN : val > 40 ? ORANGE : RED);
  const grad = isFatigue
    ? (val > 70 ? `linear-gradient(90deg,#8a1818,${RED})` : val > 40 ? `linear-gradient(90deg,#7a4010,${ORANGE})` : `linear-gradient(90deg,#206030,${GREEN})`)
    : (val > 70 ? `linear-gradient(90deg,#206030,${GREEN})` : val > 40 ? `linear-gradient(90deg,#7a4010,${ORANGE})` : `linear-gradient(90deg,#8a1818,${RED})`);
  const icon = isFatigue ? '▲' : stat === 'morale' ? '◆' : '⬡';
  const critFatigue = isFatigue && val > 75;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'#555', fontSize:11, fontFamily:'JetBrains Mono,monospace', textTransform:'capitalize', display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ color: col, fontSize:8, opacity:0.7 }}>{icon}</span>{stat}
        </span>
        <span style={{ color:col, fontSize:11, fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>{Math.round(val)}</span>
      </div>
      <div style={{ height:5, background:'#12122a', borderRadius:3, position:'relative', outline: critFatigue ? '1px solid rgba(232,64,64,0.35)' : 'none' }}>
        <div style={{ height:'100%', width:`${val}%`, background:grad, borderRadius:3, transition:'width 0.35s', animation: critFatigue ? 'pulseGlow 1.1s ease-in-out infinite' : 'none' }} />
        {[25, 50, 75].map(t => (
          <div key={t} style={{ position:'absolute', top:0, left:`${t}%`, width:1, height:'100%', background:'rgba(255,255,255,0.07)' }} />
        ))}
      </div>
    </div>
  );
}

function Card({ children, style, selected, elevated }) {
  const shadow = selected
    ? '0 0 0 1px rgba(201,168,76,0.4), inset 0 0 14px rgba(201,168,76,0.06), 0 4px 22px rgba(0,0,0,0.55)'
    : elevated
    ? '0 2px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.025)'
    : '0 1px 6px rgba(0,0,0,0.4)';
  return (
    <div style={{ background:'#0f0f1e', borderRadius:12, border:`1px solid ${selected ? 'rgba(201,168,76,0.3)' : '#1c1c36'}`, boxShadow:shadow, ...style }}>
      {children}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'16px 16px 8px' }}>
        <div style={{ width:2, height:14, background:'linear-gradient(180deg,#c9a84c,rgba(200,168,76,0))', borderRadius:1, flexShrink:0 }} />
        <span style={{ color:'#454568', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState('stable');
  const [stable, setStable]     = useState({ name:'Thunder Gate Stable', funds:2400000, reputation:45, year:2024, month:1, day:1, time:'Morning' });
  const [wrestlers, setWrestlers] = useState(INITIAL_WRESTLERS);
  const [prospects, setProspects] = useState(INITIAL_PROSPECTS);
  const [policy, setPolicy]     = useState('balanced');
  const [discipline, setDisc]   = useState('moderate');
  const [events, setEvents]     = useState([
    { id:1, type:'info',    text:'Welcome to Thunder Gate Stable. The January Basho begins soon.' },
    { id:2, type:'warning', text:'Ogawa Hiroshi shows signs of fatigue — consider Light Recovery.' },
  ]);
  const [wrestlerPolicies, setWrestlerPolicies] = useState({}); // { [wrestlerId]: policyId }
  const [bashoResults, setBashoResults] = useState(null);
  const [selW, setSelW]         = useState(null);
  const [viewer, setViewer]     = useState(null);
  const [basho, setBasho]       = useState(null);
  const eventId    = useRef(3);
  const prevFunds  = useRef(stable.funds);
  const [fundsFlash, setFundsFlash] = useState(null); // 'up' | 'down' | null

  useEffect(() => {
    const prev = prevFunds.current;
    if (prev !== stable.funds) {
      setFundsFlash(stable.funds > prev ? 'up' : 'down');
      const t = setTimeout(() => setFundsFlash(null), 900);
      prevFunds.current = stable.funds;
      return () => clearTimeout(t);
    }
  }, [stable.funds]);

  const pushEvent = (type, text) => {
    setEvents(ev => [{ id: eventId.current++, type, text }, ...ev.slice(0, 11)]);
  };

  // ── ADVANCE TIME ────────────────────────────────────────────
  const advance = () => {
    const seq = ['Morning','Afternoon','Evening'];
    setStable(prev => {
      let { time, day, month, year, funds, reputation } = prev;
      const idx = seq.indexOf(time);
      if (idx < 2) { time = seq[idx + 1]; }
      else {
        time = 'Morning'; day++;
        if (day > 30) { day = 1; month++; }
        if (month > 12) { month = 1; year++; }
        // Monthly finance on day 1
        if (day === 1) {
          const income  = 200000 + reputation * 2000;
          const expense = 150000 + wrestlers.length * 15000;
          funds = Math.max(0, funds + income - expense);
        }
      }
      return { ...prev, time, day, month, year, funds };
    });

    const dis = DISCIPLINE_LEVELS.find(d => d.id === discipline);

    setWrestlers(prev => prev.map(w => {
      if (w.injured) {
        const newInjuryDays = Math.max(0, w.injuryDays - 1);
        return { ...w, injuryDays: newInjuryDays, injured: newInjuryDays > 0 };
      }

      // Use per-wrestler policy if assigned, else fall back to stable default
      const pol = TRAINING_POLICIES.find(p => p.id === (wrestlerPolicies[w.id] || policy));

      let fat  = w.condition.fatigue   + pol.fatigue   * 0.32;
      let mor  = w.condition.morale    + pol.morale    * 0.32 + dis.moraleEff * 0.28;
      let disc = w.condition.discipline + dis.discEff  * 0.28;

      // Personality modifiers (applied before clamping)
      if (w.personality === 'Workhorse')          fat  -= 0.6;
      if (w.personality === 'Lazy Talent')        { mor += 0.8; disc -= 0.8; }
      if (w.personality === 'Hothead' && discipline === 'iron')  mor -= 1.8;
      if (w.personality === 'Fragile Confidence' && mor < 45)    mor = Math.max(30, mor - 0.5);
      if (w.personality === 'Natural Leader')     { disc += 0.4; mor += 0.3; }
      if (w.personality === 'Silent Grinder')     fat  -= 0.3;
      if (w.personality === 'Showboat' && mor > 70) disc -= 0.4;
      if (w.personality === 'Stoic')              { fat -= 0.2; mor += 0.1; }

      fat  = clamp(fat,  0, 100);
      mor  = clamp(mor,  0, 100);
      disc = clamp(disc, 0, 100);

      // Injury check
      const injProb = Math.min(
        pol.injuryRisk ? 0.15 : 0.05,
        (pol.injuryRisk ? 0.05 : 0.009) * (w.hidden.injuryProne ? 2 : 1) * (fat / 90)
      );
      let injured = w.injured, injuryDays = w.injuryDays;
      if (Math.random() < injProb) { injured = true; injuryDays = ri(3, 14); pushEvent('warning', `${w.name} has picked up an injury — ${ri(3,14)} training sessions out.`); }

      // Stat growth
      const newStats = { ...w.stats };
      Object.entries(pol.growth).forEach(([stat, rate]) => {
        if (newStats[stat] < 99) {
          newStats[stat] = Math.min(99, newStats[stat] + rate * w.hidden.growthRate * 0.06 * (disc / 70));
        }
      });

      return { ...w, stats: newStats, condition: { morale: mor, fatigue: fat, discipline: disc }, injured, injuryDays };
    }));

    // Rare random events
    if (Math.random() < 0.12) {
      const picks = [
        'A local sponsor enquiry arrives. Potential boost to funds.',
        'A media outlet requests an interview with your stable.',
        `${wrestlers.length > 0 ? wrestlers[ri(0, wrestlers.length - 1)].name : 'A wrestler'} had a breakthrough training session.`,
        'Rival stable scouts were spotted near your training facility.',
        'A young fan sends an encouraging letter to the stable.',
        'Your stable\'s record is being discussed in sumo circles.',
      ];
      pushEvent('info', rnd(picks));
    }
  };

  // ── RECRUIT ─────────────────────────────────────────────────
  const recruit = (p) => {
    if (stable.funds < p.cost) { pushEvent('error', `Insufficient funds to sign ${p.name}. Need ¥${p.cost.toLocaleString()}.`); return; }
    const w = makeWrestler(Date.now(), p.name, 'Makushita 1', p.age, p.stats, p.personality, p.kimarite);
    setWrestlers(prev => [...prev, w]);
    setProspects(prev => prev.filter(x => x.id !== p.id));
    setStable(prev => ({ ...prev, funds: prev.funds - p.cost }));
    pushEvent('info', `${p.name} has joined Thunder Gate Stable!`);
  };

  // ── BASHO ────────────────────────────────────────────────────
  const startBasho = () => {
    const active = wrestlers.filter(w => !w.injured).slice(0, 4);
    const BASHO_NAMES = ['January', 'March', 'May', 'July', 'September', 'November'];
    const bashoIdx  = BASHO_MONTHS.indexOf(stable.month);
    const bashoName = bashoIdx !== -1 ? `${BASHO_NAMES[bashoIdx]} Basho` : 'Grand Tournament';
    const schedule = {};
    active.forEach(w => {
      schedule[w.id] = Array.from({ length: 15 }, (_, i) => ({
        day: i + 1,
        opp: generateOpponent(w.rank),
        tactic: null,
        result: null,
        boutData: null,
      }));
    });
    setBasho({ name: bashoName, currentDay: 1, schedule, enteredWrestlers: active });
    setBashoResults(null);
  };

  // Set tactic for a wrestler's current day bout
  const setTactic = (wId, tactic) => {
    setBasho(prev => {
      const dayIdx = prev.currentDay - 1;
      const newSched = { ...prev.schedule };
      newSched[wId] = prev.schedule[wId].map((e, i) => i === dayIdx ? { ...e, tactic } : e);
      return { ...prev, schedule: newSched };
    });
  };

  // Watch a day's bout (opens FightViewer, generates bout if needed)
  const watchDayBout = (w, entry) => {
    const tactic = entry.tactic || 'balanced';
    let bd = entry.boutData;
    let updatedBasho = null;
    if (!bd) {
      bd = generateBout(w, entry.opp, tactic);
      setBasho(prev => {
        const dayIdx = prev.currentDay - 1;
        const newSched = { ...prev.schedule };
        newSched[w.id] = prev.schedule[w.id].map((e, i) =>
          i === dayIdx ? { ...e, result: bd.winner === 'w1' ? 'win' : 'loss', boutData: bd } : e
        );
        updatedBasho = { ...prev, schedule: newSched };
        return updatedBasho;
      });
    }
    // Calculate if this win would achieve kachi-koshi
    const currentDays = basho?.schedule[w.id] || [];
    const currentWins = currentDays.filter(d => d.result === 'win').length + (bd.winner === 'w1' && !entry.result ? 1 : 0);
    const currentLosses = currentDays.filter(d => d.result === 'loss').length;
    const kachiKoshi = bd.winner === 'w1' && currentWins > currentLosses && currentWins >= 8;
    setViewer({ w1: w, w2: entry.opp, phases: bd.phases, winner: bd.winner, kimarite: bd.kimarite, e1: bd.e1, e2: bd.e2, kachiKoshi });
  };

  // Auto-resolve a day's bout (picks random tactic if none chosen)
  const autoDayBout = (w, entry) => {
    const tactic = entry.tactic || rnd(['oshi','yotsu','henka','balanced']);
    const bd = generateBout(w, entry.opp, tactic);
    setBasho(prev => {
      const dayIdx = prev.currentDay - 1;
      const newSched = { ...prev.schedule };
      newSched[w.id] = prev.schedule[w.id].map((e, i) =>
        i === dayIdx ? { ...e, tactic, result: bd.winner === 'w1' ? 'win' : 'loss', boutData: bd } : e
      );
      return { ...prev, schedule: newSched };
    });
  };

  // Advance to the next basho day
  const advanceDay = () => {
    setBasho(prev => ({ ...prev, currentDay: prev.currentDay + 1 }));
  };

  const endBasho = () => {
    if (!basho) return;
    // Calculate per-wrestler results
    const perWrestler = {};
    basho.enteredWrestlers.forEach(w => {
      const days = basho.schedule[w.id] || [];
      const wins   = days.filter(d => d.result === 'win').length;
      const losses = days.filter(d => d.result === 'loss').length;
      const kachiKoshi = wins > losses;
      const rankIdx = RANKS.indexOf(w.rank);
      const newRankIdx = kachiKoshi
        ? Math.max(0, rankIdx - 1)
        : Math.min(RANKS.length - 1, rankIdx + 1);
      perWrestler[w.id] = { wins, losses, kachiKoshi, oldRank: w.rank, newRank: RANKS[newRankIdx] };
    });

    // Update wrestler ranks, records, streaks
    setWrestlers(prev => prev.map(w => {
      const res = perWrestler[w.id];
      if (!res) return w;
      const newRecord = { wins: w.record.wins + res.wins, losses: w.record.losses + res.losses };
      const newStreak = res.kachiKoshi
        ? (w.streak < 0 ? 1 : w.streak + 1)
        : (w.streak > 0 ? -1 : w.streak - 1);
      return { ...w, rank: res.newRank, record: newRecord, streak: newStreak };
    }));

    // Reputation change
    const totalWins   = Object.values(perWrestler).reduce((s, r) => s + r.wins,   0);
    const totalLosses = Object.values(perWrestler).reduce((s, r) => s + r.losses, 0);
    setStable(prev => ({ ...prev, reputation: clamp(prev.reputation + (totalWins - totalLosses) * 2, 0, 100) }));

    // Push events per wrestler
    basho.enteredWrestlers.forEach(w => {
      const res = perWrestler[w.id];
      if (!res) return;
      if (res.kachiKoshi) {
        pushEvent('info', `勝ち越し — ${w.name} ${res.wins}W-${res.losses}L. Promoted to ${res.newRank}.`);
      } else {
        pushEvent('warning', `負け越し — ${w.name} ${res.wins}W-${res.losses}L. Demoted to ${res.newRank}.`);
      }
    });

    setBashoResults({ name: basho.name, results: perWrestler, enteredWrestlers: basho.enteredWrestlers });
    setBasho(null);
  };

  // ── AVG CONDITION ────────────────────────────────────────────
  const avgCond = (stat) => wrestlers.length ? wrestlers.reduce((s, w) => s + w.condition[stat], 0) / wrestlers.length : 0;

  // ── SCREENS ──────────────────────────────────────────────────

  const StableScreen = (
    <div style={{ paddingBottom:88 }}>
      {/* Stat strip */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, margin:'12px 16px', borderRadius:10, overflow:'hidden', border:'1px solid #181830' }}>
        {[
          { label:'WRESTLERS', val: wrestlers.length },
          { label:'INJURED',   val: wrestlers.filter(w=>w.injured).length, warn:true },
          { label:'REPUTATION',val: stable.reputation },
        ].map(x => (
          <div key={x.label} style={{ padding:'10px 4px', textAlign:'center', background:'#0d0d1c' }}>
            <div style={{ color: x.warn && x.val > 0 ? RED : GOLD, fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{x.val}</div>
            <div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2 }}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* Avg condition */}
      <Section label="HEYA STATUS (部屋の状態)">
        <Card elevated style={{ margin:'0 16px', padding:'14px' }}>
          {['morale','fatigue','discipline'].map(s => <CondBar key={s} stat={s} val={avgCond(s)} />)}
        </Card>
      </Section>

      {/* Inbox */}
      <Section label={`JIMUSHO · INBOX (${events.length})`}>
        {events.length === 0 && <div style={{ color:'#2a2a44', fontFamily:'Noto Serif JP,serif', fontSize:13, fontStyle:'italic', padding:'12px 20px' }}>No recent events.</div>}
        {events.map(ev => (
          <div key={ev.id} style={{ margin:'0 16px 6px', padding:'10px 14px', background:'#0d0d1c', borderRadius:10, borderLeft:`3px solid ${ev.type==='error'?RED:ev.type==='warning'?ORANGE:'#2a3a7a'}` }}>
            <p style={{ color:'#9898b8', fontFamily:'Noto Serif JP,serif', fontSize:13, lineHeight:1.5, margin:0 }}>{ev.text}</p>
          </div>
        ))}
      </Section>
    </div>
  );

  const RosterScreen = selW ? (
    // Wrestler detail
    <div style={{ paddingBottom:88 }}>
      <button onClick={() => setSelW(null)} style={{ background:'none', border:'none', color:GOLD, fontFamily:'JetBrains Mono,monospace', fontSize:12, cursor:'pointer', padding:'14px 16px', letterSpacing:2 }}>← ROSTER</button>
      <div style={{ textAlign:'center', padding:'0 16px 16px' }}>
        <div style={{ color:'#f0f0ff', fontSize:22, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{selW.name}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
          <RankBadge rank={selW.rank} size={16} />
          <span style={{ color:'#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>{selW.rank} · Age {selW.age}</span>
        </div>
        {selW.injured && <div style={{ color:RED, fontSize:11, fontFamily:'JetBrains Mono,monospace', marginTop:4 }}>⚠ INJURED — {selW.injuryDays} sessions remaining</div>}
      </div>
      <Section label="BASE STATS">
        <Card elevated style={{ margin:'0 16px', padding:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {Object.entries(selW.stats).map(([s, v]) => (
              <div key={s} style={{ padding:'8px 10px', background:'#0a0a18', borderRadius:8, border:'1px solid #181830' }}>
                <div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:4, textTransform:'uppercase' }}>{s}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:GOLD, fontSize:20, fontWeight:700, fontFamily:'JetBrains Mono,monospace', minWidth:28 }}>{Math.round(v)}</span>
                  <StatBar val={v} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
      <Section label="CONDITION">
        <Card elevated style={{ margin:'0 16px', padding:'14px' }}>
          {Object.entries(selW.condition).map(([s, v]) => <CondBar key={s} stat={s} val={v} />)}
        </Card>
      </Section>
      <Section label="PROFILE">
        <Card elevated style={{ margin:'0 16px', padding:'14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:3 }}>PERSONALITY</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: PERSONALITY_COLORS[selW.personality] || '#555', flexShrink:0 }} />
                <span style={{ color:GOLD, fontFamily:'Noto Serif JP,serif', fontSize:14 }}>{selW.personality}</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}><div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:3 }}>KIMARITE</div><div style={{ color:GOLD, fontFamily:'Noto Serif JP,serif', fontSize:14 }}>{selW.kimarite}</div></div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div><div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:2 }}>WINS</div><div style={{ color:GREEN, fontSize:24, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{selW.record.wins}</div></div>
            <div style={{ textAlign:'right' }}><div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:2 }}>LOSSES</div><div style={{ color:RED, fontSize:24, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{selW.record.losses}</div></div>
          </div>
        </Card>
      </Section>
    </div>
  ) : (
    // Roster list
    <div style={{ padding:'12px 16px 88px' }}>
      <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, marginBottom:10 }}>RIKISHI (力士) — {wrestlers.length}</div>
      {wrestlers.map(w => {
        const eff = Math.round(calcEffective(w));
        return (
          <div key={w.id} onClick={() => setSelW(w)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', marginBottom:8, background:'#0d0d1c', borderRadius:12, border:`1px solid ${w.injured?'#2a1010':'#181830'}`, cursor:'pointer' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:w.injured?'#1a0808':'#12122a', border:`2px solid ${w.injured?RED:'#26266a'}`, flexShrink:0, position:'relative' }}>
              <span style={{ color:w.injured?RED:GOLD, fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{eff}</span>
              {/* Personality color ring arc — top-right corner */}
              <div style={{ position:'absolute', top:-2, right:-2, width:10, height:10, borderRadius:'50%', background: PERSONALITY_COLORS[w.personality] || '#555', border:'1.5px solid #0d0d1c' }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:w.injured?'#7a3030':'#d8d8f0', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{w.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <RankBadge rank={w.rank} size={14} />
                <span style={{ color:'#444', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{w.rank}</span>
              </div>
              {/* Win/loss ratio bar */}
              {(w.record.wins + w.record.losses) > 0 && (
                <div style={{ display:'flex', height:2, borderRadius:1, overflow:'hidden', marginTop:4, width:'100%' }}>
                  <div style={{ width:`${(w.record.wins / (w.record.wins + w.record.losses)) * 100}%`, background:'#2a5a2a' }} />
                  <div style={{ flex:1, background:'#4a1a1a' }} />
                </div>
              )}
            </div>
            {w.injured && <div style={{ color:RED, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>INJ</div>}
            {!w.injured && (w.streak || 0) !== 0 && (
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, color: (w.streak||0) > 0 ? GREEN : RED, minWidth:22, textAlign:'right' }}>
                {(w.streak||0) > 0 ? `▲${w.streak}` : `▼${Math.abs(w.streak)}`}
              </div>
            )}
            <div style={{ color:'#282848', fontSize:18 }}>›</div>
          </div>
        );
      })}
    </div>
  );

  const pol = TRAINING_POLICIES.find(p => p.id === policy);
  const dis = DISCIPLINE_LEVELS.find(d => d.id === discipline);

  const TACTIC_ABBREVS = { power:'TEPPŌ', technique:'SHIKO', balanced:'MŌSŌ', light:'BUTSU', intensive:'SANBAN' };

  const TrainScreen = (
    <div style={{ padding:'0 0 88px' }}>
      <Section label="DEFAULT KEIKO STYLE (稽古)">
        {TRAINING_POLICIES.map(p => (
          <div key={p.id} onClick={() => setPolicy(p.id)} style={{ margin:'0 16px 6px', padding:'12px 14px', background: policy===p.id ? '#121228' : '#0d0d1c', borderRadius:12, border:`1px solid ${policy===p.id?GOLD:'#181830'}`, cursor:'pointer', boxShadow: policy===p.id ? '0 0 0 1px rgba(200,168,76,0.2), 0 4px 16px rgba(0,0,0,0.4)' : 'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color: policy===p.id ? GOLD : '#9898b8', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{p.name}</span>
              {policy===p.id && <span style={{ color:GOLD, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>● STABLE DEFAULT</span>}
            </div>
            <div style={{ color:'#444', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginBottom:6 }}>{p.desc}</div>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <span style={{ color: p.fatigue > 0 ? RED : GREEN, fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>FAT {p.fatigue>0?'+':''}{p.fatigue}</span>
              <span style={{ color: p.morale > 0 ? GREEN : p.morale < 0 ? RED : '#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>MOR {p.morale>0?'+':''}{p.morale}</span>
              {p.injuryRisk && <span style={{ color:ORANGE, fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>⚠ INJURY RISK</span>}
            </div>
          </div>
        ))}
      </Section>

      <Section label="HEYA CULTURE (部屋の風土)">
        {DISCIPLINE_LEVELS.map(d => (
          <div key={d.id} onClick={() => setDisc(d.id)} style={{ margin:'0 16px 6px', padding:'12px 14px', background: discipline===d.id ? '#121228' : '#0d0d1c', borderRadius:12, border:`1px solid ${discipline===d.id?GOLD:'#181830'}`, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color: discipline===d.id ? GOLD : '#9898b8', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{d.name}</span>
              {discipline===d.id && <span style={{ color:GOLD, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>● ACTIVE</span>}
            </div>
            <div style={{ color:'#444', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginBottom:6 }}>{d.desc}</div>
            <div style={{ display:'flex', gap:14 }}>
              <span style={{ color: d.moraleEff > 0 ? GREEN : d.moraleEff < 0 ? RED : '#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>MOR {d.moraleEff>0?'+':''}{d.moraleEff}</span>
              <span style={{ color: d.discEff > 0 ? GREEN : d.discEff < 0 ? RED : '#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>DISC {d.discEff>0?'+':''}{d.discEff}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section label="RIKISHI KEIKO ASSIGNMENT (力士稽古)">
        <div style={{ margin:'0 16px 4px', padding:'6px 10px', background:'#0a0a18', borderRadius:8, border:'1px solid #181830' }}>
          <span style={{ color:'#2e2e50', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:2 }}>ASSIGN INDIVIDUAL KEIKO · TAP TO OVERRIDE · ↺ = USING DEFAULT</span>
        </div>
        {wrestlers.map(w => {
          const wPol = wrestlerPolicies[w.id] || null;
          const activePol = wPol || policy;
          return (
            <div key={w.id} style={{ margin:'0 16px 8px', padding:'10px 12px', background:'#0d0d1c', borderRadius:10, border:`1px solid ${w.injured?'#2a1010':'#181830'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background: PERSONALITY_COLORS[w.personality] || '#555', flexShrink:0 }} />
                  <span style={{ color: w.injured ? '#6a3030' : '#c0c0d8', fontSize:13, fontFamily:'Noto Serif JP,serif' }}>{w.name}</span>
                </div>
                {w.injured
                  ? <span style={{ color:RED, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>INJURED</span>
                  : <div style={{ display:'flex', gap:8 }}>
                      <span style={{ color: w.condition.fatigue>70 ? RED : '#444', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>F:{Math.round(w.condition.fatigue)}</span>
                      <span style={{ color: w.condition.morale<40 ? RED : '#444', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>M:{Math.round(w.condition.morale)}</span>
                    </div>
                }
              </div>
              {/* Policy picker row */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {TRAINING_POLICIES.map(p => {
                  const isActive = activePol === p.id;
                  const isOverride = wPol === p.id;
                  return (
                    <button key={p.id} onClick={() => {
                      if (wPol === p.id) {
                        // Already overridden to this: clear override
                        setWrestlerPolicies(prev => { const n = {...prev}; delete n[w.id]; return n; });
                      } else {
                        setWrestlerPolicies(prev => ({ ...prev, [w.id]: p.id }));
                      }
                    }} style={{
                      background: isActive ? (isOverride ? '#18182a' : '#121218') : '#0a0a14',
                      border: `1px solid ${isActive ? (isOverride ? GOLD : '#3a3a60') : '#181828'}`,
                      borderRadius: 6, padding: '4px 7px',
                      color: isActive ? (isOverride ? GOLD : '#6060a0') : '#2a2a40',
                      fontFamily: 'JetBrains Mono,monospace', fontSize: 9, cursor: 'pointer',
                      fontWeight: isActive ? 700 : 400,
                    }}>
                      {isActive && !isOverride ? '↺ ' : ''}{TACTIC_ABBREVS[p.id] || p.id.toUpperCase().slice(0,5)}
                    </button>
                  );
                })}
              </div>
              {wPol && (
                <div style={{ color:'#3a4a2a', fontFamily:'JetBrains Mono,monospace', fontSize:9, marginTop:4 }}>
                  ↳ OVERRIDE: {TRAINING_POLICIES.find(p=>p.id===wPol)?.name}
                </div>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );

  const ScoutScreen = (
    <div style={{ padding:'12px 16px 88px' }}>
      <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, marginBottom:10 }}>AVAILABLE PROSPECTS</div>
      {prospects.length === 0 && <div style={{ color:'#252540', fontFamily:'Noto Serif JP,serif', fontSize:14, fontStyle:'italic', padding:20, textAlign:'center' }}>No prospects. Check back next season.</div>}
      {prospects.map(p => (
        <Card key={p.id} style={{ marginBottom:10, padding:'14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <div>
              <div style={{ color:'#d8d8f0', fontSize:15, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{p.name}</div>
              <div style={{ color:'#333', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>Age {p.age} · {p.personality}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:GOLD, fontSize:24, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{p.rating}</div>
              <div style={{ color:'#2e2e50', fontSize:9, fontFamily:'JetBrains Mono,monospace' }}>SCOUT</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:2, flexWrap:'wrap' }}>
            {Object.entries(p.stats).map(([s,v]) => (
              <span key={s} style={{ color:'#444', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{s.slice(0,3).toUpperCase()}:{Math.round(v)}</span>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'3px 8px', borderRadius:10,
              fontSize:11, fontFamily:'JetBrains Mono,monospace', fontWeight:700,
              color: p.potential==='Elite'?GOLD:p.potential==='High'?GREEN:p.potential==='Medium'?'#4a88cc':'#555',
              border: `1px solid ${p.potential==='Elite'?'rgba(200,168,76,0.4)':p.potential==='High'?'rgba(68,204,102,0.4)':p.potential==='Medium'?'rgba(74,136,204,0.4)':'rgba(85,85,85,0.3)'}`,
              boxShadow: p.potential==='Elite'?'0 0 8px rgba(200,168,76,0.25)':'none',
              background: p.potential==='Elite'?'rgba(200,168,76,0.06)':'transparent',
            }}>◆ {p.potential.toUpperCase()}</span>
            <button onClick={() => recruit(p)} style={{ background: stable.funds>=p.cost ? GOLD : '#1e1e30', color: stable.funds>=p.cost ? '#0a0a0f' : '#333', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700, cursor: stable.funds>=p.cost ? 'pointer' : 'not-allowed', letterSpacing:1 }}>
              ¥{p.cost.toLocaleString()}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );

  const TACTIC_OPTIONS = [
    { id:'oshi',  label:'OSHI 押し', sub:'Power rush — aggressive charge', col:'#cc4422' },
    { id:'yotsu', label:'YOTSU 四つ', sub:'Grapple — mawashi control', col:'#4488cc' },
    { id:'henka', label:'HENKA 変化', sub:'Sidestep — high risk / reward', col:'#88cc44' },
  ];

  const BashoScreen = bashoResults ? (
    // Post-basho results screen
    <div style={{ padding:'24px 16px 88px' }}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ color:GOLD, fontSize:20, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{bashoResults.name}</div>
        <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:3 }}>BASHO COMPLETE · BANZUKE UPDATE</div>
      </div>
      {bashoResults.enteredWrestlers.map(w => {
        const res = bashoResults.results[w.id];
        if (!res) return null;
        return (
          <Card key={w.id} elevated style={{ marginBottom:12, padding:'16px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ color:'#d8d8f0', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{w.name}</div>
                <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>
                  {res.oldRank} → <span style={{ color: res.kachiKoshi ? GREEN : RED }}>{res.newRank}</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color: res.kachiKoshi ? GREEN : RED, fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{res.wins}W–{res.losses}L</div>
              </div>
            </div>
            <div style={{
              padding:'8px 14px', borderRadius:8, textAlign:'center',
              background: res.kachiKoshi ? 'rgba(68,204,102,0.06)' : 'rgba(232,64,64,0.06)',
              border: `1px solid ${res.kachiKoshi ? 'rgba(68,204,102,0.3)' : 'rgba(232,64,64,0.3)'}`,
            }}>
              <div style={{ color: res.kachiKoshi ? GREEN : RED, fontSize:16, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>
                {res.kachiKoshi ? '勝ち越し KACHI-KOSHI' : '負け越し MAKE-KOSHI'}
              </div>
              <div style={{ color:'#444', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>
                {res.kachiKoshi ? 'MAJORITY WINS — PROMOTED' : 'MAJORITY LOSSES — DEMOTED'}
              </div>
            </div>
          </Card>
        );
      })}
      <button onClick={() => setBashoResults(null)} style={{ width:'100%', marginTop:4, background:GOLD, color:'#0a0a0f', border:'none', borderRadius:12, padding:'14px', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:2 }}>
        RETURN TO HEYA
      </button>
    </div>
  ) : !basho ? (
    // Pre-basho lobby
    <div style={{ padding:'40px 16px 88px', textAlign:'center' }}>
      <div style={{ color:GOLD, fontSize:28, fontFamily:'Noto Serif JP,serif', fontWeight:700, marginBottom:4 }}>
        {(() => { const names = ['January','March','May','July','September','November']; const idx = BASHO_MONTHS.indexOf(stable.month); return idx !== -1 ? `${names[idx]} Basho` : 'Grand Tournament'; })()}
      </div>
      <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:2, marginBottom:8 }}>15 DAYS · RYŌGOKU KOKUGIKAN</div>
      <div style={{ color:'#555', fontSize:13, fontFamily:'Noto Serif JP,serif', marginBottom:12, lineHeight:1.6 }}>
        Your rikishi compete one bout per day. Choose a tactical approach before each fight.
      </div>
      <div style={{ margin:'0 0 28px', padding:'12px', background:'#0d0d1c', borderRadius:10, border:'1px solid #1a1a36', textAlign:'left' }}>
        <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, marginBottom:8 }}>ENTERING RIKISHI</div>
        {wrestlers.filter(w => !w.injured).slice(0, 4).map(w => (
          <div key={w.id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #141428' }}>
            <span style={{ color:'#c0c0d8', fontFamily:'Noto Serif JP,serif', fontSize:13 }}>{w.name}</span>
            <span style={{ color:'#444', fontFamily:'JetBrains Mono,monospace', fontSize:10 }}>{w.rank}</span>
          </div>
        ))}
      </div>
      <button onClick={startBasho} style={{ background:GOLD, color:'#0a0a0f', border:'none', borderRadius:12, padding:'16px 42px', fontFamily:'JetBrains Mono,monospace', fontSize:14, fontWeight:700, cursor:'pointer', letterSpacing:3 }}>
        ⛩ BEGIN BASHO
      </button>
    </div>
  ) : (
    // Active basho — day-by-day
    (() => {
      const todayBouts = basho.enteredWrestlers.map(w => ({
        w,
        entry: basho.schedule[w.id][basho.currentDay - 1],
      }));
      const allTodayDone = todayBouts.every(b => b.entry.result);
      const isLastDay = basho.currentDay === 15;

      return (
        <div style={{ padding:'12px 16px 88px' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
            <div style={{ color:GOLD, fontSize:16, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{basho.name}</div>
            <div style={{ color:GOLD, fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, letterSpacing:1 }}>DAY {basho.currentDay} / 15</div>
          </div>

          {/* 15-day progress bar */}
          <div style={{ display:'flex', gap:2, marginBottom:12 }}>
            {Array.from({length:15},(_,i) => {
              const day = basho.schedule[basho.enteredWrestlers[0]?.id]?.[i];
              const isToday = i === basho.currentDay - 1;
              const bg = day?.result === 'win' ? GREEN : day?.result === 'loss' ? RED : isToday ? GOLD : '#1a1a30';
              return <div key={i} style={{ flex:1, height: isToday ? 6 : 4, borderRadius:2, background:bg, transition:'all 0.2s' }} />;
            })}
          </div>

          {/* Per-wrestler W-L tracks */}
          {basho.enteredWrestlers.map(w => {
            const days = basho.schedule[w.id];
            const wins = days.filter(d => d.result === 'win').length;
            const losses = days.filter(d => d.result === 'loss').length;
            const completed = days.filter(d => d.result).length;
            const kachi = wins > 8 || (completed === 15 && wins > losses);
            return (
              <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'6px 10px', background:'#0d0d1c', borderRadius:8, border:'1px solid #181830' }}>
                <span style={{ color:'#8888a8', fontFamily:'Noto Serif JP,serif', fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</span>
                <div style={{ display:'flex', gap:2 }}>
                  {days.map((d,i) => (
                    <div key={i} style={{ width:7, height:7, borderRadius:1,
                      background: d.result==='win' ? GREEN : d.result==='loss' ? RED : i===basho.currentDay-1 ? 'rgba(201,168,76,0.4)' : '#1a1a30'
                    }} />
                  ))}
                </div>
                <span style={{ color: wins>losses?GREEN:losses>wins?RED:'#444', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700, minWidth:36, textAlign:'right' }}>
                  {wins}W-{losses}L
                </span>
                {kachi && <span style={{ color:GREEN, fontSize:9, fontFamily:'JetBrains Mono,monospace' }}>勝</span>}
              </div>
            );
          })}

          {/* Today's bouts */}
          <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, margin:'10px 0 8px' }}>
            TODAY'S BOUTS — DAY {basho.currentDay}
          </div>

          {todayBouts.map(({ w, entry }) => (
            <Card key={w.id} elevated={!!entry.result} selected={!entry.result} style={{ marginBottom:10, overflow:'hidden' }}>
              <div style={{ padding:'12px 14px' }}>
                {/* Matchup header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ color:GOLD, fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{w.name}</div>
                    <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{w.rank}</div>
                  </div>
                  <div style={{ color:'#2e2e50', fontFamily:'Noto Serif JP,serif', fontSize:12, alignSelf:'center', padding:'0 8px' }}>対</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:RED, fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{entry.opp.name}</div>
                    <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{entry.opp.rank}</div>
                  </div>
                </div>

                {/* Tactic selector (only if not yet resolved) */}
                {!entry.result && (
                  <>
                    <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:2, marginBottom:6 }}>CHOOSE YOUR APPROACH</div>
                    <div style={{ display:'flex', gap:5, marginBottom:10 }}>
                      {TACTIC_OPTIONS.map(t => {
                        const isChosen = entry.tactic === t.id;
                        return (
                          <button key={t.id} onClick={() => setTactic(w.id, t.id)} style={{
                            flex:1, background: isChosen ? '#12122a' : '#0a0a14',
                            border: `1px solid ${isChosen ? t.col : '#1a1a2e'}`,
                            borderRadius:8, padding:'8px 4px', cursor:'pointer',
                            boxShadow: isChosen ? `0 0 8px ${t.col}44` : 'none',
                          }}>
                            <div style={{ color: isChosen ? t.col : '#3a3a50', fontSize:10, fontFamily:'JetBrains Mono,monospace', fontWeight:700, letterSpacing:1 }}>{t.label}</div>
                            <div style={{ color:'#2e2e40', fontSize:8, fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>{t.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div style={{ display:'flex', gap:8 }}>
                  {!entry.result ? (
                    <>
                      <button onClick={() => watchDayBout(w, entry)} disabled={!entry.tactic} style={{ flex:2, background: entry.tactic ? '#12122a' : '#0a0a18', border:`1px solid ${entry.tactic?'#26265a':'#141428'}`, borderRadius:8, padding:'9px 0', color: entry.tactic ? '#7878cc' : '#2a2a40', fontFamily:'JetBrains Mono,monospace', fontSize:12, cursor: entry.tactic ? 'pointer' : 'not-allowed', fontWeight:700, letterSpacing:1 }}>
                        WATCH
                      </button>
                      <button onClick={() => autoDayBout(w, entry)} style={{ flex:1, background:'#0d0d14', border:'1px solid #1a1a24', borderRadius:8, padding:'9px 0', color:'#3a3a54', fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer', letterSpacing:1 }}>
                        AUTO
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => watchDayBout(w, entry)} style={{ flex:1, background:'#0d0d1c', border:'1px solid #1a1a30', borderRadius:8, padding:'9px 0', color:'#5050a0', fontFamily:'JetBrains Mono,monospace', fontSize:11, cursor:'pointer', letterSpacing:1 }}>REPLAY</button>
                      <div style={{ flex:2, borderRadius:8, padding:'9px 0', textAlign:'center', background: entry.result==='win'?'#0a1a0a':'#1a0a0a', border:`1px solid ${entry.result==='win'?'#2a4a2a':'#4a2a2a'}`, color: entry.result==='win'?GREEN:RED, fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, letterSpacing:2 }}>
                        {entry.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                        {entry.boutData?.kimarite && <span style={{ color:'#2a3a2a', fontSize:9, display:'block', letterSpacing:1 }}>{entry.boutData.kimarite}</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Navigation */}
          {allTodayDone && (
            isLastDay ? (
              <button onClick={endBasho} style={{ width:'100%', marginTop:8, background:GOLD, color:'#0a0a0f', border:'none', borderRadius:12, padding:'14px', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:2 }}>
                END BASHO — SEE RESULTS
              </button>
            ) : (
              <button onClick={advanceDay} style={{ width:'100%', marginTop:8, background:'#12122a', border:`1px solid ${GOLD}`, color:GOLD, borderRadius:12, padding:'14px', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:2 }}>
                DAY {basho.currentDay + 1} TOMOROW →
              </button>
            )
          )}
        </div>
      );
    })()
  );

  // ── TABS ─────────────────────────────────────────────────────
  const TABS = [
    { id:'stable', label:'HEYA',    icon:'⛩' },
    { id:'roster', label:'RIKISHI', icon:'👥' },
    { id:'train',  label:'KEIKO',   icon:'⚡' },
    { id:'scout',  label:'SCOUT',   icon:'🔭' },
    { id:'basho',  label:'BASHO',   icon:'🏆' },
  ];

  const SCREENS = { stable: StableScreen, roster: RosterScreen, train: TrainScreen, scout: ScoutScreen, basho: BashoScreen };

  return (
    <>
    <style>{`@keyframes pulseGlow{0%,100%{box-shadow:0 0 3px rgba(232,64,64,0.35)}50%{box-shadow:0 0 10px rgba(232,64,64,0.85),0 0 20px rgba(232,64,64,0.3)}}`}</style>
    <div style={{ background:'#0a0a0f', minHeight:'100vh', maxWidth:430, margin:'0 auto', fontFamily:'DM Sans,system-ui,sans-serif', position:'relative' }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,10,15,0.96)', borderBottom:'1px solid #141430', backdropFilter:'blur(12px)', padding:'10px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:GOLD, fontSize:15, fontWeight:700, fontFamily:'Noto Serif JP,serif' }}>{stable.name}</div>
            <div style={{ color:'#282848', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:2, marginTop:1 }}>
              {[stable.year, MONTHS[stable.month-1].toUpperCase(), String(stable.day).padStart(2,'0'), stable.time.toUpperCase()].map((seg, i) => (
                <span key={i} style={{ padding:'1px 5px', borderRadius:3, background:'#0d0d1c', color: i === 3 ? GOLD : '#303058', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:1, marginRight:3, border:'1px solid #181836' }}>{seg}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ color: fundsFlash === 'up' ? '#44cc66' : fundsFlash === 'down' ? '#e84040' : GOLD, fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace', transition:'color 0.15s' }}>¥{(stable.funds/1000).toFixed(0)}k</div>
              <div style={{ color:'#282848', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>FUNDS</div>
            </div>
            <button onClick={advance} style={{ background:GOLD, color:'#0a0a0f', border:'none', borderRadius:8, padding:'8px 13px', fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:1, whiteSpace:'nowrap' }}>
              稽古 ADVANCE ▶
            </button>
          </div>
        </div>
      </div>

      {/* Screen content */}
      {SCREENS[tab]}

      {/* Bottom tab bar */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:'rgba(10,10,15,0.97)', borderTop:'1px solid #141430', display:'flex', backdropFilter:'blur(12px)', paddingBottom:'env(safe-area-inset-bottom,6px)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelW(null); }} style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'8px 0 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontSize:9, fontFamily:'JetBrains Mono,monospace', color: tab===t.id ? GOLD : '#282848', letterSpacing:1, fontWeight: tab===t.id ? 700 : 400 }}>{t.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Fight Viewer modal */}
      {viewer && <FightViewer bout={viewer} onClose={() => setViewer(null)} kachiKoshi={viewer.kachiKoshi} />}
    </div>
    </>
  );
}

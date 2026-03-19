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

const PERKS = [
  { id:'iron_body',   name:'Iron Body',       icon:'🛡', desc:'+6 EFF — Endurance from relentless conditioning.',         req:{ stamina:70 },                 cost:3, effBonus:6  },
  { id:'quickstep',   name:'Quickstep',        icon:'⚡', desc:'+5 EFF — Explosive first-step at the tachiai.',            req:{ speed:70 },                   cost:3, effBonus:5  },
  { id:'iron_grip',   name:'Iron Grip',         icon:'✊', desc:'+7 EFF — Dominant belt control in grappling.',            req:{ technique:75 },               cost:4, effBonus:7  },
  { id:'mental_fort', name:'Mental Fortress',   icon:'🧠', desc:'+5 EFF — Unshakeable composure under pressure.',          req:{ mental:70 },                  cost:3, effBonus:5  },
  { id:'war_machine', name:'War Machine',        icon:'💥', desc:'+8 EFF — Overwhelming force that punishes mistakes.',     req:{ power:80 },                   cost:4, effBonus:8  },
  { id:'low_center',  name:'Low Center',         icon:'⚖', desc:'+5 EFF — Perfect balance makes throws nearly impossible.',req:{ balance:70 },                 cost:3, effBonus:5  },
  { id:'veteran',     name:'Veteran',            icon:'🎖', desc:'+4 EFF — Years of experience sharpen every response.',   req:{ age:28 },                     cost:2, effBonus:4  },
  { id:'prodigy',     name:'Prodigy',            icon:'🌟', desc:'+10 EFF — Rare talent that defies normal limits.',        req:{ growthRate:0.9, age_max:23 }, cost:5, effBonus:10 },
];

function perkMet(perk, w) {
  return Object.entries(perk.req).every(([k, v]) => {
    if (k === 'age')        return (w.age || 0) >= v;
    if (k === 'age_max')    return (w.age || 0) <= v;
    if (k === 'growthRate') return (w.hidden?.growthRate || 0) >= v;
    return (w.stats?.[k] || 0) >= v;
  });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BASHO_MONTHS = [1, 3, 5, 7, 9, 11]; // Jan, Mar, May, Jul, Sep, Nov

// ─────────────────────────────────────────────────────────────────
//  LANGUAGE / TRANSLATIONS
// ─────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  tab_stable:  { EN: 'STABLE',      JP: 'HEYA'    },
  tab_roster:  { EN: 'ROSTER',      JP: 'RIKISHI' },
  tab_train:   { EN: 'TRAIN',       JP: 'KEIKO'   },
  tab_basho:   { EN: 'TOURNAMENT',  JP: 'BASHO'   },
  kachi:       { EN: 'MAJORITY WINS',   JP: '勝ち越し' },
  make:        { EN: 'MAJORITY LOSSES', JP: '負け越し' },
  heya_status: { EN: 'STABLE STATUS',   JP: '部屋の状態' },
  rikishi_lbl: { EN: 'WRESTLERS',       JP: '力士'  },
  keiko_lbl:   { EN: 'TRAINING STYLE',  JP: '稽古スタイル' },
  heya_cult:   { EN: 'STABLE CULTURE',  JP: '部屋の風土' },
  assign_lbl:  { EN: 'TRAINING ASSIGNMENT', JP: '力士稽古' },
  vs_divider:  { EN: 'VS',              JP: '対'   },
  dohyo_lbl:   { EN: 'DOHYO · RING',    JP: '土俵' },
  advance_btn: { EN: 'ADVANCE ▶',       JP: '稽古 ADVANCE ▶' },
  scout_lbl:   { EN: 'SCOUT REPORT',    JP: 'スカウトレポート' },
};
const T = (key, lang) => TRANSLATIONS[key]?.[lang] ?? key;

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
    sp: 0, perks: [],
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
  { id:201, name:'Tanaka Yūji',    rank:'Maegashira 2',  stats:{power:80,technique:75,speed:70,balance:72,stamina:78,mental:73}, condition:{morale:80,fatigue:22,discipline:75}, kimarite:'Uwatenage',   personality:'Stoic',          sp:0, perks:[] },
  { id:202, name:'Inoue Ryōta',    rank:'Maegashira 5',  stats:{power:73,technique:78,speed:72,balance:76,stamina:70,mental:75}, condition:{morale:72,fatigue:30,discipline:68}, kimarite:'Yorikiri',    personality:'Natural Leader', sp:0, perks:[] },
  { id:203, name:'Mori Kazuhiko',  rank:'Maegashira 10', stats:{power:68,technique:65,speed:75,balance:70,stamina:66,mental:72}, condition:{morale:65,fatigue:20,discipline:70}, kimarite:'Hatakikomi',  personality:'Hothead',        sp:0, perks:[] },
  { id:204, name:'Aoki Shinnosuke',rank:'Juryo 3',       stats:{power:74,technique:68,speed:64,balance:67,stamina:72,mental:66}, condition:{morale:70,fatigue:28,discipline:72}, kimarite:'Oshidashi',   personality:'Workhorse',      sp:0, perks:[] },
  { id:205, name:'Yoshida Taiga',  rank:'Juryo 9',       stats:{power:62,technique:71,speed:78,balance:73,stamina:60,mental:80}, condition:{morale:78,fatigue:18,discipline:65}, kimarite:'Tsukiotoshi', personality:'Silent Grinder', sp:0, perks:[] },
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
  const perkBonus = (w.perks || []).reduce((sum, pid) => sum + (PERKS.find(p => p.id === pid)?.effBonus ?? 0), 0);
  return Math.max(1, base + (c.morale - 50) * 0.15 - c.fatigue * 0.2 + c.discipline * 0.05 + perkBonus);
}

// ─────────────────────────────────────────────────────────────────
//  WRESTLER VISUAL IDENTITY
// ─────────────────────────────────────────────────────────────────
const SKIN_PALETTE = [
  '#d4a574', '#c8906a', '#b07050', '#985840',
  '#c4b090', '#d8c4a8', '#b09474', '#e0c8a0',
];
const BELT_PALETTE = {
  'Workhorse':          '#1a6622',
  'Lazy Talent':        '#7722aa',
  'Hothead':            '#cc2211',
  'Natural Leader':     '#c9a84c',
  'Fragile Confidence': '#2266aa',
  'Silent Grinder':     '#334466',
  'Showboat':           '#cc5522',
  'Stoic':              '#445588',
};
function wrestlerVisuals(w) {
  if (!w) return { skin: '#c9a040', belt: '#183acc', scale: 1.0 };
  const skin  = SKIN_PALETTE[((w.id || 0) * 17 + 7) % SKIN_PALETTE.length];
  const belt  = BELT_PALETTE[w.personality] || '#2244aa';
  const mass  = ((w.stats?.power || 70) + (w.stats?.stamina || 70)) / 2;
  const scale = 0.78 + (mass / 99) * 0.44; // 0.78–1.22
  return { skin, belt, scale };
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

// HP timeline: array of [hp1, hp2] snapshots before + after each phase
const HP_DMG = { 'Tachiai': 22, 'Grip Battle': 15, 'Push & Position': 18 };
function computeHpTimeline(phases) {
  let h = [100, 100];
  return [[...h], ...phases.map(ph => {
    if (ph.name === 'Finish') {
      h[ph.winner === 'w1' ? 1 : 0] = 0;
    } else {
      const d = HP_DMG[ph.name] || 0;
      if      (ph.adv === 'w1') h[1] = Math.max(0, h[1] - d);
      else if (ph.adv === 'w2') h[0] = Math.max(0, h[0] - d);
      else { h[0] = Math.max(0, h[0] - 3); h[1] = Math.max(0, h[1] - 3); }
    }
    return [...h];
  })];
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

function drawPortraitHead(ctx, cx, cy, skin, belt, sc) {
  const OL = '#08060a';
  // Head outline + fill
  ctx.fillStyle = OL;
  ctx.beginPath(); ctx.ellipse(cx, cy, 18*sc, 16*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(cx, cy, 16.5*sc, 14.5*sc, 0, 0, Math.PI*2); ctx.fill();
  // Head highlight
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath(); ctx.ellipse(cx - 4*sc, cy - 4*sc, 8*sc, 6*sc, -0.4, 0, Math.PI*2); ctx.fill();
  // Topknot
  ctx.fillStyle = '#120810';
  ctx.beginPath(); ctx.ellipse(cx, cy - 12*sc, 6*sc, 10*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.ellipse(cx - 1*sc, cy - 14*sc, 2.5*sc, 4*sc, -0.3, 0, Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = OL;
  ctx.beginPath(); ctx.ellipse(cx - 6*sc, cy + 1*sc, 3.5*sc, 3*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 6*sc, cy + 1*sc, 3.5*sc, 3*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(cx - 5*sc, cy - 0.5*sc, sc, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 7*sc, cy - 0.5*sc, sc, 0, Math.PI*2); ctx.fill();
  // Brows (fierce)
  ctx.strokeStyle = OL; ctx.lineWidth = 2.5*sc;
  ctx.beginPath(); ctx.moveTo(cx - 9*sc, cy - 6*sc); ctx.lineTo(cx - 3*sc, cy - 4*sc); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 9*sc, cy - 6*sc); ctx.lineTo(cx + 3*sc, cy - 4*sc); ctx.stroke();
  // Shoulders outline
  ctx.fillStyle = OL;
  ctx.beginPath();
  ctx.moveTo(cx - 16*sc, cy + 18*sc); ctx.lineTo(cx + 16*sc, cy + 18*sc);
  ctx.lineTo(cx + 25*sc, cy + 38*sc); ctx.lineTo(cx - 25*sc, cy + 38*sc);
  ctx.closePath(); ctx.fill();
  // Shoulders skin
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(cx - 14*sc, cy + 18*sc); ctx.lineTo(cx + 14*sc, cy + 18*sc);
  ctx.lineTo(cx + 23*sc, cy + 36*sc); ctx.lineTo(cx - 23*sc, cy + 36*sc);
  ctx.closePath(); ctx.fill();
  // Belt stripe hint
  ctx.fillStyle = belt;
  ctx.fillRect(cx - 22*sc, cy + 28*sc, 44*sc, 7*sc);
  // Shoulder highlight
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(cx - 14*sc, cy + 18*sc); ctx.lineTo(cx + 14*sc, cy + 18*sc);
  ctx.lineTo(cx + 18*sc, cy + 26*sc); ctx.lineTo(cx - 18*sc, cy + 26*sc);
  ctx.closePath(); ctx.fill();
}

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

function segaWrestler(ctx, cx, groundY, side, pose, skin, belt,
                      scale = 1.0, fromPose = null, poseT = 1.0, isLoser = false) {
  const pc = CPOSES[pose] || CPOSES.ready;
  const fp = CPOSES[fromPose] || pc;
  const lerpVal = (a, b, t) => a + (b - a) * t;
  const pt = Math.pow(Math.max(0, Math.min(1, poseT)), 0.65);
  const [lean, lA, rA, lL, rL, tY] = pc.map((v, i) => lerpVal(fp[i], v, pt));
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
  ctx.scale(flip * scale, scale);

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

  // Brows — expression changes based on advantage state
  const strain = isLoser ? 5 : 0;    // raised when losing (strain/desperation)
  const scowl  = isLoser ? -2 : 0;   // inner end adjustment
  ctx.strokeStyle = '#0a0808'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-9, HEAD_CY - 6 + strain); ctx.lineTo(-3, HEAD_CY - 4 + strain * 0.4 + scowl); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 9, HEAD_CY - 6 + strain); ctx.lineTo( 3, HEAD_CY - 4 + strain * 0.4 + scowl); ctx.stroke();

  ctx.restore(); // lean
  ctx.restore(); // flip
}

function renderBoutFrame(ctx, W, H, phase, x1, x2, names, t = 1,
                         wrestlers = null, prevPhase = null, shake = { x: 0, y: 0 }, cheerActive = false) {
  const GY = H - 28;
  const pn = phase.name;
  const vis1 = wrestlerVisuals(wrestlers?.w1);
  const vis2 = wrestlerVisuals(wrestlers?.w2);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   '#070510');
  sky.addColorStop(0.5, '#0c0818');
  sky.addColorStop(1,   '#080514');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Crowd silhouettes — 4 rows with occasional accent spectators
  const crowdPalette = cheerActive
    ? ['#3a1a5a', '#2a3a1a', '#3a1a1a', '#2a2a1a']
    : ['#1a0d30', '#140924', '#1c0c1c', '#18101e'];
  for (let row = 0; row < 4; row++) {
    const ry = 6 + row * 18;
    const count = 18 + row * 4;
    for (let i = 0; i < count; i++) {
      const seed = (i * 7 + row * 13) % 32;
      const hx = (i * (W / count)) + (row % 2) * (W / count / 2);
      const hw = 10 + (i % 3) * 3;
      const hh = 14 + (i % 4) * 3;
      // Cheer triples the accent density; normal is 1-in-8
      const isAccent = cheerActive ? seed % 3 === 0 : seed % 8 === 0;
      ctx.fillStyle = isAccent
        ? (seed % 2 === 0 ? (cheerActive ? '#7a3a9a' : '#3a1a5a') : (cheerActive ? '#3a7a3a' : '#1a3a1a'))
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
  // Cheer: golden confetti dots floating above crowd
  if (cheerActive) {
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(201,168,76,${0.12 + (i % 4) * 0.07})`;
      ctx.beginPath();
      ctx.arc((i * 31 + 17) % W, 4 + (i * 19 % 68), 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
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

  // Scene layer — apply screen shake here (not to sky/crowd)
  ctx.save();
  ctx.translate(shake.x, shake.y);

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
  const isW1Losing = phase.adv === 'w2';
  const isW2Losing = phase.adv === 'w1';
  segaWrestler(ctx, x1, GY, 'left',  phase.pose1, vis1.skin, vis1.belt,
               vis1.scale, prevPhase?.pose1, t, isW1Losing);
  segaWrestler(ctx, x2, GY, 'right', phase.pose2, vis2.skin, vis2.belt,
               vis2.scale, prevPhase?.pose2, t, isW2Losing);

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

  ctx.restore(); // end shake layer

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.028)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

// ─────────────────────────────────────────────────────────────────
//  FIGHTER INTRO SEQUENCE RENDERER
// ─────────────────────────────────────────────────────────────────
function renderIntroFrame(ctx, W, H, step, t, vis1, vis2, w1, w2) {
  const GY = H - 28;
  const ease = 1 - Math.pow(1 - Math.min(1, t), 3);

  // Dark bg
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02010a'); bg.addColorStop(1, '#080514');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  if (step === 0 || step === 1) {
    const isW1 = step === 0;
    const vis = isW1 ? vis1 : vis2;
    const wrestler = isW1 ? w1 : w2;
    const side = isW1 ? 'left' : 'right';
    const accentHex = isW1 ? '#c9a84c' : '#e84040';

    // Belt-color side glow
    const glowX = isW1 ? 0 : W;
    const glow = ctx.createRadialGradient(glowX, H * 0.6, 10, glowX, H * 0.6, W * 0.75);
    glow.addColorStop(0, vis.belt + '30'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Wrestler slides in from the edge
    const rawSlide = isW1 ? (1 - ease) * -140 : (1 - ease) * 140;
    const drawCX = isW1 ? W * 0.32 + rawSlide : W * 0.68 + rawSlide;
    ctx.save();
    ctx.translate(drawCX, 14);
    ctx.scale(1.45, 1.45);
    segaWrestler(ctx, 0, GY / 1.45, side, 'ready', vis.skin, vis.belt, 1.0, null, 1.0, false);
    ctx.restore();

    // Horizontal accent line
    ctx.globalAlpha = ease * 0.7;
    ctx.fillStyle = accentHex;
    ctx.fillRect(W * 0.08, H * 0.73, W * 0.84, 1);
    ctx.globalAlpha = 1;

    // Name text
    ctx.save();
    ctx.globalAlpha = ease;
    const nameSlide = isW1 ? (1 - ease) * -60 : (1 - ease) * 60;
    const nameX = W * 0.5 + nameSlide;
    ctx.font = 'bold 16px "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ece8d8';
    ctx.fillText(wrestler.name, nameX, H * 0.72);
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = accentHex;
    ctx.letterSpacing = '3px';
    ctx.fillText(wrestler.rank.toUpperCase(), nameX, H * 0.80);
    ctx.restore();

  } else {
    // VS screen — both wrestlers + VS text
    ctx.save();
    ctx.translate(W * 0.27, 14);
    ctx.scale(1.1, 1.1);
    segaWrestler(ctx, 0, GY / 1.1, 'left',  'ready', vis1.skin, vis1.belt, 1.0, null, 1.0, false);
    ctx.restore();

    ctx.save();
    ctx.translate(W * 0.73, 14);
    ctx.scale(1.1, 1.1);
    segaWrestler(ctx, 0, GY / 1.1, 'right', 'ready', vis2.skin, vis2.belt, 1.0, null, 1.0, false);
    ctx.restore();

    // VS flash — pulse
    const pulse = 0.08 + Math.abs(Math.sin(t * Math.PI * 5)) * 0.08;
    ctx.fillStyle = `rgba(201,168,76,${pulse})`;
    ctx.fillRect(0, 0, W, H);

    // VS text
    ctx.save();
    ctx.globalAlpha = Math.min(1, ease * 1.6);
    ctx.font = 'bold 40px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9a84c';
    ctx.shadowColor = '#c9a84c'; ctx.shadowBlur = 18 * ease;
    ctx.fillText('VS', W / 2, H / 2 + 16);
    ctx.shadowBlur = 0;

    // Name strip at bottom
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#c9a84c';
    ctx.textAlign = 'left';
    ctx.fillText(w1.name.toUpperCase().slice(0, 14), W * 0.06, H - 22);
    ctx.fillStyle = '#e84040';
    ctx.textAlign = 'right';
    ctx.fillText(w2.name.toUpperCase().slice(0, 14), W * 0.94, H - 22);
    ctx.restore();
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.032)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

function WrestlerPortrait({ wrestler, side, style: styleProp = {} }) {
  const cvRef = useRef(null);
  const vis = wrestlerVisuals(wrestler);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    // Dark background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0d20'); bg.addColorStop(1, '#070712');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Subtle vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    // Portrait head
    drawPortraitHead(ctx, W / 2, H * 0.46, vis.skin, vis.belt, 1.85);
    // Accent bar bottom
    ctx.fillStyle = side === 'left' ? 'rgba(201,168,76,0.8)' : 'rgba(232,64,64,0.8)';
    ctx.fillRect(0, H - 2, W, 2);
  }, [wrestler]);

  return (
    <canvas
      ref={cvRef}
      width={68} height={82}
      style={{ width: 54, height: 66, borderRadius: 6, border: '1px solid #1c1c36', flexShrink: 0, display: 'block', ...styleProp }}
    />
  );
}

function IntroCanvas({ w1, w2, step, t }) {
  const cvRef = useRef(null);
  const vis1 = wrestlerVisuals(w1);
  const vis2 = wrestlerVisuals(w2);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    renderIntroFrame(ctx, cv.width, cv.height, step, t, vis1, vis2, w1, w2);
  });
  return <canvas ref={cvRef} width={430} height={272} style={{ width: '100%', display: 'block' }} />;
}

function BoutCanvas({ phases, currentPhase, names, wrestlers, cheerActiveRef }) {
  const cvRef       = useRef(null);
  const posRef      = useRef(null);
  const rafRef      = useRef(null);
  const prevPhaseRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const cur = phases[currentPhase];
    const prevPhase = prevPhaseRef.current;
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

      // Impact shake — decays over first 30% of animation
      const pn = cur.name;
      const shakeMag = t < 0.30 && (pn === 'Tachiai' || pn === 'Finish')
        ? (0.30 - t) * (pn === 'Finish' ? 32 : 20)
        : 0;
      const shake = {
        x: shakeMag > 0 ? (Math.random() - 0.5) * shakeMag : 0,
        y: shakeMag > 0 ? (Math.random() - 0.5) * shakeMag * 0.35 : 0,
      };

      renderBoutFrame(ctx, W, H, cur, x1, x2, names, e, wrestlers, prevPhase, shake, cheerActiveRef?.current ?? false);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    prevPhaseRef.current = cur;
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentPhase, phases, names, wrestlers]);

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
//  SOUND SYSTEM
// ─────────────────────────────────────────────────────────────────
function useSoundSystem(muted) {
  const acRef      = useRef(null);
  const themeTimer = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; clearTimeout(themeTimer.current); }; }, []);

  const getAC = () => {
    try {
      if (!acRef.current || acRef.current.state === 'closed') {
        acRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (acRef.current.state === 'suspended') acRef.current.resume();
      return acRef.current;
    } catch (_) { return null; }
  };

  const playTone = (freq, type = 'square', vol = 0.2, dur = 0.18, when = 0) => {
    if (muted) return;
    const ac = getAC(); if (!ac) return;
    const t = when || ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
    osc.start(t); osc.stop(t + dur + 0.02);
  };

  const playImpact = () => {
    if (muted) return;
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.connect(g); g.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.38);
    g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.start(t); osc.stop(t + 0.42);
    playTone(880, 'square', 0.12, 0.07, t);
  };

  const playVictory = () => {
    if (muted) return;
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    [293, 369, 440, 587].forEach((f, i) => playTone(f, 'square', 0.22, 0.2, t + i * 0.13));
    setTimeout(() => { const ac2 = getAC(); if (ac2) playTone(880, 'square', 0.18, 0.45, ac2.currentTime); }, 600);
  };

  const playCheerSfx = () => {
    if (muted) return;
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    [220, 277, 330, 440, 523].forEach((f, i) => playTone(f, 'sine', 0.11, 0.35, t + i * 0.055));
    playTone(659, 'sine', 0.14, 0.5, t + 0.28);
  };

  // Fight theme — D minor, 16-step square-wave loop
  const THEME_NOTES = [
    [293,1],[0,0.5],[440,0.5],[523,1],[587,0.5],[523,0.5],
    [440,1],[349,0.5],[0,0.5],[392,0.5],[440,0.5],[0,0.5],
    [293,1.5],[0,0.5],[220,1],[0,1],
  ];
  const BEAT_SEC = 0.13;
  useEffect(() => {
    if (muted) { clearTimeout(themeTimer.current); return; }
    let nextTime = (getAC()?.currentTime ?? 0) + 0.1;
    let step = 0;
    const schedule = () => {
      if (!mountedRef.current) return;
      const ac = getAC(); if (!ac) return;
      while (nextTime < ac.currentTime + 1.5) {
        const [freq, beats] = THEME_NOTES[step % THEME_NOTES.length];
        if (freq > 0) playTone(freq, 'square', 0.13, beats * BEAT_SEC * 0.80, nextTime);
        nextTime += beats * BEAT_SEC;
        step++;
      }
      themeTimer.current = setTimeout(schedule, 400);
    };
    schedule();
    return () => clearTimeout(themeTimer.current);
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  return { playImpact, playVictory, playCheerSfx };
}

// ─────────────────────────────────────────────────────────────────
//  FIGHT VIEWER
// ─────────────────────────────────────────────────────────────────
const PHASE_DURATIONS = {
  Shikiri: 3000, Tachiai: 1700, 'Grip Battle': 2400, 'Push & Position': 2000, Finish: 4200,
};
const INTRO_DURATIONS = [1400, 1400, 1000]; // ms for w1-enter, w2-enter, vs-screen

function FightViewer({ bout, onClose, kachiKoshi, lang = 'EN' }) {
  const [phase, setPhase] = useState(0);
  const timerRef  = useRef(null);

  // Intro sequence state
  const [introStep, setIntroStep] = useState(0); // 0=w1, 1=w2, 2=vs, 3=done
  const [introT,    setIntroT]    = useState(0);
  const introRafRef = useRef(null);

  // Cheer state
  const [cheerActive, setCheerActive] = useState(false);
  const cheerActiveRef = useRef(false);
  const cheerTimerRef  = useRef(null);

  // Sound & mute
  const [muted, setMuted] = useState(false);
  const { playImpact, playVictory, playCheerSfx } = useSoundSystem(muted);

  // HP timeline
  const hpTimeline = computeHpTimeline(bout.phases);

  const cur    = bout.phases[phase];
  const isLast = phase === bout.phases.length - 1;
  const [hp1, hp2] = hpTimeline[phase] ?? [100, 100];

  // ── Intro RAF loop ─────────────────────────────────────────────
  useEffect(() => {
    let step = 0, startMs = performance.now();
    const loop = (now) => {
      const elapsed = now - startMs;
      const t = Math.min(1, elapsed / INTRO_DURATIONS[step]);
      setIntroT(t);
      setIntroStep(step);
      if (t < 1) { introRafRef.current = requestAnimationFrame(loop); return; }
      if (step < 2) { step++; startMs = now; introRafRef.current = requestAnimationFrame(loop); }
      else setIntroStep(3);
    };
    introRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(introRafRef.current);
  }, []);

  // ── Phase auto-advance ─────────────────────────────────────────
  useEffect(() => {
    if (introStep < 3) return; // wait for intro
    if (isLast) { clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(
      () => setPhase(p => {
        const next = Math.min(p + 1, bout.phases.length - 1);
        const nextPhase = bout.phases[next];
        if (nextPhase.name === 'Tachiai') playImpact();
        if (nextPhase.name === 'Finish')  { nextPhase.winner === 'w1' ? playVictory() : playImpact(); }
        return next;
      }),
      PHASE_DURATIONS[cur.name] ?? 2400
    );
    return () => clearTimeout(timerRef.current);
  }, [phase, isLast, introStep, bout.phases.length, cur.name]);

  const advanceFight = () => {
    if (introStep < 3) { setIntroStep(3); cancelAnimationFrame(introRafRef.current); return; }
    if (isLast) { onClose(); return; }
    clearTimeout(timerRef.current);
    setPhase(p => {
      const next = Math.min(p + 1, bout.phases.length - 1);
      const nextPhase = bout.phases[next];
      if (nextPhase.name === 'Tachiai') playImpact();
      if (nextPhase.name === 'Finish')  { nextPhase.winner === 'w1' ? playVictory() : playImpact(); }
      return next;
    });
  };

  const onCheer = (e) => {
    e.stopPropagation();
    if (cheerActive) return;
    setCheerActive(true);
    cheerActiveRef.current = true;
    playCheerSfx();
    clearTimeout(cheerTimerRef.current);
    cheerTimerRef.current = setTimeout(() => {
      setCheerActive(false);
      cheerActiveRef.current = false;
    }, 1800);
  };

  const advColor = cur.adv === 'w1' ? '#c9a84c' : cur.adv === 'w2' ? '#e84040' : '#666';
  const advName  = cur.adv === 'w1' ? bout.w1.name : cur.adv === 'w2' ? bout.w2.name : null;

  const GOLD = '#c9a84c', RED = '#e84040';

  return (
    <div onClick={advanceFight} style={{ position:'fixed', inset:0, zIndex:200, background:'#07060e', overflowY:'auto', display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}>

      {/* Cheer glow overlay */}
      {cheerActive && introStep >= 3 && (
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'rgba(100,60,10,0.12)', zIndex:201, mixBlendMode:'screen' }} />
      )}

      {/* Header */}
      <div style={{ width:'100%', maxWidth:430, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px 8px' }}>
        <span style={{ color:GOLD, fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:3, fontWeight:700 }}>
          DOHYŌ · {T('dohyo_lbl', lang)}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
                  style={{ background:'none', border:'none', color:muted?'#555':'#777', fontSize:17, cursor:'pointer', padding:'2px 6px', lineHeight:1 }}>
            {muted ? '🔇' : '🔊'}
          </button>
          <span onClick={e => { e.stopPropagation(); onClose(); }} style={{ color:'#444', fontSize:22, lineHeight:1, cursor:'pointer' }}>✕</span>
        </div>
      </div>

      {/* Wrestler nameplates with portraits */}
      <div style={{ width:'100%', maxWidth:430, display:'flex', justifyContent:'space-between', alignItems:'flex-end', padding:'0 12px 6px', gap:8 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, flex:1 }}>
          <WrestlerPortrait wrestler={bout.w1} side="left" />
          <div>
            <div style={{ color:GOLD, fontFamily:'Noto Serif JP,serif', fontSize:13, fontWeight:700, lineHeight:1.2 }}>{bout.w1.name}</div>
            <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:1 }}>{bout.w1.rank}</div>
            <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:9 }}>EFF {Math.round(bout.e1)}</div>
            <div style={{ width:6, height:6, borderRadius:'50%', background: PERSONALITY_COLORS[bout.w1.personality] || '#555', marginTop:3 }} />
          </div>
        </div>
        <div style={{ color:'#1a1a30', fontFamily:'Noto Serif JP,serif', fontSize:18, paddingBottom:6 }}>{T('vs_divider', lang)}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, flex:1, flexDirection:'row-reverse' }}>
          <WrestlerPortrait wrestler={bout.w2} side="right" />
          <div style={{ textAlign:'right' }}>
            <div style={{ color:RED, fontFamily:'Noto Serif JP,serif', fontSize:13, fontWeight:700, lineHeight:1.2 }}>{bout.w2.name}</div>
            <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:1 }}>{bout.w2.rank}</div>
            <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:9 }}>EFF {Math.round(bout.e2)}</div>
            <div style={{ width:6, height:6, borderRadius:'50%', background: PERSONALITY_COLORS[bout.w2.personality] || '#555', marginTop:3, marginLeft:'auto' }} />
          </div>
        </div>
      </div>

      {/* HP Bars — Street Fighter style */}
      {introStep >= 3 && (
        <div style={{ width:'100%', maxWidth:430, padding:'0 14px 6px', display:'flex', gap:6, alignItems:'center' }}>
          <div style={{ flex:1, height:10, background:'#0a0918', borderRadius:5, border:'1px solid #1a1a30', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${hp1}%`,
                          background: hp1 > 40 ? '#44cc66' : hp1 > 15 ? '#e8a840' : '#e84040',
                          borderRadius:5, transition:'width 0.55s ease-out',
                          boxShadow: hp1 <= 15 ? '0 0 8px #e84040' : 'none' }} />
          </div>
          <div style={{ color:'#252540', fontSize:8, fontFamily:'JetBrains Mono,monospace', letterSpacing:1, flexShrink:0 }}>HP</div>
          <div style={{ flex:1, height:10, background:'#0a0918', borderRadius:5, border:'1px solid #1a1a30', overflow:'hidden', transform:'scaleX(-1)' }}>
            <div style={{ height:'100%', width:`${hp2}%`,
                          background: hp2 > 40 ? '#4488cc' : hp2 > 15 ? '#e8a840' : '#e84040',
                          borderRadius:5, transition:'width 0.55s ease-out',
                          boxShadow: hp2 <= 15 ? '0 0 8px #e84040' : 'none' }} />
          </div>
        </div>
      )}

      {/* Arena canvas — intro or fight */}
      {introStep < 3
        ? <IntroCanvas w1={bout.w1} w2={bout.w2} step={introStep} t={introT} />
        : <BoutCanvas phases={bout.phases} currentPhase={phase}
                      names={{ n1: bout.w1.name, n2: bout.w2.name }}
                      wrestlers={{ w1: bout.w1, w2: bout.w2 }}
                      cheerActiveRef={cheerActiveRef} />
      }

      {/* Phase progress dots */}
      {introStep >= 3 && (
        <div style={{ display:'flex', gap:6, padding:'12px 0 4px' }}>
          {bout.phases.map((_, i) => (
            <div key={i} style={{ width:i === phase ? 22 : 8, height:6, borderRadius:3, background: i <= phase ? advColor : '#1a1a2e', transition:'all 0.3s' }} />
          ))}
        </div>
      )}

      {/* Cheer button */}
      {introStep >= 3 && !isLast && (
        <button onClick={onCheer} style={{
          background: cheerActive ? GOLD : '#0d0c1c',
          color: cheerActive ? '#0a0a0f' : '#3a3a60',
          border: `1px solid ${cheerActive ? GOLD : '#1a1a36'}`,
          borderRadius: 20, padding: '6px 24px',
          fontFamily: 'Noto Serif JP,serif', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 2, marginTop: 4,
          boxShadow: cheerActive ? `0 0 18px ${GOLD}` : 'none',
          transition: 'all 0.15s',
        }}>
          {cheerActive ? '🔥 応援中！' : '👊 GANBARE!'}
        </button>
      )}

      {/* Phase label */}
      {introStep >= 3 && (
        <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:3, marginTop:8, marginBottom:4 }}>{cur.name.toUpperCase()}</div>
      )}

      {/* Advantage chip */}
      {introStep >= 3 && (
        <div style={{ color: advColor, fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:10, minHeight:18 }}>
          {advName ? `▶ ${advName}` : '— EVEN —'}
        </div>
      )}

      {/* Commentary */}
      {introStep >= 3 && (
        <div style={{ maxWidth:370, width:'92%', background:'#0c0b18', border:'1px solid #1a1836', borderRadius:12, padding:'14px 18px', marginBottom:14, minHeight:64, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <p style={{ color:'#c8c4d8', fontFamily:'Noto Serif JP,serif', fontSize:14, lineHeight:1.6, margin:0, textAlign:'center' }}>{cur.text}</p>
        </div>
      )}

      {/* Kachi-koshi overlay */}
      {introStep >= 3 && isLast && kachiKoshi && cur.winner === 'w1' && (
        <div style={{ maxWidth:370, width:'92%', background:'linear-gradient(135deg,#0c1a08,#0a1408)', border:'1px solid rgba(68,204,102,0.5)', borderRadius:12, padding:'14px', marginBottom:10, textAlign:'center', boxShadow:'0 0 24px rgba(68,204,102,0.15)' }}>
          <div style={{ color:GREEN, fontSize:22, fontFamily:'Noto Serif JP,serif', fontWeight:700, letterSpacing:2 }}>{T('kachi', lang)}</div>
          <div style={{ color:'#2a5a2a', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:4 }}>KACHI-KOSHI · MAJORITY WINS</div>
        </div>
      )}

      {/* Kimarite flash */}
      {introStep >= 3 && isLast && (
        <div style={{ fontFamily:'Noto Serif JP,serif', fontSize:18, fontWeight:700,
                      color: cur.winner==='w1' ? GOLD : RED,
                      letterSpacing:3, marginBottom:6, textAlign:'center' }}>
          {cur.kimarite?.toUpperCase()}
        </div>
      )}

      {/* Finish highlight card */}
      {introStep >= 3 && isLast && (
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

      {introStep < 3 && (
        <div style={{ color:'#282840', fontSize:11, fontFamily:'JetBrains Mono,monospace', paddingBottom:24, paddingTop:8 }}>TAP TO SKIP INTRO</div>
      )}
      {introStep >= 3 && !isLast && (
        <div style={{ color:'#282840', fontSize:11, fontFamily:'JetBrains Mono,monospace', paddingBottom:24 }}>TAP TO ADVANCE · AUTO-ADVANCING</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COLOUR HELPERS & SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
const GOLD = '#c9a84c', RED = '#e84040', GREEN = '#44cc66', ORANGE = '#e8a840';

// ── FM Design Tokens ──────────────────────────────────────────────
const FM_BG      = '#0b0f19';   // main background — very dark navy
const FM_SURFACE = '#111827';   // card surface
const FM_SURFACE2= '#1a2235';   // elevated / selected surface
const FM_BORDER  = '#1e2a3a';   // subtle border
const FM_BORDER2 = '#263044';   // slightly visible border
const FM_ACCENT  = '#3b82f6';   // primary interactive blue
const FM_INDIGO  = '#6366f1';   // secondary accent indigo
const FM_GREEN   = '#10b981';   // positive metrics
const FM_AMBER   = '#f59e0b';   // caution / warning
const FM_RED     = '#ef4444';   // negative / danger
const FM_TEXT    = '#e2e8f0';   // primary text
const FM_TEXT2   = '#94a3b8';   // secondary text
const FM_TEXT3   = '#475569';   // muted text

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
  const grad = val > 85
    ? `linear-gradient(90deg,${FM_GREEN}88,${FM_GREEN})`
    : val > 65
    ? `linear-gradient(90deg,${FM_ACCENT}88,${FM_ACCENT})`
    : val > 40
    ? `linear-gradient(90deg,${FM_INDIGO}88,${FM_INDIGO})`
    : `linear-gradient(90deg,${FM_TEXT3}55,${FM_TEXT3}88)`;
  return (
    <div style={{ height:4, background:FM_BORDER, borderRadius:2, flex:1, position:'relative' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:grad, borderRadius:2, transition:'width 0.3s' }} />
      {[25, 50, 75].map(t => (
        <div key={t} style={{ position:'absolute', top:0, left:`${t}%`, width:1, height:'100%', background:'rgba(255,255,255,0.05)' }} />
      ))}
    </div>
  );
}

function CondBar({ stat, val }) {
  const isFatigue = stat === 'fatigue';
  const col = isFatigue
    ? (val > 70 ? FM_RED : val > 40 ? FM_AMBER : FM_GREEN)
    : (val > 70 ? FM_GREEN : val > 40 ? FM_AMBER : FM_RED);
  const grad = isFatigue
    ? (val > 70 ? `linear-gradient(90deg,${FM_RED}88,${FM_RED})` : val > 40 ? `linear-gradient(90deg,${FM_AMBER}88,${FM_AMBER})` : `linear-gradient(90deg,${FM_GREEN}88,${FM_GREEN})`)
    : (val > 70 ? `linear-gradient(90deg,${FM_GREEN}88,${FM_GREEN})` : val > 40 ? `linear-gradient(90deg,${FM_AMBER}88,${FM_AMBER})` : `linear-gradient(90deg,${FM_RED}88,${FM_RED})`);
  const critFatigue = isFatigue && val > 75;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:FM_TEXT3, fontSize:11, fontFamily:'DM Sans,system-ui,sans-serif', textTransform:'capitalize' }}>{stat}</span>
        <span style={{ color:col, fontSize:11, fontFamily:'DM Sans,system-ui,sans-serif', fontWeight:600 }}>{Math.round(val)}</span>
      </div>
      <div style={{ height:5, background:FM_BORDER, borderRadius:3, position:'relative', outline: critFatigue ? `1px solid ${FM_RED}55` : 'none' }}>
        <div style={{ height:'100%', width:`${val}%`, background:grad, borderRadius:3, transition:'width 0.35s', animation: critFatigue ? 'pulseGlow 1.1s ease-in-out infinite' : 'none' }} />
        {[25, 50, 75].map(t => (
          <div key={t} style={{ position:'absolute', top:0, left:`${t}%`, width:1, height:'100%', background:'rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    </div>
  );
}

function Card({ children, style, selected, elevated }) {
  const shadow = selected
    ? `0 0 0 1px ${FM_ACCENT}55, 0 4px 22px rgba(0,0,0,0.55)`
    : elevated
    ? '0 2px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.025)'
    : '0 1px 6px rgba(0,0,0,0.4)';
  return (
    <div style={{ background: elevated ? FM_SURFACE2 : FM_SURFACE, borderRadius:10, border:`1px solid ${selected ? FM_ACCENT+'66' : FM_BORDER}`, boxShadow:shadow, ...style }}>
      {children}
    </div>
  );
}

function Section({ label, children, accent }) {
  const accentColor = accent || FM_ACCENT;
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px 8px' }}>
        <div style={{ width:2, height:14, background:`linear-gradient(180deg,${accentColor},${accentColor}00)`, borderRadius:1, flexShrink:0 }} />
        <span style={{ color:FM_TEXT3, fontFamily:'DM Sans,system-ui,sans-serif', fontSize:10, letterSpacing:2, fontWeight:600, textTransform:'uppercase' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]         = useState('EN');
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

      // SP earning from training — intensive/focused policies reward more
      const spChance = pol.id === 'light' ? 0 : pol.id === 'intensive' ? 0.28 : (pol.id === 'power' || pol.id === 'technique') ? 0.18 : 0.12;
      const newSP = Math.random() < spChance * w.hidden.growthRate ? (w.sp || 0) + 1 : (w.sp || 0);

      return { ...w, stats: newStats, condition: { morale: mor, fatigue: fat, discipline: disc }, injured, injuryDays, sp: newSP };
    }));

    // Rare heya events
    if (Math.random() < 0.12) {
      const rikishi = wrestlers.length > 0 ? wrestlers[ri(0, wrestlers.length - 1)].name : 'A rikishi';
      const picks = [
        `${rikishi} showed exceptional tachiai explosiveness during morning keiko.`,
        `A corporate sponsor has made enquiries about the heya. Funds may follow.`,
        `A senior gyōji visited to observe training — the rikishi performed with pride.`,
        `${rikishi} was praised by the shisho for discipline in shiko drills.`,
        `Word has spread in sumo circles about ${rikishi}'s kimarite skill.`,
        `A rival oyakata was seen observing keiko from outside the heya gates.`,
        `The heya dohyō was freshly resurfaced — spirits are high this morning.`,
        `${rikishi} trained late into the evening by lamplight. Dedication noted.`,
        `A former makuuchi rikishi stopped by to offer technique advice.`,
        `${rikishi} demonstrated flawless mawashi form in today's butsukari-geiko.`,
        `Fan letters from the prefecture have arrived — the heya's fame is growing.`,
        `A local newspaper featured the heya — recruitment interest is expected.`,
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
    const HONBASHO_NAMES = ['Hatsu 初場所','Haru 春場所','Natsu 夏場所','Nagoya 名古屋場所','Aki 秋場所','Kyushu 九州場所'];
    const bashoIdx  = BASHO_MONTHS.indexOf(stable.month);
    const bashoName = bashoIdx !== -1 ? HONBASHO_NAMES[bashoIdx] : 'Grand Tournament';
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
    // Award 1 SP for a win
    if (bd.winner === 'w1' && !entry.result) {
      setWrestlers(prev => prev.map(wr => wr.id === w.id ? { ...wr, sp: (wr.sp || 0) + 1 } : wr));
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
    // Award 1 SP for a win
    if (bd.winner === 'w1') {
      setWrestlers(prev => prev.map(wr => wr.id === w.id ? { ...wr, sp: (wr.sp || 0) + 1 } : wr));
    }
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
      const kachiBonus = res.kachiKoshi ? 2 : 0;
      return { ...w, rank: res.newRank, record: newRecord, streak: newStreak, sp: (w.sp || 0) + kachiBonus };
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
    <div style={{ paddingBottom:32 }}>

      {/* ── Metric tiles ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, padding:'12px 14px 0' }}>
        {[
          { label:'SQUAD',    val: wrestlers.length,                          color: FM_ACCENT },
          { label:'INJURED',  val: wrestlers.filter(w=>w.injured).length,     color: wrestlers.filter(w=>w.injured).length > 0 ? FM_RED : FM_TEXT3 },
          { label:'REP',      val: stable.reputation,                         color: FM_AMBER },
          { label:'AVG EFF',  val: Math.round(wrestlers.reduce((s,w)=>s+calcEffective(w),0)/Math.max(1,wrestlers.length)), color: FM_GREEN },
        ].map(x => (
          <div key={x.label} style={{ background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}`, padding:'8px 6px', textAlign:'center' }}>
            <div style={{ color:x.color, fontSize:20, fontWeight:700, lineHeight:1 }}>{x.val}</div>
            <div style={{ color:FM_TEXT3, fontSize:8, letterSpacing:1, marginTop:3 }}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* ── Basho countdown ──────────────────────────── */}
      {(() => {
        const HATSU_NAMES = ['Hatsu 初場所','Haru 春場所','Natsu 夏場所','Nagoya 名古屋場所','Aki 秋場所','Kyushu 九州場所'];
        const HATSU_VENUES = ['Ryōgoku Kokugikan, Tokyo','EDION Arena, Osaka','Ryōgoku Kokugikan, Tokyo','Dolphins Arena, Nagoya','Ryōgoku Kokugikan, Tokyo','Marine Messe, Fukuoka'];
        const nextBashoIdx = BASHO_MONTHS.findIndex(m => m > stable.month) !== -1
          ? BASHO_MONTHS.findIndex(m => m > stable.month)
          : 0;
        const nextBashoMonth = BASHO_MONTHS[nextBashoIdx];
        const daysUntil = (nextBashoMonth - stable.month) * 30 + (1 - stable.day);
        const isBashoMonth = BASHO_MONTHS.includes(stable.month);
        return (
          <div style={{ margin:'10px 14px 0', padding:'10px 14px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${isBashoMonth ? FM_AMBER+'55' : FM_BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:FM_TEXT, fontSize:13, fontWeight:600 }}>{HATSU_NAMES[nextBashoIdx]}</div>
              <div style={{ color:FM_TEXT3, fontSize:10, marginTop:1 }}>{HATSU_VENUES[nextBashoIdx]}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              {isBashoMonth
                ? <div style={{ color:FM_GREEN, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:FM_GREEN, display:'inline-block' }} />LIVE NOW</div>
                : <div><div style={{ color:FM_AMBER, fontSize:16, fontWeight:700 }}>{Math.max(0, daysUntil)}</div><div style={{ color:FM_TEXT3, fontSize:9 }}>days away</div></div>
              }
            </div>
          </div>
        );
      })()}

      {/* ── Squad command center ──────────────────────── */}
      <Section label="SQUAD STATUS">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'0 14px' }}>
          {wrestlers.map(w => {
            const eff = Math.round(calcEffective(w));
            const hasSP       = (w.sp || 0) > 0;
            const overTrained = w.condition.fatigue > 72;
            const lowMorale   = w.condition.morale < 42;
            const alert = w.injured ? 'INJURED' : overTrained ? 'OVERTRAINED' : lowMorale ? 'LOW MORALE' : hasSP ? `${w.sp} SP READY` : null;
            const alertColor  = w.injured || overTrained ? FM_RED : lowMorale ? FM_AMBER : FM_AMBER;
            const borderColor = hasSP ? `${FM_AMBER}55` : w.injured ? `${FM_RED}44` : overTrained ? `${FM_AMBER}33` : FM_BORDER;
            return (
              <div key={w.id} onClick={() => { setTab('roster'); setSelW(w); }}
                style={{ background:FM_SURFACE, borderRadius:8, padding:'10px', cursor:'pointer', border:`1px solid ${borderColor}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:6 }}>
                  <WrestlerPortrait wrestler={w} side="left" style={{ width:36, height:44, flexShrink:0, borderRadius:5, border:`1px solid ${FM_BORDER2}` }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:FM_TEXT, fontSize:11, fontWeight:600, lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</div>
                    <div style={{ color:FM_TEXT3, fontSize:9, marginTop:1 }}>{w.rank}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                      <span style={{ color: w.injured ? FM_RED : FM_ACCENT, fontSize:16, fontWeight:700 }}>{eff}</span>
                      <span style={{ color:FM_TEXT3, fontSize:8 }}>EFF</span>
                    </div>
                  </div>
                </div>
                {/* Fatigue bar */}
                <div style={{ height:3, background:FM_BORDER, borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ height:'100%', width:`${w.condition.fatigue}%`, background: overTrained ? FM_RED : FM_AMBER, borderRadius:2 }} />
                </div>
                {alert && (
                  <div style={{ color:alertColor, fontSize:9, fontWeight:600, letterSpacing:0.5 }}>{alert} ›</div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Smart Alerts ─────────────────────────────── */}
      {(() => {
        const alerts = [];
        wrestlers.forEach(w => {
          if (w.condition.fatigue > 72 && !w.injured)
            alerts.push({ type:'warning', icon:'⚠', text:`${w.name}'s fatigue is critical (${Math.round(w.condition.fatigue)}). Switch to Butsukari-geiko.`, action: () => { setWrestlerPolicies(p => ({...p, [w.id]:'light'})); setTab('train'); } });
          if ((w.sp || 0) > 0)
            alerts.push({ type:'sp', icon:'▲', text:`${w.name} has ${w.sp} stat point${w.sp>1?'s':''} to allocate.`, action: () => { setTab('roster'); setSelW(w); } });
          if (w.condition.morale < 38 && !w.injured)
            alerts.push({ type:'warning', icon:'↓', text:`${w.name}'s morale is low (${Math.round(w.condition.morale)}). Consider Lenient culture.`, action: () => setTab('train') });
        });
        if (alerts.length === 0) return null;
        return (
          <Section label={`ACTIONS (${alerts.length})`} accent={FM_AMBER}>
            {alerts.slice(0, 4).map((a, i) => (
              <div key={i} onClick={a.action}
                style={{ margin:'0 14px 6px', padding:'10px 12px', background:FM_SURFACE, borderRadius:8,
                         borderLeft:`3px solid ${a.type==='sp' ? FM_ACCENT : FM_AMBER}`, cursor:'pointer',
                         display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{a.icon}</span>
                <p style={{ color:FM_TEXT2, fontSize:12, lineHeight:1.4, margin:0, flex:1 }}>{a.text}</p>
                <span style={{ color:FM_TEXT3, fontSize:14, flexShrink:0 }}>›</span>
              </div>
            ))}
          </Section>
        );
      })()}

      {/* ── Inbox ────────────────────────────────────── */}
      <Section label={`INBOX (${events.length})`}>
        {events.length === 0 && <div style={{ color:FM_TEXT3, fontSize:13, fontStyle:'italic', padding:'12px 16px' }}>No recent events.</div>}
        {events.map(ev => (
          <div key={ev.id} style={{ margin:'0 14px 6px', padding:'10px 12px', background:FM_SURFACE, borderRadius:8, borderLeft:`3px solid ${ev.type==='error'?FM_RED:ev.type==='warning'?FM_AMBER:FM_ACCENT}` }}>
            <p style={{ color:FM_TEXT2, fontSize:12, lineHeight:1.5, margin:0 }}>{ev.text}</p>
          </div>
        ))}
      </Section>
    </div>
  );

  // Squad screen sub-tab state (defined here since it's local to roster screen)
  const [squadTab, setSquadTab] = useState('overview'); // 'overview' | 'attrs' | 'perks'

  const RosterScreen = selW ? (() => {
    // ── Wrestler detail view ──────────────────────────────────────
    const eff = Math.round(calcEffective(selW));
    const SUB_TABS = [{ id:'overview', label:'OVERVIEW' }, { id:'attrs', label:'ATTRIBUTES' }, { id:'perks', label:'PERKS' }];
    return (
      <div style={{ paddingBottom:32 }}>
        {/* Back + header */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:FM_SURFACE, borderBottom:`1px solid ${FM_BORDER}` }}>
          <button onClick={() => setSelW(null)} style={{ background:FM_BORDER2, border:'none', color:FM_TEXT2, borderRadius:6, padding:'5px 10px', fontSize:11, cursor:'pointer' }}>← SQUAD</button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:FM_TEXT, fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selW.name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
              <RankBadge rank={selW.rank} size={12} />
              <span style={{ color:FM_TEXT3, fontSize:10 }}>{selW.rank} · Age {selW.age}</span>
              {selW.injured && <span style={{ color:FM_RED, fontSize:9, fontWeight:600 }}>⚠ INJURED {selW.injuryDays}d</span>}
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color: selW.injured ? FM_RED : FM_ACCENT, fontSize:22, fontWeight:700 }}>{eff}</div>
            <div style={{ color:FM_TEXT3, fontSize:9 }}>EFF</div>
          </div>
        </div>

        {/* Sub-tab strip */}
        <div style={{ display:'flex', background:FM_SURFACE, borderBottom:`1px solid ${FM_BORDER}` }}>
          {SUB_TABS.map(st => (
            <button key={st.id} onClick={() => setSquadTab(st.id)}
              style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'9px 4px', fontSize:10, fontWeight: squadTab===st.id ? 700 : 400, color: squadTab===st.id ? FM_ACCENT : FM_TEXT3, position:'relative' }}>
              {st.label}
              {squadTab===st.id && <div style={{ position:'absolute', bottom:0, left:'15%', right:'15%', height:2, background:FM_ACCENT, borderRadius:'2px 2px 0 0' }} />}
              {st.id === 'perks' && (selW.perks||[]).length > 0 && (
                <span style={{ marginLeft:4, background:FM_ACCENT, color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{(selW.perks||[]).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* SP banner */}
        {(selW.sp || 0) > 0 && (
          <div style={{ margin:'12px 14px 0', padding:'8px 14px', background:`${FM_AMBER}18`, border:`1px solid ${FM_AMBER}44`, borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>▲</span>
            <div style={{ flex:1 }}>
              <span style={{ color:FM_AMBER, fontWeight:700, fontSize:12 }}>{selW.sp} Stat Point{selW.sp>1?'s':''} available</span>
              <span style={{ color:FM_TEXT3, fontSize:10 }}> · Use in Attributes tab</span>
            </div>
          </div>
        )}

        {/* ── OVERVIEW tab ─────────────────────── */}
        {squadTab === 'overview' && (
          <>
            {/* Bio card */}
            <div style={{ margin:'12px 14px 0', background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}`, padding:'12px', display:'flex', gap:12 }}>
              <WrestlerPortrait wrestler={selW} side="left" style={{ width:64, height:78, borderRadius:8, border:`1px solid ${FM_BORDER2}`, flexShrink:0 }} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  { label:'Personality', val: selW.personality, color: PERSONALITY_COLORS[selW.personality]||FM_TEXT3 },
                  { label:'Kimarite',    val: selW.kimarite,    color: FM_TEXT },
                  { label:'Record',      val: `${selW.record.wins}W – ${selW.record.losses}L`, color: FM_TEXT },
                  { label:'Streak',      val: (selW.streak||0)===0 ? '—' : (selW.streak>0 ? `▲ ${selW.streak} wins` : `▼ ${Math.abs(selW.streak)} losses`), color: (selW.streak||0)>0?FM_GREEN:(selW.streak||0)<0?FM_RED:FM_TEXT3 },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:FM_TEXT3, fontSize:11 }}>{row.label}</span>
                    <span style={{ color:row.color, fontSize:11, fontWeight:600 }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Condition */}
            <Section label="CONDITION">
              <div style={{ margin:'0 14px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}`, padding:'14px' }}>
                {Object.entries(selW.condition).map(([s, v]) => <CondBar key={s} stat={s} val={v} />)}
              </div>
            </Section>
          </>
        )}

        {/* ── ATTRIBUTES tab ───────────────────── */}
        {squadTab === 'attrs' && (
          <Section label={`ATTRIBUTES${(selW.sp||0)>0 ? ` · ${selW.sp} SP` : ''}`} accent={FM_ACCENT}>
            {(selW.sp || 0) > 0 && (
              <div style={{ margin:'0 14px 8px', color:FM_TEXT3, fontSize:10 }}>Spend 1 SP → +3 to any attribute (max 99)</div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:2, margin:'0 14px' }}>
              {Object.entries(selW.stats).map(([s, v]) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:FM_SURFACE, borderRadius:6, border:`1px solid ${FM_BORDER}` }}>
                  <span style={{ color:FM_TEXT3, fontSize:10, width:70, textTransform:'capitalize', flexShrink:0 }}>{s}</span>
                  <StatBar val={v} />
                  <span style={{ color: v >= 80 ? FM_GREEN : v >= 60 ? FM_ACCENT : FM_TEXT2, fontSize:13, fontWeight:700, width:22, textAlign:'right', flexShrink:0 }}>{Math.round(v)}</span>
                  {(selW.sp || 0) > 0 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if ((selW.sp || 0) < 1 || v >= 99) return;
                        const newStats = { ...selW.stats, [s]: Math.min(99, v + 3) };
                        setWrestlers(prev => prev.map(wr => wr.id === selW.id ? { ...wr, sp: wr.sp - 1, stats: newStats } : wr));
                        setSelW(prev => ({ ...prev, sp: prev.sp - 1, stats: newStats }));
                      }}
                      style={{ background: v < 99 ? FM_ACCENT : FM_BORDER, color: v < 99 ? '#fff' : FM_TEXT3,
                               border:'none', borderRadius:5, width:26, height:26, fontSize:14, fontWeight:700,
                               cursor: v < 99 ? 'pointer' : 'not-allowed', flexShrink:0,
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── PERKS tab ────────────────────────── */}
        {squadTab === 'perks' && (
          <Section label="SKILL UPGRADES">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'0 14px' }}>
              {PERKS.map(perk => {
                const owned   = (selW.perks || []).includes(perk.id);
                const canMeet = perkMet(perk, selW);
                const canBuy  = canMeet && !owned && (selW.sp || 0) >= perk.cost;
                const reqText = Object.entries(perk.req).map(([k, v]) => k === 'age' ? `age ≥ ${v}` : k === 'age_max' ? `age ≤ ${v}` : k === 'growthRate' ? `talent ≥ ${v}` : `${k} ≥ ${v}`).join(' · ');
                const borderCol = owned ? `${FM_AMBER}66` : canMeet ? `${FM_ACCENT}44` : FM_BORDER;
                const bgCol = owned ? `${FM_AMBER}12` : FM_SURFACE;
                return (
                  <div key={perk.id}
                    onClick={e => {
                      e.stopPropagation();
                      if (!canBuy) return;
                      const newPerks = [...(selW.perks || []), perk.id];
                      setWrestlers(prev => prev.map(wr => wr.id === selW.id ? { ...wr, sp: wr.sp - perk.cost, perks: newPerks } : wr));
                      setSelW(prev => ({ ...prev, sp: prev.sp - perk.cost, perks: newPerks }));
                    }}
                    style={{ padding:'10px', background:bgCol, borderRadius:8, border:`1px solid ${borderCol}`,
                             cursor: canBuy ? 'pointer' : 'default', opacity: !canMeet && !owned ? 0.4 : 1 }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{perk.icon}</div>
                    <div style={{ color: owned ? FM_AMBER : canMeet ? FM_TEXT : FM_TEXT3, fontSize:12, fontWeight:700, marginBottom:3 }}>{perk.name}</div>
                    <div style={{ color:FM_TEXT3, fontSize:9, marginBottom:6, lineHeight:1.3 }}>{perk.desc}</div>
                    {owned
                      ? <div style={{ color:FM_AMBER, fontSize:9, fontWeight:600 }}>✓ ACTIVE +{perk.effBonus} EFF</div>
                      : canMeet
                        ? <div style={{ background: canBuy ? FM_ACCENT : FM_BORDER, color: canBuy ? '#fff' : FM_TEXT3, padding:'3px 8px', borderRadius:4, fontSize:9, fontWeight:600, textAlign:'center' }}>
                            {(selW.sp||0) >= perk.cost ? `UNLOCK · ${perk.cost} SP` : `NEED ${perk.cost} SP`}
                          </div>
                        : <div style={{ color:FM_TEXT3, fontSize:9 }}>{reqText}</div>
                    }
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    );
  })() : (
    // ── Roster list ──────────────────────────────────────────────
    <div style={{ paddingBottom:24 }}>
      {/* Column header */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 28px 28px 28px 28px 42px', gap:4, padding:'8px 14px 6px', borderBottom:`1px solid ${FM_BORDER}` }}>
        <span style={{ color:FM_TEXT3, fontSize:9, fontWeight:600, letterSpacing:1 }}>WRESTLER</span>
        {['POW','TEC','SPD','BAL'].map(s => <span key={s} style={{ color:FM_TEXT3, fontSize:8, textAlign:'center' }}>{s}</span>)}
        <span style={{ color:FM_TEXT3, fontSize:8, textAlign:'center' }}>EFF</span>
      </div>
      {wrestlers.map(w => {
        const eff = Math.round(calcEffective(w));
        const hasSP = (w.sp || 0) > 0;
        const overTrained = w.condition.fatigue > 72;
        const moraleOk = w.condition.morale >= 40;
        return (
          <div key={w.id} onClick={() => setSelW(w)}
            style={{ display:'grid', gridTemplateColumns:'1fr 28px 28px 28px 28px 42px', gap:4, alignItems:'center',
                     padding:'8px 14px', cursor:'pointer',
                     background: hasSP ? `${FM_AMBER}0a` : FM_BG,
                     borderBottom:`1px solid ${FM_BORDER}`,
                     borderLeft:`3px solid ${hasSP ? FM_AMBER : w.injured ? FM_RED : overTrained ? FM_AMBER : 'transparent'}` }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:1 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background: w.injured ? FM_RED : !moraleOk ? FM_AMBER : overTrained ? FM_AMBER : FM_GREEN, flexShrink:0 }} />
                <span style={{ color: w.injured ? FM_RED : FM_TEXT, fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</span>
                {hasSP && <span style={{ background:FM_AMBER, color:FM_BG, borderRadius:4, padding:'0 4px', fontSize:8, fontWeight:700, flexShrink:0 }}>{w.sp}SP</span>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <RankBadge rank={w.rank} size={10} />
                <span style={{ color:FM_TEXT3, fontSize:9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.rank}</span>
              </div>
            </div>
            {['power','technique','speed','balance'].map(s => {
              const v = Math.round(w.stats[s]);
              const col = v >= 80 ? FM_GREEN : v >= 65 ? FM_ACCENT : v >= 45 ? FM_TEXT2 : FM_TEXT3;
              return <span key={s} style={{ color:col, fontSize:12, fontWeight:700, textAlign:'center' }}>{v}</span>;
            })}
            <div style={{ textAlign:'center' }}>
              <div style={{ color: w.injured ? FM_RED : FM_ACCENT, fontSize:14, fontWeight:700 }}>{eff}</div>
              {(w.streak||0) !== 0 && <div style={{ color:(w.streak||0)>0?FM_GREEN:FM_RED, fontSize:8, fontWeight:600 }}>{(w.streak||0)>0?`▲${w.streak}`:`▼${Math.abs(w.streak)}`}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const pol = TRAINING_POLICIES.find(p => p.id === policy);
  const dis = DISCIPLINE_LEVELS.find(d => d.id === discipline);

  const TACTIC_ABBREVS = { power:'TEPPŌ', technique:'SHIKO', balanced:'MŌSŌ', light:'BUTSU', intensive:'SANBAN' };

  const STAT_GROWTH_LABELS = { power:'POWER', technique:'TECH', balance:'BAL', speed:'SPD', stamina:'STA' };
  const TrainScreen = (
    <div style={{ paddingBottom:24 }}>
      {/* Active policy summary banner */}
      <div style={{ padding:'10px 14px', background:FM_SURFACE, borderBottom:`1px solid ${FM_BORDER}`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ color:FM_TEXT3, fontSize:9, letterSpacing:1, marginBottom:2 }}>STABLE DEFAULT</div>
          <div style={{ color:FM_TEXT, fontSize:13, fontWeight:700 }}>{pol.name}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ padding:'4px 8px', background: pol.fatigue > 0 ? `${FM_RED}22` : `${FM_GREEN}22`, borderRadius:5, border:`1px solid ${pol.fatigue > 0 ? FM_RED+'44' : FM_GREEN+'44'}` }}>
            <div style={{ color:FM_TEXT3, fontSize:8 }}>FATIGUE</div>
            <div style={{ color: pol.fatigue > 0 ? FM_RED : FM_GREEN, fontSize:11, fontWeight:700 }}>{pol.fatigue > 0 ? `+${pol.fatigue}` : pol.fatigue}</div>
          </div>
          <div style={{ padding:'4px 8px', background: pol.morale > 0 ? `${FM_GREEN}22` : pol.morale < 0 ? `${FM_RED}22` : `${FM_TEXT3}11`, borderRadius:5, border:`1px solid ${pol.morale > 0 ? FM_GREEN+'44' : pol.morale < 0 ? FM_RED+'44' : FM_BORDER}` }}>
            <div style={{ color:FM_TEXT3, fontSize:8 }}>MORALE</div>
            <div style={{ color: pol.morale > 0 ? FM_GREEN : pol.morale < 0 ? FM_RED : FM_TEXT3, fontSize:11, fontWeight:700 }}>{pol.morale > 0 ? `+${pol.morale}` : pol.morale || '—'}</div>
          </div>
        </div>
      </div>

      <Section label="TRAINING METHODOLOGY">
        {TRAINING_POLICIES.map(p => {
          const isActive = policy === p.id;
          const gains = Object.entries(p.growth || {});
          return (
            <div key={p.id} onClick={() => setPolicy(p.id)}
              style={{ margin:'0 14px 6px', padding:'12px', background: isActive ? FM_SURFACE2 : FM_SURFACE,
                       borderRadius:8, border:`1px solid ${isActive ? FM_ACCENT+'66' : FM_BORDER}`, cursor:'pointer',
                       borderLeft: isActive ? `3px solid ${FM_ACCENT}` : `3px solid transparent` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                <div>
                  <span style={{ color: isActive ? FM_TEXT : FM_TEXT2, fontSize:13, fontWeight:700 }}>{p.name}</span>
                  {p.injuryRisk && <span style={{ marginLeft:8, color:FM_RED, fontSize:9, fontWeight:600 }}>⚠ INJURY RISK</span>}
                </div>
                {isActive && <span style={{ color:FM_ACCENT, fontSize:9, fontWeight:600 }}>● ACTIVE</span>}
              </div>
              <div style={{ color:FM_TEXT3, fontSize:11, marginBottom:7 }}>{p.desc}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ color: p.fatigue > 0 ? FM_RED : FM_GREEN, fontSize:10, fontWeight:600, padding:'2px 6px', background: p.fatigue > 0 ? `${FM_RED}18` : `${FM_GREEN}18`, borderRadius:4 }}>
                  FAT {p.fatigue > 0 ? '+' : ''}{p.fatigue}
                </span>
                <span style={{ color: p.morale > 0 ? FM_GREEN : p.morale < 0 ? FM_RED : FM_TEXT3, fontSize:10, fontWeight:600, padding:'2px 6px', background: p.morale > 0 ? `${FM_GREEN}18` : p.morale < 0 ? `${FM_RED}18` : `${FM_TEXT3}11`, borderRadius:4 }}>
                  MOR {p.morale > 0 ? '+' : ''}{p.morale || '0'}
                </span>
                {gains.map(([stat, rate]) => (
                  <span key={stat} style={{ color:FM_ACCENT, fontSize:10, padding:'2px 6px', background:`${FM_ACCENT}18`, borderRadius:4 }}>
                    {STAT_GROWTH_LABELS[stat]||stat.slice(0,3).toUpperCase()} +{rate.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      <Section label="STABLE CULTURE">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, margin:'0 14px' }}>
          {DISCIPLINE_LEVELS.map(d => {
            const isActive = discipline === d.id;
            return (
              <div key={d.id} onClick={() => setDisc(d.id)}
                style={{ padding:'10px 12px', background: isActive ? FM_SURFACE2 : FM_SURFACE,
                         borderRadius:8, border:`1px solid ${isActive ? FM_INDIGO+'66' : FM_BORDER}`, cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ color: isActive ? FM_TEXT : FM_TEXT2, fontSize:12, fontWeight:700 }}>{d.name}</span>
                  {isActive && <span style={{ width:6, height:6, borderRadius:'50%', background:FM_INDIGO, display:'inline-block' }} />}
                </div>
                <div style={{ color:FM_TEXT3, fontSize:10, marginBottom:6 }}>{d.desc}</div>
                <div style={{ display:'flex', gap:6 }}>
                  <span style={{ color: d.moraleEff > 0 ? FM_GREEN : d.moraleEff < 0 ? FM_RED : FM_TEXT3, fontSize:10, fontWeight:600 }}>MOR{d.moraleEff > 0 ? '+' : ''}{d.moraleEff}</span>
                  <span style={{ color: d.discEff > 0 ? FM_GREEN : d.discEff < 0 ? FM_RED : FM_TEXT3, fontSize:10, fontWeight:600 }}>DISC{d.discEff > 0 ? '+' : ''}{d.discEff}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section label="INDIVIDUAL ASSIGNMENTS">
        <div style={{ margin:'0 14px 4px', padding:'6px 10px', background:`${FM_ACCENT}0a`, borderRadius:6, border:`1px solid ${FM_BORDER}` }}>
          <span style={{ color:FM_TEXT3, fontSize:9, letterSpacing:1 }}>Tap to override default · ↺ = using stable default</span>
        </div>
        {wrestlers.map(w => {
          const wPol = wrestlerPolicies[w.id] || null;
          const activePol = wPol || policy;
          return (
            <div key={w.id} style={{ margin:'0 14px 6px', padding:'10px 12px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${w.injured ? FM_RED+'33' : FM_BORDER}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: PERSONALITY_COLORS[w.personality] || FM_TEXT3, flexShrink:0 }} />
                  <span style={{ color: w.injured ? FM_RED : FM_TEXT, fontSize:13, fontWeight:600 }}>{w.name}</span>
                  {wPol && <span style={{ color:FM_INDIGO, fontSize:9, fontWeight:600 }}>OVERRIDE</span>}
                </div>
                {w.injured
                  ? <span style={{ color:FM_RED, fontSize:10, fontWeight:600 }}>INJURED</span>
                  : <div style={{ display:'flex', gap:8 }}>
                      <span style={{ color: w.condition.fatigue>70 ? FM_RED : FM_TEXT3, fontSize:10 }}>F:{Math.round(w.condition.fatigue)}</span>
                      <span style={{ color: w.condition.morale<40 ? FM_RED : FM_TEXT3, fontSize:10 }}>M:{Math.round(w.condition.morale)}</span>
                    </div>
                }
              </div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {TRAINING_POLICIES.map(p => {
                  const isActive = activePol === p.id;
                  const isOverride = wPol === p.id;
                  return (
                    <button key={p.id} onClick={() => {
                      if (wPol === p.id) setWrestlerPolicies(prev => { const n = {...prev}; delete n[w.id]; return n; });
                      else setWrestlerPolicies(prev => ({ ...prev, [w.id]: p.id }));
                    }} style={{
                      background: isActive ? (isOverride ? FM_SURFACE2 : `${FM_ACCENT}18`) : FM_BG,
                      border: `1px solid ${isActive ? (isOverride ? FM_INDIGO+'66' : FM_ACCENT+'44') : FM_BORDER}`,
                      borderRadius:5, padding:'4px 8px',
                      color: isActive ? (isOverride ? FM_INDIGO : FM_ACCENT) : FM_TEXT3,
                      fontSize:9, cursor:'pointer', fontWeight: isActive ? 700 : 400,
                    }}>
                      {isActive && !isOverride ? '↺ ' : ''}{TACTIC_ABBREVS[p.id] || p.id.toUpperCase().slice(0,5)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );

  const POTENTIAL_META = {
    'Elite':  { stars:5, color:FM_AMBER,  bg:`${FM_AMBER}18`,  border:`${FM_AMBER}55`  },
    'High':   { stars:4, color:FM_GREEN,  bg:`${FM_GREEN}15`,  border:`${FM_GREEN}44`  },
    'Medium': { stars:3, color:FM_ACCENT, bg:`${FM_ACCENT}12`, border:`${FM_ACCENT}44` },
    'Low':    { stars:2, color:FM_TEXT3,  bg:`${FM_TEXT3}0a`,  border:FM_BORDER       },
  };
  const ScoutScreen = (
    <div style={{ paddingBottom:24 }}>
      {/* Header banner */}
      <div style={{ padding:'10px 14px', background:FM_SURFACE, borderBottom:`1px solid ${FM_BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:FM_TEXT, fontSize:13, fontWeight:700 }}>Recruitment Pipeline</div>
          <div style={{ color:FM_TEXT3, fontSize:10, marginTop:1 }}>{prospects.length} prospect{prospects.length !== 1 ? 's' : ''} scouted</div>
        </div>
        <div style={{ color:FM_TEXT3, fontSize:10 }}>Balance: <span style={{ color:FM_AMBER, fontWeight:700 }}>¥{(stable.funds/1000).toFixed(0)}k</span></div>
      </div>

      {prospects.length === 0 && (
        <div style={{ color:FM_TEXT3, fontSize:13, fontStyle:'italic', padding:'40px 20px', textAlign:'center' }}>No prospects available. Check back next season.</div>
      )}

      <div style={{ padding:'12px 14px 0' }}>
        {prospects.map(p => {
          const meta = POTENTIAL_META[p.potential] || POTENTIAL_META['Low'];
          const canRecruit = stable.funds >= p.cost;
          const stars = '★'.repeat(meta.stars) + '☆'.repeat(5 - meta.stars);
          return (
            <div key={p.id} style={{ marginBottom:10, background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}`, overflow:'hidden' }}>
              {/* Prospect header */}
              <div style={{ padding:'12px 12px 8px', display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ color:FM_TEXT, fontSize:14, fontWeight:700 }}>{p.name}</span>
                    <span style={{ background:meta.bg, color:meta.color, border:`1px solid ${meta.border}`, borderRadius:4, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{p.potential.toUpperCase()}</span>
                  </div>
                  <div style={{ color:FM_TEXT3, fontSize:10, marginBottom:4 }}>Age {p.age} · {p.personality} · {p.kimarite}</div>
                  <div style={{ color:meta.color, fontSize:13, letterSpacing:1 }}>{stars}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ color:FM_ACCENT, fontSize:22, fontWeight:700 }}>{p.rating}</div>
                  <div style={{ color:FM_TEXT3, fontSize:9 }}>RATING</div>
                </div>
              </div>
              {/* Attribute row */}
              <div style={{ display:'flex', borderTop:`1px solid ${FM_BORDER}`, borderBottom:`1px solid ${FM_BORDER}` }}>
                {Object.entries(p.stats).map(([s, v]) => {
                  const vr = Math.round(v);
                  const col = vr >= 70 ? FM_GREEN : vr >= 55 ? FM_ACCENT : FM_TEXT3;
                  return (
                    <div key={s} style={{ flex:1, textAlign:'center', padding:'6px 2px' }}>
                      <div style={{ color:FM_TEXT3, fontSize:8, marginBottom:2 }}>{s.slice(0,3).toUpperCase()}</div>
                      <div style={{ color:col, fontSize:12, fontWeight:700 }}>{vr}</div>
                    </div>
                  );
                })}
              </div>
              {/* Recruit button */}
              <div style={{ padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:FM_TEXT3, fontSize:10 }}>Signing fee</span>
                <button onClick={() => recruit(p)} style={{
                  background: canRecruit ? FM_ACCENT : FM_BORDER,
                  color: canRecruit ? '#fff' : FM_TEXT3,
                  border:'none', borderRadius:6, padding:'7px 16px',
                  fontSize:11, fontWeight:700, cursor: canRecruit ? 'pointer' : 'not-allowed',
                }}>
                  {canRecruit ? '+ SIGN' : 'FUNDS LOW'} · ¥{p.cost.toLocaleString()}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const TACTIC_OPTIONS = [
    { id:'oshi',  label:'OSHI 押し', sub:'Power rush — aggressive charge', col:'#cc4422' },
    { id:'yotsu', label:'YOTSU 四つ', sub:'Grapple — mawashi control', col:'#4488cc' },
    { id:'henka', label:'HENKA 変化', sub:'Sidestep — high risk / reward', col:'#88cc44' },
  ];

  const BashoScreen = bashoResults ? (
    // Post-basho results
    <div style={{ padding:'16px 14px 32px' }}>
      <div style={{ textAlign:'center', marginBottom:16 }}>
        <div style={{ color:FM_AMBER, fontSize:18, fontWeight:700 }}>{bashoResults.name}</div>
        <div style={{ color:FM_TEXT3, fontSize:10, letterSpacing:2, marginTop:2 }}>BASHO COMPLETE · BANZUKE UPDATED</div>
      </div>
      {bashoResults.enteredWrestlers.map(w => {
        const res = bashoResults.results[w.id];
        if (!res) return null;
        const kachi = res.kachiKoshi;
        return (
          <div key={w.id} style={{ marginBottom:10, background:FM_SURFACE, borderRadius:8, border:`1px solid ${kachi ? FM_GREEN+'44' : FM_RED+'33'}`, overflow:'hidden' }}>
            <div style={{ padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ color:FM_TEXT, fontSize:14, fontWeight:700 }}>{w.name}</div>
                <div style={{ color:FM_TEXT3, fontSize:10, marginTop:2 }}>
                  {res.oldRank} → <span style={{ color: kachi ? FM_GREEN : FM_RED, fontWeight:700 }}>{res.newRank}</span>
                </div>
              </div>
              <div style={{ color: kachi ? FM_GREEN : FM_RED, fontSize:20, fontWeight:700 }}>{res.wins}W–{res.losses}L</div>
            </div>
            <div style={{ padding:'8px 12px', background: kachi ? `${FM_GREEN}12` : `${FM_RED}10`, borderTop:`1px solid ${kachi ? FM_GREEN+'33' : FM_RED+'22'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color: kachi ? FM_GREEN : FM_RED, fontSize:12, fontWeight:700 }}>
                {kachi ? (lang==='EN' ? '勝ち越し — PROMOTED' : '勝ち越し KACHI-KOSHI') : (lang==='EN' ? '負け越し — DEMOTED' : '負け越し MAKE-KOSHI')}
              </span>
              <span style={{ color: kachi ? FM_GREEN : FM_RED, fontSize:14 }}>{kachi ? '▲' : '▼'}</span>
            </div>
          </div>
        );
      })}
      <button onClick={() => setBashoResults(null)} style={{ width:'100%', marginTop:8, background:FM_ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'14px', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
        RETURN TO OVERVIEW
      </button>
    </div>
  ) : !basho ? (
    // Pre-basho lobby
    <div style={{ paddingBottom:24 }}>
      {/* Tournament header */}
      <div style={{ padding:'20px 14px 16px', background:`linear-gradient(135deg,${FM_SURFACE},${FM_SURFACE2})`, borderBottom:`1px solid ${FM_BORDER}`, textAlign:'center' }}>
        <div style={{ color:FM_AMBER, fontSize:24, fontWeight:700, marginBottom:4 }}>
          {(() => { const names = ['Hatsu 初場所','Haru 春場所','Natsu 夏場所','Nagoya 名古屋場所','Aki 秋場所','Kyushu 九州場所']; const idx = BASHO_MONTHS.indexOf(stable.month); return idx !== -1 ? names[idx] : 'Grand Tournament'; })()}
        </div>
        <div style={{ color:FM_TEXT3, fontSize:11, letterSpacing:2, marginBottom:4 }}>15-DAY GRAND TOURNAMENT</div>
        <div style={{ color:FM_TEXT2, fontSize:12, lineHeight:1.6 }}>
          Each rikishi fights one bout per day. Choose tactics before each bout.
        </div>
      </div>
      {/* Roster entering */}
      <Section label="ENTERING SQUAD">
        {wrestlers.filter(w => !w.injured).slice(0, 4).map(w => (
          <div key={w.id} style={{ margin:'0 14px 6px', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <RankBadge rank={w.rank} size={12} />
              <div>
                <div style={{ color:FM_TEXT, fontSize:13, fontWeight:600 }}>{w.name}</div>
                <div style={{ color:FM_TEXT3, fontSize:9 }}>{w.rank}</div>
              </div>
            </div>
            <div style={{ color:FM_ACCENT, fontSize:14, fontWeight:700 }}>{Math.round(calcEffective(w))}</div>
          </div>
        ))}
        {wrestlers.filter(w => w.injured).length > 0 && (
          <div style={{ margin:'0 14px 6px', padding:'6px 12px', background:`${FM_RED}0a`, borderRadius:6, border:`1px solid ${FM_RED}22` }}>
            <span style={{ color:FM_RED, fontSize:10 }}>{wrestlers.filter(w=>w.injured).length} wrestler(s) injured and unable to compete</span>
          </div>
        )}
      </Section>
      <div style={{ padding:'8px 14px 0' }}>
        <button onClick={startBasho} style={{ width:'100%', background:FM_ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'15px', fontSize:14, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
          ◆ BEGIN BASHO
        </button>
      </div>
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
        <div style={{ paddingBottom:24 }}>
          {/* Basho header */}
          <div style={{ padding:'10px 14px', background:FM_SURFACE, borderBottom:`1px solid ${FM_BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:FM_TEXT, fontSize:13, fontWeight:700 }}>{basho.name}</div>
              <div style={{ color:FM_TEXT3, fontSize:10, marginTop:1 }}>Day {basho.currentDay} of 15</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:FM_AMBER, fontSize:18, fontWeight:700 }}>{basho.currentDay}/15</div>
            </div>
          </div>

          {/* 15-day progress strip */}
          <div style={{ display:'flex', gap:2, padding:'8px 14px 0' }}>
            {Array.from({length:15},(_,i) => {
              const day = basho.schedule[basho.enteredWrestlers[0]?.id]?.[i];
              const isToday = i === basho.currentDay - 1;
              const bg = day?.result === 'win' ? FM_GREEN : day?.result === 'loss' ? FM_RED : isToday ? FM_AMBER : FM_BORDER;
              return <div key={i} style={{ flex:1, height: isToday ? 8 : 4, borderRadius:2, background:bg, transition:'all 0.2s' }} />;
            })}
          </div>

          {/* Wrestler standings */}
          <div style={{ padding:'8px 14px 0', display:'flex', flexDirection:'column', gap:4 }}>
            {basho.enteredWrestlers.map(w => {
              const days = basho.schedule[w.id];
              const wins = days.filter(d => d.result === 'win').length;
              const losses = days.filter(d => d.result === 'loss').length;
              const completed = days.filter(d => d.result).length;
              const kachi = wins > 8 || (completed === 15 && wins > losses);
              return (
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:FM_SURFACE, borderRadius:7, border:`1px solid ${FM_BORDER}` }}>
                  <span style={{ color:FM_TEXT2, fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.name}</span>
                  <div style={{ display:'flex', gap:2 }}>
                    {days.map((d,i) => (
                      <div key={i} style={{ width:7, height:7, borderRadius:1,
                        background: d.result==='win' ? FM_GREEN : d.result==='loss' ? FM_RED : i===basho.currentDay-1 ? `${FM_AMBER}66` : FM_BORDER
                      }} />
                    ))}
                  </div>
                  <span style={{ color: wins>losses?FM_GREEN:losses>wins?FM_RED:FM_TEXT3, fontSize:11, fontWeight:700, minWidth:36, textAlign:'right' }}>
                    {wins}W-{losses}L
                  </span>
                  {kachi && <span style={{ color:FM_GREEN, fontSize:9, fontWeight:700 }}>勝</span>}
                </div>
              );
            })}
          </div>

          {/* Today's bouts */}
          <Section label={`DAY ${basho.currentDay} · BOUTS`}>
            {todayBouts.map(({ w, entry }) => (
              <div key={w.id} style={{ margin:'0 14px 10px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${!entry.result ? FM_ACCENT+'44' : FM_BORDER}`, overflow:'hidden' }}>
                {/* Matchup */}
                <div style={{ padding:'12px 12px 8px', display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ color:FM_TEXT, fontSize:13, fontWeight:700 }}>{w.name}</div>
                    <div style={{ color:FM_TEXT3, fontSize:9 }}>{w.rank}</div>
                  </div>
                  <div style={{ color:FM_TEXT3, fontSize:12, padding:'0 6px' }}>対</div>
                  <div style={{ flex:1, textAlign:'right' }}>
                    <div style={{ color:FM_TEXT2, fontSize:13, fontWeight:600 }}>{entry.opp.name}</div>
                    <div style={{ color:FM_TEXT3, fontSize:9 }}>{entry.opp.rank}</div>
                  </div>
                </div>

                {/* Tactic selector */}
                {!entry.result && (
                  <div style={{ padding:'0 12px 8px' }}>
                    <div style={{ color:FM_TEXT3, fontSize:9, letterSpacing:1, marginBottom:6 }}>CHOOSE APPROACH</div>
                    <div style={{ display:'flex', gap:5 }}>
                      {TACTIC_OPTIONS.map(t => {
                        const isChosen = entry.tactic === t.id;
                        return (
                          <button key={t.id} onClick={() => setTactic(w.id, t.id)} style={{
                            flex:1, background: isChosen ? `${t.col}22` : FM_BG,
                            border: `1px solid ${isChosen ? t.col+'88' : FM_BORDER}`,
                            borderRadius:7, padding:'7px 4px', cursor:'pointer',
                          }}>
                            <div style={{ color: isChosen ? t.col : FM_TEXT3, fontSize:9, fontWeight: isChosen ? 700 : 400, letterSpacing:0.5 }}>{t.label}</div>
                            <div style={{ color:FM_TEXT3, fontSize:8, marginTop:2 }}>{t.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display:'flex', gap:6, padding:'0 12px 12px' }}>
                  {!entry.result ? (
                    <>
                      <button onClick={() => watchDayBout(w, entry)} disabled={!entry.tactic}
                        style={{ flex:2, background: entry.tactic ? FM_INDIGO : FM_BORDER, color: entry.tactic ? '#fff' : FM_TEXT3,
                                 border:'none', borderRadius:7, padding:'9px 0', fontSize:12, fontWeight:700, cursor: entry.tactic ? 'pointer' : 'not-allowed' }}>
                        ▶ WATCH
                      </button>
                      <button onClick={() => autoDayBout(w, entry)}
                        style={{ flex:1, background:FM_BORDER2, color:FM_TEXT3, border:'none', borderRadius:7, padding:'9px 0', fontSize:11, cursor:'pointer' }}>
                        AUTO
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => watchDayBout(w, entry)}
                        style={{ flex:1, background:FM_BORDER2, color:FM_TEXT2, border:'none', borderRadius:7, padding:'9px 0', fontSize:11, cursor:'pointer' }}>REPLAY</button>
                      <div style={{ flex:2, borderRadius:7, padding:'9px 0', textAlign:'center',
                                    background: entry.result==='win' ? `${FM_GREEN}18` : `${FM_RED}14`,
                                    border: `1px solid ${entry.result==='win' ? FM_GREEN+'44' : FM_RED+'33'}`,
                                    color: entry.result==='win' ? FM_GREEN : FM_RED, fontSize:13, fontWeight:700 }}>
                        {entry.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                        {entry.boutData?.kimarite && <span style={{ color:FM_TEXT3, fontSize:9, display:'block' }}>{entry.boutData.kimarite}</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </Section>

          {/* Navigation */}
          {allTodayDone && (
            <div style={{ padding:'0 14px' }}>
              {isLastDay ? (
                <button onClick={endBasho} style={{ width:'100%', background:FM_AMBER, color:FM_BG, border:'none', borderRadius:8, padding:'14px', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
                  END BASHO — RESULTS →
                </button>
              ) : (
                <>
                  <button onClick={advanceDay} style={{ width:'100%', background:FM_ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'14px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                    DAY {basho.currentDay + 1} — NEXT DAY →
                  </button>
                  <div style={{ marginTop:8, padding:'10px 12px', background:FM_SURFACE, borderRadius:8, border:`1px solid ${FM_BORDER}` }}>
                    <div style={{ color:FM_TEXT3, fontSize:9, letterSpacing:1, marginBottom:6 }}>TOMORROW · DAY {basho.currentDay + 1}</div>
                    {basho.enteredWrestlers.map(w => {
                      const nextEntry = basho.schedule[w.id][basho.currentDay];
                      if (!nextEntry) return null;
                      return (
                        <div key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderBottom:`1px solid ${FM_BORDER}` }}>
                          <span style={{ color:FM_TEXT2, fontSize:11 }}>{w.name}</span>
                          <span style={{ color:FM_TEXT3, fontSize:9 }}>対</span>
                          <span style={{ color:FM_TEXT3, fontSize:11 }}>{nextEntry.opp.name} <span style={{ fontSize:9 }}>({nextEntry.opp.rank})</span></span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      );
    })()
  );

  // ── TABS ─────────────────────────────────────────────────────
  const TABS = [
    { id:'stable', label:'OVERVIEW',  icon:'◉' },
    { id:'roster', label:'SQUAD',     icon:'◈' },
    { id:'train',  label:'TRAINING',  icon:'▲' },
    { id:'scout',  label:'SCOUTING',  icon:'◎' },
    { id:'basho',  label:'TOURNAMENT',icon:'◆' },
  ];

  const SCREENS = { stable: StableScreen, roster: RosterScreen, train: TrainScreen, scout: ScoutScreen, basho: BashoScreen };

  return (
    <>
    <style>{`
      @keyframes pulseGlow{0%,100%{box-shadow:0 0 3px rgba(239,68,68,0.35)}50%{box-shadow:0 0 10px rgba(239,68,68,0.85),0 0 20px rgba(239,68,68,0.3)}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:${FM_BORDER2};border-radius:2px}
    `}</style>
    <div style={{ background:FM_BG, minHeight:'100vh', maxWidth:430, margin:'0 auto', fontFamily:'DM Sans,system-ui,sans-serif', position:'relative' }}>

      {/* ── Top bar ─────────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:`${FM_BG}f5`, borderBottom:`1px solid ${FM_BORDER}`, backdropFilter:'blur(12px)' }}>
        {/* Row 1: club info + actions */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px 8px' }}>
          {/* Crest */}
          <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${FM_ACCENT},${FM_INDIGO})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>⛩</div>
          {/* Club + date */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:FM_TEXT, fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{stable.name}</div>
            <div style={{ display:'flex', gap:4, marginTop:2 }}>
              {[`${MONTHS[stable.month-1].slice(0,3).toUpperCase()} ${stable.year}`, stable.time].map((seg, i) => (
                <span key={i} style={{ padding:'1px 6px', borderRadius:4, background:FM_SURFACE, color:FM_TEXT3, fontSize:9, letterSpacing:1, border:`1px solid ${FM_BORDER}` }}>{seg}</span>
              ))}
            </div>
          </div>
          {/* Funds */}
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color: fundsFlash === 'up' ? FM_GREEN : fundsFlash === 'down' ? FM_RED : FM_AMBER, fontSize:13, fontWeight:700, transition:'color 0.15s' }}>¥{(stable.funds/1000).toFixed(0)}k</div>
            <div style={{ color:FM_TEXT3, fontSize:9, letterSpacing:1 }}>FUNDS</div>
          </div>
          {/* Lang + Advance */}
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => setLang(l => l === 'EN' ? 'JP' : 'EN')}
                    style={{ background:FM_SURFACE, color:FM_TEXT3, border:`1px solid ${FM_BORDER}`, borderRadius:6, padding:'5px 7px', fontSize:9, cursor:'pointer', letterSpacing:1 }}>
              🌐
            </button>
            <button onClick={advance} style={{ background:FM_ACCENT, color:'#fff', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:1, whiteSpace:'nowrap' }}>
              {T('advance_btn', lang)}
            </button>
          </div>
        </div>
        {/* Row 2: horizontal tab strip */}
        <div style={{ display:'flex', overflowX:'auto', borderTop:`1px solid ${FM_BORDER}`, scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelW(null); }}
              style={{ flex:'0 0 auto', background:'none', border:'none', cursor:'pointer', padding:'8px 14px', display:'flex', alignItems:'center', gap:5, position:'relative', whiteSpace:'nowrap' }}>
              <span style={{ fontSize:10, color: tab===t.id ? FM_ACCENT : FM_TEXT3 }}>{t.icon}</span>
              <span style={{ fontSize:11, fontWeight: tab===t.id ? 700 : 400, color: tab===t.id ? FM_TEXT : FM_TEXT3, letterSpacing:0.5 }}>{t.label}</span>
              {tab===t.id && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:FM_ACCENT, borderRadius:'2px 2px 0 0' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Screen content */}
      {SCREENS[tab]}

      {/* Fight Viewer modal */}
      {viewer && <FightViewer bout={viewer} onClose={() => setViewer(null)} kachiKoshi={viewer.kachiKoshi} lang={lang} />}
    </div>
    </>
  );
}

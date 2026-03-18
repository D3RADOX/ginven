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
  { id: 'power',     name: 'Power Focus',    fatigue: 8,  morale: -3, growth: { power: 0.9, stamina: 0.3 },               injuryRisk: false, desc: 'Builds raw strength. High fatigue cost.' },
  { id: 'technique', name: 'Technique Focus', fatigue: 5,  morale: 1,  growth: { technique: 0.9, balance: 0.3 },           injuryRisk: false, desc: 'Develops kimarite precision. Morale-positive.' },
  { id: 'balanced',  name: 'Balanced',        fatigue: 4,  morale: 0,  growth: { power:0.3, technique:0.3, speed:0.2, balance:0.2 }, injuryRisk: false, desc: 'Steady all-round development.' },
  { id: 'light',     name: 'Light Recovery',  fatigue: -10,morale: 5,  growth: {},                                          injuryRisk: false, desc: 'Rest and recovery. No stat growth.' },
  { id: 'intensive', name: 'Intensive',        fatigue: 14, morale: -6, growth: { power:0.6, technique:0.5, stamina:0.5 },  injuryRisk: true,  desc: 'Maximum gains. High injury risk.' },
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
  shikiri:    ["The gyōji raises his fan. The dohyō falls silent.", "Both wrestlers glare across the shikiri line. The crowd holds its breath.", "Ritual salt scatters across the clay. Time slows."],
  tai_even:   ["An even collision — neither gains the opening!", "Perfectly matched tachiai. This will be decided in the grip.", "Simultaneous explosion — the impact echoes through the hall."],
  tai_adv:    ["surges forward with a thunderous tachiai, seizing the initiative!", "blasts off the line first — instant advantage!", "catches the opponent completely off-balance at the charge!"],
  grip_even:  ["Both wrestlers battle fiercely for mawashi control.", "A tense grip battle — sweat-slicked hands, shuffling feet.", "Neither can establish the dominant hold."],
  grip_adv:   ["locks in a devastating double-inside grip — total control!", "secures the outside belt with an iron fist!", "wraps up both arms — the crowd gasps at the technique!"],
  push_adv:   ["drives with tremendous force toward the tawara!", "grinds forward step by relentless step!", "the weight advantage is overwhelming — ground is being given!"],
  retreat:    ["scrambles desperately at the bales — toes on the edge!", "pivots in a last-ditch attempt to escape!", "the sand is crumbling underfoot at the ring's rim!"],
  win:        ["forces them out! Victory by", "sends them tumbling! The kimarite:", "executes the decisive move — the kimarite:"],
  loss_sfx:   ["steps out — it's over!", "touches the sand first!", "cannot hold the edge!"],
};

function generateBout(w1, w2) {
  const e1 = calcEffective(w1), e2 = calcEffective(w2);
  const phases = [];
  let momentum = 0;

  // Phase 0 — Shikiri (always even, visual setup)
  phases.push({ name: 'Shikiri', pose1: 'squat', pose2: 'squat', adv: 'even', x1: 0.25, x2: 0.75, text: rnd(NARRATIVES.shikiri) });

  // Phase 1 — Tachiai
  const t = (Math.random() * e1) - (Math.random() * e2);
  const tAdv = t > 5 ? 'w1' : t < -5 ? 'w2' : 'even';
  momentum += t * 0.38;
  phases.push({
    name: 'Tachiai', adv: tAdv,
    pose1: tAdv === 'w2' ? 'retreat' : 'charge',
    pose2: tAdv === 'w1' ? 'retreat' : 'charge',
    x1: tAdv === 'w1' ? 0.38 : 0.30, x2: tAdv === 'w2' ? 0.62 : 0.70,
    text: tAdv === 'even' ? rnd(NARRATIVES.tai_even) : `${tAdv==='w1'?w1.name:w2.name} ${rnd(NARRATIVES.tai_adv)}`,
  });

  // Phase 2 — Grip Battle
  const g = (Math.random() * e1 * (1 + w1.stats.technique / 180)) - (Math.random() * e2 * (1 + w2.stats.technique / 180));
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
//  PIXEL WRESTLER  (CSS div-art, inline styles, CSS transitions)
// ─────────────────────────────────────────────────────────────────
const POSE_CFG = {
  squat:    { bLean:  0, bY:  10, lA: '-38deg', rA: '38deg',  lL: '-36deg', rL: '36deg' },
  ready:    { bLean:  0, bY:   0, lA: '-24deg', rA: '24deg',  lL: '-18deg', rL: '18deg' },
  charge:   { bLean: 22, bY:   4, lA: '-52deg', rA: '-8deg',  lL:  '-8deg', rL:  '8deg' },
  grip:     { bLean: 12, bY:   2, lA:  '32deg', rA: '-32deg', lL: '-26deg', rL: '26deg' },
  grip_def: { bLean: -5, bY:   5, lA: '-32deg', rA:  '32deg', lL: '-32deg', rL: '32deg' },
  push:     { bLean: 28, bY:   0, lA: '-14deg', rA: '-14deg', lL:  '-7deg', rL:  '7deg' },
  retreat:  { bLean:-22, bY:   5, lA:  '22deg', rA: '-22deg', lL: '-22deg', rL: '22deg' },
  victory:  { bLean:  0, bY:  -5, lA:'-134deg', rA:'134deg',  lL: '-14deg', rL: '14deg' },
  fall:     { bLean: 50, bY:  16, lA:  '65deg', rA:  '85deg', lL: '-48deg', rL: '48deg' },
};

function PixelWrestler({ side, pose = 'ready', bodyHex, beltHex }) {
  const pc = POSE_CFG[pose] || POSE_CFG.ready;
  const TR = 'all 0.52s cubic-bezier(0.4,0,0.2,1)';
  const flip = side === 'right' ? 'scaleX(-1)' : 'scaleX(1)';

  const bodyStyle = { position:'absolute', background: bodyHex, border: '1.5px solid rgba(0,0,0,0.22)', borderRadius:'50%', transition: TR };

  return (
    <div style={{ position:'relative', width:58, height:88, transform: flip, transition: TR, display:'inline-block' }}>
      {/* Left arm — behind body */}
      <div style={{ ...bodyStyle, top:36, left:-7, width:13, height:28, borderRadius:7, transformOrigin:'50% 0%', transform:`rotate(${pc.lA})` }} />
      {/* Right arm */}
      <div style={{ ...bodyStyle, top:36, right:-7, width:13, height:28, borderRadius:7, transformOrigin:'50% 0%', transform:`rotate(${pc.rA})` }} />
      {/* Left leg */}
      <div style={{ ...bodyStyle, bottom:3, left:10, width:13, height:22, borderRadius:5, transformOrigin:'50% 0%', transform:`rotate(${pc.lL})` }} />
      {/* Right leg */}
      <div style={{ ...bodyStyle, bottom:3, right:10, width:13, height:22, borderRadius:5, transformOrigin:'50% 0%', transform:`rotate(${pc.rL})` }} />
      {/* Body */}
      <div style={{ position:'absolute', top:34, left:4, width:50, height:44, background: bodyHex, border:'1.5px solid rgba(0,0,0,0.22)', borderRadius:'42%', transformOrigin:'50% 18%', transform:`rotate(${pc.bLean}deg) translateY(${pc.bY}px)`, transition: TR }} />
      {/* Mawashi belt */}
      <div style={{ position:'absolute', top:52, left:2, width:54, height:14, background: beltHex, borderRadius:4, transformOrigin:'50% -2%', transform:`rotate(${pc.bLean * 0.7}deg) translateY(${pc.bY * 0.6}px)`, transition: TR }} />
      {/* Head */}
      <div style={{ position:'absolute', top:10, left:11, width:36, height:30, background: bodyHex, border:'1.5px solid rgba(0,0,0,0.22)', borderRadius:'50%', transition: TR }} />
      {/* Topknot */}
      <div style={{ position:'absolute', top:1, left:19, width:20, height:14, background:'#12090a', borderRadius:'50% 50% 25% 25%', transition: TR }} />
      {/* Eye left */}
      <div style={{ position:'absolute', top:17, left:17, width:7, height:6, background:'#111', borderRadius:'50%', transition: TR }} />
      {/* Eye right */}
      <div style={{ position:'absolute', top:17, left:34, width:7, height:6, background:'#111', borderRadius:'50%', transition: TR }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FIGHT VIEWER
// ─────────────────────────────────────────────────────────────────
function FightViewer({ bout, onClose }) {
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

      {/* Arena */}
      <div style={{ width:'100%', maxWidth:430, height:210, position:'relative', background:'linear-gradient(180deg,#08050f 0%,#100a1a 100%)', borderTop:'1px solid #18143a', borderBottom:'1px solid #18143a', overflow:'hidden' }}>

        {/* Crowd dots */}
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} style={{ position:'absolute', left:`${(i*37+11)%100}%`, top:`${4+(i*17%20)}%`, width:3, height:3, borderRadius:'50%', background: i%3===0?'#2a1a50':i%3===1?'#3a1a3a':'#1a1438', opacity:0.7 }} />
        ))}

        {/* Dohyo clay */}
        <div style={{ position:'absolute', bottom:18, left:'5%', width:'90%', height:100, background:'radial-gradient(ellipse,#d4b08c 0%,#c09870 55%,#a07850 100%)', borderRadius:'50%', border:'4px solid #8a6040', boxShadow:'0 6px 24px rgba(0,0,0,0.6)' }} />

        {/* Shikiri lines */}
        <div style={{ position:'absolute', bottom:50, left:'44%', width:4, height:18, background:'#2a2020', borderRadius:2 }} />
        <div style={{ position:'absolute', bottom:50, right:'44%', width:4, height:18, background:'#2a2020', borderRadius:2 }} />

        {/* Gyōji (referee) */}
        <div style={{ position:'absolute', right:28, bottom:74 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#d4a060', marginLeft:1 }} />
          <div style={{ width:11, height:18, background:'#a03010', borderRadius:'2px 2px 5px 5px', marginTop:1 }} />
          <div style={{ width:16, height:3, background:'#c84000', marginTop:-6, marginLeft:-3, borderRadius:1 }} />
        </div>

        {/* Wrestler 1 (gold) */}
        <div style={{ position:'absolute', bottom:24, left:`${cur.x1 * 100}%`, transform:'translateX(-50%)', transition:'left 0.52s cubic-bezier(0.4,0,0.2,1)' }}>
          <PixelWrestler side="left"  pose={cur.pose1} bodyHex="#c9a04a" beltHex="#1e3a9a" />
        </div>
        {/* Wrestler 2 (red) */}
        <div style={{ position:'absolute', bottom:24, left:`${cur.x2 * 100}%`, transform:'translateX(-50%)', transition:'left 0.52s cubic-bezier(0.4,0,0.2,1)' }}>
          <PixelWrestler side="right" pose={cur.pose2} bodyHex="#c84040" beltHex="#1a1a1a" />
        </div>
      </div>

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

function StatBar({ val, max = 99 }) {
  const pct = (val / max) * 100;
  const col = val > 75 ? GOLD : val > 50 ? '#4a88cc' : '#555';
  return (
    <div style={{ height:4, background:'#1a1a2e', borderRadius:2, flex:1 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:2, transition:'width 0.3s' }} />
    </div>
  );
}

function CondBar({ stat, val }) {
  const col = stat === 'fatigue'
    ? (val > 70 ? RED : val > 40 ? ORANGE : GREEN)
    : (val > 70 ? GREEN : val > 40 ? ORANGE : RED);
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'#555', fontSize:11, fontFamily:'JetBrains Mono,monospace', textTransform:'capitalize' }}>{stat}</span>
        <span style={{ color:col, fontSize:11, fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>{Math.round(val)}</span>
      </div>
      <div style={{ height:5, background:'#1a1a2e', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${val}%`, background:col, borderRadius:3, transition:'width 0.35s' }} />
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background:'#0f0f1e', borderRadius:12, border:'1px solid #1c1c36', ...style }}>{children}</div>;
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ color:'#343456', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, padding:'16px 16px 8px' }}>{label}</div>
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
  const [selW, setSelW]         = useState(null);
  const [viewer, setViewer]     = useState(null);
  const [basho, setBasho]       = useState(null);
  const eventId = useRef(3);

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

    const pol = TRAINING_POLICIES.find(p => p.id === policy);
    const dis = DISCIPLINE_LEVELS.find(d => d.id === discipline);

    setWrestlers(prev => prev.map(w => {
      if (w.injured) {
        const newInjuryDays = Math.max(0, w.injuryDays - 1);
        return { ...w, injuryDays: newInjuryDays, injured: newInjuryDays > 0 };
      }

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
    const bouts  = active.map((w, i) => ({ id:i+1, w, opp: STOCK_OPPONENTS[i % STOCK_OPPONENTS.length], result:null, boutData:null }));
    const BASHO_MONTHS = [1, 3, 5, 7, 9, 11];
    const BASHO_NAMES  = ['January', 'March', 'May', 'July', 'September', 'November'];
    const bashoIdx  = BASHO_MONTHS.indexOf(stable.month);
    const bashoName = bashoIdx !== -1 ? `${BASHO_NAMES[bashoIdx]} Basho` : 'Grand Tournament';
    setBasho({ name: bashoName, day:1, bouts });
  };

  const resolveBout = (id) => {
    setBasho(prev => ({
      ...prev,
      bouts: prev.bouts.map(b => {
        if (b.id !== id) return b;
        const bd = generateBout(b.w, b.opp);
        return { ...b, result: bd.winner === 'w1' ? 'win' : 'loss', boutData: bd };
      }),
    }));
  };

  const openViewer = (bout) => {
    let bd = bout.boutData;
    if (!bd) {
      bd = generateBout(bout.w, bout.opp);
      setBasho(prev => ({ ...prev, bouts: prev.bouts.map(b => b.id===bout.id ? {...b, result:bd.winner==='w1'?'win':'loss', boutData:bd} : b) }));
    }
    setViewer({ w1:bout.w, w2:bout.opp, phases:bd.phases, winner:bd.winner, kimarite:bd.kimarite, e1:bd.e1, e2:bd.e2 });
  };

  const endBasho = () => {
    if (!basho) return;
    const wins   = basho.bouts.filter(b => b.result === 'win').length;
    const losses = basho.bouts.filter(b => b.result === 'loss').length;
    pushEvent('info', `${basho.name} concluded: ${wins}W–${losses}L. Reputation ${wins > losses ? '+' : ''}${(wins - losses) * 3}.`);
    setStable(prev => ({ ...prev, reputation: clamp(prev.reputation + (wins - losses) * 3, 0, 100) }));
    // Update records
    setWrestlers(prev => prev.map(w => {
      const bout = basho.bouts.find(b => b.w.id === w.id);
      if (!bout || !bout.result) return w;
      return { ...w, record: { wins: w.record.wins + (bout.result==='win'?1:0), losses: w.record.losses + (bout.result==='loss'?1:0) } };
    }));
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
      <Section label="STABLE CONDITION">
        <Card style={{ margin:'0 16px', padding:'14px' }}>
          {['morale','fatigue','discipline'].map(s => <CondBar key={s} stat={s} val={avgCond(s)} />)}
        </Card>
      </Section>

      {/* Inbox */}
      <Section label={`INBOX (${events.length})`}>
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
        <div style={{ color:'#333', fontSize:11, fontFamily:'JetBrains Mono,monospace', marginTop:4 }}>{selW.rank} · Age {selW.age}</div>
        {selW.injured && <div style={{ color:RED, fontSize:11, fontFamily:'JetBrains Mono,monospace', marginTop:4 }}>⚠ INJURED — {selW.injuryDays} sessions remaining</div>}
      </div>
      <Section label="BASE STATS">
        <Card style={{ margin:'0 16px', padding:'12px' }}>
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
        <Card style={{ margin:'0 16px', padding:'14px' }}>
          {Object.entries(selW.condition).map(([s, v]) => <CondBar key={s} stat={s} val={v} />)}
        </Card>
      </Section>
      <Section label="PROFILE">
        <Card style={{ margin:'0 16px', padding:'14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div><div style={{ color:'#2e2e50', fontSize:9, letterSpacing:2, marginBottom:3 }}>PERSONALITY</div><div style={{ color:GOLD, fontFamily:'Noto Serif JP,serif', fontSize:14 }}>{selW.personality}</div></div>
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
      <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, marginBottom:10 }}>ROSTER ({wrestlers.length})</div>
      {wrestlers.map(w => {
        const eff = Math.round(calcEffective(w));
        return (
          <div key={w.id} onClick={() => setSelW(w)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px', marginBottom:8, background:'#0d0d1c', borderRadius:12, border:`1px solid ${w.injured?'#2a1010':'#181830'}`, cursor:'pointer' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:w.injured?'#1a0808':'#12122a', border:`2px solid ${w.injured?RED:'#26266a'}`, flexShrink:0 }}>
              <span style={{ color:w.injured?RED:GOLD, fontSize:14, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{eff}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:w.injured?'#7a3030':'#d8d8f0', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{w.name}</div>
              <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace', marginTop:2 }}>{w.rank} · {w.personality}</div>
            </div>
            {w.injured && <div style={{ color:RED, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>INJ</div>}
            <div style={{ color:'#282848', fontSize:18 }}>›</div>
          </div>
        );
      })}
    </div>
  );

  const pol = TRAINING_POLICIES.find(p => p.id === policy);
  const dis = DISCIPLINE_LEVELS.find(d => d.id === discipline);

  const TrainScreen = (
    <div style={{ padding:'0 0 88px' }}>
      <Section label="TRAINING POLICY">
        {TRAINING_POLICIES.map(p => (
          <div key={p.id} onClick={() => setPolicy(p.id)} style={{ margin:'0 16px 6px', padding:'12px 14px', background: policy===p.id ? '#121228' : '#0d0d1c', borderRadius:12, border:`1px solid ${policy===p.id?GOLD:'#181830'}`, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ color: policy===p.id ? GOLD : '#9898b8', fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{p.name}</span>
              {policy===p.id && <span style={{ color:GOLD, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>● ACTIVE</span>}
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

      <Section label="DISCIPLINE LEVEL">
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

      <Section label="WRESTLER STATUS">
        {wrestlers.map(w => (
          <div key={w.id} style={{ margin:'0 16px 5px', padding:'10px 14px', background:'#0d0d1c', borderRadius:10, border:'1px solid #181830', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ color: w.injured?'#6a3030':'#c0c0d8', fontSize:13, fontFamily:'Noto Serif JP,serif' }}>{w.name}</div>
            {w.injured
              ? <span style={{ color:RED, fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>INJURED</span>
              : <div style={{ display:'flex', gap:10 }}>
                  <span style={{ color: w.condition.fatigue>70 ? RED : '#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>F:{Math.round(w.condition.fatigue)}</span>
                  <span style={{ color: w.condition.morale<40 ? RED : '#444', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>M:{Math.round(w.condition.morale)}</span>
                </div>
            }
          </div>
        ))}
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
            <span style={{ color: p.potential==='Elite'?GOLD:p.potential==='High'?GREEN:p.potential==='Medium'?'#4a88cc':'#555', fontSize:11, fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>◆ {p.potential.toUpperCase()}</span>
            <button onClick={() => recruit(p)} style={{ background: stable.funds>=p.cost ? GOLD : '#1e1e30', color: stable.funds>=p.cost ? '#0a0a0f' : '#333', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700, cursor: stable.funds>=p.cost ? 'pointer' : 'not-allowed', letterSpacing:1 }}>
              ¥{p.cost.toLocaleString()}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );

  const BashoScreen = !basho ? (
    <div style={{ padding:'40px 16px 88px', textAlign:'center' }}>
      <div style={{ color:GOLD, fontSize:26, fontFamily:'Noto Serif JP,serif', fontWeight:700, marginBottom:6 }}>January Basho</div>
      <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:2, marginBottom:8 }}>15 DAYS · RYŌGOKU KOKUGIKAN</div>
      <div style={{ color:'#555', fontSize:13, fontFamily:'Noto Serif JP,serif', marginBottom:32, lineHeight:1.6 }}>Your top wrestlers compete across 15 days. Each bout can be watched in the fight viewer.</div>
      <button onClick={startBasho} style={{ background:GOLD, color:'#0a0a0f', border:'none', borderRadius:12, padding:'14px 36px', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:2 }}>BEGIN BASHO</button>
    </div>
  ) : (
    <div style={{ padding:'12px 16px 88px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
        <div style={{ color:GOLD, fontSize:16, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{basho.name}</div>
        <div style={{ color:'#333', fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:2 }}>DAY {basho.day}</div>
      </div>
      <div style={{ color:'#2e2e50', fontFamily:'JetBrains Mono,monospace', fontSize:9, letterSpacing:3, marginBottom:14 }}>TAP WATCH TO VIEW · TAP RESULT TO RESOLVE</div>

      {basho.bouts.map(b => (
        <Card key={b.id} style={{ marginBottom:10, overflow:'hidden' }}>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ color:GOLD, fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{b.w.name}</div>
                <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{b.w.rank}</div>
              </div>
              <div style={{ color:'#2e2e50', fontFamily:'Noto Serif JP,serif', fontSize:12, alignSelf:'center' }}>vs</div>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:RED, fontSize:14, fontFamily:'Noto Serif JP,serif', fontWeight:700 }}>{b.opp.name}</div>
                <div style={{ color:'#333', fontSize:10, fontFamily:'JetBrains Mono,monospace' }}>{b.opp.rank}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => openViewer(b)} style={{ flex:1, background:'#12122a', border:'1px solid #26265a', borderRadius:8, padding:'9px 0', color:'#7878cc', fontFamily:'JetBrains Mono,monospace', fontSize:12, cursor:'pointer', fontWeight:700, letterSpacing:1 }}>
                👁 WATCH
              </button>
              {!b.result
                ? <button onClick={() => resolveBout(b.id)} style={{ flex:1, background:'#1a1218', border:'1px solid #3a2830', borderRadius:8, padding:'9px 0', color:'#8a6644', fontFamily:'JetBrains Mono,monospace', fontSize:12, cursor:'pointer', fontWeight:700, letterSpacing:1 }}>RESOLVE</button>
                : <div style={{ flex:1, borderRadius:8, padding:'9px 0', textAlign:'center', background: b.result==='win'?'#0a1a0a':'#1a0a0a', border:`1px solid ${b.result==='win'?'#2a4a2a':'#4a2a2a'}`, color: b.result==='win'?GREEN:RED, fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, letterSpacing:2 }}>
                    {b.result === 'win' ? '✓ WIN' : '✗ LOSS'}
                  </div>
              }
            </div>
          </div>
        </Card>
      ))}

      {basho.bouts.every(b => b.result) && (
        <button onClick={endBasho} style={{ width:'100%', marginTop:8, background:GOLD, color:'#0a0a0f', border:'none', borderRadius:12, padding:'14px', fontFamily:'JetBrains Mono,monospace', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:2 }}>
          END BASHO
        </button>
      )}
    </div>
  );

  // ── TABS ─────────────────────────────────────────────────────
  const TABS = [
    { id:'stable', label:'Stable',  icon:'⛩' },
    { id:'roster', label:'Roster',  icon:'👥' },
    { id:'train',  label:'Train',   icon:'⚡' },
    { id:'scout',  label:'Scout',   icon:'🔭' },
    { id:'basho',  label:'Basho',   icon:'🏆' },
  ];

  const SCREENS = { stable: StableScreen, roster: RosterScreen, train: TrainScreen, scout: ScoutScreen, basho: BashoScreen };

  return (
    <div style={{ background:'#0a0a0f', minHeight:'100vh', maxWidth:430, margin:'0 auto', fontFamily:'DM Sans,system-ui,sans-serif', position:'relative' }}>

      {/* Top bar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,10,15,0.96)', borderBottom:'1px solid #141430', backdropFilter:'blur(12px)', padding:'10px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:GOLD, fontSize:15, fontWeight:700, fontFamily:'Noto Serif JP,serif' }}>{stable.name}</div>
            <div style={{ color:'#282848', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:2, marginTop:1 }}>
              {stable.year} {MONTHS[stable.month-1].toUpperCase()} {String(stable.day).padStart(2,'0')} · {stable.time.toUpperCase()}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:GOLD, fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>¥{(stable.funds/1000).toFixed(0)}k</div>
              <div style={{ color:'#282848', fontSize:9, fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>FUNDS</div>
            </div>
            <button onClick={advance} style={{ background:GOLD, color:'#0a0a0f', border:'none', borderRadius:8, padding:'8px 13px', fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, cursor:'pointer', letterSpacing:1, whiteSpace:'nowrap' }}>
              ADVANCE ▶
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
      {viewer && <FightViewer bout={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

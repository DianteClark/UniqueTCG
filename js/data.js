/* Plebes TCG — profile, collection, packs, campaign, draft */
(function (root) {
  'use strict';
  const E = root.Engine;
  const SAVE = 'plebes-tcg-save-v1';
  const PACK_COST = 100;

  function starterCards(s) { const c = []; for (let r = 2; r <= 10; r++) for (let k = 0; k < 3; k++) c.push(s + r); c.push(s + 11, s + 12, s + 13); return c; }

  // ---------- profile ----------
  let P = null;
  function blank() {
    return { v: 1, gold: 100, packs: 1, coll: {}, decks: [], active: 0, kingdoms: [], campaign: { H: 0, D: 0, S: 0, C: 0, U: 0 }, hard: false, wins: 0, losses: 0, draft: null, name: 'Plebe' };
  }
  function load() { try { P = JSON.parse(localStorage.getItem(SAVE)) || null; } catch (e) { P = null; } return P; }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* storage unavailable */ } }
  function profile() { return P; }
  function reset() { P = null; try { localStorage.removeItem(SAVE); } catch (e) { } }

  function add(key, n) { P.coll[key] = (P.coll[key] || 0) + (n || 1); }
  function owned(key) { return P.coll[key] || 0; }
  function maxCopies(key) { const d = E.def(key); return d.type === 'troop' ? 3 : 1; }

  function unlockKingdom(s) {
    if (!P.kingdoms.includes(s)) P.kingdoms.push(s);
    add(s + 'A');
    starterCards(s).forEach(k => { if (owned(k) < maxCopies(k)) add(k); });
  }
  function start(s, name) {
    P = blank(); if (name) P.name = name;
    unlockKingdom(s);
    P.decks.push({ name: E.KINGDOMS[s].name + ' Starter', leader: s + 'A', cards: starterCards(s) });
    save();
  }
  function leaders() { return Object.keys(P.coll).filter(k => E.def(k).type === 'ace' && P.coll[k] > 0 && P.kingdoms.includes(E.def(k).suit)); }

  // ---------- packs ----------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const SUITS = E.SUITS;
  function rTroop() { return pick(SUITS) + (2 + Math.floor(Math.random() * 9)); }
  function rHero() { return pick(SUITS) + (11 + Math.floor(Math.random() * 3)); }
  function rollCard(slot) {
    const x = Math.random();
    if (slot < 3) return rTroop();
    if (slot === 3) {
      if (x < 0.6) return rTroop();
      if (x < 0.85) return rHero();
      if (x < 0.95) return pick(['JT', 'JF']);
      return rTroop() + ':f';
    }
    if (x < 0.5) return rHero();
    if (x < 0.75) { const h = rHero(); const vs = E.variantsOf(h).filter(v => v === 'o' || v === 'c'); return vs.length ? h + ':' + pick(vs) : h; }
    if (x < 0.85) return rTroop() + ':f';
    if (x < 0.92) return pick(['JT', 'JF', 'JT:c', 'JF:c']);
    if (x < 0.97) { const s = pick(SUITS); const vs = E.variantsOf(s + 'A').filter(v => v !== 'b' && v !== 'a'); return vs.length ? s + 'A:' + pick(vs) : s + 'A'; }
    const pool = [rHero(), pick(['JT', 'JF']), pick(SUITS) + 'A'];
    return pick(pool) + ':a';
  }
  function rarity(key) {
    const d = E.def(key);
    if (d.v === 'a') return 'legend';
    if (d.type === 'ace' || d.v === 'o' || d.v === 'c' || d.v === 'f') return 'rare';
    if (d.type === 'hero' || d.type === 'joker') return 'uncommon';
    return 'common';
  }
  const DUP_GOLD = { common: 5, uncommon: 15, rare: 30, legend: 80 };
  // open a pack: returns [{key, dup, gold}]
  function openPack(forced) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const key = (i === 4 && forced) ? forced : rollCard(i);
      const r = rarity(key);
      if (owned(key) >= maxCopies(key)) { P.gold += DUP_GOLD[r]; out.push({ key, dup: true, gold: DUP_GOLD[r], r }); }
      else { add(key); out.push({ key, dup: false, r }); }
    }
    save();
    return out;
  }
  function buyPack() { if (P.gold < PACK_COST) return false; P.gold -= PACK_COST; P.packs++; save(); return true; }

  // ---------- generated AI decks ----------
  function genDeck(suit, opt) {
    opt = opt || {};
    const maxR = opt.maxRank || 10, heroes = opt.heroes || [11, 12, 13], v = opt.variant || 'b';
    const c = [];
    const ranks = []; for (let r = 2; r <= maxR; r++) ranks.push(r);
    heroes.forEach(h => { const vs = E.variantsOf(suit + h); c.push(vs.includes(v) ? E.withV(suit + h, v) : suit + h); });
    if (opt.jokers) { c.push(opt.variant === 'a' ? 'JT:a' : 'JT'); c.push(opt.variant === 'a' ? 'JF:a' : 'JF'); }
    let i = 0; const cnt = {};
    while (c.length < 30) { const r = ranks[i % ranks.length]; i++; const k = suit + r; if ((cnt[k] || 0) >= 3) { if (i > 200) c.push(suit + (2 + (i % 9))); continue; } cnt[k] = (cnt[k] || 0) + 1; c.push(k); }
    return c.slice(0, 30);
  }

  // ---------- campaign ----------
  const STAGES = [
    { id: 'low', name: 'Low Ranks', sub: 'Troops 2 – 5', art: 3 },
    { id: 'mid', name: 'Mid Ranks', sub: 'Troops 2 – 7', art: 6 },
    { id: 'high', name: 'High Ranks', sub: 'Full troop line + a Jack', art: 9 },
    { id: 'jack', name: 'The Jack', sub: 'Mini-boss', art: 11 },
    { id: 'queen', name: 'The Queen', sub: 'Boss', art: 12 },
    { id: 'king', name: 'The King', sub: 'Boss', art: 13 },
    { id: 'ace', name: 'The Ace', sub: 'Final boss', art: 14 }
  ];
  const TWIST = {
    H: { text: 'Heartsbane holds: the castle starts at 40.', castle: 40 },
    D: { text: 'Portent Sound is rich: starts with 3 Coins and +1 attack.', startCoins: 3, bonusAtk: 1 },
    S: { text: 'Mt. Falstaff rises: the boss starts with two troops on the board.', startBoard: [null, 'S6', null, 'S8', null] },
    C: { text: 'Cyrus Glen overgrows: every boss troop has +1 attack.', bonusAtk: 1 },
    U: { text: 'United Falls stands together: castle 40 and two troops already in line.', castle: 40, startBoard: [null, 'U7', null, 'U9', null] }
  };
  function stageSetup(suit, st) {
    const hard = P.hard;
    const V = hard ? 'a' : (st >= 5 ? 'o' : 'b');
    const cfg = [
      { maxRank: 5, heroes: [], ai: 1, castle: 15 },
      { maxRank: 7, heroes: [], ai: 1, castle: 20 },
      { maxRank: 10, heroes: [11], ai: 2, castle: 25 },
      { maxRank: 10, heroes: [11], ai: 2, castle: 30 },
      { maxRank: 10, heroes: [11, 12], ai: 3, castle: 30 },
      { maxRank: 10, heroes: [11, 12, 13], ai: 3, castle: 30, jokers: true },
      { maxRank: 10, heroes: [11, 12, 13], ai: 3, castle: 30, jokers: true }
    ][st];
    const deck = genDeck(suit, { maxRank: cfg.maxRank, heroes: cfg.heroes, variant: st >= 3 ? V : 'b', jokers: cfg.jokers });
    const p = { leader: suit + 'A' + (hard ? ':a' : ''), deck, ai: hard ? 3 : cfg.ai, castle: cfg.castle + (hard ? 5 : 0), name: E.KINGDOMS[suit].name + ' — ' + STAGES[st].name };
    if (st === 6) { const t = TWIST[suit]; Object.assign(p, { castle: t.castle || p.castle, startBoard: t.startBoard, startCoins: t.startCoins, bonusAtk: t.bonusAtk }); }
    return p;
  }
  function campaignOpen(suit) {
    if (suit === 'U') return ['H', 'D', 'S', 'C'].every(s => P.campaign[s] >= 7);
    return true;
  }
  // rewards; returns list of messages + forced card for the pack
  function campaignWin(suit, st) {
    const msgs = []; let forced = null;
    const first = P.campaign[suit] === st;
    if (first) P.campaign[suit] = st + 1;
    P.gold += 30; msgs.push('+30 gold');
    P.packs += 1; msgs.push('+1 pack');
    if (st >= 3 && st <= 5 && first) {
      const id = suit + (11 + st - 3);
      const v = E.variantsOf(id).find(x => x !== 'b' && !owned(E.withV(id, x)));
      if (v) { forced = E.withV(id, v); msgs.push('Guaranteed: ' + E.def(forced).name + ' (' + E.def(forced).vName + ')'); }
    }
    if (st === 6 && first) {
      const fresh = !P.kingdoms.includes(suit);
      unlockKingdom(suit);
      P.packs += 1; msgs.push(fresh ? 'Kingdom unlocked: ' + E.KINGDOMS[suit].name + '! Its Ace and starter cards are yours.' : 'Kingdom reclaimed: +1 bonus pack');
      if (fresh) P.decks.push({ name: E.KINGDOMS[suit].name + ' Starter', leader: suit + 'A', cards: starterCards(suit) });
      if (['H', 'D', 'S', 'C', 'U'].every(s => P.campaign[s] >= 7)) msgs.push('Campaign complete! Hard mode is now available.');
    }
    save();
    return { msgs, forced };
  }

  // ---------- draft ----------
  const DRAFT_COST = 100;
  function draftStart() {
    if (P.gold < DRAFT_COST) return false;
    P.gold -= DRAFT_COST;
    const aces = E.SUITS.slice().sort(() => Math.random() - 0.5).slice(0, 3).map(s => s + 'A');
    P.draft = { stage: 'leader', aceChoices: aces, leader: null, picks: [], options: null, wins: 0, losses: 0 };
    save(); return true;
  }
  function draftOptions() {
    const d = P.draft; const s = d.leader[0];
    const opts = [];
    while (opts.length < 3) {
      const x = Math.random();
      let k = x < 0.45 ? s + (2 + Math.floor(Math.random() * 9)) : x < 0.75 ? rollCard(3) : rollCard(4);
      const def = E.def(k); if (def.type === 'ace') continue;
      if (def.type === 'troop' && def.v === 'f') k = def.id;
      if (!opts.includes(k)) opts.push(k);
    }
    d.options = opts; save(); return opts;
  }
  function draftDeck() {
    const d = P.draft; const s = d.leader[0];
    const c = d.picks.slice(); const cnt = {};
    c.forEach(k => { const id = E.parseKey(k).id; cnt[id] = (cnt[id] || 0) + 1; });
    let r = 2, guard = 0;
    while (c.length < 30 && guard++ < 500) { const k = s + r; if ((cnt[k] || 0) < 3) { c.push(k); cnt[k] = (cnt[k] || 0) + 1; } r = r >= 10 ? 2 : r + 1; }
    return c;
  }
  function draftReward() {
    const w = P.draft.wins; const packs = [0, 1, 2, 3][w]; const gold = [20, 20, 40, 100][w];
    P.packs += packs; P.gold += gold; P.draft = null; save();
    return { packs, gold };
  }

  function reward(won, level) { const g = won ? [0, 30, 45, 60][level] : 15; P.gold += g; if (won) P.wins++; else P.losses++; save(); return g; }

  root.Data = { load, save, profile, reset, start, add, owned, maxCopies, leaders, openPack, buyPack, PACK_COST, rarity, genDeck, starterCards,
    STAGES, TWIST, stageSetup, campaignOpen, campaignWin, draftStart, draftOptions, draftDeck, draftReward, DRAFT_COST, reward, unlockKingdom };
})(this);

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
  // Boss personalities: Jack, Queen, King, Ace of each kingdom
  const BOSS = {
    H: {
      11: ['Sir Ruddock, the Duelist', 'Pick your best troop. I will cut it from the line.', 'First blood is not the last.', 'Back to the barracks with you.', 'A fair duel. I yield.'],
      12: ['Queen Carmine', 'Heartsbane mends what it breaks. Can you?', 'A scratch. I have healed worse.', 'Rest now. Mercy is for the living.', 'Then let my heart go Bloodless...'],
      13: ['King Gules', 'Every heart in this kingdom beats for the crusade.', 'Bleed for me, Heartsbane!', 'Kneel.', 'The crusade ends here.'],
      14: ['The Heartsbane Throne', 'These walls are made of oaths. Forty of them.', 'The walls remember every wound.', 'No one breaches Heartsbane.', 'The gates open for you, champion.']
    },
    D: {
      11: ['Fenwick the Fixer', 'Everyone has a price. Let us find yours.', 'Fine, fine. Let us renegotiate.', 'Pleasure doing business.', 'Keep the change.'],
      12: ['Queen Azure', 'Portent Sound invests in winners. Are you one?', 'A poor quarter. It happens.', 'Your account is closed.', 'I will be buying your cards someday.'],
      13: ['King Ledger', 'The tax is due. Pay in Crowns or in troops.', 'This will be noted in the ledger.', 'Collected in full.', 'Audit me, then. You earned it.'],
      14: ['The Portent Treasury', 'The vaults are open. Three coins to start, and every one hits harder.', 'Gold does not bleed. It just runs out.', 'The house always wins.', 'The treasury is yours.']
    },
    S: {
      11: ['Pick, the Tunneler', 'I do not go around walls. I go under them.', 'Cave-in! Cave-in!', 'Straight to your castle, like I said.', 'I will dig my way back.'],
      12: ['Queen Umbra', 'Every damaged thing on this mountain belongs to me.', 'The mountain keeps what it takes.', 'Last rites, said and done.', 'Bury me with my crown.'],
      13: ['King Cairn', 'Fallen heroes do not stay fallen on Mt. Falstaff.', 'Dig them up. All of them.', 'Another stone for the cairn.', 'Even kings return to the mountain.'],
      14: ['The Falstaff Peak', 'The mountain wakes with soldiers already on the field.', 'The rock cracks, but it holds.', 'The peak stands.', 'The summit is yours. Mind the drop.']
    },
    C: {
      11: ['Bramble the Grafter', 'Two saplings make one strong tree.', 'Prune me all you like. I grow back.', 'Rooted.', 'Composted. Fair enough.'],
      12: ['Queen Verdance', 'Everything in the glen blooms when I arrive.', 'Weeds. Just weeds.', 'Bloom, and be gone.', 'Spring will come again.'],
      13: ['King Thornwood', 'My club has flattened bigger kingdoms than yours.', 'That only makes me angry.', 'SMASH.', 'The old oak falls.'],
      14: ['The Cyrus Grove', 'Every troop in the grove grows stronger by the hour.', 'The roots run deeper than that.', 'The glen swallows you whole.', 'The grove bows to you.']
    },
    U: {
      11: ['Jack of United Falls', 'Nobody stands alone here. Not even you.', 'Lift each other up!', 'Together, always.', 'You fought with heart. Respect.'],
      12: ['Queen of United Falls', 'My voice carries for everyone who cannot be heard.', 'We have weathered worse, together.', 'Our voices carried.', 'Then carry the message with you.'],
      13: ['King of United Falls', 'I do not fall while one of mine still stands.', 'Still standing.', 'Unbowed.', 'You have earned your place among us.'],
      14: ['United Falls', 'Forty strong walls and a line that holds together.', 'The line bends. It does not break.', 'Stronger together.', 'The falls welcome a new champion.']
    }
  };
  function bossFor(suit, st) {
    if (st < 3) return null;
    const rank = 11 + (st - 3);
    const b = BOSS[suit][rank];
    return { name: b[0], intro: b[1], hurt: b[2], win: b[3], lose: b[4], rank, sig: rank === 14 ? suit + 'A:a' : suit + rank + ':a' };
  }

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
    const boss = bossFor(suit, st);
    let leader = suit + 'A' + (hard ? ':a' : '');
    if (boss) {
      if (boss.rank === 14) leader = boss.sig;
      else { const at = deck.findIndex(k => E.parseKey(k).id === suit + boss.rank); if (at >= 0) deck[at] = boss.sig; else deck[deck.length - 1] = boss.sig; }
    }
    const p = { leader, deck, ai: hard ? 3 : cfg.ai, castle: cfg.castle + (hard ? 5 : 0), name: boss ? boss.name : E.KINGDOMS[suit].name + ' — ' + STAGES[st].name, boss };
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

  // ---------- crafting ----------
  const CRAFT = { common: 40, uncommon: 100, rare: 250, legend: 600 };
  function craftCost(key) { const d = E.def(key); if (d.token || (d.type === 'ace' && d.v === 'b')) return null; return CRAFT[rarity(key)]; }
  function craft(key) { const c = craftCost(key); if (c == null || P.gold < c || owned(key) >= maxCopies(key)) return false; P.gold -= c; add(key); save(); return true; }

  // ---------- deck codes ----------
  const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = str => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  function deckCode(deck) {
    const cnt = {}; deck.cards.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
    return 'PLB1.' + b64e(JSON.stringify({ n: deck.name, l: deck.leader, c: Object.entries(cnt).map(([k, n]) => n > 1 ? k + '*' + n : k).join(',') }));
  }
  function parseCode(code) {
    try {
      code = String(code).trim();
      if (!code.startsWith('PLB1.')) return null;
      const o = JSON.parse(b64d(code.slice(5)));
      const valid = new Set(E.allKeys());
      if (!valid.has(o.l) || E.def(o.l).type !== 'ace') return null;
      const cards = [];
      for (const part of String(o.c).split(',')) {
        if (!part) continue;
        const [k, n] = part.split('*');
        if (!valid.has(k) || E.def(k).type === 'ace') return null;
        for (let i = 0; i < Math.min(3, +(n || 1)); i++) cards.push(k);
      }
      if (cards.length > 40) return null;
      return { name: String(o.n || 'Imported deck').slice(0, 24), leader: o.l, cards };
    } catch (e) { return null; }
  }

  // ---------- daily quests ----------
  const QUESTS = [
    { id: 'win2', text: 'Win 2 matches', ev: 'win', goal: 2, gold: 80 },
    { id: 'lies2', text: 'Catch 2 lies by calling bluffs', ev: 'catch', goal: 2, gold: 80 },
    { id: 'kill10', text: 'Destroy 10 enemy cards', ev: 'kill', goal: 10, gold: 60 },
    { id: 'dmg40', text: 'Deal 40 damage to enemy castles', ev: 'castle', goal: 40, gold: 60 },
    { id: 'flush', text: 'Make a Flush or better on your board', ev: 'hand5', goal: 1, gold: 100 },
    { id: 'trips3', text: 'Make Three of a Kind or better 3 times', ev: 'hand3', goal: 3, gold: 80 },
    { id: 'power2', text: 'Use your Ace power 2 times', ev: 'power', goal: 2, gold: 50 },
    { id: 'bluff5', text: 'Play 5 cards face-down', ev: 'bluff', goal: 5, gold: 60 },
    { id: 'camp1', text: 'Win a campaign stage', ev: 'campaign', goal: 1, pack: 1 },
    { id: 'duel1', text: 'Win a duel against a friend', ev: 'duelwin', goal: 1, pack: 1 },
    { id: 'play15', text: 'Play 15 cards', ev: 'play', goal: 15, gold: 50 }
  ];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function quests() {
    const day = today();
    if (!P.quests || P.quests.day !== day) {
      let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const pool = QUESTS.slice(); const pick3 = [];
      while (pick3.length < 3) { h = (h * 1103515245 + 12345) >>> 0; pick3.push(pool.splice(h % pool.length, 1)[0].id); }
      P.quests = { day, list: pick3.map(id => ({ id, n: 0, claimed: false })) };
      save();
    }
    return P.quests.list.map(q => Object.assign({}, QUESTS.find(x => x.id === q.id), q));
  }
  function questBump(ev, n) {
    if (!P) return;
    quests();
    let changed = false;
    P.quests.list.forEach(q => { const def = QUESTS.find(x => x.id === q.id); if (def.ev === ev && q.n < def.goal) { q.n = Math.min(def.goal, q.n + (n || 1)); changed = true; } });
    if (changed) save();
  }
  function questClaim(id) {
    const q = P.quests.list.find(x => x.id === id); const def = QUESTS.find(x => x.id === id);
    if (!q || q.claimed || q.n < def.goal) return null;
    q.claimed = true; if (def.gold) P.gold += def.gold; if (def.pack) P.packs += def.pack; save();
    return def.gold ? '+' + def.gold + ' gold' : '+' + def.pack + ' pack';
  }
  const questsReady = () => quests().filter(q => !q.claimed && q.n >= q.goal).length;

  // ---------- tutorial ----------
  function tutorialSetup() {
    // decks are drawn from the end, so these read bottom-up
    const me = ['H10', 'H9', 'H7', 'H6', 'H2', 'H4', 'H13', 'H9', 'H4', 'H6', 'H8', 'H12', 'H5', 'H5', 'H3'];
    const op = ['S9', 'S10', 'S8', 'S7', 'S6', 'S5', 'S3', 'S9', 'S4', 'S5', 'S8', 'S3', 'S2', 'S6', 'S4'];
    return {
      players: [{ leader: 'HA', deck: me, stack: true, name: P.name }, { leader: 'SA', deck: op, stack: true, name: 'Pick, the Tunneler', castle: 16, ai: 1 }],
      first: 0, coinWinner: 0, noMulligan: true,
      script: { 1: [['play', 'S4', 2]], 2: [['play', 'S6', 0]], 3: [['bluff', 'S2', 4, 9, 'S']] }
    };
  }
  function tutorialDone() { const first = !P.tutorial; P.tutorial = true; if (first) { P.gold += 50; P.packs += 1; } save(); return first; }

  function reward(won, level) { const g = won ? [0, 30, 45, 60][level] : 15; P.gold += g; if (won) P.wins++; else P.losses++; save(); return g; }

  root.Data = { load, save, profile, reset, start, add, owned, maxCopies, leaders, openPack, buyPack, PACK_COST, rarity, genDeck, starterCards,
    STAGES, TWIST, stageSetup, bossFor, craftCost, craft, deckCode, parseCode, quests, questBump, questClaim, questsReady, tutorialSetup, tutorialDone, campaignOpen, campaignWin, draftStart, draftOptions, draftDeck, draftReward, DRAFT_COST, reward, unlockKingdom };
})(this);

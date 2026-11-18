/* Plebes TCG — rules engine (pure, no DOM). Works in browser (window.Engine) and Node (module.exports). */
(function (root) {
  'use strict';

  // ---------- constants ----------
  const SUITS = ['H', 'D', 'S', 'C', 'U'];
  const KINGDOMS = {
    H: { name: 'Heartsbane', suit: 'Hearts', sym: 'H', color: '#d43c3c', trait: 'Blood Price', traitText: 'Pay 1 castle health: this troop gets +3 attack this turn.' },
    D: { name: 'Portent Sound', suit: 'Diamonds', sym: 'D', color: '#3d82c4', trait: 'Tithe', traitText: 'When played face-up, gain 1 Coin (max 4). While you hold 3+ Coins, Diamonds troops get +1 attack. Coins pay for cards when Crowns run short.' },
    S: { name: 'Mt. Falstaff', suit: 'Spades', sym: 'S', color: '#8a4aa6', trait: 'Buried', traitText: 'When destroyed, deal 2 damage to the enemy castle.' },
    C: { name: 'Cyrus Glen', suit: 'Clubs', sym: 'C', color: '#2f9a58', trait: 'Grow', traitText: 'Gains +1 attack at the start of each of your turns (up to +2).' },
    U: { name: 'United Falls', suit: 'United', sym: 'U', color: '#4a3f63', trait: 'United', traitText: '+1 attack while another United card is on your board, +2 with two or more.' }
  };
  const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const rankLabel = r => RANK_LABEL[r] || String(r);
  const RANK_NAME = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
  const cardName = (r, s) => (RANK_NAME[r] || String(r)) + ' of ' + KINGDOMS[s].suit;
  const MAX_CROWNS = 6, HAND_MAX = 7, START_HAND = 5, CASTLE = 30, BOARD = 5;

  const TROOP = { 2: [3, 2], 3: [2, 3], 4: [1, 4], 5: [3, 5], 6: [2, 6], 7: [1, 7], 8: [4, 8], 9: [3, 9], 10: [2, 10] };
  const troopCost = r => (r <= 4 ? 1 : r <= 7 ? 2 : 3);
  const HERO = { 11: { cost: 3, atk: 3, hp: 5 }, 12: { cost: 4, atk: 2, hp: 8 }, 13: { cost: 5, atk: 5, hp: 10 } };

  // hero abilities: kind 'play' (on play) or 'passive'; repeat = animated version re-triggers each turn
  const ABIL = {
    H11: { id: 'duelist', name: 'Duelist', kind: 'passive', text: 'Attacks the weakest enemy in any lane.' },
    H12: { id: 'mercy', name: 'Mercy', kind: 'play', repeat: true, text: 'Heal your castle 3 and fully heal your most damaged troop.' },
    H13: { id: 'crusade', name: 'Crusade', kind: 'play', repeat: true, text: 'All your Hearts troops get +1 attack this turn.' },
    D11: { id: 'bribe', name: 'Bribe', kind: 'play', repeat: true, text: 'Spend Coins to steal the best enemy number troop costing no more than your Coins.' },
    D12: { id: 'invest', name: 'Invest', kind: 'play', repeat: true, text: 'Spend all your Coins and draw that many cards.' },
    D13: { id: 'tax', name: 'Tax', kind: 'play', repeat: true, text: 'Your opponent gets 1 fewer Crown next turn.' },
    S11: { id: 'tunnel', name: 'Tunnel', kind: 'passive', text: 'Always attacks the enemy castle, skipping blockers.' },
    S12: { id: 'lastrites', name: 'Last Rites', kind: 'play', repeat: true, text: 'Destroy the strongest damaged enemy.' },
    S13: { id: 'exhume', name: 'Exhume', kind: 'play', repeat: true, text: 'Return the best hero from your graveyard to your hand.' },
    C11: { id: 'graft', name: 'Graft', kind: 'play', repeat: false, text: 'Absorb your weakest other troop, adding its attack and health.' },
    C12: { id: 'bloom', name: 'Bloom', kind: 'play', repeat: true, text: 'All your Clubs get +1/+1.' },
    C13: { id: 'smash', name: 'Smash', kind: 'passive', text: 'Also hits the enemies on either side of its target.' },
    U11: { id: 'stand', name: 'Stand Together', kind: 'play', repeat: true, text: 'All your United cards get +1/+1.' },
    U12: { id: 'voice', name: 'Raised Voice', kind: 'play', repeat: true, text: 'Reveal all enemy hidden cards. Lies are destroyed.' },
    U13: { id: 'unbowed', name: 'Unbowed', kind: 'passive', text: "Can't be destroyed while another United card is on your board." }
  };
  const ACE_POWER = {
    H: { b: ['rally', 'Rally', 'Heal your castle 6. Pick a troop: fully heal it and give it +2 attack this turn.'], o: ['laststand', 'Last Stand', 'Your troops get +2 attack this turn.'] },
    D: { b: ['treasury', 'Treasury', 'Gain 3 Crowns this turn.'], o: ['windfall', 'Windfall', 'Draw 2 cards and gain 2 Coins.'] },
    S: { b: ['gravecall', 'Grave Call', 'Return your troops destroyed since your last turn to empty slots.'], o: ['graverobber', 'Grave Robber', 'Put the strongest card in your graveyard into an empty slot.'] },
    C: { b: ['overgrowth', 'Overgrowth', 'Your troops get +2 health.'], o: ['wildwood', 'Wildwood', 'Your troops get +2 attack permanently.'] },
    U: { b: ['solidarity', 'Solidarity', 'Until the end of your next turn, your board counts as every suit.'], o: ['march', 'March', 'Your troops get +1/+1 permanently.'] }
  };
  const VARIANTS = {
    b: { name: 'Base', short: '' },
    f: { name: 'Foil', short: 'Foil' },
    o: { name: 'Origin', short: 'Origin' },
    c: { name: 'Classic', short: 'Classic' },
    a: { name: 'Animated', short: 'Animated' }
  };
  const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
  const HAND_TEXT = [
    'No bonus.',
    'The paired troops get +1 attack.',
    'Your troops take 1 less damage from every hit.',
    'Those three take no counter-damage when attacking.',
    'Each attacking troop also hits the enemy castle for 1.',
    'Your kingdom bonus triggers at the start of your turn.',
    'Your castle takes no damage from attacks.',
    'At the end of your turn, destroy the weakest enemy.',
    '+2 attack to all troops.',
    'You win the game!'
  ];
  const FLUSH_TEXT = { H: 'heal castle 3', D: 'gain 1 Coin', S: 'draw 1 card', C: 'troops +1 attack', U: 'troops +1/+1' };

  // ---------- card keys ----------
  // key format: <suit><rank>[:variant]   e.g. H7, H7:f, H13:a, HA, HA:o, JT, JF:c, HB13 (bloodless token)
  function parseKey(key) {
    const [id, v0] = key.split(':');
    const v = v0 || 'b';
    if (id === 'JT' || id === 'JF') return { id, suit: null, rank: 0, v, type: 'joker' };
    if (id.startsWith('HB')) return { id, suit: 'H', rank: +id.slice(2), v: 'b', type: 'hero', token: true };
    const suit = id[0];
    const r = id.slice(1);
    if (r === 'A') return { id, suit, rank: 14, v, type: 'ace' };
    const rank = +r;
    return { id, suit, rank, v, type: rank >= 11 ? 'hero' : 'troop' };
  }
  const cache = {};
  function def(key) {
    if (cache[key]) return cache[key];
    const p = parseKey(key);
    const d = Object.assign({ key }, p);
    if (p.type === 'troop') {
      d.cost = troopCost(p.rank); [d.atk, d.hp] = TROOP[p.rank];
      d.name = rankLabel(p.rank) + ' of ' + KINGDOMS[p.suit].suit;
      d.abilityName = KINGDOMS[p.suit].trait; d.text = KINGDOMS[p.suit].traitText;
    } else if (p.type === 'hero') {
      const h = HERO[p.rank];
      d.cost = h.cost; d.atk = h.atk; d.hp = h.hp;
      const title = { 11: 'Jack', 12: 'Queen', 13: 'King' }[p.rank];
      if (p.token) {
        d.name = 'Bloodless ' + title; d.cost = 0; d.hp = Math.ceil(h.hp / 2);
        d.abilityName = 'Bloodless'; d.text = 'Returned from death. Cannot be healed. No ability.';
      } else {
        const a = ABIL[p.suit + p.rank];
        d.abil = a.id; d.abilKind = a.kind; d.abilityName = a.name; d.text = a.text;
        d.name = title + ' of ' + KINGDOMS[p.suit].suit;
        if (p.v === 'o') { // Origin: echo
          if (a.kind === 'play') { d.echo = true; d.text += ' Echo: also triggers when destroyed.'; }
          else { d.atk += 1; d.text += ' Origin: +1 attack.'; }
        } else if (p.v === 'c') { // Classic: old guard
          d.cost -= 1; d.atk = Math.max(1, d.atk - 1); d.hp -= 2; d.text += ' Old Guard: cheaper, smaller.';
        } else if (p.v === 'a') {
          d.cost += 1;
          if (a.kind === 'play' && a.repeat) { d.awaken = true; d.text += ' Awakened: repeats at the start of each of your turns.'; }
          else { d.atk += 1; d.hp += 2; d.text += ' Awakened: +1/+2.'; }
        }
        if (p.suit === 'H') d.text += ' Revives as Bloodless when destroyed.';
      }
    } else if (p.type === 'ace') {
      const pw = ACE_POWER[p.suit][p.v === 'o' ? 'o' : 'b'];
      d.power = pw[0]; d.abilityName = pw[1]; d.text = pw[2];
      d.castle = p.v === "c" ? 35 : CASTLE; d.uses = p.v === 'a' ? 2 : 1;
      d.name = 'Ace of ' + KINGDOMS[p.suit].suit;
      d.cost = 0;
      if (p.v === 'c') d.text += ' Classic: castle starts at 35.';
      if (p.v === 'a') d.text += ' Animated: usable twice.';
    } else if (p.type === 'joker') {
      if (p.id === 'JT') { d.name = 'Joker — TRUE'; d.cost = 1; d.atk = 1; d.hp = 3; d.abil = 'truth'; d.abilityName = 'Truth'; d.text = 'On play: reveal all enemy hidden cards. Each lie is destroyed and deals 3 to its owner\'s castle.'; }
      else { d.name = 'Joker — FALSE'; d.cost = 2; d.atk = 2; d.hp = 4; d.abil = 'wild'; d.abilityName = 'Wild'; d.text = 'Counts as any rank and suit you choose for poker hands. Can never be called.'; }
      if (p.v === 'c') { d.cost = Math.max(0, d.cost - 1); d.atk = Math.max(0, d.atk - 1); d.hp -= 2; d.text += ' Old Guard: cheaper, smaller.'; }
      if (p.v === 'a') { if (p.id === 'JT') { d.awaken = true; d.text += ' Awakened: repeats each turn.'; } else { d.atk += 1; d.hp += 2; d.text += ' Awakened: +1/+2.'; } }
    }
    d.vName = VARIANTS[p.v] ? VARIANTS[p.v].name : 'Base';
    cache[key] = d;
    return d;
  }
  // which variants exist for a base id
  function variantsOf(id) {
    const p = parseKey(id);
    if (p.type === 'troop') return ['b', 'f'];
    if (p.type === 'joker') return ['b', 'c', 'a'];
    if (p.suit === 'U') return ['b', 'a'];
    return ['b', 'o', 'c', 'a'];
  }
  const withV = (id, v) => (v === 'b' ? id : id + ':' + v);
  function allKeys() {
    const out = [];
    for (const s of SUITS) {
      for (let r = 2; r <= 13; r++) for (const v of variantsOf(s + r)) out.push(withV(s + r, v));
      for (const v of variantsOf(s + 'A')) out.push(withV(s + 'A', v));
    }
    for (const j of ['JT', 'JF']) for (const v of variantsOf(j)) out.push(withV(j, v));
    return out;
  }

  // ---------- deck rules ----------
  function validateDeck(leader, cards) {
    const errs = [];
    const L = parseKey(leader);
    if (L.type !== 'ace') errs.push('Leader must be an Ace.');
    if (cards.length !== 30) errs.push('Deck needs exactly 30 cards (has ' + cards.length + ').');
    const bySuit = {}; const byId = {}; const byKey = {};
    for (const k of cards) {
      const d = def(k);
      if (d.type === 'ace') { errs.push('Aces are leaders, not deck cards.'); continue; }
      if (d.token) { errs.push('Bloodless cards are not deck cards.'); continue; }
      if (d.suit) bySuit[d.suit] = (bySuit[d.suit] || 0) + 1;
      byId[d.id] = (byId[d.id] || 0) + 1; byKey[k] = (byKey[k] || 0) + 1;
    }
    for (const id in byId) { const p = parseKey(id); if (p.type === 'troop' && byId[id] > 3) errs.push('Max 3 copies of ' + def(id).name + '.'); }
    for (const k in byKey) { const d = def(k); if ((d.type === 'hero' || d.type === 'joker') && byKey[k] > 1) errs.push('Only 1 copy of ' + d.name + (d.v !== 'b' ? ' (' + d.vName + ')' : '') + '.'); }
    const allies = Object.keys(bySuit).filter(s => s !== L.suit && s !== 'U');
    if (L.suit !== 'U') {
      if ((bySuit.U || 0) > 5) errs.push('Max 5 United cards when splashing.');
    }
    if (allies.length > 1) errs.push('Only one ally suit allowed (found ' + allies.map(s => KINGDOMS[s].suit).join(', ') + ').');
    if (allies.length === 1 && bySuit[allies[0]] > 10) errs.push('Max 10 ally-suit cards.');
    return errs;
  }

  // ---------- rng ----------
  function rnd(s) { // mulberry32 stored in state
    let t = (s.seed = (s.seed + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(s, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // ---------- game setup ----------
  function newGame(opts) {
    const s = { seed: opts.seed || (Date.now() & 0xffffffff), turn: 0, active: 0, winner: null, uid: 1, ev: [], log: [], players: [] };
    for (let i = 0; i < 2; i++) {
      const o = opts.players[i];
      const L = def(o.leader);
      const p = {
        name: o.name || ('Player ' + (i + 1)), leader: o.leader, suit: L.suit,
        castle: (o.castle || L.castle), castleMax: (o.castle || L.castle),
        crowns: 0, maxCrowns: 0, coins: 0, taxed: 0, powerUses: L.uses, deck: o.stack ? o.deck.slice() : shuffle(s, o.deck.slice()), hand: [], grave: [],
        board: [null, null, null, null, null], mucked: false, hiddenPlayed: false, solidUntil: -1, died: [], ai: o.ai || 0
      };
      s.players.push(p);
    }
    for (let i = 0; i < 2; i++) { // optional starting boards (boss twists)
      const o = opts.players[i];
      if (o.startBoard) o.startBoard.forEach((k, j) => { if (k) s.players[i].board[j] = makeUnit(s, i, k); });
      if (o.startCoins) s.players[i].startCoins = o.startCoins;
      if (o.bonusAtk) s.players[i].bonusAtk = o.bonusAtk;
    }
    // coin toss: the winner chooses to go first or second
    s.phase = 'coin';
    s.coinWinner = opts.coinWinner != null ? opts.coinWinner : (rnd(s) < 0.5 ? 0 : 1);
    s.active = s.coinWinner;
    s.mull = [false, false];
    if (opts.first != null) chooseOrder(s, opts.first === s.coinWinner);
    if (opts.noMulligan && s.phase === 'mulligan') { s.mull = [true, true]; beginPlay(s); }
    return s;
  }

  function chooseOrder(s, winnerFirst) {
    const w = s.coinWinner;
    s.first = winnerFirst ? w : 1 - w;
    for (let i = 0; i < 2; i++) for (let k = 0; k < START_HAND; k++) draw(s, i, true);
    const second = s.players[1 - s.first];
    second.coins = 1; // second player compensation
    s.players.forEach(p => { if (p.startCoins) p.coins = Math.max(p.coins, p.startCoins); });
    s.phase = 'mulligan';
    s.active = s.first;
    log(s, s.players[w].name + ' won the toss and chose to go ' + (winnerFirst ? 'first.' : 'second.'));
    ev(s, { t: 'order', winner: w, first: s.first });
  }
  function beginPlay(s) {
    s.phase = 'play';
    s.active = s.first;
    s.firstTurn = true;
    startTurn(s);
  }

  function makeUnit(s, owner, key) {
    const d = def(key);
    return { uid: s.uid++, key, owner, orig: owner, atk: d.atk, hp: d.hp, maxHp: d.hp, tmp: 0, perm: 0, grow: 0, hidden: false, decl: null, wild: null, bp: false, born: s.turn };
  }

  function log(s, msg) { s.log.push(msg); if (s.log.length > 60) s.log.shift(); }
  function ev(s, e) { s.ev.push(e); }

  function draw(s, i, silent) {
    const p = s.players[i];
    if (!p.deck.length) { damageCastle(s, i, 2, 'fatigue'); if (!silent) log(s, p.name + ' has no cards left and takes 2 fatigue.'); return null; }
    const k = p.deck.pop();
    if (p.hand.length >= HAND_MAX) { p.grave.push(k); if (!silent) log(s, p.name + ' overdrew; ' + def(k).name + ' was burned.'); return null; }
    p.hand.push(k);
    if (!silent) ev(s, { t: 'draw', side: i });
    return k;
  }

  // ---------- unit helpers ----------
  function unitSuit(u) { if (u.hidden) return u.decl.suit; if (u.wild) return u.wild.suit; return def(u.key).suit; }
  function unitRank(u) { if (u.hidden) return u.decl.rank; if (u.wild) return u.wild.rank; const d = def(u.key); return d.type === 'joker' ? 0 : d.rank; }
  function realDef(u) { return def(u.key); }
  function hasAbil(u, id) { return !u.hidden && def(u.key).abil === id; }

  // poker evaluation of a board
  function evalBoard(s, side) {
    const p = s.players[side];
    const cards = [];
    p.board.forEach((u, slot) => { if (u) { const r = unitRank(u); if (r) cards.push({ r, suit: unitSuit(u), slot }); } });
    const res = { rank: 0, name: HAND_NAMES[0], slots: [], flushSuit: null, has: [], lit: [], why: '',
      parts: { pair: [], twoPair: false, trips: [], straight: false, flush: false, full: false, quads: false, sflush: false, royal: false } };
    if (!cards.length) return res;
    const allSuits = p.solidUntil >= s.turn;
    const byR = {};
    cards.forEach(c => { (byR[c.r] = byR[c.r] || []).push(c.slot); });
    const groups = Object.keys(byR).map(r => ({ r: +r, slots: byR[r] })).sort((a, b) => b.slots.length - a.slots.length || b.r - a.r);
    let flush = false, straight = false, high = 0;
    if (cards.length === 5) {
      const suits = new Set(cards.map(c => c.suit));
      if (suits.size === 1 || allSuits) { flush = true; res.flushSuit = suits.size === 1 ? cards[0].suit : p.suit; }
      const rs = cards.map(c => c.r).sort((a, b) => a - b);
      if (new Set(rs).size === 5) {
        if (rs[4] - rs[0] === 4) { straight = true; high = rs[4]; }
        else if (rs.join() === '2,3,4,5,14') { straight = true; high = 5; }
      }
    }
    const all = cards.map(c => c.slot);
    const g0 = groups[0].slots.length, g1 = groups[1] ? groups[1].slots.length : 0;
    if (straight && flush && high === 14) { res.rank = 9; res.slots = all; }
    else if (straight && flush) { res.rank = 8; res.slots = all; }
    else if (g0 === 4) { res.rank = 7; res.slots = groups[0].slots; }
    else if (g0 === 3 && g1 >= 2) { res.rank = 6; res.slots = all; }
    else if (flush) { res.rank = 5; res.slots = all; }
    else if (straight) { res.rank = 4; res.slots = all; }
    else if (g0 === 3) { res.rank = 3; res.slots = groups[0].slots; }
    else if (g0 === 2 && g1 === 2) { res.rank = 2; res.slots = groups[0].slots.concat(groups[1].slots); }
    else if (g0 === 2) { res.rank = 1; res.slots = groups[0].slots; }
    res.name = HAND_NAMES[res.rank];
    if (!flush) res.flushSuit = null;
    // every hand present on the board (bonuses stack)
    const multi = groups.filter(g => g.slots.length >= 2);
    const P = res.parts = {
      pair: [].concat(...multi.map(g => g.slots)),
      twoPair: multi.length >= 2,
      trips: [].concat(...groups.filter(g => g.slots.length >= 3).map(g => g.slots)),
      straight, flush,
      full: g0 >= 3 && g1 >= 2,
      quads: g0 >= 4,
      sflush: straight && flush,
      royal: straight && flush && high === 14
    };
    const has = [];
    if (P.royal) has.push(9);
    if (P.sflush) has.push(8);
    if (P.quads) has.push(7);
    if (P.full) has.push(6);
    if (P.flush) has.push(5);
    if (P.straight) has.push(4);
    if (P.trips.length) has.push(3);
    if (P.twoPair) has.push(2);
    if (P.pair.length) has.push(1);
    res.has = has;
    res.lit = Array.from(new Set([].concat(P.pair, (straight || flush) ? all : []))).sort();
    // plain-English reason for the best hand
    const nm = r => rankLabel(r);
    const why = [];
    if (P.royal) why.push('10, J, Q, K, A all ' + KINGDOMS[res.flushSuit || p.suit].suit);
    else if (P.straight || P.flush) {
      const rs = cards.map(c => c.r).sort((a, b) => a - b);
      if (P.straight) why.push('five in a row: ' + rs.map(nm).join('-'));
      if (P.flush) why.push('all five ' + (allSuits && new Set(cards.map(c => c.suit)).size > 1 ? 'count as one suit (Solidarity)' : KINGDOMS[res.flushSuit].suit));
    }
    multi.forEach(g => why.push((g.slots.length === 2 ? 'two ' : g.slots.length === 3 ? 'three ' : 'four ') + nm(g.r) + 's'));
    res.why = why.join(' + ');
    return res;
  }

  function effAtk(s, side, slot, hand) {
    const p = s.players[side]; const u = p.board[slot];
    if (!u) return 0;
    hand = hand || evalBoard(s, side);
    let a = u.atk + u.tmp + u.perm + u.grow + (p.bonusAtk || 0);
    if (hand.parts && hand.parts.pair.includes(slot)) a += 1;
    if (hand.parts && hand.parts.sflush) a += 2;
    if (!u.hidden && def(u.key).type === 'troop' && def(u.key).suit === 'D' && p.coins >= 3) a += 1;
    if (!u.hidden && def(u.key).type === 'troop' && def(u.key).suit === 'U') {
      let n = 0; p.board.forEach((o, j) => { if (o && j !== slot && unitSuit(o) === 'U') n++; }); a += (n >= 1 ? 1 : 0) + (n >= 2 ? 1 : 0);
    }
    return Math.max(0, a);
  }

  // ---------- turn flow ----------
  function startTurn(s) {
    const i = s.active, p = s.players[i];
    s.turn++;
    ev(s, { t: 'startturn', side: i });
    p.maxCrowns = Math.min(MAX_CROWNS, p.maxCrowns + 1);
    p.crowns = Math.max(0, p.maxCrowns - p.taxed); p.taxed = 0;
    p.mucked = false; p.hiddenPlayed = false;
    p.board.forEach(u => { if (u) { u.tmp = 0; u.bp = false; } });
    if (s.firstTurn) s.firstTurn = false; else draw(s, i);
    // start-of-turn effects
    p.board.forEach((u, slot) => {
      if (!u || u.hidden) return;
      const d = def(u.key);
      if (d.type === 'troop' && d.suit === 'C' && u.grow < 2) u.grow++;
      if (d.awaken) { ev(s, { t: 'abil', side: i, slot, name: d.abilityName }); runPlayAbility(s, i, slot, u); }
    });
    const h = evalBoard(s, i);
    if (h.parts && h.parts.flush) flushBonus(s, i, h.flushSuit || p.suit);
    ev(s, { t: 'turn', side: i });
    log(s, '— ' + p.name + "'s turn —");
    checkWin(s);
  }

  function flushBonus(s, i, suit) {
    const p = s.players[i];
    ev(s, { t: 'banner', side: i, text: 'Flush: ' + FLUSH_TEXT[suit] });
    if (suit === 'H') healCastle(s, i, 3);
    else if (suit === 'D') p.coins = Math.min(5, p.coins + 1);
    else if (suit === 'S') draw(s, i);
    else if (suit === 'C') p.board.forEach(u => { if (u) u.perm += 1; });
    else if (suit === 'U') p.board.forEach(u => { if (u) { u.perm += 1; u.maxHp += 1; u.hp += 1; } });
  }

  function healCastle(s, i, n) { const p = s.players[i]; p.castle = Math.min(p.castleMax, p.castle + n); ev(s, { t: 'heal', side: i, slot: 'castle', n }); }
  function damageCastle(s, i, n, why) {
    if (n <= 0) return;
    const p = s.players[i]; p.castle -= n; ev(s, { t: 'dmg', side: i, slot: 'castle', n });
    if (p.castle <= 0) checkWin(s);
  }
  function checkWin(s) {
    if (s.winner != null) return;
    const a = s.players[0].castle <= 0, b = s.players[1].castle <= 0;
    if (a && b) s.winner = s.active; // active player wins ties
    else if (a) s.winner = 1; else if (b) s.winner = 0;
    if (s.winner != null) { ev(s, { t: 'win', side: s.winner }); log(s, s.players[s.winner].name + ' wins!'); }
  }

  function pay(p, cost) {
    if (p.crowns + p.coins < cost) return false;
    const fromCrowns = Math.min(p.crowns, cost); p.crowns -= fromCrowns; p.coins -= (cost - fromCrowns); return true;
  }
  const canPay = (p, cost) => p.crowns + p.coins >= cost;

  function emptySlot(p) { return p.board.findIndex(u => !u); }

  // remove unit at slot (handles death triggers unless quiet)
  function destroy(s, side, slot, opts) {
    opts = opts || {};
    const p = s.players[side]; const u = p.board[slot];
    if (!u) return;
    const d = def(u.key);
    p.board[slot] = null;
    ev(s, { t: 'die', side, slot });
    if (!d.token) s.players[u.orig].grave.push(u.key);
    if (!opts.quiet) p.died.push({ key: u.key, turn: s.turn });
    log(s, (u.hidden ? 'A hidden card' : d.name) + ' was destroyed.');
    if (opts.quiet || u.hidden) return;
    if (d.type === 'hero' && d.suit === 'H' && !d.token) {
      const t = makeUnit(s, side, 'HB' + d.rank);
      t.atk = d.atk; t.hp = t.maxHp = Math.ceil(d.hp / 2); t.orig = u.orig;
      p.board[slot] = t; s.players[u.orig].grave.pop();
      ev(s, { t: 'revive', side, slot }); log(s, d.name + ' rises Bloodless!');
    }
    if (d.type === 'troop' && d.suit === 'S') {
      damageCastle(s, 1 - side, 2);
      ev(s, { t: 'abil', side, slot, name: 'Buried' });
    }
    if (d.echo) { ev(s, { t: 'abil', side, slot, name: d.abilityName + ' (Echo)' }); runPlayAbility(s, side, slot, u); }
  }

  function cardValue(k) { const d = def(k); return (d.cost || 0) * 3 + (d.atk || 0) + (d.hp || 0) / 2 + (d.type === 'hero' ? 4 : 0); }

  function damageUnit(s, side, slot, n) {
    const p = s.players[side]; const u = p.board[slot];
    if (!u || n <= 0) return;
    const h = evalBoard(s, side);
    if (h.parts && h.parts.twoPair) n = Math.max(0, n - 1);
    if (!n) return;
    u.hp -= n; ev(s, { t: 'dmg', side, slot, n });
    if (u.hp <= 0) {
      if (hasAbil(u, 'unbowed') && p.board.some((o, j) => o && j !== slot && unitSuit(o) === 'U')) { u.hp = 1; ev(s, { t: 'abil', side, slot, name: 'Unbowed' }); return; }
      destroy(s, side, slot);
    }
  }

  // ---------- abilities ----------
  function runPlayAbility(s, i, slot, u, target) {
    const p = s.players[i], o = s.players[1 - i];
    const d = def(u.key);
    switch (d.abil) {
      case 'mercy': {
        healCastle(s, i, 3);
        let best = null;
        p.board.forEach(x => { if (x && !def(x.key).token && x.hp < x.maxHp && (!best || x.maxHp - x.hp > best.maxHp - best.hp)) best = x; });
        if (best) best.hp = best.maxHp;
        break;
      }
      case 'crusade': p.board.forEach(x => { if (x && !x.hidden && def(x.key).suit === 'H' && def(x.key).type === 'troop') x.tmp += 1; }); break;
      case 'bribe': {
        const es = emptySlot(p); if (es < 0) break;
        let bj = -1, bc = -1;
        if (validTarget(s, i, 'bribe', target, u)) { bj = target; bc = def(o.board[target].key).cost; }
        else o.board.forEach((x, j) => { if (x && !x.hidden && def(x.key).type === 'troop') { const c = def(x.key).cost; if (c <= p.coins && c > bc) { bc = c; bj = j; } } });
        if (bj >= 0) { const x = o.board[bj]; o.board[bj] = null; p.coins -= bc; x.owner = i; p.board[es] = x; ev(s, { t: 'steal', side: i, from: bj, to: es }); log(s, p.name + ' bribed ' + def(x.key).name + '.'); }
        break;
      }
      case 'invest': { const n = p.coins; p.coins = 0; for (let k = 0; k < n; k++) draw(s, i); break; }
      case 'tax': o.taxed += 1; break;
      case 'lastrites': {
        let bj = -1, ba = -1;
        if (validTarget(s, i, 'lastrites', target, u)) bj = target;
        else o.board.forEach((x, j) => { if (x && x.hp < x.maxHp) { const a = effAtk(s, 1 - i, j); if (a > ba) { ba = a; bj = j; } } });
        if (bj >= 0) destroy(s, 1 - i, bj);
        break;
      }
      case 'exhume': {
        let bi = -1, br = 0;
        p.grave.forEach((k, j) => { const x = def(k); if (x.type === 'hero' && !x.token && x.rank > br) { br = x.rank; bi = j; } });
        if (bi >= 0 && p.hand.length < HAND_MAX) { const k = p.grave.splice(bi, 1)[0]; p.hand.push(k); log(s, p.name + ' exhumed ' + def(k).name + '.'); }
        break;
      }
      case 'graft': {
        let bj = -1, bv = 1e9;
        if (validTarget(s, i, 'graft', target, u)) bj = target;
        else p.board.forEach((x, j) => { if (x && x !== u && !x.hidden && def(x.key).type === 'troop') { const v = x.atk + x.hp; if (v < bv) { bv = v; bj = j; } } });
        if (bj >= 0) { const x = p.board[bj]; u.perm += x.atk + x.perm; u.maxHp += x.hp; u.hp += x.hp; p.board[bj] = null; p.grave.push(x.key); ev(s, { t: 'die', side: i, slot: bj }); }
        break;
      }
      case 'bloom': p.board.forEach(x => { if (x && unitSuit(x) === 'C') { x.perm += 1; x.maxHp += 1; x.hp += 1; } }); break;
      case 'stand': p.board.forEach(x => { if (x && unitSuit(x) === 'U') { x.perm += 1; x.maxHp += 1; x.hp += 1; } }); break;
      case 'voice': revealAll(s, i, false); break;
      case 'truth': revealAll(s, i, true); break;
    }
  }

  // which slots a targeted ability may pick (null = no choice needed)
  function targetsFor(s, i, abil, self) {
    const p = s.players[i], o = s.players[1 - i];
    const out = [];
    if (abil === 'bribe') {
      o.board.forEach((x, j) => { if (x && !x.hidden && def(x.key).type === 'troop' && def(x.key).cost <= p.coins) out.push(j); });
    } else if (abil === 'lastrites') o.board.forEach((x, j) => { if (x && x.hp < x.maxHp) out.push(j); });
    else if (abil === 'graft') p.board.forEach((x, j) => { if (x && x !== self && !x.hidden && def(x.key).type === 'troop') out.push(j); });
    else if (abil === 'duelist') o.board.forEach((x, j) => { if (x) out.push(j); });
    return out;
  }
  function validTarget(s, i, abil, t, self) { return t != null && targetsFor(s, i, abil, self).includes(t); }

  function revealAll(s, i, punish) {
    const o = s.players[1 - i];
    o.board.forEach((x, j) => {
      if (!x || !x.hidden) return;
      if (isLie(x)) { ev(s, { t: 'lie', side: 1 - i, slot: j }); log(s, 'Exposed! The hidden card was a lie.'); destroy(s, 1 - i, j, { quiet: true }); if (punish) damageCastle(s, 1 - i, 3); }
      else flip(s, 1 - i, j);
    });
  }

  function isLie(u) { const d = def(u.key); return !(d.type === 'troop' && d.rank === u.decl.rank && d.suit === u.decl.suit); }

  // reveal a truthful hidden card: becomes real
  function flip(s, side, slot) {
    const u = s.players[side].board[slot]; const d = def(u.key);
    const dmg = u.maxHp - u.hp;
    u.hidden = false; u.decl = null; u.atk = d.atk; u.maxHp = d.hp; u.hp = Math.max(1, d.hp - dmg);
    ev(s, { t: 'reveal', side, slot }); log(s, 'Revealed: ' + d.name + ' — the truth!');
    onEnter(s, side, slot, u);
  }

  function onEnter(s, i, slot, u, target) {
    const d = def(u.key); const p = s.players[i];
    if (d.type === 'troop' && d.suit === 'D') { p.coins = Math.min(4, p.coins + 1); ev(s, { t: 'abil', side: i, slot, name: 'Tithe' }); }
    if (d.abilKind === 'play' || d.abil === 'truth') { ev(s, { t: 'abil', side: i, slot, name: d.abilityName }); runPlayAbility(s, i, slot, u, target); }
  }

  // ---------- actions ----------
  // returns error string or null
  function legal(s, side, a) {
    if (s.winner != null) return 'Game over.';
    if (s.phase === 'coin') return a.type === 'choose' && side === s.coinWinner ? null : 'Waiting for the coin toss.';
    if (s.phase === 'mulligan') {
      if (a.type !== 'mulligan') return 'Finish your starting hand first.';
      if (s.mull[side]) return 'Already kept your hand.';
      if (!Array.isArray(a.idx) || a.idx.length > 3 || new Set(a.idx).size !== a.idx.length || a.idx.some(j => j < 0 || j >= s.players[side].hand.length)) return 'Swap up to 3 cards.';
      return null;
    }
    if (a.type === 'choose' || a.type === 'mulligan') return 'Not now.';
    if (side !== s.active) return 'Not your turn.';
    const p = s.players[side];
    switch (a.type) {
      case 'play': {
        const k = p.hand[a.hand]; if (!k) return 'No such card.';
        if (a.slot < 0 || a.slot >= BOARD || p.board[a.slot]) return 'That slot is taken.';
        const d = def(k);
        if (a.faceDown) {
          if (p.hiddenPlayed) return 'Only one face-down card per turn.';
          if (!a.decl || !(a.decl.rank >= 2 && a.decl.rank <= 10) || !SUITS.includes(a.decl.suit)) return 'Declare a number card (2–10).';
          if (!canPay(p, troopCost(a.decl.rank))) return 'Not enough Crowns.';
          return null;
        }
        if (!canPay(p, d.cost)) return 'Not enough Crowns.';
        if (d.abil === 'wild' && (!a.decl || !(a.decl.rank >= 2 && a.decl.rank <= 14) || !SUITS.includes(a.decl.suit))) return 'Choose what the wild Joker counts as.';
        return null;
      }
      case 'muck': if (p.mucked) return 'Already mucked this turn.'; if (!a.idx || !a.idx.length || a.idx.length > 2) return 'Pick 1 or 2 cards.'; return null;
      case 'call': { const u = s.players[1 - side].board[a.slot]; if (!u || !u.hidden) return 'Nothing hidden there.'; if (!canPay(p, 1)) return 'Calling costs 1 Crown.'; return null; }
      case 'reveal': { const u = p.board[a.slot]; if (!u || !u.hidden) return 'Not hidden.'; if (isLie(u)) return "You can't reveal a lie."; return null; }
      case 'blood': { const u = p.board[a.slot]; if (!u || u.hidden || def(u.key).type !== 'troop' || def(u.key).suit !== 'H') return 'Only Hearts troops can pay Blood Price.'; if (u.bp) return 'Already used this turn.'; if (p.castle <= 1) return 'Your castle is too weak.'; return null; }
      case 'power': if (p.powerUses <= 0) return 'Ace power already used.'; return null;
      case 'aim': { const u = p.board[a.slot]; if (!u || !hasAbil(u, 'duelist')) return 'Only a Duelist can aim.'; if (!s.players[1 - side].board[a.target]) return 'Aim at an enemy.'; return null; }
      case 'end': return null;
    }
    return 'Unknown action.';
  }

  function act(s, side, a) {
    const err = legal(s, side, a);
    if (err) return err;
    const p = s.players[side];
    switch (a.type) {
      case 'choose': chooseOrder(s, !!a.first); return null;
      case 'mulligan': {
        const idx = a.idx.slice().sort((x, y) => y - x);
        const back = idx.map(j => p.hand.splice(j, 1)[0]);
        p.deck.push(...back); shuffle(s, p.deck);
        for (let k = 0; k < back.length; k++) p.hand.push(p.deck.pop());
        s.mull[side] = true;
        log(s, p.name + (back.length ? ' swapped ' + back.length + ' card' + (back.length > 1 ? 's.' : '.') : ' kept their hand.'));
        ev(s, { t: 'mulligan', side, n: back.length });
        if (s.mull[0] && s.mull[1]) beginPlay(s);
        else s.active = s.mull[0] ? 1 : 0;
        return null;
      }
      case 'play': {
        const k = p.hand.splice(a.hand, 1)[0]; const d = def(k);
        const u = makeUnit(s, side, k);
        if (a.faceDown) {
          pay(p, troopCost(a.decl.rank)); p.hiddenPlayed = true;
          u.hidden = true; u.decl = { rank: a.decl.rank, suit: a.decl.suit };
          const [at, hp] = TROOP[a.decl.rank]; u.atk = at; u.hp = u.maxHp = hp;
          p.board[a.slot] = u;
          ev(s, { t: 'play', side, slot: a.slot, hidden: true });
          log(s, p.name + ' plays a hidden card, declaring the ' + cardName(a.decl.rank, a.decl.suit) + '.');
        } else {
          pay(p, d.cost);
          if (d.abil === 'wild') u.wild = { rank: a.decl.rank, suit: a.decl.suit };
          p.board[a.slot] = u;
          ev(s, { t: 'play', side, slot: a.slot });
          log(s, p.name + ' plays ' + d.name + (u.wild ? ' as the ' + cardName(u.wild.rank, u.wild.suit) : '') + '.');
          onEnter(s, side, a.slot, u, a.target);
        }
        break;
      }
      case 'aim': { p.board[a.slot].aim = s.players[1 - side].board[a.target].uid; log(s, p.name + "'s Duelist takes aim."); break; }
      case 'muck': {
        const idx = a.idx.slice().sort((x, y) => y - x);
        idx.forEach(j => { if (p.hand[j]) p.grave.push(p.hand.splice(j, 1)[0]); });
        p.mucked = true;
        for (let k = 0; k < idx.length; k++) draw(s, side);
        log(s, p.name + ' mucks ' + idx.length + '.');
        ev(s, { t: 'muck', side, n: idx.length });
        break;
      }
      case 'call': {
        pay(p, 1);
        const o = s.players[1 - side]; const u = o.board[a.slot];
        log(s, p.name + ' calls the bluff!');
        ev(s, { t: 'call', side, slot: a.slot });
        if (isLie(u)) { ev(s, { t: 'lie', side: 1 - side, slot: a.slot }); log(s, 'It was a lie! The card is destroyed.'); destroy(s, 1 - side, a.slot, { quiet: true }); }
        else { log(s, 'It was the truth! ' + p.name + ' takes 3.'); flip(s, 1 - side, a.slot); damageCastle(s, side, 3); }
        break;
      }
      case 'reveal': flip(s, side, a.slot); break;
      case 'blood': { const u = p.board[a.slot]; u.bp = true; u.tmp += 3; damageCastle(s, side, 1); ev(s, { t: 'abil', side, slot: a.slot, name: 'Blood Price' }); break; }
      case 'power': usePower(s, side, a.target); break;
      case 'end': endTurn(s); break;
    }
    checkWin(s);
    return null;
  }

  function usePower(s, i, target) {
    const p = s.players[i]; const L = def(p.leader);
    p.powerUses--;
    ev(s, { t: 'power', side: i, name: L.abilityName });
    log(s, p.name + ' uses ' + L.abilityName + '!');
    switch (L.power) {
      case 'rally': {
        healCastle(s, i, 6);
        let t = target != null && p.board[target] ? target : -1;
        if (t < 0) { let ba = -1; p.board.forEach((x, j) => { if (x) { const a = effAtk(s, i, j); if (a > ba) { ba = a; t = j; } } }); }
        if (t >= 0) { const x = p.board[t]; if (!def(x.key).token) x.hp = x.maxHp; x.tmp += 2; ev(s, { t: 'abil', side: i, slot: t, name: 'Rallied!' }); }
        break;
      }
      case 'laststand': p.board.forEach(u => { if (u) u.tmp += 2; }); break;
      case 'treasury': p.crowns += 3; break;
      case 'windfall': draw(s, i); draw(s, i); p.coins = Math.min(5, p.coins + 2); break;
      case 'gravecall': {
        const back = p.died.filter(x => x.turn >= s.turn - 1 && !def(x.key).token);
        back.forEach(x => {
          const es = emptySlot(p); if (es < 0) return;
          const gi = p.grave.lastIndexOf(x.key); if (gi < 0) return;
          p.grave.splice(gi, 1); p.board[es] = makeUnit(s, i, x.key); ev(s, { t: 'play', side: i, slot: es });
        });
        break;
      }
      case 'graverobber': {
        const es = emptySlot(p); if (es < 0) break;
        let bi = -1, bv = -1;
        p.grave.forEach((k, j) => { const d = def(k); if ((d.type === 'troop' || d.type === 'hero') && cardValue(k) > bv) { bv = cardValue(k); bi = j; } });
        if (bi >= 0) { const k = p.grave.splice(bi, 1)[0]; p.board[es] = makeUnit(s, i, k); ev(s, { t: 'play', side: i, slot: es }); }
        break;
      }
      case 'overgrowth': p.board.forEach(u => { if (u) { u.maxHp += 2; u.hp += 2; } }); break;
      case 'wildwood': p.board.forEach(u => { if (u) u.perm += 2; }); break;
      case 'solidarity': p.solidUntil = s.turn + 2; break;
      case 'march': p.board.forEach(u => { if (u) { u.perm += 1; u.maxHp += 1; u.hp += 1; } }); break;
    }
  }

  function endTurn(s) {
    const i = s.active, p = s.players[i], o = s.players[1 - i];
    let h = evalBoard(s, i);
    ev(s, { t: 'endturn', side: i });
    if (h.rank === 9) { ev(s, { t: 'banner', side: i, text: 'ROYAL FLUSH!' }); log(s, p.name + ' completes a Royal Flush!'); o.castle = 0; checkWin(s); return; }
    if (h.parts && h.parts.quads) {
      let bj = -1, bv = 1e9;
      o.board.forEach((x, j) => { if (x) { const v = effAtk(s, 1 - i, j) + x.hp; if (v < bv) { bv = v; bj = j; } } });
      if (bj >= 0) { ev(s, { t: 'banner', side: i, text: 'Four of a Kind!' }); destroy(s, 1 - i, bj); }
    }
    // combat, lane by lane
    for (let lane = 0; lane < BOARD && s.winner == null; lane++) {
      const u = p.board[lane]; if (!u) continue;
      if (u.born >= s.turn) continue; // summoned this turn: ready next turn
      h = evalBoard(s, i);
      const atk = effAtk(s, i, lane, h);
      if (atk <= 0) continue;
      const oh = evalBoard(s, 1 - i);
      let target = lane, toCastle = false;
      if (hasAbil(u, 'tunnel')) toCastle = true;
      else if (hasAbil(u, 'duelist')) {
        let bj = o.board.findIndex(x => x && u.aim && x.uid === u.aim), bv = 1e9;
        if (bj < 0) o.board.forEach((x, j) => { if (x && x.hp < bv) { bv = x.hp; bj = j; } });
        if (bj >= 0) target = bj; else toCastle = true;
      } else if (!o.board[lane]) toCastle = true;
      ev(s, { t: 'attack', side: i, slot: lane, tslot: toCastle ? 'castle' : target });
      const straightBonus = h.parts && h.parts.straight ? 1 : 0;
      if (toCastle) {
        if (oh.parts && oh.parts.full) { ev(s, { t: 'block', side: 1 - i }); }
        else damageCastle(s, 1 - i, atk + straightBonus);
      } else {
        const t = o.board[target];
        const counter = effAtk(s, 1 - i, target, oh);
        const firstStrike = h.parts && h.parts.trips.includes(lane);
        damageUnit(s, 1 - i, target, atk);
        if (hasAbil(u, 'smash')) { [target - 1, target + 1].forEach(j => { if (j >= 0 && j < BOARD && o.board[j]) damageUnit(s, 1 - i, j, atk); }); }
        if (!firstStrike && p.board[lane] === u && counter > 0) damageUnit(s, i, lane, counter);
        if (straightBonus && !(oh.parts && oh.parts.full)) damageCastle(s, 1 - i, straightBonus);
        void t;
      }
      checkWin(s);
    }
    if (s.winner != null) return;
    s.active = 1 - i;
    startTurn(s);
  }

  // ---------- redaction for network play ----------
  function redact(s, viewer) {
    const c = JSON.parse(JSON.stringify(s));
    const o = c.players[1 - viewer];
    o.hand = o.hand.map(() => '?'); o.deck = o.deck.map(() => '?'); o.grave = o.grave.slice();
    c.players[viewer].deck = c.players[viewer].deck.map(() => '?');
    o.board.forEach(u => { if (u && u.hidden) u.key = '?'; });
    c.seed = 0;
    return c;
  }

  const clone = s => JSON.parse(JSON.stringify(s));

  const Engine = {
    SUITS, KINGDOMS, HAND_NAMES, HAND_TEXT, FLUSH_TEXT, VARIANTS, ABIL, ACE_POWER, TROOP, HERO, MAX_CROWNS, BOARD, targetsFor, cardName,
    rankLabel, troopCost, parseKey, def, variantsOf, withV, allKeys, validateDeck,
    newGame, legal, act, evalBoard, effAtk, isLie, unitRank, unitSuit, canPay, redact, clone, cardValue, rnd, shuffle
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(this);

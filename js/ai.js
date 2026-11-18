/* Plebes TCG — computer opponent. level 1 (novice) .. 3 (cunning) */
(function (root) {
  'use strict';
  const E = root.Engine || require('./engine.js');

  function evaluate(s, side) {
    if (s.winner === side) return 10000;
    if (s.winner === 1 - side) return -10000;
    const me = s.players[side], op = s.players[1 - side];
    let v = (me.castle - op.castle) * 3;
    if (op.castle <= 6) v += (7 - op.castle) * 2;
    v += boardVal(s, side) - boardVal(s, 1 - side);
    v += me.hand.length * 1.2 - op.hand.length * 0.6 + me.coins * 0.8;
    v += E.evalBoard(s, side).rank * 1.5;
    return v;
  }
  function boardVal(s, side) {
    let v = 0;
    s.players[side].board.forEach((u, j) => { if (u) v += E.effAtk(s, side, j) * 1.3 + u.hp * 0.7 + 1; });
    return v;
  }

  // value of a position after taking action a and then ending the turn (combat resolves)
  function simValue(s, side, a) {
    const c = E.clone(s); c.ev = []; c.log = [];
    if (a && E.act(c, side, a)) return -Infinity;
    if (c.winner == null && c.active === side) E.act(c, side, { type: 'end' });
    return evaluate(c, side);
  }

  function visibleCopies(s, side, id) {
    let n = 0;
    const me = s.players[side], op = s.players[1 - side];
    const count = k => { if (k && k !== '?' && E.parseKey(k).id === id) n++; };
    me.hand.forEach(count); me.grave.forEach(count); op.grave.forEach(count);
    me.board.forEach(u => u && count(u.key)); op.board.forEach(u => u && !u.hidden && count(u.key));
    return n;
  }

  function publicCopies(s, id) {
    let n = 0;
    s.players.forEach(pl => { pl.grave.forEach(k => { if (E.parseKey(k).id === id) n++; }); pl.board.forEach(u => { if (u && (u.hidden ? u.decl.suit + u.decl.rank : E.parseKey(u.key).id) === id) n++; }); });
    return n;
  }
  function lieChance(s, side, slot) {
    const op = s.players[1 - side]; const u = op.board[slot];
    const id = u.decl.suit + u.decl.rank;
    if (visibleCopies(s, side, id) >= 3) return 1;
    let p = 0.3;
    if (u.decl.suit !== op.suit) p += 0.15;
    // does the hidden card complete a strong hand?
    const c = E.clone(s); c.players[1 - side].board[slot] = null;
    const without = E.evalBoard(c, 1 - side).rank, withIt = E.evalBoard(s, 1 - side).rank;
    if (withIt >= 4 && withIt > without) p += 0.25;
    else if (withIt > without) p += 0.1;
    return Math.min(0.9, p);
  }

  function candidates(s, side, level) {
    const p = s.players[side];
    const out = [];
    const empties = p.board.map((u, j) => (u ? -1 : j)).filter(j => j >= 0);
    p.hand.forEach((k, hi) => {
      const d = E.def(k);
      if (!E.canPay(p, d.cost)) return;
      empties.forEach(slot => {
        if (d.abil === 'wild') {
          for (let r = 2; r <= 14; r++) for (const su of E.SUITS) out.push({ type: 'play', hand: hi, slot, decl: { rank: r, suit: su } });
        } else out.push({ type: 'play', hand: hi, slot });
      });
    });
    if (level >= 2 && !p.hiddenPlayed && empties.length) {
      // bluff with the weakest card in hand
      let wi = -1, wv = 1e9;
      p.hand.forEach((k, j) => { const v = E.cardValue(k); if (v < wv) { wv = v; wi = j; } });
      if (wi >= 0) {
        const suits = new Set([p.suit]); p.board.forEach(u => u && suits.add(E.unitSuit(u)));
        const wk = E.def(p.hand[wi]);
        for (let r = 2; r <= 10; r++) for (const su of suits) {
          if (!E.canPay(p, E.troopCost(r))) continue;
          // what the opponent can see: board + graves. Don't claim a card that is obviously used up.
          const seen = publicCopies(s, su + r);
          const truthful = wk.type === 'troop' && wk.rank === r && wk.suit === su;
          if (!truthful && seen >= 2) continue;
          empties.forEach(slot => out.push({ type: 'play', hand: wi, slot, faceDown: true, decl: { rank: r, suit: su }, bluff: true }));
        }
      }
    }
    p.board.forEach((u, j) => { if (u && !u.hidden && E.def(u.key).type === 'troop' && E.def(u.key).suit === 'H' && !u.bp && p.castle > 5) out.push({ type: 'blood', slot: j }); });
    if (p.powerUses > 0) out.push({ type: 'power' });
    return out;
  }

  function nextAction(s, side, level) {
    level = level || 2;
    const p = s.players[side];
    if (s.winner != null) return null;
    if (s.phase === 'coin') return { type: 'choose', first: true };
    if (s.phase === 'mulligan') {
      // swap away expensive cards and extra copies of heroes
      const idx = [];
      p.hand.forEach((k, j) => { if (idx.length < 3 && E.def(k).cost >= 4) idx.push(j); });
      return { type: 'mulligan', idx: level >= 2 ? idx : [] };
    }
    if (s.active !== side) return null;
    // 1) consider calling a bluff
    if (level >= 2 && E.canPay(p, 1)) {
      const op = s.players[1 - side];
      for (let j = 0; j < 5; j++) {
        const u = op.board[j];
        if (!u || !u.hidden || (u.calledBy && u.calledBy[side])) continue;
        const pl = lieChance(s, side, j);
        const thresh = level >= 3 ? 0.45 : 0.6;
        if (pl >= thresh || (level >= 3 && pl >= 0.4 && p.castle > 10)) return { type: 'call', slot: j };
      }
    }
    // 2) muck dead cards early
    if (level >= 2 && !p.mucked && p.hand.length) {
      const dead = [];
      p.hand.forEach((k, j) => { const d = E.def(k); if (d.cost > p.maxCrowns + 2 && dead.length < 2) dead.push(j); });
      if (dead.length) return { type: 'muck', idx: dead };
    }
    // 3) greedy best action
    const base = simValue(s, side, null);
    let best = null, bv = -Infinity;
    const cands = candidates(s, side, level);
    const scored = [];
    for (const a of cands) {
      let v = simValue(s, side, a) - base;
      if (a.type === 'power') v -= 6; // save it for a big moment
      if (a.bluff) {
        const risk = level >= 3 ? 0.35 : 0.5;
        v -= risk * 4 + publicCopies(s, a.decl.suit + a.decl.rank) * 2;
        if (level >= 3 && Math.random() < 0.15) v += 2; // occasional bold bluff
      }
      scored.push([v, a]);
      if (v > bv) { bv = v; best = a; }
    }
    if (level === 1 && scored.length) {
      const good = scored.filter(x => x[0] > 0);
      if (good.length && Math.random() < 0.5) return good[Math.floor(Math.random() * good.length)][1];
    }
    if (best && bv > 0.05) { delete best.bluff; return best; }
    return { type: 'end' };
  }

  const AI = { nextAction, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = AI; else root.AI = AI;
})(this);

/* Plebes TCG — UI */
(function () {
  'use strict';
  const E = window.Engine, AI = window.AI, D = window.Data;
  const K = E.KINGDOMS;

  // ---------- helpers ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => $('#app');
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let toastT;
  function toast(msg) { const old = $('.toast'); if (old) old.remove(); const t = h('div', { class: 'toast' }, msg); document.body.append(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2200); }
  function sheet(build, opts) {
    opts = opts || {};
    const veil = h('div', { class: 'veil' + (opts.mid ? ' mid' : '') });
    const box = h('div', { class: 'sheet' });
    const close = () => { veil.remove(); if (opts.onClose) opts.onClose(); };
    veil.addEventListener('click', e => { if (e.target === veil && !opts.locked) close(); });
    build(box, close);
    if (!opts.locked) box.append(h('button', { class: 'iconbtn xbtn', 'aria-label': 'Close', onclick: close }, h('img', { src: 'assets/gui/ico-close.png', alt: '' })));
    veil.append(box); document.body.append(veil);
    return close;
  }
  function banner(text, cls) { const b = h('div', { class: 'banner ' + (cls || '') }, h('span', null, text)); document.body.append(b); setTimeout(() => b.remove(), 1150); }
  function floatAt(el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = h('div', { class: 'float ' + (cls || ''), style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px` }, text);
    document.body.append(f); setTimeout(() => f.remove(), 950);
  }
  // suit pips cropped from the card art (no emoji / font symbols)
  const sym = s => h('img', { class: 'pip', src: 'assets/gui/pip-' + s + '.png', alt: K[s].suit });
  const lbl = (r, s, tail) => h('span', { class: 'lbl' }, E.rankLabel(r), sym(s), tail || null);
  const gico = (name, cls) => h('img', { class: 'gico ' + (cls || ''), src: 'assets/gui/' + name + '.png', alt: '' });

  // ---------- card art ----------
  const SHEET = { b: 'assets/base.png', o: 'assets/origin.png', c: 'assets/classic.png', u: 'assets/u004.png' };
  const SUITROW = { H: 0, D: 1, S: 2, C: 3 };
  const RCOL = r => (r === 14 ? 0 : r === 13 ? 1 : r === 12 ? 2 : r === 11 ? 3 : r + 2);
  const LETTER = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' };
  function artInfo(key) {
    if (key === '?' || key === 'back') return { sheet: SHEET.b, col: 13, row: 0 };
    if (key === 'backU') return { sheet: SHEET.u, col: 13, row: 4 };
    const d = E.parseKey(key);
    if (d.type === 'joker') {
      const strip = 'assets/anim/' + d.id + '.png';
      return { sheet: d.v === 'c' ? SHEET.c : SHEET.b, col: 13, row: d.id === 'JT' ? 1 : 2, strip, loop: d.v === 'a' };
    }
    if (d.token) return { strip: 'assets/anim/B' + LETTER[d.rank] + '.png', loop: true };
    const L = LETTER[d.rank];
    const strip = L ? 'assets/anim/' + L + '_' + d.suit + '.png' : null;
    if (d.suit === 'U') return { sheet: SHEET.u, col: RCOL(d.rank), row: 4, strip, loop: d.v === 'a', foil: d.v === 'f' };
    const sheetKey = d.v === 'o' ? 'o' : d.v === 'c' ? 'c' : 'b';
    return { sheet: SHEET[sheetKey], col: RCOL(d.rank), row: SUITROW[d.suit], strip, loop: d.v === 'a', foil: d.v === 'f' };
  }
  function setArt(art, a, cw, useStrip) {
    const sc = cw / 90;
    art.className = 'art';
    if (useStrip) {
      art.style.backgroundImage = `url(${a.strip})`;
      art.style.backgroundSize = `${720 * sc}px ${126 * sc}px`;
      art.style.backgroundPosition = '0 0';
      art.style.setProperty('--sw', 720 * sc + 'px');
    } else {
      art.style.backgroundImage = `url(${a.sheet})`;
      art.style.backgroundSize = `${1260 * sc}px auto`;
      art.style.backgroundPosition = `${-a.col * 90 * sc}px ${-a.row * 126 * sc}px`;
    }
  }
  function cardEl(key, cw, o) {
    o = o || {};
    const el = h('div', { class: 'card' + (o.cls ? ' ' + o.cls : '') });
    el.style.setProperty('--cw', cw + 'px');
    const a = artInfo(key);
    const art = h('div', { class: 'art' });
    if (a.loop && a.strip) { setArt(art, a, cw, true); art.classList.add('loop'); }
    else setArt(art, a, cw, false);
    el._art = a; el._cw = cw;
    el.append(art);
    if (a.foil) el.classList.add('foil');
    if (o.locked) el.classList.add('locked');
    if (o.cost != null) el.append(h('div', { class: 'badge cost' }, o.cost));
    if (o.atk != null) el.append(h('div', { class: 'badge atk' + (o.atkUp ? ' up' : '') }, o.atk));
    if (o.hp != null) el.append(h('div', { class: 'badge hp' + (o.hurt ? ' hurt' : '') }, o.hp));
    if (o.count != null) el.append(h('div', { class: 'badge count' }, o.count));
    if (o.tag) el.append(h('div', { class: 'tag ' + (o.tagCls || '') }, o.tag));
    if (o.vtag) el.append(h('div', { class: 'vtag' }, o.vtag));
    if (o.zz) { el.append(h('div', { class: 'zz', title: 'Ready next turn' }, 'REST')); el.classList.add('sleepy'); }
    if (o.onclick) el.addEventListener('click', o.onclick);
    return el;
  }
  function flourish(card) {
    if (!card || !card._art || !card._art.strip || card._art.loop) return;
    const art = card.querySelector('.art');
    setArt(art, card._art, card._cw, true); art.classList.add('once');
    art.addEventListener('animationend', () => setArt(art, card._art, card._cw, false), { once: true });
  }
  function cardInfo(key) {
    const d = E.def(key);
    const kind = d.type === 'troop' ? 'Troop' : d.type === 'hero' ? 'Hero' : d.type === 'ace' ? 'Leader' : 'Joker';
    return h('div', null,
      h('h2', null, d.name),
      h('div', { class: 'stats' },
        h('span', null, kind), d.v !== 'b' ? h('span', null, d.vName) : null,
        d.type !== 'ace' ? h('span', null, 'Cost ' + d.cost) : h('span', null, 'Castle ' + d.castle),
        d.atk != null ? h('span', null, 'ATK ' + d.atk) : null, d.hp != null && d.type !== 'ace' ? h('span', null, 'HP ' + d.hp) : null),
      h('div', { class: 'abil' }, h('b', null, d.abilityName || ''), d.text || ''),
      d.type === 'troop' && d.v === 'f' ? h('p', { class: 'muted' }, 'Foil: cosmetic only. Plays exactly like the base card.') : null);
  }
  function showCard(key, extra) {
    sheet((box, close) => {
      box.append(h('div', { class: 'cardrow' }, cardEl(key, 140), h('div', { class: 'grow' }, cardInfo(key), extra ? extra(close) : null)));
      box.append(h('div', { class: 'row center' }, h('button', { onclick: close }, 'Close')));
    });
  }

  // ---------- poker table ----------
  function pokerTable(cur) {
    const on = Array.isArray(cur) ? cur : [cur];
    const t = h('table', { class: 'hands' });
    for (let i = 9; i >= 1; i--) t.append(h('tr', { class: on.includes(i) ? 'on' : '' }, h('td', null, E.HAND_NAMES[i]), h('td', null, E.HAND_TEXT[i])));
    return t;
  }
  function flushTable() {
    return h('div', { class: 'flushes' }, h('b', null, 'Flush bonuses'), ...E.SUITS.map(s => h('div', null, sym(s), ' ' + K[s].suit + ': ' + E.FLUSH_TEXT[s])));
  }

  // =====================================================
  // BATTLE
  // =====================================================
  let B = null;
  const S = n => window.Sfx && Sfx.play(n);

  // card sizes that fit the whole battlefield on screen, no scrolling
  const viewH = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  function battleSizes() {
    const W = Math.min(window.innerWidth, 720), H = viewH();
    const fixed = 300; // optimistic; render() shrinks until it fits
    const byH = (H - fixed) / 3 / 1.4;
    const byW = (W - 20) / 5 - 10;
    const cw = Math.floor(Math.max(44, Math.min(118, byH, byW)));
    const handCw = Math.floor(Math.max(cw, Math.min(cw * 1.2, (H - fixed) / 1.4 - 2 * cw)));
    return { cw, handCw, W };
  }

  function startBattle(opts) {
    // opts: {mode:'ai'|'host'|'guest', s, me, level, onEnd(won)->{lines}, exit()}
    B = Object.assign({ busy: false, place: null, muck: null, queue: Promise.resolve(), overlay: null, lastHand: 0, ranks: [0, 0] }, opts);
    Object.assign(B, battleSizes());
    document.body.classList.add('inbattle');
    window.scrollTo(0, 0);
    render();
    after();
  }
  const refit = () => { if (B && $('.battle')) { window.scrollTo(0, 0); Object.assign(B, battleSizes()); B.fitGuard = 0; render(); } };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', () => setTimeout(refit, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refit);

  // ---------- small pixel icons ----------
  // icons cropped from the card art: sword (card back), heart pip, crown (King of Diamonds)
  const ICON = { atk: 'assets/gui/ico-sword.png', hp: 'assets/gui/pip-H.png', crown: 'assets/gui/ico-crown.png' };
  const ico = (k, cls) => h('img', { class: 'pico ' + (cls || ''), src: ICON[k], alt: '' });
  function statStrip(atk, hp, o) {
    o = o || {};
    return h('div', { class: 'stat' },
      h('span', { class: 'sa' + (o.atkUp ? ' up' : '') }, ico('atk'), atk),
      h('span', { class: 'sh' + (o.hurt ? ' hurt' : '') }, ico('hp'), hp));
  }

  function render() {
    const s = B.s, me = B.me, op = 1 - me;
    const root = h('div', { class: 'battle' + (viewH() < 760 ? ' compact' : '') });
    root.style.setProperty('--cw', B.cw + 'px');
    root.style.setProperty('--hcw', B.handCw + 'px');
    root.append(sideBar(op));
    root.append(handInfo(op));
    root.append(boardRow(op));
    root.append(midStrip());
    root.append(boardRow(me));
    root.append(handInfo(me));
    root.append(sideBar(me, true));
    root.append(handRow());
    const a = app(); a.innerHTML = ''; a.append(root);
    // shrink cards until the whole battlefield fits the screen (no scrolling)
    if (root.scrollHeight > root.clientHeight + 1 && B.cw > 40 && (B.fitGuard = (B.fitGuard || 0) + 1) < 12) {
      const k = Math.max(0.85, Math.min(0.97, root.clientHeight / root.scrollHeight));
      B.cw = Math.floor(B.cw * k); B.handCw = Math.max(B.cw, Math.floor(B.handCw * k));
      B.lastHand = 0;
      render();
    }
    B.fitGuard = 0;
  }

  const myTurnNow = () => B.s.phase === 'play' && B.s.active === B.me && B.s.winner == null && !B.busy;

  function sideBar(side, mine) {
    const s = B.s, p = s.players[side];
    const leader = cardEl(p.leader, 40, { onclick: () => leaderSheet(side) });
    leader.classList.add('leader');
    if (mine && p.powerUses > 0 && myTurnNow()) leader.classList.add('ready');
    const pct = Math.max(0, p.castle) / p.castleMax * 100;
    const crowns = h('div', { class: 'res' });
    crowns.append(h('span', { class: 'counter', title: 'Crowns this turn / max' }, h('img', { class: 'crowni', src: 'assets/gui/ico-crown.png', alt: 'Crowns' }), h('b', null, p.crowns + '/' + p.maxCrowns)));
    if (p.coins) crowns.append(h('span', { class: 'counter', title: 'Coins' }, h('img', { class: 'coini', src: 'assets/gui/ico-coin.png', alt: 'Coins' }), h('b', null, p.coins)));
    const who = h('div', { class: 'who' },
      h('div', { class: 'name' }, p.name),
      h('div', { class: 'hpbar' + (p.castle <= 8 ? ' low' : ''), 'data-k': 'c' + side }, h('i', { style: `width:${pct}%` }), h('b', null, Math.max(0, p.castle) + ' / ' + p.castleMax)),
      h('div', { class: 'row', style: 'gap:6px;margin-top:3px' }, crowns, h('span', { class: 'info' }, 'Hand ' + p.hand.length + ' · Deck ' + p.deck.length)));
    const bar = h('div', { class: 'side-bar' + (mine ? ' mine' : '') }, leader, who);
    if (mine) {
      bar.append(h('button', { class: 'pw' + (p.powerUses > 0 && myTurnNow() ? ' primary' : ''), disabled: !myTurnNow() || p.powerUses <= 0, onclick: () => leaderSheet(side) },
        p.powerUses > 0 ? 'Power ×' + p.powerUses : 'Power used'));
    } else {
      bar.append(h('div', { class: 'ophand' }, ...p.hand.slice(0, 7).map(() => cardEl(p.suit === 'U' ? 'backU' : 'back', 16))));
    }
    return bar;
  }

  function midStrip() {
    const s = B.s, p = s.players[B.me];
    const myTurn = myTurnNow();
    const left = h('div', { class: 'mleft' }, h('button', { class: 'iconbtn menu-btn', 'aria-label': 'Menu', onclick: menuSheet }, gico('app-scroll')),
      viewH() < 760 ? h('span', { class: 'turnflag mini' + (s.phase === 'play' && s.active === B.me && s.winner == null ? ' mine' : '') }, s.winner != null ? 'Over' : s.phase !== 'play' ? 'Setup' : s.active === B.me ? 'You' : 'Them') : null);
    let flagText = s.winner != null ? 'Game over' : s.phase !== 'play' ? 'Setting up' : s.active === B.me ? 'Your turn' : 'Their turn';
    const center = h('div', { class: 'mcenter' },
      h('div', { class: 'row center', style: 'gap:6px' }, h('span', { class: 'turnflag' + (s.phase === 'play' && s.active === B.me && s.winner == null ? ' mine' : '') }, flagText),
        s.phase === 'play' ? h('span', { class: 'round' }, 'Round ' + Math.ceil(s.turn / 2)) : null),
      h('div', { class: 'last' }, (s.log.filter(l => !l.startsWith('—')).slice(-1)[0]) || ''));
    const right = h('div', { class: 'mright' });
    const tip = coachText();
    if (tip) center.append(h('div', { class: 'coach' }, h('img', { class: 'gico', src: 'assets/gui/app-scroll.png', alt: '' }), h('span', null, tip)));
    if (B.target) {
      center.querySelector('.last').textContent = B.target.hint;
      right.append(h('button', { onclick: () => { B.target = null; render(); } }, 'Cancel'));
    } else if (B.place) {
      center.querySelector('.last').textContent = 'Tap a glowing slot to place your card';
      right.append(h('button', { onclick: () => { B.place = null; render(); } }, 'Cancel'));
    } else if (B.muck) {
      center.querySelector('.last').textContent = 'Pick up to 2 cards to swap';
      right.append(h('button', { class: 'primary', disabled: !B.muck.length, onclick: () => { const idx = B.muck; B.muck = null; doAct({ type: 'muck', idx }); } }, 'Swap ' + B.muck.length),
        h('button', { onclick: () => { B.muck = null; render(); } }, 'Cancel'));
    } else {
      const canPlay = p.hand.some(k => k !== '?' && E.canPay(p, E.def(k).cost)) && p.board.some(x => !x);
      right.append(h('button', { disabled: !myTurn || p.mucked || !p.hand.length, onclick: () => { B.place = null; B.muck = []; render(); } }, 'Muck'),
        h('button', { class: 'primary endturn' + (myTurn && !canPlay ? ' nudge' : ''), disabled: !myTurn, onclick: () => { B.place = null; doAct({ type: 'end' }); } }, 'End turn'));
    }
    return h('div', { class: 'midline' }, center, h('div', { class: 'mrow' }, left, right));
  }

  function handInfo(side) {
    const hd = E.evalBoard(B.s, side);
    const box = h('div', { class: 'handinfo', onclick: () => pokerSheet(side) });
    if (!hd.has.length) {
      box.append(h('span', { class: 'hn none' }, 'No hand'), h('span', { class: 'ht' }, side === B.me ? 'Build poker hands on your board' : ''));
      return box;
    }
    // best hand first, then any smaller hands that also apply (bonuses stack)
    const shown = hd.has.filter(r => !(r === 1 && hd.has.includes(2)));
    box.append(...shown.slice(0, 3).map((r, i) => h('span', { class: 'hn' + (i ? ' sub' : '') }, E.HAND_NAMES[r])));
    if (shown.length > 3) box.append(h('span', { class: 'hn sub' }, '+' + (shown.length - 3) + ' more'));
    box.append(h('span', { class: 'ht' }, hd.why));
    return box;
  }

  function boardRow(side) {
    const s = B.s, p = s.players[side], cw = B.cw;
    const hd = E.evalBoard(s, side);
    const row = h('div', { class: 'board' + (side === B.me ? ' mine' : ' theirs') });
    for (let j = 0; j < 5; j++) {
      const cell = h('div', { class: 'cell' });
      const slot = h('div', { class: 'slot', 'data-k': 's' + side + '-' + j });
      const u = p.board[j];
      if (u) {
        const mine = side === B.me;
        let key = u.key, tag = null, tagCls = '';
        if (u.hidden) {
          key = p.suit === 'U' ? 'backU' : 'back';
          tag = lbl(u.decl.rank, u.decl.suit, mine ? '' : '?');
          if (mine && u.key !== '?') tagCls = E.isLie(u) ? 'lie' : 'truth';
        } else if (u.wild) tag = lbl(u.wild.rank, u.wild.suit);
        const atk = E.effAtk(s, side, j, hd);
        const isTgt = B.target && B.target.side === side && B.target.cands.includes(j);
        const c = cardEl(key, cw, { tag, tagCls, zz: s.active === side && u.born >= s.turn, onclick: (e) => { e.stopPropagation(); if (isTgt) pickTarget(j); else if (!B.target) unitSheet(side, j); } });
        if (isTgt) slot.classList.add('tgt');
        if (hd.lit.includes(j)) c.classList.add('inhand-glow');
        slot.append(c);
        cell.append(slot, statStrip(atk, u.hp, { atkUp: atk > u.atk, hurt: u.hp < u.maxHp }));
      } else {
        if (B.place && side === B.me) {
          slot.classList.add('target');
          slot.addEventListener('click', () => placeAt(j));
        }
        cell.append(slot, h('div', { class: 'stat empty' }));
      }
      row.append(cell);
    }
    return row;
  }

  function handRow() {
    const s = B.s, p = s.players[B.me];
    const cw = B.handCw;
    const myTurn = myTurnNow();
    const cards = p.hand.filter(k => k !== '?');
    const n = cards.length;
    const avail = Math.min(window.innerWidth, 720) - 24;
    const gap = n > 1 ? Math.min(8, (avail - n * cw) / (n - 1)) : 0;
    const row = h('div', { class: 'hand' });
    const fresh = Math.max(0, n - B.lastHand);
    p.hand.forEach((k, i) => {
      if (k === '?') return;
      const d = E.def(k);
      const pay = E.canPay(p, d.cost);
      const wrap = h('div', { class: 'hcard', style: i ? `margin-left:${gap}px` : '' },
        h('div', { class: 'hcost' + (pay ? '' : ' cant') }, ico('crown'), d.cost),
        cardEl(k, cw, { onclick: () => tapHand(i) }),
        d.atk != null ? statStrip(d.atk, d.hp) : h('div', { class: 'stat empty' }));
      if (myTurn && pay && p.board.some(x => !x)) wrap.classList.add('playable');
      if (B.place && B.place.hand === i) wrap.classList.add('picked');
      if (B.muck && B.muck.includes(i)) wrap.classList.add('mucksel');
      if (i >= n - fresh && B.lastHand) wrap.classList.add('drawn');
      row.append(wrap);
    });
    B.lastHand = n;
    if (!n) row.append(h('div', { class: 'muted px small', style: 'align-self:center' }, s.phase === 'coin' ? '' : 'No cards in hand'));
    return row;
  }

  // ----- tutorial coach -----
  function coachText() {
    const s = B.s;
    if (!B.tutorial || s.phase !== 'play' || s.winner != null) return null;
    const me = B.me, p = s.players[me], o = s.players[1 - me];
    if (s.active !== me) return 'Their turn. Their troops attack at the end of it.';
    const t = Math.ceil(s.turn / 2);
    const placed = p.board.some(u => u && u.born === s.turn);
    const hd = E.evalBoard(s, me).rank;
    if (t === 1) return placed ? 'New troops REST the turn they arrive. Tap End turn.' : 'Welcome! Tap the glowing 3 of Hearts, choose Play, then tap a glowing slot.';
    if (t === 2) return placed ? 'Tap End turn. Your troops attack the card across from them, or the castle if the lane is empty.' : 'You gain a Crown every turn (top of your bar). Play a 5 of Hearts.';
    if (t === 3) return hd >= 1 ? 'Pair! Matching ranks make poker hands. Tap the yellow label to see every bonus, then End turn.' : 'Play your other 5 of Hearts to make a Pair. Paired troops get +1 attack.';
    if (t === 4) return o.board.some(u => u && u.hidden) ? 'They played a card face-down and claim it is the 9 of Spades. Tap it and Call bluff (1 Crown). A lie is destroyed.' : 'Caught! You can bluff too: tap a card and choose Play face-down. Then End turn.';
    if (t === 5) return p.powerUses > 0 ? 'Your Ace has a once-per-game power. Tap Power, then a troop: Rally heals your castle and powers up that troop.' : 'You know the basics. Knock their castle down!';
    if (t === 6) return 'You know the basics. Knock their castle down!';
    return null;
  }
  function say(text) {
    if (!text) return;
    const old = $('.speech'); if (old) old.remove();
    const bar = $('.side-bar:not(.mine)'); if (!bar) return;
    const r = bar.getBoundingClientRect();
    const b = h('div', { class: 'speech', style: `left:${Math.max(8, r.left + 40)}px;top:${r.bottom + 10}px;max-width:${Math.min(320, r.width - 70)}px` }, h('b', null, B.boss ? B.boss.name : ''), text);
    document.body.append(b); setTimeout(() => b.remove(), 3800);
  }

  const TARGET_HINT = { bribe: 'Bribe: tap an enemy troop to steal', lastrites: 'Last Rites: tap a damaged enemy to destroy', graft: 'Graft: tap one of your troops to absorb', duelist: 'Aim: tap the enemy your Duelist should attack' };
  function placeAt(j) {
    const pl = B.place; B.place = null;
    const p = B.s.players[B.me];
    const d = E.def(p.hand[pl.hand]);
    const play = { type: 'play', hand: pl.hand, slot: j, faceDown: pl.faceDown, decl: pl.decl };
    if (!pl.faceDown && ['bribe', 'lastrites', 'graft'].includes(d.abil)) {
      const cands = E.targetsFor(B.s, B.me, d.abil, null);
      if (cands.length) { B.target = { play, side: d.abil === 'graft' ? B.me : 1 - B.me, cands, hint: TARGET_HINT[d.abil] }; S('click'); render(); return; }
    }
    doAct(play);
  }
  function pickTarget(j) {
    const t = B.target; B.target = null;
    if (t.power) doAct({ type: 'power', target: j });
    else if (t.aim != null) doAct({ type: 'aim', slot: t.aim, target: j });
    else doAct(Object.assign({}, t.play, { target: j }));
  }

  function tapHand(i) {
    const s = B.s, p = s.players[B.me];
    const k = p.hand[i];
    if (B.muck) {
      const at = B.muck.indexOf(i);
      if (at >= 0) B.muck.splice(at, 1); else if (B.muck.length < 2) B.muck.push(i); else toast('Max 2 cards');
      S('click'); render(); return;
    }
    const myTurn = myTurnNow();
    const d = E.def(k);
    const hasSlot = p.board.some(x => !x);
    showCard(k, close => {
      const box = h('div', { class: 'acts' });
      if (!myTurn) { box.append(h('p', { class: 'muted' }, "Wait for your turn.")); return box; }
      box.append(h('button', { class: 'primary big', disabled: !E.canPay(p, d.cost) || !hasSlot, onclick: () => {
        close();
        if (d.abil === 'wild') declare(true, k, decl => { B.place = { hand: i, decl }; render(); });
        else { B.place = { hand: i }; render(); }
      } }, 'Play · ' + d.cost + ' Crown' + (d.cost === 1 ? '' : 's')));
      box.append(h('button', { class: 'big', disabled: p.hiddenPlayed || !hasSlot, onclick: () => { close(); declare(false, k, decl => { B.place = { hand: i, faceDown: true, decl }; render(); }); } }, 'Play face-down (bluff)'));
      if (p.hiddenPlayed) box.append(h('p', { class: 'muted small' }, 'You already played a face-down card this turn.'));
      if (!E.canPay(p, d.cost)) box.append(h('p', { class: 'muted small' }, 'Not enough Crowns.'));
      return box;
    });
  }

  // declare picker: wild=true allows 2..A, else 2..10 for a bluff
  function declare(wild, key, done) {
    const d = E.def(key);
    let rank = d.type === 'troop' ? d.rank : (wild ? 14 : 2), suit = d.suit ? d.suit : B.s.players[B.me].suit;
    sheet((box, close) => {
      const draw = () => {
        box.innerHTML = '';
        box.append(h('h2', null, wild ? 'Wild Joker counts as…' : 'Declare your card'));
        box.append(h('p', null, wild ? 'Pick the rank and suit this Joker counts as for poker hands.' :
          'The card goes face-down and counts as what you declare. You pay the declared cost. If they call a lie, it\'s destroyed. If they call the truth, they take 3.'));
        if (!wild && d.type === 'troop') box.append(h('p', { class: 'muted' }, 'Your real card: ' + d.name));
        const rs = h('div', { class: 'picker' });
        for (let r = 2; r <= (wild ? 14 : 10); r++) rs.append(h('button', { class: r === rank ? 'sel' : '', onclick: () => { rank = r; S('click'); draw(); } }, E.rankLabel(r)));
        const ss = h('div', { class: 'picker' });
        E.SUITS.forEach(x => ss.append(h('button', { class: 'suitbtn ' + x + (x === suit ? ' sel' : ''), onclick: () => { suit = x; S('click'); draw(); } }, sym(x))));
        box.append(h('h3', null, 'Rank'), rs, h('h3', null, 'Suit'), ss);
        const cost = wild ? d.cost : E.troopCost(rank);
        const p = B.s.players[B.me];
        const lie = !wild && !(d.type === 'troop' && d.rank === rank && d.suit === suit);
        box.append(h('p', { class: 'px decl' }, 'Declaring ', lbl(rank, suit), ' · Cost ' + cost + (wild ? '' : lie ? ' · LIE' : ' · TRUTH')));
        box.append(h('div', { class: 'row center' },
          h('button', { class: 'primary big', disabled: !E.canPay(p, cost), onclick: () => { close(); done({ rank, suit }); } }, 'Choose slot'),
          h('button', { class: 'big', onclick: close }, 'Cancel')));
      };
      draw();
    });
  }

  function unitSheet(side, j) {
    const s = B.s, u = s.players[side].board[j], mine = side === B.me;
    if (!u) return;
    const myTurn = myTurnNow();
    const p = s.players[B.me];
    sheet((box, close) => {
      const showKey = u.hidden && (!mine || u.key === '?') ? (s.players[side].suit === 'U' ? 'backU' : 'back') : u.key;
      const right = h('div', { class: 'grow' });
      if (u.hidden) {
        right.append(h('h2', null, mine ? 'Your hidden card' : 'Hidden card'), h('p', null, 'Declared as ', lbl(u.decl.rank, u.decl.suit), '. It fights as that card and counts as it for poker hands.'));
        if (mine && u.key !== '?') right.append(h('p', null, 'Really: ', h('b', null, E.def(u.key).name), E.isLie(u) ? ' — a lie.' : ' — the truth.'));
      } else right.append(cardInfo(u.key));
      if (u.wild) right.append(h('p', null, 'Counts as ', lbl(u.wild.rank, u.wild.suit), '.'));
      right.append(h('div', { class: 'stats' }, h('span', null, 'ATK ' + E.effAtk(s, side, j)), h('span', null, 'HP ' + u.hp + '/' + u.maxHp),
        s.active === side && u.born >= s.turn ? h('span', null, 'Ready next turn') : null));
      const acts = h('div', { class: 'acts' });
      if (myTurn && !mine && u.hidden) acts.append(h('button', { class: 'danger big', disabled: !E.canPay(p, 1), onclick: () => { close(); doAct({ type: 'call', slot: j }); } }, 'Call bluff · 1 Crown'));
      if (myTurn && mine && u.hidden && u.key !== '?' && !E.isLie(u)) acts.append(h('button', { class: 'primary big', onclick: () => { close(); doAct({ type: 'reveal', slot: j }); } }, 'Reveal (truth)'));
      if (myTurn && mine && !u.hidden && E.def(u.key).abil === 'duelist') {
        const cands = E.targetsFor(s, B.me, 'duelist', u);
        acts.append(h('button', { class: 'primary big', disabled: !cands.length, onclick: () => { close(); B.target = { aim: j, side: 1 - B.me, cands, hint: TARGET_HINT.duelist }; render(); } }, 'Aim attack'));
        const aimed = s.players[1 - B.me].board.find(x => x && x.uid === u.aim);
        acts.append(h('p', { class: 'small muted' }, aimed ? 'Aimed at ' + (aimed.hidden ? 'a hidden card' : E.def(aimed.key).name) + '.' : 'Not aimed: attacks the weakest enemy.'));
      }
      if (myTurn && mine && !u.hidden && E.def(u.key).type === 'troop' && E.def(u.key).suit === 'H') acts.append(h('button', { class: 'danger big', disabled: u.bp || p.castle <= 1, onclick: () => { close(); doAct({ type: 'blood', slot: j }); } }, 'Blood Price'));
      right.append(acts);
      box.append(h('div', { class: 'cardrow' }, cardEl(showKey, 140), right));
    });
  }

  function leaderSheet(side) {
    const s = B.s, p = s.players[side], mine = side === B.me;
    const myTurn = myTurnNow();
    showCard(p.leader, close => h('div', null,
      h('p', null, K[p.suit].name + ' · Uses left: ' + p.powerUses),
      h('p', { class: 'small muted' }, 'Kingdom trait (' + K[p.suit].trait + '): ' + K[p.suit].traitText),
      mine ? h('button', { class: 'primary big', disabled: !myTurn || p.powerUses <= 0, onclick: () => {
        close();
        const L = E.def(p.leader);
        const cands = p.board.map((x, j) => (x ? j : -1)).filter(j => j >= 0);
        if (L.power === 'rally' && cands.length) { B.target = { power: true, side: B.me, cands, hint: 'Rally: tap a troop to heal and empower it' }; render(); }
        else doAct({ type: 'power' });
      } }, 'Use ' + E.def(p.leader).abilityName) : null));
  }

  function pokerSheet(side) {
    const hd = E.evalBoard(B.s, side);
    sheet((box) => {
      box.append(h('h2', null, 'Board poker hands'), h('p', null, 'Your 5 board slots form poker hands. Every hand on your board gives its bonus, so a Full House also gets the Three of a Kind and Pair bonuses. Hidden cards count as declared; the FALSE Joker counts as anything.'));
      if (hd.has.length) box.append(h('p', { class: 'px small' }, 'Active now: ' + hd.has.map(r => E.HAND_NAMES[r]).join(', ')), h('p', null, 'Because: ' + hd.why));
      box.append(pokerTable(hd.has), flushTable());
    });
  }

  function menuSheet() {
    sheet((box, close) => {
      box.append(h('h2', null, 'Battle menu'));
      box.append(h('div', { class: 'row center' },
        h('button', { class: 'big', onclick: () => { close(); pokerSheet(B.me); } }, 'Poker hands'),
        h('button', { class: 'big', onclick: () => { Sfx.set(!Sfx.on); close(); toast('Sound ' + (Sfx.on ? 'on' : 'off')); } }, 'Sound: ' + (Sfx.on ? 'On' : 'Off')),
        h('button', { class: 'danger big', onclick: () => { close(); concede(); } }, 'Concede')));
      box.append(h('h3', null, 'Log'), h('div', { class: 'log' }, ...B.s.log.slice(-30).reverse().map(l => h('div', null, l))));
    });
  }
  function concede() {
    if (B.s.winner != null) return;
    if (B.mode === 'guest') { window.Net && Net.send({ t: 'concede' }); B.s.winner = 1 - B.me; finish(); return; }
    B.s.winner = 1 - B.me;
    if (B.mode === 'host') sendState([{ t: 'win', side: B.s.winner }]);
    finish();
  }

  // ---------- coin toss & starting hand overlays ----------
  function closeOverlay() { if (B && B.overlay) { B.overlay.close(); B.overlay = null; } }
  function showCoin() {
    if (B.overlay && B.overlay.kind === 'coin') return;
    closeOverlay();
    const s = B.s, iWon = s.coinWinner === B.me;
    const opName = s.players[1 - B.me].name;
    const close = sheet((box) => {
      const coin = h('div', { class: 'coin3d' }, h('div', { class: 'cface front' }, cardEl(s.players[B.me].leader, 64)), h('div', { class: 'cface backf' }, cardEl(s.players[1 - B.me].leader, 64)));
      const msg = h('div', { class: 'cointext' }, 'Flipping…');
      const acts = h('div', { class: 'acts center' });
      coin.classList.add(iWon ? 'land-me' : 'land-op');
      box.append(h('h2', null, 'Coin toss'), coin, msg, acts);
      S('flip');
      setTimeout(() => {
        S('coin');
        if (iWon) {
          msg.textContent = 'You won the toss! Go first or second?';
          acts.append(h('p', { class: 'small muted' }, 'First: you act first. Second: you start with 1 bonus Coin.'),
            h('button', { class: 'primary big', onclick: () => doAct({ type: 'choose', first: true }) }, 'Go first'),
            h('button', { class: 'big', onclick: () => doAct({ type: 'choose', first: false }) }, 'Go second'));
        } else {
          msg.textContent = opName + ' won the toss and is choosing…';
          if (B.mode === 'ai') setTimeout(() => aiLoop(), 700);
        }
      }, 1500);
    }, { mid: true, locked: true });
    B.overlay = { kind: 'coin', close };
  }
  function showMulligan() {
    if (B.overlay && B.overlay.kind === 'mull') return;
    closeOverlay();
    const s = B.s, p = s.players[B.me];
    const pick = [];
    const close = sheet((box) => {
      const draw = () => {
        box.innerHTML = '';
        box.append(h('h2', null, 'Starting hand'));
        box.append(h('p', null, 'You go ' + (s.first === B.me ? 'first' : 'second') + '. Tap up to 3 cards to swap them for new ones.'));
        const row = h('div', { class: 'mullrow' });
        const cw = Math.floor(Math.min(110, (Math.min(window.innerWidth, 560) - 70) / 5));
        p.hand.forEach((k, i) => {
          const c = cardEl(k, cw, { onclick: () => { const at = pick.indexOf(i); if (at >= 0) pick.splice(at, 1); else if (pick.length < 3) pick.push(i); else toast('Swap up to 3'); S('click'); draw(); } });
          const w = h('div', { class: 'mcard' + (pick.includes(i) ? ' out' : '') }, h('div', { class: 'hcost' }, ico('crown'), E.def(k).cost), c, pick.includes(i) ? h('div', { class: 'swaptag' }, 'SWAP') : null);
          row.append(w);
        });
        box.append(row, h('div', { class: 'acts center' },
          h('button', { class: 'primary big', onclick: () => doAct({ type: 'mulligan', idx: pick.slice() }) }, pick.length ? 'Swap ' + pick.length + ' & start' : 'Keep hand')));
      };
      draw();
    }, { mid: true, locked: true });
    B.overlay = { kind: 'mull', close };
  }
  function showWaiting() {
    if (B.overlay && B.overlay.kind === 'wait') return;
    closeOverlay();
    const close = sheet((box) => { box.append(h('h2', null, 'Ready'), h('p', { style: 'text-align:center' }, 'Waiting for your opponent to choose their starting hand…')); }, { mid: true, locked: true });
    B.overlay = { kind: 'wait', close };
  }

  // ----- action pipeline -----
  function doAct(a) {
    if (B.busy) return;
    if (B.mode === 'guest') {
      B.busy = true; if (a.type === 'choose' || a.type === 'mulligan') closeOverlay(); render();
      Net.send({ t: 'act', a });
      setTimeout(() => { if (B && B.busy && B.mode === 'guest') { B.busy = false; render(); } }, 8000);
      return;
    }
    const err = E.legal(B.s, B.me, a);
    if (err) { toast(err); render(); return; }
    runAct(B.me, a);
  }
  function runAct(side, a) {
    if (side === B.me) B.target = null;
    B.queue = B.queue.then(async () => {
      const pre = E.clone(B.s);
      const err = E.act(B.s, side, a);
      if (err) { if (B.mode === 'host' && side === 1) Net.send({ t: 'err', msg: err }); return; }
      const evs = B.s.ev; B.s.ev = [];
      if (B.mode === 'host') sendState(evs);
      B.busy = true;
      await present(pre, evs);
      B.busy = false;
      render();
      after();
    });
    return B.queue;
  }
  function sendState(evs) { Net.send({ t: 'state', s: E.redact(B.s, 1), ev: evs }); }

  async function present(pre, evs) {
    if (B.s.phase !== 'play' || evs.some(e => e.t === 'order')) {
      const o = evs.find(e => e.t === 'order');
      if (o) { closeOverlay(); render(); banner(o.first === B.me ? 'You go first' : 'They go first', o.first === B.me ? 'good' : ''); S('turn'); await sleep(900); }
      if (B.s.phase !== 'play') return;
    }
    const idx = evs.findIndex(e => e.t === 'startturn');
    const isEnd = idx > 0 && evs.slice(0, idx).some(e => e.t === 'endturn');
    if (isEnd) {
      const post = B.s; B.s = pre; render(); B.s = post;
      await playEvents(evs.slice(0, idx));
      render();
      await playEvents(evs.slice(idx + 1));
    } else { render(); await playEvents(evs); }
    comboCheck();
  }
  // celebrate when a side forms a better poker hand
  function comboCheck() {
    for (const side of [B.me, 1 - B.me]) {
      const r = E.evalBoard(B.s, side).rank;
      if (r > B.ranks[side] && r > 0) {
        if (side === B.me) { if (r >= 3) D.questBump('hand3'); if (r >= 5) D.questBump('hand5'); }
        const el = $(`.board.${side === B.me ? 'mine' : 'theirs'}`);
        if (el) { el.classList.remove('combo'); void el.offsetWidth; el.classList.add('combo'); }
        callout(el, E.HAND_NAMES[r] + '!');
        S('combo');
      }
      B.ranks[side] = r;
    }
  }
  function callout(el, text) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const c = h('div', { class: 'callout', style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px` }, text);
    document.body.append(c); setTimeout(() => c.remove(), 1300);
  }
  function burst(el, color, n) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < (n || 14); i++) {
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      const p = h('div', { class: 'pbit', style: `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px` });
      document.body.append(p); setTimeout(() => p.remove(), 650);
    }
  }
  function shake(big) { const b = $('.battle'); if (!b) return; b.classList.remove('shake1', 'shake2'); void b.offsetWidth; b.classList.add(big ? 'shake2' : 'shake1'); }
  const SUITCOL = { H: '#d43c3c', D: '#3d82c4', S: '#8a4aa6', C: '#2f9a58', U: '#e0a43a' };

  const slotEl = (side, slot) => $(`[data-k="s${side}-${slot}"]`);
  function track(e) {
    const me = B.me, op = 1 - me, Q = D.questBump;
    if (e.t === 'play' && e.side === me) { Q('play'); if (e.hidden) Q('bluff'); }
    else if (e.t === 'die' && e.side === op) Q('kill');
    else if (e.t === 'dmg' && e.slot === 'castle' && e.side === op) Q('castle', e.n);
    else if (e.t === 'power' && e.side === me) Q('power');
    else if (e.t === 'lie' && e.side === op) Q('catch');
  }
  async function playEvents(evs) {
    for (const e of evs) {
      track(e);
      switch (e.t) {
        case 'play': { const el = slotEl(e.side, e.slot); const c = el && el.querySelector('.card'); if (c) { c.classList.add('slam'); } S('play'); burst(el, '#fffee6', 8); await sleep(e.side === B.me ? 120 : 260); break; }
        case 'attack': {
          const c = slotEl(e.side, e.slot); const card = c && c.querySelector('.card');
          if (card) { const cls = e.side === B.me ? 'lunge-up' : 'lunge-down'; card.classList.add(cls); S('swing'); await sleep(200); card.classList.remove(cls); await sleep(60); }
          break;
        }
        case 'dmg': {
          if (e.slot === 'castle') {
            const el = $(`[data-k="c${e.side}"]`); floatAt(el, '-' + e.n, 'dmg big');
            if (el) {
              const b = el.querySelector('b'); const m = /(-?\d+) \/ (\d+)/.exec(b.textContent);
              if (m) { const v = Math.max(0, +m[1] - e.n); b.textContent = v + ' / ' + m[2]; el.querySelector('i').style.width = (v / +m[2] * 100) + '%'; }
              el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
            }
            S('castle'); shake(e.n >= 4);
          } else {
            const el = slotEl(e.side, e.slot); floatAt(el, '-' + e.n, 'dmg');
            const card = el && el.querySelector('.card');
            if (card) {
              card.classList.remove('hitflash'); void card.offsetWidth; card.classList.add('hitflash');
              const hb = el.parentNode.querySelector('.sh'); if (hb) { hb.lastChild.textContent = Math.max(0, +hb.lastChild.textContent - e.n); hb.classList.add('hurt'); }
            }
            S('hit');
          }
          await sleep(170); break;
        }
        case 'heal': floatAt(e.slot === 'castle' ? $(`[data-k="c${e.side}"]`) : slotEl(e.side, e.slot), '+' + e.n, 'heal'); S('heal'); await sleep(220); break;
        case 'die': {
          const el = slotEl(e.side, e.slot); const card = el && el.querySelector('.card');
          if (card) card.classList.add('dying');
          burst(el, SUITCOL[B.s.players[e.side].suit] || '#fff', 16); S('die');
          await sleep(280); break;
        }
        case 'abil': { const el = slotEl(e.side, e.slot); floatAt(el, e.name, 'abil'); flourish(el && el.querySelector('.card')); S('magic'); await sleep(450); break; }
        case 'power': { banner(e.name); const L = $(`.side-bar${e.side === B.me ? '.mine' : ':not(.mine)'} .leader`); flourish(L); burst(L, '#f2c14e', 18); S('magic'); await sleep(850); break; }
        case 'banner': banner(e.text); S('combo'); await sleep(900); break;
        case 'call': banner('Bluff called!'); S('bluff'); await sleep(800); break;
        case 'lie': banner('A LIE!', 'bad'); S('lie'); shake(true); await sleep(850); break;
        case 'reveal': { const el = slotEl(e.side, e.slot); floatAt(el, 'Truth!', 'heal'); S('truth'); await sleep(380); break; }
        case 'block': floatAt($(`[data-k="c${e.side}"]`), 'Blocked!', 'abil'); await sleep(250); break;
        case 'revive': floatAt(slotEl(e.side, e.slot), 'Bloodless!', 'abil'); S('magic'); await sleep(380); break;
        case 'steal': floatAt(slotEl(e.side, e.to), 'Bribed!', 'abil'); S('coin'); await sleep(380); break;
        case 'draw': if (e.side === B.me) S('draw'); break;
        case 'turn': banner(e.side === B.me ? 'Your turn' : "Their turn", e.side === B.me ? 'good' : ''); S('turn'); await sleep(650); break;
      }
    }
  }

  function after() {
    if (!B) return;
    const s = B.s;
    if (s.winner != null) { closeOverlay(); finish(); return; }
    if (s.phase === 'coin') { showCoin(); return; }
    if (s.phase === 'mulligan') {
      if (!s.mull[B.me]) showMulligan(); else showWaiting();
      if (B.mode === 'ai' && !s.mull[1 - B.me]) aiLoop();
      return;
    }
    closeOverlay();
    if (B.boss && !B.saidIntro) { B.saidIntro = true; setTimeout(() => B && say(B.boss.intro), 300); }
    const opp = s.players[1 - B.me];
    if (B.boss && !B.saidHurt && opp.castle <= opp.castleMax / 2) { B.saidHurt = true; say(B.boss.hurt); }
    if (B.mode === 'ai' && s.active !== B.me) aiLoop();
  }
  function aiShouldAct(side) {
    const s = B.s;
    if (s.winner != null) return false;
    if (s.phase === 'coin') return s.coinWinner === side;
    if (s.phase === 'mulligan') return !s.mull[side];
    return s.active === side;
  }
  async function aiLoop() {
    if (!B || B.aiRunning) return;
    const side = 1 - B.me;
    if (!aiShouldAct(side)) return;
    B.aiRunning = true;
    const setup = B.s.phase !== 'play';
    if (!setup) { B.busy = true; render(); await sleep(450); }
    let n = 0;
    while (B && aiShouldAct(side)) {
      let a = n++ > 30 ? { type: 'end' } : (scriptedAction(side) || AI.nextAction(B.s, side, B.level));
      if (!a || E.legal(B.s, side, a)) a = { type: 'end' };
      const pre = E.clone(B.s);
      if (E.act(B.s, side, a)) break;
      const evs = B.s.ev; B.s.ev = [];
      await present(pre, evs);
      if (a.type === 'mulligan' || a.type === 'choose') break;
      await sleep(a.type === 'end' ? 150 : 380);
    }
    if (!B) return;
    B.aiRunning = false; B.busy = false; render();
    after();
  }

  // tutorial opponent follows a script on its first turns
  function scriptedAction(side) {
    const s = B.s;
    if (!B.script || s.phase !== 'play') return null;
    if (B.lastAiTurn !== s.turn) { B.lastAiTurn = s.turn; B.oppTurn = (B.oppTurn || 0) + 1; B.sq = B.script[B.oppTurn] ? B.script[B.oppTurn].slice() : null; }
    if (!B.sq) return null;
    const step = B.sq.shift();
    if (!step) return { type: 'end' };
    const p = s.players[side];
    const hand = p.hand.indexOf(step[1]);
    let slot = step[2]; if (p.board[slot]) slot = p.board.findIndex(x => !x);
    if (hand < 0 || slot < 0) return { type: 'end' };
    if (step[0] === 'bluff') return { type: 'play', hand, slot, faceDown: true, decl: { rank: step[3], suit: step[4] } };
    return { type: 'play', hand, slot };
  }

  function confetti() {
    const cols = ['#f2c14e', '#84dcb4', '#ffaabb', '#5fa3ab', '#d43c3c', '#3d82c4'];
    for (let i = 0; i < 70; i++) {
      const p = h('div', { class: 'confetti', style: `left:${Math.random() * 100}vw;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.6}s;--rx:${(Math.random() - .5) * 200}px` });
      document.body.append(p); setTimeout(() => p.remove(), 2600);
    }
  }

  function finish() {
    if (!B || B.done) return;
    B.done = true; B.busy = false; render();
    const won = B.s.winner === B.me;
    if (won) { D.questBump('win'); if (B.mode === 'host' || B.mode === 'guest') D.questBump('duelwin'); }
    setTimeout(() => {
      const res = B.onEnd ? B.onEnd(won) : null;
      banner(won ? 'VICTORY' : 'DEFEAT', won ? 'good' : 'bad');
      S(won ? 'win' : 'lose'); if (won) confetti(); else shake(true);
      setTimeout(() => sheet((box, close) => {
        box.append(h('h2', null, won ? 'Victory!' : 'Defeat'));
        box.append(h('div', { class: 'result' }, cardEl(B.s.players[won ? B.me : 1 - B.me].leader, 90)));
        if (B.boss) box.append(h('p', { class: 'quote' }, h('b', null, B.boss.name + ': '), '"' + (won ? B.boss.lose : B.boss.win) + '"'));
        if (res && res.lines) res.lines.forEach(l => box.append(h('p', { style: 'text-align:center' }, l)));
        const leave = fn => { close(); document.body.classList.remove('inbattle'); const f = fn; B = null; f(res); };
        box.append(h('div', { class: 'row center' },
          B.rematch ? h('button', { class: 'big', onclick: () => leave(B.rematch) }, 'Rematch') : null,
          h('button', { class: 'primary big', onclick: () => leave(B.exit) }, 'Continue')));
      }, { mid: true, locked: true }), 1100);
    }, 400);
  }

  // network inbound (used by duel)
  function netMessage(m) {
    if (!B) return;
    if (B.mode === 'guest') {
      if (m.t === 'state') {
        B.queue = B.queue.then(async () => {
          const pre = B.s; B.s = m.s; B.busy = true;
          await present(pre, m.ev || []); B.busy = false; render(); after();
        });
      } else if (m.t === 'err') { B.busy = false; toast(m.msg); render(); after(); }
      else if (m.t === 'concede') { B.s.winner = B.me; finish(); }
    } else if (B.mode === 'host') {
      if (m.t === 'act') {
        const err = E.legal(B.s, 1, m.a);
        if (err) { Net.send({ t: 'err', msg: err }); return; }
        runAct(1, m.a);
      } else if (m.t === 'concede') { B.s.winner = B.me; sendState([]); finish(); }
    }
  }
  function netClosed() { if (B && (B.mode === 'host' || B.mode === 'guest') && B.s.winner == null) { toast('Opponent disconnected'); B.s.winner = B.me; finish(); } }
  // =====================================================
  // SCREENS
  // =====================================================
  const P = () => D.profile();
  function topbar(title, back) {
    const p = P();
    return h('div', { class: 'topbar' },
      back ? h('button', { class: 'iconbtn', onclick: back, 'aria-label': 'Back' }, h('img', { src: 'assets/gui/ico-left.png', alt: '' })) : null,
      h('div', { class: 'title' }, title),
      p ? h('span', { class: 'chip gold' }, p.gold + ' gold') : null,
      p ? h('span', { class: 'chip' }, p.packs + (p.packs === 1 ? ' pack' : ' packs')) : null);
  }
  function screen(...kids) {
    B = null; document.body.classList.remove('inbattle');
    const a = app(); a.innerHTML = '';
    kids = kids.filter(Boolean);
    const head = kids[0] && kids[0].classList && kids[0].classList.contains('topbar') ? kids.shift() : null;
    if (head) a.append(head);
    // body fills the screen; short content is centered vertically instead of leaving dead space below
    a.append(h('div', { class: 'screen-body' }, h('div', { class: 'screen-inner' }, ...kids)));
    window.scrollTo(0, 0);
  }

  // ----- title / onboarding -----
  function title() {
    const p = D.load();
    const fan = h('div', { class: 'fan' }, ...['H13:a', 'D12:a', 'JF:a', 'S11:a', 'C13:a'].map(k => cardEl(k, 72)));
    screen(
      h('div', { class: 'logo' }, h('div', { class: 'big' }, 'PLEBES'), h('div', { class: 'sub' }, 'THE POKER TRADING CARD GAME')),
      fan,
      h('div', { class: 'row center', style: 'margin-top:18px' },
        p ? h('button', { class: 'primary big', onclick: menu }, 'Continue') : h('button', { class: 'primary big', onclick: pickKingdom }, 'New game'),
        h('button', { class: 'big', onclick: howTo }, 'How to play')),
      h('p', { class: 'center muted', style: 'text-align:center;margin-top:20px' }, 'Card art: Pixel Plebes by Devlyn JD · Interface: Pocket GUI by Vreyll'));
  }
  function pickKingdom() {
    let chosen = null; let name = 'Plebe';
    const grid = h('div', { class: 'kingdoms' });
    const blurbs = { H: 'Sacrifice for power. Heroes return Bloodless.', D: 'Coins, bribes and taxes. Win the economy.', S: 'Dig the graveyard. The dead keep fighting.', C: 'Grow and smash. Bigger every turn.' };
    const draw = () => {
      grid.innerHTML = '';
      ['H', 'D', 'S', 'C'].forEach(s => grid.append(h('div', { class: 'kcard' + (chosen === s ? ' chosen' : ''), onclick: () => { chosen = s; draw(); } },
        cardEl(s + 'A', 72), h('div', null, h('div', { class: 'kname', style: `color:var(--${s})` }, K[s].name), h('div', { class: 'small' }, sym(s), ' ' + K[s].suit), h('p', null, blurbs[s]), h('p', { class: 'small muted' }, K[s].trait + ': ' + K[s].traitText)))));
    };
    draw();
    const input = h('input', { value: name, maxlength: 16, oninput: e => { name = e.target.value; } });
    screen(topbar('Choose your kingdom', title),
      h('p', { style: 'padding:0 8px' }, 'Your first kingdom gives you its Ace (your leader and castle) and a 30-card starter deck. Win the campaign to unlock the others.'),
      grid,
      h('div', { class: 'row center' }, h('span', { class: 'px small' }, 'Your name'), input),
      h('div', { class: 'row center' }, h('button', { class: 'primary big', onclick: () => { if (!chosen) return toast('Pick a kingdom'); D.start(chosen, name.trim() || 'Plebe'); menu();
          sheet((box, close) => { box.append(h('h2', null, 'Welcome to ' + K[chosen].name), h('p', null, 'New to Plebes? A guided 5-minute match teaches the basics: playing cards, combat, poker hands and calling bluffs.'), h('p', { class: 'small muted' }, 'Reward: 1 pack and 50 gold. You also have 1 free pack waiting.'),
            h('div', { class: 'acts' }, h('button', { class: 'primary big', onclick: () => { close(); tutorial(); } }, 'Play the tutorial'), h('button', { class: 'big', onclick: close }, 'Skip for now'))); }, { mid: true }); } }, 'Begin')));
  }

  // ----- main menu -----
  function menu() {
    const p = P();
    const icon = key => key.startsWith('gui:') ? gico(key.slice(4), 'tico') : cardEl(key, 40, { cls: 'ico' });
    const tile = (t, sub, key, fn, badge) => h('button', { class: 'tile', onclick: fn }, icon(key), h('div', null, h('span', { class: 't' }, t), sub), badge ? h('span', { class: 'badge-new' }, badge) : null);
    const ready = D.questsReady();
    screen(topbar('Hello, ' + p.name),
      h('div', { class: 'menu' },
        tile('Campaign', 'Conquer the five kingdoms', 'HA', campaign),
        tile('Skirmish', 'Quick match vs the computer', 'S11', skirmish),
        tile('Duel', 'Play a friend by invite code', 'JT', duel),
        tile('Draft', 'Pick cards, play for packs', 'JF', draft),
        tile('Quests', ready ? ready + ' reward' + (ready > 1 ? 's' : '') + ' ready' : 'New quests every day', 'gui:app-scroll', questsScreen, ready || null),
        tile('Packs', p.packs + ' to open · shop', 'back', shop, p.packs || null),
        tile('Decks', 'Build, share and import', 'D12', decks),
        tile('Collection', Object.keys(p.coll).length + ' owned · craft cards', 'C13', collection),
        tile('Tutorial', p.tutorial ? 'Replay the guided match' : 'Learn in 5 minutes', 'gui:app-heart', tutorial),
        tile('How to play', 'Rules and poker bonuses', 'H2', howTo),
        tile('Credits', 'Art, sound, settings', 'gui:app-key', credits)),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Record: ' + p.wins + 'W – ' + p.losses + 'L'));
  }

  // ----- quests -----
  function questsScreen() {
    const list = h('div', { class: 'quests' });
    D.quests().forEach(q => {
      const done = q.n >= q.goal;
      list.append(h('div', { class: 'panel quest' + (q.claimed ? ' claimed' : '') },
        h('div', { class: 'qt' }, q.text),
        h('div', { class: 'qbar' }, h('i', { style: `width:${q.n / q.goal * 100}%` }), h('b', null, q.n + ' / ' + q.goal)),
        h('div', { class: 'row' }, h('span', { class: 'grow small' }, 'Reward: ' + (q.gold ? q.gold + ' gold' : q.pack + ' pack')),
          q.claimed ? h('span', { class: 'chip' }, 'Claimed') : h('button', { class: done ? 'primary' : '', disabled: !done, onclick: () => { const r = D.questClaim(q.id); if (r) { toast(r); if (window.Sfx) Sfx.play('coin'); } questsScreen(); } }, done ? 'Claim' : 'In progress'))));
    });
    screen(topbar('Daily quests', menu), h('p', { style: 'padding:0 8px' }, 'Three new quests every day. Progress counts in every mode.'), list);
  }

  // ----- deck choice helper -----
  function validDecks() { const p = P(); return p.decks.map((d, i) => ({ d, i, errs: E.validateDeck(d.leader, d.cards).concat(ownErrors(d)) })).filter(x => !x.errs.length); }
  function ownErrors(d) {
    const need = {}; d.cards.forEach(k => { need[k] = (need[k] || 0) + 1; });
    const e = []; for (const k in need) if (D.owned(k) < need[k]) e.push('Missing ' + E.def(k).name);
    if (!D.owned(d.leader)) e.push('Leader not owned');
    return e;
  }
  function chooseDeck(titleText, cb, extra) {
    const vs = validDecks(); const p = P();
    sheet((box, close) => {
      box.append(h('h2', null, titleText));
      if (extra) box.append(extra);
      if (!vs.length) box.append(h('p', null, 'You have no legal decks. Fix one in Decks.'));
      vs.forEach(({ d, i }) => box.append(h('div', { class: 'dl pick', style: '--cw:34px;margin:6px 0', onclick: () => { close(); p.active = i; D.save(); cb(d); } }, cardEl(d.leader, 34), h('span', { class: 'n' }, d.name), i === p.active ? h('span', { class: 'q' }, 'last used') : null)));
      box.append(h('div', { class: 'row center' }, h('button', { onclick: close }, 'Cancel')));
    });
  }

  function battleVsAI(deck, foe, onEnd, exit, noRematch) {
    const s = E.newGame({ players: [{ leader: deck.leader, deck: deck.cards, name: P().name }, foe] });
    startBattle({ mode: 'ai', state: s, s, me: 0, level: foe.ai || 2, onEnd, exit, boss: foe.boss || null,
      rematch: noRematch ? null : () => battleVsAI(deck, foe, onEnd, exit) });
  }
  function tutorial() {
    const t = D.tutorialSetup();
    const s = E.newGame(t);
    startBattle({ mode: 'ai', s, me: 0, level: 1, tutorial: true, script: t.script,
      boss: { name: 'Pick, the Tunneler', intro: 'A new recruit? Let us see what you have got.', hurt: 'Hey, you are getting the hang of this!', win: 'Practice makes perfect. Go again!', lose: 'Well played! You are ready for the real thing.' },
      onEnd: won => { const first = D.tutorialDone(); return { lines: [first ? 'Tutorial complete: +1 pack, +50 gold' : 'Tutorial complete', won ? 'Next: try a Skirmish or start the Campaign.' : 'You still learned the ropes. Try the Campaign!'] }; },
      exit: () => menu() });
  }

  // ----- campaign -----
  function campaign() {
    const p = P();
    const grid = h('div', { class: 'kingdoms' });
    E.SUITS.forEach(s => {
      const open = D.campaignOpen(s); const done = p.campaign[s];
      grid.append(h('div', { class: 'kcard' + (open ? '' : ' locked'), onclick: () => open ? kingdomStages(s) : toast('Clear all four kingdoms to reach United Falls') },
        cardEl(s + 'A', 64, { locked: !open }),
        h('div', { class: 'grow' }, h('div', { class: 'kname', style: `color:var(--${s})` }, K[s].name), h('div', { class: 'small' }, sym(s), ' ' + K[s].suit),
          h('p', null, done >= 7 ? 'Conquered' : done + ' / 7 stages'), h('div', { class: 'bar' }, h('i', { style: `width:${done / 7 * 100}%;background:var(--${s})` })),
          !open ? h('p', { class: 'small' }, 'Locked: clear the other four first.') : null)));
    });
    const all = E.SUITS.every(s => p.campaign[s] >= 7);
    screen(topbar('Campaign', menu),
      h('p', { style: 'padding:0 8px' }, 'Each kingdom has 7 stages: three ranks of troops, the Jack, the Queen, the King, and the Ace. Every win gives a pack. Heroes drop variants. Beat an Ace to unlock that kingdom.'),
      grid,
      all ? h('div', { class: 'row center' }, h('button', { class: p.hard ? 'primary' : '', onclick: () => { p.hard = !p.hard; D.save(); campaign(); } }, 'Hard mode: ' + (p.hard ? 'ON' : 'OFF'))) : null);
  }
  function kingdomStages(s) {
    const p = P();
    const list = h('div', { class: 'stages' });
    D.STAGES.forEach((st, i) => {
      const done = p.campaign[s] > i, open = p.campaign[s] >= i;
      list.append(h('div', { class: 'stage' + (done ? ' done' : '') + (open ? '' : ' locked'), onclick: () => open ? stageBrief(s, i) : toast('Clear the previous stage first') },
        cardEl(s + (st.art === 14 ? 'A' : st.art), 44, { locked: !open }),
        h('div', { class: 'grow' }, h('div', { class: 'sn' }, (i + 1) + '. ' + st.name), h('div', { class: 'small muted' }, st.sub + (i === 6 ? ' · ' + D.TWIST[s].text : ''))),
        h('span', { class: 'chip' }, done ? 'Cleared' : open ? 'Fight' : 'Locked')));
    });
    screen(topbar(K[s].name, campaign), list);
  }
  function stageBrief(s, i) {
    const st = D.STAGES[i];
    const foe = D.stageSetup(s, i);
    const extra = h('div', null,
      h('p', null, 'Opponent: ' + foe.name), foe.boss ? h('p', { class: 'quote' }, '"' + foe.boss.intro + '"') : null,
      foe.boss ? h('div', { class: 'row' }, h('span', { class: 'small' }, 'Signature card:'), cardEl(foe.boss.sig, 44, { onclick: () => showCard(foe.boss.sig) })) : null,
      h('p', null, 'Their castle: ' + foe.castle + ' · Skill: ' + ['', 'Novice', 'Knight', 'Cunning'][foe.ai]),
      i === 6 ? h('p', null, 'Twist: ' + D.TWIST[s].text) : null,
      h('p', { class: 'gold', style: 'color:#a77215' }, 'Reward: 1 pack + 30 gold' + (i >= 3 && i <= 5 ? ' + a hero variant' : '') + (i === 6 ? ' + unlock ' + K[s].name : '')));
    chooseDeck('Stage ' + (i + 1) + ': ' + st.name, deck => {
      battleVsAI(deck, foe, won => {
        if (!won) { D.reward(false, foe.ai); return { lines: ['+15 gold. Try again!'] }; }
        P().wins++;
        D.questBump('campaign');
        const r = D.campaignWin(s, i);
        return { lines: r.msgs, forced: r.forced };
      }, res => {
        if (res && res.forced) { const pp = P(); pp.packs--; D.save(); openPackScreen(res.forced, () => kingdomStages(s)); }
        else kingdomStages(s);
      });
    }, extra);
  }

  // ----- skirmish -----
  function skirmish() {
    let foeS = 'R', lvl = 2;
    const body = h('div');
    const draw = () => {
      body.innerHTML = '';
      const ks = h('div', { class: 'tabs' }, h('button', { class: foeS === 'R' ? 'sel' : '', onclick: () => { foeS = 'R'; draw(); } }, 'Random'),
        ...E.SUITS.map(x => h('button', { class: (foeS === x ? 'sel ' : '') + 'suitbtn ' + x, onclick: () => { foeS = x; draw(); } }, sym(x), ' ' + K[x].suit)));
      const ls = h('div', { class: 'tabs' }, ...[1, 2, 3].map(l => h('button', { class: lvl === l ? 'sel' : '', onclick: () => { lvl = l; draw(); } }, ['', 'Novice', 'Knight', 'Cunning'][l])));
      body.append(h('div', { class: 'panel' }, h('h3', null, 'Opponent kingdom'), ks, h('h3', null, 'Difficulty'), ls,
        h('p', null, 'Win: +' + [0, 30, 45, 60][lvl] + ' gold · Loss: +15 gold'),
        h('div', { class: 'row center' }, h('button', { class: 'primary big', onclick: go }, 'Choose deck & play'))));
    };
    const go = () => chooseDeck('Your deck', deck => {
      const s = foeS === 'R' ? E.SUITS[Math.floor(Math.random() * 5)] : foeS;
      const v = lvl === 3 ? 'o' : 'b';
      const foe = { leader: s + 'A', deck: D.genDeck(s, { variant: v, jokers: lvl >= 2 }), ai: lvl, name: K[s].name + ' Skirmisher' };
      battleVsAI(deck, foe, won => ({ lines: ['+' + D.reward(won, lvl) + ' gold'] }), () => skirmish());
    });
    draw();
    screen(topbar('Skirmish', menu), body);
  }

  // ----- shop / packs -----
  function shop() {
    const p = P();
    screen(topbar('Packs', menu),
      h('div', { class: 'packzone' }, cardEl('back', Math.min(170, Math.floor(window.innerWidth * 0.42)), { count: 'x' + p.packs, cls: 'packcard' + (p.packs ? ' hasp' : '') })),
      h('p', { style: 'text-align:center' }, '5 cards per pack: 3 commons, 1 uncommon, 1 rare slot. Rares can be hero variants (Origin, Classic), Ace variants, foils, or Animated legends. Extra copies past the deck limit turn into gold.'),
      h('div', { class: 'row center' },
        h('button', { class: 'primary big', disabled: !p.packs, onclick: () => { p.packs--; D.save(); openPackScreen(null, shop); } }, 'Open a pack'),
        h('button', { class: 'big', disabled: p.gold < D.PACK_COST, onclick: () => { D.buyPack(); shop(); toast('Bought a pack!'); } }, 'Buy pack (' + D.PACK_COST + 'g)')));
  }
  function openPackScreen(forced, back) {
    const res = D.openPack(forced);
    if (window.Sfx) Sfx.play('pack');
    const zone = h('div', { class: 'packzone' });
    let opened = 0;
    const btn = h('button', { class: 'primary big' }, 'Reveal all');
    res.forEach(r => {
      const front = cardEl(r.key, 108, { cls: 'r-' + r.r });
      const f = h('div', { class: 'flip' }, h('div', { class: 'inner' }, h('div', { class: 'face' }, cardEl('back', 108)), h('div', { class: 'face front' }, front)),
        h('div', { class: 'lbl' }, ''));
      const open = () => {
        if (f.classList.contains('open')) { showCard(r.key); return; }
        f.classList.add('open'); opened++;
        if (window.Sfx) Sfx.play(r.r === 'legend' ? 'legend' : r.r === 'common' ? 'draw' : 'coin');
        const d = E.def(r.key);
        f.querySelector('.lbl').textContent = [d.v !== 'b' ? d.vName : '', r.r === 'common' ? '' : r.r.toUpperCase(), r.dup ? 'dup +' + r.gold + 'g' : 'NEW'].filter(Boolean).join(' · ');
        if (r.r === 'legend') banner('LEGENDARY!');
        if (opened === 5) { btn.textContent = 'Done'; btn.onclick = back; }
      };
      f.addEventListener('click', open); zone.append(f);
    });
    btn.onclick = () => zone.querySelectorAll('.flip:not(.open)').forEach(f => f.click());
    screen(topbar('Opening pack', back), h('p', { style: 'text-align:center' }, 'Tap each card to reveal.'), zone, h('div', { class: 'row center' }, btn));
  }

  // ----- collection -----
  function filterKeys(f) {
    return E.allKeys().filter(k => {
      const d = E.def(k);
      if (f === 'J') return d.type === 'joker';
      if (f === 'A') return d.type === 'ace';
      if (f === 'all') return true;
      return d.suit === f && d.type !== 'ace';
    });
  }
  function collection(f) {
    f = f || 'all';
    const p = P();
    const tabs = h('div', { class: 'tabs' }, ...[['all', 'All'], ...E.SUITS.map(s => [s, sym(s)]), ['J', 'Jokers'], ['A', 'Aces']].map(([id, t]) => h('button', { class: (f === id ? 'sel ' : '') + 'suitbtn ' + id, onclick: () => collection(id) }, t)));
    const keys = filterKeys(f);
    const have = keys.filter(k => D.owned(k)).length;
    const grid = h('div', { class: 'grid', style: '--cw:72px' });
    keys.forEach(k => { const n = D.owned(k); grid.append(cardEl(k, 72, { locked: !n, count: n ? n + '/' + D.maxCopies(k) : null, vtag: E.def(k).v !== 'b' ? E.def(k).vName : null, onclick: () => showCard(k, close => craftBox(k, close, () => collection(f))) })); });
    screen(topbar('Collection', menu), tabs, h('p', null, have + ' / ' + keys.length + ' collected in this view'), grid);
  }

  function craftBox(k, close, after) {
    const cost = D.craftCost(k), n = D.owned(k), max = D.maxCopies(k), p = P();
    const box = h('div', { class: 'craft' }, h('p', null, 'Owned: ' + n + ' / ' + max));
    if (cost == null) box.append(h('p', { class: 'small muted' }, E.def(k).type === 'ace' ? 'Base Aces are unlocked by conquering their kingdom in the Campaign.' : 'This card cannot be crafted.'));
    else if (n >= max) box.append(h('p', { class: 'small muted' }, 'You own the most copies a deck can use.'));
    else {
      box.append(h('button', { class: 'primary big', disabled: p.gold < cost, onclick: () => { if (D.craft(k)) { if (window.Sfx) Sfx.play('pack'); toast('Crafted ' + E.def(k).name); close(); after(); } } }, 'Craft · ' + cost + ' gold'));
      if (p.gold < cost) box.append(h('p', { class: 'small muted' }, 'You have ' + p.gold + ' gold.'));
    }
    return box;
  }

  // ----- decks -----
  function decks() {
    const p = P();
    const list = h('div', { class: 'decklist' });
    p.decks.forEach((d, i) => {
      const errs = E.validateDeck(d.leader, d.cards).concat(ownErrors(d));
      list.append(h('div', { class: 'dl', style: '--cw:40px', onclick: () => editDeck(i) }, cardEl(d.leader, 40), h('span', { class: 'n' }, d.name), h('span', { class: 'q' }, errs.length ? gico('ico-close', 'sm') : gico('ico-check', 'sm'), ' ' + d.cards.length + '/30')));
    });
    screen(topbar('Decks', menu), list,
      h('div', { class: 'row center' }, h('button', { class: 'primary', onclick: () => { const L = D.leaders()[0]; p.decks.push({ name: 'New deck', leader: L, cards: [] }); D.save(); editDeck(p.decks.length - 1); } }, 'New deck'),
        h('button', { onclick: importDeck }, 'Import code')));
  }
  function importDeck() {
    sheet((box, close) => {
      const ta = h('textarea', { class: 'codebox', rows: 4, placeholder: 'Paste a deck code (starts with PLB1.)' });
      box.append(h('h2', null, 'Import a deck'), h('p', null, 'Paste a code a friend shared. Cards you do not own yet are flagged so you can craft or unpack them.'), ta,
        h('div', { class: 'row center' }, h('button', { class: 'primary big', onclick: () => {
          const d = D.parseCode(ta.value);
          if (!d) return toast('That code does not look right');
          const p = P(); if (!D.leaders().includes(d.leader)) toast('You do not own that leader yet; deck saved anyway');
          p.decks.push(d); D.save(); close(); editDeck(p.decks.length - 1);
        } }, 'Import')));
    });
  }
  function editDeck(i, tab, f) {
    const p = P(); const d = p.decks[i];
    tab = tab || 'deck'; f = f || 'mine';
    const errs = E.validateDeck(d.leader, d.cards).concat(ownErrors(d));
    const cnt = {}; d.cards.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; });
    const leaders = D.leaders();
    const locked = Object.keys(P().coll).filter(k => E.def(k).type === 'ace' && P().coll[k] > 0 && !leaders.includes(k));
    const head = h('div', { class: 'panel dark' },
      h('div', { class: 'row' }, h('input', { value: d.name, maxlength: 24, onchange: e => { d.name = e.target.value; D.save(); } }),
        h('span', { class: 'chip ' + (d.cards.length === 30 ? 'gold' : '') }, d.cards.length + ' / 30')),
      h('div', { class: 'row' }, h('span', { class: 'px small' }, 'Leader'), ...leaders.map(L => h('div', { style: 'cursor:pointer;outline:' + (L === d.leader ? '3px solid var(--gold)' : 'none'), onclick: () => { d.leader = L; D.save(); editDeck(i, tab, f); } }, cardEl(L, 38))),
        ...locked.map(L => h('div', { class: 'lockedlead', onclick: () => sheet(box => box.append(h('h2', null, 'Leader locked'), h('div', { class: 'cardrow' }, cardEl(L, 90, { locked: true }), h('p', null, 'You own this Ace, but you need to conquer ' + K[E.def(L).suit].name + ' in the Campaign before it can lead a deck. Beat all 7 stages there to unlock it.')))) }, cardEl(L, 38, { locked: true }), h('img', { class: 'lockico', src: 'assets/gui/ico-close.png', alt: 'Locked' })))),
      locked.length ? h('p', { class: 'small' }, 'Greyed Aces unlock as leaders after you conquer their kingdom in the Campaign.') : null,
      h('p', { class: 'small' }, 'Main suit: ' + K[E.def(d.leader).suit].suit + '. Add one ally suit (up to 10 cards)' + (E.def(d.leader).suit !== 'U' ? ' and up to 5 United cards' : '') + '. Max 3 of each troop, 1 of each hero/Joker version.'),
      errs.length ? h('div', { class: 'errs' }, ...errs.slice(0, 4).map(e => h('div', null, '- ' + e))) : h('div', { class: 'okline' }, h('img', { src: 'assets/gui/ico-check.png', alt: '' }), 'Legal deck'));
    const tabs = h('div', { class: 'tabs' }, h('button', { class: tab === 'deck' ? 'sel' : '', onclick: () => editDeck(i, 'deck', f) }, 'Deck (' + d.cards.length + ')'), h('button', { class: tab === 'add' ? 'sel' : '', onclick: () => editDeck(i, 'add', f) }, 'Add cards'));
    const body = h('div');
    if (tab === 'deck') {
      const keys = Object.keys(cnt).sort((a, b) => E.def(a).cost - E.def(b).cost || a.localeCompare(b));
      const list = h('div', { class: 'decklist' });
      keys.forEach(k => list.append(h('div', { class: 'dl', onclick: () => { d.cards.splice(d.cards.indexOf(k), 1); D.save(); editDeck(i, tab, f); } },
        cardEl(k, 26), h('span', { class: 'n' }, E.def(k).name + (E.def(k).v !== 'b' ? ' (' + E.def(k).vName + ')' : '')), h('span', { class: 'q' }, 'x' + cnt[k] + ' · ', gico('ico-crown', 'cr'), E.def(k).cost), gico('ico-close', 'sm'))));
      if (!keys.length) list.append(h('p', null, 'Empty. Tap "Add cards".'));
      body.append(list);
    } else {
      const ft = h('div', { class: 'tabs' }, ...[['mine', 'Suggested'], ...E.SUITS.map(s => [s, sym(s)]), ['J', 'Jokers']].map(([id, t]) => h('button', { class: (f === id ? 'sel ' : '') + 'suitbtn ' + id, onclick: () => editDeck(i, tab, id) }, t)));
      const L = E.def(d.leader).suit;
      let keys = f === 'mine' ? E.allKeys().filter(k => { const x = E.def(k); return x.type !== 'ace' && (x.suit === L || x.type === 'joker'); }) : filterKeys(f);
      keys = keys.filter(k => D.owned(k));
      const grid = h('div', { class: 'grid', style: '--cw:68px' });
      keys.forEach(k => {
        const left = D.owned(k) - (cnt[k] || 0);
        grid.append(cardEl(k, 68, { count: left + ' left', locked: left <= 0, vtag: E.def(k).v !== 'b' ? E.def(k).vName : null, onclick: () => {
          if (left <= 0) return toast('No more copies owned');
          if (d.cards.length >= 30) return toast('Deck is full (30)');
          d.cards.push(k); D.save(); editDeck(i, tab, f); toast('Added ' + E.def(k).name);
        } }));
      });
      if (!keys.length) grid.append(h('p', null, 'No owned cards here yet. Open packs!'));
      body.append(ft, grid);
    }
    screen(topbar('Edit deck', decks), head, tabs, body,
      h('div', { class: 'row center' },
        h('button', { class: 'primary', onclick: () => sheet((box) => {
          const code = D.deckCode(d);
          const ta = h('textarea', { class: 'codebox', rows: 4, readonly: true }, code);
          box.append(h('h2', null, 'Share deck code'), h('p', null, 'Send this code to a friend. They can paste it in Decks, Import code.'), ta,
            h('div', { class: 'row center' }, h('button', { class: 'primary big', onclick: () => { (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Copied'), () => { ta.select(); toast('Select and copy the code'); }); } }, 'Copy code')));
        }) }, 'Share code'),
        h('button', { onclick: () => { d.cards = D.starterCards(E.def(d.leader).suit).filter(k => D.owned(k)); D.save(); editDeck(i, tab, f); } }, 'Reset to starter'),
        h('button', { class: 'danger', onclick: () => { if (p.decks.length <= 1) return toast('Keep at least one deck'); if (confirm('Delete this deck?')) { p.decks.splice(i, 1); p.active = 0; D.save(); decks(); } } }, 'Delete')));
  }

  // ----- draft -----
  function draft() {
    const p = P(); const dr = p.draft;
    const PICKS = 12;
    if (!dr) {
      screen(topbar('Draft', menu), h('div', { class: 'panel' },
        h('h2', null, 'Draft'), h('p', null, 'Pay ' + D.DRAFT_COST + ' gold. Pick a leader, then pick 1 of 3 cards, 12 times. The rest of the deck fills with your leader\'s troops. Play until 3 wins or 2 losses.'),
        h('p', null, 'Rewards: 0 wins = 20 gold · 1 = 1 pack · 2 = 2 packs + 40 gold · 3 = 3 packs + 100 gold. Drafted cards are for this run only.'),
        h('div', { class: 'row center' }, h('button', { class: 'primary big', disabled: p.gold < D.DRAFT_COST, onclick: () => { D.draftStart(); draft(); } }, 'Start (' + D.DRAFT_COST + 'g)'))));
      return;
    }
    if (dr.stage === 'leader') {
      screen(topbar('Draft: choose a leader', menu), h('div', { class: 'packzone' }, ...dr.aceChoices.map(a => h('div', { style: 'cursor:pointer;text-align:center', onclick: () => { dr.leader = a; dr.stage = 'pick'; D.save(); draft(); } }, cardEl(a, 108), h('div', { class: 'px small', style: 'margin-top:8px' }, K[a[0]].name)))));
      return;
    }
    if (dr.stage === 'pick') {
      if (dr.picks.length >= PICKS) { dr.stage = 'play'; D.save(); draft(); return; }
      const opts = dr.options || D.draftOptions();
      screen(topbar('Draft: pick ' + (dr.picks.length + 1) + ' / ' + PICKS, menu),
        h('p', { style: 'text-align:center' }, 'Tap a card to see it, then take it.'),
        h('div', { class: 'packzone' }, ...opts.map(k => h('div', { style: 'text-align:center' }, cardEl(k, 108, { cls: 'r-' + D.rarity(k), onclick: () => showCard(k) }),
          h('div', null, h('button', { class: 'primary', onclick: () => { dr.picks.push(k); dr.options = null; D.save(); draft(); } }, 'Take'))))),
        h('div', { class: 'row center' }, h('span', { class: 'muted' }, 'Picked: ' + dr.picks.map(k => E.def(k).name).join(', '))));
      return;
    }
    if (dr.stage === 'play') {
      const deck = { leader: dr.leader, cards: D.draftDeck() };
      const done = dr.wins >= 3 || dr.losses >= 2;
      screen(topbar('Draft run', menu), h('div', { class: 'panel' },
        h('h2', null, 'Record: ' + dr.wins + 'W – ' + dr.losses + 'L'),
        h('div', { class: 'row' }, cardEl(dr.leader, 60), h('p', { class: 'grow' }, 'Your 30-card draft deck is ready.')),
        done ? h('div', { class: 'row center' }, h('button', { class: 'primary big', onclick: () => { const r = D.draftReward(); toast('Draft over: +' + r.packs + ' packs, +' + r.gold + ' gold'); menu(); } }, 'Claim rewards'))
          : h('div', { class: 'row center' },
            h('button', { class: 'primary big', onclick: () => {
              const s = E.SUITS[Math.floor(Math.random() * 5)];
              const foe = { leader: s + 'A', deck: D.genDeck(s, { jokers: true, variant: dr.wins >= 2 ? 'o' : 'b' }), ai: 2 + (dr.wins >= 2 ? 1 : 0), name: K[s].name + ' Drafter' };
              battleVsAI(deck, foe, won => { if (won) dr.wins++; else dr.losses++; D.save(); return { lines: ['Record: ' + dr.wins + 'W – ' + dr.losses + 'L'] }; }, () => draft(), true);
            } }, 'Play next match'),
            h('button', { class: 'ghost', onclick: () => sheet((box, close) => { box.append(h('h2', null, 'Draft deck'), h('div', { class: 'grid', style: '--cw:56px' }, ...deck.cards.map(k => cardEl(k, 56)))); box.append(h('button', { onclick: close }, 'Close')); }) }, 'View deck'))));
    }
  }

  // ----- duel -----
  function duel() {
    const body = h('div', { class: 'panel' });
    const status = h('p', { class: 'px small' }, '');
    const chosen = () => P().decks[P().active] && validDecks().find(x => x.i === P().active) ? P().decks[P().active] : (validDecks()[0] || {}).d;
    const draw = () => {
      body.innerHTML = '';
      const d = chosen();
      body.append(h('h2', null, 'Duel a friend'),
        h('p', null, 'One player hosts and shares the 6-letter code. The other joins with it. You connect directly, browser to browser.'),
        h('div', { class: 'row' }, h('span', null, 'Deck: '), d ? h('b', null, d.name) : h('b', null, 'no legal deck'), h('button', { onclick: () => chooseDeck('Duel deck', () => draw()) }, 'Change')),
        h('div', { class: 'row center' },
          h('button', { class: 'primary big', disabled: !d, onclick: () => hostDuel(d) }, 'Host'),
          h('button', { class: 'big', disabled: !d, onclick: () => joinPrompt(d) }, 'Join')),
        status);
    };
    let guest = null; const want = { me: false, them: false };
    function hostDuel(d) {
      const begin = () => {
        want.me = want.them = false;
        const s = E.newGame({ players: [{ leader: d.leader, deck: d.cards, name: P().name }, { leader: guest.deck.leader, deck: guest.deck.cards, name: String(guest.name || 'Guest').slice(0, 16) }] });
        s.ev = [];
        Net.send({ t: 'start', s: E.redact(s, 1) });
        startBattle({ mode: 'host', s, me: 0, onEnd: won => ({ lines: ['+' + D.reward(won, 2) + ' gold'] }), exit: () => { Net.close(); menu(); },
          rematch: () => { want.me = true; Net.send({ t: 'rematch' }); if (want.them) begin(); else rematchWait(); } });
      };
      hostDuel.begin = begin;
      status.textContent = 'Opening a room…';
      Net.host(code => {
        body.innerHTML = '';
        body.append(h('h2', null, 'Room code'),
          h('div', { class: 'phone' }, h('div', { class: 'pcode' }, code), h('div', { class: 'pbody' }, h('div', null, 'Text this code to your friend.'), h('div', { class: 'muted' }, 'Waiting for them to join…'))),
          h('div', { class: 'row center' }, h('button', { onclick: () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('Copied'); } }, 'Copy code'), h('button', { onclick: () => { Net.close(); duel(); } }, 'Cancel')));
      }, msg => {
        if (msg.t === 'hello') {
          const errs = E.validateDeck(msg.deck.leader, msg.deck.cards);
          if (errs.length) { Net.send({ t: 'reject', msg: 'Illegal deck: ' + errs[0] }); return; }
          guest = msg; begin();
        } else if (msg.t === 'rematch') { want.them = true; if (!want.me) toast('Your friend wants a rematch'); if (want.me) begin(); }
        else netMessage(msg);
      }, err => { status.textContent = 'Connection problem: ' + err; }, () => netClosed());
    }
    function joinPrompt(d) {
      sheet((box, close) => {
        const inp = h('input', { maxlength: 6, placeholder: 'CODE', style: 'text-transform:uppercase;font-size:1.6rem;width:8em;text-align:center' });
        box.append(h('h2', null, 'Join a duel'), h('div', { class: 'row center' }, inp),
          h('div', { class: 'row center' }, h('button', { class: 'primary', onclick: () => { const code = inp.value.trim().toUpperCase(); if (code.length < 4) return toast('Enter the code'); close(); joinDuel(code, d); } }, 'Join'), h('button', { onclick: close }, 'Cancel')));
        setTimeout(() => inp.focus(), 50);
      });
    }
    function joinDuel(code, d) {
      status.textContent = 'Connecting to ' + code + '…';
      Net.join(code, () => { status.textContent = 'Connected! Starting…'; Net.send({ t: 'hello', name: P().name, deck: { leader: d.leader, cards: d.cards }, v: 1 }); }, msg => {
        if (msg.t === 'start') startBattle({ mode: 'guest', s: msg.s, me: 1, onEnd: won => ({ lines: ['+' + D.reward(won, 2) + ' gold'] }), exit: () => { Net.close(); menu(); },
          rematch: () => { Net.send({ t: 'rematch' }); rematchWait(); } });
        else if (msg.t === 'rematch') toast('Your friend wants a rematch');
        else if (msg.t === 'reject') { toast(msg.msg); Net.close(); }
        else netMessage(msg);
      }, err => { status.textContent = 'Could not connect: ' + err; }, () => netClosed());
    }
    function rematchWait() {
      screen(topbar('Rematch', () => { Net.close(); menu(); }), h('div', { class: 'panel' }, h('h2', null, 'Rematch requested'),
        h('p', null, 'Waiting for your friend to tap Rematch too…'), h('div', { class: 'row center' }, h('button', { class: 'big', onclick: () => { Net.close(); menu(); } }, 'Leave'))));
    }
    draw();
    screen(topbar('Duel', () => { Net.close(); menu(); }), body);
  }

  // ----- how to play (tap-open sections) -----
  const HAND_EXAMPLES = [
    [1, ['H5', 'S5'], 'Two cards with the same number. Suits do not matter.'],
    [2, ['H5', 'S5', 'D9', 'C9'], 'Two different pairs on your board at once.'],
    [3, ['H7', 'S7', 'D7'], 'Three cards with the same number.'],
    [4, ['H4', 'S5', 'D6', 'C7', 'H8'], 'Five numbers in a row, any suits. After 10 comes Jack, Queen, King.'],
    [5, ['H2', 'H6', 'H9', 'H11', 'H13'], 'Five cards of the same suit. The numbers do not matter.'],
    [6, ['H8', 'S8', 'D8', 'C3', 'H3'], 'Three of a Kind plus a Pair, all at once.'],
    [7, ['H9', 'S9', 'D9', 'C9'], 'Four cards with the same number. Usually needs other suits, a bluff, or the wild Joker.'],
    [8, ['H5', 'H6', 'H7', 'H8', 'H9'], 'A Straight where all five share one suit.'],
    [9, ['H10', 'H11', 'H12', 'H13', 'JF'], '10, Jack, Queen, King and an Ace, all one suit. Aces are leaders, so the wild FALSE Joker plays the Ace.']
  ];
  function minis(keys, cw) { return h('div', { class: 'minis' }, ...keys.map(k => cardEl(k, cw || 48))); }
  function howTo() {
    const back = P() ? menu : title;
    const SECTIONS = [
      ['The goal', 'HA', () => [
        h('p', null, 'Knock the enemy castle down to 0 to win.'),
        h('div', { class: 'row' }, cardEl('HA', 60), h('p', { class: 'grow' }, 'Your Ace is your leader and your castle (30 health). It is never in your deck. Each Ace also has a once-per-game power.')),
        h('p', null, 'A match takes about 10 to 15 minutes.')]],
      ['Starting a match', 'JT', () => [
        h('p', null, 'A coin toss picks who chooses. The winner goes first or second. Going second gives you 1 bonus Coin.'),
        h('p', null, 'Then both players may swap up to 3 cards from their starting hand of 5.')]],
      ['Your turn', 'gui:ico-crown', () => [
        h('ol', null, h('li', null, 'Gain 1 Crown (max 6) and draw a card.'), h('li', null, 'Muck once if you like: discard up to 2 cards, draw that many.'),
          h('li', null, 'Spend Crowns to play cards into your 5 board slots. Coins pay when Crowns run out.'), h('li', null, 'Tap End turn. Your troops attack.')),
        h('p', null, 'Card costs (the crown above each card in your hand):'),
        h('table', { class: 'hands' }, h('tr', null, h('td', null, '2 - 4'), h('td', null, '1 Crown')), h('tr', null, h('td', null, '5 - 7'), h('td', null, '2 Crowns')),
          h('tr', null, h('td', null, '8 - 10'), h('td', null, '3 Crowns')), h('tr', null, h('td', null, 'Jack / Queen / King'), h('td', null, '3 / 4 / 5 Crowns')))]],
      ['Combat', 'gui:ico-sword', () => [
        h('p', null, 'At the end of your turn, each troop attacks the enemy card directly across from it. Both cards hit each other.'),
        h('p', null, 'If the lane across is empty, the troop hits the enemy castle instead.'),
        h('p', null, 'New troops REST on the turn they are played and attack from your next turn.'),
        h('div', { class: 'row' }, h('div', { class: 'stat demo' }, h('span', { class: 'sa' }, h('img', { class: 'pico', src: 'assets/gui/ico-sword.png' }), '3'), h('span', { class: 'sh' }, h('img', { class: 'pico', src: 'assets/gui/pip-H.png' }), '5')),
          h('p', { class: 'grow' }, 'Under each card: attack (sword) and health (heart). A card\'s health equals its number. Lower numbers hit harder for their cost.'))]],
      ['Poker hands', 'H5', () => {
        const out = [
          h('p', null, 'New to poker? A "hand" is a pattern made by your cards. Here, the cards on your 5 board slots make your hand, and each pattern gives your troops a bonus.'),
          h('p', null, 'Every hand on your board counts, so bonuses stack. A Full House also gets the Three of a Kind and Pair bonuses. Pairs and Three of a Kind work with fewer than 5 cards; Straights and Flushes need all 5.')];
        HAND_EXAMPLES.forEach(([r, keys, text]) => out.push(h('div', { class: 'handex' },
          h('div', { class: 'hx-head' }, h('span', { class: 'hn' }, E.HAND_NAMES[r]), h('span', { class: 'hx-bonus' }, E.HAND_TEXT[r])),
          minis(keys), h('p', { class: 'small' }, text))));
        out.push(flushTable());
        return out;
      }],
      ['Truth & Lies', 'JF', () => [
        h('p', null, 'Once per turn you may play any card face-down and declare it as a number card, like "8 of Hearts". It fights as that card and counts as it for poker hands. You pay the declared cost.'),
        h('p', null, 'Your opponent can pay 1 Crown to call it. If it was a lie, the card is destroyed. If it was the truth, it flips face-up and the caller\'s castle takes 3.'),
        h('p', null, 'Tip: a deck holds at most 3 copies of a card. If you can see 3 of them already, a 4th is a lie.'),
        h('div', { class: 'row' }, cardEl('JT', 50), h('p', { class: 'grow' }, 'TRUE Joker: exposes every enemy hidden card. Lies are destroyed and hurt their owner.')),
        h('div', { class: 'row' }, cardEl('JF', 50), h('p', { class: 'grow' }, 'FALSE Joker: wild. Counts as any rank and suit you choose, and can never be called.'))]],
      ['Kingdoms', 'gui:pip-C', () => E.SUITS.map(s => h('div', { class: 'kingrow' }, cardEl(s + 'A', 44),
        h('div', { class: 'grow' }, h('b', null, sym(s), ' ' + K[s].name), h('p', { class: 'small' }, K[s].trait + ': ' + K[s].traitText), h('p', { class: 'small muted' }, 'Ace power, ' + E.def(s + 'A').abilityName + ': ' + E.def(s + 'A').text))))],
      ['Targets & powers', 'D11', () => [
        h('p', null, 'Bribe, Last Rites and Graft let you tap their target after you place them. The valid targets glow.'),
        h('p', null, 'Tap your Duelist (Jack of Hearts) and choose Aim attack to pick who it hits.'),
        h('p', null, 'Tap Power to use your Ace. Rally asks you to tap one of your troops.')]],
      ['Card versions', 'H13:a', () => [
        h('div', { class: 'minis' }, cardEl('H13', 50), cardEl('H13:o', 50), cardEl('H13:c', 50), cardEl('H13:a', 50)),
        h('p', null, 'Heroes, Aces and Jokers come in versions with different rules:'),
        h('ul', null, h('li', null, 'Origin: the ability also fires when it dies.'), h('li', null, 'Classic: cheaper and smaller.'), h('li', null, 'Animated: the ability repeats every turn. The rarest.')),
        h('p', null, 'Number-card Foils are cosmetic only.')]],
      ['Decks & collecting', 'back', () => [
        h('p', null, 'A deck has 30 cards, mostly your leader\'s suit, plus one ally suit (up to 10 cards) and up to 5 United cards. Max 3 copies of a troop, 1 of each hero or Joker version.'),
        h('p', null, 'You can lead with an Ace once you conquer its kingdom in the Campaign.'),
        h('p', null, 'Get cards from packs, daily Quests and the Campaign, or Craft a specific card with gold in the Collection. Share decks with codes from the deck editor.')]]
    ];
    let open = 0;
    const wrap = h('div', { class: 'acc' });
    const draw = () => {
      wrap.innerHTML = '';
      SECTIONS.forEach(([title, icon, body], i) => {
        const head = h('button', { class: 'acc-head' + (i === open ? ' open' : ''), onclick: () => { open = open === i ? -1 : i; draw(); if (open >= 0) setTimeout(() => wrap.children[open].scrollIntoView({ block: 'start', behavior: 'smooth' }), 30); } },
          icon.startsWith('gui:') ? gico(icon.slice(4), 'acc-ico') : cardEl(icon, 24), h('span', { class: 'grow' }, title), gico('ico-right', 'acc-chev'));
        const sec = h('div', { class: 'acc-sec' }, head);
        if (i === open) sec.append(h('div', { class: 'panel rules acc-body' }, ...body()));
        wrap.append(sec);
      });
    };
    draw();
    screen(topbar('How to play', back), wrap);
  }

  // ----- credits / settings -----
  function credits() {
    const p = P();
    screen(topbar('Credits', menu), h('div', { class: 'panel rules' },
      h('h2', null, 'Art'), h('p', null, 'Pixel Plebes animated digital playing cards by Devlyn JD (2018–2024), including the United Falls suit, Bloodless Hearts and the secret Classic deck. Used with credit as the artist requests.'),
      h('h2', null, 'Interface'), h('p', null, 'Pocket GUI by Vreyll: window frames, buttons, icons, cursor and the phone frame.'),
      h('h2', null, 'Game'), h('p', null, 'Plebes: The Poker Trading Card Game. Rules, code and design built for this project.'),
      h('h2', null, 'Settings'),
      h('div', { class: 'row' }, h('span', null, 'Name'), h('input', { value: p.name, maxlength: 16, onchange: e => { p.name = e.target.value || 'Plebe'; D.save(); toast('Saved'); } })),
      h('div', { class: 'row' }, h('button', { class: 'big', onclick: e => { Sfx.set(!Sfx.on); e.target.textContent = 'Sound: ' + (Sfx.on ? 'On' : 'Off'); } }, 'Sound: ' + (Sfx.on ? 'On' : 'Off'))),
      h('div', { class: 'row' }, h('button', { class: 'danger', onclick: () => { if (confirm('Erase all progress? This cannot be undone.')) { D.reset(); title(); } } }, 'Reset progress'))));
  }

  window.UI = { title, menu, cardEl, toast, netMessage, netClosed, _B: () => B, _render: () => B && render(), _startBattle: startBattle };
  document.addEventListener('click', e => { if (e.target.closest('button, .tile, .kcard, .stage') && window.Sfx) Sfx.play('click'); }, true);
  document.addEventListener('DOMContentLoaded', title);
})();

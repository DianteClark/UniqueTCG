/* Plebes TCG — peer-to-peer duels.
   Uses PeerJS (WebRTC) with its free public broker to find the other player by code.
   Add ?local to the URL to use a BroadcastChannel instead (two tabs in the same browser, for testing). */
(function (root) {
  'use strict';
  const PREFIX = 'plebes-tcg-v1-';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code6 = () => Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  const LOCAL = /[?&]local\b/.test(location.search);

  const Net = {
    peer: null, conn: null, ch: null,
    send(m) {
      try {
        if (this.ch) this.ch.postMessage({ from: this.role, m });
        else if (this.conn && this.conn.open) this.conn.send(m);
      } catch (e) { console.warn('send failed', e); }
    },
    close() {
      try { if (this.conn) this.conn.close(); } catch (e) { }
      try { if (this.peer) this.peer.destroy(); } catch (e) { }
      try { if (this.ch) this.ch.close(); } catch (e) { }
      this.peer = this.conn = this.ch = null;
    },
    host(onCode, onMsg, onErr, onClose) {
      this.close(); this.role = 'host';
      const code = code6();
      if (LOCAL) {
        this.ch = new BroadcastChannel(PREFIX + code);
        this.ch.onmessage = e => { if (e.data.from !== 'host') onMsg(e.data.m); };
        onCode(code); return;
      }
      if (!root.Peer) { onErr('network library failed to load'); return; }
      const peer = this.peer = new root.Peer(PREFIX + code, { debug: 0 });
      peer.on('open', () => onCode(code));
      peer.on('connection', c => {
        if (this.conn && this.conn.open) { c.close(); return; }
        this.conn = c;
        c.on('data', onMsg);
        c.on('close', () => onClose && onClose());
      });
      peer.on('error', e => {
        if (e.type === 'unavailable-id') { this.host(onCode, onMsg, onErr, onClose); return; }
        onErr(e.type || String(e));
      });
    },
    join(code, onOpen, onMsg, onErr, onClose) {
      this.close(); this.role = 'guest';
      if (LOCAL) {
        this.ch = new BroadcastChannel(PREFIX + code);
        this.ch.onmessage = e => { if (e.data.from !== 'guest') onMsg(e.data.m); };
        setTimeout(onOpen, 50); return;
      }
      if (!root.Peer) { onErr('network library failed to load'); return; }
      const peer = this.peer = new root.Peer({ debug: 0 });
      peer.on('open', () => {
        const c = this.conn = peer.connect(PREFIX + code, { reliable: true });
        c.on('open', onOpen);
        c.on('data', onMsg);
        c.on('close', () => onClose && onClose());
        c.on('error', e => onErr(e.type || String(e)));
      });
      peer.on('error', e => onErr(e.type === 'peer-unavailable' ? 'no room with that code' : (e.type || String(e))));
    }
  };
  root.Net = Net;
})(this);

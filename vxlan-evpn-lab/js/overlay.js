/* Stage: a full-screen, click-through layer where the characters live.
   Phase 1: Lumen (the wisp) can glide to any pane / device / row, wear a pose, say a line, and leave a
   short-lived trail that never crosses text. Later phases add Fold, darts and glitches on the same layer.
   Nothing here may throw into the lesson code: every public call is safe to make when the stage is off. */
const HERO_NAME = 'Lumen';

const Stage = (() => {
  const POSES = { idle: 'lumen', say: 'lumen', happy: 'lumenHappy', oops: 'lumenOops', ears: 'lumenEars' };
  // anything with readable text: the trail is never drawn over these, and rings never cover them
  const TEXT_SEL = '#term,#explain,#pk-body,#pk-detail,#mission,#actions,#drawer,.quiz,.coach,#toast,.ph h3,#inspector,.ctl,.tabs,.wtabs,.wbar,.legend,#topo text';
  const S = { el: null, lm: null, tilt: null, svg: null, say: null, fx: null, x: -100, y: -100, token: 0, rate: 1,
    sayId: 0, sc: 1, rot: 0, epoch: 0, snd: null, flying: false, trails: 'short', enabled: true, reduce: false, ready: false, visible: false, sayTimer: 0,
    stats: { segments: 0, skipped: 0, flights: 0 } };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('lumen.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('lumen.' + k, v); } catch (e) { /* storage blocked */ } }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NS = 'http://www.w3.org/2000/svg';

  function init() {
    if (S.ready) return;
    try {
      S.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      S.enabled = store.get('on', '1') !== '0';
      S.trails = S.reduce ? 'off' : (store.get('trails', 'short') === 'off' ? 'off' : 'short');
      if (typeof ART_SVG === 'string' && !document.getElementById('lumenBase')) document.body.insertAdjacentHTML('afterbegin', ART_SVG);
      let st = document.getElementById('stage');
      if (!st) { st = document.createElement('div'); st.id = 'stage'; st.setAttribute('aria-hidden', 'true'); document.body.appendChild(st); }
      st.classList.toggle('off', !S.enabled);
      st.innerHTML = '<svg class="fx" id="fx"></svg>' +
        '<div class="lm" id="lumen"><div class="lm-tilt"><div class="lm-bob"><svg class="lm-svg" viewBox="-6 -4 92 112"><use href="#lumen"/></svg></div></div><div class="lm-say"></div></div>';
      S.el = st; S.fx = st.querySelector('#fx'); S.lm = st.querySelector('#lumen'); S.tilt = st.querySelector('.lm-tilt');
      S.say = st.querySelector('.lm-say'); S.svg = st.querySelector('.lm-svg use');
      place(-100, -100);
      addEventListener('resize', () => { if (S.visible && S.home) goHome(); });
      S.ready = true;
    } catch (e) { S.ready = false; console.warn('Stage init failed', e); }
  }

  /* ---------- placement ---------- */
  function place(x, y, tilt) {
    S.x = x; S.y = y;
    if (!S.lm) return;
    S.lm.style.transform = `translate(${Math.round(x - 32)}px, ${Math.round(y - 38)}px)`;
    if (tilt !== undefined) S.rot = tilt;
    if (S.tilt) S.tilt.style.transform = `rotate(${S.rot || 0}deg) scale(${S.sc})`;
  }
  function pose(name) {
    if (!S.ready) return;
    S.svg.setAttribute('href', '#' + (POSES[name] || 'lumen'));
    S.lm.classList.toggle('oops', name === 'oops');
  }
  function show() { if (!S.ready || !S.enabled) return; S.visible = true; S.lm.classList.add('on'); }
  function hide() { if (!S.ready) return; S.visible = false; S.lm.classList.remove('on'); hush(); }

  /* ---------- anchors: where Lumen rests for a given target ----------
     { x, y } | { el|sel, at } | { dev:'leaf1' } | { pane:'topo'|'cli'|'explain'|'ws' } | { row:<packet no> } */
  const PANES = { topo: '#pane-topo', cli: '#pane-cli', explain: '#pane-explain', ws: '#pane-ws' };
  function rectOf(t) {
    let el = t.el;
    if (!el && t.sel) el = document.querySelector(t.sel);
    if (!el && t.dev) el = document.querySelector(`#topo .node[data-id="${t.dev}"]`) || document.querySelector(`#topo .ghost[data-slot="${t.dev}"]`);
    if (!el && t.pane) el = document.querySelector(PANES[t.pane]);
    if (!el && t.row !== undefined) el = document.querySelector(`#pk-body tr[data-no="${t.row}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width || r.height) ? r : null;
  }
  function anchor(t) {
    if (t && t.x !== undefined) return { x: t.x, y: t.y };
    const r = t && rectOf(t);
    if (!r) return null;
    const dx = t.dx || 0, dy = t.dy || 0;
    let p;
    if (t.dev) p = { x: r.left + r.width / 2, y: r.top - 14 };               // floats just above the device, over empty tier space
    else if (t.pane) {                                                          // the blank stretch of the pane's header bar, not its content
      const f = { topo: [1, -70], cli: [1, -34], explain: [.45, 0], ws: [.43, 0] }[t.pane] || [1, -34];
      p = { x: f[0] === 1 ? r.right + f[1] : r.left + r.width * f[0], y: r.top + 22 };
    }
    else if (t.row !== undefined) p = { x: r.right - 26, y: r.top + r.height / 2 - 6 };   // right end of the row
    else {
      const at = t.at || 'center';
      p = { x: at.includes('l') ? r.left : at.includes('r') ? r.right : r.left + r.width / 2, y: at.includes('t') ? r.top : at.includes('b') ? r.bottom : r.top + r.height / 2 };
    }
    return { x: clamp(p.x + dx, 40, innerWidth - 40), y: clamp(p.y + dy, 50, innerHeight - 50) };
  }
  function ringOn(t) {
    if (!S.ready) return;
    const r = rectOf(t); if (!r) return;
    const d = document.createElement('div'); d.className = 'ring';
    d.style.cssText = `left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
    S.el.appendChild(d); setTimeout(() => d.remove(), 1200);
  }

  /* ---------- the trail: short-lived, thin, and only where there is no text ---------- */
  function overText(x, y) {
    const e = document.elementFromPoint(clamp(x, 1, innerWidth - 2), clamp(y, 1, innerHeight - 2));
    return !!(e && e.closest && e.closest(TEXT_SEL));
  }
  function seg(a, b) {
    if (S.trails === 'off') return;
    if (overText(a.x, a.y) || overText(b.x, b.y)) { S.stats.skipped++; return; }
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); l.setAttribute('class', 'seg');
    S.fx.appendChild(l); S.stats.segments++;
    setTimeout(() => l.remove(), 950);
  }

  /* ---------- flight ---------- */
  async function fly(target, o) {
    o = o || {};
    if (!S.ready || !S.enabled) return;
    const to = anchor(target); if (!to) return;
    const tk = ++S.token; S.stats.flights++; S.flying = true;
    S.home = target; show(); S.sc = (target.row !== undefined) ? 0.55 : 1;
    const from = { x: S.x, y: S.y };
    if (S.reduce || from.x < 0) { place(to.x, to.y, 0); S.flying = false; return; }        // reduced motion / first appearance: no travelling
    const dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
    const ms = (o.ms || clamp(380 + dist * 0.75, 380, 1500)) / S.rate;
    // control point: a gentle arc, bowed upward
    const c = { x: (from.x + to.x) / 2 - dy * 0.18, y: (from.y + to.y) / 2 + dx * 0.18 - Math.min(80, dist * 0.2) };
    const t0 = performance.now(); let prev = from;
    await new Promise(res => {
      const step = () => {
        if (tk !== S.token) { return res(); }
        const k = clamp((performance.now() - t0) / ms, 0, 1), e = ease(k), u = 1 - e;
        const p = { x: u * u * from.x + 2 * u * e * c.x + e * e * to.x, y: u * u * from.y + 2 * u * e * c.y + e * e * to.y };
        const vx = p.x - prev.x;
        place(p.x, p.y, clamp(vx * 1.6, -10, 10));
        if (Math.hypot(p.x - prev.x, p.y - prev.y) > 6) { seg(prev, p); prev = p; }
        if (k >= 1) { place(to.x, to.y, 0); return res(); }
        setTimeout(step, 16);
      };
      step();
    });
    if (tk === S.token) S.flying = false;
  }
  function goHome() { const p = S.home && anchor(S.home); if (p) place(p.x, p.y, 0); }
  setInterval(() => {                                                          // cheap: only moves when the target actually moved
    if (!S.ready || !S.visible || S.flying || !S.home) return;
    const p = anchor(S.home); if (p && Math.hypot(p.x - S.x, p.y - S.y) > 3) { place(p.x, p.y, 0); fitBubble(); }
  }, 400);

  /* ---------- speech ---------- */
  function bubbleSide() {
    const above = overText(S.x, S.y - 96), below = overText(S.x, S.y + 96);
    if (S.y < 120) return 'below';
    if (above && !below && S.y < innerHeight - 140) return 'below';
    return 'above';
  }
  function fitBubble() {
    const b = S.say; if (!b || !b.classList.contains('on')) return;
    b.style.transform = 'translateX(-50%)'; b.style.setProperty('--ax', '50%');
    const r = b.getBoundingClientRect(), pad = 10;
    let shift = 0;
    if (r.left < pad) shift = pad - r.left; else if (r.right > innerWidth - pad) shift = innerWidth - pad - r.right;
    if (shift) { b.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`; b.style.setProperty('--ax', `calc(50% - ${Math.round(shift)}px)`); }
  }
  function hush() { clearTimeout(S.sayTimer); if (S.say) S.say.classList.remove('on'); }
  async function say(html, ms) {
    if (!S.ready || !S.visible) return;
    const id = ++S.sayId;
    S.say.innerHTML = html;
    S.say.classList.toggle('below', bubbleSide() === 'below');
    S.say.classList.add('on'); fitBubble();
    clearTimeout(S.sayTimer);
    await new Promise(res => { S.sayTimer = setTimeout(res, (ms || 2600) / S.rate); });
    if (id === S.sayId) S.say.classList.remove('on');
  }

  /* ---------- actors: Fold, paper darts, glitches, sparks ---------- */
  S.actors = new Set(); S.glitches = {}; S.lastSpark = 0;
  const svgUse = (id, w, h) => `<svg width="${w}" height="${h}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const snd = k => { try { if (S.snd) S.snd(k); } catch (e) { /* sound is optional */ } };
  function mkActor(html, cls) {
    const d = document.createElement('div'); d.className = 'act ' + (cls || ''); d.innerHTML = html;
    S.el.appendChild(d); S.actors.add(d); return d;
  }
  function drop(d) { if (window.__stageFreeze) return; S.actors.delete(d); d.remove(); }   // __stageFreeze: test hook for screenshots
  function at(d, x, y, flip) { d.style.transform = `translate(${x}px,${y}px)` + (flip ? ' scaleX(-1)' : ''); }
  function devPt(id) { const r = rectOf({ dev: id }); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }
  function devByIp(ip) {
    try { const d = Object.keys(DEV).find(k => DEV[k].lo1 === ip || DEV[k].lo0 === ip); return d || null; } catch (e) { return null; }
  }
  function poof(x, y) {
    const d = document.createElement('div'); d.className = 'poof'; d.style.cssText = `left:${x}px;top:${y}px`;
    S.el.appendChild(d); setTimeout(() => d.remove(), 700);
  }
  /* move an actor from a to b; resolves true when it arrived, false if the stage was cancelled */
  function glide(d, a, b, ms, o) {
    o = o || {}; const tk = S.epoch;
    return new Promise(res => {
      const t0 = performance.now(), dx = b.x - a.x, face = dx < 0 && o.flip;
      const step = () => {
        if (tk !== S.epoch || !d.isConnected) return res(false);
        const k = clamp((performance.now() - t0) / (ms / S.rate), 0, 1), e = o.linear ? k : ease(k);
        at(d, a.x + dx * e, a.y + (b.y - a.y) * e - (o.hop ? Math.sin(Math.PI * k) * o.hop : 0), face);
        if (k >= 1) return res(true);
        setTimeout(step, 16);
      };
      step();
    });
  }
  const TIP = { BGP: '#ff6a2b', OSPF: '#2e9b5e', PIMv2: '#7a5cff', LACP: '#7b8499', TCP: '#7b8499' };

  /* One captured packet makes one journey. Data-plane packets (ARP/ICMP/VXLAN) are FOLD: a paper note that folds into a sealed box
     for the VXLAN leg (spines only ever see the box). Control-plane packets are paper DARTS. Both end on their Wireshark row. */
  async function trip(p, o) {
    if (!S.ready || !S.enabled || !p || !p.link) return;
    if (S.actors.size > 14) return;
    const tk = S.epoch;
    const a = p.link[0], b = p.link[1];
    const ids = [a, b];
    if (p.proto === 'VXLAN') { const d = devByIp(p.dst); if (d && d !== a && d !== b) ids.push(d); }
    const pts = ids.map(devPt); if (pts.some(x => !x)) return;
    const row = o && o.row;
    const ttl = (/ttl=(\d+)/.exec(p.info || '') || [])[1];
    const data = p.proto === 'VXLAN' || p.proto === 'ICMP' || p.proto === 'ARP';
    let actor;
    if (data) actor = mkActor(`<span class="art">${svgUse(p.proto === 'VXLAN' ? 'foldBox' : 'foldNote', p.proto === 'VXLAN' ? 50 : 38, p.proto === 'VXLAN' ? 44 : 43)}</span>` + (ttl ? `<i class="ttl">${ttl}</i>` : ''), 'fold');
    else {
      const torn = p.tag === 'withdraw', col = TIP[p.proto] || '#7b8499';
      actor = mkActor(`<span class="art" style="color:${col}">${svgUse(torn ? 'dartTorn' : 'dart', 40, 25)}</span>`, 'dart');
    }
    const art = actor.querySelector('.art');
    at(actor, pts[0].x, pts[0].y);
    if (data && p.proto === 'VXLAN') { poof(pts[0].x, pts[0].y); snd('fold'); }
    for (let i = 0; i < pts.length - 1; i++) {
      const ok = await glide(actor, pts[i], pts[i + 1], clamp(Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) * 2.2, 500, 1100), { hop: 10, flip: !data });
      if (!ok) return drop(actor);
    }
    const last = pts[pts.length - 1];
    if (data && p.proto === 'VXLAN') {                                    // egress VTEP: the box opens
      poof(last.x, last.y); snd('unfold');
      if (art) art.innerHTML = svgUse('foldNote', 38, 43);
    }
    // then up to its row in the Wireshark pane (rows can be re-rendered; look it up now)
    const to = row !== undefined ? anchor({ row }) : null;
    if (to && tk === S.epoch) {
      const ok = await glide(actor, last, to, 700, { hop: 70, flip: !data });
      if (ok) ringOn({ row });
    }
    actor.classList.add('gone'); setTimeout(() => drop(actor), 350);
  }

  /* sparks: a small orange star flies from Lumen to the XP counter */
  function spark() {
    if (!S.ready || !S.enabled || !S.visible) return;
    const now = performance.now(); if (now - S.lastSpark < 320) return; S.lastSpark = now;
    const to = document.getElementById('xp-n'); if (!to) return;
    const r = to.getBoundingClientRect(), d = mkActor(svgUse('sparkStar', 22, 22), 'spark');
    d.style.transform = `translate(${S.x}px,${S.y}px)`;
    const mid = { x: (S.x + r.left + r.width / 2) / 2, y: Math.min(S.y, r.top) - 70 };
    const keys = [{ transform: `translate(${S.x}px,${S.y}px) scale(.6)` }, { transform: `translate(${mid.x}px,${mid.y}px) scale(1.2)`, offset: .5 }, { transform: `translate(${r.left + r.width / 2}px,${r.top + r.height / 2}px) scale(.5)`, opacity: .2 }];
    const an = d.animate(keys, { duration: (S.reduce ? 1 : 900) / S.rate, easing: 'ease-in', fill: 'forwards' });
    an.onfinish = () => { drop(d); snd('spark'); };
    setTimeout(() => { if (d.isConnected) drop(d); }, 1600 / S.rate);   // fallback if the animation never reports back
  }

  /* glitches: the faults of Chapter 11, sitting where the fault really is */
  const noiseArt = (id, w) => `<svg width="${w}" height="${w}" viewBox="0 0 100 100"><g class="jit j2" style="mix-blend-mode:multiply"><rect x="-4" y="2" width="100" height="100" rx="14" fill="none" stroke="#19a7a0" stroke-width="3"/></g><g class="jit"><rect x="4" y="-2" width="100" height="100" rx="14" fill="none" stroke="#ff6a2b" stroke-width="3"/></g><clipPath id="${id}"><rect width="100" height="100" rx="14"/></clipPath><g clip-path="url(#${id})"><rect width="100" height="100" fill="#ffe3d3"/><rect width="100" height="100" filter="url(#noise)"/></g><rect width="100" height="100" rx="14" fill="none" stroke="#1b2a4a" stroke-width="3"/><rect x="18" y="34" width="22" height="8" rx="2" fill="#1b2a4a"/><rect x="60" y="34" width="22" height="8" rx="2" fill="#1b2a4a"/><path d="M30 68 H70" stroke="#1b2a4a" stroke-width="4" stroke-linecap="round"/><path d="M38 62 L38 74 M46 62 L46 74 M54 62 L54 74 M62 62 L62 74" stroke="#1b2a4a" stroke-width="2.4"/></svg>`;
  const voidArt = w => `<svg width="${w}" height="${w}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#7a5cff" stroke-width="1.6" stroke-dasharray="3 6" class="spinr"/><circle cx="50" cy="50" r="38" fill="none" stroke="#1b2a4a" stroke-width="2" stroke-dasharray="10 6" class="spin"/><circle cx="50" cy="50" r="26" fill="#101a30" stroke="#1b2a4a" stroke-width="3"/><circle cx="50" cy="50" r="14" fill="#000"/><circle class="suck" style="--x:-40px;--y:-26px" cx="50" cy="50" r="3" fill="#ff6a2b"/><circle class="suck" style="--x:38px;--y:-30px;animation-delay:.6s" cx="50" cy="50" r="3" fill="#ff6a2b"/><circle class="suck" style="--x:-34px;--y:34px;animation-delay:1.2s" cx="50" cy="50" r="3" fill="#ff6a2b"/></svg>`;
  const overArt = w => `<svg width="${w}" height="${w * .75}" viewBox="0 0 120 90"><g class="wob"><path d="M10 60 C0 30, 30 8, 60 14 C92 6, 122 30, 108 62 C112 80, 70 86, 60 82 C40 88, 8 82, 10 60 Z" fill="url(#hatch)" stroke="#1b2a4a" stroke-width="3" stroke-linejoin="round"/><circle cx="44" cy="42" r="6" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2.4"/><circle cx="78" cy="42" r="6" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2.4"/><circle cx="46" cy="43" r="2.6" fill="#1b2a4a"/><circle cx="76" cy="43" r="2.6" fill="#1b2a4a"/><path d="M36 32 L52 38 M84 32 L68 38" stroke="#1b2a4a" stroke-width="3" stroke-linecap="round"/><path d="M44 64 Q60 56 76 64" stroke="#1b2a4a" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>`;
  function gPos(t) {
    if (t.link) { const a = devPt(t.link[0]), b = devPt(t.link[1]); return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null; }
    const r = rectOf({ dev: t.dev }); return r ? { x: r.right - 4, y: r.top - 6 } : null;
  }
  function spawnGlitch(id, kind, target) {
    if (!S.ready || !S.enabled || S.glitches[id]) return;
    const p = gPos(target); if (!p) return;
    const w = kind === 'overflow' ? 70 : 54;
    const html = kind === 'void' ? voidArt(w) : kind === 'overflow' ? overArt(w) : noiseArt('gl-' + id, w);
    const d = mkActor(html, 'glitch'); at(d, p.x, p.y); d.classList.add('in');
    S.glitches[id] = { el: d, target, kind };
  }
  async function clearGlitch(id) {
    const g = S.glitches[id]; if (!g || !S.ready) return;
    const tk = S.epoch, p = gPos(g.target) || { x: S.x, y: S.y };
    pose('say'); await fly({ x: p.x - 70, y: p.y - 30 }, { ms: 700 }); if (tk !== S.epoch) return;
    const ln = document.createElementNS(NS, 'line');                        // a short beam, over the topology only
    ln.setAttribute('x1', S.x); ln.setAttribute('y1', S.y - 6); ln.setAttribute('x2', p.x); ln.setAttribute('y2', p.y);
    ln.setAttribute('class', 'beam'); S.fx.appendChild(ln); setTimeout(() => ln.remove(), 700);
    snd('zap'); g.el.classList.add('snap');
    await sleep(380 / S.rate); if (tk !== S.epoch) return;
    poof(p.x, p.y); drop(g.el); delete S.glitches[id]; pose('happy'); spark();
  }
  setInterval(() => {                                                          // keep glitches on their device/link when the layout moves
    if (!S.ready) return;
    Object.keys(S.glitches).forEach(k => { const g = S.glitches[k], p = gPos(g.target); if (p && !g.el.classList.contains('snap')) at(g.el, p.x, p.y); });
  }, 500);


  /* cameos: a chapter helper appears next to the thing it is about, says its hint the first time, and leaves after a few seconds.
     At most two helpers at once (plus Lumen), and never on top of text: they hover over the topology's empty tier space. */
  S.seen = {};
  /* helpers stand in the empty margins at the left/right of the topology pane, level with the device they are about,
     so they never cover a device label or a cable label. If that side is taken, the other side is used. */
  function cPos(t, taken) {
    const pane = document.querySelector('#pane-topo'); if (!pane) return null;
    const pr = pane.getBoundingClientRect(); let ay, ax;
    if (t && t.link) { const a = devPt(t.link[0]), b = devPt(t.link[1]); if (!a || !b) return null; ay = (a.y + b.y) / 2; ax = (a.x + b.x) / 2; }
    else { const r = t && t.dev && rectOf({ dev: t.dev }); if (!r) return null; ay = r.top + r.height / 2; ax = r.left + r.width / 2; }
    let side = ax < (pr.left + pr.right) / 2 ? 'l' : 'r';
    if (taken && taken.includes(side)) side = side === 'l' ? 'r' : 'l';
    return { x: side === 'l' ? pr.left + 72 : pr.right - 72, y: clamp(ay + 14, pr.top + 90, pr.bottom - 50), side };
  }
  /* A helper stays for at least MIN ms of real time (the speed slider does not shorten it), and leaves at the end of the step
     once that minimum has passed. First appearance: longer, with its hint bubble up the whole time. */
  S.cams = [];
  function cameo(name, target) {
    if (!S.ready || !S.enabled || typeof CAST_ART === 'undefined' || !CAST_ART[name]) return;
    const key = name + JSON.stringify(target || {});
    const same = S.cams.find(c => c.key === key && !c.gone);          // the same helper again: keep the one on screen, restart its clock
    if (same) { same.born = performance.now(); return; }
    let live = [...S.actors].filter(a => a.classList.contains('cameo'));
    if (live.length >= 2) { const o = S.cams.find(c => c.d === live[0]); if (o) o.leave(true); live = live.slice(1); }
    const p = cPos(target, live.map(a => a.dataset.side)); if (!p) return;
    const art = CAST_ART[name], first = !S.seen[name]; S.seen[name] = 1;
    const d = mkActor(`<i class="cam-ring"></i><i class="cam-ring r2"></i><i class="cam-ring r3"></i><div class="cam-art"><svg viewBox="0 0 100 100" width="110" height="110">${art.svg}</svg></div><div class="cam-name">${art.title}</div>` + (first ? `<div class="cam-hint">${art.hint}</div>` : ''), 'cameo');
    d.dataset.side = p.side; at(d, p.x, p.y); d.classList.add('in');
    const hint = d.querySelector('.cam-hint');                              // keep the hint bubble inside the screen
    if (hint) { const r = hint.getBoundingClientRect(); let sh = 0; if (r.left < 8) sh = 8 - r.left; else if (r.right > innerWidth - 8) sh = innerWidth - 8 - r.right; if (sh) hint.style.transform = `translateX(calc(-50% + ${Math.round(sh)}px))`; }
    poof(p.x, p.y + 30); snd('fold');
    const rec = { d, name, key, born: performance.now(), min: first ? 11000 : 9000, gone: false };
    rec.leave = now => {
      if (rec.gone || window.__stageFreeze) return; rec.gone = true;
      S.cams = S.cams.filter(c => c !== rec); d.classList.remove('in'); setTimeout(() => drop(d), now ? 200 : 500);
    };
    S.cams.push(rec);
    setTimeout(() => rec.leave(), 45000);                                    // safety: never stay forever
  }
  /* called at the end of every step: helpers whose minimum time is over leave now, the others when it is */
  function endCameos() {
    S.cams.slice().forEach(rec => { const left = rec.born + rec.min - performance.now(); if (left <= 0) rec.leave(); else setTimeout(() => rec.leave(), left); });
  }

  function cancelActors() { S.actors.forEach(d => d.remove()); S.actors.clear(); S.glitches = {}; S.cams = []; }

  /* ---------- settings ---------- */
  function setEnabled(on) { S.enabled = !!on; store.set('on', on ? '1' : '0'); if (S.el) S.el.classList.toggle('off', !on); if (!on) hide(); }
  function setTrails(mode) { S.trails = (S.reduce || mode === 'off') ? 'off' : 'short'; store.set('trails', mode === 'off' ? 'off' : 'short'); }
  function cancelAll() { S.token++; S.epoch++; S.flying = false; hush(); if (S.fx) S.fx.innerHTML = ''; cancelActors(); }

  /* ---------- the demo: console -> device -> Wireshark -> explanation ---------- */
  const STOPS = [
    { t: { pane: 'cli' }, pose: 'idle', say: 'I’m at the console. This is where you type.' },
    { t: { dev: 'leaf1' }, pose: 'idle', say: 'Leaf-1 lights up when the command lands.', ring: { dev: 'leaf1' } },
    { t: { pane: 'ws' }, pose: 'ears', say: 'Listening to the wire…', ring: { sel: '#pk-list' } },
    { t: { pane: 'explain' }, pose: 'say', say: '…and the one-liner appears here.', ring: { sel: '#explain' } }
  ];
  async function stop(i) {
    const s = STOPS[i % STOPS.length];
    await fly(s.t); pose(s.pose); if (s.ring) ringOn(s.ring);
    await say(s.say, 2400);
  }
  async function demo() {
    init(); if (!S.ready) return;
    const css = document.createElement('style');
    css.textContent = '#coach-wrap{display:none!important}';          // the demo page hides the welcome modal
    document.head.appendChild(css);
    const q = new URLSearchParams(location.search), only = q.get('stop');
    await sleep(900);
    if (only !== null) {                                                // freeze on one stop (used for screenshots)
      const s = STOPS[+only % STOPS.length]; const p = anchor(s.t); show(); if (p) place(p.x, p.y, 0); pose(s.pose); if (s.ring) ringOn(s.ring);
      S.home = s.t; S.say.innerHTML = s.say; S.say.classList.toggle('below', bubbleSide() === 'below'); S.say.classList.add('on'); fitBubble(); return;
    }
    for (let n = 0; ; n++) { await stop(n); await sleep(250); if (n > 400) break; }
  }

  return { init, show, hide, fly, pose, say, ringOn, anchor, cancelAll, setEnabled, setTrails, demo, stats: S.stats,
    trip, spark, spawnGlitch, clearGlitch, cameo, endCameos, set snd(f) { S.snd = f; }, get visible() { return S.visible; },
    get enabled() { return S.enabled; }, get trails() { return S.trails; }, set rate(v) { S.rate = v || 1; } };
})();

document.addEventListener('DOMContentLoaded', () => {
  try { Stage.init(); if (/[?&]demo=stage\b/.test(location.search)) Stage.demo(); } catch (e) { console.warn(e); }
});

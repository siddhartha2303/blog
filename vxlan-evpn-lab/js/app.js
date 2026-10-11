/* VXLAN EVPN guided lab — engine, topology canvas, CLI, explain & Wireshark panes. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const CANCEL = { cancel: true };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nameOf = id => DEV[id].name;

  const S = {
    chapter: 0, done: 0, placed: {}, links: {}, buf: {}, mode: {}, cur: null,
    speed: 1, autoPause: true, manual: false, paused: false, skip: false,
    waiter: null, coachRes: null, wireFrom: null, wireOn: false, buildRes: null,
    capture: [], rtSeen: {}, sel: null, t: 0, pktNo: 0, filter: '', pulses: [], pendingEv: null, badges: {}, newCount: 0,
    xp: 0, cleared: -1, streak: 0, bestStreak: 0, mistakes: 0, predRight: 0, predWrong: 0, predRun: 0, inspected: 0, ach: {}, stars: {}, bums: {},
    target: null, missionRes: null, drawerRes: null, quizRes: null, actionRes: null, actions: null, guided: true, mute: false, mis: null, inspectedEv: new Set()
  };
  let runToken = 0;
  /* the characters are decoration: nothing here may ever break a lesson */
  const LM = fn => { try { const r = fn(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } };

  /* ------------------------------------------------------------------ game layer */
  /* Levels are earned by clearing chapters (index = chapter number; 0 = the build). */
  const LEVELS = [
    ['🔌', 'Link Up', 'Every device is cabled'],
    ['🤝', 'Adjacent', 'Your OSPF neighbors are FULL'],
    ['🚪', 'VTEP Ready', 'VLANs map to VNIs on the NVE'],
    ['🔗', 'Peering', 'BGP EVPN sessions are Established'],
    ['🛡️', 'Dual-Homed', 'Host-A is on an Ethernet Segment'],
    ['👂', 'MAC Learned', 'Hosts are learned through BGP'],
    ['🛣️', 'Routed', 'The anycast gateway and L3VNI work'],
    ['🌍', 'Reaching Out', 'The border leaf peers with the WAN'],
    ['🚇', 'Tunnel Up', 'A packet crosses the fabric end to end'],
    ['⚖️', 'Resilient', 'The fabric survives a leaf failure'],
    ['🏃', 'Mobile', 'Hosts move and ARP stays local'],
    ['🧵', 'Fabric Master', 'You can find and fix faults']
  ];
  function levelNow() { return S.cleared; }
  let audio = null;
  function beep(kind) {
    if (S.mute) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const seq = { ok: [[660, .08], [880, .14]], bad: [[220, .14], [165, .2]], ach: [[523, .1], [659, .1], [784, .1], [1047, .24]], click: [[520, .05]], fold: [[523, .06], [784, .09]], unfold: [[784, .06], [523, .09]], zap: [[880, .05], [1320, .05], [1760, .1]], spark: [[1568, .05]], level: [[392, .1], [523, .1], [659, .1], [784, .1], [1047, .32]] }[kind] || [];
      let t = audio.currentTime;
      seq.forEach(([f, d]) => {
        const o = audio.createOscillator(), g = audio.createGain(); const sq = ['fold', 'unfold', 'zap', 'spark'].includes(kind); o.type = kind === 'bad' ? 'sawtooth' : sq ? 'square' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(sq ? .04 : .1, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + d + .02); t += d * .9;
      });
    } catch (e) { /* no audio */ }
  }
  LM(() => { Stage.snd = beep; });
  function renderHUD() {
    const lv = levelNow(), L = LEVELS[Math.max(lv, 0)];
    $('#hud-rank').textContent = lv < 0 ? '🔌 Level 0 · not yet' : `${L[0]} Level ${lv} · ${L[1]}`;
    $('#xp-fill').style.width = Math.round(100 * Math.max(lv, 0) / (LEVELS.length - 1)) + '%';
    $('#xp-n').textContent = S.xp + ' XP'; $('#hud-streak').textContent = S.streak; $('#hud-ach').textContent = Object.keys(S.ach).length;
    $('#hud-streak-w').classList.toggle('hot', S.streak >= 3);
  }
  function popXP(t) { const e = document.createElement('div'); e.className = 'xp-pop'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 1700); }
  function confetti(n) {
    const cols = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    for (let i = 0; i < (n || 40); i++) {
      const e = document.createElement('i'); e.className = 'cf'; e.style.left = (10 + Math.random() * 80) + 'vw'; e.style.background = cols[i % cols.length];
      e.style.animationDelay = (Math.random() * .5) + 's'; e.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px'); document.body.appendChild(e); setTimeout(() => e.remove(), 2900);
    }
  }
  function levelCleared(n) {
    const L = LEVELS[n], b = $('#banner'); S.cleared = Math.max(S.cleared, n); renderHUD();
    b.innerHTML = `<div class="b-ico">${L[0]}</div><div><b>Level ${n} cleared</b><span>${L[1]}</span><em>${L[2]}</em></div>`;
    LM(() => { Stage.pose('happy'); setTimeout(() => { try { Stage.pose('idle'); } catch (e) { /* */ } }, 2600); });
    b.className = 'on'; beep('level'); confetti(30); setTimeout(() => { b.className = ''; }, 4200);
  }
  function addXP(n, why) {
    if (!n) return; S.xp += n; renderHUD(); popXP('+' + n + ' XP' + (why ? ' · ' + why : '')); LM(() => Stage.spark());
  }
  function award(id) {
    if (S.ach[id]) return; const a = ACHIEVEMENTS[id]; if (!a) return; S.ach[id] = 1; renderHUD(); beep('ach');
    const el = document.createElement('div'); el.className = 'ach'; el.innerHTML = `<div class="a-ico">${a[0]}</div><div><b>Achievement unlocked</b><span>${a[1]} — ${a[2]}</span></div>`;
    $('#ach-stack').appendChild(el); setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800); addXP(20, a[1]);
  }
  function good(why, pts) { S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); addXP(pts + (S.streak >= 3 ? 5 : 0), why); beep('ok'); renderHUD(); }
  function bad(cable) { S.streak = 0; if (cable) S.mistakes++; beep('bad'); renderHUD(); }
  const starsHTML = n => '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span>';

  /* ------------------------------------------------------------------ helpers */
  const rafSleep = ms => new Promise(r => setTimeout(r, ms));
  function toast(msg, kind) {
    const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (kind || '');
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.className = ''), 4200);
  }
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ------------------------------------------------------------------ topology */
  const svg = $('#topo');
  const NW = 156, NH = 60;

  function badgeLines(id) { return (S.badges[id] || []).slice(-2); }
  function renderTopo() {
    svg.innerHTML = '';
    const gGhost = svgEl('g', {}, svg), gLinks = svgEl('g', {}, svg), gNodes = svgEl('g', {}, svg), gPulse = svgEl('g', { id: 'pulses' }, svg);
    // tier labels
    [['SPINE TIER', 22], ['LEAF TIER', 182], ['ENDPOINTS', 332]].forEach(([t, y]) => svgEl('text', { x: 8, y, class: 'tier' }, svg).textContent = t);
    // ghosts
    Object.keys(SLOTS).forEach(id => {
      if (S.placed[id]) return;
      const s = SLOTS[id], c = KIND_COLOR[s.kind];
      const g = svgEl('g', { class: 'ghost', 'data-slot': id, 'data-kind': s.kind }, gGhost);
      svgEl('rect', { x: s.x - NW / 2, y: s.y - NH / 2, width: NW, height: NH, rx: 10, fill: 'none', stroke: c.stroke, 'stroke-dasharray': '5 4' }, g);
      const tx = svgEl('text', { x: s.x, y: s.y + 4, 'text-anchor': 'middle', class: 'ghost-t', fill: c.stroke }, g);
      tx.textContent = (S.chapter === 0 ? 'drop ' : '') + s.kind.replace('border', 'border leaf');
    });
    // links
    Object.keys(S.links).forEach(k => {
      const l = S.links[k], a = SLOTS[l.a], b = SLOTS[l.b];
      const g = svgEl('g', { class: 'cable', 'data-k': k }, gLinks);
      svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'cab' }, g);
      [[l.a, l.pa, 0.3], [l.b, l.pb, 0.7]].forEach(([, p, f]) => {
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        svgEl('rect', { x: x - 21, y: y - 8, width: 42, height: 15, rx: 4, class: 'plab-bg' }, g);
        svgEl('text', { x, y: y + 3.5, 'text-anchor': 'middle', class: 'plab' }, g).textContent = p;
      });
    });
    // nodes
    Object.keys(S.placed).forEach(id => {
      const d = DEV[id], s = SLOTS[id], c = KIND_COLOR[d.kind];
      const g = svgEl('g', { class: 'node' + (S.wireFrom === id ? ' picked' : '') + (S.hint && S.hint.includes(id) ? ' hint' : '') + (S.cur === id ? ' sel' : '') + (S.target === id ? ' target' : ''), 'data-id': id }, gNodes);
      svgEl('rect', { x: s.x - NW / 2, y: s.y - NH / 2, width: NW, height: NH, rx: 10, fill: c.fill, stroke: c.stroke, 'stroke-width': 1.6 }, g);
      const bl = badgeLines(id);
      svgEl('text', { x: s.x, y: s.y - (bl.length ? 11 : 3), 'text-anchor': 'middle', class: 'n-name' }, g).textContent = d.name;
      svgEl('text', { x: s.x, y: s.y + (bl.length ? 3 : 13), 'text-anchor': 'middle', class: 'n-role' }, g).textContent = d.role;
      if (bl.length) svgEl('text', { x: s.x, y: s.y + 19, 'text-anchor': 'middle', class: 'bdg-t' }, g).textContent = bl.join(' · ');
      if (S.target === id) {
        const tg = svgEl('g', { class: 'tgt-tag' }, g);
        svgEl('rect', { x: s.x - 40, y: s.y - NH / 2 - 26, width: 80, height: 20, rx: 10 }, tg);
        svgEl('text', { x: s.x, y: s.y - NH / 2 - 12, 'text-anchor': 'middle' }, tg).textContent = '👆 click me';
      }
      g.addEventListener('click', () => onNodeClick(id));
    });
    renderPulses();
    updatePaletteCounts();
  }

  function svgPoint(cx, cy) {
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* ----- palette & drag/drop ----- */
  function buildPalette() {
    const el = $('#palette'); el.innerHTML = '';
    PALETTE.forEach(p => {
      const b = document.createElement('div');
      b.className = 'pal k-' + p.kind; b.dataset.kind = p.kind;
      b.innerHTML = `<span class="pal-dot"></span><span class="pal-l">${p.label}</span><span class="pal-c" id="cnt-${p.kind}">${p.count}</span>`;
      b.addEventListener('pointerdown', e => startDrag(p.kind, e));
      b.addEventListener('dblclick', () => autoPlace(p.kind));
      el.appendChild(b);
    });
  }
  function freeSlots(kind) { return Object.keys(SLOTS).filter(id => SLOTS[id].kind === kind && !S.placed[id]); }
  function updatePaletteCounts() {
    PALETTE.forEach(p => {
      const n = freeSlots(p.kind).length, c = $('#cnt-' + p.kind);
      if (c) { c.textContent = n; c.parentElement.classList.toggle('empty', n === 0); }
    });
  }
  let ghostEl = null;
  function startDrag(kind, e) {
    if (S.chapter !== 0 || S.wireOn) return;
    if (!freeSlots(kind).length) { toast('All ' + kind + ' devices are already placed.'); return; }
    e.preventDefault();
    ghostEl = document.createElement('div'); ghostEl.className = 'drag-ghost k-' + kind;
    ghostEl.textContent = PALETTE.find(p => p.kind === kind).label; document.body.appendChild(ghostEl);
    svg.classList.add('dragging'); svg.dataset.drag = kind;
    const move = ev => { ghostEl.style.left = ev.clientX + 'px'; ghostEl.style.top = ev.clientY + 'px'; };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      ghostEl.remove(); ghostEl = null; svg.classList.remove('dragging'); delete svg.dataset.drag;
      dropAt(kind, ev.clientX, ev.clientY);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true }); move(e);
  }
  const TIER = { spine: 'the top (spine) tier', leaf: 'the middle (leaf) tier', border: 'the right-hand slot in the leaf tier', host: 'the bottom-left endpoint slot', wan: 'the bottom-right endpoint slot' };
  function dropAt(kind, cx, cy) {
    const r = svg.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return;
    const q = svgPoint(cx, cy);
    let nearest = null, nd = 1e9;
    Object.keys(SLOTS).forEach(id => {
      if (S.placed[id]) return;
      const d = Math.hypot(SLOTS[id].x - q.x, SLOTS[id].y - q.y);
      if (d < nd) { nd = d; nearest = id; }
    });
    const same = freeSlots(kind).map(id => ({ id, d: Math.hypot(SLOTS[id].x - q.x, SLOTS[id].y - q.y) })).sort((a, b) => a.d - b.d)[0];
    if (same && same.d < 110) { place(same.id); return; }
    if (nearest && SLOTS[nearest].kind !== kind) toast(`A ${kind} doesn’t belong there — it goes in ${TIER[kind]}.`, 'warn');
    else toast('Drop it closer to a dashed slot.');
  }
  function autoPlace(kind) { const s = freeSlots(kind)[0]; if (s && S.chapter === 0 && !S.wireOn) place(s); }
  function place(id) {
    S.placed[id] = true; renderTopo(); buildTabs(); addXP(5, DEV[id].name + ' placed'); beep('click');
    if (Object.keys(S.placed).length === Object.keys(SLOTS).length && S.buildRes) { const r = S.buildRes; S.buildRes = null; r(); }
  }

  /* ----- wiring ----- */
  const WHY = {
    'leaf|leaf': 'Leaf switches never connect to each other. In a leaf-spine fabric every leaf-to-leaf path goes leaf → spine → leaf, so all paths are the same length and ECMP is predictable.',
    'spine|spine': 'No spine-to-spine links. Spines are interchangeable ECMP paths; linking them creates uneven paths and extra loop risk.',
    'host|spine': 'Servers attach to leaves — the leaves are the VTEPs. Spines only carry transit IP traffic.',
    'spine|wan': 'External routers attach to the border leaf, not the spines, so spines stay simple and policy lives in one place.',
    'wan|leaf': 'Only the border leaf connects outward. Regular leaves stay inside the fabric.',
    'host|border': 'In this lab Host-A is dual-homed to Leaf-1 and Leaf-2. The border leaf is reserved for external connectivity.',
    'border|wan': ''
  };
  function kindOf(id) { return DEV[id].kind; }
  function onNodeClick(id) {
    if (!S.wireOn) { selectDev(id); return; }
    if (!S.wireFrom) { S.wireFrom = id; renderTopo(); return; }
    if (S.wireFrom === id) { S.wireFrom = null; renderTopo(); return; }
    const a = S.wireFrom; S.wireFrom = null;
    const l = findLink(a, id), k = ekey(a, id);
    if (l) {
      if (S.links[k]) toast('Already connected.');
      else { S.links[k] = l; toast(`✔ ${nameOf(l.a)} ${l.pa}  ⇄  ${nameOf(l.b)} ${l.pb}`, 'ok'); good('cable', 5); award('firstwire'); }
    } else {
      bad(true);
      const ka = kindOf(a), kb = kindOf(id);
      const kk = [ka === 'border' && kb === 'wan' ? 'border' : ka, kb].sort().join('|');
      const key = [ka, kb].sort().join('|');
      toast(WHY[key] || WHY[kk] || `${nameOf(a)} and ${nameOf(id)} aren’t cabled to each other in this design.`, 'warn');
    }
    updateHint(); renderTopo(); updateWireProgress();
    if (Object.keys(S.links).length === LINKS.length && S.wireRes) { const r = S.wireRes; S.wireRes = null; r(); }
  }
  function updateHint() {
    const miss = LINKS.find(l => !S.links[ekey(l.a, l.b)]);
    S.hint = S.wireOn && miss ? [miss.a, miss.b] : null;
  }
  function updateWireProgress() {
    $('#wire-prog').textContent = S.wireOn ? `${Object.keys(S.links).length} / ${LINKS.length} links` : '';
  }

  function selectDev(id) {
    if (S.target && S.missionRes) {
      if (id === S.target) { const r = S.missionRes; S.missionRes = null; r(); }
      else toast('Not that one — this mission is on ' + nameOf(S.target) + ' (look for the “click me” tag).', 'warn');
    }
    S.cur = id; renderTopo(); showTab(id);
    const d = DEV[id];
    $('#inspector').innerHTML = `<b>${d.name}</b> · ${d.role}` + (d.asn ? ` · AS ${d.asn}` : '') + (d.lo0 ? ` · lo0 ${d.lo0}` : '') + (d.lo1 ? ` · lo1 (VTEP) ${d.lo1}` : '') + (d.ip ? ` · ${d.ip}` : '');
  }

  /* ----- pulses (the clickable circles) ----- */
  function mid(a, b) { const p = SLOTS[a], q = SLOTS[b]; return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; }
  function renderPulses() {
    const g = $('#pulses'); if (!g) return;
    S.pulses.forEach(p => {
      const pg = svgEl('g', { class: 'pulse' }, g);
      svgEl('circle', { cx: p.x, cy: p.y, r: 10, class: 'rip r1' }, pg);
      svgEl('circle', { cx: p.x, cy: p.y, r: 10, class: 'rip r2' }, pg);
      svgEl('circle', { cx: p.x, cy: p.y, r: 8, class: 'dot' }, pg);
      if (p.label) {
        const w = p.label.length * 6 + 14;
        svgEl('rect', { x: p.x - w / 2, y: p.y - 38, width: w, height: 18, rx: 9, class: 'plbl-bg' }, pg);
        svgEl('text', { x: p.x, y: p.y - 25.5, 'text-anchor': 'middle', class: 'plbl' }, pg).textContent = p.label;
      }
      pg.addEventListener('click', () => focusWS(p.ev, p.link));
    });
  }
  function setPulses(ev) {
    S.pulses = [];
    if (ev.links.length) ev.links.forEach(([a, b], i) => { const m = mid(a, b); S.pulses.push({ x: m.x, y: m.y, label: (ev.pl && ev.pl[i]) || (i === 0 ? ev.label : ''), ev, link: [a, b] }); });
    else if (ev.node) { const s = SLOTS[ev.node]; S.pulses.push({ x: s.x, y: s.y - NH / 2 - 6, label: ev.label, ev }); }
    renderTopo();
  }
  function clearPulses() { S.pulses = []; renderTopo(); }

  /* ------------------------------------------------------------------ CLI */
  function hostPrompt(dev, mode) {
    if (dev === 'host') return 'root@host-a:~#';
    return DEV[dev].name + (mode ? `(${mode})` : '') + '#';
  }
  function buildTabs() {
    const el = $('#tabs'); el.innerHTML = '';
    ['spine1', 'spine2', 'leaf1', 'leaf2', 'border', 'host', 'wan'].forEach(id => {
      if (!S.placed[id]) return;
      const b = document.createElement('button'); b.className = 'tab' + (S.cur === id ? ' on' : ''); b.dataset.id = id; b.textContent = DEV[id].name;
      b.addEventListener('click', () => selectDev(id)); el.appendChild(b);
    });
  }
  function showTab(id) {
    S.cur = id; buildTabs();
    const term = $('#term'); term.innerHTML = '';
    (S.buf[id] || []).forEach(l => mkLine(id, l));
    if (!(S.buf[id] || []).length) term.innerHTML = '<div class="ln dim">' + hostPrompt(id, '') + ' <span class="cursor"></span></div>';
    term.scrollTop = term.scrollHeight;
  }
  function mkLine(dev, l) {
    const term = $('#term'); const d = document.createElement('div'); d.className = 'ln' + (l.kind === 'out' ? ' out' : '');
    if (l.kind === 'cmd') d.innerHTML = `<span class="pr">${esc(l.prompt)}</span> <span class="tx"></span>${l.live ? '<span class="cursor"></span>' : ''}`;
    else d.textContent = l.text;
    term.appendChild(d); l.el = d; l.tx = d.querySelector('.tx'); if (l.tx) l.tx.textContent = l.text;
    term.scrollTop = term.scrollHeight;
  }
  function addLine(dev, l) {
    (S.buf[dev] = S.buf[dev] || []).push(l);
    if (S.cur === dev) {
      const first = $('#term .ln.dim'); if (first) first.remove();
      mkLine(dev, l);
    }
  }
  function flashTab(dev) {
    const b = document.querySelector(`#tabs .tab[data-id="${dev}"]`); if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600); }
  }

  /* ------------------------------------------------------------------ Explain pane */
  /* Newest card on top; older cards collapse to one line (click to expand). */
  function addCard(html, cls) {
    const list = $('#explain');
    if (cls !== 'note') list.querySelectorAll('.card.current').forEach(c => { c.classList.remove('current'); c.classList.add('old'); });
    const c = document.createElement('div'); c.className = 'card ' + (cls || '') + ' current'; c.innerHTML = html;
    list.prepend(c); list.scrollTop = 0;
    while (list.children.length > 80) list.lastChild.remove();
    return c;
  }
  let shownSig = new Set();
  function cmdCard(dev, cmd) {
    const sg = sigFor(cmd.c), x = cmd.x || {};
    const sig = (sg && sg.s) || x.w; if (!sig) return;
    if (!cmd.x && shownSig.has(sig)) return;            // don't repeat the same one-liner for every interface
    shownSig.add(sig);
    const gotcha = (sg && sg.g) || x.g;
    let h = `<div class="k-top"><span class="k-dev">${esc(nameOf(dev))}</span><code class="k-cmd">${esc(cmd.c)}</code></div><div class="k-sig">${sig}</div>`;
    if (gotcha) h += `<div class="k-warn">⚠ ${gotcha}</div>`;
    if (x.y) h += `<details class="k-more"><summary>Why it matters</summary><div>${x.y}</div></details>`;
    addCard(h, 'kc');
  }
  function noteCard(h) { addCard(h, 'note'); }
  $('#explain').addEventListener('click', e => {
    const ap = e.target.closest('.w-apply');
    if (ap) { applyFilter(ap.dataset.f, ap.dataset.no ? +ap.dataset.no : null); return; }
    const card = e.target.closest('.card.old'); if (card && !e.target.closest('summary')) card.classList.remove('old');
  });
  function applyFilter(f, no) {
    S.filter = f; $('#ws-filter').value = f; switchWS('packets'); renderRows(); ackAlert();
    const pane = $('#pane-ws'); pane.classList.add('flash'); setTimeout(() => pane.classList.remove('flash'), 1200);
    if (no) selectPkt(no, true);
  }

  /* ------------------------------------------------------------------ Wireshark pane */
  const PROTO_BG = { BGP: '#fff3d6', TCP: '#e7e6ff', ICMP: '#fce0ff', ARP: '#faf0d7', LACP: '#eaf7ee', VXLAN: '#daeeff' };
  /* Real display-filter syntax (bgp.evpn.nlri.rt == 3, vxlan.vni == 50001, ospf.msg == 1 …); plain words fall back to text search. */
  function visibleRows() {
    const q = S.filter.trim(), inp = $('#ws-filter');
    inp.classList.remove('ok', 'txt');
    if (!q) return S.capture;
    try { const r = S.capture.filter(p => wsMatch(p, q)); inp.classList.add('ok'); return r; }
    catch (e) { inp.classList.add('txt'); const ql = q.toLowerCase(); return S.capture.filter(p => (p.proto + ' ' + p.info + ' ' + p.src + ' ' + p.dst).toLowerCase().includes(ql)); }
  }
  function renderRows() {
    const tb = $('#pk-body'); tb.innerHTML = '';
    visibleRows().forEach(p => {
      const tr = document.createElement('tr'); tr.dataset.no = p.no;
      let bg = PROTO_BG[p.proto] || '#fff';
      if (p.tag === 'syn' || p.tag === 'synack' || p.tag === 'ack') bg = '#e7e6ff';
      if (p.tag === 'rst') bg = '#a40000';
      tr.style.background = bg; if (p.tag === 'rst') tr.style.color = '#fff';
      tr.className = (S.sel === p.no ? 'sel ' : '') + (p.fresh ? 'fresh ' : '');
      tr.innerHTML = `<td>${p.no}</td><td>${p.time}</td><td>${esc(p.src)}</td><td>${esc(p.dst)}</td><td>${p.proto}</td><td>${p.len}</td><td class="info${p.blink ? ' blink' : ''}">${esc(p.info)}</td>`;
      tr.addEventListener('click', () => selectPkt(p.no, true));
      tb.appendChild(tr);
    });
    const box = $('#pk-list'); box.scrollTop = box.scrollHeight;
  }
  function selectPkt(no, user) {
    S.sel = no; const p = S.capture.find(x => x.no === no); if (!p) return;
    if (user) { S.capture.forEach(x => { if (x.ev === p.ev) x.blink = false; }); ackAlert(); }
    p.blink = false; renderRows(); renderDetail(p); renderEncap(p);
    const tr = document.querySelector(`#pk-body tr[data-no="${no}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' });
  }
  function renderField(fl, key) {
    if (fl.k === undefined && fl.name) // a nested protocol block (e.g. the EVPN NLRI inside MP_REACH_NLRI)
      return `<div class="fld sub"><span class="fk">▾ ${esc(fl.name)}</span></div><div class="kids">${(fl.fields || []).map(c => renderField(c, key)).join('')}</div>`;
    const hasKids = fl.children && fl.children.length;
    const isKey = key && fl.k === key;
    let h = `<div class="fld${fl.hl ? ' hl' : ''}${isKey ? ' key' : ''}"><span class="fk">${esc(fl.k)}</span>${fl.v !== '' ? `: <span class="fv">${esc(fl.v)}</span>` : ''}`;
    if (fl.note) h += `<div class="fnote">💡 ${esc(fl.note)}</div>`;
    h += '</div>';
    if (hasKids) h += `<div class="kids">${fl.children.map(c => renderField(c, key)).join('')}</div>`;
    return h;
  }
  function renderDetail(p) {
    const d = $('#pk-detail');
    d.innerHTML = p.layers.map((l, i) => `<details ${i > 0 ? 'open' : ''}><summary>${esc(l.name.replace('{n}', p.no))}</summary>${l.fields.map(f => renderField(f, p.keyField)).join('')}</details>`).join('');
    const k = d.querySelector('.fld.key'); if (k) k.scrollIntoView({ block: 'center' });
  }
  function renderEncap(p) {
    const vx = p && p.vx;
    const v = vx || { vni: 10010, osrc: '10.1.1.1', odst: '10.1.1.2', isrc: '00:50:56:aa:10:10', idst: 'ff:ff:ff:ff:ff:ff', inner: 'Original L2 frame' };
    $('#encap').innerHTML = `
      <div class="enc-note">${vx ? 'Decoded from the selected packet.' : 'Reference layout (example values). Select a VXLAN packet to see its real values.'}</div>
      <div class="stack">
        <div class="seg s-out"><b>Outer Ethernet</b><small>14 B</small><span>${esc(v.osrc ? 'next-hop MACs' : '')}</span></div>
        <div class="seg s-out"><b>Outer IPv4</b><small>20 B</small><span>${esc(v.osrc)} → ${esc(v.odst)}</span></div>
        <div class="seg s-out"><b>UDP</b><small>8 B</small><span>dst port 4789</span></div>
        <div class="seg s-vx"><b>VXLAN</b><small>8 B</small><span>VNI ${v.vni}</span></div>
        <div class="seg s-in"><b>Inner Ethernet</b><small>14 B</small><span>${esc(v.isrc)} → ${esc(v.idst)}</span></div>
        <div class="seg s-in"><b>Inner payload</b><small>…</small><span>${esc(v.inner)}</span></div>
      </div>
      <div class="bits"><div class="bit f">Flags<br><small>8 bits · 0x08 = I flag (VNI valid)</small></div><div class="bit r">Reserved<br><small>24</small></div><div class="bit v">VNI<br><small>24 bits · ${v.vni}</small></div><div class="bit r">Rsvd<br><small>8</small></div></div>
      <div class="enc-math"><b>Overhead = 14 + 20 + 8 + 8 = 50 bytes.</b> A 1500-byte inner IP packet becomes a <b>1550-byte</b> outer IP packet, so every underlay link needs MTU ≥ 1550 — that is why we configured <code>mtu 9216</code> in Chapter 1.<br>The UDP <i>source</i> port is a hash of the inner headers → the underlay ECMP spreads tunnels over both spines.</div>`;
  }
  function switchWS(tab) {
    document.querySelectorAll('#ws-tabs .wtab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    $('#ws-packets').classList.toggle('hide', tab !== 'packets'); $('#ws-encap').classList.toggle('hide', tab !== 'encap'); $('#ws-rt').classList.toggle('hide', tab !== 'rt'); if (tab === 'rt') renderRT();
  }
  function ackAlert() { $('#pane-ws').classList.remove('alert'); S.newCount = 0; $('#ws-banner').classList.add('hide'); }
  function focusWS(ev, link) {
    switchWS(ev && ev.ws === 'encap' ? 'encap' : 'packets');
    const pane = $('#pane-ws'); pane.classList.add('flash'); setTimeout(() => pane.classList.remove('flash'), 1400);
    pane.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ackAlert();
    if (ev && !S.inspectedEv.has(ev)) {
      S.inspectedEv.add(ev); S.inspected++; addXP(5, 'packet inspected'); beep('click');
      if (S.inspected >= 5) award('detective');
      if (/jumbo/i.test(ev.label)) award('jumbo');
    }
    if (ev && ev.capIds && ev.capIds.length) {
      const onLink = link ? S.capture.filter(p => p.ev === ev && ekey(p.link[0], p.link[1]) === ekey(link[0], link[1])) : [];
      const key = onLink.find(p => p.key) || onLink[0] || S.capture.find(p => p.ev === ev && p.key) || S.capture.find(p => p.ev === ev);
      if (key) selectPkt(key.no, true);
    } else if (ev && !ev.capIds.length) { $('#pk-detail').innerHTML = '<div class="empty-ws">No packets for this step — and that is the lesson.</div>'; }
  }
  function captureIn(ev) {
    ev.capIds = [];
    (ev.pkts || []).forEach(src => {
      S.pktNo++; S.t += 0.0004 + Math.random() * 0.012;
      const p = Object.assign({}, src, { no: S.pktNo, time: S.t.toFixed(6), ev, fresh: true, blink: !!src.key });
      S.capture.push(p); ev.capIds.push(p.no); if (p.rtype) { S.rtSeen[p.rtype] = (S.rtSeen[p.rtype] || 0) + 1; if (['1', '2', '3', '4', '5'].every(t => S.rtSeen[t])) award('routes'); }
    });
    $('#cap-if').textContent = ev.links.length ? ev.links.map(([a, b]) => `${nameOf(a)} ${portOf(a, b)} ⇄ ${nameOf(b)} ${portOf(b, a)}`).join('   |   ') : '—';
  }
  function resetCapture() { S.capture = []; S.sel = null; S.pktNo = 0; S.t = 0; $('#pk-detail').innerHTML = '<div class="empty-ws">Select a packet above.</div>'; renderRows(); renderEncap(null); $('#cap-if').textContent = '—'; ackAlert(); }

  /* ------------------------------------------------------------------ Coach / chapters UI */
  function coach(c) {
    return new Promise(res => {
      $('#coach-t').innerHTML = c.t; $('#coach-b').innerHTML = c.b; $('#coach-stars').innerHTML = c.stars || '';
      const pts = $('#coach-pts'); pts.innerHTML = (c.pts || []).map(p => `<li>${p}</li>`).join('');
      const btn = $('#coach-btn'); btn.textContent = c.btn || 'Continue';
      $('#coach-wrap').classList.add('on'); S.coachRes = () => { $('#coach-wrap').classList.remove('on'); S.coachRes = null; res(); };
      btn.focus();
    });
  }
  $('#coach-btn').addEventListener('click', () => { if (S.coachRes) S.coachRes(); });

  function renderChapters() {
    const el = $('#chapters'); el.innerHTML = '';
    const mk = (i, label, state) => {
      const b = document.createElement('button'); b.className = 'chip ' + state; b.innerHTML = `<i>${i}</i>${label}`;
      if (state !== 'locked') b.addEventListener('click', () => goChapter(i)); el.appendChild(b);
    };
    mk(0, 'Build', S.chapter === 0 ? 'on' : 'done');
    CHAPTERS.forEach(c => mk(c.id, c.title, S.chapter === c.id ? 'on' : (S.done >= c.id ? 'done' : '')));
    el.querySelectorAll('.chip').forEach((b, i) => { if (i >= 1 && S.stars[i]) { const s = document.createElement('span'); s.className = 'stars'; s.textContent = '★'.repeat(S.stars[i]); b.appendChild(s); } });
    COMING.forEach((t, i) => { const b = document.createElement('button'); b.className = 'chip locked soon'; b.innerHTML = `<i>${CHAPTERS.length + 1 + i}</i>${t}`; b.disabled = true; el.appendChild(b); });
    const p = $('#progress'); p.style.width = Math.round(100 * S.done / (CHAPTERS.length + COMING.length)) + '%';
  }

  /* ------------------------------------------------------------------ Engine */
  function waitUserUI(show, label) {
    const b = $('#btn-cont'); b.classList.toggle('wait', show); b.disabled = !show; if (label) $('#cont-l').textContent = label;
    $('#run-state').textContent = show ? (label || 'Waiting for you') : (S.paused ? 'Paused' : 'Running');
  }
  $('#btn-cont').addEventListener('click', () => { if (S.waiter) { const w = S.waiter; S.waiter = null; w(); } });
  $('#btn-pause').addEventListener('click', () => { S.paused = !S.paused; $('#btn-pause').textContent = S.paused ? '▶ Resume' : '⏸ Pause'; $('#run-state').textContent = S.paused ? 'Paused' : 'Running'; });
  $('#btn-skip').addEventListener('click', () => { S.skip = true; });
  $('#speed').addEventListener('input', e => { S.speed = parseFloat(e.target.value); $('#speed-l').textContent = S.speed + '×'; LM(() => { Stage.rate = S.speed; }); });
  $('#opt-chars').addEventListener('change', e => LM(() => Stage.setEnabled(e.target.checked)));
  $('#opt-trails').addEventListener('change', e => LM(() => Stage.setTrails(e.target.checked ? 'short' : 'off')));
  $('#opt-pause').addEventListener('change', e => { S.autoPause = e.target.checked; });
  $('#opt-manual').addEventListener('change', e => { S.manual = e.target.checked; });
  $('#btn-reset').addEventListener('click', () => location.reload());
  $('#opt-guided').addEventListener('change', e => { S.guided = e.target.checked; toast(S.guided ? 'Game mode on: you click each step, answer predictions and read the result drawer.' : 'Game mode off: steps play automatically.', 'ok'); });
  $('#btn-mute').addEventListener('click', () => { S.mute = !S.mute; $('#btn-mute').textContent = S.mute ? '🔇' : '🔊'; });
  $('#dr-btn').addEventListener('click', () => { if (S.drawerRes) { const r = S.drawerRes; S.drawerRes = null; r(); } });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && S.drawerRes) { const r = S.drawerRes; S.drawerRes = null; r(); } });

  function cancelRun() {
    runToken++; S.skip = false; S.target = null; LM(() => Stage.cancelAll());
    ['waiter', 'missionRes', 'drawerRes', 'quizRes', 'actionRes'].forEach(k => { if (S[k]) { const w = S[k]; S[k] = null; w(); } });
    S.actions = null; $('#actions').classList.add('hide');
    if (S.coachRes) S.coachRes(); if (S.buildRes) S.buildRes = null; if (S.wireRes) S.wireRes = null;
    $('#coach-wrap').classList.remove('on'); $('#quiz-wrap').classList.remove('on'); $('#drawer').classList.remove('on'); waitUserUI(false);
  }

  /* ----- move-by-move actions: split a device's commands into clickable moves ----- */
  const KIND = c => { const w = c.split(' '); return /^(ip|no)$/.test(w[0]) ? w.slice(0, 2).join(' ') : w[0]; };
  const MILE = /^(ip route|network |send-community|route-reflector-client|retain route-target|maximum-paths|route-target|rd auto|redistribute|advertise l2vpn evpn|ip address|ip ospf network|ip router ospf|ip pim|vn-segment|ingress-replication|mcast-group|esi |system-mac|channel-group|vrf member|ip forward|fabric forwarding|evpn multihoming core-tracking|source-interface|host-reachability)/;
  function labelOf(c) {
    let m;
    if ((m = c.match(/^interface loopback(\d+)/))) return `configure Loopback${m[1]}`;
    if ((m = c.match(/^interface (Ethernet\S+)/i))) return `configure interface ${m[1]}`;
    if (/^interface nve/.test(c)) return 'create the NVE (VTEP) interface';
    if ((m = c.match(/^interface vlan(\d+)/i))) return `create the Vlan${m[1]} SVI`;
    if (/^interface port-channel/.test(c)) return 'build the port-channel to the host';
    if (/^router ospf/.test(c)) return 'start the OSPF process';
    if (/^router bgp/.test(c)) return 'start the BGP process';
    if ((m = c.match(/^neighbor (\S+)/))) return `set up neighbor ${m[1]}`;
    if ((m = c.match(/^address-family (.+)/))) return `go into the ${m[1]} address-family`;
    if (/^vrf member/.test(c)) return 'put it in VRF Tenant-A';
    if ((m = c.match(/^vrf context (\S+)/))) return `create VRF ${m[1]}`;
    if ((m = c.match(/^vrf (\S+)/))) return `open the ${m[1]} BGP VRF section`;
    if (/^ip route add default/.test(c)) return 'point the host at its gateway';
    if (/^ping /.test(c)) { const ip = c.split(' ').find(t => /^\d+\.\d+\.\d+\.\d+$/.test(t)); return /df-bit/.test(c) ? `send a jumbo DF ping to ${ip}` : `ping ${ip}`; }
    if (/^fabric forwarding anycast-gateway-mac/.test(c)) return 'set the anycast-gateway MAC';
    if (/^system-mac/.test(c)) return 'set the ES system-MAC and DF election';
    if ((m = c.match(/^vlan (\d+)/))) return `create VLAN ${m[1]}`;
    if (c === 'evpn') return 'open the EVPN section';
    if (/^evpn multihoming$/.test(c)) return 'turn on EVPN multihoming';
    if (/^vni \d+ l2/.test(c)) return 'declare the L2VNI in EVPN';
    if (/^route-map/.test(c)) return 'create the route-map';
    if (/^member vni/.test(c)) return 'attach the VNI to the NVE';
    if (/^ethernet-segment/.test(c)) return 'mark it as an Ethernet Segment';
    if (/^send-community/.test(c)) return 'enable extended communities';
    if (/^route-reflector-client/.test(c)) return 'make the leaf a route-reflector client';
    if (/^retain route-target/.test(c)) return 'keep all route-targets';
    if (/^maximum-paths/.test(c)) return 'allow ECMP (maximum-paths)';
    if (/^route-target/.test(c)) return 'set the route-targets';
    if (/^rd auto/.test(c)) return 'generate the route-distinguisher';
    if (/^redistribute/.test(c)) return 'redistribute the connected subnet';
    if (/^network /.test(c)) return 'originate the routes into BGP';
    if (/^ip route \d/.test(c)) return 'add a static default route';
    if (/^advertise l2vpn evpn/.test(c)) return 'advertise the VRF into EVPN';
    if (/^ip address/.test(c)) return 'give the interface its IP address and enable it';
    if (/^ip ospf network/.test(c)) return 'make the link point-to-point';
    if (/^ip router ospf/.test(c)) return 'enable OSPF on the interface';
    if (/^ip pim/.test(c)) return 'enable PIM sparse-mode';
    if (/^vn-segment/.test(c)) return 'map the VLAN to a VNI';
    if (/^(ingress-replication|mcast-group)/.test(c)) return 'choose the BUM replication method';
    if (/^esi /.test(c)) return 'define the ESI';
    if (/^channel-group/.test(c)) return 'bundle the port with LACP';
    if (/^vrf member/.test(c)) return 'put it in the tenant VRF';
    if (/^ip forward/.test(c)) return 'enable IP forwarding';
    if (/^fabric forwarding mode/.test(c)) return 'turn it into the anycast gateway';
    if (/^evpn multihoming core-tracking/.test(c)) return 'track the core link';
    if (/^source-interface/.test(c)) return 'set the VTEP source interface';
    if (/^host-reachability/.test(c)) return 'tell the NVE to learn hosts through BGP';
    if (/^shutdown/.test(c)) return 'shut the interface down';
    if (/^no shutdown/.test(c)) return 'bring the interface back up';
    if (/^mtu /.test(c)) return 'set the MTU';
    if (/^hardware access-list tcam/.test(c)) return 'carve TCAM for ARP suppression';
    if (/^suppress-arp/.test(c)) return 'turn on ARP suppression';
    if (/^no route-target/.test(c)) return 'remove the wrong import route-target';
    if (/^(feature|nv overlay|hardware)/.test(c)) return 'enable the required features';
    if (/^show /.test(c)) return `run: ${c}`;
    if (/^ping /.test(c)) return `ping ${c.replace(/^ping\s+/, '').split(' ')[0]}`;
    if (/^ip link add bond0/.test(c)) return 'create the LACP bond';
    if ((m = c.match(/^ip link set (eth\d) master/))) return `enslave ${m[1]} into the bond`;
    if (/^ip link set bond0 up/.test(c)) return 'bring the bond up';
    if (/^ip addr add/.test(c)) return 'give the host its IP address';
    if (/^arping/.test(c)) return 'send a gratuitous ARP';
    if (/^ip route add default/.test(c)) return 'point the host at its gateway';
    return 'run: ' + c;
  }
  function groupCmds(cmds, startMode, step) {
    const perCmd = step.exec || step.dev === 'host';
    const groups = []; let cur = null, mode = startMode;
    const isExit = c => /^(exit|end)$/.test(c.c);
    cmds.forEach(c => {
      let start = !cur || perCmd;
      if (!start) {
        // any command that opens a context (interface, router, neighbor, address-family, vlan, vrf …) starts a new move,
        // even when the mode name is unchanged (interface Eth1/1 → interface Eth1/2 are both config-if)
        const enters = c.m !== undefined && !isExit(c) && c.m !== 'config' && c.m !== '';
        const last = cur.cmds[cur.cmds.length - 1];
        const mile = MILE.test(c.c) && KIND(c.c) !== KIND(last.c) && !(/^ip address/.test(c.c) && cur.cmds.length === 1 && /^interface/.test(cur.cmds[0].c)) && !isExit(last);
        start = enters || mile;
      }
      if (start) { cur = { label: labelOf(c.c), cmds: [] }; groups.push(cur); }
      cur.cmds.push(c);
      if (c.m !== undefined) mode = c.m;
    });
    groups.forEach(g => {
      if (/^give the interface/.test(g.label)) g.label = g.cmds.some(c => c.c === 'no shutdown') ? 'give the interface its IP address and enable it'
        : /^ip address 10\.1\.10\.1\//.test(g.cmds[0].c) ? 'set the gateway IP (the same on every leaf)' : 'give the interface its IP address';
    });
    const seen = new Set();
    groups.forEach(g => {
      const norm = g.label.replace(/\d+\.\d+\.\d+\.\d+/g, 'IP').replace(/Ethernet\d+\/\d+/g, 'Ethernet').replace(/\beth\d\b/g, 'ethN') + '|' + (g.cmds[0].m || '') + '|' + g.cmds.map(c => KIND(c.c)).join(',');
      if (seen.has(norm)) g.repeat = true; seen.add(norm);
    });
    return groups;
  }
  function drawActions() {
    const a = S.actions, box = $('#actions'); if (!a) return; box.classList.remove('hide');
    const manual = a.groups.filter(g => !g.repeat), n = manual.length, done = a.groups.slice(0, a.idx).filter(g => !g.repeat).length;
    $('#a-count').textContent = `${done} / ${n} moves done` + (a.groups.length > n ? ` · ${a.groups.length - n} repeat automatically ↻` : '');
    $('#a-chips').innerHTML = a.groups.map((g, i) => {
      const st = i < a.idx ? 'done' : g.repeat ? (i === a.idx ? 'auto live' : 'auto') : i === a.idx ? 'cur' : 'todo';
      const txt = g.label.charAt(0).toUpperCase() + g.label.slice(1);
      return `<button class="a-chip ${st}" data-i="${i}">${st === 'done' ? '✓ ' + (g.repeat ? '↻ ' : '') + txt : st.startsWith('auto') ? '↻ ' + txt : st === 'cur' ? '▶ Let’s ' + g.label.charAt(0).toLowerCase() + g.label.slice(1) : txt}</button>`;
    }).join('');
    $('#a-rest').classList.toggle('hide', !a.groups.slice(a.idx).some(g => !g.repeat));
  }
  function hideActions() { S.actions = null; $('#actions').classList.add('hide'); }
  /* One card per move: each command with its one-line significance; the row being typed lights up. */
  function groupCard(g, dev) {
    const rows = g.cmds.filter(c => !/^(exit|end)$/.test(c.c)).map(c => {
      const sg = sigFor(c.c), x = c.x || {}, s = (sg && sg.s) || x.w || '', gt = (sg && sg.g) || x.g;
      return `<div class="g-row" data-c="${esc(c.c)}"><code>${esc(c.c)}</code><span>${s}${gt ? `<em>⚠ ${gt}</em>` : ''}</span></div>`;
    }).join('');
    const why = (g.cmds.map(c => c.x).filter(Boolean).find(x => x.y) || {}).y;
    const h = `<div class="g-top"><span class="k-dev">${esc(nameOf(dev))}</span><b>🎯 Let’s ${esc(g.label)}</b></div><div class="g-rows">${rows}</div>` +
      (why ? `<details class="k-more"><summary>Why it matters</summary><div>${why}</div></details>` : '');
    return addCard(h, 'move');
  }
  $('#a-chips').addEventListener('click', e => {
    const b = e.target.closest('.a-chip'); if (!b || !S.actions) return;
    if (b.classList.contains('cur') && S.actionRes) { const r = S.actionRes; S.actionRes = null; beep('click'); r('go'); }
    else if (b.classList.contains('todo')) { toast('One move at a time — first: Let’s ' + S.actions.groups[S.actions.idx].label + '.', 'warn'); beep('bad'); }
  });
  $('#a-rest').addEventListener('click', () => { if (S.actionRes) { const r = S.actionRes; S.actionRes = null; r('rest'); } });

  /* ----- mission bar (the "what do I do now" HUD) ----- */
  const STAGES = [['👆', 'Click'], ['🔮', 'Predict'], ['⌨️', 'Move by move'], ['📋', 'Read the result']];
  function drawMission() {
    const m = S.mis; if (!m) return;
    const bar = $('#mission'); bar.classList.remove('hide');
    $('#m-t').innerHTML = m.title; $('#m-b').innerHTML = m.body;
    $('#m-n').textContent = m.idx + 1; $('#m-of').textContent = '/ ' + m.total;
    $('#m-ring').style.setProperty('--p', Math.round(100 * (m.idx + (m.phase >= 3 ? 1 : m.phase / 4)) / m.total));
    $('#m-track').innerHTML = STAGES.map((s, i) => {
      const skipped = (i === 1 && !m.hasQ) || (i === 3 && !m.hasR) || (i === 1 && !S.guided) || (i === 0 && !S.guided);
      const st = skipped ? 'done' : (i < m.phase ? 'done' : i === m.phase ? 'active' : '');
      return `<span class="m-stage ${st}"><i>${st === 'done' ? '✓' : s[0]}</i>${s[1]}</span>`;
    }).join('');
    const act = $('#m-act'), nm = nameOf(m.dev);
    if (m.phase === 0 && S.guided) act.innerHTML = `<button class="m-go" id="mis-btn">👆 ${m.exec ? 'Open' : 'Configure'} ${nm}</button><span class="m-hint">${m.mirror.length ? '↳ ' + m.mirror.join(' & ') + ' will mirror it · ' : ''}or click it on the map</span>`;
    else act.innerHTML = `<span class="m-status">${['', '🔮 Make your prediction…', '⌨️ Pick your next move in the Console, then watch all four panes', '📋 Read the result, then continue'][Math.min(m.phase, 3)] || ''}</span>`;
  }
  function setPhase(p) { if (S.mis) { S.mis.phase = p; drawMission(); } }
  $('#m-act').addEventListener('click', e => { if (e.target.id === 'mis-btn' && S.missionRes) { const r = S.missionRes; S.missionRes = null; r(); } });

  async function runChapterFlow(ci) {
    const tk = ++runToken;
    const chk = () => { if (tk !== runToken) throw CANCEL; };
    const sleep = async ms => { if (!S.skip) await rafSleep(ms / S.speed); chk(); while (S.paused) { await rafSleep(80); chk(); } };
    const waitUser = label => new Promise(res => { waitUserUI(true, label); S.waiter = res; }).then(() => { waitUserUI(false); chk(); });

    async function typeLine(dev, text, cmd, fast) {
      const line = { kind: 'cmd', prompt: hostPrompt(dev, S.mode[dev] || ''), text: '', live: true };
      addLine(dev, line);
      const base = fast ? 7 : 26;
      for (const ch of text) {
        line.text += ch; if (line.tx) line.tx.textContent = line.text;
        const term = $('#term'); if (S.cur === dev) term.scrollTop = term.scrollHeight;
        if (!S.skip) await sleep(base * (0.6 + Math.random() * 0.8)); else chk();
      }
      line.live = false; if (line.el) { const cu = line.el.querySelector('.cursor'); if (cu) cu.remove(); }
      await sleep(fast ? 60 : 260);
      S.skip = false;
    }
    function printOut(dev, lines) { lines.forEach(t => addLine(dev, { kind: 'out', text: t })); }

    async function fireEvent(ev) {
      S.pendingEv = ev; setPulses(ev);
      ev.fresh = true;
      captureIn(ev);
      // staggered row reveal
      const all = S.capture; const shown = all.filter(p => p.ev !== ev); S.capture = shown; renderRows();
      const evp = all.filter(p => p.ev === ev); S.capture.forEach(p => { p.fresh = false; });
      for (const p of evp) { S.capture.push(p); renderRows(); LM(() => Stage.trip(p, { row: p.no })); await sleep(260); }
      if (ev.pkts && ev.pkts.length) { $('#ws-banner').classList.remove('hide'); S.newCount = ev.pkts.length; $('#ws-banner-t').textContent = `${ev.pkts.length} new packet${ev.pkts.length > 1 ? 's' : ''} — ${ev.label}`; }
      else { $('#ws-banner').classList.remove('hide'); $('#ws-banner-t').textContent = ev.label; }
      $('#pane-ws').classList.add('alert');
      const kp = S.capture.find(p => p.ev === ev && p.key) || S.capture.find(p => p.ev === ev);
      LM(() => { Stage.pose('ears'); Stage.fly(kp ? { row: kp.no } : { pane: 'ws' }); if (kp) Stage.ringOn({ row: kp.no }); });
      let wh = `<div class="w-top">🦈 Wireshark callout</div><div class="w-title">${esc(ev.label)}</div>`;
      if (kp) {
        const flt = wsFilterFor(kp);
        wh += `<div class="w-row"><span class="w-lbl">Display filter</span><code class="w-filter">${esc(flt)}</code><button class="w-apply" data-f="${esc(flt)}" data-no="${kp.no}">Apply ▶</button></div>`;
        wh += `<div class="w-row"><span class="w-lbl">What to expect</span><div class="w-exp">${wsExpect(kp) || esc(kp.info)}</div></div>`;
        wh += `<details class="k-more"><summary>Explain it</summary><div>${ev.learn}</div></details><div class="w-hint">or click the red pulsing circle on the map</div>`;
      } else wh += `<div class="w-row"><span class="w-lbl">What to expect</span><div class="w-exp">${ev.learn}</div></div>`;
      addCard(wh, 'wire');
      if (S.autoPause) await waitUser('👀 Check Wireshark, then Continue');
      else await sleep(2200);
      S.capture.forEach(p => { if (p.ev === ev) p.fresh = false; });
      clearPulses(); renderRows(); LM(() => Stage.pose('idle'));
    }

    /* click-to-start: the target device pulses on the map until the player clicks it */
    async function mission(step, idx, total, hasQ, hasR) {
      const c = step.coach || { t: 'Next step', b: '' };
      S.mis = { dev: step.dev, exec: !!step.exec, mirror: (step.mirror || []).map(nameOf), title: c.t, body: c.b, idx, total, hasQ, hasR, phase: 0 };
      drawMission();
      LM(() => { Stage.pose('idle'); Stage.fly({ dev: step.dev }); if (S.guided) Stage.say((step.exec ? 'Open ' : 'Configure ') + nameOf(step.dev), 2200); });
      if (!S.guided) return;
      S.target = step.dev; renderTopo();
      await new Promise(res => { S.missionRes = res; });
      S.missionRes = null; S.target = null; chk(); beep('click'); renderTopo();
    }
    /* prediction challenge */
    async function quiz(q) {
      const wrap = $('#quiz-wrap'); $('#q-q').innerHTML = q.q; $('#q-fb').innerHTML = ''; $('#q-btn').classList.add('hide');
      $('#q-streak').textContent = S.streak >= 2 ? `🔥 streak ${S.streak}` : '';
      const order = q.opts.map((_, i) => i).sort(() => Math.random() - .5);
      const box = $('#q-opts'); box.innerHTML = '';
      await new Promise(res => {
        S.quizRes = res; wrap.classList.add('on');
        order.forEach((oi, n) => {
          const b = document.createElement('button'); b.className = 'q-opt'; b.innerHTML = `<b>${'ABCD'[n]}</b><span>${q.opts[oi]}</span>`;
          b.addEventListener('click', () => {
            box.querySelectorAll('button').forEach(x => (x.disabled = true));
            const ok = oi === q.a; b.classList.add(ok ? 'right' : 'wrong'); LM(() => Stage.pose(ok ? 'happy' : 'oops'));
            if (!ok) [...box.children].forEach((x, k) => { if (order[k] === q.a) x.classList.add('right'); });
            if (ok) { S.predRight++; S.predRun++; good('correct prediction', 15); if (S.predRun >= 3) award('oracle'); }
            else { S.predWrong++; S.predRun = 0; bad(false); }
            $('#q-fb').innerHTML = (ok ? '<span class="ok">✔ Correct!</span> ' : '<span class="no">✘ Not quite.</span> ') + q.why;
            const nb = $('#q-btn'); nb.classList.remove('hide'); nb.focus(); nb.onclick = () => { S.quizRes = null; wrap.classList.remove('on'); LM(() => Stage.pose('idle')); res(); };
          });
          box.appendChild(b);
        });
      });
      chk();
    }
    /* result drawer: slides up with the show-command consequence */
    async function showResult(r) {
      $('#dr-title').textContent = `Result on ${nameOf(r.dev)}`; $('#dr-note').innerHTML = '<b>What to notice</b><br>' + r.note;
      const term = $('#dr-term'); term.innerHTML = ''; $('#drawer').classList.add('on'); await sleep(550);
      const ln = document.createElement('div'); ln.className = 'ln'; ln.innerHTML = `<span class="pr">${esc(hostPrompt(r.dev, ''))}</span> <span class="tx"></span><span class="cursor"></span>`; term.appendChild(ln);
      const tx = ln.querySelector('.tx'); for (const ch of r.c) { tx.textContent += ch; await sleep(18); }
      ln.querySelector('.cursor').remove(); await sleep(250);
      for (const t of r.out) {
        const d = document.createElement('div'); d.className = 'ln out' + ((r.hl || []).some(h => t.includes(h)) ? ' hl' : ''); d.textContent = t; term.appendChild(d); term.scrollTop = term.scrollHeight; await sleep(70);
      }
      addLine(r.dev, { kind: 'cmd', prompt: hostPrompt(r.dev, ''), text: r.c }); r.out.forEach(t => addLine(r.dev, { kind: 'out', text: t }));
      addXP(5, 'result reviewed');
      if (S.guided) await new Promise(res => { S.drawerRes = res; }); else await sleep(3500);
      S.drawerRes = null; $('#drawer').classList.remove('on'); chk(); await sleep(350);
    }

    async function runStep(step, idx, total) {
      const devs = [step.dev].concat(step.mirror || []);
      shownSig = new Set();
      const title = step.coach && step.coach.t;
      const pq = title && PREDICT[title] ? PREDICT[title]() : null;
      const res = title && RESULTS[title] ? RESULTS[title]() : null;
      if (step.glitch) LM(() => Stage.spawnGlitch(step.glitch.id, step.glitch.kind, step.glitch.target));
      await mission(step, idx, total, !!pq, !!res);
      if (S.guided && pq) { setPhase(1); await quiz(pq); }
      setPhase(2);
      LM(() => { Stage.pose('idle'); Stage.fly({ pane: 'cli' }); });
      selectDev(step.dev); flashTab(step.dev);
      const cfg = !step.exec && step.dev !== 'host';
      const typed = step.cmds(step.dev);
      S.mode[step.dev] = '';
      const groups = S.guided ? groupCmds(typed, cfg ? 'config' : '', step) : [{ label: '', cmds: typed }];
      let doRest = !S.guided;
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (S.guided) { S.actions = { groups, idx: gi, dev: step.dev }; drawActions(); }
        if (S.guided && !doRest && !g.repeat) {
          const act = await new Promise(res => { S.actionRes = res; });
          S.actionRes = null; chk(); if (act === 'rest') doRest = true;
        }
        if (gi === 0 && cfg) { await typeLine(step.dev, 'configure terminal', null, true); S.mode[step.dev] = 'config'; }
        const gcard = (S.guided && g.label && !g.repeat) ? groupCard(g, step.dev) : null;
        if (S.guided && g.repeat && (gi === 0 || !groups[gi - 1].repeat)) {
          let k = gi; while (k < groups.length && groups[k].repeat) k++;
          noteCard(`<div class="c-sec">↻ Same moves again, automatically: <b>${esc(g.label)}</b>${k - gi > 1 ? ` (+${k - gi - 1} more)` : ''}</div>`);
        }
        for (let ci = 0; ci < g.cmds.length; ci++) {
          const cmd = g.cmds[ci];
          chk();
          if (gcard) gcard.querySelectorAll('.g-row').forEach(r => { if (r.classList.contains('live')) r.classList.add('done'); r.classList.toggle('live', r.dataset.c === cmd.c); });
          else if (!(S.guided && g.repeat)) cmdCard(step.dev, cmd);
          await typeLine(step.dev, cmd.c, cmd, false);
          if (cmd.m !== undefined) S.mode[step.dev] = cmd.m;
          if (cmd.cam) LM(() => [].concat(cmd.cam).filter(Boolean).forEach(c => Stage.cameo(c.n, c.at)));
          if (cmd.out) { printOut(step.dev, cmd.out); await sleep(250); }
          if (cmd.ev) { const evs = Array.isArray(cmd.ev) ? cmd.ev : [cmd.ev]; for (const e of evs) await fireEvent(e); }
          if (S.manual && !cmd.ev) await waitUser('Next command ▶');
        }
        if (gcard) gcard.querySelectorAll('.g-row').forEach(r => { r.classList.remove('live'); r.classList.add('done'); });
        if (S.actions) S.actions.idx = gi + 1;
      }
      hideActions();
      if (cfg) { await typeLine(step.dev, 'end', null, true); S.mode[step.dev] = ''; }
      // mirrors
      const mirrors = (step.mirror || []);
      if (mirrors.length) {
        mirrors.forEach(m => applyInstantTo(m, step, cfg));
        noteCard(`<div class="c-sec">Same configuration applied on ${mirrors.map(m => `<a class="lnk" data-dev="${m}">${nameOf(m)}</a>`).join(' and ')} (with their own addresses/AS).</div>`);
        mirrors.forEach(flashTab);
      }
      if (step.after) step.after();
      if (step.clear) { try { await Stage.clearGlitch(step.clear); } catch (e) { /* ignore */ } }
      await sleep(300);
      if (res) { setPhase(3); await showResult(res); }
      LM(() => Stage.endCameos());
      setPhase(4); addXP(10, 'step complete');
    }
    function applyInstantTo(dev, step, cfg) {
      const cmds = step.cmds(dev);
      S.mode[dev] = '';
      if (cfg) { addLine(dev, { kind: 'cmd', prompt: hostPrompt(dev, ''), text: 'configure terminal' }); S.mode[dev] = 'config'; }
      cmds.forEach(c => {
        addLine(dev, { kind: 'cmd', prompt: hostPrompt(dev, S.mode[dev]), text: c.c });
        if (c.m !== undefined) S.mode[dev] = c.m;
        if (c.out) c.out.forEach(t => addLine(dev, { kind: 'out', text: t }));
      });
      if (cfg) { addLine(dev, { kind: 'cmd', prompt: hostPrompt(dev, S.mode[dev]), text: 'end' }); S.mode[dev] = ''; }
    }

    try {
      if (ci === 0) { await runBuild(chk); return; }
      const ch = CHAPTERS[ci - 1];
      S.chapter = ci; renderChapters(); resetCapture();
      noteCard(`<div class="c-sec"><b>Chapter ${ci} — ${ch.title}.</b> Commands appear here with an explanation as they are typed. NX-OS syntax; show-command outputs are representative.</div>`);
      $('#mission').classList.add('hide'); S.mis = null;
      await coach(Object.assign({ stars: '' }, ch.intro())); chk();
      LM(() => { Stage.show(); Stage.pose('idle'); Stage.fly({ pane: 'topo' }); Stage.say(ch.title, 2000); });
      const list = stepsOf(ch); S.mistakes = 0; S.predRight = 0; S.predWrong = 0;
      for (let i = 0; i < list.length; i++) await runStep(list[i], i, list.length);
      applyBadges(ci);
      const perf = S.mistakes + S.predWrong, stars = perf === 0 ? 3 : perf <= 2 ? 2 : 1;
      const wasDone = S.cleared >= ci; S.stars[ci] = Math.max(S.stars[ci] || 0, stars); S.done = Math.max(S.done, ci); renderChapters(); renderHUD(); if (!wasDone) levelCleared(ci);
      S.bums[CFG.bum] = (S.bums[CFG.bum] || 0) + (ci === 5 ? 1 : 0); if (S.bums.ir && S.bums.mc) award('both');
      const last = ci === CHAPTERS.length;
      if (last) award('master');
      confetti(stars === 3 ? 60 : 30); beep('level'); addXP(25 * stars, stars + '★ chapter bonus');
      $('#drawer').classList.remove('on'); $('#mission').classList.add('hide');
      const rc = ch.recap();
      await coach({ t: '✔ ' + rc.t, b: `<b>${S.predRight}</b> correct predictions · <b>${S.predWrong}</b> missed · <b>${S.mistakes}</b> wiring mistakes · 🔥 best streak <b>${S.bestStreak}</b><br>What you now understand:`, pts: rc.pts, stars: starsHTML(stars), btn: last ? 'Finish' : 'Next chapter →' }); chk();
      if (!last) goChapter(ci + 1);
    } catch (e) { if (e !== CANCEL) console.error(e); }
  }

  const BADGES = {
    1: { spine1: ['lo0 10.0.0.1'], spine2: ['lo0 10.0.0.2'], leaf1: ['lo1 10.1.1.1'], leaf2: ['lo1 10.1.1.2'], border: ['lo1 10.1.1.3'] },
    2: { leaf1: ['VNI 10010'], leaf2: ['VNI 10010'], border: ['VNI 10010'] },
    3: { spine1: ['iBGP RR'], spine2: ['iBGP RR'] },
    4: { host: ['bond0 · LACP'], leaf1: ['ESI 10'], leaf2: ['ESI 10'] },
    5: { host: ['MAC learned'] },
    6: { leaf1: ['L3VNI 50001'], leaf2: ['L3VNI 50001'], border: ['L3VNI 50001'], host: ['GW 10.1.10.1'] },
    7: { border: ['eBGP AS65100'], wan: ['default + 203.0.113.1'] }
  };
  function applyBadges(ci) {
    const b = BADGES[ci]; if (!b) return;
    Object.keys(b).forEach(id => { S.badges[id] = (S.badges[id] || []).concat(b[id]); });
    renderTopo();
  }

  /* ----- chapter 0: the interactive build ----- */
  async function runBuild(chk) {
    S.chapter = 0; renderChapters(); $('#palette-wrap').classList.remove('hide'); $('#wire-bar').classList.remove('hide');
    $('#build-help').textContent = 'Drag a device from the palette onto a dashed slot (double-click a palette item to auto-place).';
    if (Object.keys(S.placed).length < Object.keys(SLOTS).length) {
      await coach({ t: 'Welcome — let’s build a VXLAN EVPN fabric', b: 'We will build a <b>2-spine / 3-leaf</b> fabric: Leaf-1, Leaf-2, one <b>Border Leaf</b>, a <b>dual-homed host</b> and a WAN router. First, drag each device from the palette onto its dashed slot.', btn: 'Start dragging' }); chk();
      await new Promise(r => { S.buildRes = r; }); chk();
    }
    if (Object.keys(S.links).length < LINKS.length) {
      $('#build-help').textContent = 'Click one device, then the device it connects to. A hint ring shows the next missing cable.';
      await coach({ t: 'Let’s wire it', b: 'Click a device, then the device to cable it to. Rules of a leaf-spine fabric: <b>every leaf connects to every spine</b> (6 uplinks), <b>Host-A connects to both Leaf-1 and Leaf-2</b>, and the <b>Border</b> connects to the WAN router. Try a wrong link — the lab will tell you why it’s wrong.', btn: 'Start wiring' }); chk();
      S.wireOn = true; updateHint(); updateWireProgress(); renderTopo();
      await new Promise(r => { S.wireRes = r; }); chk();
      S.wireOn = false; S.hint = null; updateWireProgress(); renderTopo();
      if (S.mistakes === 0) award('cableguy');
      confetti(24); beep('level');
    }
    S.mistakes = 0;
    S.buildOk = true; $('#palette-wrap').classList.add('hide'); $('#wire-bar').classList.add('hide'); renderChapters();
    levelCleared(0);
    await coach({ t: '✔ Fabric built', b: 'The physical topology is complete. In the next chapter we make it <b>work</b>: addressing, MTU and the eBGP underlay.', btn: 'Chapter 1 →' }); chk();
    goChapter(1);
  }
  window.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a.lnk'); if (a) selectDev(a.dataset.dev); });
  $('#pane-ws').addEventListener('pointerdown', () => { if ($('#pane-ws').classList.contains('alert')) ackAlert(); });

  function autoBuild() {
    Object.keys(SLOTS).forEach(id => { S.placed[id] = true; });
    LINKS.forEach(l => { S.links[ekey(l.a, l.b)] = l; });
    S.buildOk = true; S.wireOn = false; S.hint = null;
    $('#palette-wrap').classList.add('hide'); $('#wire-bar').classList.add('hide');
  }
  function fastForward(upTo) {
    S.buf = {}; S.mode = {}; S.badges = {};
    for (let c = 1; c < upTo; c++) {
      stepsOf(CHAPTERS[c - 1]).forEach(st => {
        const cfg = !st.exec && st.dev !== 'host';
        [st.dev].concat(st.mirror || []).forEach(dev => {
          S.mode[dev] = '';
          if (cfg) { (S.buf[dev] = S.buf[dev] || []).push({ kind: 'cmd', prompt: hostPrompt(dev, ''), text: 'configure terminal' }); S.mode[dev] = 'config'; }
          st.cmds(dev).forEach(cm => {
            (S.buf[dev] = S.buf[dev] || []).push({ kind: 'cmd', prompt: hostPrompt(dev, S.mode[dev]), text: cm.c });
            if (cm.m !== undefined) S.mode[dev] = cm.m;
            if (cm.out) cm.out.forEach(t => S.buf[dev].push({ kind: 'out', text: t }));
          });
          if (cfg) { S.buf[dev].push({ kind: 'cmd', prompt: hostPrompt(dev, S.mode[dev]), text: 'end' }); S.mode[dev] = ''; }
        });
      });
      applyBadges(c);
    }
  }
  function goChapter(i) {
    cancelRun();
    S.pulses = []; S.hint = null; S.wireFrom = null; S.wireOn = false;
    $('#explain').innerHTML = '';
    if (i === 0) { S.chapter = 0; renderTopo(); buildTabs(); runChapterFlow(0); return; }
    if (!S.buildOk) autoBuild();
    fastForward(i);
    S.chapter = i; S.done = Math.max(S.done, i - 1);
    renderTopo(); buildTabs(); showTab(S.cur && S.placed[S.cur] ? S.cur : 'leaf1'); renderChapters();
    runChapterFlow(i);
  }

  /* ------------------------------------------------------------------ BUM selector */
  document.querySelectorAll('#bum button').forEach(b => b.addEventListener('click', () => {
    if (CFG.bum === b.dataset.m) return;
    CFG.bum = b.dataset.m;
    document.querySelectorAll('#bum button').forEach(x => x.classList.toggle('on', x.dataset.m === CFG.bum));
    toast('BUM mode → ' + (MC() ? 'Multicast (PIM Anycast-RP)' : 'Ingress replication') + (S.chapter >= 1 ? '. Restarting this chapter with the new configuration.' : '. Applies from Chapter 1.'), 'ok');
    if (S.chapter >= 1) goChapter(S.chapter);
  }));

  /* ------------------------------------------------------------------ EVPN route types reference */
  const RTYPES = [
    ['1', 'Ethernet Auto-Discovery', 'Per-ES: mass withdrawal. Per-EVI: aliasing / load-balancing to all leaves on the segment.', 'ESI · Ethernet Tag (0xFFFFFFFF per-ES) · label = VNI (per-EVI)', 'Ch 4'],
    ['2', 'MAC / IP Advertisement', 'A host’s MAC (and IP). MAC-only = bridging; MAC+IP adds the L3VNI label, second RT and router MAC (symmetric IRB).', 'MAC · IP · L2VNI · L3VNI · RT(s) · Router MAC · ESI', 'Ch 5, 6'],
    ['3', 'Inclusive Multicast (IMET)', 'Who is in this VNI and how BUM reaches them (PMSI tunnel: ingress replication or PIM).', 'Originating VTEP IP · PMSI Tunnel Attribute', 'Ch 3'],
    ['4', 'Ethernet Segment', 'Discover the other leaves attached to the same ES and run DF election.', 'ESI · originating IP · ES-Import RT', 'Ch 4'],
    ['5', 'IP Prefix', 'Subnets and external routes (default route) in the tenant VRF, carried in the L3VNI.', 'Prefix/length · label = L3VNI · RT · Router MAC', 'Ch 6, 7']
  ];
  function renderRT() {
    const el = $('#rtypes');
    el.innerHTML = '<div class="enc-note">All five route types used in this lab. “Seen so far” counts packets of that type captured in this session; click to filter the current capture.</div>' +
      '<table class="rt"><thead><tr><th>Type</th><th>Name</th><th>Purpose</th><th>Key fields</th><th>Wireshark filter</th><th>Chapter</th><th>Seen</th></tr></thead><tbody>' +
      RTYPES.map(r => { const n = S.rtSeen[r[0]] || 0;
        return `<tr><td><b class="tbadge t${r[0]}">${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><code class="w-filter">bgp.evpn.nlri.rt == ${r[0]}</code></td><td>${r[4]}</td><td><button class="fchip" data-rt="${r[0]}">${n} ▸</button></td></tr>`; }).join('') +
      '</tbody></table><div class="enc-note"><b>Data plane:</b> <code class="w-filter">vxlan.vni == 10010</code> bridged (L2VNI) · <code class="w-filter">vxlan.vni == 50001</code> routed (L3VNI). Note: the real field is <code>bgp.evpn.nlri.rt</code> — there is no <code>bgp.evpn.route_type</code>. Types 6–8 (IGMP sync, TRM) are not used in this lab.</div>';
    el.querySelectorAll('button[data-rt]').forEach(b => b.addEventListener('click', () => applyFilter('bgp.evpn.nlri.rt == ' + b.dataset.rt)));
  }

  /* ------------------------------------------------------------------ boot */
  document.querySelectorAll('#ws-tabs .wtab').forEach(b => b.addEventListener('click', () => switchWS(b.dataset.t)));
  document.querySelectorAll('#ws-chips .fchip').forEach(b => b.addEventListener('click', () => { S.filter = b.dataset.f; $('#ws-filter').value = S.filter; renderRows(); }));
  $('#ws-filter').addEventListener('input', e => { S.filter = e.target.value; renderRows(); });
  $('#ws-banner').addEventListener('click', () => focusWS(S.pendingEv));
  buildPalette(); renderTopo(); renderChapters(); renderEncap(null); renderHUD();
  S.cur = null; $('#term').innerHTML = '<div class="ln dim">Place a device, then click it to open its console.</div>';
  runChapterFlow(0);
})();

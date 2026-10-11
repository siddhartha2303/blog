/* Ambient motion, round 2. Plain JavaScript. One shared animation loop; scenes pause when off screen or when the tab is hidden. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = function () { return window.innerWidth < 769; };
  var scenes = [], last = 0, running = false;

  function loop(t) {
    if (document.hidden) { running = false; return; }
    requestAnimationFrame(loop);
    if (t - last < 33) return;                 // about 30 frames a second is plenty and keeps CPU low
    var dt = Math.min(0.06, (t - last) / 1000); last = t;
    scenes.forEach(function (s) { if (s.visible) s.step(dt); });
  }
  function kick() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  document.addEventListener('visibilitychange', kick);

  function fit(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c: c, w: r.width, h: r.height };
  }
  function watch(scene, el) {
    scene.visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { scene.visible = e[0].isIntersecting; }).observe(el);
    scenes.push(scene);
  }

  /* ---------- 1. banner: drifting node graph with light pulses ---------- */
  function initBanner() {
    var strip = document.querySelector('.net-strip'), cv = strip && strip.querySelector('.ns-canvas');
    if (!cv) return;
    var g, nodes = [], pulses = [], mouse = null, spawn = 0;
    var GOLD = '240,217,137', CREAM = '248,250,242', ORANGE = '255,150,90';
    function build() {
      g = fit(cv);
      var n = g.w < 520 ? 10 : 18; nodes = [];
      for (var i = 0; i < n; i++) {
        // icon nodes (chip, cloud, database, brain, packet) are spread over the right-hand part so they never sit under the headline
        var icn = i < 5, x = icn ? g.w * (g.w < 520 ? .1 + i * .19 : .50 + i * .095) : Math.random() * g.w;
        var y = icn && g.w < 520 ? g.h * (.80 + (i % 2) * .12) : Math.random() * g.h;
        nodes.push({ x: x, y: y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 10, r: 2 + Math.random() * 2, kind: icn ? i : -1 });
      }
      pulses = [];
    }
    function icon(c, k, x, y) {
      c.save(); c.translate(x, y); c.strokeStyle = 'rgba(' + GOLD + ',.95)'; c.fillStyle = 'rgba(47,61,44,.95)'; c.lineWidth = 1.4;
      if (k === 0) { c.fillRect(-7, -7, 14, 14); c.strokeRect(-7, -7, 14, 14); c.strokeRect(-3, -3, 6, 6); for (var j = -4; j <= 4; j += 4) { c.beginPath(); c.moveTo(j, -7); c.lineTo(j, -10); c.moveTo(j, 7); c.lineTo(j, 10); c.stroke(); } }
      else if (k === 1) { c.beginPath(); c.arc(-4, 1, 4.5, Math.PI * .5, Math.PI * 1.5); c.arc(1, -3, 5, Math.PI, Math.PI * 2); c.arc(6, 1, 4, Math.PI * 1.5, Math.PI * .5); c.closePath(); c.fill(); c.stroke(); }
      else if (k === 2) { c.beginPath(); c.moveTo(-8, -5); c.lineTo(-8, 5); c.ellipse(0, 5, 8, 3, 0, Math.PI, 0, true); c.lineTo(8, -5); c.ellipse(0, -5, 8, 3, 0, 0, Math.PI * 2, true); c.fill(); c.stroke(); }
      else if (k === 3) { c.beginPath(); for (var a = 0; a < 3; a++) { c.moveTo(-8, -6 + a * 6); c.lineTo(0, 0); c.lineTo(8, -6 + a * 6); } c.stroke(); [-8, 8].forEach(function (px) { for (var b = 0; b < 3; b++) { c.beginPath(); c.arc(px, -6 + b * 6, 2, 0, 7); c.fill(); c.stroke(); } }); c.beginPath(); c.arc(0, 0, 2.2, 0, 7); c.fill(); c.stroke(); }
      else { c.beginPath(); c.rect(-7, -5, 14, 10); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-7, -5); c.lineTo(0, 1); c.lineTo(7, -5); c.stroke(); }
      c.restore();
    }
    function draw() {
      var c = g.c, link = Math.min(150, Math.max(90, g.w * .16));
      c.clearRect(0, 0, g.w, g.h);
      var pairs = [];
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) { pairs.push([i, j]); c.strokeStyle = 'rgba(' + CREAM + ',' + (0.30 * (1 - d / link)).toFixed(3) + ')'; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      }
      pulses.forEach(function (p) {
        var a = nodes[p.a], b = nodes[p.b], x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        var gr = c.createRadialGradient(x, y, 0, x, y, 11); gr.addColorStop(0, 'rgba(' + p.col + ',.95)'); gr.addColorStop(1, 'rgba(' + p.col + ',0)');
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill();
        c.fillStyle = 'rgb(' + p.col + ')'; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill();
      });
      nodes.forEach(function (n) {
        if (n.kind >= 0) icon(c, n.kind, n.x, n.y);
        else { c.fillStyle = 'rgba(' + GOLD + ',.9)'; c.beginPath(); c.arc(n.x, n.y, n.r, 0, 7); c.fill(); c.fillStyle = 'rgba(' + GOLD + ',.16)'; c.beginPath(); c.arc(n.x, n.y, n.r + 4, 0, 7); c.fill(); }
      });
      return pairs;
    }
    function step(dt) {
      nodes.forEach(function (n) {
        if (mouse) { var dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy); if (d < 140 && d > 1) { n.vx += dx / d * 18 * dt; n.vy += dy / d * 18 * dt; } }
        n.vx *= (1 - .25 * dt); n.vy *= (1 - .25 * dt);
        var sp = Math.hypot(n.vx, n.vy);
        if (sp < 5) { n.vx += (Math.random() - .5) * 60 * dt; n.vy += (Math.random() - .5) * 60 * dt; }
        if (sp > 26) { n.vx *= 26 / sp; n.vy *= 26 / sp; }
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 10) { n.x = 10; n.vx = Math.abs(n.vx); } if (n.x > g.w - 10) { n.x = g.w - 10; n.vx = -Math.abs(n.vx); }
        if (n.y < 12) { n.y = 12; n.vy = Math.abs(n.vy); } if (n.y > g.h - 12) { n.y = g.h - 12; n.vy = -Math.abs(n.vy); }
      });
      var pairs = draw();
      spawn -= dt;
      if (spawn <= 0 && pairs.length && pulses.length < 7) {
        var pr = pairs[Math.floor(Math.random() * pairs.length)], f = Math.random() < .5;
        pulses.push({ a: f ? pr[0] : pr[1], b: f ? pr[1] : pr[0], t: 0, col: [GOLD, CREAM, ORANGE][Math.floor(Math.random() * 3)] }); spawn = .35 + Math.random() * .5;
      }
      pulses = pulses.filter(function (p) { p.t += dt * .9; return p.t < 1; });
    }
    build();
    watch({ step: step }, strip);
    if (reduce) { for (var k = 0; k < 40; k++) step(.05); pulses = []; draw(); }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (reduce) draw(); }, 200); });
    strip.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    strip.addEventListener('pointerleave', function () { mouse = null; });
  }

  /* ---------- 2. rotating keyword in the banner ---------- */
  function initRotator() {
    var el = document.querySelector('.ns-rot'); if (!el || reduce) return;
    var words = el.getAttribute('data-words').split(','), i = 0;
    setInterval(function () {
      if (document.hidden) return;
      el.classList.add('out');
      setTimeout(function () { i = (i + 1) % words.length; el.textContent = words[i]; el.classList.remove('out'); }, 360);
    }, 2400);
  }

  /* ---------- 3. page background: faint drifting dots and lines behind everything (desktop only) ---------- */
  function initBackground() {
    if (phone()) return;
    var al = document.createElement('div'); al.className = 'amb-aurora'; al.setAttribute('aria-hidden', 'true'); al.innerHTML = '<i></i><i></i><i></i>';
    var cv = document.createElement('canvas'); cv.className = 'amb-bg'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild); document.body.insertBefore(al, document.body.firstChild);
    var g, dots = [];
    function build() {
      g = fit(cv); var n = Math.min(70, Math.round(g.w * g.h / 24000)); dots = [];
      for (var i = 0; i < n; i++) dots.push({ x: Math.random() * g.w, y: Math.random() * g.h, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9 });
    }
    function draw() {
      var c = g.c; c.clearRect(0, 0, g.w, g.h);
      for (var i = 0; i < dots.length; i++) {
        var a = dots[i];
        for (var j = i + 1; j < dots.length; j++) { var b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 130) { c.strokeStyle = 'rgba(47,61,44,' + (0.19 * (1 - d / 130)).toFixed(3) + ')'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
        c.fillStyle = 'rgba(47,61,44,.32)'; c.beginPath(); c.arc(a.x, a.y, 1.8, 0, 7); c.fill();
      }
    }
    function step(dt) {
      dots.forEach(function (d) { d.x += d.vx * dt; d.y += d.vy * dt; if (d.x < 0) d.x = g.w; if (d.x > g.w) d.x = 0; if (d.y < 0) d.y = g.h; if (d.y > g.h) d.y = 0; });
      draw();
    }
    build(); draw();
    var s = { step: step, visible: true }; scenes.push(s);
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () {
        if (phone()) { s.visible = false; cv.style.display = al.style.display = 'none'; }
        else { cv.style.display = al.style.display = ''; build(); s.visible = true; draw(); }
      }, 200);
    });
    // gentle parallax: the glow blobs move a little slower than the page
    if (!reduce) { var tk = false; window.addEventListener('scroll', function () { if (tk) return; tk = true; setTimeout(function () { tk = false; al.style.transform = 'translateY(' + (-window.scrollY * 0.06).toFixed(1) + 'px)'; }, 33); }, { passive: true }); }
  }

  /* ---------- 4. card spotlight follows the pointer ---------- */
  function initSpotlight() {
    if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.home-posts .post, .home-rail .rail-card'); if (!t) return;
      var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- 5. topic marquee under the banner ---------- */
  function initMarquee() {
    var strip = document.querySelector('.net-strip'), links = document.querySelectorAll('.topic-list a'); if (!strip || !links.length) return;
    var box = document.createElement('div'); box.className = 'amb-marquee'; box.setAttribute('aria-label', 'Topics');
    var tr = document.createElement('div'); tr.className = 'amb-track';
    // two identical halves, so moving the track by 50% loops without a jump
    for (var half = 0; half < 2; half++) for (var rep = 0; rep < 3; rep++) links.forEach(function (a) {
      var c = a.cloneNode(true); c.className = ''; if (half || rep) { c.tabIndex = -1; c.setAttribute('aria-hidden', 'true'); } tr.appendChild(c);
    });
    box.appendChild(tr); strip.parentNode.insertBefore(box, strip.nextSibling);
  }

  /* ---------- 6. post pages: a calm wave band above the title (slow, low contrast, away from the text) ---------- */
  function initPostHero() {
    var head = document.querySelector('.header-page'); if (!head) return;
    var cv = document.createElement('canvas'); cv.className = 'amb-post-hero'; cv.setAttribute('aria-hidden', 'true');
    head.parentNode.insertBefore(cv, head);
    var g, t = 0, bits = [];
    function build() {
      g = fit(cv); bits = [];
      for (var i = 0; i < 14; i++) bits.push({ x: Math.random() * g.w, y: Math.random() * g.h, v: 3 + Math.random() * 5, r: 1 + Math.random() * 1.6 });
    }
    function draw() {
      var c = g.c; c.clearRect(0, 0, g.w, g.h);
      var layers = [['rgba(47,61,44,.16)', .55, .9, 10, 0], ['rgba(214,180,95,.30)', .62, 1.3, 8, 2], ['rgba(70,120,70,.20)', .7, .7, 7, 4]];
      layers.forEach(function (L) {
        c.fillStyle = L[0]; c.beginPath(); c.moveTo(0, g.h);
        for (var x = 0; x <= g.w; x += 8) c.lineTo(x, g.h * L[1] + Math.sin(x / (g.w / (3 + L[4])) * 2 + t * L[2] + L[4]) * L[3] + Math.sin(x / 90 + t * .6) * 3);
        c.lineTo(g.w, g.h); c.closePath(); c.fill();
      });
      bits.forEach(function (b) { c.fillStyle = 'rgba(214,160,60,.55)'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); });
    }
    function step(dt) { t += dt * .8; bits.forEach(function (b) { b.y -= b.v * dt; b.x += Math.sin(t + b.v) * .15; if (b.y < -4) { b.y = g.h + 4; b.x = Math.random() * g.w; } }); draw(); }
    build(); draw(); watch({ step: step }, cv);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(); }, 200); });
  }

  function start() {
    [initBanner, initRotator, initBackground, initSpotlight, initMarquee, initPostHero].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn('ambient:', e); } });
    kick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

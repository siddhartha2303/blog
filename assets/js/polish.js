/* Visual polish, round 1. Plain JavaScript, no libraries. Every part is optional: if anything fails, the page still works. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. scroll reveal ---------- */
  function initReveal() {
    var sel = '.home-posts .post, .home-rail .rail-card, .net-strip, .post-rail-card, .page-footer, .comment-box, .next-post-wrap';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) return;               // leave everything visible
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('rv-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(function (el, i) { el.classList.add('rv'); el.style.setProperty('--d', ((i % 4) * 0.07).toFixed(2) + 's'); io.observe(el); });
  }

  /* ---------- 2. reading-progress bar on posts ---------- */
  function initProgress() {
    var body = document.querySelector('.post-body');
    if (!body) return;
    var bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
    var fill = bar.firstChild, ticking = false;
    function update() {
      ticking = false;
      var r = body.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.1) / total)) : 1;
      fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function onScroll() { if (!ticking) { ticking = true; setTimeout(update, 16); } }   // throttled to ~60 updates a second
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- 3. network strip: pause the packets when off screen or when motion is reduced ---------- */
  function initStrip() {
    var svg = document.querySelector('.net-strip .ns-art');
    if (!svg || !svg.pauseAnimations) return;
    if (reduce) { svg.pauseAnimations(); try { svg.setCurrentTime(1.2); } catch (e) { /* ignore */ } return; }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) { en[0].isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations(); }).observe(svg);
  }

  /* ---------- 4. comment box: sent privately by email through a form service ---------- */
  function initComments() {
    var form = document.getElementById('cb-form');
    if (!form) return;
    var status = form.querySelector('.cb-status'), btn = form.querySelector('.cb-btn'), btnT = form.querySelector('.cb-btn-t');
    var area = form.querySelector('textarea'), count = form.querySelector('.cb-count');
    function say(msg, ok) { status.textContent = msg; status.className = 'cb-status ' + (ok ? 'cb-ok' : 'cb-err'); }
    area.addEventListener('input', function () { count.textContent = area.value.length + ' / 2000'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = area.value.trim();
      if (msg.length < 3) { say('Please write a short comment first.', false); area.focus(); return; }
      var last = 0; try { last = +localStorage.getItem('cb-last') || 0; } catch (x) { /* storage blocked */ }
      if (Date.now() - last < 30000) { say('Please wait a few seconds before sending another comment.', false); return; }
      var data = {
        name: form.name.value.trim() || '(not given)',
        email: form.email.value.trim() || '(not given)',
        message: msg,
        post: form.getAttribute('data-title'),
        link: form.getAttribute('data-url'),
        _subject: 'Blog comment on: ' + form.getAttribute('data-title'),
        _template: 'table', _captcha: 'false',
        _honey: form._honey.value
      };
      if (data._honey) { say('Thank you! Your comment was sent.', true); return; }   // a bot filled the hidden field: pretend it worked
      var to; try { to = atob(form.getAttribute('data-t')); } catch (x) { say('Sorry, the comment box is not available right now.', false); return; }
      btn.disabled = true; btnT.textContent = 'Sending…'; status.textContent = ''; status.className = 'cb-status';
      fetch('https://formsubmit.co/ajax/' + to, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          if (d && (d.success === true || d.success === 'true')) {
            say('Thank you! Your comment was sent to the author.', true); form.reset(); count.textContent = '0 / 2000';
            try { localStorage.setItem('cb-last', String(Date.now())); } catch (x) { /* ignore */ }
          } else { say('Sorry, that did not go through. Please try again in a moment.', false); }
        })
        .catch(function () { say('Could not reach the server. Please check your connection and try again.', false); })
        .then(function () { btn.disabled = false; btnT.textContent = 'Send comment'; });
    });
  }

  function start() {
    var steps = [initReveal, initProgress, initStrip, initComments];
    steps.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn('polish:', e); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

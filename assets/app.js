/* 「믿음은 ······이다」 40일 — 앱 */
(function () {
  'use strict';
  var CFG = window.FAITH_CFG || {};
  var API = CFG.api || '';
  var DAYS = window.DAYS || [], J = window.JOURNEYS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LS = { get: function (k, d) { try { var v = localStorage.getItem('faith40.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set: function (k, v) { try { localStorage.setItem('faith40.' + k, JSON.stringify(v)); } catch (e) {} } };
  var token = LS.get('token', null);
  if (!token) { token = Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('token', token); }
  var feed = { confessions: [], prayers: [], stats: {} , loaded: false};
  var seen = {};

  /* 글자 크기 */
  function applyFs() { document.documentElement.style.setProperty('--fs', LS.get('fs', 1)); }
  applyFs();
  window.toggleFs = function () { var v = LS.get('fs', 1); v = v >= 1.24 ? 1 : +(v + 0.12).toFixed(2); LS.set('fs', v); applyFs(); toast(v > 1 ? '글자를 크게 했습니다' : '글자 크기를 되돌렸습니다'); };

  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  /* 서버 */
  function call(action, data) {
    if (!API) return Promise.resolve({ ok: false, error: 'noapi' });
    var body = Object.assign({ action: action, token: token }, data || {});
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'network' }; });
  }
  function loadFeed() {
    return call('feed', {}).then(function (r) {
      if (!r.ok) { feed.loaded = true; renderLive(); return; }
      var fresh = {};
      (r.confessions || []).forEach(function (c) { if (feed.loaded && !seen['c' + c.id]) fresh['c' + c.id] = 1; seen['c' + c.id] = 1; });
      feed.confessions = r.confessions || []; feed.prayers = r.prayers || []; feed.stats = r.stats || {}; feed.loaded = true; feed.fresh = fresh;
      renderLive();
    });
  }
  setInterval(function () { if (!document.hidden) loadFeed(); }, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) loadFeed(); });

  /* 나의 40일 */
  function startDate() { return LS.get('start', null); }
  function myDay() {
    var s = startDate(); if (!s) return 1;
    var d0 = new Date(s + 'T00:00:00'); var n = Math.floor((new Date() - d0) / 86400000) + 1;
    return Math.max(1, Math.min(40, n));
  }
  function done() { return LS.get('done', {}); }
  function setDone(d, v) { var o = done(); if (v) o[d] = Date.now(); else delete o[d]; LS.set('done', o); }
  function startToday() { var t = new Date(); var iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); LS.set('start', iso); call('start', {}); }

  /* 공통 조각 */
  function pastorWall() {
    return DAYS.map(function (d) { return { pastor: true, text: d.heading, name: '박대성 목사', day: d.day, src: d.src_short }; });
  }
  function cfHTML(c, isNew) {
    return '<div class="cf' + (c.pastor ? ' pastor' : '') + (isNew ? ' new' : '') + '"><div class="w">믿음은</div><div class="s">' + esc(c.text) + '</div>' +
      '<div class="m"><span>' + (c.pastor ? '<b>' + esc(c.name) + '</b>' : esc(c.name || '함께 걷는 이')) + '</span><span>' + (c.pastor ? 'DAY ' + String(c.day).padStart(2, '0') : ago(c.ts)) + '</span></div></div>';
  }
  function ago(ts) { if (!ts) return ''; var s = (Date.now() - ts) / 1000; if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전'; return Math.floor(s / 86400) + '일 전'; }
  function prHTML(p) {
    var mine = LS.get('prayed', {})[p.id];
    return '<div class="pr"><div class="tx">' + esc(p.text) + '</div>' + (p.answered ? '<div class="note" style="color:var(--gold)">응답의 소식 ' + esc(p.note || '') + '</div>' : '') +
      '<div class="ft"><span>' + esc(p.name || '이름 없이') + ' · ' + ago(p.ts) + '</span><button class="prayb' + (mine ? ' done' : '') + '" data-pray="' + esc(p.id) + '">🙏 <span>' + (mine ? '함께 기도했어요' : '기도할게요') + '</span> <span class="c">' + (p.prayed || 0) + '</span></button></div></div>';
  }
  function renderLive() {
    var st = feed.stats || {};
    $$('[data-stat]').forEach(function (el) { var k = el.getAttribute('data-stat'); var v = k === 'confessions' ? (feed.confessions.length) : (st[k] || 0); var box = el.parentNode; box.classList.toggle('z', !v); countTo(el, v); });
    var lv = $('.live'); if (lv) { var any = $$('[data-stat]').some(function (el) { return !el.parentNode.classList.contains('z'); }); lv.querySelector('.first').textContent = any ? '지금 함께하는 중' : '오늘 첫 걸음을 함께 내딛어 주세요'; }
    var w = $('#wallList');
    if (w) {
      var items = feed.confessions.map(function (c) { return cfHTML(c, feed.fresh && feed.fresh['c' + c.id]); });
      var pw = pastorWall().slice(0, Math.max(6, 18 - items.length)).map(function (c) { return cfHTML(c); });
      w.innerHTML = items.concat(pw).join('');
    }
    var pl = $('#prayList');
    if (pl) pl.innerHTML = feed.prayers.length ? feed.prayers.map(prHTML).join('') : '<div class="empty" style="grid-column:1/-1">아직 공개된 기도 제목이 없습니다.<br>첫 기도 제목을 나눠 주세요. 이름 없이 올릴 수 있고, 목회자에게만 보낼 수도 있습니다.</div>';
    window.__rotPool = feed.confessions.map(function (c) { return c.text; }).concat(headPool()).filter(function (t) { return t && t.length <= 22; });
  }
  function headPool() { return DAYS.map(function (d) { return d.heading; }).filter(function (h) { return /이다$/.test(h); }).map(function (h) { return h.replace(/이다$/, ''); }); }
  function countTo(el, v) {
    var from = Number(el.textContent.replace(/[^\d]/g, '')) || 0; if (from === v) { el.textContent = v.toLocaleString(); return; }
    var t0 = performance.now(), dur = 900;
    (function step(t) { var p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (v - from) * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(step); })(t0);
  }

  /* 화면들 */
  var V = {};
  V.home = function () {
    var d = DAYS[myDay() - 1] || DAYS[0], jj = J[d.journey];
    return '' +
    '<header class="hero"><div class="bg" style="background-image:url(' + CFG.hero + ')"></div><div class="in wrap">' +
      '<div class="eyebrow" style="color:#f3e3c2;opacity:.9">40 DAYS · 매일 한 문장</div>' +
      '<h1 style="margin-top:18px">믿음은<span class="line2"><span class="rot" id="rot">길이 보이지 않을 때 내딛는 한 걸음<span class="ida">이다</span></span></span></h1>' +
      '<p class="sub">매일 한 문장으로 발견하고, 삶으로 완성하는 40일</p>' +
      '<p class="who">박대성 목사 · 베다니 한인연합감리교회' + (CFG.photoCredit ? ' · 사진 ' + CFG.photoCredit : '') + '</p>' +
      '<div class="cta"><a class="btn primary" href="#/day/' + myDay() + '">' + (startDate() ? 'DAY ' + String(myDay()).padStart(2, '0') + ' 이어서 묵상하기' : '오늘, 첫날 시작하기') + ' →</a><a class="btn ghost" href="#/wall">고백의 벽 보기</a></div>' +
      '<div class="live"><span><span class="pulse"></span><span class="first">지금 함께하는 중</span></span><span><b data-stat="walkers">0</b>명이 40일을 걷고 있습니다</span><span><b data-stat="prayed">0</b>번 함께 기도했습니다</span><span><b data-stat="confessions">0</b>개의 고백</span></div>' +
    '</div><div class="scrollcue">SCROLL</div></header>' +

    '<section class="blk"><div class="wrap"><div class="eyebrow reveal">오늘의 한 문장</div><h2 class="h2 reveal" style="margin-top:14px">하루 십오 분,<br>한 문장 앞에 머뭅니다.</h2>' +
      '<p class="lead reveal">말씀을 읽고, 목사님의 묵상을 듣고, 오늘 나에게 주시는 질문 앞에 섭니다. 그리고 작은 실천 하나로 하루를 삽니다.</p>' +
      '<div class="today reveal"><div class="ph" style="background-image:url(' + jj.photo + ')"></div><div class="tx"><div class="day">DAY ' + String(d.day).padStart(2, '0') + ' · ' + esc(jj.no) + '</div>' +
      '<div class="q1">믿음은</div><div class="q2">' + esc(d.heading) + '</div><div class="vs">' + esc(d.verse_text) + '<br><span style="color:var(--gold);font-size:13px">' + esc(d.verse_ref) + '</span></div>' +
      '<div class="go"><a class="btn ink" href="#/day/' + d.day + '">오늘의 묵상 열기 →</a></div></div></div></div></section>' +

    '<section class="blk" style="padding-top:0"><div class="wrap"><div class="eyebrow reveal">여섯 개의 여정</div><h2 class="h2 reveal" style="margin-top:14px">믿음의 여러 얼굴을<br>40일 동안 만납니다.</h2>' +
      '<p class="lead reveal">여기 담긴 마흔 개의 문장은 믿음 전체를 설명하는 정의가 아니라, 믿음의 한 측면을 비추는 묵상의 문장입니다.</p>' +
      '<div class="jgrid">' + J.map(function (x, i) { var ds = DAYS.filter(function (d) { return d.journey === i; }); var dn = ds.filter(function (d) { return done()[d.day]; }).length;
        return '<a class="jcard reveal" href="#/journey"><div class="bg" style="background-image:url(' + x.photo + ')"></div><div class="t"><div class="n">' + esc(x.no) + ' · DAY ' + String(ds[0].day).padStart(2, '0') + '–' + String(ds[ds.length - 1].day).padStart(2, '0') + '</div><h3>' + esc(x.title) + '</h3><div class="k">' + esc(x.keys) + '</div><div class="bar"><i style="width:' + Math.round(dn / ds.length * 100) + '%"></i></div></div></a>'; }).join('') + '</div></div></section>' +

    '<section class="blk dark"><div class="wrap"><div class="eyebrow reveal">고백의 벽 · 실시간</div><h2 class="h2 reveal" style="margin-top:14px;color:#fff">“나의 믿음은 ______이다”</h2>' +
      '<p class="lead reveal">미국과 한국, 각자의 자리에서 40일을 걷는 이들이 오늘의 고백을 남깁니다. 새 고백은 15초마다 이 벽에 도착합니다.</p>' + composeHTML() +
      '<div class="wall" id="wallList"></div><div style="margin-top:20px"><a class="btn ghost" href="#/wall">고백 모두 보기 →</a></div></div></section>' +

    '<section class="blk"><div class="wrap two"><div><div class="eyebrow reveal">함께 기도</div><h2 class="h2 reveal" style="margin-top:14px">혼자 짊어지지<br>마십시오.</h2><p class="lead reveal">기도 제목은 이름 없이 나눌 수 있고, 목회자에게만 보낼 수도 있습니다. 누군가 기도하면 그 숫자가 함께 올라갑니다.</p><div class="cta" style="margin-top:22px"><a class="btn ink" href="#/pray">기도 제목 나누기</a></div></div>' +
      '<div class="pgrid" id="prayList" style="grid-template-columns:1fr;margin-top:0"></div></div></section>' +

    aboutTeaser() + footerHTML();
  };
  function composeHTML(day) {
    return '<form class="compose reveal" data-confess="' + (day || '') + '"><span class="pre">믿음은</span><input name="text" maxlength="60" placeholder="오늘 내가 발견한 한 문장" required><span class="post">이다</span><input class="nm" name="name" maxlength="20" placeholder="이름 또는 별칭"><input type="text" name="hp" tabindex="-1" autocomplete="off" style="display:none"><button class="btn" type="submit">고백 올리기</button></form><p class="note">한 줄 고백은 바로 벽에 올라갑니다. 연락처·주소·링크가 들어간 글은 관리자가 확인한 뒤 공개됩니다.</p>';
  }
  function aboutTeaser() {
    return '<section class="blk dark" style="padding-bottom:clamp(72px,11vw,140px)"><div class="wrap two"><div><div class="eyebrow reveal">말씀을 전하는 사람</div><h2 class="h2 reveal" style="margin-top:14px;color:#fff">잊힌 이름을<br>찾아가는 목사</h2>' +
      '<p class="lead reveal">아무도 찾지 않던 볼티모어의 한 무덤, 펜실베이니아 시골의 오래된 집. 박대성 목사는 한국 교회에 복음을 전한 이들의 흔적을 찾아 기억해 왔습니다. 그 기억이 이 40일의 문장들 뒤에 있습니다.</p>' +
      '<div class="cta" style="margin-top:24px"><a class="btn primary" href="#/about">이야기 읽기 →</a></div></div>' +
      '<div class="reveal" style="border-radius:24px;overflow:hidden;min-height:360px;background:url(' + CFG.aboutPhoto + ') center/cover"></div></div></section>';
  }
  function footerHTML() {
    return '<footer><div class="wrap two"><div><b>믿음은 ······이다</b><br>매일 한 문장으로 발견하고, 삶으로 완성하는 40일<br>말씀 박대성 목사' + (CFG.photoCredit ? ' · 사진 ' + CFG.photoCredit : '') + '</div>' +
      '<div><b>베다니 한인연합감리교회</b><br>8971 Chapel Ave, Ellicott City, MD 21043<br><a href="https://bethanykumc.org" target="_blank" rel="noopener">bethanykumc.org</a> · <a href="https://www.youtube.com/@bethanykumc" target="_blank" rel="noopener">YouTube @bethanykumc</a><br>' +
      '<span style="opacity:.7">성경 본문: 성경전서 개역개정판 © 대한성서공회 1998. 사용 허락 확인 중 · 나의 묵상 기록은 이 기기 안에만 저장됩니다.</span></div></div></footer>';
  }

  V.day = function (n) {
    n = Math.max(1, Math.min(40, n | 0));
    var d = DAYS[n - 1], jj = J[d.journey], key = d.key || [];
    var body = d.body.map(function (p) {
      var sens = p.replace(/([.?!”])\s+/g, '$1\u0001').split('\u0001');
      return '<p>' + sens.map(function (s) { return key.indexOf(s) >= 0 ? '<strong>' + esc(s) + '</strong>' : esc(s); }).join(' ') + '</p>';
    }).join('');
    var j = LS.get('journal', {})[n] || '';
    var chk = !!LS.get('practice', {})[n];
    return '<div class="dayv"><div class="dhead"><div class="bg" style="background-image:url(' + jj.photo + ')"></div><div class="in wrap"><div class="eyebrow" style="color:#f3e3c2">' + esc(jj.no) + '</div><div class="serif" style="font-size:clamp(20px,2.4vw,28px);margin-top:8px;font-weight:600">' + esc(jj.title) + '</div></div></div>' +
      '<div class="wrap"><div class="article"><div class="dnav"><a href="#/day/' + Math.max(1, n - 1) + '">← 이전</a><span>DAY <b style="color:var(--ink)">' + String(n).padStart(2, '0') + '</b> / 40</span><a href="#/day/' + Math.min(40, n + 1) + '">다음 →</a></div>' +
      '<div class="q1">믿음은</div><h1>' + esc(d.heading) + '</h1>' +
      '<div class="verse"><p>' + esc(d.verse_text) + '</p><div class="ref">' + esc(d.verse_ref) + ' · 개역개정</div></div>' +
      '<div class="sec-lab">말씀을 묵상하다</div><div class="body">' + body + '</div>' +
      '<div class="listen"><button class="btn line" data-yt="' + esc(d.vid) + '" data-t="' + d.t + '">▶ 목사님 목소리로 듣기</button><a class="btn line" href="#/audio/' + (d.journey + 1) + '">♪ ' + esc(jj.no) + ' 오디오</a></div><div class="yt" id="yt"></div>' +
      '<div class="sec-lab">오늘 나에게 주시는 질문</div><div class="qcard"><p>' + esc(d.question) + '</p>' + (d.question_by === '목사님' ? '<small>박대성 목사</small>' : '') + '</div>' +
      '<div class="sec-lab">오늘의 작은 실천</div><label class="practice"><input type="checkbox" data-practice="' + n + '"' + (chk ? ' checked' : '') + '><p>' + esc(d.practice) + '</p></label>' +
      '<div class="sec-lab">한 문장 필사</div><div class="pilsa"><div class="guide">믿음은 ' + esc(d.heading) + '</div><canvas data-pilsa="' + n + '"></canvas></div><div class="ptools"><span>손가락이나 펜으로 천천히 따라 써 보십시오</span><span><button class="btn line" data-pclear="' + n + '">지우기</button> <button class="btn ink" data-psave="' + n + '">필사 저장</button></span></div>' +
      '<div class="sec-lab">나의 묵상</div><div class="journal"><textarea data-journal="' + n + '" placeholder="마음에 남은 한 문장, 오늘의 묵상, 감사한 것을 적어 보십시오.">' + esc(j) + '</textarea><div class="st"><span id="jst">' + (j ? '이 기기에 저장되어 있습니다' : '쓰는 대로 이 기기에 저장됩니다') + '</span><a href="#/me">나의 기록 모아 보기 →</a></div></div>' +
      (d.prayer ? '<div class="sec-lab">' + (d.prayer_kind === '축원' ? '목사님의 축원' : d.prayer_kind === '고백' ? '오늘의 고백' : '오늘의 기도') + '</div><div class="prayer">' + esc(d.prayer) + '</div>' : '') +
      '<div class="sec-lab">오늘의 고백 나누기</div><div class="share"><form class="row" data-confess="' + n + '"><span>믿음은</span><input name="text" maxlength="60" placeholder="나의 한 문장" required><span>이다</span><input name="name" maxlength="20" placeholder="이름·별칭" style="flex:0 0 110px;min-width:90px;font-family:var(--sans);font-size:15px"><input type="text" name="hp" tabindex="-1" autocomplete="off" style="display:none"><button class="btn" type="submit">나누기</button></form></div>' +
      '<div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn ink" data-done="' + n + '">' + (done()[n] ? '✓ 오늘의 묵상을 마쳤습니다' : '오늘의 묵상 마치기') + '</button>' + (n < 40 ? '<a class="btn line" href="#/day/' + (n + 1) + '">DAY ' + String(n + 1).padStart(2, '0') + ' 미리 보기</a>' : '<a class="btn line" href="#/me">나의 믿음은 ___이다 쓰기</a>') + '</div>' +
      '<div class="src">말씀 출처 · ' + esc(d.src) + '<br>본문은 목사님 설교와 아침 묵상의 육성을 글로 옮긴 것입니다.' + (d.practice_by === '엮은이' ? ' 작은 실천은 목사님 말씀을 바탕으로 제안한 것입니다.' : '') + '</div>' +
      '</div></div></div>' + footerHTML();
  };

  V.audio = function (k) {
    k = Math.max(1, Math.min(J.length, k | 0)); var x = J[k - 1]; var ds = DAYS.filter(function (d) { return d.journey === k - 1; });
    return '<div class="dayv"><div class="dhead"><div class="bg" style="background-image:url(' + x.photo + ')"></div><div class="in wrap"><div class="eyebrow" style="color:#f3e3c2">' + esc(x.no) + ' · 여정 오디오</div><div class="serif" style="font-size:clamp(22px,2.6vw,32px);margin-top:8px;font-weight:700">' + esc(x.title) + '</div></div></div>' +
      '<div class="wrap"><div class="article"><div class="qcard" style="margin-top:28px"><p>이 여정의 오디오를 준비하고 있습니다.</p><small>목사님의 육성으로 듣는 여정 묵상이 이 자리에 열립니다. 그동안은 날마다의 묵상에서 ‘목사님 목소리로 듣기’를 눌러 설교의 그 대목을 들으실 수 있습니다.</small></div>' +
      '<div class="sec-lab">이 여정의 날들</div><div class="jrow"><ol>' + ds.map(function (d) { return '<li><a href="#/day/' + d.day + '"><span class="d">DAY ' + String(d.day).padStart(2, '0') + '</span><span class="h"><em>믿음은</em> ' + esc(d.heading) + '</span></a></li>'; }).join('') + '</ol></div>' +
      '<div class="cta" style="margin-top:24px">' + J.map(function (y, i) { return '<a class="btn ' + (i === k - 1 ? 'ink' : 'line') + '" href="#/audio/' + (i + 1) + '">' + esc(y.no) + '</a>'; }).join('') + '</div></div></div></div>' + footerHTML();
  };

  V.journey = function () {
    var dn = done(), today = myDay();
    return '<div class="dayv"><div class="wrap" style="padding-top:30px"><div class="eyebrow">40일 지도</div><h1 class="h2" style="margin-top:12px">여섯 여정, 마흔 개의 문장</h1>' +
      '<p class="lead">' + (startDate() ? '시작한 날 ' + startDate() + ' · 오늘은 DAY ' + today + '입니다.' : '아직 시작하지 않았습니다. 어느 날이든 시작한 날이 DAY 01입니다.') + '</p>' +
      '<div class="map">' + DAYS.map(function (d) { return '<a href="#/day/' + d.day + '" class="' + (dn[d.day] ? 'done ' : '') + (startDate() && d.day === today ? 'today' : '') + '">' + d.day + '</a>'; }).join('') + '</div>' +
      '<div class="jlist">' + J.map(function (x, i) {
        return '<div class="jrow"><div class="eyebrow">' + esc(x.no) + '</div><h3 style="margin-top:6px">' + esc(x.title) + '</h3><div class="k">' + esc(x.keys) + '</div><ol>' +
          DAYS.filter(function (d) { return d.journey === i; }).map(function (d) { return '<li><a href="#/day/' + d.day + '"><span class="d">DAY ' + String(d.day).padStart(2, '0') + '</span><span class="h"><em>믿음은</em> ' + esc(d.heading) + '</span>' + (dn[d.day] ? '<span class="ok">완료</span>' : '') + '</a></li>'; }).join('') + '</ol></div>';
      }).join('') + '</div></div></div>' + footerHTML();
  };

  V.wall = function () {
    return '<section class="blk dark" style="min-height:100vh;padding-top:120px"><div class="wrap"><div class="eyebrow">고백의 벽 · 실시간</div><h1 class="h2" style="margin-top:14px;color:#fff">믿음은 ______이다</h1><p class="lead">함께 40일을 걷는 이들의 한 문장입니다. 목사님의 마흔 문장도 함께 걸려 있습니다.</p>' + composeHTML() + '<div class="wall" id="wallList"></div></div></section>' + footerHTML();
  };

  V.pray = function () {
    return '<div class="dayv"><div class="wrap" style="padding-top:30px"><div class="two"><div><div class="eyebrow">함께 기도</div><h1 class="h2" style="margin-top:12px">기도 제목을<br>나눠 주세요.</h1><p class="lead">공개로 나누면 이름 없이 올라가고, 관리자가 확인한 뒤 보입니다. 목회자에게만 보낸 기도 제목은 어디에도 공개되지 않습니다. 한 시즌이 끝나면 모든 기도 제목은 지웁니다.</p></div>' +
      '<form class="form" id="prayForm"><label>기도 제목</label><textarea name="text" maxlength="400" required placeholder="함께 기도해 주시기를 원하는 내용을 적어 주세요. 다른 사람의 실명이나 연락처는 적지 마세요."></textarea>' +
      '<label>어떻게 나눌까요?</label><div class="seg"><label><input type="radio" name="visibility" value="public" checked><span>이름 없이 공개<small>확인 후 ‘함께 기도’ 목록에 올라갑니다</small></span></label><label><input type="radio" name="visibility" value="pastor"><span>목회자에게만<small>공개되지 않습니다</small></span></label></div>' +
      '<label>이름 (선택)</label><input type="text" name="name" maxlength="20" placeholder="비워 두면 ‘이름 없이’로 표시됩니다">' +
      '<label>연락처 (선택 · 목회자에게만 전달)</label><input type="text" name="contact" maxlength="60" placeholder="기도 후 연락을 원하시면">' +
      '<input type="text" name="hp" tabindex="-1" autocomplete="off" style="display:none"><div style="margin-top:18px"><button class="btn ink" type="submit">기도 제목 보내기</button></div></form></div>' +
      '<div style="margin-top:56px"><div class="eyebrow">함께 드리는 기도</div><div class="pgrid" id="prayList"></div></div></div></div>' + footerHTML();
  };

  V.me = function () {
    var dn = done(), jr = LS.get('journal', {}), cnt = Object.keys(dn).length, pct = cnt / 40;
    var circ = 2 * Math.PI * 64;
    var list = DAYS.filter(function (d) { return jr[d.day]; }).map(function (d) { return '<div class="entry"><div class="d">DAY ' + String(d.day).padStart(2, '0') + '</div><div class="h">믿음은 ' + esc(d.heading) + '</div><p>' + esc(jr[d.day]) + '</p></div>'; }).join('');
    return '<div class="dayv"><div class="wrap" style="padding-top:30px"><div class="eyebrow">나의 40일</div><h1 class="h2" style="margin-top:12px">나의 기록</h1>' +
      '<div class="ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" stroke="#dcd2c1" stroke-width="8" fill="none"/><circle cx="75" cy="75" r="64" stroke="#1b1f27" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ * (1 - pct)) + '" transform="rotate(-90 75 75)"/><text x="75" y="72" text-anchor="middle" font-family="Noto Serif KR" font-size="30" font-weight="700" fill="#1b1f27">' + cnt + '</text><text x="75" y="96" text-anchor="middle" font-size="12" fill="#958c7b">/ 40일</text></svg>' +
      '<div><p class="serif" style="font-size:19px">' + (startDate() ? startDate() + '에 시작했습니다.' : '아직 시작하지 않았습니다.') + '</p><div class="cta" style="margin-top:14px"><button class="btn ink" data-start>' + (startDate() ? '오늘을 DAY 01로 다시 시작' : '오늘 시작하기') + '</button><button class="btn line" data-export>기록 내려받기</button><button class="btn line" onclick="window.print()">인쇄</button></div>' +
      '<p class="note" style="color:var(--mute)">기록은 이 기기의 브라우저 안에만 저장됩니다. 기기를 바꾸기 전에 ‘기록 내려받기’로 보관해 주세요.</p></div></div>' +
      '<div class="final"><div class="eyebrow" style="color:var(--gold2)">마지막 문장은 당신의 차례입니다</div><div class="big" style="margin-top:14px">나의 믿음은<br><input id="mine" maxlength="60" value="' + esc(LS.get('mine', '')) + '" placeholder="          "><br>이다</div><div class="cta" style="justify-content:center"><button class="btn primary" data-mine>저장하고 고백의 벽에 나누기</button></div></div>' +
      (function(){ var ps = LS.get('pilsa', {}); var ks = Object.keys(ps).sort(function(x,y){return x-y;}); return ks.length ? '<div class="eyebrow" style="margin-top:48px">나의 필사</div><div class="pgal">' + ks.map(function (k) { return '<a href="#/day/' + k + '"><img src="' + ps[k] + '" alt="DAY ' + k + ' 필사"><span>DAY ' + String(k).padStart(2,'0') + '</span></a>'; }).join('') + '</div>' : ''; })() + '<div class="eyebrow" style="margin-top:48px">나의 묵상</div><div class="entries">' + (list || '<div class="empty">아직 기록이 없습니다. 오늘의 묵상에서 ‘나의 묵상’을 적으면 여기에 모입니다.</div>') + '</div></div></div>' + footerHTML();
  };

  V.about = function () {
    var A = window.ABOUT || {};
    return '<div class="about-hero"><div class="bg" style="background-image:url(' + CFG.aboutPhoto + ')"></div><div class="in wrap"><div class="eyebrow" style="color:#f3e3c2">말씀을 전하는 사람</div><h1 class="h2" style="margin-top:14px;color:#fff">박대성 목사</h1><p class="lead" style="color:#e9e1d1">' + esc(A.lead || '') + '</p></div></div>' +
      '<section class="blk"><div class="wrap two"><div><div class="eyebrow">기억하는 믿음</div><p class="quote" style="margin-top:16px">' + esc(A.quote || '') + '</p><p class="note" style="color:var(--mute);margin-top:10px">' + esc(A.quoteSrc || '') + '</p></div>' +
      '<div class="tl">' + (A.timeline || []).map(function (t) { return '<div class="it"><div class="y">' + esc(t.y) + '</div><h4>' + esc(t.h) + '</h4><p>' + esc(t.p) + '</p>' + (t.s ? '<div class="s">' + esc(t.s) + '</div>' : '') + '</div>'; }).join('') + '</div></div></section>' +
      '<section class="blk" style="padding-top:0"><div class="wrap"><p class="note" style="color:var(--sub);font-size:14px;line-height:1.9;max-width:760px">' + esc(A.photographer || '') + '</p></div></section>' +
      '<section class="blk dark"><div class="wrap two"><div><div class="eyebrow">베다니 한인연합감리교회</div><h2 class="h2" style="margin-top:14px;color:#fff">' + esc(A.churchTitle || '') + '</h2><p class="lead">' + esc(A.church || '') + '</p></div><div><p class="lead" style="margin-top:0">' + esc(A.morning || '') + '</p><div class="cta"><a class="btn primary" href="https://www.youtube.com/@bethanykumc" target="_blank" rel="noopener">베다니 유튜브</a><a class="btn ghost" href="https://bethanykumc.org" target="_blank" rel="noopener">교회 홈페이지</a></div></div></div></section>' + footerHTML();
  };

  /* 라우터 */
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), parts = h.split('/');
    var view = parts[0] || 'home', html;
    if (view === 'day') html = V.day(parseInt(parts[1], 10) || myDay());
    else if (view === 'audio') html = V.audio(parseInt(parts[1], 10) || 1);
    else if (V[view]) html = V[view](); else html = V.home();
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
    $$('.nav a,.tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-v') === view || (view === 'home' && a.getAttribute('data-v') === 'home')); });
    document.body.classList.toggle('on-home', view === 'home' || view === '' || view === 'about');
    onScroll(); bind(); initPilsa(); renderLive(); observe(); rot();
    document.title = (view === 'day' ? 'DAY ' + (parts[1] || myDay()) + ' · ' : '') + '믿음은 ······이다 — 40일';
  }
  function onScroll() {
    var solid = !(document.body.classList.contains('on-home')) || window.scrollY > window.innerHeight * 0.55;
    $('#top').classList.toggle('solid', solid);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', route);

  var io;
  function observe() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach(function (e) { e.classList.add('in'); }); return; }
    io && io.disconnect();
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (e) { io.observe(e); });
  }
  var rotTimer;
  function rot() {
    clearInterval(rotTimer); var el = $('#rot'); if (!el) return;
    var i = 0;
    rotTimer = setInterval(function () {
      var pool = window.__rotPool || headPool().filter(function (t) { return t.length <= 22; }); if (!pool.length) return;
      el.classList.add('out');
      setTimeout(function () { i = (i + 1) % pool.length; el.innerHTML = esc(pool[i]) + '<span class="ida">이다</span>'; el.classList.remove('out'); }, 700);
    }, 3800);
  }

  function bind() {
    $$('form[data-confess]').forEach(function (f) {
      f.onsubmit = function (e) {
        e.preventDefault();
        var text = f.text.value.trim().replace(/(이다|입니다)\.?$/, ''); if (!text) return;
        var btn = f.querySelector('button'); btn.disabled = true;
        call('confess', { text: text, name: f.name.value.trim(), day: f.getAttribute('data-confess'), hp: f.hp.value }).then(function (r) {
          btn.disabled = false;
          if (r.ok) { f.text.value = ''; toast(r.status === 'pub' ? '고백이 벽에 올라갔습니다' : '확인 후 공개됩니다'); loadFeed(); }
          else toast(r.error === 'rate' ? '잠시 후 다시 올려 주세요' : (r.error === 'noapi' ? '시안 화면에서는 저장되지 않습니다' : '보내지 못했습니다. 잠시 후 다시 시도해 주세요'));
        });
      };
    });
    var pf = $('#prayForm');
    if (pf) pf.onsubmit = function (e) {
      e.preventDefault(); var btn = pf.querySelector('button[type=submit]'); btn.disabled = true;
      call('prayer', { text: pf.text.value, name: pf.name.value, contact: pf.contact.value, visibility: pf.querySelector('input[name=visibility]:checked').value, hp: pf.hp.value }).then(function (r) {
        btn.disabled = false;
        if (r.ok) { pf.reset(); toast(r.status === 'private' ? '목회자에게 전달되었습니다' : '확인 후 함께 기도 목록에 올라갑니다'); }
        else toast(r.error === 'rate' ? '잠시 후 다시 보내 주세요' : '보내지 못했습니다');
      });
    };
    document.onclick = function (e) {
      var b = e.target.closest('[data-pray]');
      if (b) {
        var id = b.getAttribute('data-pray'), m = LS.get('prayed', {}); if (m[id]) return;
        m[id] = Date.now(); LS.set('prayed', m); b.classList.add('done'); b.querySelector('span').textContent = '함께 기도했어요';
        var c = b.querySelector('.c'); c.textContent = (Number(c.textContent) || 0) + 1;
        call('pray', { id: id }).then(function () { loadFeed(); }); return;
      }
      var y = e.target.closest('[data-yt]');
      if (y) { var box = $('#yt'); box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + y.getAttribute('data-yt') + '?start=' + y.getAttribute('data-t') + '&autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen title="목사님 목소리로 듣기"></iframe>'; box.classList.add('show'); return; }
      var dn = e.target.closest('[data-done]');
      if (dn) { var n = +dn.getAttribute('data-done'); if (!startDate()) startToday(); var v = !done()[n]; setDone(n, v); dn.textContent = v ? '✓ 오늘의 묵상을 마쳤습니다' : '오늘의 묵상 마치기'; toast(v ? 'DAY ' + n + '을(를) 마쳤습니다' : '완료 표시를 지웠습니다'); return; }
      if (e.target.closest('[data-start]')) { if (startDate() && !confirm('오늘을 DAY 01로 다시 시작할까요? 기록은 지워지지 않습니다.')) return; startToday(); route(); toast('오늘이 DAY 01입니다'); return; }
      if (e.target.closest('[data-export]')) { exportTxt(); return; }
      if (e.target.closest('[data-mine]')) { var v2 = $('#mine').value.trim(); if (!v2) return; LS.set('mine', v2); call('confess', { text: v2.replace(/(이다|입니다)\.?$/, ''), name: '', day: 41 }).then(function (r) { toast(r.ok ? '저장하고 벽에 나눴습니다' : '저장했습니다'); loadFeed(); }); }
    };
    $$('[data-practice]').forEach(function (c) { c.onchange = function () { var o = LS.get('practice', {}); if (c.checked) o[c.getAttribute('data-practice')] = Date.now(); else delete o[c.getAttribute('data-practice')]; LS.set('practice', o); if (c.checked) toast('오늘의 작은 실천, 잘하셨습니다'); }; });
    $$('[data-journal]').forEach(function (t) {
      t.oninput = function () { clearTimeout(t._h); t._h = setTimeout(function () { var o = LS.get('journal', {}); o[t.getAttribute('data-journal')] = t.value; LS.set('journal', o); var s = $('#jst'); if (s) s.textContent = '이 기기에 저장했습니다 · ' + new Date().toLocaleTimeString().slice(0, -3); if (!startDate()) startToday(); }, 500); };
    });
  }
  function initPilsa() {
    $$('canvas[data-pilsa]').forEach(function (cv) {
      var n = cv.getAttribute('data-pilsa'), box = cv.parentNode, dpr = window.devicePixelRatio || 1;
      var w = box.clientWidth, h = box.clientHeight; cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1b1f27'; ctx.lineWidth = 2.6;
      var saved = LS.get('pilsa', {})[n];
      if (saved) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, w, h); }; im.src = saved; box.classList.add('has'); }
      var drawing = false, last = null;
      function pt(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      cv.onpointerdown = function (e) { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); box.classList.add('has'); e.preventDefault(); };
      cv.onpointermove = function (e) { if (!drawing) return; var p = pt(e); var pr = e.pressure && e.pointerType === 'pen' ? 1.4 + e.pressure * 2.4 : 2.6; ctx.lineWidth = pr; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; e.preventDefault(); };
      cv.onpointerup = cv.onpointercancel = function () { drawing = false; };
    });
    $$('[data-pclear]').forEach(function (b) { b.onclick = function () { var cv = $('canvas[data-pilsa="' + b.getAttribute('data-pclear') + '"]'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); cv.parentNode.classList.remove('has'); }; });
    $$('[data-psave]').forEach(function (b) { b.onclick = function () {
      var n = b.getAttribute('data-psave'), cv = $('canvas[data-pilsa="' + n + '"]');
      var off = document.createElement('canvas'); off.width = 900; off.height = Math.round(900 * cv.height / cv.width); var o = off.getContext('2d');
      o.fillStyle = '#fbf8f2'; o.fillRect(0, 0, off.width, off.height); o.drawImage(cv, 0, 0, off.width, off.height);
      var ps = LS.get('pilsa', {}); ps[n] = off.toDataURL('image/jpeg', 0.72); LS.set('pilsa', ps); if (!startDate()) startToday(); toast('필사를 이 기기에 저장했습니다');
    }; });
  }
  function exportTxt() {
    var jr = LS.get('journal', {}), out = ['믿음은 ······이다 — 나의 40일 기록', '시작한 날: ' + (startDate() || '-'), ''];
    DAYS.forEach(function (d) { if (jr[d.day] || done()[d.day]) out.push('DAY ' + d.day + ' · 믿음은 ' + d.heading, d.verse_ref, (jr[d.day] || '(기록 없음)'), ''); });
    if (LS.get('mine', '')) out.push('나의 믿음은 ' + LS.get('mine', '') + '이다');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = '나의_40일_기록.txt'; a.click();
  }

  route(); loadFeed();
})();

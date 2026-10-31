/**
 * Renders a personal note. Each page holds its note encrypted in window.NOTE_SEALED
 * (made by scripts/seal-note.mjs); the short code after "#" in the link is hashed into
 * the AES key. Browsers never send that part to the server, so the repo only ever
 * holds ciphertext.
 * The note is split into steps with back/next buttons, swipe and arrow keys.
 * Taps are sent to PostHog (assets/js/analytics.js) with note = the note's id.
 */
(function () {
  "use strict";

  var root = document.getElementById("note");
  if (!root) return;

  function b64(s) {
    return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), function (c) { return c.charCodeAt(0); });
  }
  function locked() {
    root.innerHTML = '<main class="paper"><section class="step on"><h1>this note is locked</h1>' +
      "<p>it only opens from the exact link it was sent with. if you found it some other way, hi, there's nothing to see here</p></section></main>";
  }

  // a page sealed with "open": true carries its own key, so its plain link works without a code
  var sealed = window.NOTE_SEALED, m = location.hash.match(/^#([A-Za-z0-9]+)$/);
  var code = m ? m[1] : sealed && sealed.k;
  if (window.NOTE) render(window.NOTE);
  else if (!sealed || !code || !window.crypto || !crypto.subtle) locked();
  else {
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(code))
      .then(function (raw) { return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]); })
      .then(function (key) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(sealed.iv) }, key, b64(sealed.ct)); })
      .then(function (buf) { render(JSON.parse(new TextDecoder().decode(buf))); }, locked);
  }

  function render(C) {
    // ---- things about pavan, shared by every note ----
    var BASICS = [
      ["name", "pavan"], ["age", "27"], ["lives", "chicago"],
      ["speaks", "telugu, hindi, english"], ["does", "AI engineer, photographer"]
    ];
    var FACTS = [
      ["the job", "i build AI for a living. mostly i teach computers to do things, then argue with them when they don't"],
      ["the camera", "i'm a photographer. i'll wait 20 minutes for the perfect light, then take the photo in 2 seconds. very patient, very dramatic"],
      ["the bike", "i bike around chicago like i'm in a movie montage. the wind off the lake disagrees"],
      ["the art", "i make art sometimes. \"sometimes\" is doing a lot of work in that sentence"],
      ["the weekends", "climbing gym, mostly falling off walls with great form"],
      ["red flag", "i will stop mid-walk to photograph a nice shadow. you'll get used to it"]
    ];

    var DAY_NOTES = [
      "sunday. slow and cozy, a good one",
      "monday. bold. i like it",
      "tuesday. underrated, everywhere will be quiet",
      "wednesday. a little midweek treat",
      "thursday. honestly perfect",
      "friday. classic",
      "saturday. the best day for a long walk"
    ];
    var NO_LINES = ["are you sure?", "really sure?", "think again", "pls", "last chance", "you're breaking my heart", "ok now you're just playing", "the yes button is right there"];
    var WYD = { label: "\"wyd\" at 11pm", off: true, note: "that's everyone else's idea. not available here" };

    var name = C.name;
    var options = (C.options || []).concat([WYD]);
    var dayNotes = C.dayNotes || DAY_NOTES;
    var today = new Date();

    function track(event, props) {
      props = props || {};
      props.note = C.id;
      if (window.posthog && window.posthog.capture) window.posthog.capture(event, props);
    }
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }

    // ---- sunset in chicago (noaa approximation) ----
    function sunset(day) {
      var lat = 41.88, lng = -87.63, rad = Math.PI / 180, y = day.getFullYear();
      var n = Math.floor((Date.UTC(y, day.getMonth(), day.getDate()) - Date.UTC(y, 0, 0)) / 864e5);
      var lngHour = lng / 15, t = n + (18 - lngHour) / 24;
      var M = 0.9856 * t - 3.289;
      var L = (M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634 + 360) % 360;
      var RA = (Math.atan(0.91764 * Math.tan(L * rad)) / rad + 360) % 360;
      RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
      var sinDec = 0.39782 * Math.sin(L * rad), cosDec = Math.cos(Math.asin(sinDec));
      var cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
      var H = Math.acos(cosH) / rad / 15;
      var UT = ((H + RA - 0.06571 * t - 6.622 - lngHour) % 24 + 24) % 24;
      return new Date(Date.UTC(y, day.getMonth(), day.getDate()) + UT * 36e5);
    }
    var tfmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
    function time(d) { return tfmt.format(d).toLowerCase().replace(" ", ""); }
    function goldenStart(day) { return new Date(sunset(day) - 45 * 6e4); }
    function fmt(d, opts) { return new Intl.DateTimeFormat("en-US", opts).format(d).toLowerCase(); }

    // ---- markup ----
    var heart = '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true" style="vertical-align:middle"><path d="M15 24C6 17 2 12 3 7.5 4 3 9 1.5 12.5 5 14 6.5 15 8.5 15 8.5s1-2.6 3-4c3.6-2.6 8.5-.5 9 4 .5 5-5 10-12 15.5z" fill="none" stroke="#e86a8a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var steps = [
      // 0: hello
      '<h1>' + esc(name) + ',</h1>' +
      C.intro.map(function (p) { return "<p>" + p + "</p>"; }).join(""),

      // 1: me
      "<h2>hi, i'm pavan</h2>" +
      '<div class="polaroid-wrap">' +
        '<figure class="polaroid"><div class="tape"></div><img src="/assets/img/pavan-river.jpg" alt="pavan smiling on a boat on the chicago river at sunset">' +
        '<figcaption>golden hour on the chicago river.<br>yes, i dress up for sunsets</figcaption></figure>' +
        '<div class="basics">' + BASICS.map(function (b) { return '<div><span class="k">' + b[0] + "</span> " + b[1] + "</div>"; }).join("") + "</div>" +
      "</div>",

      // 2: about
      "<h2>a quick guide to me</h2>" +
      '<ul class="facts">' + FACTS.concat(C.extraFacts || []).map(function (f) { return "<li><b>" + f[0] + "</b> " + f[1] + "</li>"; }).join("") + "</ul>",

      // 3: promises
      "<h2>if we go out, i promise to</h2>" +
      '<ul class="checks">' + C.promises.map(function (p) {
        return '<li><label><input type="checkbox"><span class="box"></span><span class="t">' + p + "</span></label></li>";
      }).join("") + "</ul>" +
      '<div class="allnote"></div><p class="small">(tap to check them off. i\'ll be held accountable)</p>',

      // 4: the question
      '<div class="ask"><h2>' + C.ask + "</h2>" +
      '<div class="answers"><button type="button" class="yes">yes</button><button type="button" class="no">no</button></div>' +
      '<div class="nonote"></div></div>',

      // 5: the date
      "<h2>yay. ok, pick our first date</h2>" +
      '<div class="pick col opts">' + options.map(function (o, i) {
        return '<button type="button" data-i="' + i + '"' + (o.off ? ' class="off"' : "") + ' aria-pressed="' + (i === 0) + '"><span>' + esc(o.label) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="note optnote"></div>',

      // 6: the day
      "<h2>" + (C.dayPrompt || "and which day?") + "</h2>" +
      '<div class="pick days"></div><div class="note daynote"></div>',

      // 7: ticket
      "<h2>it's a date</h2>" +
      '<div class="ticket"><div class="main"><div class="admit">admit one · ' + esc(name) + "</div>" +
        '<div class="what" data-t="what"></div>' +
        '<dl><dt>when</dt><dd data-t="when"></dd><dt>time</dt><dd data-t="time"></dd><dt>where</dt><dd data-t="where"></dd><dt>bring</dt><dd data-t="bring"></dd></dl>' +
      '</div><div class="stub"><span>first date</span></div></div>' +
      '<div class="sent"></div>' +
      '<button class="copy" type="button">or copy it for hinge</button><div class="copynote"></div>' +
      '<p class="ps"><span data-t="ps"></span> ' + heart + "</p>" +
      '<p class="hand sign">- pavan</p>' +
      '<div class="foot">handwritten (in code) for exactly one person<br><a href="/photography.html">proof i can use a camera</a></div>'
    ];

    root.innerHTML =
      '<main class="paper">' + steps.map(function (h, i) { return '<section class="step" data-step="' + i + '">' + h + "</section>"; }).join("") + "</main>" +
      '<nav class="nav"><button type="button" class="back">back</button><div class="dots">' +
      steps.map(function () { return "<i></i>"; }).join("") +
      '</div><button type="button" class="next">next</button></nav>';

    function $(sel) { return root.querySelector(sel); }
    function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

    // ---- navigation ----
    var sections = $$(".step"), dots = $$(".dots i"), back = $(".back"), next = $(".next");
    var cur = -1, saidYes = false, picked = null, choice = options[0], seen = {};
    var ASK = 4, DATE = 5, DAY = 6, LAST = steps.length - 1;

    function canLeave(i) { return !(i === ASK && !saidYes) && !(i === DAY && !picked); }
    function go(i) {
      if (i < 0 || i > LAST || i === cur) return;
      if (i > cur && !canLeave(cur) && cur !== -1) return;
      var dir = i > cur ? "in-next" : "in-back";
      sections.forEach(function (s, k) {
        s.classList.toggle("on", k === i);
        s.classList.remove("in-next", "in-back");
      });
      void sections[i].offsetWidth;
      if (cur !== -1) sections[i].classList.add(dir);
      cur = i;
      dots.forEach(function (d, k) { d.className = k === i ? "on" : k < i ? "done" : ""; });
      back.classList.toggle("hide", i === 0);
      next.classList.toggle("hide", i === LAST || (i === ASK && !saidYes));
      next.disabled = i === DAY && !picked;
      next.textContent = i === DAY ? (picked ? "our ticket" : "pick one") : "next";
      window.scrollTo(0, 0);
      if (!seen[i]) { seen[i] = 1; track("step_viewed", { step: i }); }
    }
    back.addEventListener("click", function () { go(cur - 1); });
    next.addEventListener("click", function () { go(cur + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") go(cur + 1);
      if (e.key === "ArrowLeft") go(cur - 1);
    });
    var sx = 0, sy = 0, swipeOk = false;
    root.addEventListener("touchstart", function (e) {
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      swipeOk = !e.target.closest(".answers");
    }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (!swipeOk) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
      go(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });

    // ---- promises ----
    var boxes = $$(".checks input");
    $(".checks").addEventListener("change", function () {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      $(".allnote").textContent = n === boxes.length ? "all " + ["zero", "one", "two", "three", "four", "five", "six"][n] + ". no backing out now" : "";
      track("promises_checked", { checked: n, all: n === boxes.length });
    });

    // ---- yes / no: every no shrinks no and grows yes ----
    var yes = $(".answers .yes"), no = $(".answers .no"), tries = 0;
    no.addEventListener("click", function (e) {
      e.preventDefault();
      if (saidYes) return;
      tries++;
      no.textContent = NO_LINES[Math.min(tries, NO_LINES.length) - 1];
      $(".nonote").textContent = tries === 4 ? "i made a whole website" : "";
      track("tapped_no", { no_taps: tries });
      yes.style.fontSize = Math.min(20 + tries * 7, 72) + "px";
      yes.style.padding = Math.min(2 + tries * 3, 22) + "px " + Math.min(16 + tries * 5, 48) + "px";
      // hop to a random spot inside the answer box that doesn't cover yes
      var box = $(".answers");
      no.style.position = "absolute";
      no.style.transform = "scale(" + Math.max(0.45, 1 - tries * 0.08).toFixed(2) + ") rotate(" + (Math.random() * 24 - 12).toFixed(0) + "deg)";
      var bw = box.clientWidth, bh = box.clientHeight, nw = no.offsetWidth, nh = no.offsetHeight;
      var yr = { l: yes.offsetLeft - 8, t: yes.offsetTop - 8, r: yes.offsetLeft + yes.offsetWidth + 8, b: yes.offsetTop + yes.offsetHeight + 8 };
      for (var k = 0, x, y; k < 30; k++) {
        x = Math.random() * Math.max(0, bw - nw); y = Math.random() * Math.max(0, bh - nh);
        if (x + nw < yr.l || x > yr.r || y + nh < yr.t || y > yr.b) break;
      }
      no.style.left = x.toFixed(0) + "px";
      no.style.top = y.toFixed(0) + "px";
    });
    if (window.matchMedia("(hover: hover)").matches) no.addEventListener("mouseenter", function () { if (tries >= 3 && !saidYes) no.click(); });
    yes.addEventListener("click", function () {
      if (!saidYes) track("said_yes", { no_taps: tries });
      saidYes = true;
      no.style.visibility = "hidden";
      $(".nonote").textContent = tries ? "knew you'd come around" : "no hesitation. i like that";
      next.classList.remove("hide");
      confetti(yes);
      setTimeout(function () { if (cur === ASK) go(DATE); }, 900);
    });

    // ---- date options ----
    var opts = $(".opts");
    function pickOption(i) {
      var o = options[i];
      $(".optnote").textContent = o.note;
      track(o.off ? "tried_wyd" : "picked_date", { date: o.label });
      if (o.off) return;
      choice = o;
      $$(".opts button").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.i === i ? "true" : "false"); });
      if (picked) renderTicket();
    }
    opts.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) pickOption(+b.dataset.i);
    });
    $(".optnote").textContent = options[0].note;

    // ---- days ----
    var days = $(".days");
    for (var i = 1; i <= 7; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = fmt(d, { weekday: "short", month: "short", day: "numeric" });
      b.dataset.ts = d.getTime();
      b.setAttribute("aria-pressed", "false");
      days.appendChild(b);
    }
    days.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      $$(".days button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var first = !picked;
      picked = new Date(+b.dataset.ts);
      $(".daynote").textContent = picked.getMonth() === 9 && picked.getDate() === 31 ? "halloween! costumes optional, but encouraged" : dayNotes[picked.getDay()];
      renderTicket();
      track("picked_night", { night: fmt(picked, { weekday: "long", month: "short", day: "numeric" }), date: choice.label, time: ticketTime(), no_taps: tries, promises_checked: boxes.filter(function (x) { return x.checked; }).length });
      $(".sent").textContent = "sent! he'll see this in a sec";
      next.disabled = false;
      next.textContent = "our ticket";
      if (first) setTimeout(function () { if (cur === DAY) go(LAST); }, 900);
    });

    function ticketTime() {
      return choice.golden ? time(new Date(goldenStart(picked) - 15 * 6e4)) + " (just before golden hour)" : choice.time;
    }
    function renderTicket() {
      var set = function (k, v) { $('[data-t="' + k + '"]').textContent = v; };
      set("what", choice.label);
      set("when", fmt(picked, { weekday: "long", month: "short", day: "numeric" }));
      set("time", ticketTime());
      set("where", choice.where);
      set("bring", choice.bring);
      set("ps", choice.ps || C.ps || "p.s. i'm bringing the film camera either way");
      $(".copynote").textContent = "";
    }

    $(".copy").addEventListener("click", function () {
      if (!picked) return;
      var msg = choice.reply.replace("{day}", fmt(picked, { weekday: "long" }));
      track("copied_reply", { reply: msg });
      var note = $(".copynote");
      var fallback = function () { note.textContent = 'send him: "' + msg + '"'; };
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function () { note.textContent = "copied! paste it in hinge"; }, fallback);
      else fallback();
    });

    // ---- confetti, fired from the yes button ----
    function confetti(from) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var cv = document.createElement("canvas"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
      cv.className = "confetti";
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      ctx.scale(dpr, dpr);
      document.body.appendChild(cv);
      var r = from.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      var colors = ["#e86a8a", "#cfbfdc", "#7d5ea3", "#ffe65a", "#22306b", "#f2a7a7"];
      var bits = [];
      for (var i = 0; i < 140; i++) {
        var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
        bits.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, s: 5 + Math.random() * 6,
          rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[i % colors.length], heart: i % 5 === 0 });
      }
      var start = performance.now();
      (function frame(now) {
        var t = now - start;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1600) / 900);
        bits.forEach(function (b) {
          b.vy += .28; b.vx *= .985; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c;
          if (b.heart) { ctx.font = (b.s * 2.4) + "px serif"; ctx.fillText("\u2665", -b.s, b.s); }
          else ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
          ctx.restore();
        });
        if (t < 2500) requestAnimationFrame(frame); else cv.remove();
      })(start);
    }

    // analytics.js is async, so wait for the page to finish loading before the first event
    if (document.readyState === "complete") track("note_opened");
    else window.addEventListener("load", function () { track("note_opened"); });
    go(0);
  }
})();

/* AFTERCORE — light interaction layer */
(function () {
  "use strict";

  /* tells the head watchdog that the script booted (see the <head> marker) */
  window.__aftercoreReady = true;

  var d = document;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- consent ---------- */
  /* "granted" | "denied" | null — stored on the device, never sent anywhere. */
  var CONSENT_KEY = "aftercore_consent_v1";
  var LEGACY_KEY = "aftercore_cookies_v1";

  var getConsent = function () {
    try {
      var v = localStorage.getItem(CONSENT_KEY);
      if (v === "granted" || v === "denied") return v;
      /* visits before the decline option existed stored a plain "1" */
      if (localStorage.getItem(LEGACY_KEY) === "1") return "granted";
    } catch (e) { /* storage blocked, e.g. private mode */ }
    return null;
  };
  var setConsent = function (value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) { /* storage blocked */ }
  };

  /* ---------- analytics: GA4 Consent Mode v2 ---------- */
  /* The Google tag is on every page (see <head>). Analytics storage stays denied until the
     visitor accepts; advertising storage stays denied either way. */
  var updateConsent = function (granted) {
    if (typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  };

  /* ---------- stat count-up (morph numbers) ---------- */
  if (!reduced) {
    [].forEach.call(d.querySelectorAll("[data-count]"), function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(end) || end <= 0) return;
      var pad = Math.max(2, el.textContent.trim().length);
      var start = null;
      var dur = 1300;
      var frame = function (ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var ease = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(end * ease)).padStart(pad, "0");
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------- sticky header + intro splash ---------- */
  var hdr = d.querySelector(".hdr");
  var splash = d.querySelector(".splash");

  if (splash && hdr) {
    if (!splash.classList.contains("splash--nav")) hdr.classList.add("is-intro");
    var updSplash = function () {
      var p = window.scrollY / (window.innerHeight || 1);
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      splash.style.setProperty("--p", p.toFixed(4));
    };
    updSplash();
    window.addEventListener("scroll", updSplash, { passive: true });
    window.addEventListener("resize", updSplash);
  }

  if (hdr) {
    var onScroll = function () {
      var y = window.scrollY;
      hdr.classList.toggle("is-stuck", y > 12);
      if (hdr.classList.contains("is-intro")) {
        hdr.classList.toggle("is-on", y > (window.innerHeight || 1) * 0.14);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile drawer ---------- */
  var burger = d.querySelector(".burger");
  var drawer = d.getElementById("drawer");
  if (burger && drawer) {
    var setOpen = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      d.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setOpen(false);
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 880) setOpen(false);
    });
  }

  /* ---------- section scroll spy ---------- */
  var spySecs = d.querySelectorAll("section[data-spy]");
  if (spySecs.length) {
    var spy = d.createElement("nav");
    spy.className = "spy";
    spy.setAttribute("aria-label", "on this page");
    [].forEach.call(spySecs, function (s) {
      var a = d.createElement("a");
      a.href = "#" + s.id;
      a.textContent = s.getAttribute("data-spy");
      spy.appendChild(a);
    });
    d.body.appendChild(spy);
    var spyLinks = spy.querySelectorAll("a");
    var spyTick = function () {
      var i = -1;
      [].forEach.call(spySecs, function (s, idx) {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) i = idx;
      });
      [].forEach.call(spyLinks, function (a, idx) {
        a.classList.toggle("is-on", idx === i);
      });
    };
    spyTick();
    window.addEventListener("scroll", spyTick, { passive: true });
    window.addEventListener("resize", spyTick);
  }

  /* ---------- active nav link ---------- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  [].forEach.call(d.querySelectorAll(".nav a, .drawer nav a"), function (a) {
    var target = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    if (target === here) a.setAttribute("aria-current", "page");
  });

  /* ---------- scroll reveal ---------- */
  var targets = d.querySelectorAll(".rv");
  if (targets.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      [].forEach.call(targets, function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              en.target.classList.add("is-in");
              io.unobserve(en.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      [].forEach.call(targets, function (el) { io.observe(el); });
    }
  }

  /* ---------- ticker: clone for seamless loop ---------- */
  [].forEach.call(d.querySelectorAll(".ticker__row"), function (row) {
    row.innerHTML += row.innerHTML;
  });

  /* ---------- cookie preferences ---------- */
  var cookieBar = d.querySelector(".cookiebar");
  if (cookieBar) {
    var decide = function (value) {
      setConsent(value);
      cookieBar.hidden = true;
      updateConsent(value === "granted");
    };
    var okBtn = cookieBar.querySelector("[data-cookie-ok]");
    var noBtn = cookieBar.querySelector("[data-cookie-decline]");
    if (okBtn) okBtn.addEventListener("click", function () { decide("granted"); });
    if (noBtn) noBtn.addEventListener("click", function () { decide("denied"); });
    /* the footer "cookies" link reopens the notice so the choice can change */
    [].forEach.call(d.querySelectorAll("[data-cookie-again]"), function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        cookieBar.hidden = false;
      });
    });
    if (!getConsent()) setTimeout(function () { cookieBar.hidden = false; }, 900);
  }

  /* ---------- footer year ---------- */
  [].forEach.call(d.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

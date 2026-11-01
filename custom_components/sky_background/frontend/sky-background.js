/* Sky Background - time-of-day glows + weather effects. Does not touch your theme or cards.
 * Reads sensor.sky_background_period / sensor.sky_background_effect (options travel as attributes). */
(() => {
  if (window.__skyBackground) return;
  window.__skyBackground = true;

  const PERIOD_ENTITY = "sensor.sky_background_period";
  const EFFECT_ENTITY = "sensor.sky_background_effect";

  const DEFAULTS = {
    effects_enabled: true, rain_density: 100, snow_density: 100, rain_speed: 100, snow_speed: 100,
    wind: 20, heavy_rain_multiplier: 180, ripples: true, lightning: true, stars: true, clouds: true,
    fog: true, particle_opacity: 100, max_fps: 30, pause_when_hidden: true, respect_reduced_motion: true,
    auto_reduce_weak_devices: true, disable_on_mobile: false, dashboards_mode: "all", dashboards: "",
    layer: "behind", background_mode: "auto", overlay_intensity: 100, everywhere: false, color_mode: "auto", background_intensity: 100,
    weather_dimming: 100, show_dots: false, only_theme_names: "",
  };

  /* base color + glows [x, y, "r,g,b", alpha] per period */
  const SKY = {
    dark: {
      night: ["#0B0E14", [["14%", "13%", "41,182,246", 0.15], ["88%", "90%", "171,71,188", 0.14], ["95%", "10%", "0,230,118", 0.05], ["7%", "90%", "255,112,67", 0.06]]],
      sunrise: ["#110E15", [["8%", "98%", "255,138,76", 0.22], ["38%", "104%", "255,94,120", 0.12], ["88%", "8%", "120,100,220", 0.16], ["60%", "40%", "41,182,246", 0.05]]],
      morning: ["#0C1118", [["14%", "8%", "255,213,79", 0.12], ["62%", "0%", "41,182,246", 0.17], ["92%", "88%", "38,198,218", 0.08], ["8%", "92%", "0,230,118", 0.05]]],
      midday: ["#0A1219", [["50%", "-6%", "41,182,246", 0.24], ["8%", "52%", "38,198,218", 0.1], ["96%", "60%", "124,77,255", 0.08], ["50%", "104%", "0,230,118", 0.05]]],
      afternoon: ["#0E1016", [["88%", "10%", "255,193,7", 0.16], ["8%", "60%", "255,152,0", 0.08], ["50%", "104%", "41,182,246", 0.08], ["6%", "6%", "171,71,188", 0.06]]],
      evening: ["#120D14", [["50%", "106%", "255,112,67", 0.2], ["92%", "70%", "233,30,99", 0.14], ["8%", "14%", "124,77,255", 0.16], ["4%", "82%", "255,193,7", 0.06]]],
    },
    light: {
      night: ["#D5DBE6", [["14%", "13%", "2,136,209", 0.2], ["88%", "90%", "123,31,162", 0.15], ["95%", "10%", "0,160,90", 0.07], ["7%", "90%", "230,81,0", 0.07]]],
      sunrise: ["#E8DDE2", [["8%", "98%", "255,120,50", 0.28], ["38%", "104%", "233,60,100", 0.14], ["88%", "8%", "110,90,210", 0.16], ["60%", "40%", "2,136,209", 0.06]]],
      morning: ["#E2E8EE", [["14%", "8%", "245,190,40", 0.22], ["62%", "0%", "2,136,209", 0.2], ["92%", "88%", "0,150,170", 0.1], ["8%", "92%", "0,160,90", 0.07]]],
      midday: ["#DCE7F0", [["50%", "-6%", "2,136,209", 0.26], ["8%", "52%", "0,150,170", 0.12], ["96%", "60%", "110,70,230", 0.1], ["50%", "104%", "0,160,90", 0.07]]],
      afternoon: ["#E8E4DA", [["88%", "10%", "245,170,0", 0.26], ["8%", "60%", "240,130,0", 0.12], ["50%", "104%", "2,136,209", 0.1], ["6%", "6%", "150,60,180", 0.08]]],
      evening: ["#E6DAE0", [["50%", "106%", "240,90,40", 0.26], ["92%", "70%", "210,30,100", 0.16], ["8%", "14%", "110,70,230", 0.16], ["4%", "82%", "245,170,0", 0.09]]],
    },
  };

  /* how much each effect dims the background (dark / light) and a cool glow it adds */
  const DIM = {
    clear: [0, 0], cloudy: [0.2, 0.1], fog: [0.25, 0.12], rain: [0.3, 0.14], heavy_rain: [0.4, 0.2],
    storm: [0.5, 0.26], snow: [0.18, 0.06], sleet: [0.3, 0.14], hail: [0.3, 0.14],
  };
  const COOL_GLOW = { rain: 0.22, heavy_rain: 0.26, storm: 0.26, sleet: 0.18, hail: 0.18, snow: 0.16, fog: 0.1, cloudy: 0.06 };

  /* seeded dots (static starfield texture) */
  function dotsUri(light) {
    let s = light ? 7919 : 104729;
    const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const fill = light ? "%23000000" : "%23FFFFFF";
    const group = (n, op) => {
      let g = `%3Cg fill=%22${fill}%22 fill-opacity=%22${op}%22%3E`;
      for (let i = 0; i < n; i++) g += `%3Ccircle cx=%22${Math.round(rnd() * 1600)}%22 cy=%22${Math.round(rnd() * 900)}%22 r=%22${[1, 1.5, 2][Math.floor(rnd() * 3)]}%22/%3E`;
      return g + "%3C/g%3E";
    };
    return `url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1600 900%22 preserveAspectRatio=%22xMidYMid slice%22%3E${group(70, 0.05)}${group(40, 0.09)}${group(9, 0.14)}%3C/svg%3E") center / cover no-repeat fixed`;
  }
  const DOTS = { dark: dotsUri(false), light: dotsUri(true) };

  /* Background layers for a period + effect. As an overlay it is lighter and has no texture. */
  function layersFor(period, effect, dark, o, overlay, behind) {
    const mode = dark ? "dark" : "light";
    const glows = (SKY[mode][period] || SKY[mode].night)[1];
    const k = (o.background_intensity / 100) * (overlay ? (o.overlay_intensity / 100) * (behind ? 1 : 0.6) : 1);
    const wd = o.weather_dimming / 100;
    const fx = overlay ? "" : " fixed";
    const layers = [];
    const dim = (DIM[effect] || DIM.clear)[dark ? 0 : 1] * wd * (overlay && !behind ? 0.35 : 1);
    if (dim > 0) {
      const c = dark ? "10,15,24" : "92,106,126", a = Math.min(dim, 0.85).toFixed(3);
      layers.push(`linear-gradient(rgba(${c},${a}), rgba(${c},${a}))${fx}`);
    }
    if (!overlay && o.show_dots) layers.push(DOTS[mode]);
    const cool = (COOL_GLOW[effect] || 0) * k * wd;
    if (cool > 0) {
      const c = dark ? "66,165,245" : "2,136,209";
      layers.push(`radial-gradient(circle 60vmax at 10% 6%, rgba(${c},${cool.toFixed(3)}), rgba(${c},0))${fx}`);
    }
    const warmCut = effect === "clear" ? 1 : 1 - Math.min(0.6, (DIM[effect] || [0])[0]);
    for (const [x, y, c, a] of glows) {
      const warm = /^(255|24\d|23\d|230|240)/.test(c);
      const alpha = Math.min(1, a * k * (warm ? warmCut : 1)).toFixed(3);
      layers.push(`radial-gradient(circle 60vmax at ${x} ${y}, rgba(${c},${alpha}), rgba(${c},0))${fx}`);
    }
    return layers;
  }

  /* ----------------------------------------------------------------- state */
  let hass = null, opts = { ...DEFAULTS }, period = "night", effect = "clear";
  let ourBg = "", appliedKey = "", overlayEl = null;
  const root = document.documentElement;
  const BG_VAR = "--lovelace-background";

  const isDark = () => opts.color_mode === "dark" ? true : opts.color_mode === "light" ? false : !!(hass && hass.themes && hass.themes.darkMode);
  const themeAllowed = () => {
    const names = String(opts.only_theme_names || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return true;
    return !!(hass && hass.themes && names.includes(hass.themes.theme));
  };
  const dashboardAllowed = () => {
    const seg = location.pathname.split("/")[1] || "";
    const panel = hass && hass.panels && hass.panels[seg];
    const isDash = panel && (panel.component_name === "lovelace" || panel.component_name === "home");
    if (!isDash && !opts.everywhere) return false;
    const list = String(opts.dashboards || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (opts.dashboards_mode === "include") return list.includes(seg);
    if (opts.dashboards_mode === "exclude") return !list.includes(seg);
    return true;
  };

  const currentBg = () => root.style.getPropertyValue(BG_VAR).trim();
  /* the selected theme (or something else) already defines a background that is not ours */
  const themeDefinesBackground = () => { const cur = currentBg(); return !!cur && cur !== ourBg; };
  const intact = () => !!ourBg && currentBg() === ourBg;

  function clearBackground() {
    if (ourBg && currentBg() === ourBg) root.style.removeProperty(BG_VAR);
    ourBg = "";
  }
  function setBackground(value) {
    root.style.setProperty(BG_VAR, value);
    ourBg = currentBg();
  }
  /* hui-view-container holds hui-view-background (fixed, z-index -1). A sibling with the same z-index that comes
   * later in the DOM paints over the background and under the cards. */
  let vcCache = null, vcTried = 0;
  function deepFind(start, sel) {
    const queue = [start];
    while (queue.length) {
      const node = queue.shift();
      const hit = node.querySelector && node.querySelector(sel);
      if (hit) return hit;
      const all = node.querySelectorAll ? node.querySelectorAll("*") : [];
      for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
    }
    return null;
  }
  function viewContainer() {
    if (vcCache && vcCache.isConnected) return vcCache;
    vcCache = null;
    const now = Date.now();
    if (now - vcTried < 2000) return null;
    vcTried = now;
    const ha = document.querySelector("home-assistant");
    if (!ha || !ha.shadowRoot) return null;
    const panel = deepFind(ha.shadowRoot, "ha-panel-lovelace");
    const rootEl = panel && panel.shadowRoot && panel.shadowRoot.querySelector("hui-root");
    vcCache = (rootEl && rootEl.shadowRoot && rootEl.shadowRoot.querySelector("hui-view-container")) || null;
    return vcCache;
  }
  const wantsBehind = () => opts.layer === "behind" && !!viewContainer();
  function mount(el, zAbove) {
    const vc = opts.layer === "behind" ? viewContainer() : null;
    el.style.zIndex = vc ? "-1" : String(zAbove);
    const parent = vc || document.body;
    if (el.parentNode !== parent) parent.appendChild(el);
  }
  function hideOverlay() { if (overlayEl) overlayEl.style.display = "none"; }
  function showOverlay(layers) {
    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.id = "sky-background-overlay";
      overlayEl.style.cssText = "position:fixed;inset:0;pointer-events:none";
    }
    mount(overlayEl, 2);
    overlayEl.style.background = layers.join(", ");
    overlayEl.style.display = "block";
  }

  function applyTheme(force) {
    if (!themeAllowed() || opts.background_mode === "off") { clearBackground(); hideOverlay(); appliedKey = ""; return; }
    const dark = isDark();
    const overlay = opts.background_mode === "overlay" || (opts.background_mode === "auto" && themeDefinesBackground());
    const state = [period, effect, dark, overlay, JSON.stringify(opts)].join("|");
    if (!force && state === appliedKey && (overlay || intact())) return;
    if (overlay) {
      clearBackground();
      showOverlay(layersFor(period, effect, dark, opts, true, wantsBehind()));
    } else {
      hideOverlay();
      setBackground(`${layersFor(period, effect, dark, opts, false, false).join(", ")}, var(--primary-background-color)`);
    }
    appliedKey = state;
  }
  /* Home Assistant rewrites the theme variables when the theme changes: re-evaluate */
  let reapplyTimer = 0;
  new MutationObserver(() => {
    if (!hass || !appliedKey) return;
    clearTimeout(reapplyTimer);
    reapplyTimer = setTimeout(() => applyTheme(false), 80);
  }).observe(root, { attributes: true, attributeFilter: ["style"] });

  /* ------------------------------------------------------------- particles */
  const cv = document.createElement("canvas");
  cv.id = "sky-background-canvas";
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;display:none";
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, drops = [], flakes = [], hail = [], ripples = [], stars = [], clouds = [], fogs = [];
  let t = 0, last = 0, flash = 0, nextFlash = 5, running = false, rafId = 0, fogSprite = null, cloudSprite = null;

  const weak = () => (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  const mobile = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || matchMedia("(pointer:coarse)").matches && innerWidth < 800;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const factor = () => (opts.auto_reduce_weak_devices && weak() ? 0.5 : 1);

  const mkDrop = (init) => { const z = 0.4 + Math.random() * 0.6; return { x: Math.random() * (W + 160) - 80, y: init ? Math.random() * H : -30, z, v: (9 + Math.random() * 7) * z * 1.5, l: (10 + Math.random() * 16) * z, a: 0.15 + 0.4 * z }; };
  const mkFlake = (init) => { const z = Math.random(); return { x: Math.random() * W, y: init ? Math.random() * H : -10, z, r: 1 + z * 3.2, v: 0.4 + z * 1.3, ph: Math.random() * 6.28, sw: 0.4 + Math.random() * 0.8, a: 0.35 + z * 0.6 }; };
  const mkHail = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : -10, v: 11 + Math.random() * 6, r: 1.2 + Math.random() * 1.6, b: 0, a: 0.5 + Math.random() * 0.4 });

  function sprite(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); return c; }
  function buildSprites() {
    fogSprite = sprite(420, 200, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(200,212,230,0.16)"); r.addColorStop(1, "rgba(200,212,230,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    cloudSprite = sprite(520, 180, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 80 + Math.random() * 360, y = 60 + Math.random() * 60, rad = 40 + Math.random() * 50; const r = g.createRadialGradient(x, y, 0, x, y, rad); r.addColorStop(0, "rgba(205,218,238,0.10)"); r.addColorStop(1, "rgba(205,218,238,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); } });
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(W * H / 14000) }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.75, r: 0.6 + Math.random() * 1.2, p: Math.random() * 6 }));
    populate();
  }
  function populate() {
    const area = W * H, f = factor();
    drops = []; flakes = []; hail = []; ripples = []; clouds = []; fogs = [];
    const heavy = effect === "heavy_rain" || effect === "storm" ? opts.heavy_rain_multiplier / 100 : 1;
    if (effect === "rain" || effect === "heavy_rain" || effect === "storm" || effect === "sleet") {
      const n = Math.min(1100, Math.round(area / 1400 * (opts.rain_density / 100) * heavy * f * (effect === "sleet" ? 0.6 : 1)));
      for (let i = 0; i < n; i++) drops.push(mkDrop(true));
    }
    if (effect === "snow" || effect === "sleet") {
      const n = Math.min(700, Math.round(area / 1900 * (opts.snow_density / 100) * f * (effect === "sleet" ? 0.5 : 1)));
      for (let i = 0; i < n; i++) flakes.push(mkFlake(true));
    }
    if (effect === "hail") for (let i = 0; i < Math.min(400, Math.round(area / 5000 * f)); i++) hail.push(mkHail(true));
    if (opts.clouds && (effect === "cloudy" || effect === "rain" || effect === "heavy_rain" || effect === "storm")) {
      for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * (W + 520) - 520, y: Math.random() * H * 0.45, s: 0.8 + Math.random() * 1.1, v: 4 + Math.random() * 6 });
    }
    if (opts.fog && effect === "fog") for (let i = 0; i < 7; i++) fogs.push({ x: Math.random() * (W + 420) - 420, y: H * (0.1 + Math.random() * 0.8), s: 1 + Math.random() * 1.4, v: 6 + Math.random() * 8 });
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const step = 1000 / Math.max(10, opts.max_fps);
    if (now - last < step) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0.033); last = now; t += dt;
    const k = dt * 60;
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();
    const wind = opts.wind / 100;

    if (opts.stars && dark && (effect === "clear") && (period === "night" || period === "evening" || period === "sunrise")) {
      const base = period === "night" ? 1 : 0.5;
      for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${((0.25 + 0.35 * Math.sin(t * 1.2 + s.p)) * base).toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }
    for (const c of clouds) { ctx.globalAlpha = dark ? 1 : 0.5; ctx.drawImage(cloudSprite, c.x, c.y, 520 * c.s, 180 * c.s); ctx.globalAlpha = 1; c.x += c.v * dt; if (c.x > W) c.x = -520 * c.s; }
    for (const f of fogs) { ctx.drawImage(fogSprite, f.x, f.y, 420 * f.s, 200 * f.s); f.x += f.v * dt; if (f.x > W) f.x = -420 * f.s; }

    if (drops.length) {
      const sp = opts.rain_speed / 100, slant = 0.18 + wind * 0.25;
      ctx.lineCap = "round";
      const col = dark ? "190,220,255" : "70,110,160";
      for (const d of drops) {
        ctx.strokeStyle = `rgba(${col},${d.a.toFixed(3)})`; ctx.lineWidth = 0.6 + d.z * 0.9;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * slant, d.y - d.l); ctx.stroke();
        d.y += d.v * sp * k; d.x -= d.v * sp * k * slant;
        if (d.y > H) {
          if (opts.ripples && d.z > 0.75 && ripples.length < 30) ripples.push({ x: d.x, y: H - 2 - Math.random() * 6, r: 1, a: 0.5 });
          Object.assign(d, mkDrop(false));
        }
        if (d.x < -100 || d.x > W + 100) d.x = Math.random() * W;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i]; ctx.strokeStyle = `rgba(${col},${p.a.toFixed(3)})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 2, p.r * 0.7, 0, 0, 6.283); ctx.stroke();
        p.r += 0.45 * k; p.a -= 0.03 * k; if (p.a <= 0) ripples.splice(i, 1);
      }
    }
    if (flakes.length) {
      const sp = opts.snow_speed / 100;
      ctx.fillStyle = "#fff";
      for (const f of flakes) {
        const x = f.x + Math.sin(t * f.sw + f.ph) * (12 * f.z + 4);
        ctx.globalAlpha = dark ? f.a : f.a * 0.9;
        ctx.fillStyle = dark ? "#ffffff" : "#f4f8ff";
        ctx.beginPath(); ctx.arc(x, f.y, f.r, 0, 6.283); ctx.fill();
        f.y += f.v * sp * k; f.x += (Math.sin(t * 0.3 + f.ph) * 0.15 + wind * 0.5) * k;
        if (f.y > H + 6 || f.x > W + 30 || f.x < -30) Object.assign(f, mkFlake(false));
      }
      ctx.globalAlpha = 1;
    }
    if (hail.length) {
      for (const h of hail) {
        ctx.fillStyle = `rgba(235,242,255,${h.a.toFixed(3)})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.fill();
        h.y += h.v * k; h.x -= h.v * k * 0.1;
        if (h.y > H) { if (h.b < 1) { h.b++; h.y = H - 2; h.v = -h.v * 0.35; } else Object.assign(h, mkHail(false)); }
        if (h.v < 0) { h.v += 0.8 * k; if (h.v >= 0) h.v = 11; }
      }
    }
    if (opts.lightning && effect === "storm") {
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 0.22 + Math.random() * 0.12; nextFlash = 6 + Math.random() * 10; }
      if (flash > 0.005) { ctx.fillStyle = `rgba(215,228,255,${flash.toFixed(3)})`; ctx.fillRect(0, 0, W, H); flash *= Math.pow(0.88, k); }
    }
  }

  function syncParticles() {
    const want = hass && dashboardAllowed() && themeAllowed() && opts.effects_enabled
      && !(opts.disable_on_mobile && mobile()) && !(opts.respect_reduced_motion && reduced())
      && !(opts.pause_when_hidden && document.hidden);
    if (!want) { stop(); return; }
    cv.style.display = "block"; cv.style.opacity = String(opts.particle_opacity / 100);
    mount(cv, 3);
    if (!running) { running = true; last = 0; rafId = requestAnimationFrame(frame); }
  }
  function stop() { if (running) { cancelAnimationFrame(rafId); running = false; } cv.style.display = "none"; ctx.clearRect(0, 0, W, H); }

  /* ------------------------------------------------------------------ loop */
  function readState() {
    const p = hass.states[PERIOD_ENTITY], e = hass.states[EFFECT_ENTITY];
    if (!p || !e || p.state === "unavailable") return false;
    const newOpts = { ...DEFAULTS, ...(p.attributes.options || {}) };
    const optsChanged = JSON.stringify(newOpts) !== JSON.stringify(opts);
    const changed = optsChanged || p.state !== period || e.state !== effect;
    opts = newOpts; period = p.state; effect = e.state;
    return changed || optsChanged;
  }
  let lastPath = "", sized = false;
  function tick() {
    const ha = document.querySelector("home-assistant");
    if (!ha || !ha.hass) return;
    hass = ha.hass;
    const changed = readState();
    if (changed || !sized) { sized = true; applyTheme(true); resize(); }
    else applyTheme(false);
    if (location.pathname !== lastPath) { lastPath = location.pathname; }
    if (overlayEl && overlayEl.style.display !== "none") mount(overlayEl, 2);
    syncParticles();
  }
  setInterval(tick, 1500);
  tick();
  addEventListener("resize", () => { if (hass) resize(); });
  document.addEventListener("visibilitychange", syncParticles);
  window.addEventListener("location-changed", () => setTimeout(tick, 50));
  buildSprites();
})();

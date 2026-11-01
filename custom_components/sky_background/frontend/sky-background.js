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
    show_sun: true, show_moon: true, sun_size: 100, moon_size: 100, sky_objects_opacity: 100, use_real_clouds: true, use_real_wind: true, use_real_visibility: true, layer: "behind", background_mode: "auto", overlay_intensity: 100, everywhere: false, color_mode: "auto", background_intensity: 100,
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

  /* ------------------------------------------------------------- astronomy */
  /* Sun and moon positions: SunCalc formulas (public domain math), accurate to about a degree. */
  const RAD = Math.PI / 180, OBL = RAD * 23.4397;
  const toDays = (d) => d.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
  const rAsc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));
  const decl = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
  const altitude = (H, phi, d) => Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H));
  const azimuth = (H, phi, d) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(d) * Math.cos(phi));
  const sidereal = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;
  function sunCoords(d) {
    const M = RAD * (357.5291 + 0.98560028 * d);
    const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + RAD * 102.9372 + Math.PI;
    return { dec: decl(L, 0), ra: rAsc(L, 0) };
  }
  function moonCoords(d) {
    const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d);
    const l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F);
    return { ra: rAsc(l, b), dec: decl(l, b), dist: 385001 - 20905 * Math.cos(M) };
  }
  function skyPositions(date, lat, lng) {
    const lw = RAD * -lng, phi = RAD * lat, d = toDays(date);
    const s = sunCoords(d), m = moonCoords(d);
    const Hs = sidereal(d, lw) - s.ra, Hm = sidereal(d, lw) - m.ra;
    const sd = 149598000;
    const psi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sd * Math.sin(psi), m.dist - sd * Math.cos(psi));
    const ang = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return {
      sunAlt: altitude(Hs, phi, s.dec) / RAD, sunAz: azimuth(Hs, phi, s.dec) / RAD + 180,
      moonAlt: altitude(Hm, phi, m.dec) / RAD, moonAz: azimuth(Hm, phi, m.dec) / RAD + 180,
      phase: 0.5 + 0.5 * inc * (ang < 0 ? -1 : 1) / Math.PI,
    };
  }
  let sky = { sunAlt: -30, sunAz: 0, moonAlt: -30, moonAz: 0, phase: 0 }, skyAt = 0;
  function updateSky(force) {
    const now = Date.now();
    if (!force && now - skyAt < 10000) return;
    skyAt = now;
    const c = (hass && hass.config) || {};
    if (typeof c.latitude === "number" && typeof c.longitude === "number") sky = skyPositions(new Date(), c.latitude, c.longitude);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ----------------------------------------------------------- weather info */
  let wx = {};
  const toKmh = (v, u) => v * ({ "km/h": 1, "m/s": 3.6, mph: 1.609, kn: 1.852, "ft/s": 1.097 }[u] || 1);
  const toKm = (v, u) => v * ({ km: 1, m: 0.001, mi: 1.609, ft: 0.0003048, cm: 0.00001 }[u] || 1);
  const COMPASS = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };
  /* dirX: -1 (blowing to the left) .. 1 (to the right); strength 0..1 */
  function windInfo() {
    if (opts.use_real_wind && typeof wx.wind_speed === "number") {
      const kmh = toKmh(wx.wind_speed, wx.wind_speed_unit);
      const brg = typeof wx.wind_bearing === "number" ? wx.wind_bearing : COMPASS[String(wx.wind_bearing || "").toUpperCase()];
      const strength = clamp(kmh / 50, 0, 1);
      if (typeof brg !== "number") return { dirX: 0.3, strength };
      return { dirX: -Math.sin(brg * RAD), strength };
    }
    return { dirX: Math.sign(opts.wind) || 0.3, strength: Math.abs(opts.wind) / 100 };
  }
  function haze() {
    let h = 0;
    if (opts.use_real_visibility && typeof wx.visibility === "number") h = clamp(1 - toKm(wx.visibility, wx.visibility_unit) / 10, 0, 1);
    return effect === "fog" ? Math.max(0.75, h) : h;
  }
  function cloudCover() {
    if (opts.use_real_clouds && typeof wx.cloud_coverage === "number") return clamp(wx.cloud_coverage, 0, 100);
    return { clear: 0, cloudy: 70, fog: 40, rain: 80, heavy_rain: 95, storm: 100, snow: 85, sleet: 85, hail: 90 }[effect] || 0;
  }
  /* how much of the sun, moon and stars gets through */
  function clarity() {
    if (opts.use_real_clouds && typeof wx.cloud_coverage === "number" && (effect === "clear" || effect === "cloudy")) return Math.max(0.05, 1 - 0.9 * wx.cloud_coverage / 100);
    const table = { clear: 1, cloudy: 0.45, fog: 0.2, rain: 0.15, heavy_rain: 0.08, storm: 0.04, snow: 0.18, sleet: 0.12, hail: 0.1 };
    return table[effect] === undefined ? 1 : table[effect];
  }

  /* ------------------------------------------------------------- particles */
  const cv = document.createElement("canvas");
  cv.id = "sky-background-canvas";
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;display:none";
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, drops = [], flakes = [], hail = [], ripples = [], stars = [], clouds = [], fogs = [];
  let t = 0, last = 0, flash = 0, nextFlash = 5, running = false, rafId = 0, fogSprite = null, cloudSprites = [], cloudKey = "";
  let sunSprites = null, moonHalo = null;

  const weak = () => (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  const mobile = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (matchMedia("(pointer:coarse)").matches && innerWidth < 800);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const factor = () => (opts.auto_reduce_weak_devices && weak() ? 0.5 : 1);

  const mkDrop = (init) => { const z = 0.4 + Math.random() * 0.6; return { x: Math.random() * (W + 240) - 120, y: init ? Math.random() * H : -30, z, v: (9 + Math.random() * 7) * z * 1.5, l: (10 + Math.random() * 16) * z, a: 0.15 + 0.4 * z }; };
  const mkFlake = (init) => { const z = Math.random(); return { x: Math.random() * W, y: init ? Math.random() * H : -10, z, r: 1 + z * 3.2, v: 0.4 + z * 1.3, ph: Math.random() * 6.28, sw: 0.4 + Math.random() * 0.8, a: 0.35 + z * 0.6 }; };
  const mkHail = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : -10, v: 11 + Math.random() * 6, r: 1.2 + Math.random() * 1.6, b: 0, a: 0.5 + Math.random() * 0.4 });

  function sprite(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); return c; }
  function buildSprites() {
    fogSprite = sprite(420, 200, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(200,212,230,0.16)"); r.addColorStop(1, "rgba(200,212,230,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const sun = (core, glow) => sprite(256, 256, (g) => {
      let r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, `rgba(${glow},0.55)`); r.addColorStop(0.18, `rgba(${glow},0.22)`); r.addColorStop(1, `rgba(${glow},0)`);
      g.fillStyle = r; g.fillRect(0, 0, 256, 256);
      r = g.createRadialGradient(128, 128, 0, 128, 128, 24);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.65, `rgba(${core},1)`); r.addColorStop(1, `rgba(${core},0)`);
      g.fillStyle = r; g.beginPath(); g.arc(128, 128, 24, 0, 6.283); g.fill();
    });
    sunSprites = { low: sun("255,170,90", "255,140,60"), mid: sun("255,214,130", "255,196,90"), high: sun("255,244,214", "255,236,170") };
    moonHalo = sprite(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, "rgba(200,215,245,0.32)"); r.addColorStop(0.2, "rgba(200,215,245,0.12)"); r.addColorStop(1, "rgba(200,215,245,0)"); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
  }

  /* cloud color follows the light: warm at dawn and dusk, blue-grey at night, darker in bad weather */
  function cloudRgb() {
    const dark = isDark(), sa = sky.sunAlt;
    const base = sa < -6 ? [120, 135, 170] : sa < 6 ? [255, 185, 140] : dark ? [225, 232, 245] : [120, 135, 160];
    const gray = dark ? [96, 106, 124] : [100, 112, 132];
    const m = Math.min(1, ((DIM[effect] || DIM.clear)[0]) / 0.4);
    return base.map((v, i) => Math.round(v * (1 - m) + gray[i] * m));
  }
  function buildClouds(rgb) {
    cloudSprites = Array.from({ length: 4 }, () => sprite(520, 200, (g, w, h) => {
      const puffs = 22 + Math.floor(Math.random() * 8);
      const lit = rgb.map((v) => Math.min(255, v + 28));
      for (let i = 0; i < puffs; i++) {
        const mid = 1 - Math.abs((i / puffs) * 2 - 1);
        const rad = 16 + Math.random() * 30 + mid * 16, x = 90 + (i / puffs) * 340 + (Math.random() - 0.5) * 40;
        const y = 140 - rad * (0.15 + Math.random() * 0.6) - mid * 26 * Math.random();
        const c = y < 112 ? lit : rgb;
        const r = g.createRadialGradient(x, y, 0, x, y, rad);
        r.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.24)`); r.addColorStop(0.55, `rgba(${c[0]},${c[1]},${c[2]},0.16)`); r.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        g.fillStyle = r; g.fillRect(0, 0, w, h);
      }
      g.globalCompositeOperation = "destination-out";
      const m = g.createLinearGradient(0, 138, 0, 178); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = m; g.fillRect(0, 138, w, h - 138);
    }));
    cloudKey = rgb.join(",");
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
    if (opts.clouds) {
      const n = Math.round(cloudCover() / 100 * 9 * Math.min(1.4, W / 900 + 0.4));
      for (let i = 0; i < n; i++) {
        const z = 0.3 + Math.random() * 0.7;
        clouds.push({ x: Math.random() * (W + 900) - 700, y: H * (0.03 + (1 - z) * 0.3 + Math.random() * 0.12), z, s: 0.6 + z * 1.2, k: Math.floor(Math.random() * 4) });
      }
    }
    if (opts.fog && haze() > 0.12) for (let i = 0; i < 7; i++) fogs.push({ x: Math.random() * (W + 420) - 420, y: H * (0.1 + Math.random() * 0.8), s: 1 + Math.random() * 1.4, v: 6 + Math.random() * 8 });
    const rgb = cloudRgb();
    if (rgb.join(",") !== cloudKey || !cloudSprites.length) buildClouds(rgb);
  }

  /* sky position -> screen: east-ish on the left, west-ish on the right, higher sun = higher on screen */
  const skyX = (az) => clamp(((az - 60) / 240) * W, 36, W - 36);
  const skyY = (alt) => H * (0.3 - 0.26 * clamp(alt, -8, 70) / 70);
  const edgeFade = (az) => (az < 25 || az > 335 ? 0 : 1);

  function drawSun(alpha) {
    if (!opts.show_sun || sky.sunAlt < -4) return;
    const a = clamp((sky.sunAlt + 3) / 9, 0, 1) * clarity() * alpha * edgeFade(sky.sunAz);
    if (a < 0.01) return;
    const x = skyX(sky.sunAz), y = skyY(sky.sunAlt), size = 190 * opts.sun_size / 100;
    const alt = sky.sunAlt;
    const mix = alt <= 4 ? [["low", 1]] : alt <= 12 ? [["low", 1 - (alt - 4) / 8], ["mid", (alt - 4) / 8]] : alt <= 22 ? [["mid", 1 - (alt - 12) / 10], ["high", (alt - 12) / 10]] : [["high", 1]];
    for (const [name, w] of mix) { ctx.globalAlpha = a * w * 0.95; ctx.drawImage(sunSprites[name], x - size / 2, y - size / 2, size, size); }
    ctx.globalAlpha = 1;
  }
  function drawMoon(alpha) {
    if (!opts.show_moon || sky.moonAlt < -4) return;
    const dayFactor = sky.sunAlt > -4 ? 0.3 : 1;
    const a = clamp((sky.moonAlt + 3) / 9, 0, 1) * clarity() * alpha * dayFactor * edgeFade(sky.moonAz);
    if (a < 0.01) return;
    const x = skyX(sky.moonAz), y = skyY(sky.moonAlt), r = 17 * opts.moon_size / 100;
    const k = Math.cos(sky.phase * 2 * Math.PI), waxing = sky.phase < 0.5;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.drawImage(moonHalo, x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(120,135,165,0.22)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.translate(x, y); ctx.scale(waxing ? 1 : -1, 1);
    ctx.fillStyle = "rgba(236,241,252,0.96)";
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(0, 0, Math.max(0.01, r * Math.abs(k)), r, 0, Math.PI / 2, k > 0 ? -Math.PI / 2 : 1.5 * Math.PI, k > 0);
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const animated = drops.length || flakes.length || hail.length || clouds.length || fogs.length || (opts.stars && isDark() && sky.sunAlt < -4);
    const step = animated ? 1000 / Math.max(10, opts.max_fps) : 1000;
    if (now - last < step) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0.033); last = now; t += dt;
    const k = dt * 60;
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();
    const alpha = opts.sky_objects_opacity / 100;
    const wnd = windInfo();

    if (opts.stars && dark && sky.sunAlt < -4) {
      const base = clamp((-4 - sky.sunAlt) / 10, 0, 1) * clarity();
      if (base > 0.02) for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${((0.25 + 0.35 * Math.sin(t * 1.2 + s.p)) * base).toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }
    drawMoon(alpha);
    drawSun(alpha);

    const cloudAlpha = effect === "clear" || effect === "cloudy" ? 1 : 1.25;
    for (const c of clouds) {
      ctx.globalAlpha = Math.min(1, (0.45 + 0.55 * c.z) * cloudAlpha * (dark ? 1 : 0.9));
      ctx.drawImage(cloudSprites[c.k], c.x, c.y, 520 * c.s, 200 * c.s);
      c.x += (wnd.dirX * (4 + wnd.strength * 34)) * (0.35 + c.z) * dt;
      if (c.x > W + 40) c.x = -520 * c.s; else if (c.x < -520 * c.s - 40) c.x = W + 20;
    }
    ctx.globalAlpha = 1;
    if (fogs.length) {
      ctx.globalAlpha = Math.max(0.3, haze());
      for (const f of fogs) { ctx.drawImage(fogSprite, f.x, f.y, 420 * f.s, 200 * f.s); f.x += f.v * dt * (wnd.dirX || 1); if (f.x > W) f.x = -420 * f.s; else if (f.x < -420 * f.s) f.x = W; }
      ctx.globalAlpha = 1;
    }

    if (drops.length) {
      const sp = opts.rain_speed / 100, slant = wnd.dirX * (0.08 + wnd.strength * 0.6);
      ctx.lineCap = "round";
      const col = dark ? "190,220,255" : "70,110,160";
      for (const d of drops) {
        ctx.strokeStyle = `rgba(${col},${d.a.toFixed(3)})`; ctx.lineWidth = 0.6 + d.z * 0.9;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * slant, d.y - d.l); ctx.stroke();
        d.y += d.v * sp * k; d.x += d.v * sp * k * slant;
        if (d.y > H) {
          if (opts.ripples && d.z > 0.75 && ripples.length < 30) ripples.push({ x: d.x, y: H - 2 - Math.random() * 6, r: 1, a: 0.5 });
          Object.assign(d, mkDrop(false));
        }
        if (d.x < -140 || d.x > W + 140) d.x = Math.random() * W;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i]; ctx.strokeStyle = `rgba(${col},${p.a.toFixed(3)})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 2, p.r * 0.7, 0, 0, 6.283); ctx.stroke();
        p.r += 0.45 * k; p.a -= 0.03 * k; if (p.a <= 0) ripples.splice(i, 1);
      }
    }
    if (flakes.length) {
      const sp = opts.snow_speed / 100;
      for (const f of flakes) {
        const x = f.x + Math.sin(t * f.sw + f.ph) * (12 * f.z + 4);
        ctx.globalAlpha = dark ? f.a : f.a * 0.9;
        ctx.fillStyle = dark ? "#ffffff" : "#f4f8ff";
        ctx.beginPath(); ctx.arc(x, f.y, f.r, 0, 6.283); ctx.fill();
        f.y += f.v * sp * k; f.x += (Math.sin(t * 0.3 + f.ph) * 0.15 + wnd.dirX * wnd.strength * 1.6) * k;
        if (f.y > H + 6 || f.x > W + 30 || f.x < -30) Object.assign(f, mkFlake(false));
      }
      ctx.globalAlpha = 1;
    }
    if (hail.length) {
      for (const h of hail) {
        ctx.fillStyle = `rgba(235,242,255,${h.a.toFixed(3)})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.fill();
        h.y += h.v * k; h.x += h.v * k * 0.1 * wnd.dirX;
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
    const a = p.attributes;
    const newOpts = { ...DEFAULTS, ...(a.options || {}) };
    const newWx = {};
    for (const k of ["cloud_coverage", "wind_speed", "wind_speed_unit", "wind_bearing", "visibility", "visibility_unit"]) if (a[k] !== undefined && a[k] !== null) newWx[k] = a[k];
    const optsChanged = JSON.stringify(newOpts) !== JSON.stringify(opts);
    const wxChanged = JSON.stringify(newWx) !== JSON.stringify(wx);
    const changed = optsChanged || wxChanged || p.state !== period || e.state !== effect;
    opts = newOpts; wx = newWx; period = p.state; effect = e.state;
    return changed;
  }
  let sized = false;
  function tick() {
    const ha = document.querySelector("home-assistant");
    if (!ha || !ha.hass) return;
    hass = ha.hass;
    const changed = readState();
    updateSky(changed || !sized);
    if (changed || !sized) { sized = true; applyTheme(true); resize(); }
    else applyTheme(false);
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

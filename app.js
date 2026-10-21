// Tide Wolf: San Diego tides, water temperature, surf and a "go snorkel now?" verdict.
// Data: tides.json (NOAA, refreshed by a GitHub Action), Open-Meteo marine + weather (live, no key).
"use strict";

const TZ = "America/Los_Angeles";
const $ = (id) => document.getElementById(id);
const HOUR = 3600e3;

// ---------- settings, saved on this phone ----------
const KEY = "tidewolf1";
const DEF = { skin: "night", mode: "auto", unit: "f", sound: "on", haptic: "on", beach: "cove", favs: ["cove", "shores"], swims: [], loc: null, seenVer: "" };
let S = { ...DEF };
try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const cacheGet = (k) => { try { return JSON.parse(localStorage.getItem("tw-" + k) || "null"); } catch { return null; } };
const cacheSet = (k, v) => { try { localStorage.setItem("tw-" + k, JSON.stringify(v)); } catch {} };

// ---------- formatting ----------
const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fmtHour = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric" });
const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const fmtDate = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const fmtClock = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" });
const fmtYmd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const t = (ms) => fmtTime.format(ms).replace(":00", "").replace(" ", "").toLowerCase();
const hr = (ms) => fmtHour.format(ms).replace(" ", "").toLowerCase();
const cOf = (f) => Math.round((f - 32) * 5 / 9);
const temp = (f) => f == null ? "—" : S.unit === "c" ? `${cOf(f)}°C <small>${Math.round(f)}°F</small>` : `${Math.round(f)}°F <small>${cOf(f)}°C</small>`;
const tempTxt = (f) => S.unit === "c" ? `${cOf(f)}°C` : `${Math.round(f)}°F`;
const ft = (v) => v == null ? "—" : `${v.toFixed(1)} ft`;
const ago = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
const compass = (deg) => deg == null ? "" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const WX = (c) => c == null ? "🌡️" : c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : c <= 67 ? "🌧️" : c <= 77 ? "🌨️" : c <= 82 ? "🌦️" : "⛈️";

// ---------- sound and haptics (both optional) ----------
let ac;
function tone(freq, at = 0, dur = 0.12, type = "sine", vol = 0.12) {
  if (S.sound !== "on") return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now + dur + 0.05);
  } catch {}
}
const blip = () => tone(880, 0, 0.07, "triangle", 0.06);
function howl() {
  if (S.sound !== "on") return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
    o.type = "sawtooth"; o.frequency.setValueAtTime(320, n); o.frequency.exponentialRampToValueAtTime(720, n + 0.5); o.frequency.exponentialRampToValueAtTime(420, n + 1.3);
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.09, n + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, n + 1.4);
    o.connect(f).connect(g).connect(ac.destination); o.start(n); o.stop(n + 1.5);
  } catch {}
}
const buzz = (() => {
  let lbl;
  return (times = 1) => {
    if (S.haptic !== "on") return;
    if (navigator.vibrate) { navigator.vibrate(times === 1 ? 12 : [20, 60, 20, 60, 20].slice(0, times * 2 - 1)); return; }
    // iPhone (iOS 18+): toggling a hidden switch control gives a haptic tick
    if (!lbl) {
      const inp = document.createElement("input"); inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.id = "hapticSwitch";
      lbl = document.createElement("label"); lbl.htmlFor = "hapticSwitch";
      for (const el of [inp, lbl]) { el.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el); }
    }
    for (let i = 0; i < times; i++) setTimeout(() => lbl.click(), i * 110);
  };
})();

let toastT;
function toast(msg, ms = 2600) {
  const el = $("toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), ms);
}

// ---------- Wolfie ----------
function drawWolf(mood = "happy") {
  const eyes = {
    happy: '<path d="M22 31q3-4 6 0M36 31q3-4 6 0" style="stroke:var(--bg1);stroke-width:2.6;fill:none;stroke-linecap:round"/>',
    meh: '<circle cx="25" cy="30" r="2.6" style="fill:var(--bg1)"/><circle cx="39" cy="30" r="2.6" style="fill:var(--bg1)"/>',
    sad: '<path d="M22 29l6 2M42 29l-6 2" style="stroke:var(--bg1);stroke-width:2.6;stroke-linecap:round"/>',
    sleepy: '<path d="M22 31h6M36 31h6" style="stroke:var(--bg1);stroke-width:2.6;stroke-linecap:round"/>'
  }[mood];
  const mouth = {
    happy: '<path d="M27 44q5 6 10 0" style="stroke:var(--bg1);stroke-width:2.4;fill:none;stroke-linecap:round"/><path d="M30 46q2 6 4 0z" style="fill:#ff6b8a"/>',
    meh: '<path d="M28 45h8" style="stroke:var(--bg1);stroke-width:2.4;stroke-linecap:round"/>',
    sad: '<path d="M27 47q5-5 10 0" style="stroke:var(--bg1);stroke-width:2.4;fill:none;stroke-linecap:round"/>',
    sleepy: '<path d="M29 45q3 2 6 0" style="stroke:var(--bg1);stroke-width:2.4;fill:none;stroke-linecap:round"/><text x="46" y="16" style="fill:var(--accent);font:700 10px var(--font)">z</text><text x="52" y="9" style="fill:var(--accent);font:700 8px var(--font)">z</text>'
  }[mood];
  $("wolf").innerHTML =
    '<path d="M10 6l14 14H40L54 6l2 26c0 15-11 26-24 26S8 47 8 32z" style="fill:var(--accent2)"/>' +
    '<path d="M15 14l7 8M49 14l-7 8" style="stroke:var(--bg1);stroke-width:2;opacity:.5"/>' +
    '<path d="M20 38c0-6 5-9 12-9s12 3 12 9c0 8-5 14-12 14s-12-6-12-14z" style="fill:var(--text);opacity:.92"/>' +
    '<ellipse cx="32" cy="38" rx="4" ry="3" style="fill:var(--bg1)"/>' + eyes + mouth;
}
const TIPS = [
  "Go early: mornings are usually calmer before the afternoon sea breeze.",
  "After rain the county asks everyone to stay out of the ocean for 72 hours.",
  "La Jolla Cove is a marine reserve. Look, don't take.",
  "Shuffle your feet at La Jolla Shores so stingrays scoot away.",
  "A rising tide usually brings in clearer water.",
  "Sea lions are cute and grumpy. Give them space.",
  "Long-period swell (14 s and up) surges hard at rocky entries.",
  "Under 62°F? A 5 mm wetsuit keeps the fun going.",
  "Snorkel with a buddy. Even wolves hunt in packs. 🐺"
];

// ---------- data loading ----------
const D = { tides: null, tidesAt: 0, marine: null, marineAt: 0, wx: null, wxAt: 0, offline: false };
const lats = BEACHES.map((b) => b.lat).join(","), lons = BEACHES.map((b) => b.lon).join(",");

async function getJSON(url, ms = 15000) {
  const res = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function loadTides() {
  try {
    const j = await getJSON("tides.json?t=" + Math.floor(Date.now() / 60000));
    D.tides = j.stations; D.tidesAt = Date.parse(j.updated); cacheSet("tides", j);
  } catch {
    const c = cacheGet("tides"); if (c) { D.tides = c.stations; D.tidesAt = Date.parse(c.updated); }
  }
  // tides.json missing or very old (GitHub skipped the refresh): ask NOAA straight from the phone
  const needed = [...new Set(BEACHES.map((b) => b.station))];
  const stale = !D.tides || Date.now() - D.tidesAt > 36 * HOUR || needed.some((id) => !D.tides[id] || !D.tides[id].curve.length || Date.parse(D.tides[id].curve.at(-1).t) < Date.now() + 12 * HOUR);
  if (!stale) return;
  try {
    const out = { ...(D.tides || {}) };
    for (const id of needed) out[id] = await noaaLive(id);
    D.tides = out; D.tidesAt = Date.now(); cacheSet("tides", { updated: new Date().toISOString(), stations: out });
  } catch {}
}
async function noaaLive(id) {
  const begin = new Date(Date.now() - 36 * HOUR).toISOString().slice(0, 10).replace(/-/g, "");
  const base = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?application=TideWolf&format=json&units=english&time_zone=gmt&datum=MLLW&product=predictions&range=120&station=" + id + "&begin_date=" + begin;
  const iso = (s) => s.replace(" ", "T") + ":00Z";
  const [h, c] = await Promise.all([getJSON(base + "&interval=hilo"), getJSON(base + "&interval=30")]);
  return { name: STATIONS[id].name, hilo: h.predictions.map((p) => ({ t: iso(p.t), v: +p.v, type: p.type })), curve: c.predictions.map((p) => ({ t: iso(p.t), v: +p.v })), water: (D.tides && D.tides[id] && D.tides[id].water) || null };
}

async function loadMarine() {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}` +
    "&current=wave_height,wave_period,wave_direction,sea_surface_temperature&hourly=wave_height,wave_period" +
    "&length_unit=imperial&timezone=America%2FLos_Angeles&forecast_days=2";
  try { const j = await getJSON(url); D.marine = Array.isArray(j) ? j : [j]; D.marineAt = Date.now(); cacheSet("marine", { at: D.marineAt, data: D.marine }); }
  catch { const c = cacheGet("marine"); if (c) { D.marine = c.data; D.marineAt = c.at; D.offline = true; } }
}
async function loadWx() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    "&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m" +
    "&hourly=wind_speed_10m,weather_code,precipitation&daily=sunrise,sunset&past_days=3&forecast_days=2" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles";
  try { const j = await getJSON(url); D.wx = Array.isArray(j) ? j : [j]; D.wxAt = Date.now(); cacheSet("wx", { at: D.wxAt, data: D.wx }); }
  catch { const c = cacheGet("wx"); if (c) { D.wx = c.data; D.wxAt = c.at; D.offline = true; } }
}

// Open-Meteo gives local times without an offset; turn them into real timestamps
const omTime = (s, off) => Date.parse(s + (s.length === 10 ? "T00:00" : "") + "Z") - off * 1000;
function hourly(src, key, at) {
  if (!src || !src.hourly || !src.hourly[key]) return null;
  const off = src.utc_offset_seconds || 0, times = src.hourly.time;
  const first = omTime(times[0], off), i = Math.round((at - first) / HOUR);
  return i >= 0 && i < times.length ? src.hourly[key][i] : null;
}

// ---------- tide math ----------
function tideAt(st, at) {
  const c = st && st.curve; if (!c || c.length < 2) return null;
  for (let i = 1; i < c.length; i++) {
    const t1 = Date.parse(c[i].t);
    if (t1 >= at) { const t0 = Date.parse(c[i - 1].t); if (t0 > at) return null; const f = (at - t0) / (t1 - t0); return c[i - 1].v + (c[i].v - c[i - 1].v) * f; }
  }
  return null;
}
const nextTide = (st, at) => st && st.hilo ? st.hilo.find((p) => Date.parse(p.t) > at) : null;

// ---------- the verdict ----------
function conditions(b, at) {
  const i = BEACHES.indexOf(b), m = D.marine && D.marine[i], w = D.wx && D.wx[i], st = D.tides && D.tides[b.station];
  const now = Math.abs(at - Date.now()) < HOUR;
  const c = {
    wave: now && m && m.current ? m.current.wave_height : hourly(m, "wave_height", at),
    period: now && m && m.current ? m.current.wave_period : hourly(m, "wave_period", at),
    waveDir: m && m.current ? m.current.wave_direction : null,
    wind: now && w && w.current ? w.current.wind_speed_10m : hourly(w, "wind_speed_10m", at),
    gust: w && w.current ? w.current.wind_gusts_10m : null,
    windDir: w && w.current ? w.current.wind_direction_10m : null,
    code: now && w && w.current ? w.current.weather_code : hourly(w, "weather_code", at),
    air: w && w.current ? w.current.temperature_2m : null,
    tide: tideAt(st, at), tideSoon: tideAt(st, at + 15 * 60e3), next: nextTide(st, at),
    water: null, rain: null, sunrise: null, sunset: null
  };
  // Water: the NOAA pier sensor when it's fresh and close by, otherwise the Open-Meteo sea-surface estimate
  const sinfo = STATIONS[b.station];
  if (st && st.water && sinfo.ocean && dist(b, sinfo) < 0.12 && Date.now() - Date.parse(st.water.t) < 12 * HOUR) c.water = st.water.f;
  if (c.water == null && m && m.current && m.current.sea_surface_temperature != null) c.water = m.current.sea_surface_temperature * 9 / 5 + 32;
  // Rain in the 72 hours before this moment (past hours plus forecast)
  if (w && w.hourly && w.hourly.precipitation) {
    const off = w.utc_offset_seconds || 0; let sum = 0;
    w.hourly.time.forEach((tm, k) => { const ms = omTime(tm, off); if (ms <= at && ms > at - 72 * HOUR) sum += w.hourly.precipitation[k] || 0; });
    c.rain = sum;
  }
  if (w && w.daily) {
    const off = w.utc_offset_seconds || 0, day = fmtYmd.format(at), k = w.daily.time.indexOf(day);
    if (k >= 0) { c.sunrise = omTime(w.daily.sunrise[k], off); c.sunset = omTime(w.daily.sunset[k], off); }
  }
  return c;
}

function judge(b, at = Date.now()) {
  const c = conditions(b, at), R = [];
  let s = 100, hard = false;
  const add = (cls, txt) => R.push({ cls, txt });

  if (c.sunrise && (at < c.sunrise - 20 * 60e3 || at > c.sunset + 10 * 60e3)) { hard = true; add("bad", `It's dark. Sunrise is at ${t(c.sunrise > at ? c.sunrise : c.sunrise + 24 * HOUR)}.`); }
  if (c.rain != null && c.rain >= 0.1) { hard = true; s -= 50; add("bad", `${c.rain.toFixed(2)} in of rain in the last 3 days. Runoff advisory: the county says stay out for 72 hours.`); }
  if (c.code != null && c.code >= 95) { hard = true; add("bad", "Thunderstorms around. Stay out of the water."); }

  if (c.wave == null) add("", "Wave data is napping right now.");
  else if (c.wave <= 1.5) add("good", `Calm water, waves about ${c.wave.toFixed(1)} ft.`);
  else if (c.wave <= 2.5) { s -= 12; add("ok", `Small waves, ${c.wave.toFixed(1)} ft. Fine at sheltered spots.`); }
  else if (c.wave <= 4) { s -= 35; add("bad", `Choppy: ${c.wave.toFixed(1)} ft waves will stir up sand.`); }
  else { s -= 60; hard = hard || c.wave > 5; add("bad", `Big surf, ${c.wave.toFixed(1)} ft. Surfers only today.`); }
  if (c.period >= 14 && c.wave > 2) { s -= 8; add("ok", `Long-period swell (${Math.round(c.period)} s) surges at rocky entries.`); }

  if (c.wind == null) {}
  else if (c.wind <= 8) add("good", `Light wind, ${Math.round(c.wind)} mph.`);
  else if (c.wind <= 14) { s -= 12; add("ok", `Breezy, ${Math.round(c.wind)} mph. A bit of chop on top.`); }
  else if (c.wind <= 20) { s -= 30; add("bad", `Windy, ${Math.round(c.wind)} mph. Bumpy and murky.`); }
  else { s -= 45; add("bad", `Very windy, ${Math.round(c.wind)} mph.`); }

  if (c.tide != null) {
    const rising = c.tideSoon != null && c.tideSoon > c.tide;
    if (c.tide < 0.5) { s -= 15; add("ok", `Very low tide (${c.tide.toFixed(1)} ft). Rocky entries get tricky, but tide pools are great.`); }
    else if (rising) add("good", `Tide rising (${c.tide.toFixed(1)} ft), which usually brings clearer water.`);
    else { s -= 5; add("ok", `Tide falling (${c.tide.toFixed(1)} ft). Water can get a little cloudier.`); }
  }

  if (c.water != null) {
    if (c.water >= 68) add("good", `Water ${tempTxt(c.water)}: rash guard weather.`);
    else if (c.water >= 63) add("good", `Water ${tempTxt(c.water)}: a 3 mm wetsuit is comfy.`);
    else if (c.water >= 58) { s -= 8; add("ok", `Water ${tempTxt(c.water)}: bring a 5 mm wetsuit.`); }
    else { s -= 18; add("bad", `Water ${tempTxt(c.water)}: brr, thick wetsuit and a hood.`); }
  }
  if (b.snorkel >= 3) add("good", "One of San Diego's best snorkel spots.");
  else { s -= 20; add("ok", "More of a swim beach. Few fish to see here."); }

  s = Math.max(0, Math.min(100, Math.round(s)));
  const v = hard ? "nope" : s >= 72 ? "go" : s >= 45 ? "maybe" : "nope";
  return { v, s, R, c, dark: R[0] && R[0].txt.startsWith("It's dark") };
}

function bestWindow(b) {
  // Score every daylight hour left today (or tomorrow once the day is done), take the best hour
  // and grow it into a window with the neighbouring hours that score nearly as well.
  const c0 = conditions(b, Date.now()); if (!c0.sunrise) return null;
  const tryDay = (start, end) => {
    const hrs = [];
    for (let h = Math.ceil(start / HOUR) * HOUR; h <= end - HOUR; h += HOUR) { const j = judge(b, h); hrs.push({ h, s: j.v === "nope" ? -1 : j.s }); }
    if (!hrs.length) return null;
    let k = 0; hrs.forEach((x, i) => { if (x.s > hrs[k].s) k = i; });
    if (hrs[k].s < 45) return null;
    let a = k, z = k; const top = hrs[k].s;
    while (a > 0 && hrs[a - 1].s >= top - 8) a--;
    while (z < hrs.length - 1 && hrs[z + 1].s >= top - 8) z++;
    return { start: hrs[a].h, end: hrs[z].h + HOUR, s: top };
  };
  const now = Date.now();
  if (now < c0.sunset - HOUR) { const w = tryDay(Math.max(now, c0.sunrise), c0.sunset); if (w) return { ...w, day: "today" }; }
  const tm = conditions(b, now + 24 * HOUR);
  if (tm.sunrise) { const w = tryDay(tm.sunrise, tm.sunset); if (w) return { ...w, day: "tomorrow" }; }
  return null;
}

// ---------- rendering ----------
const beachById = (id) => BEACHES.find((b) => b.id === id) || BEACHES[0];
const dist = (a, b) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180));

function orderedBeaches() {
  const list = [...BEACHES];
  if (S.loc) list.sort((a, b) => dist(S.loc, a) - dist(S.loc, b));
  return list.sort((a, b) => (S.favs.includes(b.id) - S.favs.includes(a.id)));
}

function renderBeaches() {
  const ready = D.marine || D.wx || D.tides;
  $("beaches").innerHTML = orderedBeaches().map((b) => {
    const v = ready ? judge(b).v : "";
    return `<div class="beach${b.id === S.beach ? " on" : ""}" role="button" tabindex="0" data-id="${b.id}" aria-pressed="${b.id === S.beach}">` +
      `<span class="dot ${v}"></span>${esc(b.name)}<button class="star${S.favs.includes(b.id) ? " fav" : ""}" data-fav="${b.id}" aria-label="Favorite ${esc(b.name)}">${S.favs.includes(b.id) ? "★" : "☆"}</button></div>`;
  }).join("");
}

function render() {
  const b = beachById(S.beach), j = judge(b), c = j.c;
  $("vBeach").textContent = b.name;
  const card = $("verdict"); card.className = "card verdict " + j.v;
  $("vWord").textContent = { go: "GO!", maybe: "MAYBE", nope: "NOPE" }[j.v];
  $("vScore").textContent = j.s;
  const lines = {
    go: ["Grab your mask. The ocean says yes.", "Conditions look sweet. Go find some Garibaldi.", "Wolfie approves. Fins on!"],
    maybe: ["Doable, but not dreamy.", "Check it from the cliff first.", "Fine for a swim, so-so for seeing fish."],
    nope: ["Not today, pup. Maybe a tide pool walk?", "The ocean is grumpy. Try another time.", "Wolfie says stay dry for now."]
  };
  $("vLine").textContent = j.dark ? "Wolfie is asleep. Check back after sunrise." : lines[j.v][new Date().getHours() % 3];
  $("reasons").innerHTML = j.R.map((r) => `<li class="${r.cls}">${esc(r.txt)}</li>`).join("");
  drawWolf(j.dark ? "sleepy" : j.v === "go" ? "happy" : j.v === "maybe" ? "meh" : "sad");

  const win = bestWindow(b), we = $("window");
  if (win) { we.hidden = false; we.textContent = `⏰ Best window ${win.day}: ${hr(win.start)}–${hr(win.end)} (score ${win.s})`; }
  else if (D.marine || D.wx) { we.hidden = false; we.textContent = "⏰ No good window today or tomorrow. Tide pools, anyone?"; }
  else we.hidden = true;

  // stat tiles
  const st = D.tides && D.tides[b.station];
  const rising = c.tide != null && c.tideSoon != null ? (c.tideSoon > c.tide ? "↑ rising" : "↓ falling") : "";
  const tiles = [
    ["🌊 Tide now", ft(c.tide), c.next ? `${rising} · ${c.next.type === "H" ? "high" : "low"} ${c.next.v.toFixed(1)} ft at ${t(Date.parse(c.next.t))}` : rising],
    ["🌡️ Water", temp(c.water), st && st.water && c.water === st.water.f ? `pier sensor · ${ago(Date.parse(st.water.t))}` : "sea-surface estimate"],
    ["〰️ Waves", ft(c.wave), c.period ? `${Math.round(c.period)} s period${c.waveDir != null ? " · from " + compass(c.waveDir) : ""}` : ""],
    ["💨 Wind", c.wind == null ? "—" : `${Math.round(c.wind)} mph`, c.gust != null ? `gusts ${Math.round(c.gust)}${c.windDir != null ? " · from " + compass(c.windDir) : ""}` : ""],
    [`${WX(c.code)} Air`, temp(c.air), c.rain != null ? `rain last 3 days: ${c.rain.toFixed(2)} in` : ""],
    ["🌅 Sun", c.sunset ? t(c.sunset) : "—", c.sunrise ? `sunset · sunrise ${t(c.sunrise)}` : ""]
  ];
  $("stats").innerHTML = tiles.map(([l, v, s]) => `<div class="stat"><div class="lbl">${l}</div><b>${v}</b><small>${esc(s)}</small></div>`).join("");

  renderChart(b, c);
  $("beachTip").textContent = b.tip;
  $("mapLink").href = `https://maps.apple.com/?daddr=${b.lat},${b.lon}&q=${encodeURIComponent(b.name)}`;
  renderBeaches();
  renderAge();
}

function renderChart(b, c) {
  const st = D.tides && D.tides[b.station], el = $("chart");
  $("tideStation").textContent = st ? "NOAA " + st.name : "";
  if (!st || !st.curve || !st.curve.length) { el.innerHTML = '<p class="muted">Tide data isn\'t here yet. It shows up as soon as the phone has a signal.</p>'; $("tideList").innerHTML = ""; return; }
  // today, midnight to midnight in San Diego
  const day = fmtYmd.format(Date.now());
  const off = (D.wx && D.wx[0] && D.wx[0].utc_offset_seconds) || -7 * 3600;
  const t0 = Date.parse(day + "T00:00:00Z") - off * 1000, t1 = t0 + 24 * HOUR;
  const pts = st.curve.map((p) => [Date.parse(p.t), p.v]).filter(([ms]) => ms >= t0 - HOUR && ms <= t1 + HOUR);
  if (pts.length < 3) { el.innerHTML = '<p class="muted">Waiting for fresh tide predictions.</p>'; return; }
  const W = 600, H = 190, P = { l: 30, r: 10, t: 22, b: 22 };
  const vs = pts.map((p) => p[1]), lo = Math.floor(Math.min(...vs) - 0.3), hi = Math.ceil(Math.max(...vs) + 0.3);
  const x = (ms) => P.l + (ms - t0) / (t1 - t0) * (W - P.l - P.r), y = (v) => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
  const clip = pts.filter(([ms]) => ms >= t0 && ms <= t1);
  const line = clip.map(([ms, v], i) => `${i ? "L" : "M"}${x(ms).toFixed(1)},${y(v).toFixed(1)}`).join("");
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tide height through today">`;
  if (c.sunrise) svg += `<rect class="night" x="${P.l}" y="${P.t}" width="${(x(c.sunrise) - P.l).toFixed(1)}" height="${H - P.t - P.b}"/><rect class="night" x="${x(c.sunset).toFixed(1)}" y="${P.t}" width="${(W - P.r - x(c.sunset)).toFixed(1)}" height="${H - P.t - P.b}"/>`;
  svg += '<g class="grid">';
  for (let v = lo; v <= hi; v += (hi - lo > 6 ? 2 : 1)) svg += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  for (let h = 6; h < 24; h += 6) svg += `<text x="${x(t0 + h * HOUR)}" y="${H - 6}" text-anchor="middle">${h === 12 ? "noon" : h < 12 ? h + "am" : h - 12 + "pm"}</text>`;
  svg += "</g>";
  svg += `<path class="area" d="${line}L${x(clip.at(-1)[0]).toFixed(1)},${H - P.b}L${x(clip[0][0]).toFixed(1)},${H - P.b}Z"/><path class="curve" d="${line}"/>`;
  for (const p of st.hilo) {
    const ms = Date.parse(p.t); if (ms < t0 || ms > t1) continue;
    const yy = y(p.v) + (p.type === "H" ? -8 : 16);
    svg += `<text class="hl" x="${Math.min(W - 40, Math.max(P.l + 20, x(ms)))}" y="${yy}" text-anchor="middle">${p.type === "H" ? "▲" : "▼"} ${p.v.toFixed(1)}′ ${t(ms)}</text>`;
  }
  const now = Date.now(), tn = tideAt(st, now);
  if (tn != null && now >= t0 && now <= t1) svg += `<line class="now" x1="${x(now)}" x2="${x(now)}" y1="${P.t}" y2="${H - P.b}"/><circle class="nowdot" cx="${x(now)}" cy="${y(tn)}" r="5"/>`;
  el.innerHTML = svg + "</svg>";
  const list = st.hilo.filter((p) => { const ms = Date.parse(p.t); return ms >= t0 && ms < t1 + 24 * HOUR; }).slice(0, 8);
  $("tideList").innerHTML = list.map((p) => { const ms = Date.parse(p.t); return `<div class="${ms < now ? "past" : ""}">${p.type === "H" ? "▲ High" : "▼ Low"} <b>${p.v.toFixed(1)} ft</b><br>${ms >= t1 ? fmtDay.format(ms) + " " : ""}${t(ms)}</div>`; }).join("");
}

function renderAge() {
  const parts = [];
  if (D.tidesAt) parts.push(`tides ${ago(D.tidesAt)}`);
  if (D.marineAt) parts.push(`waves ${ago(D.marineAt)}`);
  $("age").textContent = (D.offline ? "📴 Offline, showing saved data · " : "Updated: ") + (parts.join(" · ") || "waiting for data");
}

function renderSwims() {
  const list = S.swims.slice().reverse();
  const yr = new Date().getFullYear();
  $("swimCount").textContent = S.swims.length ? `${S.swims.length} total · ${S.swims.filter((s) => new Date(s.t).getFullYear() === yr).length} this year` : "";
  $("swims").innerHTML = list.length ? list.slice(0, 12).map((s) =>
    `<div class="s"><span>${fmtDate.format(s.t)} · ${esc(beachById(s.beach).name)}</span><span>${s.v.toUpperCase()}${s.water ? " · " + tempTxt(s.water) : ""}${s.wave != null ? " · " + s.wave.toFixed(1) + " ft" : ""} <button class="linkish" data-del="${s.t}" aria-label="Delete this swim">✕</button></span></div>`).join("")
    : '<p class="muted small">Tap "I went in!" after a swim and Wolfie keeps score.</p>';
}

function renderNews() {
  $("newsList").innerHTML = CHANGELOG.map((c) => `<div class="news-item"><h3>${esc(c.version)} · ${esc(c.title)}</h3><div class="muted small">${esc(c.date)}</div><ul>${c.changes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("");
}

// ---------- confetti ----------
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = $("confetti"), ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement), cols = ["--accent", "--accent2", "--sea", "--go", "--maybe"].map((v) => cs.getPropertyValue(v).trim() || "#4dffb0");
  const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.7, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 14 - 6, r: Math.random() * 6 + 3, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6 }));
  const end = performance.now() + 2400;
  (function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    if (now < end) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(performance.now());
}

// ---------- settings UI ----------
function applyTheme() {
  const dark = S.mode === "dark" || (S.mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.skin = S.skin;
  document.documentElement.dataset.mode = dark ? "dark" : "light";
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg1").trim();
  document.querySelector('meta[name="theme-color"]').content = bg || "#0b0820";
}
function syncSegs() {
  for (const [seg, key] of [["skinSeg", "skin"], ["modeSeg", "mode"], ["unitSeg", "unit"], ["soundSeg", "sound"], ["hapSeg", "haptic"]])
    $(seg).querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === S[key]));
}
const openSheet = (id) => { $(id).hidden = false; blip(); };
document.addEventListener("click", (e) => {
  if (e.target.matches("[data-close]") || e.target.classList.contains("sheet-back")) e.target.closest(".sheet-back").hidden = true;
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".sheet-back").forEach((s) => (s.hidden = true)); });

for (const [seg, key] of [["skinSeg", "skin"], ["modeSeg", "mode"], ["unitSeg", "unit"], ["soundSeg", "sound"], ["hapSeg", "haptic"]]) {
  $(seg).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S[key] = b.dataset.v; save(); syncSegs(); applyTheme(); buzz(); blip();
    if (key === "unit") { render(); renderSwims(); }
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

$("beaches").addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) {
    const id = fav.dataset.fav; S.favs = S.favs.includes(id) ? S.favs.filter((x) => x !== id) : [...S.favs, id];
    save(); buzz(); blip(); renderBeaches(); return;
  }
  const b = e.target.closest(".beach"); if (!b) return;
  S.beach = b.dataset.id; save(); buzz(); blip(); render();
});
$("beaches").addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("beach")) { e.preventDefault(); e.target.click(); } });

$("wolfBtn").addEventListener("click", () => { buzz(); tone(660, 0, 0.08); tone(990, 0.08, 0.1); toast("🐺 " + TIPS[Math.floor(Math.random() * TIPS.length)], 4500); });
$("setBtn").addEventListener("click", () => openSheet("setSheet"));
$("newsBtn").addEventListener("click", () => openSheet("newsSheet"));
$("verBtn").addEventListener("click", () => openSheet("newsSheet"));

$("wentBtn").addEventListener("click", () => {
  const b = beachById(S.beach), j = judge(b);
  S.swims.push({ t: Date.now(), beach: b.id, v: j.v, s: j.s, water: j.c.water != null ? Math.round(j.c.water) : null, wave: j.c.wave });
  save(); renderSwims(); confetti(); howl(); buzz(3);
  const n = S.swims.length;
  toast(n === 1 ? "🎉 First swim logged! Welcome to the pack." : n % 10 === 0 ? `🏆 Swim #${n}! Legendary sea wolf.` : `🐺 Swim #${n} logged. Awoooo!`);
});
$("swims").addEventListener("click", (e) => {
  const d = e.target.closest("[data-del]"); if (!d) return;
  const keep = S.swims.filter((s) => String(s.t) !== d.dataset.del);
  const removed = S.swims; S.swims = keep; save(); renderSwims(); buzz();
  toast("Swim removed. Tap here to undo.", 5000);
  const el = $("toast"); el.onclick = () => { S.swims = removed; save(); renderSwims(); el.hidden = true; el.onclick = null; };
});

$("locBtn").addEventListener("click", () => {
  if (!navigator.geolocation) { toast("This browser can't share location. Starting at La Jolla Cove."); return; }
  $("locNote").textContent = "Asking for your location…";
  navigator.geolocation.getCurrentPosition((p) => {
    S.loc = { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) };
    const near = [...BEACHES].sort((a, b) => dist(S.loc, a) - dist(S.loc, b))[0];
    S.beach = near.id; save(); render(); buzz(2);
    $("locNote").textContent = `Nearest beach: ${near.name}. Beaches are now sorted by distance.`;
  }, () => {
    $("locNote").textContent = "Location was refused, so Tide Wolf starts at La Jolla Cove. You can allow it later in iPhone Settings → Safari → Location.";
    S.beach = S.beach || "cove"; save(); render();
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 30 * 60e3 });
});

$("exportBtn").addEventListener("click", async () => {
  const data = JSON.stringify({ app: "tide-wolf", version: APP_VERSION, saved: new Date().toISOString(), settings: S }, null, 2);
  const name = `tide-wolf-backup-${fmtYmd.format(Date.now())}.json`;
  const file = new File([data], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Tide Wolf backup" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("Backup saved.");
});
$("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== "tide-wolf" || !j.settings) throw new Error("not a Tide Wolf backup");
    S = { ...DEF, ...j.settings }; save(); applyTheme(); syncSegs(); render(); renderSwims();
    toast(`Backup loaded: ${S.swims.length} swims, ${S.favs.length} favorites.`);
  } catch (err) { toast("That file isn't a Tide Wolf backup. Pick the .json file you exported."); }
  e.target.value = "";
});

// ---------- start ----------
function tick() { $("clock").textContent = fmtClock.format(Date.now()) + " · San Diego"; }
let lastLoad = 0;
async function refresh() {
  lastLoad = Date.now(); D.offline = false;
  await Promise.all([loadTides(), loadMarine(), loadWx()]);
  render();
}

applyTheme(); syncSegs(); drawWolf("meh"); tick(); renderSwims(); renderNews();
$("ver").textContent = APP_VERSION;
setInterval(tick, 20000);
// Draw at once from saved data, then fetch fresh data
(() => {
  const tc = cacheGet("tides"), mc = cacheGet("marine"), wc = cacheGet("wx");
  if (tc) { D.tides = tc.stations; D.tidesAt = Date.parse(tc.updated); }
  if (mc) { D.marine = mc.data; D.marineAt = mc.at; }
  if (wc) { D.wx = wc.data; D.wxAt = wc.at; }
  if (tc || mc || wc) render(); else renderBeaches();
})();
refresh();
setInterval(refresh, 15 * 60e3);
document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastLoad > 5 * 60e3) refresh(); });

if (S.seenVer && S.seenVer !== APP_VERSION) setTimeout(() => openSheet("newsSheet"), 800);
S.seenVer = APP_VERSION; save();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

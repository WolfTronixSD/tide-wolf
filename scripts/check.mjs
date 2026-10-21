// Sanity checks for Tide Wolf. Run: node scripts/check.mjs
// Exits 1 on problems so a bad edit never reaches the live site.
import { readFileSync, existsSync } from "node:fs";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const has = (f) => existsSync(new URL("../" + f, import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);
const load = (file, names) => new Function(read(file) + `\nreturn { ${names} };`)();

// Version is the same everywhere
const { APP_VERSION, CHANGELOG } = load("version.js", "APP_VERSION, CHANGELOG");
if (!/^\d+\.\d+\.\d+$/.test(APP_VERSION)) fail(`APP_VERSION ${APP_VERSION} should look like 1.2.3`);
if (CHANGELOG[0].version !== APP_VERSION) fail(`CHANGELOG top is ${CHANGELOG[0].version}, APP_VERSION is ${APP_VERSION}`);
CHANGELOG.forEach((c, i) => {
  if (!c.title || !Array.isArray(c.changes) || !c.changes.length) fail(`CHANGELOG[${i}] needs a title and changes`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date || "")) fail(`CHANGELOG[${i}] bad date ${c.date}`);
});
const html = read("index.html");
const busts = [...html.matchAll(/\?v=([\d.]+)/g)].map((m) => m[1]);
if (busts.length < 5 || busts.some((v) => v !== APP_VERSION)) fail(`index.html ?v= params ${busts.join(",")} should all be ${APP_VERSION}`);
const sw = read("sw.js");
if (!sw.includes(`"tide-wolf-${APP_VERSION}"`)) fail(`sw.js CACHE should be tide-wolf-${APP_VERSION}`);
const swBusts = [...sw.matchAll(/\?v=([\d.]+)/g)].map((m) => m[1]);
if (swBusts.some((v) => v !== APP_VERSION)) fail(`sw.js PRECACHE ?v= params should all be ${APP_VERSION}`);
if (!read("CHANGELOG.md").includes(`## ${APP_VERSION}`)) fail(`CHANGELOG.md has no "## ${APP_VERSION}" entry`);

// Beaches are complete
const { STATIONS, BEACHES } = load("data.js", "STATIONS, BEACHES");
const ids = new Set();
BEACHES.forEach((b, i) => {
  const at = `BEACHES[${i}] ${b.id || ""}`;
  for (const k of ["id", "name", "area", "tip"]) if (!b[k]) fail(`${at}: missing ${k}`);
  if (ids.has(b.id)) fail(`${at}: duplicate id`);
  ids.add(b.id);
  if (!(b.lat > 32 && b.lat < 34 && b.lon > -118.5 && b.lon < -116.5)) fail(`${at}: lat/lon ${b.lat},${b.lon} is not near San Diego`);
  if (!STATIONS[b.station]) fail(`${at}: station ${b.station} is not in STATIONS`);
  if (![1, 2, 3].includes(b.snorkel)) fail(`${at}: snorkel should be 1, 2 or 3`);
});

// JSON files parse and look right
for (const f of ["manifest.webmanifest"]) { try { JSON.parse(read(f)); } catch (e) { fail(`${f}: ${e.message}`); } }
const man = JSON.parse(read("manifest.webmanifest"));
for (const ic of man.icons || []) if (!has(ic.src)) fail(`manifest icon ${ic.src} is missing`);
for (const f of ["icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon.svg"]) if (!has(f)) fail(`${f} is missing`);
if (has("tides.json")) {
  try {
    const t = JSON.parse(read("tides.json"));
    if (isNaN(Date.parse(t.updated))) fail("tides.json: bad updated time");
    for (const id of Object.keys(STATIONS)) {
      const s = t.stations && t.stations[id];
      if (!s) { fail(`tides.json: no data for station ${id}`); continue; }
      if (!s.hilo.length || !s.curve.length) fail(`tides.json: station ${id} has no predictions`);
      if (s.hilo.some((p) => isNaN(Date.parse(p.t)) || typeof p.v !== "number" || !["H", "L"].includes(p.type))) fail(`tides.json: station ${id} has a bad high/low`);
    }
  } catch (e) { fail(`tides.json: ${e.message}`); }
}

// Links are https
for (const m of html.matchAll(/href="(http[^"]*)"/g)) if (!m[1].startsWith("https://")) fail(`index.html: use https for ${m[1]}`);

if (errors.length) { console.error("✗ " + errors.join("\n✗ ")); process.exit(1); }
console.log(`✓ Tide Wolf ${APP_VERSION}: ${BEACHES.length} beaches, ${Object.keys(STATIONS).length} stations, all good`);

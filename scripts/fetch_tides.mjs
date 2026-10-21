// Pulls tide predictions and the latest water temperature from NOAA (free, no key)
// for every station in data.js and writes tides.json next to index.html.
// Run: node scripts/fetch_tides.mjs   (Node 18+; the "Update tides" GitHub Action runs it)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, root), "utf8");
const { STATIONS } = new Function(read("data.js") + "\nreturn { STATIONS };")();

const API = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const start = new Date(Date.now() - 36 * 3600e3); // a bit of yesterday, so "last low" works after midnight
const toIso = (t) => t.replace(" ", "T") + ":00Z"; // NOAA gmt times look like "2026-10-21 12:42"

async function get(params) {
  const url = API + "?" + new URLSearchParams({ application: "TideWolf", format: "json", units: "english", time_zone: "gmt", ...params });
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const j = await res.json();
      if (j.error) throw new Error(j.error.message);
      return j;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, i * 3000));
    }
  }
}

// Keep earlier data for a station if NOAA fails this time
let old = {};
try { if (existsSync(new URL("tides.json", root))) old = JSON.parse(read("tides.json")).stations || {}; } catch {}

const stations = {};
let ok = 0;
for (const [id, s] of Object.entries(STATIONS)) {
  const out = { name: s.name, hilo: [], curve: [], water: null };
  try {
    const base = { station: id, datum: "MLLW", product: "predictions", begin_date: ymd(start), range: "120" };
    const hilo = await get({ ...base, interval: "hilo" });
    out.hilo = hilo.predictions.map((p) => ({ t: toIso(p.t), v: +(+p.v).toFixed(2), type: p.type }));
    const curve = await get({ ...base, interval: "30" });
    out.curve = curve.predictions.map((p) => ({ t: toIso(p.t), v: +(+p.v).toFixed(2) }));
    ok++;
  } catch (e) {
    console.log(`${id}: tide predictions failed (${e.message}); keeping the old copy`);
    if (old[id]) Object.assign(out, { hilo: old[id].hilo, curve: old[id].curve });
  }
  try {
    const w = await get({ station: id, product: "water_temperature", date: "latest" });
    const d = w.data && w.data[0];
    if (d && d.v !== "") out.water = { t: toIso(d.t), f: +(+d.v).toFixed(1) };
  } catch (e) {
    console.log(`${id}: no water temperature (${e.message})`);
    if (old[id] && old[id].water) out.water = old[id].water;
  }
  stations[id] = out;
  console.log(`${id}: ${out.hilo.length} highs/lows, ${out.curve.length} curve points, water ${out.water ? out.water.f + "°F" : "n/a"}`);
}

if (!ok && !Object.keys(old).length) { console.error("NOAA gave no data at all"); process.exit(1); }

// Only rewrite the file when the data really changed, so the bot doesn't commit for nothing
const body = JSON.stringify({ stations }, null, 0);
let prevBody = "";
try { const prev = JSON.parse(read("tides.json")); prevBody = JSON.stringify({ stations: prev.stations }, null, 0); } catch {}
if (body === prevBody) { console.log("No change"); process.exit(0); }
writeFileSync(new URL("tides.json", root), JSON.stringify({ updated: new Date().toISOString(), source: "NOAA CO-OPS", stations }) + "\n");
console.log("Wrote tides.json");

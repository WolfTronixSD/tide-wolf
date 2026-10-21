# 🐺 Tide Wolf

San Diego tides, water temperature and surf, with a big **"Go snorkel now?"** verdict.

**Open it:** https://wolftronixsd.github.io/tide-wolf/

## What it does

- 🤿 **Verdict** for 8 beaches (La Jolla Cove, La Jolla Shores, Windansea, Pacific Beach, Ocean Beach, Coronado, Moonlight Beach, Oceanside Pier): GO / MAYBE / NOPE with a score and the reasons.
- ⏰ **Best window** for the rest of today (or tomorrow after sunset).
- 🌊 **Tide curve** for today with highs, lows and a "now" marker; next highs and lows.
- 🌡️ **Water** from the NOAA pier sensor, or an Open-Meteo sea-surface estimate; waves, wind, air, sunrise and sunset.
- 🌧️ **Rain rule:** 0.1 in or more in the last 72 hours means NOPE (San Diego County runoff advisory).
- ⭐ Favorites, 📍 nearest beach, 🏅 swim log, 🐺 Wolfie tips, three themes, °F/°C, offline mode, JSON backup.

## Set it up on iPhone

1. Open the link above in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Optional: ⚙️ Settings → **Use my location** to start at your nearest beach.

Safari and the home-screen app keep separate storage. Use ⚙️ → Export / Import to move favorites and swims between them.

## How the verdict works

Starts at 100 and loses points for waves over 1.5 ft, wind over 8 mph, long-period swell, very low or falling tide, cold water and beaches that aren't great for snorkeling. GO is 72+, MAYBE is 45–71. Darkness, thunderstorms, big surf (over 5 ft) and recent rain always mean NOPE. The rules are in `judge()` in `app.js`.

## Data (all free, no keys)

- **NOAA CO-OPS:** tide predictions and water temperature for La Jolla (9410230) and San Diego Bay (9410170). The **Update tides** GitHub Action runs `scripts/fetch_tides.mjs` every 3 hours and commits `tides.json` when it changed. If that file is more than 36 hours old the app asks NOAA directly.
- **Open-Meteo:** waves, swell period and sea-surface temperature (Marine API), wind, air, rain, sunrise and sunset (Forecast API), fetched live by the phone and saved for offline use.

## Files

- `index.html` – page layout
- `style.css` – look and themes
- `app.js` – data loading, verdict, chart, settings
- `data.js` – beaches and tide stations (add a beach here)
- `version.js` – version number and What's new
- `sw.js` – offline support
- `manifest.webmanifest`, `icons/` – home-screen app
- `tides.json` – tide data written by the bot
- `scripts/fetch_tides.mjs` – NOAA fetcher, `scripts/check.mjs` – sanity checks
- `.github/workflows/` – `check.yml` (every push), `tides.yml` (every 3 hours, or run it by hand under Actions)

## Release steps

1. Bump `APP_VERSION` and add a CHANGELOG entry in `version.js`.
2. Add the same entry to `CHANGELOG.md`.
3. Change every `?v=` in `index.html` and `sw.js`, and `CACHE` in `sw.js`, to the new version.
4. Run `node scripts/check.mjs`, then push to `main`.

Run locally with `python3 -m http.server 8000` and open http://localhost:8000.

Just a helper, not a lifeguard. 🐺

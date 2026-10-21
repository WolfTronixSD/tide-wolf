# Changelog

The app shows this history on its "What's new" page (source: `version.js`).

## 1.0.0 (2026-10-21): Tide Wolf is born

- Go / Maybe / Nope verdict with a 0–100 score for 8 San Diego beaches, built from waves, wind, tide height and direction, water temperature, rain in the last 72 hours (county runoff advisory), daylight and storms.
- Best time window for the rest of today, or tomorrow once the sun is down.
- Today's tide curve (NOAA predictions, MLLW) with night shading, next highs and lows, pier water temperature with an Open-Meteo sea-surface fallback.
- Favorites, nearest beach from your location, "I went in!" swim log with confetti and a howl, Wolfie tips.
- Three themes (Night, Kelp, Sunset) with light / dark / auto, °F or °C first, mute and haptics switches, JSON backup.
- Offline: service worker plus saved copies of the last waves, weather and tides.
- `tides.json` refreshed every 3 hours by the "Update tides" GitHub Action; the app asks NOAA directly if that file gets old.

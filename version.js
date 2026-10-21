// Bump APP_VERSION, the ?v= numbers in index.html and CACHE in sw.js, and add an entry at the top of CHANGELOG for every release.
// `node scripts/check.mjs` fails if they don't match.
const APP_VERSION = "1.0.1";
const CHANGELOG = [
  {
    version: "1.0.1",
    date: "2026-10-21",
    title: "First fixes",
    changes: [
      "🧹 Settings and What's new no longer pop open by themselves",
      "🌊 Rising or falling now looks at the next 15 minutes, so it's right just before a high or low"
    ]
  },
  {
    version: "1.0.0",
    date: "2026-10-21",
    title: "Tide Wolf is born",
    changes: [
      "🤿 Big \"Go snorkel now?\" verdict for 8 San Diego beaches, with the reasons behind it",
      "🌊 Today's tide curve, next high and low, water temperature, waves and wind",
      "⏰ Best time window for the rest of today",
      "🐺 Wolfie the wolf, confetti when you log a swim, three themes and offline mode"
    ]
  }
];

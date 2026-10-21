// Tide Wolf beaches and tide stations. Add a beach by adding an entry here,
// then run `node scripts/check.mjs`.
// station = NOAA tide station used for that beach (tide times differ by only a few minutes along the coast).
// ocean = the station's water sensor reads open-ocean water, so beaches within ~12 km can use it.

const STATIONS = {
  "9410230": { name: "La Jolla (Scripps Pier)", lat: 32.867, lon: -117.257, ocean: true },
  "9410170": { name: "San Diego Bay (Broadway Pier)", lat: 32.714, lon: -117.174, ocean: false }
};

const BEACHES = [
  { id: "cove", name: "La Jolla Cove", area: "La Jolla", lat: 32.8506, lon: -117.2716, station: "9410230", snorkel: 3,
    tip: "Garibaldi, sea lions and kelp. Enter on the cove stairs, stay inside the buoys." },
  { id: "shores", name: "La Jolla Shores", area: "La Jolla", lat: 32.8572, lon: -117.2577, station: "9410230", snorkel: 3,
    tip: "Easy sandy entry. Leopard sharks gather in the shallows in late summer." },
  { id: "windansea", name: "Windansea", area: "La Jolla", lat: 32.8301, lon: -117.2811, station: "9410230", snorkel: 1,
    tip: "Reef break for surfers. Only snorkel on the flattest days." },
  { id: "pb", name: "Pacific Beach", area: "Pacific Beach", lat: 32.7965, lon: -117.2582, station: "9410230", snorkel: 1,
    tip: "Sandy and wave-y. Better for a swim than for seeing fish." },
  { id: "ob", name: "Ocean Beach", area: "Ocean Beach", lat: 32.7487, lon: -117.2527, station: "9410230", snorkel: 1,
    tip: "Tide pools at Sunset Cliffs at low tide are the real treat here." },
  { id: "coronado", name: "Coronado", area: "Coronado", lat: 32.6812, lon: -117.1830, station: "9410170", snorkel: 1,
    tip: "Wide, gentle sand. Snorkel the jetty end only when it's glassy." },
  { id: "moonlight", name: "Moonlight Beach", area: "Encinitas", lat: 33.0479, lon: -117.2979, station: "9410230", snorkel: 1,
    tip: "Rocky reefs at each end hide a few fish on calm days." },
  { id: "oceanside", name: "Oceanside Pier", area: "Oceanside", lat: 33.1934, lon: -117.3861, station: "9410230", snorkel: 1,
    tip: "Surf spot. Watch from the pier, swim between the flags." }
];

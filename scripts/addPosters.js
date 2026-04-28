// scripts/addPosters.js
// One-off script: patches existing gold/movies.json with poster_path + backdrop_path from TMDB
// Run once: node scripts/addPosters.js

require("dotenv").config();

const fs   = require("fs");
const path = require("path");

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY missing");
  process.exit(1);
}

const GOLD_PATH = path.join(__dirname, "../data/raw/gold/movies.json");
const movies = JSON.parse(fs.readFileSync(GOLD_PATH, "utf-8"));

async function tmdbGet(endpoint) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${endpoint}${sep}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${endpoint} → ${res.status}`);
  return res.json();
}

async function run() {
  console.log(`🖼  Patching ${movies.length} movies with poster paths…\n`);

  for (const movie of movies) {
    if (movie.poster_path) { process.stdout.write(`  ✓ ${movie.title} (cached)\r`); continue; }
    try {
      const details = await tmdbGet(`/movie/${movie.tmdb_id}`);
      movie.poster_path   = details.poster_path   || null;
      movie.backdrop_path = details.backdrop_path || null;
      process.stdout.write(`  ✅ ${movie.title}\r`);
    } catch (err) {
      console.warn(`  ⚠️  ${movie.title}: ${err.message}`);
    }
  }

  fs.writeFileSync(GOLD_PATH, JSON.stringify(movies, null, 2));
  console.log(`\n\n✅ Patched and saved → ${GOLD_PATH}`);
}

run().catch((err) => { console.error(err); process.exit(1); });

// scripts/etl.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified ETL: Fetch from TMDB → Transform → Write gold file to disk
// Works both locally (via .env) and inside GitHub Actions (via secrets)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const PAGES_TO_FETCH = 3; // 3 pages × 20 results = up to 60 movies per run

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
if (!TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY is missing. Set it in .env or as a GitHub secret.");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function tmdbGet(endpoint) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${endpoint}${sep}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${endpoint} failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — Raw (Bronze)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRaw() {
  console.log(`📡 Fetching ${PAGES_TO_FETCH} pages of popular movies from TMDB…`);
  const allMovies = [];

  for (let page = 1; page <= PAGES_TO_FETCH; page++) {
    console.log(`  Page ${page}/${PAGES_TO_FETCH}`);
    const data = await tmdbGet(`/movie/popular?page=${page}`);
    allMovies.push(...(data.results || []));
  }

  // Save bronze (raw)
  const bronzeDir = path.join(__dirname, "../data/raw/bronze");
  fs.mkdirSync(bronzeDir, { recursive: true });
  const bronzePath = path.join(bronzeDir, "movies_raw.json");
  fs.writeFileSync(bronzePath, JSON.stringify(allMovies, null, 2));
  console.log(`  ✅ Bronze saved → ${bronzePath} (${allMovies.length} movies)`);

  return allMovies;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORM — Clean & Enrich (Silver → Gold)
// ─────────────────────────────────────────────────────────────────────────────
async function transformAndEnrich(rawMovies) {
  console.log("⚙️  Transforming & enriching…");

  const enriched = [];

  for (const movie of rawMovies) {
    try {
      // Fetch credits for cast info
      const details = await tmdbGet(`/movie/${movie.id}?append_to_response=credits,external_ids`);

      const record = {
        tmdb_id:      details.id,
        title:        details.title,
        overview:     details.overview,
        release_date: details.release_date,
        rating:       details.vote_average,
        genres:       details.genres?.map((g) => g.name) || [],
        cast:         details.credits?.cast?.slice(0, 5).map((c) => c.name) || [],
        director:     details.credits?.crew?.find((c) => c.job === "Director")?.name || null,
        imdb_id:      details.external_ids?.imdb_id || null,
        poster_path:  details.poster_path || null,   // e.g. "/abc123.jpg"
        backdrop_path: details.backdrop_path || null,
        // Reserved for future Wikidata enrichment
        facts:        [],
        link_confidence: "NONE",
      };

      enriched.push(record);
      process.stdout.write(`  🎬 ${record.title}\r`);
    } catch (err) {
      console.warn(`  ⚠️  Skipped ${movie.title}: ${err.message}`);
    }
  }

  console.log(`\n  ✅ Enriched ${enriched.length} movies`);

  // Save silver (intermediate)
  const silverDir = path.join(__dirname, "../data/raw/silver");
  fs.mkdirSync(silverDir, { recursive: true });
  fs.writeFileSync(path.join(silverDir, "movies_enriched.json"), JSON.stringify(enriched, null, 2));

  return enriched;
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE GOLD — final source of truth used by the app
// ─────────────────────────────────────────────────────────────────────────────
function writeGold(movies) {
  const goldDir = path.join(__dirname, "../data/raw/gold");
  fs.mkdirSync(goldDir, { recursive: true });
  const goldPath = path.join(goldDir, "movies.json");
  fs.writeFileSync(goldPath, JSON.stringify(movies, null, 2));
  console.log(`💾 Gold saved → ${goldPath} (${movies.length} movies)`);
  return goldPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
async function runETL() {
  const startTime = Date.now();
  console.log(`\n🚀 ETL started at ${new Date().toISOString()}\n`);

  try {
    const raw      = await fetchRaw();
    const enriched = await transformAndEnrich(raw);
    const goldPath = writeGold(enriched);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ ETL complete in ${elapsed}s — ${enriched.length} movies written to ${goldPath}`);

    // Write run metadata for debugging / evaluation
    const metaDir = path.join(__dirname, "../data/raw/gold");
    fs.writeFileSync(
      path.join(metaDir, "etl_meta.json"),
      JSON.stringify({
        run_at:         new Date().toISOString(),
        elapsed_seconds: parseFloat(elapsed),
        movie_count:    enriched.length,
        pages_fetched:  PAGES_TO_FETCH,
        source:         "TMDB /movie/popular",
      }, null, 2)
    );

    process.exit(0);
  } catch (err) {
    console.error("\n❌ ETL FAILED:", err.message);
    process.exit(1);
  }
}

runETL();
// scripts/etl.js

const fs = require("fs");

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ TMDB_API_KEY is missing");
  process.exit(1);
}

async function fetchPopularMovies(page = 1) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
  );

  const data = await res.json();
  return data.results || [];
}

async function fetchMovieDetails(movieId) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`
  );

  return await res.json();
}

async function runETL() {
  console.log("🚀 Starting TMDB ETL...");

  const results = [];

  const PAGES_TO_FETCH = 2;

  for (let page = 1; page <= PAGES_TO_FETCH; page++) {
    console.log(`📄 Fetching page ${page}`);

    const movies = await fetchPopularMovies(page);

    for (const movie of movies) {
      console.log(`🎬 Processing: ${movie.title}`);

      const details = await fetchMovieDetails(movie.id);

      results.push({
        tmdb_id: details.id,
        title: details.title,
        overview: details.overview,
        release_date: details.release_date,
        rating: details.vote_average,
        genres: details.genres?.map((g) => g.name) || [],
        cast: details.credits?.cast?.slice(0, 5).map((c) => c.name) || [],
        imdb_id: details.external_ids?.imdb_id || null,
      });
    }
  }

  fs.mkdirSync("data/gold", { recursive: true });

  fs.writeFileSync(
    "data/gold/movies.json",
    JSON.stringify(results, null, 2)
  );

  console.log(`✅ ETL completed. Total movies: ${results.length}`);
}

runETL();
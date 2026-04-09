// scripts/etl.js

import fs from "fs";
import fetch from "node-fetch";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Sample movies for POC
const moviesList = ["Inception", "Interstellar", "The Dark Knight"];

async function fetchMovie(title) {
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
  );
  const searchData = await searchRes.json();

  if (!searchData.results || searchData.results.length === 0) return null;

  const movie = searchData.results[0];

  const detailRes = await fetch(
    `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`
  );
  const details = await detailRes.json();

  return {
    tmdb_id: details.id,
    title: details.title,
    overview: details.overview,
    release_date: details.release_date,
    rating: details.vote_average,
    genres: details.genres?.map((g) => g.name),
    cast: details.credits?.cast?.slice(0, 5).map((c) => c.name),
    imdb_id: details.external_ids?.imdb_id,
  };
}

async function runETL() {
  console.log("Starting ETL...");

  const results = [];

  for (const movie of moviesList) {
    console.log(`Fetching: ${movie}`);
    const data = await fetchMovie(movie);

    if (data) {
      results.push(data);
    }
  }

  // Ensure folder exists
  fs.mkdirSync("data/gold", { recursive: true });

  fs.writeFileSync(
    "data/gold/movies.json",
    JSON.stringify(results, null, 2)
  );

  console.log("ETL completed. File saved to data/gold/movies.json");
}

runETL();
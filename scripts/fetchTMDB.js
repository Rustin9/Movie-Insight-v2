// scripts/fetchTMDB.js

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TMDB_API_KEY;

// -----------------------------
// VALIDATION
// -----------------------------
if (!API_KEY) {
  console.error("❌ TMDB_API_KEY is missing");
  process.exit(1);
}

// -----------------------------
// MAIN FUNCTION
// -----------------------------
async function fetchMovies() {
  try {
    console.log("🚀 Fetching popular movies from TMDB...");

    const res = await axios.get(
      `https://api.themoviedb.org/3/movie/popular`,
      {
        params: {
          api_key: API_KEY,
          page: 1,
        },
      }
    );

    const outputDir = path.join(__dirname, "../data/raw");

    // Ensure directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, "movies.json");

    fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2));

    console.log(`✅ Data saved to ${filePath}`);
  } catch (error) {
    console.error("❌ ETL FAILED:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

fetchMovies();
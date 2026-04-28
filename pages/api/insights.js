import { getMoviesFromGCS } from "../../services/gcsService";
import { generateInsights } from "../../services/llmService";

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy title match helper
// Returns the best match or null.
// Strategy: exact → startsWith → includes (all case-insensitive, trimmed)
// ─────────────────────────────────────────────────────────────────────────────
function findMovie(movies, query) {
  const q = query.toLowerCase().trim();

  // 1. Exact match
  let match = movies.find((m) => m.title.toLowerCase() === q);
  if (match) return { movie: match, matchType: "exact" };

  // 2. Starts-with match
  match = movies.find((m) => m.title.toLowerCase().startsWith(q));
  if (match) return { movie: match, matchType: "startsWith" };

  // 3. Substring / includes match
  match = movies.find((m) => m.title.toLowerCase().includes(q));
  if (match) return { movie: match, matchType: "includes" };

  // 4. Query includes title (user typed something longer)
  match = movies.find((m) => q.includes(m.title.toLowerCase()));
  if (match) return { movie: match, matchType: "reverseIncludes" };

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { movie } = req.body;

    if (!movie || !movie.trim()) {
      return res.status(400).json({ error: "Movie name is required" });
    }

    // Load curated gold dataset from GCS (or local fallback)
    const data = await getMoviesFromGCS();

    if (!data || data.length === 0) {
      return res.status(503).json({ error: "Movie catalog unavailable" });
    }

    // --- IMPROVED: fuzzy match instead of strict equality ---
    const result = findMovie(data, movie);

    if (!result) {
      return res.status(404).json({
        error: "Movie not found",
        hint: `"${movie}" did not match any title in our catalog of ${data.length} movies.`,
      });
    }

    const { movie: found, matchType } = result;

    // Generate AI insights, passing the full enriched record as context
    const insights = await generateInsights(found);

    return res.status(200).json({
      title:        found.title,
      matchType,
      poster_path:  found.poster_path  || null,
      backdrop_path: found.backdrop_path || null,
      rating:       found.rating       || null,
      genres:       found.genres       || [],
      cast:         found.cast         || [],
      director:     found.director     || null,
      release_date: found.release_date || null,
      hook:         insights.hook    || "",
      themes:       insights.themes  || [],
      trivia:       insights.trivia  || [],
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
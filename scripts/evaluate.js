// scripts/evaluate.js
// ─────────────────────────────────────────────────────────────────────────────
// Evaluation harness for AI Movie Insights
//
// Runs:
//   • 5 representative cases  (expected to succeed)
//   • 2 failure cases         (expected to fail / degrade gracefully)
//   • 1 lightweight baseline  (naive prompt-only, no stored movie context)
//
// Outputs results to: data/evaluation_results.json
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const fs   = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Load gold dataset (local)
// ─────────────────────────────────────────────────────────────────────────────
const GOLD_PATH = path.join(__dirname, "../data/raw/gold/movies.json");
let catalog = [];
try {
  catalog = JSON.parse(fs.readFileSync(GOLD_PATH, "utf-8"));
  console.log(`📚 Catalog loaded: ${catalog.length} movies\n`);
} catch (err) {
  console.error("❌ Could not load gold data:", err.message);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — mirror the improved findMovie logic from api/insights.js
// ─────────────────────────────────────────────────────────────────────────────
function findMovie(query) {
  const q = query.toLowerCase().trim();
  return (
    catalog.find((m) => m.title.toLowerCase() === q) ||
    catalog.find((m) => m.title.toLowerCase().startsWith(q)) ||
    catalog.find((m) => m.title.toLowerCase().includes(q)) ||
    catalog.find((m) => q.includes(m.title.toLowerCase())) ||
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full pipeline call (current system — uses stored context)
// ─────────────────────────────────────────────────────────────────────────────
async function runCurrentSystem(movie) {
  const userContent = `
Movie record:
Title:       ${movie.title}
Overview:    ${movie.overview}
Genres:      ${Array.isArray(movie.genres) ? movie.genres.join(", ") : movie.genres}
Cast:        ${movie.cast?.join(", ") || "N/A"}
Director:    ${movie.director || "N/A"}
Release:     ${movie.release_date}
Rating:      ${movie.rating}/10
  `.trim();

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a knowledgeable film analyst. Given a movie record, return ONLY valid JSON:
{"hook":"<string>","themes":["<string>","<string>","<string>"],"trivia":["<string>","<string>","<string>","<string>","<string>"]}`,
      },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return JSON.parse(res.choices[0].message.content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline call (naive prompt-only — no stored movie context, just the title)
// This is the lightweight baseline for comparison.
// ─────────────────────────────────────────────────────────────────────────────
async function runBaseline(movieTitle) {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Give me a plot hook, 3 themes, and 5 trivia facts for the movie "${movieTitle}".
Return ONLY valid JSON: {"hook":"<string>","themes":["<string>","<string>","<string>"],"trivia":["<string>","<string>","<string>","<string>","<string>"]}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return JSON.parse(res.choices[0].message.content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring rubric (0–5 per field, manual rubric for qualitative outputs)
// ─────────────────────────────────────────────────────────────────────────────
function scoreOutput(result) {
  let score = 0;
  const reasons = [];

  if (result.hook && result.hook.length > 20) {
    score += 2;
    reasons.push("hook: present and non-trivial");
  } else {
    reasons.push("hook: missing or too short");
  }

  if (Array.isArray(result.themes) && result.themes.length >= 3) {
    score += 2;
    reasons.push(`themes: ${result.themes.length} items`);
  } else {
    reasons.push(`themes: only ${result.themes?.length || 0} items`);
  }

  if (Array.isArray(result.trivia) && result.trivia.length >= 5) {
    score += 1;
    reasons.push(`trivia: ${result.trivia.length} items`);
  } else {
    reasons.push(`trivia: only ${result.trivia?.length || 0} items`);
  }

  return { score, maxScore: 5, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test cases
// ─────────────────────────────────────────────────────────────────────────────
const REPRESENTATIVE_CASES = [
  "Project Hail Mary",
  "Scream 7",
  "Zootopia 2",
  "Avatar: Fire and Ash",
  "The Super Mario Bros. Movie",
];

const FAILURE_CASES = [
  { query: "Hail Mary",        note: "Partial title — should still resolve via fuzzy match" },
  { query: "Nonexistent Film 9999", note: "Completely unknown title — should return 404 gracefully" },
];

const BASELINE_TITLE = "Project Hail Mary"; // same movie, compared with vs without stored context

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────
async function runEvaluation() {
  const timestamp = new Date().toISOString();
  const results = {
    run_at: timestamp,
    model: "gpt-4o-mini",
    catalog_size: catalog.length,
    representative_cases: [],
    failure_cases: [],
    baseline_comparison: {},
    summary: {},
  };

  // ── Representative Cases ──────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("🧪 REPRESENTATIVE CASES");
  console.log("═".repeat(60));

  for (const title of REPRESENTATIVE_CASES) {
    process.stdout.write(`\n  Testing: "${title}" … `);

    const found = findMovie(title);
    if (!found) {
      console.log("❌ NOT FOUND in catalog");
      results.representative_cases.push({ title, status: "not_found_in_catalog" });
      continue;
    }

    try {
      const output = await runCurrentSystem(found);
      const { score, maxScore, reasons } = scoreOutput(output);

      console.log(`✅ Score: ${score}/${maxScore}`);
      results.representative_cases.push({
        title:     found.title,
        status:    "success",
        score,
        maxScore,
        reasons,
        hook:      output.hook,
        themes:    output.themes,
        trivia:    output.trivia,
      });
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.representative_cases.push({ title, status: "error", error: err.message });
    }
  }

  // ── Failure Cases ─────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("⚠️  FAILURE CASES");
  console.log("═".repeat(60));

  for (const { query, note } of FAILURE_CASES) {
    process.stdout.write(`\n  Query: "${query}" (${note}) … `);

    const found = findMovie(query);

    if (!found) {
      console.log("🔴 Not found — 404 graceful failure ✓");
      results.failure_cases.push({ query, note, status: "graceful_404", matched_title: null });
    } else {
      console.log(`🟡 Fuzzy matched → "${found.title}" ✓`);
      results.failure_cases.push({ query, note, status: "fuzzy_match_resolved", matched_title: found.title });
    }
  }

  // ── Baseline Comparison ───────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("📊 BASELINE COMPARISON — \"" + BASELINE_TITLE + "\"");
  console.log("═".repeat(60));

  const foundForBaseline = findMovie(BASELINE_TITLE);

  console.log("\n  [Current System] with stored context…");
  const currentOutput = await runCurrentSystem(foundForBaseline);
  const currentScore  = scoreOutput(currentOutput);
  console.log(`  Score: ${currentScore.score}/${currentScore.maxScore}`);

  console.log("\n  [Baseline] prompt-only, no stored context…");
  const baselineOutput = await runBaseline(BASELINE_TITLE);
  const baselineScore  = scoreOutput(baselineOutput);
  console.log(`  Score: ${baselineScore.score}/${baselineScore.maxScore}`);

  results.baseline_comparison = {
    movie:          BASELINE_TITLE,
    current_system: { score: currentScore.score, maxScore: currentScore.maxScore, output: currentOutput },
    baseline:       { score: baselineScore.score, maxScore: baselineScore.maxScore, output: baselineOutput },
    verdict: currentScore.score >= baselineScore.score
      ? "Current system ≥ baseline (expected)"
      : "Baseline matched or exceeded current system (investigate)",
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const successCases  = results.representative_cases.filter((c) => c.status === "success");
  const avgScore = successCases.length
    ? (successCases.reduce((s, c) => s + c.score, 0) / successCases.length).toFixed(2)
    : "N/A";

  results.summary = {
    total_representative: REPRESENTATIVE_CASES.length,
    succeeded:            successCases.length,
    avg_score:            avgScore,
    failure_cases_tested: FAILURE_CASES.length,
    graceful_404s:        results.failure_cases.filter((c) => c.status === "graceful_404").length,
    fuzzy_matches:        results.failure_cases.filter((c) => c.status === "fuzzy_match_resolved").length,
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const outDir  = path.join(__dirname, "../data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "evaluation_results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log("\n" + "═".repeat(60));
  console.log(`✅ Evaluation complete. Results saved to: ${outPath}`);
  console.log(`   Average score: ${avgScore}/5`);
  console.log("═".repeat(60) + "\n");
}

runEvaluation().catch((err) => {
  console.error("❌ Evaluation failed:", err.message);
  process.exit(1);
});

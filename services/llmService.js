import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─────────────────────────────────────────────────────────────────────────────
// System prompt — tells the model exactly what role it plays
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a knowledgeable film analyst.
Given a movie record (title, overview, genres, cast, director), generate:
- A single punchy one-sentence plot hook that would make someone want to watch the film
- 3 core thematic insights (deeper than a genre label — explore subtext, motifs, or cultural context)
- 5 interesting trivia facts about the film's production, reception, or legacy

Respond ONLY with valid JSON matching this exact schema — no markdown, no explanation:
{
  "hook":   "<one-sentence string>",
  "themes": ["<string>", "<string>", "<string>"],
  "trivia": ["<string>", "<string>", "<string>", "<string>", "<string>"]
}
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────────────────────
export async function generateInsights(movie) {
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
    // IMPROVEMENT: response_format forces the model to return valid JSON,
    // eliminating the JSON parse errors seen during evaluation.
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userContent   },
    ],
    temperature: 0.7,
    max_tokens:  600,
  });

  const text = res.choices[0].message.content;

  try {
    const parsed = JSON.parse(text);
    return {
      hook:   parsed.hook   || "",
      themes: parsed.themes || [],
      trivia: parsed.trivia || [],
    };
  } catch (err) {
    // Should be extremely rare now that response_format: json_object is set
    console.error("JSON PARSE ERROR (unexpected):", text);
    return {
      hook:   "Error generating hook",
      themes: [],
      trivia: [],
    };
  }
}
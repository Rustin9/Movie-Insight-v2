import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const TMDB_BG = "https://image.tmdb.org/t/p/w780";

const EXAMPLE_MOVIES = [
  "Project Hail Mary",
  "Scream 7",
  "Zootopia 2",
  "Avatar: Fire and Ash",
  "The Super Mario Bros. Movie",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState("dark");

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const fetchInsights = useCallback(async (movieTitle) => {
    const title = (movieTitle || query).trim();
    if (!title) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie: title }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.hint || json.error || "Something went wrong.");
        return;
      }

      setData(json);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKey = (e) => {
    if (e.key === "Enter") fetchInsights();
  };

  const handleExample = (title) => {
    setQuery(title);
    fetchInsights(title);
  };

  const posterUrl = data?.poster_path ? `${TMDB_IMG}${data.poster_path}` : null;
  const backdropUrl = data?.backdrop_path ? `${TMDB_BG}${data.backdrop_path}` : null;

  return (
    <>
      <Head>
        <title>AI Movie Insights</title>
        <meta name="description" content="AI-powered movie insights: plot hooks, themes, and trivia powered by GPT-4o-mini and TMDB." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />
      </Head>

      <div className="page">
        {/* ── Navigation ── */}
        <nav className="nav">
          <div className="nav-inner">
            <span className="nav-logo">
              <span className="nav-logo-icon">🎬</span>
              Movie Insights
            </span>
            <button
              id="theme-toggle"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </nav>

        {/* ── Hero / Search ── */}
        <section className="hero">

          <h1 className="hero-title">AI-Powered<br />Movie Insights</h1>
          <p className="hero-sub">
            Type a movie title to get an AI-generated plot hook,
            thematic analysis, and trivia facts.
          </p>

          <div className="search-wrap">
            <input
              id="movie-search-input"
              className="search-input"
              placeholder="e.g. Project Hail Mary"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              id="generate-btn"
              className="search-btn"
              onClick={() => fetchInsights()}
              disabled={loading || !query.trim()}
            >
              {loading ? <span className="spinner" /> : "⚡"}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>

          <p className="search-hint">
            Try:{" "}
            {EXAMPLE_MOVIES.map((m, i) => (
              <span key={i} onClick={() => handleExample(m)}>
                {m}{i < EXAMPLE_MOVIES.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>

          {error && (
            <div className="error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* ── Results ── */}
        {data && (
          <main className="result-section container">

            {/* Movie Hero Card */}
            <div className="movie-hero">
              {backdropUrl && (
                <div
                  className="movie-backdrop"
                  style={{ backgroundImage: `url(${backdropUrl})` }}
                />
              )}
              <div className="movie-poster-wrap">
                {posterUrl ? (
                  <img
                    className="movie-poster"
                    src={posterUrl}
                    alt={`${data.title} poster`}
                    loading="lazy"
                    width="160"
                    height="240"
                  />
                ) : (
                  <div className="movie-poster-placeholder">🎬</div>
                )}
              </div>
              <div className="movie-meta">
                <h2 className="movie-title-text">{data.title}</h2>

                <div className="movie-badges">
                  {data.rating && (
                    <span className="rating-chip">⭐ {Number(data.rating).toFixed(1)}</span>
                  )}
                  {data.genres?.slice(0, 4).map((g, i) => (
                    <span key={i} className="genre-chip">{g}</span>
                  ))}
                </div>

                <div className="movie-details-grid">
                  {data.director && (
                    <div className="movie-detail-item">
                      <span className="movie-detail-label">Director</span>
                      <span className="movie-detail-value">{data.director}</span>
                    </div>
                  )}
                  {data.release_date && (
                    <div className="movie-detail-item">
                      <span className="movie-detail-label">Release</span>
                      <span className="movie-detail-value">
                        {new Date(data.release_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                      </span>
                    </div>
                  )}
                </div>

                {data.cast?.length > 0 && (
                  <div>
                    <div className="movie-detail-label" style={{ marginBottom: 8 }}>Cast</div>
                    <div className="cast-list">
                      {data.cast.map((name, i) => (
                        <span key={i} className="cast-chip">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Insights Grid */}
            <div className="insights-grid">

              {/* Plot Hook — full width */}
              <div className="insight-card full-width accent-border-gold">
                <div className="card-header">
                  <div className="card-icon gold">🎯</div>
                  <div>
                    <div className="card-title">Plot Hook</div>
                    <div className="card-subtitle">AI-generated one-liner</div>
                  </div>
                </div>
                <p className="hook-text">{data.hook}</p>
              </div>

              {/* Themes */}
              <div className="insight-card accent-border-blue">
                <div className="card-header">
                  <div className="card-icon blue">🧠</div>
                  <div>
                    <div className="card-title">Core Themes</div>
                    <div className="card-subtitle">Thematic analysis</div>
                  </div>
                </div>
                <ul className="theme-list">
                  {data.themes?.map((t, i) => (
                    <li key={i} className="theme-item">
                      <span className="theme-dot" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trivia */}
              <div className="insight-card accent-border-green">
                <div className="card-header">
                  <div className="card-icon green">🎬</div>
                  <div>
                    <div className="card-title">Trivia & Facts</div>
                    <div className="card-subtitle">Production &amp; legacy</div>
                  </div>
                </div>
                <ul className="trivia-list">
                  {data.trivia?.map((t, i) => (
                    <li key={i} className="trivia-item">
                      <span className="trivia-num">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </main>
        )}

        {/* ── Footer ── */}
        <footer className="footer">
          <p>
            AI Movie Insights AIDI2001 · Data from{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>
            {" "}
          </p>
        </footer>
      </div>
    </>
  );
}
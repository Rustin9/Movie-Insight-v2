import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

const bucketName = "ai-movie-insights-data";

// -----------------------------
// SAFE CLIENT INIT (NO CRASH)
// -----------------------------
let storage = null;

try {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    storage = new Storage({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    });
  }
} catch (err) {
  console.warn("⚠️ GCS credentials invalid or missing. Falling back to local mode.");
}

// -----------------------------
// MAIN FUNCTION
// -----------------------------
export async function getMoviesFromGCS() {
  // -----------------------------------
  // MODE 1: GOOGLE CLOUD STORAGE
  // -----------------------------------
  if (storage) {
    try {
      const file = storage.bucket(bucketName).file("gold/movies.json");
      const [contents] = await file.download();
      return JSON.parse(contents.toString());
    } catch (err) {
      console.warn("⚠️ GCS read failed, falling back to local file.");
    }
  }

  // -----------------------------------
  // MODE 2: LOCAL FALLBACK
  // -----------------------------------
  try {
    const localPath = path.join(process.cwd(), "data/raw/gold/movies.json");
    const raw = fs.readFileSync(localPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Both GCS and local data failed:", err);
    return [];
  }
}
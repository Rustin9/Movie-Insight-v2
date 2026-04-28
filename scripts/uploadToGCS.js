// scripts/uploadToGCS.js
// ─────────────────────────────────────────────────────────────────────────────
// Uploads the gold data file (and optional metadata) to GCS.
// Reads credentials from GOOGLE_CREDENTIALS_JSON env var (works locally + GH Actions).
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

const BUCKET_NAME = "ai-movie-insights-data";
const GOLD_DIR = path.join(__dirname, "../data/raw/gold");

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.GOOGLE_API_KEY) {
  console.error("❌ GOOGLE_CREDENTIALS_JSON is missing.");
  process.exit(1);
}

const storage = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_API_KEY),
});

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
async function uploadFile(localPath, destination) {
  const bucket = storage.bucket(BUCKET_NAME);
  await bucket.upload(localPath, {
    destination,
    metadata: { cacheControl: "no-cache" },
  });
  console.log(`  ✅ Uploaded ${path.basename(localPath)} → gs://${BUCKET_NAME}/${destination}`);
}

async function upload() {
  console.log(`\n📤 Uploading gold data to GCS bucket: ${BUCKET_NAME}\n`);

  const filesToUpload = [
    { local: path.join(GOLD_DIR, "movies.json"),   remote: "gold/movies.json"   },
    { local: path.join(GOLD_DIR, "etl_meta.json"), remote: "gold/etl_meta.json" },
  ];

  for (const { local, remote } of filesToUpload) {
    if (fs.existsSync(local)) {
      await uploadFile(local, remote);
    } else {
      console.warn(`  ⚠️  Skipped (not found): ${local}`);
    }
  }

  console.log("\n✅ GCS upload complete");
}

upload().catch((err) => {
  console.error("❌ Upload failed:", err.message);
  process.exit(1);
});

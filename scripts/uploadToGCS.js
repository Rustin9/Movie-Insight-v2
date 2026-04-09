const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
});

const bucketName = "ai-movie-insights-data";

async function upload() {
  await storage.bucket(bucketName).upload("data/gold/movies.json", {
    destination: "gold/movies.json",
  });

  console.log("✅ Uploaded to GCS successfully");
}

upload();
e
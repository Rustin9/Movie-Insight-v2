import { Storage } from "@google-cloud/storage";
import fs from "fs";

const storage = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_API_KEY),
});

const bucketName = "ai-movie-insights-data";

async function upload() {
  await storage.bucket(bucketName).upload("data/gold/movies.json", {
    destination: "gold/movies.json",
  });

  console.log("Uploaded to GCS successfully");
}

upload();
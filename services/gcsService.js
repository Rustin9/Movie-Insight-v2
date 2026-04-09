import { Storage } from "@google-cloud/storage";

// const storage = new Storage({
//   keyFilename: "movie-insights-sa-key.json", // path to your key
// });

const storage = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_API_KEY),
});

const bucketName = "ai-movie-insights-data";

export async function getMoviesFromGCS() {
  const file = storage
    .bucket(bucketName)
    .file("gold/movies.json");

  const contents = await file.download();

  return JSON.parse(contents.toString());
}
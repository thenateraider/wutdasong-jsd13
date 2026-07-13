import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB, CachedSong } from "../db/mongodb";

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Error: MONGO_URI is not set in .env file.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const connected = await connectDB(uri);
  if (!connected) {
    console.error("Failed to connect to database.");
    process.exit(1);
  }

  try {
    const countBefore = await CachedSong.countDocuments();
    console.log(`Found ${countBefore} songs in cache.`);
    
    console.log("Clearing song cache (CachedSong collection)...");
    const result = await CachedSong.deleteMany({});
    
    console.log(`Successfully deleted ${result.deletedCount} songs from cache.`);
  } catch (error: any) {
    console.error("Error clearing cache:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

run();

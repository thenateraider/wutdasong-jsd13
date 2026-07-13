import mongoose, { Schema, Document } from "mongoose";

// Connection Function
export async function connectDB(uri?: string) {
  if (!uri) {
    console.log("[Database] No MONGO_URI provided. MongoDB features are disabled.");
    return false;
  }
  try {
    await mongoose.connect(uri);
    console.log("[Database] MongoDB connected successfully.");
    return true;
  } catch (err) {
    console.error("[Database] Connection error:", err);
    return false;
  }
}

// 1. Leaderboard Schema
export interface ILeaderboard extends Document {
  name: string;
  avatar: string;
  score: number;
  songCount: number;
  maxCombo: number;
  date: Date;
}

const LeaderboardSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String, required: true },
  score: { type: Number, required: true },
  songCount: { type: Number, required: true, default: 10 },
  maxCombo: { type: Number, required: true, default: 1 },
  date: { type: Date, default: Date.now },
});

LeaderboardSchema.index({ name: 1, songCount: 1 }, { unique: true });

export const Leaderboard = mongoose.model<ILeaderboard>("Leaderboard", LeaderboardSchema);

// 2. Song Cache Schema (to store track matches and avoid redundant Spotify API calls)
export interface ICachedSong extends Document {
  spotifyId: string;
  title: string;
  artist: string;
  genre: string;
  previewUrl: string;
  artworkUrl: string;
  album: string;
  createdAt: Date;
}

const CachedSongSchema: Schema = new Schema({
  spotifyId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  artist: { type: String, required: true },
  genre: { type: String, required: true },
  previewUrl: { type: String, required: true },
  artworkUrl: { type: String, required: true },
  album: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 } // Expirable: 7 days cache
});

export const CachedSong = mongoose.model<ICachedSong>("CachedSong", CachedSongSchema);

// 3. Issue Report Schema
export interface IIssueReport extends Document {
  description: string;
  createdAt: Date;
}

const IssueReportSchema: Schema = new Schema({
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const IssueReport = mongoose.model<IIssueReport>("IssueReport", IssueReportSchema);

// 4. Preset Playlist Schema
export interface IPresetPlaylist extends Document {
  name: string;
  url: string;
  imageUrl: string;
  trackCount: number;
  isDefault: boolean;
  playCount: number;
}

const PresetPlaylistSchema: Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  imageUrl: { type: String, default: "" },
  trackCount: { type: Number, required: true, default: 0 },
  isDefault: { type: Boolean, default: false },
  playCount: { type: Number, default: 0 }
});

export const PresetPlaylist = mongoose.model<IPresetPlaylist>("PresetPlaylist", PresetPlaylistSchema);

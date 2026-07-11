"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicService = void 0;
const axios_1 = __importDefault(require("axios"));
const songsData_1 = require("../db/songsData");
class MusicService {
    spotifyToken = null;
    tokenExpiresAt = 0;
    constructor() {
        this.getSpotifyToken();
    }
    // Get or refresh Spotify Client Credentials token
    async getSpotifyToken() {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return null;
        }
        // Return cached token if valid
        if (this.spotifyToken && Date.now() < this.tokenExpiresAt) {
            return this.spotifyToken;
        }
        try {
            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const response = await axios_1.default.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            this.spotifyToken = response.data.access_token;
            // Expires in response.data.expires_in seconds (usually 3600), refresh 1 min early
            this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
            console.log("[Spotify] Access Token refreshed successfully.");
            return this.spotifyToken;
        }
        catch (error) {
            console.error("[Spotify] Error authenticating client credentials:", error.message);
            return null;
        }
    }
    // Search Spotify Web API for a track
    async searchSpotify(query) {
        const token = await this.getSpotifyToken();
        if (!token)
            return null;
        try {
            const response = await axios_1.default.get("https://api.spotify.com/v1/search", {
                headers: { Authorization: `Bearer ${token}` },
                params: { q: query, type: "track", limit: 1 },
            });
            const track = response.data.tracks?.items?.[0];
            if (!track)
                return null;
            return {
                title: track.name,
                artist: track.artists.map((a) => a.name).join(", "),
                previewUrl: track.preview_url || undefined, // Spotify might return null for previews
                artworkUrl: track.album?.images?.[0]?.url || "",
                album: track.album?.name || "Unknown Album",
            };
        }
        catch (error) {
            console.error(`[Spotify] Error searching for "${query}":`, error.message);
            return null;
        }
    }
    // Search iTunes Search API (very reliable for 30s previews, no keys needed)
    async searchITunes(query) {
        try {
            const response = await axios_1.default.get("https://itunes.apple.com/search", {
                params: { term: query, entity: "musicTrack", limit: 1 },
            });
            const track = response.data.results?.[0];
            if (!track)
                return null;
            // iTunes provides standard 100x100 artwork, we can upgrade it to 400x400 for better UI look
            let artwork = track.artworkUrl100 || "";
            if (artwork.endsWith("100x100bb.jpg")) {
                artwork = artwork.replace("100x100bb.jpg", "400x400bb.jpg");
            }
            return {
                title: track.trackName,
                artist: track.artistName,
                previewUrl: track.previewUrl || undefined,
                artworkUrl: artwork,
                album: track.collectionName || "Single",
            };
        }
        catch (error) {
            console.error(`[iTunes] Error searching for "${query}":`, error.message);
            return null;
        }
    }
    // Helper to fetch details and preview url for a seed song
    async fetchTrackDetails(seed) {
        // If it's a playlist track, it might already contain the preview URL and artwork!
        if (seed.spotifyPreviewUrl) {
            return {
                id: seed.id,
                title: seed.title,
                artist: seed.artist,
                genre: seed.genre,
                previewUrl: seed.spotifyPreviewUrl,
                artworkUrl: seed.artworkUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop",
                album: seed.album || "Spotify Playlist",
            };
        }
        const query = seed.searchQuery || `${seed.artist} ${seed.title}`;
        console.log(`[MusicService] Fetching details for: ${seed.artist} - ${seed.title} (Query: ${query})`);
        let details = null;
        // 1. Try Spotify first if credentials are set
        if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
            details = await this.searchSpotify(query);
        }
        // If details are found, merge with seed properties if any (like artworkUrl or album)
        if (details) {
            details = {
                ...details,
                artworkUrl: seed.artworkUrl || details.artworkUrl,
                album: seed.album || details.album,
            };
        }
        // 2. If Spotify search fails or has no previewUrl, use iTunes as fallback (it has high-fidelity 30s previews)
        if (!details || !details.previewUrl) {
            const itunesDetails = await this.searchITunes(query);
            if (itunesDetails && itunesDetails.previewUrl) {
                details = {
                    ...details, // keep spotify metadata if any
                    title: details?.title || itunesDetails.title,
                    artist: details?.artist || itunesDetails.artist,
                    previewUrl: itunesDetails.previewUrl,
                    artworkUrl: details?.artworkUrl || itunesDetails.artworkUrl,
                    album: details?.album || itunesDetails.album,
                };
            }
        }
        // 3. If everything fails, use static fallbacks if it matches or return null
        if (!details || !details.previewUrl) {
            const staticMatch = songsData_1.STATIC_FALLBACK_SONGS.find((s) => s.title.toLowerCase() === seed.title.toLowerCase() || s.id === seed.id);
            if (staticMatch) {
                return {
                    id: seed.id,
                    title: staticMatch.title,
                    artist: staticMatch.artist,
                    genre: seed.genre,
                    previewUrl: staticMatch.previewUrl,
                    artworkUrl: staticMatch.artworkUrl,
                    album: "Fallback Collection",
                };
            }
            return null;
        }
        return {
            id: seed.id,
            title: details.title || seed.title,
            artist: details.artist || seed.artist,
            genre: seed.genre,
            previewUrl: details.previewUrl,
            artworkUrl: details.artworkUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop",
            album: details.album || "Unknown Album",
        };
    }
    // Extract Spotify Playlist ID from URL or URI
    extractPlaylistId(urlOrId) {
        if (!urlOrId)
            return null;
        const cleaned = urlOrId.trim();
        // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGmq7BmE?si=...
        const urlMatch = cleaned.match(/playlist\/([a-zA-Z0-9]+)/);
        if (urlMatch)
            return urlMatch[1];
        // spotify:playlist:37i9dQZF1DXcBWIGmq7BmE
        const uriMatch = cleaned.match(/spotify:playlist:([a-zA-Z0-9]+)/);
        if (uriMatch)
            return uriMatch[1];
        // Raw 22-character base62 ID
        if (/^[a-zA-Z0-9]{22}$/.test(cleaned))
            return cleaned;
        return null;
    }
    // Fetch playlist tracks from Spotify API
    async fetchSpotifyPlaylistTracks(playlistId) {
        const token = await this.getSpotifyToken();
        if (!token) {
            throw new Error("Spotify credentials are not set in the .env file. Please check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
        }
        try {
            console.log(`[Spotify] Fetching tracks for playlist: ${playlistId}`);
            const response = await axios_1.default.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 100 },
            });
            const items = response.data.items || [];
            const tracks = items
                .filter((item) => item.track !== null && item.track.name)
                .map((item, idx) => {
                const track = item.track;
                return {
                    id: track.id || `sp_pl_${idx}_${Date.now()}`,
                    title: track.name,
                    artist: track.artists.map((a) => a.name).join(", "),
                    genre: "Spotify Playlist",
                    spotifyPreviewUrl: track.preview_url || undefined,
                    artworkUrl: track.album?.images?.[0]?.url || undefined,
                    album: track.album?.name || "Unknown Album",
                };
            });
            if (tracks.length === 0) {
                throw new Error("No tracks found in the Spotify playlist. Make sure the playlist contains tracks.");
            }
            console.log(`[Spotify] Retrieved ${tracks.length} tracks from playlist.`);
            return tracks;
        }
        catch (error) {
            console.error("[Spotify] Error fetching playlist tracks:", error.message);
            if (error.response?.status === 404) {
                throw new Error("Spotify playlist not found. Make sure the playlist is PUBLIC.");
            }
            throw new Error(error.message || "Failed to fetch playlist tracks.");
        }
    }
    // Generate game rounds based on settings
    async generateGameRounds(genres, numSongs, playlistUrl) {
        console.log(`[MusicService] Generating ${numSongs} rounds. Playlist:`, playlistUrl || "None");
        let pool = [];
        // Check if playlistUrl is provided
        if (playlistUrl && playlistUrl.trim()) {
            const playlistId = this.extractPlaylistId(playlistUrl);
            if (!playlistId) {
                throw new Error("Invalid Spotify playlist URL. Make sure it looks like 'https://open.spotify.com/playlist/...'");
            }
            pool = await this.fetchSpotifyPlaylistTracks(playlistId);
        }
        else {
            // 1. Filter songs by selected genres (handle 'Random' or empty as all)
            const isRandom = genres.includes("Random") || genres.length === 0;
            pool = songsData_1.SEED_SONGS.filter((song) => isRandom || genres.includes(song.genre));
        }
        if (pool.length === 0) {
            throw new Error("No songs found matching selected parameters.");
        }
        // Shuffle pool
        const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
        const rounds = [];
        let roundIndex = 1;
        for (const seedSong of shuffledPool) {
            if (rounds.length >= numSongs)
                break;
            // Fetch preview and details
            const track = await this.fetchTrackDetails(seedSong);
            if (!track || !track.previewUrl) {
                // Skip songs without working audio previews
                console.log(`[MusicService] Skipping "${seedSong.title}" - no preview found.`);
                continue;
            }
            // Generate 4 other unique incorrect choices from the pool
            const wrongPool = pool.filter((s) => s.id !== seedSong.id);
            const shuffledWrong = [...wrongPool].sort(() => Math.random() - 0.5);
            const choices = [
                { id: seedSong.id, title: track.title, artist: track.artist },
            ];
            for (const w of shuffledWrong) {
                if (choices.length >= 5)
                    break;
                // Avoid adding duplicate songs (by checking title/artist combination)
                if (!choices.some((c) => c.title.toLowerCase() === w.title.toLowerCase())) {
                    choices.push({ id: w.id, title: w.title, artist: w.artist });
                }
            }
            // If we don't have enough choices from the playlist, pad with general seed songs
            if (choices.length < 5) {
                const globalWrongPool = songsData_1.SEED_SONGS.filter((s) => s.id !== seedSong.id);
                const shuffledGlobalWrong = [...globalWrongPool].sort(() => Math.random() - 0.5);
                for (const w of shuffledGlobalWrong) {
                    if (choices.length >= 5)
                        break;
                    if (!choices.some((c) => c.title.toLowerCase() === w.title.toLowerCase())) {
                        choices.push({ id: w.id, title: w.title, artist: w.artist });
                    }
                }
            }
            // Shuffle the 5 choices
            const shuffledChoices = choices.sort(() => Math.random() - 0.5);
            rounds.push({
                roundNumber: roundIndex++,
                questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                previewUrl: track.previewUrl,
                choices: shuffledChoices,
                secretAnswer: track,
            });
        }
        // If we couldn't get enough tracks dynamically, pad with static fallbacks
        if (rounds.length < numSongs && (!playlistUrl || !playlistUrl.trim())) {
            console.log(`[MusicService] Only generated ${rounds.length}/${numSongs} rounds. Padding with static fallbacks...`);
            const staticPool = [...songsData_1.STATIC_FALLBACK_SONGS].sort(() => Math.random() - 0.5);
            for (const staticSong of staticPool) {
                if (rounds.length >= numSongs)
                    break;
                // Avoid duplicate correct answers
                if (rounds.some((r) => r.secretAnswer.id === staticSong.id))
                    continue;
                // Generate choices
                const wrongPool = songsData_1.SEED_SONGS.filter((s) => s.id !== staticSong.id);
                const shuffledWrong = [...wrongPool].sort(() => Math.random() - 0.5);
                const choices = [
                    { id: staticSong.id, title: staticSong.title, artist: staticSong.artist },
                ];
                for (const w of shuffledWrong) {
                    if (choices.length >= 5)
                        break;
                    choices.push({ id: w.id, title: w.title, artist: w.artist });
                }
                const shuffledChoices = choices.sort(() => Math.random() - 0.5);
                rounds.push({
                    roundNumber: roundIndex++,
                    questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    previewUrl: staticSong.previewUrl,
                    choices: shuffledChoices,
                    secretAnswer: {
                        id: staticSong.id,
                        title: staticSong.title,
                        artist: staticSong.artist,
                        genre: staticSong.genre,
                        previewUrl: staticSong.previewUrl,
                        artworkUrl: staticSong.artworkUrl,
                        album: "Fallback Collection",
                    },
                });
            }
        }
        return rounds;
    }
}
exports.musicService = new MusicService();
exports.default = exports.musicService;

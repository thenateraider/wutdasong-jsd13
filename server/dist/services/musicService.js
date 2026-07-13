"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicService = void 0;
const axios_1 = __importDefault(require("axios"));
const songsData_1 = require("../db/songsData");
const mongodb_1 = require("../db/mongodb");
function cleanSearchQuery(query) {
    return query
        // Remove featured artists block like (feat. Artist), [feat Artist], (featuring...)
        .replace(/\s*[\(\[][fF]eat\..*?[\)\]]/g, "")
        .replace(/\s*[\(\[][fF]eatur.*?[\)\]]/g, "")
        // Remove video versions like (Official Music Video), [Official Audio]
        .replace(/\s*[\(\[][oO]fficial\s+[mM]usic\s+[vV]ideo[\)\]]/g, "")
        .replace(/\s*[\(\[][oO]fficial\s+[vV]ideo[\)\]]/g, "")
        .replace(/\s*[\(\[][oO]fficial\s+[aA]udio[\)\]]/g, "")
        .replace(/\s*[\(\[][oO]fficial\s+[lL]yric\s+[vV]ideo[\)\]]/g, "")
        .replace(/\s*[\(\[][lL]yric\s+[vV]ideo[\)\]]/g, "")
        .replace(/\s*[\(\[][vV]ideo[\)\]]/g, "")
        // Remove remaster versions like (Remastered 2020), [2018 Remaster]
        .replace(/\s*[\(\[].*?[rR]emaster.*?[\)\]]/g, "")
        // Remove single indicator
        .replace(/\s*-\s*Single$/gi, "")
        .trim();
}
class MusicService {
    spotifyToken = null;
    tokenExpiresAt = 0;
    constructor() {
        this.getSpotifyToken();
    }
    // Try a pair of Spotify credentials and return token if successful
    async authWithCredentials(clientId, clientSecret, label) {
        try {
            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const response = await axios_1.default.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            this.spotifyToken = response.data.access_token;
            this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
            console.log(`[Spotify] Token refreshed (${label}).`);
            return this.spotifyToken;
        }
        catch (error) {
            console.warn(`[Spotify] Auth failed (${label}): ${error.message}`);
            return null;
        }
    }
    // Get or refresh Spotify Client Credentials token
    async getSpotifyToken() {
        // Return cached token if valid
        if (this.spotifyToken && Date.now() < this.tokenExpiresAt) {
            return this.spotifyToken;
        }
        const pairs = [
            { id: process.env.SPOTIFY_CLIENT_ID, secret: process.env.SPOTIFY_CLIENT_SECRET, label: "primary" },
            { id: process.env.SPOTIFY_CLIENT_ID_2, secret: process.env.SPOTIFY_CLIENT_SECRET_2, label: "fallback" },
        ];
        for (const pair of pairs) {
            if (pair.id && pair.secret) {
                const token = await this.authWithCredentials(pair.id, pair.secret, pair.label);
                if (token)
                    return token;
            }
        }
        console.warn("[Spotify] No valid credentials found. Falling back to iTunes API.");
        return null;
    }
    // Search Spotify Web API for a track
    async searchSpotify(query) {
        const token = await this.getSpotifyToken();
        if (!token)
            return null;
        try {
            const cleanedQuery = cleanSearchQuery(query);
            const response = await axios_1.default.get("https://api.spotify.com/v1/search", {
                headers: { Authorization: `Bearer ${token}` },
                params: { q: cleanedQuery, type: "track", limit: 1 },
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
            if (error.response?.status !== 403) {
                console.warn(`[Spotify] Error searching for "${query}":`, error.message);
            }
            return null;
        }
    }
    async searchITunes(query) {
        try {
            const cleanedQuery = cleanSearchQuery(query);
            const response = await axios_1.default.get("https://itunes.apple.com/search", {
                params: { term: cleanedQuery, entity: "musicTrack", limit: 1 },
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
    // ค้นหาข้อมูลเพลงและปกจาก Deezer API (ฟรี ไม่ต้องใช้ Token)
    async searchDeezer(query) {
        try {
            const cleanedQuery = cleanSearchQuery(query);
            const response = await axios_1.default.get("https://api.deezer.com/search", {
                params: { q: cleanedQuery, limit: 1 },
            });
            const track = response.data.data?.[0];
            if (!track)
                return null;
            return {
                title: track.title,
                artist: track.artist?.name || "Unknown Artist",
                previewUrl: track.preview || undefined,
                artworkUrl: track.album?.cover_medium || track.album?.cover_big || "",
                album: track.album?.title || "Single",
            };
        }
        catch (error) {
            console.warn(`[Deezer] Error searching for "${query}":`, error.message);
            return null;
        }
    }
    // Search Spotify Web API for an artist's profile picture
    async searchSpotifyArtistImage(artistName) {
        const token = await this.getSpotifyToken();
        if (!token)
            return null;
        try {
            const response = await axios_1.default.get("https://api.spotify.com/v1/search", {
                headers: { Authorization: `Bearer ${token}` },
                params: { q: artistName, type: "artist", limit: 1 },
            });
            const artist = response.data.artists?.items?.[0];
            if (artist && artist.images?.[0]?.url) {
                return artist.images[0].url;
            }
            return null;
        }
        catch (error) {
            if (error.response?.status !== 403) {
                console.warn(`[Spotify] Error searching artist image for "${artistName}":`, error.message);
            }
            return null;
        }
    }
    // Fetch artist profile image or fallback to an iTunes track's artwork, then standard placeholder
    async getArtistFallbackImage(artistName) {
        // 1. Try Spotify artist profile image
        const spotifyArtistImage = await this.searchSpotifyArtistImage(artistName);
        if (spotifyArtistImage)
            return spotifyArtistImage;
        // 2. Try iTunes search for artist to get any of their track's artwork
        try {
            // ค้นหาเพลงของศิลปินจาก iTunes มากสุด 5 เพลงเพื่อหาเพลงที่ชื่อศิลปินตรงกันจริงๆ
            const response = await axios_1.default.get("https://itunes.apple.com/search", {
                params: { term: artistName, entity: "musicTrack", limit: 5 },
            });
            const tracks = response.data.results || [];
            const matchedTrack = tracks.find((r) => r.artistName && (r.artistName.toLowerCase().includes(artistName.toLowerCase()) ||
                artistName.toLowerCase().includes(r.artistName.toLowerCase()))) || (tracks.length > 0 ? tracks[0] : null);
            if (matchedTrack && matchedTrack.artworkUrl100) {
                let artwork = matchedTrack.artworkUrl100;
                if (artwork.endsWith("100x100bb.jpg")) {
                    artwork = artwork.replace("100x100bb.jpg", "400x400bb.jpg");
                }
                return artwork;
            }
        }
        catch (e) {
            // ignore
        }
        // 3. Absolute fallback placeholder
        return "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";
    }
    // ค้นหารูปปกและอัลบั้มด้วยชื่อเพลงอย่างเดียว แล้วคัดกรองศิลปินที่ตรงกัน (กรณีสะกดต่างหรือค้นหาเต็มไม่พบ)
    async searchFallbackArtwork(title, artistName) {
        const cleanTitle = cleanSearchQuery(title);
        const cleanArtist = artistName.toLowerCase().replace(/\s/g, "");
        // 1. ลองค้นหาจาก iTunes
        try {
            const response = await axios_1.default.get("https://itunes.apple.com/search", {
                params: { term: cleanTitle, entity: "musicTrack", limit: 10 },
            });
            const results = response.data.results || [];
            const matched = results.find((r) => {
                if (!r.artistName)
                    return false;
                const normalizedResArtist = r.artistName.toLowerCase().replace(/\s/g, "");
                return normalizedResArtist.includes(cleanArtist) || cleanArtist.includes(normalizedResArtist);
            });
            if (matched && matched.artworkUrl100) {
                let artwork = matched.artworkUrl100;
                if (artwork.endsWith("100x100bb.jpg")) {
                    artwork = artwork.replace("100x100bb.jpg", "400x400bb.jpg");
                }
                return {
                    artworkUrl: artwork,
                    album: matched.collectionName || "Single"
                };
            }
        }
        catch (e) {
            // ignore
        }
        // 2. ลองค้นหาจาก Spotify
        try {
            const token = await this.getSpotifyToken();
            if (token) {
                const response = await axios_1.default.get("https://api.spotify.com/v1/search", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { q: cleanTitle, type: "track", limit: 10 },
                });
                const tracks = response.data.tracks?.items || [];
                const matched = tracks.find((t) => {
                    return t.artists && t.artists.some((a) => {
                        const normalizedResArtist = a.name.toLowerCase().replace(/\s/g, "");
                        return normalizedResArtist.includes(cleanArtist) || cleanArtist.includes(normalizedResArtist);
                    });
                });
                if (matched) {
                    return {
                        artworkUrl: matched.album?.images?.[0]?.url || "",
                        album: matched.album?.name || "Unknown Album"
                    };
                }
            }
        }
        catch (e) {
            // ignore
        }
        // 3. ลองค้นหาจาก Deezer
        try {
            const response = await axios_1.default.get("https://api.deezer.com/search", {
                params: { q: cleanTitle, limit: 10 },
            });
            const results = response.data.data || [];
            const matched = results.find((r) => {
                if (!r.artist?.name)
                    return false;
                const normalizedResArtist = r.artist.name.toLowerCase().replace(/\s/g, "");
                return normalizedResArtist.includes(cleanArtist) || cleanArtist.includes(normalizedResArtist);
            });
            if (matched && matched.album?.cover_medium) {
                return {
                    artworkUrl: matched.album.cover_medium,
                    album: matched.album.title || "Single"
                };
            }
        }
        catch (e) {
            // ignore
        }
        return null;
    }
    // Helper to save a song back to the database cache
    async cacheResolvedSong(spotifyId, track) {
        try {
            if (!track.previewUrl)
                return;
            await mongodb_1.CachedSong.findOneAndUpdate({ spotifyId }, {
                title: track.title,
                artist: track.artist,
                genre: track.genre,
                previewUrl: track.previewUrl,
                artworkUrl: track.artworkUrl,
                album: track.album
            }, { upsert: true, new: true });
            console.log(`[MusicService] Cached: ${track.artist} - ${track.title}`);
        }
        catch (err) {
            console.warn("[MusicService] Failed to cache song:", err);
        }
    }
    // Helper to fetch details and preview url for a seed song
    async fetchTrackDetails(seed) {
        const resolved = await this.resolveTrackDetails(seed);
        if (resolved && resolved.previewUrl) {
            // Save it to cache background-ly
            this.cacheResolvedSong(seed.id, resolved);
        }
        return resolved;
    }
    async resolveTrackDetails(seed) {
        // ตรวจสอบข้อมูลจาก Cache ใน Database ก่อนเป็นอันดับแรก เพื่อเลี่ยงการจำกัดโควตา API
        try {
            const cacheKey = seed.id;
            const cached = await mongodb_1.CachedSong.findOne({ spotifyId: cacheKey });
            // หากมี Cache, รูปปกไม่ใช่รูป Fallback แผ่นเสียง, และอัลบั้มต้องไม่ใช่ "Spotify Playlist" ให้ใช้งานได้ทันที
            if (cached && cached.artworkUrl && !cached.artworkUrl.includes("photo-1614613535308-eb5fbd3d2c17") && cached.album !== "Spotify Playlist") {
                console.log(`[MusicService] Cache Hit for: ${seed.artist} - ${seed.title}`);
                return {
                    id: seed.id,
                    title: cached.title,
                    artist: cached.artist,
                    genre: seed.genre,
                    previewUrl: cached.previewUrl || seed.spotifyPreviewUrl || "",
                    artworkUrl: cached.artworkUrl,
                    album: cached.album,
                };
            }
        }
        catch (err) {
            console.warn("[MusicService] Cache lookup error:", err);
        }
        // หากเป็นเพลงจาก Playlist ที่มี preview URL และมีรูปปกอยู่แล้ว ให้ส่งกลับทันที
        if (seed.spotifyPreviewUrl) {
            if (seed.artworkUrl) {
                return {
                    id: seed.id,
                    title: seed.title,
                    artist: seed.artist,
                    genre: seed.genre,
                    previewUrl: seed.spotifyPreviewUrl || "",
                    artworkUrl: seed.artworkUrl,
                    album: seed.album && seed.album !== "Spotify Playlist" ? seed.album : "Unknown Album",
                };
            }
            // ใช้ชื่ออัลบั้มเพิ่มใน Query ด้วยหากมีข้อมูล
            const albumSuffix = seed.album && !["spotify playlist", "unknown album", "single"].includes(seed.album.toLowerCase()) ? ` ${seed.album}` : "";
            const searchQuery = `${seed.artist} ${seed.title}${albumSuffix}`;
            // หากไม่มีรูปปก ให้ค้นหาจาก iTunes เพื่อดึงรูปปกมาใช้งาน
            let itunesForArt = await this.searchITunes(searchQuery);
            // หากดึงจาก iTunes ไม่สำเร็จ ให้ลองค้นหาผ่าน Spotify API เพิ่มเติม
            let spotifyForArt = null;
            if (!itunesForArt?.artworkUrl) {
                spotifyForArt = await this.searchSpotify(searchQuery);
            }
            // หากดึงจาก Spotify ไม่สำเร็จ ให้ลองค้นหาผ่าน Deezer API เพิ่มเติม
            let deezerForArt = null;
            if (!itunesForArt?.artworkUrl && !spotifyForArt?.artworkUrl) {
                deezerForArt = await this.searchDeezer(searchQuery);
            }
            // หากยังค้นหาปกติไม่เจอ ให้สลับใช้การค้นหาสำรองแบบระบุเฉพาะชื่อเพลงแล้วตรวจสอบชื่อศิลปินแทน (เพื่อแก้สะกดไม่ตรง)
            let fallbackArt = null;
            if (!itunesForArt?.artworkUrl && !spotifyForArt?.artworkUrl && !deezerForArt?.artworkUrl) {
                fallbackArt = await this.searchFallbackArtwork(seed.title, seed.artist);
            }
            const artworkUrl = itunesForArt?.artworkUrl || spotifyForArt?.artworkUrl || deezerForArt?.artworkUrl || fallbackArt?.artworkUrl || await this.getArtistFallbackImage(seed.artist);
            const album = itunesForArt?.album || spotifyForArt?.album || deezerForArt?.album || fallbackArt?.album || (seed.album && seed.album !== "Spotify Playlist" ? seed.album : "Unknown Album");
            return {
                id: seed.id,
                title: seed.title,
                artist: seed.artist,
                genre: seed.genre,
                previewUrl: seed.spotifyPreviewUrl || "",
                artworkUrl,
                album,
            };
        }
        // ใช้ชื่ออัลบั้มเพิ่มใน Query สำหรับค้นหาทั่วไปด้วยเช่นกัน
        const albumSuffix = seed.album && !["spotify playlist", "unknown album", "single"].includes(seed.album.toLowerCase()) ? ` ${seed.album}` : "";
        const query = seed.searchQuery || `${seed.artist} ${seed.title}${albumSuffix}`;
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
        // 2.5 ลองค้นหาจาก Deezer เป็นแหล่งที่ 3 (ฟรี ไม่ติด Rate Limit และมีคลังเพลงกว้างขวาง)
        if (!details || !details.previewUrl) {
            const deezerDetails = await this.searchDeezer(query);
            if (deezerDetails && deezerDetails.previewUrl) {
                details = {
                    ...details,
                    title: details?.title || deezerDetails.title,
                    artist: details?.artist || deezerDetails.artist,
                    previewUrl: deezerDetails.previewUrl,
                    artworkUrl: details?.artworkUrl || deezerDetails.artworkUrl,
                    album: details?.album || deezerDetails.album,
                };
            }
        }
        // หากได้รายละเอียดแล้วแต่ไม่มีรูปปก ให้ใช้การค้นหาสำรองด้วยชื่อเพลงอย่างเดียวเพื่อตรวจสอบปกอีกรอบ
        if (details && (!details.artworkUrl || details.artworkUrl === "")) {
            const fallbackArt = await this.searchFallbackArtwork(seed.title, seed.artist);
            if (fallbackArt) {
                details.artworkUrl = fallbackArt.artworkUrl;
                if (!details.album || details.album === "Unknown Album") {
                    details.album = fallbackArt.album;
                }
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
            artworkUrl: details.artworkUrl || await this.getArtistFallbackImage(seed.artist),
            album: details.album && details.album !== "Spotify Playlist" ? details.album : "Unknown Album",
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
    // Fetch playlist preview info (name, cover, track count)
    async fetchPlaylistInfo(playlistId) {
        // Try embed scraper first
        try {
            const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout: 8000,
            });
            const html = response.data;
            const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (nextDataMatch) {
                const parsed = JSON.parse(nextDataMatch[1]);
                const entity = parsed.props?.pageProps?.state?.data?.entity;
                if (entity) {
                    const name = entity.name || "Spotify Playlist";
                    const imageUrl = entity.images?.[0]?.url || entity.coverArt?.sources?.[0]?.url || null;
                    const trackCount = entity.trackList?.length || entity.tracks?.total || 0;
                    return { name, imageUrl, trackCount };
                }
            }
        }
        catch (err) {
            console.warn(`[PlaylistInfo] Embed scraper failed: ${err.message}`);
            // 429 = rate limited; don't bother with API fallback
            if (err.response?.status === 429) {
                return null;
            }
        }
        // Fallback: try Spotify API (only if embed wasn't rate limited)
        try {
            const token = await this.getSpotifyToken();
            if (token) {
                const response = await axios_1.default.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { fields: "name,images,tracks.total" },
                });
                const data = response.data;
                return {
                    name: data.name || "Spotify Playlist",
                    imageUrl: data.images?.[0]?.url || null,
                    trackCount: data.tracks?.total || 0,
                };
            }
        }
        catch (err) {
            console.warn(`[PlaylistInfo] Spotify API fallback failed: ${err.message}`);
        }
        return null;
    }
    // Fetch playlist tracks from Spotify (tries Embed Scraper first, falls back to API)
    async fetchSpotifyPlaylistTracks(playlistId) {
        console.log(`[Spotify] Fetching tracks for playlist ID via Embed Scraper: ${playlistId}`);
        try {
            const url = `https://open.spotify.com/embed/playlist/${playlistId}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            const html = response.data;
            const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!nextDataMatch) {
                throw new Error("Could not find __NEXT_DATA__ JSON script in embed page.");
            }
            const parsed = JSON.parse(nextDataMatch[1]);
            const entity = parsed.props?.pageProps?.state?.data?.entity;
            const trackList = entity?.trackList || [];
            if (trackList.length === 0) {
                throw new Error("Track list is empty or undefined in embed JSON.");
            }
            const tracks = trackList.map((t, idx) => {
                const trackId = t.uri ? t.uri.split(":")[2] : `embed_pl_${idx}_${Date.now()}`;
                // Try to get artwork from track's associated images
                const artworkUrl = t.imageUrl || t.image?.url || entity?.images?.[0]?.url || undefined;
                return {
                    id: trackId,
                    title: t.title,
                    artist: t.subtitle,
                    genre: "Spotify Playlist",
                    spotifyPreviewUrl: t.audioPreview?.url || undefined,
                    artworkUrl: artworkUrl,
                    album: t.album?.name || undefined
                };
            });
            console.log(`[Spotify Embed] Successfully parsed ${tracks.length} tracks.`);
            return tracks;
        }
        catch (err) {
            console.warn(`[Spotify Embed] Scraper failed: ${err.message}.`);
            // 429 = rate limited; skip API fallback (it'll 403 anyway)
            if (err.response?.status === 429) {
                throw new Error("Spotify embed rate limited. Try again later.");
            }
            console.warn(`Trying official Spotify API as fallback...`);
            return this.fetchSpotifyPlaylistTracksViaAPI(playlistId);
        }
    }
    // Fetch playlist tracks via official API (fallback)
    async fetchSpotifyPlaylistTracksViaAPI(playlistId) {
        const token = await this.getSpotifyToken();
        if (!token) {
            throw new Error("Spotify credentials are not set in the .env file. Please check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
        }
        try {
            console.log(`[Spotify API] Fetching tracks for playlist: ${playlistId}`);
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
            console.log(`[Spotify API] Retrieved ${tracks.length} tracks from playlist.`);
            return tracks;
        }
        catch (error) {
            console.error("[Spotify API] Error fetching playlist tracks:", error.message);
            if (error.response?.status === 404) {
                throw new Error("Spotify playlist not found. Make sure the playlist is PUBLIC.");
            }
            if (error.response?.status === 403) {
                throw new Error("Spotify API access requires the app owner to have a Premium subscription. Update SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET from a Premium account, or remove them to disable Spotify API (playlist-based games will use built-in songs).");
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
            try {
                pool = await this.fetchSpotifyPlaylistTracks(playlistId);
            }
            catch (err) {
                console.warn(`[MusicService] Playlist fetch failed: ${err.message}. Falling back to genre-based seed songs.`);
                // Fall back to genre-based selection so game can still work
                const isRandom = genres.includes("Random") || genres.length === 0;
                pool = songsData_1.SEED_SONGS.filter((song) => isRandom || genres.includes(song.genre));
                if (pool.length === 0) {
                    throw new Error("Could not fetch playlist tracks and no seed songs match selected genres.");
                }
            }
        }
        else {
            // 1. Filter songs by selected genres (handle 'Random' or empty as all)
            const isRandom = genres.includes("Random") || genres.length === 0;
            pool = songsData_1.SEED_SONGS.filter((song) => isRandom || genres.includes(song.genre));
        }
        if (pool.length === 0) {
            throw new Error("No songs found matching selected parameters.");
        }
        // 1. Filter out acoustic, acapella, cappella, instrumental, karaoke, extended versions
        const unwantedKeywords = ["acoustic", "acapella", "cappella", "instrumental", "instrument", "karaoke", "extended"];
        const filteredPool = pool.filter((song) => {
            const titleLower = song.title.toLowerCase();
            return !unwantedKeywords.some(keyword => titleLower.includes(keyword));
        });
        // 2. Deduplicate song titles in the session
        const seenTitles = new Set();
        const uniquePool = [];
        for (const song of filteredPool) {
            const cleanTitle = song.title.trim().toLowerCase();
            if (!seenTitles.has(cleanTitle)) {
                seenTitles.add(cleanTitle);
                uniquePool.push(song);
            }
        }
        if (uniquePool.length === 0) {
            throw new Error("No valid songs remaining after applying filters.");
        }
        // Shuffle pool using Fisher-Yates algorithm for true randomness
        const shuffledPool = [...uniquePool];
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }
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
            const wrongPool = uniquePool.filter((s) => s.id !== seedSong.id);
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

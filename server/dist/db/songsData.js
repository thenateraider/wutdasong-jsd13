"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATIC_FALLBACK_SONGS = exports.SEED_SONGS = void 0;
exports.SEED_SONGS = [
    // POP
    { id: "pop_1", title: "Blank Space", artist: "Taylor Swift", genre: "Pop" },
    { id: "pop_2", title: "Bad Guy", artist: "Billie Eilish", genre: "Pop" },
    { id: "pop_3", title: "Uptown Funk", artist: "Bruno Mars", genre: "Pop" },
    { id: "pop_4", title: "Levitating", artist: "Dua Lipa", genre: "Pop" },
    { id: "pop_5", title: "Blinding Lights", artist: "The Weeknd", genre: "Pop" },
    { id: "pop_6", title: "Love Yourself", artist: "Justin Bieber", genre: "Pop" },
    { id: "pop_7", title: "Shape of You", artist: "Ed Sheeran", genre: "Pop" },
    { id: "pop_8", title: "Rolling in the Deep", artist: "Adele", genre: "Pop" },
    { id: "pop_9", title: "Flowers", artist: "Miley Cyrus", genre: "Pop" },
    { id: "pop_10", title: "Drivers License", artist: "Olivia Rodrigo", genre: "Pop" },
    // ROCK
    { id: "rock_1", title: "Bohemian Rhapsody", artist: "Queen", genre: "Rock" },
    { id: "rock_2", title: "Back In Black", artist: "AC/DC", genre: "Rock" },
    { id: "rock_3", title: "In The End", artist: "Linkin Park", genre: "Rock" },
    { id: "rock_4", title: "Smells Like Teen Spirit", artist: "Nirvana", genre: "Rock" },
    { id: "rock_5", title: "Livin' On A Prayer", artist: "Bon Jovi", genre: "Rock" },
    { id: "rock_6", title: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: "Rock" },
    { id: "rock_7", title: "Yellow", artist: "Coldplay", genre: "Rock" },
    { id: "rock_8", title: "Creep", artist: "Radiohead", genre: "Rock" },
    { id: "rock_9", title: "Californication", artist: "Red Hot Chili Peppers", genre: "Rock" },
    { id: "rock_10", title: "Bring Me To Life", artist: "Evanescence", genre: "Rock" },
    // ANIME
    { id: "anime_1", title: "A Cruel Angel's Thesis", artist: "Yoko Takahashi", genre: "Anime", searchQuery: "Cruel Angels Thesis Yoko Takahashi" },
    { id: "anime_2", title: "Silhouette", artist: "KANA-BOON", genre: "Anime" },
    { id: "anime_3", title: "Gurenge", artist: "LiSA", genre: "Anime" },
    { id: "anime_4", title: "Unravel", artist: "TK from Ling tosite sigure", genre: "Anime", searchQuery: "Unravel Ling tosite sigure" },
    { id: "anime_5", title: "Idol", artist: "YOASOBI", genre: "Anime" },
    { id: "anime_6", title: "Shinzou wo Sasageyo!", artist: "Linked Horizon", genre: "Anime", searchQuery: "Shinzou wo Sasageyo Linked Horizon" },
    { id: "anime_7", title: "Blue Bird", artist: "Ikimonogakari", genre: "Anime" },
    { id: "anime_8", title: "Kaikai Kitan", artist: "Eve", genre: "Anime" },
    { id: "anime_9", title: "Zenzenzense", artist: "RADWIMPS", genre: "Anime" },
    { id: "anime_10", title: "Guren no Yumiya", artist: "Linked Horizon", genre: "Anime", searchQuery: "Guren no Yumiya Linked Horizon" },
    // THAI
    { id: "thai_1", title: "ฝนตกไหม", artist: "Three Man Down", genre: "Thai", searchQuery: "ฝนตกไหม Three Man Down" },
    { id: "thai_2", title: "คิดแต่ไม่ถึง", artist: "Tilly Birds", genre: "Thai", searchQuery: "คิดแต่ไม่ถึง Tilly Birds" },
    { id: "thai_3", title: "ห้องกระจก", artist: "Safeplanet", genre: "Thai", searchQuery: "ห้องกระจก Safeplanet" },
    { id: "thai_4", title: "โต๊ะริม (Melt)", artist: "NONT TANONT", genre: "Thai", searchQuery: "โต๊ะริม Nont Tanont" },
    { id: "thai_5", title: "ลืมไปแล้วว่าลืมยังไง (Fade)", artist: "Jeff Satur", genre: "Thai", searchQuery: "ลืมไปแล้วว่าลืมยังไง Jeff Satur" },
    { id: "thai_6", title: "ทรงอย่างแบด (Bad Boy)", artist: "Paper Planes", genre: "Thai", searchQuery: "ทรงอย่างแบด Paper Planes" },
    { id: "thai_7", title: "วาดไว้ (Recall)", artist: "Bowkylion", genre: "Thai", searchQuery: "วาดไว้ Bowkylion" },
    { id: "thai_8", title: "สายตาหลอกกันไม่ได้ (Eyes don't lie)", artist: "Ink Waruntorn", genre: "Thai", searchQuery: "สายตาหลอกกันไม่ได้ Ink Waruntorn" },
    { id: "thai_9", title: "ถ้าเธอ", artist: "Violette Wautier", genre: "Thai", searchQuery: "ถ้าเธอ Violette Wautier Stamp" },
    { id: "thai_10", title: "คุกเข่า", artist: "Cocktail", genre: "Thai", searchQuery: "คุกเข่า Cocktail" },
    // K-POP
    { id: "kpop_1", title: "Dynamite", artist: "BTS", genre: "K-pop" },
    { id: "kpop_2", title: "How You Like That", artist: "BLACKPINK", genre: "K-pop" },
    { id: "kpop_3", title: "Hype Boy", artist: "NewJeans", genre: "K-pop" },
    { id: "kpop_4", title: "What is Love?", artist: "TWICE", genre: "K-pop", searchQuery: "What is Love TWICE" },
    { id: "kpop_5", title: "Gangnam Style", artist: "PSY", genre: "K-pop" },
    { id: "kpop_6", title: "Love Dive", artist: "IVE", genre: "K-pop" },
    { id: "kpop_7", title: "S-Class", artist: "Stray Kids", genre: "K-pop" },
    { id: "kpop_8", title: "ANTIFRAGILE", artist: "LE SSERAFIM", genre: "K-pop" },
    { id: "kpop_9", title: "Next Level", artist: "aespa", genre: "K-pop" },
    { id: "kpop_10", title: "BANG BANG BANG", artist: "BIGBANG", genre: "K-pop" },
    // GAME
    { id: "game_1", title: "Super Mario Bros Theme", artist: "Koji Kondo", genre: "Game", searchQuery: "Super Mario Bros Theme" },
    { id: "game_2", title: "The Legend of Zelda Theme", artist: "Koji Kondo", genre: "Game", searchQuery: "Legend of Zelda Theme" },
    { id: "game_3", title: "Dragonborn (Skyrim Theme)", artist: "Jeremy Soule", genre: "Game", searchQuery: "Skyrim Theme Dragonborn" },
    { id: "game_4", title: "Sweden", artist: "C418", genre: "Game", searchQuery: "Sweden C418" },
    { id: "game_5", title: "Megalovania", artist: "Toby Fox", genre: "Game" },
    { id: "game_6", title: "Green Hill Zone", artist: "Sonic", genre: "Game", searchQuery: "Green Hill Zone Sonic" },
    { id: "game_7", title: "Halo Theme", artist: "Martin O'Donnell", genre: "Game", searchQuery: "Halo Theme" },
    { id: "game_8", title: "Simple and Clean", artist: "Hikaru Utada", genre: "Game", searchQuery: "Simple and Clean Kingdom Hearts" },
    { id: "game_9", title: "One-Winged Angel", artist: "Nobuo Uematsu", genre: "Game", searchQuery: "One Winged Angel Final Fantasy" },
    { id: "game_10", title: "The Last of Us Theme", artist: "Gustavo Santaolalla", genre: "Game", searchQuery: "The Last of Us Theme" },
    // MOVIE
    { id: "movie_1", title: "Star Wars Main Title", artist: "John Williams", genre: "Movie", searchQuery: "Star Wars Main Title John Williams" },
    { id: "movie_2", title: "Hedwig's Theme", artist: "John Williams", genre: "Movie", searchQuery: "Hedwig Theme Harry Potter" },
    { id: "movie_3", title: "Cornfield Chase", artist: "Hans Zimmer", genre: "Movie", searchQuery: "Cornfield Chase Interstellar" },
    { id: "movie_4", title: "Let It Go", artist: "Idina Menzel", genre: "Movie", searchQuery: "Let It Go Frozen Idina Menzel" },
    { id: "movie_5", title: "Circle of Life", artist: "Elton John", genre: "Movie" },
    { id: "movie_6", title: "My Heart Will Go On", artist: "Celine Dion", genre: "Movie" },
    { id: "movie_7", title: "One Summer's Day", artist: "Joe Hisaishi", genre: "Movie", searchQuery: "Spirited Away One Summers Day Joe Hisaishi" },
    { id: "movie_8", title: "James Bond Theme", artist: "John Barry Orchestra", genre: "Movie", searchQuery: "James Bond Theme" },
    { id: "movie_9", title: "Gonna Fly Now (Rocky Theme)", artist: "Bill Conti", genre: "Movie", searchQuery: "Gonna Fly Now Rocky" },
    { id: "movie_10", title: "The Avengers Theme", artist: "Alan Silvestri", genre: "Movie", searchQuery: "Avengers Theme Alan Silvestri" }
];
// In case the API is completely blocked/down, we have these verified open URLs that play audio instantly.
exports.STATIC_FALLBACK_SONGS = [
    {
        id: "fb_1",
        title: "Blank Space",
        artist: "Taylor Swift",
        genre: "Pop",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/e5/5d/47/e55d475d-3575-b461-460d-7ca656f7ef57/mzaf_10515153245464977464.plus.aac.p.m4a",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c3/84/0d/c3840d4e-128a-7140-5e5d-16a2a5ff513a/14UMGIM56475.rgb.jpg/100x100bb.jpg"
    },
    {
        id: "fb_2",
        title: "In The End",
        artist: "Linkin Park",
        genre: "Rock",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/44/cd/64/44cd64e7-4b8c-55b2-32a8-12cd80d3bd20/mzaf_13506161427503893040.plus.aac.p.m4a",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e2/05/fd/e205fd32-4217-1f19-a42e-13c588523ee3/093624855909.jpg/100x100bb.jpg"
    },
    {
        id: "fb_3",
        title: "Dynamite",
        artist: "BTS",
        genre: "K-pop",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/73/45/70/73457007-0097-d86b-a2c6-339c94380eb9/mzaf_17208151240409241904.plus.aac.p.m4a",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/fa/1c/fb/fa1cfb44-93ad-4e0c-d38d-8cd655a3068e/8809634386992.jpg/100x100bb.jpg"
    },
    {
        id: "fb_4",
        title: "Silhouette",
        artist: "KANA-BOON",
        genre: "Anime",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/36/53/43/36534346-6091-a1b4-ef79-11c5e9334d40/mzaf_1292025381831416805.plus.aac.p.m4a",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/28/3d/c0/283dc084-fa6d-0ee5-9cf0-c63ff430e7fa/886444857645.jpg/100x100bb.jpg"
    },
    {
        id: "fb_5",
        title: "โต๊ะริม (Melt)",
        artist: "NONT TANONT",
        genre: "Thai",
        previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/44/a5/cb/44a5cb23-b1d5-bc44-59e5-9c95d3368297/mzaf_643644917637851722.plus.aac.p.m4a",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/1e/8c/81/1e8c81c1-4cb3-558a-6b45-a7b29a25b2f2/196871032338.jpg/100x100bb.jpg"
    }
];

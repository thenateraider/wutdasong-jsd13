import { useState, useRef, useCallback } from "react";
import { GameSettings, useGameStore } from "../store/gameStore";
import { ArrowLeft, Play, Info, Loader2, Music2, CheckCircle2, AlertCircle, X, Search } from "lucide-react";
import { translations } from "../utils/translations";

interface SinglePlayerSetupProps {
  onBack: () => void;
  onStart: (settings: GameSettings) => void;
  playClickSFX: () => void;
}

interface PlaylistInfo {
  name: string;
  imageUrl: string | null;
  trackCount: number;
}

const GENRES = ["Pop", "Rock", "Anime", "Thai", "K-pop", "Game", "Movie"];

export function SinglePlayerSetup({ onBack, onStart, playClickSFX }: SinglePlayerSetupProps) {
  const { language } = useGameStore();
  const [numSongs, setNumSongs] = useState<number>(10);
  const [answerDuration, setAnswerDuration] = useState<number>(10);
  const clipDuration = 5;
  const difficulty = "Normal";
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Pop"]);
  const [usePlaylist, setUsePlaylist] = useState<boolean>(false);
  const [playlistUrl, setPlaylistUrl] = useState<string>("");

  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleStart = () => {
    const settings: GameSettings = {
      numSongs,
      answerDuration,
      clipDuration,
      genres: usePlaylist ? [] : selectedGenres,
      difficulty,
      playlistUrl: usePlaylist && playlistUrl.trim() ? playlistUrl.trim() : undefined,
    };
    onStart(settings);
  };

  // Core fetch function — called by debounce and manual search button
  const fetchPlaylistInfo = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setPlaylistLoading(true);
    setPlaylistInfo(null);
    setPlaylistError(null);

    try {
      // Use Vite proxy: /api proxied to http://localhost:5000
      const res = await fetch(`/api/playlist-info?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        setPlaylistError(data.error || "ไม่สามารถดึงข้อมูล playlist ได้");
        setPlaylistInfo(null);
      } else {
        setPlaylistInfo(data);
        setPlaylistError(null);
        if (data.trackCount < numSongs) {
          if (data.trackCount >= 10) setNumSongs(10);
          else setNumSongs(5);
        }
      }
    } catch (err) {
      console.error("[PlaylistPreview] fetch error:", err);
      setPlaylistError("เชื่อมต่อ server ไม่ได้ กรุณาตรวจสอบว่า server รันอยู่");
      setPlaylistInfo(null);
    } finally {
      setPlaylistLoading(false);
    }
  }, []);

  // Debounced auto-fetch when typing
  const handlePlaylistUrlChange = (value: string) => {
    setPlaylistUrl(value);
    setPlaylistInfo(null);
    setPlaylistError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || !value.toLowerCase().includes("spotify")) {
      setPlaylistLoading(false);
      return;
    }

    setPlaylistLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchPlaylistInfo(value);
    }, 900);
  };

  // Clear URL + reset state
  const clearUrl = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPlaylistUrl("");
    setPlaylistInfo(null);
    setPlaylistError(null);
    setPlaylistLoading(false);
  };

  const sectionTitle = (emoji: string, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "1rem" }}>{emoji}</span>
      <span
        style={{
          fontFamily: "Outfit, sans-serif",
          fontSize: "0.78rem",
          fontWeight: 800,
          color: "var(--text-mid)",
          textTransform: "uppercase",
          letterSpacing: "0.09em",
        }}
      >
        {text}
      </span>
    </div>
  );

  const isValidSpotifyUrl = playlistUrl.toLowerCase().includes("spotify") && playlistUrl.includes("playlist");
  const canStart = !usePlaylist || (playlistUrl.trim() !== "" && !playlistLoading && playlistInfo !== null && playlistInfo.trackCount >= 5);

  return (
    <div className="page-container" style={{ maxWidth: "560px" }}>
      {/* Back */}
      <div style={{ width: "100%", textAlign: "left" }}>
        <button onClick={onBack} className="back-link">
          <ArrowLeft size={18} />
          {translations[language].backBtn}
        </button>
      </div>

      {/* Setup Card */}
      <div className="card" style={{ gap: "0", padding: "22px 20px" }}>
        <h2 className="gradient-title-md" style={{ marginBottom: "20px", textAlign: "center" }}>
          🎮 {translations[language].setupTitle}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* ── Source toggle ── */}
          <div>
            {sectionTitle("🎵", language === "th" ? "แหล่งเพลง" : "Music Source")}
            <div className="toggle-row" style={{ marginBottom: 0 }}>
              <div>
                <h4 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.90rem", color: "var(--text-dark)" }}>
                  {language === "th" ? "เล่นจาก Spotify Playlist" : "Play from Spotify Playlist"}
                </h4>
                <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {language === "th" ? "วางลิงค์ playlist สาธารณะของคุณ" : "Paste your public Spotify playlist URL"}
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={usePlaylist}
                  onChange={(e) => {
                    playClickSFX();
                    setUsePlaylist(e.target.checked);
                    clearUrl();
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* ── Playlist URL section ── */}
          {usePlaylist && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sectionTitle("🔗", "Spotify Playlist")}

              {/* Input row with X and Search buttons */}
              <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                {/* URL input */}
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    placeholder={translations[language].playlistUrlPlaceholder}
                    value={playlistUrl}
                    onChange={(e) => handlePlaylistUrlChange(e.target.value)}
                    className="input-text"
                    style={{
                      paddingRight: playlistUrl ? "38px" : "14px",
                      width: "100%",
                      fontSize: "0.85rem",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isValidSpotifyUrl) fetchPlaylistInfo(playlistUrl);
                    }}
                  />
                  {/* Status icon inside input */}
                  <div
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {playlistLoading && (
                      <Loader2
                        size={15}
                        style={{
                          color: "var(--orange-core)",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                    {!playlistLoading && playlistInfo && (
                      <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                    )}
                    {!playlistLoading && playlistError && !playlistInfo && (
                      <AlertCircle size={15} style={{ color: "var(--error)" }} />
                    )}
                  </div>
                </div>

                {/* Clear (X) button */}
                {playlistUrl && (
                  <button
                    onClick={() => { playClickSFX(); clearUrl(); }}
                    title={language === "th" ? "ล้างลิงค์" : "Clear URL"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "42px",
                      height: "42px",
                      flexShrink: 0,
                      borderRadius: "var(--r-md)",
                      border: "1.5px solid rgba(239,68,68,0.30)",
                      background: "rgba(239,68,68,0.08)",
                      color: "var(--error)",
                      cursor: "pointer",
                      transition: "var(--t-fast)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.16)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    }}
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Search button */}
                <button
                  onClick={() => {
                    playClickSFX();
                    if (isValidSpotifyUrl) fetchPlaylistInfo(playlistUrl);
                  }}
                  disabled={!isValidSpotifyUrl || playlistLoading}
                  title={language === "th" ? "ดึงข้อมูล playlist" : "Fetch playlist details"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    padding: "0 14px",
                    height: "42px",
                    flexShrink: 0,
                    borderRadius: "var(--r-md)",
                    border: "none",
                    background: isValidSpotifyUrl && !playlistLoading
                      ? "var(--grad-primary)"
                      : "rgba(0,0,0,0.08)",
                    color: isValidSpotifyUrl && !playlistLoading ? "#fff" : "var(--text-muted)",
                    cursor: isValidSpotifyUrl && !playlistLoading ? "pointer" : "not-allowed",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    transition: "var(--t-fast)",
                    boxShadow: isValidSpotifyUrl && !playlistLoading
                      ? "0 4px 14px rgba(255,107,53,0.35)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (isValidSpotifyUrl && !playlistLoading)
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {playlistLoading ? (
                    <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Search size={15} />
                  )}
                  {language === "th" ? "ค้นหา" : "Search"}
                </button>
              </div>

              {/* Error */}
              {playlistError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "10px 14px",
                    background: "var(--error-light)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    borderRadius: "var(--r-md)",
                    fontSize: "0.80rem",
                    color: "var(--error)",
                    fontWeight: 600,
                    animation: "slideUpFade 0.22s var(--ease-spring) forwards",
                  }}
                >
                  <AlertCircle size={14} style={{ marginTop: "1px", flexShrink: 0 }} />
                  {playlistError}
                </div>
              )}

              {/* ── Playlist Preview Card ── */}
              {playlistInfo && !playlistError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1.5px solid rgba(34,197,94,0.35)",
                    borderRadius: "var(--r-xl)",
                    boxShadow: "0 4px 20px rgba(34,197,94,0.12)",
                    animation: "springPop 0.32s var(--ease-spring) forwards",
                  }}
                >
                  {/* Cover art */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "var(--r-md)",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "2.5px solid rgba(255,255,255,0.90)",
                      boxShadow: "var(--shadow-md)",
                      background: "var(--orange-pastel)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {playlistInfo.imageUrl ? (
                      <img
                        src={playlistInfo.imageUrl}
                        alt="Playlist cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Music2 size={26} style={{ color: "var(--orange-core)" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Spotify badge */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "linear-gradient(135deg,#1DB954,#17a74a)",
                        color: "#fff",
                        borderRadius: "var(--r-full)",
                        padding: "2px 8px",
                        fontSize: "0.60rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        marginBottom: "5px",
                      }}
                    >
                      ♪ Spotify
                    </div>
                    {/* Playlist name */}
                    <div
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "0.95rem",
                        fontWeight: 900,
                        color: "var(--text-dark)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.2,
                        marginBottom: "4px",
                      }}
                    >
                      {playlistInfo.name}
                    </div>
                    {/* Track count */}
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span>🎵</span>
                      <span>{playlistInfo.trackCount}</span>
                      {playlistInfo.trackCount > 0 && numSongs > playlistInfo.trackCount && (
                        <span style={{ color: "var(--warning)", fontWeight: 700 }}>
                          · {language === "th" ? "น้อยกว่าที่ตั้งไว้" : "less than requested"} ({numSongs})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Green check */}
                  <CheckCircle2 size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
                </div>
              )}

              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontWeight: 600,
                }}
              >
                <Info size={11} />
                {language === "th"
                  ? "ตั้ง playlist เป็น Public ก่อนนะ! แล้ว กด Enter หรือปุ่ม ค้นหา"
                  : "Make sure your playlist is set to Public! Then press Enter or Search."}
              </p>
            </div>
          )}

          {/* ── Genre picker ── */}
          {!usePlaylist && (
            <div>
              {sectionTitle("🎸", language === "th" ? "เลือกแนวเพลง" : "Select Music Genres")}
              <div className="genre-grid">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => { playClickSFX(); toggleGenre(genre); }}
                    className={`genre-btn ${selectedGenres.includes(genre) ? "selected" : ""}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Settings grid ── */}
          <div style={{ borderTop: "1px solid rgba(255,107,53,0.10)", paddingTop: "16px" }}>
            {sectionTitle("⚙️", language === "th" ? "ตั้งค่าเกม" : "Game Settings")}
            <div className="setup-grid-row" style={{ borderTop: "none", paddingTop: 0, marginTop: 0, gridTemplateColumns: "1fr 1fr" }}>
              <div className="setup-option-group">
                <label className="modal-label">{translations[language].songCount}</label>
                <div className="setup-option-selector">
                  {[5, 10, 20].map((num) => {
                    const isDisabled = usePlaylist && playlistInfo !== null && playlistInfo.trackCount < num;
                    return (
                      <button
                        key={num}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          playClickSFX();
                          setNumSongs(num);
                        }}
                        className={`setup-option-btn ${numSongs === num ? "selected" : ""}`}
                        style={isDisabled ? {
                          opacity: 0.35,
                          cursor: "not-allowed",
                          background: "rgba(0, 0, 0, 0.08)",
                          color: "var(--text-muted)",
                          border: "1px dashed rgba(0,0,0,0.12)",
                          boxShadow: "none"
                        } : {}}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setup-option-group">
                <label className="modal-label">{translations[language].ansDuration}</label>
                <div className="setup-option-selector">
                  {[5, 10, 15, 20].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => { playClickSFX(); setAnswerDuration(sec); }}
                      className={`setup-option-btn ${answerDuration === sec ? "selected" : ""}`}
                    >
                      {sec}{language === "th" ? "วิ" : "s"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn btn-primary ripple"
            style={{ fontSize: "1rem", padding: "15px 24px" }}
          >
            <Play size={20} fill="currentColor" />
            {translations[language].startGame}
          </button>
        </div>
      </div>
    </div>
  );
}
export default SinglePlayerSetup;

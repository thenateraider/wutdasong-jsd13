import { useState, useEffect, useRef } from "react";
import { GameSettings, useGameStore } from "../store/gameStore";
import { ArrowLeft, Play, Info, Loader2, Music2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { translations } from "../utils/translations";

interface SinglePlayerSetupProps {
  onBack: () => void;
  onStart: (settings: GameSettings) => void;
  playClickSFX: () => void;
}

export function SinglePlayerSetup({ onBack, onStart, playClickSFX }: SinglePlayerSetupProps) {
  const { language, presetPlaylists, selectedPlaylistInfo, setSelectedPlaylist } = useGameStore();
  const [numSongs, setNumSongs] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<"Easy" | "Hard">("Easy");
  const clipDuration = 5;

  const [useCustomPlaylist, setUseCustomPlaylist] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUrl, setTempSelectedUrl] = useState<string>("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    // Clear and reset to default preset on mount
    setCustomUrl("");
    setCustomError(null);
    const defaultPl = presetPlaylists.find((p) => p.isDefault) || presetPlaylists[0];
    if (defaultPl) {
      setSelectedPlaylist(defaultPl.url);
    }
  }, []);

  // Auto-detect Spotify URL on paste
  const lastAutoUrl = useRef("");
  useEffect(() => {
    const trimmed = customUrl.trim();
    if (!trimmed.toLowerCase().includes("spotify") || customLoading || trimmed.length < 20) return;
    if (lastAutoUrl.current === trimmed) return;
    const timer = setTimeout(() => {
      lastAutoUrl.current = trimmed;
      handleCustomUrlSearch();
    }, 800);
    return () => clearTimeout(timer);
  }, [customUrl, customLoading]);

  const handleCustomUrlSearch = async () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;

    if (!trimmed.toLowerCase().includes("spotify")) {
      setCustomError(language === "th" ? "กรุณาใส่ลิงก์ Spotify Playlist ที่ถูกต้อง" : "Please enter a valid Spotify Playlist URL");
      return;
    }

    setCustomLoading(true);
    setCustomError(null);
    try {
      await setSelectedPlaylist(trimmed);
    } catch (err) {
      setCustomError(language === "th" ? "ดึงข้อมูลล้มเหลว กรุณาตรวจสอบว่าเพลย์ลิสต์เป็น Public" : "Failed to fetch playlist. Make sure it is public.");
    } finally {
      setCustomLoading(false);
    }
  };

  const handleStart = () => {
    const activeUrl = useCustomPlaylist
      ? (customUrl.trim() || selectedPlaylistInfo?.url || "")
      : (selectedPlaylistInfo?.url || (presetPlaylists.find((p) => p.isDefault)?.url || ""));

    const settings: GameSettings = {
      numSongs,
      answerDuration: difficulty === "Easy" ? 10 : 5,
      clipDuration,
      genres: [],
      difficulty,
      playlistUrl: activeUrl || undefined,
    };
    onStart(settings);
  };

  const sectionHeader = (emoji: string, text: string) => (
    <div className="section-header">
      <span className="section-emoji">{emoji}</span>
      <span className="section-label">{text}</span>
    </div>
  );

  const canStart = useCustomPlaylist
    ? (!customLoading && customUrl.trim() !== "" && selectedPlaylistInfo !== null && selectedPlaylistInfo.trackCount >= 5)
    : (!customLoading && selectedPlaylistInfo !== null && selectedPlaylistInfo.trackCount >= 5);

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

        {/* Scrollable Setup Options Container */}
        <div style={{
          maxHeight: "55vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          paddingRight: "6px"
        }}>

          {/* ── Source Toggle Card ── */}
          <div className="setup-section-card">
            {sectionHeader("🎵", language === "th" ? "แหล่งเพลง" : "Music Source")}
            <div className="toggle-row" style={{ marginBottom: 0 }}>
              <div>
                <h4 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.90rem", color: "var(--text-dark)" }}>
                  {language === "th" ? "ใส่ลิงก์เพลย์ลิสต์เอง" : "Enter playlist link manually"}
                </h4>
                <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {language === "th" ? "สลับเพื่อระบุลิงก์ Spotify Playlist ส่วนตัวของคุณ" : "Switch to paste your custom Spotify Playlist URL"}
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={useCustomPlaylist}
                  onChange={(e) => {
                    playClickSFX();
                    setUseCustomPlaylist(e.target.checked);
                    if (!e.target.checked) {
                      setCustomUrl("");
                      setCustomError(null);
                      const defaultPl = presetPlaylists.find((p) => p.isDefault) || presetPlaylists[0];
                      if (defaultPl) {
                        setSelectedPlaylist(defaultPl.url);
                      }
                    }
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* ── Selected Playlist (Seeded Presets Mode) ── */}
          {!useCustomPlaylist && (
            <div className="setup-section-card">
              {sectionHeader("🎧", language === "th" ? "หมวดเพลงที่เลือกอยู่" : "Selected Music Category")}

              {selectedPlaylistInfo ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.82)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1.5px solid rgba(255, 107, 53, 0.20)",
                    borderRadius: "var(--r-xl)",
                    boxShadow: "var(--shadow-sm)",
                    marginBottom: "12px",
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
                      border: "2px solid rgba(255,255,255,0.90)",
                      boxShadow: "var(--shadow-md)",
                      background: "var(--orange-pastel)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedPlaylistInfo.imageUrl ? (
                      <img
                        src={selectedPlaylistInfo.imageUrl}
                        alt="Playlist cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Music2 size={26} style={{ color: "var(--orange-core)" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                      {selectedPlaylistInfo.name}
                    </div>
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
                      <span>{selectedPlaylistInfo.trackCount} {language === "th" ? "เพลง" : "songs"}</span>
                    </div>
                  </div>

                  <CheckCircle2 size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {language === "th" ? "ยังไม่ได้เลือกเพลย์ลิสต์" : "No playlist selected"}
                </div>
              )}

              <button
                onClick={() => {
                  playClickSFX();
                  setTempSelectedUrl(selectedPlaylistInfo?.url || (presetPlaylists[0]?.url || ""));
                  setIsModalOpen(true);
                }}
                className="btn btn-primary ripple"
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  background: "var(--grad-primary)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                🎵 {language === "th" ? "เลือกหมวดเพลง" : "Select Playlist Category"}
              </button>
            </div>
          )}

          {/* ── Custom URL Input Mode ── */}
          {useCustomPlaylist && (
            <div className="setup-section-card">
              {sectionHeader("🔗", language === "th" ? "Spotify Playlist" : "Spotify Playlist")}

              {/* Input row with X and Search buttons */}
              <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                {/* URL input */}
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    placeholder={translations[language].playlistUrlPlaceholder}
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setCustomError(null);
                    }}
                    className="input-text"
                    style={{
                      paddingRight: customUrl ? "38px" : "14px",
                      width: "100%",
                      fontSize: "0.85rem",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customUrl.toLowerCase().includes("spotify")) {
                        handleCustomUrlSearch();
                      }
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
                    {customLoading && (
                      <Loader2
                        size={15}
                        style={{
                          color: "var(--orange-core)",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                    {!customLoading && selectedPlaylistInfo && customUrl.trim() && (
                      <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                    )}
                    {!customLoading && customError && (
                      <AlertCircle size={15} style={{ color: "var(--error)" }} />
                    )}
                  </div>
                </div>

                {/* Clear (X) button */}
                {customUrl && (
                  <button
                    onClick={() => {
                      playClickSFX();
                      setCustomUrl("");
                      setCustomError(null);
                      setSelectedPlaylist("");
                    }}
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
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Search button */}
                <button
                  onClick={() => {
                    playClickSFX();
                    handleCustomUrlSearch();
                  }}
                  disabled={!customUrl.toLowerCase().includes("spotify") || customLoading}
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
                    background: customUrl.toLowerCase().includes("spotify") && !customLoading
                      ? "var(--grad-primary)"
                      : "rgba(0,0,0,0.08)",
                    color: customUrl.toLowerCase().includes("spotify") && !customLoading ? "#fff" : "var(--text-muted)",
                    cursor: customUrl.toLowerCase().includes("spotify") && !customLoading ? "pointer" : "not-allowed",
                    fontSize: "0.80rem",
                    fontWeight: 700,
                    transition: "var(--t-fast)",
                    boxShadow: customUrl.toLowerCase().includes("spotify") && !customLoading
                      ? "0 4px 14px rgba(255,107,53,0.35)"
                      : "none",
                  }}
                >
                  {customLoading ? (
                    <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <span>🔍</span>
                  )}
                  {language === "th" ? "ค้นหา" : "Search"}
                </button>
              </div>

              {/* Error */}
              {customError && (
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
                    marginTop: "10px",
                    animation: "slideUpFade 0.22s var(--ease-spring) forwards",
                  }}
                >
                  <AlertCircle size={14} style={{ marginTop: "1px", flexShrink: 0 }} />
                  {customError}
                </div>
              )}

              {/* Playlist Preview Card */}
              {selectedPlaylistInfo && !customError && !customLoading && customUrl.trim() && (
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
                    marginTop: "12px",
                    animation: "springPop 0.32s var(--ease-spring) forwards",
                  }}
                >
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
                    {selectedPlaylistInfo.imageUrl ? (
                      <img
                        src={selectedPlaylistInfo.imageUrl}
                        alt="Playlist cover"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Music2 size={26} style={{ color: "var(--orange-core)" }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
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
                      {selectedPlaylistInfo.name}
                    </div>
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
                      <span>{selectedPlaylistInfo.trackCount} {language === "th" ? "เพลง" : "songs"}</span>
                    </div>
                  </div>

                  {/* Green check */}
                  <CheckCircle2 size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
                </div>
              )}

              <p style={{ fontSize: "0.70rem", color: "var(--text-muted)", marginTop: "10px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                <Info size={11} />
                {language === "th"
                  ? "ตั้ง playlist เป็น Public ก่อนนะ! แล้ว กดค้นหา"
                  : "Make sure your playlist is set to Public! Then click Search."}
              </p>
            </div>
          )}

          {/* ── Settings grid ── */}
          <div className="setup-section-card">
            {sectionHeader("⚙️", language === "th" ? "ตั้งค่าเกม" : "Game Settings")}
            <div className="setup-grid-row" style={{ borderTop: "none", paddingTop: 0, marginTop: 0, gridTemplateColumns: "1fr 1fr" }}>
              <div className="setup-option-group">
                <label className="modal-label">{translations[language].songCount}</label>
                <div className="setup-option-selector">
                  {[5, 10, 20].map((num) => {
                    const isDisabled = selectedPlaylistInfo !== null && selectedPlaylistInfo.trackCount < num;
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
                <label className="modal-label">{language === "th" ? "ความยาก" : "Difficulty"}</label>
                <div className="setup-option-selector">
                  {(["Easy", "Hard"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => { playClickSFX(); setDifficulty(d); }}
                      className={`setup-option-btn ${difficulty === d ? "selected" : ""}`}
                    >
                      {d === "Easy"
                        ? (language === "th" ? "ง่าย (10 วินาที)" : "Easy (10s)")
                        : (language === "th" ? "ยาก (5 วินาที)" : "Hard (5s)")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button Card Below */}
      <div className="card" style={{ padding: "16px 20px", marginTop: "12px", border: "1.5px solid rgba(255, 107, 53, 0.25)" }}>
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="btn btn-primary ripple"
          style={{ fontSize: "1rem", padding: "14px 24px" }}
        >
          <Play size={20} fill="currentColor" />
          {translations[language].startGame}
        </button>
      </div>

      {/* Playlist Selector Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            className="card animate-popup-bounce"
            style={{
              width: "90%",
              maxWidth: "460px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "rgba(255, 255, 255, 0.95)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>🎵</span>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, color: "var(--text-dark)" }}>
                  {language === "th" ? "เลือกหมวดเพลง" : "Select Playlist Category"}
                </h3>
              </div>
              <button
                onClick={() => {
                  playClickSFX();
                  setIsModalOpen(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Carousel Gallery */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                padding: "4px 2px 8px",
                maxHeight: "none",
              }}
            >
              {presetPlaylists.map((pl) => {
                const isSelected = tempSelectedUrl === pl.url;
                return (
                  <div
                    key={pl.url}
                    onClick={() => {
                      playClickSFX();
                      setTempSelectedUrl(pl.url);
                    }}
                    style={{
                      flex: "0 0 130px",
                      scrollSnapAlign: "start",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid var(--orange-core)" : "1.5px solid rgba(255, 107, 53, 0.12)",
                      background: isSelected ? "rgba(255, 107, 53, 0.08)" : "rgba(255, 255, 255, 0.60)",
                      cursor: "pointer",
                      transition: "var(--t-fast)",
                      transform: isSelected ? "scale(1.03)" : "scale(1)",
                      boxShadow: isSelected ? "0 4px 16px rgba(255,107,53,0.25)" : "none",
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1.5px solid rgba(255,255,255,0.90)",
                        background: "var(--orange-pastel)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {pl.imageUrl ? (
                        <img src={pl.imageUrl} alt={pl.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <Music2 size={24} style={{ color: "var(--orange-core)" }} />
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ width: "100%", textAlign: "center", minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pl.name}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {pl.trackCount} {language === "th" ? "เพลง" : "songs"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => {
                  playClickSFX();
                  setIsModalOpen(false);
                }}
                className="btn ripple"
                style={{
                  flex: 1,
                  background: "rgba(0, 0, 0, 0.05)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  color: "var(--text-muted)",
                  padding: "10px",
                  borderRadius: "12px",
                  fontWeight: 800,
                }}
              >
                {language === "th" ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  playClickSFX();
                  setSelectedPlaylist(tempSelectedUrl);
                  setCustomUrl("");
                  setCustomError(null);
                  setIsModalOpen(false);
                }}
                className="btn btn-primary ripple"
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "12px",
                  fontWeight: 800,
                }}
              >
                {language === "th" ? "ยืนยันการเลือก" : "Confirm Selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SinglePlayerSetup;

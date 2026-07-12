import { useState, useEffect, useRef } from "react";
import { useGameStore, GameSettings } from "../store/gameStore";
import { ArrowLeft, Play, Copy, Send, Check, User, Lock, X, Music2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { translations } from "../utils/translations";

interface MultiplayerLobbyProps {
  onBack: () => void;
}

export function MultiplayerLobby({ onBack }: MultiplayerLobbyProps) {
  const {
    roomCode,
    roomName,
    isHost,
    players,
    settings,
    chatMessages,
    playerName,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    updateSettings,
    sendMessage,
    startGame,
    language,
    presetPlaylists,
    selectedPlaylistInfo,
    setSelectedPlaylist,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<"join" | "create">("join");

  // Lobby creation forms
  const [newRoomName, setNewRoomName] = useState(`${playerName || "Host"}'s Lobby`);
  const [usePassword, setUsePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [numSongs, setNumSongs] = useState(10);
  const [difficulty, setDifficulty] = useState<"Easy" | "Hard">("Easy");
  const answerDuration = difficulty === "Easy" ? 10 : 5;

  const [useCustomPlaylist, setUseCustomPlaylist] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUrl, setTempSelectedUrl] = useState<string>("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Join Room forms
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Chat forms
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    // Reset custom playlist state on mount or activeTab switch
    setCustomUrl("");
    setCustomError(null);
    const defaultPl = presetPlaylists.find((p) => p.isDefault) || presetPlaylists[0];
    if (defaultPl) {
      setSelectedPlaylist(defaultPl.url);
    }
  }, [activeTab]);

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

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleCreate = () => {
    const activeUrl = useCustomPlaylist
      ? (customUrl.trim() || selectedPlaylistInfo?.url || "")
      : (selectedPlaylistInfo?.url || (presetPlaylists.find((p) => p.isDefault)?.url || ""));

    const gameSettings: GameSettings = {
      numSongs,
      answerDuration,
      clipDuration: 5,
      genres: [],
      difficulty,
      playlistUrl: activeUrl || undefined,
    };
    updateSettings(gameSettings);
    createRoom(newRoomName, usePassword && newPassword ? newPassword : undefined, maxPlayers);
  };

  const handleJoin = async (passwordOverride?: string) => {
    if (!joinCodeInput.trim()) return;
    setJoinError(null);
    const res = await joinRoom(
      joinCodeInput.trim().toUpperCase(),
      passwordOverride || undefined
    );
    if (!res.success) {
      if (res.error === "Password required." || res.error === "Incorrect password.") {
        setShowPasswordModal(true);
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!joinPasswordInput.trim()) {
      setJoinError(language === "th" ? "กรุณาใส่รหัสผ่าน" : "Please enter a password");
      return;
    }
    const res = await joinRoom(
      joinCodeInput.trim().toUpperCase(),
      joinPasswordInput
    );
    if (!res.success) {
      setJoinError(res.error || (language === "th" ? "รหัสผ่านไม่ถูกต้อง" : "Incorrect password"));
    } else {
      setShowPasswordModal(false);
      setJoinPasswordInput("");
    }
  };

  const sectionHeader = (emoji: string, text: string) => (
    <div className="section-header">
      <span className="section-emoji">{emoji}</span>
      <span className="section-label">{text}</span>
    </div>
  );

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const canCreate = useCustomPlaylist
    ? (!customLoading && customUrl.trim() !== "" && selectedPlaylistInfo !== null && selectedPlaylistInfo.trackCount >= 5)
    : (!customLoading && selectedPlaylistInfo !== null && selectedPlaylistInfo.trackCount >= 5);

  // If NOT in a room, show the Join/Create lobby panels
  if (!roomCode) {
    return (
      <div className="page-container" style={{ maxWidth: "520px", maxHeight: "95vh", overflowY: "auto", paddingRight: "6px" }}>
        <div style={{ width: "100%", textAlign: "left" }}>
          <button onClick={onBack} className="back-link">
            <ArrowLeft size={18} />
            {translations[language].backBtn}
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Tabs header */}
          <div className="lobby-tab-header">
            <button
              onClick={() => setActiveTab("join")}
              className={`lobby-tab-btn ${activeTab === "join" ? "active" : ""}`}
            >
              {translations[language].joinRoom}
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`lobby-tab-btn ${activeTab === "create" ? "active" : ""}`}
            >
              {translations[language].createRoom}
            </button>
          </div>

          {/* Forms body */}
          <div className="lobby-form-container">
            {activeTab === "join" ? (
              /* JOIN ROOM FORM */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="setup-section-card">
                  {sectionHeader("🔑", language === "th" ? "รหัสห้อง" : "Room Code")}
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder={language === "th" ? "กรอกรหัสห้อง 6 หลัก" : "ENTER 6-DIGIT CODE"}
                    className="input-text"
                    style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && joinCodeInput.trim()) handleJoin();
                    }}
                  />
                </div>

                <button
                  onClick={() => handleJoin()}
                  disabled={!joinCodeInput.trim()}
                  className="btn btn-primary ripple"
                >
                  {translations[language].joinRoom}
                </button>
              </div>
            ) : (
              /* CREATE ROOM FORM */
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>

                {/* Room Info Card */}
                <div className="setup-section-card">
                  {sectionHeader("🏠", language === "th" ? "ข้อมูลห้อง" : "Room Info")}
                  <div>
                    <label className="modal-label">{language === "th" ? "ชื่อห้อง" : "Room Name"}</label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder={language === "th" ? "ชื่อห้อง..." : "Lobby Name"}
                      className="input-text"
                    />
                  </div>

                  {/* Password Toggle */}
                  <div className="toggle-row" style={{ margin: 0, padding: "12px" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Lock size={14} /> {language === "th" ? "ตั้งรหัสผ่านห้อง" : "Room Password"}
                      </h4>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {language === "th" ? "เปิดเพื่อตั้งรหัสเข้าห้อง" : "Enable to set a room password"}
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={usePassword}
                        onChange={(e) => {
                          setUsePassword(e.target.checked);
                          if (!e.target.checked) setNewPassword("");
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  {usePassword && (
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={language === "th" ? "ตั้งรหัสผ่านห้อง" : "Set room password"}
                      className="input-text"
                      style={{ animation: "slideUpFade 0.2s var(--ease-spring) forwards" }}
                    />
                  )}
                </div>

                {/* Source Toggle Card */}
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

                {/* Preset Playlist Selection Card */}
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

                {/* Custom URL Section */}
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

                    {/* Custom Preview Card */}
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

                        <CheckCircle2 size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Game Settings Card */}
                <div className="setup-section-card">
                  {sectionHeader("⚙️", language === "th" ? "ตั้งค่าเกม" : "Game Settings")}
                  <div className="setup-grid-row" style={{ borderTop: "none", paddingTop: 0, marginTop: 0, gridTemplateColumns: "1fr 1fr" }}>
                    <div className="setup-option-group">
                      <label className="modal-label">{translations[language].songCount}</label>
                      <div className="setup-option-selector">
                        {[5, 10, 20].map((n) => (
                          <button key={n} onClick={() => setNumSongs(n)} className={`setup-option-btn ${numSongs === n ? "selected" : ""}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="setup-option-group">
                      <label className="modal-label">{language === "th" ? "ความยาก" : "Difficulty"}</label>
                      <div className="setup-option-selector">
                        {(["Easy", "Hard"] as const).map((d) => (
                          <button key={d} onClick={() => setDifficulty(d)} className={`setup-option-btn ${difficulty === d ? "selected" : ""}`}>
                            {d === "Easy"
                              ? (language === "th" ? "ง่าย (10 วินาที)" : "Easy (10s)")
                              : (language === "th" ? "ยาก (5 วินาที)" : "Hard (5s)")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="setup-option-group">
                      <label className="modal-label">{language === "th" ? "ผู้เล่นสูงสุด" : "Max Players"}</label>
                      <div className="setup-option-selector">
                        {[4, 8, 16, 32, 64].map((p) => (
                          <button key={p} onClick={() => setMaxPlayers(p)} className={`setup-option-btn ${maxPlayers === p ? "selected" : ""}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className="btn btn-primary ripple"
                  style={{ marginTop: "4px" }}
                >
                  {language === "th" ? "🎮 สร้างและเข้าร่วมห้อง" : "🎮 Create & Join Room"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Password Required Modal */}
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-popup-bounce">
              <button
                onClick={() => { setShowPasswordModal(false); setJoinPasswordInput(""); setJoinError(null); }}
                className="modal-close"
              >
                <X size={16} />
              </button>
              <h2 className="modal-title" style={{ color: "var(--orange-core)" }}>
                {language === "th" ? "🔒 ห้องนี้มีรหัสผ่าน" : "🔒 Password Required"}
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                {language === "th"
                  ? `ห้อง ${joinCodeInput.toUpperCase()} ต้องใส่รหัสผ่านเพื่อเข้าร่วม`
                  : `Room ${joinCodeInput.toUpperCase()} requires a password to join`}
              </p>
              <input
                type="password"
                value={joinPasswordInput}
                onChange={(e) => { setJoinPasswordInput(e.target.value); setJoinError(null); }}
                placeholder={language === "th" ? "ใส่รหัสผ่านห้อง" : "Enter room password"}
                className="input-text"
                style={{ marginBottom: "12px" }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
                autoFocus
              />
              {joinError && (
                <p style={{ fontSize: "0.78rem", color: "var(--error)", fontWeight: 600, marginBottom: "8px" }}>
                  ❌ {joinError}
                </p>
              )}
              <button
                onClick={handlePasswordSubmit}
                className="btn btn-primary ripple"
                disabled={!joinPasswordInput.trim()}
              >
                {language === "th" ? "เข้าร่วมห้อง" : "Join Room"}
              </button>
            </div>
          </div>
        )}

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
                width: "95%",
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

              {/* Scrollable list */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "320px",
                  overflowY: "auto",
                  paddingRight: "6px"
                }}
              >
                {presetPlaylists.map((pl) => {
                  const isSelected = tempSelectedUrl === pl.url;
                  return (
                    <div
                      key={pl.url}
                      onClick={() => {
                        setTempSelectedUrl(pl.url);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        borderRadius: "14px",
                        border: isSelected ? "2px solid var(--orange-core)" : "1.5px solid rgba(255, 107, 53, 0.12)",
                        background: isSelected ? "rgba(255, 107, 53, 0.08)" : "rgba(255, 255, 255, 0.60)",
                        cursor: "pointer",
                        transition: "var(--t-fast)",
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "10px",
                          overflow: "hidden",
                          flexShrink: 0,
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
                          <Music2 size={20} style={{ color: "var(--orange-core)" }} />
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {pl.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                          {pl.trackCount} {language === "th" ? "เพลง" : "songs"}
                        </div>
                      </div>

                      {/* Radio Button */}
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: "2px solid var(--orange-core)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        {isSelected && (
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--orange-core)" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Buttons */}
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button
                  onClick={() => {
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

  // If inside a room lobby, show the Lobby screen
  return (
    <div className="lobby-room-root">
      {/* Header Room Info */}
      <div className="lobby-room-header">
        <div>
          <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }}>Multiplayer Lobby</span>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 0 0" }}>
            {roomName}
            {newPassword && <Lock size={16} style={{ color: "var(--text-muted)" }} />}
          </h2>
        </div>

        <div className="lobby-room-code-card">
          <div style={{ marginRight: "16px" }}>
            <div className="lobby-room-code-title">Room Code</div>
            <div className="lobby-room-code-val">{roomCode}</div>
          </div>
          <button onClick={handleCopyCode} className="btn-icon-only" style={{ padding: "8px 12px" }}>
            {copied ? <Check size={18} style={{ color: "var(--success)" }} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="lobby-room-scroll">
        {/* Settings Summary */}
        <div className="lobby-room-summary">
          <h4 style={{ fontWeight: "800", fontSize: "0.85rem", color: "var(--text-main)" }}>Room Settings Summary</h4>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {settings.playlistUrl ? "Spotify Custom Playlist" : `Genres: ${settings.genres.join(", ")}`} • {settings.numSongs} rounds • {settings.difficulty} ({settings.answerDuration}s)
          </p>
        </div>

        <div className="lobby-layout-grid">
          {/* Players Section */}
          <div>
            <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", margin: 0 }}>
                <User size={18} style={{ color: "var(--primary)" }} /> Players ({players.length})
              </h3>

              <div className="lobby-players-list">
                {players.map((p) => {
                  const isHostPlayer = p.id === players[0]?.id;
                  const isMe = p.id === useGameStore.getState().socket?.id;

                  return (
                    <div key={p.id} className={`lobby-player-card ${isMe ? "is-me" : ""}`}>
                      <div className="lobby-player-info">
                        <span className="lobby-player-avatar">{p.avatar}</span>
                        <div>
                          <div className="lobby-player-name">
                            {p.name}
                            {isHostPlayer && <span style={{ color: "#F59E0B" }} title="Lobby Host">👑</span>}
                            {isMe && <span style={{ fontSize: "0.65rem", padding: "2px 6px", backgroundColor: "var(--primary)", color: "white", borderRadius: "4px" }}>Me</span>}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "600" }}>Connected</div>
                        </div>
                      </div>

                      <div>
                        {p.isReady ? (
                          <span className="lobby-player-status ready">Ready</span>
                        ) : (
                          <span className="lobby-player-status waiting">Waiting</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Chat Section */}
          <div>
            <div className="lobby-chat-box">
              <h3 style={{ fontSize: "1rem", fontWeight: "800", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "10px" }}>Chat Room</h3>

              <div className="lobby-chat-messages">
                {chatMessages.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    No messages yet. Say hello!
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isSystem = msg.sender === "System";
                    const isMe = msg.sender === playerName;
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isSystem ? "center" : (isMe ? "flex-end" : "flex-start"), width: "100%" }}>
                        {isSystem ? (
                          <div className="chat-message-system">{msg.text}</div>
                        ) : (
                          <>
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px", padding: "0 4px" }}>{msg.sender}</span>
                            <div className={`chat-message-bubble ${isMe ? "me" : "other"}`}>{msg.text}</div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="chat-send-form">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="input-text" style={{ padding: "10px 14px", fontSize: "0.85rem" }} />
                <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px", borderRadius: "12px", width: "auto" }}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="lobby-room-footer">
        <button onClick={leaveRoom} className="btn btn-secondary ripple" style={{ flex: 1, padding: "12px 20px", fontSize: "0.9rem" }}>
          Leave Lobby
        </button>

        {isHost ? (
          <button
            onClick={startGame}
            disabled={(players.length < 2 && !(import.meta as any).env.DEV) || !players.every(p => p.id === players[0].id || p.isReady)}
            className="btn btn-primary ripple"
            style={{ flex: 1, padding: "12px 20px", fontSize: "0.9rem" }}
          >
            <Play size={14} fill="currentColor" />
            {players.every(p => p.id === players[0].id || p.isReady)
              ? (language === "th" ? "เริ่มเกม" : "Start Game")
              : (language === "th" ? "รอทุกคนพร้อม..." : "Waiting for ready...")
            }
          </button>
        ) : (
          <button
            onClick={toggleReady}
            className={`btn ripple ${players.find((p) => p.id === useGameStore.getState().socket?.id)?.isReady ? "btn-ready-true" : "btn-secondary"}`}
            style={{ flex: 1, padding: "12px 20px", fontSize: "0.9rem" }}
          >
            {players.find((p) => p.id === useGameStore.getState().socket?.id)?.isReady ? "Ready!" : "Ready up"}
          </button>
        )}
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
              width: "95%",
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

            {/* Scrollable list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: "320px",
                overflowY: "auto",
                paddingRight: "6px"
              }}
            >
              {presetPlaylists.map((pl) => {
                const isSelected = tempSelectedUrl === pl.url;
                return (
                  <div
                    key={pl.url}
                    onClick={() => {
                      setTempSelectedUrl(pl.url);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid var(--orange-core)" : "1.5px solid rgba(255, 107, 53, 0.12)",
                      background: isSelected ? "rgba(255, 107, 53, 0.08)" : "rgba(255, 255, 255, 0.60)",
                      cursor: "pointer",
                      transition: "var(--t-fast)",
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "10px",
                        overflow: "hidden",
                        flexShrink: 0,
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
                        <Music2 size={20} style={{ color: "var(--orange-core)" }} />
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pl.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {pl.trackCount} {language === "th" ? "เพลง" : "songs"}
                      </div>
                    </div>

                    {/* Radio Button */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "2px solid var(--orange-core)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {isSelected && (
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--orange-core)" }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => {
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
export default MultiplayerLobby;

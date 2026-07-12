import { useState, useEffect, useRef } from "react";
import { useGameStore, GameSettings } from "../store/gameStore";
import { ArrowLeft, Play, Copy, Send, Check, User, Lock, Link as LinkIcon, X } from "lucide-react";
import { translations } from "../utils/translations";

interface MultiplayerLobbyProps {
  onBack: () => void;
}

const GENRES = ["Pop", "Rock", "Anime", "Thai", "K-pop", "Game", "Movie"];

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
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  
  // Lobby creation forms
  const [newRoomName, setNewRoomName] = useState(`${playerName || "Host"}'s Lobby`);
  const [usePassword, setUsePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [numSongs, setNumSongs] = useState(10);
  const [answerDuration, setAnswerDuration] = useState(10);
  const [clipDuration, setClipDuration] = useState(5);
  const [difficulty] = useState<"Easy" | "Normal" | "Hard">("Normal");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(["Pop"]);
  const [usePlaylist, setUsePlaylist] = useState<boolean>(false);
  const [playlistUrl, setPlaylistUrl] = useState<string>("");

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

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = () => {
    const gameSettings: GameSettings = {
      numSongs,
      answerDuration,
      clipDuration,
      genres: usePlaylist ? [] : selectedGenres,
      difficulty,
      playlistUrl: usePlaylist && playlistUrl.trim() ? playlistUrl.trim() : undefined,
    };
    updateSettings(gameSettings);
    createRoom(newRoomName, usePassword && newPassword ? newPassword : undefined, maxPlayers);
  };

  const handleJoin = async (passwordOverride?: string) => {
    if (!joinCodeInput.trim()) return;
    setJoinError(null);
    const success = await joinRoom(
      joinCodeInput.trim().toUpperCase(),
      passwordOverride || undefined
    );
    if (!success) {
      // If failed, it might be a password-protected room
      // Show password modal so user can enter the password
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!joinPasswordInput.trim()) {
      setJoinError(language === "th" ? "กรุณาใส่รหัสผ่าน" : "Please enter a password");
      return;
    }
    const success = await joinRoom(
      joinCodeInput.trim().toUpperCase(),
      joinPasswordInput
    );
    if (!success) {
      setJoinError(language === "th" ? "รหัสผ่านไม่ถูกต้อง" : "Incorrect password");
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

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre));
      }
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // If NOT in a room, show the Join/Create lobby panels
  if (!roomCode) {
    return (
      <div className="page-container" style={{ maxWidth: "520px" }}>
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

                {/* Music Source Card */}
                <div className="setup-section-card">
                  {sectionHeader("🎵", language === "th" ? "แหล่งเพลง" : "Music Source")}
                  <div className="toggle-row" style={{ margin: 0, padding: "12px" }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: "0.85rem" }}>Spotify Playlist</h4>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {language === "th" ? "เล่นจากเพลย์ลิสต์ Spotify" : "Play with custom Spotify playlist"}
                      </p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={usePlaylist}
                        onChange={(e) => setUsePlaylist(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {usePlaylist ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label className="modal-label" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <LinkIcon size={12} /> {language === "th" ? "ลิงก์เพลย์ลิสต์" : "Playlist Link"}
                      </label>
                      <input
                        type="text"
                        placeholder="https://open.spotify.com/playlist/..."
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        className="input-text"
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label className="modal-label">{language === "th" ? "เลือกแนวเพลง" : "Genres"}</label>
                      <div className="genre-grid">
                        {GENRES.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`genre-btn ${selectedGenres.includes(genre) ? "selected" : ""}`}
                            style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
                      <label className="modal-label">{translations[language].ansDuration}</label>
                      <div className="setup-option-selector">
                        {[5, 10, 15, 20].map((s) => (
                          <button key={s} onClick={() => setAnswerDuration(s)} className={`setup-option-btn ${answerDuration === s ? "selected" : ""}`}>
                            {s}{language === "th" ? "วิ" : "s"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="setup-option-group">
                      <label className="modal-label">{language === "th" ? "ความยาวคลิป" : "Audio Length"}</label>
                      <div className="setup-option-selector">
                        {[3, 5, 8, 10].map((c) => (
                          <button key={c} onClick={() => setClipDuration(c)} className={`setup-option-btn ${clipDuration === c ? "selected" : ""}`}>
                            {c}{language === "th" ? "วิ" : "s"}
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
                  disabled={usePlaylist && !playlistUrl.trim()}
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
      </div>
    );
  }

  // If inside a room lobby, show the Lobby screen
  return (
    <div className="page-container" style={{ maxWidth: "960px", justifyContent: "flex-start" }}>
      {/* Header Room Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", paddingBottom: "16px", borderBottom: "1px solid var(--border)", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }}>Multiplayer Lobby</span>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 0 0" }}>
            {roomName}
            {newPassword && <Lock size={16} style={{ color: "var(--text-muted)" }} />}
          </h2>
        </div>

        {/* Copyable Room Code Card */}
        <div className="lobby-room-code-card">
          <div style={{ marginRight: "16px" }}>
            <div className="lobby-room-code-title">Room Code</div>
            <div className="lobby-room-code-val">{roomCode}</div>
          </div>
          <button
            onClick={handleCopyCode}
            className="btn-icon-only"
            style={{ padding: "8px 12px" }}
          >
            {copied ? <Check size={18} style={{ color: "var(--success)" }} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div className="lobby-layout-grid">
        {/* Players Section */}
        <div>
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px", margin: 0 }}>
              <User size={18} style={{ color: "var(--primary)" }} /> Players ({players.length})
            </h3>
            
            <div className="lobby-players-list">
              {players.map((p) => {
                const isHostPlayer = p.id === players[0]?.id;
                const isMe = p.id === useGameStore.getState().socket?.id;
                
                return (
                  <div
                    key={p.id}
                    className={`lobby-player-card ${isMe ? "is-me" : ""}`}
                  >
                    <div className="lobby-player-info">
                      <span className="lobby-player-avatar">
                        {p.avatar}
                      </span>
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
                        <span className="lobby-player-status ready">
                          Ready
                        </span>
                      ) : (
                        <span className="lobby-player-status waiting">
                          Waiting
                        </span>
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
            <h3 style={{ fontSize: "1rem", fontWeight: "800", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>Chat Room</h3>
            
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
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isSystem ? "center" : (isMe ? "flex-end" : "flex-start"),
                        width: "100%"
                      }}
                    >
                      {isSystem ? (
                        <div className="chat-message-system">
                          {msg.text}
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px", padding: "0 4px" }}>{msg.sender}</span>
                          <div className={`chat-message-bubble ${isMe ? "me" : "other"}`}>
                            {msg.text}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="chat-send-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="input-text"
                style={{ padding: "10px 14px", fontSize: "0.85rem" }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "10px 16px", borderRadius: "12px", width: "auto" }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lobby Options Settings & Actions Footer */}
      <div className="lobby-settings-summary-footer">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h4 style={{ fontWeight: "800", fontSize: "0.9rem", color: "var(--text-main)" }}>Room Settings Summary</h4>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {settings.playlistUrl ? "Spotify Custom Playlist" : `Genres: ${settings.genres.join(", ")}`} • {settings.numSongs} rounds • {settings.answerDuration}s guess time • {settings.clipDuration}s audio length • {settings.difficulty}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "340px" }}>
          <button
            onClick={leaveRoom}
            className="btn btn-secondary ripple"
            style={{ flex: 1, padding: "12px 20px", fontSize: "0.9rem" }}
          >
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
              className="btn ripple"
              style={{
                flex: 1,
                padding: "12px 20px",
                fontSize: "0.9rem",
                backgroundColor: players.find((p) => p.id === useGameStore.getState().socket?.id)?.isReady ? "var(--success)" : "var(--primary)",
                color: "white"
              }}
            >
              {players.find((p) => p.id === useGameStore.getState().socket?.id)?.isReady
                ? "Ready!"
                : "Ready up"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default MultiplayerLobby;

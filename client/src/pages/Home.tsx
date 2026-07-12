import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { X, Dices } from "lucide-react";
import { translations } from "../utils/translations";
import axios from "axios";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:5000";

const TH_ANIMALS = ["แมว", "หมา", "ช้าง", "เสือ", "สิงโต", "หมี", "ลิง", "กระต่าย", "หนู", "นก", "หมู", "ไก่", "เป็ด", "เต่า", "ม้า", "วัว", "แกะ", "แพะ", "กบ", "ปลา", "แพนด้า", "โคอาล่า", "สุนัขจิ้งจอก", "นกฮูก"];
const EN_ANIMALS = ["Cat", "Dog", "Elephant", "Tiger", "Lion", "Bear", "Monkey", "Rabbit", "Mouse", "Bird", "Pig", "Chicken", "Duck", "Turtle", "Horse", "Cow", "Sheep", "Goat", "Frog", "Fish", "Panda", "Koala", "Fox", "Owl"];

const generateRandomName = (lang: "th" | "en") => {
  const list = lang === "th" ? TH_ANIMALS : EN_ANIMALS;
  const animal = list[Math.floor(Math.random() * list.length)];
  const num = Math.floor(Math.random() * 900) + 100; // 100 - 999
  return `${animal}${num}`;
};

const formatDate = (dateStr: string, lang: "th" | "en") => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(lang === "th" ? "th-TH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch (e) {
    return "";
  }
};

interface HomeProps {
  onStartSingle: () => void;
  onGoToMultiplayer: () => void;
  playClickSFX: () => void;
}

const AVATARS = ["🎧", "🎤", "🎸", "🎹", "🥁", "🎶", "🕺", "💃", "🦊", "🐱", "🐶", "🌟", "👾", "🍓", "🌈"];

export function Home({
  onStartSingle,
  onGoToMultiplayer,
  playClickSFX,
}: HomeProps) {
  const { playerName, playerAvatar, setPlayerInfo, language, leaderboard, fetchLeaderboard } = useGameStore();

  const isGuest = !playerName || playerName === "Guest Player" || playerName === "ผู้เล่นทั่วไป" || playerName.trim() === "";
  const [showForceNameModal, setShowForceNameModal] = useState(isGuest);

  const [nameInput, setNameInput] = useState(playerName || (language === "th" ? "ผู้เล่นทั่วไป" : "Guest Player"));
  const [avatarInput, setAvatarInput] = useState(playerAvatar || "🎧");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<5 | 10 | 20>(10);
  const [leaderboardPage, setLeaderboardPage] = useState(0);

  // State for Force Name Modal
  const [forceName, setForceName] = useState("");
  const [forceAvatar, setForceAvatar] = useState(playerAvatar || "🎧");
  const [forceError, setForceError] = useState<string | null>(null);
  const [forceValidating, setForceValidating] = useState(false);

  // State for Edit Profile Modal
  const [editError, setEditError] = useState<string | null>(null);
  const [editValidating, setEditValidating] = useState(false);

  // Validate Force Name
  useEffect(() => {
    if (!showForceNameModal) return;

    const trimmed = forceName.trim();
    if (!trimmed) {
      setForceError(translations[language].nameEmpty);
      return;
    }
    const regex = /^[a-zA-Z0-9\u0e00-\u0e7f]+$/;
    if (!regex.test(trimmed)) {
      setForceError(translations[language].nameInvalid);
      return;
    }

    setForceError(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        setForceValidating(true);
        const res = await axios.get(`${API_URL}/api/leaderboard/check-name`, {
          params: { name: trimmed }
        });
        if (res.data.exists) {
          setForceError(translations[language].nameTaken);
        } else {
          setForceError(null);
        }
      } catch (err) {
        console.error("Check name error", err);
      } finally {
        setForceValidating(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [forceName, showForceNameModal, language]);

  // Validate Regular Edit Name
  useEffect(() => {
    if (!isEditingProfile) return;

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setEditError(translations[language].nameEmpty);
      return;
    }
    const regex = /^[a-zA-Z0-9\u0e00-\u0e7f]+$/;
    if (!regex.test(trimmed)) {
      setEditError(translations[language].nameInvalid);
      return;
    }

    // If it's the current player name, it's valid
    if (trimmed === playerName) {
      setEditError(null);
      return;
    }

    setEditError(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        setEditValidating(true);
        const res = await axios.get(`${API_URL}/api/leaderboard/check-name`, {
          params: { name: trimmed }
        });
        if (res.data.exists) {
          setEditError(translations[language].nameTaken);
        } else {
          setEditError(null);
        }
      } catch (err) {
        console.error("Check name error", err);
      } finally {
        setEditValidating(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [nameInput, isEditingProfile, playerName, language]);

  const saveProfile = () => {
    if (nameInput.trim() && !editError && !editValidating) {
      setPlayerInfo(nameInput.trim(), avatarInput);
      setIsEditingProfile(false);
    }
  };

  return (
    <div className="page-container">
      <div className="home-content" style={{ gap: "0", width: "100%", maxWidth: "440px" }}>

        {/* ── Logo Hero ── */}
        <div className="logo-container" style={{ marginBottom: "18px" }}>
          <div className="logo-badge">🎵</div>
          <h1 className="gradient-title" style={{ fontSize: "2.4rem" }}>
            Wutdasong?
          </h1>
          <p className="home-subtitle">
            {language === "th" ? "🎶 ทายเพลงให้ได้ก่อนหมดเวลา ~" : "🎶 Guess the song before time runs out ~"}
          </p>
        </div>

        {/* ── Profile Card ── */}
        <div
          className="profile-summary animate-slide-up"
          style={{ animationDelay: "0.05s", marginBottom: "16px" }}
        >
          <div className="profile-info">
            <span className="avatar-badge">{avatarInput}</span>
            <div>
              <div className="profile-name-label">
                {language === "th" ? "✨ โปรไฟล์ของคุณ" : "✨ Your Profile"}
              </div>
              <div className="profile-name">{nameInput}</div>
            </div>
          </div>
          <button
            onClick={() => { playClickSFX(); setIsEditingProfile(true); }}
            className="btn-edit-profile"
          >
            {language === "th" ? "✏️ แก้ไข" : "✏️ Edit"}
          </button>
        </div>

        {/* ── Action Menu ── */}
        <div className="menu-container animate-slide-up" style={{ animationDelay: "0.10s" }}>
          <button
            onClick={() => { playClickSFX(); onStartSingle(); }}
            className="btn btn-primary ripple"
            style={{ fontSize: "1rem", padding: "15px 22px" }}
          >
            {translations[language].singleBtn}
          </button>

          <button
            onClick={() => { playClickSFX(); onGoToMultiplayer(); }}
            className="btn btn-secondary ripple"
          >
            {translations[language].multiBtn}
          </button>

          <div className="grid-2" style={{ marginTop: "2px" }}>
            <button
              onClick={() => {
                playClickSFX();
                setLeaderboardTab(10);
                setLeaderboardPage(0);
                fetchLeaderboard(10);
                setShowLeaderboard(true);
              }}
              className="btn btn-secondary ripple"
              style={{ padding: "11px 14px", fontSize: "0.88rem" }}
            >
              {language === "th" ? "🏆 ลีดเดอร์บอร์ด" : "🏆 Leaderboard"}
            </button>
            <button
              onClick={() => { playClickSFX(); setShowHowToPlay(true); }}
              className="btn btn-secondary ripple"
              style={{ padding: "11px 14px", fontSize: "0.88rem" }}
            >
              {language === "th" ? "📖 วิธีเล่น" : "📖 How to Play"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-content animate-popup-bounce">
            <button
              onClick={() => { playClickSFX(); setIsEditingProfile(false); }}
              className="modal-close"
            >
              <X size={16} />
            </button>
            <h2 className="modal-title">
              {language === "th" ? "✨ แก้ไขโปรไฟล์" : "✨ Edit Profile"}
            </h2>

            <div style={{ marginBottom: "18px" }}>
              <label className="modal-label">
                {language === "th" ? "🐾 เลือก Avatar" : "🐾 Choose Avatar"}
              </label>
              <div className="avatar-grid">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { playClickSFX(); setAvatarInput(emoji); }}
                    className={`avatar-option-btn ${avatarInput === emoji ? "selected" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label className="modal-label">
                {language === "th" ? "📝 ชื่อของคุณ" : "📝 Your Name"}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  maxLength={15}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input-text"
                  placeholder={translations[language].namePlaceholder}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    playClickSFX();
                    const newName = generateRandomName(language);
                    setNameInput(newName);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "48px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title={language === "th" ? "สุ่มชื่อ" : "Random Name"}
                >
                  <Dices size={20} />
                </button>
              </div>

              {/* Fallback/Validation message below the input */}
              {editError && (
                <div style={{
                  color: "#e53e3e",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  ⚠️ {editError}
                </div>
              )}
              {!editError && nameInput.trim() && !editValidating && (
                <div style={{
                  color: "#38a169",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  ✅ {language === "th" ? "ชื่อนี้สามารถใช้งานได้" : "This name is available!"}
                </div>
              )}
              {editValidating && (
                <div style={{
                  color: "var(--primary)",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500
                }}>
                  ⏳ {language === "th" ? "กำลังตรวจสอบชื่อ..." : "Validating name..."}
                </div>
              )}
            </div>

            <div className="modal-buttons-row">
              <button
                onClick={() => { playClickSFX(); setIsEditingProfile(false); }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {language === "th" ? "❌ ยกเลิก" : "❌ Cancel"}
              </button>
              <button
                onClick={() => { playClickSFX(); saveProfile(); }}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!!editError || !nameInput.trim() || editValidating}
              >
                {language === "th" ? "💾 บันทึก" : "💾 Save"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── How to Play Modal ── */}
      {showHowToPlay && (
        <div className="modal-overlay" >
          <div
            className="modal-content animate-popup-bounce"
            style={{
              maxHeight: "70vh",
              maxWidth: "480px",
              display: "flex",
              flexDirection: "column",
              paddingBottom: "20px", // เว้นระยะขอบล่างให้สวยงาม

            }}
          >
            <button
              onClick={() => { playClickSFX(); setShowHowToPlay(false); }}
              className="modal-close"
            >
              <X size={16} />
            </button>

            <h2 className="modal-title" style={{ color: "var(--orange-core)", marginBottom: "15px" }}>
              {language === "th" ? "📖 วิธีเล่น" : "📖 How to Play"}
            </h2>

            {/* ครอบเนื้อหาทั้งหมดด้วย div นี้และสั่งลื่นไหลด้วย -webkit-overflow-scrolling */}
            <div style={{
              overflowY: "auto",
              flex: 1,
              paddingRight: "6px", // กันไม่ให้ scrollbar บังเนื้อหา
              WebkitOverflowScrolling: "touch" // สำหรับ iOS ให้ scroll ลื่นๆ
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(language === "th" ? [
                  { emoji: "🎵", text: "เมื่อเริ่มรอบ จะมีเพลงสั้นๆ เล่นให้ฟัง" },
                  { emoji: "⏱️", text: "เลือกคำตอบจาก 5 ตัวเลือก ก่อนหมดเวลา!" },
                  { emoji: "⚡", text: "ตอบเร็วยิ่งได้แต้มโบนัสมาก (Time Bonus)" },
                  { emoji: "🏆", text: "เล่น Multiplayer แข่งกับเพื่อนได้แบบ Real-time!" },
                ] : [
                  { emoji: "🎵", text: "When a round starts, a short song preview will play." },
                  { emoji: "⏱️", text: "Choose the correct option out of 5 before time runs out!" },
                  { emoji: "⚡", text: "The faster you guess, the more bonus points you score!" },
                  { emoji: "🏆", text: "Compete with friends in real-time Multiplayer rooms!" },
                ]).map((step, i) => (
                  <div key={i} className="how-to-play-step" style={{ animationDelay: `${i * 0.06}s` }}>
                    <span className="step-number">{step.emoji}</span>
                    <p className="step-text">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Spotify Import Tutorial Section */}
              <div style={{ borderTop: "2px dashed rgba(255, 107, 53, 0.15)", marginTop: "20px", paddingTop: "20px" }}>
                <h3 style={{
                  fontSize: "0.95rem",
                  fontWeight: 900,
                  color: "var(--orange-core)",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  🎵 {language === "th" ? "ขั้นตอนนำเข้าเพลย์ลิสต์ Spotify" : "Spotify Playlist Import Guide"}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {[
                    {
                      th: "1. เข้าไปที่เพลย์ลิสต์ที่ต้องการ (ต้องเป็น Public Playlist ของ Spotify) และกดปุ่ม สามจุด",
                      en: "1. Go to your desired playlist (must be a Public Spotify Playlist) and click the three-dots button.",
                      img: "/assets/pl_tutorial1.jpg"
                    },
                    {
                      th: "2. กดเลือก Share / แบ่งปัน",
                      en: "2. Select Share.",
                      img: "/assets/pl_tutorial2.jpg"
                    },
                    {
                      th: "3. กด Copy Link",
                      en: "3. Click Copy Link.",
                      img: "/assets/pl_tutorial3.jpg"
                    },
                    {
                      th: "4. ในส่วนตั้งค่าเกม ให้เปิดฟังชั่น Play from Spotify playlist / เล่นจาก Spotify Playlist และวางลิงค์ที่ได้มา และสามารถสนุกกับเพลงที่คุณต้องการ",
                      en: "4. In game settings, toggle 'Play from Spotify playlist' on, paste the copied link, and enjoy your custom game!",
                      img: "/assets/pl_tutorial4.jpg"
                    }
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <p style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--text-dark)", lineHeight: 1.45 }}>
                        {language === "th" ? step.th : step.en}
                      </p>
                      <div style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "1.5px solid rgba(255, 107, 53, 0.15)",
                        boxShadow: "var(--shadow-sm)",
                        background: "rgba(255,255,255,0.4)"
                      }}>
                        <img
                          src={step.img}
                          alt={`Tutorial step ${idx + 1}`}
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div> {/* สิ้นสุดส่วน scroll box */}

          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal-content animate-popup-bounce" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column", padding: "22px 20px" }}>
            <button
              onClick={() => { playClickSFX(); setShowLeaderboard(false); }}
              className="modal-close"
            >
              <X size={16} />
            </button>
            <h2 className="modal-title" style={{ color: "var(--orange-core)", marginBottom: "12px" }}>
              {language === "th" ? "🏆 ลีดเดอร์บอร์ด" : "🏆 Leaderboard"}
            </h2>

            {/* Song Count Tab Switcher */}
            <div className="setup-option-selector" style={{ marginBottom: "16px", gridTemplateColumns: "1fr 1fr 1fr", gridAutoFlow: "unset" }}>
              {([5, 10, 20] as const).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    playClickSFX();
                    setLeaderboardTab(num);
                    setLeaderboardPage(0);
                    fetchLeaderboard(num);
                  }}
                  className={`setup-option-btn ${leaderboardTab === num ? "selected" : ""}`}
                >
                  {num} {language === "th" ? "เพลง" : "Songs"}
                </button>
              ))}
            </div>

            {/* Podium style rows (Locked to max 65vh) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "40vh", overflowY: "auto", paddingRight: "4px", flex: 1 }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {language === "th" ? "ยังไม่มีสถิติถูกบันทึก เล่นสักตาเลย!" : "No records yet. Play a game!"}
                </div>
              ) : (
                leaderboard.slice(leaderboardPage * 20, (leaderboardPage + 1) * 20).map((row, idx) => {
                  const globalIndex = leaderboardPage * 20 + idx;
                  let medal = `${globalIndex + 1}`;
                  if (globalIndex === 0) medal = "🥇";
                  else if (globalIndex === 1) medal = "🥈";
                  else if (globalIndex === 2) medal = "🥉";

                  return (
                    <div
                      key={globalIndex}
                      className="leaderboard-row"
                      style={{
                        background:
                          globalIndex === 0
                            ? "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(255,179,71,0.10))"
                            : undefined,
                        border:
                          globalIndex === 0
                            ? "1px solid rgba(255,179,71,0.35)"
                            : undefined,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.2rem", width: "24px", textAlign: "center" }}>{medal}</span>
                        <span style={{ fontSize: "1.2rem" }}>{row.avatar}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                          <span style={{ fontWeight: 800, color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }} title={row.name}>
                            {row.name}
                          </span>
                          {row.maxCombo !== undefined && row.maxCombo >= 2 && (
                            <span style={{ fontSize: "0.68rem", color: "#FF9F1C", fontWeight: 700, display: "flex", alignItems: "center", gap: "2px" }}>
                              🔥 {language === "th" ? `คอมโบสูงสุด x${row.maxCombo}` : `Max Combo x${row.maxCombo}`}
                            </span>
                          )}
                        </div>
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: "1.02rem",
                            background: "var(--grad-text)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {row.score.toLocaleString()} {language === "th" ? "คะแนน" : "pts"}
                        </span>
                        {row.date && (
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", opacity: 0.85, fontWeight: 500 }}>
                            {formatDate(row.date, language)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {leaderboard.length > 20 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <button
                  disabled={leaderboardPage === 0}
                  onClick={() => { playClickSFX(); setLeaderboardPage(p => p - 1); }}
                  className="btn"
                  style={{ width: "auto", padding: "6px 14px", fontSize: "0.80rem", background: "rgba(0,0,0,0.05)", color: "var(--text-dark)", cursor: leaderboardPage === 0 ? "not-allowed" : "pointer", opacity: leaderboardPage === 0 ? 0.4 : 1 }}
                >
                  {language === "th" ? "◀ ก่อนหน้า" : "◀ Prev"}
                </button>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  {language === "th" ? "หน้า" : "Page"} {leaderboardPage + 1} / {Math.ceil(leaderboard.length / 20)}
                </span>
                <button
                  disabled={(leaderboardPage + 1) * 20 >= leaderboard.length}
                  onClick={() => { playClickSFX(); setLeaderboardPage(p => p + 1); }}
                  className="btn"
                  style={{ width: "auto", padding: "6px 14px", fontSize: "0.80rem", background: "rgba(0,0,0,0.05)", color: "var(--text-dark)", cursor: (leaderboardPage + 1) * 20 >= leaderboard.length ? "not-allowed" : "pointer", opacity: (leaderboardPage + 1) * 20 >= leaderboard.length ? 0.4 : 1 }}
                >
                  {language === "th" ? "ถัดไป ▶" : "Next ▶"}
                </button>
              </div>
            )}

            <p
              style={{
                textAlign: "center",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginTop: "12px",
                fontWeight: 600,
              }}
            >
              {language === "th" ? "🎮 มาสิ มาทายกัน!" : "🎮 No shy, Beat It!"}
            </p>
          </div>
        </div>
      )}

      {/* ── Force Name Modal ── */}
      {showForceNameModal && (
        <div className="modal-overlay" style={{ backdropFilter: "blur(12px)", zIndex: 100 }}>
          <div className="modal-content animate-popup-bounce" style={{ maxWidth: "440px" }}>
            <h2 className="modal-title" style={{ fontSize: "1.6rem", color: "var(--orange-core)" }}>
              {translations[language].forceNameTitle}
            </h2>
            <p className="home-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "18px" }}>
              {translations[language].forceNameSub}
            </p>

            <div style={{ marginBottom: "18px" }}>
              <label className="modal-label">
                {language === "th" ? "🐾 เลือก Avatar" : "🐾 Choose Avatar"}
              </label>
              <div className="avatar-grid">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { playClickSFX(); setForceAvatar(emoji); }}
                    className={`avatar-option-btn ${forceAvatar === emoji ? "selected" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "24px", position: "relative" }}>
              <label className="modal-label">
                {language === "th" ? "📝 ชื่อผู้เล่นของคุณ" : "📝 Your Player Name"}
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  maxLength={15}
                  value={forceName}
                  onChange={(e) => setForceName(e.target.value)}
                  className="input-text"
                  placeholder={translations[language].namePlaceholder}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    playClickSFX();
                    const newName = generateRandomName(language);
                    setForceName(newName);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "48px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title={language === "th" ? "สุ่มชื่อ" : "Random Name"}
                >
                  <Dices size={20} />
                </button>
              </div>

              {/* Fallback/Validation message below the input */}
              {forceError && (
                <div style={{
                  color: "#e53e3e",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  ⚠️ {forceError}
                </div>
              )}
              {!forceError && forceName.trim() && !forceValidating && (
                <div style={{
                  color: "#38a169",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  ✅ {language === "th" ? "ชื่อนี้สามารถใช้งานได้" : "This name is available!"}
                </div>
              )}
              {forceValidating && (
                <div style={{
                  color: "var(--primary)",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                  fontWeight: 500
                }}>
                  ⏳ {language === "th" ? "กำลังตรวจสอบชื่อ..." : "Validating name..."}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (!forceError && forceName.trim() && !forceValidating) {
                  playClickSFX();
                  setPlayerInfo(forceName.trim(), forceAvatar);
                  setNameInput(forceName.trim());
                  setAvatarInput(forceAvatar);
                  setShowForceNameModal(false);
                }
              }}
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={!!forceError || !forceName.trim() || forceValidating}
            >
              🚀 {language === "th" ? "เริ่มต้นเล่นเกม!" : "Start Game!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default Home;

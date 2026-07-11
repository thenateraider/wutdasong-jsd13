import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { X } from "lucide-react";
import { translations } from "../utils/translations";

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
  const { playerName, playerAvatar, setPlayerInfo, language } = useGameStore();

  const [nameInput, setNameInput] = useState(playerName || (language === "th" ? "ผู้เล่นทั่วไป" : "Guest Player"));
  const [avatarInput, setAvatarInput] = useState(playerAvatar || "🎧");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const saveProfile = () => {
    if (nameInput.trim()) {
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
              onClick={() => { playClickSFX(); setShowLeaderboard(true); }}
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
              <input
                type="text"
                maxLength={15}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="input-text"
                placeholder={translations[language].namePlaceholder}
              />
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
              >
                {language === "th" ? "💾 บันทึก" : "💾 Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── How to Play Modal ── */}
      {showHowToPlay && (
        <div className="modal-overlay">
          <div className="modal-content animate-popup-bounce">
            <button
              onClick={() => { playClickSFX(); setShowHowToPlay(false); }}
              className="modal-close"
            >
              <X size={16} />
            </button>
            <h2 className="modal-title" style={{ color: "var(--orange-core)" }}>
              {language === "th" ? "📖 วิธีเล่น" : "📖 How to Play"}
            </h2>
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
          </div>
        </div>
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal-content animate-popup-bounce">
            <button
              onClick={() => { playClickSFX(); setShowLeaderboard(false); }}
              className="modal-close"
            >
              <X size={16} />
            </button>
            <h2 className="modal-title" style={{ color: "var(--orange-core)" }}>
              {language === "th" ? "🏆 ลีดเดอร์บอร์ด" : "🏆 Leaderboard"}
            </h2>

            {/* Podium style rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { medal: "🥇", name: "Nont_Fan_#1", pts: "1,820" },
                { medal: "🥈", name: "YoasobiLvr", pts: "1,540" },
                { medal: "🥉", name: "ThreeManFan", pts: "1,310" },
              ].map((row, i) => (
                <div
                  key={row.name}
                  className="leaderboard-row"
                  style={{
                    background:
                      i === 0
                        ? "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(255,179,71,0.10))"
                        : undefined,
                    border:
                      i === 0
                        ? "1px solid rgba(255,179,71,0.35)"
                        : undefined,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "1.4rem" }}>{row.medal}</span>
                    <span style={{ fontWeight: 800, color: "var(--text-dark)" }}>
                      {row.name}
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: "1rem",
                      background: "var(--grad-text)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {row.pts} {language === "th" ? "คะแนน" : "pts"}
                  </span>
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                marginTop: "18px",
                fontWeight: 600,
              }}
            >
              {language === "th" ? "🎮 เล่นคนเดียวเพื่อเก็บคะแนนสูงสุด!" : "🎮 Play singleplayer to update your highscore!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
export default Home;

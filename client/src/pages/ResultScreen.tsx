import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { Award, RotateCcw, Home, Award as Crown, BarChart3, Clock, CheckCircle, Flame } from "lucide-react";
import confetti from "canvas-confetti";
import { translations } from "../utils/translations";

import axios from "axios";

interface ResultScreenProps {
  mode: "single" | "multi";
  onReset: () => void;
  onReturnHome: () => void;
  playClickSFX: () => void;
}

export function ResultScreen({ mode, onReset, onReturnHome, playClickSFX }: ResultScreenProps) {
  const {
    singlePlayerScore,
    singlePlayerStats,
    singlePlayerMaxCombo,
    rounds,
    players,
    leaveRoom,
    language,
    saveHighScore,
    socket
  } = useGameStore();

  // Confetti 🎉 & Save Highscore
  useEffect(() => {
    confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });

    const duration = 2.5 * 1000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Auto-save high score to leaderboard API
    const songCount = rounds.length || 10;
    if (mode === "single") {
      saveHighScore(singlePlayerScore, songCount);

      // บวกจำนวนครั้งที่เล่นให้เพลย์ลิสต์ในโหมดเล่นคนเดียว
      const { settings, API_URL } = useGameStore.getState();
      if (settings.playlistUrl) {
        axios.post(`${API_URL}/api/playlists/increment-play`, { playlistUrl: settings.playlistUrl })
          .catch((err) => console.error("Failed to increment play count:", err));
      }
    } else if (mode === "multi" && socket) {
      const myPlayer = players.find((p) => p.id === socket.id);
      if (myPlayer) {
        const { settings } = useGameStore.getState();
        saveHighScore(myPlayer.score, settings.numSongs || 10);
      }
    }
  }, []);

  const totalSongs = rounds.length || 5;
  const accuracy = Math.round((singlePlayerStats.correct / totalSongs) * 100) || 0;
  const avgTime =
    singlePlayerStats.correct > 0
      ? (singlePlayerStats.timeTaken / singlePlayerStats.correct).toFixed(1)
      : "0.0";

  let rank: "S" | "A" | "B" | "C" = "C";
  if (accuracy >= 90) rank = "S";
  else if (accuracy >= 75) rank = "A";
  else if (accuracy >= 50) rank = "B";

  const rankEmoji = { S: "🌟", A: "🔥", B: "👍", C: "💪" }[rank];

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const handleReturnHome = () => {
    playClickSFX();
    if (mode === "multi") leaveRoom();
    onReturnHome();
  };

  return (
    <div className="page-container">
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          zIndex: 10,
        }}
      >
        {/* ── Trophy Hero ── */}
        <div
          className="animate-slide-up"
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "18px",
              background: "var(--grad-primary)",
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.60)",
              boxShadow: "0 8px 28px rgba(255,107,53,0.45), 0 0 0 8px rgba(255,107,53,0.12)",
              color: "#FFFFFF",
              animation: "floatBounce 3s ease-in-out infinite",
            }}
          >
            <Crown size={40} />
          </div>
          <h2 className="gradient-title" style={{ fontSize: "2.2rem" }}>
            {translations[language].gameOver}
          </h2>
          <p
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
            }}
          >
            {mode === "single"
              ? (language === "th" ? "สถิติการเล่นคนเดียว" : "Singleplayer Stats")
              : (language === "th" ? "อันดับผู้เล่นทั้งหมด" : "Multiplayer Rankings")}
          </p>
        </div>

        {/* ── Singleplayer stats card ── */}
        {mode === "single" ? (
          <div
            className="card animate-slide-up"
            style={{ position: "relative", overflow: "visible", animationDelay: "0.08s" }}
          >
            {/* Rank Badge */}
            <div className={`result-rank-badge rank-${rank}`}>
              {rankEmoji}
            </div>

            {/* Score display */}
            <div className="result-score-container">
              <div className="result-score-label">{translations[language].finalScore}</div>
              <div className="result-score-val">{singlePlayerScore}</div>
              <div
                style={{
                  display: "inline-block",
                  marginTop: "6px",
                  padding: "4px 14px",
                  borderRadius: "var(--r-full)",
                  background: "rgba(255,107,53,0.10)",
                  border: "1px solid rgba(255,107,53,0.22)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--orange-core)",
                  letterSpacing: "0.06em",
                }}
              >
                {language === "th" ? "ระดับ" : "Rank"} {rank}
              </div>
            </div>

            {/* Stats row */}
            <div className="result-stats-row">
              <div className="result-stat-box">
                <span className="result-stat-icon" style={{ color: "var(--success)" }}>
                  <CheckCircle size={20} />
                </span>
                <span className="result-stat-label">{language === "th" ? "ความแม่นยำ" : "Accuracy"}</span>
                <div className="result-stat-val">{accuracy}%</div>
                <div className="result-stat-sub">{singlePlayerStats.correct}/{totalSongs} {language === "th" ? "ถูกต้อง" : "Correct"}</div>
              </div>

              <div className="result-stat-box">
                <span className="result-stat-icon" style={{ color: "var(--error)" }}>
                  <BarChart3 size={20} />
                </span>
                <span className="result-stat-label">{language === "th" ? "ตอบผิด" : "Wrong"}</span>
                <div className="result-stat-val">{singlePlayerStats.wrong}</div>
                <div className="result-stat-sub">{language === "th" ? "เลือกตัวเลือกผิด" : "Incorrect choices"}</div>
              </div>

              <div className="result-stat-box">
                <span className="result-stat-icon" style={{ color: "var(--warning)" }}>
                  <Clock size={20} />
                </span>
                <span className="result-stat-label">{language === "th" ? "ความเร็วเฉลี่ย" : "Avg Speed"}</span>
                <div className="result-stat-val">{avgTime}s</div>
                <div className="result-stat-sub">{language === "th" ? "ต่อข้อที่ตอบถูก" : "Per correct round"}</div>
              </div>

              <div className="result-stat-box">
                <span className="result-stat-icon" style={{ color: "#FF9F1C" }}>
                  <Flame size={20} />
                </span>
                <span className="result-stat-label">{language === "th" ? "คอมโบสูงสุด" : "Max Combo"}</span>
                <div className="result-stat-val">x{singlePlayerMaxCombo}</div>
                <div className="result-stat-sub">{language === "th" ? "ตอบถูกต่อเนื่อง" : "Consecutive correct"}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Multiplayer scoreboard */
          <div
            className="card animate-slide-up"
            style={{ display: "flex", flexDirection: "column", gap: "14px", animationDelay: "0.08s" }}
          >
            <h3
              style={{
                fontSize: "1.05rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: "1px solid rgba(255,107,53,0.10)",
                paddingBottom: "12px",
                margin: 0,
                color: "var(--text-dark)",
              }}
            >
              <Award size={18} style={{ color: "var(--warning)" }} />
              {language === "th" ? "ตารางคะแนน" : "Scoreboard"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "40vh", overflowY: "auto" }}>
              {sortedPlayers.map((player, idx) => {
                const isWinner = idx === 0;
                const medalColors = ["#F59E0B", "#94A3B8", "#B45309"];
                return (
                  <div
                    key={player.id}
                    className="leaderboard-row"
                    style={{
                      background: isWinner
                        ? "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,179,71,0.10))"
                        : "rgba(255,255,255,0.55)",
                      borderColor: isWinner ? "rgba(245,158,11,0.35)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          fontWeight: 900,
                          fontSize: "0.78rem",
                          background: idx < 3 ? medalColors[idx] : "rgba(255,107,53,0.10)",
                          color: idx < 3 ? "#FFFFFF" : "var(--orange-core)",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: "1.6rem" }}>{player.avatar}</span>
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "0.92rem",
                            color: "var(--text-dark)",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {player.name}
                          {isWinner && <Crown size={13} style={{ color: "#F59E0B", fill: "#F59E0B" }} />}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          {player.correctAnswers || 0} {language === "th" ? "ถูก" : "correct"} · {player.wrongAnswers || 0} {language === "th" ? "ผิด" : "wrong"}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "1.1rem",
                          background: isWinner ? "linear-gradient(135deg,#F59E0B,#FFD580)" : "var(--grad-text)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {player.score}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                        {language === "th" ? "คะแนน" : "Points"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div
          className="animate-slide-up"
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            width: "100%",
            animationDelay: "0.14s",
          }}
        >
          <button
            onClick={() => { playClickSFX(); onReset(); }}
            className="btn btn-primary ripple"
            style={{ flex: 1, minWidth: "150px" }}
          >
            <RotateCcw size={18} />
            {translations[language].playAgain}
          </button>

          <button
            onClick={handleReturnHome}
            className="btn btn-secondary ripple"
            style={{ flex: 1, minWidth: "150px" }}
          >
            <Home size={18} />
            {language === "th" ? "กลับหน้าหลัก" : "Exit to Home"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default ResultScreen;

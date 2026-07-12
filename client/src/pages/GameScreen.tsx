import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { translations } from "../utils/translations";
import { MusicVisualizer } from "../components/MusicVisualizer";

interface GameScreenProps {
  mode: "single" | "multi";
  isPlayingAudio: boolean;
  playAudioClip: (url: string, durationSec: number) => void;
  stopAudioClip: () => void;
  getAnalyserData: () => Uint8Array | null;
  playClickSFX: () => void;
  playTickSFX: () => void;
  playCorrectSFX: () => void;
  playIncorrectSFX: () => void;
}

export function GameScreen({
  mode,
  isPlayingAudio,
  playAudioClip,
  stopAudioClip,
  getAnalyserData,
  playClickSFX,
  playTickSFX,
  playCorrectSFX,
  playIncorrectSFX,
}: GameScreenProps) {
  const {
    rounds,
    currentRoundIdx,
    timer,
    selectedChoiceId,
    correctAnswer,
    status,
    settings,
    players,
    submitGuess,
    submitSingleplayerGuess,
    revealSingleplayerRound,
    language,
    playerName,
    playerAvatar,
  } = useGameStore();

  const currentRound = rounds[currentRoundIdx];
  const [localTimer, setLocalTimer] = useState(timer);
  const [guessLocked, setGuessLocked] = useState(false);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);

  const [prevRoundIdx, setPrevRoundIdx] = useState(currentRoundIdx);
  const [prevStatus, setPrevStatus] = useState(status);

  if (currentRoundIdx !== prevRoundIdx || status !== prevStatus) {
    setPrevRoundIdx(currentRoundIdx);
    setPrevStatus(status);
    if (status === "playing") {
      setLocalTimer(settings.answerDuration);
      setGuessLocked(false);
      setTimeTaken(null);
    }
  }

  useEffect(() => {
    if (!currentRound) return;
    playAudioClip(currentRound.previewUrl, settings.answerDuration + 5);
    return () => { stopAudioClip(); };
  }, [currentRoundIdx]);

  useEffect(() => {
    if (status !== "playing" || !currentRound) return;
    setGuessLocked(false);
    setLocalTimer(settings.answerDuration);

    const startTime = Date.now();
    const durationMs = settings.answerDuration * 1000;
    let lastTickTime = 0;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let remainingSec = (durationMs - elapsed) / 1000;
      if (remainingSec <= 0) { remainingSec = 0; clearInterval(interval); }

      const nowMs = Date.now();
      if (remainingSec <= 3 && remainingSec > 0) {
        // Tick rapidly (every 250ms)
        if (nowMs - lastTickTime >= 250) {
          playTickSFX();
          lastTickTime = nowMs;
        }
      }
      setLocalTimer(remainingSec);
    }, 50);

    return () => { clearInterval(interval); };
  }, [currentRoundIdx, status, mode]);

  useEffect(() => {
    if (mode === "single" && status === "playing" && localTimer === 0) {
      revealSingleplayerRound();
    }
  }, [localTimer, status, mode]);

  useEffect(() => {
    if (status === "reveal" && correctAnswer) {
      if (mode === "single") {
        if (selectedChoiceId === correctAnswer.id) playCorrectSFX();
        else playIncorrectSFX();
      } else {
        const me = players.find((p) => p.id === useGameStore.getState().socket?.id);
        if (me?.lastAnswerCorrect) playCorrectSFX();
        else playIncorrectSFX();
      }
    }
  }, [status, correctAnswer]);

  if (!currentRound) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading game round...</p>
      </div>
    );
  }

  const handleChoiceSelect = (choiceId: string) => {
    if (guessLocked || status !== "playing") return;
    playClickSFX();
    setGuessLocked(true);

    const taken = Number((settings.answerDuration - localTimer).toFixed(2));
    setTimeTaken(taken);

    if (mode === "single") {
      submitSingleplayerGuess(choiceId, localTimer);
      revealSingleplayerRound();
    } else {
      submitGuess(choiceId, localTimer);
    }
  };

  const getCompliment = (timeUsedSec: number, totalSec: number): string => {
    const percent = (timeUsedSec / totalSec) * 100;
    if (percent < 10) {
      return translations[language].congratsSuperFast;
    } else if (percent < 30) {
      return translations[language].congratsFast;
    } else if (percent < 70) {
      return translations[language].congratsNormal;
    } else {
      return translations[language].congratsSlow;
    }
  };

  const timerPercentage = (localTimer / settings.answerDuration) * 100;
  const isTimerLow = localTimer <= 3;
  const isRevealPhase = status === "reveal" && correctAnswer;
  const me = players.find((p) => p.id === useGameStore.getState().socket?.id);
  const isCorrect = mode === "single"
    ? (correctAnswer && selectedChoiceId === correctAnswer.id)
    : (me ? me.lastAnswerCorrect : false);

  let pointsAdded = 0;
  if (isRevealPhase && correctAnswer) {
    if (mode === "single") {
      pointsAdded = useGameStore.getState().singlePlayerLastScoreAdded;
    } else {
      pointsAdded = me ? (me.lastScoreAdded || 0) : 0;
    }
  }

  const currentMultiplier = mode === "single"
    ? useGameStore.getState().singlePlayerStreak
    : (me ? (me as any).streak : 1);

  // SVG circle math
  const RADIUS = 30;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (timerPercentage / 100) * CIRCUMFERENCE;

  const CHOICE_LETTERS = ["A", "B", "C", "D", "E"];

  return (
    <div className="page-container">
      <div className="split-card-container" key={currentRoundIdx}>

        {/* ── Player Header Card (Structure for Multiplayer preview) ── */}
        <div
          className="mini-card animate-card-swipe"
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "20px",
            gap: "12px",
            justifyContent: "flex-start",
            minHeight: "56px",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1.5px solid rgba(255, 107, 53, 0.15)",
            marginBottom: "6px"
          }}
        >
          {/* Avatar Icon */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--grad-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              boxShadow: "0 4px 10px rgba(255, 107, 53, 0.25)"
            }}
          >
            {playerAvatar || "🎧"}
          </div>
          {/* Player details */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-dark)", lineHeight: 1.2 }}>
              {playerName || "Guest Player"}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {mode === "single" ? (language === "th" ? "โหมดเล่นคนเดียว" : "Singleplayer Mode") : (language === "th" ? "โหมดเล่นกับเพื่อน" : "Multiplayer Mode")}
            </span>
          </div>
        </div>

        {/* ── Row 1: Round & Score pills ── */}
        <div className="mini-card-row animate-card-swipe">
          {/* Round Card */}
          <div className="mini-card" style={{ padding: "14px 20px", borderRadius: "24px", gap: "14px", justifyContent: "flex-start", minHeight: "80px" }}>
            {/* Emoji badge */}
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                background: "rgba(255, 107, 53, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
                flexShrink: 0,
              }}
            >
              🎵
            </div>
            {/* Playful Text layout */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {translations[language].roundText}
              </span>
              <span
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: "1.55rem",
                  fontWeight: 950,
                  lineHeight: 1.1,
                }}
              >
                <span style={{ background: "var(--grad-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {currentRoundIdx + 1}
                </span>
                <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
                  /{rounds.length}
                </span>
              </span>
            </div>
          </div>

          {/* Score Card */}
          <div className="mini-card" style={{ padding: "14px 20px", borderRadius: "24px", gap: "14px", justifyContent: mode === "single" ? "flex-start" : "center", minHeight: "80px" }}>
            {mode === "single" ? (
              <>
                {/* Emoji badge */}
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "14px",
                    background: "rgba(255, 191, 0, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.35rem",
                    flexShrink: 0,
                  }}
                >
                  ⭐
                </div>
                {/* Playful Text layout */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {translations[language].scoreText}
                  </span>
                  <span
                    style={{
                      fontFamily: "Outfit, sans-serif",
                      fontSize: "1.55rem",
                      fontWeight: 950,
                      lineHeight: 1.1,
                      background: "var(--grad-text)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {useGameStore.getState().singlePlayerScore}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", justifyContent: "center" }}>
                {players.slice(0, 4).map((p) => {
                  const hasAnswered = p.selectedChoiceId !== null;
                  return (
                    <div
                      key={p.id}
                      style={{
                        fontSize: "0.76rem",
                        padding: "4px 8px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,107,53,0.20)",
                        backgroundColor: hasAnswered ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.70)",
                        color: hasAnswered ? "var(--orange-core)" : "var(--text-muted)",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{p.avatar}</span>
                      <span style={{ color: "var(--orange-core)" }}>
                        {p.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Timer + Visualizer + Cat ── */}
        <div
          className={`split-card animate-card-swipe ${isTimerLow ? "timer-low" : ""}`}
          style={{ animationDelay: "0.05s", padding: "16px 20px" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              width: "100%",
            }}
          >
            {/* Circular Timer with gradient */}
            <div className="circular-timer-wrapper">
              <svg className="timer-svg" viewBox="0 0 72 72">
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#FFB347" />
                  </linearGradient>
                </defs>
                <circle className="timer-bg" cx="36" cy="36" r={RADIUS} />
                <circle
                  className={`timer-progress ${isTimerLow ? "warning" : ""}`}
                  cx="36"
                  cy="36"
                  r={RADIUS}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <span className={`timer-text ${isTimerLow ? "warning" : ""}`}>
                {localTimer.toFixed(1)}
              </span>
            </div>

            {/* Visualizer */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <MusicVisualizer isPlaying={isPlayingAudio} getAnalyserData={getAnalyserData} />
            </div>

            {/* Thinking Cat */}
            <div
              className="thinking-cat-container"
              style={{ margin: 0, flexShrink: 0 }}
              dangerouslySetInnerHTML={{
                __html: `<lottie-player src="${(import.meta as any).env.DEV ? "/dist/assets/cat_thinking.json" : "/assets/cat_thinking.json"
                  }" background="transparent" speed="1" style="width: 100%; height: 100%;" loop autoplay></lottie-player>`,
              }}
            />
          </div>
        </div>

        {/* ── Row 3: Choice Buttons ── */}
        <div className="choice-list">
          {currentRound.choices.map((choice, idx) => {
            const isSelected = selectedChoiceId === choice.id;
            const letter = CHOICE_LETTERS[idx] || String(idx + 1);

            return (
              <button
                key={choice.id}
                onClick={() => handleChoiceSelect(choice.id)}
                disabled={guessLocked || status !== "playing"}
                className={`choice-btn ripple ${isSelected ? "selected" : ""}`}
                style={{ animationDelay: `${0.10 + idx * 0.07}s`, animationFillMode: "both" }}
              >
                <span className="choice-btn-letter">{letter}</span>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "0 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      fontFamily: "Outfit, sans-serif",
                      color: "var(--text-dark)",
                      lineHeight: 1.25,
                    }}
                  >
                    {choice.title}
                  </div>
                </div>
                {/* Spacer for visual balance */}
                <span style={{ width: 32, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {/* ── Row 4: Scoreboard Card (Multiplayer only) ── */}
        {mode === "multi" && (
          <div
            className="setup-section-card"
            style={{
              marginTop: "16px",
              padding: "16px",
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.85)",
              border: "1.5px solid rgba(255, 107, 53, 0.15)",
              boxShadow: "var(--shadow-sm)",
              maxHeight: "220px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* Header */}
            <div
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: "1rem",
                fontWeight: 900,
                color: "var(--text-dark)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderBottom: "1.5px solid rgba(0,0,0,0.06)",
                paddingBottom: "6px",
              }}
            >
              <span>📊</span>
              <span>{language === "th" ? "กระดานคะแนน" : "Scoreboard"}</span>
            </div>

            {/* Scrollable List container */}
            <div
              style={{
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                paddingRight: "4px",
              }}
            >
              {(() => {
                const sorted = [...players].sort((a, b) => b.score - a.score);
                const top3 = sorted.slice(0, 3);
                const others = sorted.slice(3);

                return (
                  <>
                    {/* Top 3 list (Larger, with avatars) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {top3.map((p, idx) => {
                        const medalEmoji = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 12px",
                              borderRadius: "12px",
                              background: idx === 0
                                ? "rgba(255, 215, 0, 0.12)"
                                : idx === 1
                                  ? "rgba(192, 192, 192, 0.12)"
                                  : "rgba(205, 127, 50, 0.12)",
                              border: `1px solid ${idx === 0
                                  ? "rgba(255, 215, 0, 0.3)"
                                  : idx === 1
                                    ? "rgba(192, 192, 192, 0.3)"
                                    : "rgba(205, 127, 50, 0.3)"
                                }`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{medalEmoji}</span>
                              <span style={{ fontSize: "1.2rem" }}>{p.avatar}</span>
                              <span
                                style={{
                                  fontSize: "0.95rem",
                                  fontWeight: 900,
                                  color: "var(--text-dark)",
                                }}
                              >
                                {p.name}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "1.05rem",
                                fontWeight: 950,
                                color: "var(--orange-core)",
                              }}
                            >
                              {p.score}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Others list (Smaller, without avatars) */}
                    {others.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          borderTop: "1px dashed rgba(0,0,0,0.08)",
                          paddingTop: "6px",
                          marginTop: "2px",
                        }}
                      >
                        {others.map((p, idx) => {
                          const rank = idx + 4;
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "4px 8px",
                                background: "rgba(0,0,0,0.02)",
                                borderRadius: "8px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 800,
                                  color: "var(--text-muted)",
                                }}
                              >
                                #{rank} {p.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 900,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {p.score}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Reveal Overlay ── */}
      {isRevealPhase && correctAnswer && (
        <div
          className="modal-overlay"
          style={{
            backgroundColor: "rgba(10, 10, 12, 0.75)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            zIndex: 100,
          }}
        >
          <div
            className="animate-popup-bounce"
            style={{ width: "90%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* ── Card 1: Top Status Console ── */}
            <div
              className="glass"
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "rgba(255, 255, 255, 0.90)",
                border: `2px solid ${isCorrect ? "rgba(34,197,94,0.40)" : "rgba(239,68,68,0.30)"}`,
                boxShadow: isCorrect
                  ? "0 12px 36px rgba(34,197,94,0.18), var(--shadow-md)"
                  : "0 12px 36px rgba(239,68,68,0.15), var(--shadow-md)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", width: "100%" }}>
                {/* Left side: Cat Animation (Bigger!) */}
                <div
                  style={{
                    width: "95px",
                    height: "95px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.10))",
                    animation: "springPop 0.5s var(--ease-spring) both",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: isCorrect
                      ? `<lottie-player src="${(import.meta as any).env.DEV ? "/dist/assets/happy_cat.json" : "/assets/happy_cat.json"
                      }" background="transparent" speed="1.1" style="width:95px;height:95px;" loop autoplay></lottie-player>`
                      : `<lottie-player src="${(import.meta as any).env.DEV ? "/dist/assets/false_cat.json" : "/assets/false_cat.json"
                      }" background="transparent" speed="1" style="width:95px;height:95px;" loop autoplay></lottie-player>`,
                  }}
                />

                {/* Right side: Status and Score details */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", textAlign: "left", gap: "2px" }}>
                  {/* Status Indicator */}
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 900,
                      color: isCorrect ? "var(--success)" : "var(--error)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      background: isCorrect ? "var(--success-light)" : "var(--error-light)",
                      padding: "3px 12px",
                      borderRadius: "var(--r-full)",
                    }}
                  >
                    {isCorrect
                      ? translations[language].correctIndicator
                      : (!selectedChoiceId
                        ? translations[language].timesUpIndicator
                        : translations[language].falseIndicator)}
                  </div>

                  {isCorrect && currentMultiplier >= 2 && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        color: "#FF9F1C",
                        background: "rgba(255, 159, 28, 0.12)",
                        padding: "2px 10px",
                        borderRadius: "var(--r-full)",
                        marginTop: "4px",
                        alignSelf: "flex-start",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px"
                      }}
                    >
                      🔥 Combo x{currentMultiplier}
                    </div>
                  )}

                  {/* Massive points pop! */}
                  {isCorrect ? (
                    <div
                      style={{
                        fontSize: "3.4rem",
                        fontWeight: 950,
                        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        animation: "springPop 0.45s var(--ease-spring) both",
                        textShadow: "0 4px 20px rgba(16, 185, 129, 0.30)",
                        lineHeight: 1.05,
                        margin: "2px 0 0 0",
                      }}
                    >
                      +{pointsAdded}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "3.4rem",
                        fontWeight: 950,
                        color: "var(--error)",
                        animation: "shake 0.45s ease-in-out both",
                        textShadow: "0 4px 20px rgba(239, 68, 68, 0.25)",
                        lineHeight: 1.05,
                        margin: "2px 0 0 0",
                      }}
                    >
                      +0
                    </div>
                  )}

                  {/* Subtitle tag / time & compliment */}
                  {isCorrect ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "3px" }}>
                      {timeTaken !== null && (
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#10B981" }}>
                          {translations[language].timeTakenText.replace("{time}", String(timeTaken))}
                        </span>
                      )}
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-mid)", lineHeight: 1.2 }}>
                        {timeTaken !== null ? getCompliment(timeTaken, settings.answerDuration) : "สุดยอดไปเลย! 🎉"}
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.64rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {translations[language].tryAgainSub}
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown Progress bar (no text) */}
              <div className="progress-container" style={{ height: "6px", width: "100%", background: "rgba(255,107,53,0.1)" }}>
                <div
                  className="progress-bar"
                  style={{
                    height: "100%",
                    width: "100%",
                    background: isCorrect ? "var(--success)" : "var(--error)",
                    animation: "shrinkWidth 4s linear forwards",
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>

            {/* ── Card 2: Bottom Full-Width Poster Card ── */}
            <div
              key={`reveal-popup-${currentRoundIdx}`}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "3.2 / 4",
                borderRadius: "24px",
                overflow: "hidden",
                border: `4px solid ${isCorrect ? "var(--success)" : "var(--error)"}`,
                boxShadow: isCorrect ? "0 0 24px rgba(34,197,94,0.35), var(--shadow-lg)" : "var(--shadow-lg)",
                backgroundColor: "rgba(255,107,53,0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                animation: isCorrect ? "correctGlow 1.4s infinite" : "shake 0.40s ease-in-out",
              }}
            >
              {/* Actual Image */}
              <img
                src={correctAnswer.artworkUrl}
                alt="Album Cover"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 1,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />

              {/* Bottom Dark Gradient Overlay for text readability */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.15) 75%, transparent 100%)",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              />

              {/* Poster Card Overlay Info content */}
              <div
                style={{
                  position: "relative",
                  zIndex: 3,
                  padding: "16px 20px 20px 20px",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  color: "#FFFFFF",
                }}
              >
                {/* Title */}
                <h3
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    lineHeight: 1.25,
                    margin: 0,
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {correctAnswer.title}
                </h3>

                {/* Artist Name with Soft Gold color similar to the reference card */}
                <p
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: "0.90rem",
                    fontWeight: 800,
                    color: "#FFE0B2", // Soft warm gold
                    margin: 0,
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    wordBreak: "break-word",
                  }}
                >
                  {correctAnswer.artist}
                </p>

                {/* Album Name */}
                <p
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.7)",
                    margin: 0,
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                    wordBreak: "break-word",
                  }}
                >
                  {correctAnswer.album}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default GameScreen;

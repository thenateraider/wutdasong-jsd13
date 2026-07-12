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
  const [showRankings, setShowRankings] = useState(false);
  const [rankingsCountdown, setRankingsCountdown] = useState(5);

  const [prevRoundIdx, setPrevRoundIdx] = useState(currentRoundIdx);
  const [prevStatus, setPrevStatus] = useState(status);

  if (currentRoundIdx !== prevRoundIdx || status !== prevStatus) {
    setPrevRoundIdx(currentRoundIdx);
    setPrevStatus(status);
    if (status === "playing") {
      setLocalTimer(settings.answerDuration);
      setGuessLocked(false);
      setTimeTaken(null);
      setShowRankings(false);
      setRankingsCountdown(5);
    }
  }

  // After reveal progress bar ends (4s), show full rankings
  useEffect(() => {
    if (status === "reveal") {
      const timer = setTimeout(() => setShowRankings(true), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowRankings(false);
    }
  }, [status, currentRoundIdx]);

  // Countdown timer for rankings phase
  useEffect(() => {
    if (!showRankings) return;
    setRankingsCountdown(5);
    const interval = setInterval(() => {
      setRankingsCountdown(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          stopAudioClip(); // Explicitly stop the audio when countdown finishes
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showRankings]);

  useEffect(() => {
    if (!currentRound) return;
    // Play audio longer (answerDuration + 25 seconds) so it keeps playing during reveal and ranking screens
    playAudioClip(currentRound.previewUrl, settings.answerDuration + 25);
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
    : (me ? (me.streak || 1) : 1);

  // SVG circle math
  const RADIUS = 30;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (timerPercentage / 100) * CIRCUMFERENCE;

  const CHOICE_LETTERS = ["A", "B", "C", "D", "E"];

  const hasSidebar = mode === "multi";

  return (
    <div className="page-container">
      <div className={`game-layout-wrapper ${hasSidebar ? "has-sidebar" : ""}`} key={currentRoundIdx}>
        <div className="game-left-col">

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
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-dark)", lineHeight: 1.4 }}>
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
                  /{settings.numSongs || rounds.length}
                </span>
              </span>
            </div>
          </div>

          {/* Score Card */}
          <div className="mini-card" style={{ padding: "14px 20px", borderRadius: "24px", gap: "14px", justifyContent: "flex-start", minHeight: "80px" }}>
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
                {mode === "single" ? useGameStore.getState().singlePlayerScore : (me ? me.score : 0)}
              </span>
            </div>
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
          {(guessLocked
            ? currentRound.choices.filter((c) => c.id === selectedChoiceId)
            : currentRound.choices
          ).map((choice, idx) => {
            const isSelected = selectedChoiceId === choice.id;
            const origIdx = currentRound.choices.findIndex((c) => c.id === choice.id);
            const letter = CHOICE_LETTERS[origIdx] || String(origIdx + 1);

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
                      lineHeight: 1.4,
                      padding: "2px 0",
                    }}
                  >
                    {choice.title}
                  </div>
                </div>
                <span style={{ width: 32, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        </div> {/* Close game-left-col */}

        {/* ── Row 4: Scoreboard Card (Multiplayer only) ── */}
        {mode === "multi" && (
          <div className="game-right-col">
            <div className="game-scoreboard-card">
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

              {/* Scrollable List container (compact bar graph) */}
              <div
                style={{
                  overflowY: "auto",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  paddingRight: "2px",
                }}
              >
                {(() => {
                  const sorted = [...players].sort((a, b) => b.score - a.score);
                  const maxScore = Math.max(...players.map((p) => p.score || 0), 1);

                  return sorted.map((p, idx) => {
                    const isMe = p.id === useGameStore.getState().socket?.id;
                    const barWidth = p.score > 0 ? (p.score / maxScore) * 100 : 0;

                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          width: "100%",
                          background: isMe ? "rgba(255, 107, 53, 0.08)" : "transparent",
                          padding: isMe ? "4px 6px" : "2px 6px",
                          borderRadius: "8px",
                        }}
                      >
                        {/* Rank Badge */}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 900,
                            color: idx === 0 ? "#F59E0B" : idx === 1 ? "#94A3B8" : idx === 2 ? "#B45309" : "var(--text-muted)",
                            width: "22px",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          {idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `#${idx + 1}`}
                        </span>

                        {/* Emoji Avatar */}
                        <span style={{ fontSize: "1.05rem", flexShrink: 0 }}>{p.avatar}</span>
                        
                        {/* Player Name */}
                        <span
                          style={{
                            fontWeight: 850,
                            fontSize: "0.8rem",
                            color: "var(--text-dark)",
                            width: "65px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {p.name}
                        </span>

                        {/* Bar Graph */}
                        <div
                          style={{
                            flex: 1,
                            height: "8px",
                            background: "rgba(255, 107, 53, 0.08)",
                            borderRadius: "4px",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${barWidth}%`,
                              background: isMe 
                                ? "linear-gradient(90deg, #FF6B35 0%, #FF9F1C 100%)"
                                : "linear-gradient(90deg, #FFB347 0%, #FFD580 100%)",
                              borderRadius: "4px",
                              transition: "width 0.4s ease-out",
                            }}
                          />
                        </div>

                        {/* Player score and streak combo */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          {status === "playing" && p.streak !== undefined && p.streak >= 2 ? (
                            <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "#FF9F1C" }} title={`${p.streak} combo`}>
                              🔥
                            </span>
                          ) : null}
                          <span
                            style={{
                              fontFamily: "Outfit, sans-serif",
                              fontWeight: 950,
                              fontSize: "0.88rem",
                              color: "var(--orange-core)",
                              minWidth: "30px",
                              textAlign: "right",
                            }}
                          >
                            {p.score}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Reveal Overlay (first 4s) ── */}
      {isRevealPhase && correctAnswer && !showRankings && (
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
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-mid)", lineHeight: 1.4 }}>
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
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const parent = img.parentElement;
                  if (parent) {
                    parent.style.background = "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
                  }
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
                    lineHeight: 1.4,
                    padding: "2px 0",
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

      {/* ── Full Rankings Overlay (after reveal) ── */}
      {isRevealPhase && showRankings && (
        <div
          className="modal-overlay"
          style={{
            backgroundColor: "rgba(10, 10, 12, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            zIndex: 100,
          }}
        >
          <div
            className="animate-popup-bounce"
            style={{
              width: "90%",
              maxWidth: "440px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#FFF" }}>
              📊 {language === "th" ? "อันดับปัจจุบัน" : "Current Rankings"}
            </h2>

            {/* Countdown circle */}
            <div className="circular-timer-wrapper" style={{ width: "56px", height: "56px" }}>
              <svg className="timer-svg" viewBox="0 0 72 72">
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#FFB347" />
                  </linearGradient>
                </defs>
                <circle className="timer-bg" cx="36" cy="36" r="30" />
                <circle
                  className="timer-progress"
                  cx="36"
                  cy="36"
                  r="30"
                  strokeDasharray={188.5}
                  strokeDashoffset={188.5 - (rankingsCountdown / 5) * 188.5}
                />
              </svg>
              <span className="timer-text" style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>
                {rankingsCountdown}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {[...players].sort((a, b) => b.score - a.score).map((p, idx) => {
                const medalEmoji = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                const isMe = mode === "multi" && p.id === useGameStore.getState().socket?.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      borderRadius: "14px",
                      background: isMe ? "rgba(255, 107, 53, 0.15)" : "rgba(255, 255, 255, 0.08)",
                      border: isMe ? "1.5px solid rgba(255,107,53,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#FFF", minWidth: "28px", textAlign: "center" }}>
                        {medalEmoji}
                      </span>
                      <span style={{ fontSize: "1.3rem" }}>{p.avatar}</span>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#FFF" }}>
                          {p.name}
                          {isMe && <span style={{ fontSize: "0.65rem", padding: "1px 6px", backgroundColor: "var(--orange-core)", color: "#fff", borderRadius: "4px", marginLeft: "6px" }}>You</span>}
                        </div>
                        {p.streak !== undefined && p.streak >= 2 ? (
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#FF9F1C" }}>
                            🔥 {p.streak}x combo
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#FFE0B2" }}>
                        {p.score}
                      </div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                        pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default GameScreen;

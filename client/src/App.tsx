import { useEffect, useState } from "react";
import { useGameStore } from "./store/gameStore";
import { useAudio } from "./hooks/useAudio";
import { Home } from "./pages/Home";
import { SinglePlayerSetup } from "./pages/SinglePlayerSetup";
import { MultiplayerLobby } from "./pages/MultiplayerLobby";
import { GameScreen } from "./pages/GameScreen";
import { ResultScreen } from "./pages/ResultScreen";
import { AudioWaveBackground } from "./components/AudioWaveBackground";
import { Settings, X } from "lucide-react";
import { translations } from "./utils/translations";

export function App() {
  const {
    status,
    mode,
    loading,
    loadingMessage,
    settings,
    setMode,
    setStatus,
    startSingleplayer,
    nextSingleplayerRound,
    resetSingleplayer,
    language,
    setLanguage,
  } = useGameStore();

  const {
    isPlaying,
    playClip,
    stopClip,
    getAnalyserData,
    musicVolume,
    sfxVolume,
    setMusicVolume,
    setSfxVolume,
    playClickSFX,
    playTickSFX,
    playCorrectSFX,
    playIncorrectSFX,
  } = useAudio();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Watch for reveal phase end in singleplayer mode to transition to next round automatically
  useEffect(() => {
    if (mode === "single" && status === "reveal") {
      // Show reveal details for 4 seconds, then progress
      const timer = setTimeout(() => {
        nextSingleplayerRound();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [status, mode]);

  // Restart handler
  const handlePlayAgain = () => {
    if (mode === "single") {
      startSingleplayer(settings);
    } else {
      // In multiplayer, result screen "Play Again" returns back to the Lobby
      setStatus("lobby");
    }
  };

  const handleResetGame = () => {
    resetSingleplayer();
    setMode(null);
    setStatus("home");
  };

  return (
    <div className="app-viewport">
      {/* Static gradient background */}
      <AudioWaveBackground />

      {/* Global Settings Gear Button */}
      <button
        onClick={() => {
          playClickSFX();
          setIsSettingsOpen(true);
        }}
        className="btn-icon-only"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 90,
          borderRadius: "50%",
          width: "42px",
          height: "42px",
          boxShadow: "var(--shadow-sm)",
          background: "rgba(255, 255, 255, 0.95)",
          border: "1px solid rgba(255, 143, 0, 0.15)",
          color: "var(--primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition)"
        }}
        title="Settings"
      >
        <Settings size={20} />
      </button>

      <main className="main-content">
        {status === "home" && (
          <Home
            onStartSingle={() => {
              playClickSFX();
              setMode("single");
              setStatus("setup");
            }}
            onGoToMultiplayer={() => {
              playClickSFX();
              setMode("multi");
              setStatus("lobby");
            }}
            onOpenSettings={() => {
              playClickSFX();
              setIsSettingsOpen(true);
            }}
            playClickSFX={playClickSFX}
          />
        )}

        {status === "setup" && (
          <SinglePlayerSetup
            onBack={() => {
              playClickSFX();
              handleResetGame();
            }}
            onStart={(setupSettings) => {
              playClickSFX();
              startSingleplayer(setupSettings);
            }}
            playClickSFX={playClickSFX}
          />
        )}

        {status === "lobby" && (
          <MultiplayerLobby
            onBack={() => {
              playClickSFX();
              handleResetGame();
            }}
          />
        )}

        {(status === "playing" || status === "reveal") && (
          <GameScreen
            mode={mode || "single"}
            isPlayingAudio={isPlaying}
            playAudioClip={playClip}
            stopAudioClip={stopClip}
            getAnalyserData={getAnalyserData}
            playClickSFX={playClickSFX}
            playTickSFX={playTickSFX}
            playCorrectSFX={playCorrectSFX}
            playIncorrectSFX={playIncorrectSFX}
          />
        )}

        {status === "result" && (
          <ResultScreen
            mode={mode || "single"}
            onReset={() => {
              playClickSFX();
              handlePlayAgain();
            }}
            onReturnHome={() => {
              playClickSFX();
              handleResetGame();
            }}
            playClickSFX={playClickSFX}
          />
        )}
      </main>

      {/* Global Settings Dialog Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay animate-popup-bounce" style={{ zIndex: 200 }}>
          <div className="modal-content animate-popup-bounce" style={{ width: "340px", position: "relative" }}>
            <button
              onClick={() => {
                playClickSFX();
                setIsSettingsOpen(false);
              }}
              className="modal-close"
            >
              <X size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Settings size={22} style={{ color: "var(--orange-core)" }} />
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text-dark)" }}>
                {translations[language].settingsTitle}
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Music Volume Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-dark)" }}>
                    {translations[language].musicVol}
                  </span>
                  <span
                    style={{
                      fontSize: "0.80rem",
                      fontWeight: 800,
                      background: "var(--grad-text)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="range-slider"
                  style={{ width: "100%", cursor: "pointer" }}
                />
              </div>

              {/* SFX Volume Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-dark)" }}>
                    {translations[language].sfxVol}
                  </span>
                  <span
                    style={{
                      fontSize: "0.80rem",
                      fontWeight: 800,
                      background: "var(--grad-text)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="range-slider"
                  style={{ width: "100%", cursor: "pointer" }}
                />
              </div>

              {/* Language Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-dark)" }}>
                    {translations[language].langSelect}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <button
                    onClick={() => {
                      playClickSFX();
                      setLanguage("th");
                    }}
                    className="btn ripple"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      background: language === "th" ? "var(--grad-primary)" : "rgba(255, 255, 255, 0.60)",
                      color: language === "th" ? "#fff" : "var(--text-dark)",
                      border: language === "th" ? "none" : "1px solid rgba(255, 107, 53, 0.20)",
                    }}
                  >
                    🇹🇭 ไทย
                  </button>
                  <button
                    onClick={() => {
                      playClickSFX();
                      setLanguage("en");
                    }}
                    className="btn ripple"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      background: language === "en" ? "var(--grad-primary)" : "rgba(255, 255, 255, 0.60)",
                      color: language === "en" ? "#fff" : "var(--text-dark)",
                      border: language === "en" ? "none" : "1px solid rgba(255, 107, 53, 0.20)",
                    }}
                  >
                    🇺🇸 EN
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px", width: "100%" }}>
              {status !== "home" && (
                <button
                  onClick={() => {
                    playClickSFX();
                    stopClip();
                    handleResetGame();
                    setIsSettingsOpen(false);
                  }}
                  className="btn ripple"
                  style={{
                    flex: 1,
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1.5px solid rgba(239, 68, 68, 0.25)",
                    color: "var(--error)",
                    fontWeight: 800,
                    padding: "10px 16px",
                    borderRadius: "14px",
                    cursor: "pointer",
                  }}
                >
                  {translations[language].exitGame}
                </button>
              )}

              <button
                onClick={() => {
                  playClickSFX();
                  setIsSettingsOpen(false);
                }}
                className="btn btn-primary ripple"
                style={{ flex: 1, padding: "10px 16px", borderRadius: "14px", marginTop: 0 }}
              >
                {translations[language].closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global API Loader Spinner Overlay */}
      {loading && (
        <div
          className="modal-overlay"
          style={{ flexDirection: "column", gap: "16px", background: "rgba(255,240,220,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <div
            style={{ width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}
            dangerouslySetInnerHTML={{
              __html: `<dotlottie-player src="${
                (import.meta as any).env.DEV ? "/dist/assets/Loading Cat.lottie" : "/assets/Loading Cat.lottie"
              }" background="transparent" speed="1" style="width: 120px; height: 120px;" loop autoplay></dotlottie-player>`
            }}
          />
          <p
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "var(--grad-text)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontWeight: 800,
              fontSize: "1.05rem",
              letterSpacing: "0.05em",
            }}
          >
            {loadingMessage || "กรุณารอสักครู่..."}
          </p>
        </div>
      )}
    </div>
  );
}
export default App;

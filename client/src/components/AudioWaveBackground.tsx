export function AudioWaveBackground() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(160deg, #FFF0DC 0%, #FFE8CC 35%, #FFF5E8 70%, #FFF8F2 100%)",
        zIndex: -10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Floating Orb 1 — deep orange */}
      <div
        style={{
          position: "absolute",
          width: "520px",
          height: "520px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,107,53,0.28) 0%, transparent 70%)",
          top: "-180px",
          right: "-140px",
          animation: "orbFloat1 14s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      {/* Floating Orb 2 — warm gold */}
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,179,71,0.24) 0%, transparent 70%)",
          bottom: "-100px",
          left: "-100px",
          animation: "orbFloat2 18s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      {/* Floating Orb 3 — soft peach fill */}
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,213,128,0.20) 0%, transparent 70%)",
          top: "40%",
          left: "30%",
          animation: "orbFloat3 22s ease-in-out infinite",
          willChange: "transform",
        }}
      />
      {/* Subtle noise vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.30) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
export default AudioWaveBackground;

import { useEffect, useRef, useState } from "react";

interface UseAudioReturn {
  isPlaying: boolean;
  playClip: (url: string, durationSec: number) => void;
  stopClip: () => void;
  getAnalyserData: () => Uint8Array | null;
  musicVolume: number;
  sfxVolume: number;
  setMusicVolume: (vol: number) => void;
  setSfxVolume: (vol: number) => void;
  playClickSFX: () => void;
  playTickSFX: () => void;
  playCorrectSFX: () => void;
  playIncorrectSFX: () => void;
}

export function useAudio(): UseAudioReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Separate local storage keys for Music and SFX Volumes
  const [musicVolume, setMusicVolumeState] = useState(() => {
    const saved = localStorage.getItem("wutdasong_music_volume");
    return saved ? parseFloat(saved) : 0.85; // Default music volume: 85%
  });

  const [sfxVolume, setSfxVolumeState] = useState(() => {
    const saved = localStorage.getItem("wutdasong_sfx_volume");
    return saved ? parseFloat(saved) : 1.0; // Default SFX volume: 100%
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      stopClip();
      audio.pause();
      audio.src = "";
    };
  }, []);

  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);

  // Update native audio element volume when musicVolume state updates
  useEffect(() => {
    const targetVol = musicVolume * 0.75;
    if (audioRef.current) {
      audioRef.current.volume = targetVol;
    }
    if (musicGainRef.current && audioContextRef.current) {
      musicGainRef.current.gain.setValueAtTime(targetVol, audioContextRef.current.currentTime);
    }
    localStorage.setItem("wutdasong_music_volume", musicVolume.toString());
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem("wutdasong_sfx_volume", sfxVolume.toString());
  }, [sfxVolume]);

  const setMusicVolume = (vol: number) => {
    setMusicVolumeState(vol);
  };

  const setSfxVolume = (vol: number) => {
    setSfxVolumeState(vol);
  };

  // Helper to safely fetch/initialize AudioContext + shared master compressor for SFX synthesis
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  const getContext = (): AudioContext | null => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      } catch (err) {
        console.warn("Web Audio API not supported:", err);
        return null;
      }
    }
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }

    // Create a master compressor/limiter once and reuse it for all SFX
    if (ctx && !compressorRef.current) {
      const comp = ctx.createDynamicsCompressor();
      // Moderate limiting settings to normalize music volumes
      comp.threshold.setValueAtTime(-15, ctx.currentTime);
      comp.knee.setValueAtTime(10, ctx.currentTime);
      comp.ratio.setValueAtTime(6, ctx.currentTime);
      comp.attack.setValueAtTime(0.005, ctx.currentTime);
      comp.release.setValueAtTime(0.20, ctx.currentTime);
      comp.connect(ctx.destination);
      compressorRef.current = comp;
    }

    return ctx;
  };

  // Returns the master compressor output node (or destination as fallback)
  const getOutput = (): AudioNode | null => {
    const ctx = getContext();
    if (!ctx) return null;
    return compressorRef.current ?? ctx.destination;
  };

  const playClip = (url: string, durationSec: number) => {
    if (!audioRef.current) return;

    stopClip();
    const ctx = getContext();
    const out = getOutput();

    // Connect Media Element to context to enable volume normalization
    if (ctx && out && !sourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        const gainNode = ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(out);
        sourceRef.current = source;
        musicGainRef.current = gainNode;
      } catch (err) {
        console.warn("[Audio] createMediaElementSource failed:", err);
      }
    }

    const targetVol = musicVolume * 0.75;
    if (musicGainRef.current && ctx) {
      musicGainRef.current.gain.setValueAtTime(targetVol, ctx.currentTime);
    }
    audioRef.current.volume = targetVol;
    audioRef.current.src = url;

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        console.log(`[Audio] Playing preview clip for ${durationSec}s`);

        timerRef.current = setTimeout(() => {
          stopClip();
        }, durationSec * 1000);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Audio] Error playing track:", err.message);
        }
      });
  };

  const stopClip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const getAnalyserData = (): Uint8Array | null => {
    return null;
  };

  // Synthesized Sound Effects — all routed through master compressor

  // 1. Button click: short blip dropping in pitch
  const playClickSFX = () => {
    const ctx = getContext();
    const out = getOutput();
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(out);

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(sfxVolume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  };

  // 2. Timer warning tick
  const playTickSFX = () => {
    const ctx = getContext();
    const out = getOutput();
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(out);

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(sfxVolume * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  };

  // 3. Correct answer: upward C-Major arpeggio chime (louder and longer)
  const playCorrectSFX = () => {
    const ctx = getContext();
    const out = getOutput();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(out);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(sfxVolume * 0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    };

    // Upward C-Major arpeggio (staggered so they don't all stack at once)
    playTone(523.25, now,        0.35); // C5
    playTone(659.25, now + 0.09, 0.35); // E5
    playTone(783.99, now + 0.18, 0.40); // G5
    playTone(1046.5, now + 0.27, 0.65); // C6 finish
  };

  // 4. Incorrect answer: two descending sine tones (dissonant but not harsh, louder and longer)
  const playIncorrectSFX = () => {
    const ctx = getContext();
    const out = getOutput();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const playDrop = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(out);

      osc.type = "triangle"; // Triangle is slightly warmer/brasser than sine
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.50, now + delay + 0.45);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(sfxVolume * 0.48, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.48);

      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    };

    playDrop(380, 0);    // descending drop
    playDrop(320, 0.06); // slight delay for chord dissonance
  };

  return {
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
  };
}
export default useAudio;

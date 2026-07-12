import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import axios from "axios";

// Dynamic API URL resolving to the production URL, otherwise local development
export const API_URL = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export interface GameSettings {
  numSongs: number;
  answerDuration: number;
  clipDuration: number;
  genres: string[];
  difficulty: "Easy" | "Normal" | "Hard";
  playlistUrl?: string;
}

export interface Choice {
  id: string;
  title: string;
  artist: string;
}

export interface ClientRound {
  roundNumber: number;
  questionId: string;
  previewUrl: string;
  choices: Choice[];
}

export interface GameTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  previewUrl: string;
  artworkUrl: string;
  album: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  score: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  totalTimeTaken?: number;
  lastScoreAdded?: number;
  lastAnswerCorrect?: boolean | null;
  selectedChoiceId?: string | null;
  timeRemainingSec?: number;
}

export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

interface GameState {
  // Connection and client
  socket: Socket | null;
  playerName: string;
  playerAvatar: string;
  
  // Game states
  mode: "single" | "multi" | null;
  status: "home" | "setup" | "lobby" | "playing" | "reveal" | "result";
  loading: boolean;
  loadingMessage: string | null;
  
  // Multiplayer room state
  roomCode: string | null;
  roomName: string;
  isHost: boolean;
  players: Player[];
  settings: GameSettings;
  chatMessages: ChatMessage[];
  
  // Game session state
  rounds: ClientRound[];
  currentRoundIdx: number;
  timer: number;
  selectedChoiceId: string | null;
  correctAnswer: GameTrack | null;
  
  // Singleplayer specific score tracking
  singlePlayerScore: number;
  singlePlayerStats: {
    correct: number;
    wrong: number;
    timeTaken: number;
  };
  singlePlayerStreak: number;
  singlePlayerMaxCombo: number;
  singlePlayerLastScoreAdded: number;
  
  language: "th" | "en";
  setLanguage: (lang: "th" | "en") => void;
  setMode: (mode: "single" | "multi" | null) => void;
  setStatus: (status: "home" | "setup" | "lobby" | "playing" | "reveal" | "result") => void;
  setPlayerInfo: (name: string, avatar: string) => void;
  initializeSocket: () => Socket;
  createRoom: (roomName: string, password?: string, maxPlayers?: number) => void;
  joinRoom: (code: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  toggleReady: () => void;
  updateSettings: (settings: GameSettings) => void;
  sendMessage: (text: string) => void;
  startGame: () => void;
  submitGuess: (choiceId: string, timeRemaining: number) => void;
  
  // Leaderboard state
  leaderboard: Array<{ name: string; avatar: string; score: number; songCount: number; maxCombo?: number; date: string }>;
  fetchLeaderboard: (songCount?: number) => Promise<void>;
  saveHighScore: (score: number, songCountOverride?: number) => Promise<void>;
  highScoreSaved: boolean;
  countdown: number | null;
  presetPlaylists: Array<{ name: string; url: string; imageUrl: string; trackCount: number; isDefault: boolean }>;
  selectedPlaylistInfo: { name: string; url: string; imageUrl: string | null; trackCount: number } | null;
  fetchPresetPlaylists: () => Promise<void>;
  setSelectedPlaylist: (url: string) => Promise<void>;

  // Singleplayer actions
  startSingleplayer: (settings: GameSettings) => Promise<void>;
  submitSingleplayerGuess: (choiceId: string, timeRemaining: number) => void;
  revealSingleplayerRound: () => Promise<void>;
  nextSingleplayerRound: () => void;
  resetSingleplayer: () => void;
}

const getBrowserLanguage = (): "th" | "en" => {
  const saved = localStorage.getItem("wutdasong_lang");
  if (saved === "th" || saved === "en") return saved;
  const browserLang = navigator.language || (navigator as any).userLanguage || "en";
  return browserLang.toLowerCase().startsWith("th") ? "th" : "en";
};

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  playerName: localStorage.getItem("wutdasong_name") || "",
  playerAvatar: localStorage.getItem("wutdasong_avatar") || "🎧",
  
  mode: (sessionStorage.getItem("wutdasong_mode") as any) || null,
  status: (sessionStorage.getItem("wutdasong_status") as any) || "home",
  loading: false,
  loadingMessage: null,
  
  roomCode: null,
  roomName: "",
  isHost: false,
  players: [],
  settings: {
    numSongs: 10,
    answerDuration: 10,
    clipDuration: 5,
    genres: ["Random"],
    difficulty: "Normal"
  },
  chatMessages: [],
  
  rounds: [],
  currentRoundIdx: 0,
  timer: 0,
  selectedChoiceId: null,
  correctAnswer: null,
  
  singlePlayerScore: 0,
  singlePlayerStats: {
    correct: 0,
    wrong: 0,
    timeTaken: 0
  },
  singlePlayerStreak: 0,
  singlePlayerMaxCombo: 0,
  singlePlayerLastScoreAdded: 0,
  
  leaderboard: [],
  highScoreSaved: false,
  countdown: null,
  presetPlaylists: [],
  selectedPlaylistInfo: null,

  language: getBrowserLanguage(),
  setLanguage: (lang) => {
    localStorage.setItem("wutdasong_lang", lang);
    set({ language: lang });
  },

  setMode: (mode) => {
    if (mode) sessionStorage.setItem("wutdasong_mode", mode);
    else sessionStorage.removeItem("wutdasong_mode");
    set({ mode });
  },
  setStatus: (status) => {
    sessionStorage.setItem("wutdasong_status", status);
    set({ status });
  },
  setPlayerInfo: (name, avatar) => {
    localStorage.setItem("wutdasong_name", name);
    localStorage.setItem("wutdasong_avatar", avatar);
    set({ playerName: name, playerAvatar: avatar });
  },

  initializeSocket: () => {
    const existingSocket = get().socket;
    if (existingSocket) return existingSocket;

    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log("[Socket] Connected to server.");
    });

    socket.on("room_updated", (room: any) => {
      const isHost = room.hostId === socket.id;
      set({
        roomCode: room.code,
        roomName: room.name,
        isHost,
        players: room.players,
        settings: room.settings,
        status: room.state === "lobby" ? "lobby" : get().status, // Keep screen sync
      });
    });

    socket.on("loading_game", (data: { message: string }) => {
      set({ loading: true, loadingMessage: data.message });
    });

    socket.on("game_starting", (data: { countdown: number }) => {
      set({ countdown: data.countdown, loading: false, loadingMessage: null });
      const interval = setInterval(() => {
        const currentVal = get().countdown;
        if (currentVal !== null && currentVal > 1) {
          set({ countdown: currentVal - 1 });
        } else {
          set({ countdown: null });
          clearInterval(interval);
        }
      }, 1000);
    });

    socket.on("start_game_error", (data: { error: string }) => {
      set({ loading: false, loadingMessage: null });
      alert(data.error);
    });

    socket.on("round_start", (data: { roundData: any; clipDuration: number; answerDuration: number }) => {
      // Set playing state and update current round indices
      set((state) => {
        const clientRound: ClientRound = {
          roundNumber: data.roundData.roundNumber,
          questionId: data.roundData.questionId,
          previewUrl: data.roundData.previewUrl,
          choices: data.roundData.choices
        };

        const existingRounds = [...state.rounds];
        existingRounds[data.roundData.roundNumber - 1] = clientRound;

        return {
          status: "playing",
          loading: false,
          loadingMessage: null,
          rounds: existingRounds,
          currentRoundIdx: data.roundData.roundNumber - 1,
          timer: data.answerDuration,
          selectedChoiceId: null,
          correctAnswer: null,
          highScoreSaved: false,
        };
      });
    });

    socket.on("timer_tick", (data: { timerValue: number }) => {
      set({ timer: data.timerValue });
    });

    socket.on("player_guessed", (data: { playerId: string }) => {
      // Mark player as guessed in list
      set((state) => ({
        players: state.players.map((p) =>
          p.id === data.playerId ? { ...p, selectedChoiceId: "locked" } : p
        )
      }));
    });

    socket.on("round_reveal", (data: { answer: GameTrack; players: Player[] }) => {
      set({
        status: "reveal",
        correctAnswer: data.answer,
        players: data.players
      });
    });

    socket.on("game_results", (data: { players: Player[] }) => {
      set({
        status: "result",
        players: data.players
      });
    });

    socket.on("chat_message", (msg: ChatMessage) => {
      set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server.");
      const currentStatus = get().status;
      const insideRoom = get().roomCode !== null;
      const nextStatus = insideRoom ? "home" : currentStatus;
      
      if (nextStatus === "home") {
        sessionStorage.setItem("wutdasong_status", "home");
        sessionStorage.removeItem("wutdasong_mode");
      }
      
      set({ socket: null, roomCode: null, isHost: false, status: nextStatus, countdown: null });
    });

    set({ socket });
    return socket;
  },

  createRoom: (roomName, password, maxPlayers = 8) => {
    const socket = get().initializeSocket();
    const { playerName, playerAvatar, settings } = get();

    socket.emit("create_room", {
      hostName: playerName,
      hostAvatar: playerAvatar,
      settings,
      roomName,
      password,
      maxPlayers
    });
  },

  joinRoom: async (code, password): Promise<boolean> => {
    const socket = get().initializeSocket();
    const { playerName, playerAvatar } = get();

    return new Promise((resolve) => {
      socket.emit(
        "join_room",
        {
          code,
          playerName,
          playerAvatar,
          password
        },
        (res: { success: boolean; error?: string }) => {
          if (res.success) {
            set({ chatMessages: [] });
            resolve(true);
          } else {
            // If the error is not password-related, show alert
            if (res.error !== "Incorrect password." && res.error !== "Password required.") {
              alert(res.error || "Failed to join room.");
            }
            resolve(false);
          }
        }
      );
    });
  },

  leaveRoom: () => {
    const { socket, roomCode } = get();
    if (socket && roomCode) {
      socket.emit("leave_room");
      set({ roomCode: null, isHost: false, status: "home", chatMessages: [], countdown: null });
    }
  },

  toggleReady: () => {
    const { socket, roomCode } = get();
    if (socket && roomCode) {
      socket.emit("toggle_ready", { code: roomCode });
    }
  },

  updateSettings: (newSettings) => {
    const { socket, roomCode, isHost } = get();
    set({ settings: newSettings });

    // Sync settings to server if host
    if (socket && roomCode && isHost) {
      socket.emit("update_settings", { code: roomCode, settings: newSettings });
    }
  },

  sendMessage: (text) => {
    const { socket, roomCode, playerName } = get();
    if (socket && roomCode && text.trim()) {
      socket.emit("send_message", {
        code: roomCode,
        sender: playerName,
        text
      });
    }
  },

  startGame: () => {
    const { socket, roomCode, isHost } = get();
    if (socket && roomCode && isHost) {
      socket.emit("start_game", { code: roomCode });
    }
  },

  submitGuess: (choiceId, timeRemaining) => {
    const { socket, roomCode, rounds, currentRoundIdx } = get();
    if (socket && roomCode && rounds[currentRoundIdx]) {
      set({ selectedChoiceId: choiceId });
      socket.emit("submit_guess", {
        code: roomCode,
        questionId: rounds[currentRoundIdx].questionId,
        choiceId,
        timeRemainingSec: timeRemaining
      });
    }
  },

  // Singleplayer Specific Actions
  startSingleplayer: async (settings) => {
    set({ loading: true, loadingMessage: "Loading songs from API...", settings });
    try {
      const response = await axios.post(`${API_URL}/api/singleplayer/start`, { settings });
      set({
        rounds: response.data.rounds,
        currentRoundIdx: 0,
        status: "playing",
        loading: false,
        loadingMessage: null,
        timer: settings.answerDuration,
        selectedChoiceId: null,
        correctAnswer: null,
        singlePlayerScore: 0,
        singlePlayerStats: { correct: 0, wrong: 0, timeTaken: 0 },
        singlePlayerStreak: 0,
        singlePlayerMaxCombo: 0,
        singlePlayerLastScoreAdded: 0,
        highScoreSaved: false
      });
    } catch (error: any) {
      set({ loading: false, loadingMessage: null });
      alert(error.response?.data?.error || "Error connecting to backend server.");
    }
  },

  submitSingleplayerGuess: (choiceId, exactTimeRemaining) => {
    set({ selectedChoiceId: choiceId, timer: exactTimeRemaining });
  },

  revealSingleplayerRound: async () => {
    const { rounds, currentRoundIdx, selectedChoiceId, settings, timer, status, loading } = get();
    if (status === "reveal" || loading) return;
    
    const currentRound = rounds[currentRoundIdx];
    set({ loading: true });
    try {
      const response = await axios.post(`${API_URL}/api/singleplayer/reveal`, {
        questionId: currentRound.questionId
      });
      
      const answer: GameTrack = response.data.answer;
      const isCorrect = selectedChoiceId === answer.id;
      
      let scoreAdded = 0;
      let timeTakenForRound = settings.answerDuration;
      let nextStreak = get().singlePlayerStreak;
      let nextMaxCombo = get().singlePlayerMaxCombo;
      
      if (isCorrect) {
        timeTakenForRound = Math.max(0, settings.answerDuration - timer);
        // Formula: [100 + (10 * timer)] * nextStreak
        const baseScore = Math.round(100 + (10 * timer));
        
        nextStreak += 1;
        nextMaxCombo = Math.max(nextMaxCombo, nextStreak);
        scoreAdded = baseScore * nextStreak;
      } else {
        nextStreak = 0;
      }

      set((state) => ({
        loading: false,
        status: "reveal",
        correctAnswer: answer,
        singlePlayerScore: state.singlePlayerScore + scoreAdded,
        singlePlayerStreak: nextStreak,
        singlePlayerMaxCombo: nextMaxCombo,
        singlePlayerLastScoreAdded: scoreAdded,
        singlePlayerStats: {
          correct: state.singlePlayerStats.correct + (isCorrect ? 1 : 0),
          wrong: state.singlePlayerStats.wrong + (isCorrect ? 0 : 1),
          timeTaken: state.singlePlayerStats.timeTaken + timeTakenForRound
        }
      }));
    } catch (error) {
      set({ loading: false });
      alert("Error revealing round details.");
    }
  },

  nextSingleplayerRound: () => {
    const { currentRoundIdx, rounds, settings } = get();
    if (currentRoundIdx + 1 < rounds.length) {
      set({
        currentRoundIdx: currentRoundIdx + 1,
        status: "playing",
        selectedChoiceId: null,
        correctAnswer: null,
        timer: settings.answerDuration
      });
    } else {
      set({ status: "result" });
    }
  },

  fetchLeaderboard: async (songCount = 10) => {
    try {
      const res = await axios.get(`${API_URL}/api/leaderboard`, {
        params: { songCount }
      });
      set({ leaderboard: res.data });
    } catch (err) {
      console.error("[Leaderboard] Error fetching leaderboard:", err);
    }
  },

  saveHighScore: async (score: number, songCountOverride?: number) => {
    const { playerName, playerAvatar, settings, highScoreSaved, singlePlayerMaxCombo, socket } = get();
    if (!playerName.trim() || highScoreSaved) return;

    set({ highScoreSaved: true });

    const count = typeof songCountOverride === "number" ? songCountOverride : settings.numSongs;

    // Get maxCombo. For multiplayer, find player maxCombo. For singleplayer, use singlePlayerMaxCombo.
    let finalMaxCombo = singlePlayerMaxCombo;
    if (socket) {
      const myPlayer = get().players.find((p) => p.id === socket.id);
      if (myPlayer && typeof (myPlayer as any).maxCombo === "number") {
        finalMaxCombo = (myPlayer as any).maxCombo;
      }
    }

    try {
      await axios.post(`${API_URL}/api/leaderboard`, {
        name: playerName,
        avatar: playerAvatar,
        score,
        songCount: count,
        maxCombo: finalMaxCombo
      });
      // Refresh local copy with current setting
      await get().fetchLeaderboard(count);
    } catch (err) {
      console.error("[Leaderboard] Error saving high score:", err);
    }
  },

  resetSingleplayer: () => {
    set({
      rounds: [],
      currentRoundIdx: 0,
      selectedChoiceId: null,
      correctAnswer: null,
      singlePlayerScore: 0,
      singlePlayerStats: { correct: 0, wrong: 0, timeTaken: 0 },
      singlePlayerStreak: 0,
      singlePlayerMaxCombo: 0,
      singlePlayerLastScoreAdded: 0,
      highScoreSaved: false
    });
  },

  fetchPresetPlaylists: async () => {
    try {
      const res = await axios.get(`${API_URL}/api/playlists`);
      set({ presetPlaylists: res.data });
      
      // Auto-select default if none selected or if selected is not valid
      const defaultPl = res.data.find((p: any) => p.isDefault) || res.data[0];
      if (defaultPl && !get().selectedPlaylistInfo) {
        set({
          selectedPlaylistInfo: {
            name: defaultPl.name,
            url: defaultPl.url,
            imageUrl: defaultPl.imageUrl,
            trackCount: defaultPl.trackCount
          }
        });
      }
    } catch (err) {
      console.error("[Presets] Error fetching presets:", err);
    }
  },

  setSelectedPlaylist: async (url: string) => {
    // If it's a URL in our presets, use stored metadata
    const presets = get().presetPlaylists;
    const matched = presets.find((p) => p.url === url || p.url.includes(url) || url.includes(p.url));
    if (matched) {
      set({
        selectedPlaylistInfo: {
          name: matched.name,
          url: matched.url,
          imageUrl: matched.imageUrl,
          trackCount: matched.trackCount
        }
      });
      return;
    }

    // Otherwise, it's a custom URL. Let's try to query /api/playlist-info from server
    if (!url.trim()) {
      set({ selectedPlaylistInfo: null });
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/api/playlist-info`, {
        params: { url }
      });
      set({
        selectedPlaylistInfo: {
          name: res.data.name,
          url: url,
          imageUrl: res.data.imageUrl,
          trackCount: res.data.trackCount
        }
      });
    } catch (err) {
      console.warn("[Presets] Error resolving playlist URL:", err);
      // Fallback
      set({
        selectedPlaylistInfo: {
          name: "Custom Spotify Playlist",
          url: url,
          imageUrl: null,
          trackCount: 0
        }
      });
    }
  }
}));
export default useGameStore;

import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import axios from "axios";

// Dynamic API URL resolving to the production URL, otherwise local development
const API_URL = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000`;

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
  
  // Singleplayer actions
  startSingleplayer: (settings: GameSettings) => Promise<void>;
  submitSingleplayerGuess: (choiceId: string, timeRemaining: number) => void;
  revealSingleplayerRound: () => Promise<void>;
  nextSingleplayerRound: () => void;
  resetSingleplayer: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  playerName: localStorage.getItem("wutdasong_name") || "",
  playerAvatar: localStorage.getItem("wutdasong_avatar") || "🎧",
  
  mode: null,
  status: "home",
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

  language: (localStorage.getItem("wutdasong_lang") as "th" | "en") || "th",
  setLanguage: (lang) => {
    localStorage.setItem("wutdasong_lang", lang);
    set({ language: lang });
  },

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
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
      set({ socket: null, roomCode: null, isHost: false, status: "home" });
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
            alert(res.error || "Failed to join room.");
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
      set({ roomCode: null, isHost: false, status: "home", chatMessages: [] });
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
        singlePlayerStats: { correct: 0, wrong: 0, timeTaken: 0 }
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
    const { rounds, currentRoundIdx, selectedChoiceId, settings, timer, singlePlayerScore, status, loading } = get();
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
      
      if (isCorrect) {
        timeTakenForRound = Math.max(0, settings.answerDuration - timer);
        // Multiply exact float remaining seconds by 100 for high-score precision (e.g., 9.85s = 985 bonus)
        const bonus = Math.round(timer * 100);
        scoreAdded = 100 + bonus;
      }

      set((state) => ({
        loading: false,
        status: "reveal",
        correctAnswer: answer,
        singlePlayerScore: singlePlayerScore + scoreAdded,
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

  resetSingleplayer: () => {
    set({
      rounds: [],
      currentRoundIdx: 0,
      selectedChoiceId: null,
      correctAnswer: null,
      singlePlayerScore: 0,
      singlePlayerStats: { correct: 0, wrong: 0, timeTaken: 0 }
    });
  }
}));
export default useGameStore;

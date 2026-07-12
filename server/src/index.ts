import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import musicService, { RoundData, GameTrack } from "./services/musicService";
import roomManager, { Room } from "./game/RoomManager";
import GameEngine, { GameSettings } from "./game/GameEngine";
import { connectDB, Leaderboard, IssueReport } from "./db/mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory cache for singleplayer rounds to keep answers secure from clients
const singleplayerAnswers = new Map<string, GameTrack>();

// Test endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Single Player Start Route
app.post("/api/singleplayer/start", async (req, res) => {
  try {
    const settings: GameSettings = req.body.settings;
    if (!settings) {
      return res.status(400).json({ error: "Missing settings configuration." });
    }

    const rounds = await musicService.generateGameRounds(
      settings.genres,
      settings.numSongs,
      settings.playlistUrl
    );
    
    // Store answers in cache, scrub them from the response
    const clientRounds = rounds.map((round) => {
      singleplayerAnswers.set(round.questionId, round.secretAnswer);
      return {
        roundNumber: round.roundNumber,
        questionId: round.questionId,
        previewUrl: round.previewUrl,
        choices: round.choices,
      };
    });

    res.json({ rounds: clientRounds });
  } catch (error: any) {
    console.error("[Singleplayer] Error starting game:", error.message);
    res.status(500).json({ error: "Failed to generate game playlist: " + error.message });
  }
});

// Playlist Info Preview Route
app.get("/api/playlist-info", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing playlist URL." });
    }
    const playlistId = musicService.extractPlaylistId(url);
    if (!playlistId) {
      return res.status(400).json({ error: "Invalid Spotify playlist URL." });
    }
    const info = await musicService.fetchPlaylistInfo(playlistId);
    if (!info) {
      return res.status(404).json({ error: "Could not fetch playlist info. Make sure the playlist is public." });
    }
    res.json(info);
  } catch (error: any) {
    console.error("[PlaylistInfo] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Single Player Reveal Route
app.post("/api/singleplayer/reveal", (req, res) => {
  const { questionId } = req.body;
  if (!questionId) {
    return res.status(400).json({ error: "Missing questionId." });
  }

  const answer = singleplayerAnswers.get(questionId);
  if (!answer) {
    return res.status(404).json({ error: "Answer not found or already revealed." });
  }

  // Clean up cache to prevent memory leaks
  singleplayerAnswers.delete(questionId);

  res.json({ answer });
});

// Leaderboard: Fetch top 100 players (or paginated) filtered by songCount
app.get("/api/leaderboard", async (req, res) => {
  try {
    const songCount = parseInt(req.query.songCount as string) || 10;
    const list = await Leaderboard.find({ songCount }).sort({ score: -1 }).limit(100);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch leaderboard: " + err.message });
  }
});

// Leaderboard: Check if username already exists
app.get("/api/leaderboard/check-name", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.json({ exists: false });
    const count = await Leaderboard.countDocuments({ name: String(name).trim() });
    res.json({ exists: count > 0 });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to check name: " + err.message });
  }
});

// Leaderboard: Post a new score, scoped by name AND songCount (guarantees atomic single record)
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { name, avatar, score, songCount, maxCombo } = req.body;
    const targetSongCount = typeof songCount === "number" ? songCount : 10;

    if (!name || typeof score !== "number") {
      return res.status(400).json({ error: "Name and score are required." });
    }

    // Atomic find and update or insert if not exists
    const record = await Leaderboard.findOneAndUpdate(
      { name, songCount: targetSongCount },
      {
        $set: {
          avatar,
          score,
          maxCombo: typeof maxCombo === "number" ? maxCombo : 1,
          date: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, record });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save high score: " + err.message });
  }
});

// Report issue feedback endpoint
app.post("/api/issues", async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required." });
    }
    const newIssue = new IssueReport({ description });
    await newIssue.save();
    res.json({ success: true, message: "Issue reported successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to submit issue: " + err.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all during development
    methods: ["GET", "POST"],
  },
});

// Helper: Broadcast room updates
const broadcastRoomUpdate = (roomCode: string) => {
  const room = roomManager.getRoom(roomCode);
  if (room) {
    // Send safe data
    const safeRoom = {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      players: room.players,
      settings: room.settings,
      state: room.state,
      timerValue: room.timerValue,
      maxPlayers: room.maxPlayers
    };
    io.to(roomCode).emit("room_updated", safeRoom);
  }
};

// Multiplayer loop routines
const startMultiplayerRound = async (roomCode: string) => {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  const game = room.game;
  const currentRoundData = game.getCurrentRoundClientData();
  
  if (!currentRoundData) {
    console.log(`[Socket] Could not retrieve round data for room ${roomCode}`);
    return;
  }

  room.state = "playing";
  room.timerValue = room.settings.answerDuration;
  broadcastRoomUpdate(roomCode);

  // Emit round start event to all clients
  io.to(roomCode).emit("round_start", {
    roundData: currentRoundData,
    clipDuration: room.settings.clipDuration,
    answerDuration: room.settings.answerDuration
  });

  console.log(`[Game] Room ${roomCode} - Started Round ${game.currentRoundIdx + 1}/${game.rounds.length}`);

  // Clear any existing timers
  if (room.activeTimer) {
    clearInterval(room.activeTimer);
  }

  // Set up live countdown ticker
  room.activeTimer = setInterval(() => {
    room.timerValue--;
    io.to(roomCode).emit("timer_tick", { timerValue: room.timerValue });

    const activePlayerIds = room.players.map((p) => p.id);
    const everyoneAnswered = game.haveAllPlayersGuessed(activePlayerIds);

    // If timer reaches 0 or all players have guessed, reveal answers
    if (room.timerValue <= 0 || everyoneAnswered) {
      if (room.activeTimer) {
        clearInterval(room.activeTimer);
      }
      revealMultiplayerAnswers(roomCode);
    }
  }, 1000);
};

const revealMultiplayerAnswers = (roomCode: string) => {
  const room = roomManager.getRoom(roomCode);
  if (!room || !room.game) return;

  const game = room.game;
  const { secretAnswer, playerResults } = game.revealRoundAnswers();
  room.state = "reveal";
  broadcastRoomUpdate(roomCode);

  // Emit round reveal with answers and updated scores
  io.to(roomCode).emit("round_reveal", {
    answer: secretAnswer,
    players: playerResults
  });

  console.log(`[Game] Room ${roomCode} - Revealed Round ${game.currentRoundIdx + 1} answer: ${secretAnswer.title}`);

  // Wait 3 seconds, then progress
  setTimeout(() => {
    const hasNext = game.nextRound();
    if (hasNext) {
      startMultiplayerRound(roomCode);
    } else {
      // Game finished
      room.state = "result";
      broadcastRoomUpdate(roomCode);
      io.to(roomCode).emit("game_results", {
        players: Array.from(game.players.values())
      });
      console.log(`[Game] Room ${roomCode} - Game finished. Showing results.`);
    }
  }, 4000); // 4 seconds delay for reveal so players can view results
};

io.on("connection", (socket: Socket) => {
  console.log(`[Socket] Player connected: ${socket.id}`);

  // Create Room
  socket.on("create_room", (data: {
    hostName: string;
    hostAvatar: string;
    settings: GameSettings;
    roomName: string;
    password?: string;
    maxPlayers?: number;
  }) => {
    const room = roomManager.createRoom(
      socket.id,
      data.hostName,
      data.hostAvatar,
      data.settings,
      data.roomName,
      data.password,
      data.maxPlayers
    );
    
    socket.join(room.code);
    broadcastRoomUpdate(room.code);
  });

  // Join Room
  socket.on("join_room", (data: {
    code: string;
    playerName: string;
    playerAvatar: string;
    password?: string;
  }, callback: (response: { success: boolean; error?: string }) => void) => {
    const result = roomManager.joinRoom(
      data.code,
      socket.id,
      data.playerName,
      data.playerAvatar,
      data.password
    );

    if (result.error) {
      return callback({ success: false, error: result.error });
    }

    socket.join(data.code.toUpperCase());
    broadcastRoomUpdate(data.code);
    
    // Notify room of player arrival
    socket.to(data.code.toUpperCase()).emit("chat_message", {
      sender: "System",
      text: `${data.playerName} has joined the lobby!`,
      timestamp: Date.now()
    });

    callback({ success: true });
  });

  // Ready Status
  socket.on("toggle_ready", (data: { code: string }) => {
    const room = roomManager.toggleReady(data.code, socket.id);
    if (room) {
      broadcastRoomUpdate(room.code);
    }
  });

  // Room Settings Update (Host only)
  socket.on("update_settings", (data: { code: string; settings: GameSettings }) => {
    const room = roomManager.getRoom(data.code);
    if (room && room.hostId === socket.id && room.state === "lobby") {
      room.settings = data.settings;
      broadcastRoomUpdate(room.code);
    }
  });

  // Chat message
  socket.on("send_message", (data: { code: string; sender: string; text: string }) => {
    io.to(data.code.toUpperCase()).emit("chat_message", {
      sender: data.sender,
      text: data.text,
      timestamp: Date.now()
    });
  });

  // Start game (Host only)
  socket.on("start_game", async (data: { code: string }) => {
    const room = roomManager.getRoom(data.code);
    if (!room || room.hostId !== socket.id || room.state !== "lobby") return;

    // Check if all players are ready
    const allReady = room.players.every(p => p.id === room.hostId || p.isReady);
    if (!allReady) {
      return socket.emit("start_game_error", { error: "All players must be ready before starting!" });
    }

    try {
      io.to(room.code).emit("loading_game", { message: "Generating dynamic playlist from Spotify..." });
      
      const rounds = await musicService.generateGameRounds(
        room.settings.genres,
        room.settings.numSongs,
        room.settings.playlistUrl
      );

      const game = new GameEngine(room.settings);
      
      // Load all room players into engine
      for (const p of room.players) {
        game.addPlayer(p.id, p.name, p.avatar);
      }

      await game.initialize(rounds);
      room.game = game;
      
      // Send game starting event with 5s countdown
      io.to(room.code).emit("game_starting", { countdown: 5 });

      // Start gameplay sequence after 5 seconds
      setTimeout(async () => {
        const activeRoom = roomManager.getRoom(data.code);
        if (activeRoom && activeRoom.game && activeRoom.state === "lobby") {
          await startMultiplayerRound(activeRoom.code);
        }
      }, 5000);

    } catch (err: any) {
      console.error("[Socket Start Game Error]:", err.message);
      io.to(room.code).emit("start_game_error", { error: "Failed to generate dynamic playlist: " + err.message });
    }
  });

  // Submit Guess
  socket.on("submit_guess", (data: {
    code: string;
    questionId: string;
    choiceId: string;
    timeRemainingSec: number;
  }) => {
    const room = roomManager.getRoom(data.code);
    if (!room || !room.game || room.state !== "playing") return;

    const success = room.game.submitGuess(
      socket.id,
      data.questionId,
      data.choiceId,
      data.timeRemainingSec
    );

    if (success) {
      // Notify other players in room (so UI can show checkmarks / lock status)
      io.to(room.code).emit("player_guessed", { playerId: socket.id });
      
      // Trigger instant check
      const activePlayerIds = room.players.map((p) => p.id);
      if (room.game.haveAllPlayersGuessed(activePlayerIds)) {
        if (room.activeTimer) {
          clearInterval(room.activeTimer);
        }
        revealMultiplayerAnswers(room.code);
      }
    }
  });

  // Disconnect & Room exit handling
  socket.on("leave_room", () => {
    handleDisconnect(socket);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

const handleDisconnect = (socket: Socket) => {
  const result = roomManager.leaveRoom(socket.id);
  if (result) {
    const { roomCode, playerLeftName, roomDeleted, roomUpdated } = result;
    
    if (roomDeleted) {
      console.log(`[Socket] Player ${playerLeftName} left. Room ${roomCode} destroyed.`);
    } else {
      console.log(`[Socket] Player ${playerLeftName} left Room ${roomCode}.`);
      
      // Notify remaining players in chat
      io.to(roomCode).emit("chat_message", {
        sender: "System",
        text: `${playerLeftName} has left the game.`,
        timestamp: Date.now()
      });

      broadcastRoomUpdate(roomCode);

      // If playing, check if this triggers all players guessed
      if (roomUpdated && roomUpdated.game && roomUpdated.state === "playing") {
        const game = roomUpdated.game;
        const activePlayerIds = roomUpdated.players.map((p) => p.id);
        
        if (game.haveAllPlayersGuessed(activePlayerIds)) {
          if (roomUpdated.activeTimer) {
            clearInterval(roomUpdated.activeTimer);
          }
          revealMultiplayerAnswers(roomCode);
        }
      }
    }
  }
};

const startServer = async () => {
  // Connect to database first
  await connectDB(process.env.MONGO_URI);

  server.listen(port, () => {
    console.log(`[Server] Guess The Song Server running on port ${port}`);
  });
};

startServer();

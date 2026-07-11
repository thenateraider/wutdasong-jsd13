"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const musicService_1 = __importDefault(require("./services/musicService"));
const RoomManager_1 = __importDefault(require("./game/RoomManager"));
const GameEngine_1 = __importDefault(require("./game/GameEngine"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// In-memory cache for singleplayer rounds to keep answers secure from clients
const singleplayerAnswers = new Map();
// Test endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date() });
});
// Single Player Start Route
app.post("/api/singleplayer/start", async (req, res) => {
    try {
        const settings = req.body.settings;
        if (!settings) {
            return res.status(400).json({ error: "Missing settings configuration." });
        }
        const rounds = await musicService_1.default.generateGameRounds(settings.genres, settings.numSongs, settings.playlistUrl);
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
    }
    catch (error) {
        console.error("[Singleplayer] Error starting game:", error.message);
        res.status(500).json({ error: "Failed to generate game playlist: " + error.message });
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
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // Allow all during development
        methods: ["GET", "POST"],
    },
});
// Helper: Broadcast room updates
const broadcastRoomUpdate = (roomCode) => {
    const room = RoomManager_1.default.getRoom(roomCode);
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
const startMultiplayerRound = async (roomCode) => {
    const room = RoomManager_1.default.getRoom(roomCode);
    if (!room || !room.game)
        return;
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
const revealMultiplayerAnswers = (roomCode) => {
    const room = RoomManager_1.default.getRoom(roomCode);
    if (!room || !room.game)
        return;
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
        }
        else {
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
io.on("connection", (socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);
    // Create Room
    socket.on("create_room", (data) => {
        const room = RoomManager_1.default.createRoom(socket.id, data.hostName, data.hostAvatar, data.settings, data.roomName, data.password, data.maxPlayers);
        socket.join(room.code);
        broadcastRoomUpdate(room.code);
    });
    // Join Room
    socket.on("join_room", (data, callback) => {
        const result = RoomManager_1.default.joinRoom(data.code, socket.id, data.playerName, data.playerAvatar, data.password);
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
    socket.on("toggle_ready", (data) => {
        const room = RoomManager_1.default.toggleReady(data.code, socket.id);
        if (room) {
            broadcastRoomUpdate(room.code);
        }
    });
    // Room Settings Update (Host only)
    socket.on("update_settings", (data) => {
        const room = RoomManager_1.default.getRoom(data.code);
        if (room && room.hostId === socket.id && room.state === "lobby") {
            room.settings = data.settings;
            broadcastRoomUpdate(room.code);
        }
    });
    // Chat message
    socket.on("send_message", (data) => {
        io.to(data.code.toUpperCase()).emit("chat_message", {
            sender: data.sender,
            text: data.text,
            timestamp: Date.now()
        });
    });
    // Start game (Host only)
    socket.on("start_game", async (data) => {
        const room = RoomManager_1.default.getRoom(data.code);
        if (!room || room.hostId !== socket.id || room.state !== "lobby")
            return;
        try {
            io.to(room.code).emit("loading_game", { message: "Generating dynamic playlist from Spotify..." });
            const rounds = await musicService_1.default.generateGameRounds(room.settings.genres, room.settings.numSongs, room.settings.playlistUrl);
            const game = new GameEngine_1.default(room.settings);
            // Load all room players into engine
            for (const p of room.players) {
                game.addPlayer(p.id, p.name, p.avatar);
            }
            await game.initialize(rounds);
            room.game = game;
            // Start gameplay sequence
            await startMultiplayerRound(room.code);
        }
        catch (err) {
            console.error("[Socket Start Game Error]:", err.message);
            io.to(room.code).emit("start_game_error", { error: "Failed to generate dynamic playlist: " + err.message });
        }
    });
    // Submit Guess
    socket.on("submit_guess", (data) => {
        const room = RoomManager_1.default.getRoom(data.code);
        if (!room || !room.game || room.state !== "playing")
            return;
        const success = room.game.submitGuess(socket.id, data.questionId, data.choiceId, data.timeRemainingSec);
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
const handleDisconnect = (socket) => {
    const result = RoomManager_1.default.leaveRoom(socket.id);
    if (result) {
        const { roomCode, playerLeftName, roomDeleted, roomUpdated } = result;
        if (roomDeleted) {
            console.log(`[Socket] Player ${playerLeftName} left. Room ${roomCode} destroyed.`);
        }
        else {
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
server.listen(port, () => {
    console.log(`[Server] Guess The Song Server running on port ${port}`);
});

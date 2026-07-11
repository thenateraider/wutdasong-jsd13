"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = void 0;
class RoomManager {
    rooms = new Map();
    // Generate unique 6-digit room code
    generateRoomCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        do {
            code = "";
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }
    createRoom(hostId, hostName, hostAvatar, settings, roomName, password, maxPlayers = 8) {
        const code = this.generateRoomCode();
        const room = {
            code,
            name: roomName || `${hostName}'s Room`,
            password: password || undefined,
            hostId,
            maxPlayers,
            players: [
                {
                    id: hostId,
                    name: hostName,
                    avatar: hostAvatar,
                    isReady: true, // Host is ready by default
                },
            ],
            settings,
            game: null,
            state: "lobby",
            timerValue: 0,
            activeTimer: null,
        };
        this.rooms.set(code, room);
        console.log(`[RoomManager] Room ${code} created by Host: ${hostName} (${hostId})`);
        return room;
    }
    getRoom(code) {
        return this.rooms.get(code.toUpperCase());
    }
    getRoomByPlayerId(playerId) {
        for (const room of this.rooms.values()) {
            if (room.players.some((p) => p.id === playerId)) {
                return room;
            }
        }
        return undefined;
    }
    joinRoom(code, playerId, playerName, playerAvatar, password) {
        const room = this.getRoom(code);
        if (!room) {
            return { error: "Room not found." };
        }
        if (room.state !== "lobby") {
            return { error: "Game already in progress." };
        }
        if (room.players.length >= room.maxPlayers) {
            return { error: "Room is full." };
        }
        if (room.password && room.password !== password) {
            return { error: "Incorrect password." };
        }
        // Add player
        room.players.push({
            id: playerId,
            name: playerName,
            avatar: playerAvatar,
            isReady: false,
        });
        console.log(`[RoomManager] Player ${playerName} joined Room ${code}`);
        return { room };
    }
    toggleReady(code, playerId) {
        const room = this.getRoom(code);
        if (!room)
            return undefined;
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
            // Host is always ready
            if (playerId === room.hostId) {
                player.isReady = true;
            }
            else {
                player.isReady = !player.isReady;
            }
        }
        return room;
    }
    // Remove player from room, handles host transfer and empty room cleanup
    leaveRoom(playerId) {
        const room = this.getRoomByPlayerId(playerId);
        if (!room)
            return null;
        const playerIndex = room.players.findIndex((p) => p.id === playerId);
        if (playerIndex === -1)
            return null;
        const playerLeftName = room.players[playerIndex].name;
        room.players.splice(playerIndex, 1);
        // If game is active, remove from game engine
        if (room.game) {
            room.game.removePlayer(playerId);
        }
        // Room is empty - delete room and clear timers
        if (room.players.length === 0) {
            if (room.activeTimer) {
                clearInterval(room.activeTimer);
            }
            this.rooms.delete(room.code);
            console.log(`[RoomManager] Room ${room.code} deleted (empty)`);
            return { roomCode: room.code, playerLeftName, roomDeleted: true };
        }
        // If host left, transfer host
        let hostChanged = false;
        if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
            room.players[0].isReady = true; // New host is ready
            hostChanged = true;
            console.log(`[RoomManager] Host transferred to ${room.players[0].name} in Room ${room.code}`);
        }
        return {
            roomCode: room.code,
            playerLeftName,
            roomDeleted: false,
            roomUpdated: room,
        };
    }
    deleteRoom(code) {
        const room = this.rooms.get(code);
        if (room && room.activeTimer) {
            clearInterval(room.activeTimer);
        }
        this.rooms.delete(code);
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
}
exports.roomManager = new RoomManager();
exports.default = exports.roomManager;

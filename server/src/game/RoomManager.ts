import { GameEngine, GameSettings } from "./GameEngine";

export interface RoomPlayer {
  id: string; // Socket ID
  name: string;
  avatar: string;
  isReady: boolean;
}

export interface Room {
  code: string;
  name: string;
  password?: string;
  hostId: string;
  maxPlayers: number;
  players: RoomPlayer[];
  settings: GameSettings;
  game: GameEngine | null;
  state: "lobby" | "playing" | "reveal" | "result";
  timerValue: number;
  activeTimer: NodeJS.Timeout | null;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  // Generate unique 6-digit room code
  private generateRoomCode(): string {
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

  public createRoom(
    hostId: string,
    hostName: string,
    hostAvatar: string,
    settings: GameSettings,
    roomName: string,
    password?: string,
    maxPlayers: number = 8
  ): Room {
    const code = this.generateRoomCode();
    const room: Room = {
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

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public getRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room;
      }
    }
    return undefined;
  }

  public joinRoom(
    code: string,
    playerId: string,
    playerName: string,
    playerAvatar: string,
    password?: string
  ): { room?: Room; error?: string } {
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

    if (room.password) {
      if (!password) {
        return { error: "Password required." };
      }
      if (room.password !== password) {
        return { error: "Incorrect password." };
      }
    }

    if (room.players.some((p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase())) {
      return { error: "ชื่อผู้เล่นนี้ซ้ำกับคนในห้อง / Player name is already taken in this lobby." };
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

  public toggleReady(code: string, playerId: string): Room | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      // Host is always ready
      if (playerId === room.hostId) {
        player.isReady = true;
      } else {
        player.isReady = !player.isReady;
      }
    }

    return room;
  }

  // Remove player from room, handles host transfer and empty room cleanup
  public leaveRoom(playerId: string): { roomCode: string; playerLeftName: string; roomDeleted: boolean; roomUpdated?: Room } | null {
    const room = this.getRoomByPlayerId(playerId);
    if (!room) return null;

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;

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
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isReady = true; // New host is ready
      console.log(`[RoomManager] Host transferred to ${room.players[0].name} in Room ${room.code}`);
    }

    return {
      roomCode: room.code,
      playerLeftName,
      roomDeleted: false,
      roomUpdated: room,
    };
  }

  public deleteRoom(code: string) {
    const room = this.rooms.get(code);
    if (room && room.activeTimer) {
      clearInterval(room.activeTimer);
    }
    this.rooms.delete(code);
  }

  public getAllRooms() {
    return Array.from(this.rooms.values());
  }
}

export const roomManager = new RoomManager();
export default roomManager;

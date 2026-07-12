import { RoundData, Choice, GameTrack } from "../services/musicService";

export interface GameSettings {
  numSongs: number;       // 5, 10, 20
  answerDuration: number; // 5, 10, 15, 20 (seconds)
  clipDuration: number;   // 3, 5, 8, 10 (seconds)
  genres: string[];       // Pop, Rock, Anime, Thai, etc.
  difficulty: "Easy" | "Normal" | "Hard";
  playlistUrl?: string;   // Optional custom Spotify Playlist URL
}

export interface PlayerStats {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalTimeTaken: number;
  lastScoreAdded: number;
  lastAnswerCorrect: boolean | null;
  selectedChoiceId: string | null;
  timeRemainingSec: number;
  streak: number;
  maxCombo: number;
}

export class GameEngine {
  public settings: GameSettings;
  public rounds: RoundData[] = [];
  public currentRoundIdx: number = 0;
  public players: Map<string, PlayerStats> = new Map();
  public status: "lobby" | "playing" | "reveal" | "result" = "lobby";
  
  // Track player choices for the current round
  // Map<playerId, { choiceId: string, timeRemaining: number }>
  private roundGuesses: Map<string, { choiceId: string; timeRemaining: number }> = new Map();

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  public addPlayer(id: string, name: string, avatar: string) {
    this.players.set(id, {
      id,
      name,
      avatar,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      totalTimeTaken: 0,
      lastScoreAdded: 0,
      lastAnswerCorrect: null,
      selectedChoiceId: null,
      timeRemainingSec: 0,
      streak: 0,
      maxCombo: 0
    });
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    this.roundGuesses.delete(id);
  }

  // Pre-load rounds from musicService
  public async initialize(rounds: RoundData[]) {
    this.rounds = rounds;
    this.currentRoundIdx = 0;
    this.status = "playing";
    this.resetRoundGuesses();
    
    // Reset player states for game start
    for (const player of this.players.values()) {
      player.score = 0;
      player.correctAnswers = 0;
      player.wrongAnswers = 0;
      player.totalTimeTaken = 0;
      player.lastScoreAdded = 0;
      player.lastAnswerCorrect = null;
      player.selectedChoiceId = null;
      player.streak = 0;
      player.maxCombo = 0;
    }
  }

  private resetRoundGuesses() {
    this.roundGuesses.clear();
    for (const player of this.players.values()) {
      player.selectedChoiceId = null;
      player.lastScoreAdded = 0;
      player.lastAnswerCorrect = null;
      player.timeRemainingSec = 0;
    }
  }

  // Submit guess for a player
  public submitGuess(playerId: string, questionId: string, choiceId: string, timeRemainingSec: number): boolean {
    const player = this.players.get(playerId);
    if (!player || this.status !== "playing") return false;

    // Check if player already guessed in this round
    if (this.roundGuesses.has(playerId)) return false;

    const currentRound = this.rounds[this.currentRoundIdx];
    if (!currentRound || currentRound.questionId !== questionId) return false;

    this.roundGuesses.set(playerId, { choiceId, timeRemaining: timeRemainingSec });
    player.selectedChoiceId = choiceId;
    player.timeRemainingSec = timeRemainingSec;

    return true;
  }

  // Return if all connected active players have guessed
  public haveAllPlayersGuessed(activePlayerIds: string[]): boolean {
    for (const id of activePlayerIds) {
      if (this.players.has(id) && !this.roundGuesses.has(id)) {
        return false;
      }
    }
    return true;
  }

  // Process end of round - calculate scores and return reveal details
  public revealRoundAnswers(): { secretAnswer: GameTrack; playerResults: PlayerStats[] } {
    this.status = "reveal";
    const currentRound = this.rounds[this.currentRoundIdx];
    const correctAnswer = currentRound.secretAnswer;

    // Evaluate scores
    for (const [playerId, guess] of this.roundGuesses.entries()) {
      const player = this.players.get(playerId);
      if (!player) continue;

      const isCorrect = guess.choiceId === correctAnswer.id;
      player.lastAnswerCorrect = isCorrect;

      if (isCorrect) {
        player.streak = (player.streak || 0) + 1;
        player.maxCombo = Math.max(player.maxCombo || 0, player.streak);
        
        // Calculate points: 100 base + time remaining * 5 bonus
        const timeTaken = Math.max(0, this.settings.answerDuration - guess.timeRemaining);
        player.totalTimeTaken += timeTaken;

        const bonus = Math.round(guess.timeRemaining * 5);
        const baseScore = 100 + bonus;
        const scoreAdded = baseScore * player.streak;

        player.score += scoreAdded;
        player.lastScoreAdded = scoreAdded;
        player.correctAnswers += 1;
      } else {
        player.streak = 0;
        const timeTaken = this.settings.answerDuration;
        player.totalTimeTaken += timeTaken;
        player.lastScoreAdded = 0;
        player.wrongAnswers += 1;
      }
    }

    // Handle players who didn't submit an answer
    for (const playerId of this.players.keys()) {
      if (!this.roundGuesses.has(playerId)) {
        const player = this.players.get(playerId);
        if (player) {
          player.lastAnswerCorrect = false;
          player.lastScoreAdded = 0;
          player.wrongAnswers += 1;
          player.totalTimeTaken += this.settings.answerDuration;
          player.streak = 0;
        }
      }
    }

    return {
      secretAnswer: correctAnswer,
      playerResults: Array.from(this.players.values())
    };
  }

  // Progress to next round or end game
  // Returns true if there is a next round, false if game is over
  public nextRound(): boolean {
    if (this.currentRoundIdx + 1 < this.rounds.length) {
      this.currentRoundIdx++;
      this.status = "playing";
      this.resetRoundGuesses();
      return true;
    } else {
      this.status = "result";
      return false;
    }
  }

  // Clean data to send to clients during active playing (mask correct answer)
  public getCurrentRoundClientData() {
    if (this.status !== "playing" || !this.rounds[this.currentRoundIdx]) {
      return null;
    }

    const currentRound = this.rounds[this.currentRoundIdx];
    return {
      roundNumber: currentRound.roundNumber,
      totalRounds: this.rounds.length,
      questionId: currentRound.questionId,
      previewUrl: currentRound.previewUrl,
      choices: currentRound.choices,
      clipDuration: this.settings.clipDuration,
      answerDuration: this.settings.answerDuration
    };
  }

  // Get rank based on accuracy
  public static calculateRank(accuracy: number): "S" | "A" | "B" | "C" {
    if (accuracy >= 90) return "S";
    if (accuracy >= 75) return "A";
    if (accuracy >= 50) return "B";
    return "C";
  }
}
export default GameEngine;

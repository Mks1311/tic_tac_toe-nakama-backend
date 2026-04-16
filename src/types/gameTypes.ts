/**
 * Game type definitions for Tic-Tac-Toe
 */

/** Marks on the board */
export enum Mark {
  X = "X",
  O = "O",
  EMPTY = "",
}

/** Board is a 9-cell array */
export type Board = Mark[];

/** Op-codes for match data messages */
export enum OpCode {
  /** Client → Server: player wants to place a mark */
  MOVE = 1,
  /** Server → Client: the full updated game state */
  STATE_UPDATE = 2,
  /** Server → Client: the match has concluded */
  GAME_OVER = 3,
  /** Server → Client: an error (e.g. invalid move) */
  ERROR = 4,
  /** Server → Client: opponent disconnected */
  OPPONENT_LEFT = 5,
}

/** Payload the client sends for a move */
export interface MoveMessage {
  position: number; // 0-8
}

/** A player in the match */
export interface Player {
  userId: string;
  username: string;
  mark: Mark;
}

/** Full match state stored on the server */
export interface MatchState {
  /** The 3×3 board (length 9) */
  board: Board;
  /** Players in the match (max 2) */
  players: Player[];
  /** Whose turn it is (Mark.X always goes first) */
  currentTurn: Mark;
  /** Winner mark, "draw", or null if in-progress */
  winner: string | null;
  /** Whether the game has concluded */
  gameOver: boolean;
  /** Deadline tick for the current turn (optional timer) */
  deadlineTick: number;
  /** Track empty presences for cleanup */
  emptyTicks: number;
}

/** State update payload sent to clients */
export interface StateUpdateMessage {
  board: Board;
  currentTurn: Mark;
  players: { userId: string; username: string; mark: string }[];
  winner: string | null;
  gameOver: boolean;
}

/** Game-over payload sent to clients */
export interface GameOverMessage {
  winner: string | null; // "X", "O", or "draw"
  winnerUserId: string | null;
  board: Board;
}

/** Error payload sent to clients */
export interface ErrorMessage {
  message: string;
}

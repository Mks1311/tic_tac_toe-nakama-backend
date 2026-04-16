/**
 * Match logic — win checks and move validation
 */

import { Mark, Board } from "../types/gameTypes";
import { WIN_PATTERNS, BOARD_SIZE } from "../utils/constants";

/**
 * Check if a mark has won. Returns the winning mark or null.
 */
export function checkWinner(board: Board): Mark | null {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (
      board[a] !== Mark.EMPTY &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }
  return null;
}

/**
 * Check if the board is completely filled (draw scenario).
 */
export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== Mark.EMPTY);
}

/**
 * Validate a move:
 *  - position must be 0–8
 *  - the cell must be empty
 *  - it must be the player's turn
 *  - the game must not be over
 */
export function isValidMove(
  board: Board,
  position: number,
  playerMark: Mark,
  currentTurn: Mark,
  gameOver: boolean,
): { valid: boolean; reason?: string } {
  if (gameOver) {
    return { valid: false, reason: "Game is already over." };
  }

  if (playerMark !== currentTurn) {
    return { valid: false, reason: "It is not your turn." };
  }

  if (position < 0 || position >= BOARD_SIZE || !Number.isInteger(position)) {
    return { valid: false, reason: `Invalid position: ${position}. Must be 0-8.` };
  }

  if (board[position] !== Mark.EMPTY) {
    return { valid: false, reason: `Cell ${position} is already occupied.` };
  }

  return { valid: true };
}

/**
 * Apply a move to the board (mutates in place for efficiency).
 * Returns the new board state.
 */
export function applyMove(board: Board, position: number, mark: Mark): Board {
  board[position] = mark;
  return board;
}

/**
 * Switch the current turn.
 */
export function nextTurn(current: Mark): Mark {
  return current === Mark.X ? Mark.O : Mark.X;
}

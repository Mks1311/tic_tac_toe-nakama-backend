/**
 * Match state factory
 */

import { Mark, MatchState } from "../types/gameTypes";
import { createEmptyBoard } from "../utils/helpers";

/**
 * Create a fresh match state for a new game.
 */
export function createMatchState(): MatchState {
  return {
    board: createEmptyBoard(),
    players: [],
    currentTurn: Mark.X, // X always goes first
    winner: null,
    gameOver: false,
    deadlineTick: 0,
    emptyTicks: 0,
  };
}

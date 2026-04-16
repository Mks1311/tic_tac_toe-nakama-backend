/**
 * Game constants
 */

/** All possible winning line indices */
export const WIN_PATTERNS: number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // center column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left → bottom-right
  [2, 4, 6], // diagonal top-right → bottom-left
];

/** Board size */
export const BOARD_SIZE = 9;

/** Maximum players per match */
export const MAX_PLAYERS = 2;

/** Minimum players to start a match */
export const MIN_PLAYERS = 2;

/** Number of ticks with no presences before the match is killed */
export const MAX_EMPTY_TICKS = 50; // ~25s at 2 ticks/sec

/** Match tick rate (ticks per second) */
export const TICK_RATE = 2;

/** Matchmaker query for tic-tac-toe */
export const MATCHMAKER_QUERY = "*";

/** Match module name */
export const MATCH_MODULE = "tic_tac_toe";

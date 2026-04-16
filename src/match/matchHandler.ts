/**
 * Nakama Match Handler — server-authoritative Tic-Tac-Toe
 *
 * Implements the full match lifecycle:
 *  matchInit → matchJoinAttempt → matchJoin → matchLoop → matchLeave → matchTerminate
 */

import {
  Mark,
  MatchState,
  MoveMessage,
  OpCode,
  StateUpdateMessage,
  GameOverMessage,
  ErrorMessage,
  Player,
} from "../types/gameTypes";
import { MAX_PLAYERS, MAX_EMPTY_TICKS, TICK_RATE } from "../utils/constants";
import { createMatchState } from "./matchState";
import { checkWinner, isBoardFull, isValidMove, applyMove, nextTurn } from "./matchLogic";
import { broadcastMessage } from "../utils/helpers";

// ─── matchInit ───────────────────────────────────────────────────────────────

export function matchInit(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: nkruntime.MatchState; tickRate: number; label: string } {
  logger.info("Match created");

  const state: MatchState = createMatchState();

  return {
    state: state as unknown as nkruntime.MatchState,
    tickRate: TICK_RATE,
    label: JSON.stringify({ open: true, players: 0 }),
  };
}

// ─── matchJoinAttempt ────────────────────────────────────────────────────────

export function matchJoinAttempt(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: string },
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } {
  const s = state as unknown as MatchState;

  // Reject if the game is full
  if (s.players.length >= MAX_PLAYERS) {
    logger.warn(`Rejecting join: match is full (${presence.userId})`);
    return { state, accept: false, rejectMessage: "Match is full." };
  }

  // Reject if the game is already in progress (both players present)
  if (s.gameOver) {
    return { state, accept: false, rejectMessage: "Game is already over." };
  }

  // Prevent the same player from joining twice
  const alreadyJoined = s.players.some((p) => p.userId === presence.userId);
  if (alreadyJoined) {
    logger.info(`Player ${presence.userId} is rejoining`);
    return { state, accept: true };
  }

  logger.info(`Player join attempt accepted: ${presence.userId}`);
  return { state, accept: true };
}

// ─── matchJoin ───────────────────────────────────────────────────────────────

export function matchJoin(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } {
  const s = state as unknown as MatchState;

  for (const presence of presences) {
    // Skip if already in the players list (rejoin)
    if (s.players.some((p) => p.userId === presence.userId)) {
      logger.info(`Player rejoined: ${presence.userId}`);
      // Send them the current state
      broadcastMessage(dispatcher, OpCode.STATE_UPDATE, buildStateUpdate(s), [presence]);
      continue;
    }

    // Assign mark — first player is X, second is O
    const mark = s.players.length === 0 ? Mark.X : Mark.O;

    const player: Player = {
      userId: presence.userId,
      username: presence.username,
      mark,
    };


    s.players.push(player);
    logger.info(`Player joined changed 123: ${presence.username} (${presence.userId}) as ${mark}`);
  }

  // Update the match label
  const labelObj = { open: s.players.length < MAX_PLAYERS, players: s.players.length };
  dispatcher.matchLabelUpdate(JSON.stringify(labelObj));

  // If we now have 2 players, broadcast the initial state
  if (s.players.length === MAX_PLAYERS) {
    logger.info("Match is full — game starting!");
    broadcastMessage(dispatcher, OpCode.STATE_UPDATE, buildStateUpdate(s));
  }

  return { state: s as unknown as nkruntime.MatchState };
}

// ─── matchLoop ───────────────────────────────────────────────────────────────

export function matchLoop(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[],
): { state: nkruntime.MatchState } | null {
  const s = state as unknown as MatchState;

  // If no players are connected, increment empty ticks. Kill match after MAX_EMPTY_TICKS.
  if (s.players.length === 0) {
    s.emptyTicks++;
    if (s.emptyTicks > MAX_EMPTY_TICKS) {
      logger.info("Match terminated: no players for too long");
      return null; // terminates the match
    }
    return { state: s as unknown as nkruntime.MatchState };
  }
  s.emptyTicks = 0;

  // Don't process moves until we have 2 players
  if (s.players.length < MAX_PLAYERS) {
    return { state: s as unknown as nkruntime.MatchState };
  }

  // Process incoming messages
  for (const message of messages) {
    if (message.opCode === OpCode.MOVE) {
      handleMove(s, message, dispatcher, logger);
    }
  }

  return { state: s as unknown as nkruntime.MatchState };
}

// ─── matchLeave ──────────────────────────────────────────────────────────────

export function matchLeave(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  const s = state as unknown as MatchState;

  for (const presence of presences) {
    logger.info(`Player left: ${presence.userId}`);

    // Remove the player from the list
    const idx = s.players.findIndex((p) => p.userId === presence.userId);
    if (idx !== -1) {
      s.players.splice(idx, 1);
    }

    // If the game was in progress and a player left, the remaining player wins
    if (!s.gameOver && s.players.length === 1) {
      s.gameOver = true;
      s.winner = s.players[0].mark;

      // Notify the remaining player
      broadcastMessage(dispatcher, OpCode.OPPONENT_LEFT, {
        message: "Your opponent has left the match. You win!",
      });

      const gameOverMsg: GameOverMessage = {
        winner: s.winner,
        winnerUserId: s.players[0].userId,
        board: s.board,
      };
      broadcastMessage(dispatcher, OpCode.GAME_OVER, gameOverMsg);
    }
  }

  // Update label
  const labelObj = { open: s.players.length < MAX_PLAYERS, players: s.players.length };
  dispatcher.matchLabelUpdate(JSON.stringify(labelObj));

  // If no players remain, terminate the match
  if (s.players.length === 0) {
    logger.info("All players left. Match will terminate soon.");
  }

  return { state: s as unknown as nkruntime.MatchState };
}

// ─── matchTerminate ──────────────────────────────────────────────────────────

export function matchTerminate(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  graceSeconds: number,
): { state: nkruntime.MatchState } | null {
  logger.info(`Match terminating. Grace period: ${graceSeconds}s`);
  return { state };
}

// ─── matchSignal ─────────────────────────────────────────────────────────────

export function matchSignal(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  data: string,
): { state: nkruntime.MatchState; data?: string } {
  logger.info(`Match signal received: ${data}`);
  return { state, data: "signal acknowledged" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process an incoming MOVE message from a player.
 */
function handleMove(
  state: MatchState,
  message: nkruntime.MatchMessage,
  dispatcher: nkruntime.MatchDispatcher,
  logger: nkruntime.Logger,
): void {
  // Find the player who sent the message
  const player = state.players.find((p) => p.userId === message.sender.userId);
  if (!player) {
    logger.warn(`Move from unknown player: ${message.sender.userId}`);
    return;
  }

  // Parse the move data
  let moveData: MoveMessage;
  logger.info(`Move from player: ${message.sender.userId}`);
  try {
    const decoded = message.data ? JSON.parse(String.fromCharCode(...new Uint8Array(message.data))) : null;
    if (!decoded || typeof decoded.position !== "number") {
      throw new Error("Invalid move payload");
    }
    moveData = decoded as MoveMessage;
  } catch (e) {
    const errorMsg: ErrorMessage = { message: "Invalid move format." };
    broadcastMessage(dispatcher, OpCode.ERROR, errorMsg, [message.sender]);
    logger.info(`Move data: ${JSON.parse(String.fromCharCode(...new Uint8Array(message.data)))}`);
    logger.info(`message`, JSON.stringify((message)))
    return;
  }

  // Validate the move
  const validation = isValidMove(
    state.board,
    moveData.position,
    player.mark,
    state.currentTurn,
    state.gameOver,
  );

  if (!validation.valid) {
    logger.info(`Invalid move from ${player.username}: ${validation.reason}`);
    const errorMsg: ErrorMessage = { message: validation.reason || "Invalid move." };
    broadcastMessage(dispatcher, OpCode.ERROR, errorMsg, [message.sender]);
    return;
  }

  // Apply the move
  applyMove(state.board, moveData.position, player.mark);
  logger.info(`${player.username} (${player.mark}) placed at position ${moveData.position}`);

  // Check for winner
  const winner = checkWinner(state.board);
  if (winner) {
    state.winner = winner;
    state.gameOver = true;

    const winnerPlayer = state.players.find((p) => p.mark === winner);

    const gameOverMsg: GameOverMessage = {
      winner,
      winnerUserId: winnerPlayer?.userId || null,
      board: state.board,
    };

    logger.info(`Game over! Winner: ${winner} (${winnerPlayer?.username})`);
    broadcastMessage(dispatcher, OpCode.STATE_UPDATE, buildStateUpdate(state));
    broadcastMessage(dispatcher, OpCode.GAME_OVER, gameOverMsg);
    return;
  }

  // Check for draw
  if (isBoardFull(state.board)) {
    state.winner = "draw";
    state.gameOver = true;

    const gameOverMsg: GameOverMessage = {
      winner: "draw",
      winnerUserId: null,
      board: state.board,
    };

    logger.info("Game over! Draw.");
    broadcastMessage(dispatcher, OpCode.STATE_UPDATE, buildStateUpdate(state));
    broadcastMessage(dispatcher, OpCode.GAME_OVER, gameOverMsg);
    return;
  }

  // Switch turns
  state.currentTurn = nextTurn(state.currentTurn);

  // Broadcast updated state to all players
  broadcastMessage(dispatcher, OpCode.STATE_UPDATE, buildStateUpdate(state));
}

/**
 * Build a state-update message for clients.
 */
function buildStateUpdate(state: MatchState): StateUpdateMessage {
  return {
    board: state.board,
    currentTurn: state.currentTurn,
    players: state.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      mark: p.mark,
    })),
    winner: state.winner,
    gameOver: state.gameOver,
  };
}
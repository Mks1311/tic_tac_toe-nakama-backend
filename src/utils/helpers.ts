/**
 * Reusable helper functions
 */

import { Mark, OpCode } from "../types/gameTypes";

/**
 * Create an empty 9-cell board
 */
export function createEmptyBoard(): Mark[] {
  return Array(9).fill(Mark.EMPTY);
}

/**
 * Safely parse a JSON string; returns null on failure.
 */
export function safeParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Encode a JS object as a base64 string (for Nakama match data).
 */
export function encodeMatchData(data: unknown): string {
  return btoa(JSON.stringify(data));
}

/**
 * Decode a base64 match-data string back to a JS object.
 */
export function decodeMatchData<T>(data: string): T | null {
  try {
    return JSON.parse(atob(data)) as T;
  } catch {
    return null;
  }
}

/**
 * Build a Nakama-compatible dispatcher-send payload.
 */
export function broadcastMessage(
  dispatcher: nkruntime.MatchDispatcher,
  opCode: OpCode,
  data: unknown,
  presences?: nkruntime.Presence[] | null,
  sender?: nkruntime.Presence | null,
): void {
  const encoded = JSON.stringify(data);
  dispatcher.broadcastMessage(opCode, encoded, presences, sender);
}

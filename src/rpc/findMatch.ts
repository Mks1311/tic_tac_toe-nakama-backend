/**
 * RPC: Find and join an open match, or create a new one
 *
 * Looks for matches with an open slot. If found, returns the matchId.
 * If none available, creates a new match and returns that matchId.
 * The client then uses the matchId to join via the real-time socket.
 */

import { MATCH_MODULE } from "../utils/constants";

export function rpcFindMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  // Search for open matches (label contains "open":true)
  const limit = 10;
  const isAuthoritative = true;
  const label = "";        // empty = all labels
  const minSize = 0;       // minimum number of connected users
  const maxSize = 1;       // at most 1 player (so there's a free slot)
  const query = "+label.open:true";

  let matches: nkruntime.Match[];
  try {
    const result = nk.matchList(limit, isAuthoritative, label, minSize, maxSize, query);
    matches = result || [];
  } catch (e) {
    logger.error(`Error listing matches: ${e}`);
    matches = [];
  }

  let matchId: string;

  if (matches.length > 0) {
    // Join the first available match
    matchId = matches[0].matchId;
    logger.info(`Found open match: ${matchId} for user ${ctx.userId}`);
  } else {
    // No open matches found — create a new one
    matchId = nk.matchCreate(MATCH_MODULE, {});
    logger.info(`No open matches. Created new match: ${matchId} for user ${ctx.userId}`);
  }

  return JSON.stringify({ matchId });
}

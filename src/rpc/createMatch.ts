/**
 * RPC: Create a new Tic-Tac-Toe match
 *
 * Called by a client who wants to create a match and wait for an opponent.
 * Returns the matchId so the client can share it or wait for someone to join.
 */

import { MATCH_MODULE } from "../utils/constants";

export function rpcCreateMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  // Create a new match using our registered match handler
  const matchId = nk.matchCreate(MATCH_MODULE, {});
  logger.info(`Match created via RPC: ${matchId} by user ${ctx.userId}`);

  return JSON.stringify({ matchId });
}

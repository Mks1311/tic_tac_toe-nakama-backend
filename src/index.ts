/**
 * ENTRYPOINT — Nakama Server Runtime
 *
 * Registers all RPCs, match handlers, and hooks.
 */

import { rpcHealthCheck } from "./rpc/health";
import { rpcCreateMatch } from "./rpc/createMatch";
import { rpcFindMatch } from "./rpc/findMatch";
import {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLoop,
  matchLeave,
  matchTerminate,
  matchSignal,
} from "./match/matchHandler";
import { MATCH_MODULE } from "./utils/constants";

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {

  initializer.registerRpc("rpc_healthcheck", rpcHealthCheck);
  initializer.registerRpc("rpc_create_match", rpcCreateMatch);
  initializer.registerRpc("rpc_find_match", rpcFindMatch);

  initializer.registerMatch(MATCH_MODULE, {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLoop: matchLoop,
    matchLeave: matchLeave,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);

  logger.info("✅ LILA Tic-Tac-Toe module loaded successfully");
}

/**
 * Called when the matchmaker finds a pair of players.
 * Creates a new authoritative match and returns its ID so both players
 * are automatically placed into it.
 */
function matchmakerMatched(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[],
): string {
  logger.info(`Matchmaker matched ${matches.length} player(s)`);

  // Create a new authoritative match
  const matchId = nk.matchCreate(MATCH_MODULE, {});
  logger.info(`Matchmaker created match: ${matchId}`);

  return matchId;
}

// Ensure InitModule is visible to the Nakama runtime at the global scope
// (this is required for the bundled output)
!globalThis.InitModule && (globalThis.InitModule = InitModule);
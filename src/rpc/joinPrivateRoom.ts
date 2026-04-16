/**
 * RPC: Join a private room by its 6-character code
 *
 * Reads the room code → matchId mapping from Nakama Storage (written by
 * rpcCreateMatch under the system user). Instant and deterministic — no
 * matchList search, no dependency on socket presences or label indexing.
 *
 * Returns { matchId } on success, or throws if the code is unknown.
 */

import { ROOM_CODE_COLLECTION, SYSTEM_USER_ID } from "../utils/constants";

export function rpcJoinPrivateRoom(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  // Parse and validate the incoming code
  let code: string;
  try {
    const parsed = JSON.parse(payload);
    code = (parsed.code || "").toString().trim().toUpperCase();
  } catch {
    throw new Error("Invalid payload: expected JSON with a 'code' field.");
  }

  if (!code || code.length !== 6) {
    throw new Error(`Invalid room code: "${code}". Must be exactly 6 characters.`);
  }

  // Look up the room code in Nakama Storage.
  // It was written under SYSTEM_USER_ID with permissionRead=2, so we can
  // read it from any server-side context without knowing the creator's userId.
  let records: nkruntime.StorageObject[];
  try {
    records = nk.storageRead([{
      collection: ROOM_CODE_COLLECTION,
      key: code,
      userId: SYSTEM_USER_ID,
    }]);
  } catch (e) {
    logger.error(`Storage read error for code ${code}: ${e}`);
    throw new Error("Failed to look up room. Please try again.");
  }

  if (!records || records.length === 0) {
    logger.warn(`No storage record found for code: ${code}`);
    throw new Error(`No room found with code "${code}". It may be expired or already in use.`);
  }

  let matchId: string;
  try {
    const data = records[0].value;
    matchId = data.matchId;
  } catch {
    throw new Error("Room record is corrupted. Please create a new room.");
  }

  if (!matchId) {
    throw new Error(`Room code "${code}" has no associated match.`);
  }

  // Clean up the storage record so the code can't be reused
  try {
    nk.storageDelete([{
      collection: ROOM_CODE_COLLECTION,
      key: code,
      userId: SYSTEM_USER_ID,
    }]);
  } catch (e) {
    // Non-fatal — log but don't block the join
    logger.warn(`Could not delete room code ${code} from storage: ${e}`);
  }

  logger.info(`Code ${code} → match ${matchId} for user ${ctx.userId}`);
  return JSON.stringify({ matchId });
}

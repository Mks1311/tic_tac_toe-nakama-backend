import { MATCH_MODULE, ROOM_CODE_COLLECTION, SYSTEM_USER_ID } from "../utils/constants";

export function rpcCreateMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  // Create a new authoritative match
  const matchId = nk.matchCreate(MATCH_MODULE, {});

  // Derive a short shareable code from the UUID portion of the match ID.
  // Match IDs look like: "a1b2c3d4-e5f6-7890-abcd-ef1234567890.nakama1"
  // We strip dashes, take the first 6 hex chars, and uppercase → "A1B2C3"
  const uuidPart = matchId.split(".")[0];
  const roomCode = uuidPart.replace(/-/g, "").slice(0, 6).toUpperCase();

  // Persist under the system user so the joiner can read it with a known userId,
  // without needing to know who created the room.
  nk.storageWrite([{
    collection: ROOM_CODE_COLLECTION,
    key: roomCode,
    userId: SYSTEM_USER_ID,
    value: { matchId },
    permissionRead: 2,   // public read
    permissionWrite: 0,  // server-only write
  }]);

  logger.info(`Private match created: ${matchId} | code: ${roomCode} | user: ${ctx.userId}`);

  return JSON.stringify({ matchId, roomCode });
}

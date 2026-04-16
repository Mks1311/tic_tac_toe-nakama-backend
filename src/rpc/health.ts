/**
 * RPC: Health Check
 */
export function rpcHealthCheck(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  logger.info("healthcheck rpc called");
  return JSON.stringify({ success: true, timestamp: Date.now() });
}

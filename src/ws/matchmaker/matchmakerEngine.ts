export function delayExecution(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processMatchmakerSocket(ws: any) {
  const ticketId = crypto.randomUUID().replace(/-/g, "");
  const matchId = crypto.randomUUID().replace(/-/g, "");
  const sessionId = crypto.randomUUID().replace(/-/g, "");

  try {
    ws.send(
      JSON.stringify({
        payload: { state: "Connecting" },
        name: "StatusUpdate",
      })
    );
    await delayExecution(350);

    ws.send(
      JSON.stringify({
        payload: {
          totalPlayers: 1,
          connectedPlayers: 1,
          state: "Waiting",
        },
        name: "StatusUpdate",
      })
    );
    await delayExecution(450);

    ws.send(
      JSON.stringify({
        payload: {
          ticketId,
          queuedPlayers: 0,
          estimatedWaitSec: 0,
          status: {},
          state: "Queued",
        },
        name: "StatusUpdate",
      })
    );
    await delayExecution(1200);

    ws.send(
      JSON.stringify({
        payload: {
          matchId,
          state: "SessionAssignment",
        },
        name: "StatusUpdate",
      })
    );
    await delayExecution(500);

    ws.send(
      JSON.stringify({
        payload: {
          matchId,
          sessionId,
          joinDelaySec: 1,
        },
        name: "Play",
      })
    );
  } catch (err) {}
}

export default processMatchmakerSocket;

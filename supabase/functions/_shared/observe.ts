// Structured operational logs only; never serialize request headers or bodies.
export function observeEdge(
  handler: (request: Request) => Promise<Response>,
  service: string,
  release: string,
  log: (record: unknown) => void = (record) =>
    console.log(JSON.stringify(record)),
) {
  return async (request: Request) => {
    const id = crypto.randomUUID(),
      start = performance.now();
    let status = 500;
    let errorType: string | undefined, errorFrames: string[] | undefined;
    try {
      const response = await handler(request);
      status = response.status;
      const headers = new Headers(response.headers);
      headers.set("x-elas-request-id", id);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      status = 500;
      errorType =
        error instanceof Error &&
        [
          "Error",
          "TypeError",
          "RangeError",
          "AbortError",
          "TimeoutError",
        ].includes(error.name)
          ? error.name
          : "UnhandledError";
      // Omit the exception message: it can contain a database payload or credential.
      errorFrames =
        error instanceof Error
          ? error.stack
              ?.split("\n")
              .slice(1, 5)
              .map((frame) =>
                frame
                  .replace(/(?:file|https?):\/\/[^)\s]*\//g, "[source]/")
                  .slice(0, 180),
              )
          : undefined;
      return new Response(
        JSON.stringify({
          error: "Serviço temporariamente indisponível",
          requestId: id,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "x-elas-request-id": id,
          },
        },
      );
    } finally {
      try {
        log({
          event: "edge_request",
          service,
          release,
          request_id: id,
          status,
          ...(errorType
            ? { error_type: errorType, error_frames: errorFrames }
            : {}),
          duration_ms: Math.round(performance.now() - start),
        });
      } catch {
        /* Monitoring failure must not alter a response. */
      }
    }
  };
}

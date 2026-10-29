import { requestSignal } from "../request.ts";
export type RequestMeasurement = {
  operation: string;
  status: number;
  durationMs: number;
  outcome: "ok" | "http_error" | "network_error" | "cancelled" | "timeout";
};
export function requestOperation(input: RequestInfo | URL) {
  try {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const parts = url.pathname.split("/").filter(Boolean);
    const rpc = parts.indexOf("rpc");
    if (rpc >= 0 && /^[a-z_]{1,64}$/.test(parts[rpc + 1] ?? ""))
      return `rpc.${parts[rpc + 1]}`;
    if (parts[0] === "auth") return "auth.request";
    if (parts[0] === "storage") return "storage.request";
    if (parts[0] === "functions") return "edge.request";
    return "api.request";
  } catch {
    return "api.request";
  }
}
export function measuredFetch(
  fetcher: typeof fetch,
  record: (measurement: RequestMeasurement) => void,
  now = () => performance.now(),
): typeof fetch {
  return async (input, init) => {
    const start = now(),
      operation = requestOperation(input);
    const report = (status: number, outcome: RequestMeasurement["outcome"]) => {
      try {
        record({
          operation,
          status,
          outcome,
          durationMs: Math.max(0, now() - start),
        });
      } catch {
        /* Reporting must never break a request. */
      }
    };
    try {
      const response = await fetcher(input, init);
      report(response.status, response.ok ? "ok" : "http_error");
      return response;
    } catch (error) {
      const signal = requestSignal(input, init);
      report(
        0,
        signal?.aborted
          ? signal.reason?.name === "TimeoutError"
            ? "timeout"
            : "cancelled"
          : "network_error",
      );
      throw error;
    }
  };
}

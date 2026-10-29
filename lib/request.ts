export function requestSignal(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.signal === null) return undefined;
  return (
    init?.signal ??
    (typeof Request !== "undefined" && input instanceof Request
      ? input.signal
      : undefined)
  );
}
// Abort stalled requests and preserve signals carried by either init or Request.
export function deadlineFetch(
  fetcher: typeof fetch,
  timeout = 20000,
  timeoutForRequest?: (input: RequestInfo | URL) => number,
): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController(),
      signal = requestSignal(input, init);
    const cancel = () => controller.abort(signal?.reason);
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
    const timeoutError = new Error("A conexão demorou. Tente novamente.");
    timeoutError.name = "TimeoutError";
    const timer = setTimeout(
      () => controller.abort(timeoutError),
      timeoutForRequest?.(input) ?? timeout,
    );
    try {
      return await fetcher(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  };
}

// Coalesce gesture events into one render per display frame; release keeps the final point.
export function createFrameScheduler<T>(apply: (value: T) => void,
  request: (callback: () => void) => number, cancel: (id: number) => void) {
  let frame: number | undefined, pending: { value: T } | undefined;
  const flush = () => {
    if (frame !== undefined) cancel(frame);
    frame = undefined;
    if (pending) { const value = pending.value; pending = undefined; apply(value); }
  };
  return {
    schedule(value: T) {
      pending = { value };
      if (frame === undefined) frame = request(() => { frame = undefined; flush(); });
    },
    flush,
    cancel() { if (frame !== undefined) cancel(frame); frame = undefined; pending = undefined; },
  };
}

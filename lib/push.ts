const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const isPushData = (
  value: unknown,
): value is { notificationId: string } =>
  !!value &&
  typeof value === "object" &&
  uuid.test(
    String((value as { notificationId?: unknown }).notificationId ?? ""),
  );
export const isPushToken = (value: string) =>
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(value);
// Serialize registration/rotation/revocation so logout cannot overtake a pending enable.
export function serialTasks() {
  let previous: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = previous.then(task, task);
    previous = next.catch(() => {});
    return next;
  };
}

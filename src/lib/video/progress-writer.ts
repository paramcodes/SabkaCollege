/**
 * Serializes progress writes so a delayed request cannot race a newer request
 * in the client. The server still enforces monotonic SQL for concurrent tabs.
 */
export function createSerialProgressWriter<T>(
  write: (value: T) => Promise<void>,
): (value: T) => Promise<void> {
  let tail = Promise.resolve();

  return (value) => {
    const next = tail.then(() => write(value));
    tail = next.catch(() => undefined);
    return next;
  };
}

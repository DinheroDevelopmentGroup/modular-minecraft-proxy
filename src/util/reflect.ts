export function override<T, K extends keyof T>(
  target: T,
  key: K,
  callback: (original: T[K]) => T[K],
): void {
  const original = target[key];
  target[key] = callback(original);
}

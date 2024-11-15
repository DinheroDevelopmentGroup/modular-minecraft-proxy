export function override<T, K extends keyof T>(
  target: T,
  key: K,
  callback: (
    original: T[K],
  ) => /* this could have been simply T[K] but then it wouldn't scope functions correctly */
  T[K] extends (...args: infer TArgs) => infer TReturnType
    ? (this: T, ...args: TArgs) => TReturnType
    : T[K],
): void {
  let original = target[key];

  if (typeof original === 'function') {
    original = original.bind(target);
  }

  target[key] = callback(original) as T[K];
}

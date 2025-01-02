export class Store<T> {
  private readonly callbacks: Set<(value: T) => void> = new Set();

  public subscribe(
    callback: (value: T) => void,
    initialize: boolean = true,
  ): void {
    this.callbacks.add(callback);

    if (initialize) callback(this.value);
  }

  public unsubscribe(callback: (value: T) => void): void {
    this.callbacks.delete(callback);
  }

  static merge<T extends unknown[]>(
    ...stores: { [K in keyof T]: Store<T[K]> }
  ): Store<T> {
    const values = stores.map((store) => store.get()) as T;
    const store = new Store<T>(values);

    for (const [i, subStore] of stores.entries()) {
      subStore.subscribe((value) => {
        values[i] = value;
        store.set(values);
      }, false);
    }

    return store;
  }

  constructor(private value: T) {}

  public set(value: T): void {
    this.value = value;
    this.callbacks.forEach((callback) => callback(value));
  }

  public get(): T {
    return this.value;
  }
}

export default Store;

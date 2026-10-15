class ResizeObserverStub {
  observe = (): void => undefined;
  unobserve = (): void => undefined;
  disconnect = (): void => undefined;
}

globalThis.ResizeObserver ??= ResizeObserverStub;

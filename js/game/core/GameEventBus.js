export function createGameEventBus() {
  const listeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    emit(event) {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

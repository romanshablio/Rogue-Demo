function createViewport(screenWidth, screenHeight, tileSize) {
  return {
    tileSize,
    width: Math.max(1, Math.floor(screenWidth / tileSize) - 2),
    height: Math.max(1, Math.floor(screenHeight / tileSize) - 2),
  };
}

export function createBrowserRuntimeEnvironment(windowObject = globalThis.window) {
  const runtimeWindow = windowObject || globalThis.window || null;
  const fallbackSetTimeout = globalThis.setTimeout?.bind(globalThis);
  const fallbackClearTimeout = globalThis.clearTimeout?.bind(globalThis);

  return {
    getViewport(tileSize) {
      return createViewport(
        runtimeWindow?.innerWidth ?? 1280,
        runtimeWindow?.innerHeight ?? 720,
        tileSize
      );
    },
    setTimeout(callback, delayMs) {
      const schedule =
        runtimeWindow?.setTimeout?.bind(runtimeWindow) || fallbackSetTimeout;
      return schedule?.(callback, delayMs) ?? null;
    },
    clearTimeout(timerId) {
      const clear =
        runtimeWindow?.clearTimeout?.bind(runtimeWindow) || fallbackClearTimeout;
      clear?.(timerId);
    },
  };
}

export function createHeadlessRuntimeEnvironment({
  width = 1280,
  height = 720,
} = {}) {
  const fallbackSetTimeout = globalThis.setTimeout?.bind(globalThis);
  const fallbackClearTimeout = globalThis.clearTimeout?.bind(globalThis);

  return {
    getViewport(tileSize) {
      return createViewport(width, height, tileSize);
    },
    setTimeout(callback, delayMs) {
      return fallbackSetTimeout?.(callback, delayMs) ?? null;
    },
    clearTimeout(timerId) {
      fallbackClearTimeout?.(timerId);
    },
  };
}

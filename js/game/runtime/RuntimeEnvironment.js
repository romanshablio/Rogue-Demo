function createViewport(screenWidth, screenHeight, tileSize, options = {}) {
  const viewportTileSize = Math.max(1, options.viewportTileSize ?? tileSize);
  const horizontalPadding = Math.max(0, options.horizontalPadding ?? 0);
  const verticalPadding = Math.max(0, options.verticalPadding ?? 0);
  const maxWidth = Number.isFinite(options.maxWidth)
    ? Math.max(1, Math.floor(options.maxWidth))
    : null;
  const maxHeight = Number.isFinite(options.maxHeight)
    ? Math.max(1, Math.floor(options.maxHeight))
    : null;
  const availableWidth = Math.max(1, screenWidth - horizontalPadding * 2);
  const availableHeight = Math.max(1, screenHeight - verticalPadding * 2);
  const viewportWidth = Math.max(1, Math.floor(availableWidth / viewportTileSize));
  const viewportHeight = Math.max(1, Math.floor(availableHeight / viewportTileSize));

  return {
    tileSize,
    width: maxWidth ? Math.min(maxWidth, viewportWidth) : viewportWidth,
    height: maxHeight ? Math.min(maxHeight, viewportHeight) : viewportHeight,
  };
}

export function createBrowserRuntimeEnvironment(
  windowObject = globalThis.window,
  options = {}
) {
  const runtimeWindow = windowObject || globalThis.window || null;
  const fallbackSetTimeout = globalThis.setTimeout?.bind(globalThis);
  const fallbackClearTimeout = globalThis.clearTimeout?.bind(globalThis);

  return {
    getViewport(tileSize) {
      return createViewport(
        runtimeWindow?.innerWidth ?? 1280,
        runtimeWindow?.innerHeight ?? 720,
        tileSize,
        options
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
  viewportTileSize,
  horizontalPadding = 0,
  verticalPadding = 0,
  maxWidth,
  maxHeight,
} = {}) {
  const fallbackSetTimeout = globalThis.setTimeout?.bind(globalThis);
  const fallbackClearTimeout = globalThis.clearTimeout?.bind(globalThis);

  return {
    getViewport(tileSize) {
      return createViewport(width, height, tileSize, {
        viewportTileSize,
        horizontalPadding,
        verticalPadding,
        maxWidth,
        maxHeight,
      });
    },
    setTimeout(callback, delayMs) {
      return fallbackSetTimeout?.(callback, delayMs) ?? null;
    },
    clearTimeout(timerId) {
      fallbackClearTimeout?.(timerId);
    },
  };
}

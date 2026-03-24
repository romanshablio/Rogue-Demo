export function bindBrowserRuntime(game, { renderer, hud }) {
  renderer?.setConfig?.(game.config);

  const renderState = (state) => {
    renderer?.render?.(state);
    hud?.render?.(state);
  };

  const unsubscribeState = game.subscribe(renderState);
  const unsubscribeEvents = game.subscribeToEvents((event) => {
    if (event.type === "configChanged") {
      renderer?.setConfig?.(game.config);
    }
  });

  renderState(game.getState());

  return () => {
    unsubscribeState?.();
    unsubscribeEvents?.();
  };
}

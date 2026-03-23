export function getViewportBounds(state) {
  const { hero, map } = state;
  const halfWidth = Math.floor(map.viewport.width / 2);
  const halfHeight = Math.floor(map.viewport.height / 2);
  const left = Math.max(0, hero.x - halfWidth);
  const top = Math.max(0, hero.y - halfHeight);

  return {
    left,
    top,
    right: Math.min(map.width, left + map.viewport.width),
    bottom: Math.min(map.height, top + map.viewport.height),
  };
}

export function worldToScreen(state, worldX, worldY) {
  const bounds = getViewportBounds(state);

  return {
    x: (worldX - bounds.left) * state.map.viewport.tileSize,
    y: (worldY - bounds.top) * state.map.viewport.tileSize,
  };
}

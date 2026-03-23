import { TILE_TYPES } from "../core/constants.js";
import { getDistance } from "../utils/geometry.js";

export function hasLineOfSight(tiles, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let x = x0;
  let y = y0;
  let steps = 1 + dx + dy;
  const xInc = x1 > x0 ? 1 : -1;
  const yInc = y1 > y0 ? 1 : -1;
  let error = dx - dy;

  dx *= 2;
  dy *= 2;

  while (steps > 0) {
    if (
      tiles[y] &&
      tiles[y][x] === TILE_TYPES.WALL &&
      !(x === x0 && y === y0) &&
      !(x === x1 && y === y1)
    ) {
      return false;
    }

    if (error > 0) {
      x += xInc;
      error -= dy;
    } else {
      y += yInc;
      error += dx;
    }

    steps -= 1;
  }

  return true;
}

export function getVisibility(state, config, x, y) {
  if (!state.run.fogEnabled) {
    return 2;
  }

  const distance = getDistance(state.hero.x, state.hero.y, x, y);

  if (hasLineOfSight(state.map.tiles, state.hero.x, state.hero.y, x, y)) {
    if (distance <= config.visionRadius) {
      return 2;
    }

    if (distance <= config.partialVisionRadius) {
      return 1;
    }
  }

  return 0;
}

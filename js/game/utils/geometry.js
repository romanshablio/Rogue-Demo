export function getDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

export function getChaseVector(origin, target) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      dx: dx === 0 ? 0 : dx > 0 ? 1 : -1,
      dy: 0,
    };
  }

  return {
    dx: 0,
    dy: dy === 0 ? 0 : dy > 0 ? 1 : -1,
  };
}

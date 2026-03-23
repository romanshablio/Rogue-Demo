export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandomIndex(items) {
  if (!items.length) {
    return -1;
  }

  return getRandomInt(0, items.length - 1);
}

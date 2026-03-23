import { getRandomInt } from "../utils/random.js";
import { isAdjacent } from "../utils/geometry.js";

export const basicEnemyDefinition = Object.freeze({
  stats: {
    maxHp: 50,
    attack: 5,
  },
  spriteClass: "enemy",
  takeTurn(context, enemy) {
    if (isAdjacent(enemy, context.state.hero)) {
      return {
        type: "attack",
        damage: enemy.attack,
      };
    }

    const direction = getRandomInt(0, 3);
    const vectors = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    return {
      type: "move",
      dx: vectors[direction].dx,
      dy: vectors[direction].dy,
    };
  },
});

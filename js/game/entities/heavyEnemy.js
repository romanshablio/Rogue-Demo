import { getChaseVector, isAdjacent } from "../utils/geometry.js";

export const heavyEnemyDefinition = Object.freeze({
  stats: {
    maxHp: 90,
    attack: 8,
  },
  spriteClass: "enemy enemy-heavy",
  takeTurn(context, enemy) {
    if (isAdjacent(enemy, context.state.hero)) {
      return {
        type: "attack",
        damage: enemy.attack,
      };
    }

    if (context.state.run.turn % 2 === 1) {
      return { type: "wait" };
    }

    const vector = getChaseVector(enemy, context.state.hero);
    return {
      type: "move",
      dx: vector.dx,
      dy: vector.dy,
    };
  },
});

import { getChaseVector, isAdjacent } from "../utils/geometry.js";

export const fastEnemyDefinition = Object.freeze({
  stats: {
    maxHp: 35,
    attack: 4,
  },
  spriteClass: "enemy enemy-fast",
  takeTurn(context, enemy) {
    if (isAdjacent(enemy, context.state.hero)) {
      return {
        type: "attack",
        damage: enemy.attack,
      };
    }

    const vector = getChaseVector(enemy, context.state.hero);
    return [
      {
        type: "move",
        dx: vector.dx,
        dy: vector.dy,
      },
      {
        type: "move",
        dx: vector.dx,
        dy: vector.dy,
      },
    ];
  },
});

import { hasLineOfSight } from "../render/visibility.js";
import { getChaseVector, getDistance } from "../utils/geometry.js";

export const rangedEnemyDefinition = Object.freeze({
  stats: {
    maxHp: 45,
    attack: 6,
  },
  spriteClass: "enemy enemy-ranged",
  takeTurn(context, enemy) {
    const hero = context.state.hero;
    const sameLane = enemy.x === hero.x || enemy.y === hero.y;
    const withinRange = getDistance(enemy.x, enemy.y, hero.x, hero.y) <= 4;

    if (
      sameLane &&
      withinRange &&
      hasLineOfSight(context.state.map.tiles, enemy.x, enemy.y, hero.x, hero.y)
    ) {
      return {
        type: "attack",
        damage: enemy.attack,
      };
    }

    const vector = getChaseVector(enemy, hero);
    return {
      type: "move",
      dx: vector.dx,
      dy: vector.dy,
    };
  },
});

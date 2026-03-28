import { GAME_STATUS } from "../core/constants.js";
import { isAdjacent } from "../utils/geometry.js";

function getAdjacentCells(origin) {
  return [
    { x: origin.x + 1, y: origin.y },
    { x: origin.x - 1, y: origin.y },
    { x: origin.x, y: origin.y + 1 },
    { x: origin.x, y: origin.y - 1 },
    { x: origin.x + 1, y: origin.y + 1 },
    { x: origin.x - 1, y: origin.y + 1 },
    { x: origin.x + 1, y: origin.y - 1 },
    { x: origin.x - 1, y: origin.y - 1 },
  ];
}

function maybePickupItem(game) {
  const item = game.findItemAt(game.state.hero.x, game.state.hero.y);

  if (!item) {
    return;
  }

  game.addItemToInventory(item);
  game.removeItem(item.id);
}

function updatePrincess(game, previousHeroPosition, movedIntoPrincessCell) {
  const princess = game.state.princess;

  if (!princess.isFollowing || princess.rescued || movedIntoPrincessCell) {
    return;
  }

  if (!game.isWalkableTile(previousHeroPosition.x, previousHeroPosition.y)) {
    return;
  }

  if (
    game.findEnemyAt(previousHeroPosition.x, previousHeroPosition.y) ||
    game.isHeroAt(previousHeroPosition.x, previousHeroPosition.y)
  ) {
    return;
  }

  princess.x = previousHeroPosition.x;
  princess.y = previousHeroPosition.y;
}

function maybeRescuePrincess(game) {
  const { hero, princess } = game.state;

  if (!princess.isFollowing) {
    return;
  }

  if (game.isDoorAt(hero.x, hero.y) && isAdjacent(hero, princess)) {
    princess.rescued = true;
    game.emitEvent("princessRescued");
    game.advanceFloor();
  }
}

function maybeRecruitPrincess(game) {
  const { princess, enemies } = game.state;

  if (princess.isFollowing || enemies.length > 0) {
    return;
  }

  for (const cell of getAdjacentCells(game.state.hero)) {
    if (cell.x === princess.x && cell.y === princess.y) {
      princess.isFollowing = true;
      game.showMessage(game.config.messages.princessFollow, { type: "info" });
      game.emitEvent("princessRecruited", {
        x: princess.x,
        y: princess.y,
      });
      return;
    }
  }
}

function normalizeEnemyIntents(intent) {
  if (!intent) {
    return [];
  }

  return Array.isArray(intent) ? intent : [intent];
}

function applyEnemyIntent(game, enemy, intent) {
  if (!intent || game.state.run.status !== GAME_STATUS.RUNNING) {
    return;
  }

  if (intent.type === "wait") {
    return;
  }

  if (intent.type === "attack") {
    game.animationManager.playEntity(enemy.id, "attack");
    game.animationManager.playEntity("hero", "damage");
    game.state.hero.hp -= intent.damage;
    game.playSoundEffect("pain");
    game.emitEvent("heroDamaged", {
      damage: intent.damage,
      hp: Math.max(0, game.state.hero.hp),
      enemyId: enemy.id,
    });

    if (game.state.hero.hp <= 0) {
      game.state.hero.hp = 0;
      game.handleHeroDeath();
    }

    return;
  }

  if (intent.type !== "move") {
    return;
  }

  const targetX = enemy.x + intent.dx;
  const targetY = enemy.y + intent.dy;

  if (!game.canEnemyMoveTo(targetX, targetY, enemy.id)) {
    return;
  }

  enemy.x = targetX;
  enemy.y = targetY;
}

export function createCoreRulesSystem() {
  return {
    id: "core-rules",
    onHeroMoved(game, payload) {
      maybePickupItem(game);
      updatePrincess(
        game,
        payload.previousHeroPosition,
        payload.movedIntoPrincessCell
      );
      maybeRecruitPrincess(game);
      maybeRescuePrincess(game);
    },
    onHeroAttack(game) {
      maybeRecruitPrincess(game);
      game.animationManager.playEntity("hero", "attack");

      for (const cell of getAdjacentCells(game.state.hero)) {
        const enemy = game.findEnemyAt(cell.x, cell.y);

        if (!enemy) {
          continue;
        }

        game.animationManager.playEntity(enemy.id, "damage");
        enemy.hp -= game.state.hero.attack;
        game.emitEvent("enemyDamaged", {
          enemyId: enemy.id,
          damage: game.state.hero.attack,
          hp: Math.max(0, enemy.hp),
        });
        if (enemy.hp <= 0) {
          game.removeEnemy(enemy.id);
        }
      }

      game.playSoundEffect("attack");
    },
    beforeTurn(game) {
      for (const enemy of [...game.state.enemies]) {
        if (game.state.run.status !== GAME_STATUS.RUNNING) {
          break;
        }

        const definition = game.getEnemyType(enemy.typeId);
        const intents = normalizeEnemyIntents(
          definition.takeTurn(
            {
              game,
              state: game.state,
            },
            enemy
          )
        );

        for (const intent of intents) {
          applyEnemyIntent(game, enemy, intent);
          if (game.state.run.status !== GAME_STATUS.RUNNING) {
            break;
          }
        }
      }
    },
  };
}

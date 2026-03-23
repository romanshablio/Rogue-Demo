import { GAME_STATUS, ITEM_TYPES, TILE_TYPES } from "../core/constants.js";
import { getViewportBounds, worldToScreen } from "./viewport.js";
import { getVisibility } from "./visibility.js";

function createTileElement(documentObject, screenPosition, tileClass) {
  const tile = documentObject.createElement("div");
  tile.className = `tile ${tileClass}`;
  tile.style.left = `${screenPosition.x}px`;
  tile.style.top = `${screenPosition.y}px`;
  return tile;
}

function appendFog(documentObject, tile, isPartial) {
  const fog = documentObject.createElement("div");
  fog.className = isPartial ? "fog partially-visible" : "fog";
  tile.appendChild(fog);
}

function heroHasSwordState(state, config) {
  const baseAttack = config?.hero?.attack ?? 0;
  return state.inventory.sword > 0 || state.hero.attack > baseAttack;
}

export class DomRenderer {
  constructor(documentObject, config) {
    this.document = documentObject;
    this.config = config;
    this.field = documentObject.querySelector(".field");
    this.animationManager = null;
  }

  setConfig(config) {
    this.config = config;
  }

  setAnimationManager(animationManager) {
    this.animationManager = animationManager;
  }

  render(state) {
    if (!this.field) {
      return;
    }

    this.field.innerHTML = "";

    if (state.run.status === GAME_STATUS.IDLE || !state.map.tiles.length) {
      return;
    }

    const fragment = this.document.createDocumentFragment();
    const bounds = getViewportBounds(state);

    for (let y = bounds.top; y < bounds.bottom; y += 1) {
      for (let x = bounds.left; x < bounds.right; x += 1) {
        fragment.appendChild(this.createTile(state, x, y));
      }
    }

    this.field.appendChild(fragment);
  }

  createTile(state, x, y) {
    const visibility = getVisibility(state, this.config, x, y);
    const screenPosition = worldToScreen(state, x, y);
    const tile = createTileElement(this.document, screenPosition, "floor");

    if (visibility === 0) {
      appendFog(this.document, tile, false);
      return tile;
    }

    const enemy = state.enemies.find((item) => item.x === x && item.y === y);
    const item = state.items.find((entry) => entry.x === x && entry.y === y);

    if (state.hero.x === x && state.hero.y === y) {
      const heroAnimationClasses = this.getAnimationClasses("hero");
      const isHeroAttacking = heroAnimationClasses.includes("anim-attack");
      const heroHasSword = heroHasSwordState(state, this.config);
      tile.className = "tile hero";

      if (heroHasSword) {
        tile.classList.add("hero-with-sword");
      }

      if (isHeroAttacking) {
        tile.classList.add(heroHasSword ? "hero-attack-sword" : "hero-attack-fist");
      }

      tile.classList.add(...heroAnimationClasses);
    } else if (enemy) {
      tile.className = `tile ${enemy.spriteClass || "enemy"}`;
      tile.classList.add(...this.getAnimationClasses(enemy.id));
      const hpPercent = Math.max(0, Math.round((enemy.hp / enemy.maxHp) * 100));
      const healthBar = this.document.createElement("div");
      healthBar.className = "health-bar";
      healthBar.style.width = `${(30 * hpPercent) / 100}px`;
      tile.appendChild(healthBar);
    } else if (state.princess.x === x && state.princess.y === y) {
      tile.className = "tile princess";
    } else if (state.door.x === x && state.door.y === y) {
      tile.className = "tile door";
    } else if (item) {
      tile.className =
        item.type === ITEM_TYPES.SWORD ? "tile sword" : "tile potion";
    } else if (state.map.tiles[y][x] === TILE_TYPES.WALL) {
      tile.className = "tile wall";
    } else {
      tile.className = "tile floor";
    }

    if (visibility === 1) {
      appendFog(this.document, tile, true);
    }

    return tile;
  }

  getAnimationClasses(entityKey) {
    if (!this.animationManager) {
      return [];
    }

    return this.animationManager.getEntityAnimationClasses(entityKey);
  }
}

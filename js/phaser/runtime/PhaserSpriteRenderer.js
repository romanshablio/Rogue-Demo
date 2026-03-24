import { ITEM_TYPES, TILE_TYPES } from "../../game/core/constants.js";
import { getViewportBounds } from "../../game/render/viewport.js";
import { getVisibility } from "../../game/render/visibility.js";

const COLOR = Object.freeze({
  floor: 0x42505f,
  panel: 0x121923,
  hpBarBg: 0x1c1111,
  hpBarFill: 0xb22222,
});

function heroHasSwordState(state, config) {
  const baseAttack = config?.hero?.attack ?? 0;
  return state.inventory.sword > 0 || state.hero.attack > baseAttack;
}

function getHeroTextureKey(state, config, animationClasses) {
  const isHeroAttacking = animationClasses.includes("anim-attack");
  const heroHasSword = heroHasSwordState(state, config);

  if (isHeroAttacking) {
    return heroHasSword ? "hero-attack-sword" : "hero-attack-fist";
  }

  return heroHasSword ? "hero-with-sword" : "hero";
}

function getEnemyTextureKey(enemy) {
  if (enemy.spriteClass?.includes("enemy-heavy")) {
    return "enemy-heavy";
  }

  if (enemy.spriteClass?.includes("enemy-ranged")) {
    return "enemy-ranged";
  }

  return "enemy";
}

function applyAnimationVisuals(sprite, animationClasses = []) {
  if (!animationClasses.length) {
    return;
  }

  if (animationClasses.includes("anim-attack")) {
    sprite.setScale(sprite.scaleX * 1.08, sprite.scaleY * 1.08);
    sprite.setAngle(-4);
  }

  if (animationClasses.includes("anim-damage")) {
    sprite.setTint(0xff8b8b);
    sprite.setScale(sprite.scaleX * 1.06, sprite.scaleY * 1.06);
  }

  if (animationClasses.includes("anim-heal")) {
    sprite.setTint(0x8ff0b5);
    sprite.setScale(sprite.scaleX * 1.04, sprite.scaleY * 1.04);
  }
}

export class PhaserSpriteRenderer {
  constructor(scene, animationManager = null) {
    this.scene = scene;
    this.animationManager = animationManager;
    this.root = scene.add.container(0, 0);
    this.tileSize = 24;
    this.offsetX = 16;
    this.offsetY = 96;
    this.bounds = null;
  }

  setAnimationManager(animationManager) {
    this.animationManager = animationManager;
  }

  getAnimationClasses(entityKey) {
    return this.animationManager?.getEntityAnimationClasses?.(entityKey) || [];
  }

  renderState(state, layoutMetrics = {}, config = null) {
    if (!state?.map?.tiles?.length) {
      this.root.removeAll(true);
      return;
    }

    const topOffset = Math.max(96, layoutMetrics.topInset || 96);
    const footerOffset = Math.max(56, layoutMetrics.bottomInset || 56);
    const availableWidth = Math.max(160, this.scene.scale.width - 32);
    const availableHeight = Math.max(
      160,
      this.scene.scale.height - topOffset - footerOffset
    );
    const fitTileWidth = Math.floor(
      availableWidth / Math.max(1, state.map.viewport.width)
    );
    const fitTileHeight = Math.floor(
      availableHeight / Math.max(1, state.map.viewport.height)
    );
    this.tileSize = Math.max(12, Math.min(40, fitTileWidth, fitTileHeight));

    const bounds = getViewportBounds(state);
    const offsetX = 16;
    const offsetY = topOffset;
    this.bounds = bounds;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    this.root.removeAll(true);

    const panel = this.scene.add.rectangle(
      offsetX - 4,
      offsetY - 4,
      state.map.viewport.width * this.tileSize + 8,
      state.map.viewport.height * this.tileSize + 8,
      COLOR.panel,
      1
    );
    panel.setOrigin(0, 0);
    this.root.add(panel);

    for (let y = bounds.top; y < bounds.bottom; y += 1) {
      for (let x = bounds.left; x < bounds.right; x += 1) {
        const screenX = offsetX + (x - bounds.left) * this.tileSize;
        const screenY = offsetY + (y - bounds.top) * this.tileSize;
        const visibility = config ? getVisibility(state, config, x, y) : 2;

        const floor = this.scene.add.rectangle(
          screenX,
          screenY,
          this.tileSize - 1,
          this.tileSize - 1,
          COLOR.floor,
          1
        );
        floor.setOrigin(0, 0);
        this.root.add(floor);

        if (visibility === 0) {
          const fog = this.scene.add.rectangle(
            screenX,
            screenY,
            this.tileSize - 1,
            this.tileSize - 1,
            0x05070b,
            1
          );
          fog.setOrigin(0, 0);
          this.root.add(fog);
          continue;
        }

        const enemy = state.enemies.find((item) => item.x === x && item.y === y);
        const item = state.items.find((entry) => entry.x === x && entry.y === y);

        if (state.map.tiles[y][x] === TILE_TYPES.WALL) {
          this.root.add(this.createSprite(screenX, screenY, "wall"));
        }

        if (state.door.x === x && state.door.y === y) {
          this.root.add(this.createSprite(screenX, screenY, "door"));
        }

        if (state.princess.x === x && state.princess.y === y) {
          this.root.add(this.createSprite(screenX, screenY, "princess"));
        }

        if (item) {
          this.root.add(
            this.createSprite(
              screenX,
              screenY,
              item.type === ITEM_TYPES.SWORD ? "sword" : "potion"
            )
          );
        }

        if (enemy) {
          const enemyAnimationClasses = this.getAnimationClasses(enemy.id);
          this.root.add(
            this.createSprite(
              screenX,
              screenY,
              getEnemyTextureKey(enemy),
              enemyAnimationClasses
            )
          );
          this.root.add(this.createEnemyHealthBar(enemy, screenX, screenY));
        }

        if (state.hero.x === x && state.hero.y === y) {
          const heroAnimationClasses = this.getAnimationClasses("hero");
          this.root.add(
            this.createSprite(
              screenX,
              screenY,
              getHeroTextureKey(state, config, heroAnimationClasses),
              heroAnimationClasses
            )
          );
        }

        if (visibility === 1) {
          const partialFog = this.scene.add.rectangle(
            screenX,
            screenY,
            this.tileSize - 1,
            this.tileSize - 1,
            0x05070b,
            0.45
          );
          partialFog.setOrigin(0, 0);
          this.root.add(partialFog);
        }
      }
    }
  }

  createSprite(screenX, screenY, textureKey, animationClasses = []) {
    const sprite = this.scene.add.image(
      screenX + this.tileSize / 2,
      screenY + this.tileSize / 2,
      textureKey
    );
    const scale = Math.min(
      (this.tileSize - 4) / sprite.width,
      (this.tileSize - 4) / sprite.height
    );
    sprite.setScale(scale);
    applyAnimationVisuals(sprite, animationClasses);
    return sprite;
  }

  createEnemyHealthBar(enemy, screenX, screenY) {
    const container = this.scene.add.container(screenX, screenY + this.tileSize - 5);
    const width = Math.max(18, Math.round(this.tileSize * 0.6));
    const hpPercent = Math.max(0, Math.round((enemy.hp / enemy.maxHp) * 100));
    const background = this.scene.add.rectangle(0, 0, width, 4, COLOR.hpBarBg, 1);
    const fill = this.scene.add.rectangle(
      -(width / 2) + (width * hpPercent) / 200,
      0,
      Math.max(1, (width * hpPercent) / 100),
      3,
      COLOR.hpBarFill,
      1
    );

    container.add([background, fill]);
    return container;
  }

  getTileCenter(worldX, worldY) {
    if (!this.bounds) {
      return null;
    }

    if (
      worldX < this.bounds.left ||
      worldX >= this.bounds.right ||
      worldY < this.bounds.top ||
      worldY >= this.bounds.bottom
    ) {
      return null;
    }

    return {
      x:
        this.offsetX +
        (worldX - this.bounds.left) * this.tileSize +
        this.tileSize / 2,
      y:
        this.offsetY +
        (worldY - this.bounds.top) * this.tileSize +
        this.tileSize / 2,
    };
  }
}

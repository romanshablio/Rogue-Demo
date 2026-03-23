import {
  DEFAULT_LEVEL_ID,
  GAME_STATUS,
  ITEM_TYPES,
  TILE_TYPES,
} from "./constants.js";
import { cloneState, createInitialState, createViewport } from "./state.js";

function getInventoryKey(itemType) {
  return itemType === ITEM_TYPES.SWORD ? "sword" : "potion";
}

export class GameCore {
  constructor({
    config,
    configBuilder,
    windowObject,
    documentObject,
    renderer,
    hud,
    audio,
    animationManager,
    saveManager,
    levelRegistry,
    enemyTypeRegistry,
    difficultyOptions,
    defaultDifficultyId,
  }) {
    this.config = config;
    this.configBuilder = configBuilder;
    this.window = windowObject;
    this.document = documentObject;
    this.renderer = renderer;
    this.hud = hud;
    this.audio = audio;
    this.animationManager = animationManager;
    this.saveManager = saveManager;
    this.levelRegistry = levelRegistry;
    this.enemyTypeRegistry = enemyTypeRegistry;
    this.difficultyOptions = difficultyOptions || [];
    this.defaultDifficultyId = defaultDifficultyId || config.difficultyId;
    this.currentDifficultyId = config.difficultyId || this.defaultDifficultyId;
    this.systems = [];
    this.listeners = new Set();
    this.restartTimer = null;
    this.state = createInitialState(config, windowObject);
  }

  registerLevel(id, factory) {
    this.levelRegistry.register(id, factory);
  }

  registerEnemyType(id, definition) {
    this.enemyTypeRegistry.register(id, definition);
  }

  registerSystem(system) {
    this.systems.push(system);
  }

  getState() {
    return this.state;
  }

  getDifficultyOptions() {
    return this.difficultyOptions;
  }

  getAudioSettings() {
    return this.audio.getSettings();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  start(options = {}) {
    const normalizedOptions =
      typeof options === "string" ? { levelId: options } : options;
    const levelId = normalizedOptions.levelId || DEFAULT_LEVEL_ID;
    const difficultyId =
      normalizedOptions.difficultyId ||
      this.currentDifficultyId ||
      this.defaultDifficultyId;

    if (this.restartTimer) {
      this.window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.currentDifficultyId = difficultyId;
    if (this.configBuilder) {
      this.config = this.configBuilder(difficultyId);
    }

    this.renderer?.setConfig?.(this.config);
    this.state = createInitialState(this.config, this.window);
    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.run.currentLevelId = levelId;
    this.state.run.currentDifficultyId = difficultyId;
    this.state.run.currentFloor = 1;
    this.state.run.maxFloorCount = this.config.floorCount || 1;
    this.state.ui.restartMenuOpen = false;

    this.loadFloor(1);
    this.audio.stopMainMenuMusic();
    this.audio.playBackgroundMusic();
    this.runHook("onGameStart");
    this.render();
    this.showMessage(this.config.messages.intro);
  }

  restart() {
    this.start({
      levelId: this.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      difficultyId:
        this.state.run.currentDifficultyId ||
        this.currentDifficultyId ||
        this.defaultDifficultyId,
    });
  }

  loadFloor(floorNumber, progressSnapshot = null) {
    const level = this.levelRegistry.create(
      this.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      {
        config: this.config,
        enemyTypes: this.enemyTypeRegistry,
        floorNumber,
      }
    );

    this.animationManager.clearAll();
    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.run.turn = 0;
    this.state.run.currentFloor = floorNumber;
    this.state.ui.restartMenuOpen = false;
    this.state.map.width = level.map[0].length;
    this.state.map.height = level.map.length;
    this.state.map.tiles = level.map;
    this.state.map.metadata = level.metadata || {};
    this.state.map.viewport = createViewport(this.window, this.config.tileSize);
    this.state.door = { ...level.doorSpawn };
    this.state.princess = { ...level.entities.princess };
    this.state.enemies = level.entities.enemies.map((enemy) => ({ ...enemy }));
    this.state.items = level.items.map((item) => ({ ...item }));

    if (progressSnapshot) {
      this.state.hero = {
        ...progressSnapshot.hero,
        x: level.heroSpawn.x,
        y: level.heroSpawn.y,
      };
      this.state.inventory = { ...progressSnapshot.inventory };
    } else {
      this.state.hero = { ...level.heroSpawn };
      this.state.inventory = {
        sword: 0,
        potion: 0,
      };
    }
  }

  captureProgressSnapshot() {
    return {
      hero: {
        hp: this.state.hero.hp,
        maxHp: this.state.hero.maxHp,
        attack: this.state.hero.attack,
      },
      inventory: { ...this.state.inventory },
    };
  }

  advanceFloor() {
    if (this.state.run.currentFloor >= this.state.run.maxFloorCount) {
      this.handleVictory();
      return;
    }

    const nextFloor = this.state.run.currentFloor + 1;
    const snapshot = this.captureProgressSnapshot();
    this.loadFloor(nextFloor, snapshot);
    this.runHook("onGameStart");
    this.render();
    this.showMessage(
      `${this.config.messages.nextFloor} Этаж ${nextFloor}/${this.state.run.maxFloorCount}.`,
      { type: "success", durationMs: 2600 }
    );
  }

  exitToMainMenu() {
    if (this.restartTimer) {
      this.window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.animationManager.clearAll();
    this.state = createInitialState(this.config, this.window);
    this.state.run.status = GAME_STATUS.IDLE;
    this.state.run.currentDifficultyId =
      this.currentDifficultyId || this.defaultDifficultyId;
    this.audio.stopBackgroundMusic();
    this.audio.playMainMenuMusic();

    if (this.hud && typeof this.hud.clearMessage === "function") {
      this.hud.clearMessage();
    }

    this.render();
  }

  openRestartMenu() {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return;
    }

    this.state.run.status = GAME_STATUS.PAUSED;
    this.state.ui.restartMenuOpen = true;
    this.render();
  }

  closeRestartMenu() {
    if (!this.state.ui.restartMenuOpen) {
      return;
    }

    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.ui.restartMenuOpen = false;
    this.render();
  }

  toggleRestartMenu() {
    if (this.state.run.status === GAME_STATUS.RUNNING) {
      this.openRestartMenu();
      return;
    }

    if (this.state.run.status === GAME_STATUS.PAUSED) {
      this.closeRestartMenu();
    }
  }

  restartRunFromMenu() {
    this.state.ui.restartMenuOpen = false;
    this.restart();
  }

  moveHero(dx, dy) {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return false;
    }

    const nextX = this.state.hero.x + dx;
    const nextY = this.state.hero.y + dy;
    const movedIntoPrincessCell =
      this.state.princess.x === nextX && this.state.princess.y === nextY;

    if (!this.isWalkableTile(nextX, nextY) || this.findEnemyAt(nextX, nextY)) {
      return false;
    }

    const previousHeroPosition = {
      x: this.state.hero.x,
      y: this.state.hero.y,
    };

    if (
      movedIntoPrincessCell &&
      this.state.princess.isFollowing &&
      !this.state.princess.rescued
    ) {
      this.state.princess.x = previousHeroPosition.x;
      this.state.princess.y = previousHeroPosition.y;
    } else if (movedIntoPrincessCell) {
      return false;
    }

    this.state.hero.x = nextX;
    this.state.hero.y = nextY;
    this.runHook("onHeroMoved", {
      previousHeroPosition,
      movedIntoPrincessCell,
    });
    this.render();

    return true;
  }

  heroAttack() {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return false;
    }

    this.runHook("onHeroAttack");
    this.render();
    return true;
  }

  useInventoryItem(itemType) {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return false;
    }

    const inventoryKey = getInventoryKey(itemType);
    if (!this.state.inventory[inventoryKey]) {
      this.showMessage(this.config.messages.noItemInInventory, { type: "info" });
      return false;
    }

    if (itemType === ITEM_TYPES.POTION && this.state.hero.hp >= this.state.hero.maxHp) {
      this.showMessage(this.config.messages.potionFullHp, { type: "info" });
      return false;
    }

    this.state.inventory[inventoryKey] -= 1;

    if (itemType === ITEM_TYPES.SWORD) {
      this.state.hero.attack += 10;
      this.showMessage(this.config.messages.swordUse, { type: "success" });
    }

    if (itemType === ITEM_TYPES.POTION) {
      this.state.hero.hp = Math.min(this.state.hero.maxHp, this.state.hero.hp + 20);
      this.audio.playPotion();
      this.showMessage(this.config.messages.potionUse, { type: "success" });
      this.animationManager.playEntity("hero", "heal");
    }

    this.render();
    return true;
  }

  addItemToInventory(item) {
    const inventoryKey = getInventoryKey(item.type);
    this.state.inventory[inventoryKey] += 1;

    if (item.type === ITEM_TYPES.SWORD) {
      this.showMessage(this.config.messages.swordPickup, { type: "success" });
    } else {
      this.showMessage(this.config.messages.potionPickup, { type: "success" });
    }
  }

  advanceTurn() {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return;
    }

    this.state.run.turn += 1;
    this.runHook("beforeTurn");
    this.runHook("afterTurn");
    this.render();
  }

  toggleFog() {
    if (this.state.run.status === GAME_STATUS.IDLE) {
      return;
    }

    this.state.run.fogEnabled = !this.state.run.fogEnabled;
    this.render();
  }

  resizeViewport() {
    this.state.map.viewport = createViewport(this.window, this.config.tileSize);
    this.render();
  }

  render() {
    this.renderer.render(this.state);
    this.hud.render(this.state);
    this.runHook("onRender");
    this.notify();
  }

  snapshot() {
    return cloneState(this.state);
  }

  updateAudioSettings(nextSettings) {
    this.audio.applySettings(nextSettings);
    this.saveManager?.saveAudioSettings?.(this.audio.getSettings());

    if (this.state.run.status === GAME_STATUS.IDLE) {
      this.audio.playMainMenuMusic();
    } else if (
      this.state.run.status === GAME_STATUS.RUNNING ||
      this.state.run.status === GAME_STATUS.PAUSED
    ) {
      this.audio.playBackgroundMusic();
    }
  }

  showMessage(message, options) {
    if (this.hud && typeof this.hud.showMessage === "function") {
      this.hud.showMessage(message, options);
    }
  }

  handleHeroDeath() {
    if (this.state.run.status === GAME_STATUS.GAME_OVER) {
      return;
    }

    this.state.run.status = GAME_STATUS.GAME_OVER;
    this.audio.playDeath();
    this.render();
    this.showMessage(this.config.messages.death, { type: "error" });
    this.scheduleRestart(1200);
  }

  handleVictory() {
    this.state.run.status = GAME_STATUS.GAME_OVER;
    this.render();
    this.showMessage(this.config.messages.victory, {
      type: "success",
      durationMs: 3000,
    });
    this.scheduleRestart(1800);
  }

  scheduleRestart(delayMs) {
    if (this.restartTimer) {
      this.window.clearTimeout(this.restartTimer);
    }

    this.restartTimer = this.window.setTimeout(() => {
      this.restartTimer = null;
      this.restart();
    }, delayMs);
  }

  findEnemyAt(x, y) {
    return this.state.enemies.find((enemy) => enemy.x === x && enemy.y === y) || null;
  }

  findItemAt(x, y) {
    return this.state.items.find((item) => item.x === x && item.y === y) || null;
  }

  removeEnemy(enemyId) {
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.id !== enemyId);
  }

  removeItem(itemId) {
    this.state.items = this.state.items.filter((item) => item.id !== itemId);
  }

  getEnemyType(typeId) {
    return this.enemyTypeRegistry.get(typeId);
  }

  isWalkableTile(x, y) {
    return (
      x >= 0 &&
      x < this.state.map.width &&
      y >= 0 &&
      y < this.state.map.height &&
      this.state.map.tiles[y][x] !== TILE_TYPES.WALL
    );
  }

  isHeroAt(x, y) {
    return this.state.hero.x === x && this.state.hero.y === y;
  }

  isDoorAt(x, y) {
    return this.state.door.x === x && this.state.door.y === y;
  }

  canEnemyMoveTo(x, y, movingEnemyId) {
    if (!this.isWalkableTile(x, y)) {
      return false;
    }

    if (this.isHeroAt(x, y) || this.isDoorAt(x, y)) {
      return false;
    }

    if (this.state.princess.x === x && this.state.princess.y === y) {
      return false;
    }

    return !this.state.enemies.some(
      (enemy) => enemy.id !== movingEnemyId && enemy.x === x && enemy.y === y
    );
  }

  runHook(name, payload) {
    for (const system of this.systems) {
      if (typeof system[name] === "function") {
        system[name](this, payload);
      }
    }
  }
}

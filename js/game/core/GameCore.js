import {
  DEFAULT_LEVEL_ID,
  GAME_STATUS,
  ITEM_TYPES,
  TILE_TYPES,
} from "./constants.js";
import { NullAnimationManager } from "../animation/NullAnimationManager.js";
import { NullAudioManager } from "../audio/NullAudioManager.js";
import { NullHudAdapter } from "../ui/NullHudAdapter.js";
import { createGameEventBus } from "./GameEventBus.js";
import { createHeadlessRuntimeEnvironment } from "../runtime/RuntimeEnvironment.js";
import { cloneState, createInitialState } from "./state.js";

function getInventoryKey(itemType) {
  return itemType === ITEM_TYPES.SWORD ? "sword" : "potion";
}

export class GameCore {
  constructor({
    config,
    configBuilder,
    runtimeEnvironment,
    hud,
    audio,
    animationManager,
    saveManager,
    levelRegistry,
    enemyTypeRegistry,
    difficultyOptions,
    defaultDifficultyId,
    eventBus,
  }) {
    this.config = config;
    this.configBuilder = configBuilder;
    this.runtime = runtimeEnvironment || createHeadlessRuntimeEnvironment();
    this.hud = hud || new NullHudAdapter();
    this.audio = audio || new NullAudioManager();
    this.animationManager = animationManager || new NullAnimationManager();
    this.saveManager = saveManager;
    this.levelRegistry = levelRegistry;
    this.enemyTypeRegistry = enemyTypeRegistry;
    this.difficultyOptions = difficultyOptions || [];
    this.defaultDifficultyId = defaultDifficultyId || config.difficultyId;
    this.currentDifficultyId = config.difficultyId || this.defaultDifficultyId;
    this.systems = [];
    this.stateListeners = new Set();
    this.eventBus = eventBus || createGameEventBus();
    this.restartTimer = null;
    this.state = createInitialState(
      config,
      this.runtime.getViewport(config.tileSize)
    );
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
    return this.audio.getSettings?.() || {
      musicEnabled: true,
      sfxEnabled: true,
    };
  }

  subscribe(listener) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  subscribeToEvents(listener) {
    return this.eventBus.subscribe(listener);
  }

  notify() {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  emitEvent(type, payload = {}) {
    this.eventBus.emit({
      type,
      payload,
      state: this.state,
    });
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
      this.runtime.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.currentDifficultyId = difficultyId;
    if (this.configBuilder) {
      this.config = this.configBuilder(difficultyId);
    }

    this.state = createInitialState(
      this.config,
      this.runtime.getViewport(this.config.tileSize)
    );
    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.run.currentLevelId = levelId;
    this.state.run.currentDifficultyId = difficultyId;
    this.state.run.currentFloor = 1;
    this.state.run.maxFloorCount = this.config.floorCount || 1;
    this.state.ui.restartMenuOpen = false;
    this.emitEvent("configChanged", {
      config: this.config,
    });

    this.loadFloor(1);
    this.stopMainMenuMusic();
    this.playBackgroundMusic();
    this.runHook("onGameStart");
    this.emitEvent("runStarted", {
      levelId,
      difficultyId,
    });
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
    this.state.map.viewport = this.runtime.getViewport(this.config.tileSize);
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

    this.emitEvent("floorLoaded", {
      floorNumber,
      levelId: this.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      usedProgressSnapshot: Boolean(progressSnapshot),
    });
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
    this.emitEvent("floorAdvanced", {
      floorNumber: nextFloor,
    });
    this.render();
    this.showMessage(
      `${this.config.messages.nextFloor} Этаж ${nextFloor}/${this.state.run.maxFloorCount}.`,
      { type: "success", durationMs: 2600 }
    );
  }

  exitToMainMenu() {
    if (this.restartTimer) {
      this.runtime.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.animationManager.clearAll();
    this.state = createInitialState(
      this.config,
      this.runtime.getViewport(this.config.tileSize)
    );
    this.state.run.status = GAME_STATUS.IDLE;
    this.state.run.currentDifficultyId =
      this.currentDifficultyId || this.defaultDifficultyId;
    this.stopBackgroundMusic();
    this.playMainMenuMusic();

    this.clearMessage();

    this.emitEvent("returnedToMainMenu");
    this.render();
  }

  openRestartMenu() {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return;
    }

    this.state.run.status = GAME_STATUS.PAUSED;
    this.state.ui.restartMenuOpen = true;
    this.emitEvent("restartMenuOpened");
    this.render();
  }

  closeRestartMenu() {
    if (!this.state.ui.restartMenuOpen) {
      return;
    }

    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.ui.restartMenuOpen = false;
    this.emitEvent("restartMenuClosed");
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
    this.emitEvent("heroMoved", {
      from: previousHeroPosition,
      to: {
        x: nextX,
        y: nextY,
      },
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
    this.emitEvent("heroAttacked", {
      origin: {
        x: this.state.hero.x,
        y: this.state.hero.y,
      },
      attack: this.state.hero.attack,
    });
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
      this.playSoundEffect("potion");
      this.showMessage(this.config.messages.potionUse, { type: "success" });
      this.animationManager.playEntity("hero", "heal");
    }

    this.emitEvent("inventoryItemUsed", {
      itemType,
      inventoryKey,
      remainingCount: this.state.inventory[inventoryKey],
    });
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

    this.emitEvent("itemPicked", {
      itemId: item.id,
      itemType: item.type,
      inventoryKey,
      inventoryCount: this.state.inventory[inventoryKey],
    });
  }

  advanceTurn() {
    if (this.state.run.status !== GAME_STATUS.RUNNING) {
      return;
    }

    this.state.run.turn += 1;
    this.runHook("beforeTurn");
    this.runHook("afterTurn");
    this.emitEvent("turnAdvanced", {
      turn: this.state.run.turn,
    });
    this.render();
  }

  toggleFog() {
    if (this.state.run.status === GAME_STATUS.IDLE) {
      return;
    }

    this.state.run.fogEnabled = !this.state.run.fogEnabled;
    this.emitEvent("fogToggled", {
      enabled: this.state.run.fogEnabled,
    });
    this.render();
  }

  resizeViewport() {
    this.state.map.viewport = this.runtime.getViewport(this.config.tileSize);
    this.emitEvent("viewportResized", {
      viewport: { ...this.state.map.viewport },
    });
    this.render();
  }

  render() {
    this.notify();
    this.runHook("onRender");
  }

  snapshot() {
    return cloneState(this.state);
  }

  updateAudioSettings(nextSettings) {
    this.audio.applySettings?.(nextSettings);
    this.saveManager?.saveAudioSettings?.(this.getAudioSettings());

    if (this.state.run.status === GAME_STATUS.IDLE) {
      this.playMainMenuMusic();
    } else if (
      this.state.run.status === GAME_STATUS.RUNNING ||
      this.state.run.status === GAME_STATUS.PAUSED
    ) {
      this.playBackgroundMusic();
    }

    this.emitEvent("audioSettingsUpdated", {
      settings: this.getAudioSettings(),
    });
  }

  showMessage(message, options) {
    if (this.hud && typeof this.hud.showMessage === "function") {
      this.hud.showMessage(message, options);
    }

    this.emitEvent("messageShown", {
      message,
      options: options || {},
    });
  }

  clearMessage() {
    this.hud?.clearMessage?.();
  }

  setUseItemHandler(handler) {
    this.hud?.setUseItemHandler?.(handler);
  }

  playSoundEffect(cueId) {
    this.audio.playCue?.(cueId);
    this.emitEvent("soundEffectPlayed", {
      cueId,
    });
  }

  playBackgroundMusic() {
    this.audio.playBackgroundMusic?.();
    this.emitEvent("backgroundMusicRequested");
  }

  stopBackgroundMusic() {
    this.audio.stopBackgroundMusic?.();
  }

  playMainMenuMusic() {
    this.audio.playMainMenuMusic?.();
    this.emitEvent("mainMenuMusicRequested");
  }

  stopMainMenuMusic() {
    this.audio.stopMainMenuMusic?.();
  }

  handleHeroDeath() {
    if (this.state.run.status === GAME_STATUS.GAME_OVER) {
      return;
    }

    this.state.run.status = GAME_STATUS.GAME_OVER;
    this.playSoundEffect("death");
    this.render();
    this.showMessage(this.config.messages.death, { type: "error" });
    this.emitEvent("runLost");
    this.scheduleRestart(1200);
  }

  handleVictory() {
    this.state.run.status = GAME_STATUS.GAME_OVER;
    this.render();
    this.showMessage(this.config.messages.victory, {
      type: "success",
      durationMs: 3000,
    });
    this.emitEvent("runWon");
    this.scheduleRestart(1800);
  }

  scheduleRestart(delayMs) {
    if (this.restartTimer) {
      this.runtime.clearTimeout(this.restartTimer);
    }

    this.restartTimer = this.runtime.setTimeout(() => {
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
    this.emitEvent("enemyRemoved", {
      enemyId,
    });
  }

  removeItem(itemId) {
    this.state.items = this.state.items.filter((item) => item.id !== itemId);
    this.emitEvent("itemRemoved", {
      itemId,
    });
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

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

function normalizeFacingX(value) {
  return value === -1 ? -1 : 1;
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
    const requestedStartFloor = Math.max(
      1,
      Math.floor(normalizedOptions.startFloor || 1)
    );
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
    this.state.run.currentFloor = requestedStartFloor;
    this.state.run.maxFloorCount = this.config.floorCount || 1;
    this.state.ui.restartMenuOpen = false;
    this.emitEvent("configChanged", {
      config: this.config,
    });

    this.loadFloor(Math.min(requestedStartFloor, this.state.run.maxFloorCount));
    this.stopMainMenuMusic();
    this.playBackgroundMusic();
    this.runHook("onGameStart");
    this.emitEvent("runStarted", {
      levelId,
      difficultyId,
      startFloor: this.state.run.currentFloor,
    });
    this.render();
    this.showMessage(
      requestedStartFloor <= 1
        ? this.config.messages.intro
        : this.state.map.metadata?.entryMessage ||
            `${this.config.messages.nextFloor} Этаж ${this.state.run.currentFloor}/${this.state.run.maxFloorCount}.`
    );
    this.persistRunState();
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

  getSavedRun() {
    const savedRun = this.saveManager?.load?.();

    if (!savedRun || typeof savedRun !== "object") {
      return null;
    }

    if (
      !savedRun.state ||
      !savedRun.state.run ||
      !savedRun.state.hero ||
      !savedRun.state.inventory ||
      !savedRun.state.map ||
      !Array.isArray(savedRun.state.map.tiles)
    ) {
      this.saveManager?.clear?.();
      return null;
    }

    return savedRun;
  }

  getSavedRunSummary() {
    const savedRun = this.getSavedRun();

    if (!savedRun) {
      return null;
    }

    return {
      difficultyId:
        savedRun.difficultyId ||
        savedRun.state.run.currentDifficultyId ||
        this.defaultDifficultyId,
      currentFloor: Math.max(1, Math.floor(savedRun.state.run.currentFloor || 1)),
      levelId: savedRun.levelId || savedRun.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      savedAt: savedRun.savedAt || null,
    };
  }

  loadSavedRun() {
    const savedRun = this.getSavedRun();

    if (!savedRun) {
      return false;
    }

    if (this.restartTimer) {
      this.runtime.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    const difficultyId =
      savedRun.difficultyId ||
      savedRun.state.run.currentDifficultyId ||
      this.defaultDifficultyId;

    this.currentDifficultyId = difficultyId;
    if (this.configBuilder) {
      this.config = this.configBuilder(difficultyId);
    }

    this.animationManager.clearAll();
    this.state = cloneState(savedRun.state);
    this.state.run.status = GAME_STATUS.RUNNING;
    this.state.run.currentDifficultyId = difficultyId;
    this.state.run.currentLevelId =
      this.state.run.currentLevelId || savedRun.levelId || DEFAULT_LEVEL_ID;
    this.state.run.maxFloorCount =
      this.config.floorCount || this.state.run.maxFloorCount || 1;
    this.state.ui.restartMenuOpen = false;
    this.state.map.viewport = this.runtime.getViewport(this.config.tileSize);
    this.state.hero.facingX = normalizeFacingX(this.state.hero.facingX);
    this.emitEvent("configChanged", {
      config: this.config,
    });
    this.stopMainMenuMusic();
    this.playBackgroundMusic();
    this.runHook("onGameStart");
    this.emitEvent("runLoaded", {
      difficultyId,
      floorNumber: this.state.run.currentFloor,
      levelId: this.state.run.currentLevelId,
    });
    this.render();
    this.showMessage(
      `Продолжение игры. Этаж ${this.state.run.currentFloor}/${this.state.run.maxFloorCount}.`,
      { type: "success", durationMs: 2400 }
    );
    this.persistRunState();

    return true;
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

    this.state.hero.facingX = normalizeFacingX(this.state.hero.facingX);

    this.emitEvent("floorLoaded", {
      floorNumber,
      levelId: this.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      usedProgressSnapshot: Boolean(progressSnapshot),
    });
  }

  captureProgressSnapshot() {
    return {
      hero: {
        facingX: this.state.hero.facingX,
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
    const existingProgression = this.saveManager?.loadProgression?.();
    this.saveManager?.saveProgression?.({
      maxUnlockedFloor: Math.max(
        existingProgression?.maxUnlockedFloor || 1,
        Math.min(nextFloor, this.config.floorCount || nextFloor)
      ),
    });
    this.loadFloor(nextFloor, snapshot);
    this.runHook("onGameStart");
    this.emitEvent("floorAdvanced", {
      floorNumber: nextFloor,
    });
    this.render();
    const floorMessage =
      this.state.map.metadata?.entryMessage ||
      `${this.config.messages.nextFloor} Этаж ${nextFloor}/${this.state.run.maxFloorCount}.`;
    this.showMessage(floorMessage, { type: "success", durationMs: 3000 });
    this.persistRunState();
  }

  exitToMainMenu() {
    if (this.restartTimer) {
      this.runtime.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.state.run.status !== GAME_STATUS.IDLE) {
      this.persistRunState();
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
    this.persistRunState();
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

    if (this.isPlatformerMode()) {
      return this.moveHeroPlatformer(dx, dy);
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

  moveHeroPlatformer(dx, dy) {
    if (dy !== 0 || dx === 0) {
      return false;
    }

    const nextX = this.state.hero.x + dx;
    const nextY = this.state.hero.y;

    if (!this.isWalkableTile(nextX, nextY) || this.findEnemyAt(nextX, nextY)) {
      return false;
    }

    const fallTarget = this.resolvePlatformerFallTarget(nextX, nextY);
    if (!fallTarget) {
      return false;
    }

    const movedIntoPrincessCell =
      this.state.princess.x === fallTarget.x &&
      this.state.princess.y === fallTarget.y;

    const previousHeroPosition = {
      x: this.state.hero.x,
      y: this.state.hero.y,
    };

    this.state.hero.facingX = normalizeFacingX(dx);

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

    this.state.hero.x = fallTarget.x;
    this.state.hero.y = fallTarget.y;
    this.runHook("onHeroMoved", {
      previousHeroPosition,
      movedIntoPrincessCell,
    });
    this.emitEvent("heroMoved", {
      from: previousHeroPosition,
      to: {
        x: fallTarget.x,
        y: fallTarget.y,
      },
      movedIntoPrincessCell,
      movementMode: "platformer",
    });
    this.render();

    return true;
  }

  jumpHero() {
    if (this.state.run.status !== GAME_STATUS.RUNNING || !this.isPlatformerMode()) {
      return false;
    }

    const landingCell = this.findPlatformerJumpLanding(
      normalizeFacingX(this.state.hero.facingX)
    );

    if (!landingCell) {
      return false;
    }

    if (
      this.state.princess.x === landingCell.x &&
      this.state.princess.y === landingCell.y
    ) {
      return false;
    }

    const previousHeroPosition = {
      x: this.state.hero.x,
      y: this.state.hero.y,
    };

    this.state.hero.x = landingCell.x;
    this.state.hero.y = landingCell.y;
    this.emitEvent("heroJumped", {
      from: previousHeroPosition,
      to: landingCell,
      facingX: this.state.hero.facingX,
    });
    this.runHook("onHeroMoved", {
      previousHeroPosition,
      movedIntoPrincessCell: false,
    });
    this.emitEvent("heroMoved", {
      from: previousHeroPosition,
      to: landingCell,
      movedIntoPrincessCell: false,
      movementMode: "platformer-jump",
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

  persistRunState() {
    if (this.state.run.status === GAME_STATUS.IDLE) {
      return;
    }

    this.saveManager?.save?.({
      version: 1,
      savedAt: Date.now(),
      difficultyId:
        this.state.run.currentDifficultyId ||
        this.currentDifficultyId ||
        this.defaultDifficultyId,
      levelId: this.state.run.currentLevelId || DEFAULT_LEVEL_ID,
      state: this.snapshot(),
    });
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
    this.saveManager?.clear?.();
    this.playSoundEffect("death");
    this.render();
    this.showMessage(this.config.messages.death, { type: "error" });
    this.emitEvent("runLost");
    this.scheduleRestart(1200);
  }

  handleVictory() {
    this.state.run.status = GAME_STATUS.GAME_OVER;
    this.saveManager?.clear?.();
    this.saveManager?.saveProgression?.({
      maxUnlockedFloor: Math.max(
        this.saveManager?.loadProgression?.()?.maxUnlockedFloor || 1,
        this.config.floorCount || this.state.run.currentFloor
      ),
    });
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

  isPlatformerMode() {
    return this.state.map.metadata?.movementMode === "platformer";
  }

  isSolidTile(x, y) {
    return (
      x >= 0 &&
      x < this.state.map.width &&
      y >= 0 &&
      y < this.state.map.height &&
      this.state.map.tiles[y][x] === TILE_TYPES.WALL
    );
  }

  isWalkableTile(x, y) {
    if (this.isPlatformerMode()) {
      return (
        x >= 0 &&
        x < this.state.map.width &&
        y >= 0 &&
        y < this.state.map.height &&
        this.state.map.tiles[y][x] === TILE_TYPES.FLOOR
      );
    }

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

  isPlatformerStandableCell(x, y) {
    return this.isWalkableTile(x, y) && this.isSolidTile(x, y + 1);
  }

  resolvePlatformerFallTarget(x, y) {
    if (!this.isWalkableTile(x, y)) {
      return null;
    }

    let targetY = y;
    while (
      targetY + 1 < this.state.map.height &&
      this.isWalkableTile(x, targetY + 1)
    ) {
      targetY += 1;
    }

    if (!this.isSolidTile(x, targetY + 1)) {
      return null;
    }

    return {
      x,
      y: targetY,
    };
  }

  isPlatformerJumpArcClear(origin, target) {
    const minX = Math.min(origin.x, target.x);
    const maxX = Math.max(origin.x, target.x);
    const minY = Math.min(origin.y, target.y);
    const maxY = Math.max(origin.y, target.y);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (x === target.x && y > target.y) {
          continue;
        }

        if (this.isSolidTile(x, y)) {
          return false;
        }
      }
    }

    return true;
  }

  findPlatformerJumpLanding(direction) {
    const jumpHeight = Math.max(1, this.state.map.metadata?.jumpHeight ?? 4);
    const jumpDistance = Math.max(1, this.state.map.metadata?.jumpDistance ?? 3);
    const origin = this.state.hero;
    const horizontalOffsets = [];

    for (let step = 1; step <= jumpDistance; step += 1) {
      horizontalOffsets.push(direction * step);
    }
    horizontalOffsets.push(0);

    for (let rise = jumpHeight; rise >= 1; rise -= 1) {
      for (const offsetX of horizontalOffsets) {
        const candidate = {
          x: origin.x + offsetX,
          y: origin.y - rise,
        };

        if (
          !this.isPlatformerStandableCell(candidate.x, candidate.y) ||
          this.findEnemyAt(candidate.x, candidate.y) ||
          (this.state.princess.x === candidate.x &&
            this.state.princess.y === candidate.y)
        ) {
          continue;
        }

        if (!this.isPlatformerJumpArcClear(origin, candidate)) {
          continue;
        }

        return candidate;
      }
    }

    return null;
  }

  canEnemyMoveTo(x, y, movingEnemyId) {
    if (this.isPlatformerMode()) {
      return false;
    }

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

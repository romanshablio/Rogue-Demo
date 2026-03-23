import { GAME_STATUS } from "./constants.js";

export function createViewport(windowObject, tileSize) {
  return {
    tileSize,
    width: Math.max(1, Math.floor(windowObject.innerWidth / tileSize) - 2),
    height: Math.max(1, Math.floor(windowObject.innerHeight / tileSize) - 2),
  };
}

export function createInitialState(config, windowObject) {
  return {
    run: {
      status: GAME_STATUS.IDLE,
      turn: 0,
      currentLevelId: null,
      currentDifficultyId: config.difficultyId || null,
      currentFloor: 1,
      maxFloorCount: config.floorCount || 1,
      fogEnabled: config.fogEnabledByDefault !== false,
    },
    map: {
      width: config.mapWidth,
      height: config.mapHeight,
      tiles: [],
      viewport: createViewport(windowObject, config.tileSize),
      metadata: {},
    },
    hero: {
      x: 0,
      y: 0,
      hp: config.hero.maxHp,
      maxHp: config.hero.maxHp,
      attack: config.hero.attack,
    },
    princess: {
      x: -1,
      y: -1,
      isFollowing: config.princess.following,
      rescued: config.princess.rescued,
    },
    door: {
      x: -1,
      y: -1,
    },
    enemies: [],
    items: [],
    inventory: {
      sword: 0,
      potion: 0,
    },
    ui: {
      restartMenuOpen: false,
    },
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

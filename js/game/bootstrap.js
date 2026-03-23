import { AnimationManager } from "./animation/AnimationManager.js";
import { AudioManager } from "./audio/AudioManager.js";
import { basicEnemyDefinition } from "./entities/basicEnemy.js";
import { EnemyTypeRegistry } from "./entities/EnemyTypeRegistry.js";
import { fastEnemyDefinition } from "./entities/fastEnemy.js";
import { heavyEnemyDefinition } from "./entities/heavyEnemy.js";
import { rangedEnemyDefinition } from "./entities/rangedEnemy.js";
import {
  BASIC_ENEMY_TYPE,
  DEFAULT_LEVEL_ID,
  FAST_ENEMY_TYPE,
  HEAVY_ENEMY_TYPE,
  RANGED_ENEMY_TYPE,
} from "./core/constants.js";
import {
  createConfig,
  DEFAULT_DIFFICULTY_ID,
  getDifficultyOptions,
} from "./core/config.js";
import { GameCore } from "./core/GameCore.js";
import { createDefaultLevel } from "./level/defaultLevel.js";
import { LevelRegistry } from "./level/LevelRegistry.js";
import { DomRenderer } from "./render/DomRenderer.js";
import { LocalStorageSaveManager } from "./save/LocalStorageSaveManager.js";
import { createCoreRulesSystem } from "./systems/coreRules.js";
import { DomHudAdapter } from "./ui/DomHudAdapter.js";

export function createGame({ document, window, jquery }) {
  const initialConfig = createConfig(DEFAULT_DIFFICULTY_ID);
  const levelRegistry = new LevelRegistry();
  const enemyTypeRegistry = new EnemyTypeRegistry();
  const renderer = new DomRenderer(document, initialConfig);
  const hud = new DomHudAdapter(document);
  const audio = new AudioManager(document);
  const animationManager = new AnimationManager(window);
  const saveManager = new LocalStorageSaveManager(window);
  const savedAudioSettings = saveManager.loadAudioSettings();

  if (savedAudioSettings) {
    audio.applySettings(savedAudioSettings);
  }

  const game = new GameCore({
    config: initialConfig,
    configBuilder: createConfig,
    windowObject: window,
    documentObject: document,
    renderer,
    hud,
    audio,
    animationManager,
    saveManager,
    levelRegistry,
    enemyTypeRegistry,
    difficultyOptions: getDifficultyOptions(),
    defaultDifficultyId: DEFAULT_DIFFICULTY_ID,
    jquery,
  });

  renderer.setAnimationManager?.(animationManager);

  game.registerEnemyType(BASIC_ENEMY_TYPE, basicEnemyDefinition);
  game.registerEnemyType(FAST_ENEMY_TYPE, fastEnemyDefinition);
  game.registerEnemyType(HEAVY_ENEMY_TYPE, heavyEnemyDefinition);
  game.registerEnemyType(RANGED_ENEMY_TYPE, rangedEnemyDefinition);
  game.registerLevel(DEFAULT_LEVEL_ID, createDefaultLevel);
  game.registerSystem(createCoreRulesSystem());

  window.addEventListener("resize", () => {
    game.resizeViewport();
  });

  return game;
}

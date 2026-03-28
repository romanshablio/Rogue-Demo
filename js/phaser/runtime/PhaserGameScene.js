import { createCoreGame } from "../../game/bootstrap.js";
import { AnimationManager } from "../../game/animation/AnimationManager.js";
import {
  getKeyboardPlayerAction,
  performPlayerAction,
  PLAYER_ACTIONS,
} from "../../game/input/playerActions.js";
import { createBrowserRuntimeEnvironment } from "../../game/runtime/RuntimeEnvironment.js";
import { LocalStorageSaveManager } from "../../game/save/LocalStorageSaveManager.js";
import { createMenuFlowController } from "../../game/ui/menuFlowController.js";
import { PhaserAudioManager } from "../audio/PhaserAudioManager.js";
import { PhaserCombatEffects } from "./PhaserCombatEffects.js";
import { PhaserHudOverlay } from "./PhaserHudOverlay.js";
import { PhaserInGameOverlay } from "./PhaserInGameOverlay.js";
import { PhaserMenuOverlay } from "./PhaserMenuOverlay.js";
import { PhaserPlatformerMode } from "./PhaserPlatformerMode.js";
import { PhaserSpriteRenderer } from "./PhaserSpriteRenderer.js";

const PhaserGlobal = globalThis.Phaser;
const PhaserSceneBase = PhaserGlobal?.Scene || class {};
const PHASER_VIEWPORT_TILE_SIZE = 30;
const PHASER_MAX_VIEWPORT_WIDTH = 14;
const PHASER_MAX_VIEWPORT_HEIGHT = 9;

export class PhaserGameScene extends PhaserSceneBase {
  constructor() {
    super("game");
    this.coreGame = null;
    this.currentState = null;
    this.unsubscribeState = null;
    this.unsubscribeEvents = null;
    this.worldRenderer = null;
    this.combatEffects = null;
    this.hudOverlay = null;
    this.inGameOverlay = null;
    this.menuOverlay = null;
    this.menuFlow = null;
    this.platformerMode = null;
  }

  preload() {
    this.load.audio("potion-sound", "sounds/potion.mp3");
    this.load.audio("attack-sound", "sounds/attack.mp3");
    this.load.audio("death-sound", "sounds/death.mp3");
    this.load.audio("pain-sound", "sounds/pain.mp3");
    this.load.audio("main-theme", "sounds/main_theme.m4a");
    this.load.audio("background-level-theme", "sounds/background_level_theme.m4a");
    this.load.image("wall", "img/wall.png");
    this.load.image("potion", "img/potion.png");
    this.load.image("sword", "img/sword.png");
    this.load.image("enemy", "img/enemy.png");
    this.load.image("enemy-heavy", "img/crabster_enemy.png");
    this.load.image("enemy-ranged", "img/crazy_man_enemy.png");
    this.load.image("hero", "img/hero.png");
    this.load.image("hero-rest", "img/aurora_rest.png");
    this.load.image("hero-with-sword", "img/hero_has_sword.png");
    this.load.image("hero-attack-sword", "img/hero_in_attack.png");
    this.load.image("hero-attack-fist", "img/hero_attacks_fist.png");
    this.load.spritesheet("hero-walk", "img/aurora_walking_animation.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet("hero-jump", "img/aurora-jump.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image("princess", "img/princess.png");
    this.load.image("door", "img/door.png");
    this.load.image("title-screen", "img/title.png");
    this.load.image("title-logo", "img/only_title.png");
    this.load.image("sky", "img/sky.jpg");
    this.load.image("ground-1", "img/ground_1.jpg");
    this.load.image("ground-2", "img/ground_2.jpg");
    this.load.image("sky-block", "img/sky_block.jpg");
    this.load.image("tree", "img/tree.png");
    this.load.image("tecno-tree", "img/tecno_tree.png");
    this.load.image("flowers", "img/flowers.png");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0b1017);
    const animationManager = new AnimationManager(window);
    this.worldRenderer = new PhaserSpriteRenderer(this, animationManager);
    this.combatEffects = new PhaserCombatEffects(this, this.worldRenderer);
    this.hudOverlay = new PhaserHudOverlay(this);
    this.inGameOverlay = new PhaserInGameOverlay(this);
    this.platformerMode = new PhaserPlatformerMode(this);
    const audio = new PhaserAudioManager(this);
    const saveManager = new LocalStorageSaveManager(window);
    const savedAudioSettings = saveManager.loadAudioSettings();

    if (savedAudioSettings) {
      audio.applySettings(savedAudioSettings);
    }

    this.coreGame = createCoreGame({
      runtimeEnvironment: createBrowserRuntimeEnvironment(window, {
        viewportTileSize: PHASER_VIEWPORT_TILE_SIZE,
        maxWidth: PHASER_MAX_VIEWPORT_WIDTH,
        maxHeight: PHASER_MAX_VIEWPORT_HEIGHT,
      }),
      audio,
      animationManager,
      saveManager,
    });
    this.menuOverlay = new PhaserMenuOverlay(
      this,
      this.coreGame.getDifficultyOptions()
    );
    this.menuFlow = createMenuFlowController(this.coreGame, {
      showMainMenu: () => this.menuOverlay.showMainMenu(),
      hideMainMenu: () => this.menuOverlay.hideMainMenu(),
      showPauseMenu: () => this.menuOverlay.showPauseMenu(),
      hidePauseMenu: () => this.menuOverlay.hidePauseMenu(),
      showPauseSettings: () => this.menuOverlay.showPauseSettings(),
      setMainProgression: (progression) =>
        this.menuOverlay.setMainProgression(progression),
      setMainSavedRun: (savedRun) => this.menuOverlay.setMainSavedRun(savedRun),
      setMainAudioSettings: (audioSettings) =>
        this.menuOverlay.setMainAudioSettings(audioSettings),
      setPauseAudioSettings: (audioSettings) =>
        this.menuOverlay.setPauseAudioSettings(audioSettings),
    });
    this.menuOverlay.setHandlers({
      onStart: (difficultyId, startFloor) =>
        this.menuFlow.startRun(difficultyId, startFloor),
      onLoad: () => this.menuFlow.loadRun(),
      onResume: () => this.menuFlow.resumeRun(),
      onRestart: () => this.menuFlow.restartRun(),
      onExit: () => this.menuFlow.exitToMainMenu(),
      onToggleMusic: (enabled) => {
        this.menuFlow.updateAudioSettings({ musicEnabled: enabled });
      },
      onToggleSfx: (enabled) => {
        this.menuFlow.updateAudioSettings({ sfxEnabled: enabled });
      },
    });
    this.inGameOverlay.setHandlers({
      onPause: () => this.coreGame.toggleRestartMenu(),
      onToggleFog: () => this.coreGame.toggleFog(),
      onMoveUp: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_UP),
      onMoveRight: () =>
        this.platformerMode.tapMove(1) ||
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_RIGHT),
      onMoveDown: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_DOWN),
      onMoveLeft: () =>
        this.platformerMode.tapMove(-1) ||
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_LEFT),
      onJump: () =>
        this.platformerMode.requestJump() ||
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.JUMP),
      onAttack: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.ATTACK),
      onUsePotion: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.USE_POTION),
      onUseSword: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.USE_SWORD),
    });

    this.unsubscribeState = this.coreGame.subscribe((state) => {
      this.currentState = state;
      this.hudOverlay.renderState(state);
      const hudLayoutMetrics = this.hudOverlay.getLayoutMetrics();
      this.inGameOverlay.renderState(this.coreGame, state, hudLayoutMetrics);
      const overlayLayoutMetrics = this.inGameOverlay.getLayoutMetrics();
      const combinedLayoutMetrics = {
        topInset: Math.max(
          hudLayoutMetrics.topInset || 0,
          overlayLayoutMetrics.topInset || 0
        ),
        bottomInset: Math.max(
          hudLayoutMetrics.bottomInset || 0,
          overlayLayoutMetrics.bottomInset || 0
        ),
      };
      const platformerActive = this.platformerMode.renderState(
        this.coreGame,
        state,
        combinedLayoutMetrics,
        this.coreGame.config
      );

      this.worldRenderer.root.setVisible(!platformerActive);
      if (!platformerActive) {
        this.worldRenderer.renderState(
          state,
          combinedLayoutMetrics,
          this.coreGame.config
        );
      }
    });

    this.unsubscribeEvents = this.coreGame.subscribeToEvents((event) => {
      if (event.type === "messageShown") {
        this.hudOverlay.showMessage(event.payload.message || "");
      }

      this.combatEffects.handleEvent(event);
    });

    this.bindInput();
    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", this.handleShutdown, this);
    this.events.once("destroy", this.handleShutdown, this);
    this.input.once("pointerdown", () => {
      if (this.coreGame.getState().run.status === "idle") {
        this.coreGame.playMainMenuMusic();
      }
    });
    this.menuFlow.initialize();
  }

  bindInput() {
    this.input.keyboard.on("keydown", (event) => {
      const actionId = getKeyboardPlayerAction(event);

      if (!actionId) {
        return;
      }

      if (this.platformerMode?.handleAction(actionId)) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      performPlayerAction(this.coreGame, actionId);
    });
  }

  update(time, delta) {
    this.platformerMode?.update(time, delta);
  }

  handleResize() {
    this.hudOverlay.syncLayout();
    this.inGameOverlay.syncLayout();
    this.menuOverlay.layout();
    this.platformerMode?.resize();
    this.coreGame.resizeViewport();
  }

  handleShutdown() {
    this.unsubscribeState?.();
    this.unsubscribeEvents?.();
    this.unsubscribeState = null;
    this.unsubscribeEvents = null;
    this.menuFlow?.destroy?.();
    this.platformerMode?.shutdown?.();
    this.scale.off("resize", this.handleResize, this);
  }
}

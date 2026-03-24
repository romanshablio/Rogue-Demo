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
import { PhaserSpriteRenderer } from "./PhaserSpriteRenderer.js";

const PhaserGlobal = globalThis.Phaser;
const PhaserSceneBase = PhaserGlobal?.Scene || class {};

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
    this.load.image("hero-with-sword", "img/hero_has_sword.png");
    this.load.image("hero-attack-sword", "img/hero_in_attack.png");
    this.load.image("hero-attack-fist", "img/hero_attacks_fist.png");
    this.load.image("princess", "img/princess.png");
    this.load.image("door", "img/door.png");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0b1017);
    const animationManager = new AnimationManager(window);
    this.worldRenderer = new PhaserSpriteRenderer(this, animationManager);
    this.combatEffects = new PhaserCombatEffects(this, this.worldRenderer);
    this.hudOverlay = new PhaserHudOverlay(this);
    this.inGameOverlay = new PhaserInGameOverlay(this);
    const audio = new PhaserAudioManager(this);
    const saveManager = new LocalStorageSaveManager(window);
    const savedAudioSettings = saveManager.loadAudioSettings();

    if (savedAudioSettings) {
      audio.applySettings(savedAudioSettings);
    }

    this.coreGame = createCoreGame({
      runtimeEnvironment: createBrowserRuntimeEnvironment(window),
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
      setMainAudioSettings: (audioSettings) =>
        this.menuOverlay.setMainAudioSettings(audioSettings),
      setPauseAudioSettings: (audioSettings) =>
        this.menuOverlay.setPauseAudioSettings(audioSettings),
    });
    this.menuOverlay.setHandlers({
      onStart: (difficultyId) => this.menuFlow.startRun(difficultyId),
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
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_RIGHT),
      onMoveDown: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_DOWN),
      onMoveLeft: () =>
        performPlayerAction(this.coreGame, PLAYER_ACTIONS.MOVE_LEFT),
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
      this.inGameOverlay.renderState(this.coreGame, state);
      this.worldRenderer.renderState(
        state,
        this.hudOverlay.getLayoutMetrics(),
        this.coreGame.config
      );
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

      event.preventDefault();
      performPlayerAction(this.coreGame, actionId);
    });
  }

  handleResize() {
    this.hudOverlay.syncLayout();
    this.inGameOverlay.syncLayout();
    this.menuOverlay.layout();
    this.coreGame.resizeViewport();
  }

  handleShutdown() {
    this.unsubscribeState?.();
    this.unsubscribeEvents?.();
    this.unsubscribeState = null;
    this.unsubscribeEvents = null;
    this.menuFlow?.destroy?.();
    this.scale.off("resize", this.handleResize, this);
  }
}

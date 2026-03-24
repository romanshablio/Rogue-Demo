import { GAME_STATUS } from "../core/constants.js";
import { performPlayerAction, PLAYER_ACTIONS } from "../input/playerActions.js";
import { createMenuFlowController } from "./menuFlowController.js";
import { InGameMenuScreen } from "./InGameMenuScreen.js";
import { MainMenuScreen } from "./MainMenuScreen.js";

function syncFogToggle(button, state) {
  if (!button) {
    return;
  }

  button.classList.toggle("active", state.run.fogEnabled);
  button.textContent = `Туман войны: ${state.run.fogEnabled ? "Вкл" : "Выкл"}`;
}

function syncVisibility(elements, isVisible) {
  for (const element of elements) {
    if (!element) {
      continue;
    }

    element.classList.toggle("is-hidden-ui", !isVisible);
  }
}

export function attachUiBindings(game, { document }) {
  const fogToggle = document.querySelector(".fog-toggle");
  const gameSettingsButton = document.querySelector(".game-settings-button");
  const restartMenuButton = document.querySelector(".restart-menu-button");
  const menuExitButton = document.querySelector(".menu-exit-button");
  const heroHud = document.querySelector(".hero-health-corner");
  const mobileControls = document.querySelector(".mobile-controls");
  const mainMenu = new MainMenuScreen(
    document,
    game.getDifficultyOptions(),
    game.getAudioSettings()
  );
  const restartMenu = new InGameMenuScreen(document, game.getAudioSettings());
  const menuFlow = createMenuFlowController(game, {
    showMainMenu: () => mainMenu.show(),
    hideMainMenu: () => mainMenu.hide(),
    showPauseMenu: () => restartMenu.show(),
    hidePauseMenu: () => restartMenu.hide(),
    showPauseSettings: () => restartMenu.showSettingsOverlay(),
    setMainAudioSettings: (audioSettings) => mainMenu.setAudioSettings?.(audioSettings),
    setPauseAudioSettings: (audioSettings) => restartMenu.setAudioSettings(audioSettings),
  });

  game.setUseItemHandler?.((itemType) => {
    performPlayerAction(
      game,
      itemType === "sword"
        ? PLAYER_ACTIONS.USE_SWORD
        : PLAYER_ACTIONS.USE_POTION
    );
  });

  restartMenu.setHandlers({
    onResume: () => menuFlow.resumeRun(),
    onRestart: () => menuFlow.restartRun(),
    onExit: () => menuFlow.exitToMainMenu(),
    onAudioSettingsChange: (audioSettings) => menuFlow.updateAudioSettings(audioSettings),
  });

  if (mainMenu.root) {
    mainMenu.root.addEventListener(
      "pointerdown",
      () => {
        game.playMainMenuMusic();
      },
      { once: true }
    );
  }

  mainMenu.setStartHandler((difficultyId) => {
    menuFlow.startRun(difficultyId);
  });

  mainMenu.setAudioSettingsChangeHandler((audioSettings) => {
    menuFlow.updateAudioSettings(audioSettings);
  });

  if (fogToggle) {
    fogToggle.addEventListener("click", () => {
      game.toggleFog();
      syncFogToggle(fogToggle, game.getState());
    });
  }

  gameSettingsButton?.addEventListener("click", () => {
    menuFlow.openPauseSettings();
  });

  restartMenuButton?.addEventListener("click", () => {
    game.toggleRestartMenu();
  });

  if (menuExitButton) {
    menuExitButton.addEventListener("click", () => {
      menuFlow.exitToMainMenu();
    });
  }

  game.subscribe((state) => {
    syncFogToggle(fogToggle, state);
    const isInGame = state.run.status !== GAME_STATUS.IDLE;
    syncVisibility(
      [
        fogToggle,
        gameSettingsButton,
        restartMenuButton,
        menuExitButton,
        heroHud,
        mobileControls,
      ],
      isInGame
    );
  });

  syncFogToggle(fogToggle, game.getState());
  syncVisibility(
    [
      fogToggle,
      gameSettingsButton,
      restartMenuButton,
      menuExitButton,
      heroHud,
      mobileControls,
    ],
    false
  );
  menuFlow.initialize();
}

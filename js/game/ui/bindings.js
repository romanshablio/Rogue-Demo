import { GAME_STATUS, ITEM_TYPES } from "../core/constants.js";
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

  game.hud?.setUseItemHandler?.((itemType) => {
    const normalizedType =
      itemType === "sword" ? ITEM_TYPES.SWORD : ITEM_TYPES.POTION;
    const used = game.useInventoryItem(normalizedType);
    if (used) {
      game.advanceTurn();
    }
  });

  restartMenu.setHandlers({
    onResume: () => game.closeRestartMenu(),
    onRestart: () => game.restartRunFromMenu(),
    onExit: () => {
      game.exitToMainMenu();
      restartMenu.hide();
      mainMenu.show();
    },
    onAudioSettingsChange: (audioSettings) => {
      game.updateAudioSettings(audioSettings);
      mainMenu.setAudioSettings?.(audioSettings);
      restartMenu.setAudioSettings(audioSettings);
    },
  });

  if (mainMenu.root) {
    mainMenu.root.addEventListener(
      "pointerdown",
      () => {
        game.audio.playMainMenuMusic();
      },
      { once: true }
    );
  }

  mainMenu.setStartHandler((difficultyId) => {
    mainMenu.hide();
    restartMenu.hide();
    game.start({ difficultyId });
  });

  mainMenu.setAudioSettingsChangeHandler((audioSettings) => {
    game.updateAudioSettings(audioSettings);
    restartMenu.setAudioSettings(audioSettings);
  });

  if (fogToggle) {
    fogToggle.addEventListener("click", () => {
      game.toggleFog();
      syncFogToggle(fogToggle, game.getState());
    });
  }

  gameSettingsButton?.addEventListener("click", () => {
    game.openRestartMenu();
    restartMenu.showSettingsOverlay();
  });

  restartMenuButton?.addEventListener("click", () => {
    game.toggleRestartMenu();
  });

  if (menuExitButton) {
    menuExitButton.addEventListener("click", () => {
      game.exitToMainMenu();
      restartMenu.hide();
      mainMenu.show();
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

    if (state.ui.restartMenuOpen || state.run.status === GAME_STATUS.PAUSED) {
      restartMenu.show();
    } else {
      restartMenu.hide();
    }
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
  restartMenu.hide();
  game.exitToMainMenu();
}

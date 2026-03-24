import { GAME_STATUS } from "../core/constants.js";

export function createMenuFlowController(game, ui = {}) {
  const syncState = (state) => {
    if (state.run.status === GAME_STATUS.IDLE) {
      ui.hidePauseMenu?.();
      ui.showMainMenu?.();
      return;
    }

    ui.hideMainMenu?.();

    if (state.ui.restartMenuOpen || state.run.status === GAME_STATUS.PAUSED) {
      ui.showPauseMenu?.();
    } else {
      ui.hidePauseMenu?.();
    }
  };

  const unsubscribe = game.subscribe(syncState);

  return {
    initialize() {
      const audioSettings = game.getAudioSettings();
      ui.setMainAudioSettings?.(audioSettings);
      ui.setPauseAudioSettings?.(audioSettings);
      game.exitToMainMenu();
    },

    destroy() {
      unsubscribe?.();
    },

    startRun(difficultyId) {
      game.start({ difficultyId });
    },

    resumeRun() {
      game.closeRestartMenu();
    },

    restartRun() {
      game.restartRunFromMenu();
    },

    exitToMainMenu() {
      game.exitToMainMenu();
    },

    openPauseSettings() {
      game.openRestartMenu();
      ui.showPauseSettings?.();
    },

    updateAudioSettings(audioSettings) {
      game.updateAudioSettings(audioSettings);
      ui.setMainAudioSettings?.(audioSettings);
      ui.setPauseAudioSettings?.(audioSettings);
    },

    syncState,
  };
}

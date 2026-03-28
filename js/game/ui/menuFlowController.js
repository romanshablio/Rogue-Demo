import { GAME_STATUS } from "../core/constants.js";

export function createMenuFlowController(game, ui = {}) {
  const getProgression = () => {
    const saved = game.saveManager?.loadProgression?.();
    return {
      maxUnlockedFloor: Math.max(
        1,
        Math.min(
          game.config.floorCount || 1,
          Math.floor(saved?.maxUnlockedFloor || 1)
        )
      ),
    };
  };

  const getSavedRun = () => game.getSavedRunSummary?.() || null;

  const syncState = (state) => {
    if (state.run.status === GAME_STATUS.IDLE) {
      ui.setMainProgression?.(getProgression());
      ui.setMainSavedRun?.(getSavedRun());
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
      ui.setMainProgression?.(getProgression());
      ui.setMainSavedRun?.(getSavedRun());
      game.exitToMainMenu();
    },

    destroy() {
      unsubscribe?.();
    },

    startRun(difficultyId, startFloor = 1) {
      game.start({ difficultyId, startFloor });
    },

    loadRun() {
      game.loadSavedRun?.();
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

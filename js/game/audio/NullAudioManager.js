export class NullAudioManager {
  constructor() {
    this.settings = {
      musicEnabled: true,
      sfxEnabled: true,
    };
  }

  playCue() {}

  playPotion() {}

  playAttack() {}

  playDeath() {}

  playPain() {}

  playBackgroundMusic() {}

  stopBackgroundMusic() {}

  playMainMenuMusic() {}

  stopMainMenuMusic() {}

  getSettings() {
    return { ...this.settings };
  }

  applySettings(nextSettings = {}) {
    this.settings = {
      ...this.settings,
      ...nextSettings,
    };
  }

  setMusicEnabled(enabled) {
    this.applySettings({ musicEnabled: Boolean(enabled) });
  }

  setSfxEnabled(enabled) {
    this.applySettings({ sfxEnabled: Boolean(enabled) });
  }
}

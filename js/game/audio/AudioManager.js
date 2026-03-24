export class AudioManager {
  constructor(documentObject) {
    this.document = documentObject;
    this.menuMusic = documentObject.getElementById("main-theme");
    this.backgroundMusic = documentObject.getElementById("background-level-theme");
    this.settings = {
      musicEnabled: true,
      sfxEnabled: true,
    };

    if (this.menuMusic) {
      this.menuMusic.volume = 0.4;
    }

    if (this.backgroundMusic) {
      this.backgroundMusic.volume = 0.35;
    }
  }

  playCue(cueId) {
    if (cueId === "potion") {
      this.playPotion();
      return;
    }

    if (cueId === "attack") {
      this.playAttack();
      return;
    }

    if (cueId === "death") {
      this.playDeath();
      return;
    }

    if (cueId === "pain") {
      this.playPain();
    }
  }

  play(soundId) {
    if (!this.settings.sfxEnabled) {
      return;
    }

    const sound = this.document.getElementById(soundId);

    if (!sound) {
      return;
    }

    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  playPotion() {
    this.play("potion-sound");
  }

  playAttack() {
    this.play("attack-sound");
  }

  playDeath() {
    this.play("death-sound");
  }

  playPain() {
    this.play("pain-sound");
  }

  playBackgroundMusic() {
    if (!this.settings.musicEnabled) {
      return;
    }

    if (!this.backgroundMusic) {
      return;
    }

    this.stopMainMenuMusic();

    if (!this.backgroundMusic.paused) {
      return;
    }

    this.backgroundMusic.play().catch(() => {});
  }

  stopBackgroundMusic() {
    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  playMainMenuMusic() {
    if (!this.settings.musicEnabled) {
      return;
    }

    if (!this.menuMusic) {
      return;
    }

    this.stopBackgroundMusic();

    if (!this.menuMusic.paused) {
      return;
    }

    this.menuMusic.play().catch(() => {});
  }

  stopMainMenuMusic() {
    if (!this.menuMusic) {
      return;
    }

    this.menuMusic.pause();
    this.menuMusic.currentTime = 0;
  }

  getSettings() {
    return { ...this.settings };
  }

  applySettings(nextSettings = {}) {
    this.settings = {
      ...this.settings,
      ...nextSettings,
    };

    if (!this.settings.musicEnabled) {
      this.stopMainMenuMusic();
      this.stopBackgroundMusic();
    }
  }

  setMusicEnabled(enabled) {
    this.applySettings({ musicEnabled: Boolean(enabled) });
  }

  setSfxEnabled(enabled) {
    this.applySettings({ sfxEnabled: Boolean(enabled) });
  }
}

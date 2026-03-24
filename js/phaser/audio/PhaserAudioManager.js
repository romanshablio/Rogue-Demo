export class PhaserAudioManager {
  constructor(scene) {
    this.scene = scene;
    this.settings = {
      musicEnabled: true,
      sfxEnabled: true,
    };

    this.menuMusic = this.createSound("main-theme", {
      loop: true,
      volume: 0.4,
    });
    this.backgroundMusic = this.createSound("background-level-theme", {
      loop: true,
      volume: 0.35,
    });
  }

  createSound(key, config = {}) {
    if (!this.scene?.sound?.get) {
      return null;
    }

    return this.scene.sound.get(key) || this.scene.sound.add(key, config);
  }

  playCue(cueId) {
    if (cueId === "potion") {
      this.play("potion-sound");
      return;
    }

    if (cueId === "attack") {
      this.play("attack-sound");
      return;
    }

    if (cueId === "death") {
      this.play("death-sound");
      return;
    }

    if (cueId === "pain") {
      this.play("pain-sound");
    }
  }

  play(soundKey) {
    if (!this.settings.sfxEnabled) {
      return;
    }

    const sound = this.createSound(soundKey);
    sound?.play?.();
  }

  playBackgroundMusic() {
    if (!this.settings.musicEnabled || !this.backgroundMusic) {
      return;
    }

    this.stopMainMenuMusic();
    if (!this.backgroundMusic.isPlaying) {
      this.backgroundMusic.play();
    }
  }

  stopBackgroundMusic() {
    this.backgroundMusic?.stop?.();
  }

  playMainMenuMusic() {
    if (!this.settings.musicEnabled || !this.menuMusic) {
      return;
    }

    this.stopBackgroundMusic();
    if (!this.menuMusic.isPlaying) {
      this.menuMusic.play();
    }
  }

  stopMainMenuMusic() {
    this.menuMusic?.stop?.();
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

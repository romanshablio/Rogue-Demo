export class LocalStorageSaveManager {
  constructor(windowObject, storageKey = "rogue-demo-save") {
    this.window = windowObject;
    this.storageKey = storageKey;
    this.audioSettingsKey = `${storageKey}:audio-settings`;
  }

  save(snapshot) {
    try {
      if (!this.window.localStorage) {
        return;
      }

      this.window.localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (_error) {}
  }

  load() {
    try {
      if (!this.window.localStorage) {
        return null;
      }

      const rawValue = this.window.localStorage.getItem(this.storageKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (_error) {
      return null;
    }
  }

  saveAudioSettings(settings) {
    try {
      if (!this.window.localStorage) {
        return;
      }

      this.window.localStorage.setItem(
        this.audioSettingsKey,
        JSON.stringify(settings)
      );
    } catch (_error) {}
  }

  loadAudioSettings() {
    try {
      if (!this.window.localStorage) {
        return null;
      }

      const rawValue = this.window.localStorage.getItem(this.audioSettingsKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (_error) {
      return null;
    }
  }
}

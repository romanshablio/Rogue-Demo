export class InGameMenuScreen {
  constructor(documentObject, audioSettings) {
    this.document = documentObject;
    this.audioSettings = {
      musicEnabled: true,
      sfxEnabled: true,
      ...audioSettings,
    };
    this.activeStep = "pause";
    this.root = this.createRoot();
    this.resumeButton = this.root.querySelector("[data-action='resume-run']");
    this.restartButton = this.root.querySelector("[data-action='restart-run']");
    this.exitButton = this.root.querySelector("[data-action='exit-run']");
    this.openSettingsButton = this.root.querySelector("[data-action='open-pause-settings']");
    this.settingsBackButton = this.root.querySelector("[data-action='pause-settings-back']");
    this.musicToggleButton = this.root.querySelector("[data-action='toggle-pause-music']");
    this.sfxToggleButton = this.root.querySelector("[data-action='toggle-pause-sfx']");
    this.bindEvents();
    this.renderAudioSettings();
    this.syncSteps();
  }

  bindEvents() {
    this.resumeButton?.addEventListener("click", () => {
      this.onResume?.();
    });

    this.restartButton?.addEventListener("click", () => {
      this.onRestart?.();
    });

    this.exitButton?.addEventListener("click", () => {
      this.onExit?.();
    });

    this.openSettingsButton?.addEventListener("click", () => {
      this.showSettings();
    });

    this.settingsBackButton?.addEventListener("click", () => {
      this.showPauseMenu();
    });

    this.musicToggleButton?.addEventListener("click", () => {
      this.audioSettings.musicEnabled = !this.audioSettings.musicEnabled;
      this.renderAudioSettings();
      this.onAudioSettingsChange?.({ ...this.audioSettings });
    });

    this.sfxToggleButton?.addEventListener("click", () => {
      this.audioSettings.sfxEnabled = !this.audioSettings.sfxEnabled;
      this.renderAudioSettings();
      this.onAudioSettingsChange?.({ ...this.audioSettings });
    });
  }

  createRoot() {
    const root = this.document.createElement("div");
    root.className = "restart-menu-overlay";
    root.innerHTML = `
      <div class="restart-menu-shell">
        <div class="restart-menu-step" data-step="pause">
          <div class="main-menu-eyebrow">ПАУЗА</div>
          <h2 class="main-menu-subtitle">Меню забега</h2>
          <p class="main-menu-description">
            Можно продолжить текущий этаж, открыть параметры звука, начать забег заново или вернуться на главный экран.
          </p>
          <div class="main-menu-actions">
            <button class="main-menu-primary" data-action="resume-run">Продолжить</button>
            <button class="main-menu-secondary" data-action="open-pause-settings">Параметры</button>
            <button class="main-menu-secondary" data-action="restart-run">Заново</button>
            <button class="main-menu-secondary" data-action="exit-run">В меню</button>
          </div>
        </div>
        <div class="restart-menu-step" data-step="settings">
          <div class="main-menu-eyebrow">ПАРАМЕТРЫ</div>
          <h2 class="main-menu-subtitle">Звук в игре</h2>
          <p class="main-menu-description">
            Здесь можно отдельно включать и выключать музыку и звуковые эффекты прямо во время забега.
          </p>
          <div class="settings-list">
            <button class="settings-toggle" data-action="toggle-pause-music">
              <span class="settings-toggle-title">Музыка</span>
              <span class="settings-toggle-state" data-pause-audio-state="music"></span>
            </button>
            <button class="settings-toggle" data-action="toggle-pause-sfx">
              <span class="settings-toggle-title">Звуковые эффекты</span>
              <span class="settings-toggle-state" data-pause-audio-state="sfx"></span>
            </button>
          </div>
          <div class="main-menu-actions">
            <button class="main-menu-secondary" data-action="pause-settings-back">Назад</button>
          </div>
        </div>
      </div>
    `;
    this.document.body.appendChild(root);
    return root;
  }

  renderAudioSettings() {
    if (this.musicToggleButton) {
      this.musicToggleButton.classList.toggle(
        "is-enabled",
        this.audioSettings.musicEnabled
      );
    }

    if (this.sfxToggleButton) {
      this.sfxToggleButton.classList.toggle(
        "is-enabled",
        this.audioSettings.sfxEnabled
      );
    }

    const musicState = this.root.querySelector("[data-pause-audio-state='music']");
    const sfxState = this.root.querySelector("[data-pause-audio-state='sfx']");

    if (musicState) {
      musicState.textContent = this.audioSettings.musicEnabled ? "Вкл" : "Выкл";
    }

    if (sfxState) {
      sfxState.textContent = this.audioSettings.sfxEnabled ? "Вкл" : "Выкл";
    }
  }

  syncSteps() {
    const steps = [...this.root.querySelectorAll("[data-step]")];
    for (const step of steps) {
      step.classList.toggle("is-active", step.dataset.step === this.activeStep);
    }
  }

  showPauseMenu() {
    this.activeStep = "pause";
    this.syncSteps();
  }

  showSettings() {
    this.activeStep = "settings";
    this.syncSteps();
  }

  setAudioSettings(audioSettings) {
    this.audioSettings = {
      ...this.audioSettings,
      ...audioSettings,
    };
    this.renderAudioSettings();
  }

  show() {
    this.showPauseMenu();
    this.root.classList.add("is-visible");
  }

  showSettingsOverlay() {
    this.showSettings();
    this.root.classList.add("is-visible");
  }

  hide() {
    this.root.classList.remove("is-visible");
  }

  setHandlers({ onResume, onRestart, onExit, onAudioSettingsChange }) {
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onExit = onExit;
    this.onAudioSettingsChange = onAudioSettingsChange;
  }
}

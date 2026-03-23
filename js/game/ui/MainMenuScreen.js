export class MainMenuScreen {
  constructor(documentObject, difficultyOptions, audioSettings) {
    this.document = documentObject;
    this.difficultyOptions = difficultyOptions;
    this.audioSettings = {
      musicEnabled: true,
      sfxEnabled: true,
      ...audioSettings,
    };
    this.selectedDifficultyId = difficultyOptions[1]?.id || difficultyOptions[0]?.id;
    this.activeStep = "home";
    this.root = this.createRoot();
    this.newGameButton = this.root.querySelector("[data-action='new-game']");
    this.settingsButton = this.root.querySelector("[data-action='open-settings']");
    this.backButton = this.root.querySelector("[data-action='menu-back']");
    this.settingsBackButton = this.root.querySelector("[data-action='settings-back']");
    this.startButton = this.root.querySelector("[data-action='start-game']");
    this.musicToggleButton = this.root.querySelector("[data-action='toggle-music']");
    this.sfxToggleButton = this.root.querySelector("[data-action='toggle-sfx']");
    this.difficultyCards = [...this.root.querySelectorAll("[data-difficulty-id]")];

    this.bindEvents();
    this.renderDifficultySelection();
    this.renderAudioSettings();
  }

  bindEvents() {
    this.newGameButton?.addEventListener("click", () => {
      this.activeStep = "difficulty";
      this.syncSteps();
    });

    this.settingsButton?.addEventListener("click", () => {
      this.activeStep = "settings";
      this.syncSteps();
    });

    this.backButton?.addEventListener("click", () => {
      this.activeStep = "home";
      this.syncSteps();
    });

    this.settingsBackButton?.addEventListener("click", () => {
      this.activeStep = "home";
      this.syncSteps();
    });

    this.startButton?.addEventListener("click", () => {
      if (typeof this.onStart === "function") {
        this.onStart(this.selectedDifficultyId);
      }
    });

    for (const card of this.difficultyCards) {
      card.addEventListener("click", () => {
        this.selectedDifficultyId = card.dataset.difficultyId;
        this.renderDifficultySelection();
      });
    }

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
    root.className = "main-menu-overlay is-visible";
    root.innerHTML = `
      <div class="main-menu-shell">
        <div class="main-menu-step main-menu-home is-active" data-step="home">
          <div class="main-menu-eyebrow">ROGUELIKE DEMO</div>
          <h1 class="main-menu-title">Rogue Demo</h1>
          <p class="main-menu-description">
            Исследуйте подземелье, победите всех врагов, найдите принцессу и доведите ее до выхода.
          </p>
          <div class="main-menu-actions">
            <button class="main-menu-primary" data-action="new-game">Новая игра</button>
            <button class="main-menu-secondary" data-action="open-settings">Параметры</button>
          </div>
          <div class="main-menu-grid">
            <section class="main-menu-card">
              <h2>Цель</h2>
              <p>Очистить уровень, забрать принцессу и дойти с ней до двери.</p>
            </section>
            <section class="main-menu-card">
              <h2>Управление</h2>
              <p>W/A/S/D для движения, Space для атаки, 1/2 для предметов, Esc для паузы.</p>
            </section>
            <section class="main-menu-card">
              <h2>Что важно</h2>
              <p>Собирайте мечи для роста атаки и зелья для восстановления здоровья.</p>
            </section>
          </div>
        </div>
        <div class="main-menu-step main-menu-difficulty" data-step="difficulty">
          <div class="main-menu-eyebrow">НОВАЯ ИГРА</div>
          <h2 class="main-menu-subtitle">Выбор сложности</h2>
          <p class="main-menu-description">
            Сложность влияет на здоровье героя, силу и количество врагов, а также на объем ресурсов на уровне.
          </p>
          <div class="difficulty-list">
            ${this.difficultyOptions
              .map(
                (option) => `
              <button class="difficulty-card" data-difficulty-id="${option.id}">
                <span class="difficulty-card-title">${option.label}</span>
                <span class="difficulty-card-summary">${option.summary}</span>
              </button>
            `
              )
              .join("")}
          </div>
          <div class="main-menu-actions">
            <button class="main-menu-secondary" data-action="menu-back">Назад</button>
            <button class="main-menu-primary" data-action="start-game">Начать</button>
          </div>
        </div>
        <div class="main-menu-step main-menu-settings" data-step="settings">
          <div class="main-menu-eyebrow">ПАРАМЕТРЫ</div>
          <h2 class="main-menu-subtitle">Звук</h2>
          <p class="main-menu-description">
            Управляйте отдельно музыкой меню и уровня, а также звуковыми эффектами боя и предметов.
          </p>
          <div class="settings-list">
            <button class="settings-toggle" data-action="toggle-music">
              <span class="settings-toggle-title">Музыка</span>
              <span class="settings-toggle-state" data-audio-state="music"></span>
            </button>
            <button class="settings-toggle" data-action="toggle-sfx">
              <span class="settings-toggle-title">Звуковые эффекты</span>
              <span class="settings-toggle-state" data-audio-state="sfx"></span>
            </button>
          </div>
          <div class="main-menu-actions">
            <button class="main-menu-secondary" data-action="settings-back">Назад</button>
          </div>
        </div>
      </div>
    `;
    this.document.body.appendChild(root);
    return root;
  }

  renderDifficultySelection() {
    for (const card of this.difficultyCards) {
      card.classList.toggle(
        "is-selected",
        card.dataset.difficultyId === this.selectedDifficultyId
      );
    }
  }

  syncSteps() {
    const steps = [...this.root.querySelectorAll("[data-step]")];
    for (const step of steps) {
      step.classList.toggle("is-active", step.dataset.step === this.activeStep);
    }
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

    const musicState = this.root.querySelector("[data-audio-state='music']");
    const sfxState = this.root.querySelector("[data-audio-state='sfx']");

    if (musicState) {
      musicState.textContent = this.audioSettings.musicEnabled ? "Вкл" : "Выкл";
    }

    if (sfxState) {
      sfxState.textContent = this.audioSettings.sfxEnabled ? "Вкл" : "Выкл";
    }
  }

  show() {
    this.activeStep = "home";
    this.syncSteps();
    this.root.classList.add("is-visible");
  }

  hide() {
    this.root.classList.remove("is-visible");
  }

  setStartHandler(handler) {
    this.onStart = handler;
  }

  setAudioSettingsChangeHandler(handler) {
    this.onAudioSettingsChange = handler;
  }

  setAudioSettings(audioSettings) {
    this.audioSettings = {
      ...this.audioSettings,
      ...audioSettings,
    };
    this.renderAudioSettings();
  }
}

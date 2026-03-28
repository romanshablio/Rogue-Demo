const PANEL_COLOR = 0x091019;
const PANEL_BORDER = 0x314150;
const BUTTON_PRIMARY = 0xd7bd62;
const BUTTON_SECONDARY = 0x233243;
const BUTTON_DISABLED = 0x55606b;
const BUTTON_SELECTED_BORDER = 0xf0e1a1;
const ACCENT_LINE = 0x445464;
const TEXT_LIGHT = "#f5f7fa";
const TEXT_MUTED = "#a7b5c4";
const TEXT_DARK = "#11161d";
const MENU_TITLE_FONT = "\"IM Fell English SC\", serif";
const MENU_BODY_FONT = "\"Cormorant Garamond\", serif";
const MAIN_MENU_PANEL_WIDTH = 760;
const MAIN_MENU_PANEL_HEIGHT = 620;

function pinToUiCamera(gameObject) {
  gameObject?.setScrollFactor?.(0);

  if (Array.isArray(gameObject?.list)) {
    for (const child of gameObject.list) {
      pinToUiCamera(child);
    }
  }

  return gameObject;
}

function createButton(scene, x, y, width, height, label, onClick, options = {}) {
  const container = scene.add.container(x, y);
  const background = scene.add.rectangle(0, 0, width, height, BUTTON_SECONDARY);
  const text = scene.add.text(0, 0, label, {
    color: TEXT_LIGHT,
    fontFamily: MENU_BODY_FONT,
    fontSize: options.fontSize || "24px",
    fontStyle: options.fontStyle || "bold",
    align: "center",
  });
  const state = {
    disabled: Boolean(options.disabled),
    selected: Boolean(options.selected),
    primary: Boolean(options.isPrimary),
  };

  const applyState = () => {
    let fill = BUTTON_SECONDARY;
    let textColor = TEXT_LIGHT;
    let border = PANEL_BORDER;
    let fillAlpha = 0.98;

    if (state.selected || state.primary) {
      fill = BUTTON_PRIMARY;
      textColor = TEXT_DARK;
      border = BUTTON_SELECTED_BORDER;
    }

    if (state.disabled) {
      fill = BUTTON_DISABLED;
      textColor = "#d7dde4";
      border = PANEL_BORDER;
      fillAlpha = 0.42;
    }

    background.setScale(1);
    background.setAlpha(1);
    background.setFillStyle(fill, fillAlpha);
    background.setStrokeStyle(1, border, state.disabled ? 0.55 : 1);
    text.setColor(textColor);
    text.setAlpha(state.disabled ? 0.7 : 1);
  };

  background.setInteractive({ useHandCursor: true });
  text.setOrigin(0.5);

  background.on("pointerdown", () => {
    if (!state.disabled) {
      onClick?.();
    }
  });
  background.on("pointerover", () => {
    if (state.disabled) {
      return;
    }

    background.setScale(1.02);
    background.setAlpha(state.selected || state.primary ? 0.94 : 0.88);
  });
  background.on("pointerout", () => {
    applyState();
  });

  container.add([background, text]);
  container.background = background;
  container.label = text;
  container.setLabel = (value) => {
    text.setText(value);
    return container;
  };
  container.setDisabled = (value) => {
    state.disabled = Boolean(value);
    applyState();
    return container;
  };
  container.setSelected = (value) => {
    state.selected = Boolean(value);
    applyState();
    return container;
  };
  container.isDisabled = () => state.disabled;
  applyState();

  return pinToUiCamera(container);
}

function createSectionLabel(scene, x, y, label) {
  const text = scene.add.text(x, y, label, {
    color: TEXT_LIGHT,
    fontFamily: MENU_TITLE_FONT,
    fontSize: "26px",
    letterSpacing: 1.4,
  });
  text.setOrigin(0, 0.5);
  return pinToUiCamera(text);
}

function createDivider(scene, y, width = 648) {
  return pinToUiCamera(scene.add.rectangle(0, y, width, 1, ACCENT_LINE, 0.95));
}

export class PhaserMenuOverlay {
  constructor(scene, difficultyOptions) {
    this.scene = scene;
    this.difficultyOptions = difficultyOptions;
    this.mainContainer = scene.add.container(0, 0);
    this.pauseContainer = scene.add.container(0, 0);
    this.mainContainer.setDepth(400);
    this.pauseContainer.setDepth(400);
    this.mainContainer.setScrollFactor?.(0);
    this.pauseContainer.setScrollFactor?.(0);
    this.audioSettings = {
      musicEnabled: true,
      sfxEnabled: true,
    };
    this.handlers = {};
    this.mainAudioText = null;
    this.pauseAudioText = null;
    this.mainMusicButton = null;
    this.mainSfxButton = null;
    this.pauseMusicButton = null;
    this.pauseSfxButton = null;
    this.mainPanel = null;
    this.pausePanel = null;
    this.mainBackdrop = null;
    this.mainBackgroundImage = null;
    this.mainTitleImage = null;
    this.mainStartButton = null;
    this.mainLoadButton = null;
    this.mainDifficultyButtons = [];
    this.mainFloorButtons = [];
    this.selectedDifficultyId =
      difficultyOptions.find((option) => option.id === "normal")?.id ||
      difficultyOptions[0]?.id ||
      null;
    this.maxUnlockedFloor = 1;
    this.selectedStartFloor = 1;
    this.savedRun = null;

    this.createMainMenu();
    this.createPauseMenu();
    this.renderMainMenuState();
    this.layout();
    this.hideMainMenu();
    this.hidePauseMenu();
  }

  setHandlers(handlers) {
    this.handlers = {
      ...this.handlers,
      ...handlers,
    };
  }

  setMainAudioSettings(audioSettings) {
    this.audioSettings = {
      ...this.audioSettings,
      ...audioSettings,
    };
    this.renderAudioLabels();
  }

  setPauseAudioSettings(audioSettings) {
    this.setMainAudioSettings(audioSettings);
  }

  setMainProgression(progression) {
    const totalFloors = this.mainFloorButtons.length || 1;
    const nextMaxUnlockedFloor = Math.max(
      1,
      Math.min(totalFloors, Math.floor(progression?.maxUnlockedFloor || 1))
    );

    this.maxUnlockedFloor = nextMaxUnlockedFloor;
    this.selectedStartFloor = Math.min(
      this.selectedStartFloor,
      this.maxUnlockedFloor
    );
    this.renderMainMenuState();
  }

  setMainSavedRun(savedRun) {
    this.savedRun = savedRun || null;

    if (this.savedRun?.difficultyId) {
      this.selectedDifficultyId = this.savedRun.difficultyId;
    }

    if (this.savedRun?.currentFloor) {
      this.selectedStartFloor = Math.max(
        1,
        Math.min(this.maxUnlockedFloor, Math.floor(this.savedRun.currentFloor))
      );
    }

    this.renderMainMenuState();
  }

  renderAudioLabels() {
    this.mainMusicButton?.setLabel(
      `Звук игры: ${this.audioSettings.musicEnabled ? "вкл" : "выкл"}`
    );
    this.mainSfxButton?.setLabel(
      `Звук эффектов: ${this.audioSettings.sfxEnabled ? "вкл" : "выкл"}`
    );
    this.pauseMusicButton?.setLabel(
      `Музыка: ${this.audioSettings.musicEnabled ? "вкл" : "выкл"}`
    );
    this.pauseSfxButton?.setLabel(
      `Эффекты: ${this.audioSettings.sfxEnabled ? "вкл" : "выкл"}`
    );
    this.pauseAudioText?.setText(
      `Музыка ${this.audioSettings.musicEnabled ? "вкл" : "выкл"}  |  Эффекты ${
        this.audioSettings.sfxEnabled ? "вкл" : "выкл"
      }`
    );
  }

  renderMainMenuState() {
    for (const button of this.mainDifficultyButtons) {
      button.setSelected(button.optionId === this.selectedDifficultyId);
    }

    for (const button of this.mainFloorButtons) {
      const locked = button.floor > this.maxUnlockedFloor;
      button.setDisabled(locked);
      button.setSelected(button.floor === this.selectedStartFloor && !locked);
    }

    this.mainLoadButton?.setDisabled(!this.savedRun);
  }

  createPanel(container, title, subtitle, width, height) {
    const panel = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, width, height, PANEL_COLOR, 0.94);
    const border = this.scene.add.rectangle(0, 0, width, height);
    const titleText = this.scene.add.text(0, -height / 2 + 42, title, {
      color: TEXT_LIGHT,
      fontFamily: MENU_TITLE_FONT,
      fontSize: "40px",
    });
    const subtitleText = this.scene.add.text(0, -height / 2 + 84, subtitle, {
      color: TEXT_MUTED,
      fontFamily: MENU_BODY_FONT,
      fontSize: "22px",
      align: "center",
      wordWrap: { width: width - 80 },
    });

    titleText.setOrigin(0.5);
    subtitleText.setOrigin(0.5, 0);
    border.setStrokeStyle(1, PANEL_BORDER, 1);
    panel.add([background, border, titleText, subtitleText]);
    panel.background = background;
    panel.border = border;
    panel.titleText = titleText;
    panel.subtitleText = subtitleText;
    container.add(panel);
    return pinToUiCamera(panel);
  }

  createMainMenu() {
    this.mainBackgroundImage = this.scene.add.image(0, 0, "title-screen");
    this.mainBackgroundImage.setOrigin(0.5);
    this.mainBackdrop = this.scene.add.rectangle(0, 0, 2, 2, 0x000000, 0.52);
    this.mainContainer.add([this.mainBackgroundImage, this.mainBackdrop]);

    this.mainPanel = this.createPanel(
      this.mainContainer,
      "",
      "",
      MAIN_MENU_PANEL_WIDTH,
      MAIN_MENU_PANEL_HEIGHT
    );
    this.mainPanel.titleText?.setVisible(false);
    this.mainPanel.subtitleText?.setVisible(false);

    this.mainTitleImage = this.scene.add.image(0, -244, "title-logo");
    this.mainTitleImage.setOrigin(0.5);
    this.mainTitleImage.setScale(0.52);
    this.mainPanel.add(this.mainTitleImage);

    this.mainPanel.add([
      //createSectionLabel(this.scene, -302, -160, "Начать игру"),
      createDivider(this.scene, 78),
      createSectionLabel(this.scene, -302, 118, "Параметры"),
      createDivider(this.scene, 214),
      createSectionLabel(this.scene, -302, 254, "Выбор уровня"),
    ]);

    this.mainStartButton = createButton(
      this.scene,
      0,
      -104,
      368,
      54,
      "Начать игру",
      () =>
        this.handlers.onStart?.(
          this.selectedDifficultyId,
          this.selectedStartFloor
        ),
      { isPrimary: true, fontSize: "26px" }
    );
    this.mainPanel.add(this.mainStartButton);

    const difficultySpacing = 182;
    const difficultyStartX =
      -((this.difficultyOptions.length - 1) * difficultySpacing) / 2;

    this.mainDifficultyButtons = this.difficultyOptions.map((option, index) => {
      const button = createButton(
        this.scene,
        difficultyStartX + index * difficultySpacing,
        -36,
        170,
        44,
        option.label,
        () => {
          this.selectedDifficultyId = option.id;
          this.renderMainMenuState();
        },
        { fontSize: "24px" }
      );

      button.optionId = option.id;
      this.mainPanel.add(button);
      return button;
    });

    this.mainLoadButton = createButton(
      this.scene,
      0,
      28,
      368,
      46,
      "Загрузить игру",
      () => this.handlers.onLoad?.(),
      { disabled: true, fontSize: "24px" }
    );
    this.mainPanel.add(this.mainLoadButton);

    this.mainMusicButton = createButton(
      this.scene,
      -160,
      164,
      252,
      44,
      "",
      () => this.handlers.onToggleMusic?.(!this.audioSettings.musicEnabled),
      { fontSize: "21px" }
    );
    this.mainSfxButton = createButton(
      this.scene,
      160,
      164,
      252,
      44,
      "",
      () => this.handlers.onToggleSfx?.(!this.audioSettings.sfxEnabled),
      { fontSize: "21px" }
    );
    this.mainPanel.add([this.mainMusicButton, this.mainSfxButton]);

    const floorSpacing = 108;
    const floorStartX = -((4 - 1) * floorSpacing) / 2;
    for (let floor = 1; floor <= 4; floor += 1) {
      const button = createButton(
        this.scene,
        floorStartX + (floor - 1) * floorSpacing,
        304,
        86,
        44,
        String(floor),
        () => {
          this.selectedStartFloor = floor;
          this.renderMainMenuState();
        },
        { fontSize: "24px" }
      );

      button.floor = floor;
      this.mainFloorButtons.push(button);
      this.mainPanel.add(button);
    }

    const levelHint = this.scene.add.text(
      0,
      352,
      "Этажи открываются после прохождения предыдущих.",
      {
        color: TEXT_MUTED,
        fontFamily: MENU_BODY_FONT,
        fontSize: "22px",
        align: "center",
      }
    );
    levelHint.setOrigin(0.5);
    this.mainPanel.add(levelHint);
  }

  createPauseMenu() {
    this.pauseContainer.add(this.scene.add.rectangle(0, 0, 2, 2, 0x000000, 0.62));
    this.pausePanel = this.createPanel(
      this.pauseContainer,
      "Pause",
      "Resume the run, restart it, or return to the main menu",
      560,
      320
    );

    const buttons = [
      createButton(this.scene, 0, -16, 220, 46, "Resume", () =>
        this.handlers.onResume?.(), { isPrimary: true }),
      createButton(this.scene, 0, 42, 220, 46, "Restart", () =>
        this.handlers.onRestart?.()),
      createButton(this.scene, 0, 100, 220, 46, "Main Menu", () =>
        this.handlers.onExit?.()),
    ];

    this.pauseMusicButton = createButton(
      this.scene,
      -96,
      150,
      164,
      40,
      "",
      () => this.handlers.onToggleMusic?.(!this.audioSettings.musicEnabled),
      { fontSize: "20px" }
    );
    this.pauseSfxButton = createButton(
      this.scene,
      96,
      150,
      164,
      40,
      "",
      () => this.handlers.onToggleSfx?.(!this.audioSettings.sfxEnabled),
      { fontSize: "20px" }
    );

    this.pauseAudioText = this.scene.add.text(0, 196, "", {
      color: TEXT_MUTED,
      fontFamily: MENU_BODY_FONT,
      fontSize: "21px",
    });
    this.pauseAudioText.setOrigin(0.5);

    this.pauseContainer.add([...buttons, this.pauseMusicButton, this.pauseSfxButton, this.pauseAudioText]);
  }

  layout() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    for (const [container, baseWidth, baseHeight] of [
      [this.mainContainer, 820, 700],
      [this.pauseContainer, 560, 370],
    ]) {
      container.setPosition(centerX, centerY);
      const backdrop = container.first;

      if (container === this.mainContainer) {
        this.mainBackgroundImage?.setDisplaySize(
          this.scene.scale.width,
          this.scene.scale.height
        );

        if (this.mainTitleImage) {
          const targetWidth = Math.min(560, this.scene.scale.width * 0.52);
          const safeWidth = Math.max(320, targetWidth);
          this.mainTitleImage.setScale(safeWidth / this.mainTitleImage.width);
        }

        if (this.mainBackdrop) {
          this.mainBackdrop.width = this.scene.scale.width;
          this.mainBackdrop.height = this.scene.scale.height;
        }
      } else {
        backdrop.width = this.scene.scale.width;
        backdrop.height = this.scene.scale.height;
      }

      const scaleX = (this.scene.scale.width - 32) / baseWidth;
      const scaleY = (this.scene.scale.height - 32) / baseHeight;
      container.setScale(Math.min(1, scaleX, scaleY));
    }
  }

  showMainMenu() {
    this.mainContainer.setVisible(true);
    this.renderAudioLabels();
    this.renderMainMenuState();
  }

  hideMainMenu() {
    this.mainContainer.setVisible(false);
  }

  showPauseMenu() {
    this.pauseContainer.setVisible(true);
    this.renderAudioLabels();
  }

  showPauseSettings() {
    this.showPauseMenu();
  }

  hidePauseMenu() {
    this.pauseContainer.setVisible(false);
  }
}

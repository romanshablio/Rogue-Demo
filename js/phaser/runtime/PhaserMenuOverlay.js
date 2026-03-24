const PANEL_COLOR = 0x091019;
const PANEL_BORDER = 0x314150;
const BUTTON_PRIMARY = 0xd7bd62;
const BUTTON_SECONDARY = 0x233243;
const TEXT_LIGHT = "#f5f7fa";
const TEXT_DARK = "#11161d";

function createButton(scene, x, y, width, height, label, onClick, isPrimary = false) {
  const container = scene.add.container(x, y);
  const background = scene.add.rectangle(
    0,
    0,
    width,
    height,
    isPrimary ? BUTTON_PRIMARY : BUTTON_SECONDARY
  );
  const text = scene.add.text(0, 0, label, {
    color: isPrimary ? TEXT_DARK : TEXT_LIGHT,
    fontFamily: "monospace",
    fontSize: "18px",
  });

  background.setStrokeStyle(1, PANEL_BORDER, 1);
  background.setInteractive({ useHandCursor: true });
  text.setOrigin(0.5);
  background.on("pointerdown", () => onClick?.());
  background.on("pointerover", () => {
    background.setAlpha(0.88);
  });
  background.on("pointerout", () => {
    background.setAlpha(1);
  });

  container.add([background, text]);
  return container;
}

export class PhaserMenuOverlay {
  constructor(scene, difficultyOptions) {
    this.scene = scene;
    this.difficultyOptions = difficultyOptions;
    this.mainContainer = scene.add.container(0, 0);
    this.pauseContainer = scene.add.container(0, 0);
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

    this.createMainMenu();
    this.createPauseMenu();
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

  renderAudioLabels() {
    const label = `Music ${this.audioSettings.musicEnabled ? "On" : "Off"}  |  SFX ${
      this.audioSettings.sfxEnabled ? "On" : "Off"
    }`;

    this.mainAudioText?.setText(label);
    this.pauseAudioText?.setText(label);
    this.mainMusicButton?.label?.setText(
      `Music: ${this.audioSettings.musicEnabled ? "On" : "Off"}`
    );
    this.mainSfxButton?.label?.setText(
      `SFX: ${this.audioSettings.sfxEnabled ? "On" : "Off"}`
    );
    this.pauseMusicButton?.label?.setText(
      `Music: ${this.audioSettings.musicEnabled ? "On" : "Off"}`
    );
    this.pauseSfxButton?.label?.setText(
      `SFX: ${this.audioSettings.sfxEnabled ? "On" : "Off"}`
    );
  }

  createPanel(container, title, subtitle, width, height) {
    const panel = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, width, height, PANEL_COLOR, 0.94);
    const border = this.scene.add.rectangle(0, 0, width, height);
    const titleText = this.scene.add.text(0, -height / 2 + 42, title, {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: "30px",
    });
    const subtitleText = this.scene.add.text(0, -height / 2 + 84, subtitle, {
      color: "#a7b5c4",
      fontFamily: "monospace",
      fontSize: "16px",
      align: "center",
      wordWrap: { width: width - 80 },
    });

    titleText.setOrigin(0.5);
    subtitleText.setOrigin(0.5, 0);
    border.setStrokeStyle(1, PANEL_BORDER, 1);
    panel.add([background, border, titleText, subtitleText]);
    container.add(panel);
    return panel;
  }

  createMainMenu() {
    this.mainContainer.add(this.scene.add.rectangle(0, 0, 2, 2, 0x000000, 0.62));
    this.mainPanel = this.createPanel(
      this.mainContainer,
      "Rogue Demo",
      "Phaser prototype over the shared gameplay core",
      620,
      420
    );

    let y = -10;
    for (const option of this.difficultyOptions) {
      const button = createButton(
        this.scene,
        0,
        y,
        260,
        46,
        `Start: ${option.label}`,
        () => this.handlers.onStart?.(option.id),
        option.id === "normal"
      );
      this.mainContainer.add(button);
      y += 58;
    }

    this.mainMusicButton = this.createAudioToggleButton(
      this.mainContainer,
      -96,
      148,
      "music"
    );
    this.mainSfxButton = this.createAudioToggleButton(
      this.mainContainer,
      96,
      148,
      "sfx"
    );

    this.mainAudioText = this.scene.add.text(0, 196, "", {
      color: "#a7b5c4",
      fontFamily: "monospace",
      fontSize: "15px",
    });
    this.mainAudioText.setOrigin(0.5);
    this.mainContainer.add(this.mainAudioText);
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
        this.handlers.onResume?.(), true),
      createButton(this.scene, 0, 42, 220, 46, "Restart", () =>
        this.handlers.onRestart?.()),
      createButton(this.scene, 0, 100, 220, 46, "Main Menu", () =>
        this.handlers.onExit?.()),
    ];

    this.pauseMusicButton = this.createAudioToggleButton(
      this.pauseContainer,
      -96,
      150,
      "music"
    );
    this.pauseSfxButton = this.createAudioToggleButton(
      this.pauseContainer,
      96,
      150,
      "sfx"
    );

    this.pauseAudioText = this.scene.add.text(0, 196, "", {
      color: "#a7b5c4",
      fontFamily: "monospace",
      fontSize: "15px",
    });
    this.pauseAudioText.setOrigin(0.5);

    this.pauseContainer.add([...buttons, this.pauseAudioText]);
  }

  createAudioToggleButton(container, x, y, type) {
    const button = createButton(
      this.scene,
      x,
      y,
      164,
      40,
      "",
      () => {
        if (type === "music") {
          this.handlers.onToggleMusic?.(!this.audioSettings.musicEnabled);
          return;
        }

        this.handlers.onToggleSfx?.(!this.audioSettings.sfxEnabled);
      }
    );

    button.label = button.list?.[1] || null;
    container.add(button);
    return button;
  }

  layout() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    for (const [container, baseWidth, baseHeight] of [
      [this.mainContainer, 620, 470],
      [this.pauseContainer, 560, 370],
    ]) {
      container.setPosition(centerX, centerY);
      const backdrop = container.first;
      backdrop.width = this.scene.scale.width;
      backdrop.height = this.scene.scale.height;

      const scaleX = (this.scene.scale.width - 32) / baseWidth;
      const scaleY = (this.scene.scale.height - 32) / baseHeight;
      container.setScale(Math.min(1, scaleX, scaleY));
    }
  }

  showMainMenu() {
    this.mainContainer.setVisible(true);
    this.renderAudioLabels();
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

const PANEL_MARGIN = 12;
const PANEL_FILL = 0x081018;
const PANEL_BORDER = 0x334556;
const HP_BAR_BG = 0x24161a;
const HP_BAR_FILL = 0xca4f5b;
const TEXT_LIGHT = "#f5f7fa";
const TEXT_MUTED = "#a7b5c4";
const TEXT_ACCENT = "#ffd979";

function pinToUiCamera(gameObject) {
  gameObject?.setScrollFactor?.(0);

  if (Array.isArray(gameObject?.list)) {
    for (const child of gameObject.list) {
      pinToUiCamera(child);
    }
  }

  return gameObject;
}

function createPanel(scene) {
  const container = scene.add.container(0, 0);
  const background = scene.add.rectangle(0, 0, 100, 100, PANEL_FILL, 0.82);
  const border = scene.add.rectangle(0, 0, 100, 100);

  background.setOrigin(0, 0);
  background.setStrokeStyle(0);
  border.setOrigin(0, 0);
  border.setFillStyle(0x000000, 0);
  border.setStrokeStyle(1, PANEL_BORDER, 1);

  container.add([background, border]);
  container.background = background;
  container.border = border;
  container.resize = (width, height) => {
    background.width = width;
    background.height = height;
    border.width = width;
    border.height = height;
  };

  return pinToUiCamera(container);
}

function createText(scene, x, y, style) {
  const text = scene.add.text(x, y, "", style);
  text.setOrigin(0, 0);
  return pinToUiCamera(text);
}

function getLayoutPreset(width) {
  if (width < 640) {
    return {
      topHeight: 122,
      bottomHeight: 88,
      hpBarWidth: Math.max(160, width - PANEL_MARGIN * 4),
      titleFontSize: "18px",
      metaFontSize: "14px",
      messageFontSize: "13px",
      helpFontSize: "12px",
      inventoryFontSize: "14px",
      narrow: true,
    };
  }

  if (width < 980) {
    return {
      topHeight: 96,
      bottomHeight: 72,
      hpBarWidth: Math.min(260, Math.floor(width * 0.34)),
      titleFontSize: "20px",
      metaFontSize: "15px",
      messageFontSize: "14px",
      helpFontSize: "13px",
      inventoryFontSize: "15px",
      narrow: false,
    };
  }

  return {
    topHeight: 84,
    bottomHeight: 64,
    hpBarWidth: Math.min(320, Math.floor(width * 0.26)),
    titleFontSize: "20px",
    metaFontSize: "16px",
    messageFontSize: "14px",
    helpFontSize: "14px",
    inventoryFontSize: "15px",
    narrow: false,
  };
}

function getControlHint(state) {
  const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)")?.matches;
  const touchPoints = globalThis.navigator?.maxTouchPoints || 0;
  const isPlatformerMode = state?.map?.metadata?.movementMode === "platformer";

  if (coarsePointer || touchPoints > 0) {
    if (isPlatformerMode) {
      return "Touch left/right  |  Jump  |  Attack  |  Bag button  |  Pause";
    }

    return "Touch controls  |  Bag button for items  |  Pause in the top-right";
  }

  if (isPlatformerMode) {
    return "A/D move  |  Shift jump  |  Space attack  |  Bag button  |  1 potion  |  2 sword";
  }

  return "WASD move  |  Space attack  |  Bag button  |  1 potion  |  2 sword  |  Esc pause";
}

export class PhaserHudOverlay {
  constructor(scene) {
    this.scene = scene;
    this.currentState = null;
    this.currentMessage = "";
    this.layoutPreset = getLayoutPreset(scene.scale.width);
    this.layoutMetrics = {
      topInset: this.layoutPreset.topHeight + PANEL_MARGIN + 8,
      bottomInset: this.layoutPreset.bottomHeight + PANEL_MARGIN + 8,
    };

    this.root = scene.add.container(0, 0);
    this.root.setDepth(200);
    this.root.setScrollFactor?.(0);
    this.topPanel = createPanel(scene);
    this.bottomPanel = createPanel(scene);

    this.hpLabelText = createText(scene, 0, 0, {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: this.layoutPreset.titleFontSize,
    });
    this.metaText = createText(scene, 0, 0, {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: this.layoutPreset.metaFontSize,
    });
    this.messageText = createText(scene, 0, 0, {
      color: TEXT_ACCENT,
      fontFamily: "monospace",
      fontSize: this.layoutPreset.messageFontSize,
    });
    this.inventoryText = createText(scene, 0, 0, {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: this.layoutPreset.inventoryFontSize,
    });
    this.helpText = createText(scene, 0, 0, {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: this.layoutPreset.helpFontSize,
    });
    this.inventoryText.setVisible(false);

    this.hpBarBackground = pinToUiCamera(
      scene.add.rectangle(0, 0, this.layoutPreset.hpBarWidth, 14, HP_BAR_BG, 1)
    );
    this.hpBarFill = pinToUiCamera(
      scene.add.rectangle(0, 0, this.layoutPreset.hpBarWidth, 14, HP_BAR_FILL, 1)
    );
    this.hpBarBackground.setOrigin(0, 0.5);
    this.hpBarFill.setOrigin(0, 0.5);

    this.root.add([
      this.topPanel,
      this.bottomPanel,
      this.hpBarBackground,
      this.hpBarFill,
      this.hpLabelText,
      this.metaText,
      this.messageText,
      this.inventoryText,
      this.helpText,
    ]);

    this.syncLayout();
  }

  syncLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const preset = getLayoutPreset(width);
    const panelWidth = Math.max(220, width - PANEL_MARGIN * 2);
    const topHeight = preset.topHeight;
    const bottomHeight = preset.bottomHeight;
    const contentLeft = PANEL_MARGIN + 18;
    const topInnerWidth = panelWidth - 36;

    this.layoutPreset = preset;
    this.layoutMetrics = {
      topInset: topHeight + PANEL_MARGIN + 8,
      bottomInset: bottomHeight + PANEL_MARGIN + 8,
    };

    this.topPanel.setPosition(PANEL_MARGIN, PANEL_MARGIN);
    this.topPanel.resize(panelWidth, topHeight);
    this.bottomPanel.setPosition(PANEL_MARGIN, height - bottomHeight - PANEL_MARGIN);
    this.bottomPanel.resize(panelWidth, bottomHeight);

    this.hpLabelText.setStyle({ fontSize: preset.titleFontSize });
    this.metaText.setStyle({ fontSize: preset.metaFontSize });
    this.messageText.setStyle({ fontSize: preset.messageFontSize });
    this.inventoryText.setStyle({ fontSize: preset.inventoryFontSize });
    this.helpText.setStyle({ fontSize: preset.helpFontSize });

    this.hpLabelText.setPosition(contentLeft, PANEL_MARGIN + 14);
    this.hpBarBackground.setPosition(contentLeft, PANEL_MARGIN + 50);
    this.hpBarBackground.width = preset.hpBarWidth;
    this.hpBarFill.setPosition(contentLeft, PANEL_MARGIN + 50);

    if (preset.narrow) {
      this.metaText.setPosition(contentLeft, PANEL_MARGIN + 70);
      this.metaText.setWordWrapWidth(Math.max(160, topInnerWidth));
      this.messageText.setPosition(contentLeft, PANEL_MARGIN + 92);
      this.messageText.setWordWrapWidth(Math.max(160, topInnerWidth));
      this.helpText.setPosition(contentLeft, height - bottomHeight - PANEL_MARGIN + 16);
      this.helpText.setWordWrapWidth(Math.max(160, panelWidth - 36));
    } else {
      const metaX = contentLeft + preset.hpBarWidth + 24;
      this.metaText.setPosition(metaX, PANEL_MARGIN + 16);
      this.metaText.setWordWrapWidth(Math.max(180, panelWidth - (metaX - PANEL_MARGIN) - 18));
      this.messageText.setPosition(metaX, PANEL_MARGIN + 44);
      this.messageText.setWordWrapWidth(Math.max(180, panelWidth - (metaX - PANEL_MARGIN) - 18));
      this.helpText.setPosition(contentLeft, height - bottomHeight - PANEL_MARGIN + 18);
      this.helpText.setWordWrapWidth(Math.max(220, panelWidth - 36));
    }
  }

  renderState(state) {
    this.currentState = state;

    this.hpLabelText.setText(`HP ${state.hero.hp} / ${state.hero.maxHp}`);
    this.metaText.setText(
      [
        `ATK ${state.hero.attack}`,
        `FLOOR ${state.run.currentFloor}/${state.run.maxFloorCount}`,
        `ENEMIES ${state.enemies.length}`,
        `STATUS ${state.run.status.toUpperCase()}`,
      ].join("   ")
    );
    this.helpText.setText(getControlHint(state));

    const hpPercent = Math.max(0, Math.min(1, state.hero.hp / Math.max(1, state.hero.maxHp)));
    this.hpBarFill.width = this.layoutPreset.hpBarWidth * hpPercent;
    this.messageText.setText(this.currentMessage || "");

    this.syncLayout();
  }

  showMessage(message) {
    this.currentMessage = message || "";
    this.messageText.setText(this.currentMessage);
    this.syncLayout();
  }

  getLayoutMetrics() {
    return {
      ...this.layoutMetrics,
    };
  }
}

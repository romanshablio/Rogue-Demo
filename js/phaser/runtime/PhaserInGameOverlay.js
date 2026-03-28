const PANEL_COLOR = 0x091019;
const PANEL_BORDER = 0x314150;
const TEXT_LIGHT = "#f5f7fa";
const TEXT_MUTED = "#a7b5c4";
const BUTTON_ACTIVE = 0x233243;
const BUTTON_DISABLED = 0x1a212a;
const BUTTON_HIGHLIGHT = 0xd7bd62;
const TEXT_DARK = "#11161d";

function pinToUiCamera(gameObject) {
  gameObject?.setScrollFactor?.(0);

  if (Array.isArray(gameObject?.list)) {
    for (const child of gameObject.list) {
      pinToUiCamera(child);
    }
  }

  return gameObject;
}

function createPanel(scene, width, height) {
  const container = scene.add.container(0, 0);
  const background = scene.add.rectangle(0, 0, width, height, PANEL_COLOR, 0.9);
  const border = scene.add.rectangle(0, 0, width, height);

  background.setStrokeStyle(0);
  border.setFillStyle(0x000000, 0);
  border.setStrokeStyle(1, PANEL_BORDER, 1);
  container.add([background, border]);
  container.background = background;
  container.border = border;
  container.resize = (nextWidth, nextHeight) => {
    background.width = nextWidth;
    background.height = nextHeight;
    border.width = nextWidth;
    border.height = nextHeight;
  };

  return pinToUiCamera(container);
}

function createButton(scene, width, height, label, onClick) {
  const container = scene.add.container(0, 0);
  const background = scene.add.rectangle(0, 0, width, height, BUTTON_ACTIVE, 1);
  const text = scene.add.text(0, 0, label, {
    color: TEXT_LIGHT,
    fontFamily: "monospace",
    fontSize: "14px",
    align: "center",
  });

  background.setStrokeStyle(1, PANEL_BORDER, 1);
  background.setInteractive({ useHandCursor: true });
  text.setOrigin(0.5);

  background.on("pointerdown", () => {
    if (!container.isDisabled) {
      onClick?.();
    }
  });
  background.on("pointerover", () => {
    if (!container.isDisabled) {
      background.setAlpha(0.88);
    }
  });
  background.on("pointerout", () => {
    background.setAlpha(1);
  });

  container.add([background, text]);
  container.background = background;
  container.label = text;
  container.isDisabled = false;
  container.setDisabled = (disabled) => {
    container.isDisabled = disabled;
    background.setFillStyle(disabled ? BUTTON_DISABLED : BUTTON_ACTIVE, 1);
    text.setAlpha(disabled ? 0.5 : 1);
  };
  container.resize = (nextWidth, nextHeight, fontSize = "14px") => {
    background.width = nextWidth;
    background.height = nextHeight;
    text.setStyle({ fontSize });
  };

  return pinToUiCamera(container);
}

function createBagToggleButton(scene, width, height, onClick) {
  const button = createButton(scene, width, height, "Bag", onClick);
  const icon = scene.add.graphics();

  icon.lineStyle(2, 0xf5f7fa, 1);
  icon.strokeRoundedRect(-9, -8, 18, 18, 4);
  icon.strokeRoundedRect(-5, -13, 10, 7, 3);
  icon.beginPath();
  icon.moveTo(-6, -1);
  icon.lineTo(0, 3);
  icon.lineTo(6, -1);
  icon.strokePath();

  icon.setPosition(-22, 0);
  button.label.setPosition(10, 0);
  button.add(icon);
  button.icon = icon;
  button.resize = (nextWidth, nextHeight, fontSize = "14px") => {
    button.background.width = nextWidth;
    button.background.height = nextHeight;
    button.label.setStyle({ fontSize });
    button.icon.setPosition(-(nextWidth / 2) + 20, 0);
    button.label.setPosition(10, 0);
  };

  return pinToUiCamera(button);
}

function getLayoutPreset(width) {
  if (width < 640) {
    return {
      margin: 12,
      topInset: 138,
      bottomInset: 132,
      inventoryWidth: 196,
      inventoryHeight: 94,
      bagButtonWidth: 90,
      bagButtonHeight: 34,
      controlsWidth: 176,
      controlsHeight: 64,
      minimapWidth: 140,
      minimapHeight: 108,
      minimapGridWidth: 112,
      minimapGridHeight: 62,
      inventoryButtonWidth: 156,
      inventoryButtonHeight: 28,
      actionButtonWidth: 70,
      actionButtonHeight: 30,
      touchInset: 214,
      touchButton: 54,
      touchAttackWidth: 88,
      touchAttackHeight: 54,
      inventoryStacked: true,
      quickHintVisible: false,
      narrow: true,
    };
  }

  if (width < 980) {
    return {
      margin: 14,
      topInset: 114,
      bottomInset: 116,
      inventoryWidth: 232,
      inventoryHeight: 74,
      bagButtonWidth: 96,
      bagButtonHeight: 36,
      controlsWidth: 196,
      controlsHeight: 64,
      minimapWidth: 164,
      minimapHeight: 118,
      minimapGridWidth: 136,
      minimapGridHeight: 74,
      inventoryButtonWidth: 104,
      inventoryButtonHeight: 32,
      actionButtonWidth: 78,
      actionButtonHeight: 32,
      touchInset: 208,
      touchButton: 56,
      touchAttackWidth: 96,
      touchAttackHeight: 56,
      inventoryStacked: false,
      quickHintVisible: true,
      narrow: false,
    };
  }

  return {
    margin: 16,
    topInset: 102,
    bottomInset: 108,
    inventoryWidth: 244,
    inventoryHeight: 74,
    bagButtonWidth: 102,
    bagButtonHeight: 38,
    controlsWidth: 206,
    controlsHeight: 64,
    minimapWidth: 188,
    minimapHeight: 126,
    minimapGridWidth: 160,
    minimapGridHeight: 82,
    inventoryButtonWidth: 108,
    inventoryButtonHeight: 32,
    actionButtonWidth: 82,
    actionButtonHeight: 32,
    touchInset: 212,
    touchButton: 58,
    touchAttackWidth: 100,
    touchAttackHeight: 58,
    inventoryStacked: false,
    quickHintVisible: true,
    narrow: false,
  };
}

export class PhaserInGameOverlay {
  constructor(scene) {
    this.scene = scene;
    this.handlers = {};
    this.inventoryOpen = false;
    this.isPlatformerMode = false;
    this.layoutPreset = getLayoutPreset(scene.scale.width);
    this.layoutMetrics = {
      topInset: this.layoutPreset.topInset,
      bottomInset: this.layoutPreset.bottomInset,
    };

    this.root = scene.add.container(0, 0);
    this.root.setDepth(210);
    this.root.setScrollFactor?.(0);
    this.minimapGraphics = pinToUiCamera(scene.add.graphics());
    this.inventoryPanel = createPanel(
      scene,
      this.layoutPreset.inventoryWidth,
      this.layoutPreset.inventoryHeight
    );
    this.controlsPanel = createPanel(
      scene,
      this.layoutPreset.controlsWidth,
      this.layoutPreset.controlsHeight
    );
    this.minimapPanel = createPanel(
      scene,
      this.layoutPreset.minimapWidth,
      this.layoutPreset.minimapHeight
    );
    this.inventoryTitle = pinToUiCamera(scene.add.text(0, 0, "Items", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "13px",
    }));
    this.inventoryTitle.setOrigin(0.5);
    this.controlsTitle = pinToUiCamera(scene.add.text(0, 0, "System", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "13px",
    }));
    this.controlsTitle.setOrigin(0.5);
    this.minimapTitle = pinToUiCamera(scene.add.text(0, 0, "Map", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "13px",
    }));
    this.minimapTitle.setOrigin(0.5);
    this.minimapHint = pinToUiCamera(scene.add.text(0, 0, "", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "12px",
      align: "center",
    }));
    this.minimapHint.setOrigin(0.5);
    this.quickUseHint = pinToUiCamera(scene.add.text(0, 0, "", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "12px",
    }));
    this.quickUseHint.setOrigin(0, 0.5);

    this.inventoryToggleButton = createBagToggleButton(
      scene,
      this.layoutPreset.bagButtonWidth,
      this.layoutPreset.bagButtonHeight,
      () => this.toggleInventory()
    );
    this.potionButton = createButton(scene, 104, 32, "", () => {
      this.handlers.onUsePotion?.();
      this.closeInventory();
    });
    this.swordButton = createButton(scene, 104, 32, "", () => {
      this.handlers.onUseSword?.();
      this.closeInventory();
    });
    this.pauseButton = createButton(scene, 82, 32, "Pause", () =>
      this.handlers.onPause?.()
    );
    this.fogButton = createButton(scene, 82, 32, "Fog", () =>
      this.handlers.onToggleFog?.()
    );
    this.touchControlsRoot = scene.add.container(0, 0);
    this.touchUpButton = createButton(scene, 56, 56, "↑", () =>
      this.handlers.onMoveUp?.()
    );
    this.touchRightButton = createButton(scene, 56, 56, "→", () =>
      this.handlers.onMoveRight?.()
    );
    this.touchDownButton = createButton(scene, 56, 56, "↓", () =>
      this.handlers.onMoveDown?.()
    );
    this.touchLeftButton = createButton(scene, 56, 56, "←", () =>
      this.handlers.onMoveLeft?.()
    );
    this.touchJumpButton = createButton(scene, 96, 56, "Jump", () =>
      this.handlers.onJump?.()
    );
    this.touchAttackButton = createButton(scene, 96, 56, "Attack", () =>
      this.handlers.onAttack?.()
    );

    this.inventoryPanel.add([
      this.inventoryTitle,
      this.potionButton,
      this.swordButton,
    ]);
    this.controlsPanel.add([
      this.controlsTitle,
      this.pauseButton,
      this.fogButton,
    ]);
    this.minimapPanel.add([
      this.minimapTitle,
      this.minimapGraphics,
      this.minimapHint,
    ]);
    this.touchControlsRoot.add([
      this.touchUpButton,
      this.touchRightButton,
      this.touchDownButton,
      this.touchLeftButton,
      this.touchJumpButton,
      this.touchAttackButton,
    ]);
    this.root.add([
      this.inventoryPanel,
      this.inventoryToggleButton,
      this.quickUseHint,
      this.controlsPanel,
      this.minimapPanel,
      this.touchControlsRoot,
    ]);
    this.inventoryPanel.setVisible(false);

    this.minimapViewport = {
      width: this.layoutPreset.minimapGridWidth,
      height: this.layoutPreset.minimapGridHeight,
    };

    this.syncLayout();
  }

  setHandlers(handlers) {
    this.handlers = {
      ...this.handlers,
      ...handlers,
    };
  }

  getLayoutMetrics() {
    return {
      ...this.layoutMetrics,
    };
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryPanel.setVisible(this.inventoryOpen);
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.inventoryPanel.setVisible(false);
  }

  syncLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const preset = getLayoutPreset(width);
    const margin = preset.margin;
    const isTouchLayout = this.shouldShowTouchControls();

    this.layoutPreset = preset;
    this.layoutMetrics = {
      topInset: preset.topInset,
      bottomInset: isTouchLayout
        ? Math.max(preset.bottomInset, preset.touchInset)
        : preset.bottomInset,
    };

    this.inventoryPanel.resize(preset.inventoryWidth, preset.inventoryHeight);
    this.inventoryToggleButton.resize(
      preset.bagButtonWidth,
      preset.bagButtonHeight,
      preset.narrow ? "13px" : "14px"
    );
    this.controlsPanel.resize(preset.controlsWidth, preset.controlsHeight);
    this.minimapPanel.resize(preset.minimapWidth, preset.minimapHeight);

    this.inventoryTitle.setPosition(0, -preset.inventoryHeight / 2 + 14);
    this.controlsTitle.setPosition(0, -preset.controlsHeight / 2 + 14);
    this.minimapTitle.setPosition(0, -preset.minimapHeight / 2 + 14);

    this.potionButton.resize(
      preset.inventoryButtonWidth,
      preset.inventoryButtonHeight,
      preset.narrow ? "13px" : "14px"
    );
    this.swordButton.resize(
      preset.inventoryButtonWidth,
      preset.inventoryButtonHeight,
      preset.narrow ? "13px" : "14px"
    );
    this.pauseButton.resize(
      preset.actionButtonWidth,
      preset.actionButtonHeight,
      preset.narrow ? "13px" : "14px"
    );
    this.fogButton.resize(
      preset.actionButtonWidth,
      preset.actionButtonHeight,
      preset.narrow ? "13px" : "14px"
    );

    if (preset.inventoryStacked) {
      this.potionButton.setPosition(0, -4);
      this.swordButton.setPosition(0, 28);
    } else {
      this.potionButton.setPosition(-preset.inventoryWidth / 4 + 6, 8);
      this.swordButton.setPosition(preset.inventoryWidth / 4 - 6, 8);
    }

    this.pauseButton.setPosition(-preset.controlsWidth / 4 + 4, 10);
    this.fogButton.setPosition(preset.controlsWidth / 4 - 4, 10);

    this.minimapViewport = {
      width: preset.minimapGridWidth,
      height: preset.minimapGridHeight,
    };
    this.minimapGraphics.setPosition(
      -preset.minimapGridWidth / 2,
      -preset.minimapHeight / 2 + 24
    );
    this.minimapHint.setPosition(0, preset.minimapHeight / 2 - 14);

    this.controlsPanel.setPosition(
      width - margin - preset.controlsWidth / 2,
      margin + preset.controlsHeight / 2
    );
    const bagButtonX = margin + preset.bagButtonWidth / 2;
    const bagButtonY =
      height - this.layoutMetrics.bottomInset - margin - preset.bagButtonHeight / 2;
    this.inventoryToggleButton.setPosition(bagButtonX, bagButtonY);
    this.quickUseHint.setVisible(preset.quickHintVisible && !isTouchLayout);
    this.quickUseHint.setPosition(
      bagButtonX + preset.bagButtonWidth / 2 + 12,
      bagButtonY
    );
    this.inventoryPanel.setPosition(
      bagButtonX + (preset.inventoryWidth - preset.bagButtonWidth) / 2,
      bagButtonY - preset.bagButtonHeight / 2 - 12 - preset.inventoryHeight / 2
    );
    this.minimapPanel.setPosition(
      width - margin - preset.minimapWidth / 2,
      height - margin - preset.minimapHeight / 2
    );

    this.touchControlsRoot.setVisible(isTouchLayout);
    if (isTouchLayout) {
      const dpadX = margin + preset.touchButton;
      const dpadBaseY = height - margin - preset.touchButton * 1.35;
      const attackX = width - margin - preset.touchAttackWidth / 2;
      const attackY = height - margin - preset.touchAttackHeight / 2 - 10;

      this.touchUpButton.resize(preset.touchButton, preset.touchButton, "22px");
      this.touchRightButton.resize(preset.touchButton, preset.touchButton, "22px");
      this.touchDownButton.resize(preset.touchButton, preset.touchButton, "22px");
      this.touchLeftButton.resize(preset.touchButton, preset.touchButton, "22px");
      this.touchJumpButton.resize(
        preset.touchAttackWidth,
        preset.touchAttackHeight,
        "16px"
      );
      this.touchAttackButton.resize(
        preset.touchAttackWidth,
        preset.touchAttackHeight,
        "16px"
      );

      this.touchControlsRoot.setPosition(dpadX, dpadBaseY - preset.touchButton);
      this.touchLeftButton.setPosition(0, preset.touchButton);
      this.touchUpButton.setPosition(preset.touchButton, 0);
      this.touchDownButton.setPosition(preset.touchButton, preset.touchButton);
      this.touchRightButton.setPosition(preset.touchButton * 2, preset.touchButton);
      this.touchJumpButton.setPosition(
        attackX - dpadX,
        attackY - preset.touchAttackHeight - 12 - (dpadBaseY - preset.touchButton)
      );
      this.touchAttackButton.setPosition(
        attackX - dpadX,
        attackY - (dpadBaseY - preset.touchButton)
      );
    }

    this.inventoryPanel.setVisible(this.inventoryOpen);
  }

  renderState(game, state) {
    const isVisible = state.run.status !== "idle";
    const isRunning = state.run.status === "running";
    const isPlatformerMode =
      state.map?.metadata?.movementMode === "platformer";

    this.isPlatformerMode = isPlatformerMode;

    this.root.setVisible(isVisible);
    if (!isVisible) {
      this.closeInventory();
      return;
    }

    if (!isRunning) {
      this.closeInventory();
    }

    this.inventoryToggleButton.label.setText("Bag");
    this.potionButton.label.setText(`[1] Potion (${state.inventory.potion})`);
    this.swordButton.label.setText(`[2] Sword (${state.inventory.sword})`);
    this.quickUseHint.setText("[1] Potion   [2] Sword");
    this.potionButton.setDisabled(
      !isRunning || state.inventory.potion <= 0 || state.hero.hp >= state.hero.maxHp
    );
    this.swordButton.setDisabled(!isRunning || state.inventory.sword <= 0);
    this.pauseButton.setDisabled(state.run.status === "idle");
    this.fogButton.setDisabled(state.run.status === "idle");
    this.inventoryToggleButton.setDisabled(!isRunning);

    for (const button of [
      this.touchUpButton,
      this.touchRightButton,
      this.touchDownButton,
      this.touchLeftButton,
      this.touchJumpButton,
      this.touchAttackButton,
    ]) {
      button.setDisabled(!isRunning || (button === this.touchJumpButton && !isPlatformerMode));
    }

    this.touchUpButton.setVisible(!isPlatformerMode);
    this.touchDownButton.setVisible(!isPlatformerMode);
    this.touchJumpButton.setVisible(isPlatformerMode);

    this.fogButton.background.setFillStyle(
      state.run.fogEnabled ? BUTTON_HIGHLIGHT : BUTTON_ACTIVE,
      1
    );
    this.fogButton.label.setColor(
      state.run.fogEnabled ? "#11161d" : TEXT_LIGHT
    );
    this.inventoryToggleButton.background.setFillStyle(
      this.inventoryToggleButton.isDisabled
        ? BUTTON_DISABLED
        : this.inventoryOpen
          ? BUTTON_HIGHLIGHT
          : BUTTON_ACTIVE,
      1
    );
    this.inventoryToggleButton.label.setColor(
      this.inventoryOpen && !this.inventoryToggleButton.isDisabled
        ? TEXT_DARK
        : TEXT_LIGHT
    );
    this.minimapHint.setText(
      `Fog ${state.run.fogEnabled ? "On" : "Off"}  |  Floor ${state.run.currentFloor}`
    );

    this.renderMinimap(state);
    this.syncLayout();
  }

  shouldShowTouchControls() {
    const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)")?.matches;
    const touchPoints = globalThis.navigator?.maxTouchPoints || 0;
    return Boolean(coarsePointer || touchPoints > 0);
  }

  renderMinimap(state) {
    const { width, height, tiles } = state.map;
    const graphics = this.minimapGraphics;
    const panelWidth = this.minimapViewport.width;
    const panelHeight = this.minimapViewport.height;

    graphics.clear();
    graphics.fillStyle(0x0d1219, 1);
    graphics.fillRect(0, 0, panelWidth, panelHeight);

    if (!tiles.length) {
      return;
    }

    const cellWidth = panelWidth / width;
    const cellHeight = panelHeight / height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        graphics.fillStyle(tiles[y][x] === "wall" ? 0x273241 : 0x73808f, 1);
        graphics.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }

    for (const item of state.items) {
      graphics.fillStyle(item.type === "potion" ? 0x5de1b6 : 0xe4d47d, 1);
      graphics.fillRect(
        item.x * cellWidth,
        item.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }

    for (const enemy of state.enemies) {
      graphics.fillStyle(0xf06464, 1);
      graphics.fillRect(
        enemy.x * cellWidth,
        enemy.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }

    graphics.fillStyle(0xf2a0cf, 1);
    graphics.fillRect(
      state.princess.x * cellWidth,
      state.princess.y * cellHeight,
      cellWidth,
      cellHeight
    );

    graphics.fillStyle(0xd7bd62, 1);
    graphics.fillRect(
      state.door.x * cellWidth,
      state.door.y * cellHeight,
      cellWidth,
      cellHeight
    );

    graphics.fillStyle(0x5ec7ff, 1);
    graphics.fillRect(
      state.hero.x * cellWidth,
      state.hero.y * cellHeight,
      cellWidth,
      cellHeight
    );
  }
}

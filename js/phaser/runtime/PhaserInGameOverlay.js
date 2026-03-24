import { performPlayerAction, PLAYER_ACTIONS } from "../../game/input/playerActions.js";

const PANEL_COLOR = 0x091019;
const PANEL_BORDER = 0x314150;
const TEXT_LIGHT = "#f5f7fa";
const TEXT_MUTED = "#a7b5c4";
const BUTTON_ACTIVE = 0x233243;
const BUTTON_DISABLED = 0x1a212a;
const BUTTON_HIGHLIGHT = 0xd7bd62;

function createPanel(scene, width, height) {
  const container = scene.add.container(0, 0);
  const background = scene.add.rectangle(0, 0, width, height, PANEL_COLOR, 0.92);
  const border = scene.add.rectangle(0, 0, width, height);
  border.setStrokeStyle(1, PANEL_BORDER, 1);
  container.add([background, border]);
  container.background = background;
  container.border = border;
  return container;
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
    if (container.isDisabled) {
      return;
    }

    onClick?.();
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

  return container;
}

export class PhaserInGameOverlay {
  constructor(scene) {
    this.scene = scene;
    this.handlers = {};
    this.root = scene.add.container(0, 0);
    this.minimapGraphics = scene.add.graphics();
    this.inventoryPanel = createPanel(scene, 204, 118);
    this.controlsPanel = createPanel(scene, 204, 104);
    this.minimapPanel = createPanel(scene, 188, 126);
    this.inventoryTitle = scene.add.text(0, -44, "Inventory", {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: "16px",
    });
    this.inventoryTitle.setOrigin(0.5);
    this.controlsTitle = scene.add.text(0, -38, "Controls", {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: "16px",
    });
    this.controlsTitle.setOrigin(0.5);
    this.minimapTitle = scene.add.text(0, -48, "Minimap", {
      color: TEXT_LIGHT,
      fontFamily: "monospace",
      fontSize: "16px",
    });
    this.minimapTitle.setOrigin(0.5);
    this.minimapHint = scene.add.text(0, 50, "", {
      color: TEXT_MUTED,
      fontFamily: "monospace",
      fontSize: "12px",
    });
    this.minimapHint.setOrigin(0.5);

    this.potionButton = createButton(scene, 180, 32, "", () =>
      this.handlers.onUsePotion?.()
    );
    this.swordButton = createButton(scene, 180, 32, "", () =>
      this.handlers.onUseSword?.()
    );
    this.pauseButton = createButton(scene, 84, 32, "Pause", () =>
      this.handlers.onPause?.()
    );
    this.fogButton = createButton(scene, 84, 32, "Fog", () =>
      this.handlers.onToggleFog?.()
    );
    this.touchControlsRoot = scene.add.container(0, 0);
    this.touchUpButton = createButton(scene, 52, 52, "↑", () =>
      this.handlers.onMoveUp?.()
    );
    this.touchRightButton = createButton(scene, 52, 52, "→", () =>
      this.handlers.onMoveRight?.()
    );
    this.touchDownButton = createButton(scene, 52, 52, "↓", () =>
      this.handlers.onMoveDown?.()
    );
    this.touchLeftButton = createButton(scene, 52, 52, "←", () =>
      this.handlers.onMoveLeft?.()
    );
    this.touchAttackButton = createButton(scene, 92, 52, "Attack", () =>
      this.handlers.onAttack?.()
    );
    this.menuHint = scene.add.text(
      0,
      38,
      "Esc for pause menu",
      {
        color: TEXT_MUTED,
        fontFamily: "monospace",
        fontSize: "12px",
      }
    );
    this.menuHint.setOrigin(0.5);

    this.inventoryPanel.add([
      this.inventoryTitle,
      this.potionButton,
      this.swordButton,
    ]);
    this.controlsPanel.add([
      this.controlsTitle,
      this.pauseButton,
      this.fogButton,
      this.menuHint,
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
      this.touchAttackButton,
    ]);
    this.root.add([
      this.inventoryPanel,
      this.controlsPanel,
      this.minimapPanel,
      this.touchControlsRoot,
    ]);
    this.syncLayout();
  }

  setHandlers(handlers) {
    this.handlers = {
      ...this.handlers,
      ...handlers,
    };
  }

  syncLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const topRightX = width - 120;
    const isTouchLayout = this.shouldShowTouchControls();

    this.root.setPosition(0, 0);
    this.inventoryPanel.setPosition(126, height - 92);
    this.controlsPanel.setPosition(topRightX, 112);
    this.minimapPanel.setPosition(width - 110, height - 92);

    this.potionButton.setPosition(0, -8);
    this.swordButton.setPosition(0, 30);
    this.pauseButton.setPosition(-48, -4);
    this.fogButton.setPosition(48, -4);
    this.minimapGraphics.setPosition(-84, -36);

    this.touchControlsRoot.setVisible(isTouchLayout);
    this.touchLeftButton.setPosition(0, 62);
    this.touchUpButton.setPosition(58, 4);
    this.touchDownButton.setPosition(58, 62);
    this.touchRightButton.setPosition(116, 62);
    this.touchAttackButton.setPosition(width - 102, height - 86);
    this.touchControlsRoot.setPosition(24, height - 146);
  }

  renderState(game, state) {
    const isVisible = state.run.status !== "idle";
    const isRunning = state.run.status === "running";

    this.root.setVisible(isVisible);
    if (!isVisible) {
      return;
    }

    this.potionButton.label.setText(`Potion (${state.inventory.potion})`);
    this.swordButton.label.setText(`Sword (${state.inventory.sword})`);
    this.potionButton.setDisabled(
      !isRunning || state.inventory.potion <= 0 || state.hero.hp >= state.hero.maxHp
    );
    this.swordButton.setDisabled(!isRunning || state.inventory.sword <= 0);
    this.pauseButton.setDisabled(state.run.status === "idle");
    this.fogButton.setDisabled(state.run.status === "idle");
    const touchButtons = [
      this.touchUpButton,
      this.touchRightButton,
      this.touchDownButton,
      this.touchLeftButton,
      this.touchAttackButton,
    ];
    for (const button of touchButtons) {
      button.setDisabled(!isRunning);
    }
    this.fogButton.background.setFillStyle(
      state.run.fogEnabled ? BUTTON_HIGHLIGHT : BUTTON_ACTIVE,
      1
    );
    this.fogButton.label.setColor(
      state.run.fogEnabled ? "#11161d" : TEXT_LIGHT
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
    const panelWidth = 168;
    const panelHeight = 92;
    const { width, height, tiles } = state.map;
    const graphics = this.minimapGraphics;

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

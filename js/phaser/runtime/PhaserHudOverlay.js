const HUD_TEXT_STYLE = {
  color: "#f5f7fa",
  fontFamily: "monospace",
  fontSize: "18px",
};

const MESSAGE_TEXT_STYLE = {
  color: "#ffd979",
  fontFamily: "monospace",
  fontSize: "16px",
};

const HELP_TEXT_STYLE = {
  color: "#a7b5c4",
  fontFamily: "monospace",
  fontSize: "14px",
};

export class PhaserHudOverlay {
  constructor(scene) {
    this.scene = scene;
    this.primaryHudText = scene.add.text(16, 16, "", HUD_TEXT_STYLE);
    this.secondaryHudText = scene.add.text(16, 40, "", {
      ...HUD_TEXT_STYLE,
      color: "#a7b5c4",
      fontSize: "16px",
    });
    this.messageText = scene.add.text(16, 70, "", MESSAGE_TEXT_STYLE);
    this.helpText = scene.add.text(
      16,
      scene.scale.height - 28,
      "WASD move, Space attack, 1 potion, 2 sword, Esc pause",
      HELP_TEXT_STYLE
    );

    this.syncLayout();
  }

  syncLayout() {
    const wrapWidth = Math.max(180, this.scene.scale.width - 32);
    this.primaryHudText.setWordWrapWidth(wrapWidth);
    this.secondaryHudText.setWordWrapWidth(wrapWidth);
    this.messageText.setWordWrapWidth(wrapWidth);
    this.helpText.setWordWrapWidth(wrapWidth);

    this.primaryHudText.setPosition(16, 16);
    this.secondaryHudText.setPosition(16, 40);
    this.messageText.setPosition(16, 70);

    const helpHeight = this.helpText.height || 18;
    this.helpText.setPosition(16, this.scene.scale.height - helpHeight - 14);
  }

  renderState(state) {
    this.primaryHudText.setText(
      [
        `HP ${state.hero.hp}/${state.hero.maxHp}`,
        `ATK ${state.hero.attack}`,
        `FLOOR ${state.run.currentFloor}/${state.run.maxFloorCount}`,
      ].join("   ")
    );

    this.secondaryHudText.setText(
      [
        `ENEMIES ${state.enemies.length}`,
        `POTION ${state.inventory.potion}`,
        `SWORD ${state.inventory.sword}`,
        `STATUS ${state.run.status}`,
      ].join("   ")
    );

    this.syncLayout();
  }

  showMessage(message) {
    this.messageText.setText(message || "");
    this.syncLayout();
  }

  getLayoutMetrics() {
    const topInset = this.messageText.y + this.messageText.height + 20;
    const bottomInset =
      this.scene.scale.height - this.helpText.y + 8;

    return {
      topInset,
      bottomInset,
    };
  }
}

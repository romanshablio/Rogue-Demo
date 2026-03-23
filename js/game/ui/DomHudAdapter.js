export class DomHudAdapter {
  constructor(documentObject) {
    this.document = documentObject;
    this.window = documentObject.defaultView || globalThis.window || null;
    this.healthBar = documentObject.querySelector(
      ".hero-health-corner .health-bar-inner"
    );
    this.healthValue = documentObject.querySelector(
      ".hero-health-corner .health-value"
    );
    this.healthStatValue = documentObject.querySelector(".hero-stat-health");
    this.attackStatValue = documentObject.querySelector(".hero-stat-attack");
    this.floorStatValue = documentObject.querySelector(".hero-stat-floor");
    this.enemyStatValue = documentObject.querySelector(".hero-stat-enemies");
    this.potionCountValue = documentObject.querySelector(".inventory-count-potion");
    this.swordCountValue = documentObject.querySelector(".inventory-count-sword");
    this.inventoryButtons = [
      ...documentObject.querySelectorAll(".inventory-use-button"),
    ];
    this.minimapCanvas = documentObject.querySelector(".minimap-canvas");
    this.minimapContext = this.minimapCanvas?.getContext?.("2d") || null;
    this.messageHideTimer = null;
    this.messageElement = this.createMessageElement();

    for (const button of this.inventoryButtons) {
      button.addEventListener("click", () => {
        this.onUseItem?.(button.dataset.itemType);
      });
    }
  }

  setUseItemHandler(handler) {
    this.onUseItem = handler;
  }

  render(state) {
    if (!this.healthBar || !this.healthValue) {
      return;
    }

    const hpPercent = Math.max(
      0,
      Math.round((state.hero.hp / state.hero.maxHp) * 100)
    );

    this.healthBar.style.width = `${hpPercent}%`;
    this.healthValue.textContent = `${state.hero.hp}/${state.hero.maxHp}`;

    if (this.healthStatValue) {
      this.healthStatValue.textContent = `${state.hero.hp}/${state.hero.maxHp}`;
    }

    if (this.attackStatValue) {
      this.attackStatValue.textContent = `${state.hero.attack}`;
    }

    if (this.floorStatValue) {
      this.floorStatValue.textContent = `${state.run.currentFloor}/${state.run.maxFloorCount}`;
    }

    if (this.enemyStatValue) {
      this.enemyStatValue.textContent = `${state.enemies.length}`;
    }

    if (this.potionCountValue) {
      this.potionCountValue.textContent = `${state.inventory.potion}`;
    }

    if (this.swordCountValue) {
      this.swordCountValue.textContent = `${state.inventory.sword}`;
    }

    for (const button of this.inventoryButtons) {
      const count =
        button.dataset.itemType === "potion"
          ? state.inventory.potion
          : state.inventory.sword;
      button.disabled = count <= 0 || state.run.status !== "running";
    }

    this.renderMinimap(state);
  }

  renderMinimap(state) {
    if (!this.minimapContext || !this.minimapCanvas) {
      return;
    }

    const { width, height, tiles } = state.map;
    const context = this.minimapContext;
    context.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

    if (!tiles.length) {
      context.fillStyle = "rgba(255,255,255,0.06)";
      context.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
      return;
    }

    const cellWidth = this.minimapCanvas.width / width;
    const cellHeight = this.minimapCanvas.height / height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        context.fillStyle = tiles[y][x] === "wall" ? "#273241" : "#73808f";
        context.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }

    for (const item of state.items) {
      context.fillStyle = item.type === "potion" ? "#5de1b6" : "#e4d47d";
      context.fillRect(
        item.x * cellWidth,
        item.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }

    for (const enemy of state.enemies) {
      context.fillStyle = "#f06464";
      context.fillRect(
        enemy.x * cellWidth,
        enemy.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }

    context.fillStyle = "#f2a0cf";
    context.fillRect(
      state.princess.x * cellWidth,
      state.princess.y * cellHeight,
      cellWidth,
      cellHeight
    );

    context.fillStyle = "#d7bd62";
    context.fillRect(
      state.door.x * cellWidth,
      state.door.y * cellHeight,
      cellWidth,
      cellHeight
    );

    context.fillStyle = "#5ec7ff";
    context.fillRect(
      state.hero.x * cellWidth,
      state.hero.y * cellHeight,
      cellWidth,
      cellHeight
    );
  }

  showMessage(message, options = {}) {
    if (!this.messageElement) {
      return;
    }

    const type = options.type || "info";
    this.messageElement.textContent = message;
    this.messageElement.className = `game-message is-visible is-${type}`;

    if (this.messageHideTimer && this.window) {
      this.window.clearTimeout(this.messageHideTimer);
    }

    if (!this.window) {
      return;
    }

    this.messageHideTimer = this.window.setTimeout(() => {
      this.messageElement.classList.remove("is-visible");
    }, options.durationMs || 2200);
  }

  clearMessage() {
    if (!this.messageElement) {
      return;
    }

    if (this.messageHideTimer && this.window) {
      this.window.clearTimeout(this.messageHideTimer);
      this.messageHideTimer = null;
    }

    this.messageElement.classList.remove("is-visible");
    this.messageElement.textContent = "";
  }

  createMessageElement() {
    if (!this.document.body) {
      return null;
    }

    const element = this.document.createElement("div");
    element.className = "game-message";
    this.document.body.appendChild(element);
    return element;
  }
}

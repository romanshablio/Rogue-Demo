const PhaserGlobal = globalThis.Phaser;

const DEFAULT_TILE_SIZE = 96;
const HERO_MOVE_SPEED = 320;
const HERO_JUMP_SPEED = 1360;
const HERO_GRAVITY = 2200;
const HERO_DISPLAY_HEIGHT = 1.35;
const HERO_ANIMATED_SCALE_MULTIPLIER = 1.5;
const PRINCESS_FOLLOW_LERP = 0.08;
const RECRUIT_DISTANCE = 84;
const DOOR_DISTANCE = 78;

export class PhaserPlatformerMode {
  constructor(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    this.root.setDepth(13);
    this.root.setVisible(false);

    this.background = null;
    this.platforms = null;
    this.decorSprites = [];
    this.itemSprites = new Map();
    this.heroSprite = null;
    this.heroIdleSprite = null;
    this.princessSprite = null;
    this.doorSprite = null;
    this.active = false;
    this.currentTilesRef = null;
    this.currentFloor = null;
    this.currentLevelId = null;
    this.currentGame = null;
    this.currentState = null;
    this.currentConfig = null;
    this.layoutMetrics = {
      topInset: 0,
      bottomInset: 0,
    };
    this.tileSize = DEFAULT_TILE_SIZE;
    this.moveDirection = 0;
    this.tapMoveDirection = 0;
    this.tapMoveUntil = 0;
    this.jumpQueued = false;
    this.rescueTriggered = false;

    this.keys = scene.input.keyboard?.addKeys({
      left: PhaserGlobal.Input.Keyboard.KeyCodes.A,
      right: PhaserGlobal.Input.Keyboard.KeyCodes.D,
      jump: PhaserGlobal.Input.Keyboard.KeyCodes.SHIFT,
    });

    if (!scene.anims.exists("platformer-hero-walk")) {
      scene.anims.create({
        key: "platformer-hero-walk",
        frames: scene.anims.generateFrameNumbers("hero-walk", {
          start: 0,
          end: 24,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }

    if (!scene.anims.exists("platformer-hero-jump")) {
      scene.anims.create({
        key: "platformer-hero-jump",
        frames: scene.anims.generateFrameNumbers("hero-jump", {
          start: 0,
          end: 24,
        }),
        frameRate: 14,
        repeat: -1,
      });
    }
  }

  handleAction(actionId) {
    if (!this.active) {
      return false;
    }

    if (actionId === "move-left" || actionId === "move-right") {
      return true;
    }

    if (actionId === "jump") {
      this.jumpQueued = true;
      return true;
    }

    return false;
  }

  tapMove(direction) {
    if (!this.active) {
      return false;
    }

    this.tapMoveDirection = direction;
    this.tapMoveUntil = this.scene.time.now + 170;
    return true;
  }

  requestJump() {
    if (!this.active) {
      return false;
    }

    this.jumpQueued = true;
    return true;
  }

  renderState(game, state, layoutMetrics = {}, config = null) {
    const shouldBeActive =
      state?.map?.metadata?.movementMode === "platformer" &&
      state?.run?.status !== "idle";

    this.currentGame = game;
    this.currentState = state;
    this.currentConfig = config;
    this.layoutMetrics = {
      topInset: layoutMetrics.topInset || 0,
      bottomInset: layoutMetrics.bottomInset || 0,
    };

    if (!shouldBeActive) {
      this.deactivate();
      return false;
    }

    const needsRebuild =
      !this.active ||
      this.currentTilesRef !== state.map.tiles ||
      this.currentFloor !== state.run.currentFloor ||
      this.currentLevelId !== state.run.currentLevelId;

    if (needsRebuild) {
      this.activate();
      this.buildWorld(game, state, config);
    }

    this.syncSceneObjects(state, config);
    this.syncCamera();
    return true;
  }

  update(_time, _delta) {
    if (!this.active || !this.heroSprite || !this.currentGame || !this.currentState) {
      return;
    }

    const isRunning = this.currentState.run.status === "running";
    if (!isRunning) {
      this.heroSprite.body.moves = false;
      this.heroSprite.setVelocity(0, 0);
      return;
    }

    this.heroSprite.body.moves = true;

    const keyboardDirection =
      (this.keys?.left?.isDown ? -1 : 0) + (this.keys?.right?.isDown ? 1 : 0);
    const tapDirection =
      this.scene.time.now < this.tapMoveUntil ? this.tapMoveDirection : 0;
    const direction = keyboardDirection || tapDirection || 0;

    this.heroSprite.setVelocityX(direction * HERO_MOVE_SPEED);
    if (direction !== 0) {
      this.moveDirection = direction;
      this.heroSprite.setFlipX(direction < 0);
      this.heroIdleSprite?.setFlipX(direction < 0);
      this.currentState.hero.facingX = direction < 0 ? -1 : 1;
    }

    const body = this.heroSprite.body;
    if (
      this.jumpQueued &&
      body &&
      (body.blocked.down || body.touching.down)
    ) {
      this.heroSprite.setVelocityY(-HERO_JUMP_SPEED);
    }
    this.jumpQueued = false;
    this.syncHeroVisuals();
    this.updateHeroAnimation(direction, body);

    this.syncStateFromHero();
    this.syncPrincessFollow();
    this.checkItemOverlaps();
    this.checkPrincessRecruit();
    this.checkDoorExit();
  }

  resize() {
    if (!this.active) {
      return;
    }

    this.syncCamera();
  }

  shutdown() {
    this.deactivate();
    this.root.destroy(true);
  }

  activate() {
    this.active = true;
    this.root.setVisible(true);
  }

  deactivate() {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.currentTilesRef = null;
    this.currentFloor = null;
    this.currentLevelId = null;
    this.jumpQueued = false;
    this.tapMoveDirection = 0;
    this.tapMoveUntil = 0;
    this.root.removeAll(true);
    this.decorSprites = [];
    this.itemSprites.clear();
    this.background = null;
    this.platforms?.clear(true, true);
    this.platforms = null;
    this.decorSprites = [];
    this.heroSprite = null;
    this.heroIdleSprite = null;
    this.princessSprite = null;
    this.doorSprite = null;
    this.scene.physics.world.setBounds(0, 0, this.scene.scale.width, this.scene.scale.height);
    this.scene.cameras.main.stopFollow();
    this.scene.cameras.main.setZoom(1);
    this.scene.cameras.main.setScroll(0, 0);
    this.background?.destroy();
    this.background = null;
    this.root.setVisible(false);
  }

  buildWorld(game, state, config) {
    this.root.removeAll(true);
    this.platforms?.clear(true, true);
    this.decorSprites = [];
    this.itemSprites.clear();
    this.currentTilesRef = state.map.tiles;
    this.currentFloor = state.run.currentFloor;
    this.currentLevelId = state.run.currentLevelId;
    this.rescueTriggered = false;

    const worldWidth = state.map.width * this.tileSize;
    const worldHeight = state.map.height * this.tileSize;

    this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    this.background?.destroy();
    this.background = this.scene.add.image(worldWidth / 2, worldHeight / 2, "sky");
    this.background.setDisplaySize(worldWidth, worldHeight);
    this.background.setDepth(9);

    this.platforms = this.scene.physics.add.staticGroup();
    const floatingGround2Cells = new Set(
      (state.map.metadata?.floatingGround2Cells || []).map(
        (cell) => `${cell.x}:${cell.y}`
      )
    );

    for (let y = 0; y < state.map.height; y += 1) {
      for (let x = 0; x < state.map.width; x += 1) {
        if (state.map.tiles[y][x] !== "wall") {
          continue;
        }

        const textureKey =
          y >= state.map.height - 2
            ? "ground-1"
            : floatingGround2Cells.has(`${x}:${y}`)
              ? "ground-2"
              : "sky-block";
        const platform = this.platforms.create(
          this.gridToWorldX(x),
          this.gridToWorldY(y),
          textureKey
        );
        platform.setDepth(11);
        platform.setDisplaySize(this.tileSize, this.tileSize);
        platform.refreshBody();
      }
    }

    for (const treeSpawn of state.map.metadata?.tecnoTreeSpawns || []) {
      if (!this.hasSupportTile(state, treeSpawn.x, treeSpawn.y + 1, "sky-block")) {
        continue;
      }

      const tree = this.createDecorSprite(
        this.gridToWorldX(treeSpawn.x),
        this.gridToWorldY(treeSpawn.y),
        "tecno-tree",
        {
          maxHeight: this.tileSize * 4,
          maxWidth: this.tileSize * 2.4,
          bottomOffset: this.tileSize / 2 + 8,
          depth: 12,
        }
      );
      this.decorSprites.push(tree);
      this.root.add(tree);
    }

    for (const treeSpawn of state.map.metadata?.regularTreeSpawns || []) {
      if (!this.hasSupportTile(state, treeSpawn.x, treeSpawn.y + 1, "ground-1")) {
        continue;
      }

      const tree = this.createDecorSprite(
        this.gridToWorldX(treeSpawn.x),
        this.gridToWorldY(treeSpawn.y),
        "tree",
        {
          maxHeight: this.tileSize * 4,
          maxWidth: this.tileSize * 2.4,
          bottomOffset: this.tileSize / 2 + 8,
          depth: 12,
        }
      );
      this.decorSprites.push(tree);
      this.root.add(tree);
    }

    for (const flowerSpawn of state.map.metadata?.flowerSpawns || []) {
      if (!this.hasSupportTile(state, flowerSpawn.x, flowerSpawn.y + 1, "ground-1")) {
        continue;
      }

      const flowers = this.createDecorSprite(
        this.gridToWorldX(flowerSpawn.x),
        this.gridToWorldY(flowerSpawn.y),
        "flowers",
        {
          maxHeight: this.tileSize * 4,
          maxWidth: this.tileSize * 2.4,
          bottomOffset: this.tileSize / 2 + 2,
          depth: 12,
        }
      );
      this.decorSprites.push(flowers);
      this.root.add(flowers);
    }

    this.doorSprite = this.scene.add.image(
      this.gridToWorldX(state.door.x),
      this.gridToWorldY(state.door.y),
      "door"
    );
    this.scaleSprite(this.doorSprite, this.tileSize - 8);
    this.root.add(this.doorSprite);

    this.princessSprite = this.scene.add.image(
      this.gridToWorldX(state.princess.x),
      this.gridToWorldY(state.princess.y),
      "princess"
    );
    this.scaleSprite(this.princessSprite, this.tileSize - 10);
    this.root.add(this.princessSprite);

    for (const item of state.items) {
      const sprite = this.scene.add.image(
        this.gridToWorldX(item.x),
        this.gridToWorldY(item.y),
        item.type === "sword" ? "sword" : "potion"
      );
      this.scaleSprite(sprite, this.tileSize - 26);
      this.itemSprites.set(item.id, sprite);
      this.root.add(sprite);
    }

    this.heroSprite = this.scene.physics.add.sprite(
      this.gridToWorldX(state.hero.x),
      this.gridToWorldY(state.hero.y),
      "hero-walk",
      0
    );
    this.applyHeroDisplaySize();
    this.heroSprite.setCollideWorldBounds(true);
    this.heroSprite.setBounce(0);
    this.heroSprite.setGravityY(HERO_GRAVITY);
    this.heroSprite.setMaxVelocity(HERO_MOVE_SPEED, HERO_GRAVITY);
    this.heroSprite.setFlipX((state.hero.facingX || 1) < 0);
    this.root.add(this.heroSprite);
    this.scene.physics.add.collider(this.heroSprite, this.platforms);

    this.heroIdleSprite = this.scene.add.image(
      this.heroSprite.x,
      this.heroSprite.y,
      "hero-rest"
    );
    this.applyHeroIdleDisplaySize();
    this.heroIdleSprite.setFlipX((state.hero.facingX || 1) < 0);
    this.root.add(this.heroIdleSprite);

    this.syncSceneObjects(state, config);
    this.syncCamera();
  }

  syncSceneObjects(state, config) {
    if (!this.active) {
      return;
    }

    for (const [itemId, sprite] of this.itemSprites.entries()) {
      const item = state.items.find((entry) => entry.id === itemId);
      sprite.setVisible(Boolean(item));
      if (item) {
        sprite.setPosition(this.gridToWorldX(item.x), this.gridToWorldY(item.y));
      }
    }

    if (this.princessSprite && !state.princess.isFollowing) {
      this.princessSprite.setPosition(
        this.gridToWorldX(state.princess.x),
        this.gridToWorldY(state.princess.y)
      );
    }
  }

  syncCamera() {
    if (!this.active || !this.heroSprite) {
      return;
    }

    const camera = this.scene.cameras.main;
    camera.startFollow(this.heroSprite, true, 0.12, 0.12);
    camera.setDeadzone(120, 70);
    camera.setBounds(
      0,
      0,
      this.currentState.map.width * this.tileSize,
      this.currentState.map.height * this.tileSize
    );
  }

  syncStateFromHero() {
    if (!this.heroSprite || !this.currentState) {
      return;
    }

    this.currentState.hero.x = this.worldToGridX(this.heroSprite.x);
    this.currentState.hero.y = this.worldToGridY(this.heroSprite.y);
  }

  syncHeroVisuals() {
    if (!this.heroSprite || !this.heroIdleSprite) {
      return;
    }

    this.heroIdleSprite.setPosition(this.heroSprite.x, this.heroSprite.y);
    this.heroIdleSprite.setFlipX(this.heroSprite.flipX);
  }

  updateHeroAnimation(direction, body) {
    if (!this.heroSprite || !this.heroIdleSprite) {
      return;
    }

    const isGrounded = Boolean(body?.blocked?.down || body?.touching?.down);

    if (!isGrounded) {
      this.ensureHeroJumpTexture();
      this.heroSprite.setVisible(true);
      this.heroIdleSprite.setVisible(false);
      this.heroSprite.play("platformer-hero-jump", true);
      return;
    }

    if (direction !== 0) {
      this.ensureHeroWalkTexture();
      this.heroSprite.setVisible(true);
      this.heroIdleSprite.setVisible(false);
      this.heroSprite.play("platformer-hero-walk", true);
      return;
    }

    this.heroSprite.anims.stop();
    this.heroSprite.setVisible(false);
    this.heroIdleSprite.setVisible(true);
  }

  syncPrincessFollow() {
    if (
      !this.princessSprite ||
      !this.currentState?.princess?.isFollowing ||
      this.currentState.princess.rescued
    ) {
      return;
    }

    const targetX =
      this.heroSprite.x - (this.currentState.hero.facingX || this.moveDirection || 1) * 38;
    const targetY = this.heroSprite.y + 4;
    this.princessSprite.x = PhaserGlobal.Math.Linear(
      this.princessSprite.x,
      targetX,
      PRINCESS_FOLLOW_LERP
    );
    this.princessSprite.y = PhaserGlobal.Math.Linear(
      this.princessSprite.y,
      targetY,
      PRINCESS_FOLLOW_LERP
    );
    this.currentState.princess.x = this.worldToGridX(this.princessSprite.x);
    this.currentState.princess.y = this.worldToGridY(this.princessSprite.y);
  }

  checkItemOverlaps() {
    if (!this.currentState?.items?.length) {
      return;
    }

    for (const item of [...this.currentState.items]) {
      const sprite = this.itemSprites.get(item.id);
      if (!sprite || !sprite.visible) {
        continue;
      }

      if (
        PhaserGlobal.Math.Distance.Between(
          this.heroSprite.x,
          this.heroSprite.y,
          sprite.x,
          sprite.y
        ) > 34
      ) {
        continue;
      }

      this.currentGame.addItemToInventory(item);
      this.currentGame.removeItem(item.id);
      sprite.destroy();
      this.itemSprites.delete(item.id);
      this.currentGame.render();
      break;
    }
  }

  checkPrincessRecruit() {
    if (
      !this.princessSprite ||
      this.currentState.princess.isFollowing ||
      this.currentState.enemies.length > 0
    ) {
      return;
    }

    const distance = PhaserGlobal.Math.Distance.Between(
      this.heroSprite.x,
      this.heroSprite.y,
      this.princessSprite.x,
      this.princessSprite.y
    );

    if (distance > RECRUIT_DISTANCE) {
      return;
    }

    this.currentState.princess.isFollowing = true;
    this.currentGame.showMessage(this.currentGame.config.messages.princessFollow, {
      type: "info",
    });
    this.currentGame.emitEvent("princessRecruited", {
      x: this.currentState.princess.x,
      y: this.currentState.princess.y,
    });
    this.currentGame.render();
  }

  checkDoorExit() {
    if (
      !this.doorSprite ||
      !this.currentState.princess.isFollowing ||
      this.currentState.princess.rescued ||
      this.rescueTriggered
    ) {
      return;
    }

    const distance = PhaserGlobal.Math.Distance.Between(
      this.heroSprite.x,
      this.heroSprite.y,
      this.doorSprite.x,
      this.doorSprite.y
    );

    if (distance > DOOR_DISTANCE) {
      return;
    }

    this.rescueTriggered = true;
    this.currentState.princess.rescued = true;
    this.currentGame.emitEvent("princessRescued");
    this.currentGame.advanceFloor();
  }

  gridToWorldX(gridX) {
    return gridX * this.tileSize + this.tileSize / 2;
  }

  gridToWorldY(gridY) {
    return gridY * this.tileSize + this.tileSize / 2;
  }

  worldToGridX(worldX) {
    return (worldX - this.tileSize / 2) / this.tileSize;
  }

  worldToGridY(worldY) {
    return (worldY - this.tileSize / 2) / this.tileSize;
  }

  scaleSprite(sprite, maxSize) {
    const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
    sprite.setScale(scale);
  }

  applyHeroDisplaySize() {
    if (!this.heroSprite) {
      return;
    }

    const targetHeight =
      this.tileSize * HERO_DISPLAY_HEIGHT * HERO_ANIMATED_SCALE_MULTIPLIER;
    const sourceWidth = this.heroSprite.width || 1;
    const sourceHeight = this.heroSprite.height || 1;
    const targetWidth = targetHeight * (sourceWidth / sourceHeight);

    this.heroSprite.setDisplaySize(targetWidth, targetHeight);
    this.heroSprite.body.setSize(
      this.heroSprite.displayWidth * 0.45,
      this.heroSprite.displayHeight * 0.82,
      true
    );
  }

  applyHeroIdleDisplaySize() {
    if (!this.heroIdleSprite) {
      return;
    }

    const targetHeight = this.tileSize * HERO_DISPLAY_HEIGHT;
    const sourceWidth = this.heroIdleSprite.width || 1;
    const sourceHeight = this.heroIdleSprite.height || 1;
    const targetWidth = targetHeight * (sourceWidth / sourceHeight);

    this.heroIdleSprite.setDisplaySize(targetWidth, targetHeight);
  }

  ensureHeroWalkTexture() {
    if (!this.heroSprite || this.heroSprite.texture.key === "hero-walk") {
      return;
    }

    this.heroSprite.setTexture("hero-walk", 0);
    this.applyHeroDisplaySize();
  }

  ensureHeroJumpTexture() {
    if (!this.heroSprite || this.heroSprite.texture.key === "hero-jump") {
      return;
    }

    this.heroSprite.setTexture("hero-jump", 0);
    this.applyHeroDisplaySize();
  }

  hasSupportTile(state, x, y, expectedTile = null) {
    if (!state?.map?.tiles?.[y] || state.map.tiles[y][x] !== "wall") {
      return false;
    }

    if (!expectedTile) {
      return true;
    }

    const floatingGround2Cells = new Set(
      (state.map.metadata?.floatingGround2Cells || []).map(
        (cell) => `${cell.x}:${cell.y}`
      )
    );
    const supportTextureKey =
      y >= state.map.height - 2
        ? "ground-1"
        : floatingGround2Cells.has(`${x}:${y}`)
          ? "ground-2"
          : "sky-block";
    return supportTextureKey === expectedTile;
  }

  createDecorSprite(worldX, worldY, textureKey, options = {}) {
    const sprite = this.scene.add.image(
      worldX,
      worldY + (options.bottomOffset || 0),
      textureKey
    );
    const scale = Math.min(
      (options.maxHeight || this.tileSize) / sprite.height,
      (options.maxWidth || this.tileSize) / sprite.width
    );

    sprite.setOrigin(0.5, 1);
    sprite.setScale(scale);
    sprite.setDepth(options.depth || 12);
    return sprite;
  }
}

export class PhaserCombatEffects {
  constructor(scene, spriteRenderer) {
    this.scene = scene;
    this.spriteRenderer = spriteRenderer;
    this.layer = scene.add.container(0, 0);
  }

  handleEvent(event) {
    if (!event?.type) {
      return;
    }

    if (event.type === "heroAttacked") {
      this.playAttackBurst(event.payload.origin, 0xd7bd62);
      this.scene.cameras.main.shake(80, 0.0025);
      return;
    }

    if (event.type === "enemyDamaged") {
      const enemy = event.state?.enemies?.find(
        (item) => item.id === event.payload.enemyId
      );
      if (enemy) {
        this.playDamageBurst({ x: enemy.x, y: enemy.y }, `${event.payload.damage}`);
      }
      return;
    }

    if (event.type === "heroDamaged") {
      const hero = event.state?.hero;
      if (hero) {
        this.playDamageBurst({ x: hero.x, y: hero.y }, `-${event.payload.damage}`, {
          color: 0xff8b8b,
          shake: true,
        });
      }
      return;
    }

    if (
      event.type === "inventoryItemUsed" &&
      event.payload.itemType === "potion"
    ) {
      const hero = event.state?.hero;
      if (hero) {
        this.playHealPulse({ x: hero.x, y: hero.y });
      }
      return;
    }

    if (event.type === "itemPicked") {
      const hero = event.state?.hero;
      if (hero) {
        const label =
          event.payload.itemType === "potion" ? "+Potion" : "+Sword";
        this.playPickupText({ x: hero.x, y: hero.y }, label);
      }
    }
  }

  playAttackBurst(worldPosition, color) {
    const screen = this.spriteRenderer.getTileCenter(worldPosition.x, worldPosition.y);
    if (!screen) {
      return;
    }

    const burst = this.scene.add.circle(screen.x, screen.y, 8, color, 0.55);
    this.layer.add(burst);
    this.scene.tweens.add({
      targets: burst,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 180,
      onComplete: () => burst.destroy(),
    });
  }

  playDamageBurst(worldPosition, label, options = {}) {
    const screen = this.spriteRenderer.getTileCenter(worldPosition.x, worldPosition.y);
    if (!screen) {
      return;
    }

    const color = options.color || 0xff6b6b;
    const flash = this.scene.add.rectangle(screen.x, screen.y, 26, 26, color, 0.45);
    const text = this.scene.add.text(screen.x, screen.y - 10, label, {
      color: "#ffd4d4",
      fontFamily: "monospace",
      fontSize: "16px",
      stroke: "#1b0d0d",
      strokeThickness: 3,
    });

    text.setOrigin(0.5);
    this.layer.add([flash, text]);

    if (options.shake) {
      this.scene.cameras.main.shake(110, 0.003);
    }

    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 220,
      onComplete: () => flash.destroy(),
    });

    this.scene.tweens.add({
      targets: text,
      y: text.y - 26,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  playHealPulse(worldPosition) {
    const screen = this.spriteRenderer.getTileCenter(worldPosition.x, worldPosition.y);
    if (!screen) {
      return;
    }

    const ring = this.scene.add.circle(screen.x, screen.y, 10, 0x72f0a0, 0.25);
    const text = this.scene.add.text(screen.x, screen.y - 10, "+HP", {
      color: "#b9ffd1",
      fontFamily: "monospace",
      fontSize: "16px",
      stroke: "#10311c",
      strokeThickness: 3,
    });

    text.setOrigin(0.5);
    this.layer.add([ring, text]);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  playPickupText(worldPosition, label) {
    const screen = this.spriteRenderer.getTileCenter(worldPosition.x, worldPosition.y);
    if (!screen) {
      return;
    }

    const text = this.scene.add.text(screen.x, screen.y - 8, label, {
      color: "#fff2b5",
      fontFamily: "monospace",
      fontSize: "15px",
      stroke: "#2b2410",
      strokeThickness: 3,
    });

    text.setOrigin(0.5);
    this.layer.add(text);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: 420,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}

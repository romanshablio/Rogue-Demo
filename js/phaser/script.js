import { PhaserGameScene } from "./runtime/PhaserGameScene.js";

const PhaserGlobal = globalThis.Phaser;

if (!PhaserGlobal) {
  throw new Error("Phaser global is not available.");
}

const phaserGame = new PhaserGlobal.Game({
  // Canvas is enough for the current prototype and avoids noisy WebGL resize warnings.
  type: PhaserGlobal.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "phaser-root",
  backgroundColor: "#0b1017",
  scale: {
    mode: PhaserGlobal.Scale.RESIZE,
    autoCenter: PhaserGlobal.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [PhaserGameScene],
});

window.addEventListener("beforeunload", () => {
  phaserGame.destroy(true);
});

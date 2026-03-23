function performTurnAction(game, action) {
  const wasHandled = action();

  if (wasHandled) {
    game.advanceTurn();
  }
}

export function attachMobileControls(game, { document }) {
  const buttonMap = [
    [".d-pad-up", () => game.moveHero(0, -1)],
    [".d-pad-right", () => game.moveHero(1, 0)],
    [".d-pad-down", () => game.moveHero(0, 1)],
    [".d-pad-left", () => game.moveHero(-1, 0)],
    [".attack-button", () => game.heroAttack()],
  ];

  for (const [selector, action] of buttonMap) {
    const element = document.querySelector(selector);

    if (!element) {
      continue;
    }

    element.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        performTurnAction(game, action);
      },
      { passive: false }
    );
  }

  const controls = document.querySelector(".mobile-controls");
  if (controls) {
    controls.addEventListener(
      "touchmove",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );
  }
}

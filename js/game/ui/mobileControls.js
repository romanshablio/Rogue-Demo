import { performPlayerAction, PLAYER_ACTIONS } from "../input/playerActions.js";

export function attachMobileControls(game, { document }) {
  const buttonMap = [
    [".d-pad-up", PLAYER_ACTIONS.MOVE_UP],
    [".d-pad-right", PLAYER_ACTIONS.MOVE_RIGHT],
    [".d-pad-down", PLAYER_ACTIONS.MOVE_DOWN],
    [".d-pad-left", PLAYER_ACTIONS.MOVE_LEFT],
    [".attack-button", PLAYER_ACTIONS.ATTACK],
  ];

  for (const [selector, actionId] of buttonMap) {
    const element = document.querySelector(selector);

    if (!element) {
      continue;
    }

    element.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        performPlayerAction(game, actionId);
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

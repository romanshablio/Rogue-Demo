import {
  getKeyboardPlayerAction,
  performPlayerAction,
  PLAYER_ACTIONS,
} from "./playerActions.js";

export function attachKeyboardControls(game, { document }) {
  document.addEventListener("keydown", (event) => {
    const actionId = getKeyboardPlayerAction(event);

    if (!actionId) {
      return;
    }

    if (
      actionId === PLAYER_ACTIONS.TOGGLE_MENU ||
      actionId === PLAYER_ACTIONS.ATTACK ||
      actionId === PLAYER_ACTIONS.USE_POTION ||
      actionId === PLAYER_ACTIONS.USE_SWORD ||
      actionId === PLAYER_ACTIONS.MOVE_LEFT ||
      actionId === PLAYER_ACTIONS.MOVE_RIGHT ||
      actionId === PLAYER_ACTIONS.MOVE_UP ||
      actionId === PLAYER_ACTIONS.MOVE_DOWN
    ) {
      event.preventDefault();
    }

    performPlayerAction(game, actionId);
  });
}

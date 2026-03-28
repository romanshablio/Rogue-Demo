import { ITEM_TYPES } from "../core/constants.js";

export const PLAYER_ACTIONS = Object.freeze({
  TOGGLE_MENU: "toggle-menu",
  MOVE_LEFT: "move-left",
  MOVE_RIGHT: "move-right",
  MOVE_UP: "move-up",
  MOVE_DOWN: "move-down",
  JUMP: "jump",
  ATTACK: "attack",
  USE_POTION: "use-potion",
  USE_SWORD: "use-sword",
});

export function getKeyboardPlayerAction(event) {
  switch (event.code) {
    case "Escape":
      return PLAYER_ACTIONS.TOGGLE_MENU;
    case "KeyA":
      return PLAYER_ACTIONS.MOVE_LEFT;
    case "KeyD":
      return PLAYER_ACTIONS.MOVE_RIGHT;
    case "KeyW":
      return PLAYER_ACTIONS.MOVE_UP;
    case "KeyS":
      return PLAYER_ACTIONS.MOVE_DOWN;
    case "ShiftLeft":
    case "ShiftRight":
      return PLAYER_ACTIONS.JUMP;
    case "Space":
      return PLAYER_ACTIONS.ATTACK;
    case "Digit1":
      return PLAYER_ACTIONS.USE_POTION;
    case "Digit2":
      return PLAYER_ACTIONS.USE_SWORD;
    default:
      return null;
  }
}

export function performPlayerAction(game, actionId) {
  if (!actionId) {
    return false;
  }

  let handled = false;

  if (actionId === PLAYER_ACTIONS.TOGGLE_MENU) {
    game.toggleRestartMenu();
    return false;
  }

  if (actionId === PLAYER_ACTIONS.MOVE_LEFT) {
    handled = game.moveHero(-1, 0);
  } else if (actionId === PLAYER_ACTIONS.MOVE_RIGHT) {
    handled = game.moveHero(1, 0);
  } else if (actionId === PLAYER_ACTIONS.MOVE_UP) {
    handled = game.moveHero(0, -1);
  } else if (actionId === PLAYER_ACTIONS.MOVE_DOWN) {
    handled = game.moveHero(0, 1);
  } else if (actionId === PLAYER_ACTIONS.JUMP) {
    handled = game.jumpHero();
  } else if (actionId === PLAYER_ACTIONS.ATTACK) {
    handled = game.heroAttack();
  } else if (actionId === PLAYER_ACTIONS.USE_POTION) {
    handled = game.useInventoryItem(ITEM_TYPES.POTION);
  } else if (actionId === PLAYER_ACTIONS.USE_SWORD) {
    handled = game.useInventoryItem(ITEM_TYPES.SWORD);
  }

  if (handled) {
    game.advanceTurn();
  }

  return handled;
}

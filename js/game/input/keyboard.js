import { ITEM_TYPES } from "../core/constants.js";

export function attachKeyboardControls(game, { document }) {
  document.addEventListener("keydown", (event) => {
    let handled = false;

    switch (event.keyCode) {
      case 27:
        event.preventDefault();
        game.toggleRestartMenu();
        return;
      case 65:
        event.preventDefault();
        handled = game.moveHero(-1, 0);
        break;
      case 68:
        event.preventDefault();
        handled = game.moveHero(1, 0);
        break;
      case 87:
        event.preventDefault();
        handled = game.moveHero(0, -1);
        break;
      case 83:
        event.preventDefault();
        handled = game.moveHero(0, 1);
        break;
      case 32:
        event.preventDefault();
        handled = game.heroAttack();
        break;
      case 49:
        event.preventDefault();
        handled = game.useInventoryItem(ITEM_TYPES.POTION);
        break;
      case 50:
        event.preventDefault();
        handled = game.useInventoryItem(ITEM_TYPES.SWORD);
        break;
      default:
        break;
    }

    if (handled) {
      game.advanceTurn();
    }
  });
}

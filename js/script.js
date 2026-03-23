import { createGame } from "./game/bootstrap.js";
import { attachKeyboardControls } from "./game/input/keyboard.js";
import { attachMobileControls } from "./game/ui/mobileControls.js";
import { attachUiBindings } from "./game/ui/bindings.js";

const game = createGame({
  document,
  window,
  jquery: window.jQuery || window.$ || null,
});

attachKeyboardControls(game, { document });
attachMobileControls(game, { document });
attachUiBindings(game, { document });

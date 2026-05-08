# Rogue Demo

![Game title image](/img/title.png)

Rogue Demo is a browser-based 2D roguelike game written in JavaScript without a bundler.

The project uses native ES modules and is split into gameplay subsystems: core, level generation, enemies, rendering, UI, audio, animation, and utility managers.

## Features

- Main menu with new game start and difficulty selection.
- Three difficulty levels: `easy`, `normal`, and `hard`.
- Procedural dungeon generation.
- Multi-floor runs.
- Turn-based combat and fog of war.
- Inventory instead of automatic item pickup.
- HUD with health, attack power, floor, enemy count, and minimap.
- Pause and in-game menu.
- Separate music and sound effect settings.
- Audio settings saved in `localStorage`.
- Several enemy types with different behavior patterns.
- Simple animations for attack, damage, and healing.

## Gameplay Loop

The player explores a randomly generated floor, collects items, fights enemies, finds the princess, and escorts her to the door. After a successful rescue, the next floor starts. The run ends after all floors are completed.

## Enemy Types

The current generator uses three active enemy types:

- `fast` - fast enemy with aggressive movement.
- `heavy` - slow but more durable and stronger enemy.
- `ranged` - can attack from a distance in a straight line.

Connected sprites:

- `enemy.png`
- `crabster_enemy.png`
- `crazy_man_enemy.png`

## Items and Stats

- Swords go into the inventory and are used manually.
- A used sword increases hero attack power by `+10`.
- Potions go into the inventory and restore `20 HP`.
- The HUD shows current and maximum health, attack power, floor number, and live enemy count.

## Controls

- `W`, `A`, `S`, `D` - movement.
- `Space` - attack.
- `1` - use potion.
- `2` - use sword.
- `Esc` - pause or run menu.

On mobile devices, on-screen movement and attack buttons are available.

## Audio

The project has separate controls for:

- Main menu music.
- Level music.
- Sound effects.

They can be enabled or disabled from the main menu settings or during the game. Settings are saved in `localStorage`.

## Architecture

The project is centered around `GameCore`, which manages state, the game lifecycle, and the public API.

Main modules:

- `js/game/core/` - game core, state, config, constants.
- `js/game/level/` - floor generation and level registry.
- `js/game/entities/` - enemy types and enemy registry.
- `js/game/systems/` - rules, combat, princess logic, and turns.
- `js/game/render/` - DOM rendering, visibility, viewport.
- `js/game/ui/` - HUD, main menu, pause, settings, mobile controls.
- `js/game/audio/` - music and sound effects.
- `js/game/animation/` - animation manager.
- `js/game/save/` - service data saving.

Entry point:

- `js/script.js`

Game bootstrap:

- `js/game/bootstrap.js`

## Project Structure

```text
Rogue-Demo/
|-- index.html
|-- README.md
|-- css/
|   +-- style.css
|-- img/
|-- js/
|   |-- jquery.min.js
|   |-- mobile-controls.js
|   |-- script.js
|   +-- game/
+-- sounds/
```

## Running

No bundler is required.

1. Open the repository locally.
2. Make sure the `js`, `css`, `img`, and `sounds` folders are next to `index.html`.
3. Open `index.html` in a modern browser.

## Current State

The project already has a base for future expansion:

- New enemy types through the enemy definition registry.
- New floors through the level registry.
- HUD expansion.
- Animation system improvements.
- Full progress saving on top of the existing save manager.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

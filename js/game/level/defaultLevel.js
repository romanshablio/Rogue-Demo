import {
  FAST_ENEMY_TYPE,
  HEAVY_ENEMY_TYPE,
  ITEM_TYPES,
  RANGED_ENEMY_TYPE,
  TILE_TYPES,
} from "../core/constants.js";
import { getDistance } from "../utils/geometry.js";
import { getRandomInt, pickRandomIndex } from "../utils/random.js";

function createWallMap(width, height) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE_TYPES.WALL)
  );
}

function carveRoom(tiles, x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (tiles[row] && tiles[row][col] !== undefined) {
        tiles[row][col] = TILE_TYPES.FLOOR;
      }
    }
  }
}

function carveCorridor(tiles, x1, y1, x2, y2) {
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let y = minY; y <= maxY; y += 1) {
      if (tiles[y] && tiles[y][x1] !== undefined) {
        tiles[y][x1] = TILE_TYPES.FLOOR;
      }
    }
  } else if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);

    for (let x = minX; x <= maxX; x += 1) {
      if (tiles[y1] && tiles[y1][x] !== undefined) {
        tiles[y1][x] = TILE_TYPES.FLOOR;
      }
    }
  }
}

function isFloorTile(tiles, x, y) {
  return Boolean(tiles[y] && tiles[y][x] === TILE_TYPES.FLOOR);
}

function getFloorCells(tiles) {
  const floorCells = [];

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < tiles[y].length; x += 1) {
      if (tiles[y][x] === TILE_TYPES.FLOOR) {
        floorCells.push({ x, y });
      }
    }
  }

  return floorCells;
}

function isCellOccupied(x, y, occupiedCells) {
  return occupiedCells.has(`${x}:${y}`);
}

function markOccupied(x, y, occupiedCells) {
  occupiedCells.add(`${x}:${y}`);
}

function placeItems(tiles, config, occupiedCells) {
  const items = [];
  const floorCells = getFloorCells(tiles);

  function placeItem(type, count) {
    for (let index = 0; index < count; index += 1) {
      if (!floorCells.length) {
        return;
      }

      const randomIndex = pickRandomIndex(floorCells);
      const cell = floorCells.splice(randomIndex, 1)[0];

      if (isCellOccupied(cell.x, cell.y, occupiedCells)) {
        index -= 1;
        continue;
      }

      items.push({
        id: `${type}-${items.length + 1}`,
        type,
        x: cell.x,
        y: cell.y,
      });
      markOccupied(cell.x, cell.y, occupiedCells);
    }
  }

  placeItem(ITEM_TYPES.SWORD, config.swordCount);
  placeItem(ITEM_TYPES.POTION, config.potionCount);

  return items;
}

function placeHero(tiles, occupiedCells, config) {
  const floorCells = getFloorCells(tiles).filter(
    (cell) => !isCellOccupied(cell.x, cell.y, occupiedCells)
  );
  const randomIndex = pickRandomIndex(floorCells);
  const spawn = floorCells[randomIndex];

  markOccupied(spawn.x, spawn.y, occupiedCells);

  return {
    x: spawn.x,
    y: spawn.y,
    hp: config.hero.maxHp,
    maxHp: config.hero.maxHp,
    attack: config.hero.attack,
  };
}

function placeDoor(tiles, heroSpawn, occupiedCells) {
  const candidates = [
    { x: heroSpawn.x + 1, y: heroSpawn.y },
    { x: heroSpawn.x - 1, y: heroSpawn.y },
    { x: heroSpawn.x, y: heroSpawn.y + 1 },
    { x: heroSpawn.x, y: heroSpawn.y - 1 },
  ];

  for (const candidate of candidates) {
    if (
      isFloorTile(tiles, candidate.x, candidate.y) &&
      !isCellOccupied(candidate.x, candidate.y, occupiedCells)
    ) {
      markOccupied(candidate.x, candidate.y, occupiedCells);
      return candidate;
    }
  }

  const floorCells = getFloorCells(tiles);

  for (const cell of floorCells) {
    if (!isCellOccupied(cell.x, cell.y, occupiedCells)) {
      markOccupied(cell.x, cell.y, occupiedCells);
      return cell;
    }
  }

  return { x: heroSpawn.x, y: heroSpawn.y };
}

function placePrincess(tiles, heroSpawn, occupiedCells) {
  const floorCells = getFloorCells(tiles);
  let bestCell = null;
  let maxDistance = -1;

  for (const cell of floorCells) {
    if (isCellOccupied(cell.x, cell.y, occupiedCells)) {
      continue;
    }

    const distance = getDistance(heroSpawn.x, heroSpawn.y, cell.x, cell.y);
    if (distance > maxDistance) {
      maxDistance = distance;
      bestCell = cell;
    }
  }

  if (!bestCell) {
    bestCell = heroSpawn;
  }

  markOccupied(bestCell.x, bestCell.y, occupiedCells);

  return {
    x: bestCell.x,
    y: bestCell.y,
    isFollowing: false,
    rescued: false,
  };
}

function createEnemy(typeId, definition, x, y, index, config) {
  const hpDelta = config.enemy.maxHp - 50;
  const attackDelta = config.enemy.attack - 5;
  const stats = {
    maxHp: Math.max(10, definition.stats.maxHp + hpDelta),
    attack: Math.max(1, definition.stats.attack + attackDelta),
  };

  return {
    id: `enemy-${index + 1}`,
    typeId,
    spriteClass: definition.spriteClass,
    x,
    y,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    attack: stats.attack,
  };
}

function getEnemyTypePool(floorNumber) {
  if (floorNumber <= 1) {
    return [
      FAST_ENEMY_TYPE,
      FAST_ENEMY_TYPE,
      FAST_ENEMY_TYPE,
      HEAVY_ENEMY_TYPE,
    ];
  }

  if (floorNumber === 2) {
    return [
      FAST_ENEMY_TYPE,
      FAST_ENEMY_TYPE,
      FAST_ENEMY_TYPE,
      HEAVY_ENEMY_TYPE,
      HEAVY_ENEMY_TYPE,
      RANGED_ENEMY_TYPE,
    ];
  }

  return [
    FAST_ENEMY_TYPE,
    FAST_ENEMY_TYPE,
    HEAVY_ENEMY_TYPE,
    HEAVY_ENEMY_TYPE,
    RANGED_ENEMY_TYPE,
    RANGED_ENEMY_TYPE,
  ];
}

function placeEnemies(tiles, config, occupiedCells, enemyTypes, floorNumber) {
  const enemies = [];
  const floorCells = getFloorCells(tiles);
  const enemyTypePool = getEnemyTypePool(floorNumber);
  const enemyCount = config.enemyCount + Math.max(0, floorNumber - 1) * 2;

  for (let index = 0; index < enemyCount; index += 1) {
    if (!floorCells.length) {
      break;
    }

    const randomIndex = pickRandomIndex(floorCells);
    const cell = floorCells.splice(randomIndex, 1)[0];

    if (isCellOccupied(cell.x, cell.y, occupiedCells)) {
      index -= 1;
      continue;
    }

    const typeId = enemyTypePool[getRandomInt(0, enemyTypePool.length - 1)];
    const definition = enemyTypes.get(typeId);
    enemies.push(
      createEnemy(typeId, definition, cell.x, cell.y, index, config)
    );
    markOccupied(cell.x, cell.y, occupiedCells);
  }

  return enemies;
}

export function createDefaultLevel({ config, enemyTypes, floorNumber = 1 }) {
  const tiles = createWallMap(config.mapWidth, config.mapHeight);
  const rooms = [];
  const roomCount = getRandomInt(
    config.roomCountMin,
    config.roomCountMax + Math.max(0, floorNumber - 1)
  );

  for (let index = 0; index < roomCount; index += 1) {
    const roomWidth = getRandomInt(config.roomSizeMin, config.roomSizeMax);
    const roomHeight = getRandomInt(config.roomSizeMin, config.roomSizeMax);
    const roomX = getRandomInt(1, config.mapWidth - roomWidth - 1);
    const roomY = getRandomInt(1, config.mapHeight - roomHeight - 1);

    carveRoom(tiles, roomX, roomY, roomWidth, roomHeight);
    rooms.push({
      x: Math.floor(roomX + roomWidth / 2),
      y: Math.floor(roomY + roomHeight / 2),
    });
  }

  for (let index = 0; index < rooms.length - 1; index += 1) {
    const currentRoom = rooms[index];
    const nextRoom = rooms[index + 1];

    carveCorridor(tiles, currentRoom.x, currentRoom.y, nextRoom.x, currentRoom.y);
    carveCorridor(tiles, nextRoom.x, currentRoom.y, nextRoom.x, nextRoom.y);
  }

  const additionalCorridors = getRandomInt(
    config.additionalCorridorsMin,
    config.additionalCorridorsMax
  );

  for (let index = 0; index < additionalCorridors; index += 1) {
    const firstRoom = rooms[getRandomInt(0, rooms.length - 1)];
    const secondRoom = rooms[getRandomInt(0, rooms.length - 1)];

    if (Math.random() < 0.5) {
      carveCorridor(tiles, firstRoom.x, firstRoom.y, secondRoom.x, firstRoom.y);
      carveCorridor(tiles, secondRoom.x, firstRoom.y, secondRoom.x, secondRoom.y);
    } else {
      carveCorridor(tiles, firstRoom.x, firstRoom.y, firstRoom.x, secondRoom.y);
      carveCorridor(tiles, firstRoom.x, secondRoom.y, secondRoom.x, secondRoom.y);
    }
  }

  const occupiedCells = new Set();
  const items = placeItems(tiles, config, occupiedCells);
  const heroSpawn = placeHero(tiles, occupiedCells, config);
  const doorSpawn = placeDoor(tiles, heroSpawn, occupiedCells);
  const princess = placePrincess(tiles, heroSpawn, occupiedCells);
  const enemies = placeEnemies(
    tiles,
    config,
    occupiedCells,
    enemyTypes,
    floorNumber
  );

  return {
    map: tiles,
    heroSpawn,
    doorSpawn,
    entities: {
      princess,
      enemies,
    },
    items,
    metadata: {
      floorNumber,
      roomCount,
    },
  };
}

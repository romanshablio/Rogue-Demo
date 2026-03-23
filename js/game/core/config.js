export const DEFAULT_DIFFICULTY_ID = "normal";

export const DEFAULT_CONFIG = Object.freeze({
  difficultyId: DEFAULT_DIFFICULTY_ID,
  mapWidth: 40,
  mapHeight: 24,
  floorCount: 3,
  tileSize: 64,
  fogEnabledByDefault: true,
  visionRadius: 8,
  partialVisionRadius: 12,
  roomCountMin: 5,
  roomCountMax: 10,
  roomSizeMin: 3,
  roomSizeMax: 8,
  additionalCorridorsMin: 2,
  additionalCorridorsMax: 4,
  swordCount: 2,
  potionCount: 10,
  enemyCount: 10,
  hero: {
    maxHp: 100,
    attack: 10,
  },
  princess: {
    following: false,
    rescued: false,
  },
  enemy: {
    maxHp: 50,
    attack: 5,
  },
  messages: {
    intro:
      "Игра началась! Чтобы пройти уровень, победите всех врагов и отведите принцессу к двери! Удачи!",
    swordPickup: "Вы подобрали меч. Используйте его из инвентаря.",
    potionPickup: "Вы подобрали зелье. Оно добавлено в инвентарь.",
    swordUse: "Вы использовали меч. Сила атаки увеличена на 10.",
    potionUse: "Вы использовали зелье и восстановили 20 HP.",
    potionFullHp: "Здоровье уже полное.",
    noItemInInventory: "В инвентаре нет этого предмета.",
    princessFollow: "Принцесса следует за вами! Отведите ее к двери.",
    nextFloor: "Вы спустились на следующий этаж.",
    victory: "Поздравляем! Вы спасли принцессу и прошли уровень!",
    death: "Вы погибли! Игра завершена.",
  },
});

export const DIFFICULTY_PRESETS = Object.freeze({
  easy: Object.freeze({
    id: "easy",
    label: "Легко",
    summary: "Больше здоровья и ресурсов, слабее враги.",
    fogEnabledByDefault: false,
    hero: {
      maxHp: 120,
      attack: 14,
    },
    enemy: {
      maxHp: 35,
      attack: 4,
    },
    enemyCount: 8,
    potionCount: 12,
    swordCount: 3,
  }),
  normal: Object.freeze({
    id: "normal",
    label: "Нормально",
    summary: "Базовый режим без бонусов и штрафов.",
    fogEnabledByDefault: true,
    hero: {
      maxHp: 100,
      attack: 10,
    },
    enemy: {
      maxHp: 50,
      attack: 5,
    },
    enemyCount: 10,
    potionCount: 10,
    swordCount: 2,
  }),
  hard: Object.freeze({
    id: "hard",
    label: "Сложно",
    summary: "Меньше ресурсов, сильнее и многочисленнее враги.",
    fogEnabledByDefault: true,
    hero: {
      maxHp: 90,
      attack: 10,
    },
    enemy: {
      maxHp: 70,
      attack: 8,
    },
    enemyCount: 14,
    potionCount: 7,
    swordCount: 1,
  }),
});

function deepCloneConfig(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createConfig(difficultyId = DEFAULT_DIFFICULTY_ID) {
  const baseConfig = deepCloneConfig(DEFAULT_CONFIG);
  const preset = DIFFICULTY_PRESETS[difficultyId] || DIFFICULTY_PRESETS[DEFAULT_DIFFICULTY_ID];

  baseConfig.difficultyId = preset.id;
  baseConfig.hero = {
    ...baseConfig.hero,
    ...preset.hero,
  };
  baseConfig.enemy = {
    ...baseConfig.enemy,
    ...preset.enemy,
  };
  baseConfig.fogEnabledByDefault = preset.fogEnabledByDefault;
  baseConfig.enemyCount = preset.enemyCount;
  baseConfig.potionCount = preset.potionCount;
  baseConfig.swordCount = preset.swordCount;

  return baseConfig;
}

export function getDifficultyOptions() {
  return Object.values(DIFFICULTY_PRESETS).map((preset) => ({
    id: preset.id,
    label: preset.label,
    summary: preset.summary,
  }));
}

# Phaser Migration Roadmap

## Статус решения

Решение принято: дальнейшее развитие проекта идет через **Phaser 3**.

Это означает:

- текущая браузерная версия остается источником рабочей логики и reference implementation
- новый runtime строится под Phaser
- перенос делается поэтапно, без попытки сразу переписать всю игру

## Текущий статус миграции

На текущем этапе Phaser runtime уже стал **основным entrypoint проекта**:

- основной запуск: `index.html`
- legacy DOM runtime сохранен как `legacy-dom.html`

Это означает, что фаза "технического спайка" завершена и проект перешел в фазу финализации и дальнейшего развития уже поверх Phaser runtime.

## Почему Phaser подходит именно здесь

Для этого проекта Phaser дает самые практичные преимущества:

- проект остается web-first
- текущий JS-код и модель мышления переиспользуются лучше, чем при переходе в другой стек
- быстрее собрать первый playable vertical slice
- проще постепенно переносить существующие системы, а не выбрасывать их

При этом ограничения нужно принять сразу:

- кат-сцены, authored sequences и narrative tooling придется проектировать дисциплинированно
- нельзя повторить текущую ошибку и смешать gameplay core, runtime и UI в один слой

## Целевой принцип архитектуры

Новый Phaser-слой должен быть только адаптером над gameplay core.

Целевая схема:

- `gameplay core`
  - состояние игры
  - пошаговые команды
  - разрешение хода
  - боевые правила
  - генерация и загрузка уровня
  - сюжетные флаги
  - игровой event stream
- `phaser runtime`
  - сцены
  - камера
  - tilemap / sprites
  - анимации
  - звук
  - UI и HUD
  - input mapping
- `content layer`
  - данные уровней
  - enemy definitions
  - scripted events
  - cutscene data

Критичное правило:

- `gameplay core` не должен знать про Phaser classes, Scene API, sprites, tweens, cameras и DOM

## Что переносить в Phaser, а что оставить независимым

### Оставить engine-agnostic

- `state`
- `config`
- `constants`
- `enemy type registry`
- `level registry`
- `core rules`
- turn resolution
- inventory logic
- combat logic
- progression logic

### Перенести в Phaser runtime

- тайловый рендер
- камера и viewport
- HUD
- меню
- анимации
- звук
- input handling
- mobile controls
- cutscene playback

## Первый технический этап

До подключения Phaser стоит подготовить код к переносу.

### Задача 1. Отделить browser-specific зависимости от `GameCore`

Сейчас [`GameCore`](../js/game/core/GameCore.js) напрямую знает про:

- `window`
- `document`
- `renderer`
- `hud`
- `audio`

Нужно свести это к интерфейсам и сервисам.

Минимальная цель:

- `GameCore` работает как pure gameplay orchestrator
- внешняя среда подписывается на события и отображает состояние

### Задача 2. Ввести gameplay events

Нужен явный поток событий, например:

- `runStarted`
- `floorLoaded`
- `heroMoved`
- `heroAttacked`
- `enemyDamaged`
- `enemyDied`
- `itemPicked`
- `inventoryUsed`
- `princessRecruited`
- `floorCompleted`
- `runWon`
- `runLost`
- `menuOpened`

Phaser runtime должен реагировать именно на эти события, а не вытаскивать побочные эффекты из ядра.

### Задача 3. Выделить runtime adapters

Нужны отдельные адаптеры:

- browser DOM renderer
- browser HUD adapter
- browser audio adapter
- позже `phaser renderer`, `phaser hud`, `phaser audio`

### Задача 4. Зафиксировать контракты данных

Нужно описать явные схемы:

- `RunState`
- `FloorState`
- `HeroState`
- `EnemyState`
- `ItemState`
- `StoryFlags`
- `CutsceneStep`

Это сильно снизит хаос при переносе.

## Phaser vertical slice

Первый slice должен быть маленьким и законченным.

Минимальный scope:

- один игровой уровень
- один герой
- один melee enemy
- один предмет
- пошаговое движение
- атака
- HUD с HP и floor
- короткая scripted sequence через Phaser timeline

Это уже даст ответ на главный вопрос: удобен ли runtime для вашей игры в ежедневной работе.

## Предлагаемая структура нового Phaser-кода

```text
src/
├── app/
│   ├── gameConfig.ts
│   └── bootstrap.ts
├── gameplay/
│   ├── core/
│   ├── state/
│   ├── systems/
│   ├── entities/
│   ├── level/
│   └── events/
├── phaser/
│   ├── scenes/
│   ├── render/
│   ├── ui/
│   ├── input/
│   ├── audio/
│   └── cutscenes/
├── content/
│   ├── levels/
│   ├── enemies/
│   └── scripted/
└── shared/
    ├── constants/
    └── utils/
```

Это не обязательная финальная структура, но она задает правильное разделение ответственности.

## Порядок миграции

1. Подготовить текущий код к engine-agnostic gameplay core.
2. Поднять Phaser-проект и базовый bootstrap.
3. Перенести состояние и turn loop без визуального слоя.
4. Подключить tile render, camera и input.
5. Подключить бой, врагов и предметы.
6. Подключить HUD и меню.
7. Подключить scripted sequence и cutscene layer.
8. Перенести генерацию уровней и progression.
9. Только после этого переносить остальной контент.

## Что имеет смысл сделать следующим коммитом

Самый рациональный следующий шаг:

1. Начать рефакторинг [`GameCore`](../js/game/core/GameCore.js) в сторону gameplay-only orchestration.
2. Выделить события gameplay.
3. Подготовить адаптерный слой для текущего DOM runtime.
4. После этого поднимать Phaser bootstrap уже на чистом ядре.

## Граница успеха для первой фазы

Первая фаза считается успешной, если:

- текущая браузерная версия все еще работает
- gameplay core можно запускать без прямой DOM-зависимости
- Phaser может подписаться на те же игровые события и отрисовать один уровень

Если этого нет, значит перенос еще не начался по-настоящему, а код просто переезжает из одного runtime в другой без архитектурной пользы.

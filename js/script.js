(function() {

    // Размер поля по ТЗ
    var MAP_WIDTH = 40;
    var MAP_HEIGHT = 24;
  
    // Различные коды для карты
    var WALL    = 1;
    var FLOOR   = 0;
    var SWORD   = 2;
    var POTION  = 3;
    var DOOR    = 4;  // Добавляем код для двери
  
    // Флаг окончания игры
    var gameOver = false;
  
    // Параметры героя
    var hero = {
      x: 0,
      y: 0,
      hp: 100,    // Текущее здоровье
      maxHp: 100, // Максимальное здоровье
      attack: 10  // Сила удара
    };
  
    // Объект принцессы
    var princess = {
      x: 0,
      y: 0,
      isFollowing: false, // Следует ли за героем
      rescued: false      // Спасена ли принцесса
    };
  
    // Массив врагов (каждый враг: x, y, hp, attack и т.д.)
    var enemies = [];
  
    // Игровая карта (двумерный массив)
    var map = [];
  
    // Размер «клетки» в пикселях для отрисовки
    var TILE_SIZE = 64; // Увеличиваем размер тайла до 64x64 пикселей
  
    // Размер видимой области вокруг героя (в тайлах)
    var VIEWPORT_WIDTH = Math.floor(window.innerWidth / TILE_SIZE) - 2;
    var VIEWPORT_HEIGHT = Math.floor(window.innerHeight / TILE_SIZE) - 2;
  
    // Ссылка на контейнер для отрисовки
    var $field = $('.field');
    var $fogToggle = $('.fog-toggle');
  
    // Флаг для тумана войны
    var fogOfWarEnabled = true;
  
    // Переменные для мобильного управления
    var joystickActive = false;
    var joystickStartX = 0;
    var joystickStartY = 0;
    var joystickCurrentX = 0;
    var joystickCurrentY = 0;
    var joystickRadius = 50;
    var joystick = $('.joystick');
    var joystickContainer = $('.joystick-container');
    var attackButton = $('.attack-button');
  
    // Обработчик клика по кнопке тумана войны
    $fogToggle.on('click', function() {
        fogOfWarEnabled = !fogOfWarEnabled;
        $(this).toggleClass('active');
        $(this).text('Туман войны: ' + (fogOfWarEnabled ? 'Вкл' : 'Выкл'));
        drawField(); // Перерисовываем поле
    });
  
    // ----------------------------------------------------------------------------
    // 1. ИНИЦИАЛИЗАЦИЯ КАРТЫ
    // ----------------------------------------------------------------------------
  
    // Создаём массив 40 x 24, заполненный стенами (WALL)
    function initMap() {
      map = [];
      for (var y = 0; y < MAP_HEIGHT; y++) {
        var row = [];
        for (var x = 0; x < MAP_WIDTH; x++) {
          row.push(WALL);
        }
        map.push(row);
      }
    }
  
    // Генерация прямоугольной комнаты
    // Заполняет внутри комнаты значениями FLOOR
    function carveRoom(x, y, w, h) {
      for (var row = y; row < y + h; row++) {
        for (var col = x; col < x + w; col++) {
          if (row >= 0 && row < MAP_HEIGHT && col >= 0 && col < MAP_WIDTH) {
            map[row][col] = FLOOR;
          }
        }
      }
    }
  
    // Генерация коридора (горизонтального или вертикального)
    // Просто заполняем ячейки FLOOR вдоль линии
    function carveCorridor(x1, y1, x2, y2) {
      if (x1 === x2) {
        // Вертикальный
        var minY = Math.min(y1, y2);
        var maxY = Math.max(y1, y2);
        for (var y = minY; y <= maxY; y++) {
          if (y >= 0 && y < MAP_HEIGHT && x1 >= 0 && x1 < MAP_WIDTH) {
            map[y][x1] = FLOOR;
          }
        }
      } else if (y1 === y2) {
        // Горизонтальный
        var minX = Math.min(x1, x2);
        var maxX = Math.max(x1, x2);
        for (var x = minX; x <= maxX; x++) {
          if (y1 >= 0 && y1 < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            map[y1][x] = FLOOR;
          }
        }
      }
    }
  
    // Функция для генерации всей карты целиком:
    //  1) создаём стены
    //  2) случайные прямоугольные комнаты
    //  3) «коридоры» (как в ТЗ, можно сделать 3-5 горизонтальных и 3-5 вертикальных)
    //  4) Можно также объединять комнаты «умным» способом, чтобы не было недостижимых зон
    function generateMap() {
      initMap();
  
      // 1. Сначала создаем массив для хранения центров комнат
      var rooms = [];
      
      // 2. Размещаем комнаты и сохраняем их центры
      var roomCount = getRandomInt(5, 10);
      for (var i = 0; i < roomCount; i++) {
        var roomW = getRandomInt(3, 8);
        var roomH = getRandomInt(3, 8);
        var roomX = getRandomInt(1, MAP_WIDTH - roomW - 1);
        var roomY = getRandomInt(1, MAP_HEIGHT - roomH - 1);
        
        carveRoom(roomX, roomY, roomW, roomH);
        
        // Сохраняем центр комнаты
        rooms.push({
          x: Math.floor(roomX + roomW/2),
          y: Math.floor(roomY + roomH/2)
        });
      }
  
      // 3. Соединяем каждую комнату с следующей
      for (var i = 0; i < rooms.length - 1; i++) {
        var currentRoom = rooms[i];
        var nextRoom = rooms[i + 1];
        
        // Сначала идем по горизонтали
        carveCorridor(currentRoom.x, currentRoom.y, nextRoom.x, currentRoom.y);
        // Затем по вертикали
        carveCorridor(nextRoom.x, currentRoom.y, nextRoom.x, nextRoom.y);
      }
  
      // 4. Добавляем несколько случайных дополнительных коридоров для разнообразия
      var additionalCorridors = getRandomInt(2, 4);
      for (var i = 0; i < additionalCorridors; i++) {
        var room1 = rooms[getRandomInt(0, rooms.length - 1)];
        var room2 = rooms[getRandomInt(0, rooms.length - 1)];
        
        if (Math.random() < 0.5) {
          // Горизонтальный, затем вертикальный
          carveCorridor(room1.x, room1.y, room2.x, room1.y);
          carveCorridor(room2.x, room1.y, room2.x, room2.y);
        } else {
          // Вертикальный, затем горизонтальный
          carveCorridor(room1.x, room1.y, room1.x, room2.y);
          carveCorridor(room1.x, room2.y, room2.x, room2.y);
        }
      }
    }
  
    // ----------------------------------------------------------------------------
    // 2. РАЗМЕЩЕНИЕ ПРЕДМЕТОВ, ГЕРОЯ И ВРАГОВ
    // ----------------------------------------------------------------------------
  
    // Найдём все клетки, где можно «что-то» разместить (там, где FLOOR).
    function getAllFloorCells() {
      var floorCells = [];
      for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
          if (map[y][x] === FLOOR) {
            floorCells.push({x: x, y: y});
          }
        }
      }
      return floorCells;
    }
  
    // Ставим на карту предмет: меч (SWORD) или зелье (POTION)
    // Выбираем случайную свободную «пустую» клетку (FLOOR).
    function placeItemsOnMap() {
      var floorCells = getAllFloorCells();
  
      // Разместить 2 меча
      for (var i = 0; i < 2; i++) {
        if (floorCells.length === 0) break;
        var idx = getRandomInt(0, floorCells.length - 1);
        var cell = floorCells[idx];
        map[cell.y][cell.x] = SWORD;
        floorCells.splice(idx, 1);
      }
  
      // Разместить 10 зелий
      for (var j = 0; j < 10; j++) {
        if (floorCells.length === 0) break;
        var idx2 = getRandomInt(0, floorCells.length - 1);
        var cell2 = floorCells[idx2];
        map[cell2.y][cell2.x] = POTION;
        floorCells.splice(idx2, 1);
      }
    }
  
    // Случайное размещение героя (на пустой клетке)
    function placeHero() {
      var floorCells = getAllFloorCells();
      if (floorCells.length > 0) {
        var idx = getRandomInt(0, floorCells.length - 1);
        hero.x = floorCells[idx].x;
        hero.y = floorCells[idx].y;
      }
    }
  
    // Случайное размещение 10 врагов (в произвольных пустых клетках)
    // У каждого врага, например, 50 HP и атака 5
    function placeEnemies() {
      enemies = [];
      var floorCells = getAllFloorCells();
      for (var i = 0; i < 10; i++) {
        if (floorCells.length === 0) break;
        var idx = getRandomInt(0, floorCells.length - 1);
        var cell = floorCells[idx];
        enemies.push({
          x: cell.x,
          y: cell.y,
          hp: 50,
          maxHp: 50,
          attack: 5
        });
        floorCells.splice(idx, 1);
      }
    }
  
    // Размещение двери рядом с местом появления героя
    function placeDoor() {
      // Сохраняем позицию героя
      var heroStartX = hero.x;
      var heroStartY = hero.y;
      
      // Проверяем соседние клетки вокруг героя
      var possibleDoorSpots = [
        {x: heroStartX + 1, y: heroStartY},
        {x: heroStartX - 1, y: heroStartY},
        {x: heroStartX, y: heroStartY + 1},
        {x: heroStartX, y: heroStartY - 1}
      ];

      // Выбираем первую подходящую клетку для двери
      for (var i = 0; i < possibleDoorSpots.length; i++) {
        var spot = possibleDoorSpots[i];
        if (canMove(spot.x, spot.y)) {
          map[spot.y][spot.x] = DOOR;
          return;
        }
      }
    }

    // Размещение принцессы в случайной доступной клетке
    function placePrincess() {
      var floorCells = getAllFloorCells();
      if (floorCells.length > 0) {
        // Размещаем принцессу подальше от героя
        var maxDistance = 0;
        var bestCell = null;

        floorCells.forEach(function(cell) {
          var distance = getDistance(hero.x, hero.y, cell.x, cell.y);
          if (distance > maxDistance) {
            maxDistance = distance;
            bestCell = cell;
          }
        });

        if (bestCell) {
          princess.x = bestCell.x;
          princess.y = bestCell.y;
        }
      }
    }
  
    // ----------------------------------------------------------------------------
    // 3. ОТРИСОВКА КАРТЫ
    // ----------------------------------------------------------------------------
  
    // Функция для проверки видимости клетки
    function isVisible(x, y) {
        if (!fogOfWarEnabled) return 2; // Если туман войны выключен, всё видно

        var distance = getDistance(hero.x, hero.y, x, y);
        var VISION_RADIUS = 8; // Радиус полной видимости
        var PARTIAL_VISION_RADIUS = 12; // Радиус частичной видимости
        
        // Проверяем, есть ли прямая видимость до клетки
        if (hasLineOfSight(hero.x, hero.y, x, y)) {
            if (distance <= VISION_RADIUS) {
                return 2; // Полная видимость
            } else if (distance <= PARTIAL_VISION_RADIUS) {
                return 1; // Частичная видимость
            }
        }
        return 0; // Не видно
    }

    // Функция проверки прямой видимости между двумя точками
    function hasLineOfSight(x0, y0, x1, y1) {
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var x = x0;
        var y = y0;
        var n = 1 + dx + dy;
        var x_inc = (x1 > x0) ? 1 : -1;
        var y_inc = (y1 > y0) ? 1 : -1;
        var error = dx - dy;
        dx *= 2;
        dy *= 2;

        for (; n > 0; --n) {
            if (map[y][x] === WALL && !(x === x0 && y === y0) && !(x === x1 && y === y1)) {
                return false;
            }

            if (error > 0) {
                x += x_inc;
                error -= dy;
            } else {
                y += y_inc;
                error += dx;
            }
        }

        return true;
    }

    // Функция для преобразования координат мира в координаты экрана
    function worldToScreen(worldX, worldY) {
        var screenX = (worldX - (hero.x - Math.floor(VIEWPORT_WIDTH/2))) * TILE_SIZE;
        var screenY = (worldY - (hero.y - Math.floor(VIEWPORT_HEIGHT/2))) * TILE_SIZE;
        return {x: screenX, y: screenY};
    }

    // Функция для определения, находится ли клетка в видимой области
    function isInViewport(worldX, worldY) {
        var viewportLeft = hero.x - Math.floor(VIEWPORT_WIDTH/2);
        var viewportTop = hero.y - Math.floor(VIEWPORT_HEIGHT/2);
        var viewportRight = viewportLeft + VIEWPORT_WIDTH;
        var viewportBottom = viewportTop + VIEWPORT_HEIGHT;
        
        return worldX >= viewportLeft && worldX < viewportRight && 
               worldY >= viewportTop && worldY < viewportBottom;
    }

    // Полная отрисовка игрового поля
    function drawField() {
        // Очищаем контейнер
        $field.empty();
        
        // Обновляем размеры поля под новый размер тайлов
        $field.css({
            width: VIEWPORT_WIDTH * TILE_SIZE + 'px',
            height: VIEWPORT_HEIGHT * TILE_SIZE + 'px'
        });

        // Обновляем полосу здоровья героя в углу
        updateHeroHealthCorner();

        // Определяем границы видимой области
        var viewportLeft = hero.x - Math.floor(VIEWPORT_WIDTH/2);
        var viewportTop = hero.y - Math.floor(VIEWPORT_HEIGHT/2);

        for (var y = viewportTop; y < viewportTop + VIEWPORT_HEIGHT; y++) {
            for (var x = viewportLeft; x < viewportLeft + VIEWPORT_WIDTH; x++) {
                // Проверяем, что координаты в пределах карты
                if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                    // Проверяем видимость клетки
                    var visibility = isVisible(x, y);
                    if (visibility === 0) {
                        var screenPos = worldToScreen(x, y);
                        var $tile = $('<div class="tile"></div>');
                        $tile.css({
                            left: screenPos.x + 'px',
                            top: screenPos.y + 'px'
                        });
                        $tile.addClass('floor');
                        var $fog = $('<div class="fog"></div>');
                        $tile.append($fog);
                        $field.append($tile);
                        continue;
                    }

                    // Проверяем, не находится ли здесь герой
                    var isHero = (x === hero.x && y === hero.y);
                    var enemyHere = findEnemyAt(x, y);
                    var isPrincess = (x === princess.x && y === princess.y);

                    var screenPos = worldToScreen(x, y);
                    var $tile = $('<div class="tile"></div>');
                    $tile.css({
                        left: screenPos.x + 'px',
                        top: screenPos.y + 'px'
                    });

                    if (isHero) {
                        $tile.addClass('hero');
                    } else if (enemyHere) {
                        $tile.addClass('enemy');
                        var enemyHpPercent = Math.round((enemyHere.hp / enemyHere.maxHp) * 100);
                        if (enemyHpPercent < 0) enemyHpPercent = 0;
                        var $ehb = $('<div class="health-bar"></div>').css('width', (30 * enemyHpPercent / 100) + 'px');
                        $tile.append($ehb);
                    } else if (isPrincess) {
                        $tile.addClass('princess');
                    } else {
                        switch(map[y][x]) {
                            case WALL:   $tile.addClass('wall');   break;
                            case FLOOR:  $tile.addClass('floor');  break;
                            case SWORD:  $tile.addClass('sword');  break;
                            case POTION: $tile.addClass('potion'); break;
                            case DOOR:   $tile.addClass('door');   break;
                            default:     $tile.addClass('floor');  break;
                        }
                    }

                    if (visibility === 1) {
                        var $fog = $('<div class="fog partially-visible"></div>');
                        $tile.append($fog);
                    }

                    $field.append($tile);
                }
            }
        }
    }
  
    // Функция обновления полосы здоровья героя в углу
    function updateHeroHealthCorner() {
        var hpPercent = Math.round((hero.hp / hero.maxHp) * 100);
        if (hpPercent < 0) hpPercent = 0;
        $('.hero-health-corner .health-bar-inner').css('width', hpPercent + '%');
        $('.hero-health-corner .health-value').text(hero.hp + '/' + hero.maxHp);
    }
  
    // ----------------------------------------------------------------------------
    // 4. МЕХАНИКА ДВИЖЕНИЯ И АТАК
    // ----------------------------------------------------------------------------
  
    // Простая проверка, свободна ли клетка для перемещения
    // (не выход за пределы, не стена)
    function canMove(x, y) {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      if (map[y][x] === WALL) return false;
      return true;
    }
  
    // По нажатию WASD двигаем героя, если возможно
    function moveHero(dx, dy) {
      var newX = hero.x + dx;
      var newY = hero.y + dy;
      if (canMove(newX, newY)) {
        hero.x = newX;
        hero.y = newY;
  
        // Если там был меч — увеличить атаку, убрать меч
        if (map[newY][newX] === SWORD) {
          alert('Вы нашли меч! Ваша атака увеличена на 10.');
          hero.attack += 10; 
          map[newY][newX] = FLOOR; 
        }
        // Если там было зелье — восстановить часть HP, убрать зелье
        if (map[newY][newX] === POTION) {
          hero.hp = Math.min(hero.maxHp, hero.hp + 20);
          map[newY][newX] = FLOOR;
          playPotionSound();
        }

        // Обновляем положение принцессы
        updatePrincess();
        
        // Проверяем условие победы
        checkVictory();
      }
    }
  
    // Атака героя (пробел). Нужно ударить всех врагов, находящихся на соседних клетках
    function heroAttack() {
      // Проверяем все 8 соседних клеток (включая диагональные)
      var adjCoords = [
        {x: hero.x+1, y: hero.y},   // справа
        {x: hero.x-1, y: hero.y},   // слева
        {x: hero.x,   y: hero.y+1}, // снизу
        {x: hero.x,   y: hero.y-1}, // сверху
        {x: hero.x+1, y: hero.y+1}, // справа снизу
        {x: hero.x-1, y: hero.y+1}, // слева снизу
        {x: hero.x+1, y: hero.y-1}, // справа сверху
        {x: hero.x-1, y: hero.y-1}  // слева сверху
      ];

      // Проверяем, есть ли рядом принцесса
      if (!princess.isFollowing && enemies.length === 0) {
        adjCoords.forEach(function(pos) {
          if (pos.x === princess.x && pos.y === princess.y) {
            princess.isFollowing = true;
            alert('Принцесса следует за вами! Отведите ее к двери.');
          }
        });
      }

      // Атакуем врагов
      adjCoords.forEach(function(pos) {
        var enemy = findEnemyAt(pos.x, pos.y);
        if (enemy) {
          enemy.hp -= hero.attack;
          // Если враг умирает — удаляем из массива
          if (enemy.hp <= 0) {
            var index = enemies.indexOf(enemy);
            if (index >= 0) {
              enemies.splice(index, 1);
            }
          }
        }
        playAttackSound();
      });
    }
  
    // Поиск врага на клетке (x, y)
    function findEnemyAt(x, y) {
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].x === x && enemies[i].y === y) {
          return enemies[i];
        }
      }
      return null;
    }
  
    // Атака врагов по герою, если герой на соседней клетке
    // + Случайное перемещение врагов
    function enemyTurn() {
      if (gameOver) return; // Если игра окончена, враги не ходят

      enemies.forEach(function(enemy) {
        // Смотрим, рядом ли герой. Если да — атаковать
        if (isAdjacent(enemy, hero)) {
          hero.hp -= enemy.attack;
          playPainSound();
          if (hero.hp <= 0) {
            hero.hp = 0;
            gameOver = true;
            playDeathSound();
            alert('Вы погибли! Игра завершена.');
            // Перезапускаем игру
            setTimeout(function() {
              gameOver = false;
              startGame();
            }, 1000);
            return;
          }
        } else {
          // Иначе враг случайно двигается 
          var dir = getRandomInt(0, 3);
          var dx = 0, dy = 0;
          if (dir === 0) dx = 1;
          if (dir === 1) dx = -1;
          if (dir === 2) dy = 1;
          if (dir === 3) dy = -1;
  
          var newX = enemy.x + dx;
          var newY = enemy.y + dy;
          // Проверим, можно ли врагу ходить в ту клетку
          if (canMove(newX, newY) && !findEnemyAt(newX, newY)) {
            // (Дополнительно проверяем, чтобы не занимать клетку с другим врагом)
            enemy.x = newX;
            enemy.y = newY;
          }
        }
      });
    }
  
    // Проверка, что герой на соседней клетке (включая диагональные)
    function isAdjacent(a, b) {
      return (Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1);
    }
  
    // Проверка победы (герой с принцессой дошел до двери)
    function checkVictory() {
      if (princess.isFollowing) {
        // Проверяем, стоит ли герой на клетке с дверью
        if (map[hero.y][hero.x] === DOOR) {
          princess.rescued = true;
          alert('Поздравляем! Вы спасли принцессу и прошли уровень!');
          startGame(); // Начинаем новую игру
        }
      }
    }
  
    // Обновляем движение принцессы
    function updatePrincess() {
      if (princess.isFollowing && !princess.rescued) {
        // Принцесса следует за героем, оставаясь на одну клетку позади
        var dx = hero.x - princess.x;
        var dy = hero.y - princess.y;
        
        // Определяем направление движения
        if (Math.abs(dx) > Math.abs(dy)) {
          // Двигаемся по горизонтали
          princess.x += (dx > 0) ? 1 : -1;
        } else if (dy !== 0) {
          // Двигаемся по вертикали
          princess.y += (dy > 0) ? 1 : -1;
        }
      }
    }
  
    // ----------------------------------------------------------------------------
    // 5. УТИЛИТЫ
    // ----------------------------------------------------------------------------
  
    // Случайное целое в [min, max]
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  
    // ----------------------------------------------------------------------------
    // 6. ПОДПИСЫВАЕМСЯ НА СОБЫТИЯ КЛАВИАТУРЫ
    // ----------------------------------------------------------------------------
  
    $(document).on('keydown', function(e) {
      if (gameOver) return; // Если игра окончена, не реагируем на клавиши

      // WASD для перемещения
      // keyCode: W=87, A=65, S=83, D=68, Пробел=32
      var redrawNeeded = false;
  
      switch(e.keyCode) {
        case 65: // A
          moveHero(-1, 0);
          redrawNeeded = true;
          break;
        case 68: // D
          moveHero(1, 0);
          redrawNeeded = true;
          break;
        case 87: // W
          moveHero(0, -1);
          redrawNeeded = true;
          break;
        case 83: // S
          moveHero(0, 1);
          redrawNeeded = true;
          break;
        case 32: // Пробел — атака
          heroAttack();
          redrawNeeded = true;
          break;
      }
  
      // Если герой сдвинулся или атаковал, то ход врагов
      if (redrawNeeded) {
        enemyTurn();
        drawField();
      }
    });
  
    // ----------------------------------------------------------------------------
    // 7. ЗАПУСК ИГРЫ
    // ----------------------------------------------------------------------------
  
    function startGame() {
      
      gameOver = false;
      hero.hp = hero.maxHp;
      hero.attack = 10;
      
      // Сбрасываем состояние принцессы
      princess.isFollowing = false;
      princess.rescued = false;
      
      generateMap();
      
      placeItemsOnMap();
      placeHero();
      placeEnemies();
      placeDoor();
      placePrincess();
      drawField();
      updateHeroHealthCorner();
      initMobileControls(); // Добавляем инициализацию мобильного управления
      
      // Обработка клавиатуры только для десктопа
      if (window.innerWidth > 768) {
          $(document).on('keydown', function(e) {
              if (gameOver) return;
              
              switch(e.key) {
                  case 'w': case 'W': moveHero(0, -1); break;
                  case 's': case 'S': moveHero(0, 1); break;
                  case 'a': case 'A': moveHero(-1, 0); break;
                  case 'd': case 'D': moveHero(1, 0); break;
                  case ' ': heroAttack(); break;
              }
          });
      }
      
      alert('Игра началась! Чтобы пройти уровень, победите всех врагов и отведите принцессу к двери! Удачи!');
    }
  
    // Запуск
    startGame();
  
    // Функция для нахождения расстояния между двумя точками
    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
  
    // Функции для воспроизведения звуков
    function playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0; // Перематываем на начало
            sound.play();
        }
    }
  
    // Функции звука для разных событий
    function playPotionSound() {
        playSound('potion-sound');
    }
  
    function playAttackSound() {
        playSound('attack-sound');
    }
  
    function playDeathSound() {
        playSound('death-sound');
    }
  
    function playPainSound() {
        playSound('pain-sound');
    }
  
    // При поднятии зелья (вставить в код, где обрабатывается подбор зелья +):
    function pickupPotion() {
        
        playPotionSound();
        
    }
  
    // При атаке врага (вставить в код, где обрабатывается атака +):
    function attackEnemy(enemy) {
        
        playAttackSound();
        
    }
  
    // При получении урона героем:
    function heroTakeDamage(damage) {
        
        playPainSound();
        
    }
  
    // При смерти героя:
    function heroDeath() {
       
        playDeathSound();
      
    }
  
    // Функция для обновления размеров viewport при изменении размера окна
    function updateViewportSize() {
        VIEWPORT_WIDTH = Math.floor(window.innerWidth / TILE_SIZE) - 2;
        VIEWPORT_HEIGHT = Math.floor(window.innerHeight / TILE_SIZE) - 2;
        drawField();
    }

    // Добавляем обработчик изменения размера окна
    $(window).on('resize', updateViewportSize);
  
    // Инициализация мобильного управления
    function initMobileControls() {
        if (window.innerWidth <= 768) {
            // Обработка джойстика
            joystickContainer.on('touchstart', function(e) {
                joystickActive = true;
                var touch = e.originalEvent.touches[0];
                var rect = joystickContainer[0].getBoundingClientRect();
                joystickStartX = rect.left + rect.width / 2;
                joystickStartY = rect.top + rect.height / 2;
                updateJoystick(touch.clientX, touch.clientY);
            });

            $(document).on('touchmove', function(e) {
                if (joystickActive) {
                    e.preventDefault();
                    var touch = e.originalEvent.touches[0];
                    updateJoystick(touch.clientX, touch.clientY);
                }
            });

            $(document).on('touchend', function() {
                joystickActive = false;
                resetJoystick();
            });

            // Обработка кнопки атаки
            attackButton.on('touchstart', function(e) {
                e.preventDefault();
                heroAttack();
            });
        }
    }

    function updateJoystick(x, y) {
        var dx = x - joystickStartX;
        var dy = y - joystickStartY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > joystickRadius) {
            dx = dx * joystickRadius / distance;
            dy = dy * joystickRadius / distance;
        }
        
        joystick.css({
            transform: `translate(${dx}px, ${dy}px)`
        });
        
        // Определяем направление движения
        var moveX = 0;
        var moveY = 0;
        
        if (Math.abs(dx) > 20) {
            moveX = dx > 0 ? 1 : -1;
        }
        if (Math.abs(dy) > 20) {
            moveY = dy > 0 ? 1 : -1;
        }
        
        // Двигаем героя
        if (moveX !== 0 || moveY !== 0) {
            moveHero(moveX, moveY);
        }
    }

    function resetJoystick() {
        joystick.css({
            transform: 'translate(0, 0)'
        });
    }
  
})();
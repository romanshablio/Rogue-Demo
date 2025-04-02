(function() {

    // Размер поля по ТЗ
    var MAP_WIDTH = 40;
    var MAP_HEIGHT = 24;
  
    // Различные коды для карты
    var WALL    = 1;
    var FLOOR   = 0;
    var SWORD   = 2;
    var POTION  = 3;
   
    // Параметры героя
    var hero = {
      x: 0,
      y: 0,
      hp: 100,    // Текущее здоровье
      maxHp: 100, // Максимальное здоровье
      attack: 10  // Сила удара
    };
  
    // Массив врагов (каждый враг: x, y, hp, attack и т.д.)
    var enemies = [];
  
    // Игровая карта (двумерный массив)
    var map = [];
  
    // Размер «клетки» в пикселях для отрисовки
    var TILE_SIZE = 16;
  
    // Ссылка на контейнер для отрисовки
    var $field = $('.field');
  
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
    // У каждого врага, например, 30 HP и атака 5
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
  
    // ----------------------------------------------------------------------------
    // 3. ОТРИСОВКА КАРТЫ
    // ----------------------------------------------------------------------------
  
    // Полная отрисовка игрового поля
    function drawField() {
      // Очищаем контейнер
      $field.empty();
  
      for (var y = 0; y < MAP_HEIGHT; y++) {
        for (var x = 0; x < MAP_WIDTH; x++) {
  
          // Проверяем, не находится ли здесь герой
          var isHero = (x === hero.x && y === hero.y);
  
          // Проверяем, не находится ли здесь враг
          var enemyHere = findEnemyAt(x, y);
  
          // Создаём div для клетки
          var $tile = $('<div class="tile"></div>');
          $tile.css({
            left: x * TILE_SIZE + 'px',
            top:  y * TILE_SIZE + 'px'
          });
  
          // Определяем класс плитки (wall/floor/potion/sword/hero/enemy)
          if (isHero) {
            $tile.addClass('hero');
            // Отрисуем "фон" пола, чтобы герой «находился» поверх
            // (вместо стены). Предположим, что герой всегда стоит на месте,
            // которое изначально было FLOOR/предмет и т.д.
          } else if (enemyHere) {
            $tile.addClass('enemy');
          } else {
            switch(map[y][x]) {
              case WALL:   $tile.addClass('wall');   break;
              case FLOOR:  $tile.addClass('floor');  break;
              case SWORD:  $tile.addClass('sword');  break;
              case POTION: $tile.addClass('potion'); break;
              default:     $tile.addClass('floor');  break;
            }
          }
  
          // Если это герой или враг — нарисуем полоску здоровья (health bar)
          if (isHero) {
            var hpPercent = Math.round((hero.hp / hero.maxHp) * 100);
            if (hpPercent < 0) hpPercent = 0;
            var $hb = $('<div class="health-bar"></div>').css('width', hpPercent + '%');
            $tile.append($hb);
          } else if (enemyHere) {
            var enemyHpPercent = Math.round((enemyHere.hp / enemyHere.maxHp) * 100);
            if (enemyHpPercent < 0) enemyHpPercent = 0;
            var $ehb = $('<div class="health-bar"></div>').css('width', enemyHpPercent + '%');
            $tile.append($ehb);
          }
  
          $field.append($tile);
        }
      }
  
      // После отрисовки поля обновляем шкалу здоровья
      updateHealthBar();
      updateNearestEnemyBar();
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
          hero.attack += 10; 
          map[newY][newX] = FLOOR; 
        }
        // Если там было зелье — восстановить часть HP, убрать зелье
        if (map[newY][newX] === POTION) {
          hero.hp = Math.min(hero.maxHp, hero.hp + 20);
          map[newY][newX] = FLOOR;
          playPotionSound();
        }
      }
    }
  
    // Атака героя (пробел). Нужно ударить всех врагов, находящихся на соседних клетках
    function heroAttack() {
      // Соседние клетки: (x+1,y), (x-1,y), (x,y+1), (x,y-1) 
      var adjCoords = [
        {x: hero.x+1, y: hero.y},
        {x: hero.x-1, y: hero.y},
        {x: hero.x,   y: hero.y+1},
        {x: hero.x,   y: hero.y-1}
      ];
  
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
        playAttackSound()
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
      enemies.forEach(function(enemy) {
        // Смотрим, рядом ли герой. Если да — атаковать
        if (isAdjacent(enemy, hero)) {
          hero.hp -= enemy.attack;
          playPainSound();
          if (hero.hp <= 0) {
            hero.hp = 0;
            // По ТЗ игровой конец можно прописать отдельно.
            playDeathSound();
            alert('Вы погибли! Игра завершена.');
            
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
  
    // Проверка, что герой на соседней клетке
    function isAdjacent(a, b) {
      return (Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1);
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
      generateMap();
      placeItemsOnMap();
      placeHero();
      placeEnemies();
  
      drawField();
    }
  
    // Запуск
    startGame();
  
    function updateHealthBar() {
      var hpPercent = Math.round((hero.hp / hero.maxHp) * 100);
      if (hpPercent < 0) hpPercent = 0;
      
      // Обновляем шкалу под полем
      $('.health-bar-inner').css('width', hpPercent + '%');
      $('.health-value').text(hero.hp + '/' + hero.maxHp);
    }
  
    // Функция для нахождения расстояния между двумя точками
    function getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
  
    // Функция для нахождения ближайшего врага
    function findNearestEnemy() {
        let nearestEnemy = null;
        let minDistance = Infinity;
  
        for (let enemy of enemies) {
            if (enemy.hp <= 0) continue; // Пропускаем мертвых врагов
            
            let distance = getDistance(hero.x, hero.y, enemy.x, enemy.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestEnemy = enemy;
            }
        }
  
        return {
            enemy: nearestEnemy,
            distance: Math.round(minDistance)
        };
    }
  
    // Функция обновления информации о ближайшем враге
    function updateNearestEnemyBar() {
        let nearest = findNearestEnemy();
        let $stats = $('.nearest-enemy-stats');
        
        if (nearest.enemy) {
            let hpPercent = Math.round((nearest.enemy.hp / nearest.enemy.maxHp) * 100);
            if (hpPercent < 0) hpPercent = 0;
            
            $stats.show(); // Показываем панель
            $stats.find('.health-bar-inner').css('width', hpPercent + '%');
            $stats.find('.health-value').text(nearest.enemy.hp + '/' + nearest.enemy.maxHp);
            $stats.find('.distance-value').text('(расстояние: ' + nearest.distance + ')');
        } else {
            $stats.hide(); // Скрываем панель, если врагов нет
        }
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
  
})();
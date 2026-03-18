// Переменные для мобильного управления
var attackButton = $('.attack-button');
var dPad = {
    up: $('.d-pad-up'),
    right: $('.d-pad-right'),
    down: $('.d-pad-down'),
    left: $('.d-pad-left')
};

// Функции для мобильного управления
function initMobileControls() {
    // Обработка D-pad
    dPad.up.on('touchstart', function(e) {
        e.preventDefault();
        if (window.moveHero(0, -1)) {
            window.enemyTurn();
            window.drawField();
        }
    });

    dPad.right.on('touchstart', function(e) {
        e.preventDefault();
        if (window.moveHero(1, 0)) {
            window.enemyTurn();
            window.drawField();
        }
    });

    dPad.down.on('touchstart', function(e) {
        e.preventDefault();
        if (window.moveHero(0, 1)) {
            window.enemyTurn();
            window.drawField();
        }
    });

    dPad.left.on('touchstart', function(e) {
        e.preventDefault();
        if (window.moveHero(-1, 0)) {
            window.enemyTurn();
            window.drawField();
        }
    });

    // Обработка кнопки атаки
    attackButton.on('touchstart', function(e) {
        e.preventDefault();
        if (window.heroAttack()) {
            window.enemyTurn();
            window.drawField();
        }
    });

    // Предотвращаем скролл на мобильных устройствах
    $('.mobile-controls').on('touchmove', function(e) {
        e.preventDefault();
        return false;
    });
}

// Инициализация при полной загрузке документа
$(document).ready(function() {
    // Даем небольшую задержку для гарантии загрузки всех скриптов
    setTimeout(function() {
        initMobileControls();
    }, 500);
});

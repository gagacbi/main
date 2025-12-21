import { Game } from './game.js';
import { UI } from './ui.js';

const ui = new UI(document.body);
const game = new Game({
  onStateChange: (state) => ui.render(state),
  onLog: (message) => ui.log(message),
});

function bindControls() {
  document.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.move;
      const delta = directionToDelta(dir);
      game.move(delta.x, delta.y);
      game.drinkFromWell();
    });
  });

  document.getElementById('gather-btn').addEventListener('click', () => {
    game.gather();
    game.drinkFromWell();
  });

  document.getElementById('rest-btn').addEventListener('click', () => game.rest());
  document.getElementById('farm-btn').addEventListener('click', () => game.buildFarm());
  document.getElementById('well-btn').addEventListener('click', () => game.buildWell());

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const map = {
      w: 'up',
      arrowup: 'up',
      s: 'down',
      arrowdown: 'down',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
      g: 'gather',
      r: 'rest',
      f: 'farm',
      q: 'well',
    };
    const action = map[key];
    if (!action) return;
    event.preventDefault();
    if (action === 'gather') {
      game.gather();
      game.drinkFromWell();
      return;
    }
    if (action === 'rest') return game.rest();
    if (action === 'farm') return game.buildFarm();
    if (action === 'well') return game.buildWell();
    const delta = directionToDelta(action);
    if (delta) {
      game.move(delta.x, delta.y);
      game.drinkFromWell();
    }
  });
}

function directionToDelta(direction) {
  switch (direction) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    default:
      return null;
  }
}

game.start();
bindControls();
ui.log('Kamp kuruldu. Kaynak toplayıp tarla açarak hayatta kal!');
ui.render(game.state);

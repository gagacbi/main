import { BOARD_SIZE, TILE_ICONS, TILE_TYPES } from './constants.js';

export class UI {
  constructor(root, world) {
    this.root = root;
    this.world = world;
    this.boardEl = document.getElementById('board');
    this.statsEl = document.getElementById('stats');
    this.logEl = document.getElementById('log');
    this.buildBoard();
  }

  buildBoard() {
    this.boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 38px)`;
    this.boardEl.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 38px)`;
    this.boardEl.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const cell = document.createElement('div');
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.classList.add('cell');
        this.boardEl.appendChild(cell);
      }
    }
  }

  render(state) {
    this.renderStats(state);
    this.renderBoard(state);
  }

  renderStats(state) {
    const { player, inventory, time } = state;
    this.statsEl.innerHTML = `
      <div>
        <div class="stat-title">Gün</div>
        <div>${time.day} / Tick ${time.tick}</div>
      </div>
      <div>
        <div class="stat-title">HP</div>
        <div>${player.hp.toFixed(0)}</div>
      </div>
      <div>
        <div class="stat-title">Açlık</div>
        <div>${player.hunger.toFixed(0)}</div>
      </div>
      <div>
        <div class="stat-title">Enerji</div>
        <div>${player.energy.toFixed(0)}</div>
      </div>
      <div>
        <div class="stat-title">Susuzluk</div>
        <div>${player.hydration.toFixed(0)}</div>
      </div>
      <div>
        <div class="stat-title">Envanter</div>
        <div>🥩 ${inventory.food} · 🌲 ${inventory.wood} · ⛰️ ${inventory.stone} · 🧶 ${inventory.fiber} · 💧 ${inventory.water}</div>
      </div>
    `;
  }

  renderBoard(state) {
    this.boardEl.childNodes.forEach((cell) => {
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      const tile = this.world.tileAt(x, y);
      cell.className = `cell ${tile?.type || ''}`;
      cell.textContent = TILE_ICONS[tile?.type] || '';
      if (x === state.player.x && y === state.player.y) {
        cell.classList.add('player');
        cell.textContent = '🧑‍🌾';
      }
    });
  }

  log(message) {
    const entry = document.createElement('div');
    entry.textContent = message;
    this.logEl.prepend(entry);
    while (this.logEl.childNodes.length > 40) {
      this.logEl.removeChild(this.logEl.lastChild);
    }
  }
}

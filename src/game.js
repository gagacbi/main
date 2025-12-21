import { BOARD_SIZE, DAY_LENGTH_TICKS, TILE_TYPES, TICK_MS } from './constants.js';
import { World } from './world.js';

export class Game {
  constructor({ onStateChange, onLog }) {
    this.onStateChange = onStateChange;
    this.onLog = onLog;
    this.world = new World();
    this.state = this.createInitialState();
    this.tickHandle = null;
  }

  createInitialState() {
    return {
      player: {
        x: Math.floor(BOARD_SIZE / 2),
        y: Math.floor(BOARD_SIZE / 2),
        hp: 100,
        hunger: 75,
        energy: 80,
        hydration: 80,
      },
      time: {
        tick: 0,
        day: 1,
      },
      inventory: {
        wood: 2,
        stone: 1,
        food: 4,
        fiber: 2,
        water: 2,
      },
      status: 'running',
    };
  }

  start() {
    this.emitState();
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
    }
  }

  tick() {
    if (this.state.status !== 'running') return;
    this.state.time.tick += 1;
    if (this.state.time.tick % DAY_LENGTH_TICKS === 0) {
      this.state.time.day += 1;
      this.log(`Yeni gün: ${this.state.time.day}`);
    }

    this.applyUpkeep();
    this.emitState();
  }

  applyUpkeep() {
    const { player } = this.state;
    player.hunger = Math.max(0, player.hunger - 1.2);
    player.energy = Math.max(0, player.energy - 0.6);
    player.hydration = Math.max(0, player.hydration - 1);

    if (player.hunger <= 0 || player.hydration <= 0) {
      player.hp = Math.max(0, player.hp - 2.5);
      if (player.hp === 0) {
        this.state.status = 'dead';
        this.stop();
        this.log('Açlık veya susuzluk yüzünden bayıldın. Oyun bitti.');
      }
    }
  }

  move(dx, dy) {
    if (this.state.status !== 'running') return;
    const nx = this.state.player.x + dx;
    const ny = this.state.player.y + dy;
    if (!this.world.tileAt(nx, ny)) return;
    this.state.player.x = nx;
    this.state.player.y = ny;
    this.state.player.energy = Math.max(0, this.state.player.energy - 1.5);
    this.emitState();
  }

  gather() {
    if (this.state.status !== 'running') return;
    const tile = this.world.tileAt(this.state.player.x, this.state.player.y);
    const gains = { wood: 0, stone: 0, food: 0, fiber: 0, water: 0 };

    switch (tile?.type) {
      case TILE_TYPES.FOREST:
        gains.wood = 1 + Math.floor(Math.random() * 2);
        gains.fiber = Math.random() > 0.5 ? 1 : 0;
        break;
      case TILE_TYPES.STONE:
        gains.stone = 1;
        break;
      case TILE_TYPES.RIVER:
        gains.water = 1;
        gains.food = Math.random() > 0.65 ? 1 : 0;
        break;
      case TILE_TYPES.FARM:
        gains.food = 2 + Math.floor(Math.random() * 2);
        break;
      case TILE_TYPES.PLAINS:
        gains.fiber = 1;
        gains.food = Math.random() > 0.6 ? 1 : 0;
        break;
      default:
        break;
    }

    const total = Object.values(gains).reduce((acc, v) => acc + v, 0);
    if (total === 0) {
      this.log('Bu hücrede toplanacak bir şey bulamadın.');
      return;
    }

    Object.entries(gains).forEach(([key, val]) => {
      this.state.inventory[key] += val;
    });
    this.state.player.energy = Math.max(0, this.state.player.energy - 2);
    this.emitState();

    const summary = Object.entries(gains)
      .filter(([, val]) => val > 0)
      .map(([k, v]) => `${v} ${this.prettyResource(k)}`)
      .join(', ');
    this.log(`Topladın: ${summary}`);
  }

  rest() {
    if (this.state.status !== 'running') return;
    if (this.state.inventory.food <= 0) {
      this.log('Yiyeceğin yok, dinlenemezsin.');
      return;
    }
    this.state.inventory.food -= 1;
    this.state.player.energy = Math.min(100, this.state.player.energy + 12);
    this.state.player.hunger = Math.min(100, this.state.player.hunger + 6);
    this.state.player.hp = Math.min(100, this.state.player.hp + 4);
    this.emitState();
    this.log('Sıcak bir yemekle dinlendin, enerjin tazelendi.');
  }

  buildFarm() {
    if (this.state.status !== 'running') return;
    const tile = this.world.tileAt(this.state.player.x, this.state.player.y);
    if (!tile || tile.type !== TILE_TYPES.PLAINS) {
      this.log('Tarla kurmak için düz bir çayıra ihtiyacın var.');
      return;
    }
    if (this.state.inventory.wood < 2 || this.state.inventory.fiber < 2) {
      this.log('Yetersiz kaynak: 2 Odun ve 2 Lif gerekiyor.');
      return;
    }
    this.state.inventory.wood -= 2;
    this.state.inventory.fiber -= 2;
    this.world.replaceTile(this.state.player.x, this.state.player.y, TILE_TYPES.FARM);
    this.emitState();
    this.log('Ufak bir tarla kurdun. Hasat için Kaynak Topla tuşuna bas.');
  }

  buildWell() {
    if (this.state.status !== 'running') return;
    const tile = this.world.tileAt(this.state.player.x, this.state.player.y);
    if (!tile || (tile.type !== TILE_TYPES.STONE && tile.type !== TILE_TYPES.PLAINS)) {
      this.log('Kuyu için taşlık ya da sağlam zemin lazım.');
      return;
    }
    if (this.state.inventory.stone < 3) {
      this.log('Yetersiz kaynak: 3 Taş gerekiyor.');
      return;
    }
    this.state.inventory.stone -= 3;
    this.world.replaceTile(this.state.player.x, this.state.player.y, TILE_TYPES.WELL);
    this.emitState();
    this.log('Kuyu açtın. Artık burada su toplayabilirsin.');
  }

  drinkFromWell() {
    if (this.state.status !== 'running') return;
    const tile = this.world.tileAt(this.state.player.x, this.state.player.y);
    if (tile?.type !== TILE_TYPES.WELL) return;
    this.state.inventory.water += 1;
    this.state.player.hydration = Math.min(100, this.state.player.hydration + 6);
    this.log('Kuyudan su çektin.');
    this.emitState();
  }

  prettyResource(key) {
    const map = {
      wood: 'Odun',
      stone: 'Taş',
      food: 'Yemek',
      fiber: 'Lif',
      water: 'Su',
    };
    return map[key] || key;
  }
}

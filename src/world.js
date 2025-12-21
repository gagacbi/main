import { BOARD_SIZE, TILE_TYPES } from './constants.js';

export class Tile {
  constructor(type) {
    this.type = type;
  }
}

export class World {
  constructor(size = BOARD_SIZE, rng = Math.random) {
    this.size = size;
    this.rng = rng;
    this.grid = this.generate();
  }

  generate() {
    const grid = [];
    for (let y = 0; y < this.size; y += 1) {
      const row = [];
      for (let x = 0; x < this.size; x += 1) {
        row.push(new Tile(this.pickTile(x, y)));
      }
      grid.push(row);
    }
    grid[Math.floor(this.size / 2)][Math.floor(this.size / 2)] = new Tile(TILE_TYPES.PLAINS);
    return grid;
  }

  pickTile(x, y) {
    const noise = this.rng();
    if (y === 0 || y === this.size - 1 || x === 0 || x === this.size - 1) {
      return TILE_TYPES.STONE;
    }
    if (noise > 0.85) return TILE_TYPES.RIVER;
    if (noise > 0.6) return TILE_TYPES.STONE;
    if (noise > 0.35) return TILE_TYPES.FOREST;
    return TILE_TYPES.PLAINS;
  }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return null;
    return this.grid[y][x];
  }

  replaceTile(x, y, type) {
    if (this.tileAt(x, y)) {
      this.grid[y][x] = new Tile(type);
    }
  }
}

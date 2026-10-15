/** Oyun saati. Testlerde zaman ileri sarılabilir (oba / çevrimdışı ilerleme kanıtı için). */
export class Clock {
  offset = 0;
  now() { return Date.now() + this.offset; }
  advance(ms: number) { this.offset += ms; }
}

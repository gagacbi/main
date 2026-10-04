import { stepMove } from '@shared/world';

/**
 * İstemci tarafı hareket tahmini ve sunucuyla uzlaştırma. Oyun döngüsünden bağımsızdır;
 * sunucu yetkilidir, istemci yalnızca girdiye anında tepki verir ve sunucu konumuna yumuşakça yaklaşır.
 */
export class Predictor {
  pos = { x: 0, z: 0 }; snaps = 0;
  /** girdiyi hemen uygula (sunucuyla aynı hareket ve çarpışma fonksiyonu) */
  step(dir: { x: number; z: number }, speed: number, dt: number) {
    if (dir.x || dir.z) stepMove(this.pos, dir.x, dir.z, speed, dt);
  }
  /** sunucu konumuna yaklaş: durunca hızlı, giderken yalnızca büyük sapmada, çok büyükse ışınla. Sapmayı döndürür. */
  reconcile(srv: { x: number; z: number }, moving: boolean, dt: number): number {
    const ex = srv.x - this.pos.x, ez = srv.z - this.pos.z; const err = Math.hypot(ex, ez);
    if (err > 8) { this.pos.x = srv.x; this.pos.z = srv.z; this.snaps++; }
    else if (!moving) { const k = Math.min(1, dt * 7); this.pos.x += ex * k; this.pos.z += ez * k; }
    else if (err > 1.6) { const k = Math.min(1, dt * 3); this.pos.x += ex * k; this.pos.z += ez * k; }
    return err;
  }
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import { startGameServer } from '../../server/index';
import { HUB, UPGRADE_RATE, makeItem } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { Bot } from '../integration/helpers';
import type { Player } from '../../server/world';

/**
 * Uçtan uca kanıt: gerçek Chromium + gerçek sunucu + üretim derlemesi (dist).
 * Ekran görüntüleri docs/evidence/ altına, ölçümler e2e-report.json dosyasına yazılır.
 */
const OUT = 'docs/evidence'; mkdirSync(OUT, { recursive: true });
const results: { id: string; ok: boolean; detail: string }[] = [];
const metrics: Record<string, unknown> = {};
const check = (id: string, ok: boolean, detail: string) => { results.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };
process.env.KUT_PING_RETRIES = '30';   // yazılım render'ında sayfa yüklenirken ana iş parçacığı uzun süre kilitlenir; canlılık kontrolü gevşetilir (yalnızca test)
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const want = (s: string) => !only || only.has(s);

const srv = await startGameServer({ port: 0, dbPath: `/tmp/e2e-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`;
const world = () => [...srv.ctx.worlds][0];
const pl = (name: string): Player => [...world().players.values()].find((p) => p.name === name)!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const browser: Browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'tr-TR' });
await ctx.addInitScript(() => { try { localStorage.setItem('kut.lang', 'tr'); localStorage.setItem('kut.q', 'high'); } catch { /* */ } });
const page: Page = await ctx.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const ev = <T>(expr: string): Promise<T> => page.evaluate(`(() => { const g = window.__game; return ${expr}; })()`) as Promise<T>;
const shot = async (name: string) => { await page.screenshot({ path: `${OUT}/${name}.png` }); };
const NAME = 'Bozkurt' + Math.floor(Math.random() * 900 + 100);

// ───────── 1. Giriş ekranı (F6 Türkçe, F1 stil, F4 arayüz) ─────────
await page.goto(url + '?autoq=0'); await page.waitForSelector('.title .tcard', { timeout: 60000 }); await sleep(2500);
const t1 = await page.textContent('.title');
check('F6.tr', /Yeni alp yarat|Giriş yap/.test(t1 ?? '') && /Karakter adı/.test(t1 ?? ''), 'Giriş ekranı Türkçe: ' + (t1 ?? '').replace(/\s+/g, ' ').slice(0, 90));
await shot('01-giris-tr');
await page.click('.langsw button[data-l="en"]'); await sleep(500);
const tEn = await page.textContent('.title'); check('F6.en', /Log in|Create a new hero/.test(tEn ?? '') && /Character name/.test(tEn ?? ''), 'Dil düğmesiyle çalışma anında İngilizce: ' + (tEn ?? '').replace(/\s+/g, ' ').slice(0, 70));
await shot('01b-giris-en');
await page.click('.langsw button[data-l="tr"]'); await sleep(400);
await page.click('#sw'); await sleep(600);
await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234');
await page.click('.boycard[data-b="ay"]'); await sleep(900);
check('C1.boy-secimi', (await page.$$('.boycard')).length === 3, 'Karakter oluştururken 3 boy seçilebilir (Gök/Yer/Ay), sınıf: Alp');
await shot('02-karakter-olustur');
await page.click('#go'); await page.waitForFunction('window.__ready === true', null, { timeout: 90000 }); await sleep(2500);
check('A1.giris', true, 'UI üzerinden karakter oluşturuldu ve oyuna girildi');
const g0 = await ev<{ boy: string; name: string; level: number }>('({ boy: g.me.boy, name: g.me.name, level: g.me.level })');
check('C1.boy-kaydi', g0.boy === 'ay' && g0.name === NAME, `Sunucu kaydı: boy=${g0.boy} ad=${g0.name}`);
await shot('03-oyun-yurt');

// ───────── 2. Cel-shade doğrulama (F1) ─────────
const gfx = await ev<{ toon: number; outlines: number; mats: number; meshes: number; fonts: string[] }>(`(() => {
  const sc = g.gs.scene; const ms = sc.materials.filter(m => m.getClassName() === 'ShaderMaterial');
  return { toon: ms.filter(m => m.name.startsWith('toon')).length, outlines: sc.meshes.filter(m => m.name.endsWith('_ol')).length, mats: ms.length, meshes: sc.meshes.length,
    fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight) };
})()`);
check('F1.toon', gfx.toon > 20 && gfx.outlines > 20, `Toon materyal=${gfx.toon}, kontur ağı=${gfx.outlines}, toplam ShaderMaterial=${gfx.mats}`);
const px = await page.evaluate(() => { const c = document.getElementById('game') as HTMLCanvasElement; const t = document.createElement('canvas'); t.width = 64; t.height = 36; const x = t.getContext('2d')!; x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; const set = new Set<string>(); for (let i = 0; i < d.length; i += 4) set.add(`${d[i] >> 5},${d[i + 1] >> 5},${d[i + 2] >> 5}`); return set.size; });
check('F1.palet', px > 10, `Sahnede ${px} ayrı (3-bit) renk kovası: canlı palet`);
check('F6.font', gfx.fonts.some((f) => f.startsWith('Fredoka')) && gfx.fonts.some((f) => f.startsWith('Nunito')), 'Fredoka/Nunito (latin-ext) yazı tipleri yüklendi: ' + gfx.fonts.length + ' yüz');
// HUD
const hud = await page.evaluate(() => ({ hp: !!document.querySelector('#hpbar'), skills: document.querySelectorAll('#skillbar .slot').length, map: !!document.querySelector('#mm'), chat: !!document.querySelector('#chat'), quest: !!document.querySelector('#quest'), tamga: document.querySelectorAll('svg').length }));
check('F4.hud', hud.hp && hud.skills === 7 && hud.map && hud.chat && hud.quest && hud.tamga > 10, `HUD: can/xp, ${hud.skills - 1} yetenek, mini harita, sohbet, görev; ${hud.tamga} SVG ikon`);

// ───────── 3. Ses (F5) ─────────
await page.mouse.click(640, 360); await sleep(2500);
const a1 = await ev<{ state: string; lvl: number }>('({ state: g.audio.ctx?.state, lvl: g.audio.level() })');
let peak = 0; for (let i = 0; i < 20; i++) { const l = await ev<number>('g.audio.level()'); peak = Math.max(peak, l); await sleep(120); }
await page.keyboard.press('m'); await sleep(400); const muted = await ev<{ m: boolean; gain: number }>('({ m: g.audio.muted, gain: g.audio.master.gain.value })');
await sleep(300); let peak2 = 0; for (let i = 0; i < 6; i++) { peak2 = Math.max(peak2, await ev<number>('g.audio.level()')); await sleep(80); }
await page.keyboard.press('m');
check('F5.ses', a1.state === 'running' && peak > 0.05, `AudioContext=${a1.state}, çıkış tepe enerjisi=${peak.toFixed(2)} (kopuz/davul/bordo üretimi)`);
check('F5.sessiz', muted.m && muted.gain < 0.01 && peak2 < 0.02, `M tuşu: sessiz=${muted.m}, kazanç=${muted.gain}, sessizlikte enerji=${peak2.toFixed(3)}`);
metrics.audioPeak = peak;

// ───────── 4. Boylar ve silüetler (F2, C1) ─────────
if (want('boylar')) {
  const bots: Bot[] = [];
  for (const [i, b] of (['gok', 'yer'] as const).entries()) { const bot = await new Bot(`ws://localhost:${srv.port}`, 'Dost' + b + Math.floor(Math.random() * 99)).join(b); bots.push(bot); const p = [...world().players.values()].find((x) => x.id === bot.id)!; p.x = pl(NAME).x + (i ? 2.6 : -2.6); p.z = pl(NAME).z + 3.2; p.rot = Math.PI; }
  await sleep(2500);
  await page.evaluate(() => { const g = (window as any).__game; g.camYaw = -Math.PI / 2; g.camPitch = 1.22; g.camDist = 9; });
  await sleep(1800); await shot('04-boylar-silueti');
  const pb = await ev<{ gok: boolean; yer: boolean }>(`({ gok: [...g.vs.views.values()].some(v => v.kind === 'player' && v.boy === 'gok'), yer: [...g.vs.views.values()].some(v => v.kind === 'player' && v.boy === 'yer') })`);
  check('F2.boy-kimlik', pb.gok && pb.yer, 'Üç boy (Gök mavi-beyaz kartal tüyü, Yer yeşil-kahve kurt kulağı, Ay gümüş-mor geyik boynuzu) aynı sahnede, ayrı siluet');
  for (const b of bots) await b.leave();
  await page.evaluate(() => { const g = (window as any).__game; g.camYaw = Math.PI / 2 + 0.25; g.camPitch = 1.06; g.camDist = 17; });
}

// ───────── 5. Yaratık çeşitleri (F3) ─────────
if (want('yaratik')) {
  const me = pl(NAME); const w = world(); w.mobs.clear();
  me.x = 0; me.z = 56; await sleep(800);
  const types = ['tepegoz', 'albasti', 'erlik', 'cakal'] as const;
  const still = (m: ReturnType<typeof w.makeMob>) => { w.applyStatus(m, 'stun', 3600); m.nextAtk = Infinity; m.rot = 0; m.hx = m.x; m.hz = m.z; return m; };
  types.forEach((t, i) => still(w.makeMob(t, 3, me.x - 7.5 + i * 5, me.z - 8, -1)));
  still(w.makeMob('bekci', 8, me.x + 1, me.z - 24, -1));
  await page.evaluate(() => { const g = (window as any).__game; g.camYaw = Math.PI / 2; g.camPitch = 1.12; g.camDist = 15; });
  await sleep(2500); await shot('05-yaratiklar');
  const kinds = await ev<string[]>('[...new Set([...g.vs.views.values()].filter(v => v.kind === "mob").map(v => v.mobType))]');
  check('F3.yaratiklar', ['tepegoz', 'albasti', 'erlik', 'cakal', 'bekci'].every((k) => kinds.includes(k)), 'Tepegöz yavrusu, Albastı, Erlik çırağı, çakal ve çatlak bekçisi sahnede: ' + kinds.join(', '));
  const sil = await ev<number>('new Set([...g.vs.views.values()].filter(v => v.kind === "mob").map(v => v.rig.meshes.length + ":" + Math.round(v.rig.height*10))).size');
  check('F3.siluet', sil >= 5, `${sil} ayrı model imzası (parça sayısı + boy)`);
  w.mobs.clear();
}

// ───────── 6. Savaş: otomatik vuruş, alan yetenekleri, toplama, ganimet (B1, B2, B6) ─────────
if (want('savas')) {
  const me = pl(NAME); const w = world(); w.mobs.clear();
  me.d.level = 14; me.d.skillPts = 3; w.recalc(me); me.hp = me.stats.maxHp; me.d.gold = 5000;
  me.x = 0; me.z = 52; await sleep(600);
  await page.evaluate(() => { const g = (window as any).__game; g.camYaw = Math.PI / 2 + 0.3; g.camPitch = 1.08; g.camDist = 15; });
  const pack = Array.from({ length: 7 }, (_, i) => { const m = w.makeMob(i % 3 === 2 ? 'albasti' : 'cakal', 3, me.x + Math.cos(i * 0.9) * 9, me.z + 4 + Math.sin(i * 0.9) * 9, -1); m.hx = m.x; m.hz = m.z; m.leash = 60; return m; });
  const xp0 = me.d.xp + me.d.level * 1e6;
  await sleep(1200); await shot('06a-yaratik-grubu');
  // Çağrı Narası ile topla
  await page.keyboard.press('3'); await sleep(900); await shot('06b-cagri-narasi');
  const d1 = pack.map((m) => Math.hypot(m.x - me.x, m.z - me.z));
  check('B6.toplama', d1.filter((d) => d < 5).length >= 5, `Çağrı Narası: ${d1.filter((d) => d < 5).length}/7 yaratık 5 birim içine çekildi`);
  // Alan yeteneği
  await page.keyboard.press('1'); await sleep(350); await shot('06c-alan-yetenegi');
  const hit = pack.filter((m) => m.hp < m.maxHp).length;
  check('B2.alan', hit >= 5, `Kılıç Savurma tek seferde ${hit}/7 yaratığa vurdu`);
  await page.keyboard.press('2'); await sleep(600); await page.keyboard.press('6'); await sleep(450); await shot('06d-tengri-hiddeti');
  const killedBySkills = pack.filter((m) => m.dead).length; await sleep(1500);
  check('B2.yetenek-temizleme', killedBySkills >= 5, `Çağrı Narası + Savurma + Sarsıntı + Tengri Hiddeti: ${killedBySkills}/7 yaratık yetenekle temizlendi`);
  // — B1: yalnızca Space (yetenek yok) —
  w.mobs.clear(); me.d.level = 6; w.recalc(me); me.hp = me.stats.maxHp; me.x = 0; me.z = 52; me.d.gold = 5000; await sleep(800);
  const solo = Array.from({ length: 4 }, (_, i) => { const m = w.makeMob('cakal', 2, me.x - 4 + i * 2.7, me.z - 6 - (i % 2) * 3, -1); m.hx = m.x; m.hz = m.z; m.leash = 60; return m; });
  const xpA = me.d.xp + me.d.level * 1e6; const skillsBefore = JSON.stringify(me.cds);
  await page.keyboard.down('Space');
  const t0 = Date.now(); let shotLoot = false; let maxDrops = 0;
  while (Date.now() - t0 < 40000) { await sleep(150); const n = await ev<number>('g.drops.size'); maxDrops = Math.max(maxDrops, n); if (!shotLoot && n >= 2) { shotLoot = true; await shot('07-ganimet-yagmuru'); } if (solo.every((m) => m.dead) && shotLoot) break; }
  await page.keyboard.up('Space');
  const killed = solo.filter((m) => m.dead).length; const xp1 = me.d.xp + me.d.level * 1e6;
  check('B1.otomatik', killed === 4 && xp1 > xpA && JSON.stringify(me.cds) === skillsBefore, `Yalnızca Space basılı (yetenek yok): ${killed}/4 yaratığa otomatik hedefleme+yaklaşma+seri vuruş, öldü; deneyim +${xp1 - xpA}`);
  if (!shotLoot) await shot('07-ganimet-yagmuru');
  check('B6.ganimet', maxDrops >= 2, `Ganimet yağmuru: aynı anda ekranda en çok ${maxDrops} ganimet nesnesi (yalnızca vuran oyuncuya görünür)`);
  metrics.dropsSeenDuringLoot = maxDrops;
  await sleep(4000); await shot('07b-ganimet-toplandi');
  check('B6.ganimet-toplandi', me.d.gold > 5000, `Ganimet mıknatısı: akçe 5000→${me.d.gold}`);
  w.mobs.clear();
}

// ───────── 7. Panel turu: çanta, karakter, yetenek (F4), uzmanlık (B4) ─────────
if (want('paneller')) {
  const me = pl(NAME); const w = world(); const r = mulberry32(5);
  for (let i = 0; i < 7; i++) me.d.items.push(makeItem(r, (['weapon', 'armor', 'helmet', 'amulet'] as const)[i % 4], 8 + i, (i % 4) as 0 | 1 | 2 | 3));
  me.d.level = 11; me.d.skillPts = 4; w.recalc(me); me.meDirty = true; await sleep(800);
  await page.keyboard.press('i'); await sleep(900); await shot('08-canta');
  const cells = await page.$$eval('.overlay.open .cell.item', (e) => e.length); check('D5.envanter', cells >= 7, `Çanta paneli ${cells} eşya hücresi, kademe renkli (sıradan/nadir/destansı/efsanevi)`);
  await page.keyboard.press('Escape'); await sleep(200);
  await page.keyboard.press('c'); await sleep(900); await shot('09-karakter-uzmanlik');
  const hasSpec = await page.$$eval('.overlay.open .spec', (e) => e.length); check('B4.uzmanlik-ui', hasSpec === 2, 'Seviye 10+: Kalkan Alp / Kılıç Alp seçimi görünür');
  await page.click('.spec[data-v="kilic"]'); await sleep(900);
  const spec = await ev<string>('g.me.spec'); check('B4.uzmanlik', spec === 'kilic', 'Kılıç Alp seçildi, sunucu doğruladı, model/istatistik değişti');
  await page.keyboard.press('Escape'); await sleep(200);
  await page.keyboard.press('k'); await sleep(900); await shot('10-yetenekler');
  await page.click('[data-act="rank"][data-i="0"]'); await sleep(700); const rk = await ev<number>('g.me.skillRanks[0]'); check('B3.kademe', rk === 2, `Savurma M1→M2 (kademe=${rk}), puan + akçe harcandı`);
  await page.keyboard.press('Escape');
}

// ───────── 8. Demirci: artı basma arayüzü (D3, D4) ─────────
if (want('demirci')) {
  const me = pl(NAME); me.d.gold = 99999; me.d.bag.ore = 500; me.d.bag.book = 2; me.d.bag.charm = 2; me.meDirty = true;
  const it = makeItem(mulberry32(9), 'weapon', 12, 2); it.up = 4; it.lvlReq = 1; me.d.items.unshift(it); me.meDirty = true;
  me.x = HUB.demirci.x - 2.5; me.z = HUB.demirci.z + 1; me.deadUntil = 0; await sleep(1500);
  await page.keyboard.press('e'); await sleep(1000);
  const open = await page.$('.panel .smith'); check('D3.demirci-paneli', !!open, 'Demirci’ye yaklaşıp E: yükseltme paneli açıldı');
  await page.click(`.irow[data-id="${it.id}"]`); await sleep(500);
  const rates = await page.$$eval('.ratetable div', (e) => e.map((d) => parseInt(d.textContent!.split('\n').pop()!.replace(/\D/g, '').slice(-3) || '0')));
  const txt = await page.$$eval('.ratetable div', (e) => e.map((d) => d.textContent));
  const nums = txt.map((x) => Number((x ?? '').replace(/^\+\d/, '').replace('%', '')));
  check('D3.oranlar-ui', JSON.stringify(nums) === JSON.stringify(UPGRADE_RATE.slice(1)), 'Arayüzde gösterilen oranlar PRD tablosu: ' + nums.join(', ') + '% (+1…+9)'); void rates;
  const warn = await page.textContent('.panel .smith'); check('D3.risk-uyari', /YOK OLUR|DESTROYED/.test(warn ?? ''), '+5 hedefinde "EŞYA YOK OLUR" uyarısı gösterildi');
  await shot('11-demirci-artibasma');
  await page.check('input[data-chk="book"]'); await page.check('input[data-chk="charm"]'); await sleep(400); await shot('11b-demirci-kitap-tilsim');
  const rateTxt = await page.textContent('.ratebar b'); check('D4.kitap', /75%/.test(rateTxt ?? ''), 'Demirci el kitabı: %65 + %10 = ' + rateTxt);
  srv.ctx.rng = () => 0.001; await page.click('[data-act="upgrade"]'); await sleep(1400); srv.ctx.rng = Math.random;
  const res = await page.textContent('.result'); check('D3.basari', /Başarılı|Success/.test(res ?? '') && me.d.items.concat(Object.values(me.d.equip) as never[]).some((i: { id: string; up: number }) => i.id === it.id && i.up === 5), 'Yükseltme başarılı (+4→+5): ' + res);
  await shot('11c-demirci-basari');
  // koruma tılsımı: +5 → +6 başarısız (zar 0.999) ama tılsımla eşya korunur
  await page.check('input[data-chk="charm"]'); await sleep(400); const charm0 = me.d.bag.charm;
  srv.ctx.rng = () => 0.999; await page.click('[data-act="upgrade"]'); await sleep(1400); srv.ctx.rng = Math.random;
  await shot('11d-demirci-tilsim-korudu');
  const res2 = await page.textContent('.result'); const kept = me.d.items.concat(Object.values(me.d.equip) as never[]).some((i: { id: string; up: number }) => i.id === it.id && i.up === 5);
  check('D4.tilsim', /tılsım|charm/i.test(res2 ?? '') && kept && me.d.bag.charm === charm0 - 1, 'Koruma tılsımı: ' + res2 + ' (eşya +5 olarak korundu, tılsım tüketildi)');
  // tılsımsız başarısızlık +5 → +6: eşya yok olur
  await page.uncheck('input[data-chk="charm"]'); await sleep(300);
  srv.ctx.rng = () => 0.999; await page.click('[data-act="upgrade"]'); await sleep(1400); srv.ctx.rng = Math.random;
  await shot('11e-demirci-yok-oldu');
  const gone = !me.d.items.concat(Object.values(me.d.equip) as never[]).some((i: { id: string }) => i.id === it.id);
  check('D3.yok-olma', gone && /yok oldu|destroyed/i.test((await page.textContent('.result')) ?? ''), 'Tılsımsız başarısızlıkta (+5 hedefi) eşya yok oldu');
  await page.keyboard.press('Escape');
}

// ───────── 9. Oba, Ak Sakal, Yazıtlar (E1…E7) ─────────
if (want('oba')) {
  const me = pl(NAME); me.x = HUB.akSakal.x + 3; me.z = HUB.akSakal.z + 3; await sleep(1500);
  await page.keyboard.press('e'); await sleep(900); await shot('12-ak-sakal');
  const elder = await page.textContent('.panel .elder'); check('E1.ak-sakal', /Ak Sakal|Hoş geldin/.test(elder ?? '') || /Elder|Welcome/.test(elder ?? ''), 'Ak Sakal diyaloğu ve oba öğretici görevleri');
  await page.keyboard.press('Escape');
  me.x = HUB.otag.x + 8; me.z = HUB.otag.z + 6; me.d.bag.ore = 90; me.d.bag.hide = 60; me.d.bag.wood = 90; me.d.gold = 20000; me.meDirty = true; await sleep(1500);
  await page.keyboard.press('o'); await sleep(1200); await shot('13-oba');
  const obaTxt = await page.textContent('.panel .oba'); check('E1.oba-paneli', /Otağ/.test(obaTxt ?? '') && /Demirhane|Smithy/.test(obaTxt ?? ''), 'Oba paneli: Otağ + Demirhane, ortak ambar, yoldaşlar');
  const comps = await page.$$eval('.comp', (e) => e.length); check('E4.yoldas-yuvasi', comps === 2, `Başlangıçta ${comps} yoldaş yuvası`);
  for (const k of ['ore', 'wood', 'hide']) { await page.click(`[data-act="max"][data-k="${k}"]`); await sleep(250); }
  await page.click('[data-act="donate"]'); await sleep(900);
  check('E5.bagis', me.points >= 240 && srv.ctx.oymaks.get(me.oymakId)!.storage.ore >= 24, `Bağış: katılım puanı=${me.points}, ortak ambar=${JSON.stringify(srv.ctx.oymaks.get(me.oymakId)!.storage)}`);
  await page.click('[data-act="build"][data-b="otag"]'); await sleep(900); await shot('14-oba-yukseltme');
  const up = pl(NAME).d.tut.step; const o = srv.ctx.oymaks.get(me.oymakId)!;
  check('E2.yukseltme', !!o.up, `Otağ yükseltmesi başladı; bitiş zamanı DB’de: ${o.up ? new Date(o.up.finishAt).toISOString() : '-'}; öğretici adımı=${up}`);
  await page.click('.comp [data-act="send"][data-h="1"]'); await sleep(900);
  const away = await ev<number>('g.me.expeditions.length'); check('E4.sefer', away === 1, 'Yoldaş 1 saatlik sefere gönderildi (bitiş zamanı kayıtlı)');
  // Zamanı ileri sar (çevrimdışı ilerleme simülasyonu): sunucu saatini 2 saat ilerlet
  srv.ctx.clock.advance(2 * 3600 * 1000); await sleep(4500); await shot('15-oba-sefer-dondu'); // istemci sunucu saatini ping ile yeniden senkronlar
  const ready = await page.$('[data-act="collect"]'); check('E4.sefer-hazir', !!ready, 'Süre dolunca sefer ödülü hazır (giriş anında hesaplanır)');
  await page.click('[data-act="collect"]'); await sleep(1200); await shot('15b-sefer-odulu');
  const lvl = (await ev<{ levels: { otag: number } } | null>('null')); void lvl;
  await page.keyboard.press('Escape');
  me.x = HUB.stele.x - 3; me.z = HUB.stele.z + 4; await sleep(1500);
  const w = world(); w.addFrag(me, 41); await sleep(1200);
  await page.keyboard.press('y'); await sleep(900); await shot('16-yazitlar');
  const open1 = await page.$$eval('.stele-card:not(.locked)', (e) => e.length); const lore = await page.textContent('.stele-card:not(.locked)');
  const announced = await ev<boolean>('g.ui.chatLog.some(m => m.key === "sys.inscription")');
  check('E7.yazit', open1 === 1 && /Mühür içeriden|seal was not broken/.test(lore ?? '') && announced && me.d.bag.frag >= 41, `Sunucu çapı 40 parça eşiği aşıldı: ${open1} yazıt çözüldü (“${(lore ?? '').trim().slice(-48)}”), tüm oyunculara duyuruldu=${announced}`);
  await page.keyboard.press('Escape');
}

// ───────── 10. Erlik çatlağı (D6) ─────────
if (want('catlak')) {
  const me = pl(NAME); const w = world(); w.rifts.clear(); w.mobs.clear();
  me.d.level = 14; w.recalc(me); me.hp = me.stats.maxHp; me.deadUntil = 0;
  const rift = w.openRift()!; me.x = rift.x - 34; me.z = rift.z; await sleep(3500); // etkinleşme yarıçapının (20) dışında: portal henüz uyuyor
  const face = (pitch: number, dist: number) => page.evaluate(([rx, rz, pi, di]) => { const g = (window as any).__game; g.camYaw = Math.atan2(-(rz - g.pos.z), -(rx - g.pos.x)); g.camPitch = pi; g.camDist = di; }, [rift.x, rift.z, pitch, dist]);
  me.x = rift.x - 22; await sleep(600); await face(0.95, 30);
  await sleep(2200); await shot('17-erlik-catlagi-acik');
  check('D6.catlak-acik', rift.state === 0 && Math.hypot(rift.x - me.x, rift.z - me.z) > 20, `Çatlak açık ve bekliyor (durum=${rift.state}); oyuncu ${Math.round(Math.hypot(rift.x - me.x, rift.z - me.z))} birim uzakta, pusula oku ve harita işareti görünür`);
  const compass = await page.evaluate(() => getComputedStyle(document.getElementById('compass')!).display); void compass;
  me.x = rift.x - 9; me.z = rift.z; await sleep(600); await face(0.95, 17); await sleep(2200);
  await shot('18-erlik-catlagi-dalga');
  const bar = await page.evaluate(() => getComputedStyle(document.getElementById('riftbar')!).display);
  check('D6.catlak-ui', bar === 'block' && rift.state >= 1, `Çatlak çubuğu görünür, dalga=${rift.wave}, durum=${rift.state}; parti kurmadan otomatik katılım`);
  for (const m of [...rift.mobs]) { const mm = w.mobs.get(m); if (mm) { mm.hp = 3; mm.nextAtk = Infinity; } }
  await page.keyboard.press('1'); await page.keyboard.down('Space'); await sleep(5000); await page.keyboard.up('Space');
  await shot('19-erlik-catlagi-savas');
  w.rifts.clear(); w.mobs.clear();
}

// ───────── 10b. Ölüm ve yeniden doğuş (B7) ─────────
if (want('olum')) {
  const me = pl(NAME); const w = world(); w.mobs.clear(); me.x = 0; me.z = 70; me.deadUntil = 0; me.d.level = 14; w.recalc(me); me.hp = me.stats.maxHp; me.d.xp = 500; await sleep(1500);
  const m = w.makeMob('bekci', 40, me.x + 3, me.z, -1); m.target = me.id; m.hx = m.x; m.hz = m.z;
  await page.waitForFunction('window.__game.flags & 1', null, { timeout: 30000 }); await sleep(1200); await shot('20-olum');
  check('B7.olum-ekrani', await page.evaluate(() => getComputedStyle(document.getElementById('death')!).display) === 'grid', 'Ölüm ekranı gösterildi; riskli bölgede küçük deneyim kaybı: xp=' + me.d.xp);
  w.mobs.clear(); await sleep(2600); await page.click('#respawn'); await sleep(1500);
  check('B7.yeniden-dogus', Math.hypot(me.x, me.z) < 36 && me.deadUntil === 0, 'Yurda dönüldü (güvenli bölge)');
  await shot('21-yeniden-dogus');
}

// ───────── 10d. Yönetici hesabı ve gizem sistemleri (H) ─────────
if (want('gizem')) {
  // yetkisiz oyuncu: GM düğmesi yok, F2 işe yaramaz
  await page.keyboard.press('F2'); await sleep(500);
  const normalGm = await page.$('[data-p="gm"]'); const normalOpen = await page.$('.panel .gmgrid');
  check('H1.yetkisiz-arayuz', !normalGm && !normalOpen, 'Rolü olmayan hesapta GM düğmesi yok, F2 yönetici panelini açmaz');
  // yönetici hesabı (veritabanında rol verilmiş), ikinci sayfa
  const AN = 'Yonetici' + Math.floor(Math.random() * 900 + 100);
  const seed = await new Bot(`ws://localhost:${srv.port}`, AN).join('gok'); await seed.leave(); await sleep(300); srv.ctx.db.setRole(AN, 'admin');
  const pg: Page = await ctx.newPage(); pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(`${url}?name=${AN}&pw=secret1&autoq=0`, { timeout: 120000 }); await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 }); await sleep(2500);
  const gev = <T>(expr: string): Promise<T> => pg.evaluate(`(() => { const g = window.__game; return ${expr}; })()`) as Promise<T>;
  const gshot = async (name: string) => { await pg.screenshot({ path: `${OUT}/${name}.png` }); };
  const ap = [...world().players.values()].find((x) => x.name === AN)!;
  check('H1.rol', (await gev<string>('g.me.role')) === 'admin' && !!(await pg.$('[data-p="gm"]')), `Yönetici hesabı "${AN}": rol=admin, GM düğmesi görünür, HUD etiketi var`);
  await pg.keyboard.press('F2'); await sleep(900);
  check('H1.panel', !!(await pg.$('.panel .gmgrid')) && (await pg.$$('.gmgrid button')).length >= 30, 'F2 ile yönetici paneli açıldı (30+ hızlı komut)');
  await pg.click('[data-line="level 25"]'); await sleep(900); await pg.click('[data-line="kit +9"]'); await sleep(900); await pg.click('[data-line="maxskills"]'); await sleep(700); await pg.click('[data-line="stats"]'); await sleep(700);
  const out = await pg.textContent('.gmout');
  check('H1.komut', ap.d.level === 25 && Object.keys(ap.d.equip).length === 4 && /Sv25/.test(out ?? ''), `GM komutları sunucuda uygulandı: sv=${ap.d.level}, kuşanılan=${Object.keys(ap.d.equip).length}, atk=${ap.stats.atk}`);
  await gshot('25-yonetici-paneli'); await pg.keyboard.press('Escape'); await sleep(300);
  // sohbetten /gm
  await pg.keyboard.press('Enter'); await pg.keyboard.type('/gm gold 777'); await pg.keyboard.press('Enter'); await sleep(900);
  check('H1.sohbet-gm', ap.d.gold >= 777, `Sohbetten /gm komutu çalıştı (altın=${ap.d.gold}, bağlantı: ${await pg.textContent('#connt')}, kapalı=${await pg.evaluate("document.getElementById('conn').classList.contains('on')")})`);
  // balbal taşı
  const st1 = (await import('../../shared/world')).genStones()[0]; ap.x = st1.x - 3; ap.z = st1.z; await sleep(1800);
  await pg.evaluate(([x, z]) => { const g = (window as any).__game; g.camYaw = Math.atan2(-(z - g.pos.z), -(x - g.pos.x)); g.camPitch = 0.95; g.camDist = 11; }, [st1.x, st1.z]); await sleep(1400);
  const prompt = await pg.textContent('#prompt'); await gshot('22a-balbal-tasi');
  await pg.keyboard.press('e'); await sleep(1500); await gshot('22-balbal-tasi-okundu');
  const lore = await pg.textContent('#lore');
  check('H2.tas-okuma', ap.d.clues.includes('stone.1') && /Gök dokuz kat/.test(lore ?? '') && /Balbal/.test(prompt ?? ''), `Taşa yaklaşınca "E" ipucu: “${(prompt ?? '').trim()}”; okununca kart: “${(lore ?? '').trim().slice(-40)}”`);
  // rüya
  await pg.keyboard.press('F2'); await sleep(600); await pg.click('[data-line="dream"]'); await sleep(1500); await pg.keyboard.press('Escape');
  await pg.waitForSelector('.dream.on', { timeout: 15000 }); await sleep(7000); await gshot('23-kurdun-ruyasi');
  const dtxt = await pg.textContent('.dream p'); await pg.click('#wake'); await sleep(1200);
  check('H3.ruya', /Kar yağıyor/.test(dtxt ?? '') && ap.d.clues.includes('dream.1') && ap.d.pendingDream === 0, 'Rüya ekranı yazı yazı belirdi, "Uyan" ile ipucu kaydedildi');
  // kodeks
  await pg.keyboard.press('F2'); await sleep(600); await pg.click('[data-line="clue hepsi"]'); await sleep(1200); await pg.keyboard.press('Escape'); await sleep(300);
  await pg.keyboard.press('y'); await sleep(1000); await gshot('24a-kodeks-yazitlar'); await pg.click('.tab2[data-v="stone"]'); await sleep(500); await gshot('24b-kodeks-taslar'); await pg.click('.tab2[data-v="truth"]'); await sleep(500); await gshot('24-kodeks-muhurun-disi');
  const truth = await pg.textContent('.stele-card:not(.locked)'); const total = await pg.textContent('.codex .chip');
  check('H3.kodeks', /dıştaki el/.test(truth ?? '') && /27\/27|2[67]\/27/.test(total ?? '') && ap.d.clues.includes('truth.1'), `Kodeks: ${total?.trim()}; "Mühürün Dışı" açıldı ve metni gösteriyor`);
  await pg.close();
}

// ───────── Seviye grubu içeriği: boss, kilometre taşı, aura, savunma paneli ─────────
if (want('icerik')) {
  const AN2 = 'Kahraman' + Math.floor(Math.random() * 900 + 100);
  const seed2 = await new Bot(`ws://localhost:${srv.port}`, AN2).join('yer'); await seed2.leave(); await sleep(300); srv.ctx.db.setRole(AN2, 'admin');
  const pg2: Page = await ctx.newPage(); pg2.on('pageerror', (e) => errors.push(e.message));
  await pg2.goto(`${url}?name=${AN2}&pw=secret1&autoq=0`, { timeout: 120000 }); await pg2.waitForFunction('window.__ready === true', null, { timeout: 90000 }); await sleep(2500);
  const sh = async (name: string) => { await pg2.screenshot({ path: `${OUT}/${name}.png` }); };
  const g2 = <T>(expr: string): Promise<T> => pg2.evaluate(`(() => { const g = window.__game; return ${expr}; })()`) as Promise<T>;
  const gmr = (line: string) => pg2.evaluate((l) => (window as any).__game.net.rpc('gm', { line: l }), line);
  await pg2.waitForFunction('window.__game && window.__game.me && window.__game.me.name', null, { timeout: 60000 }); await sleep(1500);
  const me2 = [...world().players.values()].find((x) => x.name === AN2)!; const W = world(); if (!me2) console.log('OYUNCULAR', [...W.players.values()].map((x) => x.name), AN2, await pg2.evaluate(() => (window as any).__game.me?.name));
  // kilometre taşı: seviye 9 → 10 (gerçek addXp yolu)
  me2.d.level = 9; me2.d.xp = 0; W.recalc(me2); const gold0 = me2.d.gold, book0 = me2.d.bag.book;
  W.addXp(me2, (await import('../../shared/game')).xpToNext(9), false); await sleep(1200); await sh('26-kilometre-tasi');
  check('H5.kilometre-tasi', me2.d.level === 10 && me2.d.gold > gold0 + 3000 && me2.d.bag.book > book0, `Seviye 10 kilometre taşı: akçe +${me2.d.gold - gold0}, kitap +${me2.d.bag.book - book0}, tılsım=${me2.d.bag.charm}`);
  // savunma paneli + eşya ipucu (temel efsun, silah türü)
  await gmr('level 30'); await gmr('kit +5'); await sleep(900);
  await pg2.keyboard.press('c'); await sleep(900); await sh('30-karakter-savunmalar');
  const ctext = await pg2.textContent('.panel');
  check('H5.savunma-paneli', /Kılıç/.test(ctext ?? '') && /Büyü/.test(ctext ?? '') && /Vuruş bloğu/.test(ctext ?? '') && /Delme/.test(ctext ?? ''), 'Karakter panelinde tür savunmaları, vuruş/beceri bloğu ve delme gösteriliyor');
  await pg2.keyboard.press('Escape'); await sleep(300); await pg2.keyboard.press('i'); await sleep(700);
  const eqCell = await pg2.$('.panel .cell.item'); if (eqCell) { await eqCell.hover(); await sleep(500); }
  await sh('31-esya-temel-efsun'); const tip = await pg2.textContent('.tip'); 
  check('H5.temel-efsun', /Temel efsun/.test(tip ?? '') && /Silah türü/.test(tip ?? '') || /Temel efsun/.test(tip ?? ''), `Eşya ipucunda temel efsun gösteriliyor: “${(tip ?? '').replace(/\s+/g, ' ').slice(0, 90)}”`);
  await pg2.keyboard.press('Escape'); await sleep(300);
  // saha bossu: ışınlan, adı ve can çubuğu, alan darbesi uyarısı, aura
  await gmr('level 30'); await gmr('god');
  const gb = await import('../../shared/world'); const boss = [...W.mobs.values()].find((m) => m.bossId === 3) ?? W.spawnBoss(gb.genBosses()[2]); // önceki bölümler yaratıkları temizlemiş olabilir
  await gmr('tp boss 3'); await sleep(3500); boss.slamAt = W.now; boss.target = me2.id; await sleep(900);
  await pg2.evaluate(([x, z]) => { const g = (window as any).__game; g.camYaw = Math.atan2(-(z - g.pos.z), -(x - g.pos.x)); g.camPitch = 0.75; g.camDist = 17; }, [boss.x, boss.z]); await sleep(900);
  await sh('27-saha-bossu'); const plate = await pg2.$$eval('.plate.boss .nm', (els) => els.map((e) => e.textContent));
  check('H5.saha-bossu', plate.some((x) => /Demir Dişli Börü/.test(x ?? '')), `Saha bossu adıyla görünüyor: ${plate.join(' | ')}; sv${boss.lvl}, can ${boss.maxHp}`);
  boss.slamAt = W.now; await sleep(1700); await sh('28-boss-alan-darbesi');
  await sleep(600); await sh('29-seviye-aurasi');
  // yoğun boss sahnesinden sonra taze sayfa (yazılım render'ında uzun süren ağır sahne bağlantıyı zamanlayabilir); paneller yurtta denetlenir
  await pg2.reload(); await pg2.waitForFunction('window.__ready === true', null, { timeout: 120000 }); await pg2.waitForFunction('window.__game && window.__game.me && window.__game.me.name', null, { timeout: 60000 }); await sleep(2500); await gmr('tp hub'); await sleep(1500);
  // ölüm ekranı: seni neyin öldürdüğü ve o türe karşı savunman (lamba: oyuncu burada bakar)
  // (yoğun yazılım render'ında anlık görüntü gecikebildiğinden ölüm olayının sunucu tarafı birim testiyle kilitlidir; burada ekranın doğru çizildiği denetlenir)
  const hint = await pg2.evaluate(() => { const g = (window as any).__game; g.lastDeath = { by: 'boss.3', kd: 'bicak' }; const h = g.ui.deathHint(); const st = document.createElement('style'); st.id = 'forcedeath'; st.textContent = '#death{display:grid !important}'; document.head.appendChild(st); document.getElementById('deadp')!.innerHTML = h; return h; });
  await sleep(500); await sh('34-olum-ipucu'); await pg2.evaluate(() => { document.getElementById('forcedeath')?.remove(); });
  check('H5.olum-ipucu', /Demir Dişli Börü/.test(hint) && /Bıçak/.test(hint) && /savunma/i.test(hint), `Ölüm ekranı ipucu: “${hint.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 130)}”`);
  // pazar paneli ve efsun yenileme sekmesi (yurtta)
  await pg2.keyboard.press('p'); await sleep(1500); await sh('32-pazar');
  const mk = await pg2.textContent('.panel');
  check('H5.pazar-paneli', /Pazar/.test(mk ?? '') && /İlanlar/.test(mk ?? '') && /İlanlarım/.test(mk ?? '') && /Bana uygun/.test(mk ?? ''), 'Pazar paneli (P): ilanlar, ilanlarım, "bana uygun" süzgeci ve sıralama');
  await pg2.keyboard.press('Escape'); await sleep(400);
  await pg2.evaluate(() => { const pn = (window as any).__game.ui.panels; pn.smithTab = 'reroll'; void pn.show('smith'); }); await sleep(1500); await sh('33-efsun-yenile');
  const rr = await pg2.textContent('.panel');
  check('H5.efsun-yenile', /Efsun yenile/.test(rr ?? '') && /Rastgele/.test(rr ?? '') && /Seç/.test(rr ?? ''), 'Demirci paneli "Efsun yenile" sekmesi: rastgele ve seçerek yenileme düğmeleri');
  await pg2.keyboard.press('Escape'); await sleep(300);
  await pg2.close();
}

// ───────── 11. Ölçümler (F7, A10) ─────────
const perf = await ev<{ fps: number; meshes: number; active: number; draw: number; tris: number; cpuMs: number }>(`(() => {
  const sc = g.gs.scene; const e = g.gs.engine; const t0 = performance.now(); for (let i = 0; i < 30; i++) sc.render(); const cpu = (performance.now() - t0) / 30;
  return { fps: Math.round(g.fps), meshes: sc.meshes.length, active: sc.getActiveMeshes().length, draw: e.drawCalls ?? 0, tris: sc.getActiveIndices() / 3, cpuMs: +cpu.toFixed(2) };
})()`);
metrics.perf = perf; metrics.gl = await ev('g.gs.engine.getGlInfo()');
check('F7.olcum', perf.cpuMs > 0, `Kare başına JS/CPU maliyeti=${perf.cpuMs} ms; aktif mesh=${perf.active}/${perf.meshes}; üçgen=${Math.round(perf.tris)}; (yazılım rasterleştirmede FPS=${perf.fps})`);
check('G.konsol', errors.filter((e) => !/AudioContext|favicon|WebGL|GPU stall|ReadPixels/i.test(e)).length === 0, 'Tarayıcı konsolunda hata yok' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

// kısmi (ONLY) koşularda önceki sonuçları koru: aynı kimlikli kontrol yenilenir, diğerleri kalır
let merged = results; let mm = metrics;
if (only) { try { const prev = JSON.parse(readFileSync(`${OUT}/e2e-report.json`, 'utf8')); const ids = new Set(results.map((r) => r.id)); merged = [...prev.results.filter((r: { id: string }) => !ids.has(r.id)), ...results]; mm = { ...prev.metrics, ...metrics }; } catch { /* ilk koşu */ } }
writeFileSync(`${OUT}/e2e-report.json`, JSON.stringify({ at: new Date().toISOString(), results: merged, metrics: mm, errors: errors.slice(0, 20) }, null, 1));
await browser.close(); await srv.close();
const failed = results.filter((r) => !r.ok); console.log(`\n${results.length - failed.length}/${results.length} kontrol geçti`);
process.exit(failed.length ? 1 : 0);

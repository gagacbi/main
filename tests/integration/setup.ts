import { afterEach } from 'vitest';
import { leaveAll } from './helpers';

// Başarısız bir test oyuncuları açık bırakırsa sonraki testi etkilemesin.
afterEach(async () => { await leaveAll(); });

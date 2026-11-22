// R3 save boundary. Never hydrate arbitrary unit IDs, script instructions or callbacks.
const ALLOWED_FOES = { "foe-1": "Ash Wisp", "foe-2": "Briar Sentinel" };
const bounded = (n, min, max, fallback) =>
  Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
const validCoord = n => Number.isSafeInteger(n) && n >= 0 && n < 7;
const plain = v => v && typeof v === 'object' && !Array.isArray(v);

export function normalizeCombat(raw, session) {
  if (!plain(raw) || raw.version !== 1 || raw.scene_id !== session?.sceneId ||
      !['active','won','lost'].includes(raw.status) || !Array.isArray(raw.units)) return null;
  const expected = ['hero', ...(session.companions || []), 'foe-1', 'foe-2'];
  if (raw.units.length !== expected.length ||
      expected.some(id => raw.units.filter(unit => unit?.id === id).length !== 1)) return null;
  const places = new Set();
  const units = [];
  for (const id of expected) {
    const u = raw.units.find(item => item?.id === id);
    if (!plain(u) || !validCoord(u.x) || !validCoord(u.y) ||
        !Number.isSafeInteger(u.hp) || !Number.isSafeInteger(u.max_hp) ||
        u.max_hp < 1 || u.max_hp > 30 || u.hp < 0 || u.hp > u.max_hp) return null;
    const side = id.startsWith('foe-') ? 'enemy' : 'ally';
    const key = u.x + ',' + u.y;
    if (u.hp > 0 && places.has(key)) return null;
    if (u.hp > 0) places.add(key);
    const label = id === 'hero' ? session.hero.name : (ALLOWED_FOES[id] || id);
    units.push({ id, name: label.slice(0, 60), side, x: u.x, y: u.y, hp: u.hp, max_hp: u.max_hp,
      guarded: Boolean(u.guarded) });
  }
  if (units[0].hp !== session.hp) return null;
  const status = raw.status;
  const anyEnemy = units.some(u => u.side === 'enemy' && u.hp > 0);
  const heroAlive = units[0].hp > 0;
  if (status === 'active' && (!anyEnemy || !heroAlive)) return null;
  if (status === 'won' && anyEnemy) return null;
  if (status === 'lost' && heroAlive) return null;
  const round = bounded(raw.round, 1, 500, 1);
  const seq = bounded(raw.seq, 0, 5000, 0);
  const acted = Array.isArray(raw.acted)
    ? [...new Set(raw.acted.filter(id => expected.includes(id) && !id.startsWith('foe-')))]
    : [];
  let pending = null;
  const p = raw.pending;
  if (status === 'active' && plain(p) &&
      p.actor_id !== 'hero' && session.companions.includes(p.actor_id) &&
      typeof p.option_id === 'string' && p.option_id.length <= 48 &&
      ['local', 'model'].includes(p.source) && plain(p.anchor) &&
      p.anchor.scene_id === session.sceneId && p.anchor.turn === session.turn &&
      p.anchor.seed === session.seed && p.anchor.seq === seq && p.anchor.round === round) {
    pending = { actor_id: p.actor_id, option_id: p.option_id, source: p.source,
      anchor: { scene_id: session.sceneId, turn: session.turn, seed: session.seed, seq, round } };
  }
  return { version: 1, scene_id: session.sceneId, status, round, seq, units, acted, pending };
}

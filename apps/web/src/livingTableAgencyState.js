// Portable, bounded R2 companion memory and proposal schema.
// This module intentionally does not depend on a model or the game reducer.
const IDS = new Set(['mira', 'kael', 'nessa', 'bram', 'iri']);
const SKILLS = new Set(['perception', 'survival', 'insight', 'arcana', 'persuasion', 'stealth', 'athletics']);
const clean = (s, max) => typeof s === 'string' ? s.trim().slice(0, max) : '';

export function emptyAgency() {
  return { goals: {}, memories: {}, pending: null };
}

export function normalizeAgency(raw, session) {
  const result = emptyAgency();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  const goals = raw.goals && typeof raw.goals === 'object' && !Array.isArray(raw.goals) ? raw.goals : {};
  const memories = raw.memories && typeof raw.memories === 'object' && !Array.isArray(raw.memories) ? raw.memories : {};
  for (const id of IDS) {
    const goal = clean(goals[id], 160);
    if (goal) result.goals[id] = goal;
    if (Array.isArray(memories[id])) {
      const list = memories[id].slice(-12).map(m => {
        if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
        const note = clean(m.note, 240);
        if (!note) return null;
        return {
          note,
          visibility: m.visibility === 'party' ? 'party' : 'private',
          source: m.source === 'approved_turn' ? 'approved_turn' : 'player',
          at_turn: Number.isSafeInteger(m.at_turn) && m.at_turn >= 0 ? m.at_turn : 0,
          scene_id: clean(m.scene_id, 64)
        };
      }).filter(Boolean);
      if (list.length) result.memories[id] = list;
    }
  }
  const p = raw.pending;
  if (p && typeof p === 'object' && !Array.isArray(p) &&
      IDS.has(p.actor_id) && session?.companions?.includes(p.actor_id) &&
      p.action === 'investigate' && SKILLS.has(p.skill) &&
      p.anchor && typeof p.anchor === 'object' &&
      p.anchor.scene_id === session.sceneId &&
      p.anchor.turn === session.turn && p.anchor.seed === session.seed) {
    result.pending = {
      actor_id: p.actor_id, action: 'investigate', skill: p.skill,
      intent: clean(p.intent, 220) || 'Investigate this location.',
      source: p.source === 'model' ? 'model' : 'local',
      anchor: { scene_id: session.sceneId, turn: session.turn, seed: session.seed }
    };
  }
  return result;
}

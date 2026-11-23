import { emptyAgency, normalizeAgency } from './livingTableAgencyState.js';
import { normalizeCombat } from './livingTableCombatState.js';
import { normalizeEncounter } from './livingTableEncounters.js';

// Living Table R1: deterministic gameplay is the only authority over campaign state.
// AI narration is stored separately and cannot write rolls, inventory, or world facts.
export const SAVE_KEY = 'porchquest369.livingTable.v1';
export const SKILLS = ['perception', 'survival', 'insight', 'arcana', 'persuasion', 'stealth', 'athletics'];

export const HEROES = [
  { id: 'seeker', name: 'Lantern Seeker', bonus: 3, skill: 'perception', hp: 12, item: 'Blue lantern' },
  { id: 'warden', name: 'Porch Warden', bonus: 2, skill: 'athletics', hp: 16, item: 'Lantern shield' },
  { id: 'scout', name: 'Hill Scout', bonus: 3, skill: 'survival', hp: 11, item: 'Trail bow' },
  { id: 'bard', name: 'Memory Bard', bonus: 2, skill: 'persuasion', hp: 12, item: 'Story book' }
];

export const COMPANIONS = [
  { id: 'mira', name: 'Mira', role: 'Wayfinder', skill: 'survival', character: 'Protective, resourceful, quietly funny. She asks before taking risks.' },
  { id: 'kael', name: 'Kael', role: 'Rune Scholar', skill: 'arcana', character: 'Curious and skeptical, fascinated by ancient symbols.' },
  { id: 'nessa', name: 'Nessa', role: 'Lantern Keeper', skill: 'perception', character: 'Patient observer, gentle wit, notices what others overlook.' },
  { id: 'bram', name: 'Bram', role: 'Guardian', skill: 'athletics', character: 'Loyal, cautious, straightforward and fond of terrible jokes.' },
  { id: 'iri', name: 'Iri', role: 'Diplomat', skill: 'persuasion', character: 'Warm, incisive, sees both sides and values promises.' }
];

export const STARTER_PACK = {
  schema: 'porchquest.route_pack.v1',
  id: 'living-blackwood',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'Follow the blue lanterns through a remembered forest.',
  scenes: [
    { id: 'porch', title: 'The Old Porch', act: 'I', text: 'Rain taps on weathered boards. A blue lantern has gone missing.', skill: 'perception', dc: 11, reward: 'A footprint beside the rail' },
    { id: 'trail', title: 'The Rain Trail', act: 'I', text: 'Pale roots cross a wet trail. A bell rings somewhere uphill.', skill: 'survival', dc: 12, reward: 'A sign of recent travelers' },
    { id: 'hill', title: 'Blackwood Hill', act: 'II', text: 'Ruins rise through the mist. A lantern flickers behind an iron gate.', skill: 'arcana', dc: 14, reward: 'An old mark on the iron gate' }
  ],
  edges: [
    { id: 'porch-trail', from: 'porch', to: 'trail', label: 'Follow the lantern trail' },
    { id: 'trail-hill', from: 'trail', to: 'hill', label: 'Climb toward the ruins' },
    { id: 'hill-trail', from: 'hill', to: 'trail', label: 'Return to the trail' },
    { id: 'trail-porch', from: 'trail', to: 'porch', label: 'Return to the porch' }
  ],
  quests: [{ id: 'missing-lantern', title: 'Discover where the lantern went' }],
  npcs: [],
  rewards: []
};

const text = (value, limit = 240) => String(value ?? '').trim().slice(0, limit);
const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function normalizePack(input) {
  const candidate = plainObject(input) ? input : STARTER_PACK;
  const scenes = Array.isArray(candidate.scenes) ? candidate.scenes.slice(0, 80)
    .filter(s => plainObject(s) && typeof s.id === 'string' && typeof s.title === 'string')
    .map(s => ({ id: text(s.id, 64), title: text(s.title, 120), text: text(s.text, 900),
      act: text(s.act, 20), skill: SKILLS.includes(s.skill) ? s.skill : 'perception',
      dc: Math.max(5, Math.min(25, Number(s.dc) || 12)), reward: text(s.reward, 180) })) : [];
  const validScenes = scenes.filter((s, i) => s.id && scenes.findIndex(x => x.id === s.id) === i);
  if (!validScenes.length) return structuredClone(STARTER_PACK);
  const ids = new Set(validScenes.map(s => s.id));
  const edges = (Array.isArray(candidate.edges) ? candidate.edges : []).slice(0, 250)
    .filter(e => plainObject(e) && ids.has(e.from) && ids.has(e.to))
    .map(e => ({ id: text(e.id || e.from + '-' + e.to, 90),
      from: text(e.from, 64), to: text(e.to, 64), label: text(e.label || 'Travel', 120),
      condition: text(e.condition, 140) }));
  return { schema: 'porchquest.route_pack.v1', id: text(candidate.id || 'custom-world', 64),
    title: text(candidate.title || 'Untitled World', 140), summary: text(candidate.summary, 500),
    scenes: validScenes, edges, quests: [], npcs: [], rewards: [] };
}

export function nextDie(seed) {
  const nextSeed = ((Number(seed) >>> 0) * 1664525 + 1013904223) >>> 0;
  return { seed: nextSeed, value: (nextSeed % 20) + 1 };
}

export function createSession(inputPack, heroId = 'seeker', name = '') {
  const pack = normalizePack(inputPack);
  const preset = HEROES.find(h => h.id === heroId) || HEROES[0];
  const hero = { ...preset, name: text(name, 60) || preset.name };
  return { version: 1, pack, hero, seed: 369, turn: 0, sceneId: pack.scenes[0].id, hp: preset.hp,
    inventory: [preset.item], clues: [], companions: [], facts: [], narration: [], agency: emptyAgency(), combat: null, encounterDesign: null,
    history: [{ type: 'start', turn: 0, message: hero.name + ' begins ' + pack.title + '.' }] };
}

export function currentScene(session) {
  return session.pack.scenes.find(s => s.id === session.sceneId) || session.pack.scenes[0];
}

export function exits(session) {
  return session.pack.edges.filter(e => e.from === session.sceneId);
}

function record(session, entry) {
  return { ...session, history: [...session.history, { turn: session.turn, ...entry }].slice(-100) };
}

export function recruit(session, companionId) {
  if (session.combat?.status === 'active') return session;
  const companion = COMPANIONS.find(c => c.id === companionId);
  if (!companion || session.companions.includes(companionId) || session.companions.length >= 3) return session;
  return record({ ...session, companions: [...session.companions, companionId] },
    { type: 'recruit', message: companion.name + ' joined the party.' });
}

export function dismiss(session, companionId) {
  if (session.combat?.status === 'active') return session;
  if (!session.companions.includes(companionId)) return session;
  const companion = COMPANIONS.find(c => c.id === companionId);
  return record({ ...session, companions: session.companions.filter(id => id !== companionId) },
    { type: 'dismiss', message: (companion?.name || 'A companion') + ' left the party.' });
}

export function travel(session, destination) {
  if (session.combat?.status === 'active') return session;
  const edge = exits(session).find(e => e.to === destination);
  if (!edge) return session; // Never let prose or model replies teleport an actor.
  const next = session.pack.scenes.find(s => s.id === destination);
  return record({ ...session, sceneId: destination, turn: session.turn + 1 },
    { type: 'travel', from: session.sceneId, to: destination,
      message: 'The party travels to ' + next.title + '.' });
}

export function resolveTurn(session, action, selectedSkill, helperId = '') {
  if (session.combat?.status === 'active') return session;
  const declared = text(action, 480);
  if (!declared) return session;
  const scene = currentScene(session);
  const skill = SKILLS.includes(selectedSkill) ? selectedSkill : scene.skill;
  const helper = COMPANIONS.find(c => c.id === helperId && session.companions.includes(c.id));
  const assist = helper?.skill === skill ? 2 : 0;
  const roll = nextDie(session.seed);
  const dc = skill === scene.skill ? scene.dc : 12;
  const bonus = Number(session.hero.bonus) + (session.hero.skill === skill ? 1 : 0) + assist;
  const total = roll.value + bonus;
  const success = total >= dc;
  const clue = success && skill === scene.skill && scene.reward ? text(scene.title + ': ' + scene.reward, 240) : '';
  const clues = clue && !session.clues.includes(clue) ? [...session.clues, clue].slice(-100) : session.clues;
  const turn = session.turn + 1;
  const resolution = { type: 'roll', turn, sceneId: scene.id, action: declared, skill, dc, die: roll.value,
    bonus, total, success, helper: assist ? helper.name : '', message:
      declared + ' | ' + skill + ': ' + roll.value + ' + ' + bonus + ' = ' + total +
      ' vs DC ' + dc + ' (' + (success ? 'success' : 'failure') + ')' +
      (clue && success ? ' | Clue: ' + clue : '') };
  return record({ ...session, seed: roll.seed, turn, clues }, resolution);
}

export function addFact(session, fact) {
  const note = text(fact, 240);
  if (!note || session.facts.includes(note) || session.facts.length >= 40) return session;
  return record({ ...session, facts: [...session.facts, note] }, { type: 'fact', message: 'World fact approved by player: ' + note });
}

export function addNarration(session, speaker, message, source) {
  const reply = text(message, 1800);
  if (!reply) return session;
  // AI text remains explicitly non-canonical, not gameplay events or facts.
  return { ...session, narration: [...session.narration,
    { speaker: text(speaker, 60), message: reply, source: source === 'model' ? 'AI / non-canon' : 'Scripted / non-canon' }].slice(-50) };
}

export function fallbackNarration(session) {
  const event = session.history[session.history.length - 1];
  const scene = currentScene(session);
  if (event?.type === 'roll') return event.success
    ? 'Your attempt holds. The scene yields a little more of its story. ' + scene.text
    : 'The attempt meets resistance. The surroundings stay as they were. ' + scene.text;
  return 'The party takes in ' + scene.title + '. ' + scene.text;
}

export function validateSaved(value) {
  if (!plainObject(value) || value.version !== 1 || !plainObject(value.pack) || !plainObject(value.hero)) return false;
  if (!Array.isArray(value.history) || !Array.isArray(value.narration) || !Array.isArray(value.companions) || !Array.isArray(value.facts) || !Array.isArray(value.clues)) return false;
  if (value.history.length > 100 || value.narration.length > 50 || value.companions.length > 3 || value.facts.length > 40) return false;
  if (!Number.isSafeInteger(value.turn) || value.turn < 0 || !Number.isSafeInteger(value.seed)) return false;
  if (!HEROES.some(h => h.id === value.hero.id) || !value.companions.every(id => COMPANIONS.some(c => c.id === id))) return false;
  if (!Array.isArray(value.pack.scenes) || value.pack.scenes.length > 80 || !Array.isArray(value.pack.edges) || value.pack.edges.length > 250) return false;
  if (value.agency !== undefined && (!plainObject(value.agency) || Array.isArray(value.agency))) return false;
  if (value.combat !== undefined && value.combat !== null && !plainObject(value.combat)) return false;
  return value.pack.scenes.some(s => s.id === value.sceneId);
}

export function safeImport(raw) {
  if (typeof raw !== 'string' || raw.length > 300000) throw Error('Invalid or oversized save file.');
  const value = JSON.parse(raw);
  if (!validateSaved(value)) throw Error('Not a valid Living Table v1 save.');
  // Strip unexpected top-level fields and normalize the authored pack.
  const pack = normalizePack(value.pack);
  if (!pack.scenes.some(s => s.id === value.sceneId)) throw Error('The saved location is missing.');
  const restored = { version: 1, pack, hero: { ...HEROES.find(h => h.id === value.hero.id), name: text(value.hero.name, 60) },
    seed: value.seed >>> 0, turn: value.turn, sceneId: value.sceneId, hp: Number(value.hp) || 0,
    inventory: (Array.isArray(value.inventory) ? value.inventory : []).slice(0, 100).map(x => text(x)),
    clues: value.clues.slice(0, 100).map(x => text(x)), companions: [...new Set(value.companions)],
    facts: value.facts.map(x => text(x)), narration: value.narration.slice(-50).map(n =>
      ({ speaker: text(n.speaker, 60), message: text(n.message, 1800), source: n.source === 'AI / non-canon' ? 'AI / non-canon' : 'Scripted / non-canon' })),
    history: value.history.slice(-100).map(e => ({ type: text(e.type, 30), turn: Number(e.turn) || 0, message: text(e.message, 700),
      action: text(e.action, 480), skill: text(e.skill, 40), dc: Number(e.dc) || 0, die: Number(e.die) || 0,
      bonus: Number(e.bonus) || 0, total: Number(e.total) || 0, success: Boolean(e.success) })) };
  // v1 saves without agency load with empty memory. R2 agency is always normalized.
  return { ...restored, agency: normalizeAgency(value.agency, restored),
    combat: normalizeCombat(value.combat, restored),
    encounterDesign: normalizeEncounter(value.encounterDesign,restored) };
}
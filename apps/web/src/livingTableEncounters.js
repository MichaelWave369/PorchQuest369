// R4 Encounter Creator: validated, portable original-fantasy encounter designs.
// Authoring fields are never model-executable commands or arbitrary scripts.
export const BOARD_SIZE = 7;
export const ENEMY_TEMPLATES = Object.freeze({
  'ash-wisp': { name: 'Ash Wisp', hp: 7, max_hp: 18, range: 2, attack_bonus: 2, damage: 2, ac: 11, ability: 'Cinder Bolt' },
  'briar-sentinel': { name: 'Briar Sentinel', hp: 10, max_hp: 24, range: 1, attack_bonus: 2, damage: 2, ac: 12, ability: 'Thorn Slam' },
  'shade-moth': { name: 'Shade Moth', hp: 6, max_hp: 14, range: 3, attack_bonus: 1, damage: 1, ac: 12, ability: 'Shadow Dust' },
  'stone-keeper': { name: 'Stone Keeper', hp: 14, max_hp: 30, range: 1, attack_bonus: 3, damage: 3, ac: 13, ability: 'Stone Fist' }
});
export const PARTY_SPAWNS = Object.freeze([
  { x: 3, y: 2 }, { x: 1, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }
]);
export const DEFAULT_ENCOUNTER = Object.freeze({
  version: 1, name: 'Blackwood Lantern Ambush', theme: 'forest', walls: [],
  foes: [
    { id: 'foe-1', type: 'ash-wisp', x: 2, y: 4, hp: 7 },
    { id: 'foe-2', type: 'briar-sentinel', x: 4, y: 4, hp: 10 }
  ]
});

export const TERRAIN_PRESETS = Object.freeze({
  forest: { name: 'Open Forest', walls: [] },
  ruins: { name: 'Broken Ruins', walls: [[0,1],[0,4],[1,5],[5,5],[6,1],[6,4]] },
  grove: { name: 'Twisted Grove', walls: [[0,0],[1,0],[5,0],[6,0],[0,6],[1,6],[5,6],[6,6]] }
});
const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
const coord = x => Number.isSafeInteger(x) && x >= 0 && x < BOARD_SIZE;
export const tileKey = (x,y) => x + ',' + y;
export const blocked = (walls,x,y) => walls.some(w => w.x === x && w.y === y);
export const cloneDefaultEncounter = () => ({
  ...DEFAULT_ENCOUNTER, walls: [], foes: DEFAULT_ENCOUNTER.foes.map(f => ({ ...f }))
});
export const positionsForParty = (session) =>
  PARTY_SPAWNS.slice(0, 1 + Math.min(3,session?.companions?.length || 0));

export function validateEncounter(value, session = null) {
  if (!plain(value) || value.version !== 1 ||
      typeof value.name !== 'string' || value.name.trim().length < 3 || value.name.length > 80 ||
      !Object.hasOwn(TERRAIN_PRESETS,value.theme) ||
      !Array.isArray(value.walls) || value.walls.length > 18 ||
      !Array.isArray(value.foes) || value.foes.length !== 2) return 'Invalid encounter format.';
  const used = new Set();
  // Reserve all four starting seats even when the current party is smaller.
  // Otherwise recruiting after saving an arena could place actors inside walls.
  const reserved = PARTY_SPAWNS.map(p => tileKey(p.x,p.y));
  for(const p of reserved) used.add(p);
  for(const w of value.walls){
    if(!plain(w) || !coord(w.x) || !coord(w.y)) return 'A wall is outside the arena.';
    const key = tileKey(w.x,w.y);
    if(used.has(key)) return 'Walls cannot occupy reserved party spawns or overlap.';
    used.add(key);
  }
  for(const id of ['foe-1','foe-2']){
    const matches = value.foes.filter(f => f?.id === id);
    if(matches.length !== 1) return 'Exactly two unique opponents are required.';
    const f = matches[0];
    const tpl = ENEMY_TEMPLATES[f.type];
    if(!tpl || !coord(f.x) || !coord(f.y) ||
       !Number.isSafeInteger(f.hp) || f.hp < 1 || f.hp > tpl.max_hp)
      return 'Enemy type, HP or position is invalid.';
    const key = tileKey(f.x,f.y);
    if(used.has(key)) return 'Two units or terrain walls share the same tile.';
    used.add(key);
  }
  return '';
}

export function normalizeEncounter(raw, session = null) {
  if (validateEncounter(raw,session)) return null;
  return {
    version: 1, name: raw.name.trim().slice(0,80), theme: raw.theme,
    walls: raw.walls.map(p => ({x:p.x,y:p.y})),
    foes: ['foe-1','foe-2'].map(id => {
      const f = raw.foes.find(x => x.id === id);
      return { id, type:f.type, x:f.x, y:f.y, hp:f.hp };
    })
  };
}

export function encounterFor(session) {
  return normalizeEncounter(session?.encounterDesign,session) || cloneDefaultEncounter();
}

export function saveEncounter(session, input) {
  if (session?.combat?.status === 'active') return session;
  const blueprint = normalizeEncounter(input,session);
  if (!blueprint) return session;
  return { ...session, encounterDesign:blueprint };
}

export function presetEncounter(name) {
  const map = TERRAIN_PRESETS[name];
  if (!map) return null;
  return { ...cloneDefaultEncounter(), theme:name, walls:map.walls.map(([x,y])=>({x,y})) };
}

export function paintWall(encounter,x,y) {
  if(!coord(x) || !coord(y) || !encounter) return encounter;
  const key = tileKey(x,y);
  const walls = encounter.walls.some(w => tileKey(w.x,w.y) === key)
    ? encounter.walls.filter(w => tileKey(w.x,w.y)!==key)
    : [...encounter.walls,{x,y}];
  if(walls.length > 18) return encounter;
  const draft = { ...encounter,walls };
  return validateEncounter(draft) ? encounter : draft;
}

export function placeEnemy(encounter,id,x,y) {
  if (!['foe-1','foe-2'].includes(id) || !coord(x) || !coord(y)) return encounter;
  const draft = { ...encounter, foes:encounter.foes.map(f => f.id === id ? {...f,x,y}:f) };
  return validateEncounter(draft) ? encounter : draft;
}

export function configureEnemy(encounter,id,type,hp) {
  const t = ENEMY_TEMPLATES[type];
  if (!t || !['foe-1','foe-2'].includes(id)) return encounter;
  const draft = { ...encounter, foes:encounter.foes.map(f => f.id===id
    ? {...f,type,hp:Math.min(t.max_hp,Math.max(1,Number.isSafeInteger(hp)?hp:t.hp))}
    : f) };
  return validateEncounter(draft) ? encounter : draft;
}

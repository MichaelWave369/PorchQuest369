// R3 deterministic tactical encounters. No AI output is ever applied as game state.
// All combat commands are enumerated, checked twice and logged before acceptance.
import { COMPANIONS, currentScene, nextDie } from './livingTableEngine.js';
import { normalizeCombat } from './livingTableCombatState.js';
import { normalizeAgency } from './livingTableAgencyState.js';
import { goalOf, memoryFor } from './livingTableAgency.js';

const SIZE = 7;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const find = (battle, id) => battle.units.find(u => u.id === id);
const alive = u => u && u.hp > 0;
const occupied = (battle, x, y) => battle.units.some(u => alive(u) && u.x === x && u.y === y);
const record = (session, type, message, fields = {}) => ({
  ...session,
  history: [...session.history, { type, turn: session.turn, message, ...fields }].slice(-100)
});
function companionName(id) {
  return COMPANIONS.find(c => c.id === id)?.name || id;
}
function attackRange(id) {
  return id === 'kael' ? 3 : (id === 'bram' || id === 'foe-2' ? 1 : 2);
}
function attackBonus(id, session) {
  return id === 'hero' ? Number(session.hero.bonus) || 2 : (id.startsWith('foe-') ? 2 : 3);
}
function threatAc(unit) { return unit.side === 'enemy' ? 11 : 12; }
function label(session, id) { return id === 'hero' ? session.hero.name : companionName(id); }

export function beginEncounter(session) {
  if (!session || session.hp <= 0 || session.combat || session.agency?.pending) return session;
  const seats = [[1, 2], [4, 2], [5, 2]];
  const units = [{ id: 'hero', name: session.hero.name, side: 'ally',
    x: 3, y: 2, hp: session.hp, max_hp: Math.max(session.hp, session.hero.hp), guarded: false }];
  session.companions.forEach((id, index) => {
    const friend = COMPANIONS.find(c => c.id === id);
    if (friend && seats[index]) {
      const [x, y] = seats[index];
      units.push({ id, name: friend.name, side: 'ally', x, y, hp: 9, max_hp: 9, guarded: false });
    }
  });
  units.push({ id: 'foe-1', name: 'Ash Wisp', side: 'enemy',
    x: 2, y: 4, hp: 7, max_hp: 7, guarded: false });
  units.push({ id: 'foe-2', name: 'Briar Sentinel', side: 'enemy',
    x: 4, y: 4, hp: 10, max_hp: 10, guarded: false });
  const battle = { version: 1, scene_id: session.sceneId, status: 'active',
    round: 1, seq: 0, units, acted: [], pending: null };
  return record({ ...session, combat: battle }, 'encounter_start',
    'An Ash Wisp and Briar Sentinel confront the party at ' + currentScene(session).title + '.');
}

export function battleOptions(session, actorId) {
  const battle = session?.combat;
  if (!battle || battle.status !== 'active' || battle.scene_id !== session.sceneId) return [];
  const unit = find(battle, actorId);
  if (!alive(unit) || unit.side !== 'ally' || battle.acted.includes(actorId)) return [];
  const options = [];
  for (const [dx, dy, direction] of [[0,-1,'north'],[1,0,'east'],[0,1,'south'],[-1,0,'west']]) {
    const x = unit.x + dx, y = unit.y + dy;
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE && !occupied(battle, x, y)) {
      options.push({ id: 'move:' + x + ':' + y, kind: 'move', label: 'Move ' + direction,
        x, y, actor_id: actorId });
    }
  }
  for (const enemy of battle.units.filter(u => u.side === 'enemy' && alive(u))) {
    if (distance(unit, enemy) <= attackRange(actorId)) {
      options.push({ id: 'attack:' + enemy.id, kind: 'attack',
        label: 'Strike ' + enemy.name, target_id: enemy.id, actor_id: actorId });
    }
  }
  options.push({ id: 'guard', kind: 'guard', label: 'Guard this position', actor_id: actorId });
  return options;
}

function markOutcome(session, battle) {
  const enemyAlive = battle.units.some(u => u.side === 'enemy' && alive(u));
  const hero = find(battle, 'hero');
  let status = !alive(hero) ? 'lost' : !enemyAlive ? 'won' : 'active';
  if (status === battle.status) return { ...session, combat: battle };
  return record({ ...session, combat: { ...battle, status, pending: null } },
    status === 'won' ? 'encounter_won' : 'encounter_lost',
    status === 'won' ? 'The party wins the encounter. No unapproved loot is granted.'
      : 'The hero falls. The encounter is lost.');
}

function addApprovedBattleMemory(session, id, message) {
  if (!session.companions.includes(id)) return session;
  const agency = normalizeAgency(session.agency, session);
  const list = agency.memories[id] || [];
  const memory = { note: message.slice(0,240), visibility: 'party',
    source: 'approved_turn', at_turn: session.turn, scene_id: session.sceneId };
  return { ...session, agency: { ...agency, memories: { ...agency.memories,
    [id]: [...list, memory].slice(-12) } } };
}

function nearestAlly(battle, foe) {
  return battle.units.filter(u => u.side === 'ally' && alive(u))
    .sort((a,b) => distance(foe,a) - distance(foe,b) || a.id.localeCompare(b.id))[0] || null;
}
function enemyPhase(session) {
  let state = session;
  let battle = { ...state.combat, pending: null, units: state.combat.units.map(u => ({ ...u })) };
  for (const id of ['foe-1','foe-2']) {
    const foe = find(battle, id);
    if (!alive(foe) || !alive(find(battle, 'hero'))) continue;
    const target = nearestAlly(battle, foe);
    if (!target) break;
    let message;
    let detail = {};
    if (distance(foe, target) <= attackRange(id)) {
      const rolled = nextDie(state.seed);
      state = { ...state, seed: rolled.seed };
      const total = rolled.value + attackBonus(id, state);
      const hit = total >= threatAc(target);
      const base = hit ? 2 + (rolled.value % 3) : 0;
      const damage = Math.max(0, base - (target.guarded ? 2 : 0));
      target.hp = Math.max(0, target.hp - damage);
      if (target.id === 'hero') state = { ...state, hp: target.hp };
      message = foe.name + ' attacks ' + target.name + ': d20 ' + rolled.value +
        ' + 2 = ' + total + ' vs AC ' + threatAc(target) +
        (hit ? '; hit for ' + damage + ' damage.' : '; miss.');
      detail = { die: rolled.value, bonus: 2, total, target_id: target.id, damage, success: hit };
    } else {
      // Deterministic one-step pursuit, avoiding occupied cells.
      const moves = [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy]) =>
        ({ x: foe.x + dx, y: foe.y + dy }))
        .filter(p => p.x >= 0 && p.x < SIZE && p.y >= 0 && p.y < SIZE && !occupied(battle,p.x,p.y))
        .sort((a,b) => distance(a,target) - distance(b,target) || a.y - b.y || a.x - b.x);
      const step = moves.find(p => distance(p,target) < distance(foe,target));
      if (step) { foe.x = step.x; foe.y = step.y; }
      message = foe.name + (step ? ' advances toward ' + target.name + '.' : ' holds its ground.');
    }
    battle.seq += 1;
    state = record({ ...state, turn: state.turn + 1 }, 'enemy_action', message, { actor_id: id, ...detail });
  }
  if (alive(find(battle, 'hero'))) {
    battle.acted = [];
    battle.round += 1;
    battle.units.forEach(u => { u.guarded = false; });
  }
  battle = normalizeCombat({ ...battle, status: alive(find(battle,'hero')) ? 'active' : 'lost' }, state) || battle;
  state = { ...state, combat: battle };
  return markOutcome(state, battle);
}

export function resolveBattleAction(session, actorId, optionId) {
  const option = battleOptions(session, actorId).find(x => x.id === optionId);
  if (!option) return session;
  const battle = { ...session.combat,
    units: session.combat.units.map(u => ({ ...u })),
    acted: [...session.combat.acted, actorId], seq: session.combat.seq + 1, pending: null };
  const actor = find(battle, actorId);
  let state = session, message = '', details = { actor_id: actorId, action: option.kind };
  if (option.kind === 'move') {
    actor.x = option.x; actor.y = option.y;
    message = label(state, actorId) + ' moves to (' + option.x + ', ' + option.y + ').';
  } else if (option.kind === 'guard') {
    actor.guarded = true;
    message = label(state, actorId) + ' takes a defensive stance.';
  } else if (option.kind === 'attack') {
    const enemy = find(battle, option.target_id);
    const roll = nextDie(state.seed);
    state = { ...state, seed: roll.seed };
    const bonus = attackBonus(actorId, state);
    const total = roll.value + bonus;
    const hit = total >= threatAc(enemy);
    const damage = hit ? 2 + (roll.value % 3) : 0;
    enemy.hp = Math.max(0, enemy.hp - damage);
    message = label(state, actorId) + ' strikes ' + enemy.name + ': d20 ' + roll.value +
      ' + ' + bonus + ' = ' + total + ' vs AC 11 (' + (hit ? 'hit' : 'miss') + ')' +
      (hit ? ', ' + damage + ' damage.' : '.');
    details = { ...details, die: roll.value, bonus, total, success: hit,
      damage, target_id: enemy.id };
  }
  state = record({ ...state, turn: state.turn + 1, combat: battle },
    'battle_action', message, details);
  if (actorId !== 'hero') state = addApprovedBattleMemory(state, actorId, message);
  state = markOutcome(state, battle);
  if (state.combat.status !== 'active') return state;
  const allies = battle.units.filter(u => u.side === 'ally' && alive(u));
  return allies.every(u => battle.acted.includes(u.id)) ? enemyPhase(state) : state;
}

export function localTactic(session, actorId) {
  const options = battleOptions(session, actorId);
  if (!options.length || actorId === 'hero') return null;
  const combat = session.combat;
  const unit = find(combat,actorId);
  const goal = goalOf(session, actorId).toLowerCase();
  const concern = memoryFor(session, actorId).some(m => /danger|injur|wound|hurt|protect/i.test(m.note));
  if ((goal.includes('protect') || concern) && unit.hp <= 4) {
    const guard = options.find(o => o.kind === 'guard');
    if (guard) return guard;
  }
  const attack = options.find(o => o.kind === 'attack');
  if (attack) return attack;
  const target = combat.units.filter(u => u.side === 'enemy' && alive(u))
    .sort((a,b) => distance(unit,a)-distance(unit,b))[0];
  const move = options.filter(o => o.kind === 'move')
    .sort((a,b) => distance(a,target)-distance(b,target))[0];
  return move || options.find(o => o.kind === 'guard');
}

export function stageTactic(session, actorId, optionId, source = 'local') {
  const combat = session?.combat;
  if (!combat || combat.status !== 'active' || combat.pending || session.agency?.pending ||
      actorId === 'hero' || !session.companions.includes(actorId) ||
      !battleOptions(session, actorId).some(o => o.id === optionId)) return session;
  return { ...session, combat: { ...combat, pending: {
    actor_id: actorId, option_id: optionId,
    source: source === 'model' ? 'model' : 'local',
    anchor: { scene_id: session.sceneId, turn: session.turn, seed: session.seed,
      seq: combat.seq, round: combat.round }
  } } };
}

export function currentTactic(session) {
  const combat = session?.combat;
  if (!combat?.pending || !normalizeCombat(combat,session)?.pending) return null;
  const p = combat.pending;
  return battleOptions(session,p.actor_id).some(o => o.id === p.option_id) ? p : null;
}

export function decideTactic(session, approved) {
  const p = currentTactic(session);
  if (!p) return session;
  if (approved) return resolveBattleAction(session,p.actor_id,p.option_id);
  const combat = { ...session.combat, pending: null };
  return record({ ...session, combat }, 'battle_proposal_declined',
    companionName(p.actor_id) + ' tactical suggestion was declined.');
}

export function leaveEncounter(session) {
  const b = session?.combat;
  if (!b) return session;
  if (b.status === 'active') {
    // Retreat never undoes damage or restores fallen companions.
    return record({ ...session, combat: null, turn: session.turn + 1 },
      'encounter_retreat', 'The party retreats from the tactical encounter.');
  }
  return record({ ...session, combat: null }, 'encounter_closed',
    'The tactical encounter record is closed (' + b.status + ').');
}

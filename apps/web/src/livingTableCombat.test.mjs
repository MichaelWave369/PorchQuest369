import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_PACK, createSession, recruit, safeImport, nextDie, travel, resolveTurn } from './livingTableEngine.js';
import { stageCompanionProposal, localSuggestion, approveCompanionProposal, rememberForCompanion } from './livingTableAgency.js';
import {
  beginEncounter, battleOptions, resolveBattleAction, localTactic, stageTactic,
  currentTactic, decideTactic, leaveEncounter
} from './livingTableCombat.js';

const solo = () => beginEncounter(createSession(STARTER_PACK));
const party = () => beginEncounter(recruit(recruit(createSession(STARTER_PACK),'mira'),'kael'));

test('initial encounter is deterministic, roster-bound, and keeps legacy campaign keys', () => {
  const a = solo(), b = solo();
  assert.deepEqual(a,b);
  assert.equal(a.combat.units.length, 3);
  assert.equal(a.combat.round,1);
  assert.equal(a.combat.units[0].hp,a.hp);
  assert.equal(a.combat.scene_id,a.sceneId);
  assert.equal(a.combat.units.filter(u => u.side === 'enemy').length,2);
  assert.equal(a.history.at(-1).type,'encounter_start');
  assert.equal(beginEncounter(a),a);
});

test('nonlegal moves, nonexistent targets and extra actions cannot advance turn or RNG', () => {
  const start = party();
  assert.equal(resolveBattleAction(start,'hero','move:6:6'),start);
  assert.equal(resolveBattleAction(start,'hero','attack:foe-1'),start);
  assert.equal(resolveBattleAction(start,'foe-1','guard'),start);
  assert.equal(resolveBattleAction(start,'bram','guard'),start);
  const moved = resolveBattleAction(start,'hero','move:3:3');
  assert.equal(moved.turn,start.turn+1);
  assert.equal(moved.seed,start.seed);
  assert.equal(moved.combat.units.find(u => u.id === 'hero').y,3);
  assert.equal(resolveBattleAction(moved,'hero','guard'),moved);
  assert.equal(travel(start,'trail'),start);
  assert.equal(resolveTurn(start,'I sneak away','stealth'),start);
});

test('party action economy triggers one bounded deterministic foe phase per round', () => {
  let game = beginEncounter(recruit(createSession(STARTER_PACK),'mira'));
  game = resolveBattleAction(game,'hero','guard');
  assert.equal(game.combat.round,1);
  game = resolveBattleAction(game,'mira','guard');
  assert.equal(game.combat.round,2);
  assert.equal(game.combat.acted.length,0);
  assert.equal(game.history.filter(e => e.type === 'enemy_action').length,2);
  assert.equal(game.combat.seq,4);
  assert.equal(game.turn,4);
  assert.deepEqual(game,(() => {
    let replay = beginEncounter(recruit(createSession(STARTER_PACK),'mira'));
    replay=resolveBattleAction(replay,'hero','guard');
    return resolveBattleAction(replay,'mira','guard');
  })());
});

test('a companion attack records a real seeded hit or miss with bounded damage', () => {
  const game=party();
  const kaelActions=battleOptions(game,'kael');
  assert.ok(kaelActions.some(o => o.id === 'attack:foe-2'));
  const attacked=resolveBattleAction(game,'kael','attack:foe-2');
  const event=attacked.history.at(-1);
  assert.equal(event.type,'battle_action');
  assert.equal(event.actor_id,'kael');
  assert.equal(event.die,nextDie(game.seed).value);
  assert.equal(event.total,event.die+3);
  assert.ok(event.damage>=0 && event.damage<=4);
  assert.equal(attacked.combat.acted.includes('kael'),true);
  assert.equal(attacked.agency.memories.kael.at(-1).source,'approved_turn');
});

test('tactical proposal is legal, one-use, turn-bound and requires explicit acceptance', () => {
  const game=party();
  const choice=localTactic(game,'kael');
  assert.ok(choice);
  assert.ok(battleOptions(game,'kael').some(o => o.id === choice.id));
  assert.equal(stageTactic(game,'hero','guard'),game);
  assert.equal(stageTactic(game,'kael','attack:foe-999'),game);
  const pending=stageTactic(game,'kael',choice.id,'model');
  assert.equal(currentTactic(pending).source,'model');
  assert.equal(pending.turn,game.turn);
  assert.equal(pending.seed,game.seed);
  assert.equal(stageTactic(pending,'mira','guard'),pending);
  const denied=decideTactic(pending,false);
  assert.equal(denied.turn,game.turn);
  assert.equal(denied.seed,game.seed);
  assert.equal(currentTactic(denied),null);
  const approved=decideTactic(pending,true);
  assert.equal(approved.turn,game.turn+1);
  assert.equal(currentTactic(approved),null);
  assert.equal(decideTactic(approved,true),approved);
  const stale=resolveBattleAction(pending,'hero','guard');
  assert.equal(currentTactic(stale),null);
  assert.equal(decideTactic(stale,true),stale);
});

test('goal and memory influence offline companion tactic only through legal options', () => {
  let game=party();
  let withConcern=rememberForCompanion(game,'mira','I was injured by a dangerous trap.','private');
  withConcern={...withConcern,combat:{...withConcern.combat,
    units:withConcern.combat.units.map(u=>u.id==='mira'?{...u,hp:3}:u)}};
  const tip=localTactic(withConcern,'mira');
  assert.equal(tip.id,'guard');
  assert.ok(battleOptions(withConcern,'mira').some(o=>o.id===tip.id));
});

test('portable saves restore bounded combat and drop forged or stale suggestions', () => {
  let game=party();
  game=stageTactic(game,'kael',localTactic(game,'kael').id,'local');
  let restored=safeImport(JSON.stringify(game));
  assert.equal(restored.combat.round,game.combat.round);
  assert.deepEqual(restored.combat.units,game.combat.units);
  assert.deepEqual(currentTactic(restored),currentTactic(game));
  const bad=JSON.parse(JSON.stringify(game));
  bad.combat.units.push({id:'superhero',x:0,y:0,hp:999});
  assert.equal(safeImport(JSON.stringify(bad)).combat,null);
  const stale=JSON.parse(JSON.stringify(game));
  stale.combat.pending.anchor.seq++;
  assert.equal(safeImport(JSON.stringify(stale)).combat.pending,null);
  const old=createSession(STARTER_PACK);
  delete old.combat;
  assert.equal(safeImport(JSON.stringify(old)).combat,null);
});

test('victory is canonical and grants no arbitrary loot', () => {
  let game=solo();
  const units=game.combat.units.map(u =>
    u.id==='foe-1'?{...u,x:3,y:3,hp:1,max_hp:7}:
    u.id==='foe-2'?{...u,hp:0}:u);
  let seed=1;
  while(nextDie(seed).value+3<11) seed++;
  game={...game,seed,combat:{...game.combat,units}};
  const result=resolveBattleAction(game,'hero','attack:foe-1');
  assert.equal(result.combat.status,'won');
  assert.equal(result.history.at(-1).type,'encounter_won');
  assert.deepEqual(result.inventory,game.inventory);
  assert.equal(result.hp,game.hp);
  assert.equal(leaveEncounter(result).combat,null);
});

test('cannot launch battle with an unresolved exploration companion proposal', () => {
  const start=recruit(createSession(STARTER_PACK),'mira');
  const requested=stageCompanionProposal(start,'mira',localSuggestion(start,'mira'));
  assert.equal(beginEncounter(requested),requested);
  const normal=beginEncounter(start);
  assert.equal(approveCompanionProposal(normal),normal);
  assert.equal(leaveEncounter(normal).combat,null);
});

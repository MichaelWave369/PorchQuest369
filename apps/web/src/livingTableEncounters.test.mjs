import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_PACK, createSession, recruit, safeImport } from './livingTableEngine.js';
import {
  DEFAULT_ENCOUNTER, TERRAIN_PRESETS, ENEMY_TEMPLATES, cloneDefaultEncounter,
  normalizeEncounter, validateEncounter, presetEncounter,
  saveEncounter, encounterFor, paintWall, placeEnemy, configureEnemy
} from './livingTableEncounters.js';
import {
  beginEncounter, battleOptions, resolveBattleAction, lineOfSight, localTactic
} from './livingTableCombat.js';

const party = () => recruit(recruit(createSession(STARTER_PACK),'mira'),'kael');

test('default R3 encounter remains compatible and usable without a saved design', () => {
  const session=party();
  const battle=beginEncounter(session);
  assert.equal(encounterFor(session).foes[0].type,'ash-wisp');
  assert.equal(battle.combat.units.find(u=>u.id==='foe-1').name,'Ash Wisp');
  assert.equal(battle.combat.units.find(u=>u.id==='foe-2').hp,10);
  assert.equal(battle.combat.encounter.name,DEFAULT_ENCOUNTER.name);
});

test('terrain presets are valid 7x7 designs and protect all four deployment tiles', () => {
  for(const theme of Object.keys(TERRAIN_PRESETS)) {
    const design=presetEncounter(theme);
    assert.equal(validateEncounter(design),'');
    assert.deepEqual(normalizeEncounter(design),design);
  }
  const blocked=cloneDefaultEncounter();
  blocked.walls=[{x:5,y:2}];
  assert.match(validateEncounter(blocked),/reserved/i);
  const colliding=cloneDefaultEncounter();
  colliding.walls=[{x:2,y:4}];
  assert.match(validateEncounter(colliding),/same tile/i);
  const dup=cloneDefaultEncounter();
  dup.walls=[{x:0,y:0},{x:0,y:0}];
  assert.match(validateEncounter(dup),/overlap/i);
});

test('map editor only permits valid brush strokes and safe enemy deployment', () => {
  const design=cloneDefaultEncounter();
  assert.equal(paintWall(design,3,2),design);
  assert.equal(placeEnemy(design,'foe-1',4,4),design);
  assert.equal(placeEnemy(design,'foe-1',3,2),design);
  assert.equal(placeEnemy(design,'bad',3,4),design);
  const wall=paintWall(design,3,3);
  assert.notEqual(wall,design);
  assert.deepEqual(wall.walls,[{x:3,y:3}]);
  assert.deepEqual(paintWall(wall,3,3).walls,[]);
  assert.equal(validateEncounter(placeEnemy(design,'foe-1',3,4)),'');
  assert.equal(validateEncounter(wall),'');
  let capped=design;
  for(let x=0;x<7;x++)for(let y=0;y<7;y++)
    capped=paintWall(capped,x,y);
  assert.ok(capped.walls.length<=18);
});

test('four original monster templates have bounded combat abilities and HP', () => {
  let design=cloneDefaultEncounter();
  design=configureEnemy(design,'foe-1','shade-moth',99);
  assert.equal(design.foes[0].hp,ENEMY_TEMPLATES['shade-moth'].max_hp);
  assert.equal(design.foes[0].type,'shade-moth');
  design=configureEnemy(design,'foe-2','stone-keeper',14);
  assert.equal(validateEncounter(design),'');
  assert.equal(configureEnemy(design,'foe-2','malicious-monster',99),design);
  const battle=beginEncounter(saveEncounter(party(),design));
  assert.equal(battle.combat.units.find(u=>u.id==='foe-1').name,'Shade Moth');
  assert.equal(battle.combat.units.find(u=>u.id==='foe-1').hp,14);
  assert.equal(battle.combat.units.find(u=>u.id==='foe-2').name,'Stone Keeper');
  assert.equal(battle.combat.encounter.foes[1].type,'stone-keeper');
});

test('authored walls block movement and ranged attacks through obstacles', () => {
  const design=cloneDefaultEncounter();
  design.walls=[{x:4,y:3},{x:3,y:3}];
  const battle=beginEncounter(saveEncounter(party(),design));
  assert.equal(validateEncounter(design),'');
  const heroMoves=battleOptions(battle,'hero').map(x=>x.id);
  assert.ok(!heroMoves.includes('move:3:3'));
  const kael=battle.combat.units.find(u=>u.id==='kael');
  const sentinel=battle.combat.units.find(u=>u.id==='foe-2');
  assert.equal(lineOfSight(battle.combat,kael,sentinel),false);
  assert.equal(battleOptions(battle,'kael').some(x=>x.id==='attack:foe-2'),false);
  assert.equal(resolveBattleAction(battle,'kael','attack:foe-2'),battle);
  const suggestion=localTactic(battle,'kael');
  assert.ok(battleOptions(battle,'kael').some(x=>x.id===suggestion.id));
});

test('portable campaign saves preserve custom design and active encounter snapshot', () => {
  let design=presetEncounter('ruins');
  design=configureEnemy(design,'foe-1','stone-keeper',15);
  design={...design,name:'The Stone Watch'};
  let session=saveEncounter(party(),design);
  session=beginEncounter(session);
  const restored=safeImport(JSON.stringify(session));
  assert.deepEqual(restored.encounterDesign,design);
  assert.deepEqual(restored.combat.encounter,design);
  assert.deepEqual(restored.combat.units,session.combat.units);
  assert.equal(battleOptions(restored,'hero').some(x=>x.kind==='guard'),true);
  const altered=JSON.parse(JSON.stringify(session));
  altered.combat.encounter.walls=[{x:3,y:2}];
  assert.equal(safeImport(JSON.stringify(altered)).combat,null);
  const hidden=JSON.parse(JSON.stringify(session));
  hidden.encounterDesign.foes[0].hp=5000000;
  assert.equal(safeImport(JSON.stringify(hidden)).encounterDesign,null);
});

test('authoring does not alter active tactical state, dice or inventory', () => {
  const before=beginEncounter(party());
  const after=saveEncounter(before,cloneDefaultEncounter());
  assert.equal(after,before);
  assert.equal(before.seed,369);
  assert.deepEqual(before.inventory,party().inventory);
});

test('unknown commands and extra fields never become executable rules', () => {
  const input=JSON.parse(JSON.stringify(DEFAULT_ENCOUNTER));
  input.foes[0].newSpell='grant infinite gold';
  input.runCode='evil()';
  input.walls=[{x:0,y:0,execute:true}];
  const normalized=normalizeEncounter(input);
  assert.ok(normalized);
  assert.equal(Object.hasOwn(normalized,'runCode'),false);
  assert.equal(Object.hasOwn(normalized.foes[0],'newSpell'),false);
  assert.deepEqual(normalized.walls,[{x:0,y:0}]);
  const invalid=JSON.parse(JSON.stringify(DEFAULT_ENCOUNTER));
  invalid.foes.push({id:'foe-3',type:'stone-keeper',x:6,y:6,hp:20});
  assert.equal(normalizeEncounter(invalid),null);
});

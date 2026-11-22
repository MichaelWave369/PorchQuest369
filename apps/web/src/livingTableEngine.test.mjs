import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STARTER_PACK, normalizePack, createSession, nextDie, recruit, dismiss,
  travel, resolveTurn, addFact, addNarration, safeImport, exits
} from './livingTableEngine.js';

test('seeded d20 is reproducible and in bounds', () => {
  let seed = 369;
  const results = [];
  for (let n = 0; n < 100; n++) {
    const r = nextDie(seed);
    seed = r.seed;
    assert.ok(r.value >= 1 && r.value <= 20);
    results.push(r.value);
  }
  assert.deepEqual(results, (() => {
    let state = 369;
    return Array.from({ length: 100 }, () => { const r = nextDie(state); state = r.seed; return r.value; });
  })());
});

test('freeform action uses dice before narration and is deterministic', () => {
  const start = createSession(STARTER_PACK, 'seeker', 'My Hero');
  const first = resolveTurn(start, 'I inspect the steps', 'perception');
  const second = resolveTurn(start, 'I inspect the steps', 'perception');
  assert.deepEqual(first, second);
  assert.equal(start.turn, 0);
  assert.equal(first.turn, 1);
  assert.equal(first.history.at(-1).die >= 1, true);
  assert.equal(first.history.at(-1).total, first.history.at(-1).die + first.history.at(-1).bonus);
});

test('companions have three bounded seats and matching assists', () => {
  const start = createSession(STARTER_PACK, 'seeker');
  const one = recruit(start, 'mira');
  assert.deepEqual(one.companions, ['mira']);
  assert.strictEqual(recruit(one, 'mira'), one);
  const solo = resolveTurn(one, 'Follow tracks', 'survival');
  const withAssist = resolveTurn(one, 'Follow tracks', 'survival', 'mira');
  assert.equal(withAssist.history.at(-1).total, solo.history.at(-1).total + 2);
  assert.equal(withAssist.history.at(-1).helper, 'Mira');
  const three = recruit(recruit(one, 'kael'), 'nessa');
  assert.equal(three.companions.length, 3);
  assert.strictEqual(recruit(three, 'bram'), three);
  assert.deepEqual(dismiss(three, 'mira').companions, ['kael', 'nessa']);
});

test('unauthorized travel is impossible even when a destination is real', () => {
  const start = createSession(STARTER_PACK);
  assert.deepEqual(exits(start).map(x => x.to), ['trail']);
  assert.strictEqual(travel(start, 'hill'), start);
  assert.equal(travel(start, 'trail').sceneId, 'trail');
});

test('AI narration never adds to the canonical event history or modifies world facts', () => {
  const start = createSession(STARTER_PACK);
  const withFact = addFact(start, 'The gate opens at dawn');
  const withNarration = addNarration(withFact, 'Dungeon Master', 'You find a thousand gold coins.', 'model');
  assert.equal(withNarration.history.length, withFact.history.length);
  assert.deepEqual(withNarration.inventory, withFact.inventory);
  assert.deepEqual(withNarration.facts, ['The gate opens at dawn']);
  assert.equal(withNarration.narration[0].source, 'AI / non-canon');
});

test('pack normalization does not accept invalid edge targets', () => {
  const pack = normalizePack({
    title: 'Custom', scenes: [{ id: 'start', title: 'Start', dc: 99 }],
    edges: [{ from: 'start', to: 'secret', label: 'Exploit' }]
  });
  assert.equal(pack.scenes[0].dc, 25);
  assert.deepEqual(pack.edges, []);
});

test('portable save exports/imports and rejects malformed records', () => {
  const game = addNarration(recruit(createSession(STARTER_PACK, 'bard', 'Lute'), 'iri'), 'Iri', 'Look north.', 'model');
  const restored = safeImport(JSON.stringify(game));
  assert.equal(restored.hero.name, 'Lute');
  assert.deepEqual(restored.companions, ['iri']);
  assert.equal(restored.narration[0].message, 'Look north.');
  assert.throws(() => safeImport('{"version":999}'), /valid Living Table/);
  assert.throws(() => safeImport('x'.repeat(300001)), /oversized/);
});

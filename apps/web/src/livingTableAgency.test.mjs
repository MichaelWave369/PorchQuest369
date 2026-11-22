import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_PACK, createSession, recruit, travel, resolveTurn, safeImport } from './livingTableEngine.js';
import {
  goalOf, setCompanionGoal, rememberForCompanion, memoryFor,
  modelMemoryPacket, localSuggestion, stageCompanionProposal,
  pendingProposal, approveCompanionProposal, declineCompanionProposal
} from './livingTableAgency.js';

const party = () => recruit(recruit(createSession(STARTER_PACK), 'mira'), 'kael');

test('old R1 portable saves migrate with an empty R2 companion notebook', () => {
  const old = party();
  delete old.agency;
  const restored = safeImport(JSON.stringify(old));
  assert.deepEqual(restored.agency, { goals: {}, memories: {}, pending: null });
  assert.deepEqual(restored.companions, ['mira', 'kael']);
});

test('goals persist and memories have recipient-level isolation', () => {
  let game = party();
  game = setCompanionGoal(game, 'mira', 'Protect the forest trail.');
  game = rememberForCompanion(game, 'mira', 'Secret path behind the old gate.', 'private');
  game = rememberForCompanion(game, 'mira', 'The river is flooded.', 'party');
  game = rememberForCompanion(game, 'kael', 'Rune markings near the hill.', 'private');
  assert.equal(goalOf(game, 'mira'), 'Protect the forest trail.');
  assert.equal(memoryFor(game, 'mira').length, 2);
  assert.equal(memoryFor(game, 'mira', 'party').length, 1);
  const miraContext = JSON.stringify(modelMemoryPacket(game, 'mira'));
  const kaelContext = JSON.stringify(modelMemoryPacket(game, 'kael'));
  assert.match(miraContext, /Secret path/);
  assert.doesNotMatch(kaelContext, /Secret path/);
  assert.doesNotMatch(miraContext, /Rune markings/);
  assert.equal(modelMemoryPacket(game, 'bram').memory_notes.length, 0);
  const restored = safeImport(JSON.stringify(game));
  assert.deepEqual(restored.agency, game.agency);
});

test('model may suggest only legal actions matching recruited character specialization', () => {
  const game = party();
  assert.equal(stageCompanionProposal(game, 'bram', localSuggestion(game, 'mira')), game);
  assert.equal(stageCompanionProposal(game, 'mira', { action: 'travel', skill: 'survival', intent: 'Jump to the hill' }), game);
  assert.equal(stageCompanionProposal(game, 'mira', { action: 'investigate', skill: 'arcana', intent: 'Cast a big spell' }), game);
  assert.equal(stageCompanionProposal(game, 'mira', { action: 'investigate', skill: 'survival', intent: '' }), game);
  const queued = stageCompanionProposal(game, 'mira', localSuggestion(game, 'mira'), 'model');
  assert.equal(pendingProposal(queued).source, 'model');
  assert.equal(queued.turn, game.turn);
  assert.deepEqual(queued.inventory, game.inventory);
  assert.equal(stageCompanionProposal(queued, 'kael', localSuggestion(queued, 'kael')), queued);
});

test('approval alone rolls once, generates exact receipt and approved memory', () => {
  const game = party();
  const queued = stageCompanionProposal(game, 'mira', localSuggestion(game, 'mira'), 'model');
  const resolved = approveCompanionProposal(queued);
  assert.equal(resolved.turn, game.turn + 1);
  assert.notEqual(resolved.seed, game.seed);
  assert.equal(resolved.history.at(-1).type, 'companion_roll');
  assert.equal(resolved.history.at(-1).actor_id, 'mira');
  assert.equal(resolved.history.at(-1).total, resolved.history.at(-1).die + 3);
  assert.equal(resolved.history.at(-1).source, 'model');
  assert.equal(resolved.agency.pending, null);
  assert.equal(memoryFor(resolved, 'mira').at(-1).source, 'approved_turn');
  assert.equal(approveCompanionProposal(resolved), resolved);
  assert.deepEqual(approveCompanionProposal(queued), resolved);
  assert.deepEqual(resolved.inventory, game.inventory);
});

test('reject and stale proposals cannot spend dice or move game state', () => {
  const game = party();
  const queued = stageCompanionProposal(game, 'mira', localSuggestion(game, 'mira'));
  const declined = declineCompanionProposal(queued);
  assert.equal(declined.turn, game.turn);
  assert.equal(declined.seed, game.seed);
  assert.equal(declined.history.at(-1).type, 'companion_declined');
  assert.equal(declined.agency.pending, null);
  const moved = travel(queued, 'trail');
  assert.equal(pendingProposal(moved), null);
  assert.equal(approveCompanionProposal(moved), moved);
  const rolled = resolveTurn(queued, 'Inspect the gate', 'perception');
  assert.equal(approveCompanionProposal(rolled), rolled);
  const restored = safeImport(JSON.stringify(moved));
  assert.equal(restored.agency.pending, null);
});

test('memory is bounded and imported data cannot make an unauthorized pending action', () => {
  let game = party();
  for (let i = 0; i < 30; i++) game = rememberForCompanion(game, 'mira', 'Memory ' + i);
  assert.equal(memoryFor(game, 'mira').length, 12);
  const poisoned = JSON.parse(JSON.stringify(game));
  poisoned.agency.pending = {
    actor_id: 'bram', action: 'investigate', skill: 'athletics',
    intent: 'Unrecruited character acts', source: 'model',
    anchor: { scene_id: game.sceneId, turn: game.turn, seed: game.seed }
  };
  assert.equal(safeImport(JSON.stringify(poisoned)).agency.pending, null);
});

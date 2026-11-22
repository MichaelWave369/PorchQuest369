// R2 governed companion agency: a model may propose, only the rules can resolve.
// A proposal is a one-use suggestion anchored to one exact scene, turn and seed.
import { COMPANIONS, currentScene, nextDie } from './livingTableEngine.js';
import { emptyAgency, normalizeAgency } from './livingTableAgencyState.js';

export const DEFAULT_GOALS = {
  mira: 'Find a safe route and protect the people traveling it.',
  kael: 'Understand the symbols without making reckless assumptions.',
  nessa: 'Keep the lanterns burning and notice those who need help.',
  bram: 'Keep the company safe, even when the joke is terrible.',
  iri: 'Resolve disputes without abandoning promises.'
};
const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function actor(session, id) {
  if (!session.companions.includes(id)) return null;
  return COMPANIONS.find(c => c.id === id) || null;
}
function state(session) { return normalizeAgency(session.agency || emptyAgency(), session); }
function withAgency(session, agency) { return { ...session, agency: normalizeAgency(agency, session) }; }

export function goalOf(session, id) {
  return state(session).goals[id] || DEFAULT_GOALS[id] || '';
}

export function memoryFor(session, id, mode = 'self') {
  const list = state(session).memories[id] || [];
  // Only this companion receives its own private memory. Party view omits it.
  return mode === 'party' ? list.filter(m => m.visibility === 'party') : list;
}

export function setCompanionGoal(session, id, value) {
  if (!actor(session, id)) return session;
  const goal = text(value, 160);
  if (!goal) return session;
  const agency = state(session);
  return withAgency(session, { ...agency, goals: { ...agency.goals, [id]: goal } });
}

export function rememberForCompanion(session, id, value, visibility = 'private') {
  if (!actor(session, id)) return session;
  const note = text(value, 240);
  if (!note) return session;
  const agency = state(session);
  const list = agency.memories[id] || [];
  if (list.some(m => m.note === note && m.visibility === visibility)) return session;
  return withAgency(session, { ...agency, memories: {
    ...agency.memories, [id]: [...list, { note,
      visibility: visibility === 'party' ? 'party' : 'private',
      source: 'player', at_turn: session.turn, scene_id: session.sceneId }].slice(-12)
  } });
}

export function modelMemoryPacket(session, id) {
  const character = actor(session, id);
  if (!character) return { goal: '', memory_notes: [] };
  return { goal: goalOf(session, id), memory_notes: memoryFor(session, id, 'self').slice(-8)
    .map(m => ({ note: m.note, visibility: m.visibility, source: m.source })) };
}

export function localSuggestion(session, id) {
  const character = actor(session, id);
  if (!character) return null;
  const scene = currentScene(session);
  return { action: 'investigate', skill: character.skill,
    intent: 'I want to examine ' + scene.title + ' using my ' + character.skill + ' training.' };
}

export function stageCompanionProposal(session, id, proposal, source = 'local') {
  const character = actor(session, id);
  const agency = state(session);
  if (!character || agency.pending || !proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return session;
  // Specialization is fixed by the rules, not by a generated model preference.
  if (proposal.action !== 'investigate' || proposal.skill !== character.skill) return session;
  const intent = text(proposal.intent, 220);
  if (intent.length < 4) return session;
  return withAgency(session, { ...agency, pending: {
    actor_id: id, action: 'investigate', skill: character.skill, intent,
    source: source === 'model' ? 'model' : 'local',
    anchor: { scene_id: session.sceneId, turn: session.turn, seed: session.seed }
  } });
}

export function pendingProposal(session) {
  return state(session).pending;
}

export function declineCompanionProposal(session) {
  const proposal = pendingProposal(session);
  if (!proposal) return session;
  const agency = state(session);
  const companion = COMPANIONS.find(c => c.id === proposal.actor_id);
  const without = { ...session, agency: { ...agency, pending: null } };
  return { ...without, history: [...session.history, {
    type: 'companion_declined', turn: session.turn, actor_id: proposal.actor_id,
    message: (companion?.name || 'Companion') + "'s suggested action was declined by the player."
  }].slice(-100) };
}

export function approveCompanionProposal(session) {
  const proposal = pendingProposal(session);
  if (!proposal) return session;
  const character = actor(session, proposal.actor_id);
  if (!character || character.skill !== proposal.skill || proposal.action !== 'investigate') return session;
  const scene = currentScene(session);
  const roll = nextDie(session.seed);
  const dc = Math.min(25, scene.skill === character.skill ? scene.dc : scene.dc + 3);
  const bonus = 3; // Fixed trained-companion bonus. Not model-supplied.
  const total = roll.value + bonus;
  const success = total >= dc;
  const clue = success && scene.skill === character.skill && scene.reward
    ? scene.title + ': ' + scene.reward : '';
  const clues = clue && !session.clues.includes(clue) ? [...session.clues, clue].slice(-100) : session.clues;
  const turn = session.turn + 1;
  const event = {
    type: 'companion_roll', turn, actor_id: character.id, sceneId: scene.id,
    action: proposal.intent, skill: character.skill, die: roll.value, bonus, total, dc, success,
    source: proposal.source,
    message: character.name + ' attempts: ' + proposal.intent + ' | ' + character.skill +
      ': ' + roll.value + ' + ' + bonus + ' = ' + total + ' vs DC ' + dc +
      ' (' + (success ? 'success' : 'failure') + ')' + (clue ? ' | Clue: ' + clue : '')
  };
  const agency = state(session);
  const memo = { note: character.name + ' investigated ' + scene.title + ' at turn ' + turn +
      ' and ' + (success ? 'succeeded' : 'failed') + '.',
    visibility: 'party', source: 'approved_turn', at_turn: turn, scene_id: scene.id };
  const nextAgency = {
    ...agency, pending: null,
    memories: { ...agency.memories, [character.id]:
      [...(agency.memories[character.id] || []), memo].slice(-12) }
  };
  const next = { ...session, turn, seed: roll.seed, clues,
    history: [...session.history, event].slice(-100) };
  return withAgency(next, nextAgency);
}

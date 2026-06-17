import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const STORAGE_KEY = 'porchquest369.browserCampaign.v7';
const LEGACY_STORAGE_KEYS = [
  'porchquest369.browserCampaign.v6',
  'porchquest369.browserCampaign.v5',
  'porchquest369.browserCampaign.v4',
  'porchquest369.browserCampaign.v3',
  'porchquest369.browserCampaign.v2',
  'porchquest369.browserCampaign.v1'
];
const BRIDGE_SETTINGS_KEY = 'porchquest369.backendBridge.v3';
const LEGACY_BRIDGE_SETTINGS_KEYS = ['porchquest369.backendBridge.v2', 'porchquest369.backendBridge.v1'];

const CONDITION_META = {
  watched: { label: 'Watched', detail: 'The hill has noticed your route. Camp clears this pressure.', tone: 'pressure' },
  tired: { label: 'Tired', detail: 'Your body needs care. Camp clears this and restores HP.', tone: 'pressure' },
  inspired: { label: 'Inspired', detail: 'Your next risky roll gains +1, then the tag clears.', tone: 'boon' },
  marked: { label: 'Marked', detail: 'A trail sign follows you until camp clears it.', tone: 'pressure' },
  hidden: { label: 'Hidden', detail: 'You are moving quietly through the hill paths.', tone: 'boon' }
};

const CLASS_PRESETS = {
  'Lantern-Seeker': { hp: 12, hp_max: 12, ac: 12, skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp'] },
  'Porch Warden': { hp: 15, hp_max: 15, ac: 14, skills: { stealth: 0, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['oiled cloak', 'warden badge', 'lantern shield', 'field rope', '8 gp'] },
  'Hill Scout': { hp: 11, hp_max: 11, ac: 13, skills: { stealth: 3, perception: 2, persuasion: 0, arcana: 0, survival: 3 }, inventory: ['hooded cloak', 'trail chalk', 'field kit', '7 gp'] },
  'Memory Bard': { hp: 10, hp_max: 10, ac: 12, skills: { stealth: 1, perception: 1, persuasion: 3, arcana: 1, survival: 0 }, inventory: ['story lute', 'silver quill', 'memory ribbon', 'travel journal', '12 gp'] }
};

const BASE_QUESTS = [
  { id: 'q_main_1', title: 'Find the missing porch key', status: 'active', progress: 0, max_progress: 5, clues: [] },
  { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", status: 'active', progress: 0, max_progress: 4, clues: [] },
  { id: 'q_mystery_1', title: 'Learn why the hill doors remember lies', status: 'active', progress: 0, max_progress: 4, clues: [] }
];

const BASE_NODES = [
  { id: 'infinite_porch', title: 'The Infinite Porch', type: 'location', summary: 'A threshold porch that opens toward Blackwood Hill.' },
  { id: 'blackwood_hill', title: 'Blackwood Hill', type: 'location', summary: 'A rain-dark hill where doors remember lies and lanterns reveal hidden paths.' }
];

const SCENE_CARDS = [
  { id: 'porch_threshold', act: 'I', title: 'The Porch Threshold', location: 'The Infinite Porch', text: 'Blue lanterns pulse beyond the rail. The boards knock like they know a secret.', choices: [
    { label: 'Search under the loose board', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold knock clue', patch: { type: 'append_fact', node_id: 'infinite_porch', facts: ['The porch boards knock when a key-fragment is close.'], reason: 'Scene revealed a porch threshold clue.' } },
    { label: 'Ask Old Joss what the hill wants', skill: 'persuasion', dc: 12, quest_id: 'q_mystery_1', reward: 'Old Joss warning', patch: { type: 'upsert_node', node: { id: 'old_joss_warning', title: 'Old Joss Warning', summary: 'Keys remember mercy; doors remember lies.', type: 'clue' }, reason: 'Scene recorded Old Joss warning.' } }
  ] },
  { id: 'left_trail', act: 'I', title: 'The Left Trail', location: 'Blackwood Hill', text: 'A left-hand trail curls upward through wet fern and blue soot marks.', choices: [
    { label: 'Track the lantern soot', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'apprentice soot clue', add_items: ['lantern soot sample'] },
    { label: 'Move quietly past the black pines', skill: 'stealth', dc: 13, quest_id: 'q_main_1', reward: 'safe trail marker', add_items: ['safe trail marker'], add_conditions: ['hidden'] }
  ] },
  { id: 'toll_of_names', act: 'I', title: 'The Toll of Names', location: 'Blackwood Hill Gate', text: 'A mossy turnstile asks for a name, but every name on its brass plate is crossed out.', choices: [
    { label: 'Offer a kind nickname instead', skill: 'persuasion', dc: 13, quest_id: 'q_mystery_1', reward: 'name-toll mercy clue', add_items: ['brass name shaving'] },
    { label: 'Study the scratched-out plates', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'crossed-name clue', patch: { type: 'upsert_node', node: { id: 'name_toll', title: 'Name Toll', summary: 'The hill tests identity without needing a true name.', type: 'threshold' }, reason: 'Scene established the name toll.' } }
  ] },
  { id: 'lantern_maker_window', act: 'II', title: "Lantern-Maker's Window", location: 'Hill Workshop Ruin', text: 'A cracked workshop window glows with a cold blue afterimage. A child-sized handprint shines in ash on the sill.', choices: [
    { label: 'Read the ash handprint', skill: 'arcana', dc: 13, quest_id: 'q_side_1', reward: 'apprentice handprint clue', add_items: ['ash handprint rubbing'] },
    { label: 'Use the lantern light in the window', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'key shadow clue' }
  ] },
  { id: 'root_bridge', act: 'II', title: 'The Root Bridge', location: 'Ravine of Quiet Roots', text: 'Twisted roots form a bridge over a ravine where the rain falls upward.', choices: [
    { label: 'Cross by listening to the roots', skill: 'survival', dc: 13, quest_id: 'q_side_1', reward: 'root bridge route', add_conditions: ['inspired'] },
    { label: 'Map the upward rain', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'upward rain receipt', patch: { type: 'append_fact', node_id: 'blackwood_hill', facts: ['Rain runs upward near the root bridge when the hill is hiding a witness.'], reason: 'Scene mapped the root bridge.' } }
  ] },
  { id: 'rain_library', act: 'II', title: 'The Rain Library', location: 'Under the Laurel Canopy', text: 'Each falling drop lands as a sentence on a leaf before sliding into the mud.', choices: [
    { label: 'Read the leaf-sentences aloud', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'rain-library receipt', add_items: ['leaf sentence copy'] },
    { label: 'Search for the apprentice note', skill: 'perception', dc: 13, quest_id: 'q_side_1', reward: 'muddy apprentice note', add_items: ['muddy apprentice note'] }
  ] },
  { id: 'memory_door', act: 'II', title: 'The Door That Keeps Receipts', location: 'Blackwood Hill', text: 'A door stands alone in the rain. Each drop becomes handwriting for one breath.', choices: [
    { label: 'Answer the door truthfully', skill: 'persuasion', dc: 13, quest_id: 'q_mystery_1', reward: 'truthful answer receipt', patch: { type: 'append_fact', node_id: 'blackwood_hill', facts: ['Truthful answers weaken the hill doors.'], reason: 'Scene tested the memory door.' } },
    { label: 'Write down what the door asks', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'door question receipt', add_items: ['door question receipt'] }
  ] },
  { id: 'candle_market', act: 'III', title: 'The Candle Market', location: 'Old Hill Square', text: 'Tiny booths sell lost minutes, honest apologies, and maps that only open under blue light.', choices: [
    { label: 'Trade a small kindness for a map', skill: 'persuasion', dc: 14, quest_id: 'q_main_1', reward: 'blue-light map', add_items: ['blue-light map'] },
    { label: 'Find the apprentice booth mark', skill: 'perception', dc: 14, quest_id: 'q_side_1', reward: 'apprentice booth mark', add_items: ['apprentice booth mark'] }
  ] },
  { id: 'iron_saint_beneath', act: 'III', title: 'The Iron Saint Beneath the Hill', location: 'Under Blackwood Hill', text: 'Below the roots, an iron guardian waits beside a keyhole shaped like mercy.', choices: [
    { label: 'Offer the repaired key-sign', skill: 'perception', dc: 14, quest_id: 'q_main_1', reward: 'repaired porch key', add_items: ['repaired porch key'] },
    { label: 'Speak the receipts aloud', skill: 'persuasion', dc: 14, quest_id: 'q_mystery_1', reward: 'hill truth receipt', add_conditions: ['inspired'] }
  ] }
];

const ENCOUNTERS = [
  { id: 'blue_moth_swarm', title: 'Blue-Fire Moth Swarm', scene: 'A spiral of blue-fire moths forms a living arrow above the wet path.', skill: 'survival', dc: 12, reward: 'moth trail clue', quest_id: 'q_side_1' },
  { id: 'lying_door', title: 'The Lying Door', scene: 'A freestanding door waits between two black pines and asks one careful question.', skill: 'persuasion', dc: 13, reward: 'door-memory clue', quest_id: 'q_mystery_1' },
  { id: 'porch_key_echo', title: 'Porch Key Echo', scene: 'Something under the boards knocks in the rhythm of your heartbeat.', skill: 'perception', dc: 12, reward: 'brass key tooth clue', quest_id: 'q_main_1' },
  { id: 'rootbound_choir', title: 'Rootbound Choir', scene: 'Roots hum below the mud like a choir trying not to wake the hill.', skill: 'arcana', dc: 14, reward: 'root harmony clue', quest_id: 'q_mystery_1' },
  { id: 'lantern_glass_fox', title: 'Lantern-Glass Fox', scene: 'A fox-shaped flicker of lantern glass runs ahead, carrying a tiny blue spark.', skill: 'stealth', dc: 13, reward: 'glass fox spark', quest_id: 'q_main_1' },
  { id: 'apprentice_whistle', title: 'Apprentice Whistle', scene: 'A three-note whistle echoes from a hollow stump, then waits for an answer.', skill: 'perception', dc: 12, reward: 'three-note whistle clue', quest_id: 'q_side_1' }
];

const NPCS = [
  { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', vibe: 'Kind, evasive, and allergic to simple answers.', ask: 'Take the left trail when the hill asks your name.', aid: { quest_id: 'q_main_1', clue: 'Old Joss says the missing key answers to mercy.', add_items: ['Joss left-trail note'] } },
  { id: 'mara_lanternwright', title: 'Mara Lanternwright', role: 'Lantern-maker', vibe: 'Tired hands, bright eyes, refusing to give up.', ask: 'The soot pattern appears only when the apprentice is nearby.', aid: { quest_id: 'q_side_1', clue: 'Mara identifies blue ash as the apprentice signal.', add_items: ['lanternwright ash lens'] } },
  { id: 'nix_understep', title: 'Nix Understep', role: 'Hill-runner', vibe: 'Fast, funny, and serious about never lying to doors.', ask: 'Every door is hungry for contradiction.', aid: { quest_id: 'q_mystery_1', clue: 'Nix says witnessed records weaken the doors.', add_items: ['Nix door-map scrap'] } },
  { id: 'sister_candle', title: 'Sister Candle', role: 'Candle Court exile', vibe: 'Formal, sorrowful, and secretly rooting for impossible rescues.', ask: 'Written receipts are harder to bend than memories.', aid: { quest_id: 'q_mystery_1', clue: 'The Candle Court avoids witnessed records.', add_items: ['wax-sealed memory token'] } },
  { id: 'bram_bleecker', title: 'Bram Bleecker', role: 'Porch courier', vibe: 'Cheerfully damp and carrying too many sealed envelopes.', ask: 'A message for the apprentice was returned unopened.', aid: { quest_id: 'q_side_1', clue: 'Bram saw the apprentice near the root bridge.', add_items: ['returned apprentice envelope'] } },
  { id: 'thimble_ren', title: 'Thimble Ren', role: 'Map-mender', vibe: 'Small spectacles, giant opinions about honest roads.', ask: 'A map that refuses to fold is trying to tell the truth.', aid: { quest_id: 'q_main_1', clue: 'Ren marks the key route beside the Candle Market.', add_items: ['ren-fold map'] } }
];

const REWARD_TABLE = [
  { id: 'warm_cider', title: 'Warm Cider Receipt', text: 'A porch mug warms your hands. Restore 1 HP and clear tired.', items: ['warm cider receipt'], clear_conditions: ['tired'] },
  { id: 'blue_thread', title: 'Blue Thread Spool', text: 'A blue thread points toward what was almost forgotten.', items: ['blue thread spool'], quest_id: 'q_main_1', clue: 'Blue thread points toward the missing porch key.' },
  { id: 'apprentice_button', title: 'Apprentice Button', text: 'A brass button still smells faintly of lantern oil.', items: ['apprentice button'], quest_id: 'q_side_1', clue: 'The apprentice lost a button near the hill square.' },
  { id: 'truth_chalk', title: 'Truth Chalk', text: 'This chalk writes clearly on doors that prefer fog.', items: ['truth chalk'], quest_id: 'q_mystery_1', clue: 'Truth chalk can pin a door-story in place.' },
  { id: 'porch_coin', title: 'Porch Coin', text: 'A coin with a porch on both sides lands on its edge.', items: ['porch coin'], conditions: ['inspired'] },
  { id: 'dry_matchbook', title: 'Dry Matchbook', text: 'Every match is dry despite the rain.', items: ['dry matchbook'], quest_id: 'q_main_1', clue: 'Dry matches burn blue near key fragments.' }
];

function stamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function msg(role, text) { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, text, at: stamp() }; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function uniq(list) { return Array.from(new Set((list || []).filter(Boolean))); }
function nextSeed(seed) { return (Number(seed || 369) * 1664525 + 1013904223) % 4294967296; }

function defaultCampaign(playerName = 'Mikey', className = 'Lantern-Seeker') {
  const preset = CLASS_PRESETS[className] || CLASS_PRESETS['Lantern-Seeker'];
  return normalize({ id: 'browser-blackwood-hill', version: 7, name: 'Lanterns Under Blackwood Hill', player: { name: playerName, class_name: className, ...preset }, quests: BASE_QUESTS, world_nodes: BASE_NODES, pending_patches: [], active_scene: null, active_encounter: null, npcs: {}, flags: {}, conditions: [], ending: null, seed: 369, receipts: [], story_log: [msg('dm', 'Rain taps the Infinite Porch. Blue lanterns glow beyond the rail. Blackwood Hill is waiting.')] });
}

function normalize(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const p = c.player && typeof c.player === 'object' ? c.player : {};
  const preset = CLASS_PRESETS[p.class_name] || CLASS_PRESETS['Lantern-Seeker'];
  return {
    id: c.id || 'browser-blackwood-hill',
    version: 7,
    name: c.name || 'Lanterns Under Blackwood Hill',
    player: { name: p.name || 'Mikey', class_name: p.class_name || 'Lantern-Seeker', hp: Number.isFinite(p.hp) ? p.hp : preset.hp, hp_max: Number.isFinite(p.hp_max) ? p.hp_max : preset.hp_max, ac: Number.isFinite(p.ac) ? p.ac : preset.ac, skills: p.skills || preset.skills, inventory: uniq(p.inventory || preset.inventory) },
    quests: (Array.isArray(c.quests) && c.quests.length ? c.quests : BASE_QUESTS).map((q, i) => ({ id: q.id || BASE_QUESTS[i]?.id || `q_${i}`, title: q.title || BASE_QUESTS[i]?.title || 'Quest', status: q.status || 'active', progress: Number.isFinite(q.progress) ? q.progress : 0, max_progress: Number.isFinite(q.max_progress) ? q.max_progress : BASE_QUESTS[i]?.max_progress || 3, clues: uniq(q.clues || []) })),
    world_nodes: Array.isArray(c.world_nodes) && c.world_nodes.length ? c.world_nodes : BASE_NODES,
    pending_patches: Array.isArray(c.pending_patches) ? c.pending_patches : [],
    active_scene: c.active_scene || null,
    active_encounter: c.active_encounter || null,
    npcs: c.npcs && typeof c.npcs === 'object' ? c.npcs : {},
    flags: c.flags && typeof c.flags === 'object' ? c.flags : {},
    conditions: uniq(c.conditions || p.conditions || []),
    ending: c.ending || null,
    seed: Number.isFinite(c.seed) ? c.seed : 369,
    receipts: uniq(c.receipts || []),
    story_log: Array.isArray(c.story_log) && c.story_log.length ? c.story_log : [msg('dm', 'The porch is awake. Draw a scene, meet an NPC, or type an action.')]
  };
}

function loadCampaign() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try { return normalize(JSON.parse(raw)); } catch { /* keep trying */ }
  }
  return defaultCampaign();
}

function loadBridge() {
  const defaults = { enabled: false, apiBase: API_BASE, serverCampaignId: '', status: 'Browser Oracle ready.', lastSync: '' };
  for (const key of [BRIDGE_SETTINGS_KEY, ...LEGACY_BRIDGE_SETTINGS_KEYS]) {
    try { const raw = localStorage.getItem(key); if (raw) return { ...defaults, ...JSON.parse(raw) }; } catch { /* ignore */ }
  }
  return defaults;
}

function addLog(c, role, text) { return { ...c, story_log: [...(c.story_log || []), msg(role, text)].slice(-120) }; }
function addConditions(c, tags) { return { ...c, conditions: uniq([...(c.conditions || []), ...(tags || [])]) }; }
function removeConditions(c, tags) { return { ...c, conditions: (c.conditions || []).filter((x) => !(tags || []).includes(x)) }; }
function addItems(c, items) { return items?.length ? { ...c, player: { ...c.player, inventory: uniq([...(c.player.inventory || []), ...items]) } } : c; }
function queuePatch(c, patch) { return patch ? { ...c, pending_patches: [...c.pending_patches, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, patch, reason: patch.reason || 'Gameplay discovery awaits approval.' }] } : c; }
function addReceipt(c, id, text) {
  if (!id || (c.receipts || []).includes(id)) return c;
  return addLog({ ...c, receipts: [...(c.receipts || []), id] }, 'system', `Receipt unlocked: ${text}`);
}
function updateQuest(c, questId, clue, amount = 1) {
  if (!questId) return c;
  return { ...c, quests: c.quests.map((q) => q.id === questId ? { ...q, progress: clamp((q.progress || 0) + amount, 0, q.max_progress), status: (q.progress || 0) + amount >= q.max_progress ? 'complete' : q.status, clues: uniq([...(q.clues || []), clue]) } : q) };
}
function roll(c, skill, dc) {
  const seed = nextSeed(c.seed);
  const raw = (seed % 20) + 1;
  const inspired = (c.conditions || []).includes('inspired') ? 1 : 0;
  const tired = (c.conditions || []).includes('tired') ? -1 : 0;
  const hidden = (c.conditions || []).includes('hidden') && ['stealth', 'perception'].includes(skill) ? 1 : 0;
  const mod = Number(c.player.skills?.[skill] || 0) + inspired + tired + hidden;
  const total = raw + mod;
  return { seed, raw, mod, total, dc, skill, success: raw === 20 || total >= dc, usedInspired: Boolean(inspired) };
}
function adventureState(c) {
  const done = c.quests.filter((q) => q.status === 'complete').length;
  const progress = c.quests.reduce((s, q) => s + (q.progress || 0), 0);
  if (c.ending?.status === 'complete') return { label: 'Starter adventure complete', detail: c.ending.title || 'Ending recorded', complete: true, readyFinale: false };
  if (done >= 3) return { label: 'Finale ready', detail: 'All three starter quests are complete. Open the Blackwood Hill finale.', complete: false, readyFinale: true };
  if (progress >= 9) return { label: 'Finale nearly ready', detail: 'The key, apprentice, and memory-door threads are converging.', complete: false, readyFinale: false };
  if (progress >= 5) return { label: 'Hot thread', detail: 'Blackwood Hill is responding to your receipts.', complete: false, readyFinale: false };
  return { label: 'Adventure in motion', detail: 'Gather clues through scenes, encounters, NPCs, items, and rewards.', complete: false, readyFinale: false };
}
function chooseFrom(c, list, seenKey) {
  const seed = nextSeed(c.seed);
  const seen = c.flags?.[seenKey] || [];
  const pool = list.filter((x) => !seen.includes(x.id));
  const card = (pool.length ? pool : list)[seed % (pool.length ? pool.length : list.length)];
  return { seed, card };
}
function applySuccess(c, source, payload) {
  let next = c;
  next = addItems(next, payload.add_items || (payload.reward ? [payload.reward] : []));
  next = addConditions(next, payload.add_conditions || []);
  next = updateQuest(next, payload.quest_id, payload.reward || payload.clue || source, payload.quest_amount || 1);
  next = queuePatch(next, payload.patch);
  next = addReceipt(next, `first-${source}`, `First ${source} success`);
  return next;
}
function resolveChoiceLocal(c, card, choice, kind = 'scene') {
  const check = roll(c, choice.skill || 'perception', Number(choice.dc || 12));
  let next = { ...c, seed: check.seed };
  if (check.usedInspired) next = removeConditions(next, ['inspired']);
  if (check.success) {
    next = applySuccess(next, kind, choice);
    next = addLog(next, 'dm', `${kind === 'scene' ? card.title : card.title}: success on ${check.skill} ${check.total}/${check.dc}. You gain ${choice.reward || 'a clue'}.`);
  } else {
    next = addConditions(next, kind === 'scene' ? ['watched'] : ['marked']);
    next = addLog(next, 'dm', `${card.title}: ${check.skill} ${check.total}/${check.dc}. The thread resists; a pressure tag is added.`);
  }
  return next;
}
function mergeServerCampaign(current, incoming) {
  if (!incoming || typeof incoming !== 'object') return current;
  return normalize({ ...current, ...incoming, player: { ...current.player, ...(incoming.player || {}) } });
}

export default function AppV7({ icons = {} }) {
  const { Dice5, ScrollText, Backpack, Map, Sparkles } = icons;
  const [campaign, setCampaign] = useState(loadCampaign);
  const [bridge, setBridge] = useState(loadBridge);
  const [prompt, setPrompt] = useState('');
  const [setup, setSetup] = useState({ name: campaign.player.name, className: campaign.player.class_name });
  const state = useMemo(() => adventureState(campaign), [campaign]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign)); }, [campaign]);
  useEffect(() => { localStorage.setItem(BRIDGE_SETTINGS_KEY, JSON.stringify(bridge)); }, [bridge]);

  async function api(path, options = {}) {
    const base = (bridge.apiBase || API_BASE).replace(/\/$/, '');
    const res = await fetch(`${base}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options, body: options.body ? JSON.stringify(options.body) : undefined });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  async function withBackend(path, body, fallback) {
    if (bridge.enabled && bridge.serverCampaignId) {
      try {
        const data = await api(path.replace(':id', bridge.serverCampaignId), { method: 'POST', body });
        const next = mergeServerCampaign(campaign, data.campaign || data);
        setCampaign(next);
        setBridge((b) => ({ ...b, status: `Backend used: ${path}`, lastSync: new Date().toLocaleString() }));
        return;
      } catch (err) {
        setBridge((b) => ({ ...b, status: `Backend fallback: ${err.message}` }));
      }
    }
    setCampaign(fallback(campaign));
  }

  function newCampaign() { setCampaign(defaultCampaign(setup.name || 'Mikey', setup.className)); }
  function submitPrompt(e) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    setCampaign((c) => addLog(addLog(c, 'player', text), 'dm', `The hill listens. Draw a scene, meet an NPC, seek a reward, or roll a skill to turn that intent into a receipt.`));
    setPrompt('');
  }
  function drawSceneLocal(c) {
    const { seed, card } = chooseFrom(c, SCENE_CARDS, 'seenScenes');
    return addLog({ ...c, seed, active_scene: card, flags: { ...c.flags, seenScenes: uniq([...(c.flags?.seenScenes || []), card.id]) } }, 'dm', `Scene drawn: ${card.title}\n\n${card.text}`);
  }
  function resolveSceneLocal(c, index = 0) {
    if (!c.active_scene) return addLog(c, 'system', 'Draw a scene first.');
    const choice = c.active_scene.choices[index];
    return { ...resolveChoiceLocal(c, c.active_scene, choice, 'scene'), active_scene: null };
  }
  function drawEncounterLocal(c) {
    const { seed, card } = chooseFrom(c, ENCOUNTERS, 'seenEncounters');
    return addLog({ ...c, seed, active_encounter: card, flags: { ...c.flags, seenEncounters: uniq([...(c.flags?.seenEncounters || []), card.id]) } }, 'dm', `Encounter: ${card.title}\n\n${card.scene}`);
  }
  function resolveEncounterLocal(c) {
    if (!c.active_encounter) return addLog(c, 'system', 'Draw an encounter first.');
    return { ...resolveChoiceLocal(c, c.active_encounter, c.active_encounter, 'encounter'), active_encounter: null };
  }
  function meetNpcLocal(c) {
    const { seed, card } = chooseFrom(c, NPCS, 'seenNpcs');
    return addLog({ ...c, seed, npcs: { ...c.npcs, [card.id]: { ...card, trust: c.npcs?.[card.id]?.trust || 1 } }, flags: { ...c.flags, seenNpcs: uniq([...(c.flags?.seenNpcs || []), card.id]) } }, 'dm', `NPC met: ${card.title} — ${card.role}. ${card.vibe}`);
  }
  function askNpc(id) {
    const npc = NPCS.find((n) => n.id === id) || campaign.npcs[id];
    if (!npc?.aid) return;
    let next = updateQuest(campaign, npc.aid.quest_id, npc.aid.clue, 1);
    next = addItems(next, npc.aid.add_items || []);
    next = addConditions(next, ['inspired']);
    next = addReceipt(next, `npc-${id}`, `Helped by ${npc.title}`);
    next = addLog(next, 'dm', `${npc.title}: ${npc.ask}`);
    setCampaign(next);
  }
  function drawRewardLocal(c) {
    const { seed, card } = chooseFrom(c, REWARD_TABLE, 'seenRewards');
    let next = { ...c, seed, flags: { ...c.flags, seenRewards: uniq([...(c.flags?.seenRewards || []), card.id]) } };
    next = addItems(next, card.items || []);
    next = addConditions(next, card.conditions || []);
    next = removeConditions(next, card.clear_conditions || []);
    next = updateQuest(next, card.quest_id, card.clue, card.quest_id ? 1 : 0);
    next = addReceipt(next, `reward-${card.id}`, card.title);
    return addLog(next, 'dm', `Reward found: ${card.title}\n${card.text}`);
  }
  function campLocal(c) {
    let next = { ...c, player: { ...c.player, hp: c.player.hp_max } };
    next = removeConditions(next, ['watched', 'tired', 'marked']);
    next = addReceipt(next, 'camp-rested', 'Camp rest completed');
    return addLog(next, 'dm', 'Camp: You rest under the porch-light tarp. HP restores and pressure tags clear.');
  }
  function finaleLocal(c) {
    const s = adventureState(c);
    const title = s.readyFinale ? 'Lanterns Under Blackwood Hill complete' : 'Partial ending recorded';
    let next = { ...c, ending: { status: s.readyFinale ? 'complete' : 'partial', title, recorded_at: new Date().toISOString() } };
    next = removeConditions(next, ['watched', 'tired', 'marked', 'hidden']);
    next = addReceipt(next, 'starter-ending', title);
    return addLog(next, 'dm', `${title}. The porch opens homeward, carrying every approved receipt with it.`);
  }

  async function createServerCampaign() {
    try {
      const data = await api('/api/campaigns', { method: 'POST', body: { player_name: campaign.player.name } });
      const id = data.id || data.campaign_id || data?.campaign?.id;
      setBridge((b) => ({ ...b, enabled: true, serverCampaignId: id || b.serverCampaignId, status: `Linked server campaign ${id || '(unknown id)'}`, lastSync: new Date().toLocaleString() }));
    } catch (err) { setBridge((b) => ({ ...b, status: `Create failed: ${err.message}` })); }
  }
  async function loadFromServer() {
    if (!bridge.serverCampaignId) return;
    try {
      const data = await api(`/api/campaigns/${bridge.serverCampaignId}`);
      setCampaign(mergeServerCampaign(campaign, data.campaign || data));
      setBridge((b) => ({ ...b, enabled: true, status: `Loaded ${bridge.serverCampaignId}`, lastSync: new Date().toLocaleString() }));
    } catch (err) { setBridge((b) => ({ ...b, status: `Load failed: ${err.message}` })); }
  }
  async function saveToServer() {
    if (!bridge.serverCampaignId) return;
    try {
      await api(`/api/campaigns/${bridge.serverCampaignId}/sync_from_client`, { method: 'POST', body: { campaign } });
      setBridge((b) => ({ ...b, enabled: true, status: `Saved ${bridge.serverCampaignId}`, lastSync: new Date().toLocaleString() }));
    } catch (err) { setBridge((b) => ({ ...b, status: `Save failed: ${err.message}` })); }
  }

  const approvePatch = (id) => setCampaign((c) => {
    const card = c.pending_patches.find((p) => p.id === id);
    let next = { ...c, pending_patches: c.pending_patches.filter((p) => p.id !== id) };
    if (card?.patch?.node) next = { ...next, world_nodes: uniq([...next.world_nodes.map((n) => n.id), card.patch.node.id]).length ? [...next.world_nodes.filter((n) => n.id !== card.patch.node.id), card.patch.node] : next.world_nodes };
    return addLog(next, 'system', `Canon approved: ${card?.reason || 'world patch'}`);
  });
  const rejectPatch = (id) => setCampaign((c) => ({ ...c, pending_patches: c.pending_patches.filter((p) => p.id !== id) }));
  const clearCondition = (tag) => setCampaign((c) => removeConditions(c, [tag]));
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'porchquest369-save-v7.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importSave = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    file.text().then((text) => setCampaign(normalize(JSON.parse(text))));
  };

  return <div className="app-shell">
    <header className="hero">
      <div>
        <p className="eyebrow">PorchQuest369 v0.7</p>
        <h1>Lanterns Under<br />Blackwood Hill</h1>
        <p className="subtitle">A browser-first prompt RPG with expanded scenes, NPCs, rewards, receipts, and optional backend sync.</p>
      </div>
      <div className="hero-card">
        <span>Adventure State</span><strong>{state.label}</strong><p className="muted">{state.detail}</p><em>{campaign.receipts.length} receipts unlocked</em>
      </div>
    </header>
    <main className="grid">
      <section className="panel story">
        <h2>{ScrollText ? <ScrollText size={18} /> : null} Story Log</h2>
        <div className="story-log">{campaign.story_log.map((m) => <article className={`message ${m.role}`} key={m.id}><span>{m.role} • {m.at}</span><p>{m.text}</p></article>)}</div>
        <form className="prompt-bar" onSubmit={submitPrompt}><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What do you do?" /><button>Send</button></form>
        <div className="button-row wide">
          <button onClick={() => withBackend('/api/campaigns/:id/scene/draw', {}, drawSceneLocal)}>Draw Scene</button>
          <button onClick={() => withBackend('/api/campaigns/:id/encounter/draw', {}, drawEncounterLocal)}>Draw Encounter</button>
          <button onClick={() => withBackend('/api/campaigns/:id/npc/meet', {}, meetNpcLocal)}>Meet NPC</button>
          <button onClick={() => setCampaign(drawRewardLocal)}>Reward</button>
          <button onClick={() => withBackend('/api/campaigns/:id/camp', {}, campLocal)}>Camp</button>
          <button onClick={() => withBackend('/api/campaigns/:id/finale', {}, finaleLocal)}>Finale</button>
        </div>
      </section>
      <aside className="sidebar">
        <section className="panel">
          <h2>{Dice5 ? <Dice5 size={18} /> : null} Character</h2>
          <div className="stack"><label>Name<input value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} /></label><label>Class<select value={setup.className} onChange={(e) => setSetup({ ...setup, className: e.target.value })}>{Object.keys(CLASS_PRESETS).map((name) => <option key={name}>{name}</option>)}</select></label><button className="ghost" onClick={newCampaign}>New Campaign</button></div>
          <div className="stats-row"><div className="stat-pill"><span>HP</span><strong>{campaign.player.hp}/{campaign.player.hp_max}</strong></div><div className="stat-pill"><span>AC</span><strong>{campaign.player.ac}</strong></div><div className="stat-pill"><span>Class</span><strong>{campaign.player.class_name}</strong></div></div>
          <div className="condition-grid">{campaign.conditions.length ? campaign.conditions.map((tag) => <button key={tag} className={`condition-chip ${CONDITION_META[tag]?.tone || ''}`} onClick={() => clearCondition(tag)}><strong>{CONDITION_META[tag]?.label || tag}</strong><span>{CONDITION_META[tag]?.detail || 'Condition active.'}</span></button>) : <button className="condition-chip clear" disabled><strong>Clear</strong><span>No condition tags active.</span></button>}</div>
        </section>
        <section className="panel">
          <h2>{Sparkles ? <Sparkles size={18} /> : null} Backend Bridge</h2>
          <div className="engine-status"><strong>{bridge.enabled ? 'Backend mode' : 'Browser mode'}</strong><span>{bridge.lastSync || 'local'}</span></div>
          <div className="stack"><label>API base<input value={bridge.apiBase} onChange={(e) => setBridge({ ...bridge, apiBase: e.target.value })} /></label><label>Server campaign ID<input value={bridge.serverCampaignId} onChange={(e) => setBridge({ ...bridge, serverCampaignId: e.target.value })} /></label></div>
          <div className="button-row"><button onClick={() => setBridge({ ...bridge, enabled: !bridge.enabled })}>{bridge.enabled ? 'Use Browser' : 'Use Backend'}</button><button onClick={createServerCampaign}>Create</button><button onClick={loadFromServer}>Load ID</button><button onClick={saveToServer}>Save</button></div>
          <p className="test-result">{bridge.status}</p>
        </section>
        {campaign.active_scene ? <section className="panel"><h2>Active Scene</h2><div className="scene-card"><small>Act {campaign.active_scene.act} • {campaign.active_scene.location}</small><strong>{campaign.active_scene.title}</strong><p>{campaign.active_scene.text}</p><div className="choice-list">{campaign.active_scene.choices.map((choice, index) => <button key={choice.label} onClick={() => withBackend('/api/campaigns/:id/scene/resolve', { choice_index: index }, (c) => resolveSceneLocal(c, index))}>{choice.label}<span>{choice.skill} DC {choice.dc}</span></button>)}</div></div></section> : null}
        {campaign.active_encounter ? <section className="panel"><h2>Active Encounter</h2><div className="encounter-card"><strong>{campaign.active_encounter.title}</strong><p>{campaign.active_encounter.scene}</p><small>{campaign.active_encounter.skill} DC {campaign.active_encounter.dc}</small><button onClick={() => withBackend('/api/campaigns/:id/encounter/resolve', {}, resolveEncounterLocal)}>Resolve Encounter</button></div></section> : null}
        <section className="panel"><h2>NPCs</h2><ul className="list npc-list">{Object.values(campaign.npcs).length ? Object.values(campaign.npcs).map((npc) => <li key={npc.id}><strong>{npc.title}</strong>{npc.role}<small>{npc.vibe}</small><div className="trust-row"><span>Trust {npc.trust || 1}</span><button className="item-button" onClick={() => askNpc(npc.id)}>Ask</button></div></li>) : <li>No NPC cards met yet.</li>}</ul></section>
        <section className="panel"><h2>Quests</h2><ul className="list quests">{campaign.quests.map((q) => <li key={q.id}><strong>{q.status}</strong>{q.title}<div className="progress"><span style={{ width: `${Math.round(((q.progress || 0) / (q.max_progress || 1)) * 100)}%` }} /></div><small>{q.progress}/{q.max_progress} · {q.clues.slice(-2).join(' · ') || 'No clues yet'}</small></li>)}</ul></section>
        <section className="panel"><h2>{Backpack ? <Backpack size={18} /> : null} Inventory</h2><ul className="list inventory-list">{campaign.player.inventory.map((item) => <li key={item}><span>{item}</span></li>)}</ul></section>
        <section className="panel"><h2>Receipts</h2><ul className="list receipt-list">{campaign.receipts.length ? campaign.receipts.map((r) => <li key={r}>{r}</li>) : <li>No receipts unlocked yet.</li>}</ul></section>
        <section className="panel"><h2>{Map ? <Map size={18} /> : null} World + Canon</h2><ul className="list patches">{campaign.pending_patches.map((p) => <li key={p.id}><span>{p.reason}</span><div className="button-row"><button onClick={() => approvePatch(p.id)}>Approve</button><button className="secondary-inline" onClick={() => rejectPatch(p.id)}>Reject</button></div></li>)}</ul><p className="muted">{campaign.world_nodes.length} world nodes recorded.</p><div className="button-row"><button onClick={exportSave}>Export</button><label className="file-button">Import<input type="file" accept="application/json" onChange={importSave} /></label></div></section>
      </aside>
    </main>
  </div>;
}

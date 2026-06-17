import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const STATIC_PLAY = import.meta.env.VITE_STATIC_PLAY === '1';
const STORAGE_KEY = 'porchquest369.browserCampaign.v4';
const LEGACY_STORAGE_KEYS = [
  'porchquest369.browserCampaign.v3',
  'porchquest369.browserCampaign.v2',
  'porchquest369.browserCampaign.v1'
];
const DM_SETTINGS_KEY = 'porchquest369.dmSettings.v1';

const CLASS_PRESETS = {
  'Lantern-Seeker': {
    hp: 12,
    hp_max: 12,
    ac: 12,
    stats: { str: 10, dex: 12, con: 11, int: 11, wis: 13, cha: 12 },
    skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp']
  },
  'Porch Warden': {
    hp: 15,
    hp_max: 15,
    ac: 14,
    stats: { str: 13, dex: 10, con: 13, int: 10, wis: 12, cha: 11 },
    skills: { stealth: 0, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['oiled cloak', 'warden badge', 'lantern shield', 'hemp rope', '8 gp']
  },
  'Hill Scout': {
    hp: 11,
    hp_max: 11,
    ac: 13,
    stats: { str: 10, dex: 14, con: 11, int: 10, wis: 13, cha: 10 },
    skills: { stealth: 3, perception: 2, persuasion: 0, arcana: 0, survival: 3 },
    inventory: ['hooded cloak', 'shortbow', 'trail chalk', 'snare wire', '7 gp']
  },
  'Memory Bard': {
    hp: 10,
    hp_max: 10,
    ac: 12,
    stats: { str: 9, dex: 12, con: 10, int: 12, wis: 11, cha: 15 },
    skills: { stealth: 1, perception: 1, persuasion: 3, arcana: 1, survival: 0 },
    inventory: ['story lute', 'silver quill', 'memory ribbon', 'travel journal', '12 gp']
  }
};

const ENCOUNTER_CARDS = [
  {
    id: 'blue_moth_swarm',
    title: 'Blue-Fire Moth Swarm',
    scene: 'A spiral of blue-fire moths forms a living arrow above the wet path.',
    danger: 'If startled, the swarm marks you with cold sparks that draw hill-watchers.',
    skill: 'survival',
    dc: 12,
    reward: 'moth-marked trail clue',
    quest_id: 'q_side_1',
    patch: { type: 'upsert_node', node: { id: 'blue_fire_moth', title: 'Blue-Fire Moth', summary: 'A tiny watcher with flame-blue wings that appears when stealth changes the path.', type: 'creature', tags: ['encounter', 'lantern'] }, reason: 'Encounter card revealed the blue-fire moths.' }
  },
  {
    id: 'lying_door',
    title: 'The Lying Door',
    scene: 'A freestanding door waits between two black pines. Its knob is warm as a living hand.',
    danger: 'It asks one question and remembers the answer forever.',
    skill: 'persuasion',
    dc: 13,
    reward: 'door-memory clue',
    quest_id: 'q_mystery_1',
    patch: { type: 'append_fact', node_id: 'blackwood_hill', facts: ['A freestanding door on the hill tests answers and remembers lies.'], reason: 'Encounter card revealed how hill doors behave.' }
  },
  {
    id: 'porch_key_echo',
    title: 'Porch Key Echo',
    scene: 'Something under the boards knocks in the exact rhythm of your heartbeat.',
    danger: 'The echo can pull a memory loose if you answer too quickly.',
    skill: 'perception',
    dc: 12,
    reward: 'brass key tooth clue',
    quest_id: 'q_main_1',
    patch: { type: 'upsert_node', node: { id: 'brass_key_tooth', title: 'Brass Key Tooth', summary: 'A broken piece of a missing porch key. It points toward unresolved truths.', type: 'relic', tags: ['key', 'porch'] }, reason: 'Encounter card surfaced the key mystery.' }
  },
  {
    id: 'rootbound_choir',
    title: 'Rootbound Choir',
    scene: 'Roots hum below the mud like a choir trying not to wake the hill.',
    danger: 'A wrong step twists the trail back to where fear began.',
    skill: 'arcana',
    dc: 14,
    reward: 'rootbound harmony clue',
    quest_id: 'q_mystery_1',
    patch: { type: 'upsert_node', node: { id: 'rootbound_choir', title: 'Rootbound Choir', summary: 'Forest-root voices guarding buried promises beneath Blackwood Hill.', type: 'faction', tags: ['roots', 'hill'] }, reason: 'Encounter card introduced the Rootbound Choir.' }
  }
];

const SCENE_CARDS = [
  {
    id: 'porch_threshold',
    act: 'I',
    title: 'The Porch Threshold',
    location: 'The Infinite Porch',
    text: 'The porch boards knock beneath your boots. Blue lanterns pulse beyond the rail, and Old Joss waits as if he already heard your next question.',
    choices: [
      { label: 'Search under the loose board', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold knock clue', patch: { type: 'append_fact', node_id: 'infinite_porch', facts: ['The porch boards knock when a key-fragment is close.'], reason: 'Scene deck revealed a porch threshold clue.' } },
      { label: 'Ask Old Joss what the hill wants', skill: 'persuasion', dc: 12, quest_id: 'q_mystery_1', reward: 'Old Joss warning', patch: { type: 'upsert_node', node: { id: 'old_joss_warning', title: 'Old Joss Warning', summary: 'Keys remember mercy; doors remember lies.', type: 'clue', tags: ['joss', 'door'] }, reason: 'Scene deck recorded Old Joss warning.' } }
    ]
  },
  {
    id: 'left_trail',
    act: 'I',
    title: 'The Left Trail',
    location: 'Blackwood Hill',
    text: 'A left-hand trail curls upward through wet fern. Someone small left lantern soot on the stones.',
    choices: [
      { label: 'Track the lantern soot', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'apprentice soot clue', add_items: ['lantern soot sample'], patch: { type: 'upsert_node', node: { id: 'left_trail', title: 'The Left Trail', summary: 'A root-laced path where lantern soot marks the apprentice route.', type: 'trail', tags: ['apprentice', 'hill'] }, reason: 'Scene deck established the left trail.' } },
      { label: 'Move silently past the black pines', skill: 'stealth', dc: 13, quest_id: 'q_main_1', reward: 'safe trail marker', add_items: ['safe trail marker'] }
    ]
  },
  {
    id: 'lantern_maker_window',
    act: 'II',
    title: "Lantern-Maker's Window",
    location: 'Hill Workshop Ruin',
    text: 'A cracked workshop window glows with a cold blue afterimage. A child-sized handprint shines in ash on the sill.',
    choices: [
      { label: 'Read the ash handprint', skill: 'arcana', dc: 13, quest_id: 'q_side_1', reward: 'apprentice handprint clue', patch: { type: 'upsert_node', node: { id: 'missing_apprentice', title: 'Missing Apprentice', summary: 'The lantern-maker apprentice left blue ash marks while fleeing uphill.', type: 'npc', tags: ['apprentice', 'rescue'] }, reason: 'Scene deck introduced the apprentice trail.' } },
      { label: 'Use the lantern light in the window', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'key shadow clue' }
    ]
  },
  {
    id: 'memory_door',
    act: 'II',
    title: 'The Door That Keeps Receipts',
    location: 'Blackwood Hill',
    text: 'A door stands alone in the rain. Every drop that touches it becomes handwriting for one breath, then vanishes.',
    choices: [
      { label: 'Answer the door truthfully', skill: 'persuasion', dc: 13, quest_id: 'q_mystery_1', reward: 'truthful answer receipt', patch: { type: 'append_fact', node_id: 'blackwood_hill', facts: ['Truthful answers weaken the hill doors, while lies feed them.'], reason: 'Scene deck tested the memory door.' } },
      { label: 'Write down what the door asks', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'door question receipt', add_items: ['door question receipt'] }
    ]
  },
  {
    id: 'iron_saint_beneath',
    act: 'III',
    title: 'The Iron Saint Beneath the Hill',
    location: 'Under Blackwood Hill',
    text: 'Below the roots, an iron figure kneels in a chapel of soil. Its chest has a keyhole shaped like a mercy you have not chosen yet.',
    requires: ['q_main_1'],
    choices: [
      { label: 'Offer the repaired key-sign', skill: 'perception', dc: 14, quest_id: 'q_main_1', reward: 'repaired porch key', add_items: ['repaired porch key'], patch: { type: 'upsert_node', node: { id: 'iron_saint', title: 'Iron Saint', summary: 'A buried guardian under Blackwood Hill whose keyhole opens only to mercy and truthful memory.', type: 'guardian', tags: ['finale', 'key'] }, reason: 'Scene deck revealed the Iron Saint.' } },
      { label: 'Speak the receipts aloud', skill: 'persuasion', dc: 14, quest_id: 'q_mystery_1', reward: 'hill truth receipt' }
    ]
  }
];

const NPC_CARDS = [
  {
    id: 'old_joss',
    title: 'Old Joss',
    role: 'Porchkeeper',
    vibe: 'Kind, evasive, and allergic to simple answers.',
    ask: 'Old Joss taps his pipe and gives you a rule: take the left trail when the hill asks your name.',
    aid: { quest_id: 'q_main_1', clue: 'Old Joss says the missing key answers to mercy, not force.', add_items: ['Joss left-trail note'] }
  },
  {
    id: 'mara_lanternwright',
    title: 'Mara Lanternwright',
    role: 'Lantern-maker',
    vibe: 'Tired hands, bright eyes, refusing to give up on her apprentice.',
    ask: 'Mara shows you a soot pattern that only appears when the apprentice is alive and nearby.',
    aid: { quest_id: 'q_side_1', clue: 'Mara identifies blue ash as the apprentice signal.', add_items: ['lanternwright ash lens'] }
  },
  {
    id: 'nix_understep',
    title: 'Nix Understep',
    role: 'Hill-runner',
    vibe: 'Fast, funny, and very serious about never lying to doors.',
    ask: 'Nix warns you that every door is hungry for a contradiction.',
    aid: { quest_id: 'q_mystery_1', clue: 'Nix knows the doors lose power when a witness writes the truth down.', add_items: ['Nix door-map scrap'] }
  },
  {
    id: 'sister_candle',
    title: 'Sister Candle',
    role: 'Candle Court exile',
    vibe: 'Formal, sorrowful, and secretly rooting for impossible rescues.',
    ask: 'Sister Candle admits the Candle Court trades in memories, but fears written receipts.',
    aid: { quest_id: 'q_mystery_1', clue: 'The Candle Court cannot easily alter witnessed records.', add_items: ['wax-sealed memory token'] }
  }
];

const ITEM_ACTIONS = [
  {
    match: /waterskin|rations|cloak/,
    title: 'Ground and recover',
    text: 'You pause, breathe, and take care of the body before the story asks for more. HP +1.',
    update: { hp_delta: 1, flags: { rested_once: true } }
  },
  {
    match: /lantern|stub|shield|lens/,
    title: 'Raise the lantern light',
    text: 'The blue glow bends toward hidden tracks. A clue wants to become canon.',
    update: { flags: { lantern_used: true }, quest_updates: [{ id: 'q_main_1', progress: 1, clue: 'Lantern light reveals tracks tied to the missing porch key.' }] },
    patch: { type: 'upsert_node', node: { id: 'blue_lanterns', title: 'Blue Lanterns', summary: 'Cold-burning lanterns that reveal tracks only after a risky choice.', type: 'signal', tags: ['lantern', 'clue'] }, reason: 'Inventory action used lantern light.' }
  },
  {
    match: /key|badge|token/,
    title: 'Check the threshold token',
    text: 'The token hums at the edge of the porch. Something recognizes you as allowed, but not yet trusted.',
    update: { flags: { threshold_token_checked: true }, quest_updates: [{ id: 'q_main_1', progress: 1, clue: 'The threshold token reacts near the porch boards.' }] },
    patch: { type: 'append_fact', node_id: 'infinite_porch', facts: ['Threshold tokens hum when the missing porch key is close.'], reason: 'Inventory action tested a porch token.' }
  },
  {
    match: /journal|quill|ribbon|lute|receipt|note|scrap/,
    title: 'Record a memory receipt',
    text: 'You turn experience into a record. The story steadies because it has a witness.',
    update: { flags: { memory_receipt_written: true }, quest_updates: [{ id: 'q_mystery_1', progress: 1, clue: 'Writing memories down protects them from the hill.' }] },
    patch: { type: 'upsert_node', node: { id: 'memory_receipts', title: 'Memory Receipts', summary: 'Written records that keep the hill from rewriting what truly happened.', type: 'tool', tags: ['memory', 'ledger'] }, reason: 'Inventory action created a memory receipt.' }
  },
  {
    match: /rope|chalk|wire|shortbow|marker|map/,
    title: 'Prepare the trail kit',
    text: 'You mark the path and prepare for trouble. The next trail or encounter roll gets a little safer.',
    update: { flags: { trail_kit_ready: true }, quest_updates: [{ id: 'q_side_1', progress: 1, clue: 'Trail preparation reveals signs of the missing apprentice.' }] },
    patch: { type: 'upsert_node', node: { id: 'safe_trail_marks', title: 'Safe Trail Marks', summary: 'Chalk, rope, and careful signs that stop Blackwood Hill from folding the path shut.', type: 'trail', tags: ['survival', 'safety'] }, reason: 'Inventory action prepared the trail.' }
  }
];

const fallbackCampaign = {
  id: 'browser-demo',
  campaign_name: 'Lanterns Under Blackwood Hill',
  location: 'The Infinite Porch',
  turn: 0,
  player: {
    name: 'Mikey', class_name: 'Lantern-Seeker', background: 'Porch-Touched', level: 1, hp: 12, hp_max: 12, ac: 12,
    stats: { str: 10, dex: 12, con: 11, int: 11, wis: 13, cha: 12 },
    skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp']
  },
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key before midnight', type: 'main', status: 'open', progress: 0, max_progress: 3, clues: [] },
    { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", type: 'side', status: 'open', progress: 0, max_progress: 3, clues: [] },
    { id: 'q_mystery_1', title: 'Learn why every door on Blackwood Hill remembers lies', type: 'mystery', status: 'open', progress: 0, max_progress: 3, clues: [] }
  ],
  world: {
    nodes: {
      infinite_porch: { id: 'infinite_porch', title: 'The Infinite Porch', summary: 'A porch between worlds. Its boards creak like old pages.' },
      blackwood_hill: { id: 'blackwood_hill', title: 'Blackwood Hill', summary: 'A rain-dark hill where blue lanterns glow between the trees.' },
      old_joss: { id: 'old_joss', title: 'Old Joss', summary: 'A porchkeeper with a candle-stub pipe and too many almost-answers.' }
    },
    edges: []
  },
  flags: {},
  active_encounter: null,
  encounter_log: [],
  active_scene: null,
  scene_log: [],
  npcs: {},
  npc_log: [],
  pending_patches: [],
  pending_world_patches: [],
  ending: null,
  log: [{ role: 'dm', content: "Rain taps the roof of a porch that should not exist. Beyond the steps, Blackwood Hill glows with blue lanterns between the trees.\n\nA) Step toward Blackwood Hill.\nB) Question Old Joss.\nC) Inspect the porch.", ts: '' }]
};

function StatPill({ label, value }) {
  return <div className="stat-pill"><span>{label}</span><strong>{value}</strong></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <section className="panel">
    <h2>{Icon ? <Icon size={18} /> : null}{title}</h2>
    {children}
  </section>;
}

function cloneCampaign(seed = fallbackCampaign) {
  return JSON.parse(JSON.stringify(seed));
}

function safeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function stablePatchId(prefix, value) {
  const raw = safeText(value, prefix).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${prefix}_${raw || 'patch'}`;
}

function normalizeQuest(raw) {
  const progress = Number.isFinite(Number(raw?.progress)) ? Math.max(0, Number(raw.progress)) : 0;
  const max = Number.isFinite(Number(raw?.max_progress)) ? Math.max(1, Number(raw.max_progress)) : 3;
  const priorStatus = safeText(raw?.status, 'open');
  const status = progress >= max && priorStatus === 'open' ? 'ready' : priorStatus;
  return {
    id: safeText(raw?.id, stablePatchId('quest', raw?.title || 'quest')).slice(0, 80),
    title: safeText(raw?.title, 'Untitled quest').slice(0, 160),
    type: safeText(raw?.type, 'side').slice(0, 40),
    status,
    progress: Math.min(progress, max),
    max_progress: max,
    clues: Array.isArray(raw?.clues) ? raw.clues.map(String).slice(0, 10) : []
  };
}

function normalizePendingPatch(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.type === 'upsert_node' && raw.node?.id) {
    const node = {
      id: safeText(raw.node.id),
      title: safeText(raw.node.title, raw.node.id),
      summary: safeText(raw.node.summary),
      type: safeText(raw.node.type, 'note'),
      tags: Array.isArray(raw.node.tags) ? raw.node.tags.map(String) : [],
      facts: Array.isArray(raw.node.facts) ? raw.node.facts.map(String) : []
    };
    return { id: safeText(raw.id, stablePatchId('upsert', node.id)), type: 'upsert_node', node, reason: safeText(raw.reason, 'DM proposed a new world node.') };
  }

  if (raw.type === 'append_fact' && raw.node_id) {
    const facts = Array.isArray(raw.facts) ? raw.facts.map(String).filter(Boolean) : [safeText(raw.fact)].filter(Boolean);
    return {
      id: safeText(raw.id, stablePatchId('fact', `${raw.node_id}_${facts.join('_') || index}`)),
      type: 'append_fact',
      node_id: safeText(raw.node_id),
      facts,
      title: safeText(raw.title, `Add fact to ${raw.node_id}`),
      summary: facts.join(' '),
      reason: safeText(raw.reason, 'DM proposed a fact update.')
    };
  }

  if (raw.type === 'new_edge' && raw.edge) {
    const edge = { from: safeText(raw.edge.from), to: safeText(raw.edge.to), rel: safeText(raw.edge.rel, 'related') };
    if (!edge.from || !edge.to) return null;
    return { id: safeText(raw.id, stablePatchId('edge', `${edge.from}_${edge.rel}_${edge.to}`)), type: 'new_edge', edge, reason: safeText(raw.reason, 'DM proposed a world connection.') };
  }

  return null;
}

function worldPatchToPendingPatches(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (raw.type) {
    const normalized = normalizePendingPatch(raw);
    return normalized ? [normalized] : [];
  }

  const patch = raw.world_patch && typeof raw.world_patch === 'object' ? raw.world_patch : raw;
  const pending = [];

  const upserts = Array.isArray(patch.upsert_nodes) ? patch.upsert_nodes : patch.upsert_nodes ? [patch.upsert_nodes] : [];
  upserts.forEach((node, index) => {
    const normalized = normalizePendingPatch({ id: stablePatchId('upsert', node?.id || node?.title || index), type: 'upsert_node', node, reason: safeText(raw.reason, 'AI DM proposed this world node.') }, index);
    if (normalized) pending.push(normalized);
  });

  const appends = Array.isArray(patch.append_facts) ? patch.append_facts : patch.append_facts ? [patch.append_facts] : [];
  appends.forEach((item, index) => {
    const facts = Array.isArray(item?.facts) ? item.facts : item?.facts ? [item.facts] : [];
    const normalized = normalizePendingPatch({ id: stablePatchId('fact', `${item?.id || item?.node_id || index}_${facts.join('_')}`), type: 'append_fact', node_id: item?.id || item?.node_id, facts, title: `Add fact to ${item?.id || item?.node_id || 'node'}`, reason: safeText(raw.reason, 'AI DM proposed this fact update.') }, index);
    if (normalized) pending.push(normalized);
  });

  const edges = Array.isArray(patch.new_edges) ? patch.new_edges : patch.new_edges ? [patch.new_edges] : [];
  edges.forEach((edge, index) => {
    const normalized = normalizePendingPatch({ id: stablePatchId('edge', `${edge?.from || index}_${edge?.rel || 'related'}_${edge?.to || index}`), type: 'new_edge', edge, reason: safeText(raw.reason, 'AI DM proposed this world edge.') }, index);
    if (normalized) pending.push(normalized);
  });

  return pending;
}

function dedupePatches(patches) {
  const seen = new Set();
  return (patches || []).map(normalizePendingPatch).filter((patch) => {
    if (!patch || seen.has(patch.id)) return false;
    seen.add(patch.id);
    return true;
  });
}

function normalizeEncounter(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = ENCOUNTER_CARDS.find((card) => card.id === raw.id) || raw;
  return {
    ...base,
    ...raw,
    id: safeText(raw.id, base.id || `encounter_${Date.now()}`),
    title: safeText(raw.title, base.title || 'Encounter'),
    scene: safeText(raw.scene, base.scene || ''),
    danger: safeText(raw.danger, base.danger || ''),
    skill: safeText(raw.skill, base.skill || 'perception'),
    dc: Number(raw.dc || base.dc || 12),
    reward: safeText(raw.reward, base.reward || 'clue'),
    quest_id: safeText(raw.quest_id, base.quest_id || 'q_main_1'),
    drawn_at: raw.drawn_at || new Date().toISOString()
  };
}

function normalizeScene(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = SCENE_CARDS.find((card) => card.id === raw.id) || raw;
  return {
    ...base,
    ...raw,
    id: safeText(raw.id, base.id || `scene_${Date.now()}`),
    act: safeText(raw.act, base.act || 'I'),
    title: safeText(raw.title, base.title || 'Scene'),
    location: safeText(raw.location, base.location || 'Blackwood Hill'),
    text: safeText(raw.text, base.text || ''),
    choices: Array.isArray(raw.choices || base.choices) ? (raw.choices || base.choices).slice(0, 3) : [],
    drawn_at: raw.drawn_at || new Date().toISOString()
  };
}

function normalizeNpc(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = NPC_CARDS.find((npc) => npc.id === raw.id) || raw;
  return {
    ...base,
    ...raw,
    id: safeText(raw.id, base.id || `npc_${Date.now()}`),
    title: safeText(raw.title, base.title || 'Unknown Ally'),
    role: safeText(raw.role, base.role || 'NPC'),
    vibe: safeText(raw.vibe, base.vibe || ''),
    trust: Math.max(0, Math.min(5, Number(raw.trust ?? base.trust ?? 0)))
  };
}

function normalizeCampaign(raw) {
  const base = cloneCampaign();
  const campaign = { ...base, ...(raw || {}) };
  campaign.player = { ...base.player, ...(raw?.player || {}) };
  campaign.player.stats = { ...base.player.stats, ...(raw?.player?.stats || {}) };
  campaign.player.skills = { ...base.player.skills, ...(raw?.player?.skills || {}) };
  campaign.player.inventory = Array.isArray(raw?.player?.inventory) ? raw.player.inventory : campaign.player.inventory || [];
  campaign.quests = (raw?.quests || campaign.quests || []).map(normalizeQuest);
  campaign.world = raw?.world || campaign.world || { nodes: {}, edges: [] };
  campaign.world.nodes = campaign.world.nodes || {};
  campaign.world.edges = Array.isArray(campaign.world.edges) ? campaign.world.edges : [];
  campaign.flags = raw?.flags || campaign.flags || {};
  campaign.active_encounter = normalizeEncounter(raw?.active_encounter || null);
  campaign.encounter_log = Array.isArray(raw?.encounter_log) ? raw.encounter_log.slice(0, 80) : [];
  campaign.active_scene = normalizeScene(raw?.active_scene || null);
  campaign.scene_log = Array.isArray(raw?.scene_log) ? raw.scene_log.slice(0, 80) : [];
  campaign.npcs = Object.fromEntries(Object.entries(raw?.npcs || {}).map(([id, npc]) => [id, normalizeNpc(npc)]).filter(([, npc]) => npc));
  campaign.npc_log = Array.isArray(raw?.npc_log) ? raw.npc_log.slice(0, 80) : [];
  campaign.ending = raw?.ending || null;

  const pending = [
    ...(raw?.pending_patches || []),
    ...worldPatchToPendingPatches(raw?.world_patch),
    ...(Array.isArray(raw?.pending_world_patches) ? raw.pending_world_patches.flatMap(worldPatchToPendingPatches) : worldPatchToPendingPatches(raw?.pending_world_patches))
  ];
  campaign.pending_patches = dedupePatches(pending);
  campaign.pending_world_patches = [];
  campaign.log = Array.isArray(raw?.log) ? raw.log : campaign.log || [];
  return campaign;
}

function loadBrowserCampaign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (raw) return normalizeCampaign(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load browser campaign', err);
  }
  return cloneCampaign();
}

function saveBrowserCampaign(campaign) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCampaign(campaign)));
  } catch (err) {
    console.warn('Could not save browser campaign', err);
  }
}

function loadDmSettings() {
  try {
    const raw = localStorage.getItem(DM_SETTINGS_KEY);
    if (raw) return { mode: 'browser', endpoint: '', ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Could not load DM settings', err);
  }
  return { mode: 'browser', endpoint: '' };
}

function saveDmSettings(settings) {
  try {
    localStorage.setItem(DM_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save DM settings', err);
  }
}

function rollCheck({ expr = '1d20+2', mod = 2, dc = 12, label = 'Quick Check' } = {}) {
  const raw = Math.floor(Math.random() * 20) + 1;
  const total = raw + mod;
  let outcome = total >= dc ? 'success' : 'failure';
  if (raw === 20) outcome = 'critical success';
  if (raw === 1) outcome = 'critical failure';
  return { expr, label, raw, mod, dc, total, outcome, detail: `${raw} + ${mod} = ${total} vs DC ${dc}` };
}

function actionProfile(action, campaign) {
  const lower = action.toLowerCase();
  const skills = campaign?.player?.skills || {};
  const prepared = campaign?.flags?.trail_kit_ready ? 1 : 0;
  if (/sneak|hide|quiet|shadow/.test(lower)) return { skill: 'stealth', mod: (skills.stealth || 0) + prepared, dc: 13, label: 'Stealth Check' };
  if (/inspect|look|search|listen|clue|lantern|door|porch/.test(lower)) return { skill: 'perception', mod: (skills.perception || 0) + prepared, dc: 12, label: 'Perception Check' };
  if (/talk|ask|question|persuade|convince|joss/.test(lower)) return { skill: 'persuasion', mod: skills.persuasion || 0, dc: 12, label: 'Persuasion Check' };
  if (/rune|spell|magic|arcane|sigil|curse|root|choir/.test(lower)) return { skill: 'arcana', mod: skills.arcana || 0, dc: 14, label: 'Arcana Check' };
  if (/track|forest|trail|hill|survive|camp|rest/.test(lower)) return { skill: 'survival', mod: (skills.survival || 0) + prepared, dc: 12, label: 'Survival Check' };
  return { skill: 'wisdom', mod: 2 + prepared, dc: 12, label: 'Adventurer Check' };
}

function localNarration(action, roll) {
  const lower = action.toLowerCase();
  const strong = roll.outcome.includes('success');
  const critical = roll.outcome.includes('critical');

  if (/lantern/.test(lower)) return strong
    ? 'Your lantern-stub warms in your palm. The blue lanterns answer one by one, revealing a muddy trail of tiny bootprints leading up Blackwood Hill.'
    : 'The lanterns flicker away from your gaze. You catch only one detail before the rain swallows it: someone has tied black thread around each post.';
  if (/joss|talk|ask|question/.test(lower)) return strong
    ? 'Old Joss studies you, then nods once. "Doors remember lies," he says, "but keys remember mercy. Take the left trail when the hill asks your name."'
    : 'Old Joss smiles without warmth. "Not every question wants to be rescued," he says, and the porch boards knock three times beneath your boots.';
  if (/porch|inspect|search|look/.test(lower)) return strong
    ? 'Between two warped boards you find a brass tooth from a broken key. It hums when pointed toward Blackwood Hill.'
    : 'The porch creaks like it almost wants to speak, but the sound folds back into the storm.';
  if (/sneak|hide|quiet/.test(lower)) return strong
    ? 'You slip between rain and shadow. Nothing sees you except a moth with blue fire in its wings.'
    : 'A loose board betrays you with a sharp crack. Something under the hill turns its attention toward the porch.';
  if (/hill|forest|trail/.test(lower)) return strong
    ? 'You find the safer path: fern, root, lantern-glow. The hill does not welcome you, but it allows your next step.'
    : 'The trail doubles back on itself. For a moment, the porch appears ahead of you and behind you at the same time.';

  return critical && strong
    ? 'The world opens around your choice. For one heartbeat you can feel the true map beneath the story, and one safe path shines forward.'
    : strong
      ? 'Your choice lands cleanly. The storm thins, the porch steadies, and the next clue comes into reach.'
      : 'Your choice still matters, but the hill asks for a price. The air tightens, and a hidden clock ticks louder.';
}

function nodePatch(id, title, summary, reason) {
  return { id: `${id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`, type: 'upsert_node', node: { id, title, summary }, reason };
}

function proposeWorldPatches(action, world = {}) {
  const lower = action.toLowerCase();
  const nodes = world.nodes || {};
  const patches = [];
  if (/lantern/.test(lower) && !nodes.blue_lanterns) patches.push(nodePatch('blue_lanterns', 'Blue Lanterns', 'Cold-burning lanterns that reveal tracks only after a risky choice.', 'The player investigated lantern signs.'));
  if (/key|brass|porch/.test(lower) && !nodes.brass_key_tooth) patches.push(nodePatch('brass_key_tooth', 'Brass Key Tooth', 'A broken piece of a missing porch key. It points toward unresolved truths.', 'The player searched the porch/key mystery.'));
  if (/hill|forest|trail/.test(lower) && !nodes.left_trail) patches.push(nodePatch('left_trail', 'The Left Trail', 'A root-laced path Old Joss says to take when the hill asks your name.', 'The player pushed toward Blackwood Hill.'));
  if (/moth|fire|wing/.test(lower) && !nodes.blue_fire_moth) patches.push(nodePatch('blue_fire_moth', 'Blue-Fire Moth', 'A tiny watcher with flame-blue wings that appears when stealth changes the path.', 'The player invoked hidden/quiet movement.'));
  return patches;
}

function applyPatch(world = {}, rawPatch) {
  const patch = normalizePendingPatch(rawPatch);
  if (!patch) return world;
  const next = { ...world, nodes: { ...(world.nodes || {}) }, edges: [...(world.edges || [])] };
  if (patch.type === 'upsert_node') next.nodes[patch.node.id] = { ...(next.nodes[patch.node.id] || {}), ...patch.node };
  if (patch.type === 'append_fact' && patch.node_id) {
    const node = next.nodes[patch.node_id] || { id: patch.node_id, title: patch.node_id, summary: '' };
    const facts = new Set([...(node.facts || [])]);
    (patch.facts || []).forEach((fact) => fact && facts.add(String(fact)));
    next.nodes[patch.node_id] = { ...node, facts: [...facts] };
  }
  if (patch.type === 'new_edge' && patch.edge) {
    const key = `${patch.edge.from}|${patch.edge.rel}|${patch.edge.to}`;
    const existing = new Set(next.edges.map((edge) => `${edge.from}|${edge.rel}|${edge.to}`));
    if (!existing.has(key)) next.edges.push(patch.edge);
  }
  return next;
}

function mergeQuestUpdates(quests, updates = []) {
  const next = [...(quests || [])].map(normalizeQuest);
  updates.forEach((incoming) => {
    if (!incoming?.id) return;
    const idx = next.findIndex((q) => q.id === incoming.id);
    const current = idx >= 0 ? next[idx] : normalizeQuest({ id: incoming.id, title: incoming.title || incoming.id, type: incoming.type || 'side' });
    const clues = new Set([...(current.clues || [])]);
    if (incoming.clue) clues.add(String(incoming.clue).slice(0, 160));
    (incoming.clues || []).forEach((clue) => clues.add(String(clue).slice(0, 160)));
    const progressDelta = Number.isFinite(Number(incoming.progress)) ? Number(incoming.progress) : 0;
    const max = incoming.max_progress || current.max_progress || 3;
    const merged = normalizeQuest({ ...current, ...incoming, progress: Math.min((current.progress || 0) + progressDelta, max), max_progress: max, clues: [...clues] });
    if (idx >= 0) next[idx] = merged;
    else next.push(merged);
  });
  return next;
}

function questUpdatesForAction(action, roll, campaign) {
  const lower = action.toLowerCase();
  const success = roll?.outcome?.includes('success');
  const updates = [];
  if (/key|brass|porch/.test(lower) && success) updates.push({ id: 'q_main_1', progress: 1, clue: 'A key-sign responded to the porch boards.' });
  if (/apprentice|lantern-maker|rescue|trail/.test(lower) && success) updates.push({ id: 'q_side_1', progress: 1, clue: 'A trail sign points toward the lantern-maker apprentice.' });
  if (/door|lie|memory|remember|journal|receipt/.test(lower) && success) updates.push({ id: 'q_mystery_1', progress: 1, clue: 'The hill reacts differently when truth is recorded.' });
  if (campaign?.flags?.lantern_used && /hill|trail|track/.test(lower) && success) updates.push({ id: 'q_main_1', progress: 1, clue: 'Lantern light and trail signs agree on one direction.' });
  return updates;
}

function applyCampaignUpdate(campaign, update = {}) {
  const next = normalizeCampaign(campaign);
  if (!update || typeof update !== 'object') return next;
  if (typeof update.location === 'string' && update.location.trim()) next.location = update.location.trim();
  if (typeof update.hp_delta === 'number') next.player.hp = Math.max(0, Math.min((next.player.hp || 0) + update.hp_delta, next.player.hp_max || next.player.hp || 0));
  if (Array.isArray(update.add_items)) {
    const inv = new Set(next.player.inventory || []);
    update.add_items.slice(0, 20).forEach((item) => item && inv.add(String(item).slice(0, 80)));
    next.player.inventory = [...inv];
  }
  if (Array.isArray(update.remove_items)) {
    const remove = new Set(update.remove_items.map(String));
    next.player.inventory = (next.player.inventory || []).filter((item) => !remove.has(String(item)));
  }
  if (Array.isArray(update.quest_updates)) next.quests = mergeQuestUpdates(next.quests, update.quest_updates.slice(0, 20));
  if (update.flags && typeof update.flags === 'object') next.flags = { ...(next.flags || {}), ...update.flags };
  if (update.npcs && typeof update.npcs === 'object') next.npcs = { ...(next.npcs || {}), ...update.npcs };
  return normalizeCampaign(next);
}

function resolveBrowserTurn(campaign, action) {
  const profile = actionProfile(action, campaign);
  const roll = rollCheck({ expr: `1d20+${profile.mod}`, mod: profile.mod, dc: profile.dc, label: profile.label });
  const patches = proposeWorldPatches(action, campaign.world);
  const quest_updates = questUpdatesForAction(action, roll, campaign);
  const patchNote = patches.length ? `\n\nCanon proposals: ${patches.length} new world update${patches.length === 1 ? '' : 's'} waiting for your approval.` : '';
  const questNote = quest_updates.length ? `\n\nQuest ledger: ${quest_updates.length} clue trigger${quest_updates.length === 1 ? '' : 's'} advanced.` : '';
  const dmText = `${localNarration(action, roll)}\n\nRoll: ${roll.detail} · ${roll.outcome}${patchNote}${questNote}\n\nA) Press forward.\nB) Ask one careful question.\nC) Mark this clue in the ledger.`;
  const updated = applyCampaignUpdate(campaign, { quest_updates, flags: campaign.flags?.trail_kit_ready ? { trail_kit_ready: false } : {} });
  const next = normalizeCampaign({ ...updated, turn: (updated.turn || 0) + 1, pending_patches: [...(updated.pending_patches || []), ...patches], log: [...(updated.log || []), { role: 'player', content: action, ts: new Date().toISOString() }, { role: 'dm', content: dmText, ts: new Date().toISOString() }] });
  saveBrowserCampaign(next);
  return { campaign: next, roll };
}

function normalizeRoll(raw, fallbackRoll) {
  if (!raw || typeof raw !== 'object') return fallbackRoll;
  const label = safeText(raw.label || raw.expr, fallbackRoll.label || 'DM Roll').slice(0, 80);
  const detail = safeText(raw.detail, fallbackRoll.detail).slice(0, 160);
  const outcome = safeText(raw.outcome, fallbackRoll.outcome).slice(0, 80);
  return { ...fallbackRoll, ...raw, label, detail, outcome };
}

function validateDmPayload(payload) {
  const warnings = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: 'DM response must be a JSON object.', warnings };
  if (payload.campaign && typeof payload.campaign !== 'object') return { ok: false, error: 'campaign must be an object when provided.', warnings };
  if (!payload.campaign) {
    if (!payload.narrative && !payload.message) warnings.push('No narrative/message returned; browser narration will be used.');
    if (payload.update && typeof payload.update !== 'object') return { ok: false, error: 'update must be an object.' };
    if (payload.pending_patches && !Array.isArray(payload.pending_patches)) return { ok: false, error: 'pending_patches must be an array.' };
  }
  if (typeof payload.narrative === 'string' && payload.narrative.length > 5000) {
    payload = { ...payload, narrative: payload.narrative.slice(0, 5000) + '\n\n[Trimmed by PorchQuest369 guardrail.]' };
    warnings.push('Narrative was trimmed to 5000 characters.');
  }
  return { ok: true, payload, warnings };
}

function dmPayloadToPendingPatches(payload) {
  const pending = [
    ...(Array.isArray(payload?.pending_patches) ? payload.pending_patches : []),
    ...worldPatchToPendingPatches(payload?.world_patch),
    ...(Array.isArray(payload?.pending_world_patches) ? payload.pending_world_patches.flatMap(worldPatchToPendingPatches) : worldPatchToPendingPatches(payload?.pending_world_patches))
  ];
  return dedupePatches(pending);
}

function mergeCustomTurnResult(campaign, action, rawPayload) {
  const profile = actionProfile(action, campaign);
  const fallbackRoll = rollCheck({ expr: `1d20+${profile.mod}`, mod: profile.mod, dc: profile.dc, label: profile.label });
  const validation = validateDmPayload(rawPayload);
  if (!validation.ok) throw new Error(validation.error);
  const payload = validation.payload;

  if (payload?.campaign) {
    const normalized = normalizeCampaign(payload.campaign);
    const roll = normalizeRoll(payload.roll, fallbackRoll);
    const warningText = validation.warnings.length ? `\n\nDM warnings: ${validation.warnings.join(' ')}` : '';
    if (warningText) normalized.log = [...(normalized.log || []), { role: 'dm', content: warningText.trim(), ts: new Date().toISOString() }];
    saveBrowserCampaign(normalized);
    return { campaign: normalized, roll, warnings: validation.warnings };
  }

  const roll = normalizeRoll(payload?.roll, fallbackRoll);
  const narrative = safeText(payload?.narrative || payload?.message, localNarration(action, roll));
  const pending = dmPayloadToPendingPatches(payload);
  const patchNote = pending.length ? `\n\nCanon proposals: ${pending.length} custom DM world update${pending.length === 1 ? '' : 's'} waiting for approval.` : '';
  const warningText = validation.warnings.length ? `\n\nDM warnings: ${validation.warnings.join(' ')}` : '';
  const base = applyCampaignUpdate(campaign, payload?.update || {});
  const next = normalizeCampaign({ ...base, turn: (base.turn || 0) + 1, pending_patches: [...(base.pending_patches || []), ...pending], log: [...(base.log || []), { role: 'player', content: action, ts: new Date().toISOString() }, { role: 'dm', content: `${narrative}${patchNote}${warningText}`, ts: new Date().toISOString() }] });
  saveBrowserCampaign(next);
  return { campaign: next, roll, warnings: validation.warnings };
}

function drawEncounter(campaign) {
  const seen = new Set((campaign.encounter_log || []).slice(-4).map((entry) => entry.id));
  const pool = ENCOUNTER_CARDS.filter((card) => !seen.has(card.id));
  const card = pool.length ? pool[Math.floor(Math.random() * pool.length)] : ENCOUNTER_CARDS[Math.floor(Math.random() * ENCOUNTER_CARDS.length)];
  return normalizeEncounter({ ...card, drawn_at: new Date().toISOString() });
}

function drawScene(campaign) {
  const quests = Object.fromEntries((campaign.quests || []).map((q) => [q.id, q]));
  const seen = new Set((campaign.scene_log || []).slice(-5).map((entry) => entry.id));
  const eligible = SCENE_CARDS.filter((scene) => {
    const reqs = scene.requires || [];
    const reqOk = reqs.every((id) => (quests[id]?.progress || 0) >= Math.max(1, (quests[id]?.max_progress || 3) - 1));
    return reqOk && !seen.has(scene.id);
  });
  const pool = eligible.length ? eligible : SCENE_CARDS.filter((scene) => !seen.has(scene.id));
  const card = (pool.length ? pool : SCENE_CARDS)[Math.floor(Math.random() * (pool.length ? pool.length : SCENE_CARDS.length))];
  return normalizeScene({ ...card, drawn_at: new Date().toISOString() });
}

function drawNpc(campaign) {
  const known = new Set(Object.keys(campaign.npcs || {}));
  const pool = NPC_CARDS.filter((npc) => !known.has(npc.id));
  const card = (pool.length ? pool : NPC_CARDS)[Math.floor(Math.random() * (pool.length ? pool.length : NPC_CARDS.length))];
  return normalizeNpc({ ...card, trust: (campaign.npcs?.[card.id]?.trust || 0) });
}

function adventureState(campaign) {
  const quests = campaign?.quests || [];
  const ready = quests.filter((q) => q.status === 'ready' || q.status === 'completed' || (q.progress || 0) >= (q.max_progress || 3));
  const byId = Object.fromEntries(quests.map((q) => [q.id, q]));
  const allReady = ['q_main_1', 'q_side_1', 'q_mystery_1'].every((id) => (byId[id]?.progress || 0) >= (byId[id]?.max_progress || 3));
  if (campaign?.ending?.status === 'complete') return { label: 'Starter adventure complete', detail: campaign.ending.title || 'Ending recorded', complete: true, readyFinale: false };
  if (allReady) return { label: 'Finale ready', detail: 'All three starter quests have enough clues for the Blackwood Hill finale.', complete: false, readyFinale: true };
  if ((byId.q_main_1?.progress || 0) >= 2) return { label: 'Key mystery hot', detail: 'The porch key trail is close. Push one more scene, NPC, or item receipt.', complete: false, readyFinale: false };
  if (ready.length) return { label: 'One thread ready', detail: `${ready[0].title} can be resolved soon.`, complete: false, readyFinale: false };
  return { label: 'Adventure in motion', detail: 'Gather clues through scenes, encounters, NPCs, and item actions.', complete: false, readyFinale: false };
}

export default function App({ icons }) {
  const { Dice5, ScrollText, Backpack, Map, Sparkles } = icons;
  const [campaign, setCampaign] = useState(null);
  const [action, setAction] = useState('I inspect the blue lanterns for clues.');
  const [status, setStatus] = useState('Loading...');
  const [lastRoll, setLastRoll] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [dmBackend, setDmBackend] = useState(null);
  const [dmSettings, setDmSettings] = useState(loadDmSettings());
  const [dmTestStatus, setDmTestStatus] = useState('Not tested this session.');
  const [characterDraft, setCharacterDraft] = useState({ name: 'Mikey', class_name: 'Lantern-Seeker', background: 'Porch-Touched' });

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function commitCampaign(next, message = 'Saved.') {
    const normalized = normalizeCampaign(next);
    setCampaign(normalized);
    if (STATIC_PLAY || !apiOnline) saveBrowserCampaign(normalized);
    setStatus(message);
  }

  async function refreshDmStatus() {
    if (STATIC_PLAY || !apiOnline) {
      setDmBackend({ mode: dmSettings.mode === 'custom' ? 'custom_endpoint' : 'browser_oracle', configured: dmSettings.mode === 'custom' && !!dmSettings.endpoint, model: 'browser-local' });
      return;
    }
    try {
      const result = await api('/api/dm/status');
      setDmBackend(result.dm);
    } catch (err) {
      console.warn('Could not load DM status', err);
      setDmBackend({ mode: 'unknown', configured: false, model: 'local fallback' });
    }
  }

  async function ensureCampaign() {
    if (STATIC_PLAY) {
      setApiOnline(false);
      const loaded = loadBrowserCampaign();
      setCampaign(loaded);
      setCharacterDraft({ name: loaded.player.name, class_name: loaded.player.class_name, background: loaded.player.background || 'Porch-Touched' });
      setStatus('Instant play mode: saved in this browser.');
      return;
    }

    try {
      await api('/api/health');
      setApiOnline(true);
      const statusResult = await api('/api/dm/status');
      setDmBackend(statusResult.dm);
      const list = await api('/api/campaigns');
      if (list.campaigns?.length) {
        const loaded = await api(`/api/campaigns/${list.campaigns[0].id}`);
        const normalized = normalizeCampaign(loaded.campaign);
        setCampaign(normalized);
        setCharacterDraft({ name: normalized.player.name, class_name: normalized.player.class_name, background: normalized.player.background || 'Porch-Touched' });
      } else {
        const created = await api('/api/campaigns', { method: 'POST', body: JSON.stringify({ player_name: 'Mikey' }) });
        const normalized = normalizeCampaign(created.campaign);
        setCampaign(normalized);
        setCharacterDraft({ name: normalized.player.name, class_name: normalized.player.class_name, background: normalized.player.background || 'Porch-Touched' });
      }
      setStatus('API connected');
    } catch (err) {
      setApiOnline(false);
      const loaded = loadBrowserCampaign();
      setCampaign(loaded);
      setCharacterDraft({ name: loaded.player.name, class_name: loaded.player.class_name, background: loaded.player.background || 'Porch-Touched' });
      setStatus('Browser play mode: start the FastAPI backend for server saves.');
    }
  }

  useEffect(() => { ensureCampaign(); }, []);
  useEffect(() => { refreshDmStatus(); }, [apiOnline, dmSettings.mode, dmSettings.endpoint]);

  async function callCustomEndpoint(actionText, testOnly = false) {
    const res = await fetch(dmSettings.endpoint.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract: testOnly ? 'porchquest369-browser-dm-v0.5-test' : 'porchquest369-browser-dm-v0.5', campaign: normalizeCampaign(campaign || fallbackCampaign), action: actionText })
    });
    if (!res.ok) throw new Error(await res.text());
    const payload = await res.json();
    const validation = validateDmPayload(payload);
    if (!validation.ok) throw new Error(validation.error);
    return validation.payload;
  }

  async function testDmEngine() {
    if (!campaign) return;
    if (dmSettings.mode === 'custom') {
      if (!dmSettings.endpoint.trim()) return setDmTestStatus('Custom endpoint is empty.');
      setDmTestStatus('Testing custom endpoint...');
      try {
        const payload = await callCustomEndpoint('Connection test: describe the porch in one sentence.', true);
        const pendingCount = dmPayloadToPendingPatches(payload).length;
        setDmTestStatus(`Custom endpoint OK. ${pendingCount} canon proposal${pendingCount === 1 ? '' : 's'} detected.`);
      } catch (err) {
        console.warn(err);
        setDmTestStatus(`Custom endpoint failed: ${String(err.message || err).slice(0, 180)}`);
      }
      return;
    }
    if (!STATIC_PLAY && apiOnline) {
      setDmTestStatus('Testing server DM...');
      try {
        const result = await api('/api/dm/test', { method: 'POST', body: JSON.stringify({ action: 'Connection test: describe the porch in one sentence.' }) });
        setDmBackend(result.dm || dmBackend);
        setDmTestStatus(result.ok ? `Server DM OK: ${result.dm?.mode || 'ready'}` : 'Server DM test returned not ok.');
      } catch (err) {
        console.warn(err);
        setDmTestStatus(`Server DM test failed: ${String(err.message || err).slice(0, 180)}`);
      }
      return;
    }
    const roll = rollCheck();
    setDmTestStatus(`Browser oracle OK. Test roll: ${roll.detail} · ${roll.outcome}.`);
  }

  async function submitAction(e) {
    e.preventDefault();
    const clean = action.trim();
    if (!clean || !campaign) return;

    if ((STATIC_PLAY || !apiOnline) && dmSettings.mode === 'custom' && dmSettings.endpoint.trim()) {
      setStatus('Calling custom DM endpoint...');
      try {
        const payload = await callCustomEndpoint(clean, false);
        const result = mergeCustomTurnResult(campaign, clean, payload);
        setCampaign(result.campaign);
        setLastRoll(result.roll);
        setAction('');
        setStatus(result.warnings?.length ? 'Custom DM resolved with guardrail notes.' : 'Custom DM turn resolved.');
        return;
      } catch (err) {
        console.warn(err);
        setStatus(`Custom DM failed; using browser oracle fallback. ${String(err.message || err).slice(0, 120)}`);
      }
    }

    if (STATIC_PLAY || !apiOnline) {
      const result = resolveBrowserTurn(campaign, clean);
      setCampaign(result.campaign);
      setLastRoll(result.roll);
      setAction('');
      setStatus(STATIC_PLAY ? 'Instant play mode: saved in this browser.' : 'Browser play mode: local turn resolved.');
      return;
    }

    setStatus('Resolving turn...');
    const result = await api(`/api/campaigns/${campaign.id}/turn`, { method: 'POST', body: JSON.stringify({ action: clean, allow_ai: true }) });
    const normalized = normalizeCampaign(result.campaign);
    setCampaign(normalized);
    setDmBackend(result.dm_backend || dmBackend);
    setLastRoll(result.roll);
    setAction('');
    setStatus(normalized.pending_patches?.length ? 'DM resolved the turn with canon proposals.' : (result.dm_backend?.mode === 'ai' ? 'AI DM resolved the turn.' : 'Local DM resolved the turn.'));
  }

  async function rollD20() {
    if (!campaign) return;
    if (STATIC_PLAY || !apiOnline) {
      const roll = rollCheck({ expr: '1d20+2', mod: 2, dc: 12, label: 'Quick Check' });
      setLastRoll(roll);
      const next = normalizeCampaign({ ...campaign, log: [...(campaign.log || []), { role: 'dm', content: `Quick Check: ${roll.detail} · ${roll.outcome}`, ts: new Date().toISOString() }] });
      commitCampaign(next, 'Quick check rolled.');
      return;
    }
    const result = await api(`/api/campaigns/${campaign.id}/roll`, { method: 'POST', body: JSON.stringify({ expr: '1d20+2', dc: 12, label: 'Quick Check' }) });
    setLastRoll(result.roll);
    setCampaign(normalizeCampaign(result.campaign));
  }

  function resetBrowserCampaign() {
    const fresh = cloneCampaign();
    saveBrowserCampaign(fresh);
    setCampaign(fresh);
    setCharacterDraft({ name: fresh.player.name, class_name: fresh.player.class_name, background: fresh.player.background });
    setLastRoll(null);
    setStatus(STATIC_PLAY ? 'Instant play mode: campaign reset.' : 'Browser campaign reset.');
  }

  function applyCharacterDraft(e) {
    e.preventDefault();
    if (!campaign) return;
    const preset = CLASS_PRESETS[characterDraft.class_name] || CLASS_PRESETS['Lantern-Seeker'];
    const next = normalizeCampaign({
      ...campaign,
      player: { ...campaign.player, ...preset, name: characterDraft.name.trim() || 'Adventurer', class_name: characterDraft.class_name, background: characterDraft.background.trim() || 'Porch-Touched', level: campaign.player?.level || 1 },
      log: [...(campaign.log || []), { role: 'dm', content: `Character ledger updated: ${characterDraft.name || 'Adventurer'} the ${characterDraft.class_name}.`, ts: new Date().toISOString() }]
    });
    commitCampaign(next, 'Character ledger updated.');
  }

  function saveDmPanel(e) {
    e.preventDefault();
    const next = { mode: dmSettings.mode, endpoint: dmSettings.endpoint.trim() };
    setDmSettings(next);
    saveDmSettings(next);
    setStatus('DM settings saved. No API keys are stored here.');
  }

  function patchTitle(patch) {
    if (!patch) return 'World update';
    if (patch.node?.title) return patch.node.title;
    if (patch.title) return patch.title;
    if (patch.edge) return `${patch.edge.from} -> ${patch.edge.to}`;
    if (patch.node_id) return `Fact update: ${patch.node_id}`;
    return 'World update';
  }

  function patchSummary(patch) {
    if (!patch) return '';
    if (patch.node?.summary) return patch.node.summary;
    if (patch.summary) return patch.summary;
    if (patch.facts?.length) return patch.facts.join(' ');
    if (patch.edge) return patch.edge.rel;
    return '';
  }

  function approvePatch(patchId) {
    if (!campaign) return;
    const patch = (campaign.pending_patches || []).find((p) => p.id === patchId);
    if (!patch) return;
    const next = normalizeCampaign({ ...campaign, world: applyPatch(campaign.world, patch), pending_patches: (campaign.pending_patches || []).filter((p) => p.id !== patchId), log: [...(campaign.log || []), { role: 'dm', content: `Canon approved: ${patchTitle(patch)}.`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'Canon patch approved.');
  }

  function rejectPatch(patchId) {
    if (!campaign) return;
    const patch = (campaign.pending_patches || []).find((p) => p.id === patchId);
    const next = normalizeCampaign({ ...campaign, pending_patches: (campaign.pending_patches || []).filter((p) => p.id !== patchId), log: patch ? [...(campaign.log || []), { role: 'dm', content: `Canon rejected: ${patchTitle(patch)}.`, ts: new Date().toISOString() }] : campaign.log });
    commitCampaign(next, 'Canon patch rejected.');
  }

  function approveAllPatches() {
    if (!campaign) return;
    const pending = campaign.pending_patches || [];
    const world = pending.reduce((acc, patch) => applyPatch(acc, patch), campaign.world);
    const next = normalizeCampaign({ ...campaign, world, pending_patches: [], log: [...(campaign.log || []), { role: 'dm', content: `Canon approved: ${pending.length} pending update${pending.length === 1 ? '' : 's'}.`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'All canon patches approved.');
  }

  function beginEncounter() {
    if (!campaign) return;
    const card = drawEncounter(campaign);
    const next = normalizeCampaign({ ...campaign, active_encounter: card, log: [...(campaign.log || []), { role: 'dm', content: `Encounter drawn: ${card.title}\n\n${card.scene}\n\nDanger: ${card.danger}\nChallenge: ${card.skill} vs DC ${card.dc}.`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'Encounter card drawn.');
  }

  function resolveEncounter(approachSkill) {
    if (!campaign?.active_encounter) return;
    const encounter = campaign.active_encounter;
    const skill = approachSkill || encounter.skill || 'perception';
    const mod = campaign.player?.skills?.[skill] || 0;
    const roll = rollCheck({ expr: `1d20+${mod}`, mod, dc: encounter.dc || 12, label: `${encounter.title}: ${skill}` });
    const success = roll.outcome.includes('success');
    const patch = success && encounter.patch ? [encounter.patch] : [];
    const update = success ? { add_items: [encounter.reward], quest_updates: [{ id: encounter.quest_id || 'q_main_1', progress: 1, clue: `${encounter.title}: ${encounter.reward}` }] } : { hp_delta: -1 };
    const base = applyCampaignUpdate(campaign, update);
    const resultText = success ? `Encounter cleared: ${encounter.title}. You gain ${encounter.reward}. A canon proposal is waiting if the encounter revealed world truth.` : `Encounter complication: ${encounter.title}. The danger bites, HP -1, but the trail remains open.`;
    const next = normalizeCampaign({
      ...base,
      active_encounter: null,
      pending_patches: [...(base.pending_patches || []), ...patch],
      encounter_log: [...(base.encounter_log || []), { id: encounter.id, title: encounter.title, outcome: roll.outcome, ts: new Date().toISOString() }],
      log: [...(base.log || []), { role: 'dm', content: `${resultText}\n\nRoll: ${roll.detail} · ${roll.outcome}`, ts: new Date().toISOString() }]
    });
    setLastRoll(roll);
    commitCampaign(next, success ? 'Encounter resolved successfully.' : 'Encounter resolved with a complication.');
  }

  function dismissEncounter() {
    if (!campaign?.active_encounter) return;
    const encounter = campaign.active_encounter;
    const next = normalizeCampaign({ ...campaign, active_encounter: null, encounter_log: [...(campaign.encounter_log || []), { id: encounter.id, title: encounter.title, outcome: 'dismissed', ts: new Date().toISOString() }], log: [...(campaign.log || []), { role: 'dm', content: `Encounter passed by: ${encounter.title}.`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'Encounter dismissed.');
  }

  function beginScene() {
    if (!campaign) return;
    const card = drawScene(campaign);
    const next = normalizeCampaign({ ...campaign, active_scene: card, location: card.location, log: [...(campaign.log || []), { role: 'dm', content: `Scene drawn: ${card.title}\n\n${card.text}`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'Scene card drawn.');
  }

  function resolveSceneChoice(choiceIndex) {
    if (!campaign?.active_scene) return;
    const scene = campaign.active_scene;
    const choice = scene.choices?.[choiceIndex];
    if (!choice) return;
    const skill = choice.skill || 'perception';
    const mod = campaign.player?.skills?.[skill] || 0;
    const roll = rollCheck({ expr: `1d20+${mod}`, mod, dc: choice.dc || 12, label: `${scene.title}: ${skill}` });
    const success = roll.outcome.includes('success');
    const update = success ? { add_items: choice.add_items || (choice.reward ? [choice.reward] : []), quest_updates: [{ id: choice.quest_id || 'q_main_1', progress: 1, clue: `${scene.title}: ${choice.reward || choice.label}` }], flags: { [`scene_${scene.id}`]: true } } : { hp_delta: -1 };
    const base = applyCampaignUpdate(campaign, update);
    const patches = success && choice.patch ? [choice.patch] : [];
    const text = success ? `Scene beat cleared: ${choice.label}. You gain ${choice.reward || 'a clue'}; the ledger advances.` : `Scene complication: ${choice.label}. The hill resists, HP -1, but the story remains playable.`;
    const next = normalizeCampaign({
      ...base,
      active_scene: null,
      pending_patches: [...(base.pending_patches || []), ...patches],
      scene_log: [...(base.scene_log || []), { id: scene.id, title: scene.title, choice: choice.label, outcome: roll.outcome, ts: new Date().toISOString() }],
      log: [...(base.log || []), { role: 'player', content: `Scene choice: ${choice.label}`, ts: new Date().toISOString() }, { role: 'dm', content: `${text}\n\nRoll: ${roll.detail} · ${roll.outcome}`, ts: new Date().toISOString() }]
    });
    setLastRoll(roll);
    commitCampaign(next, success ? 'Scene resolved successfully.' : 'Scene resolved with a complication.');
  }

  function dismissScene() {
    if (!campaign?.active_scene) return;
    const scene = campaign.active_scene;
    const next = normalizeCampaign({ ...campaign, active_scene: null, scene_log: [...(campaign.scene_log || []), { id: scene.id, title: scene.title, outcome: 'saved for later', ts: new Date().toISOString() }], log: [...(campaign.log || []), { role: 'dm', content: `Scene set aside: ${scene.title}.`, ts: new Date().toISOString() }] });
    commitCampaign(next, 'Scene saved for later.');
  }

  function meetNpc() {
    if (!campaign) return;
    const npc = drawNpc(campaign);
    const next = normalizeCampaign({ ...campaign, npcs: { ...(campaign.npcs || {}), [npc.id]: npc }, npc_log: [...(campaign.npc_log || []), { id: npc.id, title: npc.title, action: 'met', ts: new Date().toISOString() }], log: [...(campaign.log || []), { role: 'dm', content: `NPC card met: ${npc.title}, ${npc.role}.\n\n${npc.vibe}`, ts: new Date().toISOString() }] });
    commitCampaign(next, `${npc.title} joined the table.`);
  }

  function askNpc(npcId) {
    if (!campaign) return;
    const npc = normalizeNpc(campaign.npcs?.[npcId]);
    if (!npc) return;
    const baseCard = NPC_CARDS.find((card) => card.id === npc.id) || npc;
    const aid = baseCard.aid || {};
    const base = applyCampaignUpdate(campaign, { add_items: aid.add_items || [], quest_updates: aid.quest_id ? [{ id: aid.quest_id, progress: 1, clue: aid.clue || `${npc.title} offered help.` }] : [], npcs: { [npc.id]: { ...npc, trust: Math.min(5, (npc.trust || 0) + 1) } } });
    const next = normalizeCampaign({ ...base, npc_log: [...(base.npc_log || []), { id: npc.id, title: npc.title, action: 'asked for help', ts: new Date().toISOString() }], log: [...(base.log || []), { role: 'player', content: `Ask ${npc.title} for help`, ts: new Date().toISOString() }, { role: 'dm', content: `${baseCard.ask}\n\nTrust +1. ${aid.clue ? `Quest clue: ${aid.clue}` : ''}`, ts: new Date().toISOString() }] });
    commitCampaign(next, `${npc.title} helped the quest ledger.`);
  }

  function campRest() {
    if (!campaign) return;
    const state = adventureState(campaign);
    const heal = campaign.flags?.rested_this_scene ? 1 : 2;
    const base = applyCampaignUpdate(campaign, { hp_delta: heal, flags: { rested_once: true, rested_this_scene: true, trail_kit_ready: false } });
    const next = normalizeCampaign({ ...base, log: [...(base.log || []), { role: 'dm', content: `Camp action: You make a small safe circle of light, food, and receipts. HP +${heal}.\n\nAdventure state: ${state.label}. ${state.detail}`, ts: new Date().toISOString() }] });
    commitCampaign(next, `Camp rest complete. HP +${heal}.`);
  }

  function completeFinale() {
    if (!campaign) return;
    const state = adventureState(campaign);
    const allReady = state.readyFinale;
    const title = allReady ? 'The Porch Key Opens With Mercy' : 'A Partial Dawn on Blackwood Hill';
    const endingText = allReady
      ? 'With the key repaired, the apprentice found, and the door-truth written down, Blackwood Hill releases its grip. The porch becomes a way home instead of a trap.'
      : 'You do not solve every mystery tonight, but you carry enough truth to keep the porch open and return stronger.';
    const completedQuests = (campaign.quests || []).map((q) => normalizeQuest({ ...q, status: allReady || (q.progress || 0) >= (q.max_progress || 3) ? 'completed' : q.status }));
    const next = normalizeCampaign({ ...campaign, quests: completedQuests, ending: { status: 'complete', title, completed_at: new Date().toISOString(), full_clear: allReady }, flags: { ...(campaign.flags || {}), adventure_complete: true }, log: [...(campaign.log || []), { role: 'dm', content: `Finale: ${title}\n\n${endingText}`, ts: new Date().toISOString() }] });
    commitCampaign(next, allReady ? 'Starter adventure completed.' : 'Partial ending recorded.');
  }

  function useInventoryItem(item) {
    if (!campaign) return;
    const action = ITEM_ACTIONS.find((candidate) => candidate.match.test(item.toLowerCase())) || { title: 'Inspect item', text: `You study ${item}. It feels ordinary until the story gives it a job.`, update: {} };
    const base = applyCampaignUpdate(campaign, action.update || {});
    const patches = action.patch ? [action.patch] : [];
    const next = normalizeCampaign({
      ...base,
      pending_patches: [...(base.pending_patches || []), ...patches],
      log: [...(base.log || []), { role: 'player', content: `Use item: ${item}`, ts: new Date().toISOString() }, { role: 'dm', content: `${action.title}: ${action.text}${patches.length ? '\n\nCanon proposal added from inventory use.' : ''}`, ts: new Date().toISOString() }]
    });
    commitCampaign(next, `Used ${item}.`);
  }

  function exportSave() {
    if (!campaign) return;
    const payload = JSON.stringify(normalizeCampaign(campaign), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porchquest369-${campaign.id || 'campaign'}-save.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Save exported.');
  }

  function importSave(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeCampaign(JSON.parse(String(reader.result || '{}')));
        commitCampaign(imported, 'Save imported into this browser.');
        setCharacterDraft({ name: imported.player.name, class_name: imported.player.class_name, background: imported.player.background || 'Porch-Touched' });
      } catch (err) {
        console.warn(err);
        setStatus('Import failed: invalid PorchQuest369 save JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const player = campaign?.player || {};
  const log = campaign?.log || [];
  const pendingPatches = campaign?.pending_patches || [];
  const worldNodes = useMemo(() => Object.values(campaign?.world?.nodes || {}), [campaign]);
  const activeEncounter = campaign?.active_encounter;
  const activeScene = campaign?.active_scene;
  const knownNpcs = useMemo(() => Object.values(campaign?.npcs || {}).filter(Boolean), [campaign]);
  const state = adventureState(campaign || fallbackCampaign);
  const dmLabel = dmBackend?.mode === 'ai' ? `AI DM · ${dmBackend.model}` : dmSettings.mode === 'custom' ? 'Custom browser endpoint' : apiOnline ? 'Server local fallback' : 'Browser oracle fallback';

  return <div className="app-shell">
    <header className="hero">
      <div>
        <p className="eyebrow">Prompt RPG Engine</p>
        <h1>PorchQuest369</h1>
        <p className="subtitle">Dice, memory, scenes, NPCs, camp actions, endings, and a living campaign ledger.</p>
      </div>
      <div className="hero-card">
        <Sparkles size={22} />
        <strong>{campaign?.campaign_name || 'Loading campaign...'}</strong>
        <span>{status}</span>
        <em>{apiOnline ? dmLabel : `Browser campaign · ${dmLabel}`}</em>
      </div>
    </header>

    <main className="grid">
      <section className="story panel">
        <h2><ScrollText size={18} /> Story</h2>
        <div className="story-log">
          {log.map((item, idx) => <article key={idx} className={`message ${item.role}`}>
            <span>{item.role === 'dm' ? 'DM' : 'You'}</span>
            <p>{item.content}</p>
          </article>)}
        </div>
        <form className="prompt-bar" onSubmit={submitAction}>
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="What do you do?" />
          <button type="submit">Send</button>
        </form>
      </section>

      <aside className="sidebar">
        <Panel title="DM Engine" icon={Sparkles}>
          <p className="engine-status"><strong>{dmLabel}</strong><span>{dmBackend?.configured ? 'configured' : 'fallback ready'}</span></p>
          <form className="stack" onSubmit={saveDmPanel}>
            <label>Browser DM mode<select value={dmSettings.mode} onChange={(e) => setDmSettings({ ...dmSettings, mode: e.target.value })}>
              <option value="browser">Browser oracle fallback</option>
              <option value="custom">Custom DM endpoint</option>
            </select></label>
            <label>Custom endpoint URL<input value={dmSettings.endpoint} onChange={(e) => setDmSettings({ ...dmSettings, endpoint: e.target.value })} placeholder="https://your-dm-endpoint.example/turn" /></label>
            <button type="submit" className="ghost">Save DM settings</button>
          </form>
          <button className="ghost secondary" onClick={testDmEngine}>Test DM engine</button>
          <p className="test-result">{dmTestStatus}</p>
          <p className="muted">Never paste API keys here. The public Pages app only stores an endpoint URL; model keys belong behind your own server.</p>
        </Panel>

        <Panel title="Adventure State" icon={Sparkles}>
          <div className={`ending-card ${state.complete ? 'complete' : ''}`}>
            <strong>{state.label}</strong>
            <p>{state.detail}</p>
          </div>
          <div className="button-row wide">
            <button onClick={campRest}>Camp / Rest</button>
            <button className="secondary-inline" onClick={completeFinale}>{state.readyFinale ? 'Resolve Finale' : 'Record Partial Ending'}</button>
          </div>
        </Panel>

        <Panel title="Scene Deck" icon={ScrollText}>
          {activeScene ? <div className="scene-card">
            <small>Act {activeScene.act} · {activeScene.location}</small>
            <strong>{activeScene.title}</strong>
            <p>{activeScene.text}</p>
            <div className="choice-list">
              {(activeScene.choices || []).map((choice, idx) => <button key={`${activeScene.id}_${idx}`} onClick={() => resolveSceneChoice(idx)}>{choice.label} <span>{choice.skill} DC {choice.dc}</span></button>)}
            </div>
            <button className="ghost secondary" onClick={dismissScene}>Save scene for later</button>
          </div> : <>
            <p className="muted">Draw a structured scene when you want a stronger adventure beat with choices and quest movement.</p>
            <button className="ghost" onClick={beginScene}>Draw scene</button>
          </>}
        </Panel>

        <Panel title="NPC Cards" icon={Map}>
          <button className="ghost" onClick={meetNpc}>Meet NPC</button>
          {knownNpcs.length === 0 ? <p className="muted">NPC allies and complications will appear here.</p> : <ul className="list npc-list">{knownNpcs.map((npc) => <li key={npc.id}>
            <strong>{npc.title}</strong>{npc.role}
            <small>{npc.vibe}</small>
            <div className="trust-row"><span>Trust {npc.trust || 0}/5</span><button className="item-button" onClick={() => askNpc(npc.id)}>Ask</button></div>
          </li>)}</ul>}
        </Panel>

        <Panel title="Encounter Card" icon={Dice5}>
          {activeEncounter ? <div className="encounter-card">
            <strong>{activeEncounter.title}</strong>
            <p>{activeEncounter.scene}</p>
            <small>Danger: {activeEncounter.danger}</small>
            <small>Challenge: {activeEncounter.skill} vs DC {activeEncounter.dc}</small>
            <div className="button-row">
              <button onClick={() => resolveEncounter(activeEncounter.skill)}>Use {activeEncounter.skill}</button>
              <button className="secondary-inline" onClick={() => resolveEncounter('perception')}>Perception</button>
              <button className="secondary-inline" onClick={dismissEncounter}>Pass by</button>
            </div>
          </div> : <>
            <p className="muted">Draw a lightweight encounter when the trail needs pressure, stakes, and a reward.</p>
            <button className="ghost" onClick={beginEncounter}>Draw encounter</button>
          </>}
        </Panel>

        <Panel title="Character" icon={Dice5}>
          <h3>{player.name} · Lv {player.level} {player.class_name}</h3>
          <p className="muted">Background: {player.background || 'Porch-Touched'}</p>
          <div className="stats-row">
            <StatPill label="HP" value={`${player.hp}/${player.hp_max}`} />
            <StatPill label="AC" value={player.ac} />
            <StatPill label="Turn" value={campaign?.turn ?? 0} />
          </div>
          <div className="mini-grid">{Object.entries(player.stats || {}).map(([k, v]) => <StatPill key={k} label={k.toUpperCase()} value={v} />)}</div>
          <button className="ghost" onClick={rollD20}>Roll d20+2</button>
          <button className="ghost secondary" onClick={resetBrowserCampaign}>Reset browser campaign</button>
          {lastRoll && <p className="roll-result">{lastRoll.label || lastRoll.expr}: {lastRoll.detail} · {lastRoll.outcome}</p>}
        </Panel>

        <Panel title="Character Setup" icon={Sparkles}>
          <form className="stack" onSubmit={applyCharacterDraft}>
            <label>Hero name<input value={characterDraft.name} onChange={(e) => setCharacterDraft({ ...characterDraft, name: e.target.value })} /></label>
            <label>Class<select value={characterDraft.class_name} onChange={(e) => setCharacterDraft({ ...characterDraft, class_name: e.target.value })}>{Object.keys(CLASS_PRESETS).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label>Background<input value={characterDraft.background} onChange={(e) => setCharacterDraft({ ...characterDraft, background: e.target.value })} /></label>
            <button type="submit" className="ghost">Update character</button>
          </form>
        </Panel>

        <Panel title="Canon Queue" icon={Map}>
          {pendingPatches.length === 0 ? <p className="muted">No pending world changes. New discoveries will appear here before becoming canon.</p> : <>
            <button className="ghost" onClick={approveAllPatches}>Approve all</button>
            <ul className="list patches">{pendingPatches.map((patch) => <li key={patch.id}>
              <strong>{patchTitle(patch)}</strong>
              <span>{patchSummary(patch)}</span>
              <small>{patch.reason}</small>
              <div className="button-row"><button onClick={() => approvePatch(patch.id)}>Approve</button><button className="secondary-inline" onClick={() => rejectPatch(patch.id)}>Reject</button></div>
            </li>)}</ul>
          </>}
        </Panel>

        <Panel title="Quests" icon={ScrollText}>
          <ul className="list quests">{(campaign?.quests || []).map((q) => <li key={q.id}>
            <strong>{q.status}</strong>{q.title}
            <div className="progress"><span style={{ width: `${Math.min(100, ((q.progress || 0) / (q.max_progress || 3)) * 100)}%` }} /></div>
            <small>{q.progress || 0}/{q.max_progress || 3} clues{q.clues?.length ? ` · ${q.clues.slice(-2).join(' · ')}` : ''}</small>
          </li>)}</ul>
        </Panel>

        <Panel title="Inventory Actions" icon={Backpack}>
          <ul className="list inventory-list">{(player.inventory || []).map((item, idx) => <li key={`${item}_${idx}`}>
            <span>{item}</span>
            <button className="item-button" onClick={() => useInventoryItem(item)}>Use</button>
          </li>)}</ul>
        </Panel>

        <Panel title="Save Tools" icon={Backpack}>
          <div className="button-row wide"><button onClick={exportSave}>Export save</button><label className="file-button">Import save<input type="file" accept="application/json" onChange={importSave} /></label></div>
          <p className="muted">Browser mode saves locally on this device. Exporting gives you a portable campaign receipt.</p>
        </Panel>

        <Panel title="World Nodes" icon={Map}>
          <ul className="list">{worldNodes.map((n, idx) => <li key={n.id || idx}><strong>{n.title}</strong>{n.summary}{n.facts?.length ? <small>{n.facts.join(' · ')}</small> : null}</li>)}</ul>
        </Panel>
      </aside>
    </main>
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const STORAGE_KEY = 'porchquest369.browserCampaign.v6';
const LEGACY_STORAGE_KEYS = [
  'porchquest369.browserCampaign.v5',
  'porchquest369.browserCampaign.v4',
  'porchquest369.browserCampaign.v3',
  'porchquest369.browserCampaign.v2',
  'porchquest369.browserCampaign.v1'
];
const BRIDGE_SETTINGS_KEY = 'porchquest369.backendBridge.v2';
const LEGACY_BRIDGE_SETTINGS_KEY = 'porchquest369.backendBridge.v1';

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
  { id: 'q_main_1', title: 'Find the missing porch key', status: 'active', progress: 0, max_progress: 4, clues: [] },
  { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", status: 'active', progress: 0, max_progress: 3, clues: [] },
  { id: 'q_mystery_1', title: 'Learn why the hill doors remember lies', status: 'active', progress: 0, max_progress: 3, clues: [] }
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
  { id: 'memory_door', act: 'II', title: 'The Door That Keeps Receipts', location: 'Blackwood Hill', text: 'A door stands alone in the rain. Each drop becomes handwriting for one breath.', choices: [
    { label: 'Answer the door truthfully', skill: 'persuasion', dc: 13, quest_id: 'q_mystery_1', reward: 'truthful answer receipt', patch: { type: 'append_fact', node_id: 'blackwood_hill', facts: ['Truthful answers weaken the hill doors.'], reason: 'Scene tested the memory door.' } },
    { label: 'Write down what the door asks', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'door question receipt', add_items: ['door question receipt'] }
  ] },
  { id: 'iron_saint_beneath', act: 'III', title: 'The Iron Saint Beneath the Hill', location: 'Under Blackwood Hill', text: 'Below the roots, an iron guardian waits beside a keyhole shaped like mercy.', choices: [
    { label: 'Offer the repaired key-sign', skill: 'perception', dc: 14, quest_id: 'q_main_1', reward: 'repaired porch key', add_items: ['repaired porch key'] },
    { label: 'Speak the receipts aloud', skill: 'persuasion', dc: 14, quest_id: 'q_mystery_1', reward: 'hill truth receipt' }
  ] }
];

const ENCOUNTERS = [
  { id: 'blue_moth_swarm', title: 'Blue-Fire Moth Swarm', scene: 'A spiral of blue-fire moths forms a living arrow above the wet path.', skill: 'survival', dc: 12, reward: 'moth trail clue', quest_id: 'q_side_1' },
  { id: 'lying_door', title: 'The Lying Door', scene: 'A freestanding door waits between two black pines and asks one careful question.', skill: 'persuasion', dc: 13, reward: 'door-memory clue', quest_id: 'q_mystery_1' },
  { id: 'porch_key_echo', title: 'Porch Key Echo', scene: 'Something under the boards knocks in the rhythm of your heartbeat.', skill: 'perception', dc: 12, reward: 'brass key tooth clue', quest_id: 'q_main_1' },
  { id: 'rootbound_choir', title: 'Rootbound Choir', scene: 'Roots hum below the mud like a choir trying not to wake the hill.', skill: 'arcana', dc: 14, reward: 'root harmony clue', quest_id: 'q_mystery_1' }
];

const NPCS = [
  { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', vibe: 'Kind, evasive, and allergic to simple answers.', ask: 'Take the left trail when the hill asks your name.', aid: { quest_id: 'q_main_1', clue: 'Old Joss says the missing key answers to mercy.', add_items: ['Joss left-trail note'] } },
  { id: 'mara_lanternwright', title: 'Mara Lanternwright', role: 'Lantern-maker', vibe: 'Tired hands, bright eyes, refusing to give up.', ask: 'The soot pattern appears only when the apprentice is nearby.', aid: { quest_id: 'q_side_1', clue: 'Mara identifies blue ash as the apprentice signal.', add_items: ['lanternwright ash lens'] } },
  { id: 'nix_understep', title: 'Nix Understep', role: 'Hill-runner', vibe: 'Fast, funny, and serious about never lying to doors.', ask: 'Every door is hungry for contradiction.', aid: { quest_id: 'q_mystery_1', clue: 'Nix says witnessed records weaken the doors.', add_items: ['Nix door-map scrap'] } }
];

function stamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function msg(role, text) { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, text, at: stamp() }; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function uniq(list) { return Array.from(new Set((list || []).filter(Boolean))); }
function nextSeed(seed) { return (Number(seed || 369) * 1664525 + 1013904223) % 4294967296; }

function defaultCampaign(playerName = 'Mikey', className = 'Lantern-Seeker') {
  const preset = CLASS_PRESETS[className] || CLASS_PRESETS['Lantern-Seeker'];
  return normalize({ id: 'browser-blackwood-hill', version: 6, name: 'Lanterns Under Blackwood Hill', player: { name: playerName, class_name: className, ...preset }, quests: BASE_QUESTS, world_nodes: BASE_NODES, pending_patches: [], active_scene: null, active_encounter: null, npcs: {}, flags: {}, conditions: [], ending: null, seed: 369, story_log: [msg('dm', 'Rain taps the Infinite Porch. Blue lanterns glow beyond the rail. Blackwood Hill is waiting.')] });
}

function normalize(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const p = c.player && typeof c.player === 'object' ? c.player : {};
  const preset = CLASS_PRESETS[p.class_name] || CLASS_PRESETS['Lantern-Seeker'];
  return {
    id: c.id || 'browser-blackwood-hill', version: 6, name: c.name || 'Lanterns Under Blackwood Hill',
    player: { name: p.name || 'Mikey', class_name: p.class_name || 'Lantern-Seeker', hp: Number.isFinite(p.hp) ? p.hp : preset.hp, hp_max: Number.isFinite(p.hp_max) ? p.hp_max : preset.hp_max, ac: Number.isFinite(p.ac) ? p.ac : preset.ac, skills: p.skills || preset.skills, inventory: uniq(p.inventory || preset.inventory) },
    quests: (Array.isArray(c.quests) && c.quests.length ? c.quests : BASE_QUESTS).map((q, i) => ({ id: q.id || BASE_QUESTS[i]?.id || `q_${i}`, title: q.title || BASE_QUESTS[i]?.title || 'Quest', status: q.status || 'active', progress: Number.isFinite(q.progress) ? q.progress : 0, max_progress: Number.isFinite(q.max_progress) ? q.max_progress : BASE_QUESTS[i]?.max_progress || 3, clues: uniq(q.clues || []) })),
    world_nodes: Array.isArray(c.world_nodes) && c.world_nodes.length ? c.world_nodes : BASE_NODES,
    pending_patches: Array.isArray(c.pending_patches) ? c.pending_patches : [],
    active_scene: c.active_scene || null,
    active_encounter: c.active_encounter || null,
    npcs: c.npcs && typeof c.npcs === 'object' ? c.npcs : {},
    flags: c.flags && typeof c.flags === 'object' ? c.flags : {},
    conditions: uniq(c.conditions || []),
    ending: c.ending || null,
    seed: Number.isFinite(c.seed) ? c.seed : 369,
    story_log: Array.isArray(c.story_log) && c.story_log.length ? c.story_log : [msg('dm', 'The porch is awake. Draw a scene, meet an NPC, or type an action.')]
  };
}

function loadCampaign() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try { return normalize(JSON.parse(raw)); } catch { /* continue */ }
  }
  return defaultCampaign();
}

function loadBridge() {
  const defaults = { enabled: false, apiBase: API_BASE, serverCampaignId: '', status: 'Browser Oracle ready.', lastSync: '' };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(BRIDGE_SETTINGS_KEY) || localStorage.getItem(LEGACY_BRIDGE_SETTINGS_KEY) || '{}') }; }
  catch { return defaults; }
}

function addLog(c, role, text) { return { ...c, story_log: [...c.story_log, msg(role, text)].slice(-90) }; }
function addConditions(c, tags) { return { ...c, conditions: uniq([...(c.conditions || []), ...(tags || [])]) }; }
function removeConditions(c, tags) { return { ...c, conditions: (c.conditions || []).filter((x) => !(tags || []).includes(x)) }; }
function addItems(c, items) { return items?.length ? { ...c, player: { ...c.player, inventory: uniq([...(c.player.inventory || []), ...items]) } } : c; }
function queuePatch(c, patch) { return patch ? { ...c, pending_patches: [...c.pending_patches, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, patch, reason: patch.reason || 'Gameplay discovery awaits approval.' }] } : c; }
function updateQuest(c, questId, clue, amount = 1) {
  if (!questId) return c;
  return { ...c, quests: c.quests.map((q) => q.id === questId ? { ...q, progress: clamp((q.progress || 0) + amount, 0, q.max_progress), status: (q.progress || 0) + amount >= q.max_progress ? 'complete' : q.status, clues: uniq([...(q.clues || []), clue]) } : q) };
}
function roll(c, skill, dc) {
  const seed = nextSeed(c.seed); const raw = (seed % 20) + 1; const mod = Number(c.player.skills?.[skill] || 0) + (c.conditions.includes('inspired') ? 1 : 0); const total = raw + mod;
  return { seed, raw, mod, total, dc, skill, success: raw === 20 || total >= dc };
}
function adventureState(c) {
  const done = c.quests.filter((q) => q.status === 'complete').length; const progress = c.quests.reduce((s, q) => s + (q.progress || 0), 0);
  if (c.ending) return { label: 'Complete', detail: c.ending.title, ready: false };
  if (done >= 2 || progress >= 8) return { label: 'Finale Ready', detail: 'The Iron Saint can be confronted.', ready: true };
  if (progress >= 5) return { label: 'Hot Thread', detail: 'The clue receipts are converging.', ready: false };
  return { label: 'In Motion', detail: 'Draw scenes, meet NPCs, and follow receipts.', ready: false };
}

function localDrawScene(c) {
  const seen = new Set(c.flags.scene_history || []); const card = SCENE_CARDS.find((s) => !seen.has(s.id)) || SCENE_CARDS[(c.seed || 0) % SCENE_CARDS.length];
  return addLog({ ...c, active_scene: card, flags: { ...c.flags, scene_history: uniq([...(c.flags.scene_history || []), card.id]) } }, 'dm', `Scene drawn: ${card.title}\n${card.text}`);
}
function localResolveScene(c, idx = 0) {
  if (!c.active_scene) return addLog(c, 'dm', 'Draw a scene before resolving a choice.');
  const choice = c.active_scene.choices[idx] || c.active_scene.choices[0]; const r = roll(c, choice.skill, choice.dc); let next = { ...c, seed: r.seed, active_scene: null };
  if (r.success) { next = updateQuest(next, choice.quest_id, choice.reward, 1); next = addItems(next, choice.add_items); next = addConditions(next, choice.add_conditions); next = removeConditions(next, ['inspired']); next = queuePatch(next, choice.patch); return addLog(next, 'dm', `Scene success: ${choice.label}\nRolled ${r.raw} + ${r.mod} = ${r.total}. Reward: ${choice.reward}.`); }
  next = addConditions(removeConditions(next, ['inspired']), ['watched']); return addLog(next, 'dm', `Scene complication: ${choice.label}\nRolled ${r.raw} + ${r.mod} = ${r.total}. Condition gained: watched.`);
}
function localDrawEncounter(c) { const seed = nextSeed(c.seed); const card = ENCOUNTERS[seed % ENCOUNTERS.length]; return addLog({ ...c, seed, active_encounter: card }, 'dm', `Encounter: ${card.title}\n${card.scene}`); }
function localResolveEncounter(c) {
  if (!c.active_encounter) return addLog(c, 'dm', 'Draw an encounter before resolving one.');
  const e = c.active_encounter; const r = roll(c, e.skill, e.dc); let next = { ...c, seed: r.seed, active_encounter: null };
  if (r.success) { next = updateQuest(removeConditions(next, ['inspired']), e.quest_id, e.reward, 1); return addLog(next, 'dm', `Encounter cleared: ${e.title}\nRolled ${r.raw} + ${r.mod} = ${r.total}. Reward: ${e.reward}.`); }
  next = { ...removeConditions(next, ['inspired']), player: { ...next.player, hp: clamp(next.player.hp - 1, 0, next.player.hp_max) } }; return addLog(addConditions(next, ['marked']), 'dm', `Encounter complication: ${e.title}\nHP -1. Condition gained: marked.`);
}
function localMeetNpc(c) { const known = new Set(Object.keys(c.npcs || {})); const npc = NPCS.find((n) => !known.has(n.id)) || NPCS[(c.seed || 0) % NPCS.length]; return addLog({ ...c, npcs: { ...c.npcs, [npc.id]: { ...npc, trust: c.npcs?.[npc.id]?.trust || 1 } } }, 'dm', `NPC met: ${npc.title}, ${npc.role}.\n${npc.vibe}`); }
function localAskNpc(c, npcId) { const npc = c.npcs[npcId] || NPCS.find((n) => n.id === npcId); if (!npc) return addLog(c, 'dm', 'No NPC is ready to help yet.'); let next = { ...c, npcs: { ...c.npcs, [npcId]: { ...npc, trust: (npc.trust || 1) + 1 } } }; next = updateQuest(next, npc.aid?.quest_id, npc.aid?.clue, 1); next = addItems(next, npc.aid?.add_items); return addLog(addConditions(next, ['inspired']), 'dm', `${npc.title} helps you.\n${npc.ask}\nCondition gained: inspired.`); }
function localCamp(c) { let next = { ...c, player: { ...c.player, hp: clamp(c.player.hp + 3, 0, c.player.hp_max) } }; return addLog(removeConditions(next, ['watched', 'marked', 'tired']), 'dm', 'Camp made. HP +3. Watched, marked, and tired are cleared.'); }
function localFinale(c) { const state = adventureState(c); const complete = state.ready; let next = { ...c, ending: { title: complete ? 'The Porch Key Remembers Mercy' : 'A Partial Dawn on Blackwood Hill', complete, at: new Date().toISOString() } }; return addLog(complete ? removeConditions(next, ['watched', 'marked', 'tired', 'hidden']) : addConditions(next, ['tired']), 'dm', complete ? 'Finale complete. Blackwood Hill releases its main hold.' : 'Partial ending saved. More receipts remain. Condition gained: tired.'); }

async function json(response) { if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`); return response.json(); }
function shortError(error) { return String(error?.message || error).slice(0, 140); }

export default function AppV6({ icons = {} }) {
  const { Dice5, ScrollText, Backpack, Map, Sparkles } = icons;
  const [campaign, setCampaign] = useState(loadCampaign);
  const [bridge, setBridge] = useState(loadBridge);
  const [playerName, setPlayerName] = useState(campaign.player.name);
  const [className, setClassName] = useState(campaign.player.class_name);
  const [action, setAction] = useState('I inspect the lantern light near the porch rail.');
  const [serverIdInput, setServerIdInput] = useState(loadBridge().serverCampaignId || '');
  const [busy, setBusy] = useState(false);
  const state = useMemo(() => adventureState(campaign), [campaign]);
  const apiRoot = bridge.apiBase.replace(/\/$/, '');
  const activeConditions = campaign.conditions || [];

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign)); }, [campaign]);
  useEffect(() => { localStorage.setItem(BRIDGE_SETTINGS_KEY, JSON.stringify(bridge)); }, [bridge]);

  async function ensureServerCampaign() {
    if (bridge.serverCampaignId) return bridge.serverCampaignId;
    const payload = await json(await fetch(`${apiRoot}/api/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_name: campaign.player.name, campaign_name: campaign.name }) }));
    const serverCampaign = normalize(payload.campaign);
    setCampaign(serverCampaign); setServerIdInput(serverCampaign.id); setBridge((b) => ({ ...b, serverCampaignId: serverCampaign.id, status: `Connected to ${serverCampaign.id}.` })); return serverCampaign.id;
  }
  async function backendCall(path, options = {}) { const id = await ensureServerCampaign(); const payload = await json(await fetch(`${apiRoot}/api/campaigns/${id}${path}`, { method: options.method || 'POST', headers: { 'Content-Type': 'application/json' }, body: options.body ? JSON.stringify(options.body) : undefined })); if (payload.campaign) setCampaign(normalize(payload.campaign)); return payload; }
  async function runAction(label, localFn, path, options) { if (!bridge.enabled) { setCampaign((c) => localFn(c)); return; } setBusy(true); try { const payload = await backendCall(path, options); setBridge((b) => ({ ...b, status: `Backend ok: ${label}`, lastSync: new Date().toISOString() })); if (!payload.campaign) setCampaign((c) => addLog(c, 'dm', `Backend completed: ${label}.`)); } catch (error) { setBridge((b) => ({ ...b, status: `Backend failed; browser fallback used. ${shortError(error)}` })); setCampaign((c) => localFn(c)); } finally { setBusy(false); } }
  async function testBackend() { setBusy(true); try { const payload = await json(await fetch(`${apiRoot}/api/health`)); setBridge((b) => ({ ...b, status: `Backend health ok: ${payload.service || 'api'} ${payload.version || ''}` })); } catch (error) { setBridge((b) => ({ ...b, status: `Backend not reachable: ${shortError(error)}` })); } finally { setBusy(false); } }
  async function loadServerCampaign() { const id = serverIdInput.trim(); if (!id) { setBridge((b) => ({ ...b, status: 'Enter a server campaign ID first.' })); return; } setBusy(true); try { const payload = await json(await fetch(`${apiRoot}/api/campaigns/${id}`)); const serverCampaign = normalize(payload.campaign); setCampaign(serverCampaign); setBridge((b) => ({ ...b, serverCampaignId: id, status: `Loaded server campaign ${id}.`, lastSync: new Date().toISOString() })); } catch (error) { setBridge((b) => ({ ...b, status: `Load failed: ${shortError(error)}` })); } finally { setBusy(false); } }
  async function saveBrowserToServer() { setBusy(true); try { const id = serverIdInput.trim() || bridge.serverCampaignId || await ensureServerCampaign(); const payload = await json(await fetch(`${apiRoot}/api/campaigns/${id}/sync_from_client`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign: { ...campaign, id } }) })); const synced = normalize(payload.campaign); setCampaign(synced); setServerIdInput(id); setBridge((b) => ({ ...b, serverCampaignId: id, status: `Browser save pushed to ${id}.`, lastSync: new Date().toISOString() })); } catch (error) { setBridge((b) => ({ ...b, status: `Save to server failed: ${shortError(error)}` })); } finally { setBusy(false); } }
  function newCharacter() { setCampaign(defaultCampaign(playerName || 'Mikey', className)); setServerIdInput(''); setBridge((b) => ({ ...b, serverCampaignId: '', status: 'New browser campaign created. Backend link cleared.' })); }
  function clearCondition(tag) { if (!CONDITION_META[tag]) return; setCampaign((c) => addLog(removeConditions(c, [tag]), 'dm', `Condition cleared locally: ${tag}.`)); }
  function submitPrompt() { const text = action.trim(); if (!text) return; setCampaign((c) => { let next = addLog(c, 'player', text); const skill = /sneak|hide|quiet/i.test(text) ? 'stealth' : /talk|ask|convince/i.test(text) ? 'persuasion' : /magic|read|rune/i.test(text) ? 'arcana' : /track|trail|survive/i.test(text) ? 'survival' : 'perception'; const r = roll(next, skill, 12); next = { ...next, seed: r.seed }; next = r.success ? updateQuest(removeConditions(next, ['inspired']), 'q_main_1', `Action receipt: ${text}`, 1) : addConditions(removeConditions(next, ['inspired']), ['tired']); return addLog(next, 'dm', r.success ? `Roll ${r.raw} + ${r.mod} = ${r.total}. A useful receipt enters the ledger.` : `Roll ${r.raw} + ${r.mod} = ${r.total}. Condition gained: tired.`); }); setAction(''); }
  function useItem(item) { setCampaign((c) => { let next = c; if (/lantern|lens|light/i.test(item)) { next = addConditions(updateQuest(next, 'q_main_1', 'Lantern light revealed a hidden key trace.', 1), ['inspired']); return addLog(next, 'dm', `${item} glows blue. You gain inspired.`); } if (/water|ration|cloak/i.test(item)) { next = { ...next, player: { ...next.player, hp: clamp(next.player.hp + 1, 0, next.player.hp_max) } }; return addLog(removeConditions(next, ['tired']), 'dm', `${item} helps you recover. HP +1.`); } next = queuePatch(updateQuest(next, 'q_mystery_1', `Written witness: ${item}`, 1), { type: 'append_fact', node_id: 'blackwood_hill', facts: [`${item} was used as a witness receipt.`], reason: 'Inventory action created a witness receipt.' }); return addLog(next, 'dm', `${item} creates a canon proposal.`); }); }
  function exportSave() { const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'porchquest369-save-v6.json'; a.click(); URL.revokeObjectURL(url); }
  function importSave(e) { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { setCampaign(normalize(JSON.parse(reader.result))); } catch (error) { setBridge((b) => ({ ...b, status: `Import failed: ${error.message}` })); } }; reader.readAsText(file); e.target.value = ''; }
  function approvePatch(p) { setCampaign((c) => { const patch = p.patch || p; let nodes = [...c.world_nodes]; if (patch.type === 'upsert_node' && patch.node) nodes = nodes.filter((n) => n.id !== patch.node.id).concat(patch.node); if (patch.type === 'append_fact' && patch.node_id) nodes = nodes.map((n) => n.id === patch.node_id ? { ...n, facts: uniq([...(n.facts || []), ...(patch.facts || [])]) } : n); return { ...c, world_nodes: nodes, pending_patches: c.pending_patches.filter((x) => x.id !== p.id) }; }); }

  return <div className="app-shell">
    <header className="hero"><div><p className="eyebrow">PorchQuest369 v0.6.1</p><h1>Lanterns Under Blackwood Hill</h1><p className="subtitle">Instant browser tabletop with readable condition chips and optional server campaign sync.</p></div><div className="hero-card"><span>Adventure State</span><strong>{state.label}</strong><em>{state.detail}</em><span>{bridge.enabled ? 'Backend bridge enabled' : 'Browser oracle mode'}</span><span>{activeConditions.length ? `${activeConditions.length} active condition${activeConditions.length === 1 ? '' : 's'}` : 'No active pressure'}</span></div></header>
    <main className="grid"><section className="panel story"><h2>{ScrollText ? <ScrollText size={18} /> : null} Story Log</h2><div className="story-log">{campaign.story_log.map((m) => <div className={`message ${m.role === 'player' ? 'player' : 'dm'}`} key={m.id}><span>{m.role === 'player' ? campaign.player.name : 'Dungeon Master'} - {m.at}</span><p>{m.text}</p></div>)}</div><div className="prompt-bar"><input value={action} onChange={(e) => setAction(e.target.value)} onKeyDown={(e) => e.key === 'Enter' ? submitPrompt() : null} placeholder="Type an action..." /><button onClick={submitPrompt}>Act</button></div></section>
    <aside className="sidebar"><section className="panel"><h2>{Sparkles ? <Sparkles size={18} /> : null} Character + Conditions</h2><div className="stack"><label>Player name<input value={playerName} onChange={(e) => setPlayerName(e.target.value)} /></label><label>Class<select value={className} onChange={(e) => setClassName(e.target.value)}>{Object.keys(CLASS_PRESETS).map((c) => <option key={c}>{c}</option>)}</select></label><button className="ghost" onClick={newCharacter}>New Character</button></div><div className="stats-row"><div className="stat-pill"><span>HP</span><strong>{campaign.player.hp}/{campaign.player.hp_max}</strong></div><div className="stat-pill"><span>AC</span><strong>{campaign.player.ac}</strong></div><div className="stat-pill"><span>Class</span><strong>{campaign.player.class_name}</strong></div></div><div className="condition-grid">{activeConditions.length ? activeConditions.map((tag) => { const meta = CONDITION_META[tag] || { label: tag, detail: 'Custom condition.', tone: 'neutral' }; return <button key={tag} className={`condition-chip ${meta.tone}`} title="Click to clear locally" onClick={() => clearCondition(tag)}><strong>{meta.label}</strong><span>{meta.detail}</span></button>; }) : <div className="condition-chip clear"><strong>Clear</strong><span>No active condition tags.</span></div>}</div><p className="muted">Condition tags carry tabletop pressure across scenes. Camp clears most pressure; inspired boosts the next risky roll.</p></section>
    <section className="panel"><h2>Backend Bridge</h2><div className="engine-status"><strong>{bridge.enabled ? 'Server endpoint mode' : 'Browser mode'}</strong><span>{busy ? 'busy' : 'ready'}</span></div><div className="stack"><label>API base<input value={bridge.apiBase} onChange={(e) => setBridge((b) => ({ ...b, apiBase: e.target.value }))} /></label><label>Linked campaign ID<input value={serverIdInput} onChange={(e) => setServerIdInput(e.target.value)} placeholder="Paste server campaign id" /></label><label>Mode<select value={bridge.enabled ? 'yes' : 'no'} onChange={(e) => setBridge((b) => ({ ...b, enabled: e.target.value === 'yes' }))}><option value="no">Use browser oracle</option><option value="yes">Use backend if online</option></select></label></div><div className="button-row"><button onClick={testBackend} disabled={busy}>Test</button><button className="secondary-inline" onClick={ensureServerCampaign} disabled={busy}>Create/Link</button><button className="secondary-inline" onClick={loadServerCampaign} disabled={busy}>Load ID</button><button className="secondary-inline" onClick={saveBrowserToServer} disabled={busy}>Save to Server</button></div><p className="test-result">{bridge.status}</p>{bridge.serverCampaignId ? <p className="muted">Linked: <code>{bridge.serverCampaignId}</code>{bridge.lastSync ? ` | Last sync: ${new Date(bridge.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p> : null}</section>
    <section className="panel"><h2>{Dice5 ? <Dice5 size={18} /> : null} Adventure Buttons</h2><div className="button-row wide"><button onClick={() => runAction('draw scene', localDrawScene, '/scene/draw')}>Draw Scene</button><button onClick={() => runAction('draw encounter', localDrawEncounter, '/encounter/draw')}>Draw Encounter</button></div><div className="button-row wide"><button onClick={() => runAction('meet npc', localMeetNpc, '/npc/meet')}>Meet NPC</button><button onClick={() => runAction('camp', localCamp, '/camp')}>Camp</button></div><button className="ghost" onClick={() => runAction('finale', localFinale, '/finale')}>Attempt Finale</button>{campaign.active_scene ? <div className="scene-card" style={{ marginTop: 12 }}><small>Act {campaign.active_scene.act} - {campaign.active_scene.location}</small><strong>{campaign.active_scene.title}</strong><p>{campaign.active_scene.text}</p><div className="choice-list">{campaign.active_scene.choices.map((choice, idx) => <button key={choice.label} onClick={() => runAction(`scene choice ${idx + 1}`, (c) => localResolveScene(c, idx), '/scene/resolve', { body: { choice_index: idx } })}>{choice.label}<span>{choice.skill} DC {choice.dc}</span></button>)}</div></div> : null}{campaign.active_encounter ? <div className="encounter-card" style={{ marginTop: 12 }}><strong>{campaign.active_encounter.title}</strong><p>{campaign.active_encounter.scene}</p><button onClick={() => runAction('resolve encounter', localResolveEncounter, '/encounter/resolve', { body: { skill: campaign.active_encounter.skill } })}>Resolve {campaign.active_encounter.skill} DC {campaign.active_encounter.dc}</button></div> : null}{campaign.ending ? <div className={`ending-card ${campaign.ending.complete ? 'complete' : ''}`} style={{ marginTop: 12 }}><small>Ending Receipt</small><strong>{campaign.ending.title}</strong><p>{campaign.ending.complete ? 'Blackwood Hill releases its main hold.' : 'A partial ending is saved. More receipts remain.'}</p></div> : null}</section>
    <section className="panel"><h2>NPC Cards</h2><ul className="list npc-list">{Object.values(campaign.npcs).length ? Object.values(campaign.npcs).map((npc) => <li key={npc.id}><strong>{npc.title}</strong>{npc.role}<small>{npc.vibe}</small><div className="trust-row"><span>Trust {npc.trust || 1}</span><button className="item-button" onClick={() => runAction(`ask ${npc.title}`, (c) => localAskNpc(c, npc.id), `/npc/${npc.id}/ask`)}>Ask</button></div></li>) : <li>No NPCs met yet.</li>}</ul></section>
    <section className="panel"><h2>Quest Ledger</h2><ul className="list quests">{campaign.quests.map((q) => <li key={q.id}><strong>{q.status}</strong>{q.title}<div className="progress"><span style={{ width: `${clamp(((q.progress || 0) / (q.max_progress || 1)) * 100, 0, 100)}%` }} /></div><small>{q.progress || 0}/{q.max_progress || 0} receipts. {(q.clues || []).slice(-2).join(' | ')}</small></li>)}</ul></section>
    <section className="panel"><h2>{Backpack ? <Backpack size={18} /> : null} Inventory</h2><ul className="list inventory-list">{campaign.player.inventory.map((item) => <li key={item}><span>{item}</span><button className="item-button" onClick={() => useItem(item)}>Use</button></li>)}</ul><div className="button-row wide"><button onClick={exportSave}>Export Save</button><label className="file-button">Import Save<input type="file" accept="application/json" onChange={importSave} /></label></div></section>
    <section className="panel"><h2>{Map ? <Map size={18} /> : null} Canon Queue + World</h2><ul className="list patches">{campaign.pending_patches.length ? campaign.pending_patches.map((p) => <li key={p.id}><strong>{p.patch?.type || 'patch'}</strong><span>{p.reason || p.patch?.reason || 'Awaiting approval.'}</span><div className="button-row"><button onClick={() => approvePatch(p)}>Approve</button><button className="secondary-inline" onClick={() => setCampaign((c) => ({ ...c, pending_patches: c.pending_patches.filter((x) => x.id !== p.id) }))}>Reject</button></div></li>) : <li>No pending canon proposals.</li>}</ul><ul className="list" style={{ marginTop: 12 }}>{campaign.world_nodes.slice(-6).map((node) => <li key={node.id}><strong>{node.title}</strong>{node.summary}<small>{node.type}</small></li>)}</ul></section></aside></main>
  </div>;
}

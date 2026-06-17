import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const STORAGE_KEY = 'porchquest369.browserCampaign.v9';
const LEGACY_STORAGE_KEYS = [
  'porchquest369.browserCampaign.v8',
  'porchquest369.browserCampaign.v7',
  'porchquest369.browserCampaign.v6',
  'porchquest369.browserCampaign.v5',
  'porchquest369.browserCampaign.v4',
  'porchquest369.browserCampaign.v3',
  'porchquest369.browserCampaign.v2',
  'porchquest369.browserCampaign.v1'
];
const BRIDGE_SETTINGS_KEY = 'porchquest369.backendBridge.v5';
const LEGACY_BRIDGE_SETTINGS_KEYS = ['porchquest369.backendBridge.v4', 'porchquest369.backendBridge.v3', 'porchquest369.backendBridge.v2', 'porchquest369.backendBridge.v1'];

const SEED_PRESETS = [
  { label: 'Porch 369', value: 369 },
  { label: 'Mirror 963', value: 963 },
  { label: 'Lantern 144', value: 144 },
  { label: 'Lattice 20736', value: 20736 }
];

const CONDITION_META = {
  watched: { label: 'Watched', detail: 'The hill is tracking your route.', tone: 'pressure' },
  tired: { label: 'Tired', detail: 'Camp clears this and restores HP.', tone: 'pressure' },
  inspired: { label: 'Inspired', detail: 'Next risky roll gains +1.', tone: 'boon' },
  marked: { label: 'Marked', detail: 'A route sign follows you until camp.', tone: 'pressure' },
  hidden: { label: 'Hidden', detail: 'Stealth and perception gain +1.', tone: 'boon' }
};

const CLASS_PRESETS = {
  'Lantern-Seeker': { hp: 12, hp_max: 12, ac: 12, skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['porch key ring', 'lantern stub', 'waterskin'] },
  'Porch Warden': { hp: 15, hp_max: 15, ac: 14, skills: { stealth: 0, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['warden badge', 'lantern shield', 'field rope'] },
  'Hill Scout': { hp: 11, hp_max: 11, ac: 13, skills: { stealth: 3, perception: 2, persuasion: 0, arcana: 0, survival: 3 }, inventory: ['trail chalk', 'field kit'] },
  'Memory Bard': { hp: 10, hp_max: 10, ac: 12, skills: { stealth: 1, perception: 1, persuasion: 3, arcana: 1, survival: 0 }, inventory: ['story lute', 'silver quill', 'travel journal'] }
};

const BASE_QUESTS = [
  { id: 'q_main_1', title: 'Find the missing porch key', status: 'active', progress: 0, max_progress: 5, clues: [] },
  { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", status: 'active', progress: 0, max_progress: 4, clues: [] },
  { id: 'q_mystery_1', title: 'Learn why the hill doors remember', status: 'active', progress: 0, max_progress: 4, clues: [] }
];

const ROUTE_STEPS = [
  { id: 'porch_threshold', act: 'I', title: 'Porch Threshold', quest_id: 'q_main_1', skill: 'perception', dc: 12, reward: 'threshold clue' },
  { id: 'left_trail', act: 'I', title: 'Left Trail', quest_id: 'q_side_1', skill: 'survival', dc: 12, reward: 'apprentice trail clue' },
  { id: 'name_gate', act: 'I', title: 'Name Gate', quest_id: 'q_mystery_1', skill: 'persuasion', dc: 13, reward: 'name gate clue' },
  { id: 'root_bridge', act: 'II', title: 'Root Bridge', quest_id: 'q_side_1', skill: 'survival', dc: 13, reward: 'root route clue' },
  { id: 'rain_library', act: 'II', title: 'Rain Library', quest_id: 'q_mystery_1', skill: 'arcana', dc: 14, reward: 'rain record clue' },
  { id: 'candle_market', act: 'III', title: 'Candle Market', quest_id: 'q_main_1', skill: 'perception', dc: 14, reward: 'blue map clue' },
  { id: 'iron_saint', act: 'III', title: 'Iron Saint', quest_id: 'q_main_1', skill: 'persuasion', dc: 14, reward: 'final key clue' }
];

const NPCS = [
  { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' },
  { id: 'mara_lanternwright', title: 'Mara Lanternwright', role: 'Lantern-maker', quest_id: 'q_side_1', clue: 'Mara reads the apprentice sign.' },
  { id: 'nix_understep', title: 'Nix Understep', role: 'Hill-runner', quest_id: 'q_mystery_1', clue: 'Nix explains the memory-door rule.' },
  { id: 'sister_candle', title: 'Sister Candle', role: 'Candle witness', quest_id: 'q_mystery_1', clue: 'Sister Candle values written receipts.' },
  { id: 'bram_bleecker', title: 'Bram Bleecker', role: 'Porch courier', quest_id: 'q_side_1', clue: 'Bram saw the apprentice near the bridge.' },
  { id: 'thimble_ren', title: 'Thimble Ren', role: 'Map-mender', quest_id: 'q_main_1', clue: 'Ren folds the route toward the market.' }
];

const REWARDS = [
  { id: 'rest_token', title: 'Rest Token', text: 'Restore 1 HP and clear tired.', items: ['rest token'], hp: 1, clear: ['tired'] },
  { id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.' },
  { id: 'apprentice_mark', title: 'Apprentice Mark', text: 'Progress the apprentice route.', items: ['apprentice mark'], quest_id: 'q_side_1', clue: 'A small sign points toward the apprentice.' },
  { id: 'truth_note', title: 'Truth Note', text: 'Progress the memory route.', items: ['truth note'], quest_id: 'q_mystery_1', clue: 'A written note steadies the memory thread.' },
  { id: 'porch_coin', title: 'Porch Coin', text: 'Gain inspired.', items: ['porch coin'], add: ['inspired'] },
  { id: 'blue_map', title: 'Blue Map', text: 'Progress the key route.', items: ['blue map'], quest_id: 'q_main_1', clue: 'The map points toward a key clue.' }
];

function stamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function msg(role, text) { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, text, at: stamp() }; }
function uniq(list) { return Array.from(new Set((list || []).filter(Boolean))); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function nextSeed(seed) { return (Number(seed || 369) * 1664525 + 1013904223) % 4294967296; }

function defaultCampaign(playerName = 'Mikey', className = 'Lantern-Seeker', seed = 369) {
  const preset = CLASS_PRESETS[className] || CLASS_PRESETS['Lantern-Seeker'];
  return normalize({ id: 'browser-blackwood-hill', version: 9, name: 'Lanterns Under Blackwood Hill', player: { name: playerName, class_name: className, ...preset }, quests: BASE_QUESTS, world_nodes: [], pending_patches: [], npcs: {}, flags: { routeVisited: [] }, conditions: [], ending: null, seed, receipts: [], story_log: [msg('dm', 'Rain taps the Infinite Porch. Blackwood Hill is waiting.')] });
}

function normalize(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const p = c.player && typeof c.player === 'object' ? c.player : {};
  const preset = CLASS_PRESETS[p.class_name] || CLASS_PRESETS['Lantern-Seeker'];
  return {
    id: c.id || 'browser-blackwood-hill',
    version: 9,
    name: c.name || 'Lanterns Under Blackwood Hill',
    player: { name: p.name || 'Mikey', class_name: p.class_name || 'Lantern-Seeker', hp: Number.isFinite(p.hp) ? p.hp : preset.hp, hp_max: Number.isFinite(p.hp_max) ? p.hp_max : preset.hp_max, ac: Number.isFinite(p.ac) ? p.ac : preset.ac, skills: p.skills || preset.skills, inventory: uniq(p.inventory || preset.inventory) },
    quests: (Array.isArray(c.quests) && c.quests.length ? c.quests : BASE_QUESTS).map((q, i) => ({ id: q.id || BASE_QUESTS[i]?.id || `q_${i}`, title: q.title || BASE_QUESTS[i]?.title || 'Quest', status: q.status || 'active', progress: Number.isFinite(q.progress) ? q.progress : 0, max_progress: Number.isFinite(q.max_progress) ? q.max_progress : BASE_QUESTS[i]?.max_progress || 3, clues: uniq(q.clues || []) })),
    world_nodes: Array.isArray(c.world_nodes) ? c.world_nodes : [],
    pending_patches: Array.isArray(c.pending_patches) ? c.pending_patches : [],
    npcs: c.npcs && typeof c.npcs === 'object' ? c.npcs : {},
    flags: { ...(c.flags || {}), routeVisited: uniq(c.flags?.routeVisited || c.flags?.seenScenes || []) },
    conditions: uniq(c.conditions || p.conditions || []),
    ending: c.ending || null,
    seed: Number.isFinite(c.seed) ? c.seed : 369,
    receipts: uniq(c.receipts || []),
    story_log: Array.isArray(c.story_log) && c.story_log.length ? c.story_log : [msg('dm', 'The porch is awake. Advance the route, meet an NPC, draw a reward, or camp.')]
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
function addLog(c, role, text) { return { ...c, story_log: [...(c.story_log || []), msg(role, text)].slice(-160) }; }
function addItems(c, items) { return items?.length ? { ...c, player: { ...c.player, inventory: uniq([...(c.player.inventory || []), ...items]) } } : c; }
function addConditions(c, tags) { return { ...c, conditions: uniq([...(c.conditions || []), ...(tags || [])]) }; }
function removeConditions(c, tags) { return { ...c, conditions: (c.conditions || []).filter((x) => !(tags || []).includes(x)) }; }
function addReceipt(c, id, text) { if (!id || (c.receipts || []).includes(id)) return c; return addLog({ ...c, receipts: [...(c.receipts || []), id] }, 'system', `Receipt unlocked: ${text}`); }
function updateQuest(c, questId, clue, amount = 1) {
  if (!questId) return c;
  let celebration = null;
  const quests = c.quests.map((q) => {
    if (q.id !== questId) return q;
    const before = q.status === 'complete' || (q.progress || 0) >= (q.max_progress || 1);
    const progress = clamp((q.progress || 0) + amount, 0, q.max_progress || 1);
    const complete = progress >= (q.max_progress || 1);
    if (complete && !before) celebration = q.title;
    return { ...q, progress, status: complete ? 'complete' : q.status, clues: uniq([...(q.clues || []), clue]) };
  });
  let next = { ...c, quests };
  if (celebration) next = addReceipt(addLog(next, 'system', `Quest complete: ${celebration}`), `quest-${questId}`, `Quest complete: ${celebration}`);
  return next;
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
  if (done >= 3) return { label: 'Finale ready', detail: 'All three starter quests are complete. Open the finale.', complete: false, readyFinale: true };
  if (progress >= 9) return { label: 'Finale nearly ready', detail: 'The route threads are converging.', complete: false, readyFinale: false };
  if (progress >= 5) return { label: 'Hot thread', detail: 'Blackwood Hill is responding to your receipts.', complete: false, readyFinale: false };
  return { label: 'Adventure in motion', detail: 'Advance routes, ask NPCs, draw rewards, and approve canon.', complete: false, readyFinale: false };
}
function choose(c, list, seenKey) {
  const seed = nextSeed(c.seed);
  const seen = c.flags?.[seenKey] || [];
  const pool = list.filter((x) => !seen.includes(x.id));
  const card = (pool.length ? pool : list)[seed % (pool.length ? pool.length : list.length)];
  return { seed, card };
}
function resolveRoute(c, step) {
  const check = roll(c, step.skill, step.dc);
  let next = { ...c, seed: check.seed, flags: { ...c.flags, routeVisited: uniq([...(c.flags?.routeVisited || []), step.id]) } };
  if (check.usedInspired) next = removeConditions(next, ['inspired']);
  if (check.success) {
    next = addItems(next, [step.reward]);
    next = updateQuest(next, step.quest_id, `${step.title}: ${step.reward}`, 1);
    next = addReceipt(next, `route-${step.id}`, `${step.title} cleared`);
    next = { ...next, world_nodes: uniq([...(next.world_nodes || []), `${step.title} cleared`]) };
    return addLog(next, 'dm', `${step.title}: success on ${step.skill} ${check.total}/${check.dc}. You gain ${step.reward}.`);
  }
  next = addConditions(next, ['watched']);
  next = { ...next, player: { ...next.player, hp: clamp((next.player.hp || 1) - 1, 0, next.player.hp_max || 1) } };
  return addLog(next, 'dm', `${step.title}: ${step.skill} ${check.total}/${check.dc}. You keep moving, but the hill notices.`);
}
function drawRewardLocal(c) {
  const { seed, card } = choose(c, REWARDS, 'seenRewards');
  let next = { ...c, seed, flags: { ...c.flags, seenRewards: uniq([...(c.flags?.seenRewards || []), card.id]) } };
  next = addItems(next, card.items || []);
  next = addConditions(next, card.add || []);
  next = removeConditions(next, card.clear || []);
  if (card.hp) next = { ...next, player: { ...next.player, hp: clamp((next.player.hp || 0) + card.hp, 0, next.player.hp_max || 1) } };
  next = updateQuest(next, card.quest_id, card.clue, card.quest_id ? 1 : 0);
  next = addReceipt(next, `reward-${card.id}`, card.title);
  return addLog(next, 'dm', `Reward found: ${card.title}. ${card.text}`);
}
function meetNpcLocal(c) {
  const { seed, card } = choose(c, NPCS, 'seenNpcs');
  return addLog({ ...c, seed, npcs: { ...c.npcs, [card.id]: { ...card, trust: c.npcs?.[card.id]?.trust || 1 } }, flags: { ...c.flags, seenNpcs: uniq([...(c.flags?.seenNpcs || []), card.id]) } }, 'dm', `NPC met: ${card.title}, ${card.role}.`);
}
function askNpcLocal(c, id) {
  const npc = NPCS.find((n) => n.id === id) || c.npcs[id];
  if (!npc) return c;
  let next = updateQuest(c, npc.quest_id, npc.clue, 1);
  next = addItems(next, [`${npc.title} note`]);
  next = addConditions(next, ['inspired']);
  next = addReceipt(next, `npc-${id}`, `Helped by ${npc.title}`);
  next = { ...next, npcs: { ...next.npcs, [id]: { ...npc, trust: Math.min(5, Number(next.npcs?.[id]?.trust || 1) + 1) } } };
  return addLog(next, 'dm', `${npc.title} helps: ${npc.clue}`);
}
function campLocal(c) {
  let next = { ...c, player: { ...c.player, hp: c.player.hp_max } };
  next = removeConditions(next, ['watched', 'tired', 'marked']);
  next = addReceipt(next, 'camp-rested', 'Camp rest completed');
  return addLog(next, 'dm', 'Camp: HP restores and pressure tags clear.');
}
function finaleLocal(c) {
  const s = adventureState(c);
  const title = s.readyFinale ? 'Lanterns Under Blackwood Hill complete' : 'Partial ending recorded';
  let next = { ...c, ending: { status: s.readyFinale ? 'complete' : 'partial', title, recorded_at: new Date().toISOString() } };
  next = removeConditions(next, ['watched', 'tired', 'marked', 'hidden']);
  next = addReceipt(next, 'starter-ending', title);
  return addLog(next, 'dm', `${title}. The porch opens homeward with your receipts.`);
}
function routeReset(c) {
  return addLog({ ...c, quests: BASE_QUESTS.map((q) => ({ ...q, clues: [] })), flags: { ...c.flags, routeVisited: [], seenRewards: [], seenNpcs: [] }, npcs: {}, conditions: [], ending: null, receipts: [], world_nodes: [] }, 'system', 'Route reset. Character, class, inventory, and seed remain ready for a new run.');
}
function mergeServerCampaign(current, incoming) { return incoming && typeof incoming === 'object' ? normalize({ ...current, ...incoming, player: { ...current.player, ...(incoming.player || {}) } }) : current; }
function worldNodes(c) {
  const route = (c.flags?.routeVisited || []).map((id) => { const step = ROUTE_STEPS.find((s) => s.id === id); return step && { id: `route-${id}`, type: 'Route', title: step.title, detail: `Act ${step.act}. Skill ${step.skill} DC ${step.dc}. Reward: ${step.reward}.` }; }).filter(Boolean);
  const npc = Object.values(c.npcs || {}).map((n) => ({ id: `npc-${n.id}`, type: 'NPC', title: n.title, detail: `${n.role}. Trust ${n.trust || 1}. ${n.clue || ''}` }));
  const quest = (c.quests || []).filter((q) => q.clues?.length || q.status === 'complete').map((q) => ({ id: `quest-${q.id}`, type: 'Quest', title: q.title, detail: `${q.status}. ${q.progress}/${q.max_progress}. ${q.clues?.slice(-3).join(' · ') || 'No clues.'}` }));
  const raw = (c.world_nodes || []).map((n, i) => ({ id: `world-${i}`, type: 'World', title: typeof n === 'string' ? n : n.title || `World node ${i + 1}`, detail: typeof n === 'string' ? n : n.detail || JSON.stringify(n) }));
  return [...route, ...npc, ...quest, ...raw];
}

export default function AppV9() {
  const [campaign, setCampaign] = useState(loadCampaign);
  const [bridge, setBridge] = useState(loadBridge);
  const [setup, setSetup] = useState({ name: campaign.player.name, className: campaign.player.class_name });
  const [prompt, setPrompt] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const state = useMemo(() => adventureState(campaign), [campaign]);
  const nodes = useMemo(() => worldNodes(campaign), [campaign]);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;
  const routeVisited = campaign.flags?.routeVisited || [];
  const completedQuests = campaign.quests.filter((q) => q.status === 'complete');

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
        setCampaign(mergeServerCampaign(campaign, data.campaign || data));
        setBridge((b) => ({ ...b, status: `Backend used: ${path}`, lastSync: new Date().toLocaleString() }));
        return;
      } catch (err) {
        setBridge((b) => ({ ...b, status: `Backend fallback: ${err.message}` }));
      }
    }
    setCampaign(fallback(campaign));
  }
  function newCampaign() { setCampaign(defaultCampaign(setup.name || 'Mikey', setup.className, campaign.seed)); setSelectedNodeId(''); }
  function selectSeed(seed) { setCampaign((c) => addLog({ ...c, seed: Number(seed) || 369 }, 'system', `Seed set to ${Number(seed) || 369}.`)); }
  function submitPrompt(e) { e.preventDefault(); const text = prompt.trim(); if (!text) return; setCampaign((c) => addLog(addLog(c, 'player', text), 'dm', 'The hill listens. Use route, NPC, reward, camp, or finale to turn the intent into a receipt.')); setPrompt(''); }
  async function createServerCampaign() { try { const data = await api('/api/campaigns', { method: 'POST', body: { player_name: campaign.player.name } }); const id = data.id || data.campaign_id || data?.campaign?.id; setBridge((b) => ({ ...b, enabled: true, serverCampaignId: id || b.serverCampaignId, status: `Linked ${id || 'server campaign'}`, lastSync: new Date().toLocaleString() })); } catch (err) { setBridge((b) => ({ ...b, status: `Create failed: ${err.message}` })); } }
  async function loadFromServer() { if (!bridge.serverCampaignId) return; try { const data = await api(`/api/campaigns/${bridge.serverCampaignId}`); setCampaign(mergeServerCampaign(campaign, data.campaign || data)); setBridge((b) => ({ ...b, enabled: true, status: `Loaded ${bridge.serverCampaignId}`, lastSync: new Date().toLocaleString() })); } catch (err) { setBridge((b) => ({ ...b, status: `Load failed: ${err.message}` })); } }
  async function saveToServer() { if (!bridge.serverCampaignId) return; try { await api(`/api/campaigns/${bridge.serverCampaignId}/sync_from_client`, { method: 'POST', body: { campaign } }); setBridge((b) => ({ ...b, enabled: true, status: `Saved ${bridge.serverCampaignId}`, lastSync: new Date().toLocaleString() })); } catch (err) { setBridge((b) => ({ ...b, status: `Save failed: ${err.message}` })); } }
  const exportSave = () => { const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'porchquest369-save-v9.json'; a.click(); URL.revokeObjectURL(url); };
  const importSave = (event) => { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => setCampaign(normalize(JSON.parse(text)))); };

  return <div className="app-shell">
    <header className="hero">
      <div><p className="eyebrow">PorchQuest369 v0.7.2</p><h1>Lanterns Under<br />Blackwood Hill</h1><p className="subtitle">Replayable starter adventure with route reset, seed presets, world-node detail drawer, and backend reward parity.</p></div>
      <div className="hero-card ending-card"><span>Adventure State</span><strong>{state.label}</strong><p className="muted">{state.detail}</p><em>{campaign.receipts.length} receipts • {routeVisited.length}/{ROUTE_STEPS.length} route steps • seed {campaign.seed}</em></div>
    </header>
    <main className="grid">
      <section className="panel story">
        <h2>Story Log</h2>
        <div className="story-log">{campaign.story_log.map((m) => <article className={`message ${m.role}`} key={m.id}><span>{m.role} • {m.at}</span><p>{m.text}</p></article>)}</div>
        <form className="prompt-bar" onSubmit={submitPrompt}><input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What do you do?" /><button>Send</button></form>
        <div className="button-row wide"><button onClick={() => setCampaign((c) => resolveRoute(c, ROUTE_STEPS.find((s) => !routeVisited.includes(s.id)) || ROUTE_STEPS[ROUTE_STEPS.length - 1]))}>Advance Route</button><button onClick={() => setCampaign(meetNpcLocal)}>Meet NPC</button><button onClick={() => withBackend('/api/campaigns/:id/reward/draw', {}, drawRewardLocal)}>Reward</button><button onClick={() => withBackend('/api/campaigns/:id/camp', {}, campLocal)}>Camp</button><button onClick={() => withBackend('/api/campaigns/:id/finale', {}, finaleLocal)}>Finale</button><button className="ghost" onClick={() => { setCampaign(routeReset); setSelectedNodeId(''); }}>Reset Route</button></div>
        {completedQuests.length ? <div className="celebration-panel"><strong>Quest Complete</strong>{completedQuests.map((q) => <span key={q.id}>{q.title}</span>)}</div> : null}
        {campaign.ending ? <div className="ending-panel"><strong>{campaign.ending.title}</strong><p>{campaign.ending.status === 'complete' ? 'Full starter ending recorded.' : 'Partial ending recorded. You can still keep playing this save.'}</p></div> : null}
        <div className="node-drawer"><div><strong>{selectedNode ? selectedNode.title : 'World Nodes'}</strong><p>{selectedNode ? selectedNode.detail : 'Advance the route, meet NPCs, and complete quests to build the node map.'}</p></div><span>{selectedNode?.type || 'World'}</span></div>
      </section>
      <aside className="sidebar">
        <section className="panel"><h2>Route Tracker</h2><div className="route-track">{ROUTE_STEPS.map((step, index) => { const done = routeVisited.includes(step.id); const active = !done && routeVisited.length === index; return <button className={`route-step ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step.id} onClick={() => setSelectedNodeId(`route-${step.id}`)}><span>{step.act}</span><strong>{step.title}</strong><small>{done ? 'cleared' : active ? 'next' : 'locked'}</small></button>; })}</div></section>
        <section className="panel"><h2>World Nodes</h2><div className="node-list">{nodes.length ? nodes.map((node) => <button key={node.id} className={selectedNode?.id === node.id ? 'active' : ''} onClick={() => setSelectedNodeId(node.id)}><strong>{node.title}</strong><small>{node.type}</small></button>) : <p className="muted">No nodes yet.</p>}</div></section>
        <section className="panel"><h2>Character</h2><div className="stack"><label>Name<input value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} /></label><label>Class<select value={setup.className} onChange={(e) => setSetup({ ...setup, className: e.target.value })}>{Object.keys(CLASS_PRESETS).map((name) => <option key={name}>{name}</option>)}</select></label><label>Seed<select value={SEED_PRESETS.find((s) => s.value === campaign.seed)?.value || ''} onChange={(e) => selectSeed(Number(e.target.value || campaign.seed))}><option value="">Custom / current {campaign.seed}</option>{SEED_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><button className="ghost" onClick={newCampaign}>New Campaign</button></div><div className="stats-row"><div className="stat-pill"><span>HP</span><strong>{campaign.player.hp}/{campaign.player.hp_max}</strong></div><div className="stat-pill"><span>AC</span><strong>{campaign.player.ac}</strong></div><div className="stat-pill"><span>Class</span><strong>{campaign.player.class_name}</strong></div></div><div className="condition-grid">{campaign.conditions.length ? campaign.conditions.map((tag) => <button key={tag} className={`condition-chip ${CONDITION_META[tag]?.tone || ''}`} onClick={() => setCampaign((c) => removeConditions(c, [tag]))}><strong>{CONDITION_META[tag]?.label || tag}</strong><span>{CONDITION_META[tag]?.detail || 'Condition active.'}</span></button>) : <button className="condition-chip clear" disabled><strong>Clear</strong><span>No condition tags active.</span></button>}</div></section>
        <section className="panel"><h2>Backend Bridge</h2><div className="engine-status"><strong>{bridge.enabled ? 'Backend mode' : 'Browser mode'}</strong><span>{bridge.lastSync || 'local'}</span></div><div className="stack"><label>API base<input value={bridge.apiBase} onChange={(e) => setBridge({ ...bridge, apiBase: e.target.value })} /></label><label>Server campaign ID<input value={bridge.serverCampaignId} onChange={(e) => setBridge({ ...bridge, serverCampaignId: e.target.value })} /></label></div><div className="button-row"><button onClick={() => setBridge({ ...bridge, enabled: !bridge.enabled })}>{bridge.enabled ? 'Use Browser' : 'Use Backend'}</button><button onClick={createServerCampaign}>Create</button><button onClick={loadFromServer}>Load ID</button><button onClick={saveToServer}>Save</button></div><p className="test-result">{bridge.status}</p></section>
        <section className="panel"><h2>NPCs</h2><ul className="list npc-list">{Object.values(campaign.npcs).length ? Object.values(campaign.npcs).map((npc) => <li key={npc.id}><strong>{npc.title}</strong>{npc.role}<div className="trust-row"><span>Trust {npc.trust || 1}</span><button className="item-button" onClick={() => setCampaign((c) => askNpcLocal(c, npc.id))}>Ask</button></div></li>) : <li>No NPC cards met yet.</li>}</ul></section>
        <section className="panel"><h2>Quests</h2><ul className="list quests">{campaign.quests.map((q) => <li className={q.status === 'complete' ? 'quest-done' : ''} key={q.id}><strong>{q.status}</strong>{q.title}<div className="progress"><span style={{ width: `${Math.round(((q.progress || 0) / (q.max_progress || 1)) * 100)}%` }} /></div><small>{q.progress}/{q.max_progress} · {q.clues.slice(-2).join(' · ') || 'No clues yet'}</small></li>)}</ul></section>
        <section className="panel"><h2>Inventory</h2><ul className="list inventory-list">{campaign.player.inventory.map((item) => <li key={item}><span>{item}</span></li>)}</ul></section>
        <section className="panel"><h2>Receipts</h2><ul className="list receipt-list">{campaign.receipts.length ? campaign.receipts.map((r) => <li key={r}>{r}</li>) : <li>No receipts unlocked yet.</li>}</ul></section>
        <section className="panel"><h2>Save</h2><div className="button-row"><button onClick={exportSave}>Export</button><label className="file-button">Import<input type="file" accept="application/json" onChange={importSave} /></label></div><p className="muted">Browser save v9. Older saves migrate forward automatically.</p></section>
      </aside>
    </main>
  </div>;
}

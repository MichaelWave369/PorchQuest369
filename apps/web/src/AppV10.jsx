import React, { useEffect, useMemo, useState } from 'react';

const CAMPAIGN_KEY = 'porchquest369.browserCampaign.v10';
const PACK_KEY = 'porchquest369.routePack.v1';
const LEGACY_KEYS = [
  'porchquest369.browserCampaign.v9',
  'porchquest369.browserCampaign.v8',
  'porchquest369.browserCampaign.v7',
  'porchquest369.browserCampaign.v6',
  'porchquest369.browserCampaign.v5',
  'porchquest369.browserCampaign.v4',
  'porchquest369.browserCampaign.v3',
  'porchquest369.browserCampaign.v2',
  'porchquest369.browserCampaign.v1'
];

const DEFAULT_PACK = {
  schema: 'porchquest.route_pack.v1',
  id: 'blackwood-starter',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'A browser-safe starter route about clues, helpers, and a porch that remembers receipts.',
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key', max_progress: 5 },
    { id: 'q_side_1', title: 'Help the lantern-maker', max_progress: 4 },
    { id: 'q_mystery_1', title: 'Learn why the hill doors remember', max_progress: 4 }
  ],
  scenes: [
    { id: 'porch_threshold', act: 'I', title: 'Porch Threshold', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold clue', text: 'Rain taps the boards. A small route mark waits under the porch rail.' },
    { id: 'left_trail', act: 'I', title: 'Left Trail', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'trail clue', text: 'A soft path bends left toward a lantern shop sign.' },
    { id: 'name_gate', act: 'II', title: 'Name Gate', skill: 'persuasion', dc: 13, quest_id: 'q_mystery_1', reward: 'name clue', text: 'A quiet gate asks for a kind answer before it opens.' },
    { id: 'rain_library', act: 'II', title: 'Rain Library', skill: 'arcana', dc: 14, quest_id: 'q_mystery_1', reward: 'record clue', text: 'Shelves of wet paper keep a careful list of travelers.' },
    { id: 'candle_market', act: 'III', title: 'Candle Market', skill: 'perception', dc: 14, quest_id: 'q_main_1', reward: 'blue map', text: 'Blue light maps a safe way through the hill market.' }
  ],
  npcs: [
    { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' },
    { id: 'mara_lanternwright', title: 'Mara Lanternwright', role: 'Lantern-maker', quest_id: 'q_side_1', clue: 'Mara reads the helper sign.' },
    { id: 'nix_understep', title: 'Nix Understep', role: 'Hill-runner', quest_id: 'q_mystery_1', clue: 'Nix explains the memory-door rule.' }
  ],
  rewards: [
    { id: 'rest_token', title: 'Rest Token', text: 'Restore 1 HP and clear tired.', items: ['rest token'], hp: 1, clear: ['tired'] },
    { id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.' },
    { id: 'porch_coin', title: 'Porch Coin', text: 'Gain inspired.', items: ['porch coin'], add: ['inspired'] }
  ]
};

const CLASS_PRESETS = {
  'Lantern-Seeker': { hp: 12, hp_max: 12, skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['porch key ring', 'lantern stub', 'waterskin'] },
  'Porch Warden': { hp: 15, hp_max: 15, skills: { stealth: 0, perception: 2, persuasion: 1, arcana: 0, survival: 2 }, inventory: ['warden badge', 'lantern shield', 'field rope'] },
  'Hill Scout': { hp: 11, hp_max: 11, skills: { stealth: 3, perception: 2, persuasion: 0, arcana: 0, survival: 3 }, inventory: ['trail chalk', 'field kit'] },
  'Memory Bard': { hp: 10, hp_max: 10, skills: { stealth: 1, perception: 1, persuasion: 3, arcana: 1, survival: 0 }, inventory: ['story lute', 'silver quill', 'travel journal'] }
};

function stamp() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function log(role, text) { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, text, at: stamp() }; }
function uniq(list) { return Array.from(new Set((list || []).filter(Boolean))); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function nextSeed(seed) { return (Number(seed || 369) * 1664525 + 1013904223) % 4294967296; }
function slug(text, prefix) { return `${prefix}_${String(text || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'card'}`; }

function safeCard(card, fallback, kind) {
  const c = card && typeof card === 'object' ? card : {};
  return {
    ...fallback,
    ...c,
    id: String(c.id || fallback.id || slug(c.title, kind)).slice(0, 64),
    title: String(c.title || fallback.title || 'Untitled').slice(0, 80),
    text: String(c.text || fallback.text || '').slice(0, 280),
    role: String(c.role || fallback.role || '').slice(0, 80),
    clue: String(c.clue || fallback.clue || '').slice(0, 180),
    skill: String(c.skill || fallback.skill || 'perception').slice(0, 32),
    dc: clamp(Number(c.dc || fallback.dc || 12), 5, 30),
    max_progress: clamp(Number(c.max_progress || fallback.max_progress || 3), 1, 12),
    quest_id: String(c.quest_id || fallback.quest_id || '').slice(0, 64),
    reward: String(c.reward || fallback.reward || 'clue').slice(0, 80)
  };
}

function validatePack(raw) {
  const pack = raw && typeof raw === 'object' ? raw : DEFAULT_PACK;
  const quests = (Array.isArray(pack.quests) && pack.quests.length ? pack.quests : DEFAULT_PACK.quests).map((q, i) => safeCard(q, DEFAULT_PACK.quests[i] || { id: `q_${i + 1}`, title: 'Quest', max_progress: 3 }, 'q'));
  const scenes = (Array.isArray(pack.scenes) && pack.scenes.length ? pack.scenes : DEFAULT_PACK.scenes).map((s, i) => safeCard(s, DEFAULT_PACK.scenes[i] || { id: `scene_${i + 1}`, title: 'Scene', skill: 'perception', dc: 12 }, 'scene'));
  const npcs = (Array.isArray(pack.npcs) && pack.npcs.length ? pack.npcs : DEFAULT_PACK.npcs).map((n, i) => safeCard(n, DEFAULT_PACK.npcs[i] || { id: `npc_${i + 1}`, title: 'NPC', role: 'Helper' }, 'npc'));
  const rewards = (Array.isArray(pack.rewards) && pack.rewards.length ? pack.rewards : DEFAULT_PACK.rewards).map((r, i) => ({ ...DEFAULT_PACK.rewards[i % DEFAULT_PACK.rewards.length], ...r, id: String(r.id || `reward_${i + 1}`).slice(0, 64), title: String(r.title || 'Reward').slice(0, 80), text: String(r.text || '').slice(0, 180), items: Array.isArray(r.items) ? r.items.map(String).slice(0, 4) : [] }));
  return { schema: 'porchquest.route_pack.v1', id: String(pack.id || 'custom-pack').slice(0, 64), title: String(pack.title || 'Custom Route Pack').slice(0, 100), summary: String(pack.summary || '').slice(0, 280), quests, scenes, npcs, rewards };
}

function loadPack() {
  try { return validatePack(JSON.parse(localStorage.getItem(PACK_KEY))); } catch { return DEFAULT_PACK; }
}
function questState(pack) {
  return pack.quests.map((q) => ({ id: q.id, title: q.title, status: 'active', progress: 0, max_progress: q.max_progress || 3, clues: [] }));
}
function defaultCampaign(pack, playerName = 'Mikey', className = 'Lantern-Seeker') {
  const preset = CLASS_PRESETS[className] || CLASS_PRESETS['Lantern-Seeker'];
  return normalizeCampaign({ id: 'browser-studio-run', version: 10, name: pack.title, player: { name: playerName, class_name: className, ...preset }, quests: questState(pack), routePackId: pack.id, story_log: [log('dm', `${pack.title} is ready. Play it, edit it, or export it.`)] }, pack);
}
function normalizeCampaign(raw, pack) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const p = c.player && typeof c.player === 'object' ? c.player : {};
  const preset = CLASS_PRESETS[p.class_name] || CLASS_PRESETS['Lantern-Seeker'];
  return {
    id: c.id || 'browser-studio-run',
    version: 10,
    name: c.name || pack.title,
    routePackId: c.routePackId || pack.id,
    player: { name: p.name || 'Mikey', class_name: p.class_name || 'Lantern-Seeker', hp: Number.isFinite(p.hp) ? p.hp : preset.hp, hp_max: Number.isFinite(p.hp_max) ? p.hp_max : preset.hp_max, skills: p.skills || preset.skills, inventory: uniq(p.inventory || preset.inventory) },
    quests: (Array.isArray(c.quests) && c.quests.length ? c.quests : questState(pack)).map((q, i) => ({ ...questState(pack)[i], ...q, clues: uniq(q.clues || []) })),
    flags: { routeVisited: uniq(c.flags?.routeVisited || []), seenNpcs: uniq(c.flags?.seenNpcs || []), seenRewards: uniq(c.flags?.seenRewards || []) },
    npcs: c.npcs && typeof c.npcs === 'object' ? c.npcs : {},
    conditions: uniq(c.conditions || []),
    world_nodes: Array.isArray(c.world_nodes) ? c.world_nodes : [],
    receipts: uniq(c.receipts || []),
    ending: c.ending || null,
    seed: Number.isFinite(c.seed) ? c.seed : 369,
    story_log: Array.isArray(c.story_log) && c.story_log.length ? c.story_log : [log('dm', 'Campaign Studio route loaded.')]
  };
}
function loadCampaign(pack) {
  for (const key of [CAMPAIGN_KEY, ...LEGACY_KEYS]) {
    try { const raw = localStorage.getItem(key); if (raw) return normalizeCampaign(JSON.parse(raw), pack); } catch { /* keep trying */ }
  }
  return defaultCampaign(pack);
}
function addLog(c, role, text) { return { ...c, story_log: [...(c.story_log || []), log(role, text)].slice(-140) }; }
function updateQuest(c, questId, clue, amount = 1) {
  let completed = '';
  const quests = (c.quests || []).map((q) => {
    if (q.id !== questId) return q;
    const progress = clamp((q.progress || 0) + amount, 0, q.max_progress || 1);
    const isComplete = progress >= (q.max_progress || 1);
    if (isComplete && q.status !== 'complete') completed = q.title;
    return { ...q, progress, status: isComplete ? 'complete' : q.status, clues: uniq([...(q.clues || []), clue]) };
  });
  let next = { ...c, quests };
  if (completed) next = addLog({ ...next, receipts: uniq([...(next.receipts || []), `quest-${questId}`]) }, 'system', `Quest complete: ${completed}`);
  return next;
}
function roll(c, card) {
  const seed = nextSeed(c.seed);
  const raw = (seed % 20) + 1;
  const mod = Number(c.player.skills?.[card.skill] || 0) + ((c.conditions || []).includes('inspired') ? 1 : 0);
  const total = raw + mod;
  return { seed, raw, total, success: raw === 20 || total >= (card.dc || 12) };
}
function resolveScene(c, card) {
  const check = roll(c, card);
  let next = { ...c, seed: check.seed, flags: { ...c.flags, routeVisited: uniq([...(c.flags?.routeVisited || []), card.id]) } };
  if (check.success) {
    next = { ...next, player: { ...next.player, inventory: uniq([...(next.player.inventory || []), card.reward]) }, world_nodes: uniq([...(next.world_nodes || []), `${card.title}: ${card.text || card.reward}`]), receipts: uniq([...(next.receipts || []), `scene-${card.id}`]) };
    next = updateQuest(next, card.quest_id, `${card.title}: ${card.reward}`, 1);
    return addLog(next, 'dm', `${card.title}: success ${check.total}/${card.dc}. Reward: ${card.reward}.`);
  }
  next = { ...next, conditions: uniq([...(next.conditions || []), 'watched']) };
  return addLog(next, 'dm', `${card.title}: check ${check.total}/${card.dc}. You continue, but gain watched.`);
}
function meetNpc(c, npc) {
  let next = updateQuest(c, npc.quest_id, npc.clue, 1);
  next = { ...next, npcs: { ...next.npcs, [npc.id]: { ...npc, trust: Number(next.npcs?.[npc.id]?.trust || 0) + 1 } }, flags: { ...next.flags, seenNpcs: uniq([...(next.flags?.seenNpcs || []), npc.id]) }, conditions: uniq([...(next.conditions || []), 'inspired']), receipts: uniq([...(next.receipts || []), `npc-${npc.id}`]) };
  return addLog(next, 'dm', `${npc.title} helps: ${npc.clue}`);
}
function drawReward(c, pack) {
  const seed = nextSeed(c.seed);
  const list = pack.rewards || DEFAULT_PACK.rewards;
  const card = list[seed % list.length];
  let next = { ...c, seed, flags: { ...c.flags, seenRewards: uniq([...(c.flags?.seenRewards || []), card.id]) }, player: { ...c.player, inventory: uniq([...(c.player.inventory || []), ...(card.items || [])]) }, receipts: uniq([...(c.receipts || []), `reward-${card.id}`]) };
  if (card.hp) next = { ...next, player: { ...next.player, hp: clamp((next.player.hp || 0) + Number(card.hp), 0, next.player.hp_max || 1) } };
  if (card.add) next = { ...next, conditions: uniq([...(next.conditions || []), ...card.add]) };
  if (card.clear) next = { ...next, conditions: (next.conditions || []).filter((x) => !card.clear.includes(x)) };
  if (card.quest_id) next = updateQuest(next, card.quest_id, card.clue || card.title, 1);
  return addLog(next, 'dm', `Reward: ${card.title}. ${card.text || ''}`);
}
function finale(c) {
  const complete = (c.quests || []).every((q) => q.status === 'complete');
  return addLog({ ...c, ending: { status: complete ? 'complete' : 'partial', title: complete ? 'Starter route complete' : 'Partial route ending', recorded_at: new Date().toISOString() }, receipts: uniq([...(c.receipts || []), 'starter-ending']) }, 'dm', complete ? 'Starter route complete. Export the pack or replay it with edits.' : 'Partial ending recorded. You can keep playing or edit the route pack.');
}

function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AppV10() {
  const [pack, setPack] = useState(loadPack);
  const [campaign, setCampaign] = useState(() => loadCampaign(loadPack()));
  const [setup, setSetup] = useState({ name: campaign.player.name, className: campaign.player.class_name });
  const [studioTab, setStudioTab] = useState('scenes');
  const [selectedSceneId, setSelectedSceneId] = useState(pack.scenes[0]?.id || '');
  const [selectedNpcId, setSelectedNpcId] = useState(pack.npcs[0]?.id || '');
  const [importText, setImportText] = useState('');
  const scene = pack.scenes.find((s) => s.id === selectedSceneId) || pack.scenes[0];
  const npc = pack.npcs.find((n) => n.id === selectedNpcId) || pack.npcs[0];
  const completeCount = campaign.quests.filter((q) => q.status === 'complete').length;

  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); }, [pack]);
  useEffect(() => { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign)); }, [campaign]);

  function replacePack(nextPack) {
    const clean = validatePack(nextPack);
    setPack(clean);
    setSelectedSceneId(clean.scenes[0]?.id || '');
    setSelectedNpcId(clean.npcs[0]?.id || '');
    setCampaign((c) => normalizeCampaign({ ...c, name: clean.title, routePackId: clean.id, quests: questState(clean) }, clean));
  }
  function editCard(kind, id, patch) {
    setPack((p) => validatePack({ ...p, [kind]: p[kind].map((card) => card.id === id ? { ...card, ...patch } : card) }));
  }
  function addCard(kind) {
    const isScene = kind === 'scenes';
    const card = isScene ? { id: slug(`scene ${pack.scenes.length + 1}`, 'scene'), act: 'I', title: 'New Scene', skill: 'perception', dc: 12, quest_id: pack.quests[0]?.id, reward: 'new clue', text: 'Describe the scene here.' } : { id: slug(`npc ${pack.npcs.length + 1}`, 'npc'), title: 'New NPC', role: 'Helper', quest_id: pack.quests[0]?.id, clue: 'Add the clue here.' };
    setPack((p) => validatePack({ ...p, [kind]: [...p[kind], card] }));
    if (isScene) setSelectedSceneId(card.id); else setSelectedNpcId(card.id);
  }
  function importPack() {
    try { replacePack(JSON.parse(importText)); setImportText(''); } catch { setCampaign((c) => addLog(c, 'system', 'Import failed. Paste valid route-pack JSON.')); }
  }

  return (
    <main className="app v10-shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">PorchQuest369 v0.8</p>
          <h1>Campaign Studio</h1>
          <p>{pack.summary}</p>
        </div>
        <div className="hero-actions">
          <button onClick={() => setCampaign(defaultCampaign(pack, setup.name, setup.className))}>New run</button>
          <button onClick={() => downloadJson(`${pack.id || 'route-pack'}.json`, pack)}>Export route pack</button>
          <button onClick={() => downloadJson(`${campaign.id || 'campaign-save'}.json`, campaign)}>Export save</button>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Player</h2>
          <input value={setup.name} onChange={(e) => setSetup({ ...setup, name: e.target.value })} placeholder="Player name" />
          <select value={setup.className} onChange={(e) => setSetup({ ...setup, className: e.target.value })}>{Object.keys(CLASS_PRESETS).map((x) => <option key={x}>{x}</option>)}</select>
          <button onClick={() => setCampaign(defaultCampaign(pack, setup.name, setup.className))}>Apply setup</button>
          <p>HP {campaign.player.hp}/{campaign.player.hp_max}</p>
          <p>Inventory: {(campaign.player.inventory || []).join(', ') || 'empty'}</p>
          <p>Conditions: {(campaign.conditions || []).join(', ') || 'clear'}</p>
        </div>
        <div className="card route-panel">
          <h2>Route tracker</h2>
          {pack.scenes.map((s) => <button key={s.id} className={(campaign.flags?.routeVisited || []).includes(s.id) ? 'route-chip done' : 'route-chip'} onClick={() => { setSelectedSceneId(s.id); setStudioTab('scenes'); }}>{s.act || 'I'} · {s.title}</button>)}
          <button onClick={() => setCampaign((c) => ({ ...defaultCampaign(pack, c.player.name, c.player.class_name), seed: c.seed }))}>Reset route</button>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Playtest</h2>
          <div className="button-row">
            <button disabled={!scene} onClick={() => setCampaign((c) => resolveScene(c, scene))}>Resolve selected scene</button>
            <button disabled={!npc} onClick={() => setCampaign((c) => meetNpc(c, npc))}>Ask selected NPC</button>
            <button onClick={() => setCampaign((c) => drawReward(c, pack))}>Draw reward</button>
            <button onClick={() => setCampaign((c) => finale(c))}>Record ending</button>
          </div>
          <p>{completeCount}/{campaign.quests.length} quests complete</p>
          {campaign.ending && <div className="ending-card"><strong>{campaign.ending.title}</strong><br />{campaign.ending.status}</div>}
          <div className="quest-list">{campaign.quests.map((q) => <div key={q.id}><strong>{q.title}</strong><progress max={q.max_progress} value={q.progress} /> <span>{q.progress}/{q.max_progress}</span></div>)}</div>
        </div>
        <div className="card log-card">
          <h2>Story log</h2>
          {[...(campaign.story_log || [])].slice(-12).reverse().map((entry) => <p key={entry.id}><strong>{entry.role}</strong>: {entry.text}</p>)}
        </div>
      </section>

      <section className="card studio-card">
        <div className="studio-head">
          <div><p className="eyebrow">Contributor-safe JSON</p><h2>Route Pack Studio</h2></div>
          <div className="button-row"><button onClick={() => setStudioTab('scenes')}>Scenes</button><button onClick={() => setStudioTab('npcs')}>NPCs</button><button onClick={() => setStudioTab('json')}>Import</button></div>
        </div>
        {studioTab === 'scenes' && scene && <div className="editor-grid">
          <aside>{pack.scenes.map((s) => <button key={s.id} className={s.id === scene.id ? 'selected' : ''} onClick={() => setSelectedSceneId(s.id)}>{s.title}</button>)}<button onClick={() => addCard('scenes')}>Add scene</button></aside>
          <div className="editor-fields">
            <input value={scene.title} onChange={(e) => editCard('scenes', scene.id, { title: e.target.value })} />
            <textarea value={scene.text} onChange={(e) => editCard('scenes', scene.id, { text: e.target.value })} />
            <input value={scene.reward} onChange={(e) => editCard('scenes', scene.id, { reward: e.target.value })} />
            <select value={scene.quest_id} onChange={(e) => editCard('scenes', scene.id, { quest_id: e.target.value })}>{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
            <input value={scene.skill} onChange={(e) => editCard('scenes', scene.id, { skill: e.target.value })} />
            <input type="number" value={scene.dc} onChange={(e) => editCard('scenes', scene.id, { dc: Number(e.target.value) })} />
          </div>
        </div>}
        {studioTab === 'npcs' && npc && <div className="editor-grid">
          <aside>{pack.npcs.map((n) => <button key={n.id} className={n.id === npc.id ? 'selected' : ''} onClick={() => setSelectedNpcId(n.id)}>{n.title}</button>)}<button onClick={() => addCard('npcs')}>Add NPC</button></aside>
          <div className="editor-fields">
            <input value={npc.title} onChange={(e) => editCard('npcs', npc.id, { title: e.target.value })} />
            <input value={npc.role} onChange={(e) => editCard('npcs', npc.id, { role: e.target.value })} />
            <textarea value={npc.clue} onChange={(e) => editCard('npcs', npc.id, { clue: e.target.value })} />
            <select value={npc.quest_id} onChange={(e) => editCard('npcs', npc.id, { quest_id: e.target.value })}>{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
          </div>
        </div>}
        {studioTab === 'json' && <div className="editor-fields">
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste route-pack JSON here" />
          <button onClick={importPack}>Import route pack</button>
          <pre>{JSON.stringify(pack, null, 2)}</pre>
        </div>}
      </section>
    </main>
  );
}

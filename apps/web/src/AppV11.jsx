import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v3';
const CONDITION_TAGS = ['watched', 'tired', 'inspired', 'marked', 'hidden'];

const STARTER_PACK = {
  schema: 'porchquest.route_pack.v1',
  id: 'blackwood-starter',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'A starter route pack for Campaign Studio.',
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key', max_progress: 5 },
    { id: 'q_side_1', title: 'Help the lantern-maker', max_progress: 4 },
    { id: 'q_mystery_1', title: 'Learn why the hill doors remember', max_progress: 4 }
  ],
  scenes: [
    { id: 'porch_threshold', act: 'I', title: 'Porch Threshold', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold clue', text: 'A route mark waits under the porch rail.' },
    { id: 'left_trail', act: 'I', title: 'Left Trail', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'trail clue', text: 'A soft path bends toward a small helper sign.' }
  ],
  npcs: [
    { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' },
    { id: 'mara_lanternwright', title: 'Mara Lanternwright', role: 'Lantern-maker', quest_id: 'q_side_1', clue: 'Mara reads the helper sign.' }
  ],
  rewards: [
    { id: 'rest_token', title: 'Rest Token', text: 'Restore 1 HP and clear tired.', items: ['rest token'], hp: 1, quest_id: '', clue: '', add: [], clear: ['tired'] },
    { id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], hp: 0, quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.', add: [], clear: [] }
  ]
};

function text(value, limit) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function list(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function uniq(items) { return Array.from(new Set((items || []).filter(Boolean).map(String))); }
function slug(value, prefix) { return `${prefix}_${text(value, 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'card'}`; }

function cleanPack(raw) {
  const source = raw && typeof raw === 'object' ? raw : STARTER_PACK;
  const issues = [];
  const quests = (Array.isArray(source.quests) && source.quests.length ? source.quests : STARTER_PACK.quests).slice(0, 12).map((q, index) => ({
    id: text(q.id || slug(q.title, 'q') || `q_${index + 1}`, 64),
    title: text(q.title || 'Quest', 80),
    max_progress: clamp(q.max_progress || 3, 1, 12)
  }));
  const questIds = new Set(quests.map((q) => q.id));
  const fallbackQuest = quests[0]?.id || '';
  const rewards = (Array.isArray(source.rewards) && source.rewards.length ? source.rewards : STARTER_PACK.rewards).slice(0, 24).map((r, index) => ({
    id: text(r.id || slug(r.title, 'reward') || `reward_${index + 1}`, 64),
    title: text(r.title || 'Reward', 80),
    text: text(r.text || '', 180),
    items: uniq(Array.isArray(r.items) ? r.items : []).slice(0, 4),
    hp: clamp(r.hp || 0, -10, 10),
    quest_id: r.quest_id && questIds.has(r.quest_id) ? r.quest_id : '',
    clue: text(r.clue || '', 140),
    add: uniq(r.add || []).filter((tag) => CONDITION_TAGS.includes(tag)),
    clear: uniq(r.clear || []).filter((tag) => CONDITION_TAGS.includes(tag))
  }));
  const scenes = (Array.isArray(source.scenes) && source.scenes.length ? source.scenes : STARTER_PACK.scenes).slice(0, 24).map((s, index) => {
    if (s.quest_id && !questIds.has(s.quest_id)) issues.push(`Scene ${s.title || index + 1} used an unknown quest id.`);
    return { id: text(s.id || slug(s.title, 'scene') || `scene_${index + 1}`, 64), act: text(s.act || 'I', 12), title: text(s.title || 'Scene', 80), skill: text(s.skill || 'perception', 32), dc: clamp(s.dc || 12, 5, 30), quest_id: questIds.has(s.quest_id) ? s.quest_id : fallbackQuest, reward: text(s.reward || 'clue', 80), text: text(s.text || '', 280) };
  });
  const npcs = (Array.isArray(source.npcs) && source.npcs.length ? source.npcs : STARTER_PACK.npcs).slice(0, 24).map((n, index) => ({
    id: text(n.id || slug(n.title, 'npc') || `npc_${index + 1}`, 64),
    title: text(n.title || 'Helper', 80),
    role: text(n.role || 'Guide', 80),
    quest_id: questIds.has(n.quest_id) ? n.quest_id : fallbackQuest,
    clue: text(n.clue || '', 180)
  }));
  return { pack: { schema: 'porchquest.route_pack.v1', id: text(source.id || 'custom-pack', 64), title: text(source.title || 'Custom Route Pack', 100), summary: text(source.summary || '', 280), quests, scenes, npcs, rewards }, issues: uniq(issues) };
}

function loadPack() {
  try { return cleanPack(JSON.parse(localStorage.getItem(PACK_KEY))).pack; } catch { return STARTER_PACK; }
}
function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AppV11() {
  const [pack, setPack] = useState(loadPack);
  const [importText, setImportText] = useState('');
  const result = useMemo(() => cleanPack(pack), [pack]);
  useEffect(() => localStorage.setItem(PACK_KEY, JSON.stringify(pack)), [pack]);

  function patch(kind, index, key, value) {
    setPack((old) => ({ ...old, [kind]: old[kind].map((card, i) => (i === index ? { ...card, [key]: value } : card)) }));
  }
  function add(kind) {
    const questId = pack.quests[0]?.id || '';
    const next = {
      quests: { id: `q_${pack.quests.length + 1}`, title: 'New quest', max_progress: 3 },
      rewards: { id: `reward_${pack.rewards.length + 1}`, title: 'New reward', text: 'Describe a small reward.', items: [], hp: 0, quest_id: '', clue: '', add: [], clear: [] },
      scenes: { id: `scene_${pack.scenes.length + 1}`, act: 'I', title: 'New scene', skill: 'perception', dc: 12, quest_id: questId, reward: 'clue', text: 'Describe a safe scene.' },
      npcs: { id: `npc_${pack.npcs.length + 1}`, title: 'New helper', role: 'Guide', quest_id: questId, clue: 'Offer a useful clue.' }
    }[kind];
    setPack((old) => ({ ...old, [kind]: [...old[kind], next] }));
  }
  function remove(kind, index) { setPack((old) => ({ ...old, [kind]: old[kind].filter((_, i) => i !== index) })); }
  function importPack() {
    try { setPack(cleanPack(JSON.parse(importText)).pack); setImportText(''); }
    catch { setImportText('JSON parse failed. Paste a route pack and try again.'); }
  }

  return (
    <div className="app studio-v11">
      <header className="hero">
        <p className="eyebrow">PorchQuest369 v0.8 hardening</p>
        <h1>Campaign Studio</h1>
        <p className="subtle">Quest editor, reward editor, route-pack validation, and export/import for contributor-safe content packs.</p>
      </header>

      <section className="panel studio-grid">
        <div>
          <h2>Pack Identity</h2>
          <label>Pack ID<input value={pack.id} onChange={(e) => setPack({ ...pack, id: text(e.target.value, 64) })} /></label>
          <label>Title<input value={pack.title} onChange={(e) => setPack({ ...pack, title: text(e.target.value, 100) })} /></label>
          <label>Summary<textarea value={pack.summary} onChange={(e) => setPack({ ...pack, summary: text(e.target.value, 280) })} /></label>
        </div>
        <div>
          <h2>Validation</h2>
          <p>{result.issues.length ? `${result.issues.length} warning(s)` : 'Pack passes browser checks.'}</p>
          <ul>{result.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          <div className="button-row">
            <button onClick={() => setPack(result.pack)}>Normalize</button>
            <button onClick={() => downloadJson(`${result.pack.id}.route-pack.json`, result.pack)}>Export Pack</button>
            <button onClick={() => setPack(STARTER_PACK)}>Load Starter</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Quest Editor</h2>
        <div className="editor-list">
          {pack.quests.map((q, i) => (
            <article className="edit-card" key={`${q.id}-${i}`}>
              <label>ID<input value={q.id} onChange={(e) => patch('quests', i, 'id', text(e.target.value, 64))} /></label>
              <label>Title<input value={q.title} onChange={(e) => patch('quests', i, 'title', text(e.target.value, 80))} /></label>
              <label>Max<input type="number" value={q.max_progress} onChange={(e) => patch('quests', i, 'max_progress', clamp(e.target.value, 1, 12))} /></label>
              <button onClick={() => remove('quests', i)}>Remove</button>
            </article>
          ))}
        </div>
        <button onClick={() => add('quests')}>Add Quest</button>
      </section>

      <section className="panel">
        <h2>Reward Editor</h2>
        <div className="editor-list">
          {pack.rewards.map((r, i) => (
            <article className="edit-card" key={`${r.id}-${i}`}>
              <label>ID<input value={r.id} onChange={(e) => patch('rewards', i, 'id', text(e.target.value, 64))} /></label>
              <label>Title<input value={r.title} onChange={(e) => patch('rewards', i, 'title', text(e.target.value, 80))} /></label>
              <label>Text<textarea value={r.text} onChange={(e) => patch('rewards', i, 'text', text(e.target.value, 180))} /></label>
              <label>Items<input value={(r.items || []).join(', ')} onChange={(e) => patch('rewards', i, 'items', list(e.target.value))} /></label>
              <label>HP<input type="number" value={r.hp || 0} onChange={(e) => patch('rewards', i, 'hp', clamp(e.target.value, -10, 10))} /></label>
              <label>Quest<select value={r.quest_id || ''} onChange={(e) => patch('rewards', i, 'quest_id', e.target.value)}><option value="">No quest</option>{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
              <label>Clue<input value={r.clue || ''} onChange={(e) => patch('rewards', i, 'clue', text(e.target.value, 140))} /></label>
              <label>Add<input value={(r.add || []).join(', ')} onChange={(e) => patch('rewards', i, 'add', list(e.target.value).filter((tag) => CONDITION_TAGS.includes(tag)))} /></label>
              <label>Clear<input value={(r.clear || []).join(', ')} onChange={(e) => patch('rewards', i, 'clear', list(e.target.value).filter((tag) => CONDITION_TAGS.includes(tag)))} /></label>
              <button onClick={() => remove('rewards', i)}>Remove</button>
            </article>
          ))}
        </div>
        <button onClick={() => add('rewards')}>Add Reward</button>
      </section>

      <section className="panel">
        <h2>Scene and NPC Counts</h2>
        <p>{pack.scenes.length} scenes and {pack.npcs.length} NPC helpers are included. Use JSON import/export for deeper scene/NPC editing in this hardening pass.</p>
        <div className="button-row"><button onClick={() => add('scenes')}>Add Scene Stub</button><button onClick={() => add('npcs')}>Add NPC Stub</button></div>
      </section>

      <section className="panel studio-grid">
        <div>
          <h2>Import JSON</h2>
          <textarea className="json-box" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste route-pack JSON here" />
          <button onClick={importPack}>Import Pack</button>
        </div>
        <div>
          <h2>Current Pack JSON</h2>
          <pre className="json-preview">{JSON.stringify(result.pack, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}

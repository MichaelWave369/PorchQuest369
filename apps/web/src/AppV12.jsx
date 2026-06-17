import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v4';
const TAGS = ['watched', 'tired', 'inspired', 'marked', 'hidden'];
const SKILLS = ['perception', 'survival', 'insight', 'history', 'persuasion', 'stealth', 'arcana'];

const STARTER = {
  schema: 'porchquest.route_pack.v1',
  id: 'blackwood-starter',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'A contributor-safe starter route pack for Campaign Studio.',
  quests: [
    { id: 'q_main_1', title: 'Find the porch key', max_progress: 5 },
    { id: 'q_side_1', title: 'Help the lantern-maker', max_progress: 4 },
    { id: 'q_mystery_1', title: 'Learn why the hill remembers', max_progress: 4 }
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

function safeText(value, limit) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function list(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function uniq(items) { return Array.from(new Set((items || []).filter(Boolean).map(String))); }
function slug(value, prefix) {
  const body = safeText(value, 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'card';
  return `${prefix}_${body}`;
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

function validatePack(raw) {
  const source = raw && typeof raw === 'object' ? raw : STARTER;
  const warnings = [];
  const errors = [];
  const quests = (Array.isArray(source.quests) && source.quests.length ? source.quests : STARTER.quests).slice(0, 12).map((q, index) => ({
    id: safeText(q.id || slug(q.title, 'q') || `q_${index + 1}`, 64),
    title: safeText(q.title || 'Quest', 80),
    max_progress: clamp(q.max_progress || 3, 1, 12)
  }));
  const questIds = new Set(quests.map((q) => q.id));
  if (questIds.size !== quests.length) errors.push('Quest IDs should be unique.');
  const firstQuest = quests[0]?.id || '';

  const scenes = (Array.isArray(source.scenes) && source.scenes.length ? source.scenes : STARTER.scenes).slice(0, 24).map((s, index) => {
    if (s.quest_id && !questIds.has(s.quest_id)) warnings.push(`Scene ${s.title || index + 1} referenced an unknown quest.`);
    return {
      id: safeText(s.id || slug(s.title, 'scene') || `scene_${index + 1}`, 64),
      act: safeText(s.act || 'I', 12),
      title: safeText(s.title || 'Scene', 80),
      skill: safeText(s.skill || 'perception', 32),
      dc: clamp(s.dc || 12, 5, 30),
      quest_id: questIds.has(s.quest_id) ? s.quest_id : firstQuest,
      reward: safeText(s.reward || 'clue', 80),
      text: safeText(s.text || '', 280)
    };
  });

  const npcs = (Array.isArray(source.npcs) && source.npcs.length ? source.npcs : STARTER.npcs).slice(0, 24).map((n, index) => {
    if (n.quest_id && !questIds.has(n.quest_id)) warnings.push(`NPC ${n.title || index + 1} referenced an unknown quest.`);
    return {
      id: safeText(n.id || slug(n.title, 'npc') || `npc_${index + 1}`, 64),
      title: safeText(n.title || 'Helper', 80),
      role: safeText(n.role || 'Guide', 80),
      quest_id: questIds.has(n.quest_id) ? n.quest_id : firstQuest,
      clue: safeText(n.clue || '', 180)
    };
  });

  const rewards = (Array.isArray(source.rewards) && source.rewards.length ? source.rewards : STARTER.rewards).slice(0, 24).map((r, index) => {
    if (r.quest_id && !questIds.has(r.quest_id)) warnings.push(`Reward ${r.title || index + 1} referenced an unknown quest.`);
    return {
      id: safeText(r.id || slug(r.title, 'reward') || `reward_${index + 1}`, 64),
      title: safeText(r.title || 'Reward', 80),
      text: safeText(r.text || '', 180),
      items: uniq(Array.isArray(r.items) ? r.items : list(r.items)).slice(0, 4),
      hp: clamp(r.hp || 0, -10, 10),
      quest_id: questIds.has(r.quest_id) ? r.quest_id : '',
      clue: safeText(r.clue || '', 140),
      add: uniq(r.add || []).filter((tag) => TAGS.includes(tag)),
      clear: uniq(r.clear || []).filter((tag) => TAGS.includes(tag))
    };
  });

  const clean = {
    schema: 'porchquest.route_pack.v1',
    id: safeText(source.id || 'custom-pack', 64),
    title: safeText(source.title || 'Custom Route Pack', 100),
    summary: safeText(source.summary || '', 280),
    quests,
    scenes,
    npcs,
    rewards
  };
  const score = errors.length ? 'error' : warnings.length ? 'warning' : 'pass';
  return { pack: clean, warnings: uniq(warnings), errors: uniq(errors), score };
}

function loadPack() {
  try {
    const legacy = localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v3');
    return validatePack(JSON.parse(legacy)).pack;
  } catch {
    return STARTER;
  }
}

function Field({ label, children }) {
  return <label className="studio-field"><span>{label}</span>{children}</label>;
}

export default function AppV12() {
  const [pack, setPack] = useState(loadPack);
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState('quests');
  const result = useMemo(() => validatePack(pack), [pack]);
  useEffect(() => localStorage.setItem(PACK_KEY, JSON.stringify(pack)), [pack]);

  function patch(kind, index, key, value) {
    setPack((old) => ({ ...old, [kind]: old[kind].map((card, i) => (i === index ? { ...card, [key]: value } : card)) }));
  }
  function add(kind) {
    const questId = pack.quests[0]?.id || '';
    const next = {
      quests: { id: `q_${pack.quests.length + 1}`, title: 'New quest', max_progress: 3 },
      scenes: { id: `scene_${pack.scenes.length + 1}`, act: 'I', title: 'New scene', skill: 'perception', dc: 12, quest_id: questId, reward: 'clue', text: 'Describe a safe scene.' },
      npcs: { id: `npc_${pack.npcs.length + 1}`, title: 'New helper', role: 'Guide', quest_id: questId, clue: 'Offer a useful clue.' },
      rewards: { id: `reward_${pack.rewards.length + 1}`, title: 'New reward', text: 'Describe a small reward.', items: [], hp: 0, quest_id: '', clue: '', add: [], clear: [] }
    }[kind];
    setPack((old) => ({ ...old, [kind]: [...old[kind], next] }));
  }
  function remove(kind, index) { setPack((old) => ({ ...old, [kind]: old[kind].filter((_, i) => i !== index) })); }
  function importPack() {
    try { setPack(validatePack(JSON.parse(importText)).pack); setImportText(''); }
    catch { setImportText('JSON parse failed. Paste a route pack and try again.'); }
  }
  function questOptions(includeBlank = false) {
    return <>{includeBlank && <option value="">No quest</option>}{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</>;
  }

  return (
    <div className="app studio-v12">
      <header className="hero">
        <p className="eyebrow">PorchQuest369 v0.8.1</p>
        <h1>Campaign Studio</h1>
        <p className="subtle">Full scene, NPC, quest, and reward editors with validation badges and contributor-safe route-pack JSON.</p>
      </header>

      <section className="panel studio-grid">
        <div>
          <h2>Pack Identity</h2>
          <Field label="Pack ID"><input value={pack.id} onChange={(e) => setPack({ ...pack, id: safeText(e.target.value, 64) })} /></Field>
          <Field label="Title"><input value={pack.title} onChange={(e) => setPack({ ...pack, title: safeText(e.target.value, 100) })} /></Field>
          <Field label="Summary"><textarea value={pack.summary} onChange={(e) => setPack({ ...pack, summary: safeText(e.target.value, 280) })} /></Field>
        </div>
        <div>
          <h2>Validation</h2>
          <div className="badge-row">
            <span className={`badge ${result.score}`}>{result.score.toUpperCase()}</span>
            <span className="badge">{pack.quests.length} quests</span>
            <span className="badge">{pack.scenes.length} scenes</span>
            <span className="badge">{pack.npcs.length} NPCs</span>
            <span className="badge">{pack.rewards.length} rewards</span>
          </div>
          <ul className="issue-list">
            {result.errors.map((issue) => <li className="error" key={issue}>{issue}</li>)}
            {result.warnings.map((issue) => <li className="warning" key={issue}>{issue}</li>)}
            {!result.errors.length && !result.warnings.length && <li>Pack passes browser checks.</li>}
          </ul>
          <div className="button-row">
            <button onClick={() => setPack(result.pack)}>Normalize</button>
            <button onClick={() => downloadJson(`${result.pack.id}.route-pack.json`, result.pack)}>Export Pack</button>
            <button onClick={() => setPack(STARTER)}>Load Starter</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="tabs">
          {['quests', 'scenes', 'npcs', 'rewards', 'json'].map((tab) => <button className={activeTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </div>
      </section>

      {activeTab === 'quests' && <section className="panel"><h2>Quest Editor</h2><div className="editor-list">{pack.quests.map((q, i) => <article className="edit-card" key={`${q.id}-${i}`}><Field label="ID"><input value={q.id} onChange={(e) => patch('quests', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Title"><input value={q.title} onChange={(e) => patch('quests', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Max progress"><input type="number" value={q.max_progress} onChange={(e) => patch('quests', i, 'max_progress', clamp(e.target.value, 1, 12))} /></Field><button onClick={() => remove('quests', i)}>Remove</button></article>)}</div><button onClick={() => add('quests')}>Add Quest</button></section>}

      {activeTab === 'scenes' && <section className="panel"><h2>Scene Editor</h2><div className="editor-list">{pack.scenes.map((s, i) => <article className="edit-card wide" key={`${s.id}-${i}`}><Field label="ID"><input value={s.id} onChange={(e) => patch('scenes', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Act"><input value={s.act} onChange={(e) => patch('scenes', i, 'act', safeText(e.target.value, 12))} /></Field><Field label="Title"><input value={s.title} onChange={(e) => patch('scenes', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Skill"><select value={s.skill} onChange={(e) => patch('scenes', i, 'skill', e.target.value)}>{SKILLS.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></Field><Field label="DC"><input type="number" value={s.dc} onChange={(e) => patch('scenes', i, 'dc', clamp(e.target.value, 5, 30))} /></Field><Field label="Quest"><select value={s.quest_id} onChange={(e) => patch('scenes', i, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Reward text"><input value={s.reward} onChange={(e) => patch('scenes', i, 'reward', safeText(e.target.value, 80))} /></Field><Field label="Scene text"><textarea value={s.text} onChange={(e) => patch('scenes', i, 'text', safeText(e.target.value, 280))} /></Field><button onClick={() => remove('scenes', i)}>Remove</button></article>)}</div><button onClick={() => add('scenes')}>Add Scene</button></section>}

      {activeTab === 'npcs' && <section className="panel"><h2>NPC Editor</h2><div className="editor-list">{pack.npcs.map((n, i) => <article className="edit-card" key={`${n.id}-${i}`}><Field label="ID"><input value={n.id} onChange={(e) => patch('npcs', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Name"><input value={n.title} onChange={(e) => patch('npcs', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Role"><input value={n.role} onChange={(e) => patch('npcs', i, 'role', safeText(e.target.value, 80))} /></Field><Field label="Quest"><select value={n.quest_id} onChange={(e) => patch('npcs', i, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Clue"><textarea value={n.clue} onChange={(e) => patch('npcs', i, 'clue', safeText(e.target.value, 180))} /></Field><button onClick={() => remove('npcs', i)}>Remove</button></article>)}</div><button onClick={() => add('npcs')}>Add NPC</button></section>}

      {activeTab === 'rewards' && <section className="panel"><h2>Reward Editor</h2><div className="editor-list">{pack.rewards.map((r, i) => <article className="edit-card" key={`${r.id}-${i}`}><Field label="ID"><input value={r.id} onChange={(e) => patch('rewards', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Title"><input value={r.title} onChange={(e) => patch('rewards', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Text"><textarea value={r.text} onChange={(e) => patch('rewards', i, 'text', safeText(e.target.value, 180))} /></Field><Field label="Items"><input value={(r.items || []).join(', ')} onChange={(e) => patch('rewards', i, 'items', list(e.target.value))} /></Field><Field label="HP"><input type="number" value={r.hp || 0} onChange={(e) => patch('rewards', i, 'hp', clamp(e.target.value, -10, 10))} /></Field><Field label="Quest"><select value={r.quest_id || ''} onChange={(e) => patch('rewards', i, 'quest_id', e.target.value)}>{questOptions(true)}</select></Field><Field label="Clue"><input value={r.clue || ''} onChange={(e) => patch('rewards', i, 'clue', safeText(e.target.value, 140))} /></Field><Field label="Add tags"><input value={(r.add || []).join(', ')} onChange={(e) => patch('rewards', i, 'add', list(e.target.value).filter((tag) => TAGS.includes(tag)))} /></Field><Field label="Clear tags"><input value={(r.clear || []).join(', ')} onChange={(e) => patch('rewards', i, 'clear', list(e.target.value).filter((tag) => TAGS.includes(tag)))} /></Field><button onClick={() => remove('rewards', i)}>Remove</button></article>)}</div><button onClick={() => add('rewards')}>Add Reward</button></section>}

      {activeTab === 'json' && <section className="panel studio-grid"><div><h2>Import JSON</h2><textarea className="json-box" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste route-pack JSON here" /><button onClick={importPack}>Import Pack</button></div><div><h2>Current Pack JSON</h2><pre className="json-preview">{JSON.stringify(result.pack, null, 2)}</pre></div></section>}
    </div>
  );
}

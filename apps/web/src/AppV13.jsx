import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v5';
const TAGS = ['watched', 'tired', 'inspired', 'marked', 'hidden'];
const SKILLS = ['perception', 'survival', 'insight', 'history', 'persuasion', 'stealth', 'arcana'];
const STARTER = {
  schema: 'porchquest.route_pack.v1',
  id: 'blackwood-starter',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'A reviewed starter pack for Campaign Studio.',
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key', max_progress: 5 },
    { id: 'q_side_1', title: 'Help the lantern-maker', max_progress: 4 }
  ],
  scenes: [
    { id: 'porch_threshold', act: 'I', title: 'Porch Threshold', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold clue', text: 'A route mark waits under the porch rail.' },
    { id: 'left_trail', act: 'I', title: 'Left Trail', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'trail clue', text: 'A soft path bends toward a small helper sign.' }
  ],
  npcs: [
    { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' }
  ],
  rewards: [
    { id: 'rest_token', title: 'Rest Token', text: 'Restore 1 HP and clear tired.', items: ['rest token'], hp: 1, quest_id: '', clue: '', add: [], clear: ['tired'] }
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

function normalizePack(raw) {
  const source = raw && typeof raw === 'object' ? raw : STARTER;
  const quests = (Array.isArray(source.quests) && source.quests.length ? source.quests : STARTER.quests).slice(0, 12).map((q, index) => ({
    id: safeText(q.id || slug(q.title, 'q') || `q_${index + 1}`, 64),
    title: safeText(q.title || 'Quest', 80),
    max_progress: clamp(q.max_progress || 3, 1, 12)
  }));
  const questIds = new Set(quests.map((q) => q.id));
  const firstQuest = quests[0]?.id || '';
  const scenes = (Array.isArray(source.scenes) && source.scenes.length ? source.scenes : STARTER.scenes).slice(0, 24).map((s, index) => ({
    id: safeText(s.id || slug(s.title, 'scene') || `scene_${index + 1}`, 64),
    act: safeText(s.act || 'I', 12),
    title: safeText(s.title || 'Scene', 80),
    skill: SKILLS.includes(s.skill) ? s.skill : 'perception',
    dc: clamp(s.dc || 12, 5, 30),
    quest_id: questIds.has(s.quest_id) ? s.quest_id : firstQuest,
    reward: safeText(s.reward || 'clue', 80),
    text: safeText(s.text || '', 280)
  }));
  const npcs = (Array.isArray(source.npcs) && source.npcs.length ? source.npcs : STARTER.npcs).slice(0, 24).map((n, index) => ({
    id: safeText(n.id || slug(n.title, 'npc') || `npc_${index + 1}`, 64),
    title: safeText(n.title || 'Helper', 80),
    role: safeText(n.role || 'Guide', 80),
    quest_id: questIds.has(n.quest_id) ? n.quest_id : firstQuest,
    clue: safeText(n.clue || '', 180)
  }));
  const rewards = (Array.isArray(source.rewards) && source.rewards.length ? source.rewards : STARTER.rewards).slice(0, 24).map((r, index) => ({
    id: safeText(r.id || slug(r.title, 'reward') || `reward_${index + 1}`, 64),
    title: safeText(r.title || 'Reward', 80),
    text: safeText(r.text || '', 180),
    items: uniq(Array.isArray(r.items) ? r.items : list(r.items)).slice(0, 4),
    hp: clamp(r.hp || 0, -10, 10),
    quest_id: questIds.has(r.quest_id) ? r.quest_id : '',
    clue: safeText(r.clue || '', 140),
    add: uniq(r.add || []).filter((tag) => TAGS.includes(tag)),
    clear: uniq(r.clear || []).filter((tag) => TAGS.includes(tag))
  }));
  return {
    schema: 'porchquest.route_pack.v1',
    id: safeText(source.id || 'custom-pack', 64),
    title: safeText(source.title || 'Custom Route Pack', 100),
    summary: safeText(source.summary || '', 280),
    quests,
    scenes,
    npcs,
    rewards
  };
}

function dupes(items) {
  const seen = new Set();
  const repeated = new Set();
  items.forEach((item) => (seen.has(item.id) ? repeated.add(item.id) : seen.add(item.id)));
  return repeated;
}
function cardIssues(kind, card, pack) {
  const issues = [];
  const questIds = new Set(pack.quests.map((q) => q.id));
  if (!card.id) issues.push('missing id');
  if (!card.title) issues.push('missing title');
  if (kind === 'quests' && card.max_progress < 1) issues.push('progress must be at least 1');
  if (kind === 'scenes') {
    if (!card.text) issues.push('missing scene text');
    if (!SKILLS.includes(card.skill)) issues.push('unknown skill');
    if (card.dc < 5 || card.dc > 30) issues.push('dc outside range');
    if (card.quest_id && !questIds.has(card.quest_id)) issues.push('unknown quest');
  }
  if (kind === 'npcs') {
    if (!card.role) issues.push('missing role');
    if (!card.clue) issues.push('missing clue');
    if (card.quest_id && !questIds.has(card.quest_id)) issues.push('unknown quest');
  }
  if (kind === 'rewards') {
    if (!card.text) issues.push('missing reward text');
    if (card.quest_id && !questIds.has(card.quest_id)) issues.push('unknown quest');
  }
  return issues;
}
function validatePack(pack) {
  const errors = [];
  const warnings = [];
  ['quests', 'scenes', 'npcs', 'rewards'].forEach((kind) => {
    const repeated = dupes(pack[kind] || []);
    repeated.forEach((id) => errors.push(`${kind}: duplicate id ${id}`));
    (pack[kind] || []).forEach((card) => cardIssues(kind, card, pack).forEach((issue) => warnings.push(`${kind}/${card.id || 'new'}: ${issue}`)));
  });
  if (!pack.quests.length) errors.push('At least one quest is required.');
  if (!pack.scenes.length) errors.push('At least one scene is required.');
  return { score: errors.length ? 'error' : warnings.length ? 'warning' : 'pass', errors, warnings };
}
function loadPack() {
  try {
    const saved = localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v4');
    return normalizePack(JSON.parse(saved));
  } catch {
    return STARTER;
  }
}
function Field({ label, children }) { return <label className="studio-field"><span>{label}</span>{children}</label>; }
function CardStatus({ kind, card, pack }) {
  const issues = cardIssues(kind, card, pack);
  return <span className={`card-badge ${issues.length ? 'warning' : 'pass'}`}>{issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'ready'}</span>;
}

export default function AppV13() {
  const [pack, setPack] = useState(loadPack);
  const [tab, setTab] = useState('quests');
  const [mode, setMode] = useState('edit');
  const [importText, setImportText] = useState('');
  const [reviewed, setReviewed] = useState([]);
  const [apiBase, setApiBase] = useState(localStorage.getItem('porchquest369.apiBase') || 'http://127.0.0.1:8787');
  const [backendPackId, setBackendPackId] = useState('blackwood-starter');
  const [message, setMessage] = useState('Ready.');
  const [playLog, setPlayLog] = useState([]);
  const validation = useMemo(() => validatePack(pack), [pack]);

  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); }, [pack]);
  useEffect(() => { localStorage.setItem('porchquest369.apiBase', apiBase); }, [apiBase]);
  useEffect(() => {
    fetch('content-packs/index.json').then((res) => res.json()).then((data) => setReviewed(data.packs || [])).catch(() => setReviewed([]));
  }, []);

  function patch(kind, index, key, value) { setPack((old) => ({ ...old, [kind]: old[kind].map((card, i) => (i === index ? { ...card, [key]: value } : card)) })); }
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
  function questOptions(blank = false) { return <>{blank && <option value="">No quest</option>}{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</>; }
  function importPack() { try { setPack(normalizePack(JSON.parse(importText))); setImportText(''); setMessage('Imported pack.'); } catch { setMessage('JSON import failed.'); } }
  async function loadReviewed(entry) { try { const data = await fetch(entry.path).then((res) => res.json()); setPack(normalizePack(data)); setMessage(`Loaded ${entry.title}.`); } catch { setMessage('Reviewed pack load failed.'); } }
  async function loadBackendPack() { try { const data = await fetch(`${apiBase.replace(/\/$/, '')}/api/content-packs/${encodeURIComponent(backendPackId)}`).then((res) => res.json()); setPack(normalizePack(data.pack)); setMessage(`Loaded backend pack ${backendPackId}.`); } catch { setMessage('Backend pack load failed.'); } }
  function play(kind, card) { setPlayLog((old) => [`${kind}: ${card.title} -> ${card.reward || card.clue || card.text}`, ...old].slice(0, 10)); }
  function renderCardIssues(kind, card) { const issues = cardIssues(kind, card, pack); return issues.length ? <ul className="card-issues">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null; }

  return (
    <div className="app studio-v13">
      <header className="hero"><p className="eyebrow">PorchQuest369 v0.8.2</p><h1>Campaign Studio</h1><p className="subtle">Card-level validation, reviewed pack import, backend pack loader, and edit/playtest mode.</p></header>
      <section className="panel studio-grid"><div><h2>Pack</h2><Field label="Pack ID"><input value={pack.id} onChange={(e) => setPack({ ...pack, id: safeText(e.target.value, 64) })} /></Field><Field label="Title"><input value={pack.title} onChange={(e) => setPack({ ...pack, title: safeText(e.target.value, 100) })} /></Field><Field label="Summary"><textarea value={pack.summary} onChange={(e) => setPack({ ...pack, summary: safeText(e.target.value, 280) })} /></Field></div><div><h2>Checks</h2><div className="badge-row"><span className={`badge ${validation.score}`}>{validation.score.toUpperCase()}</span><span className="badge">{pack.quests.length} quests</span><span className="badge">{pack.scenes.length} scenes</span><span className="badge">{pack.npcs.length} NPCs</span><span className="badge">{pack.rewards.length} rewards</span></div><p className="status-line">{message}</p><div className="button-row"><button onClick={() => setPack(normalizePack(pack))}>Normalize</button><button onClick={() => downloadJson(`${pack.id}.route-pack.json`, normalizePack(pack))}>Export Pack</button><button onClick={() => setPack(STARTER)}>Load Starter</button></div></div></section>
      <section className="panel studio-grid"><div><h2>Reviewed Packs</h2>{reviewed.length ? reviewed.map((entry) => <button key={entry.id} onClick={() => loadReviewed(entry)}>{entry.title}</button>) : <p className="subtle">No reviewed pack index found.</p>}</div><div><h2>Backend Pack Loader</h2><Field label="API Base"><input value={apiBase} onChange={(e) => setApiBase(e.target.value)} /></Field><Field label="Pack ID"><input value={backendPackId} onChange={(e) => setBackendPackId(e.target.value)} /></Field><button onClick={loadBackendPack}>Load from Backend</button></div></section>
      <section className="panel"><div className="tabs"><button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Edit Mode</button><button className={mode === 'playtest' ? 'active' : ''} onClick={() => setMode('playtest')}>Playtest Mode</button></div>{mode === 'edit' && <div className="tabs">{['quests', 'scenes', 'npcs', 'rewards', 'json'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</div>}</section>
      {mode === 'edit' && tab === 'quests' && <section className="panel"><h2>Quest Editor</h2><div className="editor-list">{pack.quests.map((q, i) => <article className="edit-card" key={`${q.id}-${i}`}><header><h3>{q.title}</h3><CardStatus kind="quests" card={q} pack={pack} /></header>{renderCardIssues('quests', q)}<Field label="ID"><input value={q.id} onChange={(e) => patch('quests', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Title"><input value={q.title} onChange={(e) => patch('quests', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Max progress"><input type="number" value={q.max_progress} onChange={(e) => patch('quests', i, 'max_progress', clamp(e.target.value, 1, 12))} /></Field><button onClick={() => remove('quests', i)}>Remove</button></article>)}</div><button onClick={() => add('quests')}>Add Quest</button></section>}
      {mode === 'edit' && tab === 'scenes' && <section className="panel"><h2>Scene Editor</h2><div className="editor-list">{pack.scenes.map((s, i) => <article className="edit-card wide" key={`${s.id}-${i}`}><header><h3>{s.title}</h3><CardStatus kind="scenes" card={s} pack={pack} /></header>{renderCardIssues('scenes', s)}<Field label="ID"><input value={s.id} onChange={(e) => patch('scenes', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Act"><input value={s.act} onChange={(e) => patch('scenes', i, 'act', safeText(e.target.value, 12))} /></Field><Field label="Title"><input value={s.title} onChange={(e) => patch('scenes', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Skill"><select value={s.skill} onChange={(e) => patch('scenes', i, 'skill', e.target.value)}>{SKILLS.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></Field><Field label="DC"><input type="number" value={s.dc} onChange={(e) => patch('scenes', i, 'dc', clamp(e.target.value, 5, 30))} /></Field><Field label="Quest"><select value={s.quest_id} onChange={(e) => patch('scenes', i, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Reward"><input value={s.reward} onChange={(e) => patch('scenes', i, 'reward', safeText(e.target.value, 80))} /></Field><Field label="Text"><textarea value={s.text} onChange={(e) => patch('scenes', i, 'text', safeText(e.target.value, 280))} /></Field><button onClick={() => remove('scenes', i)}>Remove</button></article>)}</div><button onClick={() => add('scenes')}>Add Scene</button></section>}
      {mode === 'edit' && tab === 'npcs' && <section className="panel"><h2>NPC Editor</h2><div className="editor-list">{pack.npcs.map((n, i) => <article className="edit-card" key={`${n.id}-${i}`}><header><h3>{n.title}</h3><CardStatus kind="npcs" card={n} pack={pack} /></header>{renderCardIssues('npcs', n)}<Field label="ID"><input value={n.id} onChange={(e) => patch('npcs', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Name"><input value={n.title} onChange={(e) => patch('npcs', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Role"><input value={n.role} onChange={(e) => patch('npcs', i, 'role', safeText(e.target.value, 80))} /></Field><Field label="Quest"><select value={n.quest_id} onChange={(e) => patch('npcs', i, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Clue"><textarea value={n.clue} onChange={(e) => patch('npcs', i, 'clue', safeText(e.target.value, 180))} /></Field><button onClick={() => remove('npcs', i)}>Remove</button></article>)}</div><button onClick={() => add('npcs')}>Add NPC</button></section>}
      {mode === 'edit' && tab === 'rewards' && <section className="panel"><h2>Reward Editor</h2><div className="editor-list">{pack.rewards.map((r, i) => <article className="edit-card" key={`${r.id}-${i}`}><header><h3>{r.title}</h3><CardStatus kind="rewards" card={r} pack={pack} /></header>{renderCardIssues('rewards', r)}<Field label="ID"><input value={r.id} onChange={(e) => patch('rewards', i, 'id', safeText(e.target.value, 64))} /></Field><Field label="Title"><input value={r.title} onChange={(e) => patch('rewards', i, 'title', safeText(e.target.value, 80))} /></Field><Field label="Text"><textarea value={r.text} onChange={(e) => patch('rewards', i, 'text', safeText(e.target.value, 180))} /></Field><Field label="Items"><input value={(r.items || []).join(', ')} onChange={(e) => patch('rewards', i, 'items', list(e.target.value))} /></Field><Field label="HP"><input type="number" value={r.hp || 0} onChange={(e) => patch('rewards', i, 'hp', clamp(e.target.value, -10, 10))} /></Field><Field label="Quest"><select value={r.quest_id || ''} onChange={(e) => patch('rewards', i, 'quest_id', e.target.value)}>{questOptions(true)}</select></Field><Field label="Clue"><input value={r.clue || ''} onChange={(e) => patch('rewards', i, 'clue', safeText(e.target.value, 140))} /></Field><Field label="Add tags"><input value={(r.add || []).join(', ')} onChange={(e) => patch('rewards', i, 'add', list(e.target.value).filter((tag) => TAGS.includes(tag)))} /></Field><Field label="Clear tags"><input value={(r.clear || []).join(', ')} onChange={(e) => patch('rewards', i, 'clear', list(e.target.value).filter((tag) => TAGS.includes(tag)))} /></Field><button onClick={() => remove('rewards', i)}>Remove</button></article>)}</div><button onClick={() => add('rewards')}>Add Reward</button></section>}
      {mode === 'edit' && tab === 'json' && <section className="panel studio-grid"><div><h2>Import JSON</h2><textarea className="json-box" value={importText} onChange={(e) => setImportText(e.target.value)} /><button onClick={importPack}>Import Pack</button></div><div><h2>Preview</h2><pre className="json-preview">{JSON.stringify(normalizePack(pack), null, 2)}</pre></div></section>}
      {mode === 'playtest' && <section className="panel"><h2>Playtest</h2><p className="subtle">Try the edited pack without leaving the studio.</p><div className="play-grid"><div><h3>Scenes</h3>{pack.scenes.map((s) => <button key={s.id} onClick={() => play('Scene', s)}>{s.title}</button>)}</div><div><h3>NPCs</h3>{pack.npcs.map((n) => <button key={n.id} onClick={() => play('NPC', n)}>{n.title}</button>)}</div><div><h3>Rewards</h3>{pack.rewards.map((r) => <button key={r.id} onClick={() => play('Reward', r)}>{r.title}</button>)}</div></div><ol className="play-log">{playLog.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ol></section>}
    </div>
  );
}

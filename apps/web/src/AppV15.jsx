import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v7';
const API_KEY = 'porchquest369.apiBase';
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
  ],
  edges: [
    { from: 'porch_threshold', to: 'left_trail', label: 'follow the soft path', condition: '' }
  ]
};

function safeText(value, limit) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function splitList(value) { return String(value || '').split(',').map((item) => item.trim()).filter(Boolean); }
function uniq(items) { return Array.from(new Set((items || []).filter(Boolean).map(String))); }
function slug(value, prefix) { const body = safeText(value, 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'card'; return `${prefix}_${body}`; }
function downloadJson(name, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }

function defaultEdges(scenes) {
  return scenes.slice(0, -1).map((scene, index) => ({ from: scene.id, to: scenes[index + 1].id, label: 'next', condition: '' }));
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
  const sceneIds = new Set(scenes.map((s) => s.id));
  const npcs = (Array.isArray(source.npcs) && source.npcs.length ? source.npcs : STARTER.npcs).slice(0, 24).map((n, index) => ({
    id: safeText(n.id || slug(n.title, 'npc') || `npc_${index + 1}`, 64), title: safeText(n.title || 'Helper', 80), role: safeText(n.role || 'Guide', 80), quest_id: questIds.has(n.quest_id) ? n.quest_id : firstQuest, clue: safeText(n.clue || '', 180)
  }));
  const rewards = (Array.isArray(source.rewards) && source.rewards.length ? source.rewards : STARTER.rewards).slice(0, 24).map((r, index) => ({
    id: safeText(r.id || slug(r.title, 'reward') || `reward_${index + 1}`, 64), title: safeText(r.title || 'Reward', 80), text: safeText(r.text || '', 180), items: uniq(Array.isArray(r.items) ? r.items : splitList(r.items)).slice(0, 4), hp: clamp(r.hp || 0, -10, 10), quest_id: questIds.has(r.quest_id) ? r.quest_id : '', clue: safeText(r.clue || '', 140), add: uniq(r.add || []).filter((tag) => TAGS.includes(tag)), clear: uniq(r.clear || []).filter((tag) => TAGS.includes(tag))
  }));
  const rawEdges = Array.isArray(source.edges) && source.edges.length ? source.edges : defaultEdges(scenes);
  const edges = rawEdges.slice(0, 48).map((e, index) => ({
    from: sceneIds.has(e.from) ? e.from : scenes[index % Math.max(1, scenes.length)]?.id || '',
    to: sceneIds.has(e.to) ? e.to : scenes[(index + 1) % Math.max(1, scenes.length)]?.id || '',
    label: safeText(e.label || 'next', 80),
    condition: safeText(e.condition || '', 80)
  })).filter((e) => e.from && e.to);
  return { schema: 'porchquest.route_pack.v1', id: safeText(source.id || 'custom-pack', 64), title: safeText(source.title || 'Custom Route Pack', 100), summary: safeText(source.summary || '', 280), quests, scenes, npcs, rewards, edges };
}
function loadPack() {
  try { return normalizePack(JSON.parse(localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v6') || localStorage.getItem('porchquest369.routePack.v5'))); } catch { return STARTER; }
}
function dupes(items) { const seen = new Set(); const repeated = new Set(); items.forEach((item) => (seen.has(item.id) ? repeated.add(item.id) : seen.add(item.id))); return repeated; }
function fieldIssues(kind, card, field, pack) {
  const questIds = new Set(pack.quests.map((q) => q.id));
  const sceneIds = new Set(pack.scenes.map((s) => s.id));
  if (field === 'id' && !card.id) return ['missing id'];
  if (field === 'title' && !card.title) return ['missing title'];
  if (kind === 'quests' && field === 'max_progress' && card.max_progress < 1) return ['minimum 1'];
  if (kind === 'scenes' && field === 'text' && !card.text) return ['missing text'];
  if (kind === 'scenes' && field === 'skill' && !SKILLS.includes(card.skill)) return ['unknown skill'];
  if (kind === 'scenes' && field === 'dc' && (card.dc < 5 || card.dc > 30)) return ['range 5-30'];
  if ((kind === 'scenes' || kind === 'npcs' || kind === 'rewards') && field === 'quest_id' && card.quest_id && !questIds.has(card.quest_id)) return ['unknown quest'];
  if (kind === 'npcs' && field === 'role' && !card.role) return ['missing role'];
  if (kind === 'npcs' && field === 'clue' && !card.clue) return ['missing clue'];
  if (kind === 'rewards' && field === 'text' && !card.text) return ['missing text'];
  if (kind === 'edges' && (field === 'from' || field === 'to') && !sceneIds.has(card[field])) return ['unknown scene'];
  return [];
}
function cardIssues(kind, card, pack) {
  const fields = kind === 'quests' ? ['id', 'title', 'max_progress'] : kind === 'scenes' ? ['id', 'title', 'skill', 'dc', 'quest_id', 'text'] : kind === 'npcs' ? ['id', 'title', 'role', 'quest_id', 'clue'] : kind === 'rewards' ? ['id', 'title', 'text', 'quest_id'] : ['from', 'to', 'label'];
  return fields.flatMap((field) => fieldIssues(kind, card, field, pack).map((issue) => `${field}: ${issue}`));
}
function validatePack(pack, schemaReady) {
  const errors = [];
  const warnings = [];
  ['quests', 'scenes', 'npcs', 'rewards'].forEach((kind) => {
    dupes(pack[kind] || []).forEach((id) => errors.push(`${kind}: duplicate id ${id}`));
    (pack[kind] || []).forEach((card) => cardIssues(kind, card, pack).forEach((issue) => warnings.push(`${kind}/${card.id || 'new'}: ${issue}`)));
  });
  (pack.edges || []).forEach((edge, index) => cardIssues('edges', edge, pack).forEach((issue) => warnings.push(`edges/${index + 1}: ${issue}`)));
  if (!pack.quests.length) errors.push('At least one quest is required.');
  if (!pack.scenes.length) errors.push('At least one scene is required.');
  if (!schemaReady) warnings.push('Schema file not loaded yet.');
  return { score: errors.length ? 'error' : warnings.length ? 'warning' : 'pass', errors, warnings };
}
function promotionChecks(pack, validation) {
  return [
    { label: 'Validation has no blocking errors', ok: !validation.errors.length },
    { label: 'At least two scenes are present', ok: pack.scenes.length >= 2 },
    { label: 'At least one route edge is present', ok: (pack.edges || []).length >= 1 },
    { label: 'Every scene has text', ok: pack.scenes.every((s) => Boolean(s.text)) },
    { label: 'Every NPC clue is filled', ok: pack.npcs.every((n) => Boolean(n.clue)) },
    { label: 'At least one reward is present', ok: pack.rewards.length >= 1 }
  ];
}
function FieldBadge({ issues }) { return <span className={`field-badge ${issues.length ? 'warn' : 'ok'}`}>{issues.length ? issues.join(', ') : 'ok'}</span>; }
function Field({ label, issues = [], children }) { return <label className="studio-field"><span>{label}<FieldBadge issues={issues} /></span>{children}</label>; }
function CardStatus({ kind, card, pack }) { const issues = cardIssues(kind, card, pack); return <span className={`card-badge ${issues.length ? 'warning' : 'pass'}`}>{issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'ready'}</span>; }

export default function AppV15() {
  const [pack, setPack] = useState(loadPack);
  const [tab, setTab] = useState('gallery');
  const [mode, setMode] = useState('edit');
  const [importText, setImportText] = useState('');
  const [reviewed, setReviewed] = useState([]);
  const [schemaMeta, setSchemaMeta] = useState(null);
  const [apiBase, setApiBase] = useState(localStorage.getItem(API_KEY) || 'http://127.0.0.1:8787');
  const [backendPackId, setBackendPackId] = useState('blackwood-starter');
  const [message, setMessage] = useState('Ready.');
  const [playLog, setPlayLog] = useState([]);
  const validation = useMemo(() => validatePack(pack, Boolean(schemaMeta)), [pack, schemaMeta]);
  const checks = useMemo(() => promotionChecks(pack, validation), [pack, validation]);

  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); }, [pack]);
  useEffect(() => { localStorage.setItem(API_KEY, apiBase); }, [apiBase]);
  useEffect(() => { fetch('content-packs/index.json').then((res) => res.json()).then((data) => setReviewed(data.packs || [])).catch(() => setReviewed([])); }, []);
  useEffect(() => { fetch('schemas/route-pack.schema.json').then((res) => res.json()).then((data) => setSchemaMeta(data)).catch(() => setSchemaMeta(null)); }, []);

  function patch(kind, index, key, value) { setPack((old) => ({ ...old, [kind]: old[kind].map((card, i) => (i === index ? { ...card, [key]: value } : card)) })); }
  function add(kind) {
    const questId = pack.quests[0]?.id || '';
    const sceneId = pack.scenes[0]?.id || '';
    const next = { quests: { id: `q_${pack.quests.length + 1}`, title: 'New quest', max_progress: 3 }, scenes: { id: `scene_${pack.scenes.length + 1}`, act: 'I', title: 'New scene', skill: 'perception', dc: 12, quest_id: questId, reward: 'clue', text: 'Describe a safe scene.' }, npcs: { id: `npc_${pack.npcs.length + 1}`, title: 'New helper', role: 'Guide', quest_id: questId, clue: 'Offer a useful clue.' }, rewards: { id: `reward_${pack.rewards.length + 1}`, title: 'New reward', text: 'Describe a small reward.', items: [], hp: 0, quest_id: '', clue: '', add: [], clear: [] }, edges: { from: sceneId, to: sceneId, label: 'next', condition: '' } }[kind];
    setPack((old) => ({ ...old, [kind]: [...(old[kind] || []), next] }));
  }
  function remove(kind, index) { setPack((old) => ({ ...old, [kind]: old[kind].filter((_, i) => i !== index) })); }
  function questOptions(blank = false) { return <>{blank && <option value="">No quest</option>}{pack.quests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</>; }
  function sceneOptions() { return <>{pack.scenes.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</>; }
  function importPack() { try { setPack(normalizePack(JSON.parse(importText))); setImportText(''); setMessage('Imported pack.'); } catch { setMessage('JSON import failed.'); } }
  async function loadReviewed(entry) { try { const data = await fetch(entry.path).then((res) => res.json()); setPack(normalizePack(data)); setMessage(`Loaded ${entry.title}.`); } catch { setMessage('Reviewed pack load failed.'); } }
  async function loadBackendPack() { try { const data = await fetch(`${apiBase.replace(/\/$/, '')}/api/content-packs/${encodeURIComponent(backendPackId)}`).then((res) => res.json()); setPack(normalizePack(data.pack)); setMessage(`Loaded backend pack ${backendPackId}.`); } catch { setMessage('Backend pack load failed.'); } }
  async function saveBackendPack() { try { const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/content-packs/${encodeURIComponent(pack.id)}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack: normalizePack(pack) }) }); const res = await r.json(); setMessage(r.ok ? `Saved backend pack ${res.saved?.id || pack.id}.` : `Backend save blocked: ${res.detail || 'write gate'}.`); } catch { setMessage('Backend pack save failed.'); } }
  function play(kind, card) { const entry = { at: new Date().toISOString(), kind, id: card.id || `${card.from}->${card.to}`, title: card.title || card.label, note: card.reward || card.clue || card.text || card.condition || 'route step' }; setPlayLog((old) => [entry, ...old].slice(0, 40)); }
  function exportTranscript() { downloadJson(`${pack.id}.playtest-transcript.json`, { schema: 'porchquest.playtest_transcript.v1', pack: { id: pack.id, title: pack.title }, validation, promotion: checks, log: playLog }); }
  function renderIssues(kind, card) { const issues = cardIssues(kind, card, pack); return issues.length ? <ul className="card-issues">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null; }

  function renderQuest(card, index) { return <article className="editor-card" key={index}><h3>Quest <CardStatus kind="quests" card={card} pack={pack} /></h3><Field label="ID" issues={fieldIssues('quests', card, 'id', pack)}><input value={card.id} onChange={(e) => patch('quests', index, 'id', e.target.value)} /></Field><Field label="Title" issues={fieldIssues('quests', card, 'title', pack)}><input value={card.title} onChange={(e) => patch('quests', index, 'title', e.target.value)} /></Field><Field label="Max" issues={fieldIssues('quests', card, 'max_progress', pack)}><input type="number" value={card.max_progress} onChange={(e) => patch('quests', index, 'max_progress', Number(e.target.value))} /></Field>{renderIssues('quests', card)}<button onClick={() => remove('quests', index)}>Remove</button></article>; }
  function renderScene(card, index) { return <article className="editor-card" key={index}><h3>Scene <CardStatus kind="scenes" card={card} pack={pack} /></h3><Field label="ID" issues={fieldIssues('scenes', card, 'id', pack)}><input value={card.id} onChange={(e) => patch('scenes', index, 'id', e.target.value)} /></Field><Field label="Title" issues={fieldIssues('scenes', card, 'title', pack)}><input value={card.title} onChange={(e) => patch('scenes', index, 'title', e.target.value)} /></Field><Field label="Act"><input value={card.act} onChange={(e) => patch('scenes', index, 'act', e.target.value)} /></Field><Field label="Skill" issues={fieldIssues('scenes', card, 'skill', pack)}><select value={card.skill} onChange={(e) => patch('scenes', index, 'skill', e.target.value)}>{SKILLS.map((skill) => <option key={skill}>{skill}</option>)}</select></Field><Field label="DC" issues={fieldIssues('scenes', card, 'dc', pack)}><input type="number" value={card.dc} onChange={(e) => patch('scenes', index, 'dc', Number(e.target.value))} /></Field><Field label="Quest" issues={fieldIssues('scenes', card, 'quest_id', pack)}><select value={card.quest_id} onChange={(e) => patch('scenes', index, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Reward"><input value={card.reward} onChange={(e) => patch('scenes', index, 'reward', e.target.value)} /></Field><Field label="Text" issues={fieldIssues('scenes', card, 'text', pack)}><textarea value={card.text} onChange={(e) => patch('scenes', index, 'text', e.target.value)} /></Field>{renderIssues('scenes', card)}<button onClick={() => play('scene', card)}>Playtest</button><button onClick={() => remove('scenes', index)}>Remove</button></article>; }
  function renderNpc(card, index) { return <article className="editor-card" key={index}><h3>NPC <CardStatus kind="npcs" card={card} pack={pack} /></h3><Field label="ID" issues={fieldIssues('npcs', card, 'id', pack)}><input value={card.id} onChange={(e) => patch('npcs', index, 'id', e.target.value)} /></Field><Field label="Name" issues={fieldIssues('npcs', card, 'title', pack)}><input value={card.title} onChange={(e) => patch('npcs', index, 'title', e.target.value)} /></Field><Field label="Role" issues={fieldIssues('npcs', card, 'role', pack)}><input value={card.role} onChange={(e) => patch('npcs', index, 'role', e.target.value)} /></Field><Field label="Quest" issues={fieldIssues('npcs', card, 'quest_id', pack)}><select value={card.quest_id} onChange={(e) => patch('npcs', index, 'quest_id', e.target.value)}>{questOptions()}</select></Field><Field label="Clue" issues={fieldIssues('npcs', card, 'clue', pack)}><textarea value={card.clue} onChange={(e) => patch('npcs', index, 'clue', e.target.value)} /></Field>{renderIssues('npcs', card)}<button onClick={() => play('npc', card)}>Playtest</button><button onClick={() => remove('npcs', index)}>Remove</button></article>; }
  function renderReward(card, index) { return <article className="editor-card" key={index}><h3>Reward <CardStatus kind="rewards" card={card} pack={pack} /></h3><Field label="ID" issues={fieldIssues('rewards', card, 'id', pack)}><input value={card.id} onChange={(e) => patch('rewards', index, 'id', e.target.value)} /></Field><Field label="Title" issues={fieldIssues('rewards', card, 'title', pack)}><input value={card.title} onChange={(e) => patch('rewards', index, 'title', e.target.value)} /></Field><Field label="Text" issues={fieldIssues('rewards', card, 'text', pack)}><textarea value={card.text} onChange={(e) => patch('rewards', index, 'text', e.target.value)} /></Field><Field label="Items"><input value={card.items.join(', ')} onChange={(e) => patch('rewards', index, 'items', splitList(e.target.value))} /></Field><Field label="HP"><input type="number" value={card.hp} onChange={(e) => patch('rewards', index, 'hp', Number(e.target.value))} /></Field><Field label="Quest" issues={fieldIssues('rewards', card, 'quest_id', pack)}><select value={card.quest_id} onChange={(e) => patch('rewards', index, 'quest_id', e.target.value)}>{questOptions(true)}</select></Field><Field label="Clue"><input value={card.clue} onChange={(e) => patch('rewards', index, 'clue', e.target.value)} /></Field>{renderIssues('rewards', card)}<button onClick={() => play('reward', card)}>Playtest</button><button onClick={() => remove('rewards', index)}>Remove</button></article>; }
  function renderEdge(card, index) { return <article className="editor-card edge-card" key={index}><h3>Route Edge <CardStatus kind="edges" card={card} pack={pack} /></h3><Field label="From" issues={fieldIssues('edges', card, 'from', pack)}><select value={card.from} onChange={(e) => patch('edges', index, 'from', e.target.value)}>{sceneOptions()}</select></Field><Field label="To" issues={fieldIssues('edges', card, 'to', pack)}><select value={card.to} onChange={(e) => patch('edges', index, 'to', e.target.value)}>{sceneOptions()}</select></Field><Field label="Label"><input value={card.label} onChange={(e) => patch('edges', index, 'label', e.target.value)} /></Field><Field label="Condition"><input value={card.condition} onChange={(e) => patch('edges', index, 'condition', e.target.value)} /></Field>{renderIssues('edges', card)}<button onClick={() => play('edge', card)}>Trace edge</button><button onClick={() => remove('edges', index)}>Remove</button></article>; }

  return <div className="app studio-v15">
    <header className="hero"><p className="eyebrow">PorchQuest369 v0.8.4</p><h1>Campaign Studio</h1><p className="subtle">Route edges, schema helper, promotion checklist, write-gated backend save, and gallery polish.</p></header>
    <section className="panel pack-head"><div><h2>{pack.title}</h2><p>{pack.summary || 'No summary yet.'}</p><p className={`status ${validation.score}`}>{validation.score.toUpperCase()} · {validation.errors.length} errors · {validation.warnings.length} warnings · schema {schemaMeta ? 'loaded' : 'pending'}</p></div><div className="button-row"><button onClick={() => setMode(mode === 'edit' ? 'playtest' : 'edit')}>{mode === 'edit' ? 'Switch to Playtest' : 'Switch to Edit'}</button><button onClick={() => downloadJson(`${pack.id}.route-pack.json`, normalizePack(pack))}>Export Pack</button><button onClick={exportTranscript}>Export Transcript</button></div></section>
    <section className="panel gallery"><h2>Reviewed Pack Gallery</h2><div className="gallery-grid">{reviewed.map((entry) => <article className="gallery-card" key={entry.id}><h3>{entry.title}</h3><p>{entry.summary}</p><button onClick={() => loadReviewed(entry)}>Load reviewed pack</button></article>)}</div></section>
    <section className="panel backend-panel"><h2>Backend Pack Loader</h2><div className="form-grid"><label>API Base<input value={apiBase} onChange={(e) => setApiBase(e.target.value)} /></label><label>Pack ID<input value={backendPackId} onChange={(e) => setBackendPackId(e.target.value)} /></label></div><p className="subtle">Save is protected by backend write gate: PORCHQUEST_ALLOW_PACK_WRITES=1.</p><div className="button-row"><button onClick={loadBackendPack}>Load from Backend</button><button onClick={saveBackendPack}>Save to Backend</button></div><p>{message}</p></section>
    <section className="panel checklist"><h2>Promotion Checklist</h2>{checks.map((check) => <p key={check.label} className={check.ok ? 'check ok' : 'check warn'}>{check.ok ? '✓' : '!'} {check.label}</p>)}</section>
    <section className="panel route-graph"><h2>Route Flow Graph</h2><div className="route-flow">{pack.edges.map((edge, index) => <div className="route-edge" key={`${edge.from}-${edge.to}-${index}`}><span>{pack.scenes.find((s) => s.id === edge.from)?.title || edge.from}</span><b>{edge.label || 'next'}</b><span>{pack.scenes.find((s) => s.id === edge.to)?.title || edge.to}</span>{edge.condition && <small>{edge.condition}</small>}</div>)}</div></section>
    <nav className="studio-tabs">{['quests', 'scenes', 'npcs', 'rewards', 'edges', 'json', 'transcript'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {mode === 'edit' && tab !== 'json' && tab !== 'transcript' && <section className="editor-list"><div className="button-row"><button onClick={() => add(tab)}>Add {tab.slice(0, -1)}</button></div>{tab === 'quests' && pack.quests.map(renderQuest)}{tab === 'scenes' && pack.scenes.map(renderScene)}{tab === 'npcs' && pack.npcs.map(renderNpc)}{tab === 'rewards' && pack.rewards.map(renderReward)}{tab === 'edges' && pack.edges.map(renderEdge)}</section>}
    {mode === 'playtest' && <section className="panel"><h2>Playtest Mode</h2><p>Use card playtest buttons to build a transcript. Validation and promotion checks travel with the export.</p><div className="button-row"><button onClick={() => setTab('scenes')}>Scenes</button><button onClick={() => setTab('npcs')}>NPCs</button><button onClick={() => setTab('rewards')}>Rewards</button><button onClick={() => setTab('edges')}>Edges</button></div></section>}
    {tab === 'json' && <section className="panel"><h2>JSON Import</h2><textarea className="json-box" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste route-pack JSON here" /><div className="button-row"><button onClick={importPack}>Import JSON</button><button onClick={() => setImportText(JSON.stringify(normalizePack(pack), null, 2))}>Copy Current to Box</button></div></section>}
    {tab === 'transcript' && <section className="panel"><h2>Playtest Transcript</h2>{playLog.length === 0 ? <p>No playtest entries yet.</p> : <ol className="transcript-list">{playLog.map((entry) => <li key={`${entry.at}-${entry.id}`}><b>{entry.kind}</b> · {entry.title}<br /><small>{entry.note}</small></li>)}</ol>}</section>}
  </div>;
}

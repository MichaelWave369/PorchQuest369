import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v7';
const ACTION_KEY = 'porchquest369.actionLog.v1';
const EXPORT_KEY = 'porchquest369.exportEvents.v1';
const STARTER = {
  schema: 'porchquest.route_pack.v1',
  id: 'blackwood-starter',
  title: 'Lanterns Under Blackwood Hill',
  summary: 'A contributor-safe starter route pack for Campaign Studio.',
  quests: [
    { id: 'q_main_1', title: 'Find the porch key', max_progress: 5 },
    { id: 'q_side_1', title: 'Help the lantern-maker', max_progress: 4 }
  ],
  scenes: [
    { id: 'porch_threshold', act: 'I', title: 'Porch Threshold', skill: 'perception', dc: 12, quest_id: 'q_main_1', reward: 'threshold clue', text: 'A route mark waits under the porch rail.' },
    { id: 'left_trail', act: 'I', title: 'Left Trail', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'trail clue', text: 'A soft path bends toward a small helper sign.' }
  ],
  npcs: [{ id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' }],
  rewards: [{ id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], hp: 0, quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.', add: [], clear: [] }],
  edges: [{ id: 'edge_1', from: 'porch_threshold', to: 'left_trail', label: 'next', condition: '' }]
};
const FALLBACK_FIXTURES = [
  { label: 'Valid route pack', detail: 'Expected no blocking errors', ok: true },
  { label: 'Invalid route pack', detail: 'Expected at least one blocking error', ok: true }
];

function parse(raw) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : STARTER;
  return {
    ...STARTER,
    ...source,
    quests: Array.isArray(source.quests) ? source.quests : [],
    scenes: Array.isArray(source.scenes) ? source.scenes : [],
    npcs: Array.isArray(source.npcs) ? source.npcs : [],
    rewards: Array.isArray(source.rewards) ? source.rewards : [],
    edges: Array.isArray(source.edges) ? source.edges : []
  };
}
function slug(value, fallback = 'item') {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64) || fallback;
}
function idSet(list) { return new Set((list || []).map((item) => item.id).filter(Boolean)); }
function dupes(list) {
  const seen = new Set();
  const out = new Set();
  (list || []).forEach((item) => { if (item.id && seen.has(item.id)) out.add(item.id); seen.add(item.id); });
  return Array.from(out);
}
function validate(pack) {
  const errors = [];
  const warnings = [];
  const sceneIds = idSet(pack.scenes);
  const questIds = idSet(pack.quests);
  if (pack.schema !== 'porchquest.route_pack.v1') errors.push('Schema must be porchquest.route_pack.v1.');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(pack.id || '')) errors.push('Pack ID must be slug-safe.');
  if (!pack.title) errors.push('Pack title is required.');
  ['quests', 'scenes', 'npcs', 'rewards', 'edges'].forEach((key) => dupes(pack[key]).forEach((id) => errors.push(`${key} duplicate id: ${id}`)));
  if (pack.scenes.length < 2) warnings.push('Two or more scenes are recommended for promotion.');
  if (!pack.edges.length) warnings.push('At least one route edge is recommended.');
  pack.scenes.forEach((scene) => { if (!scene.id) errors.push('Scene missing ID.'); if (!scene.title) warnings.push(`Scene ${scene.id || 'new'} is missing a title.`); if (!scene.text) warnings.push(`Scene ${scene.id || 'new'} is missing text.`); if (scene.quest_id && !questIds.has(scene.quest_id)) errors.push(`Scene ${scene.id || 'new'} links an unknown quest.`); });
  pack.npcs.forEach((npc) => { if (!npc.id) errors.push('NPC missing ID.'); if (!npc.clue) warnings.push(`NPC ${npc.id || 'new'} is missing a clue.`); if (npc.quest_id && !questIds.has(npc.quest_id)) errors.push(`NPC ${npc.id || 'new'} links an unknown quest.`); });
  pack.rewards.forEach((reward) => { if (!reward.id) errors.push('Reward missing ID.'); if (!reward.text) warnings.push(`Reward ${reward.id || 'new'} is missing text.`); if (reward.quest_id && !questIds.has(reward.quest_id)) errors.push(`Reward ${reward.id || 'new'} links an unknown quest.`); });
  pack.edges.forEach((edge, index) => { if (!edge.from || !edge.to) errors.push(`Edge ${index + 1} needs from and to.`); if (edge.from && !sceneIds.has(edge.from)) errors.push(`Edge ${index + 1} from scene not found.`); if (edge.to && !sceneIds.has(edge.to)) errors.push(`Edge ${index + 1} to scene not found.`); });
  return { errors, warnings, status: errors.length ? 'blocked' : warnings.length ? 'review' : 'ready' };
}
function checksum(input) {
  let h = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function loadPack() { return normalize(parse(localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v4')) || STARTER); }
function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function Field({ label, value, onChange, area }) {
  return <label>{label}{area ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} /> : <input value={value || ''} onChange={(e) => onChange(e.target.value)} />}</label>;
}
function Empty({ children }) { return <p className="empty-note">{children}</p>; }
function readList(key) { const parsed = parse(localStorage.getItem(key)); return Array.isArray(parsed) ? parsed : []; }

export default function AppV25() {
  const [pack, setPack] = useState(loadPack);
  const [tab, setTab] = useState('overview');
  const [jsonText, setJsonText] = useState('');
  const [gallery, setGallery] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [fixtures, setFixtures] = useState(FALLBACK_FIXTURES.map((f) => ({ ...f, detail: `${f.detail} (fallback ready)` })));
  const [filter, setFilter] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [lastExport, setLastExport] = useState('not exported this session');
  const [actionLog, setActionLog] = useState(() => readList(ACTION_KEY));
  const [exportEvents, setExportEvents] = useState(() => readList(EXPORT_KEY));
  const review = useMemo(() => validate(pack), [pack]);
  const digest = useMemo(() => checksum(JSON.stringify(pack)), [pack]);
  const issueCount = review.errors.length + review.warnings.length;
  const filteredGallery = gallery.filter((item) => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));
  const manifest = useMemo(() => [
    { kind: 'route pack', path: `content-packs/${pack.id}.route-pack.json`, checksum: checksum(JSON.stringify(pack)) },
    { kind: 'approval receipt', path: `content-packs/${pack.id}.approval-receipt.json`, checksum: checksum(`${pack.id}:receipt:${pack.title}`) },
    { kind: 'review checklist', path: `docs/reviews/${pack.id}.md`, checksum: checksum(`${pack.id}:checklist:${pack.scenes.length}:${pack.edges.length}`) }
  ], [pack]);
  const readySteps = [
    { label: 'Choose or import a pack', done: !!pack.id && !!pack.title },
    { label: 'Edit cards and route edges', done: pack.scenes.length > 1 && pack.edges.length > 0 },
    { label: 'Clear validation errors', done: review.errors.length === 0 },
    { label: 'Playtest once', done: transcript.length > 0 },
    { label: 'Export review receipts', done: review.status === 'ready' && exportEvents.length > 0 }
  ];
  const nextAction = readySteps.find((step) => !step.done) || { label: 'Ready for maintainer review', done: true };
  const latestExport = exportEvents[0];
  const queueCounts = queue.reduce((acc, item) => ({ ...acc, [item.status || 'queued']: (acc[item.status || 'queued'] || 0) + 1 }), {});

  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); setJsonText(JSON.stringify(pack, null, 2)); }, [pack]);
  useEffect(() => { localStorage.setItem(ACTION_KEY, JSON.stringify(actionLog.slice(0, 20))); }, [actionLog]);
  useEffect(() => { localStorage.setItem(EXPORT_KEY, JSON.stringify(exportEvents.slice(0, 20))); }, [exportEvents]);
  useEffect(() => {
    fetch('content-packs/index.json').then((r) => r.json()).then((d) => setGallery(d.packs || [])).catch(() => setGallery([]));
    fetch('content-packs/approval-receipts.json').then((r) => r.json()).then((d) => setReceipts(d.receipts || [])).catch(() => setReceipts([]));
    fetch('content-packs/review-queue.json').then((r) => r.json()).then((d) => setQueue(d.queue || [])).catch(() => setQueue([]));
    Promise.all([
      fetch('schemas/fixtures/route-pack.valid.json').then((r) => r.json()).then((data) => ({ label: 'Valid route pack', detail: 'Expected no blocking errors', ok: !validate(normalize(data)).errors.length })),
      fetch('schemas/fixtures/route-pack.invalid.json').then((r) => r.json()).then((data) => ({ label: 'Invalid route pack', detail: 'Expected at least one blocking error', ok: validate(normalize(data)).errors.length > 0 }))
    ]).then(setFixtures).catch(() => setFixtures(FALLBACK_FIXTURES));
  }, []);

  function logAction(type, detail) {
    setActionLog((old) => [{ at: new Date().toISOString(), type, detail }, ...old].slice(0, 20));
  }
  function packReceipt() { return { id: `${pack.id}.approval-receipt`, pack_id: pack.id, status: review.status, digest, counts: { quests: pack.quests.length, scenes: pack.scenes.length, npcs: pack.npcs.length, rewards: pack.rewards.length, edges: pack.edges.length }, errors: review.errors, warnings: review.warnings, transcript_count: transcript.length, export_count: exportEvents.length, boundary: 'public-safe fantasy tabletop-inspired content only' }; }
  function trackedDownload(name, data) {
    downloadJson(name, data);
    const event = { at: new Date().toISOString(), name, digest: checksum(JSON.stringify(data)), pack_id: pack.id };
    setExportEvents((old) => [event, ...old].slice(0, 20));
    setLastExport(`${name} at ${new Date().toLocaleTimeString()}`);
    logAction('export', `${name} downloaded`);
  }
  function exportAllReceipts() {
    trackedDownload(`${pack.id}.review-bundle.json`, { pack, approval_receipt: packReceipt(), manifest, transcript, action_log: actionLog });
  }
  function quickPlaytest() {
    const seed = [pack.scenes[0] && ['scene', pack.scenes[0]], pack.npcs[0] && ['npc', pack.npcs[0]], pack.rewards[0] && ['reward', pack.rewards[0]]].filter(Boolean);
    const entries = seed.map(([kind, card]) => ({ at: new Date().toISOString(), kind, id: card.id, title: card.title || card.id, note: card.text || card.clue || card.reward || 'quick playtest receipt' }));
    setTranscript((old) => [...entries, ...old].slice(0, 20));
    logAction('playtest', `${entries.length} quick receipt entries added`);
  }
  function play(kind, card) { setTranscript((old) => [{ at: new Date().toISOString(), kind, id: card.id, title: card.title || card.id, note: card.text || card.clue || card.reward || 'playtest step' }, ...old].slice(0, 20)); logAction('playtest', `${kind} ${card.title || card.id}`); }
  function patchList(kind, index, key, value) { setPack((old) => ({ ...old, [kind]: old[kind].map((item, i) => i === index ? { ...item, [key]: value } : item) })); }
  function addCard(kind) {
    const questId = pack.quests[0]?.id || '';
    const firstScene = pack.scenes[0]?.id || '';
    const secondScene = pack.scenes[1]?.id || firstScene;
    const cards = { quests: { id: `q_${pack.quests.length + 1}`, title: 'New quest', max_progress: 3 }, scenes: { id: `scene_${pack.scenes.length + 1}`, act: 'I', title: 'New scene', skill: 'perception', dc: 12, quest_id: questId, reward: 'clue', text: 'Describe a safe scene.' }, npcs: { id: `npc_${pack.npcs.length + 1}`, title: 'New helper', role: 'Guide', quest_id: questId, clue: 'Offer a useful clue.' }, rewards: { id: `reward_${pack.rewards.length + 1}`, title: 'New reward', text: 'Describe a small reward.', items: [], hp: 0, quest_id: '', clue: '', add: [], clear: [] }, edges: { id: `edge_${pack.edges.length + 1}`, from: firstScene, to: secondScene, label: 'next', condition: '' } };
    setPack((old) => ({ ...old, [kind]: [...old[kind], cards[kind]] }));
    logAction('edit', `Added ${kind.slice(0, -1)}`);
  }
  function removeCard(kind, index) { setPack((old) => ({ ...old, [kind]: old[kind].filter((_, i) => i !== index) })); logAction('edit', `Removed ${kind.slice(0, -1)}`); }
  function moveEdge(index, dir) { setPack((old) => { const next = [...old.edges]; const target = index + dir; if (target < 0 || target >= next.length) return old; [next[index], next[target]] = [next[target], next[index]]; return { ...old, edges: next }; }); logAction('route', `Moved edge ${index + 1}`); }
  function importJson() { const next = normalize(parse(jsonText)); setPack(next.id ? next : STARTER); logAction('import', `Imported ${next.id || 'starter fallback'}`); }
  function loadReviewed(item) { fetch(item.path).then((r) => r.json()).then((data) => { setPack(normalize(data)); setSelectedPack(item); setTranscript([]); setLastExport('not exported this session'); setExportEvents([]); setTab('overview'); logAction('gallery', `Loaded ${item.title}`); }).catch(() => {}); }
  function markQueue(id, status) { setQueue((old) => old.map((item) => item.id === id ? { ...item, status } : item)); logAction('queue', `${id} marked ${status}`); }

  return <div className="app studio-v24 studio-v25">
    <header className="v22-hero v23-hero v24-hero v25-hero">
      <div><p className="eyebrow">PorchQuest369 v0.9.4</p><h1>Creator Flow Studio</h1><p>Action completion, export receipts, review queue actions, and one current dashboard.</p></div>
      <div className={`hero-badge ${review.status}`}><span>{review.status === 'ready' ? 'Promotion Ready' : review.status === 'review' ? 'Needs Review' : 'Blocked'}</span><b>{digest}</b></div>
    </header>
    <section className="metric-row"><article className="metric"><span>Pack</span><b>{pack.title}</b></article><article className="metric"><span>Cards</span><b>{pack.quests.length} quests · {pack.scenes.length} scenes · {pack.edges.length} edges</b></article><article className={`metric ${issueCount ? 'warn' : 'ready'}`}><span>Validation</span><b>{review.errors.length} errors · {review.warnings.length} warnings</b></article><article className={transcript.length ? 'metric ready' : 'metric warn'}><span>Playtest</span><b>{transcript.length} receipt entries</b></article><article className={exportEvents.length ? 'metric ready' : 'metric warn'}><span>Exports</span><b>{exportEvents.length} session receipt(s)</b></article></section>
    <section className="flow-strip">{readySteps.map((step, index) => <article key={step.label} className={step.done ? 'done' : ''}><b>{index + 1}</b><span>{step.label}</span></article>)}</section>
    <nav className="v22-tabs">{['overview', 'editor', 'gallery', 'playtest', 'review', 'export', 'json'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</nav>

    {tab === 'overview' && <section className="dashboard-grid overview-v24 overview-v25"><article className="panel focus-card"><h2>Next Action</h2><p className={nextAction.done ? 'pass-text' : 'action-text'}>{nextAction.done ? '✓ ' : '→ '}{nextAction.label}</p><div className="button-row stack"><button onClick={quickPlaytest}>Quick Playtest Receipt</button><button onClick={() => setTab('editor')}>Open Editor</button><button onClick={exportAllReceipts}>Export Review Bundle</button><button onClick={() => setTab('export')}>Open Export Center</button></div></article><article className="panel"><h2>Validation</h2>{!issueCount && <p className="pass-text">✓ Promotion checks are clean.</p>}{!!review.errors.length && <ul className="issue-list">{review.errors.map((x) => <li className="error" key={x}>{x}</li>)}</ul>}{!!review.warnings.length && <ul className="issue-list">{review.warnings.map((x) => <li className="warning" key={x}>{x}</li>)}</ul>}</article><article className="panel"><h2>Playtest Momentum</h2>{!transcript.length && <Empty>No playtest receipts yet.</Empty>}{transcript.slice(0, 3).map((entry) => <div className="timeline-row" key={`${entry.at}-${entry.id}`}><b>{entry.kind}: {entry.title}</b><span>{new Date(entry.at).toLocaleTimeString()}</span></div>)}</article><article className="panel"><h2>Manifest Preview</h2>{manifest.map((file) => <div className="manifest-row" key={file.path}><b>{file.kind}</b><span>{file.path}</span><code>{file.checksum}</code></div>)}</article><article className="panel route-card"><h2>Route Graph</h2>{!pack.edges.length && <Empty>No route edges yet.</Empty>}{pack.edges.map((edge, index) => <div className="edge-row edge-row-v23 edge-row-v24" key={`${edge.id}-${index}`}><b>{edge.from}</b><span>{edge.label || 'next'}</span><b>{edge.to}</b>{edge.condition && <em>{edge.condition}</em>}</div>)}</article><article className="panel"><h2>Review Snapshot</h2><p>{queue.length ? `${queue.length} maintainer queue item(s)` : 'No maintainer queue items.'}</p><p>{Object.entries(queueCounts).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'No queue statuses yet.'}</p><p>{receipts.length ? `${receipts.length} approval receipts loaded.` : 'Approval timeline not loaded yet.'}</p><p><b>Last export:</b> {lastExport}</p></article><article className="panel"><h2>Fixture Checks</h2>{fixtures.map((f) => <div className={`fixture-row ${f.ok ? 'ok' : 'bad'}`} key={f.label}><b>{f.ok ? '✓' : '!'} {f.label}</b><span>{f.detail}</span></div>)}</article><article className="panel"><h2>Action Log</h2>{!actionLog.length && <Empty>No action receipts yet.</Empty>}{actionLog.slice(0, 5).map((entry) => <div className="timeline-row compact" key={`${entry.at}-${entry.detail}`}><b>{entry.type}</b><span>{entry.detail}</span></div>)}</article><article className="panel"><h2>Export Completion</h2>{!latestExport && <Empty>No export receipt this session.</Empty>}{latestExport && <div className="export-stamp"><b>{latestExport.name}</b><span>{new Date(latestExport.at).toLocaleTimeString()}</span><code>{latestExport.digest}</code></div>}<button onClick={exportAllReceipts}>Download Review Bundle</button></article></section>}

    {tab === 'editor' && <section className="panel editor-shell"><div className="section-head"><h2>Pack Editor</h2><div className="button-row"><button onClick={() => setPack(STARTER)}>Reset starter</button><button onClick={() => setPack({ ...pack, id: slug(`${pack.id}-copy`, 'pack-copy'), title: `${pack.title} Copy` })}>Clone pack</button></div></div><div className="form-grid"><Field label="Pack ID" value={pack.id} onChange={(v) => setPack({ ...pack, id: slug(v, 'pack') })} /><Field label="Title" value={pack.title} onChange={(v) => setPack({ ...pack, title: v })} /><Field label="Summary" value={pack.summary} area onChange={(v) => setPack({ ...pack, summary: v })} /></div>{['quests', 'scenes', 'npcs', 'rewards', 'edges'].map((kind) => <section className="editor-kind" key={kind}><div className="kind-head"><h3>{kind}</h3><button onClick={() => addCard(kind)}>Add {kind.slice(0, -1)}</button></div>{pack[kind].map((item, index) => <article className="edit-card" key={`${kind}-${item.id}-${index}`}><Field label="id" value={item.id} onChange={(v) => patchList(kind, index, 'id', slug(v, `${kind}_${index + 1}`))} />{Object.keys(item).filter((key) => key !== 'id').map((key) => <Field key={key} label={key} value={Array.isArray(item[key]) ? item[key].join(', ') : item[key]} area={['text', 'summary', 'clue'].includes(key)} onChange={(v) => patchList(kind, index, key, Array.isArray(item[key]) ? v.split(',').map((x) => x.trim()).filter(Boolean) : v)} />)}<div className="button-row"><button onClick={() => removeCard(kind, index)}>Remove</button>{kind === 'edges' && <><button onClick={() => moveEdge(index, -1)}>Up</button><button onClick={() => moveEdge(index, 1)}>Down</button></>}</div></article>)}</section>)}</section>}
    {tab === 'gallery' && <section className="panel"><div className="section-head"><h2>Reviewed Pack Gallery</h2><input placeholder="Search title, tag, status" value={filter} onChange={(e) => setFilter(e.target.value)} /></div><div className="gallery-grid">{filteredGallery.map((item) => <article className={`gallery-card ${selectedPack?.id === item.id ? 'selected' : ''}`} key={item.id}><div className="thumb">{item.thumbnail || item.id?.slice(0, 2)}</div><h3>{item.title}</h3><p>{item.summary}</p><p className="tag-line">{(item.tags || []).join(' · ')} {item.status ? `· ${item.status}` : ''}</p><div className="button-row"><button onClick={() => loadReviewed(item)}>Load pack</button><button onClick={() => setSelectedPack(item)}>Details</button></div></article>)}</div>{selectedPack && <article className="panel nested"><h3>{selectedPack.title}</h3><p>{selectedPack.summary}</p><p><b>Path:</b> {selectedPack.path}</p><p><b>Tags:</b> {(selectedPack.tags || []).join(', ') || 'none'}</p></article>}</section>}
    {tab === 'playtest' && <section className="dashboard-grid"><article className="panel"><h2>Scene Checks</h2>{pack.scenes.map((scene) => <div className="play-row" key={scene.id}><b>{scene.title}</b><span>{scene.skill} DC {scene.dc} · {scene.quest_id || 'no quest'}</span><button onClick={() => play('scene', scene)}>Play scene</button></div>)}</article><article className="panel"><h2>Helpers + Rewards</h2>{pack.npcs.map((npc) => <div className="play-row" key={npc.id}><b>{npc.title}</b><span>{npc.role} · {npc.clue}</span><button onClick={() => play('npc', npc)}>Ask helper</button></div>)}{pack.rewards.map((reward) => <div className="play-row" key={reward.id}><b>{reward.title}</b><span>{reward.text}</span><button onClick={() => play('reward', reward)}>Draw reward</button></div>)}</article><article className="panel wide-panel"><div className="section-head"><h2>Playtest Transcript</h2><button onClick={() => trackedDownload(`${pack.id}.playtest-transcript.json`, { pack_id: pack.id, entries: transcript })}>Export transcript</button></div>{!transcript.length && <Empty>No playtest entries yet.</Empty>}{transcript.map((entry) => <div className="timeline-row" key={`${entry.at}-${entry.id}`}><b>{entry.kind}: {entry.title}</b><span>{entry.at}</span><p>{entry.note}</p></div>)}</article></section>}
    {tab === 'review' && <section className="dashboard-grid"><article className="panel"><h2>Approval Timeline</h2>{receipts.map((r) => <div className="timeline-row" key={r.pack_id}><b>{r.title}</b><span>{r.status} · {r.reviewed_at}</span><p>{r.notes}</p></div>)}</article><article className="panel"><h2>Maintainer Queue</h2>{!queue.length && <Empty>No queued submissions.</Empty>}{queue.map((q) => <div className="queue-row" key={q.id}><b>{q.title}</b><span>{q.status} · {q.priority}</span><p>{q.note}</p><div className="button-row"><button onClick={() => markQueue(q.id, 'reviewed')}>Mark reviewed</button><button onClick={() => markQueue(q.id, 'deferred')}>Defer</button><button onClick={() => markQueue(q.id, 'needs_changes')}>Needs changes</button></div></div>)}</article><article className="panel"><h2>Session Action Log</h2>{actionLog.map((entry) => <div className="timeline-row" key={`${entry.at}-${entry.detail}`}><b>{entry.type}</b><span>{new Date(entry.at).toLocaleTimeString()}</span><p>{entry.detail}</p></div>)}</article></section>}
    {tab === 'export' && <section className="dashboard-grid"><article className="panel"><h2>Export Center</h2><p>Use these receipts when you are ready to submit a route pack for review.</p><div className="button-row stack"><button onClick={() => trackedDownload(`${pack.id}.route-pack.json`, pack)}>Download Route Pack</button><button onClick={() => trackedDownload(`${pack.id}.approval-receipt.json`, packReceipt())}>Download Approval Receipt</button><button onClick={() => trackedDownload(`${pack.id}.playtest-transcript.json`, { pack_id: pack.id, entries: transcript })}>Download Playtest Transcript</button><button onClick={exportAllReceipts}>Download Review Bundle</button></div></article><article className="panel"><h2>Manifest</h2>{manifest.map((file) => <div className="manifest-row" key={file.path}><b>{file.kind}</b><span>{file.path}</span><code>{file.checksum}</code></div>)}</article><article className="panel"><h2>Export Receipts</h2>{!exportEvents.length && <Empty>No exports this session.</Empty>}{exportEvents.map((event) => <div className="timeline-row" key={`${event.at}-${event.name}`}><b>{event.name}</b><span>{new Date(event.at).toLocaleTimeString()}</span><code>{event.digest}</code></div>)}</article></section>}
    {tab === 'json' && <section className="panel"><div className="section-head"><h2>JSON Tools</h2><div className="button-row"><button onClick={() => trackedDownload(`${pack.id}.route-pack.json`, pack)}>Export Pack</button><button onClick={importJson}>Import JSON</button></div></div><textarea className="json-box" value={jsonText} onChange={(e) => setJsonText(e.target.value)} /></section>}
  </div>;
}

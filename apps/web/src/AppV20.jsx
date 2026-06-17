import React, { useEffect, useMemo, useState } from 'react';

const PACK_KEY = 'porchquest369.routePack.v7';
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
  npcs: [
    { id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' }
  ],
  rewards: [
    { id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], hp: 0, quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.', add: [], clear: [] }
  ],
  edges: [
    { id: 'edge_1', from: 'porch_threshold', to: 'left_trail', label: 'next', condition: '' }
  ]
};

function parse(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}
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
function slug(value, fallback) {
  return String(value || fallback || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64) || fallback;
}
function idSet(list) {
  return new Set((list || []).map((item) => item.id).filter(Boolean));
}
function duplicates(list) {
  const seen = new Set();
  const duped = new Set();
  (list || []).forEach((item) => {
    if (!item.id) return;
    if (seen.has(item.id)) duped.add(item.id);
    seen.add(item.id);
  });
  return Array.from(duped);
}
function validate(pack) {
  const errors = [];
  const warnings = [];
  const sceneIds = idSet(pack.scenes);
  const questIds = idSet(pack.quests);
  if (pack.schema !== 'porchquest.route_pack.v1') errors.push('Schema must be porchquest.route_pack.v1.');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(pack.id || '')) errors.push('Pack ID must be slug-safe.');
  if (!pack.title) errors.push('Pack title is required.');
  ['quests', 'scenes', 'npcs', 'rewards', 'edges'].forEach((key) => duplicates(pack[key]).forEach((id) => errors.push(`${key} duplicate id: ${id}`)));
  if (pack.scenes.length < 2) warnings.push('Two or more scenes are recommended for promotion.');
  if (!pack.edges.length) warnings.push('At least one route edge is recommended.');
  pack.scenes.forEach((scene) => {
    if (!scene.id) errors.push('Scene missing ID.');
    if (!scene.title) warnings.push(`Scene ${scene.id || 'new'} is missing a title.`);
    if (!scene.text) warnings.push(`Scene ${scene.id || 'new'} is missing text.`);
    if (scene.quest_id && !questIds.has(scene.quest_id)) errors.push(`Scene ${scene.id || 'new'} links an unknown quest.`);
  });
  pack.npcs.forEach((npc) => {
    if (!npc.id) errors.push('NPC missing ID.');
    if (!npc.clue) warnings.push(`NPC ${npc.id || 'new'} is missing a clue.`);
    if (npc.quest_id && !questIds.has(npc.quest_id)) errors.push(`NPC ${npc.id || 'new'} links an unknown quest.`);
  });
  pack.rewards.forEach((reward) => {
    if (!reward.id) errors.push('Reward missing ID.');
    if (!reward.text) warnings.push(`Reward ${reward.id || 'new'} is missing text.`);
    if (reward.quest_id && !questIds.has(reward.quest_id)) errors.push(`Reward ${reward.id || 'new'} links an unknown quest.`);
  });
  pack.edges.forEach((edge, index) => {
    if (!edge.from || !edge.to) errors.push(`Edge ${index + 1} needs from and to.`);
    if (edge.from && !sceneIds.has(edge.from)) errors.push(`Edge ${index + 1} from scene not found.`);
    if (edge.to && !sceneIds.has(edge.to)) errors.push(`Edge ${index + 1} to scene not found.`);
  });
  return { errors, warnings, status: errors.length ? 'blocked' : warnings.length ? 'review' : 'ready' };
}
function checksum(input) {
  let h = 2166136261;
  const text = String(input || '');
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function downloadJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function loadPack() {
  const raw = localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v4');
  return normalize(parse(raw)) || STARTER;
}

export default function AppV20() {
  const [pack, setPack] = useState(loadPack);
  const [tab, setTab] = useState('overview');
  const [jsonText, setJsonText] = useState('');
  const [gallery, setGallery] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [filter, setFilter] = useState('');
  const review = useMemo(() => validate(pack), [pack]);
  const digest = useMemo(() => checksum(JSON.stringify(pack)), [pack]);
  const manifest = useMemo(() => [
    { kind: 'route pack', path: `content-packs/${pack.id}.route-pack.json`, checksum: checksum(JSON.stringify(pack)) },
    { kind: 'approval receipt', path: `content-packs/${pack.id}.approval-receipt.json`, checksum: checksum(`${pack.id}:receipt:${pack.title}`) },
    { kind: 'review checklist', path: `docs/reviews/${pack.id}.md`, checksum: checksum(`${pack.id}:checklist:${pack.scenes.length}:${pack.edges.length}`) }
  ], [pack]);
  const filteredGallery = gallery.filter((item) => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => {
    localStorage.setItem(PACK_KEY, JSON.stringify(pack));
    setJsonText(JSON.stringify(pack, null, 2));
  }, [pack]);
  useEffect(() => {
    fetch('content-packs/index.json').then((r) => r.json()).then((d) => setGallery(d.packs || [])).catch(() => setGallery([]));
    fetch('content-packs/approval-receipts.json').then((r) => r.json()).then((d) => setReceipts(d.receipts || [])).catch(() => setReceipts([]));
    fetch('content-packs/review-queue.json').then((r) => r.json()).then((d) => setQueue(d.queue || [])).catch(() => setQueue([]));
    Promise.all([
      fetch('schemas/fixtures/route-pack.valid.json').then((r) => r.json()).then((data) => ({ label: 'valid fixture', ok: !validate(normalize(data)).errors.length })),
      fetch('schemas/fixtures/route-pack.invalid.json').then((r) => r.json()).then((data) => ({ label: 'invalid fixture', ok: validate(normalize(data)).errors.length > 0 }))
    ]).then(setFixtures).catch(() => setFixtures([]));
  }, []);

  function patchList(kind, index, key, value) {
    setPack((old) => ({ ...old, [kind]: old[kind].map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  function addCard(kind) {
    const questId = pack.quests[0]?.id || '';
    const firstScene = pack.scenes[0]?.id || '';
    const secondScene = pack.scenes[1]?.id || firstScene;
    const cards = {
      quests: { id: `q_${pack.quests.length + 1}`, title: 'New quest', max_progress: 3 },
      scenes: { id: `scene_${pack.scenes.length + 1}`, act: 'I', title: 'New scene', skill: 'perception', dc: 12, quest_id: questId, reward: 'clue', text: 'Describe a safe scene.' },
      npcs: { id: `npc_${pack.npcs.length + 1}`, title: 'New helper', role: 'Guide', quest_id: questId, clue: 'Offer a useful clue.' },
      rewards: { id: `reward_${pack.rewards.length + 1}`, title: 'New reward', text: 'Describe a small reward.', items: [], hp: 0, quest_id: '', clue: '', add: [], clear: [] },
      edges: { id: `edge_${pack.edges.length + 1}`, from: firstScene, to: secondScene, label: 'next', condition: '' }
    };
    setPack((old) => ({ ...old, [kind]: [...old[kind], cards[kind]] }));
  }
  function removeCard(kind, index) {
    setPack((old) => ({ ...old, [kind]: old[kind].filter((_, i) => i !== index) }));
  }
  function importJson() {
    const next = normalize(parse(jsonText));
    setPack(next.id ? next : STARTER);
  }
  function loadReviewed(item) {
    fetch(item.path).then((r) => r.json()).then((data) => setPack(normalize(data))).catch(() => {});
  }

  return <div className="app studio-v20">
    <header className="hero clean-hero">
      <p className="eyebrow">PorchQuest369 v0.8.9</p>
      <h1>Unified Campaign Studio</h1>
      <p className="subtle">Single current dashboard: no recursive legacy version panels, no stacked wrapper chain, just the creator tools in one clean surface.</p>
    </header>

    <section className="panel status-strip">
      <article><span>Status</span><b className={`status ${review.status}`}>{review.status}</b></article>
      <article><span>Pack</span><b>{pack.title}</b></article>
      <article><span>Counts</span><b>{pack.scenes.length} scenes · {pack.edges.length} edges · {review.errors.length} errors · {review.warnings.length} warnings</b></article>
      <article><span>Digest</span><b>{digest}</b></article>
    </section>

    <nav className="tabs clean-tabs">
      {['overview', 'editor', 'gallery', 'review', 'json'].map((name) => <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}
    </nav>

    {tab === 'overview' && <section className="grid-2">
      <article className="panel"><h2>Validation</h2>{!review.errors.length && !review.warnings.length && <p>Promotion checks are clean.</p>}<ul className="issue-list">{review.errors.map((x) => <li className="error" key={x}>{x}</li>)}{review.warnings.map((x) => <li className="warning" key={x}>{x}</li>)}</ul></article>
      <article className="panel"><h2>Manifest Preview</h2>{manifest.map((file) => <div className="manifest-row" key={file.path}><b>{file.kind}</b><span>{file.path}</span><code>{file.checksum}</code></div>)}</article>
      <article className="panel"><h2>Route Graph</h2>{pack.edges.map((edge, index) => <div className="edge-row" key={`${edge.id}-${index}`}><b>{edge.from}</b><span>{edge.label || 'next'}</span><b>{edge.to}</b>{edge.condition && <em>{edge.condition}</em>}</div>)}</article>
      <article className="panel"><h2>Fixture Checks</h2>{fixtures.map((f) => <p className={f.ok ? 'pass-text' : 'warn-text'} key={f.label}>{f.ok ? '✓' : '!'} {f.label}</p>)}</article>
    </section>}

    {tab === 'editor' && <section className="panel"><h2>Pack Editor</h2><div className="form-grid"><label>Pack ID<input value={pack.id} onChange={(e) => setPack({ ...pack, id: slug(e.target.value, 'pack') })} /></label><label>Title<input value={pack.title} onChange={(e) => setPack({ ...pack, title: e.target.value })} /></label><label className="wide">Summary<textarea value={pack.summary} onChange={(e) => setPack({ ...pack, summary: e.target.value })} /></label></div>{['quests', 'scenes', 'npcs', 'rewards', 'edges'].map((kind) => <section className="editor-kind" key={kind}><div className="kind-head"><h3>{kind}</h3><button onClick={() => addCard(kind)}>Add {kind.slice(0, -1)}</button></div>{pack[kind].map((item, index) => <article className="edit-card" key={`${kind}-${item.id}-${index}`}><label>ID<input value={item.id || ''} onChange={(e) => patchList(kind, index, 'id', slug(e.target.value, `${kind}_${index + 1}`))} /></label>{Object.keys(item).filter((key) => key !== 'id').map((key) => <label key={key}>{key}<input value={Array.isArray(item[key]) ? item[key].join(', ') : item[key] || ''} onChange={(e) => patchList(kind, index, key, key === 'items' || key === 'add' || key === 'clear' ? e.target.value.split(',').map((x) => x.trim()).filter(Boolean) : e.target.value)} /></label>)}<button onClick={() => removeCard(kind, index)}>Remove</button></article>)}</section>)}</section>}

    {tab === 'gallery' && <section className="panel"><h2>Reviewed Pack Gallery</h2><input placeholder="Search title, tag, status" value={filter} onChange={(e) => setFilter(e.target.value)} /> <div className="gallery-grid">{filteredGallery.map((item) => <article className="gallery-card" key={item.id}><span className="thumb">{item.thumbnail || item.id?.slice(0, 2)}</span><h3>{item.title}</h3><p>{item.summary}</p><p>{(item.tags || []).join(' · ')} · {item.status || 'reviewed'}</p><button onClick={() => loadReviewed(item)}>Load reviewed pack</button></article>)}</div></section>}

    {tab === 'review' && <section className="grid-2"><article className="panel"><h2>Approval Timeline</h2>{receipts.map((r) => <div className="timeline-row" key={r.pack_id}><b>{r.title || r.pack_id}</b><span>{r.status} · {r.approved_at}</span><p>{r.notes}</p></div>)}</article><article className="panel"><h2>Maintainer Queue</h2>{queue.map((q) => <div className="queue-row" key={q.id}><b>{q.title}</b><span>{q.status} · {q.submitted_by}</span><p>{q.notes}</p></div>)}</article></section>}

    {tab === 'json' && <section className="panel"><h2>Route-Pack JSON</h2><textarea className="json-box" value={jsonText} onChange={(e) => setJsonText(e.target.value)} /><div className="button-row"><button onClick={importJson}>Import JSON</button><button onClick={() => downloadJson(`${pack.id}.route-pack.json`, pack)}>Export Pack</button><button onClick={() => downloadJson(`${pack.id}.approval-receipt.json`, { pack_id: pack.id, title: pack.title, status: review.status, errors: review.errors, warnings: review.warnings, digest })}>Export Approval Receipt</button><button onClick={() => setPack(STARTER)}>Reset Starter</button></div></section>}
  </div>;
}

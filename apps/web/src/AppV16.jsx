import React, { useEffect, useMemo, useState } from 'react';
import AppV15 from './AppV15.jsx';

const PACK_KEY = 'porchquest369.routePack.v7';
const API_KEY = 'porchquest369.apiBase';
const EMPTY_PACK = { schema: 'porchquest.route_pack.v1', id: 'empty-pack', title: 'Empty Pack', summary: '', quests: [], scenes: [], npcs: [], rewards: [], edges: [] };

function safePack(raw) {
  const source = raw && typeof raw === 'object' ? raw : EMPTY_PACK;
  return {
    schema: source.schema || 'porchquest.route_pack.v1',
    id: source.id || 'custom-pack',
    title: source.title || 'Custom Pack',
    summary: source.summary || '',
    quests: Array.isArray(source.quests) ? source.quests : [],
    scenes: Array.isArray(source.scenes) ? source.scenes : [],
    npcs: Array.isArray(source.npcs) ? source.npcs : [],
    rewards: Array.isArray(source.rewards) ? source.rewards : [],
    edges: Array.isArray(source.edges) ? source.edges : []
  };
}
function readPack() {
  try { return safePack(JSON.parse(localStorage.getItem(PACK_KEY) || '{}')); } catch { return EMPTY_PACK; }
}
function savePack(pack) { localStorage.setItem(PACK_KEY, JSON.stringify(safePack(pack))); }
function downloadJson(name, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function ids(items) { return new Set((items || []).map((item) => item.id).filter(Boolean)); }
function dupeIds(items) { const seen = new Set(); const dupes = new Set(); (items || []).forEach((item) => { if (seen.has(item.id)) dupes.add(item.id); seen.add(item.id); }); return Array.from(dupes); }
function validateSchema(pack, schema) {
  const errors = [];
  const warnings = [];
  if (!schema) warnings.push('Schema file is not loaded yet.');
  ['schema', 'id', 'title', 'quests', 'scenes', 'npcs', 'rewards'].forEach((key) => { if (!(key in pack)) errors.push(`missing ${key}`); });
  if (pack.schema !== 'porchquest.route_pack.v1') errors.push('schema must equal porchquest.route_pack.v1');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(pack.id || '')) errors.push('pack id must be slug-safe');
  const caps = { quests: 12, scenes: 24, npcs: 24, rewards: 24, edges: 48 };
  Object.entries(caps).forEach(([key, max]) => { if ((pack[key] || []).length > max) errors.push(`${key} exceeds ${max}`); });
  ['quests', 'scenes', 'npcs', 'rewards'].forEach((key) => dupeIds(pack[key]).forEach((id) => errors.push(`${key} duplicate id ${id}`)));
  const questIds = ids(pack.quests);
  const sceneIds = ids(pack.scenes);
  pack.scenes.forEach((scene) => { if (!scene.text) warnings.push(`scene ${scene.id || '(new)'} needs text`); if (scene.quest_id && !questIds.has(scene.quest_id)) warnings.push(`scene ${scene.id || '(new)'} links unknown quest`); if (scene.dc < 5 || scene.dc > 30) warnings.push(`scene ${scene.id || '(new)'} dc out of range`); });
  pack.npcs.forEach((npc) => { if (!npc.clue) warnings.push(`npc ${npc.id || '(new)'} needs clue`); if (npc.quest_id && !questIds.has(npc.quest_id)) warnings.push(`npc ${npc.id || '(new)'} links unknown quest`); });
  pack.rewards.forEach((reward) => { if (!reward.text) warnings.push(`reward ${reward.id || '(new)'} needs text`); if (reward.quest_id && !questIds.has(reward.quest_id)) warnings.push(`reward ${reward.id || '(new)'} links unknown quest`); });
  pack.edges.forEach((edge, index) => { if (!sceneIds.has(edge.from)) warnings.push(`edge ${index + 1} has unknown from scene`); if (!sceneIds.has(edge.to)) warnings.push(`edge ${index + 1} has unknown to scene`); });
  return { score: errors.length ? 'error' : warnings.length ? 'warning' : 'pass', errors, warnings };
}
function approvalReceipt(pack, validation) {
  return {
    schema: 'porchquest.approval_receipt.v1',
    created_at: new Date().toISOString(),
    pack_id: pack.id,
    title: pack.title,
    validation,
    counts: { quests: pack.quests.length, scenes: pack.scenes.length, npcs: pack.npcs.length, rewards: pack.rewards.length, edges: pack.edges.length },
    checklist: [
      { label: 'No blocking schema errors', ok: validation.errors.length === 0 },
      { label: 'At least two scenes', ok: pack.scenes.length >= 2 },
      { label: 'At least one route edge', ok: pack.edges.length >= 1 },
      { label: 'NPC clues reviewed', ok: pack.npcs.every((npc) => Boolean(npc.clue)) },
      { label: 'Playtest transcript exported', ok: false }
    ],
    boundary: 'Reviewed packs must avoid secrets, private data, real-world targeting, and unsupported claims.'
  };
}

export default function AppV16() {
  const [pack, setPack] = useState(readPack);
  const [schema, setSchema] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('all');
  const [apiBase, setApiBase] = useState(localStorage.getItem(API_KEY) || 'http://127.0.0.1:8787');
  const [message, setMessage] = useState('Ready.');
  const validation = useMemo(() => validateSchema(pack, schema), [pack, schema]);
  const receipt = useMemo(() => approvalReceipt(pack, validation), [pack, validation]);
  const tags = useMemo(() => ['all', ...Array.from(new Set(gallery.flatMap((p) => p.tags || [])))], [gallery]);
  const filtered = useMemo(() => gallery.filter((entry) => {
    const text = `${entry.id} ${entry.title} ${entry.summary}`.toLowerCase();
    const matchesText = !query || text.includes(query.toLowerCase());
    const matchesTag = tag === 'all' || (entry.tags || []).includes(tag);
    return matchesText && matchesTag;
  }), [gallery, query, tag]);

  useEffect(() => { fetch('schemas/route-pack.schema.json').then((res) => res.json()).then(setSchema).catch(() => setSchema(null)); }, []);
  useEffect(() => { fetch('content-packs/index.json').then((res) => res.json()).then((data) => setGallery(data.packs || [])).catch(() => setGallery([])); }, []);
  useEffect(() => { localStorage.setItem(API_KEY, apiBase); }, [apiBase]);

  function refreshCurrent() { setPack(readPack()); setMessage('Refreshed current editor pack.'); }
  function applyPack(next) { const normalized = safePack(next); savePack(normalized); setPack(normalized); window.dispatchEvent(new Event('storage')); setMessage(`Loaded ${normalized.title}. Reload editor view if needed.`); }
  async function loadReviewed(entry) { try { const data = await fetch(entry.path).then((res) => res.json()); applyPack(data); } catch { setMessage('Reviewed pack load failed.'); } }
  function moveEdge(index, delta) { const next = safePack(pack); const target = index + delta; if (target < 0 || target >= next.edges.length) return; const edges = [...next.edges]; const [edge] = edges.splice(index, 1); edges.splice(target, 0, edge); next.edges = edges; applyPack(next); }
  async function packageBackend() {
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/content-packs/${encodeURIComponent(pack.id)}/submission-package`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'package failed');
      downloadJson(`${pack.id}.submission-package.json`, data.package);
      setMessage(`Exported submission package for ${pack.id}.`);
    } catch (error) { setMessage(`Backend package failed: ${error.message}`); }
  }

  return <div className="app studio-v16">
    <header className="hero"><p className="eyebrow">PorchQuest369 v0.8.5</p><h1>Campaign Studio Submission Console</h1><p className="subtle">Schema validation, approval receipts, gallery filters, route-edge reorder, and backend branch-package export.</p></header>
    <section className="panel v16-grid"><div><h2>{pack.title}</h2><p>{pack.summary || 'No summary.'}</p><p className={`status ${validation.score}`}>{validation.score.toUpperCase()} · {validation.errors.length} errors · {validation.warnings.length} warnings</p><p className="subtle">Schema: {schema ? schema.title : 'not loaded'}</p></div><div className="button-row"><button onClick={refreshCurrent}>Refresh Current Pack</button><button onClick={() => downloadJson(`${pack.id}.approval-receipt.json`, receipt)}>Export Approval Receipt</button><button onClick={packageBackend}>Backend Submission Package</button></div></section>
    <section className="panel"><h2>Schema Validation Detail</h2><div className="issue-grid"><div><h3>Errors</h3>{validation.errors.length ? validation.errors.map((e) => <p className="issue error" key={e}>{e}</p>) : <p className="issue ok">No blocking errors.</p>}</div><div><h3>Warnings</h3>{validation.warnings.length ? validation.warnings.map((w) => <p className="issue warn" key={w}>{w}</p>) : <p className="issue ok">No warnings.</p>}</div></div></section>
    <section className="panel gallery"><h2>Reviewed Pack Gallery</h2><div className="form-grid"><label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="market, rain, starter..." /></label><label>Tag<select value={tag} onChange={(e) => setTag(e.target.value)}>{tags.map((name) => <option key={name}>{name}</option>)}</select></label></div><div className="gallery-grid">{filtered.map((entry) => <article className="gallery-card" key={entry.id}><h3>{entry.title}</h3><p>{entry.summary}</p><p className="subtle">{(entry.tags || []).join(' · ')}</p><button onClick={() => loadReviewed(entry)}>Load reviewed pack</button></article>)}</div></section>
    <section className="panel route-graph"><h2>Route Graph Polish</h2><p className="subtle">Move edges up/down to tune route order before export.</p><div className="route-flow">{pack.edges.map((edge, index) => <div className="route-edge reorder" key={`${edge.from}-${edge.to}-${index}`}><span>{edge.from}</span><b>{edge.label || 'next'}</b><span>{edge.to}</span><div className="button-row"><button onClick={() => moveEdge(index, -1)}>Up</button><button onClick={() => moveEdge(index, 1)}>Down</button></div></div>)}</div></section>
    <section className="panel backend-panel"><h2>Backend Package Settings</h2><label>API Base<input value={apiBase} onChange={(e) => setApiBase(e.target.value)} /></label><p>{message}</p></section>
    <section className="panel"><h2>Full Editor</h2><p className="subtle">The v0.8.4 editor remains below. Use Refresh Current Pack above after heavy edits.</p></section>
    <AppV15 />
  </div>;
}

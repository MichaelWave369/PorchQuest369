import React, { useEffect, useMemo, useState } from 'react';
import AppV17 from './AppV17.jsx';

const PACK_KEY = 'porchquest369.routePack.v7';
const EMPTY = { schema: 'porchquest.route_pack.v1', id: 'empty-pack', title: 'Empty Pack', summary: '', quests: [], scenes: [], npcs: [], rewards: [], edges: [] };
const FIXTURES = [
  { id: 'valid-starter', path: 'schemas/fixtures/route-pack.valid.json', label: 'Valid route pack' },
  { id: 'invalid-missing', path: 'schemas/fixtures/route-pack.invalid.json', label: 'Invalid route pack' }
];

function parse(raw) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
function normalize(raw) { const p = raw && typeof raw === 'object' ? raw : EMPTY; return { ...EMPTY, ...p, quests: Array.isArray(p.quests) ? p.quests : [], scenes: Array.isArray(p.scenes) ? p.scenes : [], npcs: Array.isArray(p.npcs) ? p.npcs : [], rewards: Array.isArray(p.rewards) ? p.rewards : [], edges: Array.isArray(p.edges) ? p.edges : [] }; }
function idSet(list) { return new Set((list || []).map((item) => item.id).filter(Boolean)); }
function dupes(list) { const seen = new Set(); return (list || []).map((x) => x.id).filter(Boolean).filter((id) => seen.has(id) || !seen.add(id)); }
function validate(pack) {
  const issues = [];
  const sceneIds = idSet(pack.scenes);
  const questIds = idSet(pack.quests);
  if (pack.schema !== 'porchquest.route_pack.v1') issues.push('schema must be porchquest.route_pack.v1');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(pack.id || '')) issues.push('id must be slug-safe');
  ['quests', 'scenes', 'npcs', 'rewards', 'edges'].forEach((key) => dupes(pack[key]).forEach((id) => issues.push(`${key} has duplicate id ${id}`)));
  pack.scenes.forEach((s) => { if (!s.title) issues.push(`scene ${s.id || 'new'} missing title`); if (!s.text) issues.push(`scene ${s.id || 'new'} missing text`); if (s.quest_id && !questIds.has(s.quest_id)) issues.push(`scene ${s.id || 'new'} links unknown quest`); });
  pack.npcs.forEach((n) => { if (!n.name && !n.title) issues.push(`npc ${n.id || 'new'} missing name`); if (!n.clue) issues.push(`npc ${n.id || 'new'} missing clue`); if (n.quest_id && !questIds.has(n.quest_id)) issues.push(`npc ${n.id || 'new'} links unknown quest`); });
  pack.rewards.forEach((r) => { if (!r.title) issues.push(`reward ${r.id || 'new'} missing title`); if (!r.text) issues.push(`reward ${r.id || 'new'} missing text`); if (r.quest_id && !questIds.has(r.quest_id)) issues.push(`reward ${r.id || 'new'} links unknown quest`); });
  pack.edges.forEach((e, i) => { if (!sceneIds.has(e.from) || !sceneIds.has(e.to)) issues.push(`edge ${i + 1} links unknown scene`); });
  return issues;
}
function manifest(pack) { const id = pack.id || 'route-pack'; return [{ path: `content-packs/${id}.route-pack.json`, kind: 'route pack' }, { path: `content-packs/${id}.approval-receipt.json`, kind: 'approval receipt' }, { path: `docs/reviews/${id}.md`, kind: 'maintainer checklist' }]; }
function compare(a, b, sort) { if (sort === 'status') return (a.status || '').localeCompare(b.status || '') || a.title.localeCompare(b.title); if (sort === 'tag') return ((a.tags || [])[0] || '').localeCompare((b.tags || [])[0] || '') || a.title.localeCompare(b.title); return a.title.localeCompare(b.title); }

export default function AppV18() {
  const [raw, setRaw] = useState(() => localStorage.getItem(PACK_KEY) || '');
  const [pack, setPack] = useState(() => normalize(parse(localStorage.getItem(PACK_KEY) || '')));
  const [syncedAt, setSyncedAt] = useState(new Date().toLocaleTimeString());
  const [gallery, setGallery] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [sort, setSort] = useState('title');
  const [query, setQuery] = useState('');
  const issues = useMemo(() => validate(pack), [pack]);
  const files = useMemo(() => manifest(pack), [pack]);
  const filteredGallery = useMemo(() => gallery.filter((g) => `${g.title} ${(g.tags || []).join(' ')} ${g.status || ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => compare(a, b, sort)), [gallery, query, sort]);

  function syncNow() { const nextRaw = localStorage.getItem(PACK_KEY) || ''; setRaw(nextRaw); setPack(normalize(parse(nextRaw))); setSyncedAt(new Date().toLocaleTimeString()); }
  useEffect(() => { const timer = window.setInterval(() => { const nextRaw = localStorage.getItem(PACK_KEY) || ''; if (nextRaw !== raw) { setRaw(nextRaw); setPack(normalize(parse(nextRaw))); setSyncedAt(new Date().toLocaleTimeString()); } }, 900); return () => window.clearInterval(timer); }, [raw]);
  useEffect(() => { fetch('content-packs/index.json').then((r) => r.json()).then((d) => setGallery(d.packs || [])).catch(() => setGallery([])); fetch('content-packs/approval-receipts.json').then((r) => r.json()).then((d) => setReceipts(d.receipts || [])).catch(() => setReceipts([])); }, []);

  return <div className="app studio-v18">
    <header className="hero"><p className="eyebrow">PorchQuest369 v0.8.7</p><h1>Live Submission Bridge</h1><p className="subtle">Live editor sync, zip manifest preview, approval timeline, schema fixtures, and gallery sorting.</p></header>
    <section className="panel v18-grid"><div><h2>Live State Bridge</h2><p><b>{pack.title}</b> · {pack.scenes.length} scenes · {pack.edges.length} edges · {issues.length} schema issues</p><p className="subtle">Last sync: {syncedAt}. The bridge polls the full editor save and refreshes this console automatically.</p></div><button onClick={syncNow}>Force Sync</button></section>
    <section className="panel"><h2>Zip Manifest Preview</h2><p className={issues.length ? 'status warning' : 'status pass'}>{issues.length ? `${issues.length} issue(s) before promotion` : 'Manifest ready for package export'}</p><div className="manifest-grid">{files.map((file) => <article className="manifest-card" key={file.path}><b>{file.kind}</b><span>{file.path}</span></article>)}</div>{issues.length ? <ul>{issues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}</section>
    <section className="panel"><h2>Approval Receipt Timeline</h2><div className="timeline">{receipts.map((r) => <article className="timeline-card" key={`${r.pack_id}-${r.approved_at}`}><b>{r.title || r.pack_id}</b><span>{r.status || 'reviewed'} · {r.approved_at || 'undated'}</span><p>{r.summary || 'No summary.'}</p></article>)}</div></section>
    <section className="panel"><h2>Schema Validation Fixtures</h2><div className="fixture-grid">{FIXTURES.map((f) => <article className="fixture-card" key={f.id}><b>{f.label}</b><span>{f.path}</span></article>)}</div></section>
    <section className="panel gallery"><h2>Gallery Sort Controls</h2><div className="button-row"><input placeholder="Search title, tag, status" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="title">Title</option><option value="tag">First tag</option><option value="status">Status</option></select></div><div className="gallery-grid">{filteredGallery.map((g) => <article className="gallery-card" key={g.id}><div className={`thumb thumb-${g.thumbnail || 'pack'}`}>{g.thumbnail || 'pack'}</div><h3>{g.title}</h3><p>{g.summary}</p><p className="subtle">{(g.tags || []).join(' · ')} · {g.status || 'reviewed'}</p></article>)}</div></section>
    <section className="panel"><h2>Full Studio</h2><p className="subtle">The proven v0.8.6 editor and packaging console remain below. The bridge above watches its saved route pack live.</p></section>
    <AppV17 />
  </div>;
}

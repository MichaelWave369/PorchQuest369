import React, { useEffect, useMemo, useState } from 'react';
import AppV18 from './AppV18.jsx';

const PACK_KEY = 'porchquest369.routePack.v7';
const EMPTY = { schema: 'porchquest.route_pack.v1', id: 'empty-pack', title: 'Empty Pack', summary: '', quests: [], scenes: [], npcs: [], rewards: [], edges: [] };
const FIXTURES = [
  { id: 'valid-starter', path: 'schemas/fixtures/route-pack.valid.json', expected: 'pass', label: 'Valid starter fixture' },
  { id: 'invalid-missing', path: 'schemas/fixtures/route-pack.invalid.json', expected: 'fail', label: 'Invalid missing-fields fixture' }
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
  if (!pack.title) issues.push('title is required');
  ['quests', 'scenes', 'npcs', 'rewards', 'edges'].forEach((key) => dupes(pack[key]).forEach((id) => issues.push(`${key} has duplicate id ${id}`)));
  pack.scenes.forEach((s) => { if (!s.id) issues.push('scene missing id'); if (!s.title) issues.push(`scene ${s.id || 'new'} missing title`); if (!s.text) issues.push(`scene ${s.id || 'new'} missing text`); if (s.quest_id && !questIds.has(s.quest_id)) issues.push(`scene ${s.id || 'new'} links unknown quest`); });
  pack.npcs.forEach((n) => { if (!n.id) issues.push('npc missing id'); if (!n.name && !n.title) issues.push(`npc ${n.id || 'new'} missing name`); if (!n.clue) issues.push(`npc ${n.id || 'new'} missing clue`); if (n.quest_id && !questIds.has(n.quest_id)) issues.push(`npc ${n.id || 'new'} links unknown quest`); });
  pack.rewards.forEach((r) => { if (!r.id) issues.push('reward missing id'); if (!r.title) issues.push(`reward ${r.id || 'new'} missing title`); if (!r.text) issues.push(`reward ${r.id || 'new'} missing text`); if (r.quest_id && !questIds.has(r.quest_id)) issues.push(`reward ${r.id || 'new'} links unknown quest`); });
  pack.edges.forEach((e, i) => { if (!e.from || !e.to) issues.push(`edge ${i + 1} needs from and to`); if (!sceneIds.has(e.from) || !sceneIds.has(e.to)) issues.push(`edge ${i + 1} links unknown scene`); });
  return issues;
}
function checksum(input) { let h = 2166136261; const text = String(input || ''); for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
function manifest(pack) { const id = pack.id || 'route-pack'; return [{ path: `content-packs/${id}.route-pack.json`, kind: 'route pack', checksum: checksum(JSON.stringify(pack)) }, { path: `content-packs/${id}.approval-receipt.json`, kind: 'approval receipt', checksum: checksum(`${id}:receipt:${pack.title}`) }, { path: `docs/reviews/${id}.md`, kind: 'maintainer checklist', checksum: checksum(`${id}:checklist:${pack.scenes.length}:${pack.edges.length}`) }]; }
function counts(pack) { return { quests: pack.quests.length, scenes: pack.scenes.length, npcs: pack.npcs.length, rewards: pack.rewards.length, edges: pack.edges.length }; }
function diffCounts(current, baseline) { const a = counts(current); const b = counts(baseline || EMPTY); return Object.keys(a).map((key) => ({ key, current: a[key], reviewed: b[key], delta: a[key] - b[key] })); }

export default function AppV19() {
  const [raw, setRaw] = useState(() => localStorage.getItem(PACK_KEY) || '');
  const [pack, setPack] = useState(() => normalize(parse(localStorage.getItem(PACK_KEY) || '')));
  const [gallery, setGallery] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [baseline, setBaseline] = useState(EMPTY);
  const [selectedReceipt, setSelectedReceipt] = useState('blackwood-starter');
  const [syncedAt, setSyncedAt] = useState(new Date().toLocaleTimeString());
  const issues = useMemo(() => validate(pack), [pack]);
  const files = useMemo(() => manifest(pack), [pack]);
  const digest = useMemo(() => checksum(files.map((f) => `${f.path}:${f.checksum}`).join('|')), [files]);
  const receipt = receipts.find((r) => r.pack_id === selectedReceipt) || receipts[0];
  const baselinePath = gallery.find((g) => g.id === selectedReceipt)?.path;
  const diffs = useMemo(() => diffCounts(pack, baseline), [pack, baseline]);

  function syncNow() { const nextRaw = localStorage.getItem(PACK_KEY) || ''; setRaw(nextRaw); setPack(normalize(parse(nextRaw))); setSyncedAt(new Date().toLocaleTimeString()); }

  useEffect(() => { const timer = window.setInterval(() => { const nextRaw = localStorage.getItem(PACK_KEY) || ''; if (nextRaw !== raw) { setRaw(nextRaw); setPack(normalize(parse(nextRaw))); setSyncedAt(new Date().toLocaleTimeString()); } }, 800); return () => window.clearInterval(timer); }, [raw]);
  useEffect(() => { fetch('content-packs/index.json').then((r) => r.json()).then((d) => setGallery(d.packs || [])).catch(() => setGallery([])); fetch('content-packs/approval-receipts.json').then((r) => r.json()).then((d) => setReceipts(d.receipts || [])).catch(() => setReceipts([])); fetch('content-packs/review-queue.json').then((r) => r.json()).then((d) => setQueue(d.queue || [])).catch(() => setQueue([])); }, []);
  useEffect(() => { Promise.all(FIXTURES.map((f) => fetch(f.path).then((r) => r.json()).then((data) => { const issueCount = validate(normalize(data)).length; const result = issueCount ? 'fail' : 'pass'; return { ...f, result, issueCount, ok: result === f.expected }; }).catch(() => ({ ...f, result: 'missing', issueCount: 1, ok: false })))).then(setFixtures); }, []);
  useEffect(() => { if (!baselinePath) return; fetch(baselinePath).then((r) => r.json()).then((d) => setBaseline(normalize(d))).catch(() => setBaseline(EMPTY)); }, [baselinePath]);

  return <div className="app studio-v19">
    <header className="hero"><p className="eyebrow">PorchQuest369 v0.8.8</p><h1>Maintainer Review Bridge</h1><p className="subtle">Automated fixture checks, manifest checksums, approval diffs, recent queue scaffolding, and the live studio underneath.</p></header>
    <section className="panel v19-grid"><article><h2>Live Pack Digest</h2><p><b>{pack.title}</b> · {issues.length ? `${issues.length} issue(s)` : 'promotion clean'} · synced {syncedAt}</p><p className="checksum">manifest:{digest}</p></article><button onClick={syncNow}>Force Sync</button></section>
    <section className="panel"><h2>Automated Fixture Checks</h2><div className="fixture-grid">{fixtures.map((f) => <article className={`fixture-card ${f.ok ? 'pass' : 'warning'}`} key={f.id}><b>{f.label}</b><span>expected {f.expected} · got {f.result}</span><p>{f.ok ? 'Fixture check passed.' : `${f.issueCount} issue(s) or missing fixture.`}</p></article>)}</div></section>
    <section className="panel"><h2>Zip Manifest Checksums</h2><div className="manifest-grid">{files.map((file) => <article className="manifest-card" key={file.path}><b>{file.kind}</b><span>{file.path}</span><code>{file.checksum}</code></article>)}</div></section>
    <section className="panel"><h2>Approval Receipt Diff</h2><div className="button-row"><select value={selectedReceipt} onChange={(e) => setSelectedReceipt(e.target.value)}>{receipts.map((r) => <option key={r.pack_id} value={r.pack_id}>{r.title || r.pack_id}</option>)}</select><span className="subtle">{receipt?.status || 'reviewed'} · {receipt?.approved_at || 'undated'}</span></div><div className="diff-grid">{diffs.map((d) => <article className="diff-card" key={d.key}><b>{d.key}</b><span>current {d.current} · reviewed {d.reviewed}</span><p>{d.delta === 0 ? 'No count change.' : `${d.delta > 0 ? '+' : ''}${d.delta} from reviewed pack.`}</p></article>)}</div></section>
    <section className="panel"><h2>Maintainer Review Queue</h2><div className="queue-grid">{queue.map((q) => <article className="queue-card" key={q.id}><b>{q.title}</b><span>{q.status} · {q.submitted_by}</span><p>{q.notes}</p></article>)}</div></section>
    <section className="panel"><h2>Full Studio Stack</h2><p className="subtle">The v0.8.7 live bridge, package console, and full editor remain below this maintainer layer.</p></section>
    <AppV18 />
  </div>;
}

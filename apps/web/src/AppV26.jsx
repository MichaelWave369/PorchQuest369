import React, { useEffect, useMemo, useState } from 'react';
import AppV25 from './AppV25.jsx';

const PACK_KEY = 'porchquest369.routePack.v7';
const PLAYER_KEY = 'porchquest369.playerRun.v1';
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
const HEROES = [
  { id: 'lantern_seeker', name: 'Lantern Seeker', gift: 'Reads quiet signs', bonus: 3, item: 'small lantern' },
  { id: 'porch_warden', name: 'Porch Warden', gift: 'Keeps steady under pressure', bonus: 2, item: 'porch charm' },
  { id: 'hill_scout', name: 'Hill Scout', gift: 'Finds safe trails', bonus: 3, item: 'trail ribbon' },
  { id: 'memory_bard', name: 'Memory Bard', gift: 'Turns clues into stories', bonus: 2, item: 'story bead' }
];
function parse(raw) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
function normalize(raw) {
  const src = raw && typeof raw === 'object' ? raw : STARTER;
  return { ...STARTER, ...src, quests: Array.isArray(src.quests) ? src.quests : [], scenes: Array.isArray(src.scenes) ? src.scenes : [], npcs: Array.isArray(src.npcs) ? src.npcs : [], rewards: Array.isArray(src.rewards) ? src.rewards : [], edges: Array.isArray(src.edges) ? src.edges : [] };
}
function loadPack() { return normalize(parse(localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v4')) || STARTER); }
function checksum(text) { let h = 2166136261; String(text || '').split('').forEach((ch) => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }); return (h >>> 0).toString(16).padStart(8, '0'); }
function downloadJson(name, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function makeRun(pack, hero = HEROES[0]) {
  const firstScene = pack.edges[0]?.from || pack.scenes[0]?.id || '';
  return { started_at: new Date().toISOString(), hero, current_scene: firstScene, hp: 10, clues: [], inventory: [hero.item].filter(Boolean), conditions: [], quest_progress: {}, log: [{ at: new Date().toISOString(), type: 'start', text: `${hero.name} steps onto ${pack.title}.` }] };
}
function findById(list, id) { return (list || []).find((item) => item.id === id); }

export default function AppV26() {
  const [mode, setMode] = useState('play');
  const [pack, setPack] = useState(loadPack);
  const [hero, setHero] = useState(HEROES[0]);
  const [run, setRun] = useState(() => parse(localStorage.getItem(PLAYER_KEY))?.current_scene ? parse(localStorage.getItem(PLAYER_KEY)) : null);
  const [gallery, setGallery] = useState([]);
  const currentScene = useMemo(() => findById(pack.scenes, run?.current_scene) || pack.scenes[0], [pack, run]);
  const routeEdges = useMemo(() => (pack.edges || []).filter((edge) => edge.from === currentScene?.id), [pack, currentScene]);
  const relatedNpc = useMemo(() => pack.npcs.find((npc) => npc.quest_id && npc.quest_id === currentScene?.quest_id) || pack.npcs[0], [pack, currentScene]);
  const relatedReward = useMemo(() => pack.rewards.find((reward) => reward.quest_id && reward.quest_id === currentScene?.quest_id) || pack.rewards[0], [pack, currentScene]);
  const digest = useMemo(() => checksum(JSON.stringify(pack)), [pack]);
  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); }, [pack]);
  useEffect(() => { if (run) localStorage.setItem(PLAYER_KEY, JSON.stringify(run)); }, [run]);
  useEffect(() => { fetch('content-packs/index.json').then((r) => r.json()).then((d) => setGallery(d.packs || [])).catch(() => setGallery([])); }, []);
  function append(type, text, patch = {}) {
    setRun((old) => ({ ...old, ...patch, log: [{ at: new Date().toISOString(), type, text }, ...(old?.log || [])].slice(0, 40) }));
  }
  function startAdventure(selected = hero) { setHero(selected); setRun(makeRun(pack, selected)); setMode('play'); }
  function rollScene() {
    if (!run || !currentScene) return;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + (run.hero?.bonus || 0);
    const dc = Number(currentScene.dc || 10);
    const success = total >= dc;
    const clue = success ? (currentScene.reward || `${currentScene.title} clue`) : `partial clue from ${currentScene.title}`;
    const conditions = success ? run.conditions.filter((x) => x !== 'uncertain') : Array.from(new Set([...(run.conditions || []), 'uncertain']));
    const progress = { ...(run.quest_progress || {}) };
    if (currentScene.quest_id) progress[currentScene.quest_id] = (progress[currentScene.quest_id] || 0) + (success ? 2 : 1);
    append('scene', `${currentScene.title}: rolled ${roll} + ${run.hero?.bonus || 0} = ${total} vs DC ${dc}. ${success ? 'Success.' : 'Partial success.'}`, { clues: Array.from(new Set([...(run.clues || []), clue])), conditions, quest_progress: progress });
  }
  function askHelper() {
    if (!run || !relatedNpc) return;
    append('helper', `${relatedNpc.title} offers: ${relatedNpc.clue}`, { clues: Array.from(new Set([...(run.clues || []), relatedNpc.clue])) });
  }
  function drawReward() {
    if (!run || !relatedReward) return;
    const items = Array.from(new Set([...(run.inventory || []), ...(relatedReward.items || []), relatedReward.title].filter(Boolean)));
    const clues = relatedReward.clue ? Array.from(new Set([...(run.clues || []), relatedReward.clue])) : run.clues;
    const conditions = Array.from(new Set([...(run.conditions || []), ...(relatedReward.add || [])])).filter((c) => !(relatedReward.clear || []).includes(c));
    append('reward', `${relatedReward.title}: ${relatedReward.text}`, { inventory: items, clues, conditions, hp: Math.min(12, (run.hp || 10) + Number(relatedReward.hp || 0)) });
  }
  function travel(edge) {
    if (!run || !edge) return;
    const next = findById(pack.scenes, edge.to);
    append('travel', `Followed ${edge.label || 'next'} to ${next?.title || edge.to}.`, { current_scene: edge.to });
  }
  function endAdventure() {
    if (!run) return;
    append('ending', `${run.hero?.name || 'Hero'} ended the session at ${currentScene?.title || 'the route'}.`);
  }
  function receipt() { return { id: `${pack.id}.adventure-receipt`, pack_id: pack.id, pack_title: pack.title, digest, hero: run?.hero, hp: run?.hp, current_scene: run?.current_scene, clues: run?.clues || [], inventory: run?.inventory || [], conditions: run?.conditions || [], quest_progress: run?.quest_progress || {}, log: run?.log || [], exported_at: new Date().toISOString() }; }
  function loadReviewed(item) { fetch(item.path).then((r) => r.json()).then((data) => { const next = normalize(data); setPack(next); setRun(null); setMode('play'); }).catch(() => {}); }
  if (mode === 'studio') return <div><div className="player-topbar"><button onClick={() => setMode('play')}>← Back to Play Mode</button><strong>Creator Studio</strong></div><AppV25 /></div>;
  return <div className="app player-v1">
    <header className="player-hero"><div><p className="eyebrow">PorchQuest369 v1.0</p><h1>Play Adventure</h1><p>Pick a hero, step into the route, roll scenes, ask helpers, draw rewards, and keep an adventure receipt.</p></div><div className="hero-badge ready"><span>Current Pack</span><b>{pack.title}</b><code>{digest}</code></div></header>
    <nav className="player-actions"><button onClick={() => setRun(makeRun(pack, hero))}>{run ? 'Restart Adventure' : 'Start Adventure'}</button><button onClick={() => setMode('studio')}>Open Creator Studio</button>{run && <button onClick={() => downloadJson(`${pack.id}.adventure-receipt.json`, receipt())}>Export Adventure Receipt</button>}</nav>
    {!run && <section className="player-grid"><article className="panel hero-select"><h2>Choose Your Character</h2><div className="hero-picks">{HEROES.map((option) => <button key={option.id} className={hero.id === option.id ? 'selected' : ''} onClick={() => setHero(option)}><b>{option.name}</b><span>{option.gift}</span><small>+{option.bonus} checks · starts with {option.item}</small></button>)}</div><button className="primary" onClick={() => startAdventure(hero)}>Start as {hero.name}</button></article><article className="panel"><h2>Reviewed Adventures</h2>{gallery.map((item) => <div className="gallery-mini" key={item.id}><b>{item.title}</b><span>{(item.tags || []).join(' · ')}</span><button onClick={() => loadReviewed(item)}>Load and play</button></div>)}</article></section>}
    {run && <section className="player-grid active-run"><article className="panel scene-panel"><p className="eyebrow">Act {currentScene?.act || 'I'} · {currentScene?.skill || 'check'} DC {currentScene?.dc || 10}</p><h2>{currentScene?.title || 'Scene'}</h2><p>{currentScene?.text || 'The route waits for your next choice.'}</p><div className="button-row"><button onClick={rollScene}>Roll Scene Check</button>{relatedNpc && <button onClick={askHelper}>Ask {relatedNpc.title}</button>}{relatedReward && <button onClick={drawReward}>Draw Reward</button>}</div></article><article className="panel route-panel"><h2>Continue Route</h2>{!routeEdges.length && <p className="empty-note">No route edge from this scene yet. You can end the session or open Creator Studio to add more edges.</p>}{routeEdges.map((edge) => <button className="route-choice" key={edge.id || `${edge.from}-${edge.to}`} onClick={() => travel(edge)}><b>{edge.label || 'next'}</b><span>{edge.from} → {edge.to}</span>{edge.condition && <small>{edge.condition}</small>}</button>)}<button onClick={endAdventure}>End Session Here</button></article><article className="panel sheet-panel"><h2>{run.hero?.name}</h2><p>{run.hero?.gift}</p><div className="stat-grid"><span>HP <b>{run.hp}</b></span><span>Bonus <b>+{run.hero?.bonus}</b></span><span>Scene <b>{currentScene?.title}</b></span></div><h3>Inventory</h3><p>{(run.inventory || []).join(', ') || 'none yet'}</p><h3>Clues</h3><p>{(run.clues || []).join(' · ') || 'none yet'}</p><h3>Conditions</h3><p>{(run.conditions || []).join(', ') || 'clear'}</p></article><article className="panel log-panel"><div className="section-head"><h2>Adventure Receipt</h2><button onClick={() => downloadJson(`${pack.id}.adventure-receipt.json`, receipt())}>Download</button></div>{(run.log || []).map((entry) => <div className="timeline-row" key={`${entry.at}-${entry.text}`}><b>{entry.type}</b><span>{new Date(entry.at).toLocaleTimeString()}</span><p>{entry.text}</p></div>)}</article></section>}
  </div>;
}

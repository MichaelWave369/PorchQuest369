import React, { useEffect, useMemo, useState } from 'react';
import AppV25 from './AppV25.jsx';

const PACK_KEY = 'porchquest369.routePack.v7';
const PLAYER_KEY = 'porchquest369.playerRun.v5';

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
    { id: 'left_trail', act: 'I', title: 'Left Trail', skill: 'survival', dc: 12, quest_id: 'q_side_1', reward: 'trail clue', text: 'A soft path bends toward a small helper sign.' },
    { id: 'lantern_window', act: 'II', title: 'Lantern Window', skill: 'insight', dc: 13, quest_id: 'q_main_1', reward: 'window clue', text: 'A warm square of glass blinks like it remembers you.' }
  ],
  npcs: [{ id: 'old_joss', title: 'Old Joss', role: 'Porchkeeper', quest_id: 'q_main_1', clue: 'Old Joss marks the kind route.' }],
  rewards: [{ id: 'blue_thread', title: 'Blue Thread', text: 'Progress the key route.', items: ['blue thread'], hp: 0, quest_id: 'q_main_1', clue: 'Blue thread points toward the key route.', add: [], clear: [] }],
  edges: [
    { id: 'edge_1', from: 'porch_threshold', to: 'left_trail', label: 'take the left trail', condition: '' },
    { id: 'edge_2', from: 'left_trail', to: 'lantern_window', label: 'follow the lantern glow', condition: '' },
    { id: 'edge_3', from: 'lantern_window', to: 'porch_threshold', label: 'return to the porch', condition: 'loop back' }
  ]
};

const HEROES = [
  { id: 'lantern_seeker', name: 'Lantern Seeker', gift: 'Reads quiet signs', bonus: 3, item: 'small lantern' },
  { id: 'porch_warden', name: 'Porch Warden', gift: 'Keeps steady under pressure', bonus: 2, item: 'porch charm' },
  { id: 'hill_scout', name: 'Hill Scout', gift: 'Finds safe trails', bonus: 3, item: 'trail ribbon' },
  { id: 'memory_bard', name: 'Memory Bard', gift: 'Turns clues into stories', bonus: 2, item: 'story bead' }
];

function parseJson(raw, fallback = {}) {
  try { return JSON.parse(raw || ''); } catch { return fallback; }
}

function normalizePack(raw) {
  const src = raw && typeof raw === 'object' ? raw : STARTER;
  return {
    ...STARTER,
    ...src,
    quests: Array.isArray(src.quests) ? src.quests : [],
    scenes: Array.isArray(src.scenes) ? src.scenes : [],
    npcs: Array.isArray(src.npcs) ? src.npcs : [],
    rewards: Array.isArray(src.rewards) ? src.rewards : [],
    edges: Array.isArray(src.edges) ? src.edges : []
  };
}

function loadSavedPack() {
  const saved = parseJson(localStorage.getItem(PACK_KEY) || localStorage.getItem('porchquest369.routePack.v4'), null);
  return normalizePack(saved || STARTER);
}

function checksum(text) {
  let hash = 2166136261;
  String(text || '').split('').forEach((character) => {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function findById(list, id) {
  return (list || []).find((item) => item.id === id);
}

function validAuthoredEdges(pack) {
  return (pack.edges || []).filter((edge) => findById(pack.scenes, edge.from) && findById(pack.scenes, edge.to));
}

function generatedEdges(pack) {
  const scenes = pack.scenes || [];
  if (validAuthoredEdges(pack).length || scenes.length < 2) return [];
  return scenes.map((scene, index) => {
    const next = scenes[(index + 1) % scenes.length];
    return {
      id: `safe-${scene.id}-${next.id}`,
      from: scene.id,
      to: next.id,
      label: `continue to ${next.title}`,
      condition: 'safe route'
    };
  });
}

function playableEdges(pack) {
  return validAuthoredEdges(pack).length ? validAuthoredEdges(pack) : generatedEdges(pack);
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

function createRun(pack, hero) {
  const edges = playableEdges(pack);
  const firstScene = edges?.[0]?.from || pack.scenes?.[0]?.id || '';
  return {
    version: '1.0.4',
    started_at: new Date().toISOString(),
    hero,
    current_scene: firstScene,
    hp: 10,
    turn: 1,
    ended: false,
    turn_actions: { scene: false, helper: false, reward: false },
    visited: firstScene ? [firstScene] : [],
    clues: [],
    inventory: [hero.item].filter(Boolean),
    conditions: [],
    quest_progress: {},
    last_export: null,
    log: [{ at: new Date().toISOString(), type: 'start', text: `${hero.name} steps onto ${pack.title}.`, turn: 1 }]
  };
}

function actionProgress(actions = {}) {
  return ['scene', 'helper', 'reward'].filter((key) => actions[key]).length;
}

function nextActionLabel(run) {
  if (!run) return 'Choose pack and hero';
  if (run.ended) return 'Export receipt or start again';
  if (!run.turn_actions?.scene) return 'Roll the scene check';
  if (!run.turn_actions?.helper) return 'Ask a helper';
  if (!run.turn_actions?.reward) return 'Draw a reward';
  return 'Choose a route';
}

export default function AppV30() {
  const [mode, setMode] = useState('play');
  const [pack, setPack] = useState(loadSavedPack);
  const [hero, setHero] = useState(HEROES[0]);
  const [run, setRun] = useState(() => {
    const saved = parseJson(localStorage.getItem(PLAYER_KEY), null);
    return saved?.current_scene ? saved : null;
  });
  const [gallery, setGallery] = useState([]);
  const [lobbyMessage, setLobbyMessage] = useState('Choose a reviewed pack and hero, then press Start Adventure.');
  const [lastExport, setLastExport] = useState(null);

  const digest = useMemo(() => checksum(JSON.stringify(pack)), [pack]);
  const edgesForPlay = useMemo(() => playableEdges(pack), [pack]);
  const currentScene = useMemo(() => findById(pack.scenes, run?.current_scene) || pack.scenes[0], [pack, run]);
  const routeEdges = useMemo(() => edgesForPlay.filter((edge) => edge.from === currentScene?.id), [edgesForPlay, currentScene]);
  const relatedNpc = useMemo(() => pack.npcs.find((npc) => npc.quest_id === currentScene?.quest_id) || pack.npcs[0], [pack, currentScene]);
  const relatedReward = useMemo(() => pack.rewards.find((reward) => reward.quest_id === currentScene?.quest_id) || pack.rewards[0], [pack, currentScene]);
  const turnComplete = actionProgress(run?.turn_actions) >= 3;
  const latestReceipt = run?.log?.[0];
  const graphHealth = useMemo(() => {
    if (!pack.scenes.length) return { tone: 'bad', status: 'missing scenes', detail: 'This pack needs at least one scene before play.' };
    const authored = validAuthoredEdges(pack);
    const safe = generatedEdges(pack);
    if (authored.length) return { tone: 'good', status: 'authored route', detail: `${authored.length} authored route edge(s) ready.` };
    if (safe.length) return { tone: 'warn', status: 'safe route mode', detail: `${safe.length} safe route choice(s) generated from scene order.` };
    return { tone: 'warn', status: 'linear fallback', detail: 'No authored route edges yet. Player Mode will still offer safe choices when possible.' };
  }, [pack]);

  useEffect(() => { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); }, [pack]);
  useEffect(() => { if (run) localStorage.setItem(PLAYER_KEY, JSON.stringify(run)); }, [run]);
  useEffect(() => {
    fetch('content-packs/index.json')
      .then((response) => response.json())
      .then((data) => setGallery(data.packs || []))
      .catch(() => setGallery([]));
  }, []);

  function writeReceipt(type, text, patch = {}) {
    setRun((old) => ({
      ...old,
      ...patch,
      log: [
        { at: new Date().toISOString(), type, text, scene: old?.current_scene, turn: old?.turn || 1 },
        ...(old?.log || [])
      ].slice(0, 80)
    }));
  }

  function openLobby(message = 'Choose a reviewed pack and hero, then press Start Adventure.') {
    setRun(null);
    localStorage.removeItem(PLAYER_KEY);
    setLobbyMessage(message);
    setMode('play');
  }

  function startAdventure(selectedHero = hero) {
    setHero(selectedHero);
    setRun(createRun(pack, selectedHero));
    setLobbyMessage('Adventure started. Roll, ask, reward, route, and keep the receipt.');
    setMode('play');
  }

  function restartAdventure() {
    setRun(createRun(pack, run?.hero || hero));
  }

  function rollScene() {
    if (!run || !currentScene || run.ended) return;
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + (run.hero?.bonus || 0);
    const dc = Number(currentScene.dc || 10);
    const success = total >= dc;
    const clue = success ? (currentScene.reward || `${currentScene.title} clue`) : `partial clue from ${currentScene.title}`;
    const conditions = success ? (run.conditions || []).filter((condition) => condition !== 'uncertain') : Array.from(new Set([...(run.conditions || []), 'uncertain']));
    const questProgress = { ...(run.quest_progress || {}) };
    if (currentScene.quest_id) questProgress[currentScene.quest_id] = (questProgress[currentScene.quest_id] || 0) + (success ? 2 : 1);
    writeReceipt('scene', `${currentScene.title}: rolled ${roll} + ${run.hero?.bonus || 0} = ${total} vs DC ${dc}. ${success ? 'Success.' : 'Partial success.'}`, {
      clues: Array.from(new Set([...(run.clues || []), clue])),
      conditions,
      quest_progress: questProgress,
      turn_actions: { ...(run.turn_actions || {}), scene: true }
    });
  }

  function askHelper() {
    if (!run || run.ended) return;
    if (!relatedNpc) return writeReceipt('helper', 'No helper is present. You listen to the porch and keep moving.', { turn_actions: { ...(run.turn_actions || {}), helper: true } });
    writeReceipt('helper', `${relatedNpc.title} offers: ${relatedNpc.clue}`, {
      clues: Array.from(new Set([...(run.clues || []), relatedNpc.clue])),
      turn_actions: { ...(run.turn_actions || {}), helper: true }
    });
  }

  function drawReward() {
    if (!run || run.ended) return;
    if (!relatedReward) return writeReceipt('reward', 'No reward is ready. You steady yourself and mark the turn complete.', { turn_actions: { ...(run.turn_actions || {}), reward: true } });
    const inventory = Array.from(new Set([...(run.inventory || []), ...(relatedReward.items || []), relatedReward.title].filter(Boolean)));
    const clues = relatedReward.clue ? Array.from(new Set([...(run.clues || []), relatedReward.clue])) : run.clues || [];
    const conditions = Array.from(new Set([...(run.conditions || []), ...(relatedReward.add || [])])).filter((condition) => !(relatedReward.clear || []).includes(condition));
    writeReceipt('reward', `${relatedReward.title}: ${relatedReward.text}`, {
      inventory,
      clues,
      conditions,
      hp: Math.min(12, (run.hp || 10) + Number(relatedReward.hp || 0)),
      turn_actions: { ...(run.turn_actions || {}), reward: true }
    });
  }

  function travel(edge) {
    if (!run || !edge || run.ended || !turnComplete) return;
    const next = findById(pack.scenes, edge.to);
    writeReceipt('travel', `Followed ${edge.label || 'next'} to ${next?.title || edge.to}.`, {
      current_scene: edge.to,
      turn: (run.turn || 1) + 1,
      turn_actions: { scene: false, helper: false, reward: false },
      visited: Array.from(new Set([...(run.visited || []), edge.to]))
    });
  }

  function endAdventure() {
    if (!run) return;
    writeReceipt('ending', `${run.hero?.name || 'Hero'} ended the session at ${currentScene?.title || 'the route'}.`, { ended: true });
  }

  function receipt() {
    return {
      id: `${pack.id}.adventure-receipt`,
      pack_id: pack.id,
      pack_title: pack.title,
      digest,
      hero: run?.hero,
      hp: run?.hp,
      turn: run?.turn,
      ended: Boolean(run?.ended),
      current_scene: run?.current_scene,
      visited: run?.visited || [],
      clues: run?.clues || [],
      inventory: run?.inventory || [],
      conditions: run?.conditions || [],
      quest_progress: run?.quest_progress || {},
      log: run?.log || [],
      exported_at: new Date().toISOString()
    };
  }

  function exportReceipt() {
    const exported = { at: new Date().toISOString(), file: `${pack.id}.adventure-receipt.json`, turn: run?.turn || 0, entries: run?.log?.length || 0 };
    setLastExport(exported);
    setRun((old) => old ? { ...old, last_export: exported } : old);
    downloadJson(exported.file, receipt());
  }

  function loadReviewed(item) {
    fetch(item.path)
      .then((response) => response.json())
      .then((data) => {
        setPack(normalizePack(data));
        setRun(null);
        localStorage.removeItem(PLAYER_KEY);
        setLobbyMessage(`${item.title} loaded. Pick a hero and start when ready.`);
        setMode('play');
      })
      .catch(() => setLobbyMessage('Could not load that pack yet. Try another reviewed pack.'));
  }

  function loadFreshStarter(startNow = false) {
    fetch('content-packs/blackwood-starter.route-pack.json')
      .then((response) => response.json())
      .then((data) => {
        const next = normalizePack(data);
        setPack(next);
        if (startNow) setRun(createRun(next, hero));
        else openLobby('Fresh reviewed starter loaded. Pick a hero and start when ready.');
      })
      .catch(() => {
        setPack(STARTER);
        if (startNow) setRun(createRun(STARTER, hero));
        else openLobby('Local starter loaded. Pick a hero and start when ready.');
      });
  }

  if (mode === 'studio') {
    return <div>
      <div className="player-topbar">
        <button onClick={() => setMode('play')}>Back to Play Mode</button>
        <strong>Creator Studio</strong>
      </div>
      <AppV25 />
    </div>;
  }

  return <div className="app player-v1 player-v101 player-v102 player-v103 player-v104">
    <header className="player-hero">
      <div>
        <p className="eyebrow">PorchQuest369 v1.0.4</p>
        <h1>Play Adventure</h1>
        <p>Pick a pack, pick a hero, take turns, follow routes, and keep a clean adventure receipt.</p>
      </div>
      <div className="hero-badge ready">
        <span>Current Pack</span>
        <b>{pack.title}</b>
        <code>{digest}</code>
        <small>{graphHealth.status}</small>
      </div>
    </header>

    <nav className="player-actions">
      <button onClick={() => openLobby('Choose a different reviewed pack or hero, then start again.')}>{run ? 'Change Pack / Hero' : 'Choose Pack / Hero'}</button>
      {run && <button onClick={restartAdventure}>Restart This Pack</button>}
      <button onClick={() => loadFreshStarter(false)}>Load Fresh Starter</button>
      {!run && <button onClick={() => loadFreshStarter(true)}>Start Recommended Adventure</button>}
      <button onClick={() => setMode('studio')}>Open Creator Studio</button>
      {run && <button onClick={exportReceipt}>Export Adventure Receipt</button>}
    </nav>

    {!run && <section className="player-grid lobby-grid">
      <article className="panel how-play">
        <h2>How to Play</h2>
        <p>{lobbyMessage}</p>
        <ol>
          <li>Pick a reviewed adventure pack.</li>
          <li>Pick a hero card.</li>
          <li>Press Start Adventure.</li>
          <li>Each turn: roll, ask, reward, route.</li>
          <li>Export the receipt when you stop.</li>
        </ol>
        <div className={`route-health ${graphHealth.tone}`}>
          <b>{graphHealth.status}</b>
          <span>{graphHealth.detail}</span>
        </div>
      </article>

      <article className="panel hero-select">
        <h2>Choose Your Character</h2>
        <div className="hero-picks">
          {HEROES.map((option) => <button key={option.id} className={hero.id === option.id ? 'selected' : ''} onClick={() => setHero(option)}>
            <b>{option.name}</b>
            <span>{option.gift}</span>
            <small>+{option.bonus} checks · starts with {option.item}</small>
          </button>)}
        </div>
        <div className="selection-summary">
          <b>Ready to start</b>
          <span>{hero.name} entering {pack.title}</span>
          <small>{pack.scenes.length} scenes · {pack.edges.length} authored edges · {edgesForPlay.length} playable routes · {graphHealth.status}</small>
        </div>
        <button className="primary start-big" onClick={() => startAdventure(hero)}>Start Adventure as {hero.name}</button>
      </article>

      <article className="panel pack-select">
        <h2>Choose Adventure Pack</h2>
        <div className="gallery-mini current">
          <b>{pack.title}</b>
          <span>Current loaded pack · {pack.scenes.length} scenes · {pack.edges.length} authored edges</span>
          <small>{graphHealth.detail}</small>
          <button onClick={() => startAdventure(hero)}>Play this pack</button>
        </div>
        {gallery.map((item) => <div className="gallery-mini" key={item.id}>
          <b>{item.title}</b>
          <span>{(item.tags || []).join(' · ')}</span>
          <button onClick={() => loadReviewed(item)}>Load this pack</button>
        </div>)}
      </article>
    </section>}

    {run && <section className="player-grid active-run">
      <article className="panel table-status">
        <h2>Turn {run.turn || 1}: {nextActionLabel(run)}</h2>
        <p>{run.ended ? 'Session ended. Export your receipt or restart when ready.' : 'Complete the table actions, then choose a route to advance the turn.'}</p>
        <div className="turn-track">
          <span className={run.turn_actions?.scene ? 'done' : ''}>1 Roll</span>
          <span className={run.turn_actions?.helper ? 'done' : ''}>2 Ask</span>
          <span className={run.turn_actions?.reward ? 'done' : ''}>3 Reward</span>
          <span className={turnComplete ? 'done' : ''}>4 Route</span>
        </div>
        {latestReceipt && <div className="last-outcome">
          <b>Last table note</b>
          <span>{latestReceipt.text}</span>
        </div>}
      </article>

      <article className="panel scene-panel">
        <p className="eyebrow">Act {currentScene?.act || 'I'} · {currentScene?.skill || 'check'} DC {currentScene?.dc || 10}</p>
        <h2>{currentScene?.title || 'Scene'}</h2>
        <p>{currentScene?.text || 'The route waits quietly.'}</p>
        <div className="table-buttons">
          <button className={run.turn_actions?.scene ? 'complete' : ''} onClick={rollScene} disabled={run.ended}>Roll Scene Check</button>
          <button className={run.turn_actions?.helper ? 'complete' : ''} onClick={askHelper} disabled={run.ended}>Ask {relatedNpc?.title || 'Helper'}</button>
          <button className={run.turn_actions?.reward ? 'complete' : ''} onClick={drawReward} disabled={run.ended}>Draw Reward</button>
        </div>
      </article>

      <article className="panel route-panel">
        <h2>Choose Route</h2>
        <p>{turnComplete ? 'Route choices are unlocked.' : 'Finish Roll, Ask, and Reward to unlock route choices.'}</p>
        <div className="route-choice-grid">
          {routeEdges.map((edge) => {
            const next = findById(pack.scenes, edge.to);
            return <button key={edge.id} onClick={() => travel(edge)} disabled={run.ended || !turnComplete}>
              <b>{edge.label || 'next'}</b>
              <span>{currentScene?.title || edge.from} → {next?.title || edge.to}</span>
              {edge.condition && <small>{edge.condition}</small>}
            </button>;
          })}
          {!routeEdges.length && <button onClick={endAdventure} disabled={run.ended}>End Session Here</button>}
        </div>
      </article>

      <article className="panel hero-sheet">
        <h2>{run.hero?.name}</h2>
        <p>{run.hero?.gift}</p>
        <div className="sheet-grid">
          <span><b>HP</b>{run.hp}</span>
          <span><b>Bonus</b>+{run.hero?.bonus || 0}</span>
          <span><b>Scene</b>{currentScene?.title || run.current_scene}</span>
          <span><b>Visited</b>{(run.visited || []).length}</span>
        </div>
        <h3>Inventory</h3>
        <p>{(run.inventory || []).join(', ') || 'none yet'}</p>
        <h3>Clues</h3>
        <p>{(run.clues || []).join(', ') || 'none yet'}</p>
        <h3>Conditions</h3>
        <p>{(run.conditions || []).join(', ') || 'clear'}</p>
        {lastExport && <p className="export-note">Last export: {lastExport.file} · {new Date(lastExport.at).toLocaleTimeString()}</p>}
      </article>

      <article className="panel receipt-panel wide-panel">
        <div className="panel-title-row">
          <h2>Adventure Receipt</h2>
          <div className="button-row">
            <button onClick={endAdventure} disabled={run.ended}>End Session</button>
            <button onClick={exportReceipt}>Download</button>
          </div>
        </div>
        <div className="receipt-list">
          {(run.log || []).map((entry, index) => <div className="receipt-entry" key={`${entry.at}-${index}`}>
            <b>{entry.type}</b>
            <small>{new Date(entry.at).toLocaleTimeString()} · turn {entry.turn || 1}</small>
            <p>{entry.text}</p>
          </div>)}
        </div>
      </article>
    </section>}
  </div>;
}

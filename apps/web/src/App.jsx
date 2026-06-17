import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const STATIC_PLAY = import.meta.env.VITE_STATIC_PLAY === '1';
const STORAGE_KEY = 'porchquest369.browserCampaign.v2';
const LEGACY_STORAGE_KEY = 'porchquest369.browserCampaign.v1';

const CLASS_PRESETS = {
  'Lantern-Seeker': {
    hp: 12,
    hp_max: 12,
    ac: 12,
    stats: { str: 10, dex: 12, con: 11, int: 11, wis: 13, cha: 12 },
    skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp']
  },
  'Porch Warden': {
    hp: 15,
    hp_max: 15,
    ac: 14,
    stats: { str: 13, dex: 10, con: 13, int: 10, wis: 12, cha: 11 },
    skills: { stealth: 0, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['oiled cloak', 'warden badge', 'lantern shield', 'hemp rope', '8 gp']
  },
  'Hill Scout': {
    hp: 11,
    hp_max: 11,
    ac: 13,
    stats: { str: 10, dex: 14, con: 11, int: 10, wis: 13, cha: 10 },
    skills: { stealth: 3, perception: 2, persuasion: 0, arcana: 0, survival: 3 },
    inventory: ['hooded cloak', 'shortbow', 'trail chalk', 'snare wire', '7 gp']
  },
  'Memory Bard': {
    hp: 10,
    hp_max: 10,
    ac: 12,
    stats: { str: 9, dex: 12, con: 10, int: 12, wis: 11, cha: 15 },
    skills: { stealth: 1, perception: 1, persuasion: 3, arcana: 1, survival: 0 },
    inventory: ['story lute', 'silver quill', 'memory ribbon', 'travel journal', '12 gp']
  }
};

function StatPill({ label, value }) {
  return <div className="stat-pill"><span>{label}</span><strong>{value}</strong></div>;
}

function Panel({ title, icon: Icon, children }) {
  return <section className="panel">
    <h2>{Icon ? <Icon size={18} /> : null}{title}</h2>
    {children}
  </section>;
}

const fallbackCampaign = {
  id: 'browser-demo',
  campaign_name: 'Lanterns Under Blackwood Hill',
  location: 'The Infinite Porch',
  turn: 0,
  player: {
    name: 'Mikey', class_name: 'Lantern-Seeker', background: 'Porch-Touched', level: 1, hp: 12, hp_max: 12, ac: 12,
    stats: { str: 10, dex: 12, con: 11, int: 11, wis: 13, cha: 12 },
    skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp']
  },
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key before midnight', type: 'main', status: 'open' },
    { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", type: 'side', status: 'open' },
    { id: 'q_mystery_1', title: 'Learn why every door on Blackwood Hill remembers lies', type: 'mystery', status: 'open' }
  ],
  world: {
    nodes: {
      infinite_porch: { id: 'infinite_porch', title: 'The Infinite Porch', summary: 'A porch between worlds. Its boards creak like old pages.' },
      blackwood_hill: { id: 'blackwood_hill', title: 'Blackwood Hill', summary: 'A rain-dark hill where blue lanterns glow between the trees.' },
      old_joss: { id: 'old_joss', title: 'Old Joss', summary: 'A porchkeeper with a candle-stub pipe and too many almost-answers.' }
    },
    edges: []
  },
  pending_patches: [],
  log: [{ role: 'dm', content: "Rain taps the roof of a porch that should not exist. Beyond the steps, Blackwood Hill glows with blue lanterns between the trees.\n\nA) Step toward Blackwood Hill.\nB) Question Old Joss.\nC) Inspect the porch.", ts: '' }]
};

function cloneCampaign(seed = fallbackCampaign) {
  return JSON.parse(JSON.stringify(seed));
}

function normalizeCampaign(raw) {
  const campaign = { ...cloneCampaign(), ...(raw || {}) };
  campaign.player = { ...cloneCampaign().player, ...(raw?.player || {}) };
  campaign.player.stats = { ...cloneCampaign().player.stats, ...(raw?.player?.stats || {}) };
  campaign.player.skills = { ...cloneCampaign().player.skills, ...(raw?.player?.skills || {}) };
  campaign.player.inventory = raw?.player?.inventory || campaign.player.inventory || [];
  campaign.quests = raw?.quests || campaign.quests || [];
  campaign.world = raw?.world || campaign.world || { nodes: {}, edges: [] };
  campaign.world.nodes = campaign.world.nodes || {};
  campaign.world.edges = campaign.world.edges || [];
  campaign.pending_patches = raw?.pending_patches || [];
  campaign.log = raw?.log || campaign.log || [];
  return campaign;
}

function loadBrowserCampaign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return normalizeCampaign(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load browser campaign', err);
  }
  return cloneCampaign();
}

function saveBrowserCampaign(campaign) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCampaign(campaign)));
  } catch (err) {
    console.warn('Could not save browser campaign', err);
  }
}

function rollCheck({ expr = '1d20+2', mod = 2, dc = 12, label = 'Quick Check' } = {}) {
  const raw = Math.floor(Math.random() * 20) + 1;
  const total = raw + mod;
  let outcome = total >= dc ? 'success' : 'failure';
  if (raw === 20) outcome = 'critical success';
  if (raw === 1) outcome = 'critical failure';
  return {
    expr,
    label,
    raw,
    mod,
    dc,
    total,
    outcome,
    detail: `${raw} + ${mod} = ${total} vs DC ${dc}`
  };
}

function actionProfile(action, campaign) {
  const lower = action.toLowerCase();
  const skills = campaign?.player?.skills || {};
  if (/sneak|hide|quiet|shadow/.test(lower)) return { skill: 'stealth', mod: skills.stealth || 0, dc: 13, label: 'Stealth Check' };
  if (/inspect|look|search|listen|clue|lantern|door|porch/.test(lower)) return { skill: 'perception', mod: skills.perception || 0, dc: 12, label: 'Perception Check' };
  if (/talk|ask|question|persuade|convince|joss/.test(lower)) return { skill: 'persuasion', mod: skills.persuasion || 0, dc: 12, label: 'Persuasion Check' };
  if (/rune|spell|magic|arcane|sigil|curse/.test(lower)) return { skill: 'arcana', mod: skills.arcana || 0, dc: 14, label: 'Arcana Check' };
  if (/track|forest|trail|hill|survive|camp/.test(lower)) return { skill: 'survival', mod: skills.survival || 0, dc: 12, label: 'Survival Check' };
  return { skill: 'wisdom', mod: 2, dc: 12, label: 'Adventurer Check' };
}

function localNarration(action, roll) {
  const lower = action.toLowerCase();
  const strong = roll.outcome.includes('success');
  const critical = roll.outcome.includes('critical');

  if (/lantern/.test(lower)) {
    return strong
      ? 'Your lantern-stub warms in your palm. The blue lanterns answer one by one, revealing a muddy trail of tiny bootprints leading up Blackwood Hill.'
      : 'The lanterns flicker away from your gaze. You catch only one detail before the rain swallows it: someone has tied black thread around each post.';
  }
  if (/joss|talk|ask|question/.test(lower)) {
    return strong
      ? 'Old Joss studies you, then nods once. "Doors remember lies," he says, "but keys remember mercy. Take the left trail when the hill asks your name."'
      : 'Old Joss smiles without warmth. "Not every question wants to be rescued," he says, and the porch boards knock three times beneath your boots.';
  }
  if (/porch|inspect|search|look/.test(lower)) {
    return strong
      ? 'Between two warped boards you find a brass tooth from a broken key. It hums when pointed toward Blackwood Hill.'
      : 'The porch creaks like it almost wants to speak, but the sound folds back into the storm.';
  }
  if (/sneak|hide|quiet/.test(lower)) {
    return strong
      ? 'You slip between rain and shadow. Nothing sees you except a moth with blue fire in its wings.'
      : 'A loose board betrays you with a sharp crack. Something under the hill turns its attention toward the porch.';
  }
  if (/hill|forest|trail/.test(lower)) {
    return strong
      ? 'You find the safer path: fern, root, lantern-glow. The hill does not welcome you, but it allows your next step.'
      : 'The trail doubles back on itself. For a moment, the porch appears ahead of you and behind you at the same time.';
  }

  return critical && strong
    ? 'The world opens around your choice. For one heartbeat you can feel the true map beneath the story, and one safe path shines forward.'
    : strong
      ? 'Your choice lands cleanly. The storm thins, the porch steadies, and the next clue comes into reach.'
      : 'Your choice still matters, but the hill asks for a price. The air tightens, and a hidden clock ticks louder.';
}

function nodePatch(id, title, summary, reason) {
  return {
    id: `${id}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    type: 'upsert_node',
    node: { id, title, summary },
    reason
  };
}

function proposeWorldPatches(action, world = {}) {
  const lower = action.toLowerCase();
  const nodes = world.nodes || {};
  const patches = [];

  if (/lantern/.test(lower) && !nodes.blue_lanterns) {
    patches.push(nodePatch('blue_lanterns', 'Blue Lanterns', 'Cold-burning lanterns that reveal tracks only after a risky choice.', 'The player investigated lantern signs.'));
  }
  if (/key|brass|porch/.test(lower) && !nodes.brass_key_tooth) {
    patches.push(nodePatch('brass_key_tooth', 'Brass Key Tooth', 'A broken piece of a missing porch key. It points toward unresolved truths.', 'The player searched the porch/key mystery.'));
  }
  if (/hill|forest|trail/.test(lower) && !nodes.left_trail) {
    patches.push(nodePatch('left_trail', 'The Left Trail', 'A root-laced path Old Joss says to take when the hill asks your name.', 'The player pushed toward Blackwood Hill.'));
  }
  if (/moth|fire|wing/.test(lower) && !nodes.blue_fire_moth) {
    patches.push(nodePatch('blue_fire_moth', 'Blue-Fire Moth', 'A tiny watcher with flame-blue wings that appears when stealth changes the path.', 'The player invoked hidden/quiet movement.'));
  }

  return patches;
}

function applyPatch(world = {}, patch) {
  if (!patch || patch.type !== 'upsert_node' || !patch.node?.id) return world;
  return {
    ...world,
    nodes: { ...(world.nodes || {}), [patch.node.id]: patch.node },
    edges: world.edges || []
  };
}

function resolveBrowserTurn(campaign, action) {
  const profile = actionProfile(action, campaign);
  const roll = rollCheck({ expr: `1d20+${profile.mod}`, mod: profile.mod, dc: profile.dc, label: profile.label });
  const patches = proposeWorldPatches(action, campaign.world);
  const patchNote = patches.length ? `\n\nCanon proposals: ${patches.length} new world update${patches.length === 1 ? '' : 's'} waiting for your approval.` : '';
  const dmText = `${localNarration(action, roll)}\n\nRoll: ${roll.detail} · ${roll.outcome}${patchNote}\n\nA) Press forward.\nB) Ask one careful question.\nC) Mark this clue in the ledger.`;
  const next = normalizeCampaign({
    ...campaign,
    turn: (campaign.turn || 0) + 1,
    pending_patches: [...(campaign.pending_patches || []), ...patches],
    log: [
      ...(campaign.log || []),
      { role: 'player', content: action, ts: new Date().toISOString() },
      { role: 'dm', content: dmText, ts: new Date().toISOString() }
    ]
  });
  saveBrowserCampaign(next);
  return { campaign: next, roll };
}

export default function App({ icons }) {
  const { Dice5, ScrollText, Backpack, Map, Sparkles } = icons;
  const [campaign, setCampaign] = useState(null);
  const [action, setAction] = useState('I inspect the blue lanterns for clues.');
  const [status, setStatus] = useState('Loading...');
  const [lastRoll, setLastRoll] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [characterDraft, setCharacterDraft] = useState({ name: 'Mikey', class_name: 'Lantern-Seeker', background: 'Porch-Touched' });

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function commitCampaign(next, message = 'Saved.') {
    const normalized = normalizeCampaign(next);
    setCampaign(normalized);
    if (STATIC_PLAY || !apiOnline) saveBrowserCampaign(normalized);
    setStatus(message);
  }

  async function ensureCampaign() {
    if (STATIC_PLAY) {
      setApiOnline(false);
      const loaded = loadBrowserCampaign();
      setCampaign(loaded);
      setCharacterDraft({ name: loaded.player.name, class_name: loaded.player.class_name, background: loaded.player.background || 'Porch-Touched' });
      setStatus('Instant play mode: saved in this browser.');
      return;
    }

    try {
      await api('/api/health');
      setApiOnline(true);
      const list = await api('/api/campaigns');
      if (list.campaigns?.length) {
        const loaded = await api(`/api/campaigns/${list.campaigns[0].id}`);
        const normalized = normalizeCampaign(loaded.campaign);
        setCampaign(normalized);
        setCharacterDraft({ name: normalized.player.name, class_name: normalized.player.class_name, background: normalized.player.background || 'Porch-Touched' });
      } else {
        const created = await api('/api/campaigns', { method: 'POST', body: JSON.stringify({ player_name: 'Mikey' }) });
        const normalized = normalizeCampaign(created.campaign);
        setCampaign(normalized);
        setCharacterDraft({ name: normalized.player.name, class_name: normalized.player.class_name, background: normalized.player.background || 'Porch-Touched' });
      }
      setStatus('API connected');
    } catch (err) {
      setApiOnline(false);
      const loaded = loadBrowserCampaign();
      setCampaign(loaded);
      setCharacterDraft({ name: loaded.player.name, class_name: loaded.player.class_name, background: loaded.player.background || 'Porch-Touched' });
      setStatus('Browser play mode: start the FastAPI backend for server saves.');
    }
  }

  useEffect(() => { ensureCampaign(); }, []);

  async function submitAction(e) {
    e.preventDefault();
    const clean = action.trim();
    if (!clean || !campaign) return;

    if (STATIC_PLAY || !apiOnline) {
      const result = resolveBrowserTurn(campaign, clean);
      setCampaign(result.campaign);
      setLastRoll(result.roll);
      setAction('');
      setStatus(STATIC_PLAY ? 'Instant play mode: saved in this browser.' : 'Browser play mode: local turn resolved.');
      return;
    }

    setStatus('Resolving turn...');
    const result = await api(`/api/campaigns/${campaign.id}/turn`, { method: 'POST', body: JSON.stringify({ action: clean }) });
    setCampaign(normalizeCampaign(result.campaign));
    setLastRoll(result.roll);
    setAction('');
    setStatus('Your move.');
  }

  async function rollD20() {
    if (!campaign) return;

    if (STATIC_PLAY || !apiOnline) {
      const roll = rollCheck({ expr: '1d20+2', mod: 2, dc: 12, label: 'Quick Check' });
      setLastRoll(roll);
      const next = normalizeCampaign({
        ...campaign,
        log: [
          ...(campaign.log || []),
          { role: 'dm', content: `Quick Check: ${roll.detail} · ${roll.outcome}`, ts: new Date().toISOString() }
        ]
      });
      commitCampaign(next, 'Quick check rolled.');
      return;
    }

    const result = await api(`/api/campaigns/${campaign.id}/roll`, { method: 'POST', body: JSON.stringify({ expr: '1d20+2', dc: 12, label: 'Quick Check' }) });
    setLastRoll(result.roll);
    setCampaign(normalizeCampaign(result.campaign));
  }

  function resetBrowserCampaign() {
    const fresh = cloneCampaign();
    saveBrowserCampaign(fresh);
    setCampaign(fresh);
    setCharacterDraft({ name: fresh.player.name, class_name: fresh.player.class_name, background: fresh.player.background });
    setLastRoll(null);
    setStatus(STATIC_PLAY ? 'Instant play mode: campaign reset.' : 'Browser campaign reset.');
  }

  function applyCharacterDraft(e) {
    e.preventDefault();
    if (!campaign) return;
    const preset = CLASS_PRESETS[characterDraft.class_name] || CLASS_PRESETS['Lantern-Seeker'];
    const next = normalizeCampaign({
      ...campaign,
      player: {
        ...campaign.player,
        ...preset,
        name: characterDraft.name.trim() || 'Adventurer',
        class_name: characterDraft.class_name,
        background: characterDraft.background.trim() || 'Porch-Touched',
        level: campaign.player?.level || 1
      },
      log: [
        ...(campaign.log || []),
        { role: 'dm', content: `Character ledger updated: ${characterDraft.name || 'Adventurer'} the ${characterDraft.class_name}.`, ts: new Date().toISOString() }
      ]
    });
    commitCampaign(next, 'Character ledger updated.');
  }

  function approvePatch(patchId) {
    if (!campaign) return;
    const patch = (campaign.pending_patches || []).find((p) => p.id === patchId);
    if (!patch) return;
    const next = normalizeCampaign({
      ...campaign,
      world: applyPatch(campaign.world, patch),
      pending_patches: (campaign.pending_patches || []).filter((p) => p.id !== patchId),
      log: [...(campaign.log || []), { role: 'dm', content: `Canon approved: ${patch.node.title}.`, ts: new Date().toISOString() }]
    });
    commitCampaign(next, 'Canon patch approved.');
  }

  function rejectPatch(patchId) {
    if (!campaign) return;
    const patch = (campaign.pending_patches || []).find((p) => p.id === patchId);
    const next = normalizeCampaign({
      ...campaign,
      pending_patches: (campaign.pending_patches || []).filter((p) => p.id !== patchId),
      log: patch ? [...(campaign.log || []), { role: 'dm', content: `Canon rejected: ${patch.node.title}.`, ts: new Date().toISOString() }] : campaign.log
    });
    commitCampaign(next, 'Canon patch rejected.');
  }

  function approveAllPatches() {
    if (!campaign) return;
    const pending = campaign.pending_patches || [];
    const world = pending.reduce((acc, patch) => applyPatch(acc, patch), campaign.world);
    const next = normalizeCampaign({
      ...campaign,
      world,
      pending_patches: [],
      log: [...(campaign.log || []), { role: 'dm', content: `Canon approved: ${pending.length} pending update${pending.length === 1 ? '' : 's'}.`, ts: new Date().toISOString() }]
    });
    commitCampaign(next, 'All canon patches approved.');
  }

  function exportSave() {
    if (!campaign) return;
    const payload = JSON.stringify(normalizeCampaign(campaign), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porchquest369-${campaign.id || 'campaign'}-save.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Save exported.');
  }

  function importSave(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeCampaign(JSON.parse(String(reader.result || '{}')));
        commitCampaign(imported, 'Save imported into this browser.');
        setCharacterDraft({ name: imported.player.name, class_name: imported.player.class_name, background: imported.player.background || 'Porch-Touched' });
      } catch (err) {
        console.warn(err);
        setStatus('Import failed: invalid PorchQuest369 save JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const player = campaign?.player || {};
  const log = campaign?.log || [];
  const pendingPatches = campaign?.pending_patches || [];
  const worldNodes = useMemo(() => Object.values(campaign?.world?.nodes || {}), [campaign]);

  return <div className="app-shell">
    <header className="hero">
      <div>
        <p className="eyebrow">Prompt RPG Engine</p>
        <h1>PorchQuest369</h1>
        <p className="subtitle">Dice, memory, world nodes, and a living campaign ledger.</p>
      </div>
      <div className="hero-card">
        <Sparkles size={22} />
        <strong>{campaign?.campaign_name || 'Loading campaign...'}</strong>
        <span>{status}</span>
        <em>{apiOnline ? 'Server campaign' : 'Browser campaign'}</em>
      </div>
    </header>

    <main className="grid">
      <section className="story panel">
        <h2><ScrollText size={18} /> Story</h2>
        <div className="story-log">
          {log.map((item, idx) => <article key={idx} className={`message ${item.role}`}>
            <span>{item.role === 'dm' ? 'DM' : 'You'}</span>
            <p>{item.content}</p>
          </article>)}
        </div>
        <form className="prompt-bar" onSubmit={submitAction}>
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="What do you do?" />
          <button type="submit">Send</button>
        </form>
      </section>

      <aside className="sidebar">
        <Panel title="Character" icon={Dice5}>
          <h3>{player.name} · Lv {player.level} {player.class_name}</h3>
          <p className="muted">Background: {player.background || 'Porch-Touched'}</p>
          <div className="stats-row">
            <StatPill label="HP" value={`${player.hp}/${player.hp_max}`} />
            <StatPill label="AC" value={player.ac} />
            <StatPill label="Turn" value={campaign?.turn ?? 0} />
          </div>
          <div className="mini-grid">
            {Object.entries(player.stats || {}).map(([k, v]) => <StatPill key={k} label={k.toUpperCase()} value={v} />)}
          </div>
          <button className="ghost" onClick={rollD20}>Roll d20+2</button>
          <button className="ghost secondary" onClick={resetBrowserCampaign}>Reset browser campaign</button>
          {lastRoll && <p className="roll-result">{lastRoll.label || lastRoll.expr}: {lastRoll.detail} · {lastRoll.outcome}</p>}
        </Panel>

        <Panel title="Character Setup" icon={Sparkles}>
          <form className="stack" onSubmit={applyCharacterDraft}>
            <label>Hero name<input value={characterDraft.name} onChange={(e) => setCharacterDraft({ ...characterDraft, name: e.target.value })} /></label>
            <label>Class<select value={characterDraft.class_name} onChange={(e) => setCharacterDraft({ ...characterDraft, class_name: e.target.value })}>
              {Object.keys(CLASS_PRESETS).map((name) => <option key={name} value={name}>{name}</option>)}
            </select></label>
            <label>Background<input value={characterDraft.background} onChange={(e) => setCharacterDraft({ ...characterDraft, background: e.target.value })} /></label>
            <button type="submit" className="ghost">Update character</button>
          </form>
        </Panel>

        <Panel title="Canon Queue" icon={Map}>
          {pendingPatches.length === 0 ? <p className="muted">No pending world changes. New discoveries will appear here before becoming canon.</p> : <>
            <button className="ghost" onClick={approveAllPatches}>Approve all</button>
            <ul className="list patches">{pendingPatches.map((patch) => <li key={patch.id}>
              <strong>{patch.node.title}</strong>
              <span>{patch.node.summary}</span>
              <small>{patch.reason}</small>
              <div className="button-row">
                <button onClick={() => approvePatch(patch.id)}>Approve</button>
                <button className="secondary-inline" onClick={() => rejectPatch(patch.id)}>Reject</button>
              </div>
            </li>)}</ul>
          </>}
        </Panel>

        <Panel title="Save Tools" icon={Backpack}>
          <div className="button-row wide">
            <button onClick={exportSave}>Export save</button>
            <label className="file-button">Import save<input type="file" accept="application/json" onChange={importSave} /></label>
          </div>
          <p className="muted">Browser mode saves locally on this device. Exporting gives you a portable campaign receipt.</p>
        </Panel>

        <Panel title="Quests" icon={ScrollText}>
          <ul className="list">{(campaign?.quests || []).map(q => <li key={q.id}><strong>{q.status}</strong>{q.title}</li>)}</ul>
        </Panel>

        <Panel title="Inventory" icon={Backpack}>
          <ul className="list">{(player.inventory || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
        </Panel>

        <Panel title="World Nodes" icon={Map}>
          <ul className="list">{worldNodes.map((n, idx) => <li key={n.id || idx}><strong>{n.title}</strong>{n.summary}</li>)}</ul>
        </Panel>
      </aside>
    </main>
  </div>;
}

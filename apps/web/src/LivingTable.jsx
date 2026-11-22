import React, { useEffect, useMemo, useState } from 'react';
import {
  SAVE_KEY, HEROES, COMPANIONS, SKILLS, STARTER_PACK, normalizePack, createSession,
  safeImport, currentScene, exits, recruit, dismiss, travel, resolveTurn,
  addFact, addNarration, fallbackNarration
} from './livingTableEngine.js';
import { goalOf, memoryFor, modelMemoryPacket, setCompanionGoal, rememberForCompanion,
  localSuggestion, stageCompanionProposal, pendingProposal,
  declineCompanionProposal, approveCompanionProposal } from './livingTableAgency.js';

const PACK_KEY = 'porchquest369.routePack.v7';
const DEFAULT_API = 'http://127.0.0.1:8787';

function readSession() {
  try { const saved = localStorage.getItem(SAVE_KEY); return saved ? safeImport(saved) : null; }
  catch { return null; }
}
function studioPack() {
  try { return normalizePack(JSON.parse(localStorage.getItem(PACK_KEY) || 'null')); }
  catch { return normalizePack(STARTER_PACK); }
}
function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
function previewEvent(state) {
  const latest = state.history[state.history.length - 1];
  return latest?.message || 'The party waits for the next adventure.';
}
function contextForModel(state, speaker, companion, action) {
  const scene = currentScene(state);
  return {
    speaker, companion_id: companion?.id || null,
    campaign_title: state.pack.title.slice(0, 140),
    scene_title: scene.title.slice(0, 120),
    scene_description: scene.text.slice(0, 700),
    hero_name: state.hero.name.slice(0, 60),
    companions: state.companions.map(id => COMPANIONS.find(c => c.id === id)?.name).filter(Boolean),
    facts: state.facts.slice(-15),
    clues: state.clues.slice(-12),
    action: String(action).slice(0, 480),
    last_result: previewEvent(state).slice(0, 700),
    recent_events: state.history.slice(-7).map(e => e.message.slice(0, 700)),
    ...(speaker === 'companion' && companion ? modelMemoryPacket(state, companion.id) : {})
  };
}

export default function LivingTable() {
  const [session, setSession] = useState(readSession);
  const [heroId, setHeroId] = useState('seeker');
  const [heroName, setHeroName] = useState('');
  const [draftAction, setDraftAction] = useState('');
  const [skill, setSkill] = useState('perception');
  const [helperId, setHelperId] = useState('');
  const [fact, setFact] = useState('');
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [modelReady, setModelReady] = useState(false);
  const [modelName, setModelName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('The local game works without a model. Connecting to AI is optional.');
  const [prompt, setPrompt] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const [memoryScope, setMemoryScope] = useState('private');
  const [goalDraft, setGoalDraft] = useState('');

  useEffect(() => {
    if (!session) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(session)); }
    catch { setNotice('Browser storage is full. Export your campaign to keep it safe.'); }
  }, [session]);

  const scene = useMemo(() => session ? currentScene(session) : null, [session]);
  const routes = useMemo(() => session ? exits(session) : [], [session]);
  const activeCompanion = session?.companions.includes(selectedCompanion)
    ? selectedCompanion : (session?.companions[0] || '');
  const pending = session ? pendingProposal(session) : null;

  function begin() {
    if (session && !window.confirm('Start a new campaign? Export first if you want to keep this one.')) return;
    const next = createSession(studioPack(), heroId, heroName);
    setSession(next);
    setSelectedCompanion('');
    setGoalDraft('');
    setMemoryNote('');
    setSkill(currentScene(next).skill);
    setNotice('A new world is ready. Recruit your party and tell the DM what you do.');
  }
  function reset() {
    if (!window.confirm('Delete the Living Table save in this browser?')) return;
    localStorage.removeItem(SAVE_KEY);
    setSession(null);
    setNotice('Campaign cleared. Your original Creator Studio packs are untouched.');
  }
  function onImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(data => {
      const imported = safeImport(data);
      if (session && !window.confirm('Replace the active Living Table campaign with this save?')) return;
      setSession(imported);
      setNotice('Portable campaign imported. World and companion state restored.');
    }).catch(err => setNotice('Import refused: ' + String(err.message || err)));
    event.target.value = '';
  }
  async function connect() {
    if (busy) return;
    const root = apiBase.trim().replace(/\/+$/, '');
    // Do not allow remote websites or arbitrary network hosts to become an AI credential proxy.
    if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(root)) {
      setNotice('R1 accepts a loopback API only (127.0.0.1 or localhost).');
      setModelReady(false);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(root + '/api/living-table/status');
      if (!response.ok) throw Error('Local backend returned HTTP ' + response.status);
      const status = await response.json();
      setModelReady(Boolean(status.configured));
      setModelName(status.model || '');
      setNotice(status.configured
        ? 'AI Dungeon Master connected to ' + status.model + '. Your explicit turns can now request model narration.'
        : 'Backend reached, but no model is configured. Set the server-side DM environment variables.');
    } catch (err) {
      setModelReady(false);
      setNotice('Local DM unavailable: ' + String(err.message || err) + '. Scripted play still works.');
    } finally { setBusy(false); }
  }
  async function tellStory(state, speaker = 'dm', companion = null, action = '') {
    if (!modelReady) {
      const line = speaker === 'dm'
        ? fallbackNarration(state)
        : companion.name + ' considers the trail. ' + companion.character;
      setSession(prev => addNarration(prev, speaker === 'dm' ? 'Dungeon Master' : companion.name, line, 'scripted'));
      return;
    }
    setBusy(true);
    try {
      const url = apiBase.trim().replace(/\/+$/, '') + '/api/living-table/say';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextForModel(state, speaker, companion, action))
      });
      if (!response.ok) throw Error('HTTP ' + response.status + ': ' + (await response.text()).slice(0, 160));
      const data = await response.json();
      if (typeof data.text !== 'string' || !data.non_canonical) throw Error('Invalid narrator contract.');
      setSession(prev => addNarration(prev, speaker === 'dm' ? 'Dungeon Master' : companion.name, data.text, 'model'));
      setNotice('Model narration received. It cannot directly alter dice, quests, inventory or world state.');
    } catch (err) {
      setModelReady(false);
      setSession(prev => addNarration(prev, 'Dungeon Master', fallbackNarration(state), 'scripted'));
      setNotice('AI request failed; switched to scripted narration. ' + String(err.message || err));
    } finally { setBusy(false); }
  }
  function makeTurn(event) {
    event.preventDefault();
    if (!session || busy || !draftAction.trim()) return;
    const next = resolveTurn(session, draftAction, skill, helperId);
    if (next === session) return;
    const action = draftAction;
    setSession(next);
    setDraftAction('');
    void tellStory(next, 'dm', null, action);
  }
  function move(destination) {
    if (!session || busy) return;
    const next = travel(session, destination);
    if (next === session) return;
    setSession(next);
    setSkill(currentScene(next).skill);
    void tellStory(next, 'dm', null, 'Travel to ' + currentScene(next).title);
  }
  function askCompanion(companionId) {
    if (!session || busy) return;
    const companion = COMPANIONS.find(c => c.id === companionId && session.companions.includes(c.id));
    if (!companion) return;
    void tellStory(session, 'companion', companion, prompt.trim() || 'Offer your honest advice about our next move.');
    setPrompt('');
  }
  function askDm() {
    if (!session || busy) return;
    void tellStory(session, 'dm', null, prompt.trim() || 'Describe the present scene without changing the campaign.');
    setPrompt('');
  }
  function approveFact(event) {
    event.preventDefault();
    if (!session) return;
    const next = addFact(session, fact);
    if (next !== session) { setSession(next); setFact(''); setNotice('Player-approved fact added to the campaign ledger.'); }
  }


  async function requestProposal(companionId) {
    if (!session || busy || pending) return;
    const suggestion = localSuggestion(session, companionId);
    if (!suggestion) return;
    if (!modelReady) {
      setSession(stageCompanionProposal(session, companionId, suggestion, 'local'));
      setNotice('A rules-based suggestion is ready to review. Nothing has happened yet.');
      return;
    }
    const anchor = session;
    setBusy(true);
    try {
      const character = COMPANIONS.find(c => c.id === companionId);
      const payload = contextForModel(session, 'companion', character, 'Suggest a useful action toward your goal.');
      const response = await fetch(apiBase.trim().replace(/\/+$/, '') + '/api/living-table/propose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.non_canonical !== true || !data.proposal) throw Error('Invalid proposal contract.');
      setSession(prev => prev === anchor ? stageCompanionProposal(prev, companionId, data.proposal, 'model') : prev);
      setNotice('Model proposal staged. Review before it becomes a game action.');
    } catch (error) {
      setModelReady(false);
      setSession(prev => prev === anchor ? stageCompanionProposal(prev, companionId, suggestion, 'local') : prev);
      setNotice('Model proposal unavailable. A labeled local suggestion is available instead. ' +
        String(error.message || error));
    } finally { setBusy(false); }
  }

  function chooseCompanion(id) {
    setSelectedCompanion(id);
    setGoalDraft(session ? goalOf(session, id) : '');
    setMemoryNote('');
  }

  function saveGoal(event) {
    event.preventDefault();
    if (!session || !activeCompanion) return;
    const next = setCompanionGoal(session, activeCompanion, goalDraft);
    if (next !== session) {
      setSession(next);
      setNotice('Companion goal saved.');
    }
  }

  function saveMemory(event) {
    event.preventDefault();
    if (!session || !activeCompanion || !memoryNote.trim()) return;
    const next = rememberForCompanion(session, activeCompanion, memoryNote, memoryScope);
    if (next !== session) {
      setSession(next);
      setMemoryNote('');
      setNotice('Memory saved. Private notes are scoped to this companion only.');
    }
  }

  function decideProposal(approve) {
    if (!session || busy || !pending) return;
    const next = approve ? approveCompanionProposal(session) : declineCompanionProposal(session);
    if (next === session) { setNotice('Proposal expired or was invalid.'); return; }
    setSession(next);
    setNotice(approve
      ? 'Approved companion action resolved by deterministic dice.'
      : 'Proposal declined. No roll or time advancement occurred.');
  }

  return <main className="lt-root">
    <header className="lt-header">
      <div><div className="lt-eyebrow">PORCHQUEST369 · R2 COMPANION AGENCY</div><h1>The Living Table</h1>
      <p>Build worlds. Recruit companions. Tell the story together. Dice and canon stay accountable.</p></div>
      <div className="lt-status"><span className={modelReady ? 'lt-online' : 'lt-offline'} />
      {modelReady ? 'AI DM · ' + modelName : 'SCRIPTED DM · LOCAL PLAY'}</div>
    </header>
    <section className="lt-panel lt-connector" aria-label="Dungeon Master connection">
      <div><h2>Dungeon Master Console</h2><p>Connect your local PorchQuest FastAPI server to Ollama or another compatible model. AI text is non-canonical until game rules or a player approves a change.</p></div>
      <div className="lt-connect-controls"><label>Local API address<input aria-label="Local API address" value={apiBase} onChange={e => { setApiBase(e.target.value); setModelReady(false); }} /></label>
      <button onClick={connect} disabled={busy}>{busy ? 'Working…' : 'Test / Connect DM'}</button></div>
    </section>
    <p className="lt-notice" role="status">{notice}</p>

    {!session ? <section className="lt-panel lt-new">
      <div><div className="lt-eyebrow">NEW CHRONICLE</div><h2>Begin your adventure</h2>
      <p>Uses the latest locally saved Creator Studio world pack, or the included Blackwood Hill starter.</p></div>
      <div className="lt-new-fields"><label>Choose your hero
        <select value={heroId} onChange={e => setHeroId(e.target.value)}>{HEROES.map(h => <option key={h.id} value={h.id}>{h.name} · {h.skill}</option>)}</select></label>
      <label>Name your hero<input value={heroName} maxLength={60} placeholder="Optional character name" onChange={e => setHeroName(e.target.value)} /></label>
      <button className="lt-primary" onClick={begin}>Enter the world</button></div>
      <label className="lt-import">Continue from an exported save <input type="file" accept=".json,application/json" onChange={onImport} /></label>
    </section> : <>
      <div className="lt-worldbar"><div><small>WORLD</small><strong>{session.pack.title}</strong><span>{session.pack.summary}</span></div>
      <div><small>TURN</small><strong>{session.turn}</strong></div><div><small>HERO</small><strong>{session.hero.name}</strong><span>HP {session.hp} · +{session.hero.bonus}</span></div></div>

      <div className="lt-grid">
        <section className="lt-panel lt-scene"><div className="lt-eyebrow">ACT {scene.act || 'I'} · CURRENT LOCATION</div>
          <h2>{scene.title}</h2><p className="lt-scene-prose">{scene.text}</p>
          <p>Suggested check: <b>{scene.skill}</b>, difficulty {scene.dc}.</p>
          <div className="lt-divider" />
          <h3>Choose a path</h3><div className="lt-routes">{routes.length ? routes.map((route, i) =>
            <button disabled={busy} key={route.id + i} onClick={() => move(route.to)}>{route.label} <small>{session.pack.scenes.find(s => s.id === route.to)?.title}</small></button>
          ) : <p>No authored exits. Continue exploring here or open Creator Studio to add routes.</p>}</div>
          <h3>Your discoveries</h3><p>{session.clues.length ? session.clues.join(' • ') : 'No discovered clues yet.'}</p>
        </section>
        <section className="lt-panel lt-actions"><div className="lt-eyebrow">YOUR TURN</div><h2>What do you do?</h2>
          <form onSubmit={makeTurn}>
            <label>Describe any action<textarea value={draftAction} rows={4} maxLength={480}
              placeholder="I examine the lantern, checking for hidden runes…" onChange={e => setDraftAction(e.target.value)} /></label>
            <div className="lt-fields"><label>Skill check<select value={skill} onChange={e => setSkill(e.target.value)}>
              {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
              <label>Companion assist<select value={helperId} onChange={e => setHelperId(e.target.value)}>
                <option value="">No assist</option>
                {session.companions.map(id => { const c = COMPANIONS.find(x => x.id === id);
                  return <option key={id} value={id}>{c.name} (+2 for {c.skill})</option>; })}</select></label></div>
            <button className="lt-primary" type="submit" disabled={busy || !draftAction.trim()}>Roll & Resolve Action</button>
          </form><p className="lt-help">The deterministic engine rolls first. A matching recruited companion grants +2. The AI describes the recorded result, never replaces it.</p>
          <h3>Conversation</h3><label>Ask the DM or a party member<input value={prompt} maxLength={480} placeholder="What do you think we should do?" onChange={e => setPrompt(e.target.value)} /></label>
          <button onClick={askDm} disabled={busy}>Ask Dungeon Master</button>
          <div className="lt-narration" aria-live="polite">{session.narration.length ? [...session.narration].reverse().slice(0,6).map((line, i) =>
            <article key={i}><strong>{line.speaker}</strong><small>{line.source}</small><p>{line.message}</p></article>
          ) : <p>Your chronicle awaits its first scene.</p>}</div>
        </section>
      </div>

      <div className="lt-grid">
        <section className="lt-panel"><div className="lt-eyebrow">COMPANION SLOTS · {session.companions.length}/3</div><h2>Your company</h2>
          <div className="lt-companions">{COMPANIONS.map(companion => { const joined = session.companions.includes(companion.id);
            return <article key={companion.id}><div><strong>{companion.name}</strong><small>{companion.role} · {companion.skill}</small><p>{companion.character}</p></div>
              <div className="lt-card-actions">{joined ? <>
                <button disabled={busy} onClick={() => askCompanion(companion.id)}>Ask</button>
                <button disabled={busy} onClick={() => { setSession(dismiss(session, companion.id)); if (helperId === companion.id) setHelperId(''); }}>Dismiss</button>
              </> : <button disabled={busy || session.companions.length >= 3}
                onClick={() => setSession(recruit(session, companion.id))}>Recruit</button>}</div>
            </article>; })}</div>
          <p className="lt-help">Companions have distinct voices when the model is connected. Their suggestions are advice, not unapproved autonomous actions.</p>
        </section>
        <section className="lt-panel"><div className="lt-eyebrow">PLAYER AUTHORITY</div><h2>World ledger</h2>
          <form onSubmit={approveFact}><label>Add a canon fact<input value={fact} maxLength={240}
            placeholder="The hill's gate opens only at moonrise…" onChange={e => setFact(e.target.value)} /></label>
            <button type="submit" disabled={!fact.trim() || session.facts.length >= 40}>Approve World Fact</button></form>
          <div className="lt-facts">{session.facts.length ? session.facts.map((f, i) => <p key={i}>{f}</p>) : <p>No additional player-approved facts.</p>}</div>
          <h3>Recent canonical events</h3><ol className="lt-ledger">{[...session.history].reverse().slice(0,12).map((entry, i) =>
            <li key={i}><small>TURN {entry.turn} · {entry.type}</small><p>{entry.message}</p></li>)}</ol>
          <div className="lt-divider" /><h3>Portable adventure</h3>
          <div className="lt-save-actions">
            <button onClick={() => download('porchquest-living-table-save.json', session)}>Export Campaign</button>
            <label className="lt-import">Import Campaign<input type="file" accept=".json,application/json" onChange={onImport} /></label>
            <button onClick={begin}>New Campaign</button><button onClick={reset}>Clear Save</button>
          </div>
        </section>
      </div>
    </>}
  </main>;
}
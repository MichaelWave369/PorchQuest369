import React, { useMemo, useState } from 'react';
import { COMPANIONS, currentScene } from './livingTableEngine.js';
import { goalOf, memoryFor, modelMemoryPacket, pendingProposal } from './livingTableAgency.js';
import {
  battleOptions, beginEncounter, resolveBattleAction, localTactic,
  stageTactic, currentTactic, decideTactic, leaveEncounter
} from './livingTableCombat.js';

const SIZE = 7;

export default function LivingBattle({ session, setSession, apiBase, modelReady, busy, onNotice }) {
  const [selected, setSelected] = useState('hero');
  const [thinking, setThinking] = useState(false);
  const battle = session.combat;
  const actors = useMemo(() => battle?.units.filter(u => u.side === 'ally') || [], [battle]);
  const activeActor = actors.find(u => u.id === selected && u.hp > 0)
    || actors.find(u => u.hp > 0) || actors[0];
  const options = battle && activeActor ? battleOptions(session,activeActor.id) : [];
  const pending = currentTactic(session);

  function act(optionId) {
    if (thinking || busy || !activeActor || battle.status !== 'active') return;
    setSession(prev => resolveBattleAction(prev, activeActor.id, optionId));
  }
  function touchCell(unit, x, y) {
    if (thinking || busy || battle.status !== 'active') return;
    if (unit?.side === 'ally' && unit.hp > 0) { setSelected(unit.id); return; }
    const id = unit?.side === 'enemy' ? 'attack:' + unit.id : 'move:' + x + ':' + y;
    if (options.some(opt => opt.id === id)) act(id);
  }
  function localProposal(id) {
    const candidate = localTactic(session,id);
    if (candidate) {
      setSession(prev => stageTactic(prev,id,candidate.id,'local'));
      onNotice('A LOCAL companion tactic is ready for your approval.');
    }
  }
  async function suggest(id) {
    if (thinking || busy || pending) return;
    const candidate = localTactic(session,id);
    if (!candidate) return;
    if (!modelReady) { localProposal(id); return; }
    const anchor = session;
    const companion = COMPANIONS.find(c => c.id === id);
    const legal = battleOptions(session,id);
    const otherPartyNotes = session.companions.filter(cid => cid !== id).flatMap(cid =>
      memoryFor(session,cid,'party').slice(-3).map(m => ({
        speaker: COMPANIONS.find(c => c.id === cid)?.name || cid,
        note: m.note.slice(0,240)
      }))).slice(-8);
    const payload = {
      companion_id: id,
      scene_title: currentScene(session).title.slice(0,120),
      actor_name: companion?.name || id,
      goal: goalOf(session,id).slice(0,160),
      memory_notes: modelMemoryPacket(session,id).memory_notes,
      shared_notes: otherPartyNotes,
      last_event: (session.history.at(-1)?.message || '').slice(0,400),
      opponents: battle.units.filter(u => u.side === 'enemy' && u.hp > 0)
        .map(u => ({ name: u.name, hp: u.hp, x: u.x, y: u.y })),
      options: legal.map(o => ({ id: o.id, label: o.label }))
    };
    setThinking(true);
    try {
      const url = apiBase.trim().replace(/\/+$/, '') + '/api/living-table/choose-tactic';
      const res = await fetch(url,{ method:'POST',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw Error('HTTP '+res.status);
      const data = await res.json();
      if (data.non_canonical !== true || !legal.some(o => o.id === data.option_id))
        throw Error('The model returned an illegal tactic.');
      setSession(prev => prev === anchor ? stageTactic(prev,id,data.option_id,'model') : prev);
      onNotice('AI tactic suggested. No action is taken until you approve it.');
    } catch (error) {
      setSession(prev => prev === anchor ? stageTactic(prev,id,candidate.id,'local') : prev);
      onNotice('AI tactic unavailable; fell back to a LOCAL legal suggestion. ' + String(error.message || error));
    } finally { setThinking(false); }
  }

  if (!battle) return <section className="lt-panel lt-battle-intro">
    <div><div className="lt-eyebrow">TACTICAL MODE · R3</div><h2>Encounter Board</h2>
      <p>Confront an Ash Wisp and Briar Sentinel on a 7×7 tabletop. Each ally can move, strike, or guard once per round. Enemy turns follow automatically when the party finishes its actions.</p>
      <p className="lt-help">Battles share the campaign's dice seed, hero HP and canonical ledger. They grant no invented loot.</p>
    </div>
    <button className="lt-primary" disabled={busy || session.hp <= 0 || Boolean(pendingProposal(session))}
      onClick={() => setSession(prev => beginEncounter(prev))}>Start Tactical Encounter</button>
  </section>;

  const grid = Array.from({length:SIZE*SIZE},(_,i) => ({x:i%SIZE,y:Math.floor(i/SIZE)}));
  const livingUnits = battle.units.filter(u => u.hp > 0);
  return <section className="lt-panel lt-battle" aria-label="Tactical encounter board">
    <div className="lt-battle-heading">
      <div><div className="lt-eyebrow">TACTICAL ENCOUNTER · ROUND {battle.round}</div>
        <h2>{currentScene(session).title} · Battle Board</h2>
        <p>Party actions resolve through the rules engine, never directly through an AI response.</p></div>
      <div className="lt-battle-heading-tools"><strong>{battle.status === 'active' ? 'COMBAT ACTIVE' : battle.status.toUpperCase()}</strong>
        <button disabled={busy || thinking} onClick={() => setSession(prev => leaveEncounter(prev))}>
          {battle.status === 'active' ? 'Retreat' : 'Close Encounter'}</button></div>
    </div>
    <div className="lt-battle-layout">
      <div>
        <div className="lt-battle-grid" role="group" aria-label="Seven by seven combat grid">
          {grid.map(({x,y}) => {
            const unit = livingUnits.find(u => u.x === x && u.y === y);
            const id = unit?.side === 'enemy' ? 'attack:'+unit.id : 'move:'+x+':'+y;
            const legal = options.some(o => o.id === id);
            const isSelected = unit?.id === activeActor?.id;
            return <button type="button" key={x+'-'+y} disabled={thinking || busy || battle.status !== 'active' || (!unit?.side?.includes('ally') && !legal)}
              className={'lt-cell'+(unit?.side === 'enemy' ? ' lt-enemy' : unit ? ' lt-ally' : '')+
                (legal ? ' lt-legal' : '')+(isSelected ? ' lt-selected' : '')}
              onClick={() => touchCell(unit,x,y)}
              aria-label={'Column '+(x+1)+', row '+(y+1)+': '+(unit ? unit.name+' '+unit.hp+' HP' : 'empty')+
                (legal ? ', legal '+(id.startsWith('attack') ? 'attack' : 'move') : '')}
              title={unit ? unit.name+' ('+unit.hp+'/'+unit.max_hp+' HP)' : 'Tile '+(x+1)+','+(y+1)}>
              {unit ? <><span className="lt-token">{unit.id === 'hero' ? 'H' : unit.side === 'enemy' ? '!' : unit.name.slice(0,1).toUpperCase()}</span>
                <small>{unit.hp} HP</small></> : <small>{x+1},{y+1}</small>}
            </button>;
          })}
        </div>
        <p className="lt-battle-legend">Gold: hero & companions · Red: opponents · Outlined: selected · Lit tiles: legal move or attack.</p>
      </div>
      <div className="lt-battle-tools">
        <h3>Party turns</h3>
        <div className="lt-battle-actors">{actors.map(u =>
          <button key={u.id} disabled={busy || thinking || u.hp <= 0 || battle.status !== 'active'}
            className={u.id === activeActor?.id ? 'lt-picked' : ''}
            onClick={() => setSelected(u.id)}>{u.name} <small>{u.hp}/{u.max_hp} HP ·
              {battle.acted.includes(u.id) ? ' acted' : ' ready'}</small></button>
        )}</div>
        <h3>{activeActor?.name || 'No ally selected'} · available actions</h3>
        <div className="lt-battle-actions">{options.length ? options.map(o =>
          <button disabled={thinking || busy} onClick={() => act(o.id)} key={o.id}>{o.label}</button>
        ) : <p>{battle.status === 'active' ? 'This character has already acted or fallen.' : 'Encounter resolved.'}</p>}</div>
        {activeActor && activeActor.id !== 'hero' && options.length > 0 &&
          <button disabled={thinking || busy || Boolean(pending)} onClick={() => suggest(activeActor.id)}>
            {thinking ? 'Consulting companion…' : 'Ask '+activeActor.name+' for a tactic'}</button>}
        {pending && <div className="lt-review" role="region" aria-label="Companion tactical proposal">
          <div className="lt-eyebrow">PROPOSAL · {pending.source.toUpperCase()} · PLAYER APPROVAL</div>
          <p><b>{battle.units.find(u => u.id === pending.actor_id)?.name}</b> recommends: {
            battleOptions(session,pending.actor_id).find(o => o.id === pending.option_id)?.label || 'Unavailable'
          }</p>
          <p className="lt-help">The exact action was already validated. Approval resolves it through the game engine.</p>
          <div className="lt-card-actions">
            <button className="lt-primary" disabled={busy || thinking}
              onClick={() => setSession(prev => decideTactic(prev,true))}>Approve Action</button>
            <button disabled={busy || thinking}
              onClick={() => setSession(prev => decideTactic(prev,false))}>Decline</button>
          </div>
        </div>}
        <h3>Opponents</h3>
        {battle.units.filter(u => u.side === 'enemy').map(u =>
          <p key={u.id} className="lt-battle-enemy-line"><b>{u.name}</b> {u.hp}/{u.max_hp} HP</p>)}
        <h3>Battle log</h3>
        <div className="lt-battle-log" role="log">{[...session.history].reverse()
          .filter(e => ['encounter_start','battle_action','enemy_action','encounter_won','encounter_lost','battle_proposal_declined'].includes(e.type))
          .slice(0,12).map((e,i) => <p key={i}><small>Turn {e.turn} · {e.type}</small>{e.message}</p>)}</div>
      </div>
    </div>
  </section>;
}

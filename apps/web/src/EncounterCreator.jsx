import React, { useState } from 'react';
import {
  BOARD_SIZE, ENEMY_TEMPLATES, TERRAIN_PRESETS, PARTY_SPAWNS,
  cloneDefaultEncounter, encounterFor, validateEncounter, normalizeEncounter,
  paintWall, placeEnemy, configureEnemy, saveEncounter, blocked, tileKey
} from './livingTableEncounters.js';
import { beginEncounter } from './livingTableCombat.js';

function downloadBlueprint(data) {
  const file = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const href = URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=href; link.download='porchquest-encounter-blueprint.json';
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(href);
}

export default function EncounterCreator({session,setSession,busy,onNotice}) {
  const [draft,setDraft] = useState(() => encounterFor(session));
  const [editing,setEditing] = useState(false);
  const [brush,setBrush] = useState('wall');
  const saved = encounterFor(session);
  const error = validateEncounter(draft,session);
  const partyTiles = new Set(PARTY_SPAWNS.map(p => tileKey(p.x,p.y)));

  function changeBoard(x,y){
    if (!editing || busy) return;
    const next = brush === 'wall'
      ? paintWall(draft,x,y) : placeEnemy(draft,brush,x,y);
    if(next === draft) {
      onNotice('This tile is reserved, occupied, out of bounds or the terrain limit has been reached.');
    } else {
      setDraft(next);
    }
  }
  function choosePreset(theme) {
    const terrain=TERRAIN_PRESETS[theme];
    if(!terrain) return;
    const next={...draft,theme,walls:terrain.walls.map(([x,y])=>({x,y}))};
    if(validateEncounter(next,session)) onNotice('Preset cannot overlap current spawns. Adjust enemy positions first.');
    else setDraft(next);
  }
  function configure(id,type,hp){
    const next=configureEnemy(draft,id,type,hp);
    if(next===draft) onNotice('Invalid enemy configuration.');
    else setDraft(next);
  }
  function save() {
    if(error) { onNotice('Encounter design is invalid: '+error); return; }
    setSession(prev => saveEncounter(prev,draft));
    setEditing(false);
    onNotice('Encounter blueprint saved into the campaign. Export Campaign to archive it.');
  }
  function importFile(event) {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file) return;
    if(file.size > 30000) { onNotice('Encounter import refused: 30 KB maximum.'); return; }
    file.text().then(raw=>{
      const parsed=JSON.parse(raw);
      const normalized=normalizeEncounter(parsed,session);
      if(!normalized) throw Error('Invalid or unsafe encounter layout.');
      setDraft(normalized); setEditing(true);
      onNotice('Blueprint imported into the editor. Review and save it before launching.');
    }).catch(e=>onNotice('Encounter import refused: '+String(e.message || e)));
  }
  const grid=Array.from({length:BOARD_SIZE*BOARD_SIZE},(_,i)=>({x:i%BOARD_SIZE,y:Math.floor(i/BOARD_SIZE)}));
  return <section className="lt-panel lt-encounter-editor" aria-label="Encounter Creator">
    <div className="lt-encounter-header">
      <div><div className="lt-eyebrow">R4 · ENCOUNTER CREATOR</div>
        <h2>{editing ? 'Design the encounter' : saved.name}</h2>
        <p>Paint a 7×7 arena, place your two opponents and choose their abilities from a bounded monster catalog.</p></div>
      <div className="lt-card-actions">
        <button disabled={busy} onClick={()=>{
          setDraft(encounterFor(session));setEditing(!editing);
        }}>{editing ? 'Cancel edits' : 'Edit encounter'}</button>
        <button className="lt-primary" disabled={busy || editing || session.hp<=0 || Boolean(session.agency?.pending)}
          onClick={()=>setSession(prev=>beginEncounter(prev))}>Launch saved encounter</button>
      </div>
    </div>
    {editing && <div className="lt-encounter-settings">
      <label>Encounter title<input value={draft.name} maxLength={80}
        onChange={e=>setDraft(prev=>({...prev,name:e.target.value}))}/></label>
      <label>Terrain preset<select value={draft.theme} onChange={e=>choosePreset(e.target.value)}>
        {Object.entries(TERRAIN_PRESETS).map(([id,t])=><option key={id} value={id}>{t.name}</option>)}
      </select></label>
      <label>Map brush<select value={brush} onChange={e=>setBrush(e.target.value)}>
        <option value="wall">Place/remove solid wall</option>
        <option value="foe-1">Position enemy 1</option>
        <option value="foe-2">Position enemy 2</option>
      </select></label>
    </div>}
    <div className="lt-encounter-layout">
      <div>
        <div className={'lt-encounter-map lt-theme-'+draft.theme} role="group" aria-label="Encounter designer grid">
          {grid.map(({x,y})=>{
            const isWall=blocked(draft.walls,x,y);
            const party=PARTY_SPAWNS.findIndex(p=>p.x===x && p.y===y);
            const foe=draft.foes.find(f=>f.x===x && f.y===y);
            const object=isWall?'Wall':foe?'Enemy '+foe.id:party>=0?'Reserved ally spawn':'Clear';
            return <button type="button" key={tileKey(x,y)}
              disabled={!editing || busy} onClick={()=>changeBoard(x,y)}
              className={'lt-encounter-tile'+(isWall?' wall':'')+(foe?' foe':'')+(party>=0?' party':'')}
              aria-label={'Column '+(x+1)+' row '+(y+1)+': '+object}
              title={object+' ('+(x+1)+','+(y+1)+')'}>
                {isWall?'▦':foe?foe.id==='foe-1'?'1':'2':party>=0?'P':'·'}
            </button>;
          })}
        </div>
        <p className="lt-help">P = reserved ally deployment · 1/2 = enemy spawns · ▦ = solid walls. Walls block travel and ranged line of sight. Max 18 walls.</p>
        {editing && <p className={error?'lt-encounter-invalid':'lt-encounter-valid'} role="status">
          {error || 'Valid layout. Save the design to use it in your next battle.'}</p>}
      </div>
      <div className="lt-encounter-monsters">
        <h3>Enemy roster</h3>
        {draft.foes.map((f,i)=>{
          const t=ENEMY_TEMPLATES[f.type];
          return <article key={f.id}>
            <div className="lt-eyebrow">ENEMY {i+1} · {f.id}</div>
            <strong>{t.name}</strong>
            <p>{t.ability} · Range {t.range} · Attack +{t.attack_bonus} · AC {t.ac} · Base damage {t.damage}</p>
            {editing?<div className="lt-encounter-enemy-fields">
              <label>Monster type<select value={f.type} onChange={e=>configure(f.id,e.target.value,ENEMY_TEMPLATES[e.target.value].hp)}>
                {Object.entries(ENEMY_TEMPLATES).map(([id,monster])=>
                  <option key={id} value={id}>{monster.name}</option>)}
              </select></label>
              <label>Starting HP<input type="number" min={1} max={t.max_hp} value={f.hp}
                onChange={e=>configure(f.id,f.type,Number(e.target.value))}/></label>
              <button type="button" onClick={()=>setBrush(f.id)}>Place on map</button>
            </div>:<p>HP {f.hp} · Position {f.x+1},{f.y+1}</p>}
          </article>;
        })}
        {editing && <div className="lt-save-actions">
          <button className="lt-primary" disabled={!!error || busy} onClick={save}>Save encounter</button>
          <button disabled={busy} onClick={()=>setDraft(cloneDefaultEncounter())}>Reset draft</button>
          <button disabled={!!error} onClick={()=>downloadBlueprint(draft)}>Export blueprint</button>
          <label className="lt-import">Import blueprint<input type="file" accept=".json,application/json"
            onChange={importFile}/></label>
        </div>}
        {!editing && <p className="lt-help">This encounter is a reusable, campaign-local design. Edit it before the next fight or import a standalone blueprint.</p>}
      </div>
    </div>
  </section>;
}

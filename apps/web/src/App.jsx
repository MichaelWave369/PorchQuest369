import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';

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
  id: 'demo',
  campaign_name: 'Lanterns Under Blackwood Hill',
  location: 'The Infinite Porch',
  turn: 0,
  player: {
    name: 'Mikey', class_name: 'Lantern-Seeker', level: 1, hp: 12, hp_max: 12, ac: 12,
    stats: { str: 10, dex: 12, con: 11, int: 11, wis: 13, cha: 12 },
    skills: { stealth: 1, perception: 2, persuasion: 1, arcana: 0, survival: 2 },
    inventory: ['weathered cloak', 'porch key ring', 'lantern stub', 'waterskin', '10 gp']
  },
  quests: [
    { id: 'q_main_1', title: 'Find the missing porch key before midnight', type: 'main', status: 'open' },
    { id: 'q_side_1', title: "Rescue the lantern-maker's apprentice", type: 'side', status: 'open' }
  ],
  world: { nodes: { infinite_porch: { title: 'The Infinite Porch', summary: 'A porch between worlds.' } }, edges: [] },
  log: [{ role: 'dm', content: "Rain taps the roof of a porch that should not exist. Beyond the steps, Blackwood Hill glows with blue lanterns between the trees.\n\nA) Step toward Blackwood Hill.\nB) Question Old Joss.\nC) Inspect the porch.", ts: '' }]
};

export default function App({ icons }) {
  const { Dice5, ScrollText, Backpack, Map, Sparkles } = icons;
  const [campaign, setCampaign] = useState(null);
  const [action, setAction] = useState('I inspect the blue lanterns for clues.');
  const [status, setStatus] = useState('Loading...');
  const [lastRoll, setLastRoll] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function ensureCampaign() {
    try {
      await api('/api/health');
      setApiOnline(true);
      const list = await api('/api/campaigns');
      if (list.campaigns?.length) {
        const loaded = await api(`/api/campaigns/${list.campaigns[0].id}`);
        setCampaign(loaded.campaign);
      } else {
        const created = await api('/api/campaigns', { method: 'POST', body: JSON.stringify({ player_name: 'Mikey' }) });
        setCampaign(created.campaign);
      }
      setStatus('API connected');
    } catch (err) {
      setApiOnline(false);
      setCampaign(fallbackCampaign);
      setStatus('Demo mode: start the FastAPI backend to save campaigns.');
    }
  }

  useEffect(() => { ensureCampaign(); }, []);

  async function submitAction(e) {
    e.preventDefault();
    const clean = action.trim();
    if (!clean || !campaign) return;
    if (!apiOnline) {
      const fake = {
        ...campaign,
        log: [...(campaign.log || []), { role: 'player', content: clean }, { role: 'dm', content: `You choose: ${clean}\n\nDemo mode whispers back: the hill is listening.\n\nA) Continue.\nB) Inspect.\nC) Return.` }],
        turn: (campaign.turn || 0) + 1,
      };
      setCampaign(fake);
      setAction('');
      return;
    }
    setStatus('Resolving turn...');
    const result = await api(`/api/campaigns/${campaign.id}/turn`, { method: 'POST', body: JSON.stringify({ action: clean }) });
    setCampaign(result.campaign);
    setLastRoll(result.roll);
    setAction('');
    setStatus('Your move.');
  }

  async function rollD20() {
    if (!campaign || !apiOnline) return;
    const result = await api(`/api/campaigns/${campaign.id}/roll`, { method: 'POST', body: JSON.stringify({ expr: '1d20+2', dc: 12, label: 'Quick Check' }) });
    setLastRoll(result.roll);
    setCampaign(result.campaign);
  }

  const player = campaign?.player || {};
  const log = campaign?.log || [];
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
          <div className="stats-row">
            <StatPill label="HP" value={`${player.hp}/${player.hp_max}`} />
            <StatPill label="AC" value={player.ac} />
            <StatPill label="Turn" value={campaign?.turn ?? 0} />
          </div>
          <div className="mini-grid">
            {Object.entries(player.stats || {}).map(([k, v]) => <StatPill key={k} label={k.toUpperCase()} value={v} />)}
          </div>
          <button className="ghost" onClick={rollD20}>Roll d20+2</button>
          {lastRoll && <p className="roll-result">{lastRoll.label || lastRoll.expr}: {lastRoll.detail} · {lastRoll.outcome}</p>}
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
